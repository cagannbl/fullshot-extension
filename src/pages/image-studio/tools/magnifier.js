/**
 * FullShot Pro - Magnifier Lens Tool
 * Realistic 3D glass magnifier loupe with variable zoom (1.5x - 4.0x),
 * radial specular highlight glare, dual metallic/neon bezel rings, and deep drop shadows.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  /**
   * Draw high-fidelity glass magnifier lens magnifying underlying image content.
   * @param {CanvasRenderingContext2D} ctx Target rendering context
   * @param {number} cx Lens center X
   * @param {number} cy Lens center Y
   * @param {number} radius Lens outer radius
   * @param {number} [zoomFactor=2.0] Zoom magnification level (1.5 - 4.0)
   * @param {HTMLImageElement|HTMLCanvasElement} [baseImage] Source capture image / canvas
   * @param {string} [color='#6D8196'] Bezel accent color
   * @param {number} [strokeWidth=3] Outer bezel thickness
   * @param {number} [canvasWidth] Canvas bounding width
   * @param {number} [canvasHeight] Canvas bounding height
   */
  function drawMagnifier(
    ctx,
    cx,
    cy,
    radius = 70,
    zoomFactor = 2.0,
    baseImage = null,
    color = '#6D8196',
    strokeWidth = 3,
    canvasWidth = 0,
    canvasHeight = 0
  ) {
    if (!ctx) return;

    const r = Math.max(25, Math.min(300, radius));
    const zoom = Math.max(1.2, Math.min(6.0, zoomFactor || 2.0));
    const maxW = canvasWidth || ctx.canvas?.width || 4096;
    const maxH = canvasHeight || ctx.canvas?.height || 4096;

    ctx.save();

    // 1. Deep Drop Shadow for 3D Floating Glass effect
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1e2026';
    ctx.fill();

    // Reset shadow for clipping and content rendering
    ctx.shadowColor = 'transparent';

    // 2. Circular Clipping Boundary for Lens Viewport
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.clip();

    // 3. Render Zoomed Source Content
    if (baseImage) {
      // Source rectangle centered around cx, cy
      const srcW = (r * 2) / zoom;
      const srcH = (r * 2) / zoom;
      const srcX = cx - srcW / 2;
      const srcY = cy - srcH / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        baseImage,
        srcX,
        srcY,
        srcW,
        srcH,
        cx - r,
        cy - r,
        r * 2,
        r * 2
      );
    } else {
      // Fallback background
      ctx.fillStyle = '#2a2d36';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    // 4. Photorealistic 3D Glass Highlight Reflection (Top-Left Glare Gradient)
    const glareGradient = ctx.createRadialGradient(
      cx - r * 0.35,
      cy - r * 0.35,
      r * 0.05,
      cx,
      cy,
      r
    );
    glareGradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    glareGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.08)');
    glareGradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.05)');
    glareGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');

    ctx.fillStyle = glareGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 5. Subtle Glass Edge Vignette Ring
    const edgeVignette = ctx.createRadialGradient(cx, cy, r * 0.78, cx, cy, r);
    edgeVignette.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
    edgeVignette.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = edgeVignette;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // Restore clipping

    // 6. Dual Bezel Ring Design (Outer Ring + Inner Accent Ring)
    // Inner high-contrast bright rim
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Main Outer Bezel
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = color || '#6D8196';
    ctx.lineWidth = Math.max(2, strokeWidth);
    ctx.stroke();

    // Outer Dark Rim
    ctx.beginPath();
    ctx.arc(cx, cy, r + Math.max(1, strokeWidth * 0.5), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 7. Small Zoom Multiplier Badge on Bottom-Right of Lens
    const badgeText = `${zoom.toFixed(1)}x`;
    const badgeFontSize = Math.max(10, Math.round(r * 0.22));
    ctx.font = `700 ${badgeFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(badgeText);
    const badgePadX = Math.round(badgeFontSize * 0.5);
    const badgePadY = Math.round(badgeFontSize * 0.25);
    const badgeW = textMetrics.width + badgePadX * 2;
    const badgeH = badgeFontSize + badgePadY * 2;

    const angle = Math.PI / 4; // 45 degrees
    const bx = cx + (r * 0.72) * Math.cos(angle);
    const by = cy + (r * 0.72) * Math.sin(angle);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = 'rgba(15, 18, 24, 0.92)';
    ctx.strokeStyle = color || '#6D8196';
    ctx.lineWidth = 1;

    const shapes = window.FullShotCanvas.Shapes;
    if (shapes && shapes.drawRoundedRectPath) {
      shapes.drawRoundedRectPath(ctx, bx - badgeW / 2, by - badgeH / 2, badgeW, badgeH, badgeH / 2);
    } else {
      ctx.beginPath();
      ctx.arc(bx, by, badgeH / 2, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#FFFFE3';
    ctx.fillText(badgeText, bx, by + 0.5);
    ctx.restore();

    ctx.restore();
  }

  /**
   * Draw interactive preview during mouse drag.
   */
  function drawMagnifierPreview(
    ctx,
    startX,
    startY,
    currentX,
    currentY,
    zoomFactor = 2.0,
    baseImage = null,
    color = '#6D8196',
    strokeWidth = 3
  ) {
    if (!ctx) return;
    const dist = Math.hypot(currentX - startX, currentY - startY);
    const radius = Math.max(35, Math.min(220, dist > 5 ? dist : 65));

    drawMagnifier(
      ctx,
      startX,
      startY,
      radius,
      zoomFactor,
      baseImage,
      color,
      strokeWidth
    );
  }

  window.FullShotCanvas.Magnifier = {
    drawMagnifier,
    drawMagnifierPreview
  };
})();
