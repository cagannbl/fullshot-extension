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
   * Helper to draw a unified continuous path for Speech Bubble (no inner borders).
   */
  function drawUnifiedCalloutPath(ctx, bx, by, boxW, boxH, radius, targetX, targetY) {
    const cx = bx + boxW / 2;
    const cy = by + boxH / 2;
    const rawDx = targetX - cx;
    const rawDy = targetY - cy;
    const r = Math.min(radius, boxW / 2, boxH / 2);

    // Limit maximum tail length so it never turns into an unnatural giant needle (CleanShot X standard)
    const maxTailLen = Math.max(32, Math.min(85, boxH * 1.1));
    const dist = Math.hypot(rawDx, rawDy);
    const scale = dist > 0 ? Math.min(1, maxTailLen / Math.max(1, dist - boxH * 0.4)) : 1;

    let tailX = cx + rawDx * (dist > maxTailLen + 20 ? (maxTailLen / dist) * 1.2 : 1);
    let tailY = cy + rawDy * (dist > maxTailLen + 20 ? (maxTailLen / dist) * 1.2 : 1);

    const dx = tailX - cx;
    const dy = tailY - cy;

    ctx.beginPath();

    // Determine which side the tail comes from
    const absNormX = Math.abs(dx) / (boxW / 2);
    const absNormY = Math.abs(dy) / (boxH / 2);

    if (absNormY >= absNormX) {
      // Tail is on Top or Bottom
      if (dy >= 0) {
        // --- BOTTOM TAIL ---
        const tailBaseW = Math.min(32, Math.max(20, boxW * 0.28));
        const tx = Math.max(bx + r + tailBaseW / 2 + 4, Math.min(bx + boxW - r - tailBaseW / 2 - 4, cx + dx * 0.55));
        const t1x = tx - tailBaseW / 2;
        const t2x = tx + tailBaseW / 2;
        const ty = by + boxH;

        // Ensure tail tip extends below bottom
        const actualTipY = Math.max(ty + 18, Math.min(ty + maxTailLen, tailY));
        const actualTipX = tx + (tailX - tx) * 0.85;

        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + boxW - r, by);
        ctx.quadraticCurveTo(bx + boxW, by, bx + boxW, by + r);
        ctx.lineTo(bx + boxW, by + boxH - r);
        ctx.quadraticCurveTo(bx + boxW, by + boxH, bx + boxW - r, by + boxH);
        
        ctx.lineTo(t2x, ty);
        // Organic curve to tail tip and back
        ctx.quadraticCurveTo(t2x, (ty + actualTipY) / 2, actualTipX, actualTipY);
        ctx.quadraticCurveTo(t1x, (ty + actualTipY) / 2 + 4, t1x, ty);
        
        ctx.lineTo(bx + r, by + boxH);
        ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
      } else {
        // --- TOP TAIL ---
        const tailBaseW = Math.min(32, Math.max(20, boxW * 0.28));
        const tx = Math.max(bx + r + tailBaseW / 2 + 4, Math.min(bx + boxW - r - tailBaseW / 2 - 4, cx + dx * 0.55));
        const t1x = tx - tailBaseW / 2;
        const t2x = tx + tailBaseW / 2;
        const ty = by;

        const actualTipY = Math.min(ty - 18, Math.max(ty - maxTailLen, tailY));
        const actualTipX = tx + (tailX - tx) * 0.85;

        ctx.moveTo(bx + r, by);
        ctx.lineTo(t1x, ty);
        ctx.quadraticCurveTo(t1x, (ty + actualTipY) / 2 - 4, actualTipX, actualTipY);
        ctx.quadraticCurveTo(t2x, (ty + actualTipY) / 2, t2x, ty);
        ctx.lineTo(bx + boxW - r, by);
        ctx.quadraticCurveTo(bx + boxW, by, bx + boxW, by + r);
        ctx.lineTo(bx + boxW, by + boxH - r);
        ctx.quadraticCurveTo(bx + boxW, by + boxH, bx + boxW - r, by + boxH);
        ctx.lineTo(bx + r, by + boxH);
        ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
      }
    } else {
      // Tail is on Left or Right
      if (dx >= 0) {
        // --- RIGHT TAIL ---
        const tailBaseH = Math.min(32, Math.max(20, boxH * 0.35));
        const ty = Math.max(by + r + tailBaseH / 2 + 4, Math.min(by + boxH - r - tailBaseH / 2 - 4, cy + dy * 0.55));
        const t1y = ty - tailBaseH / 2;
        const t2y = ty + tailBaseH / 2;
        const tx = bx + boxW;

        const actualTipX = Math.max(tx + 18, Math.min(tx + maxTailLen, tailX));
        const actualTipY = ty + (tailY - ty) * 0.85;

        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + boxW - r, by);
        ctx.quadraticCurveTo(bx + boxW, by, bx + boxW, by + r);
        ctx.lineTo(tx, t1y);
        ctx.quadraticCurveTo((tx + actualTipX) / 2, t1y, actualTipX, actualTipY);
        ctx.quadraticCurveTo((tx + actualTipX) / 2, t2y, tx, t2y);
        ctx.lineTo(bx + boxW, by + boxH - r);
        ctx.quadraticCurveTo(bx + boxW, by + boxH, bx + boxW - r, by + boxH);
        ctx.lineTo(bx + r, by + boxH);
        ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
      } else {
        // --- LEFT TAIL ---
        const tailBaseH = Math.min(32, Math.max(20, boxH * 0.35));
        const ty = Math.max(by + r + tailBaseH / 2 + 4, Math.min(by + boxH - r - tailBaseH / 2 - 4, cy + dy * 0.55));
        const t1y = ty - tailBaseH / 2;
        const t2y = ty + tailBaseH / 2;
        const tx = bx;

        const actualTipX = Math.min(tx - 18, Math.max(tx - maxTailLen, tailX));
        const actualTipY = ty + (tailY - ty) * 0.85;

        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + boxW - r, by);
        ctx.quadraticCurveTo(bx + boxW, by, bx + boxW, by + r);
        ctx.lineTo(bx + boxW, by + boxH - r);
        ctx.quadraticCurveTo(bx + boxW, by + boxH, bx + boxW - r, by + boxH);
        ctx.lineTo(bx + r, by + boxH);
        ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - r);
        ctx.lineTo(tx, t2y);
        ctx.quadraticCurveTo((tx + actualTipX) / 2, t2y, actualTipX, actualTipY);
        ctx.quadraticCurveTo((tx + actualTipX) / 2, t1y, tx, t1y);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
      }
    }
    ctx.closePath();
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
    strokeWidth = 3,
    style = 'bubble'
  ) {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = 'rgba(109, 129, 150, 0.25)';
    ctx.lineWidth = Math.max(2, strokeWidth);
    ctx.setLineDash([5, 4]);

    const boxW = 140;
    const boxH = 46;
    const bx = bubbleX - boxW / 2;
    const by = bubbleY - boxH / 2;

    if (style === 'thought') {
      drawCloudPath(ctx, bx, by, boxW, boxH);
      ctx.fill();
      ctx.stroke();

      // Thought dots leading to tail
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      const d1x = bubbleX + (tailX - bubbleX) * 0.38;
      const d1y = bubbleY + (tailY - bubbleY) * 0.38;
      const d2x = bubbleX + (tailX - bubbleX) * 0.70;
      const d2y = bubbleY + (tailY - bubbleY) * 0.70;

      ctx.beginPath();
      ctx.arc(d1x, d1y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(d2x, d2y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'frosted') {
      // Frosted Glass card preview
      drawRoundedRectPath(ctx, bx, by, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();

      // Leader line with target dot
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(bubbleX, bubbleY);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(tailX, tailY, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      // Seamless Unified Speech Bubble preview
      drawUnifiedCalloutPath(ctx, bx, by, boxW, boxH, 12, tailX, tailY);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#FFFFE3';
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style === 'thought' ? '💭 Düşünce Bulutu' : (style === 'frosted' ? '✨ Cam Kart' : '💬 Konuşma Balonu'), bubbleX, bubbleY);
    ctx.restore();
  }

  /**
   * Render complete callout speech bubble / thought cloud / frosted card.
   */
  function drawCallout(
    ctx,
    tailX,
    tailY,
    bubbleX,
    bubbleY,
    text,
    color = '#6D8196',
    strokeWidth = 3,
    fontSize = 20,
    style = 'bubble'
  ) {
    if (!ctx || !text) return;
    ctx.save();
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.35;
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'top';

    let maxW = 0;
    lines.forEach(l => {
      const w = ctx.measureText(l).width;
      if (w > maxW) maxW = w;
    });

    const isThought = style === 'thought';
    const isFrosted = style === 'frosted';

    const padX = Math.round(fontSize * (isThought ? 0.9 : 0.8));
    const padY = Math.round(fontSize * (isThought ? 0.65 : 0.55));
    const boxW = Math.max(90, Math.round(maxW + padX * 2));
    const boxH = Math.max(44, Math.round(lines.length * lineHeight + padY * 2));
    const radius = Math.min(14, Math.round(boxH / 3));

    const bx = bubbleX - boxW / 2;
    const by = bubbleY - boxH / 2;

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    if (isThought) {
      // 1. Düşünce Bulutu
      ctx.fillStyle = isFrosted ? 'rgba(28, 36, 48, 0.94)' : 'rgba(18, 22, 30, 0.96)';
      drawCloudPath(ctx, bx, by, boxW, boxH);
      ctx.fill();

      // Thought circles connecting to target
      const d1x = bubbleX + (tailX - bubbleX) * 0.4;
      const d1y = bubbleY + (tailY - bubbleY) * 0.4;
      const d2x = bubbleX + (tailX - bubbleX) * 0.72;
      const d2y = bubbleY + (tailY - bubbleY) * 0.72;

      ctx.beginPath();
      ctx.arc(d1x, d1y, Math.max(5, strokeWidth * 1.6), 0, Math.PI * 2);
      ctx.arc(d2x, d2y, Math.max(3.5, strokeWidth * 1.1), 0, Math.PI * 2);
      ctx.fill();

      // Stroke
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, strokeWidth);
      drawCloudPath(ctx, bx, by, boxW, boxH);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(d1x, d1y, Math.max(5, strokeWidth * 1.6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(d2x, d2y, Math.max(3.5, strokeWidth * 1.1), 0, Math.PI * 2);
      ctx.stroke();

      // Text
      ctx.fillStyle = '#FFFFE3';
      ctx.textAlign = 'center';
      lines.forEach((line, idx) => {
        ctx.fillText(line, bubbleX, by + padY + idx * lineHeight);
      });

    } else if (isFrosted) {
      // 2. Modern Cam Kart & Lider Çizgili Anotasyon (CleanShot X Standardı)
      ctx.fillStyle = 'rgba(24, 30, 40, 0.92)';
      drawRoundedRectPath(ctx, bx, by, boxW, boxH, radius);
      ctx.fill();

      // Frosted card border
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1.5;
      drawRoundedRectPath(ctx, bx, by, boxW, boxH, radius);
      ctx.stroke();

      // Accent pill on left side
      ctx.fillStyle = color;
      drawRoundedRectPath(ctx, bx + 2, by + 6, 4, boxH - 12, 2);
      ctx.fill();

      // Sleek connecting leader line with glowing target dot
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bubbleX, bubbleY > tailY ? by : by + boxH);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // Target pin dot
      ctx.beginPath();
      ctx.arc(tailX, tailY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text
      ctx.fillStyle = '#FFFFE3';
      ctx.textAlign = 'left';
      lines.forEach((line, idx) => {
        ctx.fillText(line, bx + padX + 6, by + padY + idx * lineHeight);
      });

    } else {
      // 3. Ultra-Clean Seamless Speech Bubble (Tek Parça Kusursuz Gövde)
      ctx.fillStyle = 'rgba(22, 26, 34, 0.96)';
      drawUnifiedCalloutPath(ctx, bx, by, boxW, boxH, radius, tailX, tailY);
      ctx.fill();

      // Single continuous stroke outline (zero internal seam lines!)
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, strokeWidth);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      drawUnifiedCalloutPath(ctx, bx, by, boxW, boxH, radius, tailX, tailY);
      ctx.stroke();

      // Text
      ctx.fillStyle = '#FFFFE3';
      ctx.textAlign = 'center';
      lines.forEach((line, idx) => {
        ctx.fillText(line, bubbleX, by + padY + idx * lineHeight);
      });
    }

    ctx.restore();
  }

  window.FullShotCanvas.Text = {
    renderTextOnCanvas,
    drawCalloutPreview,
    drawCallout
  };
})();
