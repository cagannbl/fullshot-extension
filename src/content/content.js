/**
 * FullShot Pro - Main Content Script & Coordinator
 * Coordinates full page capture, visible area, element picker, area crop selection,
 * in-page HUDs, and video recording overlays.
 * Theme: Slate/Charcoal 4-Color Palette (#4A4A4A, #CBCBCB, #FFFFE3, #6D8196)
 */

(() => {
  // Prevent duplicate script execution
  if (window.__FULLSHOT_LOADED__) return;
  window.__FULLSHOT_LOADED__ = true;

  let isCapturing = false;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForDoubleRAF = () => {
    if (window.FullShotCapture?.waitForDoubleRAF) {
      return window.FullShotCapture.waitForDoubleRAF();
    }
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  };

  const loadImage = (dataUrl) => {
    if (window.FullShotCapture?.loadImage) {
      return window.FullShotCapture.loadImage(dataUrl);
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Görüntü verisi yüklenemedi.'));
      img.src = dataUrl;
    });
  };

  /**
   * Extracts sensitive DOM elements & credential inputs for DLP Auto-Censoring
   */
  function extractSensitivePageMetadata() {
    const sensitiveInputs = [];
    const textNodes = [];

    try {
      // 1. Detect password and financial input fields
      document.querySelectorAll('input[type="password"], input[name*="pass" i], input[name*="card" i], input[name*="cvv" i], input[name*="ssn" i]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          sensitiveInputs.push({
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            reason: 'Şifre / Güvenli Giriş Alanı'
          });
        }
      });

      // 2. Scan text nodes with potential DLP patterns
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      let count = 0;
      while ((node = walker.nextNode()) && count < 300) {
        const val = node.nodeValue?.trim();
        if (val && val.length > 5) {
          const parent = node.parentElement;
          if (parent && parent.offsetParent !== null && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
            const rect = parent.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              textNodes.push({
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                text: val
              });
              count++;
            }
          }
        }
      }
    } catch (_) {}

    return { sensitiveInputs, textNodes, url: window.location.href, title: document.title };
  }

  // --- Runtime Message Dispatcher ---
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const action = request.action || request.type;

    if (action === 'getPageMetadata' || action === 'getCaptureMetadata') {
      sendResponse({ success: true, metadata: extractSensitivePageMetadata() });
      return true;
    }

    if (action === 'startFullPageCapture') {
      if (isCapturing) {
        sendResponse({ success: false, error: 'Zaten devam eden bir ekran yakalama işlemi var.' });
        return true;
      }
      isCapturing = true;

      const StitcherClass = window.FullShotCapture?.ScrollStitcher;
      if (!StitcherClass) {
        isCapturing = false;
        sendResponse({ success: false, error: 'ScrollStitcher modülü yüklenemedi.' });
        return true;
      }

      const stitcher = new StitcherClass();
      stitcher
        .execute({
          options: request.options || {},
          onStart: (totalSteps) => showProgressHUD(totalSteps),
          onProgress: (current, total) => updateProgressHUD(current, total),
          onBeforeCapture: () => hideOverlaysForCapture(),
          onAfterCapture: () => restoreOverlaysAfterCapture()
        })
        .then(() => {
          isCapturing = false;
          removeProgressHUD();
          sendResponse({ success: true });
        })
        .catch((err) => {
          isCapturing = false;
          removeProgressHUD();
          console.error('FullPage capture error:', err);
          sendResponse({ success: false, error: err.message || 'Tam sayfa yakalama başarısız oldu.' });
        });

      return true; // Keep channel open for async response
    }

    if (action === 'startSelectedAreaCapture') {
      if (isCapturing) {
        sendResponse({ success: false, error: 'Zaten devam eden bir işlem var.' });
        return true;
      }
      startAreaSelection(request.options || {});
      sendResponse({ success: true });
      return true;
    }

    if (action === 'startElementPicker') {
      if (isCapturing) {
        sendResponse({ success: false, error: 'Zaten devam eden bir işlem var.' });
        return true;
      }
      startElementPicker(request.options || {});
      sendResponse({ success: true });
      return true;
    }

    // --- HUD Toast Actions ---
    if (action === 'showHUDToast' || action === 'showToast') {
      showHUDToast(request.message || '', request.options || {});
      sendResponse({ success: true });
      return true;
    }

    if (action === 'hideHUDToast' || action === 'hideToast') {
      removeHUDToast();
      sendResponse({ success: true });
      return true;
    }

    // --- Floating Recording Widget Actions ---
    if (action === 'showRecordingWidget' || action === 'startRecordingWidget' || action === 'startRecording') {
      showRecordingWidget(request.options || {});
      sendResponse({ success: true });
      return true;
    }

    if (action === 'hideRecordingWidget' || action === 'stopRecordingWidget' || action === 'stopRecording' || action === 'recordingStopped') {
      removeRecordingWidget();
      sendResponse({ success: true });
      return true;
    }

    if (action === 'pauseRecordingWidget' || action === 'recordingPaused') {
      pauseRecordingWidget();
      sendResponse({ success: true });
      return true;
    }

    if (action === 'resumeRecordingWidget' || action === 'recordingResumed') {
      resumeRecordingWidget();
      sendResponse({ success: true });
      return true;
    }

    if (action === 'updateRecordingWidget') {
      updateRecordingWidget(request.data || {});
      sendResponse({ success: true });
      return true;
    }

    // --- Pre-Recording Countdown Overlay Actions ---
    if (action === 'startCountdown' || action === 'startRecordingCountdown') {
      showCountdownOverlay(request.seconds || 3, request.options || request.config || {})
        .then((result) => {
          sendResponse({ success: true, cancelled: result?.cancelled });
        })
        .catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    if (action === 'cancelCountdown') {
      cancelCountdownOverlay();
      sendResponse({ success: true });
      return true;
    }

    // --- Pixel Ruler & Distance Measurement Actions ---
    if (action === 'startPixelRuler') {
      startPixelRuler(request.options || {});
      sendResponse({ success: true });
      return true;
    }

    if (action === 'togglePixelRuler') {
      togglePixelRuler(request.options || {});
      sendResponse({ success: true });
      return true;
    }

    if (action === 'stopPixelRuler') {
      stopPixelRuler();
      sendResponse({ success: true });
      return true;
    }

    // --- Pin Capture / Floating Reference Window Actions ---
    if (action === 'pinCapture' || action === 'pinToScreen') {
      pinCapture(request.captureData || request.dataUrl, request.options || {});
      sendResponse({ success: true });
      return true;
    }

    // --- Camera Bubble (Facecam Overlay) Actions ---
    if (action === 'showCameraBubble' || action === 'startCameraBubble') {
      if (window.FullShotHUD?.cameraBubble?.show) {
        window.FullShotHUD.cameraBubble.show(request.options || {});
      }
      sendResponse({ success: true });
      return true;
    }

    if (action === 'hideCameraBubble' || action === 'stopCameraBubble') {
      if (window.FullShotHUD?.cameraBubble?.hide) {
        window.FullShotHUD.cameraBubble.hide();
      }
      sendResponse({ success: true });
      return true;
    }

    if (action === 'toggleCameraBubble') {
      if (window.FullShotHUD?.cameraBubble?.toggle) {
        window.FullShotHUD.cameraBubble.toggle(request.options || {});
      }
      sendResponse({ success: true });
      return true;
    }

    // --- Cursor Effects & Spotlight Actions ---
    if (action === 'toggleSpotlight') {
      let isEnabled = false;
      if (window.FullShotHUD?.cursorEffects?.toggleSpotlight) {
        isEnabled = window.FullShotHUD.cursorEffects.toggleSpotlight(request.enabled);
      }
      sendResponse({ success: true, isEnabled });
      return true;
    }

    if (action === 'setClickRipples') {
      if (window.FullShotHUD?.cursorEffects?.setRipplesEnabled) {
        window.FullShotHUD.cursorEffects.setRipplesEnabled(request.enabled !== false);
      }
      sendResponse({ success: true });
      return true;
    }
  });

  // =========================================================================
  // --- GHOSTING PROTECTION & OVERLAY VISIBILITY HELPERS ---
  // =========================================================================

  const FULLSHOT_OVERLAY_HOST_IDS = [
    '__fullshot_hud_host__',
    '__fullshot_toast_host__',
    '__fullshot_recording_widget_host__',
    '__fullshot_countdown_host__',
    '__fullshot_selection_host__',
    '__fullshot_picker_host__',
    '__fullshot_quickbar_host__',
    '__fullshot_pin_host__',
    '__fullshot_ruler_host__',
    '__fullshot_camera_bubble_host__',
    '__fullshot_cursor_effects_host__'
  ];

  function hideOverlaysForCapture() {
    FULLSHOT_OVERLAY_HOST_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
      }
    });

    // Enforce synthetic reflow for GPU Compositor
    void document.documentElement.offsetHeight;
    if (document.body) {
      void document.body.offsetHeight;
    }
  }

  function restoreOverlaysAfterCapture() {
    FULLSHOT_OVERLAY_HOST_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
        el.style.removeProperty('opacity');
      }
    });
  }

  // =========================================================================
  // --- IN-PAGE HUD BRIDGES (Calling window.FullShotHUD modules) ---
  // =========================================================================

  function showProgressHUD(totalSteps, title) {
    if (window.FullShotHUD?.progress?.show) {
      window.FullShotHUD.progress.show(totalSteps, title);
    }
  }

  function updateProgressHUD(current, total, customText) {
    if (window.FullShotHUD?.progress?.update) {
      window.FullShotHUD.progress.update(current, total, customText);
    }
  }

  function removeProgressHUD() {
    if (window.FullShotHUD?.progress?.remove) {
      window.FullShotHUD.progress.remove();
    }
  }

  function showHUDToast(message, options = {}) {
    if (window.FullShotHUD?.toast?.show) {
      window.FullShotHUD.toast.show(message, options);
    }
  }

  function removeHUDToast() {
    if (window.FullShotHUD?.toast?.remove) {
      window.FullShotHUD.toast.remove();
    }
  }

  function startAreaSelection(options = {}) {
    if (window.FullShotHUD?.areaSelector?.start) {
      window.FullShotHUD.areaSelector.start(options);
    }
  }

  function startElementPicker(options = {}) {
    if (window.FullShotHUD?.elementPicker?.start) {
      window.FullShotHUD.elementPicker.start(options);
    }
  }

  function showRecordingWidget(options = {}) {
    if (window.FullShotHUD?.recordingBar?.show) {
      window.FullShotHUD.recordingBar.show(options);
    }
  }

  function removeRecordingWidget() {
    if (window.FullShotHUD?.recordingBar?.remove) {
      window.FullShotHUD.recordingBar.remove();
    }
  }

  function pauseRecordingWidget() {
    if (window.FullShotHUD?.recordingBar?.pause) {
      window.FullShotHUD.recordingBar.pause();
    }
  }

  function resumeRecordingWidget() {
    if (window.FullShotHUD?.recordingBar?.resume) {
      window.FullShotHUD.recordingBar.resume();
    }
  }

  function toggleWidgetPause() {
    if (window.FullShotHUD?.recordingBar?.togglePause) {
      window.FullShotHUD.recordingBar.togglePause();
    }
  }

  function updateRecordingWidget(data = {}) {
    if (window.FullShotHUD?.recordingBar?.update) {
      window.FullShotHUD.recordingBar.update(data);
    }
  }

  function showCountdownOverlay(totalSeconds = 3, options = {}) {
    if (window.FullShotHUD?.countdown?.show) {
      return window.FullShotHUD.countdown.show(totalSeconds, options);
    }
    return Promise.resolve({ cancelled: false });
  }

  function cancelCountdownOverlay() {
    if (window.FullShotHUD?.countdown?.cancel) {
      window.FullShotHUD.countdown.cancel();
    }
  }

  function showQuickBar(bounds, options = {}) {
    if (window.FullShotHUD?.quickBar?.show) {
      window.FullShotHUD.quickBar.show(bounds, options);
    }
  }

  function hideQuickBar() {
    if (window.FullShotHUD?.quickBar?.hide) {
      window.FullShotHUD.quickBar.hide();
    }
  }

  function startPixelRuler(options = {}) {
    if (window.FullShotHUD?.pixelRuler?.start) {
      window.FullShotHUD.pixelRuler.start(options);
    }
  }

  function togglePixelRuler(options = {}) {
    if (window.FullShotHUD?.pixelRuler?.toggle) {
      window.FullShotHUD.pixelRuler.toggle(options);
    }
  }

  function stopPixelRuler() {
    if (window.FullShotHUD?.pixelRuler?.stop) {
      window.FullShotHUD.pixelRuler.stop();
    }
  }

  function pinCapture(captureData, options = {}) {
    if (window.FullShotHUD?.pinWindow?.pin) {
      window.FullShotHUD.pinWindow.pin(captureData, options);
    }
  }

  // =========================================================================
  // --- IN-PAGE KEYBOARD SHORTCUTS (Alt+Shift+F, Alt+Shift+V, Alt+Shift+S, Alt+Shift+E, Alt+Shift+R) ---
  // =========================================================================

  window.addEventListener('keydown', (e) => {
    if (!e.altKey || !e.shiftKey) return;

    const code = e.code;
    if (code === 'KeyF') {
      e.preventDefault();
      e.stopPropagation();
      if (isCapturing) {
        showHUDToast('İşlem devam ediyor...', { icon: 'warning', duration: 1500 });
        return;
      }
      showHUDToast('Tam Sayfa Yakalanıyor... (Alt+Shift+F)', { icon: 'scroll', duration: 2500 });
      isCapturing = true;

      const StitcherClass = window.FullShotCapture?.ScrollStitcher;
      if (!StitcherClass) return;

      const stitcher = new StitcherClass();
      stitcher
        .execute({
          options: { format: 'png', quality: 95, scrollDelay: 250, hideFixed: true },
          onStart: (total) => showProgressHUD(total),
          onProgress: (cur, total) => updateProgressHUD(cur, total),
          onBeforeCapture: () => hideOverlaysForCapture(),
          onAfterCapture: () => restoreOverlaysAfterCapture()
        })
        .then(() => {
          isCapturing = false;
          removeProgressHUD();
        })
        .catch((err) => {
          isCapturing = false;
          removeProgressHUD();
          showHUDToast('Yakalama başarısız: ' + (err.message || 'Bilinmeyen hata'), { icon: 'error', duration: 3000 });
        });
    } else if (code === 'KeyV') {
      e.preventDefault();
      e.stopPropagation();
      showHUDToast('Görünür Alan Yakalanıyor... (Alt+Shift+V)', { icon: 'camera', duration: 1800 });
      chrome.runtime.sendMessage({ action: 'captureVisibleArea' }, (res) => {
        if (chrome.runtime.lastError || (res && !res.success)) {
          showHUDToast('Görünür alan yakalanamadı', { icon: 'error', duration: 2500 });
        }
      });
    } else if (code === 'KeyS') {
      e.preventDefault();
      e.stopPropagation();
      if (isCapturing) return;
      startAreaSelection({ format: 'png', quality: 95 });
    } else if (code === 'KeyE') {
      e.preventDefault();
      e.stopPropagation();
      if (isCapturing) return;
      startElementPicker({ format: 'png', quality: 95 });
    } else if (code === 'KeyR') {
      e.preventDefault();
      e.stopPropagation();
      togglePixelRuler();
    }
  }, true);

  // =========================================================================
  // --- GLOBAL EXPORTS & BACKWARDS COMPATIBILITY ---
  // =========================================================================

  window.FullShotHUD = window.FullShotHUD || {};
  window.FullShotHUD.showProgress = showProgressHUD;
  window.FullShotHUD.updateProgress = updateProgressHUD;
  window.FullShotHUD.removeProgress = removeProgressHUD;
  window.FullShotHUD.showToast = showHUDToast;
  window.FullShotHUD.removeToast = removeHUDToast;
  window.FullShotHUD.startAreaSelection = startAreaSelection;
  window.FullShotHUD.startElementPicker = startElementPicker;
  window.FullShotHUD.startPixelRuler = startPixelRuler;
  window.FullShotHUD.togglePixelRuler = togglePixelRuler;
  window.FullShotHUD.stopPixelRuler = stopPixelRuler;
  window.FullShotHUD.pinCapture = pinCapture;
  window.FullShotHUD.showRecordingWidget = showRecordingWidget;
  window.FullShotHUD.removeRecordingWidget = removeRecordingWidget;
  window.FullShotHUD.showCountdown = showCountdownOverlay;
  window.FullShotHUD.cancelCountdown = cancelCountdownOverlay;
  window.FullShotHUD.showQuickBar = showQuickBar;
  window.FullShotHUD.hideQuickBar = hideQuickBar;
  window.FullShotHUD.hideOverlaysForCapture = hideOverlaysForCapture;
  window.FullShotHUD.restoreOverlaysAfterCapture = restoreOverlaysAfterCapture;
  window.FullShotHUD.waitForDoubleRAF = waitForDoubleRAF;

  // Backwards compatibility globals
  window.__fullshot_show_recording_widget__ = showRecordingWidget;
  window.__fullshot_hide_recording_widget__ = removeRecordingWidget;
  window.__fullshot_pause_recording_widget__ = pauseRecordingWidget;
  window.__fullshot_resume_recording_widget__ = resumeRecordingWidget;
  window.__fullshot_show_countdown__ = showCountdownOverlay;
  window.__fullshot_cancel_countdown__ = cancelCountdownOverlay;
  window.__fullshot_show_toast__ = showHUDToast;
  window.__fullshot_hide_toast__ = removeHUDToast;
  window.__fullshot_start_area_selection__ = startAreaSelection;
  window.__fullshot_start_element_picker__ = startElementPicker;
  window.__fullshot_start_pixel_ruler__ = startPixelRuler;
  window.__fullshot_toggle_pixel_ruler__ = togglePixelRuler;
  window.__fullshot_pin_capture__ = pinCapture;
  window.__fullshot_show_quick_bar__ = showQuickBar;
  window.__fullshot_hide_quick_bar__ = hideQuickBar;
})();
