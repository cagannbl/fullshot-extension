/**
 * FullShot Pro - In-Page Element Picker HUD
 * Isolated Shadow DOM v1 Component for interactive DOM element hover inspection & click-to-capture.
 * 4-Color Slate/Charcoal Palette (#4A4A4A, #CBCBCB, #FFFFE3, #6D8196)
 */

(function () {
  'use strict';

  window.FullShotHUD = window.FullShotHUD || {};

  let currentHost = null;
  let currentShadow = null;
  let activeCleanup = null;

  /**
   * Utility: Sleep helper
   */
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Helper: Double rAF layout sync
   */
  function waitForDoubleRAF() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }

  /**
   * Helper: Load Image from DataURL
   */
  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Görüntü verisi yüklenemedi.'));
      img.src = dataUrl;
    });
  }

  /**
   * Helper: Copy dataURL to clipboard as PNG
   */
  async function copyDataUrlToClipboard(dataUrl) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        return true;
      }
    } catch (err) {
      console.warn('[ElementPicker] ClipboardItem kopyalama hatası:', err);
    }
    return false;
  }

  /**
   * Starts the interactive DOM element hover highlighter & picker mode.
   * @param {Object} [options={}] - Picker & capture options
   * @param {string} [options.format='png'] - Capture image format ('png' or 'jpeg')
   * @param {number} [options.quality=95] - Image quality (1-100)
   * @param {Function} [options.onSelected] - Optional custom handler on element captured
   * @param {Function} [options.onCancel] - Optional cancel callback
   */
  function start(options = {}) {
    cleanup();

    if (window.FullShotHUD.toast) {
      window.FullShotHUD.toast.show('Öğe Seçici Modu (Alt+Shift+E) - Yakalamak için tıklayın, çıkmak için ESC', {
        icon: 'element',
        duration: 3000
      });
    }

    const dpr = window.devicePixelRatio || 1;
    const format = options.format === 'jpeg' ? 'jpeg' : 'png';
    const quality = typeof options.quality === 'number' ? options.quality : 95;

    const host = document.createElement('div');
    host.id = '__fullshot_picker_host__';
    host.style.cssText = 'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; pointer-events: none !important; user-select: none !important; -webkit-user-select: none !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        .highlight-box {
          position: fixed;
          border: 2px solid #6D8196;
          background: rgba(109, 129, 150, 0.14);
          border-radius: 6px;
          pointer-events: none;
          transition: all 0.05s ease-out;
          display: none;
          box-sizing: border-box;
          z-index: 2147483647;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 0 12px rgba(109, 129, 150, 0.2);
        }
        .tag-badge {
          position: absolute;
          top: -26px;
          left: 0;
          background: #373a40;
          border: 1px solid #545862;
          color: #FFFFE3;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          padding: 2px 7px;
          border-radius: 6px;
          white-space: nowrap;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
          font-weight: 600;
        }
        .banner {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #2c2e33;
          border: 1px solid #545862;
          color: #FFFFE3;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 12px;
          font-weight: 500;
        .quick-bar {
          position: fixed;
          display: none;
          align-items: center;
          gap: 6px;
          background: #2b2e33;
          border: 1px solid #545862;
          border-radius: 12px;
          padding: 6px 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(109, 129, 150, 0.25);
          z-index: 2147483647;
          animation: qbPop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: default;
          pointer-events: auto;
        }
        @keyframes qbPop {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .qb-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #373a40;
          color: #FFFFE3;
          border: 1px solid #545862;
          border-radius: 8px;
          padding: 7px 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          outline: none;
        }
        .qb-btn:hover {
          background: #6D8196;
          border-color: #6D8196;
          color: #FFFFE3;
          transform: translateY(-1px);
        }
        .qb-btn:active {
          transform: translateY(0);
        }
        .qb-btn.qb-studio {
          background: #6D8196;
          border-color: #6D8196;
        }
        .qb-btn.qb-studio:hover {
          background: #8096ac;
        }
        .qb-btn.qb-cancel {
          padding: 7px 9px;
          color: #CBCBCB;
        }
        .qb-btn.qb-cancel:hover {
          background: #ef4444;
          border-color: #ef4444;
          color: #fff;
        }
        .qb-btn svg {
          display: block;
        }
      </style>
      <div class="highlight-box" id="box">
        <div class="tag-badge" id="tag">element</div>
      </div>
      <div class="banner" id="banner">
        <span>Yakalamak istediğiniz öğeye veya bölüme tıklayın. Çıkmak için <b>ESC</b> tuşuna basın.</span>
      </div>
      <div class="quick-bar" id="quickBar">
        <button class="qb-btn qb-copy" id="qbCopyBtn" title="Panoya Kopyala (Ctrl+C)">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
          <span>Kopyala</span>
        </button>
        <button class="qb-btn qb-download" id="qbDownloadBtn" title="Doğrudan İndir (PNG)">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>İndir</span>
        </button>
        <button class="qb-btn qb-studio" id="qbStudioBtn" title="Gelişmiş Çizim ve İşaretleme Stüdyosunda Aç">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          <span>Gelişmiş Stüdyo ↗</span>
        </button>
        <button class="qb-btn qb-cancel" id="qbCancelBtn" title="İptal Et (ESC)">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `;

    const targetContainer = document.fullscreenElement || document.body || document.documentElement;
    if (targetContainer) {
      targetContainer.appendChild(host);
    }

    currentHost = host;
    currentShadow = shadow;

    const box = shadow.getElementById('box');
    const tag = shadow.getElementById('tag');
    const banner = shadow.getElementById('banner');
    const quickBar = shadow.getElementById('quickBar');
    const qbCopyBtn = shadow.getElementById('qbCopyBtn');
    const qbDownloadBtn = shadow.getElementById('qbDownloadBtn');
    const qbStudioBtn = shadow.getElementById('qbStudioBtn');
    const qbCancelBtn = shadow.getElementById('qbCancelBtn');
    let hoveredElement = null;
    let selectedElement = null;
    let selectedRect = null;
    let isFrozen = false;

    const onMouseMove = (e) => {
      if (isFrozen) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el === host || el.closest('[id^="__fullshot_"]')) return;
      hoveredElement = el;

      const rect = el.getBoundingClientRect();
      if (!box || !tag) return;

      box.style.display = 'block';
      box.style.top = `${rect.top}px`;
      box.style.left = `${rect.left}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;

      const tagName = el.tagName ? el.tagName.toLowerCase() : 'div';
      const isFrame = tagName === 'iframe' || tagName === 'frame';
      let className = '';
      try {
        if (el.className && typeof el.className === 'string') {
          const firstClass = el.className.trim().split(/\s+/)[0];
          if (firstClass) className = `.${firstClass}`;
        }
      } catch (err) {}

      const tagLabel = isFrame ? `<iframe> (Frame)` : `<${tagName}${className}>`;
      tag.textContent = `${tagLabel} • ${Math.round(rect.width * dpr)} × ${Math.round(rect.height * dpr)} px`;

      // If box is too close to top edge, place badge inside
      if (rect.top < 30) {
        tag.style.top = '4px';
        tag.style.left = '4px';
      } else {
        tag.style.top = '-26px';
        tag.style.left = '0';
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        if (typeof options.onCancel === 'function') {
          options.onCancel();
        }
      } else if (isFrozen && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (qbCopyBtn) qbCopyBtn.click();
      } else if (isFrozen && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (qbDownloadBtn) qbDownloadBtn.click();
      } else if (isFrozen && e.key === 'Enter') {
        e.preventDefault();
        if (qbStudioBtn) qbStudioBtn.click();
      }
    };

    async function executeElementCapture(actionType) {
      if (!selectedElement || !selectedRect) return;
      const targetEl = selectedElement;
      const rect = selectedRect;

      if (quickBar) quickBar.style.display = 'none';
      if (box) box.style.display = 'none';
      if (banner) banner.style.display = 'none';

      // GPU Compositor reflow & Double rAF ghosting protection
      void document.documentElement.offsetHeight;
      if (document.body) {
        void document.body.offsetHeight;
      }
      await waitForDoubleRAF();
      await sleep(50);

      chrome.runtime.sendMessage({
        action: 'captureVisibleTab',
        format,
        quality
      }, async (res) => {
        cleanup();

        if (!res || !res.success || !res.dataUrl) {
          console.error('Element yakalama hatası:', res?.error);
          return;
        }

        try {
          const img = await loadImage(res.dataUrl);
          const imgWidth = img.naturalWidth || img.width;
          const imgHeight = img.naturalHeight || img.height;
          const imgDprX = imgWidth / window.innerWidth;
          const imgDprY = imgHeight / window.innerHeight;

          const sx = Math.max(0, Math.round(rect.left * imgDprX));
          const sy = Math.max(0, Math.round(rect.top * imgDprY));
          const sw = Math.min(imgWidth - sx, Math.round(rect.width * imgDprX));
          const sh = Math.min(imgHeight - sy, Math.round(rect.height * imgDprY));

          if (sw <= 0 || sh <= 0) return;

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = sw;
          cropCanvas.height = sh;
          const cropCtx = cropCanvas.getContext('2d');

          if (format === 'jpeg') {
            cropCtx.fillStyle = '#ffffff';
            cropCtx.fillRect(0, 0, sw, sh);
          }

          cropCtx.drawImage(
            img,
            sx, sy, sw, sh,
            0, 0, sw, sh
          );

          const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const croppedDataUrl = cropCanvas.toDataURL(mime, quality / 100);

          const item = {
            dataUrl: croppedDataUrl,
            title: `Öğe / Bölüm - <${targetEl.tagName ? targetEl.tagName.toLowerCase() : 'element'}>`,
            url: window.location.href,
            width: sw,
            height: sh,
            format,
            timestamp: Date.now(),
            type: 'element'
          };

          if (actionType === 'copy') {
            const copied = await copyDataUrlToClipboard(croppedDataUrl);
            if (window.FullShotHUD.toast) {
              window.FullShotHUD.toast.show(copied ? 'Görsel Panoya Kopyalandı! 📋' : 'Panoya kopyalama tamamlandı.', {
                icon: 'copy',
                duration: 2500
              });
            }
          } else if (actionType === 'download') {
            const filename = `FullShot_Element_${Date.now()}.${format}`;
            chrome.runtime.sendMessage({
              action: 'DIRECT_DOWNLOAD',
              dataUrl: croppedDataUrl,
              filename,
              saveAs: false
            });
            if (window.FullShotHUD.toast) {
              window.FullShotHUD.toast.show('Görsel Başarıyla İndirildi! 💾', {
                icon: 'download',
                duration: 2500
              });
            }
          } else if (actionType === 'studio') {
            if (typeof options.onSelected === 'function') {
              options.onSelected(item);
            } else {
              await chrome.storage.local.set({ fullshot_current_capture: item });
              chrome.runtime.sendMessage({ action: 'OPEN_IN_STUDIO', captureData: item });
            }
          }
        } catch (err) {
          console.error('Element işleme hatası:', err);
        }
      });
    }

    if (qbCopyBtn) {
      qbCopyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        executeElementCapture('copy');
      });
    }

    if (qbDownloadBtn) {
      qbDownloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        executeElementCapture('download');
      });
    }

    if (qbStudioBtn) {
      qbStudioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        executeElementCapture('studio');
      });
    }

    if (qbCancelBtn) {
      qbCancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cleanup();
        if (typeof options.onCancel === 'function') {
          options.onCancel();
        }
      });
    }

    const onClick = (e) => {
      // Ignore clicks originating from inside the quickBar
      if (e.composedPath && e.composedPath().includes(quickBar)) return;
      e.preventDefault();
      e.stopPropagation();

      if (window.FullShotHUD.toast) {
        window.FullShotHUD.toast.hide();
      }

      if (!hoveredElement) {
        cleanup();
        return;
      }

      selectedElement = hoveredElement;
      selectedRect = selectedElement.getBoundingClientRect();
      if (selectedRect.width < 4 || selectedRect.height < 4) return;

      isFrozen = true;
      host.style.pointerEvents = 'auto';

      if (quickBar) {
        quickBar.style.display = 'inline-flex';
        if (banner) banner.style.display = 'none';

        const barWidth = 340;
        const barHeight = 44;
        let barLeft = Math.min(window.innerWidth - barWidth - 16, Math.max(16, selectedRect.left + selectedRect.width - barWidth));
        let barTop = selectedRect.top + selectedRect.height + 10;
        if (barTop + barHeight > window.innerHeight - 16) {
          barTop = Math.max(16, selectedRect.top - barHeight - 10);
        }
        quickBar.style.left = `${barLeft}px`;
        quickBar.style.top = `${barTop}px`;
      }
    };

    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKeyDown, true);

    activeCleanup = () => {
      if (window.FullShotHUD.toast) {
        window.FullShotHUD.toast.hide();
      }
      window.removeEventListener('mousemove', onMouseMove, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKeyDown, true);
      if (host) {
        host.remove();
      }
      if (currentHost === host) {
        currentHost = null;
        currentShadow = null;
        activeCleanup = null;
      }
    };
  }

  /**
   * Cleans up and removes the Element Picker from DOM.
   */
  function cleanup() {
    if (typeof activeCleanup === 'function') {
      activeCleanup();
      activeCleanup = null;
    }
    const existingHost = document.getElementById('__fullshot_picker_host__');
    if (existingHost) {
      existingHost.remove();
    }
    currentHost = null;
    currentShadow = null;
  }

  /**
   * Checks if Element Picker is active.
   */
  function isActive() {
    return !!currentHost && document.contains(currentHost);
  }

  /**
   * Returns host element reference.
   */
  function getHost() {
    return currentHost;
  }

  // Export module to FullShotHUD namespace
  window.FullShotHUD.elementPicker = {
    start,
    cancel: cleanup,
    cleanup,
    isActive,
    getHost
  };
})();
