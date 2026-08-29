/**
 * FullShot Pro - Zoom & Pan Engine
 * Handles cursor-centered 10%-500% smooth scaling, spacebar dragging, and viewport panning.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  class ZoomPanController {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.viewport Viewport scroll container
     * @param {HTMLElement} options.canvasStage Stage container element
     * @param {HTMLElement} [options.zoomLevelEl] Zoom % text display element
     * @param {Function} [options.onScaleChange] Callback on scale update
     * @param {Function} [options.onCursorChange] Callback when panning state changes
     */
    constructor(options) {
      this.viewport = options.viewport;
      this.canvasStage = options.canvasStage;
      this.zoomLevelEl = options.zoomLevelEl;
      this.onScaleChange = options.onScaleChange || null;
      this.onCursorChange = options.onCursorChange || null;

      this.currentScale = 1.0;
      this.minScale = 0.10;
      this.maxScale = 5.00;

      this.isPanning = false;
      this.isSpacePressed = false;
      this.panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };

      this._initListeners();
    }

    _initListeners() {
      // Spacebar detection for hand tool toggle
      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if (e.code === 'Space' && !e.repeat && !this.isSpacePressed) {
          this.isSpacePressed = true;
          if (this.onCursorChange) this.onCursorChange();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
          this.isSpacePressed = false;
          this.isPanning = false;
          if (this.onCursorChange) this.onCursorChange();
        }
      });

      // Ctrl / Meta + Wheel cursor-centered zoom
      if (this.viewport) {
        this.viewport.addEventListener('wheel', (e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (!this.canvasStage) return;

            const stageRect = this.canvasStage.getBoundingClientRect();
            const canvasX = (e.clientX - stageRect.left) / this.currentScale;
            const canvasY = (e.clientY - stageRect.top) / this.currentScale;
            const zoomFactor = Math.exp(-e.deltaY * 0.0035);
            this.zoomTo(this.currentScale * zoomFactor, canvasX, canvasY);
          }
        }, { passive: false });
      }

      // Mouse drag panning tracking
      window.addEventListener('mousemove', (e) => {
        if (!this.isPanning || !this.viewport) return;
        const dx = e.clientX - this.panStart.x;
        const dy = e.clientY - this.panStart.y;
        this.viewport.scrollLeft = this.panStart.scrollLeft - dx;
        this.viewport.scrollTop = this.panStart.scrollTop - dy;
      });

      window.addEventListener('mouseup', () => {
        if (this.isPanning) {
          this.isPanning = false;
          if (this.onCursorChange) this.onCursorChange();
        }
      });
    }

    /**
     * Start a panning drag gesture.
     * @param {number} clientX 
     * @param {number} clientY 
     */
    startPan(clientX, clientY) {
      this.isPanning = true;
      this.panStart = {
        x: clientX,
        y: clientY,
        scrollLeft: this.viewport ? this.viewport.scrollLeft : 0,
        scrollTop: this.viewport ? this.viewport.scrollTop : 0
      };
      if (this.onCursorChange) this.onCursorChange();
    }

    /**
     * Set zoom scale with optional focal point in canvas coordinates.
     * @param {number} targetScale 
     * @param {number|null} anchorCanvasX 
     * @param {number|null} anchorCanvasY 
     */
    zoomTo(targetScale, anchorCanvasX = null, anchorCanvasY = null) {
      const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, targetScale));
      if (Math.abs(clampedScale - this.currentScale) < 0.001) return;

      const oldScale = this.currentScale;
      const scaleDelta = clampedScale - oldScale;

      if (anchorCanvasX === null || anchorCanvasY === null) {
        if (this.canvasStage && this.viewport) {
          const stageRect = this.canvasStage.getBoundingClientRect();
          const viewRect = this.viewport.getBoundingClientRect();
          const viewCenterX = (viewRect.left + viewRect.width / 2) - stageRect.left;
          const viewCenterY = (viewRect.top + viewRect.height / 2) - stageRect.top;
          anchorCanvasX = viewCenterX / oldScale;
          anchorCanvasY = viewCenterY / oldScale;
        } else {
          anchorCanvasX = 0;
          anchorCanvasY = 0;
        }
      }

      this.currentScale = clampedScale;

      if (this.canvasStage) {
        this.canvasStage.style.transform = `scale(${this.currentScale})`;
      }

      if (this.zoomLevelEl) {
        this.zoomLevelEl.textContent = `${Math.round(this.currentScale * 100)}%`;
      }

      if (this.viewport) {
        this.viewport.scrollLeft += anchorCanvasX * scaleDelta;
        this.viewport.scrollTop += anchorCanvasY * scaleDelta;
      }

      if (this.onScaleChange) {
        this.onScaleChange(this.currentScale);
      }
    }

    /**
     * Fit full screenshot to current viewport dimensions.
     * @param {number} canvasWidth 
     */
    fitToScreen(canvasWidth) {
      if (!canvasWidth || !this.viewport) return;
      const availableWidth = this.viewport.clientWidth - 80;
      const fitScale = Math.min(1.0, Math.max(this.minScale, availableWidth / canvasWidth));
      this.zoomTo(fitScale);
    }

    getScale() {
      return this.currentScale;
    }

    isSpaceActive() {
      return this.isSpacePressed;
    }

    isPanningActive() {
      return this.isPanning;
    }
  }

  window.FullShotCanvas.ZoomPanController = ZoomPanController;
})();
