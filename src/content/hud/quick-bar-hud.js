/**
 * FullShot Pro - In-Page Quick Bar HUD Component
 * Renders an isolated, boundary-aware floating Quick Action Bar inside a Shadow DOM.
 * Actions: Copy to Clipboard, Direct Download, Open in Advanced Studio, Cancel.
 */

(function () {
  'use strict';

  window.FullShotHUD = window.FullShotHUD || {};

  let currentHost = null;
  let currentShadow = null;
  let activeCallback = null;

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
   * Shows the Quick Action Bar near the selected region.
   * @param {Object} bounds - { x, y, width, height }
   * @param {Object} options - { dataUrl, format, title, onAction, onCancel }
   */
  function show(bounds, options = {}) {
    hide();

    const host = document.createElement('div');
    host.id = '__fullshot_quickbar_host__';
    host.style.cssText = 'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; pointer-events: none !important; user-select: none !important;';

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
        .quickbar-wrapper {
          position: fixed;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #2b2e33;
          border: 1px solid #545862;
          border-radius: 12px;
          padding: 6px 8px;
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(109, 129, 150, 0.3);
          z-index: 2147483647;
          animation: qbPop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: default;
          pointer-events: auto;
          user-select: none;
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
          background: #8297ac;
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
        }
      </style>
      <div class="quickbar-wrapper" id="qbWrapper">
        <button class="qb-btn qb-copy" id="qbCopyBtn" title="Panoya Kopyala (Ctrl+C)">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
          <span>Kopyala</span>
        </button>
        <button class="qb-btn qb-download" id="qbDownloadBtn" title="Doğrudan İndir (PNG)">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>İndir</span>
        </button>
        <button class="qb-btn qb-studio" id="qbStudioBtn" title="Gelişmiş Çizim ve Düzenleme Stüdyosunda Aç">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          <span>Stüdyoda Aç ↗</span>
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
    activeCallback = options.onAction;

    const wrapper = shadow.getElementById('qbWrapper');
    const qbCopyBtn = shadow.getElementById('qbCopyBtn');
    const qbDownloadBtn = shadow.getElementById('qbDownloadBtn');
    const qbStudioBtn = shadow.getElementById('qbStudioBtn');
    const qbCancelBtn = shadow.getElementById('qbCancelBtn');

    // Smart Boundary-Aware Placement
    const barWidth = 350;
    const barHeight = 44;
    const padding = 12;

    const selX = bounds.x || 0;
    const selY = bounds.y || 0;
    const selW = bounds.width || bounds.w || 0;
    const selH = bounds.height || bounds.h || 0;

    let posX = Math.min(window.innerWidth - barWidth - padding, Math.max(padding, selX + selW - barWidth));
    let posY = selY + selH + 10;

    if (posY + barHeight > window.innerHeight - padding) {
      posY = Math.max(padding, selY - barHeight - 10);
    }

    wrapper.style.left = `${posX}px`;
    wrapper.style.top = `${posY}px`;

    const triggerAction = (actionType) => {
      hide();
      if (typeof activeCallback === 'function') {
        activeCallback(actionType, options);
      }
    };

    qbCopyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerAction('copy');
    });

    qbDownloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerAction('download');
    });

    qbStudioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerAction('studio');
    });

    qbCancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hide();
      if (typeof options.onCancel === 'function') {
        options.onCancel();
      }
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        hide();
        if (typeof options.onCancel === 'function') {
          options.onCancel();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        triggerAction('copy');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerAction('download');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        triggerAction('studio');
      }
    };

    window.addEventListener('keydown', onKeyDown, { once: true });
  }

  /**
   * Hides and removes the Quick Action Bar
   */
  function hide() {
    if (currentHost) {
      currentHost.remove();
      currentHost = null;
      currentShadow = null;
      activeCallback = null;
    }
    const existing = document.getElementById('__fullshot_quickbar_host__');
    if (existing) {
      existing.remove();
    }
  }

  // Export module
  window.FullShotHUD.quickBar = {
    show,
    hide,
    copyDataUrlToClipboard
  };
})();
