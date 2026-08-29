/**
 * FullShot Pro - Badge Tool (Auto-Increment Step Badges #1, #2, #3...)
 * High-clarity numbered badge renderer with adaptive circle/pill geometry,
 * multi-layer high contrast rings, drop shadow, and boundary clamping.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Draw a numbered step badge with adaptive circular or pill geometry.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x Center X
   * @param {number} y Center Y
   * @param {number|string} number Counter value or label (e.g. 1, 2, '#1')
   * @param {string} color Badge background fill color
   * @param {number} [radius] Base circle radius (default 16)
   * @param {number} [canvasWidth] Canvas bounding width for safe clamping
   * @param {number} [canvasHeight] Canvas bounding height for safe clamping
   */
  function drawStepBadge(ctx, x, y, number, color, radius = 16, canvasWidth = 0, canvasHeight = 0) {
    if (!ctx) return;

    const label = String(number).startsWith('#') ? String(number) : `#${number}`;
    const baseRadius = Math.max(12, radius);
    const fontSize = Math.round(baseRadius * 1.05);

    ctx.save();
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;

    // Check if label requires an expanded pill shape
    const isPill = textWidth > baseRadius * 1.25;
    const paddingX = Math.round(baseRadius * 0.6);
    const badgeW = isPill ? textWidth + paddingX * 2 : baseRadius * 2;
    const badgeH = baseRadius * 2;

    // Boundary safe clamping if canvas dimensions provided
    let clampedX = x;
    let clampedY = y;
    if (canvasWidth > 0 && canvasHeight > 0) {
      const halfW = badgeW / 2 + 4;
      const halfH = badgeH / 2 + 4;
      clampedX = Math.max(halfW, Math.min(canvasWidth - halfW, x));
      clampedY = Math.max(halfH, Math.min(canvasHeight - halfH, y));
    }

    const shapes = window.FullShotCanvas.Shapes;

    // 1. Drop Shadow Layer
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    // 2. Base Fill Layer (Vibrant Core)
    ctx.fillStyle = color;
    if (isPill) {
      const bx = clampedX - badgeW / 2;
      const by = clampedY - badgeH / 2;
      if (shapes && shapes.drawRoundedRectPath) {
        shapes.drawRoundedRectPath(ctx, bx, by, badgeW, badgeH, badgeH / 2);
      } else {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, badgeW, badgeH, badgeH / 2);
        else ctx.rect(bx, by, badgeW, badgeH);
      }
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(clampedX, clampedY, baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Crisp High-Contrast White Inner Ring
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, Math.round(baseRadius * 0.14));
    if (isPill) {
      const bx = clampedX - badgeW / 2;
      const by = clampedY - badgeH / 2;
      if (shapes && shapes.drawRoundedRectPath) {
        shapes.drawRoundedRectPath(ctx, bx, by, badgeW, badgeH, badgeH / 2);
      } else {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, badgeW, badgeH, badgeH / 2);
        else ctx.rect(bx, by, badgeW, badgeH);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(clampedX, clampedY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Outer Subtle Dark Contrast Ring
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;
    if (isPill) {
      const bx = clampedX - badgeW / 2 - 1;
      const by = clampedY - badgeH / 2 - 1;
      if (shapes && shapes.drawRoundedRectPath) {
        shapes.drawRoundedRectPath(ctx, bx, by, badgeW + 2, badgeH + 2, (badgeH + 2) / 2);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(clampedX, clampedY, baseRadius + 1, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Centered Bold White Typography with optical vertical centering
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, clampedX, clampedY + 1);

    ctx.restore();
  }

  window.FullShotCanvas.Badge = {
    drawStepBadge
  };
})();
