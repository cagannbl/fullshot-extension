/**
 * FullShot Pro - DOM Measurer
 * Module for calculating true document dimensions, viewport dimensions,
 * scrollbar width, DPR normalization, and Blink-safe canvas boundaries.
 */

(function(global) {
  'use strict';

  // Blink safe canvas boundaries (Max dimension: 16384px, Max area: ~134M pixels)
  const MAX_CANVAS_DIMENSION = 16384;
  const MAX_CANVAS_AREA = 16384 * 8192; // 134,217,728 pixels (~536MB uncompressed RGBA)

  /**
   * Calculates scrollbar width to prevent layout jump (Zero Layout Shift) during capture.
   * Compares window.innerWidth with document clientWidth.
   * @returns {number} Scrollbar width in pixels
   */
  function getScrollbarWidth() {
    const docEl = document.documentElement;
    const body = document.body;
    if (!docEl) return 0;

    const htmlDiff = window.innerWidth - docEl.clientWidth;
    const bodyDiff = body ? window.innerWidth - body.clientWidth : 0;
    const scrollbarW = Math.max(0, htmlDiff, bodyDiff);

    return (scrollbarW > 0 && scrollbarW < 50) ? scrollbarW : (htmlDiff > 0 ? htmlDiff : 0);
  }

  /**
   * Normalizes document height across modern SPAs, nested containers,
   * infinite scroll feeds (Twitter, Reddit, YouTube, Instagram), overflow elements,
   * and absolute positioned elements.
   * @returns {number} Real document scrollHeight
   */
  function getRealDocumentHeight() {
    const docEl = document.documentElement;
    const body = document.body;
    const winHeight = window.innerHeight || 0;

    const docElScroll = docEl ? docEl.scrollHeight : 0;
    const docElOffset = docEl ? docEl.offsetHeight : 0;
    const docElClient = docEl ? docEl.clientHeight : 0;

    const bodyScroll = body ? body.scrollHeight : 0;
    const bodyOffset = body ? body.offsetHeight : 0;
    const bodyClient = body ? body.clientHeight : 0;

    let maxHeight = Math.max(
      docElScroll,
      docElOffset,
      docElClient,
      bodyScroll,
      bodyOffset,
      bodyClient,
      winHeight
    );

    // Scan common SPA root and layout containers, infinite feeds (React, Next.js, Nuxt, Vue, YouTube, Twitter/X, Reddit, etc.)
    const rootContainers = document.querySelectorAll(
      'main, #root, #app, #__next, #__nuxt, [role="main"], #content, #page, .page-wrapper, .main-container, ytd-app, [data-reactroot], shreddit-app, shreddit-feed, #react-root, [data-testid="primaryColumn"], div[data-testid="cellInnerDiv"], .infinite-scroll-component, [data-infinite-scroll], article, section, .feed-container'
    );

    for (let i = 0; i < rootContainers.length; i++) {
      const el = rootContainers[i];
      if (el instanceof HTMLElement) {
        const containerHeight = Math.max(el.scrollHeight || 0, el.offsetHeight || 0, el.clientHeight || 0);
        if (containerHeight > maxHeight) {
          maxHeight = containerHeight;
        }
      }
    }

    // Check bottom boundary coordinates of deep/floating children in the document flow
    if (body && body.children && body.children.length > 0) {
      try {
        const children = body.children;
        const currentScroll = window.scrollY || window.pageYOffset || 0;
        const scanStart = Math.max(0, children.length - 30);
        for (let j = scanStart; j < children.length; j++) {
          const child = children[j];
          if (child instanceof HTMLElement && !child.id?.startsWith('__fullshot_')) {
            const rect = child.getBoundingClientRect();
            const elementBottom = Math.ceil(rect.bottom + currentScroll);
            if (elementBottom > maxHeight && elementBottom < maxHeight * 2.0) {
              maxHeight = elementBottom;
            }
          }
        }
      } catch (e) {
        // Skip silently if element boundary calculation fails
      }
    }

    return Math.max(1, Math.ceil(maxHeight));
  }

  /**
   * Normalizes document width across documentElement, body, and window.
   * @returns {number} Real document scrollWidth
   */
  function getRealDocumentWidth() {
    const docEl = document.documentElement;
    const body = document.body;
    const winWidth = window.innerWidth || 0;

    const docElScroll = docEl ? docEl.scrollWidth : 0;
    const docElOffset = docEl ? docEl.offsetWidth : 0;
    const docElClient = docEl ? docEl.clientWidth : 0;

    const bodyScroll = body ? body.scrollWidth : 0;
    const bodyOffset = body ? body.offsetWidth : 0;
    const bodyClient = body ? body.clientWidth : 0;

    const maxWidth = Math.max(
      docElScroll,
      docElOffset,
      docElClient,
      bodyScroll,
      bodyOffset,
      bodyClient,
      winWidth
    );

    return Math.max(1, Math.ceil(maxWidth));
  }

  /**
   * Calculates safe canvas dimensions and scale factor within Blink memory limits.
   * Applies dynamic downscaling for mega pages (>16,384px or area >134M pixels)
   * to eliminate Out-Of-Memory (OOM) browser tab crash risk.
   * @param {number} fullWidth Page width
   * @param {number} fullHeight Page height
   * @param {number} [customDpr] Device pixel ratio
   * @returns {{ targetWidth: number, targetHeight: number, dpr: number, originalDpr: number, scaleFactor: number, maxCanvasDimension: number, maxCanvasArea: number }}
   */
  function calculateCanvasDimensions(fullWidth, fullHeight, customDpr) {
    const safeW = Math.max(1, typeof fullWidth === 'number' && !isNaN(fullWidth) ? fullWidth : 1);
    const safeH = Math.max(1, typeof fullHeight === 'number' && !isNaN(fullHeight) ? fullHeight : 1);
    const baseDpr = typeof customDpr === 'number' && !isNaN(customDpr) && customDpr > 0
      ? customDpr
      : (typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1);

    let rawTargetWidth = Math.round(safeW * baseDpr);
    let rawTargetHeight = Math.round(safeH * baseDpr);
    let scaleFactor = 1.0;

    if (
      rawTargetWidth > MAX_CANVAS_DIMENSION ||
      rawTargetHeight > MAX_CANVAS_DIMENSION ||
      (rawTargetWidth * rawTargetHeight) > MAX_CANVAS_AREA
    ) {
      const scaleW = MAX_CANVAS_DIMENSION / Math.max(1, rawTargetWidth);
      const scaleH = MAX_CANVAS_DIMENSION / Math.max(1, rawTargetHeight);
      const scaleArea = Math.sqrt(MAX_CANVAS_AREA / Math.max(1, rawTargetWidth * rawTargetHeight));
      scaleFactor = Math.min(1.0, scaleW, scaleH, scaleArea);
    }

    let effectiveDpr = baseDpr * scaleFactor;
    let targetWidth = Math.min(MAX_CANVAS_DIMENSION, Math.floor(safeW * effectiveDpr));
    let targetHeight = Math.min(MAX_CANVAS_DIMENSION, Math.floor(safeH * effectiveDpr));

    // Secondary strict area constraint guarantee to prevent sub-pixel round-up crashes
    while ((targetWidth * targetHeight) > MAX_CANVAS_AREA || targetWidth > MAX_CANVAS_DIMENSION || targetHeight > MAX_CANVAS_DIMENSION) {
      const areaCorrection = Math.min(
        MAX_CANVAS_DIMENSION / Math.max(targetWidth, 1),
        MAX_CANVAS_DIMENSION / Math.max(targetHeight, 1),
        Math.sqrt(MAX_CANVAS_AREA / Math.max(targetWidth * targetHeight, 1)) * 0.995
      );
      scaleFactor *= areaCorrection;
      effectiveDpr *= areaCorrection;
      targetWidth = Math.min(MAX_CANVAS_DIMENSION, Math.floor(safeW * effectiveDpr));
      targetHeight = Math.min(MAX_CANVAS_DIMENSION, Math.floor(safeH * effectiveDpr));
    }

    targetWidth = Math.max(1, targetWidth);
    targetHeight = Math.max(1, targetHeight);

    return {
      targetWidth,
      targetHeight,
      dpr: effectiveDpr,
      originalDpr: baseDpr,
      scaleFactor,
      maxCanvasDimension: MAX_CANVAS_DIMENSION,
      maxCanvasArea: MAX_CANVAS_AREA
    };
  }

  /**
   * Generates step coordinates for full page vertical scrolling.
   * @param {number} fullHeight 
   * @param {number} viewportHeight 
   * @returns {number[]} Array of Y-scroll positions
   */
  function calculateScrollSteps(fullHeight, viewportHeight) {
    const safeFullH = Math.max(1, fullHeight || 1);
    const safeViewH = Math.max(1, viewportHeight || window.innerHeight || 800);
    const maxScrollY = Math.max(0, safeFullH - safeViewH);
    const steps = [];
    let currentY = 0;

    while (currentY < maxScrollY) {
      steps.push(currentY);
      currentY += safeViewH;
    }
    if (!steps.includes(maxScrollY)) {
      steps.push(maxScrollY);
    }
    return steps;
  }

  const DOMMeasurer = {
    MAX_CANVAS_DIMENSION,
    MAX_CANVAS_AREA,
    getScrollbarWidth,
    getRealDocumentHeight,
    getRealDocumentWidth,
    calculateCanvasDimensions,
    calculateScrollSteps
  };

  // Expose to global namespace
  global.FullShotCapture = global.FullShotCapture || {};
  global.FullShotCapture.DOMMeasurer = DOMMeasurer;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMMeasurer;
  }
})(typeof window !== 'undefined' ? window : globalThis);

