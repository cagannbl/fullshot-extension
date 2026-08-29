/**
 * FullShot Pro - Shared Constants & Enums
 * Centralized definition of message actions, storage keys, and configurations.
 * Usable across Background Service Worker, Content Script, Popup, Offscreen, and Studio pages.
 */

// ==========================================
// 1. Message Actions (Inter-module communication)
// ==========================================
const ACTIONS = {
  // Screenshot Actions
  CAPTURE_VISIBLE_TAB: 'captureVisibleTab',
  CAPTURE_FULL_PAGE: 'startFullPageCapture',
  CAPTURE_VISIBLE_AREA: 'captureVisibleArea',
  CAPTURE_SELECTED_AREA: 'startSelectedAreaCapture',
  CAPTURE_ELEMENT_PICKER: 'startElementPicker',
  
  // Navigation & Studio & Quick Actions
  OPEN_IMAGE_STUDIO: 'openPreview',
  OPEN_IN_STUDIO: 'OPEN_IN_STUDIO',
  ACTION_OPEN_STUDIO: 'ACTION_OPEN_STUDIO',
  OPEN_VIDEO_STUDIO: 'openVideoPreview',
  OPEN_VIDEO_PREVIEW: 'OPEN_VIDEO_PREVIEW',
  DOWNLOAD_IMAGE: 'downloadImage',
  DIRECT_DOWNLOAD: 'DIRECT_DOWNLOAD',
  ACTION_QUICK_DOWNLOAD: 'ACTION_QUICK_DOWNLOAD',
  COPY_TO_CLIPBOARD: 'COPY_TO_CLIPBOARD',
  ACTION_QUICK_COPY: 'ACTION_QUICK_COPY',
  DOWNLOAD_VIDEO: 'downloadVideo',
  
  // Video Recording Actions
  START_RECORDING: 'START_RECORDING',
  START_VIDEO_RECORDING: 'startVideoRecording',
  START_TAB_RECORDING: 'startTabRecording',
  START_SCREEN_RECORDING: 'startScreenRecording',
  STOP_RECORDING: 'STOP_RECORDING',
  STOP_VIDEO_RECORDING: 'stopVideoRecording',
  PAUSE_RECORDING: 'PAUSE_RECORDING',
  PAUSE_VIDEO_RECORDING: 'pauseVideoRecording',
  RESUME_RECORDING: 'RESUME_RECORDING',
  RESUME_VIDEO_RECORDING: 'resumeVideoRecording',
  DISCARD_RECORDING: 'DISCARD_RECORDING',
  CANCEL_RECORDING: 'cancelRecording',
  CANCEL_VIDEO_RECORDING: 'cancelVideoRecording',
  GET_RECORDING_STATE: 'GET_RECORDING_STATE',
  GET_VIDEO_RECORDING_STATE: 'getVideoRecordingState',
  RECORDING_STATE_CHANGED: 'RECORDING_STATE_CHANGED',
  VIDEO_RECORDING_STATE_CHANGED: 'videoRecordingStateChanged',
  RECORDING_COMPLETED: 'RECORDING_COMPLETED',
  RECORDING_PAUSED: 'RECORDING_PAUSED',
  RECORDING_RESUMED: 'RECORDING_RESUMED',
  RECORDING_ERROR: 'RECORDING_ERROR',

  // In-Page HUD & Widget Actions
  SHOW_HUD_TOAST: 'showHUDToast',
  HIDE_HUD_TOAST: 'hideHUDToast',
  SHOW_RECORDING_WIDGET: 'showRecordingWidget',
  HIDE_RECORDING_WIDGET: 'hideRecordingWidget',
  PAUSE_RECORDING_WIDGET: 'pauseRecordingWidget',
  RESUME_RECORDING_WIDGET: 'resumeRecordingWidget',
  START_COUNTDOWN: 'startCountdown',
  CANCEL_COUNTDOWN: 'cancelCountdown',
  START_PIXEL_RULER: 'startPixelRuler',
  TOGGLE_PIXEL_RULER: 'togglePixelRuler',
  STOP_PIXEL_RULER: 'stopPixelRuler',
  PIN_CAPTURE: 'pinCapture',
  PIN_TO_SCREEN: 'pinToScreen',
  PERFORM_OCR: 'PERFORM_OCR',
  EXTRACT_TEXT: 'EXTRACT_TEXT',
  
  // Service Worker Keep-Alive & Heartbeat
  HEARTBEAT: 'heartbeat',
  HEARTBEAT_ACK: 'heartbeat-ack',
  PING: 'ping',
  PONG: 'pong',
  
  // Offscreen Lifecycle
  OFFSCREEN_READY: 'OFFSCREEN_READY',
  CREATE_OFFSCREEN: 'createOffscreenDocument',
  CLOSE_OFFSCREEN: 'closeOffscreenDocument',
  HAS_OFFSCREEN: 'hasOffscreenDocument'
};

// ==========================================
// 2. Port Channel Identifiers (Keep-Alive)
// ==========================================
const PORTS = {
  KEEPALIVE_RECORDING: 'keepAlive-recording',
  KEEPALIVE: 'keepAlive',
  OFFSCREEN: 'offscreen',
  RECORDING: 'recording'
};

// ==========================================
// 3. Security & Protected URLs
// ==========================================
const PROTECTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'view-source:',
  'chrome.google.com/webstore',
  'chromewebstore.google.com'
];

// ==========================================
// 4. Storage Keys (chrome.storage & IndexedDB)
// ==========================================
const STORAGE_KEYS = {
  SETTINGS: 'fullshot_settings',
  CURRENT_CAPTURE: 'fullshot_current_capture',
  CURRENT_VIDEO: 'fullshot_current_video',
  RECORDING_STATE: 'fullshot_recording_state',
  VIDEO_RECORDINGS: 'fullshot_recordings',
  USER_PREFERENCES: 'fullshot_preferences',
  CAPTURE_BEHAVIOR: 'fullshot_capture_behavior'
};

// ==========================================
// 5. Recording States
// ==========================================
const RECORDING_STATE = {
  IDLE: 'IDLE',
  RECORDING: 'RECORDING',
  PAUSED: 'PAUSED'
};

// ==========================================
// 6. Default Settings & Thresholds
// ==========================================
const DEFAULTS = {
  FORMAT: 'png',           // 'png' | 'jpeg'
  QUALITY: 95,             // 1-100 for JPEG
  SCROLL_DELAY_MS: 250,    // Delay between page scrolls (ms)
  HIDE_FIXED_ELEMENTS: true,
  COUNTDOWN_SECONDS: 0,    // 0, 3, 5, 10
  MAX_CANVAS_DIMENSION: 16384, // Blink safe canvas boundary
  MAX_CANVAS_AREA: 134217728   // 16384 * 8192 (~134M pixels)
};

// ==========================================
// 7. Design System Tokens (4-Color Palette)
// ==========================================
const THEME_TOKENS = {
  BG_CARD: '#4A4A4A',       // Koyu Kömür / Antrasit Kart Zemini
  TEXT_MUTED: '#CBCBCB',    // Açık Gümüş Gri Açıklama / İkincil Metin
  TEXT_PRIMARY: '#FFFFE3',  // Krem Fildişi Beyazı Başlık & Metin
  PRIMARY_ACCENT: '#6D8196',// Slate Blue Vurgusu & Butonlar
  BORDER_RADIUS_CARD: 12,
  BORDER_RADIUS_WINDOW: 16
};

const FullShotConstants = {
  ACTIONS,
  PORTS,
  PROTECTED_URL_PREFIXES,
  STORAGE_KEYS,
  RECORDING_STATE,
  DEFAULTS,
  THEME_TOKENS
};

// ==========================================
// Cross-Context Exports
// ==========================================
if (typeof window !== 'undefined') {
  window.ACTIONS = ACTIONS;
  window.PORTS = PORTS;
  window.PROTECTED_URL_PREFIXES = PROTECTED_URL_PREFIXES;
  window.STORAGE_KEYS = STORAGE_KEYS;
  window.RECORDING_STATE = RECORDING_STATE;
  window.DEFAULTS = DEFAULTS;
  window.THEME_TOKENS = THEME_TOKENS;
  window.FullShotConstants = FullShotConstants;
}

if (typeof self !== 'undefined') {
  self.ACTIONS = ACTIONS;
  self.PORTS = PORTS;
  self.PROTECTED_URL_PREFIXES = PROTECTED_URL_PREFIXES;
  self.STORAGE_KEYS = STORAGE_KEYS;
  self.RECORDING_STATE = RECORDING_STATE;
  self.DEFAULTS = DEFAULTS;
  self.THEME_TOKENS = THEME_TOKENS;
  self.FullShotConstants = FullShotConstants;
}

if (typeof globalThis !== 'undefined') {
  globalThis.ACTIONS = ACTIONS;
  globalThis.PORTS = PORTS;
  globalThis.PROTECTED_URL_PREFIXES = PROTECTED_URL_PREFIXES;
  globalThis.STORAGE_KEYS = STORAGE_KEYS;
  globalThis.RECORDING_STATE = RECORDING_STATE;
  globalThis.DEFAULTS = DEFAULTS;
  globalThis.THEME_TOKENS = THEME_TOKENS;
  globalThis.FullShotConstants = FullShotConstants;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ACTIONS,
    PORTS,
    PROTECTED_URL_PREFIXES,
    STORAGE_KEYS,
    RECORDING_STATE,
    DEFAULTS,
    THEME_TOKENS,
    FullShotConstants
  };
}
