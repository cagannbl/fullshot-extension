/**
 * FullShot Pro - Watermark & Text Stamp Engine
 * Renders high-contrast pill badges, neon accent stamps, subtle overlays,
 * and large diagonal confidentiality watermarks with full Unicode and Turkish character support.
 */

/**
 * Draws a rounded rectangle helper.
 */
function drawWatermarkRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/**
 * Renders a watermark or stamp on the specified 2D canvas context.
 * @param {CanvasRenderingContext2D} ctx - Target 2D canvas context
 * @param {string} text - Watermark text
 * @param {string} position - 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'
 * @param {string} style - 'pill' | 'accent' | 'subtle' | 'diagonal'
 * @param {number} canvasW - Canvas width
 * @param {number} canvasH - Canvas height
 */
function renderWatermark(ctx, text, position = 'bottom-right', style = 'pill', canvasW = null, canvasH = null) {
  if (!text || !ctx) return;
  ctx.save();

  const width = canvasW || ctx.canvas?.width || 1200;
  const height = canvasH || ctx.canvas?.height || 800;

  if (position === 'center' || style === 'diagonal') {
    // Large diagonal watermark across canvas
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 6); // -30 degrees
    const fontSize = Math.max(32, Math.min(110, Math.round(width / 18)));
    ctx.font = `800 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (style === 'accent') {
      ctx.fillStyle = 'rgba(109, 129, 150, 0.28)';
      ctx.strokeStyle = 'rgba(109, 129, 150, 0.45)';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    }
    ctx.lineWidth = 2;
    ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);
    ctx.restore();
    return;
  }

  // Corner Watermarks
  const fontSize = Math.max(14, Math.min(28, Math.round(width / 70)));
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  const margin = Math.round(fontSize * 1.5);
  const paddingX = Math.round(fontSize * 0.8);
  const paddingY = Math.round(fontSize * 0.45);
  const textMetrics = ctx.measureText(text);
  const boxW = textMetrics.width + paddingX * 2;
  const boxH = fontSize * 1.35 + paddingY * 2;

  let boxX = 0;
  let boxY = 0;

  if (position === 'bottom-right') {
    boxX = width - boxW - margin;
    boxY = height - boxH - margin;
  } else if (position === 'bottom-left') {
    boxX = margin;
    boxY = height - boxH - margin;
  } else if (position === 'top-right') {
    boxX = width - boxW - margin;
    boxY = margin;
  } else if (position === 'top-left') {
    boxX = margin;
    boxY = margin;
  }

  if (style === 'pill') {
    // Dark pill capsule (High contrast & readable on any background)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = 'rgba(18, 20, 26, 0.88)';
    drawWatermarkRoundedRect(ctx, boxX, boxY, boxW, boxH, boxH / 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFE3';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, boxX + paddingX, boxY + paddingY + 1);
  } else if (style === 'accent') {
    // Slate Blue badge with glow
    ctx.shadowColor = 'rgba(109, 129, 150, 0.5)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = 'rgba(30, 36, 46, 0.94)';
    drawWatermarkRoundedRect(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#6D8196';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#00d2ff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, boxX + paddingX, boxY + paddingY + 1);
  } else {
    // Subtle transparent drop shadow text
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = 'rgba(255, 255, 227, 0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, boxX + paddingX, boxY + paddingY);
  }

  ctx.restore();
}

/**
 * Returns formatted watermark preset values.
 */
function getWatermarkPresets(pageUrl = '') {
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return {
    url: pageUrl || 'https://fullshot.app',
    date: `📅 ${dateStr} ${timeStr}`,
    brand: '⚡ FullShot Pro',
    confidential: '🔒 GİZLİ / CONFIDENTIAL'
  };
}

// Global Export
if (typeof window !== 'undefined') {
  window.FullShotWatermark = {
    renderWatermark,
    getWatermarkPresets
  };
}
