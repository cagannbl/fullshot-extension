/**
 * FullShot Pro - macOS Mockup Beautifier & 3D Window Frame Engine
 * Renders high-resolution macOS window frames with traffic light buttons (🔴🟡🟢),
 * realistic 3D shadows, customizable padding, and 6 gradient backdrop themes.
 */

const MOCKUP_THEMES = {
  obsidian: {
    name: 'Obsidian Dark',
    stops: ['#111215', '#1e2025', '#0d0e11']
  },
  sunset: {
    name: 'Sunset Glow',
    stops: ['#4338ca', '#a855f7', '#f43f5e']
  },
  cyber: {
    name: 'Neon Cyber',
    stops: ['#090a0f', '#1e1b4b', '#059669']
  },
  slate: {
    name: 'Slate Minimalist',
    stops: ['#2b323c', '#485461', '#28313b']
  },
  arctic: {
    name: 'Arctic White',
    stops: ['#f8fafc', '#e2e8f0', '#cbd5e1']
  },
  emerald: {
    name: 'Emerald Glass',
    stops: ['#064e3b', '#047857', '#10b981']
  }
};

/**
 * Draws a rounded rectangle path cross-browser.
 */
function drawRoundedRectPath(ctx, x, y, width, height, radius) {
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
 * Generates an export-ready HTML5 Canvas containing the framed mockup.
 * @param {HTMLCanvasElement} sourceCanvas - Original canvas with screenshot + annotations
 * @param {Object} config - { theme, padding, hasHeader, shadow, title }
 * @returns {HTMLCanvasElement}
 */
function generateMockupCanvas(sourceCanvas, config = {}) {
  if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) {
    throw new Error('Geçersiz kaynak tuval.');
  }

  const themeKey = config.theme || 'obsidian';
  const theme = MOCKUP_THEMES[themeKey] || MOCKUP_THEMES.obsidian;
  const padding = typeof config.padding === 'number' ? config.padding : 44;
  const hasHeader = config.hasHeader !== false;
  const shadow = config.shadow || 'deep';
  const displayTitle = (config.title || 'Ekran Görüntüsü').slice(0, 48);

  const headerHeight = hasHeader ? 42 : 0;
  const windowRadius = 14;

  const windowW = sourceCanvas.width;
  const windowH = sourceCanvas.height + headerHeight;

  const totalW = windowW + padding * 2;
  const totalH = windowH + padding * 2;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = totalW;
  outCanvas.height = totalH;
  const mCtx = outCanvas.getContext('2d');
  mCtx.imageSmoothingEnabled = true;
  mCtx.imageSmoothingQuality = 'high';

  // 1. Draw Gradient Backdrop Theme
  const grad = mCtx.createLinearGradient(0, 0, totalW, totalH);
  grad.addColorStop(0, theme.stops[0]);
  grad.addColorStop(0.5, theme.stops[1]);
  grad.addColorStop(1, theme.stops[2]);
  mCtx.fillStyle = grad;
  mCtx.fillRect(0, 0, totalW, totalH);

  const winX = padding;
  const winY = padding;

  // 2. Realistic 3D Window Drop Shadow
  if (shadow !== 'none') {
    mCtx.save();
    mCtx.shadowColor = shadow === 'deep' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.35)';
    mCtx.shadowBlur = shadow === 'deep' ? 60 : 25;
    mCtx.shadowOffsetX = 0;
    mCtx.shadowOffsetY = shadow === 'deep' ? 25 : 10;
    mCtx.fillStyle = '#1c1e22';
    drawRoundedRectPath(mCtx, winX, winY, windowW, windowH, windowRadius);
    mCtx.fill();
    mCtx.restore();
  }

  // 3. Clip and Render Window Interior
  mCtx.save();
  drawRoundedRectPath(mCtx, winX, winY, windowW, windowH, windowRadius);
  mCtx.clip();

  // Window Base Background
  mCtx.fillStyle = '#1f2125';
  mCtx.fillRect(winX, winY, windowW, windowH);

  // 4. Window Header Title Bar (macOS style)
  if (hasHeader) {
    mCtx.fillStyle = '#26282e';
    mCtx.fillRect(winX, winY, windowW, headerHeight);

    // Bottom border
    mCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    mCtx.lineWidth = 1;
    mCtx.beginPath();
    mCtx.moveTo(winX, winY + headerHeight);
    mCtx.lineTo(winX + windowW, winY + headerHeight);
    mCtx.stroke();

    // Traffic Lights: Red (Close), Yellow (Minimize), Green (Maximize)
    const dotY = winY + headerHeight / 2;
    const dotRadius = 5.5;

    // Red (🔴 Close)
    mCtx.beginPath();
    mCtx.arc(winX + 18, dotY, dotRadius, 0, Math.PI * 2);
    mCtx.fillStyle = '#ff5f56';
    mCtx.fill();
    mCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    mCtx.lineWidth = 0.8;
    mCtx.stroke();

    // Yellow (🟡 Minimize)
    mCtx.beginPath();
    mCtx.arc(winX + 36, dotY, dotRadius, 0, Math.PI * 2);
    mCtx.fillStyle = '#ffbd2e';
    mCtx.fill();
    mCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    mCtx.lineWidth = 0.8;
    mCtx.stroke();

    // Green (🟢 Maximize)
    mCtx.beginPath();
    mCtx.arc(winX + 54, dotY, dotRadius, 0, Math.PI * 2);
    mCtx.fillStyle = '#27c93f';
    mCtx.fill();
    mCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    mCtx.lineWidth = 0.8;
    mCtx.stroke();

    // Centered Address Pill
    const pillWidth = Math.min(420, Math.max(140, windowW - 170));
    const pillHeight = 24;
    const pillX = winX + (windowW - pillWidth) / 2;
    const pillY = winY + (headerHeight - pillHeight) / 2;

    mCtx.fillStyle = '#1c1d21';
    mCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    mCtx.lineWidth = 1;
    drawRoundedRectPath(mCtx, pillX, pillY, pillWidth, pillHeight, 6);
    mCtx.fill();
    mCtx.stroke();

    // Title/URL text in pill
    mCtx.fillStyle = '#CBCBCB';
    mCtx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    mCtx.textAlign = 'center';
    mCtx.textBaseline = 'middle';
    mCtx.fillText(displayTitle, pillX + pillWidth / 2, pillY + pillHeight / 2);
  }

  // 5. Draw the Main Screenshot
  mCtx.drawImage(sourceCanvas, winX, winY + headerHeight, windowW, sourceCanvas.height);
  mCtx.restore();

  return outCanvas;
}

/**
 * Renders a live preview of the mockup onto a preview canvas element.
 */
function renderMockupPreview(sourceCanvas, previewCanvas, config = {}) {
  if (!sourceCanvas || !previewCanvas) return;
  const rendered = generateMockupCanvas(sourceCanvas, config);
  previewCanvas.width = rendered.width;
  previewCanvas.height = rendered.height;
  const pCtx = previewCanvas.getContext('2d');
  pCtx.drawImage(rendered, 0, 0);
}

// Global Export
if (typeof window !== 'undefined') {
  window.FullShotMockup = {
    MOCKUP_THEMES,
    drawRoundedRectPath,
    generateMockupCanvas,
    renderMockupPreview
  };
}
