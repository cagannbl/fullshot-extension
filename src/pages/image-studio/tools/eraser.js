/**
 * FullShot Pro - Smart Object Eraser Tool (Click/Touch to Delete)
 * Precision geometric hit-testing engine for all vector annotations:
 * Freehand Pen, Highlighter, Arrow, Line, Rect, Circle, Step Badge, Text, Callout, Blur, Spotlight, Stamp, Magnifier.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Calculate shortest perpendicular distance from point P to line segment AB.
   */
  function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  /**
   * Find index of top-most annotation action hit by point (x, y).
   * @param {number} x 
   * @param {number} y 
   * @param {Array<Object>} historyStack 
   * @param {number} historyIndex 
   * @returns {number} Index in historyStack or -1 if nothing hit
   */
  function findHitActionIndex(x, y, historyStack, historyIndex) {
    if (!historyStack || historyIndex < 0) return -1;

    for (let i = historyIndex; i >= 0; i--) {
      const act = historyStack[i];
      if (!act) continue;

      switch (act.type) {
        case 'pen':
        case 'highlighter':
          if (act.points && act.points.length > 0) {
            const hitTolerance = Math.max(12, (act.width || 4) + 8);
            if (act.points.length === 1) {
              if (Math.hypot(x - act.points[0].x, y - act.points[0].y) <= hitTolerance) return i;
            } else {
              for (let p = 0; p < act.points.length - 1; p++) {
                const d = distToSegment(x, y, act.points[p].x, act.points[p].y, act.points[p + 1].x, act.points[p + 1].y);
                if (d <= hitTolerance) return i;
              }
            }
          }
          break;

        case 'line':
        case 'arrow':
          {
            const hitTolerance = Math.max(14, (act.width || 4) + 8);
            const d = distToSegment(x, y, act.x1, act.y1, act.x2, act.y2);
            if (d <= hitTolerance) return i;
          }
          break;

        case 'rect':
        case 'blur':
        case 'spotlight':
          {
            const minX = Math.min(act.x1, act.x2);
            const maxX = Math.max(act.x1, act.x2);
            const minY = Math.min(act.y1, act.y2);
            const maxY = Math.max(act.y1, act.y2);
            if (x >= minX - 10 && x <= maxX + 10 && y >= minY - 10 && y <= maxY + 10) {
              return i;
            }
          }
          break;

        case 'circle':
          {
            const cx = (act.x1 + act.x2) / 2;
            const cy = (act.y1 + act.y2) / 2;
            const rx = Math.abs(act.x2 - act.x1) / 2;
            const ry = Math.abs(act.y2 - act.y1) / 2;
            const normDist = Math.hypot((x - cx) / Math.max(1, rx), (y - cy) / Math.max(1, ry));
            if (normDist <= 1.25 && normDist >= 0.75) return i;
            if (normDist <= 1.1) return i;
          }
          break;

        case 'step':
          {
            const radius = act.radius || 18;
            if (Math.hypot(x - act.x, y - act.y) <= radius + 10) return i;
          }
          break;

        case 'stamp':
          {
            if (Math.hypot(x - act.x, y - act.y) <= 36 * (act.scale || 1.0)) return i;
          }
          break;

        case 'magnifier':
          {
            const radius = act.radius || 65;
            if (Math.hypot(x - act.x, y - act.y) <= radius + 12) return i;
          }
          break;

        case 'text':
          {
            const fSize = act.fontSize || 24;
            const approxW = Math.max(80, (act.text || '').length * (fSize * 0.6));
            const approxH = fSize * 1.8;
            if (x >= act.x - 12 && x <= act.x + approxW + 12 && y >= act.y - 12 && y <= act.y + approxH + 12) {
              return i;
            }
          }
          break;

        case 'callout':
          {
            const dTail = distToSegment(x, y, act.tailX, act.tailY, act.bubbleX, act.bubbleY);
            if (dTail <= 20) return i;
            if (Math.hypot(x - act.bubbleX, y - act.bubbleY) <= 60) return i;
          }
          break;
      }
    }
    return -1;
  }

  /**
   * Draw visual hover highlight around the targeted action on overlay canvas.
   */
  function drawHitHighlight(ctx, act) {
    if (!ctx || !act) return;
    ctx.save();
    ctx.strokeStyle = '#ff3366';
    ctx.fillStyle = 'rgba(255, 51, 102, 0.18)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);

    switch (act.type) {
      case 'pen':
      case 'highlighter':
        if (act.points && act.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(act.points[0].x, act.points[0].y);
          for (let p = 1; p < act.points.length; p++) {
            ctx.lineTo(act.points[p].x, act.points[p].y);
          }
          ctx.stroke();
        }
        break;

      case 'line':
      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(act.x1, act.y1);
        ctx.lineTo(act.x2, act.y2);
        ctx.stroke();
        break;

      case 'rect':
      case 'blur':
      case 'spotlight':
        {
          const minX = Math.min(act.x1, act.x2) - 4;
          const minY = Math.min(act.y1, act.y2) - 4;
          const w = Math.abs(act.x2 - act.x1) + 8;
          const h = Math.abs(act.y2 - act.y1) + 8;
          ctx.strokeRect(minX, minY, w, h);
          ctx.fillRect(minX, minY, w, h);
        }
        break;

      case 'circle':
        {
          const cx = (act.x1 + act.x2) / 2;
          const cy = (act.y1 + act.y2) / 2;
          const rx = Math.abs(act.x2 - act.x1) / 2 + 4;
          const ry = Math.abs(act.y2 - act.y1) / 2 + 4;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fill();
        }
        break;

      case 'step':
      case 'stamp':
      case 'magnifier':
        {
          const r = act.radius || 24;
          ctx.beginPath();
          ctx.arc(act.x, act.y, r + 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fill();
        }
        break;

      case 'text':
      case 'callout':
        {
          const tx = act.x || act.bubbleX || 0;
          const ty = act.y || act.bubbleY || 0;
          ctx.beginPath();
          ctx.arc(tx, ty, 32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fill();
        }
        break;
    }
    ctx.restore();
  }

  /**
   * Draw circular eraser cursor with crosshair and active badge.
   */
  function drawEraserCursor(ctx, x, y, isTargetHit = false) {
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fillStyle = isTargetHit ? 'rgba(255, 51, 102, 0.45)' : 'rgba(255, 255, 255, 0.2)';
    ctx.fill();

    ctx.strokeStyle = isTargetHit ? '#ff3366' : '#FFFFE3';
    ctx.lineWidth = isTargetHit ? 2.5 : 1.5;
    ctx.stroke();

    // Crosshair lines
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + 6);
    ctx.strokeStyle = isTargetHit ? '#ffffff' : '#CBCBCB';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  window.FullShotCanvas.Eraser = {
    findHitActionIndex,
    drawHitHighlight,
    drawEraserCursor
  };
})();
