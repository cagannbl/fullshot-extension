/**
 * FullShot Pro - Studio Canvas Events & Interactions Dispatcher
 * Manages canvas pointer events, live previews, and text input editing.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  class StudioEvents {
    constructor(options = {}) {
      this.renderer = options.renderer;
      this.history = options.history;
      this.state = options.state;
      this.zoomPan = options.zoomPan;
      this.onActionCommitted = options.onActionCommitted || (() => {});

      this.isDrawing = false;
      this.startX = 0;
      this.startY = 0;
      this.currentAction = null;
      this.activeTextAction = null;

      this.initCanvasEvents();
      this.initTextInputContainer();
    }

    initCanvasEvents() {
      const overlayCanvas = this.renderer?.overlayCanvas;
      if (!overlayCanvas) return;

      overlayCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
      window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
      overlayCanvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
    }

    getCanvasCoordinates(e) {
      return this.renderer ? this.renderer.windowToCanvas(e.clientX, e.clientY) : { x: 0, y: 0 };
    }

    handleMouseDown(e) {
      if (e.button !== 0) return;
      const tool = this.state.get('activeTool');
      if (tool === 'pan' || tool === 'select') return;

      const coords = this.getCanvasCoordinates(e);
      this.isDrawing = true;
      this.startX = coords.x;
      this.startY = coords.y;

      if (tool === 'text' || tool === 'callout') {
        this.openTextInput(coords.x, coords.y, tool);
        this.isDrawing = false;
        return;
      }

      if (tool === 'step') {
        const currentStep = this.state.get('stepCounter') || 1;
        const action = {
          type: 'badge',
          x: coords.x,
          y: coords.y,
          number: currentStep,
          color: this.state.get('activeColor') || '#6D8196',
          size: (this.state.get('activeStrokeWidth') || 4) * 5
        };
        this.history.push(action);
        this.state.set('stepCounter', currentStep + 1);
        this.renderer.render(this.history.getStack(), this.history.getIndex(), this.state.get('baseImage'));
        this.isDrawing = false;
        this.onActionCommitted();
        return;
      }

      if (tool === 'stamp') {
        const action = {
          type: 'stamp',
          x: coords.x,
          y: coords.y,
          stampId: this.state.get('activeStampId') || 'approved',
          scale: this.state.get('activeStampScale') || 1.0
        };
        this.history.push(action);
        this.renderer.render(this.history.getStack(), this.history.getIndex(), this.state.get('baseImage'));
        this.isDrawing = false;
        this.onActionCommitted();
        return;
      }

      if (tool === 'eraser') {
        this.handleEraserClick(coords.x, coords.y);
        return;
      }

      const color = this.state.get('activeColor');
      const strokeWidth = this.state.get('activeStrokeWidth');

      switch (tool) {
        case 'pen':
          this.currentAction = {
            type: 'pen',
            points: [{ x: coords.x, y: coords.y }],
            color,
            strokeWidth,
            penType: this.state.get('activePenType')
          };
          break;
        case 'highlighter':
          this.currentAction = {
            type: 'highlighter',
            points: [{ x: coords.x, y: coords.y }],
            color,
            strokeWidth: strokeWidth * 4
          };
          break;
        case 'arrow':
          this.currentAction = {
            type: 'arrow',
            startX: coords.x,
            startY: coords.y,
            endX: coords.x,
            endY: coords.y,
            color,
            strokeWidth,
            double: this.state.get('activeArrowMode') === 'double',
            curved: this.state.get('activeArrowCurved')
          };
          break;
        case 'line':
          this.currentAction = {
            type: 'line',
            startX: coords.x,
            startY: coords.y,
            endX: coords.x,
            endY: coords.y,
            color,
            strokeWidth,
            dashed: this.state.get('activeLineDashed')
          };
          break;
        case 'rect':
          this.currentAction = {
            type: 'rect',
            x: coords.x,
            y: coords.y,
            width: 0,
            height: 0,
            color,
            strokeWidth,
            dashed: this.state.get('activeLineDashed')
          };
          break;
        case 'circle':
          this.currentAction = {
            type: 'circle',
            x: coords.x,
            y: coords.y,
            radiusX: 0,
            radiusY: 0,
            color,
            strokeWidth,
            dashed: this.state.get('activeLineDashed')
          };
          break;
        case 'blur':
          this.currentAction = {
            type: 'blur',
            x: coords.x,
            y: coords.y,
            width: 0,
            height: 0,
            blurType: this.state.get('activeBlurType') || 'pixelate',
            intensity: this.state.get('activeBlurIntensity') || 'medium'
          };
          break;
        case 'spotlight':
          this.currentAction = {
            type: 'spotlight',
            x: coords.x,
            y: coords.y,
            width: 0,
            height: 0,
            shape: this.state.get('activeSpotlightShape') || 'rect',
            darkness: this.state.get('activeSpotlightDarkness') || 0.65
          };
          break;
        case 'magnifier':
          this.currentAction = {
            type: 'magnifier',
            x: coords.x,
            y: coords.y,
            radius: 40,
            zoom: this.state.get('activeMagnifierZoom') || 2.0
          };
          break;
      }
    }

    handleMouseMove(e) {
      const tool = this.state.get('activeTool');
      const coords = this.getCanvasCoordinates(e);

      if (!this.isDrawing) {
        this.renderHoverCursor(coords.x, coords.y, tool);
        return;
      }

      if (!this.currentAction) return;

      switch (tool) {
        case 'pen':
        case 'highlighter':
          this.currentAction.points.push({ x: coords.x, y: coords.y });
          break;
        case 'arrow':
        case 'line':
          this.currentAction.endX = coords.x;
          this.currentAction.endY = coords.y;
          break;
        case 'rect':
        case 'blur':
        case 'spotlight':
          this.currentAction.x = Math.min(this.startX, coords.x);
          this.currentAction.y = Math.min(this.startY, coords.y);
          this.currentAction.width = Math.abs(coords.x - this.startX);
          this.currentAction.height = Math.abs(coords.y - this.startY);
          break;
        case 'circle':
          this.currentAction.x = (this.startX + coords.x) / 2;
          this.currentAction.y = (this.startY + coords.y) / 2;
          this.currentAction.radiusX = Math.abs(coords.x - this.startX) / 2;
          this.currentAction.radiusY = Math.abs(coords.y - this.startY) / 2;
          break;
        case 'magnifier':
          this.currentAction.radius = Math.max(20, Math.hypot(coords.x - this.startX, coords.y - this.startY));
          break;
        case 'eraser':
          this.handleEraserClick(coords.x, coords.y);
          break;
      }

      this.renderer.renderPreview(this.currentAction, this.state.get('baseImage'));
    }

    handleMouseUp(e) {
      if (!this.isDrawing) return;
      this.isDrawing = false;

      if (this.currentAction) {
        this.history.push(this.currentAction);
        this.currentAction = null;
        this.renderer.render(this.history.getStack(), this.history.getIndex(), this.state.get('baseImage'));
        this.onActionCommitted();
      }
    }

    handleMouseLeave(e) {
      if (this.renderer?.overlayCtx) {
        this.renderer.clearOverlay();
      }
    }

    renderHoverCursor(x, y, tool) {
      const ctx = this.renderer?.overlayCtx;
      if (!ctx) return;
      ctx.clearRect(0, 0, this.renderer.width, this.renderer.height);

      if (tool === 'step') {
        const num = this.state.get('stepCounter') || 1;
        const color = this.state.get('activeColor') || '#6D8196';
        if (window.FullShotCanvas.Badge) {
          window.FullShotCanvas.Badge.draw(ctx, { x, y, number: num, color, size: 24 });
        }
      } else if (tool === 'stamp') {
        const stampId = this.state.get('activeStampId') || 'approved';
        const scale = this.state.get('activeStampScale') || 1.0;
        if (window.FullShotCanvas.Stamp) {
          window.FullShotCanvas.Stamp.draw(ctx, { x, y, stampId, scale });
        }
      } else if (tool === 'eraser') {
        ctx.save();
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    handleEraserClick(x, y) {
      if (!window.FullShotCanvas.Eraser || !this.history) return;
      const stack = this.history.getStack();
      const newStack = window.FullShotCanvas.Eraser.eraseAtPoint(stack, x, y, 16);
      if (newStack.length !== stack.length) {
        this.history.replaceStack(newStack);
        this.renderer.render(this.history.getStack(), this.history.getIndex(), this.state.get('baseImage'));
        this.onActionCommitted();
      }
    }

    initTextInputContainer() {
      const container = document.getElementById('textInputContainer');
      const textarea = document.getElementById('liveTextInput');
      const applyBtn = document.getElementById('textApplyBtn');
      const cancelBtn = document.getElementById('textCancelBtn');
      if (!container || !textarea) return;

      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(180, textarea.scrollHeight) + 'px';
        this.renderLiveTextPreview();
      });

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.applyText();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.closeTextInput(false);
        }
      });

      if (applyBtn) applyBtn.addEventListener('click', () => this.applyText());
      if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeTextInput(false));
    }

    openTextInput(canvasX, canvasY, toolType = 'text') {
      const container = document.getElementById('textInputContainer');
      const textarea = document.getElementById('liveTextInput');
      if (!container || !textarea) return;

      this.activeTextAction = {
        type: toolType,
        x: canvasX,
        y: canvasY,
        color: this.state.get('activeColor') || '#FFFFE3',
        fontSize: this.state.get('activeFontSize') || 24,
        style: this.state.get('activeCalloutStyle') || 'bubble',
        hasBg: this.state.get('activeTextBg') !== false
      };

      const winCoords = this.renderer.canvasToWindow(canvasX, canvasY);
      container.style.left = Math.max(16, Math.min(winCoords.x, window.innerWidth - 320)) + 'px';
      container.style.top = Math.max(70, Math.min(winCoords.y - 60, window.innerHeight - 150)) + 'px';
      container.classList.remove('hidden');
      textarea.value = '';
      textarea.style.height = 'auto';
      textarea.focus();
    }

    renderLiveTextPreview() {
      const textarea = document.getElementById('liveTextInput');
      if (!this.activeTextAction || !textarea || !this.renderer) return;
      const text = textarea.value;
      const previewAction = {
        ...this.activeTextAction,
        text: text || 'Metin yazın...',
        color: this.state.get('activeColor') || '#FFFFE3',
        fontSize: this.state.get('activeFontSize') || 24,
        style: this.state.get('activeCalloutStyle') || 'bubble',
        hasBg: this.state.get('activeTextBg') !== false
      };
      this.renderer.renderPreview(previewAction, this.state.get('baseImage'));
    }

    applyText() {
      const textarea = document.getElementById('liveTextInput');
      if (!this.activeTextAction || !textarea) return;
      const text = textarea.value.trim();
      if (text) {
        const action = {
          ...this.activeTextAction,
          text,
          color: this.state.get('activeColor') || '#FFFFE3',
          fontSize: this.state.get('activeFontSize') || 24,
          style: this.state.get('activeCalloutStyle') || 'bubble',
          hasBg: this.state.get('activeTextBg') !== false
        };
        this.history.push(action);
        this.renderer.render(this.history.getStack(), this.history.getIndex(), this.state.get('baseImage'));
        this.onActionCommitted();
      }
      this.closeTextInput(true);
    }

    closeTextInput(save = false) {
      const container = document.getElementById('textInputContainer');
      const textarea = document.getElementById('liveTextInput');
      if (container) container.classList.add('hidden');
      if (textarea) textarea.value = '';
      this.activeTextAction = null;
      if (this.renderer?.overlayCtx) this.renderer.clearOverlay();
    }
  }

  window.FullShotCanvas.StudioEvents = StudioEvents;
})();
