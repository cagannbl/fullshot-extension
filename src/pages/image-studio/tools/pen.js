/**
 * FullShot Pro - Pen Tool (Vector Bézier Spline Smoothed Freehand)
 * High-performance smoothed vector path rendering with micro-jitter filtering,
 * midpoint quadratic Bézier spline chaining, and single-point dot support.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Filter redundant jitter points that are too close to each other.
   * @param {Array<{x: number, y: number}>} points 
   * @param {number} minDistanceSquared 
   * @returns {Array<{x: number, y: number}>}
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
    // Always include the final point for accuracy
    filtered.push(points[points.length - 1]);
    return filtered;
  }

  /**
   * Draw a smoothed stroke from an array of 2D points using Bézier spline interpolation.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Array<{x: number, y: number}>} rawPoints 
   * @param {string} color 
   * @param {number} width 
   * @param {number} alpha 
   * @param {boolean} isHighlighter 
   */
  function drawSmoothedPath(ctx, rawPoints, color, width, alpha = 1.0, isHighlighter = false) {
    if (!ctx || !rawPoints || rawPoints.length === 0) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isHighlighter) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = alpha;
    } else {
      ctx.globalAlpha = alpha;
    }

    // 1. Single Point Click -> Draw a circular dot
    if (rawPoints.length === 1) {
      ctx.beginPath();
      ctx.arc(rawPoints[0].x, rawPoints[0].y, Math.max(1, width / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const points = filterJitterPoints(rawPoints, 2.0);

    // 2. Two Points -> Straight segment
    if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // 3. Three or More Points -> Midpoint Quadratic Bézier Spline Chain
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Connect first segment to midpoint
    const firstMidX = (points[0].x + points[1].x) / 2;
    const firstMidY = (points[0].y + points[1].y) / 2;
    ctx.lineTo(firstMidX, firstMidY);

    // Continuous smoothed spline through all intermediate points
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }

    // Connect to final recorded endpoint
    const lastPoint = points[points.length - 1];
    ctx.lineTo(lastPoint.x, lastPoint.y);

    ctx.stroke();
    ctx.restore();
  }

  window.FullShotCanvas.Pen = {
    filterJitterPoints,
    drawSmoothedPath
  };
})();
