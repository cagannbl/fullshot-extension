/**
 * FullShot Pro - Image Studio Main Coordinator
 * Orchestrates tools, canvas renderer, history stack, and export pipelines.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  class ImageStudioCoordinator {
    constructor() {
      this.state = new window.FullShotCanvas.StudioState();
      this.history = new window.FullShotCanvas.HistoryStack(50);
      this.renderer = null;
      this.zoomPan = null;
      this.modals = null;
      this.events = null;
      this.colorPicker = null;

      this.currentCapture = null;
      this.baseImage = null;

      document.addEventListener('DOMContentLoaded', () => this.init());
    }

    async init() {
      try {
        await this.loadCaptureData();
        this.initRenderer();
        this.initZoomPan();
        this.initModals();
        this.initEvents();
        this.initColorPicker();
        this.initUIControls();
        this.initTopBarActions();
        this.initKeyboardShortcuts();
        this.initAutoCensor();

        // Initial Tool
        this.setActiveTool('select');
      } catch (err) {
        console.error('[ImageStudio] Initialization error:', err);
      }
    }

    async loadCaptureData() {
      const urlParams = new URLSearchParams(window.location.search);
      const captureId = urlParams.get('id');

      if (captureId && window.FullShotDB) {
        try {
          const dbItem = await window.FullShotDB.getCapture(captureId);
          if (dbItem && dbItem.dataUrl) {
            this.currentCapture = dbItem;
          }
        } catch (err) {
          console.warn('[ImageStudio] DB lookup failed, falling back to local storage:', err);
        }
      }

      if (!this.currentCapture && typeof chrome !== 'undefined' && chrome.storage?.local) {
        const stored = await chrome.storage.local.get('fullshot_current_capture');
        if (stored.fullshot_current_capture) {
          this.currentCapture = stored.fullshot_current_capture;
        }
      }

      if (!this.currentCapture) {
        // Fallback sample canvas
        this.currentCapture = {
          dataUrl: this.createEmptyCanvasDataUrl(1280, 800),
          title: 'Yeni Ekran Görüntüsü',
          url: 'https://example.com'
        };
      }

      // Update Page Meta
      const titleEl = document.getElementById('pageTitle');
      const urlEl = document.getElementById('pageUrl');
      if (titleEl) titleEl.textContent = this.currentCapture.title || 'Ekran Görüntüsü';
      if (urlEl) urlEl.textContent = this.currentCapture.url || '';
    }

    createEmptyCanvasDataUrl(width, height) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, width, height);
      return canvas.toDataURL('image/png');
    }

    initRenderer() {
      const stage = document.getElementById('studioCanvasStage');
      if (!stage) return;

      this.renderer = new window.FullShotCanvas.CanvasRenderer(stage);

      if (this.currentCapture && this.currentCapture.dataUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          this.baseImage = img;
          this.state.set('baseImage', img);
          this.renderer.setSize(img.naturalWidth, img.naturalHeight);
          this.renderer.render(this.history.getStack(), this.history.getIndex(), img);
          this.updateDimensionsInfo(img.naturalWidth, img.naturalHeight);
          if (this.zoomPan) {
            this.zoomPan.fitToScreen(img.naturalWidth, img.naturalHeight);
          }
        };
        img.src = this.currentCapture.dataUrl;
      }
    }

    initZoomPan() {
      const stage = document.getElementById('studioCanvasStage');
      if (!stage) return;

      this.zoomPan = new window.FullShotCanvas.ZoomPan(stage, {
        onZoomChange: (zoom) => {
          const zoomValEl = document.getElementById('zoomValue');
          if (zoomValEl) zoomValEl.textContent = `${Math.round(zoom * 100)}%`;
        }
      });
    }

    initModals() {
      this.modals = new window.FullShotCanvas.StudioModals({
        renderer: this.renderer,
        history: this.history,
        state: this.state,
        onApplyAction: (action) => {
          this.history.push(action);
          this.renderer.render(this.history.getStack(), this.history.getIndex(), this.state.get('baseImage'));
          this.updateHistoryButtons();
        }
      });
    }

    initEvents() {
      this.events = new window.FullShotCanvas.StudioEvents({
        renderer: this.renderer,
        history: this.history,
        state: this.state,
        zoomPan: this.zoomPan,
        onActionCommitted: () => this.updateHistoryButtons()
      });
    }

    initColorPicker() {
      const triggerBtn = document.getElementById('customColorBtn');
      if (!triggerBtn || !window.FullShotCanvas.ColorPicker) return;

      this.colorPicker = new window.FullShotCanvas.ColorPicker({
        triggerElement: triggerBtn,
        initialColor: this.state.get('activeColor') || '#000000',
        onColorChange: (hex) => {
          this.state.set('activeColor', hex);
          this.updateColorSwatches(hex);
          if (this.events) this.events.renderLiveTextPreview();
        }
      });
    }

    initUIControls() {
      // 1. Tool Selection Buttons
      document.querySelectorAll('.tool-item[data-tool]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const tool = btn.dataset.tool;
          this.setActiveTool(tool);
        });
      });

      // 2. Color Swatches
      document.querySelectorAll('.swatch[data-color]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const color = btn.dataset.color;
          this.state.set('activeColor', color);
          this.updateColorSwatches(color);
          if (this.events) this.events.renderLiveTextPreview();
        });
      });

      // 3. Stroke Width Swatches
      document.querySelectorAll('.stroke-btn[data-width]').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.stroke-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.set('activeStrokeWidth', parseInt(btn.dataset.width, 10));
        });
      });

      // 4. Font Size Buttons
      document.querySelectorAll('.font-size-btn[data-size]').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.font-size-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.set('activeFontSize', parseInt(btn.dataset.size, 10));
          if (this.events) this.events.renderLiveTextPreview();
        });
      });

      // 5. Callout Style Pills
      document.querySelectorAll('.callout-style-pill[data-style]').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.callout-style-pill').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.set('activeCalloutStyle', btn.dataset.style);
          if (this.events) this.events.renderLiveTextPreview();
        });
      });

      // 6. Text Background Toggle
      const textBgCheck = document.getElementById('textBgToggle');
      if (textBgCheck) {
        textBgCheck.addEventListener('change', () => {
          this.state.set('activeTextBg', textBgCheck.checked);
          if (this.events) this.events.renderLiveTextPreview();
        });
      }

      // 7. Arrow Mode Buttons
      document.querySelectorAll('.arrow-mode-btn[data-mode]').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.arrow-mode-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.set('activeArrowMode', btn.dataset.mode);
        });
      });

      // 8. Curved Arrow Toggle
      const curvedCheck = document.getElementById('arrowCurvedToggle');
      if (curvedCheck) {
        curvedCheck.addEventListener('change', () => {
          this.state.set('activeArrowCurved', curvedCheck.checked);
        });
      }

      // 9. Dashed Line Toggle
      const dashedCheck = document.getElementById('lineDashedToggle');
      if (dashedCheck) {
        dashedCheck.addEventListener('change', () => {
          this.state.set('activeLineDashed', dashedCheck.checked);
        });
      }

      // 10. Blur Mode Selection
      document.querySelectorAll('.blur-mode-btn[data-blur]').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.blur-mode-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.set('activeBlurType', btn.dataset.blur);
        });
      });

      // 11. Spotlight Shape Selection
      document.querySelectorAll('.spotlight-shape-btn[data-shape]').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.spotlight-shape-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.set('activeSpotlightShape', btn.dataset.shape);
        });
      });

      // 12. Stamp Selection
      document.querySelectorAll('.stamp-catalog-btn[data-stamp]').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.stamp-catalog-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.set('activeStampId', btn.dataset.stamp);
        });
      });

      // 13. Step Badge Reset
      const resetStepBtn = document.getElementById('resetStepBtn');
      if (resetStepBtn) {
        resetStepBtn.addEventListener('click', () => {
          this.state.set('stepCounter', 1);
          if (this.modals) this.modals.showToast('Adım Sayacı Sıfırlandı (#1)');
        });
      }
    }

    setActiveTool(toolName) {
      this.state.set('activeTool', toolName);

      document.querySelectorAll('.tool-item[data-tool]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tool === toolName);
      });

      // Contextual Option Panels Visibility
      const colorGroup = document.getElementById('colorOptionGroup');
      const strokeGroup = document.getElementById('strokeWidthGroup');
      const fontSizeGroup = document.getElementById('fontSizeGroup');
      const arrowGroup = document.getElementById('arrowOptionGroup');
      const calloutGroup = document.getElementById('calloutOptionGroup');
      const blurGroup = document.getElementById('blurOptionGroup');
      const spotlightGroup = document.getElementById('spotlightOptionGroup');
      const stampGroup = document.getElementById('stampOptionGroup');
      const stepGroup = document.getElementById('stepOptionGroup');

      const isDrawingTool = ['pen', 'highlighter', 'line', 'arrow', 'rect', 'circle', 'text', 'callout', 'step'].includes(toolName);

      if (colorGroup) colorGroup.style.display = isDrawingTool ? 'flex' : 'none';
      if (strokeGroup) strokeGroup.style.display = ['pen', 'highlighter', 'line', 'arrow', 'rect', 'circle'].includes(toolName) ? 'flex' : 'none';
      if (fontSizeGroup) fontSizeGroup.style.display = ['text', 'callout'].includes(toolName) ? 'flex' : 'none';
      if (arrowGroup) arrowGroup.style.display = toolName === 'arrow' ? 'flex' : 'none';
      if (calloutGroup) calloutGroup.style.display = ['text', 'callout'].includes(toolName) ? 'flex' : 'none';
      if (blurGroup) blurGroup.style.display = toolName === 'blur' ? 'flex' : 'none';
      if (spotlightGroup) spotlightGroup.style.display = toolName === 'spotlight' ? 'flex' : 'none';
      if (stampGroup) stampGroup.style.display = toolName === 'stamp' ? 'flex' : 'none';
      if (stepGroup) stepGroup.style.display = toolName === 'step' ? 'flex' : 'none';

      if (this.colorPicker && !isDrawingTool) {
        this.colorPicker.close();
      }

      if (this.zoomPan) {
        this.zoomPan.setPanMode(toolName === 'pan');
      }
    }

    updateColorSwatches(hex) {
      document.querySelectorAll('.swatch[data-color]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.color.toLowerCase() === hex.toLowerCase());
      });
      const customIndicator = document.getElementById('customColorIndicator');
      if (customIndicator) customIndicator.style.backgroundColor = hex;
    }

    initTopBarActions() {
      // Zoom Controls
      const zoomInBtn = document.getElementById('zoomInBtn');
      const zoomOutBtn = document.getElementById('zoomOutBtn');
      const fitScreenBtn = document.getElementById('fitScreenBtn');
      const actualSizeBtn = document.getElementById('actualSizeBtn');

      if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomPan?.zoomIn());
      if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomPan?.zoomOut());
      if (fitScreenBtn) fitScreenBtn.addEventListener('click', () => this.zoomPan?.fitToScreen(this.renderer?.width, this.renderer?.height));
      if (actualSizeBtn) actualSizeBtn.addEventListener('click', () => this.zoomPan?.resetZoom());

      // History Controls
      const undoBtn = document.getElementById('undoBtn');
      const redoBtn = document.getElementById('redoBtn');
      const clearBtn = document.getElementById('clearBtn');

      if (undoBtn) {
        undoBtn.addEventListener('click', () => {
          this.history.undo();
          this.renderer.render(this.history.getStack(), this.history.getIndex(), this.state.get('baseImage'));
          this.updateHistoryButtons();
        });
      }

      if (redoBtn) {
        redoBtn.addEventListener('click', () => {
          this.history.redo();
          this.renderer.render(this.history.getStack(), this.history.getIndex(), this.state.get('baseImage'));
          this.updateHistoryButtons();
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.history.clear();
          this.renderer.render(this.history.getStack(), this.history.getIndex(), this.state.get('baseImage'));
          this.updateHistoryButtons();
          if (this.modals) this.modals.showToast('Tuval Temizlendi ✨');
        });
      }

      // Copy Action
      const copyBtn = document.getElementById('copyBtn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => this.handleCopyImage());
      }

      // Export Dropdown
      this.initExportDropdown();
    }

    initExportDropdown() {
      const toggleBtn = document.getElementById('downloadToggleBtn');
      const menu = document.getElementById('downloadMenu');
      if (!toggleBtn || !menu) return;

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== toggleBtn) {
          menu.classList.add('hidden');
        }
      });

      // Export Handlers
      const handleExport = (format) => {
        menu.classList.add('hidden');
        if (!window.FullShotExporter || !this.renderer) return;

        const mergedCanvas = this.renderer.getMergedCanvas(
          this.history.getStack(),
          this.history.getIndex(),
          this.state.get('baseImage')
        );

        const filename = `FullShot-${Date.now()}`;

        if (format === 'png') {
          window.FullShotExporter.downloadImage(mergedCanvas, `${filename}.png`, 'image/png');
        } else if (format === 'jpg') {
          window.FullShotExporter.downloadImage(mergedCanvas, `${filename}.jpg`, 'image/jpeg', 0.92);
        } else if (format === 'webp') {
          window.FullShotExporter.downloadImage(mergedCanvas, `${filename}.webp`, 'image/webp', 0.90);
        } else if (format === 'pdf' || format === 'pdf-multi') {
          if (window.FullShotPDF) {
            window.FullShotPDF.generateFromCanvas(mergedCanvas, {
              filename: `${filename}.pdf`,
              multiPage: format === 'pdf-multi'
            });
          }
        }
      };

      const pngBtn = document.getElementById('downloadPngBtn');
      const jpgBtn = document.getElementById('downloadJpgBtn');
      const webpBtn = document.getElementById('downloadWebpBtn');
      const pdfBtn = document.getElementById('downloadPdfBtn');
      const multiPdfBtn = document.getElementById('downloadMultiPdfBtn');

      if (pngBtn) pngBtn.addEventListener('click', () => handleExport('png'));
      if (jpgBtn) jpgBtn.addEventListener('click', () => handleExport('jpg'));
      if (webpBtn) webpBtn.addEventListener('click', () => handleExport('webp'));
      if (pdfBtn) pdfBtn.addEventListener('click', () => handleExport('pdf'));
      if (multiPdfBtn) multiPdfBtn.addEventListener('click', () => handleExport('pdf-multi'));
    }

    async handleCopyImage() {
      if (!this.renderer) return;
      const mergedCanvas = this.renderer.getMergedCanvas(
        this.history.getStack(),
        this.history.getIndex(),
        this.state.get('baseImage')
      );

      mergedCanvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            if (this.modals) this.modals.showToast('Panoya Kopyalandı! 📋', 'Görsel anında yapıştırılmaya hazır.');
          } catch (err) {
            console.error('Clipboard copy failed:', err);
          }
        }
      }, 'image/png');
    }

    initAutoCensor() {
      const autoCensorBtn = document.getElementById('autoCensorBtn');
      if (!autoCensorBtn || !window.FullShotAutoCensor) return;

      autoCensorBtn.addEventListener('click', () => {
        const detectedRegions = window.FullShotAutoCensor.detectSensitiveRegions(
          this.renderer?.canvas,
          this.state.get('baseImage')
        );

        if (detectedRegions && detectedRegions.length > 0) {
          detectedRegions.forEach((reg) => {
            this.history.push({
              type: 'blur',
              x: reg.x,
              y: reg.y,
              width: reg.width,
              height: reg.height,
              blurType: 'pixelate',
              intensity: 'high'
            });
          });
          this.renderer.render(this.history.getStack(), this.history.getIndex(), this.state.get('baseImage'));
          this.updateHistoryButtons();
          if (this.modals) {
            this.modals.showToast('Akıllı Sansür Uygulandı 🛡️', `${detectedRegions.length} hassas alan sansürlendi.`);
          }
        } else {
          if (this.modals) {
            this.modals.showToast('Hassas Veri Bulunamadı', 'Sayfada tespit edilen kart veya kimlik yok.');
          }
        }
      });
    }

    initKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.history.undo();
            this.renderer?.render(this.history.getStack(), this.history.getIndex(), this.state.get('baseImage'));
            this.updateHistoryButtons();
          } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
            e.preventDefault();
            this.history.redo();
            this.renderer?.render(this.history.getStack(), this.history.getIndex(), this.state.get('baseImage'));
            this.updateHistoryButtons();
          } else if (e.key === 'c') {
            e.preventDefault();
            this.handleCopyImage();
          }
          return;
        }

        const key = e.key.toLowerCase();
        const toolMap = {
          v: 'select',
          p: 'pen',
          h: 'highlighter',
          l: 'line',
          a: 'arrow',
          r: 'rect',
          c: 'circle',
          b: 'blur',
          t: 'text',
          q: 'callout',
          s: 'step',
          e: 'eraser',
          f: 'spotlight',
          z: 'magnifier',
          k: 'stamp'
        };

        if (toolMap[key]) {
          this.setActiveTool(toolMap[key]);
        }
      });
    }

    updateHistoryButtons() {
      const undoBtn = document.getElementById('undoBtn');
      const redoBtn = document.getElementById('redoBtn');
      if (undoBtn) undoBtn.disabled = !this.history.canUndo();
      if (redoBtn) redoBtn.disabled = !this.history.canRedo();
    }

    updateDimensionsInfo(width, height) {
      const dimEl = document.getElementById('dimensionsInfo');
      if (dimEl) dimEl.textContent = `${width} × ${height} px`;
    }
  }

  // Initialize and expose global namespace API
  window.FullShotCanvas.coordinator = new ImageStudioCoordinator();
})();
