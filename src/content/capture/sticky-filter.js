/**
 * FullShot Pro - Sticky & Fixed Elements Filter
 * Module for smart detection, hiding, and restoring of sticky/fixed elements
 * during vertical scroll stitching. Only hides elements docked at top (rect.top <= 2)
 * on subsequent steps while preserving first slice and below-the-fold content.
 */

(function(global) {
  'use strict';

  class StickyFilter {
    constructor() {
      this.originalStyles = new Map();
      this.detectedElements = [];
      this.isHidden = false;
    }

    /**
     * Safety check preventing accidental hiding of SPA root containers,
     * document bodies, or extension UI hosts.
     * @param {HTMLElement} el
     * @param {number} viewportW
     * @param {number} viewportH
     * @returns {boolean}
     */
    isSafeToHide(el, viewportW, viewportH) {
      if (!el || !(el instanceof HTMLElement)) return false;

      // 1. Root & Body check
      if (el === document.documentElement || el === document.body) return false;
      const tagName = el.tagName ? el.tagName.toUpperCase() : '';
      if (tagName === 'HTML' || tagName === 'BODY') return false;

      // 2. Extension overlay hosts
      if (el.id && el.id.startsWith('__fullshot_')) return false;
      if (el.closest && el.closest('[id^="__fullshot_"]')) return false;

      // 3. SPA framework root and main layout IDs & classes
      const id = (el.id || '').toLowerCase();
      const spaRoots = [
        'root', '__next', 'app', '__nuxt', 'main-content', 'layout-root',
        '__layout', 'app-root', 'main', 'react-root', 'shreddit-app',
        'shreddit-feed', 'primarycolumn', 'contents', 'page-container',
        'content', 'page'
      ];
      if (spaRoots.includes(id)) return false;

      // 4. ARIA landmark roles
      const role = (el.getAttribute('role') || '').toLowerCase();
      if (role === 'main' || role === 'application' || role === 'article' || role === 'feed') return false;

      // 5. Layout elements covering >= 90% of viewport
      const rect = el.getBoundingClientRect();
      if (rect.width >= viewportW * 0.90 && rect.height >= viewportH * 0.90) return false;

      // 6. Zero dimension elements
      if (rect.width === 0 || rect.height === 0) return false;

      return true;
    }

    /**
     * Scans DOM and indexes all position:fixed and position:sticky elements.
     */
    detect() {
      this.originalStyles.clear();
      this.detectedElements = [];
      this.isHidden = false;

      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const allElements = document.querySelectorAll('*');

      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (!(el instanceof HTMLElement)) continue;

        try {
          const style = window.getComputedStyle(el);
          const position = style.position;

          if (position === 'fixed' || position === 'sticky') {
            if (!this.isSafeToHide(el, viewportW, viewportH)) {
              continue;
            }

            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              continue;
            }

            // Save original inline visibility and priority
            this.originalStyles.set(el, {
              visibility: el.style.getPropertyValue('visibility') || '',
              priority: el.style.getPropertyPriority('visibility') || '',
              positionType: position
            });

            this.detectedElements.push(el);
          }
        } catch (e) {
          // Skip element if getComputedStyle fails
        }
      }
    }

    /**
     * Smart step updater:
     * - Step 0: Leave everything visible (captures top navbar naturally)
     * - Step > 0: Hide fixed elements and sticky elements docked at top (rect.top <= 2)
     *   Preserves in-page sticky headers below the fold (rect.top > 2).
     * @param {number} stepIndex
     */
    updateForStep(stepIndex) {
      if (stepIndex === 0) {
        // Step 0: ensure all elements are visible in their original state
        if (this.isHidden) {
          this.restoreVisibility();
        }
        return;
      }

      const viewportH = window.innerHeight;

      for (let i = 0; i < this.detectedElements.length; i++) {
        const el = this.detectedElements[i];
        if (!el || !el.style) continue;

        try {
          const meta = this.originalStyles.get(el);
          const rect = el.getBoundingClientRect();
          const position = meta?.positionType || window.getComputedStyle(el).position;

          // Docked at top check: element top is pinned at or above the upper viewport boundary
          const isDockedAtTop = rect.top <= 2 && rect.bottom > 0;

          if (position === 'fixed') {
            if (isDockedAtTop) {
              el.style.setProperty('visibility', 'hidden', 'important');
            } else if (rect.bottom >= viewportH - 2 && rect.height < viewportH * 0.35) {
              // Floating bottom footer / cookie banner: hide during intermediate scrolls to prevent repetition
              el.style.setProperty('visibility', 'hidden', 'important');
            } else {
              // Non-docked fixed elements: preserve original visibility
              if (meta && meta.visibility) {
                el.style.setProperty('visibility', meta.visibility, meta.priority);
              } else {
                el.style.removeProperty('visibility');
              }
            }
          } else if (position === 'sticky') {
            // ONLY hide sticky elements if they are docked at the top of the viewport
            if (isDockedAtTop) {
              el.style.setProperty('visibility', 'hidden', 'important');
            } else {
              // In-page headers below the fold: keep visible so section titles are captured cleanly
              if (meta && meta.visibility) {
                el.style.setProperty('visibility', meta.visibility, meta.priority);
              } else {
                el.style.removeProperty('visibility');
              }
            }
          }
        } catch (e) {
          // Ignore style set errors
        }
      }
      this.isHidden = true;
    }

    /**
     * Helper: Restores visibility without clearing the detected element index.
     */
    restoreVisibility() {
      for (const [el, original] of this.originalStyles.entries()) {
        if (el && el.style) {
          try {
            if (original.visibility) {
              el.style.setProperty('visibility', original.visibility, original.priority);
            } else {
              el.style.removeProperty('visibility');
            }
          } catch (e) {
            // Ignore style restore errors
          }
        }
      }
      this.isHidden = false;
    }

    /**
     * Restores all modified elements to their original inline styles and cleans up.
     */
    restore() {
      this.restoreVisibility();
      this.originalStyles.clear();
      this.detectedElements = [];
      this.isHidden = false;
    }
  }

  // Expose to global namespace
  global.FullShotCapture = global.FullShotCapture || {};
  global.FullShotCapture.StickyFilter = StickyFilter;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StickyFilter;
  }
})(typeof window !== 'undefined' ? window : globalThis);
