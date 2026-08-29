/**
 * FullShot Pro - In-Tab Live Countdown HUD (3.. 2.. 1.. Geri Sayım)
 * Isolated Shadow DOM v1 Component for pre-recording animated countdown with audio cues.
 * 4-Color Slate/Charcoal Palette (#4A4A4A, #CBCBCB, #FFFFE3, #6D8196)
 */

(function () {
  'use strict';

  window.FullShotHUD = window.FullShotHUD || {};

  let countdownHost = null;
  let countdownShadow = null;
  let countdownTimer = null;
  let countdownResolve = null;

  /**
   * Generates a subtle Web Audio beep for countdown feedback
   * @param {number} [freq=600] - Audio frequency in Hz
   * @param {number} [duration=0.08] - Duration in seconds
   */
  function playCountdownBeep(freq = 600, duration = 0.08) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close().catch(() => {});
      }, Math.round((duration + 0.1) * 1000));
    } catch (e) {
      // Audio context might be restricted before user interaction, ignore safely
    }
  }

  /**
   * Closes and removes the countdown overlay from DOM
   */
  function remove() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (countdownHost) {
      try {
        const card = countdownShadow?.getElementById('countdownCard');
        if (card) {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.85)';
          card.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 1, 1)';
        }
      } catch (e) {}

      setTimeout(() => {
        if (countdownHost) {
          countdownHost.remove();
          countdownHost = null;
          countdownShadow = null;
        }
      }, 200);
    }
  }

  /**
   * Cancels countdown and aborts recording start
   */
  function cancel() {
    remove();
    if (countdownResolve) {
      countdownResolve({ cancelled: true });
      countdownResolve = null;
    }
  }

  /**
   * Displays the sleek in-tab overlay countdown HUD (3.. 2.. 1..) before recording
   * @param {number} [totalSeconds=3] - Total countdown duration in seconds
   * @param {Object} [options={}] - Options object (scope, audio, etc.)
   * @returns {Promise<{ cancelled: boolean }>}
   */
  function show(totalSeconds = 3, options = {}) {
    return new Promise((resolve) => {
      remove();
      countdownResolve = resolve;

      countdownHost = document.createElement('div');
      countdownHost.id = '__fullshot_countdown_host__';
      countdownHost.style.cssText = `
        all: initial !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        pointer-events: auto !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      `;

      countdownShadow = countdownHost.attachShadow({ mode: 'open' });
      countdownShadow.innerHTML = `
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
          .backdrop {
            position: fixed;
            inset: 0;
            background: rgba(20, 22, 26, 0.65);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease-out;
            padding: 16px;
            box-sizing: border-box;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .countdown-card {
            background: #4A4A4A;
            border: 1px solid rgba(109, 129, 150, 0.45);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(109, 129, 150, 0.25);
            border-radius: 24px;
            padding: 32px 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            min-width: 260px;
            max-width: calc(100vw - 32px);
            box-sizing: border-box;
            animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            color: #FFFFE3;
            text-align: center;
          }
          @keyframes popIn {
            from { transform: scale(0.85); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .ring-container {
            position: relative;
            width: 110px;
            height: 110px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .svg-ring {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
          }
          .ring-bg {
            fill: none;
            stroke: rgba(255, 255, 255, 0.12);
            stroke-width: 6;
          }
          .ring-progress {
            fill: none;
            stroke: #6D8196;
            stroke-width: 6;
            stroke-linecap: round;
            stroke-dasharray: 282.74;
            stroke-dashoffset: 0;
            transition: stroke-dashoffset 0.95s linear;
          }
          .count-number {
            font-size: 54px;
            font-weight: 800;
            font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace;
            color: #FFFFE3;
            text-shadow: 0 0 16px rgba(109, 129, 150, 0.6);
            display: inline-block;
            animation: numberPulse 0.95s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          }
          @keyframes numberPulse {
            0% {
              transform: scale(1.35);
              opacity: 0.3;
            }
            30% {
              transform: scale(1);
              opacity: 1;
            }
            90% {
              transform: scale(0.96);
              opacity: 0.95;
            }
            100% {
              transform: scale(0.92);
              opacity: 0.7;
            }
          }
          .title-text {
            font-size: 16px;
            font-weight: 700;
            color: #FFFFE3;
            letter-spacing: -0.2px;
          }
          .scope-badge {
            font-size: 11px;
            font-weight: 600;
            color: #CBCBCB;
            background: rgba(0, 0, 0, 0.25);
            padding: 4px 10px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          .btn-cancel {
            margin-top: 4px;
            background: transparent;
            border: 1px solid rgba(203, 203, 203, 0.3);
            color: #CBCBCB;
            font-size: 12px;
            font-weight: 600;
            padding: 6px 16px;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .btn-cancel:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #FFFFE3;
            border-color: #FFFFE3;
            transform: scale(1.04);
          }
        </style>
        <div class="backdrop" id="backdrop">
          <div class="countdown-card" id="countdownCard">
            <div class="ring-container">
              <svg class="svg-ring" viewBox="0 0 100 100">
                <circle class="ring-bg" cx="50" cy="50" r="45"></circle>
                <circle class="ring-progress" id="ringProgress" cx="50" cy="50" r="45"></circle>
              </svg>
              <span class="count-number" id="countNum">3</span>
            </div>
            <div class="title-text">Kayıt Başlıyor...</div>
            <div class="scope-badge" id="scopeBadge">Mevcut Sekme</div>
            <button class="btn-cancel" id="btnCancel">İptal Et (ESC)</button>
          </div>
        </div>
      `;

      const targetContainer = document.fullscreenElement || document.body || document.documentElement;
      if (targetContainer) {
        targetContainer.appendChild(countdownHost);
      }

      const countNum = countdownShadow.getElementById('countNum');
      const ringProgress = countdownShadow.getElementById('ringProgress');
      const scopeBadge = countdownShadow.getElementById('scopeBadge');
      const btnCancel = countdownShadow.getElementById('btnCancel');

      if (scopeBadge) {
        scopeBadge.textContent = options.scope === 'screen' ? 'Tüm Ekran Kaydı' : 'Mevcut Sekme Kaydı';
      }

      let currentSec = Math.max(1, totalSeconds);
      const circumference = 282.74;

      const updateTick = (sec) => {
        if (!countdownShadow) return;
        if (countNum) {
          countNum.textContent = sec;
          countNum.style.animation = 'none';
          void countNum.offsetWidth; // Reflow for animation restart
          countNum.style.animation = 'numberPulse 0.95s cubic-bezier(0.16, 1, 0.3, 1) infinite';
        }
        if (ringProgress) {
          const offset = circumference * (1 - sec / totalSeconds);
          ringProgress.style.strokeDashoffset = `${offset}`;
        }
        playCountdownBeep(sec === 1 ? 800 : 600);
      };

      updateTick(currentSec);

      const onKeyDown = (e) => {
        if (e.key === 'Escape') {
          window.removeEventListener('keydown', onKeyDown, true);
          cancel();
        }
      };
      window.addEventListener('keydown', onKeyDown, true);

      if (btnCancel) {
        btnCancel.addEventListener('click', (e) => {
          e.stopPropagation();
          window.removeEventListener('keydown', onKeyDown, true);
          cancel();
        });
      }

      countdownTimer = setInterval(() => {
        currentSec--;
        if (currentSec > 0) {
          updateTick(currentSec);
        } else {
          // Finished countdown -> Start recording!
          clearInterval(countdownTimer);
          countdownTimer = null;
          window.removeEventListener('keydown', onKeyDown, true);

          playCountdownBeep(1100, 0.12);
          if (countNum) countNum.textContent = '●';
          if (ringProgress) ringProgress.style.strokeDashoffset = `${circumference}`;

          setTimeout(() => {
            remove();
            if (countdownResolve) {
              countdownResolve({ cancelled: false });
              countdownResolve = null;
            }

            // Dispatch start video recording to background
            chrome.runtime.sendMessage({
              action: 'startVideoRecording',
              options: options
            }).catch((err) => console.error('Countdown startVideoRecording failed:', err));
          }, 180);
        }
      }, 1000);
    });
  }

  /**
   * Checks if countdown overlay is visible
   */
  function isVisible() {
    return !!countdownHost && document.contains(countdownHost);
  }

  /**
   * Returns host element
   */
  function getHost() {
    return countdownHost;
  }

  /**
   * Hides countdown overlay with complete ghosting protection before screenshot capture.
   */
  async function hideForCapture() {
    if (countdownHost) {
      countdownHost.style.setProperty('display', 'none', 'important');
      void document.documentElement.offsetHeight;
      if (document.body) {
        void document.body.offsetHeight;
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  /**
   * Restores visibility after screenshot capture.
   */
  function restoreAfterCapture() {
    if (countdownHost) {
      countdownHost.style.removeProperty('display');
    }
  }

  // Export module to FullShotHUD namespace
  window.FullShotHUD.countdown = {
    show,
    cancel,
    remove,
    isVisible,
    getHost,
    hideForCapture,
    restoreAfterCapture
  };
})();
