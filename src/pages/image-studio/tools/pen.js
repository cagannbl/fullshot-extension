/**
 * FullShot Pro - Pen Tool (Vector Bézier Spline Smoothed Freehand)
 * Provides high-performance smoothed path rendering using quadratic Bézier curves.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Draw a smoothed stroke from an array of 2D points.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Array<{x: number, y: number}>} points 
   * @param {string} color 
   * @param {number} width 
   * @param {number} alpha 
   * @param {boolean} isHighlighter 
   */
  function drawSmoothedPath(ctx, points, color, width, alpha = 1.0, isHighlighter = false) {
    if (!ctx || !points || points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isHighlighter) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = alpha;
    } else {
      ctx.globalAlpha = alpha;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }

    ctx.stroke();
    ctx.restore();
  }

  window.FullShotCanvas.Pen = {
    drawSmoothedPath
  };
})();
