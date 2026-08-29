/**
 * FullShot Pro - In-Page Area Selector (Crop HUD)
 * Isolated Shadow DOM v1 Component for interactive crosshair region selection & capture.
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
   * Starts the interactive crosshair area selection mode.
   * @param {Object} [options={}] - Selection and capture options
   * @param {string} [options.format='png'] - Capture image format ('png' or 'jpeg')
   * @param {number} [options.quality=95] - Image quality (1-100)
   * @param {Function} [options.onSelected] - Optional callback receiving cropped image data
   * @param {Function} [options.onCancel] - Optional callback on cancellation
   */
  function start(options = {}) {
    cleanup();

    if (window.FullShotHUD.toast) {
      window.FullShotHUD.toast.show('Seçili Alan Modu (Alt+Shift+S) - Kırpmak için sürükleyin, çıkmak için ESC', {
        icon: 'crop',
        duration: 3000
      });
    }

    const dpr = window.devicePixelRatio || 1;
    const format = options.format === 'jpeg' ? 'jpeg' : 'png';
    const quality = typeof options.quality === 'number' ? options.quality : 95;

    const originalBodyOverflow = document.body ? document.body.style.overflow : '';
    const originalHtmlOverflow = document.documentElement ? document.documentElement.style.overflow : '';
    const originalHtmlPaddingRight = document.documentElement ? document.documentElement.style.paddingRight : '';
    const originalBodyPaddingRight = document.body ? document.body.style.paddingRight : '';
    const scrollbarWidth = window.innerWidth - (document.documentElement ? document.documentElement.clientWidth : window.innerWidth);

    if (document.documentElement) {
      document.documentElement.style.overflow = 'hidden';
    }
    if (document.body) {
      document.body.style.overflow = 'hidden';
    }
    if (scrollbarWidth > 0 && document.documentElement) {
      const computedHtmlPaddingRight = parseFloat(window.getComputedStyle(document.documentElement).paddingRight) || 0;
      document.documentElement.style.setProperty('padding-right', `${computedHtmlPaddingRight + scrollbarWidth}px`, 'important');
    }

    const host = document.createElement('div');
    host.id = '__fullshot_selection_host__';
    host.style.cssText = 'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; cursor: crosshair !important; user-select: none !important; -webkit-user-select: none !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';

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
        .selection-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          cursor: crosshair;
          user-select: none;
          -webkit-user-select: none;
          box-sizing: border-box;
        }
        .selection-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .badge {
          position: absolute;
          background: #373a40;
          border: 1px solid #545862;
          color: #FFFFE3;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          pointer-events: none;
          display: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          z-index: 10;
          font-weight: 600;
        }
        .banner {
          position: absolute;
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
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
          animation: bannerIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes bannerIn {
          from { transform: translate(-50%, -15px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      </style>
      <div class="selection-overlay" id="overlay">
        <canvas class="selection-canvas" id="canvas"></canvas>
        <div class="badge" id="badge">0 x 0</div>
        <div class="banner">
          <span>Alanı seçmek için sürükleyin. Çıkmak için <b>ESC</b> tuşuna basın.</span>
        </div>
      </div>
    `;

    const targetContainer = document.fullscreenElement || document.body || document.documentElement;
    if (targetContainer) {
      targetContainer.appendChild(host);
    }

    currentHost = host;
    currentShadow = shadow;

    const overlay = shadow.getElementById('overlay');
    const canvas = shadow.getElementById('canvas');
    const badge = shadow.getElementById('badge');
    const ctx = canvas ? canvas.getContext('2d') : null;

    const updateCanvasSize = () => {
      if (!canvas || !ctx) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      drawMask(0, 0, 0, 0);
    };

    let isSelecting = false;
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;

    function drawMask(x, y, w, h) {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (w > 0 && h > 0) {
        ctx.clearRect(x * dpr, y * dpr, w * dpr, h * dpr);
        ctx.strokeStyle = '#6D8196';
        ctx.lineWidth = 2 * dpr;
        ctx.strokeRect(x * dpr, y * dpr, w * dpr, h * dpr);
      }
    }

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        if (typeof options.onCancel === 'function') {
          options.onCancel();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (window.FullShotHUD.toast) {
        window.FullShotHUD.toast.hide();
      }
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      currentX = e.clientX;
      currentY = e.clientY;
      if (badge) badge.style.display = 'block';
    };

    const onMouseMove = (e) => {
      if (!isSelecting) return;
      currentX = e.clientX;
      currentY = e.clientY;

      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const w = Math.abs(currentX - startX);
      const h = Math.abs(currentY - startY);

      drawMask(x, y, w, h);

      if (badge) {
        badge.textContent = `${Math.round(w * dpr)} × ${Math.round(h * dpr)} px`;
        badge.style.left = `${Math.min(window.innerWidth - 110, x + w + 10)}px`;
        badge.style.top = `${Math.min(window.innerHeight - 34, y + h + 10)}px`;
      }
    };

    const onMouseUp = async (e) => {
      if (!isSelecting) return;
      isSelecting = false;

      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const w = Math.abs(currentX - startX);
      const h = Math.abs(currentY - startY);

      cleanup();

      if (w < 8 || h < 8) return;

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
          console.error('Kırpma yakalama hatası:', res?.error);
          return;
        }

        try {
          const img = await loadImage(res.dataUrl);
          const imgWidth = img.naturalWidth || img.width;
          const imgHeight = img.naturalHeight || img.height;
          const imgDprX = imgWidth / window.innerWidth;
          const imgDprY = imgHeight / window.innerHeight;

          const sx = Math.max(0, Math.round(x * imgDprX));
          const sy = Math.max(0, Math.round(y * imgDprY));
          const sw = Math.min(imgWidth - sx, Math.round(w * imgDprX));
          const sh = Math.min(imgHeight - sy, Math.round(h * imgDprY));

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
            title: `Seçili Alan - ${document.title || 'Ekran'}`,
            url: window.location.href,
            width: sw,
            height: sh,
            format,
            timestamp: Date.now(),
            type: 'crop'
          };

          if (typeof options.onSelected === 'function') {
            options.onSelected(item);
          } else {
            await chrome.storage.local.set({ fullshot_current_capture: item });
            chrome.runtime.sendMessage({ action: 'openPreview' });
          }
        } catch (err) {
          console.error('Kırpma işleme hatası:', err);
        }
      });
    };

    if (overlay) {
      overlay.addEventListener('mousedown', onMouseDown);
      overlay.addEventListener('mousemove', onMouseMove);
      overlay.addEventListener('mouseup', onMouseUp);
    }

    activeCleanup = () => {
      if (window.FullShotHUD.toast) {
        window.FullShotHUD.toast.hide();
      }
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('keydown', onKeyDown, true);
      if (document.documentElement) {
        document.documentElement.style.overflow = originalHtmlOverflow;
        if (originalHtmlPaddingRight) {
          document.documentElement.style.paddingRight = originalHtmlPaddingRight;
        } else {
          document.documentElement.style.removeProperty('padding-right');
        }
      }
      if (document.body) {
        document.body.style.overflow = originalBodyOverflow;
        if (originalBodyPaddingRight) {
          document.body.style.paddingRight = originalBodyPaddingRight;
        } else {
          document.body.style.removeProperty('padding-right');
        }
      }
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
   * Cleans up and removes active Area Selector overlay.
   */
  function cleanup() {
    if (typeof activeCleanup === 'function') {
      activeCleanup();
      activeCleanup = null;
    }
    const existingHost = document.getElementById('__fullshot_selection_host__');
    if (existingHost) {
      existingHost.remove();
    }
    currentHost = null;
    currentShadow = null;
  }

  /**
   * Checks if area selection overlay is currently active.
   */
  function isActive() {
    return !!currentHost && document.contains(currentHost);
  }

  /**
   * Returns host element.
   */
  function getHost() {
    return currentHost;
  }

  // Export module to FullShotHUD namespace
  window.FullShotHUD.areaSelector = {
    start,
    cancel: cleanup,
    cleanup,
    isActive,
    getHost
  };
})();
