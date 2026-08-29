/**
 * FullShot Pro - Text & Callout Tool
 * Floating text cards and dynamic speech bubble annotations with pointer tails.
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
   * Render floating text with optional dark card background.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {string} text 
   * @param {number} x 
   * @param {number} y 
   * @param {number} fontSize 
   * @param {string} color 
   * @param {boolean} hasBg 
   * @param {number} canvasWidth 
   * @param {number} canvasHeight 
   */
  function renderTextOnCanvas(ctx, text, x, y, fontSize = 24, color = '#ff3366', hasBg = true, canvasWidth = 4096, canvasHeight = 4096) {
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

    const padding = Math.round(fontSize * 0.4);
    const boxWidth = maxWidth + padding * 2;
    const boxHeight = lines.length * lineHeight + padding * 2;

    const maxCanvasW = canvasWidth || ctx.canvas?.width || 4096;
    const maxCanvasH = canvasHeight || ctx.canvas?.height || 4096;

    if (hasBg) {
      ctx.fillStyle = 'rgba(10, 15, 26, 0.92)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      const rx = Math.max(4, Math.min(maxCanvasW - boxWidth - 4, x - padding));
      const ry = Math.max(4, Math.min(maxCanvasH - boxHeight - 4, y - padding));
      const radius = 6;

      drawRoundedRectPath(ctx, rx, ry, boxWidth, boxHeight, radius);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
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
   * Preview speech bubble while dragging.
   */
  function drawCalloutPreview(ctx, tailX, tailY, bubbleX, bubbleY, color = '#6D8196', strokeWidth = 4) {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = 'rgba(109, 129, 150, 0.22)';
    ctx.lineWidth = strokeWidth;
    ctx.setLineDash([5, 4]);

    const boxW = 130;
    const boxH = 46;
    const bx = bubbleX - boxW / 2;
    const by = bubbleY - boxH / 2;

    drawRoundedRectPath(ctx, bx, by, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bubbleX, bubbleY);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(tailX, tailY, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.fillStyle = '#CBCBCB';
    ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💬 Açıklama Balonu', bubbleX, bubbleY);
    ctx.restore();
  }

  /**
   * Render complete callout speech bubble with dynamic pointer tail.
   */
  function drawCallout(ctx, tailX, tailY, bubbleX, bubbleY, text, color = '#ff3366', strokeWidth = 4, fontSize = 20, hasBg = true) {
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

    const padX = Math.round(fontSize * 0.7);
    const padY = Math.round(fontSize * 0.5);
    const boxW = Math.max(70, maxW + padX * 2);
    const boxH = Math.max(38, lines.length * lineHeight + padY * 2);
    const radius = Math.min(12, boxH / 2);

    const bx = bubbleX - boxW / 2;
    const by = bubbleY - boxH / 2;
    const cx = bubbleX;
    const cy = bubbleY;

    // Subtle drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // Angle to tail
    const angle = Math.atan2(tailY - cy, tailX - cx);
    const baseSpread = Math.min(24, Math.max(14, fontSize * 0.9));

    // Base attachment points on bubble
    const edgeOffsetX = Math.cos(angle) * (boxW / 2);
    const edgeOffsetY = Math.sin(angle) * (boxH / 2);
    const anchorX = cx + Math.max(-boxW / 2 + radius, Math.min(boxW / 2 - radius, edgeOffsetX));
    const anchorY = cy + Math.max(-boxH / 2 + radius, Math.min(boxH / 2 - radius, edgeOffsetY));

    const perpAngle = angle + Math.PI / 2;
    const p1x = anchorX + Math.cos(perpAngle) * (baseSpread / 2);
    const p1y = anchorY + Math.sin(perpAngle) * (baseSpread / 2);
    const p2x = anchorX - Math.cos(perpAngle) * (baseSpread / 2);
    const p2y = anchorY - Math.sin(perpAngle) * (baseSpread / 2);

    // Fill bubble & tail
    ctx.fillStyle = hasBg ? 'rgba(18, 22, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    
    // Draw bubble
    drawRoundedRectPath(ctx, bx, by, boxW, boxH, radius);
    ctx.fill();

    // Draw tail
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(tailX, tailY);
    ctx.lineTo(p2x, p2y);
    ctx.closePath();
    ctx.fill();

    // Stroke border
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

    // Small target pointer circle at tail tip
    ctx.beginPath();
    ctx.arc(tailX, tailY, Math.max(3, strokeWidth * 0.75), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Render text inside
    ctx.fillStyle = hasBg ? '#FFFFE3' : '#181a1e';
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
