/**
 * FullShot Pro - Shapes Tool (Rectangles, Circles, Rounded Borders)
 * Geometric shape rendering engine with dashed border and high-DPI radius smoothing.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Safe rounded rectangle path builder with standard quadratic curve fallback.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x 
   * @param {number} y 
   * @param {number} width 
   * @param {number} height 
   * @param {number} radius 
   */
  function drawRoundedRectPath(ctx, x, y, width, height, radius) {
    if (!ctx) return;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }

  /**
   * Draw a rectangle.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x1 
   * @param {number} y1 
   * @param {number} x2 
   * @param {number} y2 
   * @param {string} color 
   * @param {number} width 
   * @param {boolean} dashed 
   */
  function drawRect(ctx, x1, y1, x2, y2, color, width, dashed = false) {
    if (!ctx) return;
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dashed) {
      ctx.setLineDash([Math.max(6, width * 2), Math.max(4, width * 1.5)]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }

  /**
   * Draw an ellipse / circle.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x1 
   * @param {number} y1 
   * @param {number} x2 
   * @param {number} y2 
   * @param {string} color 
   * @param {number} width 
   * @param {boolean} dashed 
   */
  function drawCircle(ctx, x1, y1, x2, y2, color, width, dashed = false) {
    if (!ctx) return;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dashed) {
      ctx.setLineDash([Math.max(6, width * 2), Math.max(4, width * 1.5)]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  window.FullShotCanvas.Shapes = {
    drawRoundedRectPath,
    drawRect,
    drawCircle
  };
})();
