/**
 * FullShot Pro - Advanced Multi-Mode Pen Engine
 * Supports:
 * 1. Ballpoint (Tükenmez Kalem - Smooth Bézier vector spline)
 * 2. Calligraphy (Dolma / Kaligrafi - Dynamic angle chisel nib)
 * 3. Neon (Işıltılı Lazer - Double-pass luminous glow)
 * 4. Pencil (Karakalem / Tebeşir - Textured graphite sketch)
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Filter redundant jitter points that are too close to each other.
   */
  function filterJitterPoints(points, minDistanceSquared = 2.25) {
    if (!points || points.length <= 2) return points || [];
    const filtered = [points[0]];
    let lastPoint = points[0];

    for (let i = 1; i < points.length - 1; i++) {
      const pt = points[i];
      const dx = pt.x - lastPoint.x;
      const dy = pt.y - lastPoint.y;
      if (dx * dx + dy * dy >= minDistanceSquared) {
        filtered.push(pt);
        lastPoint = pt;
      }
    }
    filtered.push(points[points.length - 1]);
    return filtered;
  }

  /**
   * Draw calligraphy / chisel-nib stroke with dynamic angle thickness.
   */
  function drawCalligraphyStroke(ctx, points, color, width, alpha = 1.0) {
    if (points.length < 2) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      return;
    }

    const angle = Math.PI / 4; // 45° chisel angle
    const hw = width / 2;
    const nx = Math.cos(angle) * hw;
    const ny = Math.sin(angle) * hw;

    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      ctx.beginPath();
      ctx.moveTo(p1.x - nx, p1.y - ny);
      ctx.lineTo(p1.x + nx, p1.y + ny);
      ctx.lineTo(p2.x + nx, p2.y + ny);
      ctx.lineTo(p2.x - nx, p2.y - ny);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Draw textured pencil / sketch stroke.
   */
  function drawPencilStroke(ctx, points, color, width, alpha = 0.75) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha;

    // Main textured core
    ctx.lineWidth = Math.max(1, width * 0.85);
    drawStandardSpline(ctx, points);
    ctx.stroke();

    // Subtle sketch jitter line
    ctx.globalAlpha = alpha * 0.45;
    ctx.lineWidth = Math.max(1, width * 0.4);
    ctx.beginPath();
    ctx.moveTo(points[0].x + 0.5, points[0].y - 0.5);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x + (Math.sin(i * 1.5) * 0.75), points[i].y + (Math.cos(i * 1.5) * 0.75));
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw luminous neon glow stroke.
   */
  function drawNeonStroke(ctx, points, color, width, alpha = 1.0) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Outer luminous atmospheric halo
    ctx.globalAlpha = alpha * 0.65;
    ctx.shadowBlur = Math.max(10, width * 2.8);
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = width * 1.6;
    drawStandardSpline(ctx, points);
    ctx.stroke();

    // 2. Focused vibrant core
    ctx.shadowBlur = Math.max(6, width * 1.4);
    ctx.lineWidth = width;
    ctx.stroke();

    // 3. Ultra-bright white center filament
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FFFFE3';
    ctx.lineWidth = Math.max(1.5, width * 0.35);
    ctx.globalAlpha = alpha * 0.95;
    drawStandardSpline(ctx, points);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Helper to draw standard Bézier spline path.
   */
  function drawStandardSpline(ctx, points) {
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 1, 0, Math.PI * 2);
      return;
    }
    if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    const firstMidX = (points[0].x + points[1].x) / 2;
    const firstMidY = (points[0].y + points[1].y) / 2;
    ctx.lineTo(firstMidX, firstMidY);

    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  }

  /**
   * Main dispatch: Draw smoothed stroke using active pen mode.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Array<{x: number, y: number}>} rawPoints 
   * @param {string} color 
   * @param {number} width 
   * @param {number} [alpha=1.0] 
   * @param {boolean} [isHighlighter=false] 
   * @param {'ballpoint'|'calligraphy'|'neon'|'pencil'} [penType='ballpoint']
   */
  function drawSmoothedPath(ctx, rawPoints, color, width, alpha = 1.0, isHighlighter = false, penType = 'ballpoint') {
    if (!ctx || !rawPoints || rawPoints.length === 0) return;

    if (rawPoints.length === 1) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(rawPoints[0].x, rawPoints[0].y, Math.max(1.5, width / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const points = filterJitterPoints(rawPoints, 2.0);

    if (isHighlighter) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = alpha;
      drawStandardSpline(ctx, points);
      ctx.stroke();
      ctx.restore();
      return;
    }

    switch (penType) {
      case 'calligraphy':
        drawCalligraphyStroke(ctx, points, color, width * 1.25, alpha);
        break;

      case 'neon':
        drawNeonStroke(ctx, points, color, width, alpha);
        break;

      case 'pencil':
        drawPencilStroke(ctx, points, color, width, alpha);
        break;

      case 'ballpoint':
      default:
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = alpha;
        drawStandardSpline(ctx, points);
        ctx.stroke();
        ctx.restore();
        break;
    }
  }

  window.FullShotCanvas.Pen = {
    filterJitterPoints,
    drawSmoothedPath
  };
})();
