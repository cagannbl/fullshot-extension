/**
 * FullShot Pro - Arrow & Line Tool
 * Single & double-headed arrows, straight lines, with dashed line pattern support.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Draw a straight line between two points.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x1 
   * @param {number} y1 
   * @param {number} x2 
   * @param {number} y2 
   * @param {string} color 
   * @param {number} width 
   * @param {boolean} dashed 
   */
  function drawLine(ctx, x1, y1, x2, y2, color, width, dashed = false) {
    if (!ctx) return;
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
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw single or double headed arrow.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x1 
   * @param {number} y1 
   * @param {number} x2 
   * @param {number} y2 
   * @param {string} color 
   * @param {number} width 
   * @param {boolean} dashed 
   * @param {boolean} isDouble 
   */
  function drawArrow(ctx, x1, y1, x2, y2, color, width, dashed = false, isDouble = false) {
    if (!ctx) return;
    const headLength = Math.max(14, width * 3.5);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Main shaft
    if (dashed) {
      ctx.setLineDash([Math.max(6, width * 2), Math.max(4, width * 1.5)]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Solid heads
    ctx.setLineDash([]);

    // End arrow head (pointing to x2, y2)
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLength * Math.cos(angle - Math.PI / 6),
      y2 - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headLength * Math.cos(angle + Math.PI / 6),
      y2 - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Start arrow head if double arrow (pointing to x1, y1)
    if (isDouble) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(
        x1 + headLength * Math.cos(angle - Math.PI / 6),
        y1 + headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x1 + headLength * Math.cos(angle + Math.PI / 6),
        y1 + headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  window.FullShotCanvas.Arrow = {
    drawLine,
    drawArrow
  };
})();
