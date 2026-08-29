/**
 * FullShot Pro - Floating Camera Bubble HUD (Webcam / Facecam Overlay)
 * Isolated Shadow DOM v1 Component for draggable round facecam with dynamic sizing,
 * mirror mode, and real-time audio halo reactive volume meter.
 * 4-Color Slate/Charcoal Palette (#4A4A4A, #CBCBCB, #FFFFE3, #6D8196)
 */

(function () {
  'use strict';

  window.FullShotHUD = window.FullShotHUD || {};

  const HOST_ID = '__fullshot_camera_bubble_host__';

  // Sizing Presets
  const SIZES = {
    small: 120,
    medium: 180,
    large: 260
  };

  let hostEl = null;
  let shadowRoot = null;
  let videoEl = null;
  let haloEl = null;
  let mediaStream = null;
  let audioContext = null;
  let analyserNode = null;
  let audioDataArray = null;
  let audioSourceNode = null;
  let haloAnimFrameId = null;

  let currentSize = 'medium'; // 'small' | 'medium' | 'large'
  let isMirrored = true;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let isInitialized = false;

  /**
   * Initializes and injects the Camera Bubble into the page
   */
  async function show(options = {}) {
    if (hostEl) {
      hostEl.style.display = 'block';
      return;
    }

    currentSize = options.size || 'medium';
    isMirrored = options.mirrored !== false;

    // 1. Create Host Element & Attach Shadow DOM
    hostEl = document.createElement('div');
    hostEl.id = HOST_ID;
    hostEl.style.cssText = [
      'all: initial !important',
      'position: fixed !important',
      'bottom: 24px !important',
      'left: 24px !important',
      'z-index: 2147483645 !important',
      'display: block !important',
      'user-select: none !important',
      'touch-action: none !important'
    ].join('; ');

    shadowRoot = hostEl.attachShadow({ mode: 'open' });

    // 2. Insert Styles & DOM Structure
    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .bubble-container {
          position: relative;
          width: ${SIZES[currentSize]}px;
          height: ${SIZES[currentSize]}px;
          border-radius: 50%;
          cursor: grab;
          transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.55));
        }

        .bubble-container:active {
          cursor: grabbing;
        }

        /* Audio Halo Pulse Ring */
        .audio-halo {
          position: absolute;
          top: -6px;
          left: -6px;
          right: -6px;
          bottom: -6px;
          border-radius: 50%;
          border: 3px solid rgba(109, 129, 150, 0.4);
          box-shadow: 0 0 12px rgba(109, 129, 150, 0.3), inset 0 0 8px rgba(109, 129, 150, 0.2);
          pointer-events: none;
          transition: transform 0.08s ease-out, border-color 0.1s ease, box-shadow 0.1s ease;
          z-index: 1;
        }

        /* Inner Video Wrapper */
        .video-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          background: #1f2125;
          border: 2px solid rgba(255, 255, 227, 0.2);
          z-index: 2;
        }

        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: ${isMirrored ? 'scaleX(-1)' : 'none'};
          background: #121418;
        }

        /* Quick Action Toolbar (Appears on Hover) */
        .action-toolbar {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          background: rgba(36, 38, 43, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(109, 129, 150, 0.4);
          border-radius: 20px;
          padding: 3px 6px;
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 10;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.6);
        }

        .bubble-container:hover .action-toolbar {
          opacity: 1;
          pointer-events: auto;
          transform: translateX(-50%) translateY(0);
        }

        .tool-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: transparent;
          border: none;
          color: #FFFFE3;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.15s ease;
          outline: none;
        }

        .tool-btn:hover {
          background: rgba(109, 129, 150, 0.35);
          transform: scale(1.1);
        }

        .tool-btn:active {
          transform: scale(0.92);
        }

        .tool-btn svg {
          width: 14px;
          height: 14px;
          stroke: currentColor;
          fill: none;
          stroke-width: 2;
        }

        .size-indicator {
          font-size: 9px;
          font-weight: 700;
          color: #CBCBCB;
          padding: 0 4px;
          font-family: monospace;
          pointer-events: none;
        }
      </style>

      <div class="bubble-container" id="bubbleContainer">
        <div class="audio-halo" id="audioHalo"></div>
        <div class="video-wrapper">
          <video id="cameraVideo" autoplay playsinline muted></video>
        </div>

        <div class="action-toolbar" id="actionToolbar">
          <!-- Size Toggle Button -->
          <button class="tool-btn" id="btnToggleSize" title="Boyut Değiştir (120px / 180px / 260px)" aria-label="Boyut Değiştir">
            <svg viewBox="0 0 24 24">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>

          <!-- Mirror Toggle Button -->
          <button class="tool-btn" id="btnToggleMirror" title="Ayna Modu (Yatay Çevir)" aria-label="Ayna Modu">
            <svg viewBox="0 0 24 24">
              <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"></path>
              <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"></path>
              <line x1="12" y1="2" x2="12" y2="22"></line>
            </svg>
          </button>

          <!-- Close / Hide Button -->
          <button class="tool-btn" id="btnCloseCamera" title="Kamerayı Kapat" aria-label="Kapat">
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(hostEl);

    videoEl = shadowRoot.getElementById('cameraVideo');
    haloEl = shadowRoot.getElementById('audioHalo');

    // 3. Acquire Webcam & Mic MediaStream
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (videoEl) {
        videoEl.srcObject = mediaStream;
        await videoEl.play().catch(() => {});
      }

      // 4. Setup Web Audio API Analyser for Audio Halo Meter
      setupAudioHalo(mediaStream);
    } catch (err) {
      console.warn('[CameraBubble] Kamera akışı alınamadı:', err);
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoEl) {
          videoEl.srcObject = mediaStream;
          await videoEl.play().catch(() => {});
        }
      } catch (videoOnlyErr) {
        console.error('[CameraBubble] Video başlatılamadı:', videoOnlyErr);
        hide();
        throw new Error('Kamera izni verilmedi veya cihaz bulunamadı.');
      }
    }

    // 5. Setup Drag and Drop & Control Event Listeners
    setupDragEvents();
    setupControls();
    isInitialized = true;
  }

  /**
   * Connects microphone track to Web Audio AnalyserNode to drive audio halo meter
   */
  function setupAudioHalo(stream) {
    if (!stream || stream.getAudioTracks().length === 0) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }

      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.6;

      audioSourceNode = audioContext.createMediaStreamSource(stream);
      audioSourceNode.connect(analyserNode);

      const bufferLength = analyserNode.frequencyBinCount;
      audioDataArray = new Uint8Array(bufferLength);

      const renderHalo = () => {
        if (!haloEl || !analyserNode) return;

        analyserNode.getByteFrequencyData(audioDataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += audioDataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 120);

        if (normalized > 0.05) {
          const scale = 1 + (normalized * 0.22);
          const glowSize = 10 + (normalized * 28);
          const alpha = 0.4 + (normalized * 0.55);
          haloEl.style.transform = `scale(${scale})`;
          haloEl.style.borderColor = `rgba(109, 129, 150, ${alpha})`;
          haloEl.style.boxShadow = `0 0 ${glowSize}px rgba(109, 129, 150, ${alpha}), inset 0 0 ${glowSize * 0.5}px rgba(109, 129, 150, ${alpha * 0.6})`;
        } else {
          haloEl.style.transform = 'scale(1)';
          haloEl.style.borderColor = 'rgba(109, 129, 150, 0.4)';
          haloEl.style.boxShadow = '0 0 10px rgba(109, 129, 150, 0.25)';
        }

        haloAnimFrameId = requestAnimationFrame(renderHalo);
      };

      renderHalo();
    } catch (e) {
      console.warn('[CameraBubble] Audio halo başlatılamadı:', e);
    }
  }

  /**
   * Sets up drag and drop movement with viewport boundary clamping
   */
  function setupDragEvents() {
    const container = shadowRoot.getElementById('bubbleContainer');
    if (!container) return;

    container.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.tool-btn')) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      const rect = hostEl.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      hostEl.style.bottom = 'auto';
      hostEl.style.right = 'auto';
      hostEl.style.left = `${initialLeft}px`;
      hostEl.style.top = `${initialTop}px`;

      e.preventDefault();
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging || !hostEl) return;

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      const sizePx = SIZES[currentSize] || 180;
      const maxLeft = window.innerWidth - sizePx - 10;
      const maxTop = window.innerHeight - sizePx - 10;

      newLeft = Math.max(10, Math.min(maxLeft, newLeft));
      newTop = Math.max(10, Math.min(maxTop, newTop));

      hostEl.style.left = `${newLeft}px`;
      hostEl.style.top = `${newTop}px`;
    });

    window.addEventListener('pointerup', () => {
      isDragging = false;
    });
  }

  /**
   * Sets up size toggle, mirror toggle, and close controls
   */
  function setupControls() {
    const btnSize = shadowRoot.getElementById('btnToggleSize');
    const btnMirror = shadowRoot.getElementById('btnToggleMirror');
    const btnClose = shadowRoot.getElementById('btnCloseCamera');

    if (btnSize) {
      btnSize.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleSize();
      });
    }

    if (btnMirror) {
      btnMirror.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMirror();
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        hide();
      });
    }
  }

  function cycleSize() {
    const sizeKeys = ['small', 'medium', 'large'];
    const nextIdx = (sizeKeys.indexOf(currentSize) + 1) % sizeKeys.length;
    setSize(sizeKeys[nextIdx]);
  }

  function setSize(size) {
    if (!SIZES[size]) return;
    currentSize = size;
    const container = shadowRoot?.getElementById('bubbleContainer');
    if (container) {
      const px = SIZES[size];
      container.style.width = `${px}px`;
      container.style.height = `${px}px`;
    }
  }

  function toggleMirror() {
    isMirrored = !isMirrored;
    if (videoEl) {
      videoEl.style.transform = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    }
  }

  function hide() {
    if (haloAnimFrameId) {
      cancelAnimationFrame(haloAnimFrameId);
      haloAnimFrameId = null;
    }

    if (audioSourceNode) {
      try { audioSourceNode.disconnect(); } catch (e) {}
      audioSourceNode = null;
    }

    if (audioContext && audioContext.state !== 'closed') {
      try { audioContext.close().catch(() => {}); } catch (e) {}
      audioContext = null;
    }

    if (mediaStream) {
      try {
        mediaStream.getTracks().forEach((t) => {
          t.stop();
          t.enabled = false;
        });
      } catch (e) {}
      mediaStream = null;
    }

    if (videoEl) {
      videoEl.srcObject = null;
      videoEl = null;
    }

    if (hostEl && hostEl.parentNode) {
      hostEl.parentNode.removeChild(hostEl);
      hostEl = null;
      shadowRoot = null;
    }

    isInitialized = false;
  }

  function toggle(options = {}) {
    if (hostEl && isInitialized) {
      hide();
    } else {
      show(options);
    }
  }

  function isVisible() {
    return Boolean(hostEl && hostEl.parentNode && isInitialized);
  }

  window.FullShotHUD.cameraBubble = {
    show,
    hide,
    toggle,
    setSize,
    toggleMirror,
    isVisible
  };
})();
