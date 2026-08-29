/**
 * FullShot Pro - Highlighter Tool
 * Translucent, blending highlighter with multiply composite operation and spline smoothing.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Draw a smoothed highlighter stroke.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Array<{x: number, y: number}>} points 
   * @param {string} color 
   * @param {number} width 
   * @param {number} alpha 
   */
  function drawHighlighter(ctx, points, color, width, alpha = 0.45) {
    if (!ctx || !points || points.length < 2) return;

    if (window.FullShotCanvas.Pen && window.FullShotCanvas.Pen.drawSmoothedPath) {
      window.FullShotCanvas.Pen.drawSmoothedPath(ctx, points, color, width, alpha, true);
    } else {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
      ctx.restore();
    }
  }

  window.FullShotCanvas.Highlighter = {
    drawHighlighter
  };
})();
