/**
 * FullShot Pro - Vector Arrow & Line Tool
 * Single & double-headed precision arrows, straight lines, with dashed line pattern support,
 * swept-back arrowhead geometry, and trimmed shaft rendering.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Draw a straight line between two points with crisp line styling.
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
      ctx.setLineDash([Math.max(6, width * 2.2), Math.max(4, width * 1.6)]);
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
   * Draws a single polygonal arrowhead at tip (tx, ty) pointing in direction angle.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} tx Tip X
   * @param {number} ty Tip Y
   * @param {number} angle Direction angle the tip points towards
   * @param {number} headLength Length from tip to base
   * @param {string} color Fill & stroke color
   * @param {number} strokeWidth Base line width
   */
  function renderArrowHead(ctx, tx, ty, angle, headLength, color, strokeWidth) {
    const headAngle = Math.PI / 6.5; // ~27.7 degrees sharp sleek angle
    const notchDepth = headLength * 0.22; // subtle swept-back notch

    const leftX = tx - headLength * Math.cos(angle - headAngle);
    const leftY = ty - headLength * Math.sin(angle - headAngle);

    const rightX = tx - headLength * Math.cos(angle + headAngle);
    const rightY = ty - headLength * Math.sin(angle + headAngle);

    const notchX = tx - (headLength - notchDepth) * Math.cos(angle);
    const notchY = ty - (headLength - notchDepth) * Math.sin(angle);

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, strokeWidth * 0.5);
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 4;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(notchX, notchY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw single or double headed precision arrow with trimmed shaft.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x1 Start X
   * @param {number} y1 Start Y
   * @param {number} x2 End X
   * @param {number} y2 End Y
   * @param {string} color Stroke/fill color
   * @param {number} width Shaft stroke width
   * @param {boolean} dashed Whether shaft is dashed
   * @param {boolean} isDouble Whether arrow has heads at both ends
   */
  function drawArrow(ctx, x1, y1, x2, y2, color, width, dashed = false, isDouble = false) {
    if (!ctx) return;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return;

    const angle = Math.atan2(dy, dx);
    const maxHeadRatio = isDouble ? 0.38 : 0.45;
    const baseHeadLength = Math.max(13, width * 3.8);
    const headLength = Math.min(baseHeadLength, dist * maxHeadRatio);

    // Calculate shaft endpoints so line does not poke through arrowhead tips
    const shaftTrimEnd = headLength * 0.78;
    const shaftTrimStart = isDouble ? headLength * 0.78 : 0;

    const shaftStartX = x1 + Math.cos(angle) * shaftTrimStart;
    const shaftStartY = y1 + Math.sin(angle) * shaftTrimStart;

    const shaftEndX = x2 - Math.cos(angle) * shaftTrimEnd;
    const shaftEndY = y2 - Math.sin(angle) * shaftTrimEnd;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Draw Trimmed Shaft
    if (dashed) {
      ctx.setLineDash([Math.max(6, width * 2.2), Math.max(4, width * 1.6)]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(shaftStartX, shaftStartY);
    ctx.lineTo(shaftEndX, shaftEndY);
    ctx.stroke();
    ctx.restore();

    // 2. Draw Forward Head (pointing to x2, y2)
    renderArrowHead(ctx, x2, y2, angle, headLength, color, width);

    // 3. Draw Backward Head for Double Arrow (pointing to x1, y1)
    if (isDouble) {
      renderArrowHead(ctx, x1, y1, angle + Math.PI, headLength, color, width);
    }
  }

  window.FullShotCanvas.Arrow = {
    drawLine,
    drawArrow
  };
})();
