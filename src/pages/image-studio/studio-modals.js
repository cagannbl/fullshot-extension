/**
 * FullShot Pro - Studio Modals & Toast Manager
 * Handles 3D Mockup, Watermark, Keyboard Shortcuts, and Toast Notifications.
 */

(function () {
  'use strict';

  window.FullShotCanvas = window.FullShotCanvas || {};

  class StudioModals {
    constructor(options = {}) {
      this.renderer = options.renderer;
      this.history = options.history;
      this.state = options.state;
      this.onApplyAction = options.onApplyAction || (() => {});

      this.toastTimer = null;
      this.initToast();
      this.initShortcutsModal();
      this.initWatermarkModal();
      this.initMockupModal();
    }

    showToast(title, text = '', duration = 3000) {
      const toast = document.getElementById('toast');
      const toastTitle = document.getElementById('toastTitle');
      const toastText = document.getElementById('toastText');
      if (!toast) return;

      if (toastTitle) toastTitle.textContent = title;
      if (toastText) toastText.textContent = text;
      toast.classList.remove('hidden');

      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        toast.classList.add('hidden');
      }, duration);
    }

    initToast() {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.addEventListener('click', () => toast.classList.add('hidden'));
      }
    }

    initShortcutsModal() {
      const modal = document.getElementById('shortcutsModal');
      const openBtn = document.getElementById('shortcutsBtn');
      const closeBtn = document.getElementById('closeShortcutsBtn');
      if (!modal) return;

      const openModal = () => {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
      };
      const closeModal = () => {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
      };

      if (openBtn) openBtn.addEventListener('click', openModal);
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
          e.preventDefault();
          openModal();
        } else if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
          closeModal();
        }
      });
    }

    initWatermarkModal() {
      const modal = document.getElementById('watermarkModal');
      const openBtn = document.getElementById('watermarkBtn');
      const closeBtn = document.getElementById('closeWatermarkBtn');
      const cancelBtn = document.getElementById('cancelWatermarkBtn');
      const applyBtn = document.getElementById('applyWatermarkBtn');
      if (!modal) return;

      const open = () => modal.classList.remove('hidden');
      const close = () => modal.classList.add('hidden');

      if (openBtn) openBtn.addEventListener('click', open);
      if (closeBtn) closeBtn.addEventListener('click', close);
      if (cancelBtn) cancelBtn.addEventListener('click', close);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
      });

      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          const textInput = document.getElementById('watermarkTextInput');
          const text = textInput ? textInput.value.trim() : '';
          const posSel = document.getElementById('watermarkPositionSelect');
          const position = posSel ? posSel.value : 'bottom-right';
          const styleSel = document.getElementById('watermarkStyleSelect');
          const style = styleSel ? styleSel.value : 'dark';

          if (text) {
            this.onApplyAction({
              type: 'watermark',
              text,
              position,
              style
            });
            this.showToast('Filigran Eklendi', text);
          }
          close();
        });
      }
    }

    initMockupModal() {
      const modal = document.getElementById('mockupModal');
      const openBtn = document.getElementById('mockupBtn');
      const closeBtn = document.getElementById('closeMockupBtn');
      const cancelBtn = document.getElementById('cancelMockupBtn');
      const copyBtn = document.getElementById('copyMockupBtn');
      const downloadBtn = document.getElementById('downloadMockupBtn');
      const previewCanvas = document.getElementById('mockupPreviewCanvas');
      if (!modal || !previewCanvas) return;

      let activeTheme = 'midnight-cyber';
      let activeFrame = 'macos';
      let activeRatio = 'auto';
      let tiltX = 0;
      let tiltY = 0;
      let enableGrain = true;

      const renderMockup = () => {
        if (!window.FullShotMockup || !this.renderer) return;
        const sourceCanvas = this.renderer.getMergedCanvas(this.history?.getStack() || [], this.history?.getIndex() || 0, this.state?.get('baseImage'));
        if (!sourceCanvas) return;
        window.FullShotMockup.renderMockupToCanvas(previewCanvas, sourceCanvas, {
          theme: activeTheme,
          frameType: activeFrame,
          aspectRatio: activeRatio,
          tiltX,
          tiltY,
          grain: enableGrain
        });
      };

      const open = () => {
        modal.classList.remove('hidden');
        renderMockup();
      };
      const close = () => modal.classList.add('hidden');

      if (openBtn) openBtn.addEventListener('click', open);
      if (closeBtn) closeBtn.addEventListener('click', close);
      if (cancelBtn) cancelBtn.addEventListener('click', close);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
      });

      modal.querySelectorAll('.theme-card').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('.theme-card').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          activeTheme = btn.dataset.theme;
          renderMockup();
        });
      });

      modal.querySelectorAll('.frame-tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('.frame-tab-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          activeFrame = btn.dataset.frame;
          renderMockup();
        });
      });

      modal.querySelectorAll('.ratio-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('.ratio-pill').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          activeRatio = btn.dataset.ratio;
          renderMockup();
        });
      });

      const tiltXRange = document.getElementById('tiltXRange');
      const tiltYRange = document.getElementById('tiltYRange');
      if (tiltXRange) {
        tiltXRange.addEventListener('input', () => {
          tiltX = parseFloat(tiltXRange.value) || 0;
          renderMockup();
        });
      }
      if (tiltYRange) {
        tiltYRange.addEventListener('input', () => {
          tiltY = parseFloat(tiltYRange.value) || 0;
          renderMockup();
        });
      }

      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          previewCanvas.toBlob(async (blob) => {
            if (blob && navigator.clipboard && window.ClipboardItem) {
              try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                this.showToast('Mockup Kopyalandı! 📋', 'Görsel panoya aktarıldı.');
              } catch (err) {
                console.error('Clipboard error:', err);
              }
            }
          }, 'image/png');
        });
      }

      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          const a = document.createElement('a');
          a.download = `FullShot-Mockup-${Date.now()}.png`;
          a.href = previewCanvas.toDataURL('image/png');
          a.click();
          this.showToast('Mockup İndirildi! ✨', 'HD Mockup görseli kaydedildi.');
        });
      }
    }
  }

  window.FullShotCanvas.StudioModals = StudioModals;
})();
