/**
 * FullShot Pro - Advanced Dark-Themed Color Studio & Color Picker Engine
 * Zero-dependency HSV / RGB / HEX color math, 2D SV gradient canvas,
 * 1D rainbow hue slider, native EyeDropper API, and persistent recent colors.
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
      this.onColorChange = options.onColorChange || (() => {});
      this.isOpen = false;

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
            <button class="cs-eyedropper-btn" id="csEyedropperBtn" title="Ekrandan Renk Seç (Damlalık)" aria-label="Damlalık ile renk seç">
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

      // Hide eyedropper if not supported
      if (!window.EyeDropper) {
        this.eyedropperBtn.style.display = 'none';
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

      // 5. Eyedropper API
      this.eyedropperBtn.addEventListener('click', async () => {
        if (window.EyeDropper) {
          try {
            const eyeDropper = new window.EyeDropper();
            const result = await eyeDropper.open();
            if (result && result.sRGBHex) {
              this.setColor(result.sRGBHex, true);
            }
          } catch (_) {
            // User cancelled or error
          }
        }
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
        if (this.isOpen && e.key === 'Escape') {
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
