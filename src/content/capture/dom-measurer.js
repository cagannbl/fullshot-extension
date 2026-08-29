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
   * @returns {number} Scrollbar width in pixels
   */
  function getScrollbarWidth() {
    const docEl = document.documentElement;
    if (!docEl) return 0;
    const scrollbarW = window.innerWidth - docEl.clientWidth;
    return Math.max(0, scrollbarW);
  }

  /**
   * Normalizes document height across modern SPAs, nested containers,
   * overflow elements, and absolute positioned elements.
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

    // Scan common SPA root and layout containers (React, Next.js, Nuxt, Vue, YouTube, Twitter, Sahibinden, etc.)
    const rootContainers = document.querySelectorAll(
      'main, #root, #app, #__next, #__nuxt, [role="main"], #content, #page, .page-wrapper, .main-container, ytd-app'
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

    // Check bottom boundary coordinates of absolute/floating children
    if (body && body.children && body.children.length > 0) {
      try {
        const children = body.children;
        const currentScroll = window.scrollY || window.pageYOffset || 0;
        const scanStart = Math.max(0, children.length - 15);
        for (let j = scanStart; j < children.length; j++) {
          const child = children[j];
          if (child instanceof HTMLElement && !child.id?.startsWith('__fullshot_')) {
            const rect = child.getBoundingClientRect();
            const elementBottom = Math.ceil(rect.bottom + currentScroll);
            if (elementBottom > maxHeight && elementBottom < maxHeight * 1.5) {
              maxHeight = elementBottom;
            }
          }
        }
      } catch (e) {
        // Skip silently if element boundary calculation fails
      }
    }

    return Math.ceil(maxHeight);
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

    return Math.ceil(Math.max(
      docElScroll,
      docElOffset,
      docElClient,
      bodyScroll,
      bodyOffset,
      bodyClient,
      winWidth
    ));
  }

  /**
   * Calculates safe canvas dimensions and scale factor within Blink memory limits.
   * @param {number} fullWidth Page width
   * @param {number} fullHeight Page height
   * @param {number} [customDpr] Device pixel ratio
   * @returns {{ targetWidth: number, targetHeight: number, dpr: number, scaleFactor: number }}
   */
  function calculateCanvasDimensions(fullWidth, fullHeight, customDpr) {
    let dpr = typeof customDpr === 'number' ? customDpr : (window.devicePixelRatio || 1);
    let rawTargetWidth = Math.round(fullWidth * dpr);
    let rawTargetHeight = Math.round(fullHeight * dpr);
    let scaleFactor = 1.0;

    if (
      rawTargetWidth > MAX_CANVAS_DIMENSION ||
      rawTargetHeight > MAX_CANVAS_DIMENSION ||
      (rawTargetWidth * rawTargetHeight) > MAX_CANVAS_AREA
    ) {
      const scaleW = MAX_CANVAS_DIMENSION / rawTargetWidth;
      const scaleH = MAX_CANVAS_DIMENSION / rawTargetHeight;
      const scaleArea = Math.sqrt(MAX_CANVAS_AREA / (rawTargetWidth * rawTargetHeight));
      scaleFactor = Math.min(1.0, scaleW, scaleH, scaleArea);
      dpr = dpr * scaleFactor;
    }

    let targetWidth = Math.min(MAX_CANVAS_DIMENSION, Math.round(fullWidth * dpr));
    let targetHeight = Math.min(MAX_CANVAS_DIMENSION, Math.round(fullHeight * dpr));

    // Secondary strict area constraint guarantee
    if ((targetWidth * targetHeight) > MAX_CANVAS_AREA) {
      const areaRatio = Math.sqrt(MAX_CANVAS_AREA / (targetWidth * targetHeight));
      dpr = dpr * areaRatio;
      targetWidth = Math.min(MAX_CANVAS_DIMENSION, Math.round(fullWidth * dpr));
      targetHeight = Math.min(MAX_CANVAS_DIMENSION, Math.round(fullHeight * dpr));
    }

    return {
      targetWidth,
      targetHeight,
      dpr,
      scaleFactor
    };
  }

  /**
   * Generates step coordinates for full page vertical scrolling.
   * @param {number} fullHeight 
   * @param {number} viewportHeight 
   * @returns {number[]} Array of Y-scroll positions
   */
  function calculateScrollSteps(fullHeight, viewportHeight) {
    const maxScrollY = Math.max(0, fullHeight - viewportHeight);
    const steps = [];
    let currentY = 0;

    while (currentY < maxScrollY) {
      steps.push(currentY);
      currentY += viewportHeight;
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
