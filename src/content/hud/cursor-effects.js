/**
 * FullShot Pro - Cursor Effects HUD
 * Draggable / In-Page Neon Click Shockwaves (Blue for Left-Click, Red for Right-Click)
 * and Smooth Follow Spotlight Effect (Toggled via Alt+Shift+S / Alt+Shift+C / API).
 * Theme: 4-Color Slate & Charcoal (#4A4A4A, #CBCBCB, #FFFFE3, #6D8196)
 */

(function () {
  'use strict';

  window.FullShotHUD = window.FullShotHUD || {};

  const HOST_ID = '__fullshot_cursor_effects_host__';

  let hostEl = null;
  let shadowRoot = null;
  let spotlightEl = null;
  let rippleContainer = null;

  let isRipplesEnabled = true;
  let isSpotlightActive = false;
  let spotlightRadius = 90; // Spotlight transparent opening radius
  let targetMouseX = -1000;
  let targetMouseY = -1000;
  let currentMouseX = -1000;
  let currentMouseY = -1000;
  let spotlightAnimId = null;

  /**
   * Initializes host container and Shadow DOM
   */
  function initHost() {
    if (hostEl) return;

    hostEl = document.createElement('div');
    hostEl.id = HOST_ID;
    hostEl.style.cssText = [
      'all: initial !important',
      'position: fixed !important',
      'top: 0 !important',
      'left: 0 !important',
      'width: 100vw !important',
      'height: 100vh !important',
      'pointer-events: none !important',
      'z-index: 2147483644 !important',
      'display: block !important',
      'overflow: hidden !important'
    ].join('; ');

    shadowRoot = hostEl.attachShadow({ mode: 'open' });

    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          pointer-events: none !important;
          z-index: 2147483644 !important;
          display: block !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }

        *, *::before, *::after {
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .ripple-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }

        /* Neon Click Shockwave Ring */
        .click-ripple {
          position: absolute;
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0.2);
          pointer-events: none;
          animation: rippleExpand 0.65s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }

        .click-ripple.left-click {
          border: 3px solid #6D8196;
          box-shadow: 0 0 16px rgba(109, 129, 150, 0.9), inset 0 0 10px rgba(109, 129, 150, 0.6);
        }

        .click-ripple.right-click {
          border: 3px solid #ef4444;
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.9), inset 0 0 10px rgba(239, 68, 68, 0.6);
        }

        @keyframes rippleExpand {
          0% {
            width: 20px;
            height: 20px;
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.2);
          }
          60% {
            opacity: 0.85;
          }
          100% {
            width: 72px;
            height: 72px;
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.6);
          }
        }

        /* Cursor Spotlight Overlay */
        .spotlight-mask {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease;
          background: rgba(0, 0, 0, 0.65);
        }

        .spotlight-mask.active {
          opacity: 1;
        }
      </style>

      <div class="spotlight-mask" id="spotlightMask"></div>
      <div class="ripple-container" id="rippleContainer"></div>
    `;

    document.documentElement.appendChild(hostEl);

    spotlightEl = shadowRoot.getElementById('spotlightMask');
    rippleContainer = shadowRoot.getElementById('rippleContainer');

    setupGlobalListeners();
  }

  /**
   * Spawns expanding neon shockwave at click coordinates
   */
  function spawnClickRipple(x, y, isRightClick = false) {
    if (!isRipplesEnabled) return;
    initHost();

    if (!rippleContainer) return;

    const ripple = document.createElement('div');
    ripple.className = `click-ripple ${isRightClick ? 'right-click' : 'left-click'}`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    rippleContainer.appendChild(ripple);

    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 700);
  }

  /**
   * Smooth Spotlight Follower Animation Loop
   */
  function renderSpotlight() {
    if (!isSpotlightActive || !spotlightEl) {
      if (spotlightAnimId) {
        cancelAnimationFrame(spotlightAnimId);
        spotlightAnimId = null;
      }
      return;
    }

    // Lerp smoothing towards mouse cursor
    currentMouseX += (targetMouseX - currentMouseX) * 0.25;
    currentMouseY += (targetMouseY - currentMouseY) * 0.25;

    const r = spotlightRadius;
    const feather = r + 45;

    spotlightEl.style.background = `radial-gradient(circle ${feather}px at ${currentMouseX}px ${currentMouseY}px, transparent ${r}px, rgba(15, 17, 21, 0.72) ${feather}px)`;

    spotlightAnimId = requestAnimationFrame(renderSpotlight);
  }

  /**
   * Toggles cursor spotlight effect
   */
  function toggleSpotlight(enable = null) {
    initHost();
    isSpotlightActive = (enable !== null) ? enable : !isSpotlightActive;

    if (spotlightEl) {
      if (isSpotlightActive) {
        spotlightEl.classList.add('active');
        if (!spotlightAnimId) {
          spotlightAnimId = requestAnimationFrame(renderSpotlight);
        }
      } else {
        spotlightEl.classList.remove('active');
        if (spotlightAnimId) {
          cancelAnimationFrame(spotlightAnimId);
          spotlightAnimId = null;
        }
      }
    }

    return isSpotlightActive;
  }

  /**
   * Global mouse and keyboard listeners for click ripples & spotlight shortcuts
   */
  function setupGlobalListeners() {
    // Mouse Clicks
    window.addEventListener('mousedown', (e) => {
      // Don't trigger inside FullShot HUD buttons
      if (e.target?.closest?.('.tool-btn, .ctrl-btn, .action-btn')) return;

      const isRight = e.button === 2;
      spawnClickRipple(e.clientX, e.clientY, isRight);
    }, true);

    // Mouse Move for Spotlight
    window.addEventListener('mousemove', (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;

      if (currentMouseX === -1000) {
        currentMouseX = targetMouseX;
        currentMouseY = targetMouseY;
      }

      if (isSpotlightActive && !spotlightAnimId) {
        spotlightAnimId = requestAnimationFrame(renderSpotlight);
      }
    }, { passive: true });

    // Keyboard Shortcuts: Alt+Shift+S or Alt+Shift+C -> Toggle Spotlight
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        toggleSpotlight();
      }
    }, true);
  }

  function setRipplesEnabled(enabled) {
    isRipplesEnabled = Boolean(enabled);
  }

  function isSpotlightEnabled() {
    return isSpotlightActive;
  }

  function destroy() {
    if (spotlightAnimId) {
      cancelAnimationFrame(spotlightAnimId);
      spotlightAnimId = null;
    }
    if (hostEl && hostEl.parentNode) {
      hostEl.parentNode.removeChild(hostEl);
      hostEl = null;
      shadowRoot = null;
      spotlightEl = null;
      rippleContainer = null;
    }
    isSpotlightActive = false;
  }

  // Export to window.FullShotHUD
  window.FullShotHUD.cursorEffects = {
    init: initHost,
    spawnClickRipple,
    toggleSpotlight,
    setRipplesEnabled,
    isSpotlightEnabled,
    destroy
  };

  // Auto-initialize when content script loads
  initHost();
})();
