/**
 * FullShot Pro - Native Image Exporter & Clipboard Helper
 * Handles lossless PNG, compressed JPG, modern WebP downloads, and async Clipboard API copying.
 */

/**
 * Sanitizes page title and generates a timestamped export filename.
 * @param {string} title - Page or capture title
 * @param {string} extension - Desired file extension (png, jpg, webp, pdf)
 * @returns {string} Safe filename (e.g. FullShot_Dashboard_2026-08-29_20-15-00.png)
 */
function getExportFilename(title = 'Ekran_Goruntusu', extension = 'png') {
  const cleanTitle = (title || 'Ekran_Goruntusu')
    .replace(/[^a-zA-Z0-9_\-\u00C0-\u017F]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 40);

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
 * Triggers a file download using Chrome Downloads API with fallback to anchor click.
 * @param {Blob} blob - Binary file blob
 * @param {string} filename - Target filename
 * @returns {Promise<boolean>}
 */
function triggerBlobDownload(blob, filename) {
  return new Promise((resolve) => {
    if (!blob) {
      resolve(false);
      return;
    }

    const blobUrl = URL.createObjectURL(blob);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
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
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {string} format - 'png' | 'jpg' | 'jpeg' | 'webp'
 * @param {number} quality - Compression quality (0.0 to 1.0)
 * @param {string} customFilename - Optional custom filename
 * @returns {Promise<boolean>}
 */
async function downloadCanvasAsImage(canvas, format = 'png', quality = 0.95, customFilename = null) {
  if (!canvas || !canvas.width || !canvas.height) {
    throw new Error('Geçersiz tuval veya boş görüntü verisi.');
  }

  const fmt = format.toLowerCase().replace('jpeg', 'jpg');
  const filename = customFilename || getExportFilename('Ekran_Goruntusu', fmt);

  if (fmt === 'jpg') {
    // Render on white background to eliminate black transparency artifacts
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
 * Copies canvas image data directly to system clipboard as a PNG image.
 * @param {HTMLCanvasElement} canvas - Canvas to copy
 * @returns {Promise<boolean>} True if successful
 */
async function copyCanvasToClipboard(canvas) {
  if (!canvas || !canvas.width || !canvas.height) {
    throw new Error('Kopyalanacak tuval bulunamadı.');
  }

  if (!navigator.clipboard || !navigator.clipboard.write) {
    throw new Error('Tarayıcınız Clipboard API desteği sunmuyor.');
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Pano için PNG Blob oluşturulamadı.');
  }

  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob })
  ]);

  return true;
}

// Global Export
if (typeof window !== 'undefined') {
  window.FullShotImageExporter = {
    getExportFilename,
    triggerBlobDownload,
    downloadCanvasAsImage,
    copyCanvasToClipboard
  };
}
