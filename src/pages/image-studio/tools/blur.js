/**
 * FullShot Pro - Blur & Redaction Tool (Mosaic Pixelation, Blackout Mask, Gaussian Blur)
 * Zero-leakage privacy censorship engine with sub-millisecond bounding box rendering.
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
      ctx.save();
      ctx.fillStyle = '#080b12';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    } else if (type === 'gaussian') {
      // High-performance bilinear downscale & upscale blur patch
      try {
        const offCanvas = document.createElement('canvas');
        const downscale = 0.10;
        const dw = Math.max(2, Math.round(rw * downscale));
        const dh = Math.max(2, Math.round(rh * downscale));
        offCanvas.width = dw;
        offCanvas.height = dh;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(ctx.canvas, rx, ry, rw, rh, 0, 0, dw, dh);

        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(offCanvas, 0, 0, dw, dh, rx, ry, rw, rh);
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.restore();
      } catch (e) {
        // Fallback to pixelate if offscreen fails
        applyPixelate(ctx, rx, ry, rw, rh);
      }
    } else {
      // Standard Mosaic / Pixelate
      applyPixelate(ctx, rx, ry, rw, rh);
    }
  }

  /**
   * Internal high-speed mosaic pixelation.
   */
  function applyPixelate(ctx, rx, ry, rw, rh) {
    const blockSize = Math.max(8, Math.round(Math.min(rw, rh) / 10));
    const imgData = ctx.getImageData(rx, ry, rw, rh);
    const data = imgData.data;

    for (let py = 0; py < rh; py += blockSize) {
      for (let px = 0; px < rw; px += blockSize) {
        const actualBlockW = Math.min(blockSize, rw - px);
        const actualBlockH = Math.min(blockSize, rh - py);

        const sampleX = px + Math.floor(actualBlockW / 2);
        const sampleY = py + Math.floor(actualBlockH / 2);
        const idx = (sampleY * rw + sampleX) * 4;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        ctx.save();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        ctx.fillRect(rx + px, ry + py, actualBlockW, actualBlockH);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }

  window.FullShotCanvas.Blur = {
    drawBlurPreview,
    applyRedaction
  };
})();
