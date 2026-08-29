/**
 * FullShot Pro - Spotlight & Focus Annotation Tool
 * High-impact visual spotlight using evenodd path winding inverse masking,
 * customizable canvas dimming overlay, and neon glow focus borders.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Render spotlight inverse-dimmed focus region on canvas.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x1 Start X
   * @param {number} y1 Start Y
   * @param {number} x2 End X
   * @param {number} y2 End Y
   * @param {'rect'|'rounded-rect'|'ellipse'} [shape='rounded-rect'] 
   * @param {string} [color='#00d2ff'] Neon border color
   * @param {number} [strokeWidth=3] Border stroke width
   * @param {number} [darkness=0.65] Overlay opacity (0.0 - 0.95)
   * @param {number} [canvasWidth] Bounding width
   * @param {number} [canvasHeight] Bounding height
   */
  function drawSpotlight(
    ctx,
    x1,
    y1,
    x2,
    y2,
    shape = 'rounded-rect',
    color = '#00d2ff',
    strokeWidth = 3,
    darkness = 0.65,
    canvasWidth = 0,
    canvasHeight = 0
  ) {
    if (!ctx) return;

    const maxW = canvasWidth || ctx.canvas?.width || 4096;
    const maxH = canvasHeight || ctx.canvas?.height || 4096;

    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.max(8, Math.abs(x2 - x1));
    const rh = Math.max(8, Math.abs(y2 - y1));
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    const radiusX = rw / 2;
    const radiusY = rh / 2;

    ctx.save();

    // 1. Inverse Mask Fill using 'evenodd' rule
    ctx.beginPath();
    // Outer canvas bounding box (Clockwise)
    ctx.rect(0, 0, maxW, maxH);

    // Inner cutout shape
    if (shape === 'ellipse') {
      ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
    } else if (shape === 'rect') {
      ctx.rect(rx, ry, rw, rh);
    } else {
      // Rounded rect default
      const cornerRadius = Math.min(16, rw / 4, rh / 4);
      if (ctx.roundRect) {
        ctx.roundRect(rx, ry, rw, rh, cornerRadius);
      } else {
        const r = cornerRadius;
        ctx.moveTo(rx + r, ry);
        ctx.lineTo(rx + rw - r, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
        ctx.lineTo(rx + rw, ry + rh - r);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
        ctx.lineTo(rx + r, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
        ctx.lineTo(rx, ry + r);
        ctx.quadraticCurveTo(rx, ry, rx + r, ry);
        ctx.closePath();
      }
    }

    const alpha = Math.max(0.1, Math.min(0.95, darkness));
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fill('evenodd');

    // 2. Neon Glow Focus Border around highlighted cutout
    if (strokeWidth > 0 && color) {
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.max(6, strokeWidth * 2.5);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      if (shape === 'ellipse') {
        ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
      } else if (shape === 'rect') {
        ctx.strokeRect(rx, ry, rw, rh);
      } else {
        const cornerRadius = Math.min(16, rw / 4, rh / 4);
        if (ctx.roundRect) {
          ctx.roundRect(rx, ry, rw, rh, cornerRadius);
        } else {
          const r = cornerRadius;
          ctx.moveTo(rx + r, ry);
          ctx.lineTo(rx + rw - r, ry);
          ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
          ctx.lineTo(rx + rw, ry + rh - r);
          ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
          ctx.lineTo(rx + r, ry + rh);
          ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
          ctx.lineTo(rx, ry + r);
          ctx.quadraticCurveTo(rx, ry, rx + r, ry);
          ctx.closePath();
        }
      }
      if (shape !== 'rect') {
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * Draw interactive real-time preview of spotlight during mouse drag.
   */
  function drawSpotlightPreview(
    ctx,
    x1,
    y1,
    x2,
    y2,
    shape = 'rounded-rect',
    color = '#00d2ff',
    strokeWidth = 3,
    darkness = 0.65
  ) {
    if (!ctx) return;
    const canvasW = ctx.canvas?.width || 4096;
    const canvasH = ctx.canvas?.height || 4096;

    drawSpotlight(ctx, x1, y1, x2, y2, shape, color, strokeWidth, darkness, canvasW, canvasH);

    // Subtle helper corner handles in preview mode
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    if (rw > 20 && rh > 20) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      const handleSize = 6;
      const corners = [
        [rx, ry],
        [rx + rw, ry],
        [rx + rw, ry + rh],
        [rx, ry + rh]
      ];
      corners.forEach(([hx, hy]) => {
        ctx.beginPath();
        ctx.rect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }
  }

  window.FullShotCanvas.Spotlight = {
    drawSpotlight,
    drawSpotlightPreview
  };
})();
