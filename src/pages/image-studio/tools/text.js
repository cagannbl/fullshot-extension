/**
 * FullShot Pro - Text & Callout Tool
 * Floating text cards, comic speech bubbles, thought clouds, and frosted glass cards
 * with dynamic pointers, high-DPI typography, and drop shadows.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Helper to draw rounded rectangle.
   */
  function drawRoundedRectPath(ctx, x, y, width, height, radius) {
    if (window.FullShotCanvas.Shapes && window.FullShotCanvas.Shapes.drawRoundedRectPath) {
      window.FullShotCanvas.Shapes.drawRoundedRectPath(ctx, x, y, width, height, radius);
    } else {
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
  }

  /**
   * Helper to draw a fluffy cloud path for Thought Bubbles.
   */
  function drawCloudPath(ctx, bx, by, boxW, boxH) {
    ctx.beginPath();
    const cx = bx + boxW / 2;
    const cy = by + boxH / 2;
    const numPuffs = 8;
    const rx = boxW / 2;
    const ry = boxH / 2;

    for (let i = 0; i < numPuffs; i++) {
      const angle = (i / numPuffs) * Math.PI * 2;
      const nextAngle = ((i + 1) / numPuffs) * Math.PI * 2;
      const puffX = cx + Math.cos(angle) * (rx * 0.85);
      const puffY = cy + Math.sin(angle) * (ry * 0.85);
      const puffRadius = Math.max(12, Math.min(boxW, boxH) * 0.32);

      if (i === 0) {
        ctx.moveTo(puffX + puffRadius, puffY);
      }
      ctx.arc(puffX, puffY, puffRadius, angle, nextAngle);
    }
    ctx.closePath();
  }

  /**
   * Render floating text with optional dark card / frosted glass / plain background.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {string} text 
   * @param {number} x 
   * @param {number} y 
   * @param {number} fontSize 
   * @param {string} color 
   * @param {'dark'|'frosted'|'plain'|boolean} [bgStyle='dark'] 
   * @param {number} canvasWidth 
   * @param {number} canvasHeight 
   */
  function renderTextOnCanvas(
    ctx,
    text,
    x,
    y,
    fontSize = 24,
    color = '#ff3366',
    bgStyle = 'dark',
    canvasWidth = 4096,
    canvasHeight = 4096
  ) {
    if (!ctx || !text) return;
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.35;
    const fontStyle = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    ctx.save();
    ctx.font = fontStyle;
    ctx.textBaseline = 'top';

    let maxWidth = 0;
    lines.forEach(l => {
      const m = ctx.measureText(l);
      if (m.width > maxWidth) maxWidth = m.width;
    });

    const padding = Math.round(fontSize * 0.45);
    const boxWidth = maxWidth + padding * 2;
    const boxHeight = lines.length * lineHeight + padding * 2;

    const maxCanvasW = canvasWidth || ctx.canvas?.width || 4096;
    const maxCanvasH = canvasHeight || ctx.canvas?.height || 4096;

    const hasBg = bgStyle === true || bgStyle === 'dark' || bgStyle === 'frosted';
    const isFrosted = bgStyle === 'frosted';

    if (hasBg) {
      const rx = Math.max(4, Math.min(maxCanvasW - boxWidth - 4, x - padding));
      const ry = Math.max(4, Math.min(maxCanvasH - boxHeight - 4, y - padding));
      const radius = Math.min(10, Math.round(fontSize * 0.4));

      // Drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;

      drawRoundedRectPath(ctx, rx, ry, boxWidth, boxHeight, radius);

      if (isFrosted) {
        // Frosted Glass / Cam Kart
        ctx.fillStyle = 'rgba(35, 42, 54, 0.85)';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Dark Card
        ctx.fillStyle = 'rgba(12, 16, 24, 0.94)';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.fillStyle = isFrosted ? '#FFFFE3' : color;
      lines.forEach((line, idx) => {
        ctx.fillText(line, rx + padding, ry + padding + idx * lineHeight);
      });
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = color;

      lines.forEach((line, idx) => {
        ctx.fillText(line, x, y + idx * lineHeight);
      });
    }

    ctx.restore();
  }

  /**
   * Preview speech / thought bubble while dragging.
   */
  function drawCalloutPreview(
    ctx,
    tailX,
    tailY,
    bubbleX,
    bubbleY,
    color = '#6D8196',
    strokeWidth = 4,
    style = 'bubble'
  ) {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = 'rgba(109, 129, 150, 0.22)';
    ctx.lineWidth = strokeWidth;
    ctx.setLineDash([5, 4]);

    const boxW = 140;
    const boxH = 50;
    const bx = bubbleX - boxW / 2;
    const by = bubbleY - boxH / 2;

    if (style === 'thought') {
      drawCloudPath(ctx, bx, by, boxW, boxH);
      ctx.fill();
      ctx.stroke();

      // Small thought dots leading to tail
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      const d1x = bubbleX + (tailX - bubbleX) * 0.45;
      const d1y = bubbleY + (tailY - bubbleY) * 0.45;
      const d2x = bubbleX + (tailX - bubbleX) * 0.75;
      const d2y = bubbleY + (tailY - bubbleY) * 0.75;

      ctx.beginPath();
      ctx.arc(d1x, d1y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(d2x, d2y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawRoundedRectPath(ctx, bx, by, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bubbleX, bubbleY);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(tailX, tailY, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.fillStyle = '#CBCBCB';
    ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style === 'thought' ? '💭 Düşünce Bulutu' : '💬 Konuşma Balonu', bubbleX, bubbleY);
    ctx.restore();
  }

  /**
   * Render complete callout speech bubble / thought cloud / frosted card.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} tailX 
   * @param {number} tailY 
   * @param {number} bubbleX 
   * @param {number} bubbleY 
   * @param {string} text 
   * @param {string} color 
   * @param {number} strokeWidth 
   * @param {number} fontSize 
   * @param {'bubble'|'thought'|'frosted'|boolean} [style='bubble'] 
   */
  function drawCallout(
    ctx,
    tailX,
    tailY,
    bubbleX,
    bubbleY,
    text,
    color = '#ff3366',
    strokeWidth = 4,
    fontSize = 20,
    style = 'bubble'
  ) {
    if (!ctx || !text) return;
    ctx.save();
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.35;
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'top';

    let maxW = 0;
    lines.forEach(l => {
      const w = ctx.measureText(l).width;
      if (w > maxW) maxW = w;
    });

    const isThought = style === 'thought';
    const isFrosted = style === 'frosted';

    const padX = Math.round(fontSize * (isThought ? 0.9 : 0.75));
    const padY = Math.round(fontSize * (isThought ? 0.7 : 0.55));
    const boxW = Math.max(80, maxW + padX * 2);
    const boxH = Math.max(42, lines.length * lineHeight + padY * 2);
    const radius = Math.min(14, boxH / 2);

    const bx = bubbleX - boxW / 2;
    const by = bubbleY - boxH / 2;
    const cx = bubbleX;
    const cy = bubbleY;

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;

    // 1. Render Background & Pointer
    if (isThought) {
      // Düşünce Bulutu
      ctx.fillStyle = isFrosted ? 'rgba(30, 38, 50, 0.92)' : 'rgba(18, 22, 30, 0.96)';
      drawCloudPath(ctx, bx, by, boxW, boxH);
      ctx.fill();

      // Thought circles connecting to tail
      const d1x = bubbleX + (tailX - bubbleX) * 0.45;
      const d1y = bubbleY + (tailY - bubbleY) * 0.45;
      const d2x = bubbleX + (tailX - bubbleX) * 0.75;
      const d2y = bubbleY + (tailY - bubbleY) * 0.75;

      ctx.beginPath();
      ctx.arc(d1x, d1y, Math.max(4, strokeWidth * 1.5), 0, Math.PI * 2);
      ctx.arc(d2x, d2y, Math.max(3, strokeWidth * 0.9), 0, Math.PI * 2);
      ctx.fill();

      // Stroke
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      drawCloudPath(ctx, bx, by, boxW, boxH);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(d1x, d1y, Math.max(4, strokeWidth * 1.5), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(d2x, d2y, Math.max(3, strokeWidth * 0.9), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Çizgi Roman Konuşma Balonu & Cam Kart Balonu
      const angle = Math.atan2(tailY - cy, tailX - cx);
      const baseSpread = Math.min(26, Math.max(14, fontSize * 0.9));

      const edgeOffsetX = Math.cos(angle) * (boxW / 2);
      const edgeOffsetY = Math.sin(angle) * (boxH / 2);
      const anchorX = cx + Math.max(-boxW / 2 + radius, Math.min(boxW / 2 - radius, edgeOffsetX));
      const anchorY = cy + Math.max(-boxH / 2 + radius, Math.min(boxH / 2 - radius, edgeOffsetY));

      const perpAngle = angle + Math.PI / 2;
      const p1x = anchorX + Math.cos(perpAngle) * (baseSpread / 2);
      const p1y = anchorY + Math.sin(perpAngle) * (baseSpread / 2);
      const p2x = anchorX - Math.cos(perpAngle) * (baseSpread / 2);
      const p2y = anchorY - Math.sin(perpAngle) * (baseSpread / 2);

      ctx.fillStyle = isFrosted ? 'rgba(32, 40, 54, 0.9)' : 'rgba(18, 22, 30, 0.96)';

      // Fill bubble & pointer
      drawRoundedRectPath(ctx, bx, by, boxW, boxH, radius);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(tailX, tailY);
      ctx.lineTo(p2x, p2y);
      ctx.closePath();
      ctx.fill();

      // Stroke
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      drawRoundedRectPath(ctx, bx, by, boxW, boxH, radius);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(tailX, tailY);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();

      // Tip pointer dot
      ctx.beginPath();
      ctx.arc(tailX, tailY, Math.max(3, strokeWidth * 0.75), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // 2. Render Text
    ctx.fillStyle = '#FFFFE3';
    lines.forEach((line, idx) => {
      ctx.fillText(line, bx + padX, by + padY + idx * lineHeight);
    });

    ctx.restore();
  }

  window.FullShotCanvas.Text = {
    renderTextOnCanvas,
    drawCalloutPreview,
    drawCallout
  };
})();
