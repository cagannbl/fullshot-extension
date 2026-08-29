/**
 * FullShot Pro - Zero-OOM Vector History Stack
 * Lightweight parametric action history with zero-copy undo/redo.
 * Keeps memory footprint < 100 KB even with 50+ undo states on 4K captures.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  class HistoryStack {
    /**
     * @param {number} maxHistory Maximum number of undo states allowed
     */
    constructor(maxHistory = 50) {
      this.maxHistory = maxHistory;
      this.stack = [];
      this.index = -1;
    }

    /**
     * Push a new vector action to the history stack.
     * @param {Object} action Parametric vector action descriptor
     */
    push(action) {
      if (!action) return;

      // Slice off redo history if we are currently at an undone state
      if (this.index < this.stack.length - 1) {
        this.stack = this.stack.slice(0, this.index + 1);
      }

      this.stack.push(action);

      if (this.stack.length > this.maxHistory) {
        this.stack.shift();
      } else {
        this.index++;
      }
    }

    /**
     * Undo last action.
     * @returns {boolean} Whether an undo occurred
     */
    undo() {
      if (this.canUndo()) {
        this.index--;
        return true;
      }
      return false;
    }

    /**
     * Redo next action.
     * @returns {Object|null} The redone action or null
     */
    redo() {
      if (this.canRedo()) {
        this.index++;
        return this.stack[this.index];
      }
      return null;
    }

    canUndo() {
      return this.index >= 0;
    }

    canRedo() {
      return this.index < this.stack.length - 1;
    }

    clear() {
      this.stack = [];
      this.index = -1;
    }

    getStack() {
      return this.stack;
    }

    getIndex() {
      return this.index;
    }

    getCurrentAction() {
      if (this.index >= 0 && this.index < this.stack.length) {
        return this.stack[this.index];
      }
      return null;
    }

    /**
     * Find highest step badge number currently active in history.
     */
    getMaxStepBadgeNumber() {
      let max = 0;
      for (let i = 0; i <= this.index; i++) {
        const item = this.stack[i];
        if (item && item.type === 'step' && typeof item.number === 'number') {
          if (item.number > max) {
            max = item.number;
          }
        }
      }
      return max;
    }

    /**
     * Calculates estimated JSON memory size of history stack in bytes.
     */
    getEstimatedMemoryBytes() {
      try {
        return JSON.stringify(this.stack).length * 2; // rough UTF-16 bytes
      } catch (e) {
        return this.stack.length * 512;
      }
    }
  }

  window.FullShotCanvas.HistoryStack = HistoryStack;
})();
