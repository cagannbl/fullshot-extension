/**
 * FullShot Pro - Blur & Redaction Tool (Mosaic Pixelation, Blackout Mask, Gaussian Blur)
 * Zero-leakage privacy censorship engine with sub-millisecond block-averaged mosaic
 * and 3-pass fast linear-time Gaussian convolution matrix.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Draw interactive selection dashed box for blur tool.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x1 
   * @param {number} y1 
   * @param {number} x2 
   * @param {number} y2 
   */
  function drawBlurPreview(ctx, x1, y1, x2, y2) {
    if (!ctx) return;
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.fillStyle = 'rgba(255, 51, 102, 0.15)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.restore();
  }

  /**
   * Apply privacy redaction on target canvas.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x1 
   * @param {number} y1 
   * @param {number} x2 
   * @param {number} y2 
   * @param {'pixelate'|'blackout'|'gaussian'} type 
   * @param {number} canvasWidth 
   * @param {number} canvasHeight 
   */
  function applyRedaction(ctx, x1, y1, x2, y2, type = 'pixelate', canvasWidth = 0, canvasHeight = 0) {
    if (!ctx) return;
    const maxW = canvasWidth || ctx.canvas?.width || 4096;
    const maxH = canvasHeight || ctx.canvas?.height || 4096;

    const rx = Math.max(0, Math.round(Math.min(x1, x2)));
    const ry = Math.max(0, Math.round(Math.min(y1, y2)));
    const rw = Math.min(maxW - rx, Math.round(Math.abs(x2 - x1)));
    const rh = Math.min(maxH - ry, Math.round(Math.abs(y2 - y1)));

    if (rw <= 0 || rh <= 0) return;

    if (type === 'blackout') {
      applyBlackout(ctx, rx, ry, rw, rh);
    } else if (type === 'gaussian') {
      applyGaussianBlur(ctx, rx, ry, rw, rh);
    } else {
      // Default: Mosaic Pixelate
      applyPixelate(ctx, rx, ry, rw, rh);
    }
  }

  /**
   * Dark sleek blackout redaction mask.
   */
  function applyBlackout(ctx, rx, ry, rw, rh) {
    ctx.save();
    ctx.fillStyle = '#080b12';
    ctx.fillRect(rx, ry, rw, rh);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
    ctx.restore();
  }

  /**
   * True block-averaged mosaic pixelation directly operating on ImageData buffer.
   */
  function applyPixelate(ctx, rx, ry, rw, rh) {
    const blockSize = Math.max(8, Math.round(Math.min(rw, rh) / 12));
    const imgData = ctx.getImageData(rx, ry, rw, rh);
    const data = imgData.data;

    for (let py = 0; py < rh; py += blockSize) {
      const bh = Math.min(blockSize, rh - py);
      for (let px = 0; px < rw; px += blockSize) {
        const bw = Math.min(blockSize, rw - px);

        // 1. Calculate true color average across all pixels in block
        let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
        let count = 0;

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

        // 2. Write average color to entire block
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

    // Direct single-pass blit
    ctx.putImageData(imgData, rx, ry);

    // Subtle crisp border
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
    ctx.restore();
  }

  /**
   * Fast, mathematical 3-pass separable box-blur approximating true Gaussian distribution.
   */
  function applyGaussianBlur(ctx, rx, ry, rw, rh) {
    try {
      // First try native Canvas 2D CSS filter if supported
      const offCanvas = document.createElement('canvas');
      offCanvas.width = rw;
      offCanvas.height = rh;
      const offCtx = offCanvas.getContext('2d');

      if (offCtx && 'filter' in offCtx) {
        const blurRadius = Math.max(10, Math.min(32, Math.round(Math.min(rw, rh) / 10)));
        offCtx.filter = `blur(${blurRadius}px)`;
        offCtx.drawImage(ctx.canvas, rx, ry, rw, rh, 0, 0, rw, rh);

        ctx.save();
        ctx.drawImage(offCanvas, rx, ry);
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.30)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        ctx.restore();
        return;
      }
    } catch (e) {
      // Fallback to CPU separable box-blur algorithm
    }

    // High-performance separable CPU box blur matrix fallback
    const imgData = ctx.getImageData(rx, ry, rw, rh);
    const radius = Math.max(6, Math.min(24, Math.round(Math.min(rw, rh) / 14)));
    boxBlurImageData(imgData, rw, rh, radius);
    ctx.putImageData(imgData, rx, ry);

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.30)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
    ctx.restore();
  }

  /**
   * Fast separable box-blur pass for Uint8ClampedArray image data.
   */
  function boxBlurImageData(imgData, w, h, radius) {
    const data = imgData.data;
    const len = w * h;
    const r = radius;

    // 3 passes of horizontal and vertical box blur approximate true Gaussian distribution
    for (let pass = 0; pass < 3; pass++) {
      boxBlurH(data, w, h, r);
      boxBlurV(data, w, h, r);
    }
  }

  function boxBlurH(data, w, h, r) {
    const arr = new Uint8ClampedArray(data);
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x++) {
        let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;
        const minX = Math.max(0, x - r);
        const maxX = Math.min(w - 1, x + r);

        for (let ix = minX; ix <= maxX; ix++) {
          const idx = rowOffset + ix * 4;
          sumR += arr[idx];
          sumG += arr[idx + 1];
          sumB += arr[idx + 2];
          sumA += arr[idx + 3];
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
    const arr = new Uint8ClampedArray(data);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;
        const minY = Math.max(0, y - r);
        const maxY = Math.min(h - 1, y + r);

        for (let iy = minY; iy <= maxY; iy++) {
          const idx = (iy * w + x) * 4;
          sumR += arr[idx];
          sumG += arr[idx + 1];
          sumB += arr[idx + 2];
          sumA += arr[idx + 3];
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
    drawBlurPreview,
    applyRedaction
  };
})();
