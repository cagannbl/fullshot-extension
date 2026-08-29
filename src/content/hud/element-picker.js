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
          padding: 8px 18px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(109, 129, 150, 0.2);
          pointer-events: none;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: bannerIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes bannerIn {
          from { transform: translate(-50%, -15px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      </style>
      <div class="highlight-box" id="box">
        <div class="tag-badge" id="tag">element</div>
      </div>
      <div class="banner">
        <span>Yakalamak istediğiniz öğeye veya bölüme tıklayın. Çıkmak için <b>ESC</b> tuşuna basın.</span>
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
    let hoveredElement = null;

    const onMouseMove = (e) => {
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
      }
    };

    const onClick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (window.FullShotHUD.toast) {
        window.FullShotHUD.toast.hide();
      }

      if (!hoveredElement) {
        cleanup();
        return;
      }

      const targetEl = hoveredElement;
      const rect = targetEl.getBoundingClientRect();
      cleanup();

      if (rect.width < 4 || rect.height < 4) return;

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

          if (typeof options.onSelected === 'function') {
            options.onSelected(item);
          } else {
            await chrome.storage.local.set({ fullshot_current_capture: item });
            chrome.runtime.sendMessage({ action: 'openPreview' });
          }
        } catch (err) {
          console.error('Element işleme hatası:', err);
        }
      });
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
