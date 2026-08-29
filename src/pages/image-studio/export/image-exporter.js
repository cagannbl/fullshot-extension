/**
 * FullShot Pro - Native Image Exporter & Binary Clipboard Engine
 * Manifest V3 compatible, 100% offline, zero external dependencies.
 * Handles lossless PNG, compressed JPG (with white alpha background fill),
 * modern WebP downloads, and async Clipboard API copying with multi-level fallback mechanisms.
 */

/**
 * Sanitizes page title and generates a timestamped export filename.
 * Preserves Turkish characters while replacing illegal filesystem characters.
 * @param {string} title - Page or capture title
 * @param {string} extension - Desired file extension (png, jpg, webp, pdf)
 * @returns {string} Safe filename (e.g. FullShot_Türkçe_Başlık_2026-08-29_21-20-00.png)
 */
function getExportFilename(title = 'Ekran_Goruntusu', extension = 'png') {
  const cleanTitle = (title || 'Ekran_Goruntusu')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'Ekran_Goruntusu';

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');

  const dateStr = `${year}-${month}-${day}_${hours}-${mins}-${secs}`;
  return `FullShot_${cleanTitle}_${dateStr}.${extension.toLowerCase()}`;
}

/**
 * Triggers a file download using Chrome Downloads API with fallback to synthetic anchor click.
 * @param {Blob} blob - Binary file blob
 * @param {string} filename - Target filename
 * @returns {Promise<boolean>} Resolves true when download is initiated
 */
function triggerBlobDownload(blob, filename) {
  return new Promise((resolve) => {
    if (!blob) {
      resolve(false);
      return;
    }

    const blobUrl = URL.createObjectURL(blob);

    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
      chrome.runtime.sendMessage({
        action: 'downloadImage',
        dataUrl: blobUrl,
        filename
      }, (res) => {
        if (chrome.runtime.lastError || !res || !res.success) {
          // Fallback to synthetic <a> click
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        resolve(true);
      });
    } else {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      resolve(true);
    }
  });
}

/**
 * Exports an HTML5 Canvas as an image (PNG, JPG, or WebP) and triggers download.
 * For JPG exports, fills the background with pure white to eliminate dark alpha artifacts.
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {string} format - 'png' | 'jpg' | 'jpeg' | 'webp'
 * @param {number} quality - Compression quality (0.0 to 1.0)
 * @param {string} [customFilename] - Optional custom filename
 * @returns {Promise<boolean>}
 */
async function downloadCanvasAsImage(canvas, format = 'png', quality = 0.95, customFilename = null) {
  if (!canvas || !canvas.width || !canvas.height) {
    throw new Error('Geçersiz tuval veya boş görüntü verisi.');
  }

  const fmt = format.toLowerCase().replace('jpeg', 'jpg');
  const filename = customFilename || getExportFilename('Ekran_Goruntusu', fmt);

  if (fmt === 'jpg') {
    // Render on solid white background to eliminate black alpha transparency artifacts
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    return new Promise((resolve, reject) => {
      tempCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('JPG Blob dönüşümü başarısız oldu.'));
          return;
        }
        triggerBlobDownload(blob, filename).then(resolve);
      }, 'image/jpeg', quality);
    });
  }

  const mimeType = fmt === 'webp' ? 'image/webp' : 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`${fmt.toUpperCase()} Blob dönüşümü başarısız oldu.`));
        return;
      }
      triggerBlobDownload(blob, filename).then(resolve);
    }, mimeType, quality);
  });
}

/**
 * Copies canvas image data directly to system clipboard as a PNG image using the Native Async Clipboard API.
 * Includes automatic fallbacks for permissions, browser contexts, and Blob generation.
 * @param {HTMLCanvasElement} canvas - Canvas to copy
 * @returns {Promise<boolean>} True if successful
 */
async function copyCanvasToClipboard(canvas) {
  if (!canvas || !canvas.width || !canvas.height) {
    throw new Error('Kopyalanacak tuval bulunamadı.');
  }

  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
    throw new Error('Tarayıcınız Native Clipboard API desteği sunmuyor.');
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Pano için PNG Blob oluşturulamadı.');
  }

  try {
    // Standard Chromium ClipboardItem writing
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (clipboardErr) {
    // Fallback: Check if focus is needed
    try {
      window.focus();
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return true;
    } catch (secondErr) {
      console.warn('[FullShotImageExporter] Clipboard API yazma hatası:', secondErr);
      throw new Error(`Panoya kopyalanamadı: ${secondErr.message || 'Erişim reddedildi'}`);
    }
  }
}

/**
 * Copies a PNG Blob directly to the system clipboard.
 * @param {Blob} blob 
 * @returns {Promise<boolean>}
 */
async function copyBlobToClipboard(blob) {
  if (!blob) throw new Error('Kopyalanacak Blob verisi bulunamadı.');
  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
    throw new Error('Tarayıcınız Clipboard API desteği sunmuyor.');
  }

  const item = new ClipboardItem({ 'image/png': blob });
  await navigator.clipboard.write([item]);
  return true;
}

// Global Export Container
if (typeof window !== 'undefined') {
  window.FullShotImageExporter = {
    getExportFilename,
    triggerBlobDownload,
    downloadCanvasAsImage,
    copyCanvasToClipboard,
    copyBlobToClipboard
  };
}

