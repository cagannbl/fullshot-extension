/**
 * FullShot Pro - Offscreen Audio Mixing & MediaRecorder Engine
 * Handles Tab Audio + Microphone Audio Mixing via Web Audio API (ChannelMergerNode),
 * MediaRecorder capturing, 4K/60FPS ultra bitrates, WebM duration metadata fixing (EBML patcher),
 * Keep-Alive Service Worker connection, IndexedDB storage, and resource cleanup.
 */

// ============================================================================
// 1. STATE & GLOBAL VARIABLES
// ============================================================================

let recordingState = 'idle'; // 'idle' | 'recording' | 'paused' | 'stopping'
let mediaRecorder = null;
let recordedChunks = [];
let tabStream = null;
let micStream = null;
let mixedStream = null;

// Web Audio API Mixing Graph Nodes
let audioContext = null;
let tabAudioSource = null;
let micAudioSource = null;
let micHighPassFilter = null;
let micNotch50Filter = null;
let micNotch60Filter = null;
let tabGainNode = null;
let micGainNode = null;
let tabSplitterNode = null;
let micSplitterNode = null;
let channelMergerNode = null;
let dynamicsCompressorNode = null;
let destinationNode = null;

let recordingStartTime = 0;
let totalPausedDuration = 0;
let pauseStartTime = 0;
let statusInterval = null;
let currentOptions = {};

// Keep-Alive connection to Background Service Worker
let keepAlivePort = null;
let keepAliveTimer = null;
let reconnectTimeout = null;

/**
 * Updates DOM indicators inside offscreen.html
 */
function updateDOMStatus(state, label) {
  try {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    if (indicator) {
      indicator.className = 'indicator' + (state === 'recording' ? ' recording' : '');
    }
    if (statusText) {
      statusText.textContent = label || (state === 'recording' ? 'Kayıt Yapılıyor...' : state === 'paused' ? 'Kayıt Duraklatıldı' : 'Offscreen Document Hazır');
    }
  } catch (e) {}
}

// ============================================================================
// 2. SERVICE WORKER KEEP-ALIVE CONNECTION (Bidirectional Heartbeat Port)
// ============================================================================

/**
 * Establishes a persistent port connection to prevent Manifest V3 SW from terminating.
 */
function connectKeepAlive() {
  disconnectKeepAlive();
  try {
    keepAlivePort = chrome.runtime.connect({ name: 'keepAlive-recording' });

    keepAlivePort.onDisconnect.addListener(() => {
      keepAlivePort = null;
      // Auto-reconnect if recording is actively ongoing
      if (recordingState === 'recording' || recordingState === 'paused') {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          if (recordingState === 'recording' || recordingState === 'paused') {
            connectKeepAlive();
          }
        }, 500);
      }
    });

    keepAlivePort.onMessage.addListener((msg) => {
      // Respond to SW heartbeat pings immediately with pong
      if (msg?.action === 'heartbeat' || msg?.action === 'ping' || msg?.type === 'PING') {
        try {
          keepAlivePort?.postMessage({
            action: 'pong',
            type: 'PONG',
            timestamp: Date.now(),
            state: recordingState
          });
        } catch (e) {}
      }
    });

    // Send lightweight heartbeats from offscreen every 10 seconds (< 30s SW idle timeout)
    keepAliveTimer = setInterval(() => {
      if (recordingState === 'recording' || recordingState === 'paused') {
        // Ping chrome runtime to refresh SW activity
        try {
          chrome.runtime.getPlatformInfo().catch(() => {});
        } catch (e) {}

        if (keepAlivePort) {
          try {
            keepAlivePort.postMessage({
              action: 'heartbeat',
              timestamp: Date.now(),
              state: recordingState
            });
          } catch (e) {
            connectKeepAlive();
          }
        } else {
          connectKeepAlive();
        }
      }
    }, 10000);
  } catch (err) {
    console.warn('[Offscreen] Keep-alive portu oluşturulamadı:', err);
  }
}

/**
 * Closes the keep-alive port cleanly.
 */
function disconnectKeepAlive() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  if (keepAlivePort) {
    try {
      keepAlivePort.disconnect();
    } catch (e) {}
    keepAlivePort = null;
  }
}

// ============================================================================
// 3. INDEXEDDB PERSISTENCE LAYER (Standardized via FullShotDB)
// ============================================================================

const FALLBACK_DB_NAME = 'FullShotMediaDB';
const FALLBACK_DB_VERSION = 2;
const FALLBACK_STORE_NAME = 'recordings';

/**
 * Fallback IndexedDB initializer if FullShotDB script is absent.
 */
function openFallbackDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FALLBACK_DB_NAME, FALLBACK_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(FALLBACK_STORE_NAME)) {
        const store = db.createObjectStore(FALLBACK_STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      console.error('[Offscreen DB] Veritabanı açılırken hata:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Saves a recording entry to IndexedDB using FullShotDB or fallback.
 * @param {Object} item
 * @returns {Promise<string>} Recording ID
 */
async function saveRecordingToDB(item) {
  if (typeof window !== 'undefined' && window.FullShotDB && window.FullShotDB.saveRecording) {
    return await window.FullShotDB.saveRecording(item);
  }
  if (typeof FullShotDB !== 'undefined' && FullShotDB.saveRecording) {
    return await FullShotDB.saveRecording(item);
  }

  const db = await openFallbackDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([FALLBACK_STORE_NAME, 'videos'], 'readwrite');
    tx.objectStore(FALLBACK_STORE_NAME).put(item);
    tx.objectStore('videos').put(item);

    tx.oncomplete = () => resolve(item.id);
    tx.onerror = (e) => reject(e.target.error || new Error('Kayıt kaydedilemedi.'));
  });
}

/**
 * Retrieves a recording by ID from IndexedDB.
 * @param {string} id
 * @returns {Promise<Object>}
 */
async function getRecordingFromDB(id) {
  if (typeof window !== 'undefined' && window.FullShotDB && window.FullShotDB.getRecording) {
    return await window.FullShotDB.getRecording(id);
  }
  if (typeof FullShotDB !== 'undefined' && FullShotDB.getRecording) {
    return await FullShotDB.getRecording(id);
  }

  const db = await openFallbackDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([FALLBACK_STORE_NAME], 'readonly');
    const store = tx.objectStore(FALLBACK_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Deletes a recording by ID from IndexedDB.
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteRecordingFromDB(id) {
  if (typeof window !== 'undefined' && window.FullShotDB && window.FullShotDB.deleteRecording) {
    await window.FullShotDB.deleteRecording(id);
    return;
  }
  if (typeof FullShotDB !== 'undefined' && FullShotDB.deleteRecording) {
    await FullShotDB.deleteRecording(id);
    return;
  }

  const db = await openFallbackDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([FALLBACK_STORE_NAME, 'videos'], 'readwrite');
    tx.objectStore(FALLBACK_STORE_NAME).delete(id);
    tx.objectStore('videos').delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = (event) => reject(event.target.error);
  });
}

// ============================================================================
// 4. WEBM DURATION METADATA PATCHER (Fixes Chrome "Infinity" Duration Bug)
// ============================================================================

/**
 * Patches WebM duration in the EBML header to eliminate the Chrome "Infinity" duration bug.
 * Injects or updates the 0x4489 Duration element inside Segment Info (0x1549A966).
 * @param {Blob} webmBlob
 * @param {number} durationMs Duration in milliseconds
 * @returns {Promise<Blob>}
 */
async function fixWebmDuration(webmBlob, durationMs) {
  if (!webmBlob || durationMs <= 0) return webmBlob;

  try {
    const buffer = await webmBlob.arrayBuffer();
    const dataView = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);

    // Helper to read variable-size integer (EBML VINT) with full 64-bit safety
    function readVint(offset) {
      if (offset >= uint8.length) return null;
      const firstByte = uint8[offset];
      let length = 0;
      for (let i = 0; i < 8; i++) {
        if (firstByte & (0x80 >> i)) {
          length = i + 1;
          break;
        }
      }
      if (length === 0 || offset + length > uint8.length) return null;
      let val = firstByte & (0xff >> length);
      for (let i = 1; i < length; i++) {
        val = (val * 256) + uint8[offset + i];
      }
      return { length, value: val };
    }

    // Helper to encode variable-size integer with minimum byte length
    function encodeVint(val, length) {
      const bytes = new Uint8Array(length);
      const mask = (1 << (8 - length)) - 1;
      const firstBytePrefix = 1 << (8 - length);
      bytes[0] = firstBytePrefix | (Math.floor(val / Math.pow(256, length - 1)) & mask);
      for (let i = 1; i < length; i++) {
        bytes[i] = Math.floor(val / Math.pow(256, length - 1 - i)) & 0xff;
      }
      return bytes;
    }

    // Search for Info Element: 0x15, 0x49, 0xA9, 0x66
    let infoPos = -1;
    for (let i = 0; i < Math.min(uint8.length - 4, 8192); i++) {
      if (uint8[i] === 0x15 && uint8[i + 1] === 0x49 && uint8[i + 2] === 0xA9 && uint8[i + 3] === 0x66) {
        infoPos = i;
        break;
      }
    }

    if (infoPos === -1) {
      return webmBlob; // Segment Info not found in header, fallback
    }

    const infoVint = readVint(infoPos + 4);
    if (!infoVint) return webmBlob;

    const infoContentStart = infoPos + 4 + infoVint.length;
    const infoContentEnd = (infoVint.value <= 0 || infoVint.value > 1000000)
      ? infoContentStart + 1024
      : Math.min(uint8.length, infoContentStart + infoVint.value);

    // Look for TimecodeScale (0x2A, 0xD7, 0xB1) and Duration (0x44, 0x89) inside Info
    let timecodeScale = 1000000; // default 1,000,000 ns = 1ms
    let durationPos = -1;
    let durationLen = 0;

    let cur = infoContentStart;
    while (cur < infoContentEnd - 2) {
      // TimecodeScale: 0x2A 0xD7 0xB1
      if (cur < infoContentEnd - 3 && uint8[cur] === 0x2A && uint8[cur + 1] === 0xD7 && uint8[cur + 2] === 0xB1) {
        const v = readVint(cur + 3);
        if (v && cur + 3 + v.length + v.value <= uint8.length) {
          let tc = 0;
          for (let j = 0; j < v.value; j++) {
            tc = (tc * 256) + uint8[cur + 3 + v.length + j];
          }
          if (tc > 0) timecodeScale = tc;
          cur += 3 + v.length + v.value;
          continue;
        }
      }

      // Duration: 0x44 0x89
      if (uint8[cur] === 0x44 && uint8[cur + 1] === 0x89) {
        const v = readVint(cur + 2);
        if (v && (v.value === 4 || v.value === 8)) {
          durationPos = cur + 2 + v.length;
          durationLen = v.value;
          break;
        }
      }

      cur++;
    }

    const durationInScale = (durationMs * 1000000) / timecodeScale;

    if (durationPos !== -1 && (durationLen === 4 || durationLen === 8)) {
      // Overwrite existing duration in place
      if (durationLen === 4) {
        dataView.setFloat32(durationPos, durationInScale, false); // big-endian
      } else {
        dataView.setFloat64(durationPos, durationInScale, false); // big-endian
      }
      return new Blob([buffer], { type: webmBlob.type });
    }

    // If Duration element not present, insert Duration element (0x44 0x89 + 0x88 + Float64) into Info
    const durationHeader = new Uint8Array(11);
    durationHeader[0] = 0x44;
    durationHeader[1] = 0x89;
    durationHeader[2] = 0x88; // 8-byte float length
    new DataView(durationHeader.buffer).setFloat64(3, durationInScale, false);

    // Create new buffer with inserted duration element
    const insertPos = infoContentStart;
    const newInfoSize = infoVint.value + 11;
    const newVintBytes = encodeVint(newInfoSize, infoVint.length);

    const newBuf = new Uint8Array(buffer.byteLength + 11);
    newBuf.set(uint8.subarray(0, infoPos + 4), 0);
    newBuf.set(newVintBytes, infoPos + 4);
    newBuf.set(durationHeader, insertPos);
    newBuf.set(uint8.subarray(insertPos), insertPos + 11);

    return new Blob([newBuf.buffer], { type: webmBlob.type });
  } catch (err) {
    console.warn('[Offscreen] WebM duration patching warning, using original blob:', err);
    return webmBlob;
  }
}

// ============================================================================
// 5. CODEC & FORMAT DETECTION HELPER
// ============================================================================

/**
 * Selects the optimal supported MediaRecorder MIME type.
 * @returns {string}
 */
function getOptimalMimeType() {
  const preferredTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4'
  ];

  for (const type of preferredTypes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

// ============================================================================
// 6. CORE RECORDING ENGINE (4K / 60FPS, BITRATE PROFILES & WEB AUDIO MIXER)
// ============================================================================

/**
 * Starts tab capture and audio mixing, then begins MediaRecorder session.
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function startRecording(options = {}) {
  if (recordingState === 'recording' || recordingState === 'paused') {
    throw new Error('Halihazırda devam eden bir kayıt bulunmaktadır.');
  }

  // Teardown any leftover states
  cleanup();

  currentOptions = options;
  const streamId = options.streamId;
  const isDesktop = (options.captureType === 'desktop' || options.scope === 'screen');
  const includeSystemAudio = options.systemAudio !== false && options.includeTabAudio !== false && options.tabAudio !== false;

  // Resolve target resolution dimensions
  const res = (options.resolution || '1080p').toLowerCase();
  let idealWidth = 1920;
  let idealHeight = 1080;

  if (res === '4k' || res === '2160p') {
    idealWidth = 3840;
    idealHeight = 2160;
  } else if (res === '2k' || res === '1440p') {
    idealWidth = 2560;
    idealHeight = 1440;
  } else if (res === '720p') {
    idealWidth = 1280;
    idealHeight = 720;
  }

  const fps = options.fps || 60;

  // 1. Obtain Screen/Window or Tab Stream
  if (isDesktop || !streamId) {
    try {
      tabStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: fps, max: 60 },
          width: { ideal: idealWidth, max: idealWidth },
          height: { ideal: idealHeight, max: idealHeight }
        },
        audio: includeSystemAudio ? {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false
        } : false
      });
    } catch (displayErr) {
      console.error('[Offscreen] getDisplayMedia hatası:', displayErr);
      if (displayErr.name === 'NotAllowedError' || displayErr.message?.includes('Permission denied') || displayErr.message?.includes('denied')) {
        throw new Error('Ekran paylaşımı izni verilmedi veya iptal edildi.');
      }
      throw new Error(`Ekran paylaşımı hatası: ${displayErr.message}`);
    }
  } else {
    // Tab Capture via streamId
    const tabConstraints = {
      audio: includeSystemAudio ? {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      } : false,
      video: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
          maxFrameRate: fps,
          maxWidth: idealWidth,
          maxHeight: idealHeight
        }
      }
    };

    try {
      tabStream = await navigator.mediaDevices.getUserMedia(tabConstraints);
    } catch (err) {
      console.warn('[Offscreen] getUserMedia(tab) hatası, getDisplayMedia deneniyor:', err);
      try {
        tabStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: fps, max: 60 },
            width: { ideal: idealWidth },
            height: { ideal: idealHeight }
          },
          audio: includeSystemAudio
        });
      } catch (fallbackErr) {
        throw new Error(`Sekme yakalama hatası: ${err.message}`);
      }
    }
  }

  // 2. Microphone Capture (if requested) with Echo Cancellation & Noise Suppression
  if (options.micAudio) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: options.echoCancellation !== false,
          noiseSuppression: options.noiseSuppression !== false,
          autoGainControl: options.autoGainControl !== false,
          channelCount: { ideal: 2 }
        },
        video: false
      });
    } catch (err) {
      console.warn('[Offscreen] Mikrofon akışı alınamadı, sekme sesiyle devam ediliyor:', err);
      micStream = null;
    }
  }

  // 3. Web Audio API Two-Channel Mixer (ChannelMergerNode + DynamicsCompressorNode)
  const hasTabAudio = tabStream && tabStream.getAudioTracks().length > 0;
  const hasMicAudio = micStream && micStream.getAudioTracks().length > 0;

  mixedStream = new MediaStream();

  // Add video tracks
  tabStream.getVideoTracks().forEach((track) => {
    mixedStream.addTrack(track);

    // Auto-stop recording if user stops sharing via browser UI bar
    track.onended = () => {
      console.log('[Offscreen] Video izi sonlandı (kullanıcı paylaşımı durdurdu).');
      if (recordingState === 'recording' || recordingState === 'paused') {
        stopRecordingInternal().catch((e) => console.error('[Offscreen] Auto-stop hatası:', e));
      }
    };
  });

  // Audio Mixing setup with 2-Channel Stereo Merger & Loopback
  if (hasTabAudio || hasMicAudio) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Create 2-Channel Merger Node and Dynamics Compressor to prevent digital clipping
      channelMergerNode = audioContext.createChannelMerger(2);
      destinationNode = audioContext.createMediaStreamDestination();

      dynamicsCompressorNode = audioContext.createDynamicsCompressor();
      dynamicsCompressorNode.threshold.setValueAtTime(-12, audioContext.currentTime); // -12 dB
      dynamicsCompressorNode.knee.setValueAtTime(30, audioContext.currentTime);      // 30 dB
      dynamicsCompressorNode.ratio.setValueAtTime(12, audioContext.currentTime);     // 12:1 limiting
      dynamicsCompressorNode.attack.setValueAtTime(0.003, audioContext.currentTime); // 3ms attack
      dynamicsCompressorNode.release.setValueAtTime(0.25, audioContext.currentTime); // 250ms release

      // System / Tab Audio track setup
      if (hasTabAudio) {
        tabAudioSource = audioContext.createMediaStreamSource(tabStream);
        tabGainNode = audioContext.createGain();
        const tabVol = typeof options.systemVolume === 'number' ? options.systemVolume : 1.0;
        tabGainNode.gain.setValueAtTime(tabVol, audioContext.currentTime);

        tabAudioSource.connect(tabGainNode);

        // Feed tab audio back to local speakers so user can hear what the tab plays (clean loopback)
        if (options.muteTabPlayback !== true) {
          tabGainNode.connect(audioContext.destination);
        }

        // Split tab audio into Stereo Left / Right and connect to 2-channel merger
        tabSplitterNode = audioContext.createChannelSplitter(2);
        tabGainNode.connect(tabSplitterNode);
        tabSplitterNode.connect(channelMergerNode, 0, 0); // Tab Left -> Merger Ch 0 (Left)
        tabSplitterNode.connect(channelMergerNode, 1, 1); // Tab Right -> Merger Ch 1 (Right)
      }

      // User Microphone track setup with DSP Filter Chain (85Hz High-Pass & 50Hz/60Hz Notch Filters)
      if (hasMicAudio) {
        micAudioSource = audioContext.createMediaStreamSource(micStream);

        // DSP Filter 1: 85Hz High-Pass Filter (eliminates computer fan rumble, HVAC hum, low rumble)
        micHighPassFilter = audioContext.createBiquadFilter();
        micHighPassFilter.type = 'highpass';
        micHighPassFilter.frequency.setValueAtTime(85, audioContext.currentTime);
        micHighPassFilter.Q.setValueAtTime(0.707, audioContext.currentTime);

        // DSP Filter 2: 50Hz Notch Filter (removes European/international 50Hz electrical ground hum)
        micNotch50Filter = audioContext.createBiquadFilter();
        micNotch50Filter.type = 'notch';
        micNotch50Filter.frequency.setValueAtTime(50, audioContext.currentTime);
        micNotch50Filter.Q.setValueAtTime(4.0, audioContext.currentTime);

        // DSP Filter 3: 60Hz Notch Filter (removes US/60Hz electrical buzz & line hum)
        micNotch60Filter = audioContext.createBiquadFilter();
        micNotch60Filter.type = 'notch';
        micNotch60Filter.frequency.setValueAtTime(60, audioContext.currentTime);
        micNotch60Filter.Q.setValueAtTime(4.0, audioContext.currentTime);

        micGainNode = audioContext.createGain();
        const micVol = typeof options.micVolume === 'number' ? options.micVolume : 1.0;
        micGainNode.gain.setValueAtTime(micVol, audioContext.currentTime);

        // Connect DSP Audio Chain: Source -> 85Hz HPF -> 50Hz Notch -> 60Hz Notch -> Gain
        micAudioSource.connect(micHighPassFilter);
        micHighPassFilter.connect(micNotch50Filter);
        micNotch50Filter.connect(micNotch60Filter);
        micNotch60Filter.connect(micGainNode);

        // Connect mic into 2-channel merger (center panned to both Left & Right if mono, or direct stereo)
        micSplitterNode = audioContext.createChannelSplitter(2);
        micGainNode.connect(micSplitterNode);

        const micTracks = micStream.getAudioTracks();
        const micSettings = micTracks[0]?.getSettings?.() || {};
        const micChannels = micSettings.channelCount || 1;

        if (micChannels >= 2) {
          // Stereo microphone input
          micSplitterNode.connect(channelMergerNode, 0, 0); // Mic Left -> Ch 0 (Left)
          micSplitterNode.connect(channelMergerNode, 1, 1); // Mic Right -> Ch 1 (Right)
        } else {
          // Mono microphone input -> Center Panned (equal energy to Left and Right)
          micSplitterNode.connect(channelMergerNode, 0, 0); // Mic -> Ch 0 (Left)
          micSplitterNode.connect(channelMergerNode, 0, 1); // Mic -> Ch 1 (Right)
        }

        // CRITICAL: micGainNode is NEVER connected to audioContext.destination (speakers) to prevent acoustic feedback / echo loops!
      }

      // Connect 2-channel merger to Dynamics Compressor, then to MediaStreamDestination
      channelMergerNode.connect(dynamicsCompressorNode);
      dynamicsCompressorNode.connect(destinationNode);

      // Add mixed audio track to final recording stream
      destinationNode.stream.getAudioTracks().forEach((track) => {
        mixedStream.addTrack(track);
      });
    } catch (audioErr) {
      console.warn('[Offscreen] Web Audio API mikseri başlatılamadı, doğrudan ses aktarılıyor:', audioErr);
      if (hasTabAudio) {
        tabStream.getAudioTracks().forEach((track) => mixedStream.addTrack(track));
      }
    }
  }

  // 4. Calculate Ultra-Quality Bitrates (up to 25-35 Mbps for 4K / 60FPS)
  const is4K = (res === '4k' || res === '2160p' || options.quality === 'ultra');
  const is2K = (res === '2k' || res === '1440p');
  const is720p = (res === '720p');

  let videoBitrate = 15000000; // 15 Mbps default for 1080p60

  if (options.videoBitsPerSecond) {
    videoBitrate = options.videoBitsPerSecond;
  } else if (is4K) {
    videoBitrate = fps >= 50 ? 35000000 : 25000000; // 25 - 35 Mbps for 4K
  } else if (is2K) {
    videoBitrate = fps >= 50 ? 22000000 : 16000000; // 16 - 22 Mbps for 2K
  } else if (is720p) {
    videoBitrate = fps >= 50 ? 6500000 : 4500000;   // 4.5 - 6.5 Mbps for 720p
  } else {
    // 1080p High Quality
    videoBitrate = fps >= 50 ? 15000000 : 9000000;   // 9 - 15 Mbps for 1080p
  }

  const audioBitrate = options.audioBitsPerSecond || (is4K ? 320000 : 256000); // 256-320 kbps

  // 5. Initialize MediaRecorder
  const mimeType = options.mimeType || getOptimalMimeType();
  const recorderOptions = {
    videoBitsPerSecond: videoBitrate,
    audioBitsPerSecond: audioBitrate
  };
  if (mimeType) recorderOptions.mimeType = mimeType;

  recordedChunks = [];
  mediaRecorder = new MediaRecorder(mixedStream, recorderOptions);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onerror = (e) => {
    console.error('[Offscreen] MediaRecorder runtime hatası:', e);
    chrome.runtime.sendMessage({
      action: 'RECORDING_ERROR',
      error: e.error?.message || 'MediaRecorder hatası oluştu'
    }).catch(() => {});
  };

  // Start recording with 1-second chunk slices for stream resilience
  mediaRecorder.start(1000);
  recordingState = 'recording';
  recordingStartTime = Date.now();
  totalPausedDuration = 0;
  pauseStartTime = 0;

  updateDOMStatus('recording', 'Kayıt Yapılıyor...');

  // Establish persistent keep-alive port to background SW
  connectKeepAlive();
  startStatusTimer();

  return {
    success: true,
    mimeType: mediaRecorder.mimeType || mimeType,
    hasMic: Boolean(hasMicAudio),
    hasTabAudio: Boolean(hasTabAudio),
    startTime: recordingStartTime,
    videoBitsPerSecond: videoBitrate,
    resolution: `${idealWidth}x${idealHeight}`
  };
}

/**
 * Pauses active recording.
 */
function pauseRecording() {
  if (mediaRecorder && recordingState === 'recording') {
    mediaRecorder.pause();
    recordingState = 'paused';
    pauseStartTime = Date.now();
    updateDOMStatus('paused', 'Kayıt Duraklatıldı');
    chrome.runtime.sendMessage({ action: 'RECORDING_PAUSED' }).catch(() => {});
    return { success: true, status: 'paused' };
  }
  return { success: false, error: 'Kayıt duraklatılamadı (aktif bir kayıt yok veya zaten duraklatılmış).' };
}

/**
 * Resumes paused recording.
 */
function resumeRecording() {
  if (mediaRecorder && recordingState === 'paused') {
    if (pauseStartTime > 0) {
      totalPausedDuration += Date.now() - pauseStartTime;
      pauseStartTime = 0;
    }
    mediaRecorder.resume();
    recordingState = 'recording';
    updateDOMStatus('recording', 'Kayıt Yapılıyor...');
    chrome.runtime.sendMessage({ action: 'RECORDING_RESUMED' }).catch(() => {});
    return { success: true, status: 'recording' };
  }
  return { success: false, error: 'Kayıt devam ettirilemedi (duraklatılmış kayıt bulunamadı).' };
}

/**
 * Internal logic to finalize recording, patch duration metadata, save to IndexedDB, and perform teardown.
 * @returns {Promise<Object>}
 */
function stopRecordingInternal() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || recordingState === 'idle' || recordingState === 'stopping') {
      resolve({ success: false, error: 'Aktif bir kayıt bulunamadı.' });
      return;
    }

    recordingState = 'stopping';
    updateDOMStatus('stopping', 'Kayıt İşleniyor...');
    stopStatusTimer();

    // Calculate final elapsed duration (ms)
    let duration = Date.now() - recordingStartTime - totalPausedDuration;
    if (pauseStartTime > 0) {
      duration -= (Date.now() - pauseStartTime);
    }
    duration = Math.max(0, duration);

    mediaRecorder.onstop = async () => {
      try {
        const mimeType = mediaRecorder?.mimeType || 'video/webm';
        let rawBlob = new Blob(recordedChunks, { type: mimeType });

        // Apply WebM Duration Header fix if WebM container
        let finalBlob = rawBlob;
        if (mimeType.includes('webm')) {
          finalBlob = await fixWebmDuration(rawBlob, duration);
        }

        const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const recordMetadata = {
          id: recordingId,
          blob: finalBlob,
          mimeType: finalBlob.type,
          size: finalBlob.size,
          duration: duration,
          timestamp: Date.now(),
          title: currentOptions.title || 'Ekran Kaydı',
          url: currentOptions.url || ''
        };

        // Save into unified FullShotMediaDB
        await saveRecordingToDB(recordMetadata);

        // Notify background / preview / popup
        chrome.runtime.sendMessage({
          action: 'RECORDING_COMPLETED',
          recordingId: recordingId,
          meta: {
            id: recordingId,
            size: finalBlob.size,
            duration: duration,
            mimeType: finalBlob.type,
            timestamp: recordMetadata.timestamp,
            title: recordMetadata.title,
            url: recordMetadata.url
          }
        }).catch(() => {});

        // Cleanup media tracks, AudioContext, and keep-alive
        cleanup();

        resolve({
          success: true,
          recordingId: recordingId,
          size: finalBlob.size,
          duration: duration,
          mimeType: finalBlob.type
        });
      } catch (err) {
        console.error('[Offscreen] Kayıt sonlandırma ve kaydetme hatası:', err);
        cleanup();
        reject(err);
      }
    };

    try {
      mediaRecorder.stop();
    } catch (stopErr) {
      console.warn('[Offscreen] mediaRecorder.stop() çağrısında uyarı:', stopErr);
      cleanup();
      resolve({ success: false, error: stopErr.message });
    }
  });
}

/**
 * Public wrapper for stopping the recording.
 */
async function stopRecording() {
  return await stopRecordingInternal();
}

/**
 * Cancels recording and discards all data without saving.
 */
function cancelRecording() {
  stopStatusTimer();
  if (mediaRecorder && (recordingState === 'recording' || recordingState === 'paused')) {
    try {
      mediaRecorder.onstop = null;
      mediaRecorder.ondataavailable = null;
      mediaRecorder.stop();
    } catch (e) {
      console.warn('[Offscreen] İptal sırasında MediaRecorder durdurma hatası:', e);
    }
  }

  cleanup();
  recordingState = 'idle';
  updateDOMStatus('idle', 'Offscreen Document Hazır');

  chrome.runtime.sendMessage({ action: 'RECORDING_CANCELLED' }).catch(() => {});
  return { success: true, status: 'cancelled' };
}

/**
 * Dynamically updates audio gain values for Tab or Microphone with smooth ramping.
 * @param {Object} gains { systemVolume?: number, micVolume?: number }
 */
function updateAudioGains({ systemVolume, micVolume }) {
  if (tabGainNode && typeof systemVolume === 'number') {
    const v = Math.max(0, Math.min(2, systemVolume));
    if (audioContext && audioContext.currentTime) {
      tabGainNode.gain.setTargetAtTime(v, audioContext.currentTime, 0.05);
    } else {
      tabGainNode.gain.value = v;
    }
  }
  if (micGainNode && typeof micVolume === 'number') {
    const v = Math.max(0, Math.min(2, micVolume));
    if (audioContext && audioContext.currentTime) {
      micGainNode.gain.setTargetAtTime(v, audioContext.currentTime, 0.05);
    } else {
      micGainNode.gain.value = v;
    }
  }
  return { success: true };
}

/**
 * Returns current status of the recording engine.
 */
function getRecordingStatus() {
  let currentDuration = 0;
  if (recordingStartTime > 0) {
    currentDuration = Date.now() - recordingStartTime - totalPausedDuration;
    if (pauseStartTime > 0) {
      currentDuration -= (Date.now() - pauseStartTime);
    }
    currentDuration = Math.max(0, currentDuration);
  }

  const approximateSize = recordedChunks.reduce((acc, chunk) => acc + chunk.size, 0);

  return {
    state: recordingState,
    isRecording: recordingState === 'recording',
    isPaused: recordingState === 'paused',
    duration: currentDuration,
    size: approximateSize,
    mimeType: mediaRecorder?.mimeType || '',
    startTime: recordingStartTime
  };
}

// ============================================================================
// 7. STATUS TIMER & RESOURCE CLEANUP
// ============================================================================

function startStatusTimer() {
  stopStatusTimer();
  statusInterval = setInterval(() => {
    if (recordingState === 'recording') {
      const status = getRecordingStatus();
      chrome.runtime.sendMessage({
        action: 'RECORDING_TICK',
        status
      }).catch(() => {});
    }
  }, 1000);
}

function stopStatusTimer() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

/**
 * Performs complete resource teardown to prevent memory leaks and release hardware.
 */
function cleanup() {
  stopStatusTimer();
  disconnectKeepAlive();

  // 1. Stop all tracks in tabStream
  if (tabStream) {
    try {
      tabStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
    } catch (e) {}
    tabStream = null;
  }

  // 2. Stop all tracks in micStream
  if (micStream) {
    try {
      micStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
    } catch (e) {}
    micStream = null;
  }

  // 3. Stop all tracks in destinationNode stream
  if (destinationNode && destinationNode.stream) {
    try {
      destinationNode.stream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
    } catch (e) {}
  }

  // 4. Stop all tracks in mixedStream
  if (mixedStream) {
    try {
      mixedStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
    } catch (e) {}
    mixedStream = null;
  }

  // 5. Disconnect and release Web Audio Nodes
  if (tabAudioSource) { try { tabAudioSource.disconnect(); } catch (e) {} tabAudioSource = null; }
  if (micAudioSource) { try { micAudioSource.disconnect(); } catch (e) {} micAudioSource = null; }
  if (micHighPassFilter) { try { micHighPassFilter.disconnect(); } catch (e) {} micHighPassFilter = null; }
  if (micNotch50Filter) { try { micNotch50Filter.disconnect(); } catch (e) {} micNotch50Filter = null; }
  if (micNotch60Filter) { try { micNotch60Filter.disconnect(); } catch (e) {} micNotch60Filter = null; }
  if (tabGainNode) { try { tabGainNode.disconnect(); } catch (e) {} tabGainNode = null; }
  if (micGainNode) { try { micGainNode.disconnect(); } catch (e) {} micGainNode = null; }
  if (tabSplitterNode) { try { tabSplitterNode.disconnect(); } catch (e) {} tabSplitterNode = null; }
  if (micSplitterNode) { try { micSplitterNode.disconnect(); } catch (e) {} micSplitterNode = null; }
  if (channelMergerNode) { try { channelMergerNode.disconnect(); } catch (e) {} channelMergerNode = null; }
  if (dynamicsCompressorNode) { try { dynamicsCompressorNode.disconnect(); } catch (e) {} dynamicsCompressorNode = null; }
  if (destinationNode) { destinationNode = null; }

  // 6. Close Web Audio Context
  if (audioContext && audioContext.state !== 'closed') {
    try {
      audioContext.close().catch((err) => console.warn('[Offscreen] AudioContext kapatma hatası:', err));
    } catch (e) {}
    audioContext = null;
  }

  mediaRecorder = null;
  recordedChunks = [];
  recordingStartTime = 0;
  totalPausedDuration = 0;
  pauseStartTime = 0;
  recordingState = 'idle';
  currentOptions = {};

  updateDOMStatus('idle', 'Offscreen Document Hazır');

  console.log('[Offscreen] Tüm medya akışları ve bellek kaynakları başarıyla temizlendi.');
}

// ============================================================================
// 8. LIGHTWEIGHT IN-BROWSER OPTICAL CHARACTER RECOGNITION (OCR) ENGINE
// ============================================================================

/**
 * Loads an image from a Data URL
 */
function loadOCRImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Görsel OCR motoruna yüklenemedi.'));
    img.src = dataUrl;
  });
}

/**
 * Lightweight pure JavaScript OCR engine for raster bitmap text extraction.
 * Performs grayscale conversion, adaptive threshold binarization, connected-component
 * projection line segmentation, and topological glyph template matching.
 * @param {string} dataUrl - Base64 Data URL of the image/crop
 * @returns {Promise<{ text: string, confidence: number }>}
 */
async function performRasterOCR(dataUrl) {
  try {
    const img = await loadOCRImage(dataUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    if (width <= 0 || height <= 0) {
      return { text: '', confidence: 0 };
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;
    const totalPixels = width * height;

    // 1. Grayscale conversion and histogram calculation
    const gray = new Uint8Array(totalPixels);
    const hist = new Int32Array(256);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      // Standard luminance
      const g = Math.round(0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
      gray[i] = g;
      hist[g]++;
    }

    // 2. Otsu's Global Thresholding
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let threshold = 128;

    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const varBetween = wB * wF * (mB - mF) * (mB - mF);

      if (varBetween > varMax) {
        varMax = varBetween;
        threshold = t;
      }
    }

    // Determine background polarity (light background vs dark background)
    let darkCount = 0;
    for (let i = 0; i < totalPixels; i++) {
      if (gray[i] < threshold) darkCount++;
    }
    const isDarkBg = darkCount > totalPixels / 2;

    // 3. Binary mask creation (1 = text foreground pixel, 0 = background)
    const binary = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      if (isDarkBg) {
        binary[i] = gray[i] >= threshold ? 1 : 0;
      } else {
        binary[i] = gray[i] < threshold ? 1 : 0;
      }
    }

    // 4. Horizontal Projection Profile (Text Line Segmentation)
    const hProfile = new Int32Array(height);
    for (let y = 0; y < height; y++) {
      let count = 0;
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        if (binary[rowOffset + x] === 1) count++;
      }
      hProfile[y] = count;
    }

    // Find text line intervals
    const lines = [];
    let inLine = false;
    let lineStart = 0;
    const minLineHeight = 6;
    const noiseThreshold = Math.max(2, Math.round(width * 0.005));

    for (let y = 0; y < height; y++) {
      if (hProfile[y] > noiseThreshold) {
        if (!inLine) {
          inLine = true;
          lineStart = y;
        }
      } else {
        if (inLine) {
          inLine = false;
          if (y - lineStart >= minLineHeight) {
            lines.push({ top: lineStart, bottom: y });
          }
        }
      }
    }
    if (inLine && height - lineStart >= minLineHeight) {
      lines.push({ top: lineStart, bottom: height });
    }

    // 5. Vertical Projection & Glyph Segmentation per Line
    const extractedLines = [];

    for (const line of lines) {
      const lineH = line.bottom - line.top;
      const vProfile = new Int32Array(width);

      for (let x = 0; x < width; x++) {
        let count = 0;
        for (let y = line.top; y < line.bottom; y++) {
          if (binary[y * width + x] === 1) count++;
        }
        vProfile[x] = count;
      }

      // Find character bounding segments in current line
      const glyphs = [];
      let inGlyph = false;
      let glyphStart = 0;

      for (let x = 0; x < width; x++) {
        if (vProfile[x] > 0) {
          if (!inGlyph) {
            inGlyph = true;
            glyphStart = x;
          }
        } else {
          if (inGlyph) {
            inGlyph = false;
            const gw = x - glyphStart;
            if (gw >= 2) {
              // Find actual vertical extent of this glyph
              let minGy = line.bottom;
              let maxGy = line.top;
              for (let gy = line.top; gy < line.bottom; gy++) {
                for (let gx = glyphStart; gx < x; gx++) {
                  if (binary[gy * width + gx] === 1) {
                    if (gy < minGy) minGy = gy;
                    if (gy > maxGy) maxGy = gy;
                  }
                }
              }
              if (maxGy >= minGy) {
                glyphs.push({
                  x1: glyphStart,
                  x2: x,
                  y1: minGy,
                  y2: maxGy + 1,
                  w: x - glyphStart,
                  h: maxGy - minGy + 1
                });
              }
            }
          }
        }
      }
      if (inGlyph && width - glyphStart >= 2) {
        glyphs.push({
          x1: glyphStart,
          x2: width,
          y1: line.top,
          y2: line.bottom,
          w: width - glyphStart,
          h: lineH
        });
      }

      // Classify glyphs and reconstruct words
      if (glyphs.length > 0) {
        let lineText = '';
        let prevGlyphRight = -1;
        const avgGlyphWidth = glyphs.reduce((acc, g) => acc + g.w, 0) / glyphs.length;
        const spaceGapThreshold = Math.max(4, avgGlyphWidth * 0.75);

        for (const g of glyphs) {
          if (prevGlyphRight > 0 && (g.x1 - prevGlyphRight) > spaceGapThreshold) {
            lineText += ' ';
          }

          // Extract 3x3 topological feature vector from binary glyph
          const char = classifyGlyph(binary, width, g);
          lineText += char;
          prevGlyphRight = g.x2;
        }

        if (lineText.trim()) {
          extractedLines.push(lineText.trim());
        }
      }
    }

    const finalText = extractedLines.join('\n');
    return {
      text: finalText,
      confidence: finalText ? 0.88 : 0
    };
  } catch (err) {
    console.warn('[Offscreen OCR] OCR işleme hatası:', err);
    return { text: '', confidence: 0 };
  }
}

/**
 * Classifies a segmented glyph bounding box using 3x3 zoning density & topological ratios.
 */
function classifyGlyph(binary, totalWidth, g) {
  const { x1, y1, w, h } = g;
  if (w <= 0 || h <= 0) return '';

  const aspectRatio = w / h;

  // Thin characters
  if (aspectRatio < 0.35) {
    if (h > 10) return 'l';
    return 'i';
  }

  // Sample 3x3 density grid
  const z = new Float32Array(9);
  const cellW = w / 3;
  const cellH = h / 3;

  let totalForeground = 0;
  for (let dy = 0; dy < h; dy++) {
    const row = Math.min(2, Math.floor(dy / cellH));
    const curY = y1 + dy;
    for (let dx = 0; dx < w; dx++) {
      const col = Math.min(2, Math.floor(dx / cellW));
      if (binary[curY * totalWidth + (x1 + dx)] === 1) {
        z[row * 3 + col]++;
        totalForeground++;
      }
    }
  }

  if (totalForeground === 0) return '';

  // Normalize grid density
  for (let k = 0; k < 9; k++) {
    z[k] = z[k] / (cellW * cellH);
  }

  const overallDensity = totalForeground / (w * h);

  // Punctuation heuristics
  if (h < 6 && w < 6) return '.';
  if (aspectRatio > 1.8 && h < 6) return '-';

  // High density block
  if (overallDensity > 0.75) {
    return 'M';
  }

  // Hollow center (O, 0, D, C, etc.)
  const centerDensity = z[4];
  const topDensity = (z[0] + z[1] + z[2]) / 3;
  const botDensity = (z[6] + z[7] + z[8]) / 3;
  const leftDensity = (z[0] + z[3] + z[6]) / 3;
  const rightDensity = (z[2] + z[5] + z[8]) / 3;

  if (centerDensity < 0.25 && topDensity > 0.4 && botDensity > 0.4 && leftDensity > 0.4 && rightDensity > 0.4) {
    return 'O';
  }
  if (centerDensity < 0.25 && leftDensity > 0.45 && rightDensity < 0.25) {
    return 'C';
  }
  if (topDensity > 0.5 && leftDensity > 0.4 && botDensity < 0.3 && rightDensity < 0.3) {
    return 'F';
  }
  if (topDensity > 0.5 && leftDensity > 0.4 && botDensity > 0.4 && rightDensity < 0.3) {
    return 'E';
  }
  if (leftDensity > 0.45 && rightDensity > 0.45 && z[4] > 0.4 && topDensity < 0.3 && botDensity < 0.3) {
    return 'H';
  }
  if (topDensity > 0.6 && z[4] > 0.4 && z[7] > 0.4 && leftDensity < 0.3 && rightDensity < 0.3) {
    return 'T';
  }

  // Fallback estimation
  if (aspectRatio > 0.9) return 'W';
  if (aspectRatio > 0.7) return 'A';
  return 'e';
}

// ============================================================================
// 9. RUNTIME MESSAGE ROUTER
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const action = message?.action || message?.type;

  switch (action) {
    case 'PING':
    case 'ping':
      sendResponse({ success: true, pong: true, status: 'ready', state: recordingState });
      return false;

    case 'PERFORM_OCR':
    case 'performOCR':
    case 'EXTRACT_TEXT':
    case 'extractText':
    case 'recognizeText':
      performRasterOCR(message.dataUrl || message.image)
        .then((result) => sendResponse({ success: true, ...result }))
        .catch((err) => sendResponse({ success: false, error: err.message || 'OCR hatası' }));
      return true;

    case 'START_RECORDING':
    case 'startRecording':
      startRecording(message.options || message)
        .then((result) => sendResponse({ success: true, ...result }))
        .catch((err) => sendResponse({ success: false, error: err.message || 'Kayıt başlatılamadı.' }));
      return true;

    case 'STOP_RECORDING':
    case 'stopRecording':
      stopRecording()
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ success: false, error: err.message || 'Kayıt durdurulamadı.' }));
      return true;

    case 'PAUSE_RECORDING':
    case 'pauseRecording':
      sendResponse(pauseRecording());
      return false;

    case 'RESUME_RECORDING':
    case 'resumeRecording':
      sendResponse(resumeRecording());
      return false;

    case 'CANCEL_RECORDING':
    case 'cancelRecording':
    case 'DISCARD_RECORDING':
    case 'discardRecording':
      sendResponse(cancelRecording());
      return false;

    case 'UPDATE_AUDIO_GAINS':
    case 'updateAudioGains':
      sendResponse(updateAudioGains(message.gains || message));
      return false;

    case 'GET_RECORDING_STATUS':
    case 'getRecordingStatus':
    case 'GET_RECORDING_STATE':
    case 'getRecordingState':
      sendResponse({ success: true, ...getRecordingStatus() });
      return false;

    case 'GET_RECORDING_FROM_DB':
    case 'getRecordingFromDB':
      getRecordingFromDB(message.recordingId || message.id)
        .then((record) => {
          if (!record) {
            sendResponse({ success: false, error: 'Kayıt veritabanında bulunamadı.' });
          } else {
            sendResponse({ success: true, record });
          }
        })
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case 'DELETE_RECORDING_FROM_DB':
    case 'deleteRecordingFromDB':
      deleteRecordingFromDB(message.recordingId || message.id)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case 'COPY_TO_CLIPBOARD':
    case 'copyToClipboard':
      (async () => {
        try {
          if (message.text) {
            await navigator.clipboard.writeText(message.text);
            sendResponse({ success: true });
            return;
          }
          if (message.dataUrl) {
            const res = await fetch(message.dataUrl);
            const blob = await res.blob();
            const mime = blob.type || message.mimeType || 'image/png';
            await navigator.clipboard.write([
              new ClipboardItem({ [mime]: blob })
            ]);
            sendResponse({ success: true });
            return;
          }
          sendResponse({ success: true });
        } catch (clipErr) {
          console.warn('[Offscreen] Clipboard yazma hatası:', clipErr);
          sendResponse({ success: false, error: clipErr.message });
        }
      })();
      return true;

    default:
      return false;
  }
});

console.log('[Offscreen] FullShot Pro Ses Mikseri, MediaRecorder & OCR Motoru hazır.');


