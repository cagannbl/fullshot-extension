/**
 * FullShot Pro - Service Worker (Background Script)
 * Manifest V3 compatible
 * 
 * Responsibilities:
 * - Full page, visible area, element & selection screenshot capture coordinator with exponential backoff retry
 * - Video & audio recording state machine (IDLE, RECORDING, PAUSED) with live duration timer
 * - Dynamic extension badge indicator (Red REC / elapsed minutes, Amber PAUS)
 * - Service Worker keep-alive connection & heartbeat management (prevents 30s idle suspend)
 * - Offscreen document lifecycle management (chrome.offscreen)
 * - Navigation and persistence for Image Studio and Video Studio
 */

// ==========================================
// 1. Shared Utilities & Import Fallback
// ==========================================
try {
  importScripts('../shared/constants.js', '../shared/db.js');
} catch (e) {
  // Classic context or already bundled
}

const RECORDING_STATE = (typeof self !== 'undefined' && self.RECORDING_STATE) || {
  IDLE: 'IDLE',
  RECORDING: 'RECORDING',
  PAUSED: 'PAUSED'
};

const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/offscreen.html';
const PREVIEW_VIDEO_PATH = 'src/pages/video-studio/video-studio.html';
const PREVIEW_IMAGE_PATH = 'src/pages/image-studio/image-studio.html';

// ==========================================
// 2. Global State & Keep-Alive Connection Pool
// ==========================================
let recordingState = RECORDING_STATE.IDLE;
let recordingStartTime = 0;
let recordingElapsedSeconds = 0;
let recordingTimerInterval = null;
let recordingConfig = null;
let activeRecordingId = null;

// Keep-Alive connection pool for persistent Service Worker wake-lock
const keepAlivePorts = new Set();
let keepAliveHeartbeatInterval = null;
let creatingOffscreenPromise = null;

/**
 * Triggers a lightweight Chrome API call to touch the Service Worker idle timer.
 */
function resetSWKeepAlive() {
  try {
    if (chrome.runtime && typeof chrome.runtime.getPlatformInfo === 'function') {
      chrome.runtime.getPlatformInfo().catch(() => {});
    }
  } catch (e) {}
}

// ==========================================
// 3. Offscreen Document Lifecycle Management
// ==========================================

/**
 * Checks if an offscreen document is currently active.
 * @returns {Promise<boolean>}
 */
async function hasOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  if ('getContexts' in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });
    return contexts.length > 0;
  }

  if (chrome.offscreen && typeof chrome.offscreen.hasDocument === 'function') {
    try {
      return await chrome.offscreen.hasDocument();
    } catch (e) {
      // Fallback below
    }
  }

  if (typeof clients !== 'undefined' && clients.matchAll) {
    const matchedClients = await clients.matchAll();
    return matchedClients.some((client) => client.url === offscreenUrl);
  }

  return false;
}

/**
 * Creates the offscreen document if not already existing, preventing race conditions.
 * @returns {Promise<void>}
 */
async function setupOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  if (creatingOffscreenPromise) {
    await creatingOffscreenPromise;
    return;
  }

  const reasons = [];
  if (chrome.offscreen?.Reason?.USER_MEDIA) reasons.push(chrome.offscreen.Reason.USER_MEDIA);
  else reasons.push('USER_MEDIA');

  if (chrome.offscreen?.Reason?.DISPLAY_MEDIA) reasons.push(chrome.offscreen.Reason.DISPLAY_MEDIA);
  else reasons.push('DISPLAY_MEDIA');

  if (chrome.offscreen?.Reason?.BLOBS) reasons.push(chrome.offscreen.Reason.BLOBS);
  else reasons.push('BLOBS');

  creatingOffscreenPromise = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: reasons,
    justification: 'Ekran, sekme ve mikrofon ses/video akışlarını MediaRecorder ile yakalamak.'
  });

  try {
    await creatingOffscreenPromise;
  } catch (err) {
    if (!err.message?.includes('Only a single offscreen document may be created')) {
      console.error('[Background] Offscreen document oluşturma hatası:', err);
      throw err;
    }
  } finally {
    creatingOffscreenPromise = null;
  }
}

/**
 * Closes the offscreen document safely.
 * @returns {Promise<void>}
 */
async function closeOffscreenDocument() {
  if (!(await hasOffscreenDocument())) {
    return;
  }
  try {
    await chrome.offscreen.closeDocument();
  } catch (err) {
    console.warn('[Background] Offscreen closeDocument uyarısı:', err);
  }
}

/**
 * Ensures the offscreen document is created and its message router is fully loaded and responding.
 */
async function ensureOffscreenReady(maxRetries = 10, delay = 80) {
  await setupOffscreenDocument();
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'PING'
      });
      if (res && res.pong) return true;
    } catch (e) {
      // Offscreen script not loaded yet, retry
    }
    await new Promise((r) => setTimeout(r, delay));
  }
  return true;
}

/**
 * Sends a message directly to the offscreen document safely after handshaking.
 */
async function sendToOffscreen(action, options = {}) {
  await ensureOffscreenReady();
  return await chrome.runtime.sendMessage({
    target: 'offscreen',
    action,
    options
  });
}

// ==========================================
// 4. Service Worker Keep-Alive & Heartbeat Port Manager
// ==========================================

// Listen for long-lived port connections from offscreen, popup, or content scripts
chrome.runtime.onConnect.addListener((port) => {
  if (
    port.name.startsWith('keepAlive') ||
    port.name === 'keepAlive-recording' ||
    port.name.startsWith('offscreen') ||
    port.name.startsWith('fullshot') ||
    port.name.startsWith('recording') ||
    port.name.startsWith('content')
  ) {
    keepAlivePorts.add(port);
    resetSWKeepAlive();

    port.onDisconnect.addListener(() => {
      keepAlivePorts.delete(port);
      // If active recording ongoing and all ports disconnected, maintain keepalive
      if (recordingState === RECORDING_STATE.RECORDING && keepAlivePorts.size === 0) {
        resetSWKeepAlive();
      }
    });

    port.onMessage.addListener((msg) => {
      resetSWKeepAlive();

      if (
        msg?.action === 'ping' ||
        msg?.type === 'PING' ||
        msg?.action === 'heartbeat' ||
        msg?.action === 'keepAlive'
      ) {
        try {
          port.postMessage({
            action: 'heartbeat-ack',
            type: 'PONG',
            timestamp: Date.now(),
            state: recordingState,
            elapsedSeconds: recordingElapsedSeconds,
            recordingId: activeRecordingId
          });
        } catch (e) {
          keepAlivePorts.delete(port);
        }
      }
    });
  }
});

/**
 * Starts periodic keep-alive heartbeat while recording is active.
 * Prevents Manifest V3 Service Worker from terminating after 30s of inactivity.
 */
function startKeepAliveHeartbeat() {
  if (keepAliveHeartbeatInterval) clearInterval(keepAliveHeartbeatInterval);

  keepAliveHeartbeatInterval = setInterval(() => {
    if (recordingState === RECORDING_STATE.IDLE) {
      stopKeepAliveHeartbeat();
      return;
    }

    // Touch Chrome SW lifecycle
    resetSWKeepAlive();

    // Ping all active keep-alive ports
    for (const port of keepAlivePorts) {
      try {
        port.postMessage({
          action: 'heartbeat',
          timestamp: Date.now(),
          state: recordingState,
          elapsedSeconds: recordingElapsedSeconds,
          recordingId: activeRecordingId
        });
      } catch (e) {
        keepAlivePorts.delete(port);
      }
    }
  }, 12000); // 12s interval (< 30s SW idle timeout)
}

/**
 * Stops keep-alive heartbeat.
 */
function stopKeepAliveHeartbeat() {
  if (keepAliveHeartbeatInterval) {
    clearInterval(keepAliveHeartbeatInterval);
    keepAliveHeartbeatInterval = null;
  }
}

// ==========================================
// 5. Badge & Timer State Management
// ==========================================

/**
 * Updates extension action badge based on current recording status.
 * - RECORDING: Red badge with "REC" or elapsed minutes ("1m", "2m", etc.)
 * - PAUSED: Amber badge with "PAUS" or elapsed minutes
 * - IDLE: Clear badge
 */
function updateActionBadge() {
  if (recordingState === RECORDING_STATE.RECORDING) {
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' }); // Red
    const minutes = Math.floor(recordingElapsedSeconds / 60);
    const badgeText = minutes > 0 ? `${minutes}m` : 'REC';
    chrome.action.setBadgeText({ text: badgeText });
  } else if (recordingState === RECORDING_STATE.PAUSED) {
    chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' }); // Amber
    const minutes = Math.floor(recordingElapsedSeconds / 60);
    const badgeText = minutes > 0 ? `${minutes}m` : 'PAUS';
    chrome.action.setBadgeText({ text: badgeText });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

/**
 * Starts live recording timer and badge updates.
 */
function startRecordingTimer() {
  if (recordingTimerInterval) clearInterval(recordingTimerInterval);
  updateActionBadge();
  startKeepAliveHeartbeat();

  recordingTimerInterval = setInterval(() => {
    if (recordingState === RECORDING_STATE.RECORDING) {
      recordingElapsedSeconds++;
      updateActionBadge();
      persistRecordingState();
    }
  }, 1000);
}

/**
 * Pauses recording timer and updates badge.
 */
function pauseRecordingTimer() {
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }
  updateActionBadge();
  persistRecordingState();
}

/**
 * Resets recording timer and clears badge.
 */
function resetRecordingTimer() {
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }
  recordingElapsedSeconds = 0;
  recordingStartTime = 0;
  activeRecordingId = null;
  updateActionBadge();
  stopKeepAliveHeartbeat();
  persistRecordingState();
}

/**
 * Persists recording state to session/local storage and broadcasts change.
 */
async function persistRecordingState() {
  const statePayload = {
    state: recordingState,
    status: recordingState.toLowerCase(),
    startTime: recordingStartTime,
    elapsedSeconds: recordingElapsedSeconds,
    recordingId: activeRecordingId,
    config: recordingConfig,
    updatedAt: Date.now()
  };

  try {
    if (chrome.storage?.session) {
      await chrome.storage.session.set({ fullshot_recording_state: statePayload });
    } else {
      await chrome.storage.local.set({ fullshot_recording_state: statePayload });
    }
  } catch (e) {
    // Storage sync warning ignored
  }

  // Broadcast state change across extension components (both action keys for maximum compatibility)
  try {
    chrome.runtime.sendMessage({
      action: 'RECORDING_STATE_CHANGED',
      statePayload,
      state: statePayload
    }).catch(() => {});

    chrome.runtime.sendMessage({
      action: 'videoRecordingStateChanged',
      statePayload,
      state: statePayload
    }).catch(() => {});
  } catch (e) {}
}

// Restore state on Service Worker startup
(async function initServiceWorkerState() {
  try {
    let saved = null;
    if (chrome.storage?.session) {
      const res = await chrome.storage.session.get('fullshot_recording_state');
      saved = res?.fullshot_recording_state;
    }
    if (!saved && chrome.storage?.local) {
      const res = await chrome.storage.local.get('fullshot_recording_state');
      saved = res?.fullshot_recording_state;
    }

    if (saved && (saved.state === RECORDING_STATE.RECORDING || saved.state === RECORDING_STATE.PAUSED || saved.status === 'recording' || saved.status === 'paused')) {
      recordingState = saved.state || (saved.status === 'recording' ? RECORDING_STATE.RECORDING : RECORDING_STATE.PAUSED);
      recordingStartTime = saved.startTime || Date.now();
      recordingElapsedSeconds = saved.elapsedSeconds || 0;
      activeRecordingId = saved.recordingId || null;
      recordingConfig = saved.config || null;

      if (recordingState === RECORDING_STATE.RECORDING) {
        startRecordingTimer();
      } else {
        updateActionBadge();
      }
    } else {
      recordingState = RECORDING_STATE.IDLE;
      updateActionBadge();
    }
  } catch (err) {
    console.warn('[Background] SW durum geri yükleme uyarısı:', err);
  }
})();

// ==========================================
// 6. Tab Media Stream ID Helper
// ==========================================
async function getTabMediaStreamId(targetTabId) {
  return new Promise((resolve, reject) => {
    if (!chrome.tabCapture || !chrome.tabCapture.getMediaStreamId) {
      resolve(null);
      return;
    }

    chrome.tabCapture.getMediaStreamId({ targetTabId }, (streamId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(streamId);
      }
    });
  });
}

// ==========================================
// 7. Video Recording Workflow Handlers
// ==========================================

/**
 * Initiates video recording with offscreen document.
 */
async function handleStartRecording(options = {}, senderTab = null) {
  if (recordingState === RECORDING_STATE.RECORDING) {
    throw new Error('Aktif bir video kaydı zaten devam ediyor.');
  }

  const captureType = options.captureType || options.scope || 'tab';
  let streamId = options.streamId;

  // 1. Resolve target tab & streamId for Tab Capture
  if (!streamId && captureType === 'tab') {
    let targetTab = senderTab;
    let targetTabId = options.tabId || senderTab?.id;

    if (!targetTabId) {
      const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (activeTabs && activeTabs[0]) {
        targetTab = activeTabs[0];
        targetTabId = activeTabs[0].id;
      }
    }
    if (!targetTabId) {
      const activeTabs = await chrome.tabs.query({ active: true });
      if (activeTabs && activeTabs[0]) {
        targetTab = activeTabs[0];
        targetTabId = activeTabs[0].id;
      }
    }

    // Security check: Restricted pages cannot be recorded in tab capture mode
    if (targetTab && isProtectedBrowserUrl(targetTab.url)) {
      throw new Error('Chrome güvenlik politikası nedeniyle tarayıcı sistem sayfaları ve Chrome Web Mağazası sekme modunda kaydedilemez. Lütfen "Tüm Ekran" seçeneğini kullanın.');
    }

    if (targetTabId) {
      try {
        streamId = await getTabMediaStreamId(targetTabId);
      } catch (streamErr) {
        console.warn('[Background] Tab media stream ID alınamadı:', streamErr);
      }
    }

    if (!streamId) {
      throw new Error('Sekme yakalama akış kimliği (streamId) alınamadı. Lütfen sekmede bir kez tıklayıp tekrar deneyin.');
    }
  }

  // 2. Delegate to Offscreen Document
  const offscreenResponse = await sendToOffscreen('START_RECORDING', {
    ...options,
    streamId,
    captureType: (captureType === 'screen' || captureType === 'desktop') ? 'desktop' : 'tab',
    scope: options.scope || captureType
  });

  if (!offscreenResponse || !offscreenResponse.success) {
    throw new Error(offscreenResponse?.error || 'Offscreen kayıt başlatılamadı.');
  }

  // 3. Update state & timers
  recordingState = RECORDING_STATE.RECORDING;
  recordingStartTime = Date.now();
  recordingElapsedSeconds = 0;
  activeRecordingId = offscreenResponse.recordingId || `rec_${Date.now()}`;
  recordingConfig = options;

  startRecordingTimer();
  await persistRecordingState();

  // 4. Notify active tab content script to display floating widget
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'showRecordingWidget',
        startTime: recordingStartTime
      }).catch(() => {});
    }
  } catch (e) {}

  return {
    success: true,
    recordingId: activeRecordingId,
    startTime: recordingStartTime,
    state: recordingState
  };
}

/**
 * Pauses active video recording.
 */
async function handlePauseRecording() {
  if (recordingState !== RECORDING_STATE.RECORDING) {
    throw new Error('Duraklatılacak aktif bir kayıt bulunmuyor.');
  }

  const offscreenResponse = await sendToOffscreen('PAUSE_RECORDING');

  if (!offscreenResponse || !offscreenResponse.success) {
    throw new Error(offscreenResponse?.error || 'Kayıt duraklatılamadı.');
  }

  recordingState = RECORDING_STATE.PAUSED;
  pauseRecordingTimer();
  await persistRecordingState();

  return { success: true, state: recordingState };
}

/**
 * Resumes paused video recording.
 */
async function handleResumeRecording() {
  if (recordingState !== RECORDING_STATE.PAUSED) {
    throw new Error('Devam ettirilecek duraklatılmış bir kayıt bulunmuyor.');
  }

  const offscreenResponse = await sendToOffscreen('RESUME_RECORDING');

  if (!offscreenResponse || !offscreenResponse.success) {
    throw new Error(offscreenResponse?.error || 'Kayıt devam ettirilemedi.');
  }

  recordingState = RECORDING_STATE.RECORDING;
  startRecordingTimer();
  await persistRecordingState();

  return { success: true, state: recordingState };
}

/**
 * Stops video recording, resets state, and opens preview-video.html in a new tab.
 */
async function handleStopRecording() {
  if (recordingState === RECORDING_STATE.IDLE) {
    throw new Error('Durdurulacak aktif bir kayıt bulunmuyor.');
  }

  let result = null;
  try {
    result = await sendToOffscreen('STOP_RECORDING');
  } catch (err) {
    console.error('[Background] Offscreen STOP_RECORDING mesaj hatası:', err);
  }

  const recId = result?.recordingId || activeRecordingId;

  // Reset internal state and badge
  recordingState = RECORDING_STATE.IDLE;
  resetRecordingTimer();

  // Open Preview Video Page in New Tab
  if (recId) {
    const previewUrl = chrome.runtime.getURL(`${PREVIEW_VIDEO_PATH}?id=${encodeURIComponent(recId)}`);
    chrome.tabs.create({ url: previewUrl });
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL(PREVIEW_VIDEO_PATH) });
  }

  return {
    success: true,
    recordingId: recId,
    duration: result?.duration || 0,
    size: result?.size || 0,
    mimeType: result?.mimeType || 'video/webm'
  };
}

/**
 * Discards/cancels active video recording and closes offscreen document.
 */
async function handleDiscardRecording() {
  try {
    await sendToOffscreen('DISCARD_RECORDING');
  } catch (e) {
    // Ignore if offscreen already closed
  }

  recordingState = RECORDING_STATE.IDLE;
  resetRecordingTimer();
  await closeOffscreenDocument();

  return { success: true };
}

/**
 * Opens video preview tab for a given recording ID.
 */
function handleOpenVideoPreview(recordingId) {
  const url = recordingId
    ? chrome.runtime.getURL(`${PREVIEW_VIDEO_PATH}?id=${encodeURIComponent(recordingId)}`)
    : chrome.runtime.getURL(PREVIEW_VIDEO_PATH);

  chrome.tabs.create({ url });
  return { success: true, url };
}

// ==========================================
// 8. Screenshot Capture Coordinator with Exponential Backoff Retry
// ==========================================

/**
 * Captures the visible tab with robust Exponential Backoff Retry.
 * Handles Chromium rate limits (MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND),
 * transient rendering glitches, and tab focus delays.
 *
 * @param {number|null} windowId Window ID (null for current window)
 * @param {Object} options Capture options ({ format: 'png'|'jpeg', quality: number })
 * @param {number} maxRetries Maximum retry attempts (default: 5)
 * @param {number} initialDelayMs Initial backoff delay in ms (default: 200)
 * @returns {Promise<string>} Base64 Data URL of the screenshot
 */
async function captureTabWithRetry(windowId = null, options = { format: 'png' }, maxRetries = 5, initialDelayMs = 200) {
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const targetWindowId = (typeof windowId === 'number' && windowId > 0) ? windowId : null;

      const dataUrl = await new Promise((resolve, reject) => {
        const callback = (resultUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!resultUrl) {
            reject(new Error('captureVisibleTab boş görüntü döndürdü.'));
          } else {
            resolve(resultUrl);
          }
        };

        if (targetWindowId !== null) {
          chrome.tabs.captureVisibleTab(targetWindowId, options, callback);
        } else {
          chrome.tabs.captureVisibleTab(options, callback);
        }
      });

      if (dataUrl) {
        return dataUrl;
      }
    } catch (err) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isQuota = errMsg.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND') || errMsg.includes('quota') || errMsg.includes('rate limit');

      if (attempt < maxRetries - 1) {
        // Calculate exponential backoff delay with random jitter
        const base = isQuota ? Math.max(400, initialDelayMs) : initialDelayMs;
        const exponentialDelay = base * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 60);
        const waitMs = Math.min(exponentialDelay + jitter, 3000);

        console.warn(`[Background] captureVisibleTab deneme ${attempt + 1}/${maxRetries} başarısız (${errMsg}). ${waitMs}ms sonra tekrar deneniyor...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
    }
  }

  console.error('[Background] captureVisibleTab tüm denemelerde başarısız oldu:', lastError);
  throw new Error(`Görünür alan ekran görüntüsü alınamadı: ${lastError?.message || 'Zaman aşımı'}`);
}

// ==========================================
// 9. Unified Runtime Message Router
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Ignore messages targeted strictly for offscreen document
  if (request.target === 'offscreen') {
    return false;
  }

  const action = request.action || request.type;

  // ------------------------------------------
  // A. SCREENSHOT ACTIONS
  // ------------------------------------------
  if (action === 'captureVisibleTab') {
    const format = request.format === 'jpeg' ? 'jpeg' : 'png';
    const options = { format };
    if (format === 'jpeg') {
      options.quality = typeof request.quality === 'number' ? request.quality : 95;
    }

    const targetWindowId = sender.tab?.windowId || null;

    captureTabWithRetry(targetWindowId, options)
      .then((dataUrl) => {
        sendResponse({ success: true, dataUrl });
      })
      .catch((error) => {
        console.error('[Background] captureVisibleTab error:', error);
        sendResponse({ success: false, error: error.message || 'Görüntü yakalanamadı.' });
      });

    return true; // Async response
  }

  if (action === 'openPreview' || action === 'OPEN_IN_STUDIO' || action === 'ACTION_OPEN_STUDIO') {
    if (request.captureData) {
      if (typeof FullShotDB !== 'undefined' && FullShotDB.saveCapture) {
        FullShotDB.saveCapture('current_capture', request.captureData).catch((e) => console.warn('[Background] FullShotDB saveCapture uyarısı:', e));
      }
      chrome.storage.local.set({ fullshot_current_capture: request.captureData }, () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL(PREVIEW_IMAGE_PATH)
        });
        sendResponse({ success: true });
      });
    } else {
      chrome.tabs.create({
        url: chrome.runtime.getURL(PREVIEW_IMAGE_PATH)
      });
      sendResponse({ success: true });
    }
    return true;
  }

  if (action === 'downloadImage' || action === 'DIRECT_DOWNLOAD' || action === 'ACTION_QUICK_DOWNLOAD') {
    const { dataUrl, filename, saveAs } = request;
    if (!dataUrl) {
      sendResponse({ success: false, error: 'İndirilecek görüntü verisi bulunamadı.' });
      return true;
    }

    const shouldSaveAs = typeof saveAs === 'boolean' ? saveAs : (action === 'downloadImage' && request.saveAs !== false);

    chrome.downloads.download({
      url: dataUrl,
      filename: filename || `FullShot_${Date.now()}.png`,
      saveAs: shouldSaveAs
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true;
  }

  if (action === 'COPY_TO_CLIPBOARD' || action === 'ACTION_QUICK_COPY') {
    // Background coordinator response for quick copy
    sendResponse({ success: true });
    return false;
  }

  if (action === 'captureVisibleArea') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || !tabs[0]) {
        sendResponse({ success: false, error: 'Aktif sekme bulunamadı.' });
        return;
      }
      const tab = tabs[0];
      try {
        const format = request.format === 'jpeg' ? 'jpeg' : 'png';
        const options = { format };
        if (format === 'jpeg') {
          options.quality = typeof request.quality === 'number' ? request.quality : 95;
        }

        const dataUrl = await captureTabWithRetry(tab.windowId, options);

        const item = {
          dataUrl,
          title: tab.title || 'Görünür Alan',
          url: tab.url || '',
          width: tab.width || 0,
          height: tab.height || 0,
          format,
          timestamp: Date.now(),
          type: 'visible'
        };

        if (typeof FullShotDB !== 'undefined' && FullShotDB.saveCapture) {
          await FullShotDB.saveCapture('current_capture', item).catch((e) => console.warn('[Background] FullShotDB capture kaydetme uyarısı:', e));
        }
        await chrome.storage.local.set({ fullshot_current_capture: item });
        chrome.tabs.create({ url: chrome.runtime.getURL(PREVIEW_IMAGE_PATH) });
        sendResponse({ success: true });
      } catch (err) {
        console.error('[Background] Görünür alan yakalama hatası:', err);
        sendResponse({ success: false, error: err.message || 'Görünür alan yakalanamadı.' });
      }
    });
    return true;
  }

  // ------------------------------------------
  // B. VIDEO RECORDING ACTIONS
  // ------------------------------------------
  if (
    action === 'startRecording' ||
    action === 'START_RECORDING' ||
    action === 'startVideoRecording'
  ) {
    handleStartRecording(request.options || request, sender.tab)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === 'startTabRecording') {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const targetTab = tabs[0];
        if (!targetTab) throw new Error('Aktif sekme bulunamadı.');

        const streamId = await getTabMediaStreamId(targetTab.id);

        const result = await handleStartRecording({
          streamId,
          tabId: targetTab.id,
          captureType: 'tab',
          includeMic: Boolean(request.includeMic),
          includeTabAudio: request.includeTabAudio !== false,
          mimeType: request.mimeType || 'video/webm;codecs=vp9,opus',
          fps: request.fps || 30
        }, targetTab);

        sendResponse(result);
      } catch (err) {
        console.error('[Background] startTabRecording hatası:', err);
        sendResponse({ success: false, error: err.message || 'Sekme kaydı başlatılamadı.' });
      }
    })();
    return true;
  }

  if (action === 'startScreenRecording') {
    (async () => {
      try {
        const sources = ['screen', 'window', 'tab'];
        chrome.desktopCapture.chooseDesktopMedia(sources, sender.tab || null, async (streamId) => {
          if (!streamId) {
            sendResponse({ success: false, error: 'Ekran paylaşımı iptal edildi veya izin verilmedi.' });
            return;
          }

          try {
            const result = await handleStartRecording({
              streamId,
              captureType: 'desktop',
              includeMic: Boolean(request.includeMic),
              includeTabAudio: request.includeTabAudio !== false,
              mimeType: request.mimeType || 'video/webm;codecs=vp9,opus',
              fps: request.fps || 30
            });
            sendResponse(result);
          } catch (err) {
            console.error('[Background] startScreenRecording hatası:', err);
            sendResponse({ success: false, error: err.message });
          }
        });
      } catch (err) {
        console.error('[Background] desktopCapture hatası:', err);
        sendResponse({ success: false, error: err.message || 'Ekran kaydı başlatılamadı.' });
      }
    })();
    return true;
  }

  if (action === 'pauseRecording' || action === 'PAUSE_RECORDING' || action === 'pauseVideoRecording') {
    handlePauseRecording()
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === 'resumeRecording' || action === 'RESUME_RECORDING' || action === 'resumeVideoRecording') {
    handleResumeRecording()
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === 'stopRecording' || action === 'STOP_RECORDING' || action === 'stopVideoRecording') {
    handleStopRecording()
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (
    action === 'discardRecording' ||
    action === 'DISCARD_RECORDING' ||
    action === 'cancelRecording' ||
    action === 'cancelVideoRecording'
  ) {
    handleDiscardRecording()
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (
    action === 'getRecordingState' ||
    action === 'GET_RECORDING_STATE' ||
    action === 'getVideoRecordingState' ||
    action === 'getRecordingStatus' ||
    action === 'GET_RECORDING_STATUS'
  ) {
    const isRec = recordingState === RECORDING_STATE.RECORDING;
    const isPau = recordingState === RECORDING_STATE.PAUSED;
    const payload = {
      success: true,
      active: recordingState !== RECORDING_STATE.IDLE,
      state: recordingState,
      status: recordingState.toLowerCase(),
      isRecording: isRec,
      isPaused: isPau,
      duration: recordingElapsedSeconds * 1000,
      elapsedSeconds: recordingElapsedSeconds,
      startTime: recordingStartTime,
      recordingId: activeRecordingId,
      config: recordingConfig
    };
    sendResponse(payload);
    return true;
  }

  if (action === 'openVideoPreview' || action === 'OPEN_VIDEO_PREVIEW') {
    const res = handleOpenVideoPreview(request.recordingId || request.id);
    sendResponse(res);
    return true;
  }

  if (action === 'getTabStreamId' || action === 'GET_TAB_STREAM_ID') {
    const targetTabId = request.tabId || sender.tab?.id;
    getTabMediaStreamId(targetTabId)
      .then((streamId) => sendResponse({ success: true, streamId }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // ------------------------------------------
  // C. OFFSCREEN LIFECYCLE CONTROLLERS
  // ------------------------------------------
  if (action === 'hasOffscreenDocument') {
    hasOffscreenDocument()
      .then((hasDoc) => sendResponse({ success: true, hasDocument: hasDoc }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === 'createOffscreenDocument' || action === 'setupOffscreenDocument') {
    setupOffscreenDocument()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === 'closeOffscreenDocument') {
    closeOffscreenDocument()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // ------------------------------------------
  // D. OFFSCREEN EVENT NOTIFICATIONS
  // ------------------------------------------
  if (action === 'RECORDING_COMPLETED') {
    const recId = request.recordingId || activeRecordingId;
    recordingState = RECORDING_STATE.IDLE;
    resetRecordingTimer();

    // Automatically open preview-video.html
    if (recId) {
      const previewUrl = chrome.runtime.getURL(`${PREVIEW_VIDEO_PATH}?id=${encodeURIComponent(recId)}`);
      chrome.tabs.create({ url: previewUrl });
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL(PREVIEW_VIDEO_PATH) });
    }

    sendResponse({ success: true });
    return true;
  }

  if (action === 'OFFSCREEN_READY') {
    sendResponse({ success: true, timestamp: Date.now() });
    return true;
  }
});

// ==========================================
// 10. Chrome Global Shortcuts & Protection Handler
// ==========================================

/**
 * Checks if a target URL is a protected browser system page
 */
function isProtectedBrowserUrl(url = '') {
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('view-source:') ||
    url.includes('chrome.google.com/webstore') ||
    url.includes('chromewebstore.google.com')
  );
}

/**
 * Displays a temporary extension badge warning when capture is blocked on protected URLs
 */
function showProtectedUrlBadgeWarning() {
  chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setTitle({ title: 'FullShot Pro: Tarayıcı güvenlik kısıtlaması nedeniyle sistem sayfalarında işlem yapılamaz.' });
  setTimeout(() => {
    if (recordingState === RECORDING_STATE.IDLE) {
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setTitle({ title: 'FullShot Pro - Tam Sayfa Ekran Görüntüsü & Video Kaydedici' });
    }
  }, 3500);
}

chrome.commands.onCommand.addListener(async (command) => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || !tabs[0]) return;
  const tab = tabs[0];
  const url = tab.url || '';

  if (isProtectedBrowserUrl(url)) {
    showProtectedUrlBadgeWarning();
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        'src/content/hud/progress-hud.js',
        'src/content/hud/toast-hud.js',
        'src/content/hud/quick-bar-hud.js',
        'src/content/hud/area-selector.js',
        'src/content/hud/element-picker.js',
        'src/content/hud/pin-window.js',
        'src/content/hud/pixel-ruler.js',
        'src/content/hud/recording-bar.js',
        'src/content/hud/countdown-hud.js',
        'src/content/hud/camera-bubble.js',
        'src/content/hud/cursor-effects.js',
        'src/content/capture/dom-measurer.js',
        'src/content/capture/sticky-filter.js',
        'src/content/capture/scroll-stitcher.js',
        'src/content/content.js'
      ]
    });
  } catch (e) {
    // Already injected or restricted
  }

  const settings = await chrome.storage.sync.get({
    format: 'png',
    scrollDelay: 250,
    hideFixed: true
  });

  if (command === 'capture-fullpage') {
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showHUDToast',
        message: 'Tam Sayfa Yakalanıyor... (Alt+Shift+F)',
        options: { icon: 'scroll', duration: 2500 }
      }).catch(() => {});
    } catch (e) {}

    chrome.tabs.sendMessage(tab.id, {
      action: 'startFullPageCapture',
      options: {
        format: settings.format,
        scrollDelay: settings.scrollDelay,
        hideFixed: settings.hideFixed,
        quality: 95
      }
    });
  } else if (command === 'capture-visible') {
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showHUDToast',
        message: 'Görünür Alan Yakalanıyor... (Alt+Shift+V)',
        options: { icon: 'camera', duration: 1800 }
      }).catch(() => {});
    } catch (e) {}

    // Wait a brief moment for toast rendering or Double RAF reflow
    setTimeout(async () => {
      try {
        const dataUrl = await captureTabWithRetry(tab.windowId, { format: settings.format });
        const item = {
          dataUrl,
          title: tab.title || 'Görünür Alan',
          url: tab.url || '',
          width: tab.width || 0,
          height: tab.height || 0,
          format: settings.format,
          timestamp: Date.now(),
          type: 'visible'
        };
        await chrome.storage.local.set({ fullshot_current_capture: item });
        chrome.tabs.create({ url: chrome.runtime.getURL(PREVIEW_IMAGE_PATH) });
      } catch (err) {
        console.error('[Background] Shortcut visible capture error:', err);
      }
    }, 120);
  } else if (command === 'capture-selected') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'startSelectedAreaCapture',
      options: { format: settings.format, quality: 95 }
    });
  } else if (command === 'capture-element') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'startElementPicker',
      options: { format: settings.format, quality: 95 }
    });
  }
});
