/**
 * FullShot Pro - Floating Recording Widget (Recording Bar HUD)
 * Isolated Shadow DOM v1 Component for draggable live video recording control bar.
 * 4-Color Slate/Charcoal Palette (#4A4A4A, #CBCBCB, #FFFFE3, #6D8196)
 */

(function () {
  'use strict';

  window.FullShotHUD = window.FullShotHUD || {};

  let recordingWidgetHost = null;
  let recordingWidgetShadow = null;
  let widgetStartTime = 0;
  let widgetElapsedTime = 0;
  let widgetIsPaused = false;
  let widgetTimerInterval = null;
  let widgetResizeHandler = null;

  /**
   * Format milliseconds into MM:SS or HH:MM:SS string
   * @param {number} ms - Milliseconds elapsed
   * @returns {string} Formatted duration string
   */
  function formatWidgetTime(ms) {
    const totalSec = Math.floor(Math.max(0, ms) / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = (num) => String(num).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  /**
   * Updates the UI elements inside the shadow DOM to match the recording state
   */
  function updateWidgetUIState() {
    if (!recordingWidgetShadow) return;

    const dotEl = recordingWidgetShadow.getElementById('recDot');
    const labelEl = recordingWidgetShadow.getElementById('recLabel');
    const pauseBtn = recordingWidgetShadow.getElementById('btnPause');
    const timerEl = recordingWidgetShadow.getElementById('timerText');

    if (widgetIsPaused) {
      if (dotEl) {
        dotEl.classList.add('paused');
      }
      if (labelEl) {
        labelEl.textContent = 'DURAKLATILDI';
        labelEl.classList.add('paused');
      }
      if (pauseBtn) {
        pauseBtn.title = 'Devam Et';
        pauseBtn.setAttribute('aria-label', 'Devam Et');
        pauseBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        `;
      }
    } else {
      if (dotEl) {
        dotEl.classList.remove('paused');
      }
      if (labelEl) {
        labelEl.textContent = 'REC';
        labelEl.classList.remove('paused');
      }
      if (pauseBtn) {
        pauseBtn.title = 'Duraklat';
        pauseBtn.setAttribute('aria-label', 'Duraklat');
        pauseBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="4" width="4" height="16" rx="1.5"/>
            <rect x="15" y="4" width="4" height="16" rx="1.5"/>
          </svg>
        `;
      }
    }

    if (timerEl) {
      const currentMs = widgetIsPaused ? widgetElapsedTime : widgetElapsedTime + (Date.now() - widgetStartTime);
      timerEl.textContent = formatWidgetTime(currentMs);
    }
  }

  /**
   * Pause recording widget state
   */
  function pause() {
    if (widgetIsPaused || !recordingWidgetHost) return;
    widgetElapsedTime += (Date.now() - widgetStartTime);
    widgetIsPaused = true;
    updateWidgetUIState();
  }

  /**
   * Resume recording widget state
   */
  function resume() {
    if (!widgetIsPaused || !recordingWidgetHost) return;
    widgetStartTime = Date.now();
    widgetIsPaused = false;
    updateWidgetUIState();
  }

  /**
   * Toggle pause / resume state and notify background/extension
   */
  function togglePause() {
    if (widgetIsPaused) {
      resume();
      try {
        chrome.runtime.sendMessage({ action: 'resumeRecording' });
      } catch (e) {
        console.debug('resumeRecording message failed:', e);
      }
    } else {
      pause();
      try {
        chrome.runtime.sendMessage({ action: 'pauseRecording' });
      } catch (e) {
        console.debug('pauseRecording message failed:', e);
      }
    }
  }

  /**
   * Finish recording and clean up widget
   */
  function finish() {
    try {
      chrome.runtime.sendMessage({ action: 'stopRecording' });
    } catch (e) {
      console.debug('stopRecording message failed:', e);
    }
    remove();
  }

  /**
   * Update recording widget with external data
   * @param {Object} data - Update data payload
   * @param {number} [data.elapsedMs] - Elapsed milliseconds
   * @param {boolean} [data.isPaused] - Whether recording is paused
   */
  function update(data = {}) {
    if (!recordingWidgetHost) return;

    if (typeof data.elapsedMs === 'number') {
      widgetElapsedTime = data.elapsedMs;
      widgetStartTime = Date.now();
    }

    if (typeof data.isPaused === 'boolean') {
      if (data.isPaused && !widgetIsPaused) {
        pause();
      } else if (!data.isPaused && widgetIsPaused) {
        resume();
      }
    }

    updateWidgetUIState();
  }

  /**
   * Remove Floating Recording Widget from DOM
   */
  function remove() {
    if (widgetTimerInterval) {
      clearInterval(widgetTimerInterval);
      widgetTimerInterval = null;
    }

    if (widgetResizeHandler) {
      window.removeEventListener('resize', widgetResizeHandler);
      widgetResizeHandler = null;
    }

    if (recordingWidgetHost) {
      // Smooth exit animation
      try {
        const card = recordingWidgetShadow?.getElementById('widgetCard');
        if (card) {
          card.style.opacity = '0';
          card.style.transform = 'translateY(-10px) scale(0.95)';
          card.style.transition = 'all 0.18s cubic-bezier(0.4, 0, 1, 1)';
        }
      } catch (e) {}

      setTimeout(() => {
        if (recordingWidgetHost) {
          recordingWidgetHost.remove();
          recordingWidgetHost = null;
          recordingWidgetShadow = null;
        }
      }, 180);
    }

    widgetStartTime = 0;
    widgetElapsedTime = 0;
    widgetIsPaused = false;
  }

  /**
   * Create and show draggable Floating Recording Widget in active tab
   * @param {Object} [options={}] - Widget initialization options
   * @param {number} [options.initialElapsedMs=0] - Initial elapsed duration
   * @param {boolean} [options.isPaused=false] - Initial paused state
   */
  function show(options = {}) {
    if (recordingWidgetHost) {
      remove();
    }

    widgetStartTime = Date.now() - (options.initialElapsedMs || 0);
    widgetElapsedTime = options.initialElapsedMs || 0;
    widgetIsPaused = !!options.isPaused;

    const initialMargin = 24;
    const estimatedWidth = 240;
    const initLeft = Math.max(12, window.innerWidth - estimatedWidth - initialMargin);

    recordingWidgetHost = document.createElement('div');
    recordingWidgetHost.id = '__fullshot_recording_widget_host__';
    recordingWidgetHost.style.cssText = `
      all: initial !important;
      position: fixed !important;
      z-index: 2147483647 !important;
      top: ${initialMargin}px !important;
      left: ${initLeft}px !important;
      right: auto !important;
      bottom: auto !important;
      pointer-events: auto !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    `;

    recordingWidgetShadow = recordingWidgetHost.attachShadow({ mode: 'open' });
    recordingWidgetShadow.innerHTML = `
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
          direction: ltr !important;
          box-sizing: border-box !important;
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
        .widget-card {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(74, 74, 74, 0.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid #545862;
          box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(109, 129, 150, 0.3);
          border-radius: 9999px;
          padding: 6px 12px;
          color: #FFFFE3;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          cursor: default;
          animation: widgetSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          max-width: calc(100vw - 24px);
        }
        .widget-card:hover {
          border-color: #6D8196;
          box-shadow: 0 12px 35px -4px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(109, 129, 150, 0.45);
        }
        @keyframes widgetSlideDown {
          from {
            opacity: 0;
            transform: translateY(-14px) scale(0.94);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .drag-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          color: #64748b;
          padding: 4px 3px 4px 1px;
          transition: color 0.15s ease;
        }
        .drag-handle:hover {
          color: #94a3b8;
        }
        .drag-handle.dragging {
          cursor: grabbing;
          color: #6D8196;
        }
        .status-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rec-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 10px #ef4444, 0 0 4px #ef4444;
          animation: recDotBlink 1.2s ease-in-out infinite;
          flex-shrink: 0;
        }
        .rec-dot.paused {
          background: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
          animation: none;
        }
        @keyframes recDotBlink {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(0.82);
          }
        }
        .rec-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.6px;
          color: #ef4444;
          text-transform: uppercase;
        }
        .rec-label.paused {
          color: #f59e0b;
          font-size: 10px;
          font-weight: 700;
        }
        .timer-text {
          font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Monaco, Consolas, monospace;
          font-size: 13px;
          font-weight: 600;
          color: #f8fafc;
          letter-spacing: 0.5px;
          min-width: 44px;
          text-align: center;
        }
        .divider {
          width: 1px;
          height: 18px;
          background: rgba(255, 255, 255, 0.14);
          margin: 0 2px;
        }
        .btn-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
          padding: 0;
        }
        .btn:hover {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.28);
          transform: scale(1.06);
        }
        .btn:active {
          transform: scale(0.94);
        }
        .btn-pause {
          color: #f1f5f9;
        }
        .btn-stop {
          background: rgba(239, 68, 68, 0.18);
          border-color: rgba(239, 68, 68, 0.45);
          color: #ef4444;
        }
        .btn-stop:hover {
          background: #ef4444;
          border-color: #ef4444;
          color: #ffffff;
          box-shadow: 0 0 14px rgba(239, 68, 68, 0.6);
          transform: scale(1.06);
        }
        .btn-stop:active {
          transform: scale(0.94);
        }
        svg {
          display: block;
          pointer-events: none;
        }
      </style>
      <div class="widget-card" id="widgetCard">
        <!-- Grip Drag Handle -->
        <div class="drag-handle" id="dragHandle" title="Taşımak için sürükleyin">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
            <circle cx="3" cy="3" r="1.5"/>
            <circle cx="7" cy="3" r="1.5"/>
            <circle cx="3" cy="8" r="1.5"/>
            <circle cx="7" cy="8" r="1.5"/>
            <circle cx="3" cy="13" r="1.5"/>
            <circle cx="7" cy="13" r="1.5"/>
          </svg>
        </div>

        <!-- Status & REC Dot -->
        <div class="status-group">
          <span class="rec-dot" id="recDot"></span>
          <span class="rec-label" id="recLabel">REC</span>
        </div>

        <!-- Live Duration Timer -->
        <span class="timer-text" id="timerText">00:00</span>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Action Buttons -->
        <div class="btn-group">
          <!-- Camera Bubble Toggle Button -->
          <button class="btn btn-camera" id="btnCamera" title="Facecam / Kamera Baloncuğu" aria-label="Kamera Baloncuğu">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9a3 3 0 100 6 3 3 0 000-6zm-7-2h2.2l1.4-2h6.8l1.4 2H19a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"/>
            </svg>
          </button>

          <!-- Spotlight Toggle Button -->
          <button class="btn btn-spotlight" id="btnSpotlight" title="Spot Işığı (Alt+Shift+S)" aria-label="Spot Işığı">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          <!-- Pause / Resume Button -->
          <button class="btn btn-pause" id="btnPause" title="Duraklat" aria-label="Duraklat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="4" width="4" height="16" rx="1.5"/>
              <rect x="15" y="4" width="4" height="16" rx="1.5"/>
            </svg>
          </button>

          <!-- Stop / Finish Button (Red Square) -->
          <button class="btn btn-stop" id="btnStop" title="Kaydı Bitir" aria-label="Kaydı Bitir">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2.5"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    const targetContainer = document.fullscreenElement || document.body || document.documentElement;
    if (targetContainer) {
      targetContainer.appendChild(recordingWidgetHost);
    }

    const widgetCard = recordingWidgetShadow.getElementById('widgetCard');
    const dragHandle = recordingWidgetShadow.getElementById('dragHandle');
    const btnCamera = recordingWidgetShadow.getElementById('btnCamera');
    const btnSpotlight = recordingWidgetShadow.getElementById('btnSpotlight');
    const btnPause = recordingWidgetShadow.getElementById('btnPause');
    const btnStop = recordingWidgetShadow.getElementById('btnStop');

    if (btnCamera) {
      btnCamera.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.FullShotHUD?.cameraBubble) {
          window.FullShotHUD.cameraBubble.toggle();
        }
      });
    }

    if (btnSpotlight) {
      btnSpotlight.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.FullShotHUD?.cursorEffects) {
          window.FullShotHUD.cursorEffects.toggleSpotlight();
        }
      });
    }

    // Drag & Drop Implementation using Pointer Events
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let elementStartX = 0;
    let elementStartY = 0;
    let activePointerId = null;

    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('button')) return;
      e.stopPropagation();

      const rect = recordingWidgetHost.getBoundingClientRect();
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      elementStartX = rect.left;
      elementStartY = rect.top;
      activePointerId = e.pointerId;

      if (dragHandle) dragHandle.classList.add('dragging');
      if (widgetCard) widgetCard.setPointerCapture(activePointerId);
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.stopPropagation();

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      let newLeft = elementStartX + deltaX;
      let newTop = elementStartY + deltaY;

      const cardWidth = widgetCard ? widgetCard.offsetWidth || 230 : 230;
      const cardHeight = widgetCard ? widgetCard.offsetHeight || 44 : 44;
      const margin = 12;

      const maxLeft = Math.max(margin, window.innerWidth - cardWidth - margin);
      const maxTop = Math.max(margin, window.innerHeight - cardHeight - margin);

      newLeft = Math.max(margin, Math.min(maxLeft, newLeft));
      newTop = Math.max(margin, Math.min(maxTop, newTop));

      recordingWidgetHost.style.left = `${newLeft}px`;
      recordingWidgetHost.style.top = `${newTop}px`;
      recordingWidgetHost.style.right = 'auto';
      recordingWidgetHost.style.bottom = 'auto';
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      if (e) e.stopPropagation();
      isDragging = false;
      if (dragHandle) dragHandle.classList.remove('dragging');

      if (activePointerId !== null && widgetCard) {
        try {
          widgetCard.releasePointerCapture(activePointerId);
        } catch (err) {}
        activePointerId = null;
      }
    };

    if (widgetCard) {
      widgetCard.addEventListener('pointerdown', onPointerDown);
      widgetCard.addEventListener('pointermove', onPointerMove);
      widgetCard.addEventListener('pointerup', onPointerUp);
      widgetCard.addEventListener('pointercancel', onPointerUp);
      ['click', 'dblclick', 'contextmenu', 'wheel'].forEach((evt) => {
        widgetCard.addEventListener(evt, (e) => {
          if (!e.target.closest('button')) {
            e.stopPropagation();
          }
        });
      });
    }

    widgetResizeHandler = () => {
      if (!recordingWidgetHost || !widgetCard) return;
      const rect = recordingWidgetHost.getBoundingClientRect();
      const cardWidth = widgetCard.offsetWidth || 230;
      const cardHeight = widgetCard.offsetHeight || 44;
      const margin = 12;

      const maxLeft = Math.max(margin, window.innerWidth - cardWidth - margin);
      const maxTop = Math.max(margin, window.innerHeight - cardHeight - margin);

      const clampedLeft = Math.max(margin, Math.min(maxLeft, rect.left));
      const clampedTop = Math.max(margin, Math.min(maxTop, rect.top));

      recordingWidgetHost.style.left = `${clampedLeft}px`;
      recordingWidgetHost.style.top = `${clampedTop}px`;
      recordingWidgetHost.style.right = 'auto';
      recordingWidgetHost.style.bottom = 'auto';
    };
    window.addEventListener('resize', widgetResizeHandler);

    if (btnPause) {
      btnPause.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePause();
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', (e) => {
        e.stopPropagation();
        finish();
      });
    }

    updateWidgetUIState();
    widgetTimerInterval = setInterval(() => {
      if (!widgetIsPaused) {
        const timerEl = recordingWidgetShadow?.getElementById('timerText');
        if (timerEl) {
          const currentMs = widgetElapsedTime + (Date.now() - widgetStartTime);
          timerEl.textContent = formatWidgetTime(currentMs);
        }
      }
    }, 500);
  }

  /**
   * Hide widget for screenshot capture
   */
  async function hideForCapture() {
    if (recordingWidgetHost) {
      recordingWidgetHost.style.setProperty('display', 'none', 'important');
      void document.documentElement.offsetHeight;
      if (document.body) {
        void document.body.offsetHeight;
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  /**
   * Restore widget after screenshot capture
   */
  function restoreAfterCapture() {
    if (recordingWidgetHost) {
      recordingWidgetHost.style.removeProperty('display');
    }
  }

  /**
   * Checks if Recording Bar is visible
   */
  function isVisible() {
    return !!recordingWidgetHost && document.contains(recordingWidgetHost);
  }

  /**
   * Checks if recording is currently paused
   */
  function isPaused() {
    return widgetIsPaused;
  }

  /**
   * Gets current elapsed time in ms
   */
  function getElapsedTime() {
    return widgetIsPaused ? widgetElapsedTime : widgetElapsedTime + (Date.now() - widgetStartTime);
  }

  /**
   * Gets host element reference
   */
  function getHost() {
    return recordingWidgetHost;
  }

  // Export module to FullShotHUD namespace
  window.FullShotHUD.recordingBar = {
    show,
    hide: remove,
    remove,
    destroy: remove,
    pause,
    resume,
    togglePause,
    update,
    finish,
    isVisible,
    isPaused,
    getElapsedTime,
    hideForCapture,
    restoreAfterCapture,
    getHost
  };
})();
