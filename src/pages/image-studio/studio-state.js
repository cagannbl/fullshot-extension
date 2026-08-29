/**
 * FullShot Pro - Studio State Management Store
 * Single source of truth for active tool parameters and visual attributes.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  class StudioState {
    constructor() {
      this.state = {
        activeTool: 'select',
        activeColor: '#000000',
        activeStrokeWidth: 4,
        activeFontSize: 24,
        activePenType: 'ballpoint',
        activeBlurType: 'pixelate',
        activeBlurIntensity: 'medium',
        activeStampId: 'approved',
        activeStampScale: 1.0,
        activeStampCategory: 'qa',
        activeSpotlightShape: 'rect',
        activeSpotlightDarkness: 0.65,
        activeMagnifierZoom: 2.0,
        activeArrowMode: 'single',
        activeArrowCurved: false,
        activeLineDashed: false,
        activeCalloutStyle: 'bubble',
        activeTextBg: true,
        stepCounter: 1,
        baseImage: null
      };

      this.listeners = new Map();
    }

    get(key) {
      return this.state[key];
    }

    set(key, value) {
      if (this.state[key] === value) return;
      const prev = this.state[key];
      this.state[key] = value;

      if (this.listeners.has(key)) {
        this.listeners.get(key).forEach((cb) => {
          try {
            cb(value, prev);
          } catch (err) {
            console.error('[StudioState] listener error for ' + key, err);
          }
        });
      }
    }

    subscribe(key, callback) {
      if (!this.listeners.has(key)) {
        this.listeners.set(key, new Set());
      }
      this.listeners.get(key).add(callback);
      return () => this.listeners.get(key).delete(callback);
    }
  }

  window.FullShotCanvas.StudioState = StudioState;
})();
