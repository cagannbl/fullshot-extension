/**
 * FullShot Pro - QA Stamp & Keycap / Emoji Sticker Tool
 * Rich vector stamps for QA reviews ([APPROVED], [BUG], [REVIEW], [CRITICAL]),
 * 3D isometric keyboard keycaps ([Ctrl], [Shift], [Enter]), and vibrant emoji markers.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Stamp Presets Catalog
   */
  const STAMP_PRESETS = {
    // 1. QA & Status Badges
    'approved': {
      category: 'qa',
      type: 'badge',
      label: 'ONAYLANDI',
      sublabel: 'APPROVED',
      icon: '✓',
      bgColor: '#059669',
      borderColor: '#34d399',
      textColor: '#ffffff'
    },
    'bug': {
      category: 'qa',
      type: 'badge',
      label: 'HATA / BUG',
      sublabel: 'FIX REQUIRED',
      icon: '⚡',
      bgColor: '#dc2626',
      borderColor: '#f87171',
      textColor: '#ffffff'
    },
    'review': {
      category: 'qa',
      type: 'badge',
      label: 'REVİZE',
      sublabel: 'IN REVIEW',
      icon: '↻',
      bgColor: '#d97706',
      borderColor: '#fbbf24',
      textColor: '#ffffff'
    },
    'critical': {
      category: 'qa',
      type: 'badge',
      label: 'ÖNEMLİ',
      sublabel: 'CRITICAL',
      icon: '!',
      bgColor: '#7c3aed',
      borderColor: '#a78bfa',
      textColor: '#ffffff'
    },
    'rejected': {
      category: 'qa',
      type: 'badge',
      label: 'REDDEDİLDİ',
      sublabel: 'REJECTED',
      icon: '✕',
      bgColor: '#4b5563',
      borderColor: '#9ca3af',
      textColor: '#ffffff'
    },

    // 2. 3D Keycaps
    'key-ctrl': { category: 'key', type: 'keycap', key: 'Ctrl' },
    'key-shift': { category: 'key', type: 'keycap', key: 'Shift' },
    'key-enter': { category: 'key', type: 'keycap', key: 'Enter ↵' },
    'key-alt': { category: 'key', type: 'keycap', key: 'Alt' },
    'key-esc': { category: 'key', type: 'keycap', key: 'Esc' },
    'key-cmd': { category: 'key', type: 'keycap', key: '⌘ Cmd' },
    'key-tab': { category: 'key', type: 'keycap', key: 'Tab ⇥' },
    'key-space': { category: 'key', type: 'keycap', key: 'Space ␣' },

    // 3. Emojis
    'emoji-check': { category: 'emoji', type: 'emoji', char: '✅' },
    'emoji-cross': { category: 'emoji', type: 'emoji', char: '❌' },
    'emoji-warning': { category: 'emoji', type: 'emoji', char: '⚠️' },
    'emoji-rocket': { category: 'emoji', type: 'emoji', char: '🚀' },
    'emoji-bulb': { category: 'emoji', type: 'emoji', char: '💡' },
    'emoji-bug': { category: 'emoji', type: 'emoji', char: '🐛' },
    'emoji-fire': { category: 'emoji', type: 'emoji', char: '🔥' },
    'emoji-target': { category: 'emoji', type: 'emoji', char: '🎯' },
    'emoji-like': { category: 'emoji', type: 'emoji', char: '👍' },
    'emoji-dislike': { category: 'emoji', type: 'emoji', char: '👎' },
    'emoji-star': { category: 'emoji', type: 'emoji', char: '⭐' },
    'emoji-lock': { category: 'emoji', type: 'emoji', char: '🔒' }
  };

  /**
   * Draw crisp pure vector icon inside badge circle.
   */
  function drawBadgeVectorIcon(ctx, iconType, cx, cy, s) {
    ctx.save();

    switch (iconType) {
      case '✓':
        ctx.beginPath();
        ctx.moveTo(cx - 4.5 * s, cy - 0.2 * s);
        ctx.lineTo(cx - 1.2 * s, cy + 3.2 * s);
        ctx.lineTo(cx + 4.8 * s, cy - 3.8 * s);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, 2.2 * s);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        break;

      case '⚡':
        ctx.beginPath();
        ctx.moveTo(cx + 0.8 * s, cy - 5.5 * s);
        ctx.lineTo(cx - 4.2 * s, cy + 0.2 * s);
        ctx.lineTo(cx - 0.5 * s, cy + 0.2 * s);
        ctx.lineTo(cx - 1.5 * s, cy + 5.5 * s);
        ctx.lineTo(cx + 4.2 * s, cy - 0.2 * s);
        ctx.lineTo(cx + 0.5 * s, cy - 0.2 * s);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        break;

      case '↻':
        ctx.beginPath();
        ctx.arc(cx, cy, 4.2 * s, -Math.PI * 0.75, Math.PI * 0.85);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.4, 2.0 * s);
        ctx.lineCap = 'round';
        ctx.stroke();
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(cx + 5.2 * s, cy + 1.8 * s);
        ctx.lineTo(cx + 1.8 * s, cy + 5.0 * s);
        ctx.lineTo(cx + 1.8 * s, cy + 0.2 * s);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        break;

      case '!':
        ctx.beginPath();
        ctx.moveTo(cx, cy - 4.8 * s);
        ctx.lineTo(cx, cy + 0.8 * s);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, 2.2 * s);
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy + 4.2 * s, Math.max(0.8, 1.2 * s), 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        break;

      case '✕':
      default:
        ctx.beginPath();
        ctx.moveTo(cx - 3.5 * s, cy - 3.5 * s);
        ctx.lineTo(cx + 3.5 * s, cy + 3.5 * s);
        ctx.moveTo(cx + 3.5 * s, cy - 3.5 * s);
        ctx.lineTo(cx - 3.5 * s, cy + 3.5 * s);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, 2.2 * s);
        ctx.lineCap = 'round';
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  /**
   * Render Ultra-High-Definition QA Badge stamp with pure vector icons and resolution scaling.
   */
  function renderQABadge(ctx, x, y, preset, scale = 1.0) {
    const canvasW = ctx.canvas ? ctx.canvas.width : 1200;
    const resMultiplier = Math.max(1.15, Math.min(2.4, canvasW / 1100));
    const s = scale * resMultiplier;

    const label = preset.label || 'STATUS';
    const sublabel = preset.sublabel || '';
    const icon = preset.icon || '✓';

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Calculate typography dimensions
    const fontStack = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.font = `800 ${Math.round(13.5 * s)}px ${fontStack}`;
    const labelMetrics = ctx.measureText(label);
    const labelW = labelMetrics.width;

    ctx.font = `700 ${Math.round(8.5 * s)}px ${fontStack}`;
    const subMetrics = ctx.measureText(sublabel);
    const textW = Math.max(labelW, subMetrics.width);

    const iconW = Math.round(24 * s);
    const padX = Math.round(12 * s);
    const boxW = Math.round(iconW + textW + padX * 2.8);
    const boxH = Math.round(44 * s);
    const radius = Math.round(9 * s);

    const bx = Math.round(x - boxW / 2);
    const by = Math.round(y - boxH / 2);

    // 2. Diffused Glassmorphism Drop Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.48)';
    ctx.shadowBlur = Math.round(12 * s);
    ctx.shadowOffsetY = Math.round(4 * s);

    // 3. Background Pill / Rounded Rect with Dual Saturated Gradient
    const shapes = window.FullShotCanvas.Shapes;
    if (shapes && shapes.drawRoundedRectPath) {
      shapes.drawRoundedRectPath(ctx, bx, by, boxW, boxH, radius);
    } else {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, boxW, boxH, radius);
      else ctx.rect(bx, by, boxW, boxH);
    }

    const grad = ctx.createLinearGradient(bx, by, bx, by + boxH);
    grad.addColorStop(0, preset.bgColor);
    grad.addColorStop(1, adjustColor(preset.bgColor, -35));
    ctx.fillStyle = grad;
    ctx.fill();

    // 4. Highlight Top Glare Bevel Stroke
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = preset.borderColor || 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = Math.max(1.2, 1.6 * s);
    if (shapes && shapes.drawRoundedRectPath) {
      shapes.drawRoundedRectPath(ctx, bx, by, boxW, boxH, radius);
    }
    ctx.stroke();

    // Inner top glossy white highlight arc
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx + 1, by + 1, boxW - 2, Math.round(boxH * 0.45), radius);
    ctx.clip();
    const glossGrad = ctx.createLinearGradient(bx, by, bx, by + boxH * 0.45);
    glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
    ctx.fillStyle = glossGrad;
    ctx.fill();
    ctx.restore();

    // 5. Left Icon Circle Container
    const iconCx = Math.round(bx + padX + iconW / 2);
    const iconCy = Math.round(by + boxH / 2);
    const iconR = Math.round(iconW / 2);

    ctx.beginPath();
    ctx.arc(iconCx, iconCy, iconR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.stroke();

    // 6. Draw Pure Vector Icon
    drawBadgeVectorIcon(ctx, icon, iconCx, iconCy, s);

    // 7. Typography (Main label + Sublabel)
    const textStartX = Math.round(bx + padX * 1.8 + iconW);
    ctx.textAlign = 'left';

    if (sublabel) {
      // Main Label
      ctx.font = `800 ${Math.round(13 * s)}px ${fontStack}`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 3 * s;
      ctx.shadowOffsetY = 1;
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, textStartX, Math.round(by + boxH * 0.54));

      // Sublabel
      ctx.font = `700 ${Math.round(8.5 * s)}px ${fontStack}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowColor = 'transparent';
      ctx.textBaseline = 'top';
      ctx.fillText(sublabel, textStartX, Math.round(by + boxH * 0.56));
    } else {
      ctx.font = `800 ${Math.round(14.5 * s)}px ${fontStack}`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, textStartX, Math.round(by + boxH / 2));
    }

    ctx.restore();
  }

  /**
   * Render Ultra-Crisp 3D Keyboard Keycap stamp.
   */
  function renderKeycap(ctx, x, y, preset, scale = 1.0) {
    const canvasW = ctx.canvas ? ctx.canvas.width : 1200;
    const resMultiplier = Math.max(1.15, Math.min(2.4, canvasW / 1100));
    const s = scale * resMultiplier;

    const key = preset.key || 'Ctrl';
    const fontStack = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const fontSize = Math.round(15 * s);
    ctx.font = `700 ${fontSize}px ${fontStack}`;

    const textMetrics = ctx.measureText(key);
    const padX = Math.round(16 * s);
    const boxW = Math.max(Math.round(42 * s), Math.round(textMetrics.width + padX * 2));
    const boxH = Math.round(40 * s);
    const radius = Math.round(7 * s);

    const bx = Math.round(x - boxW / 2);
    const by = Math.round(y - boxH / 2);
    const depth = Math.round(5 * s);

    // 1. Bottom 3D Metallic Base
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = Math.round(10 * s);
    ctx.shadowOffsetY = Math.round(5 * s);

    ctx.fillStyle = '#101216';
    const shapes = window.FullShotCanvas.Shapes;
    if (shapes && shapes.drawRoundedRectPath) {
      shapes.drawRoundedRectPath(ctx, bx, by + depth, boxW, boxH, radius);
    } else {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by + depth, boxW, boxH, radius);
      else ctx.rect(bx, by + depth, boxW, boxH);
    }
    ctx.fill();

    // 2. Top Keycap Surface with subtle dark texture
    ctx.shadowColor = 'transparent';
    const keyGrad = ctx.createLinearGradient(bx, by, bx, by + boxH);
    keyGrad.addColorStop(0, '#3c414c');
    keyGrad.addColorStop(1, '#22252c');

    if (shapes && shapes.drawRoundedRectPath) {
      shapes.drawRoundedRectPath(ctx, bx, by, boxW, boxH, radius);
    } else {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, boxW, boxH, radius);
      else ctx.rect(bx, by, boxW, boxH);
    }
    ctx.fillStyle = keyGrad;
    ctx.fill();

    // 3. Top Rim Bevel Highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = Math.max(1.2, 1.4 * s);
    ctx.stroke();

    // 4. Centered White Engraved Key Legend
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 2 * s;
    ctx.shadowOffsetY = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(key, Math.round(bx + boxW / 2), Math.round(by + boxH / 2 - 0.5));

    ctx.restore();
  }

  /**
   * Render high-res emoji sticker stamp.
   */
  function renderEmoji(ctx, x, y, preset, scale = 1.0) {
    const canvasW = ctx.canvas ? ctx.canvas.width : 1200;
    const resMultiplier = Math.max(1.15, Math.min(2.4, canvasW / 1100));
    const s = scale * resMultiplier;

    const char = preset.char || '⭐';
    const fontSize = Math.round(44 * s);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = Math.round(10 * s);
    ctx.shadowOffsetY = Math.round(4 * s);

    ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, x, y);
    ctx.restore();
  }

  /**
   * Helper to darken/lighten hex colors.
   */
  function adjustColor(hex, amount) {
    let color = hex.replace('#', '');
    if (color.length === 3) {
      color = color.split('').map(c => c + c).join('');
    }
    const num = parseInt(color, 16);
    let r = Math.max(0, Math.min(255, (num >> 16) + amount));
    let g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
    let b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Primary Draw Stamp function.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x Center X
   * @param {number} y Center Y
   * @param {string} stampId Preset ID (e.g. 'approved', 'key-ctrl', 'emoji-rocket')
   * @param {number} [scale=1.0]
   */
  function drawStamp(ctx, x, y, stampId = 'approved', scale = 1.0) {
    if (!ctx) return;
    const preset = STAMP_PRESETS[stampId] || STAMP_PRESETS['approved'];

    if (preset.type === 'keycap') {
      renderKeycap(ctx, x, y, preset, scale);
    } else if (preset.type === 'emoji') {
      renderEmoji(ctx, x, y, preset, scale);
    } else {
      renderQABadge(ctx, x, y, preset, scale);
    }
  }

  /**
   * Draw interactive live stamp preview hovering under cursor before placement.
   * Renders a smooth semi-transparent ghost with a subtle placement glow.
   * 
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x Center X
   * @param {number} y Center Y
   * @param {string} stampId Preset ID (e.g. 'approved', 'bug', 'key-ctrl', 'emoji-rocket')
   * @param {number} [scale=1.0]
   */
  function drawStampPreview(ctx, x, y, stampId = 'approved', scale = 1.0) {
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = 0.80; // Sleek semi-transparent preview ghost
    drawStamp(ctx, x, y, stampId, scale);
    ctx.restore();
  }

  window.FullShotCanvas.Stamp = {
    STAMP_PRESETS,
    drawStamp,
    drawStampPreview
  };
})();
