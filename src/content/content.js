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

  // --- Runtime Message Dispatcher ---
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const action = request.action || request.type;

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
    '__fullshot_picker_host__'
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

  function removeCountdownOverlay() {
    if (window.FullShotHUD?.countdown?.remove) {
      window.FullShotHUD.countdown.remove();
    }
  }

  // =========================================================================
  // --- IN-PAGE KEYBOARD SHORTCUTS (Alt+Shift+F, Alt+Shift+V, Alt+Shift+S, Alt+Shift+E) ---
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
  window.FullShotHUD.showRecordingWidget = showRecordingWidget;
  window.FullShotHUD.removeRecordingWidget = removeRecordingWidget;
  window.FullShotHUD.showCountdown = showCountdownOverlay;
  window.FullShotHUD.cancelCountdown = cancelCountdownOverlay;
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
})();
