/**
 * FullShot Pro - Universal i18n Translation & DOM Localization Helper
 */

(function () {
  'use strict';

  window.FullShotI18N = window.FullShotI18N || {
    t: function (key, substitutions) {
      if (!key) return '';
      if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
        const msg = chrome.i18n.getMessage(key, substitutions);
        if (msg) return msg;
      }
      return key;
    },

    initDocument: function (root = document) {
      if (!root || !root.querySelectorAll) return;

      root.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        const val = this.t(key);
        if (val && val !== key) el.textContent = val;
      });

      root.querySelectorAll('[data-i18n-title]').forEach((el) => {
        const key = el.getAttribute('data-i18n-title');
        const val = this.t(key);
        if (val && val !== key) el.setAttribute('title', val);
      });

      root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = this.t(key);
        if (val && val !== key) el.setAttribute('placeholder', val);
      });

      root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
        const key = el.getAttribute('data-i18n-aria-label');
        const val = this.t(key);
        if (val && val !== key) el.setAttribute('aria-label', val);
      });
    }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => window.FullShotI18N.initDocument());
    } else {
      window.FullShotI18N.initDocument();
    }
  }
})();
