/**
 * FullShot Pro - In-Page Progress HUD
 * Isolated Shadow DOM v1 Component for vertical scroll stitch progress indication.
 * 4-Color Slate/Charcoal Palette (#4A4A4A, #CBCBCB, #FFFFE3, #6D8196)
 */

(function () {
  'use strict';

  window.FullShotHUD = window.FullShotHUD || {};

  let hudHost = null;
  let hudShadow = null;

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
   * Displays the in-page progress HUD indicator in bottom-right corner.
   * @param {number} totalSteps - Total number of capture slices
   * @param {string} [title='Tam Sayfa Yakalanıyor...'] - Optional custom HUD title
   */
  function show(totalSteps = 1, title = 'Tam Sayfa Yakalanıyor...') {
    remove();

    hudHost = document.createElement('div');
    hudHost.id = '__fullshot_hud_host__';
    hudHost.style.cssText = 'all: initial !important; position: fixed !important; z-index: 2147483647 !important; bottom: 24px !important; right: 24px !important; pointer-events: none !important; user-select: none !important; -webkit-user-select: none !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';

    hudShadow = hudHost.attachShadow({ mode: 'open' });
    hudShadow.innerHTML = `
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
        .hud-card {
          background: #4A4A4A;
          border: 1px solid #545862;
          border-radius: 12px;
          padding: 12px 18px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(109, 129, 150, 0.2);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #FFFFE3;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 220px;
          box-sizing: border-box;
          animation: slidein 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
          -webkit-user-select: none;
        }
        @keyframes slidein {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .hud-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
        }
        .hud-title {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #FFFFE3;
        }
        .hud-percent {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          color: #CBCBCB;
          font-size: 11px;
          font-weight: 600;
        }
        .hud-bar-bg {
          width: 100%;
          height: 6px;
          background: #24262b;
          border-radius: 999px;
          overflow: hidden;
        }
        .hud-bar-fill {
          height: 100%;
          width: 0%;
          background: #6D8196;
          border-radius: 999px;
          transition: width 0.15s ease-out;
        }
      </style>
      <div class="hud-card">
        <div class="hud-header">
          <div class="hud-title">
            <span id="titleText">${title}</span>
          </div>
          <span class="hud-percent" id="percent">0%</span>
        </div>
        <div class="hud-bar-bg">
          <div class="hud-bar-fill" id="fill"></div>
        </div>
      </div>
    `;

    const targetContainer = document.fullscreenElement || document.body || document.documentElement;
    if (targetContainer) {
      targetContainer.appendChild(hudHost);
    }
  }

  /**
   * Updates the progress percentage and bar fill.
   * @param {number} current - Current slice index or step count
   * @param {number} total - Total steps
   * @param {string} [customText] - Optional custom status text
   */
  function update(current, total, customText) {
    if (!hudShadow) return;
    const percent = Math.min(100, Math.max(0, Math.round((current / (total || 1)) * 100)));
    const percentEl = hudShadow.getElementById('percent');
    const fillEl = hudShadow.getElementById('fill');
    const titleEl = hudShadow.getElementById('titleText');

    if (percentEl) percentEl.textContent = `${percent}%`;
    if (fillEl) fillEl.style.width = `${percent}%`;
    if (customText && titleEl) titleEl.textContent = customText;
  }

  /**
   * Removes the Progress HUD immediately from the DOM.
   */
  function remove() {
    if (hudHost) {
      hudHost.remove();
      hudHost = null;
      hudShadow = null;
    }
  }

  /**
   * Hides the Progress HUD with complete ghosting protection before taking a screenshot.
   */
  async function hideForCapture() {
    if (hudHost) {
      hudHost.style.display = 'none';
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
    if (hudHost) {
      hudHost.style.display = 'block';
    }
  }

  /**
   * Checks if Progress HUD is currently active.
   */
  function isVisible() {
    return !!hudHost && document.contains(hudHost);
  }

  /**
   * Returns host element reference.
   */
  function getHost() {
    return hudHost;
  }

  // Export module to FullShotHUD namespace
  window.FullShotHUD.progress = {
    show,
    update,
    remove,
    hide: remove,
    hideForCapture,
    restoreAfterCapture,
    isVisible,
    getHost
  };
})();
