/**
 * FullShot Pro - Badge Tool (Auto-Increment Step Badges 1, 2, 3...)
 * High-clarity numbered badge renderer with drop shadow and crisp border.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Draw a numbered step badge.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x Center X
   * @param {number} y Center Y
   * @param {number} number Counter value
   * @param {string} color Badge background fill color
   * @param {number} radius Circle radius
   */
  function drawStepBadge(ctx, x, y, number, color, radius = 16) {
    if (!ctx) return;

    ctx.save();
    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Filled Badge circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Crisp white border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // White bold centered number
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(radius * 1.1)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), x, y + 1);

    ctx.restore();
  }

  window.FullShotCanvas.Badge = {
    drawStepBadge
  };
})();
