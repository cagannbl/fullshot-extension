/**
 * FullShot Pro - Popup Logic & Controller
 * Ekran Görüntüsü & Canlı Video Kaydı Kontrol Paneli
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Top Header & Settings Elements
  const settingsToggleBtn = document.getElementById('settingsToggleBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const formatSelect = document.getElementById('formatSelect');
  const delaySelect = document.getElementById('delaySelect');
  const hideFixedCheckbox = document.getElementById('hideFixedCheckbox');
  const statusMessage = document.getElementById('statusMessage');

  // Mode Tabs
  const tabScreenshotBtn = document.getElementById('tabScreenshotBtn');
  const tabVideoBtn = document.getElementById('tabVideoBtn');
  const screenshotTabContent = document.getElementById('screenshotTabContent');
  const videoTabContent = document.getElementById('videoTabContent');

  // Screenshot Tab Controls
  const timerGroup = document.getElementById('timerGroup');
  const timerPills = timerGroup ? timerGroup.querySelectorAll('.timer-pill') : [];
  const captureFullPageBtn = document.getElementById('captureFullPageBtn');
  const captureVisibleBtn = document.getElementById('captureVisibleBtn');
  const captureElementBtn = document.getElementById('captureElementBtn');
  const captureSelectedBtn = document.getElementById('captureSelectedBtn');

  // Video Tab: Setup View Elements
  const videoSetupPanel = document.getElementById('videoSetupPanel');
  const scopeTabBtn = document.getElementById('scopeTabBtn');
  const scopeScreenBtn = document.getElementById('scopeScreenBtn');
  const videoSystemAudioToggle = document.getElementById('videoSystemAudioToggle');
  const videoMicAudioToggle = document.getElementById('videoMicAudioToggle');
  const videoResGroup = document.getElementById('videoResGroup');
  const videoFpsGroup = document.getElementById('videoFpsGroup');
  const startRecordingBtn = document.getElementById('startRecordingBtn');

  // Video Tab: Active Recording View Elements
  const videoActivePanel = document.getElementById('videoActivePanel');
  const liveStatusBadge = document.getElementById('liveStatusBadge');
  const liveStatusText = document.getElementById('liveStatusText');
  const activeScopeLabel = document.getElementById('activeScopeLabel');
  const activeQualityLabel = document.getElementById('activeQualityLabel');
  const recordingTimerDisplay = document.getElementById('recordingTimerDisplay');
  const chipSystemAudio = document.getElementById('chipSystemAudio');
  const chipMicAudio = document.getElementById('chipMicAudio');
  const togglePauseRecordingBtn = document.getElementById('togglePauseRecordingBtn');
  const pauseBtnIcon = document.getElementById('pauseBtnIcon');
  const pauseBtnText = document.getElementById('pauseBtnText');
  const stopRecordingBtn = document.getElementById('stopRecordingBtn');
  const cancelRecordingBtn = document.getElementById('cancelRecordingBtn');

  // --- STATE INITIALIZATION & SETTINGS LOAD ---
  const savedSettings = await chrome.storage.sync.get({
    format: 'png',
    scrollDelay: 250,
    hideFixed: true,
    countdownSeconds: 0,
    activeTab: 'screenshot',
    videoScope: 'tab',
    videoSystemAudio: true,
    videoMicAudio: false,
    videoResolution: '1080p',
    videoFps: 60
  });

  // Hydrate Screenshot Settings
  if (formatSelect) formatSelect.value = savedSettings.format || 'png';
  if (delaySelect) delaySelect.value = String(savedSettings.scrollDelay || 250);
  if (hideFixedCheckbox) hideFixedCheckbox.checked = savedSettings.hideFixed !== false;

  let currentCountdown = savedSettings.countdownSeconds || 0;
  let currentVideoScope = savedSettings.videoScope || 'tab';
  let currentSystemAudio = savedSettings.videoSystemAudio !== false;
  let currentMicAudio = savedSettings.videoMicAudio === true;
  let currentResolution = savedSettings.videoResolution || '1080p';
  let currentFps = savedSettings.videoFps || 60;
  let currentRecordingState = null;
  let timerInterval = null;

  // Set active timer pill for screenshot delay
  timerPills.forEach(pill => {
    const sec = parseInt(pill.getAttribute('data-seconds'), 10);
    if (sec === currentCountdown) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }

    pill.addEventListener('click', () => {
      timerPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCountdown = parseInt(pill.getAttribute('data-seconds'), 10);
      chrome.storage.sync.set({ countdownSeconds: currentCountdown });
    });
  });

  // --- TAB SWITCHER LOGIC ---
  function activateScreenshotTab() {
    tabScreenshotBtn?.classList.add('active');
    tabScreenshotBtn?.classList.remove('inactive');
    tabVideoBtn?.classList.remove('active');
    tabVideoBtn?.classList.add('inactive');
    screenshotTabContent?.classList.remove('hidden');
    videoTabContent?.classList.add('hidden');
    chrome.storage.sync.set({ activeTab: 'screenshot' });
  }

  function activateVideoTab() {
    tabVideoBtn?.classList.add('active');
    tabVideoBtn?.classList.remove('inactive');
    tabScreenshotBtn?.classList.remove('active');
    tabScreenshotBtn?.classList.add('inactive');
    videoTabContent?.classList.remove('hidden');
    screenshotTabContent?.classList.add('hidden');
    chrome.storage.sync.set({ activeTab: 'video' });
  }

  if (tabScreenshotBtn && tabVideoBtn) {
    tabScreenshotBtn.addEventListener('click', activateScreenshotTab);
    tabVideoBtn.addEventListener('click', activateVideoTab);
  }

  // Toggle Settings Panel
  if (settingsToggleBtn && settingsPanel) {
    settingsToggleBtn.addEventListener('click', () => {
      settingsPanel.classList.toggle('hidden');
    });
  }

  // Save general screenshot settings
  const saveScreenshotSettings = () => {
    chrome.storage.sync.set({
      format: formatSelect ? formatSelect.value : 'png',
      scrollDelay: delaySelect ? parseInt(delaySelect.value, 10) : 250,
      hideFixed: hideFixedCheckbox ? hideFixedCheckbox.checked : true
    });
  };

  if (formatSelect) formatSelect.addEventListener('change', saveScreenshotSettings);
  if (delaySelect) delaySelect.addEventListener('change', saveScreenshotSettings);
  if (hideFixedCheckbox) hideFixedCheckbox.addEventListener('change', saveScreenshotSettings);

  // Helper: Status message bar
  function showError(msg) {
    if (statusMessage) {
      statusMessage.textContent = msg;
      statusMessage.classList.remove('hidden');
    }
  }

  function clearError() {
    if (statusMessage) {
      statusMessage.textContent = '';
      statusMessage.classList.add('hidden');
    }
  }

  function setScreenshotButtonsBusy(isBusy) {
    [captureFullPageBtn, captureVisibleBtn, captureElementBtn, captureSelectedBtn].forEach(btn => {
      if (btn) {
        btn.disabled = isBusy;
        btn.style.opacity = isBusy ? '0.6' : '1';
        btn.style.pointerEvents = isBusy ? 'none' : 'auto';
      }
    });
  }

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  // --- VIDEO SETUP CONTROLS HYDRATION & LISTENERS ---
  function updateScopeUI(scope) {
    currentVideoScope = scope;
    if (scope === 'tab') {
      scopeTabBtn?.classList.add('active');
      scopeScreenBtn?.classList.remove('active');
    } else {
      scopeScreenBtn?.classList.add('active');
      scopeTabBtn?.classList.remove('active');
    }
    chrome.storage.sync.set({ videoScope: scope });
  }

  if (scopeTabBtn) {
    scopeTabBtn.addEventListener('click', () => updateScopeUI('tab'));
  }
  if (scopeScreenBtn) {
    scopeScreenBtn.addEventListener('click', () => updateScopeUI('screen'));
  }
  updateScopeUI(currentVideoScope);

  // Audio Toggles
  if (videoSystemAudioToggle) {
    videoSystemAudioToggle.checked = currentSystemAudio;
    videoSystemAudioToggle.addEventListener('change', () => {
      currentSystemAudio = videoSystemAudioToggle.checked;
      chrome.storage.sync.set({ videoSystemAudio: currentSystemAudio });
    });
  }

  if (videoMicAudioToggle) {
    videoMicAudioToggle.checked = currentMicAudio;
    videoMicAudioToggle.addEventListener('change', () => {
      currentMicAudio = videoMicAudioToggle.checked;
      chrome.storage.sync.set({ videoMicAudio: currentMicAudio });
    });
  }

  // Quality Pills (Resolution)
  if (videoResGroup) {
    const resPills = videoResGroup.querySelectorAll('.q-pill');
    resPills.forEach(pill => {
      if (pill.getAttribute('data-res') === currentResolution) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }

      pill.addEventListener('click', () => {
        resPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentResolution = pill.getAttribute('data-res') || '1080p';
        chrome.storage.sync.set({ videoResolution: currentResolution });
      });
    });
  }

  // FPS Pills
  if (videoFpsGroup) {
    const fpsPills = videoFpsGroup.querySelectorAll('.q-pill');
    fpsPills.forEach(pill => {
      const fpsVal = parseInt(pill.getAttribute('data-fps'), 10);
      if (fpsVal === currentFps) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }

      pill.addEventListener('click', () => {
        fpsPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFps = parseInt(pill.getAttribute('data-fps'), 10) || 60;
        chrome.storage.sync.set({ videoFps: currentFps });
      });
    });
  }

  // --- LIVE TIMER & DURATION FORMATTER ---
  function formatDuration(totalSeconds) {
    const s = Math.floor(totalSeconds % 60);
    const m = Math.floor((totalSeconds / 60) % 60);
    const h = Math.floor(totalSeconds / 3600);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function startLiveTimer(startTime, accumulatedPausedMs = 0, isPaused = false, pausedTime = null) {
    if (timerInterval) clearInterval(timerInterval);

    const tick = () => {
      const now = isPaused ? (pausedTime || Date.now()) : Date.now();
      const elapsedMs = Math.max(0, now - startTime - accumulatedPausedMs);
      const elapsedSec = Math.floor(elapsedMs / 1000);
      if (recordingTimerDisplay) {
        recordingTimerDisplay.textContent = formatDuration(elapsedSec);
      }
    };

    tick();
    if (!isPaused) {
      timerInterval = setInterval(tick, 500);
    }
  }

  function stopLiveTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // --- RECORDING STATE SYNCHRONIZATION ---
  function syncRecordingUI(state) {
    currentRecordingState = state;
    clearError();

    const isRecordingActive = state && (state.status === 'recording' || state.status === 'paused');

    if (isRecordingActive) {
      // Auto-activate Video Tab
      activateVideoTab();

      // Show Active Panel, Hide Setup Panel
      videoSetupPanel?.classList.add('hidden');
      videoActivePanel?.classList.remove('hidden');

      const isPaused = state.status === 'paused';
      const statusCard = videoActivePanel?.querySelector('.active-status-card');

      if (isPaused) {
        statusCard?.classList.add('paused');
        if (liveStatusText) liveStatusText.textContent = 'DURAKLATILDI';
        if (pauseBtnIcon) {
          pauseBtnIcon.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        }
        if (pauseBtnText) pauseBtnText.textContent = 'Devam Et';
      } else {
        statusCard?.classList.remove('paused');
        if (liveStatusText) liveStatusText.textContent = 'CANLI KAYIT';
        if (pauseBtnIcon) {
          pauseBtnIcon.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
        }
        if (pauseBtnText) pauseBtnText.textContent = 'Duraklat';
      }

      // Meta info
      if (activeScopeLabel) {
        activeScopeLabel.textContent = state.scope === 'screen' ? 'Tüm Ekran' : 'Mevcut Sekme';
      }
      if (activeQualityLabel) {
        activeQualityLabel.textContent = `${state.resolution || '1080p'} ${state.fps || 60}fps`;
      }

      // Audio Badges
      if (chipSystemAudio) {
        if (state.systemAudio) {
          chipSystemAudio.className = 'audio-status-chip active';
          chipSystemAudio.innerHTML = '<svg class="chip-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg><span>Sistem Sesi</span>';
        } else {
          chipSystemAudio.className = 'audio-status-chip muted';
          chipSystemAudio.innerHTML = '<svg class="chip-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg><span>Sistem Kapalı</span>';
        }
      }

      if (chipMicAudio) {
        if (state.micAudio) {
          chipMicAudio.className = 'audio-status-chip active';
          chipMicAudio.innerHTML = '<svg class="chip-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg><span>Mikrofon Açık</span>';
        } else {
          chipMicAudio.className = 'audio-status-chip muted';
          chipMicAudio.innerHTML = '<svg class="chip-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg><span>Mikrofon Kapalı</span>';
        }
      }

      // Start/Resume live timer
      startLiveTimer(
        state.startTime || Date.now(),
        state.accumulatedPausedMs || 0,
        isPaused,
        state.pausedTime || null
      );
    } else {
      // Idle State
      stopLiveTimer();
      if (recordingTimerDisplay) recordingTimerDisplay.textContent = '00:00:00';

      videoActivePanel?.classList.add('hidden');
      videoSetupPanel?.classList.remove('hidden');

      if (startRecordingBtn) {
        startRecordingBtn.disabled = false;
        startRecordingBtn.style.opacity = '1';
        const label = startRecordingBtn.querySelector('.start-record-text');
        if (label) label.textContent = 'Kaydı Başlat';
      }
    }
  }

  // Check ongoing recording on launch
  try {
    const storageData = await chrome.storage.local.get(['fullshot_recording_state']);
    if (storageData.fullshot_recording_state) {
      syncRecordingUI(storageData.fullshot_recording_state);
    } else {
      // Ask background directly
      chrome.runtime.sendMessage({ action: 'getVideoRecordingState' }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response && response.state) {
          syncRecordingUI(response.state);
        } else {
          // Restore user's last chosen tab if not recording
          if (savedSettings.activeTab === 'video') {
            activateVideoTab();
          } else {
            activateScreenshotTab();
          }
        }
      });
    }

    // Check if current active tab is a restricted browser system page
    const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTabs && currentTabs[0]) {
      const curUrl = currentTabs[0].url || '';
      if (
        curUrl.startsWith('chrome://') ||
        curUrl.startsWith('chrome-extension://') ||
        curUrl.startsWith('edge://') ||
        curUrl.startsWith('about:') ||
        curUrl.startsWith('view-source:') ||
        curUrl.includes('chrome.google.com/webstore') ||
        curUrl.includes('chromewebstore.google.com')
      ) {
        showError('🛡️ Güvenlik Kısıtlaması: Chrome Web Mağazası ve sistem sayfalarında güvenlik nedeniyle ekran yakalama yapılamaz. Lütfen normal bir web sayfasında deneyin.');
      }
    }
  } catch (e) {
    console.debug('Kayıt durumu kontrol edilirken hata:', e);
  }

  // Listen for real-time background recording state changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.fullshot_recording_state) {
      syncRecordingUI(changes.fullshot_recording_state.newValue);
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'videoRecordingStateChanged') {
      syncRecordingUI(message.state);
    }
  });

  // --- VIDEO RECORDING ACTIONS ---

  // 1. START RECORDING
  if (startRecordingBtn) {
    startRecordingBtn.addEventListener('click', async () => {
      try {
        clearError();
        startRecordingBtn.disabled = true;
        startRecordingBtn.style.opacity = '0.7';
        const label = startRecordingBtn.querySelector('.start-record-text');
        if (label) label.textContent = 'Başlatılıyor...';

        const config = {
          scope: currentVideoScope,
          systemAudio: currentSystemAudio,
          micAudio: currentMicAudio,
          resolution: currentResolution,
          fps: currentFps
        };

        // If tab scope, verify active tab validity
        if (config.scope === 'tab') {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs && tabs[0]) {
            const url = tabs[0].url || '';
            if (
              url.startsWith('chrome://') ||
              url.startsWith('chrome-extension://') ||
              url.startsWith('edge://') ||
              url.startsWith('about:')
            ) {
              throw new Error('Sistem sayfaları sekme modunda kaydedilemez. "Tüm Ekran" seçeneğini kullanın.');
            }
          }
        }

        // 1. Attempt to launch in-tab countdown overlay in active tab
        try {
          const tab = await getActiveTabAndInject();
          if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'startCountdown',
              seconds: 3,
              options: config
            }, (res) => {
              if (chrome.runtime.lastError || (res && res.error)) {
                // Fallback to direct background start if tab couldn't receive message
                chrome.runtime.sendMessage({
                  action: 'startVideoRecording',
                  options: config
                });
              }
            });
            window.close();
            return;
          }
        } catch (tabErr) {
          console.debug('Sekme içi geri sayım atlandı, doğrudan başlatılıyor:', tabErr);
        }

        // 2. Fallback to direct background start
        chrome.runtime.sendMessage({
          action: 'startVideoRecording',
          options: config
        }, async (res) => {
          if (chrome.runtime.lastError) {
            startRecordingBtn.disabled = false;
            startRecordingBtn.style.opacity = '1';
            if (label) label.textContent = 'Kaydı Başlat';
            showError('Kayıt başlatılamadı: ' + chrome.runtime.lastError.message);
            return;
          }

          if (res && !res.success) {
            startRecordingBtn.disabled = false;
            startRecordingBtn.style.opacity = '1';
            if (label) label.textContent = 'Kaydı Başlat';
            showError(res.error || 'Video kaydı başlatılamadı.');
            return;
          }

          const newState = {
            status: 'recording',
            startTime: res?.startTime || Date.now(),
            accumulatedPausedMs: 0,
            pausedTime: null,
            scope: config.scope,
            systemAudio: config.systemAudio,
            micAudio: config.micAudio,
            resolution: config.resolution,
            fps: config.fps
          };

          await chrome.storage.local.set({ fullshot_recording_state: newState });
          syncRecordingUI(newState);
        });
      } catch (err) {
        startRecordingBtn.disabled = false;
        startRecordingBtn.style.opacity = '1';
        const label = startRecordingBtn.querySelector('.start-record-text');
        if (label) label.textContent = 'Kaydı Başlat';
        showError(err.message);
      }
    });
  }

  // 2. TOGGLE PAUSE / RESUME
  if (togglePauseRecordingBtn) {
    togglePauseRecordingBtn.addEventListener('click', async () => {
      if (!currentRecordingState) return;

      const isCurrentlyPaused = currentRecordingState.status === 'paused';
      const targetAction = isCurrentlyPaused ? 'resumeVideoRecording' : 'pauseVideoRecording';

      chrome.runtime.sendMessage({ action: targetAction }, async (res) => {
        if (chrome.runtime.lastError) {
          showError('İşlem başarısız: ' + chrome.runtime.lastError.message);
          return;
        }

        const now = Date.now();
        const updatedState = { ...currentRecordingState };

        if (isCurrentlyPaused) {
          // Resuming
          const pauseDuration = updatedState.pausedTime ? (now - updatedState.pausedTime) : 0;
          updatedState.accumulatedPausedMs = (updatedState.accumulatedPausedMs || 0) + pauseDuration;
          updatedState.pausedTime = null;
          updatedState.status = 'recording';
        } else {
          // Pausing
          updatedState.pausedTime = now;
          updatedState.status = 'paused';
        }

        await chrome.storage.local.set({ fullshot_recording_state: updatedState });
        syncRecordingUI(updatedState);
      });
    });
  }

  // 3. STOP & FINISH RECORDING
  if (stopRecordingBtn) {
    stopRecordingBtn.addEventListener('click', async () => {
      stopRecordingBtn.disabled = true;
      stopRecordingBtn.style.opacity = '0.7';
      const originalHtml = stopRecordingBtn.innerHTML;
      stopRecordingBtn.innerHTML = '<svg class="spinner-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle></svg><span>Kaydediliyor...</span>';

      chrome.runtime.sendMessage({ action: 'stopVideoRecording' }, async (res) => {
        stopRecordingBtn.disabled = false;
        stopRecordingBtn.style.opacity = '1';
        stopRecordingBtn.innerHTML = originalHtml;

        if (chrome.runtime.lastError) {
          showError('Durdurma hatası: ' + chrome.runtime.lastError.message);
          return;
        }

        if (res && !res.success) {
          showError(res.error || 'Video kaydı bitirilemedi.');
          return;
        }

        await chrome.storage.local.remove('fullshot_recording_state');
        syncRecordingUI(null);
        window.close();
      });
    });
  }

  // 4. CANCEL & DISCARD RECORDING
  if (cancelRecordingBtn) {
    cancelRecordingBtn.addEventListener('click', async () => {
      chrome.runtime.sendMessage({ action: 'cancelVideoRecording' }, async () => {
        await chrome.storage.local.remove('fullshot_recording_state');
        syncRecordingUI(null);
      });
    });
  }

  // --- SCREENSHOT LOGIC (PRESERVED & ISOLATED) ---
  async function getActiveTabAndInject() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs[0]) {
      throw new Error('Aktif bir sekme bulunamadı.');
    }
    const tab = tabs[0];
    const url = tab.url || '';

    if (
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:') ||
      url.startsWith('view-source:') ||
      url.includes('chrome.google.com/webstore') ||
      url.includes('chromewebstore.google.com')
    ) {
      throw new Error('Tarayıcı güvenlik kısıtlaması nedeniyle bu sistem sayfasında ekran görüntüsü alınamaz.');
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          'src/content/hud/progress-hud.js',
          'src/content/hud/toast-hud.js',
          'src/content/hud/area-selector.js',
          'src/content/hud/element-picker.js',
          'src/content/hud/recording-bar.js',
          'src/content/hud/countdown-hud.js',
          'src/content/capture/dom-measurer.js',
          'src/content/capture/sticky-filter.js',
          'src/content/capture/scroll-stitcher.js',
          'src/content/content.js'
        ]
      });
    } catch (e) {
      console.debug('Script enjeksiyon uyarısı:', e);
    }

    return tab;
  }

  function getCommonScreenshotOptions() {
    return {
      format: formatSelect ? formatSelect.value : 'png',
      scrollDelay: delaySelect ? parseInt(delaySelect.value, 10) : 250,
      hideFixed: hideFixedCheckbox ? hideFixedCheckbox.checked : true,
      countdown: currentCountdown,
      quality: 95
    };
  }

  // Mode 1: Full Page Capture
  if (captureFullPageBtn) {
    captureFullPageBtn.addEventListener('click', async () => {
      try {
        setScreenshotButtonsBusy(true);
        const tab = await getActiveTabAndInject();
        const options = getCommonScreenshotOptions();

        if (currentCountdown > 0) {
          await sleep(currentCountdown * 1000);
        }

        chrome.tabs.sendMessage(tab.id, {
          action: 'startFullPageCapture',
          options
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('FullPage mesaj hatası:', chrome.runtime.lastError);
          }
        });

        window.close();
      } catch (err) {
        setScreenshotButtonsBusy(false);
        showError(err.message);
      }
    });
  }

  // Mode 2: Visible Area Capture
  if (captureVisibleBtn) {
    captureVisibleBtn.addEventListener('click', async () => {
      try {
        setScreenshotButtonsBusy(true);
        const options = getCommonScreenshotOptions();

        if (currentCountdown > 0) {
          await sleep(currentCountdown * 1000);
        }

        chrome.runtime.sendMessage({
          action: 'captureVisibleArea',
          format: options.format,
          quality: options.quality
        }, (res) => {
          if (res && res.success) {
            window.close();
          } else {
            setScreenshotButtonsBusy(false);
            showError(res?.error || 'Görünür alan yakalanamadı.');
          }
        });
      } catch (err) {
        setScreenshotButtonsBusy(false);
        showError(err.message);
      }
    });
  }

  // Mode 3: Element Picker
  if (captureElementBtn) {
    captureElementBtn.addEventListener('click', async () => {
      try {
        setScreenshotButtonsBusy(true);
        const tab = await getActiveTabAndInject();
        const options = getCommonScreenshotOptions();

        chrome.tabs.sendMessage(tab.id, {
          action: 'startElementPicker',
          options
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Element picker hata:', chrome.runtime.lastError);
          }
        });

        window.close();
      } catch (err) {
        setScreenshotButtonsBusy(false);
        showError(err.message);
      }
    });
  }

  // Mode 4: Selected Area Crop
  if (captureSelectedBtn) {
    captureSelectedBtn.addEventListener('click', async () => {
      try {
        setScreenshotButtonsBusy(true);
        const tab = await getActiveTabAndInject();
        const options = getCommonScreenshotOptions();

        chrome.tabs.sendMessage(tab.id, {
          action: 'startSelectedAreaCapture',
          options
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Crop seçim hata:', chrome.runtime.lastError);
          }
        });

        window.close();
      } catch (err) {
        setScreenshotButtonsBusy(false);
        showError(err.message);
      }
    });
  }
});
