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
          all: initial !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
          line-height: normal !important;
          letter-spacing: normal !important;
          text-align: left !important;
          color: #FFFFE3 !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          direction: ltr !important;
        }
        *, *::before, *::after {
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
          font-family: inherit !important;
          scrollbar-width: none !important;
        }
        ::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .highlight-box {
          position: fixed;
          border: 2px solid #6D8196;
          background: rgba(109, 129, 150, 0.16);
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
          max-width: calc(100vw - 32px);
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .banner {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #4A4A4A;
          border: 1px solid #545862;
          color: #FFFFE3;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 12px;
          font-weight: 500;
          padding: 8px 18px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(109, 129, 150, 0.2);
          pointer-events: none;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 2147483647;
          animation: bannerIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          max-width: calc(100vw - 32px);
          white-space: nowrap;
        }
        @keyframes bannerIn {
          from { transform: translate(-50%, -15px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .quick-bar {
          position: fixed;
          display: none;
          align-items: center;
          gap: 6px;
          background: #4A4A4A;
          border: 1px solid #545862;
          border-radius: 12px;
          padding: 6px 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(109, 129, 150, 0.25);
          z-index: 2147483647;
          animation: qbPop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: default;
          pointer-events: auto;
          user-select: none;
          -webkit-user-select: none;
          max-width: calc(100vw - 24px);
        }
        @keyframes qbPop {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .qb-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
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
          line-height: 1;
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
          color: #FFFFE3;
        }
        .qb-btn.qb-studio:hover {
          background: #8096ac;
          border-color: #8096ac;
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
          flex-shrink: 0;
          pointer-events: none;
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
          const viewportW = document.documentElement.clientWidth || window.innerWidth;
          const viewportH = document.documentElement.clientHeight || window.innerHeight;
          const imgDprX = imgWidth / viewportW;
          const imgDprY = imgHeight / viewportH;

          const sx = Math.max(0, Math.round(rect.left * imgDprX));
          const sy = Math.max(0, Math.round(rect.top * imgDprY));
          const sw = Math.min(imgWidth - sx, Math.round(rect.width * imgDprX));
          const sh = Math.min(imgHeight - sy, Math.round(rect.height * imgDprY));

          if (sw <= 0 || sh <= 0) return;

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = sw;
          cropCanvas.height = sh;
          const cropCtx = cropCanvas.getContext('2d', { alpha: true });

          // High-precision anti-aliased bicubic sampling for smooth curved edges and text
          cropCtx.imageSmoothingEnabled = true;
          cropCtx.imageSmoothingQuality = 'high';

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
          const croppedDataUrl = format === 'jpeg' 
            ? cropCanvas.toDataURL('image/jpeg', (quality || 98) / 100)
            : cropCanvas.toDataURL('image/png');

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

    function positionQuickBar(rect) {
      if (!quickBar || !rect) return;
      const barWidth = 340;
      const barHeight = 44;
      const margin = 12;

      let barLeft = rect.left + rect.width - barWidth;
      if (rect.width < barWidth) {
        barLeft = rect.left + (rect.width / 2) - (barWidth / 2);
      }
      const maxLeft = Math.max(margin, window.innerWidth - barWidth - margin);
      barLeft = Math.max(margin, Math.min(barLeft, maxLeft));

      let barTop = rect.top + rect.height + 10;
      if (barTop + barHeight > window.innerHeight - margin) {
        barTop = rect.top - barHeight - 10;
      }
      const maxTop = Math.max(margin, window.innerHeight - barHeight - margin);
      barTop = Math.max(margin, Math.min(barTop, maxTop));

      quickBar.style.left = `${Math.round(barLeft)}px`;
      quickBar.style.top = `${Math.round(barTop)}px`;
    }

    const onResize = () => {
      if (isFrozen && selectedElement && box && quickBar) {
        selectedRect = selectedElement.getBoundingClientRect();
        box.style.top = `${selectedRect.top}px`;
        box.style.left = `${selectedRect.left}px`;
        box.style.width = `${selectedRect.width}px`;
        box.style.height = `${selectedRect.height}px`;
        positionQuickBar(selectedRect);
      }
    };
    window.addEventListener('resize', onResize);

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
        positionQuickBar(selectedRect);
      }
    };

    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKeyDown, true);

    activeCleanup = () => {
      if (window.FullShotHUD.toast) {
        window.FullShotHUD.toast.hide();
      }
      window.removeEventListener('resize', onResize);
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

  /**
   * Hides picker with complete ghosting protection before screenshot capture.
   */
  async function hideForCapture() {
    if (currentHost) {
      currentHost.style.setProperty('display', 'none', 'important');
      void document.documentElement.offsetHeight;
      if (document.body) {
        void document.body.offsetHeight;
      }
      await waitForDoubleRAF();
      await sleep(50);
    }
  }

  /**
   * Restores visibility after screenshot capture.
   */
  function restoreAfterCapture() {
    if (currentHost) {
      currentHost.style.removeProperty('display');
    }
  }

  // Export module to FullShotHUD namespace
  window.FullShotHUD.elementPicker = {
    start,
    cancel: cleanup,
    cleanup,
    isActive,
    getHost,
    hideForCapture,
    restoreAfterCapture
  };
})();
