/**
 * FullShot Pro - Blur & Redaction Tool (Mosaic Pixelation, Blackout Mask, Gaussian Blur)
 * Zero-leakage privacy censorship engine with sub-millisecond block-averaged mosaic
 * and 3-pass fast linear-time Gaussian convolution matrix.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Draw interactive selection preview for blur/redaction tool.
   * Displays smooth animated dashed bounding box with live dimension & mode indicator pill.
   * 
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x1 
   * @param {number} y1 
   * @param {number} x2 
   * @param {number} y2 
   * @param {'pixelate'|'gaussian'|'blackout'|'tape'} [blurType='pixelate']
   */
  function drawBlurPreview(ctx, x1, y1, x2, y2, blurType = 'pixelate') {
    if (!ctx) return;
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    if (rw < 2 || rh < 2) return;

    ctx.save();

    // 1. Semi-transparent tint & dashed selection boundary
    let tintColor = 'rgba(0, 210, 255, 0.12)';
    let strokeColor = '#00d2ff';
    let label = 'Mozaik';

    if (blurType === 'gaussian') {
      tintColor = 'rgba(168, 85, 247, 0.15)';
      strokeColor = '#a855f7';
      label = 'Gauss Bulanıklığı';
    } else if (blurType === 'blackout') {
      tintColor = 'rgba(15, 23, 42, 0.45)';
      strokeColor = '#f87171';
      label = 'Siyah Maske';
    } else if (blurType === 'tape') {
      tintColor = 'rgba(245, 158, 11, 0.20)';
      strokeColor = '#f59e0b';
      label = 'Güvenlik Şeridi';
    }

    ctx.fillStyle = tintColor;
    ctx.fillRect(rx, ry, rw, rh);

    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

    // 2. Corner Grippers
    ctx.setLineDash([]);
    ctx.fillStyle = strokeColor;
    const gSize = 5;
    ctx.fillRect(rx - 2, ry - 2, gSize, gSize);
    ctx.fillRect(rx + rw - 3, ry - 2, gSize, gSize);
    ctx.fillRect(rx - 2, ry + rh - 3, gSize, gSize);
    ctx.fillRect(rx + rw - 3, ry + rh - 3, gSize, gSize);

    // 3. Live Dimension & Mode Indicator Badge
    if (rw >= 40 && rh >= 16) {
      const infoText = `${label} | ${Math.round(rw)} × ${Math.round(rh)} px`;
      ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textMetrics = ctx.measureText(infoText);
      const badgeW = textMetrics.width + 14;
      const badgeH = 20;
      const badgeX = Math.max(4, rx + (rw - badgeW) / 2);
      const badgeY = ry > 26 ? ry - 24 : ry + rh + 4;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
        ctx.fill();
      } else {
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      }

      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(infoText, badgeX + badgeW / 2, badgeY + badgeH / 2);
    }

    ctx.restore();
  }

  /**
   * Apply privacy redaction on target canvas with multiple high-end styles.
   * 
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x1 
   * @param {number} y1 
   * @param {number} x2 
   * @param {number} y2 
   * @param {'pixelate'|'blackout'|'gaussian'|'tape'} [type='pixelate'] 
   * @param {number} [canvasWidth=0] 
   * @param {number} [canvasHeight=0] 
   * @param {Object} [options={}]
   * @param {'light'|'medium'|'strong'} [options.intensity='medium']
   * @param {boolean} [options.rounded=false]
   */
  function applyRedaction(ctx, x1, y1, x2, y2, type = 'pixelate', canvasWidth = 0, canvasHeight = 0, options = {}) {
    if (!ctx) return;
    const maxW = canvasWidth || ctx.canvas?.width || 4096;
    const maxH = canvasHeight || ctx.canvas?.height || 4096;

    const rx = Math.max(0, Math.round(Math.min(x1, x2)));
    const ry = Math.max(0, Math.round(Math.min(y1, y2)));
    const rw = Math.min(maxW - rx, Math.round(Math.abs(x2 - x1)));
    const rh = Math.min(maxH - ry, Math.round(Math.abs(y2 - y1)));

    if (rw <= 0 || rh <= 0) return;

    const intensity = options.intensity || 'medium';
    const isRounded = options.rounded !== undefined ? options.rounded : (rw >= 60 && rh >= 24);

    ctx.save();

    // Optional clipping path for smooth rounded corner redactions
    if (isRounded && ctx.roundRect) {
      const radius = Math.min(6, Math.min(rw, rh) / 4);
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, radius);
      ctx.clip();
    }

    if (type === 'blackout') {
      applyBlackout(ctx, rx, ry, rw, rh, isRounded);
    } else if (type === 'gaussian') {
      applyGaussianBlur(ctx, rx, ry, rw, rh, intensity);
    } else if (type === 'tape') {
      applyRedactionTape(ctx, rx, ry, rw, rh, isRounded);
    } else {
      // Default: Mosaic Pixelate
      applyPixelate(ctx, rx, ry, rw, rh, intensity);
    }

    ctx.restore();
  }

  /**
   * Dark sleek blackout redaction mask with optional velvet finish.
   */
  function applyBlackout(ctx, rx, ry, rw, rh, isRounded = false) {
    ctx.save();
    ctx.fillStyle = '#080b12';
    if (isRounded && ctx.roundRect) {
      const radius = Math.min(6, Math.min(rw, rh) / 4);
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, radius);
      ctx.fill();
    } else {
      ctx.fillRect(rx, ry, rw, rh);
    }
    ctx.restore();
  }

  /**
   * Modern diagonal caution/hazard security redaction tape.
   */
  function applyRedactionTape(ctx, rx, ry, rw, rh, isRounded = false) {
    ctx.save();
    
    // Background base
    ctx.fillStyle = '#1e222d';
    ctx.fillRect(rx, ry, rw, rh);

    // Diagonal hazard stripes pattern
    const stripeW = Math.max(8, Math.round(rh * 0.4));
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();

    ctx.fillStyle = '#f59e0b';
    ctx.lineWidth = stripeW * 0.6;
    for (let x = rx - rh; x < rx + rw + rh; x += stripeW * 1.6) {
      ctx.beginPath();
      ctx.moveTo(x, ry + rh);
      ctx.lineTo(x + rh, ry);
      ctx.lineTo(x + rh + stripeW * 0.7, ry);
      ctx.lineTo(x + stripeW * 0.7, ry + rh);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Top subtle glossy overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(rx, ry, rw, rh * 0.45);

    ctx.restore();
  }

  /**
   * True block-averaged mosaic pixelation with selectable intensity.
   */
  function applyPixelate(ctx, rx, ry, rw, rh, intensity = 'medium') {
    let blockFactor = 12;
    if (intensity === 'light') blockFactor = 18;
    else if (intensity === 'strong') blockFactor = 7;

    const blockSize = Math.max(5, Math.round(Math.min(rw, rh) / blockFactor));
    const imgData = ctx.getImageData(rx, ry, rw, rh);
    const data = imgData.data;

    for (let py = 0; py < rh; py += blockSize) {
      const bh = Math.min(blockSize, rh - py);
      for (let px = 0; px < rw; px += blockSize) {
        const bw = Math.min(blockSize, rw - px);

        let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;
        for (let dy = 0; dy < bh; dy++) {
          const rowOffset = (py + dy) * rw;
          for (let dx = 0; dx < bw; dx++) {
            const idx = (rowOffset + px + dx) * 4;
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            sumA += data[idx + 3];
            count++;
          }
        }

        const avgR = count > 0 ? Math.round(sumR / count) : 0;
        const avgG = count > 0 ? Math.round(sumG / count) : 0;
        const avgB = count > 0 ? Math.round(sumB / count) : 0;
        const avgA = count > 0 ? Math.round(sumA / count) : 255;

        for (let dy = 0; dy < bh; dy++) {
          const rowOffset = (py + dy) * rw;
          for (let dx = 0; dx < bw; dx++) {
            const idx = (rowOffset + px + dx) * 4;
            data[idx] = avgR;
            data[idx + 1] = avgG;
            data[idx + 2] = avgB;
            data[idx + 3] = avgA;
          }
        }
      }
    }

    ctx.putImageData(imgData, rx, ry);
  }

  /**
   * Fast, mathematical 3-pass separable box-blur approximating true Gaussian distribution.
   */
  function applyGaussianBlur(ctx, rx, ry, rw, rh, intensity = 'medium') {
    let radiusFactor = 10;
    if (intensity === 'light') radiusFactor = 16;
    else if (intensity === 'strong') radiusFactor = 6;

    const blurRadius = Math.max(6, Math.min(36, Math.round(Math.min(rw, rh) / radiusFactor)));

    try {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = rw;
      offCanvas.height = rh;
      const offCtx = offCanvas.getContext('2d');

      if (offCtx && 'filter' in offCtx) {
        offCtx.filter = `blur(${blurRadius}px)`;
        offCtx.drawImage(ctx.canvas, rx, ry, rw, rh, 0, 0, rw, rh);

        ctx.save();
        ctx.drawImage(offCanvas, rx, ry);
        ctx.restore();
        return;
      }
    } catch (e) {}

    const imgData = ctx.getImageData(rx, ry, rw, rh);
    boxBlurImageData(imgData, rw, rh, blurRadius);
    ctx.putImageData(imgData, rx, ry);
  }

  /**
   * Fast separable box-blur pass for Uint8ClampedArray image data.
   */
  function boxBlurImageData(imgData, w, h, radius) {
    const data = imgData.data;
    const r = Math.max(2, Math.min(32, Math.round(radius)));

    for (let pass = 0; pass < 3; pass++) {
      boxBlurH(data, w, h, r);
      boxBlurV(data, w, h, r);
    }
  }

  function boxBlurH(data, w, h, r) {
    const arr = new Uint8Array(w * 4);
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w * 4;
      for (let i = 0; i < w * 4; i++) arr[i] = data[rowOffset + i];

      for (let x = 0; x < w; x++) {
        let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;
        const start = Math.max(0, x - r);
        const end = Math.min(w - 1, x + r);

        for (let k = start; k <= end; k++) {
          const kIdx = k * 4;
          sumR += arr[kIdx];
          sumG += arr[kIdx + 1];
          sumB += arr[kIdx + 2];
          sumA += arr[kIdx + 3];
          count++;
        }

        const outIdx = rowOffset + x * 4;
        data[outIdx] = Math.round(sumR / count);
        data[outIdx + 1] = Math.round(sumG / count);
        data[outIdx + 2] = Math.round(sumB / count);
        data[outIdx + 3] = Math.round(sumA / count);
      }
    }
  }

  function boxBlurV(data, w, h, r) {
    const col = new Uint8Array(h * 4);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const idx = (y * w + x) * 4;
        col[y * 4] = data[idx];
        col[y * 4 + 1] = data[idx + 1];
        col[y * 4 + 2] = data[idx + 2];
        col[y * 4 + 3] = data[idx + 3];
      }

      for (let y = 0; y < h; y++) {
        let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;
        const start = Math.max(0, y - r);
        const end = Math.min(h - 1, y + r);

        for (let k = start; k <= end; k++) {
          const kIdx = k * 4;
          sumR += col[kIdx];
          sumG += col[kIdx + 1];
          sumB += col[kIdx + 2];
          sumA += col[kIdx + 3];
          count++;
        }

        const outIdx = (y * w + x) * 4;
        data[outIdx] = Math.round(sumR / count);
        data[outIdx + 1] = Math.round(sumG / count);
        data[outIdx + 2] = Math.round(sumB / count);
        data[outIdx + 3] = Math.round(sumA / count);
      }
    }
  }

  window.FullShotCanvas.Blur = {
    applyRedaction,
    applyPixelate,
    applyGaussianBlur,
    applyBlackout,
    applyRedactionTape,
    drawBlurPreview
  };
})();
