/**
 * FullShot Pro - Scroll Stitcher
 * Vertical scroll capture engine with Double rAF GPU synchronization,
 * lazy-load image waiting, zero layout shift compensation, and canvas slice stitching.
 */

(function(global) {
  'use strict';

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Helper: Loads an image from a Data URL into an HTMLImageElement
   * @param {string} dataUrl
   * @returns {Promise<HTMLImageElement>}
   */
  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Görüntü verisi yüklenemedi.'));
      img.src = dataUrl;
    });
  }

  /**
   * Double requestAnimationFrame helper:
   * First rAF waits for browser style calculation/render phase;
   * Second rAF guarantees layout reflow and GPU paint compositing.
   * @returns {Promise<void>}
   */
  function waitForDoubleRAF() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }

  /**
   * Forces lazy-load images in/near viewport to eager load and awaits decode/render.
   * Runs in the 250ms - 350ms sweet spot for repaint stabilization.
   * @param {number} scrollDelay
   * @returns {Promise<void>}
   */
  async function waitForLazyLoadAndRepaint(scrollDelay = 300) {
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const imgPromises = [];

    // 1. Scan images near viewport (±150px)
    const images = document.querySelectorAll(
      'img, picture > source, [data-src], [data-lazy-src], [data-original], [data-srcset]'
    );

    for (let i = 0; i < images.length; i++) {
      const el = images[i];
      if (!(el instanceof HTMLElement)) continue;

      const rect = el.getBoundingClientRect();
      const isNearViewport =
        rect.top <= viewportH + 150 &&
        rect.bottom >= -150 &&
        rect.right >= -50 &&
        rect.left <= viewportW + 50;

      if (isNearViewport && el.tagName === 'IMG') {
        const img = el;

        if (img.loading === 'lazy') {
          img.loading = 'eager';
        }

        const actualSrc =
          img.getAttribute('data-src') ||
          img.getAttribute('data-original') ||
          img.getAttribute('data-lazy-src') ||
          img.dataset.src;

        if (
          actualSrc &&
          (!img.src ||
            img.src.startsWith('data:image/svg') ||
            img.src.includes('placeholder') ||
            img.src.endsWith('/blank.gif'))
        ) {
          img.src = actualSrc;
        }

        const actualSrcSet = img.getAttribute('data-srcset') || img.dataset.srcset;
        if (actualSrcSet && !img.srcset) {
          img.srcset = actualSrcSet;
        }

        if (!img.complete) {
          imgPromises.push(
            new Promise((resolve) => {
              const timer = setTimeout(resolve, Math.min(scrollDelay, 180));
              img.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
              img.addEventListener('error', () => { clearTimeout(timer); resolve(); }, { once: true });
            })
          );
        } else if (typeof img.decode === 'function') {
          imgPromises.push(img.decode().catch(() => {}));
        }
      }
    }

    if (imgPromises.length > 0) {
      await Promise.race([
        Promise.allSettled(imgPromises),
        sleep(Math.min(scrollDelay, 200))
      ]);
    }

    // Synthetic reflow
    void document.documentElement.offsetHeight;
    if (document.body) {
      void document.body.offsetHeight;
    }

    await waitForDoubleRAF();

    const remainingDelay = Math.max(80, scrollDelay - 150);
    await sleep(remainingDelay);
  }

  class ScrollStitcher {
    constructor(options = {}) {
      this.domMeasurer = global.FullShotCapture?.DOMMeasurer || {
        MAX_CANVAS_DIMENSION: 16384,
        MAX_CANVAS_AREA: 134217728,
        getScrollbarWidth: () => Math.max(0, window.innerWidth - document.documentElement.clientWidth),
        getRealDocumentHeight: () => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0, window.innerHeight),
        getRealDocumentWidth: () => Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0, window.innerWidth),
        calculateCanvasDimensions: (w, h, d) => ({
          targetWidth: Math.min(16384, Math.round(w * (d || window.devicePixelRatio || 1))),
          targetHeight: Math.min(16384, Math.round(h * (d || window.devicePixelRatio || 1))),
          dpr: d || window.devicePixelRatio || 1,
          scaleFactor: 1.0
        }),
        calculateScrollSteps: (h, vh) => {
          const max = Math.max(0, h - vh);
          const s = [];
          let y = 0;
          while (y < max) { s.push(y); y += vh; }
          if (!s.includes(max)) s.push(max);
          return s;
        }
      };

      const StickyFilterClass = global.FullShotCapture?.StickyFilter;
      this.stickyFilter = StickyFilterClass ? new StickyFilterClass() : null;
    }

    /**
     * Executes the full vertical scroll capture and slice stitching sequence.
     * @param {Object} config
     * @param {Object} [config.options] Capture configuration (format, quality, scrollDelay, hideFixed)
     * @param {Function} [config.onStart] Called with total steps count
     * @param {Function} [config.onProgress] Called with (currentStep, totalSteps)
     * @param {Function} [config.onBeforeCapture] Called before taking snapshot to hide extension HUDs
     * @param {Function} [config.onAfterCapture] Called after snapshot to restore extension HUDs
     * @returns {Promise<{ dataUrl: string, width: number, height: number, format: string }>}
     */
    async execute(config = {}) {
      const options = config.options || {};
      const scrollDelay = Math.max(200, typeof options.scrollDelay === 'number' ? options.scrollDelay : 300);
      const format = options.format === 'jpeg' ? 'jpeg' : 'png';
      const quality = typeof options.quality === 'number' ? options.quality : 95;
      const hideFixed = options.hideFixed !== false;

      // 1. Save original document state for perfect restoration in finally
      const originalScrollX = window.scrollX || window.pageXOffset || 0;
      const originalScrollY = window.scrollY || window.pageYOffset || 0;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyOverflow = document.body ? document.body.style.overflow : '';
      const originalHtmlScrollBehavior = document.documentElement.style.scrollBehavior;
      const originalBodyScrollBehavior = document.body ? document.body.style.scrollBehavior : '';
      const originalHtmlPaddingRight = document.documentElement ? document.documentElement.style.paddingRight : '';
      const originalBodyPaddingRight = document.body ? document.body.style.paddingRight : '';

      // 2. Measure scrollbar width before locking overflow to guarantee Zero Layout Shift
      const scrollbarWidth = this.domMeasurer.getScrollbarWidth();

      // Disable smooth scroll to allow instantaneous programmatic jumps
      document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important');
      if (document.body) {
        document.body.style.setProperty('scroll-behavior', 'auto', 'important');
      }

      // 3. Measure page dimensions accurately
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let fullWidth = this.domMeasurer.getRealDocumentWidth();
      let fullHeight = this.domMeasurer.getRealDocumentHeight();

      // 4. Calculate safe canvas boundaries & scaling
      const dimensions = this.domMeasurer.calculateCanvasDimensions(fullWidth, fullHeight);
      let dpr = dimensions.dpr;
      let targetWidth = dimensions.targetWidth;
      let targetHeight = dimensions.targetHeight;
      const maxDim = this.domMeasurer.MAX_CANVAS_DIMENSION;
      const maxArea = this.domMeasurer.MAX_CANVAS_AREA;

      // 5. Initialize master canvas
      const masterCanvas = document.createElement('canvas');
      masterCanvas.width = targetWidth;
      masterCanvas.height = targetHeight;
      const ctx = masterCanvas.getContext('2d', { alpha: format === 'png' });

      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      // 6. Calculate scroll steps
      let ySteps = this.domMeasurer.calculateScrollSteps(fullHeight, viewportHeight);
      let totalSteps = ySteps.length;

      if (typeof config.onStart === 'function') {
        config.onStart(totalSteps);
      }

      // Detect sticky and fixed elements if enabled
      if (hideFixed && this.stickyFilter) {
        this.stickyFilter.detect();
      }

      // 7. Lock scrollbar and apply zero-shift padding compensation
      document.documentElement.style.overflow = 'hidden';
      if (document.body) {
        document.body.style.overflow = 'hidden';
      }
      if (scrollbarWidth > 0) {
        const computedHtmlPaddingRight = parseFloat(window.getComputedStyle(document.documentElement).paddingRight) || 0;
        document.documentElement.style.setProperty('padding-right', `${computedHtmlPaddingRight + scrollbarWidth}px`, 'important');
      }

      try {
        for (let i = 0; i < ySteps.length; i++) {
          const stepY = ySteps[i];

          // A. Instant scroll jump
          window.scrollTo({ left: 0, top: stepY, behavior: 'instant' });
          document.documentElement.scrollTop = stepY;
          if (document.body) {
            document.body.scrollTop = stepY;
          }

          // Trigger page scroll event
          window.dispatchEvent(new Event('scroll', { bubbles: true }));

          // Update sticky/fixed elements for current step
          if (hideFixed && this.stickyFilter) {
            this.stickyFilter.updateForStep(i);
          }

          // B. Wait for lazy load, repaints & GPU stabilization
          await waitForLazyLoadAndRepaint(scrollDelay);

          // C. Dynamic Infinite Scroll Detection: Check if document expanded during scrolling
          const currentMeasuredHeight = this.domMeasurer.getRealDocumentHeight();
          if (currentMeasuredHeight > fullHeight) {
            const newFullHeight = currentMeasuredHeight;
            const newTargetHeight = Math.min(maxDim, Math.round(newFullHeight * dpr));

            if (newTargetHeight <= maxDim && (targetWidth * newTargetHeight) <= maxArea && ySteps.length < 100) {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = masterCanvas.width;
              tempCanvas.height = masterCanvas.height;
              const tempCtx = tempCanvas.getContext('2d');
              tempCtx.drawImage(masterCanvas, 0, 0);

              masterCanvas.height = newTargetHeight;
              if (format === 'jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, targetWidth, newTargetHeight);
              }
              ctx.drawImage(tempCanvas, 0, 0);

              fullHeight = newFullHeight;
              targetHeight = newTargetHeight;

              // Expand scroll steps dynamically
              const newMaxScrollY = Math.max(0, fullHeight - viewportHeight);
              const lastStep = ySteps[ySteps.length - 1];
              let nextY = Math.floor(lastStep / viewportHeight) * viewportHeight + viewportHeight;
              while (nextY < newMaxScrollY) {
                if (!ySteps.includes(nextY)) {
                  ySteps.push(nextY);
                }
                nextY += viewportHeight;
              }
              if (!ySteps.includes(newMaxScrollY)) {
                ySteps.push(newMaxScrollY);
              }
            }
          }

          totalSteps = ySteps.length;
          if (typeof config.onProgress === 'function') {
            config.onProgress(i, totalSteps);
          }

          // D. Hide extension overlays before capturing
          if (typeof config.onBeforeCapture === 'function') {
            config.onBeforeCapture();
          }

          // Force reflow and Double rAF + 50ms compositor delay to ensure no ghost UI is captured
          void document.documentElement.offsetHeight;
          if (document.body) {
            void document.body.offsetHeight;
          }
          await waitForDoubleRAF();
          await sleep(50);

          // E. Capture visible tab slice via background service worker
          const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              action: 'captureVisibleTab',
              format,
              quality
            }, (res) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (res && res.success) {
                resolve(res);
              } else {
                reject(new Error(res?.error || 'Ekran yakalama başarısız oldu.'));
              }
            });
          });

          // F. Restore extension overlays immediately after snapshot
          if (typeof config.onAfterCapture === 'function') {
            config.onAfterCapture();
          }

          if (typeof config.onProgress === 'function') {
            config.onProgress(i + 1, totalSteps);
          }

          // G. Stitch slice onto master canvas
          const sliceImg = await loadImage(response.dataUrl);
          const imgWidth = sliceImg.naturalWidth || sliceImg.width;
          const imgHeight = sliceImg.naturalHeight || sliceImg.height;
          const imgDpr = imgHeight / viewportHeight;

          if (totalSteps === 1) {
            // Single step page (viewport fits entirely)
            const sw = Math.min(imgWidth, Math.round(fullWidth * imgDpr));
            const sh = Math.min(imgHeight, Math.round(fullHeight * imgDpr));
            ctx.drawImage(
              sliceImg,
              0, 0, sw, sh,
              0, 0, targetWidth, targetHeight
            );
          } else if (i === totalSteps - 1) {
            // Last slice: mathematically calculate non-overlapping unique height
            const uniqueHeight = fullHeight - ((totalSteps - 1) * viewportHeight);
            const sh = Math.round(uniqueHeight * imgDpr);
            const sy = Math.max(0, imgHeight - sh);
            const sw = Math.min(imgWidth, Math.round(fullWidth * imgDpr));
            const sx = 0;

            const dy = Math.round((fullHeight - uniqueHeight) * dpr);
            const dh = Math.max(0, targetHeight - dy);
            const dx = 0;
            const dw = targetWidth;

            if (dh > 0) {
              ctx.drawImage(
                sliceImg,
                sx, sy, sw, sh,
                dx, dy, dw, dh
              );
            }
          } else {
            // Intermediate slice
            const sx = 0;
            const sy = 0;
            const sw = Math.min(imgWidth, Math.round(fullWidth * imgDpr));
            const sh = imgHeight;

            const dx = 0;
            const dy = Math.round(i * viewportHeight * dpr);
            const nextDy = Math.round((i + 1) * viewportHeight * dpr);
            const dw = targetWidth;
            const dh = Math.min(targetHeight - dy, nextDy - dy);

            if (dh > 0) {
              ctx.drawImage(
                sliceImg,
                sx, sy, sw, sh,
                dx, dy, dw, dh
              );
            }
          }

          sliceImg.src = '';
        }

        // 8. Serialize Canvas & Store
        const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const stitchedDataUrl = masterCanvas.toDataURL(mime, quality / 100);

        const captureResult = {
          dataUrl: stitchedDataUrl,
          title: document.title || 'Tam Sayfa Ekran Görüntüsü',
          url: window.location.href,
          width: targetWidth,
          height: targetHeight,
          format,
          timestamp: Date.now(),
          type: 'fullpage'
        };

        try {
          await chrome.storage.local.set({ fullshot_current_capture: captureResult });
        } catch (storageErr) {
          console.warn('Storage set error:', storageErr);
          await chrome.storage.local.clear();
          await chrome.storage.local.set({ fullshot_current_capture: captureResult });
        }

        chrome.runtime.sendMessage({ action: 'openPreview' });

        return captureResult;
      } finally {
        // 9. Full cleanup & Zero-shift restoration
        if (hideFixed && this.stickyFilter) {
          this.stickyFilter.restore();
        }

        document.documentElement.style.overflow = originalHtmlOverflow;
        if (document.body) {
          document.body.style.overflow = originalBodyOverflow;
        }

        if (originalHtmlPaddingRight) {
          document.documentElement.style.paddingRight = originalHtmlPaddingRight;
        } else {
          document.documentElement.style.removeProperty('padding-right');
        }

        if (document.body) {
          if (originalBodyPaddingRight) {
            document.body.style.paddingRight = originalBodyPaddingRight;
          } else {
            document.body.style.removeProperty('padding-right');
          }
        }

        if (originalHtmlScrollBehavior) {
          document.documentElement.style.scrollBehavior = originalHtmlScrollBehavior;
        } else {
          document.documentElement.style.removeProperty('scroll-behavior');
        }

        if (document.body) {
          if (originalBodyScrollBehavior) {
            document.body.style.scrollBehavior = originalBodyScrollBehavior;
          } else {
            document.body.style.removeProperty('scroll-behavior');
          }
        }

        window.scrollTo({ left: originalScrollX, top: originalScrollY, behavior: 'instant' });
      }
    }
  }

  // Expose to global namespace
  global.FullShotCapture = global.FullShotCapture || {};
  global.FullShotCapture.ScrollStitcher = ScrollStitcher;
  global.FullShotCapture.waitForDoubleRAF = waitForDoubleRAF;
  global.FullShotCapture.waitForLazyLoadAndRepaint = waitForLazyLoadAndRepaint;
  global.FullShotCapture.loadImage = loadImage;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      ScrollStitcher,
      waitForDoubleRAF,
      waitForLazyLoadAndRepaint,
      loadImage
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
