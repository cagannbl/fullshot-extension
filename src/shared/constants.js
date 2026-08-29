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
  
  // Navigation & Studio
  OPEN_IMAGE_STUDIO: 'openPreview',
  OPEN_VIDEO_STUDIO: 'openVideoPreview',
  DOWNLOAD_IMAGE: 'downloadImage',
  DOWNLOAD_VIDEO: 'downloadVideo',
  
  // Video Recording Actions
  START_RECORDING: 'START_RECORDING',
  STOP_RECORDING: 'STOP_RECORDING',
  PAUSE_RECORDING: 'PAUSE_RECORDING',
  RESUME_RECORDING: 'RESUME_RECORDING',
  DISCARD_RECORDING: 'DISCARD_RECORDING',
  GET_RECORDING_STATE: 'GET_RECORDING_STATE',
  
  // Offscreen Lifecycle
  OFFSCREEN_READY: 'OFFSCREEN_READY',
  CREATE_OFFSCREEN: 'createOffscreenDocument',
  CLOSE_OFFSCREEN: 'closeOffscreenDocument',
  HAS_OFFSCREEN: 'hasOffscreenDocument'
};

// ==========================================
// 2. Storage Keys (chrome.storage & IndexedDB)
// ==========================================
const STORAGE_KEYS = {
  SETTINGS: 'fullshot_settings',
  CURRENT_CAPTURE: 'fullshot_current_capture',
  CURRENT_VIDEO: 'fullshot_current_video',
  RECORDING_STATE: 'fullshot_recording_state',
  VIDEO_RECORDINGS: 'fullshot_recordings',
  USER_PREFERENCES: 'fullshot_preferences'
};

// ==========================================
// 3. Recording States
// ==========================================
const RECORDING_STATE = {
  IDLE: 'IDLE',
  RECORDING: 'RECORDING',
  PAUSED: 'PAUSED'
};

// ==========================================
// 4. Default Settings & Thresholds
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
// 5. Design System Tokens (4-Color Palette)
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
  window.STORAGE_KEYS = STORAGE_KEYS;
  window.RECORDING_STATE = RECORDING_STATE;
  window.DEFAULTS = DEFAULTS;
  window.THEME_TOKENS = THEME_TOKENS;
  window.FullShotConstants = FullShotConstants;
}

if (typeof self !== 'undefined') {
  self.ACTIONS = ACTIONS;
  self.STORAGE_KEYS = STORAGE_KEYS;
  self.RECORDING_STATE = RECORDING_STATE;
  self.DEFAULTS = DEFAULTS;
  self.THEME_TOKENS = THEME_TOKENS;
  self.FullShotConstants = FullShotConstants;
}

if (typeof globalThis !== 'undefined') {
  globalThis.ACTIONS = ACTIONS;
  globalThis.STORAGE_KEYS = STORAGE_KEYS;
  globalThis.RECORDING_STATE = RECORDING_STATE;
  globalThis.DEFAULTS = DEFAULTS;
  globalThis.THEME_TOKENS = THEME_TOKENS;
  globalThis.FullShotConstants = FullShotConstants;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ACTIONS,
    STORAGE_KEYS,
    RECORDING_STATE,
    DEFAULTS,
    THEME_TOKENS,
    FullShotConstants
  };
}
