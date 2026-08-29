/**
 * FullShot Pro - In-Page Quick Bar HUD Component
 * Renders an isolated, boundary-aware floating Quick Action Bar inside a Shadow DOM.
 * Features: OCR text copy, Pin to screen, Copy to clipboard, Direct download, Image studio.
 * 4-Color Slate/Charcoal Palette (#4A4A4A, #CBCBCB, #FFFFE3, #6D8196)
 */

(function () {
  'use strict';

  window.FullShotHUD = window.FullShotHUD || {};

  let currentHost = null;
  let currentShadow = null;
  let activeCallback = null;
  let activeCancelCallback = null;
  let resizeListener = null;
  let keyDownListener = null;

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
   * Helper: Copy dataURL to clipboard as image/png
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
      console.warn('[QuickBarHUD] Panoya doğrudan yazma hatası:', err);
    }
    return false;
  }

  /**
   * Calculates boundary-aware clamped coordinates for the floating Quick Bar.
   * @param {Object} bounds - { x, y, width, height }
   * @param {number} barWidth - Width of the Quick Bar
   * @param {number} barHeight - Height of the Quick Bar
   * @param {number} [margin=12] - Margin from viewport edges
   * @returns {{ left: number, top: number }}
   */
  function calculateClampedPosition(bounds, barWidth, barHeight, margin = 12) {
    const selX = typeof bounds.x === 'number' ? bounds.x : (bounds.left || 0);
    const selY = typeof bounds.y === 'number' ? bounds.y : (bounds.top || 0);
    const selW = typeof bounds.width === 'number' ? bounds.width : (bounds.w || 0);
    const selH = typeof bounds.height === 'number' ? bounds.height : (bounds.h || 0);

    let posX = selX + selW - barWidth;
    if (selW < barWidth) {
      posX = selX + (selW / 2) - (barWidth / 2);
    }
    const maxLeft = Math.max(margin, window.innerWidth - barWidth - margin);
    posX = Math.max(margin, Math.min(posX, maxLeft));

    let posY = selY + selH + 10;
    if (posY + barHeight > window.innerHeight - margin) {
      posY = selY - barHeight - 10;
    }
    const maxTop = Math.max(margin, window.innerHeight - barHeight - margin);
    posY = Math.max(margin, Math.min(posY, maxTop));

    return { left: Math.round(posX), top: Math.round(posY) };
  }

  /**
   * Shows the Quick Action Bar near the selected region.
   * @param {Object} bounds - { x, y, width, height }
   * @param {Object} options - { dataUrl, format, title, onAction, onCancel }
   */
  function show(bounds, options = {}) {
    hide();

    const host = document.createElement('div');
    host.id = '__fullshot_quickbar_host__';
    host.style.cssText = 'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; pointer-events: none !important; user-select: none !important; -webkit-user-select: none !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;';

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
        .quickbar-wrapper {
          position: fixed;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #4A4A4A;
          border: 1px solid #545862;
          border-radius: 12px;
          padding: 6px 8px;
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(109, 129, 150, 0.35);
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
          padding: 7px 11px;
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
          background: #8297ac;
          border-color: #8297ac;
        }
        .qb-btn.qb-pin:hover {
          background: #6D8196;
          border-color: #6D8196;
        }
        .qb-btn.qb-ocr:hover {
          background: #6D8196;
          border-color: #6D8196;
        }
        .qb-btn.qb-cancel {
          padding: 7px 9px;
          color: #CBCBCB;
        }
        .qb-btn.qb-cancel:hover {
          background: #ef4444;
          border-color: #ef4444;
          color: #ffffff;
        }
        .qb-btn svg {
          display: block;
          flex-shrink: 0;
          pointer-events: none;
        }
      </style>
      <div class="quickbar-wrapper" id="qbWrapper">
        <button class="qb-btn qb-ocr" id="qbOcrBtn" title="Metni Kopyala (OCR)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"></path></svg>
          <span>Metni Kopyala (OCR)</span>
        </button>
        <button class="qb-btn qb-pin" id="qbPinBtn" title="Ekrana Sabitle (Yüzen Referans)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path></svg>
          <span>Sabitle (Pin)</span>
        </button>
        <button class="qb-btn qb-copy" id="qbCopyBtn" title="Panoya Kopyala (Ctrl+C)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
          <span>Kopyala</span>
        </button>
        <button class="qb-btn qb-download" id="qbDownloadBtn" title="Doğrudan İndir (PNG)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>İndir</span>
        </button>
        <button class="qb-btn qb-studio" id="qbStudioBtn" title="Gelişmiş Çizim ve Düzenleme Stüdyosunda Aç">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          <span>Stüdyo ↗</span>
        </button>
        <button class="qb-btn qb-cancel" id="qbCancelBtn" title="İptal Et (ESC)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `;

    const targetContainer = document.fullscreenElement || document.body || document.documentElement;
    if (targetContainer) {
      targetContainer.appendChild(host);
    }

    currentHost = host;
    currentShadow = shadow;
    activeCallback = options.onAction;
    activeCancelCallback = options.onCancel;

    const wrapper = shadow.getElementById('qbWrapper');
    const qbOcrBtn = shadow.getElementById('qbOcrBtn');
    const qbPinBtn = shadow.getElementById('qbPinBtn');
    const qbCopyBtn = shadow.getElementById('qbCopyBtn');
    const qbDownloadBtn = shadow.getElementById('qbDownloadBtn');
    const qbStudioBtn = shadow.getElementById('qbStudioBtn');
    const qbCancelBtn = shadow.getElementById('qbCancelBtn');

    // Isolate all wrapper events from host page
    if (wrapper) {
      ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel'].forEach((evtName) => {
        wrapper.addEventListener(evtName, (e) => {
          e.stopPropagation();
        });
      });
    }

    // Smart Boundary-Aware Placement
    const barWidth = 470;
    const barHeight = 44;
    const padding = 12;

    const updatePosition = () => {
      if (!wrapper) return;
      const { left, top } = calculateClampedPosition(bounds, barWidth, barHeight, padding);
      wrapper.style.left = `${left}px`;
      wrapper.style.top = `${top}px`;
    };

    updatePosition();

    resizeListener = () => {
      updatePosition();
    };
    window.addEventListener('resize', resizeListener);

    const triggerAction = (actionType) => {
      hide();
      if (typeof activeCallback === 'function') {
        activeCallback(actionType, options);
      }
    };

    if (qbOcrBtn) {
      qbOcrBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerAction('ocr');
      });
    }

    if (qbPinBtn) {
      qbPinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerAction('pin');
      });
    }

    if (qbCopyBtn) {
      qbCopyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerAction('copy');
      });
    }

    if (qbDownloadBtn) {
      qbDownloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerAction('download');
      });
    }

    if (qbStudioBtn) {
      qbStudioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerAction('studio');
      });
    }

    if (qbCancelBtn) {
      qbCancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hide();
        if (typeof activeCancelCallback === 'function') {
          activeCancelCallback();
        }
      });
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        hide();
        if (typeof activeCancelCallback === 'function') {
          activeCancelCallback();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        e.stopPropagation();
        triggerAction('copy');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        triggerAction('download');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        triggerAction('studio');
      }
    };

    keyDownListener = onKeyDown;
    window.addEventListener('keydown', keyDownListener, true);
  }

  /**
   * Hides and removes the Quick Action Bar
   */
  function hide() {
    if (keyDownListener) {
      window.removeEventListener('keydown', keyDownListener, true);
      keyDownListener = null;
    }
    if (resizeListener) {
      window.removeEventListener('resize', resizeListener);
      resizeListener = null;
    }
    if (currentHost) {
      currentHost.remove();
      currentHost = null;
      currentShadow = null;
      activeCallback = null;
      activeCancelCallback = null;
    }
    const existing = document.getElementById('__fullshot_quickbar_host__');
    if (existing) {
      existing.remove();
    }
  }

  /**
   * Hides Quick Bar with complete ghosting protection before taking a screenshot.
   */
  async function hideForCapture() {
    if (currentHost) {
      currentHost.style.setProperty('display', 'none', 'important');
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
    if (currentHost) {
      currentHost.style.removeProperty('display');
    }
  }

  /**
   * Checks if Quick Bar is visible.
   */
  function isVisible() {
    return !!currentHost && document.contains(currentHost);
  }

  /**
   * Returns host element reference.
   */
  function getHost() {
    return currentHost;
  }

  // Export module
  window.FullShotHUD.quickBar = {
    show,
    hide,
    remove: hide,
    hideForCapture,
    restoreAfterCapture,
    isVisible,
    getHost,
    copyDataUrlToClipboard
  };
})();
