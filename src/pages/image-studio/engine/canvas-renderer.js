/**
 * FullShot Pro - Canvas Renderer Engine
 * Manages dual-layer 2D canvas drawing, Retina / High-DPI scaling, layer clears,
 * action execution dispatch, watermark stamp rendering, and macOS mockup frame generation.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  class CanvasRenderer {
    /**
     * @param {HTMLCanvasElement} mainCanvas Primary persistent canvas
     * @param {HTMLCanvasElement} overlayCanvas Interactive drawing layer canvas
     */
    constructor(mainCanvas, overlayCanvas) {
      this.mainCanvas = mainCanvas;
      this.overlayCanvas = overlayCanvas;
      this.mainCtx = mainCanvas ? mainCanvas.getContext('2d', { willReadFrequently: true }) : null;
      this.overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;
      this.dpr = typeof window !== 'undefined' && window.devicePixelRatio ? Math.max(1, window.devicePixelRatio) : 1;
      this.displayWidth = 0;
      this.displayHeight = 0;
    }

    /**
     * Set pixel buffer and display dimensions for both canvas layers with Retina / High-DPI precision.
     * @param {number} width Native image width
     * @param {number} height Native image height
     * @param {number} [customDpr] Optional DPR override (defaults to window.devicePixelRatio)
     */
    setSize(width, height, customDpr = null) {
      if (customDpr) {
        this.dpr = Math.max(1, customDpr);
      } else if (typeof window !== 'undefined' && window.devicePixelRatio) {
        this.dpr = Math.max(1, window.devicePixelRatio);
      }

      this.displayWidth = width;
      this.displayHeight = height;

      if (this.mainCanvas) {
        this.mainCanvas.width = width;
        this.mainCanvas.height = height;
        this.mainCanvas.style.width = `${width}px`;
        this.mainCanvas.style.height = `${height}px`;

        if (this.mainCtx) {
          this.mainCtx.imageSmoothingEnabled = true;
          this.mainCtx.imageSmoothingQuality = 'high';
        }
      }

      if (this.overlayCanvas) {
        this.overlayCanvas.width = width;
        this.overlayCanvas.height = height;
        this.overlayCanvas.style.width = `${width}px`;
        this.overlayCanvas.style.height = `${height}px`;

        if (this.overlayCtx) {
          this.overlayCtx.imageSmoothingEnabled = true;
          this.overlayCtx.imageSmoothingQuality = 'high';
        }
      }
    }

    /**
     * Clear interactive overlay layer.
     */
    clearOverlay() {
      if (this.overlayCtx && this.overlayCanvas) {
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      }
    }

    /**
     * Draw the initial base capture image onto main canvas with maximum quality.
     * @param {HTMLImageElement} baseImage 
     */
    drawBaseImage(baseImage) {
      if (!this.mainCtx || !this.mainCanvas || !baseImage) return;
      this.mainCtx.save();
      this.mainCtx.imageSmoothingEnabled = true;
      this.mainCtx.imageSmoothingQuality = 'high';
      this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
      this.mainCtx.drawImage(baseImage, 0, 0, this.mainCanvas.width, this.mainCanvas.height);
      this.mainCtx.restore();
    }

    /**
     * Transform screen mouse event coordinates to exact canvas pixel coordinates with sub-pixel precision.
     * @param {MouseEvent} e 
     * @returns {{x: number, y: number}}
     */
    getCanvasCoordinates(e) {
      if (!this.overlayCanvas) return { x: 0, y: 0 };
      const rect = this.overlayCanvas.getBoundingClientRect();
      const scaleX = this.overlayCanvas.width / (rect.width || 1);
      const scaleY = this.overlayCanvas.height / (rect.height || 1);
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }

    /**
     * Execute a single parametric vector action onto given context.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} action 
     * @param {HTMLImageElement} [baseImage] 
     */
    executeAction(ctx, action, baseImage = null) {
      if (!ctx || !action) return;

      const tools = window.FullShotCanvas;
      const canvasW = this.mainCanvas?.width || ctx.canvas?.width || 4096;
      const canvasH = this.mainCanvas?.height || ctx.canvas?.height || 4096;

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      switch (action.type) {
        case 'pen':
          if (tools.Pen) {
            tools.Pen.drawSmoothedPath(ctx, action.points, action.color, action.width, 1.0, false, action.penType || 'ballpoint');
          }
          break;

        case 'highlighter':
          if (tools.Highlighter) {
            tools.Highlighter.drawHighlighter(ctx, action.points, action.color, action.width, 0.45);
          } else if (tools.Pen) {
            tools.Pen.drawSmoothedPath(ctx, action.points, action.color, action.width, 0.45, true);
          }
          break;

        case 'line':
          if (tools.Arrow) {
            tools.Arrow.drawLine(ctx, action.x1, action.y1, action.x2, action.y2, action.color, action.width, action.dashed);
          }
          break;

        case 'arrow':
          if (tools.Arrow) {
            tools.Arrow.drawArrow(ctx, action.x1, action.y1, action.x2, action.y2, action.color, action.width, action.dashed, action.isDouble, action.isCurved, action.curveOffset);
          }
          break;

        case 'spotlight':
          if (tools.Spotlight) {
            tools.Spotlight.drawSpotlight(ctx, action.x1, action.y1, action.x2, action.y2, action.shape, action.color, action.width, action.darkness, canvasW, canvasH);
          }
          break;

        case 'magnifier':
          if (tools.Magnifier) {
            tools.Magnifier.drawMagnifier(ctx, action.x, action.y, action.radius, action.zoomFactor, baseImage || this.mainCanvas, action.color, action.width, canvasW, canvasH);
          }
          break;

        case 'stamp':
          if (tools.Stamp) {
            tools.Stamp.drawStamp(ctx, action.x, action.y, action.stampId, action.scale);
          }
          break;

        case 'rect':
          if (tools.Shapes) {
            tools.Shapes.drawRect(ctx, action.x1, action.y1, action.x2, action.y2, action.color, action.width, action.dashed);
          }
          break;

        case 'circle':
          if (tools.Shapes) {
            tools.Shapes.drawCircle(ctx, action.x1, action.y1, action.x2, action.y2, action.color, action.width, action.dashed);
          }
          break;

        case 'step':
          if (tools.Badge) {
            tools.Badge.drawStepBadge(ctx, action.x, action.y, action.number, action.color, action.radius, canvasW, canvasH);
          }
          break;

        case 'callout':
          if (tools.Text) {
            tools.Text.drawCallout(ctx, action.tailX, action.tailY, action.bubbleX, action.bubbleY, action.text, action.color, action.width, action.fontSize, action.style || (action.hasBg ? 'bubble' : 'plain'));
          }
          break;

        case 'blur':
          if (tools.Blur) {
            tools.Blur.applyRedaction(ctx, action.x1, action.y1, action.x2, action.y2, action.blurType || 'pixelate', canvasW, canvasH, {
              intensity: action.intensity || 'medium',
              rounded: action.rounded
            });
          }
          break;

        case 'text':
          if (tools.Text) {
            tools.Text.renderTextOnCanvas(ctx, action.text, action.x, action.y, action.fontSize, action.color, action.bgStyle || action.hasBg, canvasW, canvasH);
          }
          break;

        case 'watermark':
          if (window.FullShotWatermark) {
            window.FullShotWatermark.renderWatermark(ctx, action.text, action.position, action.style, canvasW, canvasH);
          } else {
            this.renderWatermark(ctx, action.text, action.position, action.style);
          }
          break;

        case 'clear':
          if (this.mainCanvas) {
            ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
            if (baseImage) {
              ctx.drawImage(baseImage, 0, 0, this.mainCanvas.width, this.mainCanvas.height);
            }
          }
          break;
      }

      ctx.restore();
    }

    /**
     * Redraw all history states from scratch on top of clean base capture.
     * @param {Array<Object>} historyStack 
     * @param {number} historyIndex 
     * @param {HTMLImageElement} baseImage 
     */
    redrawAll(historyStack, historyIndex, baseImage) {
      if (!this.mainCtx || !this.mainCanvas || !baseImage) return;

      this.mainCtx.save();
      this.mainCtx.imageSmoothingEnabled = true;
      this.mainCtx.imageSmoothingQuality = 'high';
      this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
      this.mainCtx.drawImage(baseImage, 0, 0, this.mainCanvas.width, this.mainCanvas.height);

      for (let i = 0; i <= historyIndex; i++) {
        if (historyStack[i]) {
          this.executeAction(this.mainCtx, historyStack[i], baseImage);
        }
      }
      this.mainCtx.restore();
    }

    /**
     * Batch-apply redactions for auto-censored regions directly or via actions.
     * @param {Array<Object>} regions 
     * @param {'pixelate'|'blackout'|'gaussian'} [blurType='pixelate']
     * @param {Function} [pushAction]
     */
    applyAutoCensorBatch(regions, blurType = 'pixelate', pushAction = null) {
      if (!regions || !Array.isArray(regions)) return;
      const canvasW = this.mainCanvas?.width || 4096;
      const canvasH = this.mainCanvas?.height || 4096;
      const blurTool = window.FullShotCanvas?.Blur;

      regions.forEach(r => {
        if (pushAction && typeof pushAction === 'function') {
          pushAction({
            type: 'blur',
            x1: r.x1,
            y1: r.y1,
            x2: r.x2,
            y2: r.y2,
            blurType,
            reason: r.reason,
            category: r.category,
            confidence: r.confidence
          });
        } else if (this.mainCtx && blurTool) {
          blurTool.applyRedaction(this.mainCtx, r.x1, r.y1, r.x2, r.y2, blurType, canvasW, canvasH);
        }
      });
    }

    /**
     * Render temporary neon highlight boxes on overlay layer for detected sensitive areas.
     * @param {Array<Object>} regions 
     */
    renderSensitiveRegionsOverlay(regions) {
      if (!this.overlayCtx || !this.overlayCanvas || !regions || !Array.isArray(regions)) return;
      this.clearOverlay();
      this.overlayCtx.save();

      regions.forEach(r => {
        const x = Math.min(r.x1, r.x2);
        const y = Math.min(r.y1, r.y2);
        const w = Math.abs(r.x2 - r.x1);
        const h = Math.abs(r.y2 - r.y1);

        this.overlayCtx.strokeStyle = '#ff3366';
        this.overlayCtx.lineWidth = 1.5;
        this.overlayCtx.setLineDash([4, 3]);
        this.overlayCtx.strokeRect(x, y, w, h);

        this.overlayCtx.fillStyle = 'rgba(255, 51, 102, 0.12)';
        this.overlayCtx.fillRect(x, y, w, h);

        if (r.reason) {
          this.overlayCtx.fillStyle = '#ff3366';
          this.overlayCtx.font = '600 10px -apple-system, BlinkMacSystemFont, sans-serif';
          this.overlayCtx.fillText(r.reason, x, Math.max(12, y - 4));
        }
      });

      this.overlayCtx.restore();
    }

    /**
     * Render crisp watermark or timestamp badge onto canvas.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text 
     * @param {string} position 
     * @param {string} style 
     */
    renderWatermark(ctx, text, position = 'bottom-right', style = 'pill') {
      if (!ctx || !text || !this.mainCanvas) return;
      ctx.save();

      const canvasW = this.mainCanvas.width;
      const canvasH = this.mainCanvas.height;
      const shapes = window.FullShotCanvas.Shapes;

      if (position === 'center' || style === 'diagonal') {
        // Large diagonal watermark across canvas
        ctx.translate(canvasW / 2, canvasH / 2);
        ctx.rotate(-Math.PI / 6); // -30 degrees
        const fontSize = Math.max(32, Math.min(110, Math.round(canvasW / 18)));
        ctx.font = `800 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (style === 'accent') {
          ctx.fillStyle = 'rgba(109, 129, 150, 0.28)';
          ctx.strokeStyle = 'rgba(109, 129, 150, 0.45)';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        }
        ctx.lineWidth = 2;
        ctx.strokeText(text, 0, 0);
        ctx.fillText(text, 0, 0);
        ctx.restore();
        return;
      }

      // Corner Watermarks
      const fontSize = Math.max(14, Math.min(28, Math.round(canvasW / 70)));
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      
      const margin = Math.round(fontSize * 1.5);
      const paddingX = Math.round(fontSize * 0.8);
      const paddingY = Math.round(fontSize * 0.45);
      const textMetrics = ctx.measureText(text);
      const boxW = textMetrics.width + paddingX * 2;
      const boxH = fontSize * 1.35 + paddingY * 2;

      let boxX = 0;
      let boxY = 0;

      if (position === 'bottom-right') {
        boxX = canvasW - boxW - margin;
        boxY = canvasH - boxH - margin;
      } else if (position === 'bottom-left') {
        boxX = margin;
        boxY = canvasH - boxH - margin;
      } else if (position === 'top-right') {
        boxX = canvasW - boxW - margin;
        boxY = margin;
      } else if (position === 'top-left') {
        boxX = margin;
        boxY = margin;
      }

      if (style === 'pill') {
        // Dark pill capsule
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = 'rgba(18, 20, 26, 0.88)';
        if (shapes && shapes.drawRoundedRectPath) {
          shapes.drawRoundedRectPath(ctx, boxX, boxY, boxW, boxH, boxH / 2);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#FFFFE3';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, boxX + paddingX, boxY + paddingY + 1);
      } else if (style === 'accent') {
        // Slate Blue badge with glow
        ctx.shadowColor = 'rgba(109, 129, 150, 0.5)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;

        ctx.fillStyle = 'rgba(30, 36, 46, 0.94)';
        if (shapes && shapes.drawRoundedRectPath) {
          shapes.drawRoundedRectPath(ctx, boxX, boxY, boxW, boxH, 8);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#6D8196';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#00d2ff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, boxX + paddingX, boxY + paddingY + 1);
      } else {
        // Subtle transparent drop shadow text
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = 'rgba(255, 255, 227, 0.85)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, boxX + paddingX, boxY + paddingY);
      }

      ctx.restore();
    }

    /**
     * Generate standalone macOS Mockup window with realistic 3D shadow and backdrop.
     * @param {HTMLCanvasElement} sourceCanvas 
     * @param {Object} config 
     * @param {Object} [captureData] 
     * @returns {HTMLCanvasElement}
     */
    generateMockupCanvas(sourceCanvas, config, captureData = null) {
      if (!sourceCanvas) return null;
      const headerHeight = config.hasHeader ? 42 : 0;
      const windowRadius = 14;
      const padding = config.padding || 44;

      const windowW = sourceCanvas.width;
      const windowH = sourceCanvas.height + headerHeight;

      const totalW = windowW + padding * 2;
      const totalH = windowH + padding * 2;

      const outCanvas = document.createElement('canvas');
      outCanvas.width = totalW;
      outCanvas.height = totalH;
      const mCtx = outCanvas.getContext('2d');
      mCtx.imageSmoothingEnabled = true;
      mCtx.imageSmoothingQuality = 'high';
      const shapes = window.FullShotCanvas.Shapes;

      // 1. Draw Backdrop Themes
      if (config.theme === 'sunset') {
        const grad = mCtx.createLinearGradient(0, 0, totalW, totalH);
        grad.addColorStop(0, '#4338ca');
        grad.addColorStop(0.5, '#a855f7');
        grad.addColorStop(1, '#f43f5e');
        mCtx.fillStyle = grad;
        mCtx.fillRect(0, 0, totalW, totalH);
      } else if (config.theme === 'cyber') {
        const grad = mCtx.createLinearGradient(0, 0, totalW, totalH);
        grad.addColorStop(0, '#090a0f');
        grad.addColorStop(0.5, '#1e1b4b');
        grad.addColorStop(1, '#059669');
        mCtx.fillStyle = grad;
        mCtx.fillRect(0, 0, totalW, totalH);
      } else if (config.theme === 'slate') {
        const grad = mCtx.createLinearGradient(0, 0, totalW, totalH);
        grad.addColorStop(0, '#2b323c');
        grad.addColorStop(0.5, '#485461');
        grad.addColorStop(1, '#28313b');
        mCtx.fillStyle = grad;
        mCtx.fillRect(0, 0, totalW, totalH);
      } else if (config.theme === 'arctic') {
        const grad = mCtx.createLinearGradient(0, 0, totalW, totalH);
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(0.5, '#e2e8f0');
        grad.addColorStop(1, '#cbd5e1');
        mCtx.fillStyle = grad;
        mCtx.fillRect(0, 0, totalW, totalH);
      } else if (config.theme === 'emerald') {
        const grad = mCtx.createLinearGradient(0, 0, totalW, totalH);
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(0.5, '#047857');
        grad.addColorStop(1, '#10b981');
        mCtx.fillStyle = grad;
        mCtx.fillRect(0, 0, totalW, totalH);
      } else {
        // Obsidian (Default)
        const grad = mCtx.createLinearGradient(0, 0, totalW, totalH);
        grad.addColorStop(0, '#111215');
        grad.addColorStop(0.5, '#1e2025');
        grad.addColorStop(1, '#0d0e11');
        mCtx.fillStyle = grad;
        mCtx.fillRect(0, 0, totalW, totalH);
      }

      const winX = padding;
      const winY = padding;

      // 2. Realistic 3D Window Drop Shadow
      if (config.shadow !== 'none') {
        mCtx.save();
        mCtx.shadowColor = config.shadow === 'deep' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.35)';
        mCtx.shadowBlur = config.shadow === 'deep' ? 60 : 25;
        mCtx.shadowOffsetX = 0;
        mCtx.shadowOffsetY = config.shadow === 'deep' ? 25 : 10;
        mCtx.fillStyle = '#1c1e22';
        if (shapes && shapes.drawRoundedRectPath) {
          shapes.drawRoundedRectPath(mCtx, winX, winY, windowW, windowH, windowRadius);
        } else {
          mCtx.rect(winX, winY, windowW, windowH);
        }
        mCtx.fill();
        mCtx.restore();
      }

      // 3. Clip and Render Window Interior
      mCtx.save();
      if (shapes && shapes.drawRoundedRectPath) {
        shapes.drawRoundedRectPath(mCtx, winX, winY, windowW, windowH, windowRadius);
      } else {
        mCtx.rect(winX, winY, windowW, windowH);
      }
      mCtx.clip();

      // Window Base Background
      mCtx.fillStyle = '#1f2125';
      mCtx.fillRect(winX, winY, windowW, windowH);

      // 4. Window Header Title Bar (macOS style)
      if (config.hasHeader) {
        mCtx.fillStyle = '#26282e';
        mCtx.fillRect(winX, winY, windowW, headerHeight);

        // Bottom border
        mCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        mCtx.lineWidth = 1;
        mCtx.beginPath();
        mCtx.moveTo(winX, winY + headerHeight);
        mCtx.lineTo(winX + windowW, winY + headerHeight);
        mCtx.stroke();

        // Traffic Lights: Red, Yellow, Green
        const dotY = winY + headerHeight / 2;
        const dotRadius = 5.5;

        // Red (Close)
        mCtx.beginPath();
        mCtx.arc(winX + 18, dotY, dotRadius, 0, Math.PI * 2);
        mCtx.fillStyle = '#ff5f56';
        mCtx.fill();
        mCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        mCtx.lineWidth = 0.8;
        mCtx.stroke();

        // Yellow (Minimize)
        mCtx.beginPath();
        mCtx.arc(winX + 36, dotY, dotRadius, 0, Math.PI * 2);
        mCtx.fillStyle = '#ffbd2e';
        mCtx.fill();
        mCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        mCtx.lineWidth = 0.8;
        mCtx.stroke();

        // Green (Maximize)
        mCtx.beginPath();
        mCtx.arc(winX + 54, dotY, dotRadius, 0, Math.PI * 2);
        mCtx.fillStyle = '#27c93f';
        mCtx.fill();
        mCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        mCtx.lineWidth = 0.8;
        mCtx.stroke();

        // Centered Address Pill
        const pillWidth = Math.min(420, Math.max(140, windowW - 170));
        const pillHeight = 24;
        const pillX = winX + (windowW - pillWidth) / 2;
        const pillY = winY + (headerHeight - pillHeight) / 2;

        mCtx.fillStyle = '#1c1d21';
        mCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        mCtx.lineWidth = 1;
        if (shapes && shapes.drawRoundedRectPath) {
          shapes.drawRoundedRectPath(mCtx, pillX, pillY, pillWidth, pillHeight, 6);
        } else {
          mCtx.rect(pillX, pillY, pillWidth, pillHeight);
        }
        mCtx.fill();
        mCtx.stroke();

        // Title/URL text in pill
        const displayTitle = captureData?.title || captureData?.url || 'Ekran Görüntüsü';
        mCtx.fillStyle = '#CBCBCB';
        mCtx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        mCtx.textAlign = 'center';
        mCtx.textBaseline = 'middle';
        mCtx.fillText(displayTitle.slice(0, 48), pillX + pillWidth / 2, pillY + pillHeight / 2);
      }

      // 5. Draw the Main Screenshot
      mCtx.drawImage(sourceCanvas, winX, winY + headerHeight, windowW, sourceCanvas.height);
      mCtx.restore();

      return outCanvas;
    }
  }

  window.FullShotCanvas.CanvasRenderer = CanvasRenderer;
})();
