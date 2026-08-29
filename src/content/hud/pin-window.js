/**
 * FullShot Pro - In-Page Pin to Screen (Floating Reference Window)
 * Isolated Shadow DOM v1 Component for pinning captures on screen.
 * Features: Draggable, Resizable, Opacity control (10%-100%), Double-click collapse,
 * Document Picture-in-Picture (Always-on-Top), Invert mode, Copy, Download, Studio.
 * 4-Color Slate/Charcoal Palette (#4A4A4A, #CBCBCB, #FFFFE3, #6D8196)
 */

(function () {
  'use strict';

  window.FullShotHUD = window.FullShotHUD || {};

  let pinHost = null;
  let pinShadow = null;
  let activePinInstances = new Map(); // id -> pinInstance

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
      console.warn('[PinWindow] ClipboardItem kopyalama hatası:', err);
    }
    return false;
  }

  /**
   * Ensures the root Shadow DOM host container is mounted.
   */
  function ensureHost() {
    if (pinHost && document.contains(pinHost)) {
      return { host: pinHost, shadow: pinShadow };
    }

    const host = document.createElement('div');
    host.id = '__fullshot_pin_host__';
    host.style.cssText = 'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; z-index: 2147483645 !important; pointer-events: none !important; user-select: none !important; -webkit-user-select: none !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host {
          all: initial !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
          line-height: normal !important;
          color: #FFFFE3 !important;
          direction: ltr !important;
          -webkit-font-smoothing: antialiased !important;
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
        .pin-window {
          position: fixed;
          background: #4A4A4A;
          border: 1px solid #545862;
          border-radius: 12px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(109, 129, 150, 0.3);
          display: flex;
          flex-direction: column;
          pointer-events: auto;
          user-select: none;
          -webkit-user-select: none;
          z-index: 2147483645;
          overflow: hidden;
          min-width: 180px;
          min-height: 120px;
          transition: box-shadow 0.15s ease, opacity 0.1s ease;
        }
        .pin-window.active-focus {
          border-color: #6D8196;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 0 2px rgba(109, 129, 150, 0.5);
          z-index: 2147483646;
        }
        .pin-window.collapsed {
          min-height: auto !important;
          height: auto !important;
          width: auto !important;
          border-radius: 20px;
        }
        .pin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          background: #373a40;
          border-bottom: 1px solid #545862;
          cursor: grab;
          gap: 8px;
        }
        .pin-header:active {
          cursor: grabbing;
        }
        .pin-window.collapsed .pin-header {
          border-bottom: none;
          border-radius: 20px;
          padding: 6px 12px;
        }
        .pin-title-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #FFFFE3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .pin-icon {
          display: flex;
          align-items: center;
          color: #6D8196;
          flex-shrink: 0;
        }
        .pin-title {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pin-controls {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .pin-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid transparent;
          color: #CBCBCB;
          cursor: pointer;
          transition: all 0.12s ease;
          padding: 0;
        }
        .pin-btn:hover {
          background: #4A4A4A;
          border-color: #545862;
          color: #FFFFE3;
        }
        .pin-btn.btn-close:hover {
          background: #ef4444;
          border-color: #ef4444;
          color: #ffffff;
        }
        .pin-btn.btn-active {
          background: #6D8196;
          color: #FFFFE3;
        }
        .pin-body {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #24262b;
          overflow: hidden;
          min-height: 80px;
        }
        .pin-window.collapsed .pin-body,
        .pin-window.collapsed .pin-footer {
          display: none !important;
        }
        .pin-image {
          display: block;
          max-width: 100%;
          max-height: 100%;
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
          transition: filter 0.15s ease;
        }
        .pin-image.inverted {
          filter: invert(1) hue-rotate(180deg);
        }
        .pin-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 10px;
          background: #373a40;
          border-top: 1px solid #545862;
          font-size: 11px;
          color: #CBCBCB;
          gap: 8px;
        }
        .pin-slider-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
        }
        .pin-slider-label {
          font-size: 10px;
          font-weight: 600;
          color: #CBCBCB;
          width: 28px;
        }
        .pin-slider {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: #545862;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .pin-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #6D8196;
          border: 2px solid #FFFFE3;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.5);
        }
        .pin-footer-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .pin-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 7px;
          font-size: 10px;
          font-weight: 600;
          background: #4A4A4A;
          border: 1px solid #545862;
          color: #FFFFE3;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .pin-action-btn:hover {
          background: #6D8196;
          border-color: #6D8196;
        }
        /* Resize Handles */
        .resizer {
          position: absolute;
          z-index: 10;
        }
        .resizer-r { top: 0; right: 0; width: 6px; height: 100%; cursor: ew-resize; }
        .resizer-b { bottom: 0; left: 0; width: 100%; height: 6px; cursor: ns-resize; }
        .resizer-l { top: 0; left: 0; width: 6px; height: 100%; cursor: ew-resize; }
        .resizer-t { top: 0; left: 0; width: 100%; height: 6px; cursor: ns-resize; }
        .resizer-rb { bottom: 0; right: 0; width: 12px; height: 12px; cursor: nwse-resize; }
        .resizer-lb { bottom: 0; left: 0; width: 12px; height: 12px; cursor: nesw-resize; }
        .resizer-rt { top: 0; right: 0; width: 12px; height: 12px; cursor: nesw-resize; }
        .resizer-lt { top: 0; left: 0; width: 12px; height: 12px; cursor: nwse-resize; }
      </style>
      <div id="pinContainer"></div>
    `;

    const targetContainer = document.fullscreenElement || document.body || document.documentElement;
    if (targetContainer) {
      targetContainer.appendChild(host);
    }

    pinHost = host;
    pinShadow = shadow;

    return { host, shadow };
  }

  /**
   * Pins a captured image to the screen as a floating, resizable, draggable reference window.
   * @param {Object|string} captureData - Capture item or DataURL
   * @param {Object} [options={}] - Extra config
   */
  function pin(captureData, options = {}) {
    const { shadow } = ensureHost();
    const container = shadow.getElementById('pinContainer');
    if (!container) return null;

    const pinId = `pin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const dataUrl = typeof captureData === 'string' ? captureData : captureData?.dataUrl;
    const title = (typeof captureData === 'object' && captureData?.title) ? captureData.title : 'Ekran Referansı';
    const initialWidth = Math.min(Math.max(280, (captureData?.width || 360)), window.innerWidth - 60);
    const initialHeight = Math.min(Math.max(200, (captureData?.height || 260)), window.innerHeight - 80);

    // Initial position cascading
    const offset = (activePinInstances.size * 24) % 180;
    const startLeft = Math.max(20, Math.min(window.innerWidth - initialWidth - 30 - offset, 60 + offset));
    const startTop = Math.max(20, Math.min(window.innerHeight - initialHeight - 40 - offset, 80 + offset));

    const winEl = document.createElement('div');
    winEl.className = 'pin-window active-focus';
    winEl.id = pinId;
    winEl.style.left = `${startLeft}px`;
    winEl.style.top = `${startTop}px`;
    winEl.style.width = `${initialWidth}px`;
    winEl.style.height = `${initialHeight}px`;

    winEl.innerHTML = `
      <div class="pin-header" id="${pinId}_header">
        <div class="pin-title-wrap">
          <span class="pin-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path></svg>
          </span>
          <span class="pin-title">${title}</span>
        </div>
        <div class="pin-controls">
          <button class="pin-btn btn-pip" id="${pinId}_pipBtn" title="Always-on-Top / Picture-in-Picture">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><rect x="12" y="9" width="8" height="6" rx="1" fill="currentColor"></rect></svg>
          </button>
          <button class="pin-btn btn-invert" id="${pinId}_invertBtn" title="Renkleri Tersine Çevir (Invert)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"></path></svg>
          </button>
          <button class="pin-btn btn-collapse" id="${pinId}_collapseBtn" title="Simge Durumuna Küçült (Çift Tıkla)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button class="pin-btn btn-close" id="${pinId}_closeBtn" title="Kapat (ESC)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <div class="pin-body" id="${pinId}_body">
        <img class="pin-image" id="${pinId}_img" src="${dataUrl}" alt="Referans Görsel">
      </div>
      <div class="pin-footer" id="${pinId}_footer">
        <div class="pin-slider-wrap">
          <span class="pin-slider-label" id="${pinId}_opacityLabel">100%</span>
          <input type="range" class="pin-slider" id="${pinId}_opacitySlider" min="10" max="100" value="100" title="Opaklık Ayarı (%10 - %100)">
        </div>
        <div class="pin-footer-actions">
          <button class="pin-action-btn" id="${pinId}_copyBtn" title="Panoya Kopyala">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Kopyala</span>
          </button>
          <button class="pin-action-btn" id="${pinId}_downloadBtn" title="İndir (PNG)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>İndir</span>
          </button>
          <button class="pin-action-btn" id="${pinId}_studioBtn" title="Stüdyoda Düzenle">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            <span>Stüdyo</span>
          </button>
        </div>
      </div>

      <!-- Resizers -->
      <div class="resizer resizer-r" data-dir="r"></div>
      <div class="resizer resizer-b" data-dir="b"></div>
      <div class="resizer resizer-l" data-dir="l"></div>
      <div class="resizer resizer-t" data-dir="t"></div>
      <div class="resizer resizer-rb" data-dir="rb"></div>
      <div class="resizer resizer-lb" data-dir="lb"></div>
      <div class="resizer resizer-rt" data-dir="rt"></div>
      <div class="resizer resizer-lt" data-dir="lt"></div>
    `;

    container.appendChild(winEl);

    // Elements
    const header = winEl.querySelector(`#${pinId}_header`);
    const img = winEl.querySelector(`#${pinId}_img`);
    const opacitySlider = winEl.querySelector(`#${pinId}_opacitySlider`);
    const opacityLabel = winEl.querySelector(`#${pinId}_opacityLabel`);
    const pipBtn = winEl.querySelector(`#${pinId}_pipBtn`);
    const invertBtn = winEl.querySelector(`#${pinId}_invertBtn`);
    const collapseBtn = winEl.querySelector(`#${pinId}_collapseBtn`);
    const closeBtn = winEl.querySelector(`#${pinId}_closeBtn`);
    const copyBtn = winEl.querySelector(`#${pinId}_copyBtn`);
    const downloadBtn = winEl.querySelector(`#${pinId}_downloadBtn`);
    const studioBtn = winEl.querySelector(`#${pinId}_studioBtn`);

    let isCollapsed = false;
    let isInverted = false;
    let currentOpacity = 1.0;
    let savedExpandedW = initialWidth;
    let savedExpandedH = initialHeight;

    // Focus / bring to top
    const focusWin = () => {
      container.querySelectorAll('.pin-window').forEach((w) => w.classList.remove('active-focus'));
      winEl.classList.add('active-focus');
    };
    winEl.addEventListener('mousedown', focusWin);

    // 1. Dragging Implementation
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let winStartX = 0, winStartY = 0;

    const onHeaderMouseDown = (e) => {
      if (e.target.closest('.pin-btn') || e.target.closest('input')) return;
      if (e.button !== 0) return;
      e.preventDefault();
      focusWin();

      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = winEl.getBoundingClientRect();
      winStartX = rect.left;
      winStartY = rect.top;

      window.addEventListener('mousemove', onDragMouseMove, true);
      window.addEventListener('mouseup', onDragMouseUp, true);
    };

    const onDragMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      let newLeft = winStartX + dx;
      let newTop = winStartY + dy;

      // Clamp inside viewport
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - winEl.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - 30));

      winEl.style.left = `${Math.round(newLeft)}px`;
      winEl.style.top = `${Math.round(newTop)}px`;
    };

    const onDragMouseUp = () => {
      isDragging = false;
      window.removeEventListener('mousemove', onDragMouseMove, true);
      window.removeEventListener('mouseup', onDragMouseUp, true);
    };

    header.addEventListener('mousedown', onHeaderMouseDown);

    // 2. Resizing Implementation
    const resizers = winEl.querySelectorAll('.resizer');
    resizers.forEach((r) => {
      r.addEventListener('mousedown', (e) => {
        if (isCollapsed) return;
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        focusWin();

        const dir = r.getAttribute('data-dir');
        const startX = e.clientX;
        const startY = e.clientY;
        const startRect = winEl.getBoundingClientRect();

        const onResizeMove = (ev) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;

          let newW = startRect.width;
          let newH = startRect.height;
          let newL = startRect.left;
          let newT = startRect.top;

          if (dir.includes('r')) newW = Math.max(180, startRect.width + dx);
          if (dir.includes('b')) newH = Math.max(120, startRect.height + dy);
          if (dir.includes('l')) {
            const potentialW = startRect.width - dx;
            if (potentialW >= 180) {
              newW = potentialW;
              newL = startRect.left + dx;
            }
          }
          if (dir.includes('t')) {
            const potentialH = startRect.height - dy;
            if (potentialH >= 120) {
              newH = potentialH;
              newT = startRect.top + dy;
            }
          }

          winEl.style.width = `${Math.round(newW)}px`;
          winEl.style.height = `${Math.round(newH)}px`;
          winEl.style.left = `${Math.round(newL)}px`;
          winEl.style.top = `${Math.round(newT)}px`;
        };

        const onResizeUp = () => {
          window.removeEventListener('mousemove', onResizeMove, true);
          window.removeEventListener('mouseup', onResizeUp, true);
        };

        window.addEventListener('mousemove', onResizeMove, true);
        window.addEventListener('mouseup', onResizeUp, true);
      });
    });

    // 3. Opacity Control (Slider & Alt+Wheel)
    const updateOpacity = (val) => {
      currentOpacity = Math.max(0.1, Math.min(1.0, val / 100));
      winEl.style.opacity = currentOpacity;
      if (opacityLabel) opacityLabel.textContent = `${Math.round(currentOpacity * 100)}%`;
      if (opacitySlider) opacitySlider.value = Math.round(currentOpacity * 100);
    };

    if (opacitySlider) {
      opacitySlider.addEventListener('input', (e) => {
        updateOpacity(parseInt(e.target.value, 10));
      });
    }

    winEl.addEventListener('wheel', (e) => {
      if (e.altKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 5 : -5;
        const currentVal = Math.round(currentOpacity * 100);
        updateOpacity(currentVal + delta);
      }
    }, { passive: false });

    // 4. Double-click to Toggle Collapse / Expand
    const toggleCollapse = () => {
      isCollapsed = !isCollapsed;
      if (isCollapsed) {
        savedExpandedW = winEl.offsetWidth;
        savedExpandedH = winEl.offsetHeight;
        winEl.classList.add('collapsed');
      } else {
        winEl.classList.remove('collapsed');
        winEl.style.width = `${savedExpandedW}px`;
        winEl.style.height = `${savedExpandedH}px`;
      }
    };

    header.addEventListener('dblclick', (e) => {
      if (e.target.closest('.pin-btn') || e.target.closest('input')) return;
      toggleCollapse();
    });

    if (collapseBtn) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse();
      });
    }

    // 5. Invert Colors Mode
    if (invertBtn) {
      invertBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isInverted = !isInverted;
        img.classList.toggle('inverted', isInverted);
        invertBtn.classList.toggle('btn-active', isInverted);
      });
    }

    // 6. Document Picture-in-Picture (Always-on-Top OS Window)
    if (pipBtn) {
      pipBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          if ('documentPictureInPicture' in window && typeof window.documentPictureInPicture.requestWindow === 'function') {
            const pipWin = await window.documentPictureInPicture.requestWindow({
              width: Math.min(winEl.offsetWidth, 800),
              height: Math.min(winEl.offsetHeight, 600)
            });

            pipWin.document.body.style.cssText = 'margin:0; background:#24262b; display:flex; align-items:center; justify-content:center; height:100vh; overflow:hidden;';
            const pipImg = pipWin.document.createElement('img');
            pipImg.src = dataUrl;
            pipImg.style.cssText = 'max-width:100%; max-height:100%; object-fit:contain;';
            if (isInverted) pipImg.style.filter = 'invert(1) hue-rotate(180deg)';
            pipWin.document.body.appendChild(pipImg);

            if (window.FullShotHUD.toast) {
              window.FullShotHUD.toast.show('Always-on-Top Referans Penceresi Açıldı 📌', { icon: 'check', duration: 2500 });
            }
          } else {
            if (window.FullShotHUD.toast) {
              window.FullShotHUD.toast.show('Tarayıcınız Document PiP desteklemiyor, sayfa içi yüzen pencere aktif.', { icon: 'info', duration: 2500 });
            }
          }
        } catch (err) {
          console.warn('[PinWindow] PiP açma hatası:', err);
        }
      });
    }

    // 7. Actions: Copy, Download, Studio, Close
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const success = await copyDataUrlToClipboard(dataUrl);
        if (window.FullShotHUD.toast) {
          window.FullShotHUD.toast.show(success ? 'Referans Görsel Panoya Kopyalandı! 📋' : 'Panoya kopyalandı.', {
            icon: 'copy',
            duration: 2500
          });
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const filename = `FullShot_Pin_${Date.now()}.png`;
        chrome.runtime.sendMessage({
          action: 'DIRECT_DOWNLOAD',
          dataUrl,
          filename,
          saveAs: false
        });
        if (window.FullShotHUD.toast) {
          window.FullShotHUD.toast.show('Görsel Başarıyla İndirildi! 💾', {
            icon: 'download',
            duration: 2500
          });
        }
      });
    }

    if (studioBtn) {
      studioBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = {
          dataUrl,
          title: `Sabitlenen Referans - ${title}`,
          url: window.location.href,
          width: initialWidth,
          height: initialHeight,
          format: 'png',
          timestamp: Date.now(),
          type: 'pin'
        };
        await chrome.storage.local.set({ fullshot_current_capture: item });
        chrome.runtime.sendMessage({ action: 'OPEN_IN_STUDIO', captureData: item });
      });
    }

    const removeInstance = () => {
      winEl.remove();
      activePinInstances.delete(pinId);
      if (activePinInstances.size === 0 && pinHost) {
        pinHost.remove();
        pinHost = null;
        pinShadow = null;
      }
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeInstance();
      });
    }

    const instance = {
      id: pinId,
      element: winEl,
      remove: removeInstance,
      setOpacity: updateOpacity,
      toggleCollapse
    };

    activePinInstances.set(pinId, instance);

    if (window.FullShotHUD.toast) {
      window.FullShotHUD.toast.show('Ekran Referansı Ekrana Sabitlendi 📌 (Sürükleyin, opaklığı ayarlayın)', {
        icon: 'element',
        duration: 3000
      });
    }

    return instance;
  }

  /**
   * Closes all active pin windows.
   */
  function removeAll() {
    activePinInstances.forEach((inst) => inst.remove());
    activePinInstances.clear();
    if (pinHost) {
      pinHost.remove();
      pinHost = null;
      pinShadow = null;
    }
  }

  /**
   * Hides all pin windows with ghosting protection before taking a screenshot.
   */
  async function hideForCapture() {
    if (pinHost) {
      pinHost.style.setProperty('display', 'none', 'important');
      void document.documentElement.offsetHeight;
      if (document.body) {
        void document.body.offsetHeight;
      }
      await waitForDoubleRAF();
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  /**
   * Restores visibility after screenshot capture.
   */
  function restoreAfterCapture() {
    if (pinHost) {
      pinHost.style.removeProperty('display');
    }
  }

  // Export module
  window.FullShotHUD.pinWindow = {
    pin,
    removeAll,
    hideForCapture,
    restoreAfterCapture,
    getActiveCount: () => activePinInstances.size
  };
})();
