/**
 * FullShot Pro - Advanced Dark-Themed Color Studio & Color Picker Engine
 * Zero-dependency HSV / RGB / HEX color math, 2D SV gradient canvas,
 * 1D rainbow hue slider, native EyeDropper API with graceful Canvas 8x Loupe fallback,
 * and persistent recent colors.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  // --- 1. COLOR SPACE CONVERSIONS ---
  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    v = Math.max(0, Math.min(1, v));

    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

    let r1 = 0, g1 = 0, b1 = 0;
    if (h >= 0 && h < 60) {
      r1 = c; g1 = x; b1 = 0;
    } else if (h >= 60 && h < 120) {
      r1 = x; g1 = c; b1 = 0;
    } else if (h >= 120 && h < 180) {
      r1 = 0; g1 = c; b1 = x;
    } else if (h >= 180 && h < 240) {
      r1 = 0; g1 = x; b1 = c;
    } else if (h >= 240 && h < 300) {
      r1 = x; g1 = 0; b1 = c;
    } else {
      r1 = c; g1 = 0; b1 = x;
    }

    return {
      r: Math.round((r1 + m) * 255),
      g: Math.round((g1 + m) * 255),
      b: Math.round((b1 + m) * 255)
    };
  }

  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
      if (max === r) {
        h = (g - b) / d + (g < b ? 6 : 0);
      } else if (max === g) {
        h = (b - r) / d + 2;
      } else {
        h = (r - g) / d + 4;
      }
      h *= 60;
    }

    return { h, s, v };
  }

  function rgbToHex(r, g, b) {
    const toHex = c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  function hexToRgb(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    hex = hex.replace(/^#/, '').trim();
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length !== 6) return { r: 0, g: 0, b: 0 };

    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function hexToHsv(hex) {
    const rgb = hexToRgb(hex);
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  }

  // --- 2. COLOR PICKER COMPONENT CONTROLLER ---
  class ColorPicker {
    constructor(options = {}) {
      this.container = options.container || document.body;
      this.initialColor = options.initialColor || '#FF3366';
      this.canvasTarget = options.canvasTarget || null;
      this.onColorChange = options.onColorChange || (() => {});
      this.onColorPicked = options.onColorPicked || (() => {});
      this.isOpen = false;
      this.isLoupeActive = false;

      // Current HSV state
      const hsv = hexToHsv(this.initialColor);
      this.h = hsv.h;
      this.s = hsv.s;
      this.v = hsv.v;

      this.recentColors = this.loadRecentColors();
      this.buildDOM();
      this.bindEvents();
      this.render();
    }

    loadRecentColors() {
      try {
        const raw = localStorage.getItem('fullshot_recent_colors');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length > 0) return arr.slice(0, 6);
        }
      } catch (_) {}
      return ['#000000', '#FFFFFF', '#FF3366', '#00D2FF', '#FFD700', '#00E676'];
    }

    saveRecentColor(hex) {
      if (!hex || typeof hex !== 'string') return;
      hex = hex.toUpperCase();
      this.recentColors = [hex, ...this.recentColors.filter(c => c !== hex)].slice(0, 6);
      try {
        localStorage.setItem('fullshot_recent_colors', JSON.stringify(this.recentColors));
      } catch (_) {}
      this.renderRecentSwatches();
    }

    buildDOM() {
      // Popover element
      this.popover = document.createElement('div');
      this.popover.className = 'color-studio-popover hidden';
      this.popover.id = 'colorStudioPopover';
      this.popover.setAttribute('role', 'dialog');
      this.popover.setAttribute('aria-modal', 'true');
      this.popover.setAttribute('aria-label', 'Özel Renk Seçici');

      this.popover.innerHTML = `
        <div class="cs-popover-header">
          <div class="cs-popover-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12"></path>
            </svg>
            <span>Renk Paleti & Seçici</span>
          </div>
          <div class="cs-header-actions">
            <button class="cs-eyedropper-btn" id="csEyedropperBtn" title="Ekrandan veya Tuvalden Renk Seç (Damlalık) [I]" aria-label="Damlalık ile renk seç">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m19 11-8-8-8.5 8.5a2.12 2.12 0 0 0 0 3l2 2a2.12 2.12 0 0 0 3 0L16 8"></path>
                <path d="m19 11 2 2-2 2-2-2"></path>
                <line x1="2" y1="22" x2="6.5" y2="17.5"></line>
              </svg>
            </button>
            <button class="cs-close-btn" id="csCloseBtn" title="Kapat (ESC)" aria-label="Kapat">✕</button>
          </div>
        </div>

        <!-- 2D Saturation / Value Gradient Canvas -->
        <div class="cs-sv-wrapper">
          <canvas class="cs-sv-canvas" id="csSvCanvas" width="216" height="120"></canvas>
          <div class="cs-sv-handle" id="csSvHandle"></div>
        </div>

        <!-- 1D Hue Spectrum Slider -->
        <div class="cs-hue-wrapper">
          <div class="cs-hue-track" id="csHueTrack"></div>
          <div class="cs-hue-thumb" id="csHueThumb"></div>
        </div>

        <!-- Real-time Preview & Input Controls -->
        <div class="cs-controls-row">
          <div class="cs-color-preview" id="csColorPreview"></div>
          <div class="cs-input-group">
            <span class="cs-input-prefix">HEX</span>
            <input type="text" class="cs-hex-input" id="csHexInput" value="${this.initialColor}" maxlength="7" spellcheck="false" aria-label="Hex Renk Kodu">
            <button class="cs-copy-hex-btn" id="csCopyHexBtn" title="HEX Kodunu Kopyala" aria-label="HEX Kopyala">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Recent Colors Swatches -->
        <div class="cs-recent-section">
          <span class="cs-recent-label">Son Kullanılanlar:</span>
          <div class="cs-recent-grid" id="csRecentGrid" role="group" aria-label="Son Kullanılan Renkler"></div>
        </div>
      `;

      this.container.appendChild(this.popover);

      // Element Caches
      this.svCanvas = this.popover.querySelector('#csSvCanvas');
      this.svCtx = this.svCanvas.getContext('2d');
      this.svHandle = this.popover.querySelector('#csSvHandle');
      this.svWrapper = this.popover.querySelector('.cs-sv-wrapper');

      this.hueTrack = this.popover.querySelector('#csHueTrack');
      this.hueThumb = this.popover.querySelector('#csHueThumb');
      this.hueWrapper = this.popover.querySelector('.cs-hue-wrapper');

      this.colorPreview = this.popover.querySelector('#csColorPreview');
      this.hexInput = this.popover.querySelector('#csHexInput');
      this.copyHexBtn = this.popover.querySelector('#csCopyHexBtn');
      this.eyedropperBtn = this.popover.querySelector('#csEyedropperBtn');
      this.closeBtn = this.popover.querySelector('#csCloseBtn');
      this.recentGrid = this.popover.querySelector('#csRecentGrid');

      // Native EyeDropper tooltip & indicator
      if (!window.EyeDropper) {
        this.eyedropperBtn.title = 'Tuvalden Renk Seç (8x Büyüteç Damlalık) [I]';
      }

      this.renderRecentSwatches();
    }

    renderRecentSwatches() {
      if (!this.recentGrid) return;
      this.recentGrid.innerHTML = '';
      this.recentColors.forEach(color => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cs-recent-swatch';
        btn.style.backgroundColor = color;
        btn.title = color;
        btn.setAttribute('aria-label', `Renk: ${color}`);
        btn.addEventListener('click', () => {
          this.setColor(color, true);
        });
        this.recentGrid.appendChild(btn);
      });
    }

    bindEvents() {
      // 1. SV Canvas Dragging
      let isDraggingSv = false;
      const handleSvMove = (e) => {
        const rect = this.svWrapper.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

        this.s = x / rect.width;
        this.v = 1 - (y / rect.height);
        this.updateFromHsv(true);
      };

      this.svWrapper.addEventListener('mousedown', (e) => {
        isDraggingSv = true;
        handleSvMove(e);
      });

      this.svWrapper.addEventListener('touchstart', (e) => {
        isDraggingSv = true;
        handleSvMove(e);
      }, { passive: true });

      // 2. Hue Slider Dragging
      let isDraggingHue = false;
      const handleHueMove = (e) => {
        const rect = this.hueWrapper.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));

        this.h = (x / rect.width) * 360;
        this.updateFromHsv(true);
      };

      this.hueWrapper.addEventListener('mousedown', (e) => {
        isDraggingHue = true;
        handleHueMove(e);
      });

      this.hueWrapper.addEventListener('touchstart', (e) => {
        isDraggingHue = true;
        handleHueMove(e);
      }, { passive: true });

      window.addEventListener('mousemove', (e) => {
        if (isDraggingSv) handleSvMove(e);
        if (isDraggingHue) handleHueMove(e);
      });

      window.addEventListener('touchmove', (e) => {
        if (isDraggingSv) handleSvMove(e);
        if (isDraggingHue) handleHueMove(e);
      }, { passive: true });

      window.addEventListener('mouseup', () => {
        if (isDraggingSv || isDraggingHue) {
          isDraggingSv = false;
          isDraggingHue = false;
          this.saveRecentColor(this.getHex());
        }
      });

      window.addEventListener('touchend', () => {
        if (isDraggingSv || isDraggingHue) {
          isDraggingSv = false;
          isDraggingHue = false;
          this.saveRecentColor(this.getHex());
        }
      });

      // 3. HEX Input
      this.hexInput.addEventListener('input', (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          const hsv = hexToHsv(val);
          this.h = hsv.h;
          this.s = hsv.s;
          this.v = hsv.v;
          this.updateFromHsv(true, false);
          this.saveRecentColor(val);
        }
      });

      // 4. Copy HEX Button
      this.copyHexBtn.addEventListener('click', () => {
        const hex = this.getHex();
        navigator.clipboard.writeText(hex).then(() => {
          this.copyHexBtn.classList.add('copied');
          setTimeout(() => this.copyHexBtn.classList.remove('copied'), 1200);
        });
      });

      // 5. Eyedropper API with Graceful Canvas Fallback
      this.eyedropperBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.activateEyeDropper();
      });

      // 6. Close Button
      this.closeBtn.addEventListener('click', () => {
        this.close();
      });

      // 7. Click Outside to Close
      document.addEventListener('mousedown', (e) => {
        if (!this.isOpen) return;
        if (this.popover.contains(e.target) || e.target.closest('#customColorTriggerBtn') || e.target.closest('.custom-color-picker')) {
          return;
        }
        this.close();
      });

      // 8. ESC Key to Close
      window.addEventListener('keydown', (e) => {
        if (this.isOpen && e.key === 'Escape' && !this.isLoupeActive) {
          this.close();
        }
      });
    }

    render() {
      // 1. Draw 2D Saturation-Value Canvas
      const w = this.svCanvas.width;
      const h = this.svCanvas.height;

      // Base pure hue color
      const baseRgb = hsvToRgb(this.h, 1, 1);
      this.svCtx.fillStyle = `rgb(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b})`;
      this.svCtx.fillRect(0, 0, w, h);

      // Horizontal white gradient (Saturation: Left = 0, Right = 1)
      const whiteGrad = this.svCtx.createLinearGradient(0, 0, w, 0);
      whiteGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      whiteGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.svCtx.fillStyle = whiteGrad;
      this.svCtx.fillRect(0, 0, w, h);

      // Vertical black gradient (Value/Brightness: Top = 1, Bottom = 0)
      const blackGrad = this.svCtx.createLinearGradient(0, 0, 0, h);
      blackGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      blackGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
      this.svCtx.fillStyle = blackGrad;
      this.svCtx.fillRect(0, 0, w, h);

      // 2. Position SV Handle
      const handleX = this.s * 100;
      const handleY = (1 - this.v) * 100;
      this.svHandle.style.left = `${handleX}%`;
      this.svHandle.style.top = `${handleY}%`;
      this.svHandle.style.backgroundColor = this.getHex();

      // 3. Position Hue Thumb
      const huePercent = (this.h / 360) * 100;
      this.hueThumb.style.left = `${huePercent}%`;

      // 4. Update Preview & Input
      const hex = this.getHex();
      this.colorPreview.style.backgroundColor = hex;
      if (document.activeElement !== this.hexInput) {
        this.hexInput.value = hex;
      }
    }

    updateFromHsv(notify = true, syncInput = true) {
      this.render();
      const hex = this.getHex();
      if (syncInput && document.activeElement !== this.hexInput) {
        this.hexInput.value = hex;
      }
      if (notify && typeof this.onColorChange === 'function') {
        this.onColorChange(hex);
      }
    }

    getHex() {
      const rgb = hsvToRgb(this.h, this.s, this.v);
      return rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    setColor(hex, notify = true) {
      if (!hex) return;
      const hsv = hexToHsv(hex);
      this.h = hsv.h;
      this.s = hsv.s;
      this.v = hsv.v;
      this.updateFromHsv(notify, true);
      this.saveRecentColor(hex);
    }

    open(triggerElement) {
      this.isOpen = true;
      this.popover.classList.remove('hidden');

      if (triggerElement) {
        const rect = triggerElement.getBoundingClientRect();
        const popoverWidth = 240;
        
        let left = rect.right + 12;
        let top = rect.top - 30;

        // Viewport bounds checking
        if (left + popoverWidth > window.innerWidth) {
          left = rect.left - popoverWidth - 12;
        }
        if (top + 280 > window.innerHeight) {
          top = window.innerHeight - 290;
        }
        if (top < 10) top = 10;

        this.popover.style.left = `${left}px`;
        this.popover.style.top = `${top}px`;
      }
      this.render();
    }

    close() {
      this.isOpen = false;
      this.popover.classList.add('hidden');
    }

    toggle(triggerElement) {
      if (this.isOpen) {
        this.close();
      } else {
        this.open(triggerElement);
      }
    }

    // ==============================================================
    // 3. EYE DROPPER API & CANVAS 8X LOUPE GRACEFUL FALLBACK
    // ==============================================================

    /**
     * Triggers color picking via Native EyeDropper API with automatic
     * graceful fallback to Canvas 8x Loupe if unsupported or cancelled.
     *
     * @param {HTMLCanvasElement} [fallbackCanvas=null] Target canvas to sample from
     * @returns {Promise<string|null>} Selected HEX color or null
     */
    async activateEyeDropper(fallbackCanvas = null) {
      const targetCanvas = fallbackCanvas || this.canvasTarget || document.getElementById('mainCanvas');

      // 1. Check Native EyeDropper API support
      if (window.EyeDropper) {
        try {
          const eyeDropper = new window.EyeDropper();
          const result = await eyeDropper.open();
          if (result && result.sRGBHex) {
            const hex = result.sRGBHex.toUpperCase();
            this.setColor(hex, true);
            if (typeof this.onColorPicked === 'function') {
              this.onColorPicked(hex);
            }
            return hex;
          }
        } catch (err) {
          // If user aborted with ESC or platform failed, fallback to Canvas Loupe if canvas exists
          console.info('[ColorPicker] Native EyeDropper iptal edildi veya hata oluştu:', err);
          if (targetCanvas && err.name !== 'AbortError') {
            return this.startCanvasLoupe(targetCanvas);
          }
          return null;
        }
      }

      // 2. Graceful Fallback: Interactive Canvas 8x Loupe Pixel Reader
      if (targetCanvas) {
        return this.startCanvasLoupe(targetCanvas);
      }

      return null;
    }

    /**
     * Starts an interactive 8x Magnifier Loupe pixel reader overlay on the canvas.
     * Features: Pixel Grid, Hairline Crosshairs, Live HEX/RGB Badge, Keyboard C to copy.
     *
     * @param {HTMLCanvasElement} targetCanvas Canvas to sample pixels from
     * @returns {Promise<string|null>}
     */
    startCanvasLoupe(targetCanvas) {
      return new Promise((resolve) => {
        if (!targetCanvas) {
          resolve(null);
          return;
        }

        this.isLoupeActive = true;
        const originalCursor = document.body.style.cursor;
        document.body.style.cursor = 'crosshair';

        // Create or get Loupe Container
        let loupeContainer = document.getElementById('colorStudioCanvasLoupeHUD');
        if (!loupeContainer) {
          loupeContainer = document.createElement('div');
          loupeContainer.id = 'colorStudioCanvasLoupeHUD';
          loupeContainer.className = 'cs-canvas-loupe-hud';
          loupeContainer.style.cssText = `
            position: fixed;
            display: none;
            flex-direction: column;
            align-items: center;
            pointer-events: none;
            z-index: 999999;
            gap: 6px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            user-select: none;
          `;
          loupeContainer.innerHTML = `
            <div class="cs-loupe-circle" style="
              width: 140px;
              height: 140px;
              border-radius: 50%;
              border: 2.5px solid #6D8196;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.25), inset 0 0 8px rgba(0,0,0,0.4);
              overflow: hidden;
              background: #24262b;
              position: relative;
            ">
              <canvas id="csLoupeCanvasEl" width="140" height="140" style="width: 140px; height: 140px; display: block;"></canvas>
            </div>
            <div class="cs-loupe-panel" style="
              display: flex;
              align-items: center;
              gap: 6px;
              background: #373a40;
              border: 1px solid #545862;
              border-radius: 8px;
              padding: 4px 8px;
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 11px;
              color: #FFFFE3;
              white-space: nowrap;
            ">
              <span id="csLoupeSwatch" style="width: 14px; height: 14px; border-radius: 4px; border: 1px solid #545862; background: #6D8196; flex-shrink: 0;"></span>
              <span id="csLoupeHex" style="font-weight: 700; color: #FFFFE3;">#4A4A4A</span>
              <span id="csLoupeRgb" style="color: #CBCBCB; font-size: 10px;">rgb(74, 74, 74)</span>
              <span style="background: #24262b; border: 1px solid #545862; color: #FFFFE3; padding: 1px 4px; border-radius: 3px; font-size: 9px; font-weight: 600;">Seç: Tıkla</span>
            </div>
          `;
          document.body.appendChild(loupeContainer);
        }

        const loupeCanvas = loupeContainer.querySelector('#csLoupeCanvasEl');
        const loupeCtx = loupeCanvas.getContext('2d');
        const loupeSwatch = loupeContainer.querySelector('#csLoupeSwatch');
        const loupeHex = loupeContainer.querySelector('#csLoupeHex');
        const loupeRgb = loupeContainer.querySelector('#csLoupeRgb');

        let currentHoverHex = this.getHex();
        let currentHoverRgb = 'rgb(0, 0, 0)';

        // Sample context from target canvas
        const sampleCtx = targetCanvas.getContext('2d', { willReadFrequently: true });

        const renderLoupe = (clientX, clientY) => {
          loupeContainer.style.display = 'flex';

          const rect = targetCanvas.getBoundingClientRect();
          const scaleX = targetCanvas.width / rect.width;
          const scaleY = targetCanvas.height / rect.height;

          // Convert client coordinates to canvas internal pixel coordinates
          const canvasX = Math.round((clientX - rect.left) * scaleX);
          const canvasY = Math.round((clientY - rect.top) * scaleY);

          // Clamping
          const clampedX = Math.max(0, Math.min(targetCanvas.width - 1, canvasX));
          const clampedY = Math.max(0, Math.min(targetCanvas.height - 1, canvasY));

          // Position Loupe near cursor with viewport boundary checking
          const loupeSize = 140;
          const panelHeight = 32;
          let left = clientX + 24;
          let top = clientY + 24;

          if (left + loupeSize > window.innerWidth - 12) {
            left = clientX - loupeSize - 24;
          }
          if (top + loupeSize + panelHeight > window.innerHeight - 12) {
            top = clientY - loupeSize - panelHeight - 24;
          }

          loupeContainer.style.left = `${Math.max(12, Math.round(left))}px`;
          loupeContainer.style.top = `${Math.max(12, Math.round(top))}px`;

          // Read Center Pixel Color
          try {
            const p = sampleCtx.getImageData(clampedX, clampedY, 1, 1).data;
            const r = p[0], g = p[1], b = p[2];
            currentHoverHex = rgbToHex(r, g, b);
            currentHoverRgb = `rgb(${r}, ${g}, ${b})`;

            loupeSwatch.style.backgroundColor = currentHoverHex;
            loupeHex.textContent = currentHoverHex;
            loupeRgb.textContent = currentHoverRgb;
          } catch (e) {
            // Out of bounds or tainted
          }

          // Draw 8x Magnified Pixels
          loupeCtx.clearRect(0, 0, 140, 140);
          loupeCtx.fillStyle = '#1e2024';
          loupeCtx.fillRect(0, 0, 140, 140);

          const zoom = 8;
          const sampleW = 140 / zoom; // 17.5px source size
          const sampleH = 140 / zoom;
          const sx = clampedX - (sampleW / 2);
          const sy = clampedY - (sampleH / 2);

          loupeCtx.imageSmoothingEnabled = false;
          try {
            loupeCtx.drawImage(targetCanvas, sx, sy, sampleW, sampleH, 0, 0, 140, 140);
          } catch (err) {}

          // Draw 1px Pixel Grid Overlay
          loupeCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          loupeCtx.lineWidth = 1;
          loupeCtx.beginPath();
          for (let p = 0; p <= 140; p += zoom) {
            loupeCtx.moveTo(p, 0);
            loupeCtx.lineTo(p, 140);
            loupeCtx.moveTo(0, p);
            loupeCtx.lineTo(140, p);
          }
          loupeCtx.stroke();

          // Draw Center Hairlines & Focus Box
          const center = 70;
          const centerBoxSize = zoom; // 8px

          loupeCtx.strokeStyle = 'rgba(255, 255, 227, 0.85)';
          loupeCtx.lineWidth = 1;
          loupeCtx.beginPath();
          loupeCtx.moveTo(center, 0);
          loupeCtx.lineTo(center, center - centerBoxSize / 2);
          loupeCtx.moveTo(center, center + centerBoxSize / 2);
          loupeCtx.lineTo(center, 140);
          loupeCtx.moveTo(0, center);
          loupeCtx.lineTo(center - centerBoxSize / 2, center);
          loupeCtx.moveTo(center + centerBoxSize / 2, center);
          loupeCtx.lineTo(140, center);
          loupeCtx.stroke();

          // Center Pixel Highlight Box
          loupeCtx.strokeStyle = '#6D8196';
          loupeCtx.lineWidth = 1.5;
          loupeCtx.strokeRect(center - centerBoxSize / 2, center - centerBoxSize / 2, centerBoxSize, centerBoxSize);
        };

        const onMouseMove = (e) => {
          renderLoupe(e.clientX, e.clientY);
        };

        const cleanupLoupe = () => {
          this.isLoupeActive = false;
          document.body.style.cursor = originalCursor;
          if (loupeContainer) {
            loupeContainer.style.display = 'none';
          }
          window.removeEventListener('mousemove', onMouseMove, true);
          window.removeEventListener('mousedown', onMouseDown, true);
          window.removeEventListener('keydown', onKeyDown, true);
        };

        const onMouseDown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          cleanupLoupe();

          this.setColor(currentHoverHex, true);
          if (typeof this.onColorPicked === 'function') {
            this.onColorPicked(currentHoverHex);
          }
          resolve(currentHoverHex);
        };

        const onKeyDown = (e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            cleanupLoupe();
            resolve(null);
          } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
            navigator.clipboard.writeText(currentHoverHex).catch(() => {});
          }
        };

        window.addEventListener('mousemove', onMouseMove, true);
        window.addEventListener('mousedown', onMouseDown, true);
        window.addEventListener('keydown', onKeyDown, true);
      });
    }
  }

  window.FullShotCanvas.ColorPicker = ColorPicker;
  window.FullShotCanvas.ColorMath = {
    hsvToRgb,
    rgbToHsv,
    rgbToHex,
    hexToRgb,
    hexToHsv
  };
})();
