/**
 * FullShot Pro - In-Page Feedback HUD Toast
 * Isolated Shadow DOM v1 Component for keyboard shortcuts, capture notices, and status toasts.
 * 4-Color Slate/Charcoal Palette (#4A4A4A, #CBCBCB, #FFFFE3, #6D8196)
 */

(function () {
  'use strict';

  window.FullShotHUD = window.FullShotHUD || {};

  let toastHost = null;
  let toastShadow = null;
  let toastTimeout = null;

  /**
   * Helper: Trigger synthetic reflow and wait for GPU compositing double rAF.
   */
  async function waitForDoubleRAF() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }

  /**
   * Returns inline SVG markup for toast icons.
   * @param {string} type - Icon type
   * @returns {string} SVG HTML string
   */
  function getIconSvg(type) {
    switch (type) {
      case 'camera':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6D8196" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>';
      case 'scroll':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6D8196" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>';
      case 'crop':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6D8196" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"></path><path d="M18 22V8a2 2 0 0 0-2-2H2"></path></svg>';
      case 'element':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6D8196" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>';
      case 'video':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>';
      case 'warning':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      case 'error':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
      case 'check':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      case 'copy':
      case 'clipboard':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6D8196" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      case 'download':
      case 'save':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6D8196" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
      case 'shortcut':
      case 'info':
      default:
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6D8196" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }
  }

  /**
   * Displays an in-page feedback toast HUD notification.
   * @param {string} message - Toast message text
   * @param {Object} [options={}] - Options object
   * @param {number} [options.duration=2600] - Duration in ms before auto-dismiss (0 for persistent)
   * @param {string} [options.icon='info'] - Icon identifier ('camera', 'scroll', 'crop', 'element', 'video', 'warning', 'error', 'check', 'shortcut')
   * @param {string} [options.badge] - Optional badge text (e.g. 'Alt+Shift+F')
   */
  function show(message, options = {}) {
    remove();

    const duration = typeof options.duration === 'number' ? options.duration : 2600;
    const iconType = options.icon || 'info';
    const badgeText = options.badge || '';

    toastHost = document.createElement('div');
    toastHost.id = '__fullshot_toast_host__';
    toastHost.style.cssText = 'all: initial !important; position: fixed !important; z-index: 2147483647 !important; top: 24px !important; left: 50% !important; transform: translateX(-50%) !important; pointer-events: none !important; user-select: none !important; -webkit-user-select: none !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';

    toastShadow = toastHost.attachShadow({ mode: 'open' });
    toastShadow.innerHTML = `
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
        .toast-card {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(44, 46, 51, 0.96);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid #545862;
          border-radius: 12px;
          padding: 10px 18px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(109, 129, 150, 0.25);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #FFFFE3;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.2px;
          box-sizing: border-box;
          user-select: none;
          -webkit-user-select: none;
          pointer-events: auto;
          animation: toastIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }
        @keyframes toastIn {
          from { transform: translateY(-16px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .toast-card.hide {
          transform: translateY(-12px) scale(0.96);
          opacity: 0;
        }
        .toast-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .toast-message {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .toast-badge {
          background: #24262b;
          border: 1px solid #545862;
          color: #CBCBCB;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 6px;
          font-weight: 600;
        }
      </style>
      <div class="toast-card" id="toastCard">
        <div class="toast-icon">${getIconSvg(iconType)}</div>
        <div class="toast-message">
          <span>${message}</span>
          ${badgeText ? `<span class="toast-badge">${badgeText}</span>` : ''}
        </div>
      </div>
    `;

    const targetContainer = document.fullscreenElement || document.body || document.documentElement;
    if (targetContainer) {
      targetContainer.appendChild(toastHost);
    }

    if (duration > 0) {
      toastTimeout = setTimeout(() => {
        hide();
      }, duration);
    }
  }

  /**
   * Smoothly hides and removes the toast.
   */
  function hide() {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    if (toastHost) {
      const card = toastShadow?.getElementById('toastCard');
      if (card) {
        card.classList.add('hide');
      }
      setTimeout(() => {
        remove();
      }, 180);
    }
  }

  /**
   * Immediately removes the toast without exit animation.
   */
  function remove() {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    if (toastHost) {
      toastHost.remove();
      toastHost = null;
      toastShadow = null;
    }
  }

  /**
   * Immediately hides toast with full ghosting protection for screenshot captures.
   */
  async function hideForCapture() {
    if (toastHost) {
      remove();
      void document.documentElement.offsetHeight;
      if (document.body) {
        void document.body.offsetHeight;
      }
      await waitForDoubleRAF();
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  /**
   * Checks if Toast HUD is visible.
   */
  function isVisible() {
    return !!toastHost && document.contains(toastHost);
  }

  /**
   * Returns host element reference.
   */
  function getHost() {
    return toastHost;
  }

  // Export module to FullShotHUD namespace
  window.FullShotHUD.toast = {
    show,
    hide,
    remove,
    hideForCapture,
    isVisible,
    getHost
  };
})();
