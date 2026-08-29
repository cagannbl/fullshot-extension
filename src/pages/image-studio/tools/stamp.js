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
   * Render a vector QA Badge stamp.
   */
  function renderQABadge(ctx, x, y, preset, scale = 1.0) {
    const s = Math.max(0.6, Math.min(2.5, scale));
    const label = preset.label || 'STATUS';
    const sublabel = preset.sublabel || '';
    const icon = preset.icon || '✓';

    ctx.save();
    ctx.font = `bold ${Math.round(13 * s)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    const labelMetrics = ctx.measureText(label);
    const labelW = labelMetrics.width;

    ctx.font = `600 ${Math.round(9 * s)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const subMetrics = ctx.measureText(sublabel);
    const textW = Math.max(labelW, subMetrics.width);

    const iconW = Math.round(22 * s);
    const padX = Math.round(10 * s);
    const boxW = iconW + textW + padX * 3;
    const boxH = Math.round(38 * s);
    const radius = Math.round(8 * s);

    const bx = x - boxW / 2;
    const by = y - boxH / 2;

    // 1. Drop Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10 * s;
    ctx.shadowOffsetY = 4 * s;

    // 2. Background Pill / Rounded Rect
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
    grad.addColorStop(1, adjustColor(preset.bgColor, -25));
    ctx.fillStyle = grad;
    ctx.fill();

    // 3. Highlight Top Glare Line
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = preset.borderColor || 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = Math.max(1, 1.5 * s);
    if (shapes && shapes.drawRoundedRectPath) {
      shapes.drawRoundedRectPath(ctx, bx, by, boxW, boxH, radius);
    }
    ctx.stroke();

    // 4. Icon Circle Badge (Left Side)
    const iconCx = bx + padX + iconW / 2;
    const iconCy = by + boxH / 2;
    const iconR = Math.round(iconW / 2);

    ctx.beginPath();
    ctx.arc(iconCx, iconCy, iconR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1 * s;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(13 * s)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, iconCx, iconCy + 1);

    // 5. Typography (Main label + Sublabel)
    const textStartX = bx + padX * 2 + iconW;
    ctx.textAlign = 'left';

    if (sublabel) {
      ctx.font = `bold ${Math.round(12 * s)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, textStartX, by + boxH * 0.54);

      ctx.font = `700 ${Math.round(8 * s)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.textBaseline = 'top';
      ctx.fillText(sublabel, textStartX, by + boxH * 0.56);
    } else {
      ctx.font = `bold ${Math.round(14 * s)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, textStartX, by + boxH / 2 + 0.5);
    }

    ctx.restore();
  }

  /**
   * Render realistic 3D Keyboard Keycap stamp.
   */
  function renderKeycap(ctx, x, y, preset, scale = 1.0) {
    const s = Math.max(0.6, Math.min(2.5, scale));
    const key = preset.key || 'Ctrl';

    ctx.save();
    const fontSize = Math.round(14 * s);
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    const textMetrics = ctx.measureText(key);
    const padX = Math.round(14 * s);
    const boxW = Math.max(Math.round(36 * s), textMetrics.width + padX * 2);
    const boxH = Math.round(34 * s);
    const radius = Math.round(6 * s);

    const bx = x - boxW / 2;
    const by = y - boxH / 2;
    const depth = Math.round(4 * s);

    // 1. Bottom 3D Key Base Shadow & Lip
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8 * s;
    ctx.shadowOffsetY = 4 * s;

    ctx.fillStyle = '#181b22';
    const shapes = window.FullShotCanvas.Shapes;
    if (shapes && shapes.drawRoundedRectPath) {
      shapes.drawRoundedRectPath(ctx, bx, by + depth, boxW, boxH, radius);
    } else {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by + depth, boxW, boxH, radius);
      else ctx.rect(bx, by + depth, boxW, boxH);
    }
    ctx.fill();

    // 2. Top Keycap Surface with subtle gradient
    ctx.shadowColor = 'transparent';
    const keyGrad = ctx.createLinearGradient(bx, by, bx, by + boxH);
    keyGrad.addColorStop(0, '#383d48');
    keyGrad.addColorStop(1, '#252932');

    if (shapes && shapes.drawRoundedRectPath) {
      shapes.drawRoundedRectPath(ctx, bx, by, boxW, boxH, radius);
    } else {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, boxW, boxH, radius);
      else ctx.rect(bx, by, boxW, boxH);
    }
    ctx.fillStyle = keyGrad;
    ctx.fill();

    // 3. Top Rim Highlight & Inset Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.stroke();

    // 4. Centered White Engraved Key Legend
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(key, bx + boxW / 2, by + boxH / 2);

    ctx.restore();
  }

  /**
   * Render high-res emoji sticker stamp.
   */
  function renderEmoji(ctx, x, y, preset, scale = 1.0) {
    const s = Math.max(0.6, Math.min(2.5, scale));
    const char = preset.char || '⭐';
    const fontSize = Math.round(36 * s);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 8 * s;
    ctx.shadowOffsetY = 3 * s;

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
   * Draw interactive stamp preview hovering under cursor.
   */
  function drawStampPreview(ctx, x, y, stampId = 'approved', scale = 1.0) {
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = 0.85;
    drawStamp(ctx, x, y, stampId, scale);
    ctx.restore();
  }

  window.FullShotCanvas.Stamp = {
    STAMP_PRESETS,
    drawStamp,
    drawStampPreview
  };
})();
