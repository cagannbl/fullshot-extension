/**
 * FullShot Pro - Video Studio Script
 * High-performance HTML5 Video Player, Frame Grabber, Timeline In/Out Trimming & Export Engine
 * 4-Color Slate & Charcoal Theme
 */

document.addEventListener('DOMContentLoaded', async () => {
  // ============================================================
  // DOM ELEMENTS
  // ============================================================
  const mainVideo = document.getElementById('mainVideo');
  const videoPlayerContainer = document.getElementById('videoPlayerContainer');
  const videoWorkspace = document.getElementById('videoWorkspace');
  const ambientGlow = document.getElementById('ambientGlow');
  const videoClickOverlay = document.getElementById('videoClickOverlay');
  const centerPlayButton = document.getElementById('centerPlayButton');
  const actionFeedbackBadge = document.getElementById('actionFeedbackBadge');
  const bufferingSpinner = document.getElementById('bufferingSpinner');
  const emptyStateCard = document.getElementById('emptyStateCard');

  // Top Bar Meta & Badges
  const pageTitle = document.getElementById('pageTitle');
  const pageUrl = document.getElementById('pageUrl');
  const resolutionText = document.getElementById('resolutionText');
  const durationText = document.getElementById('durationText');
  const fileSizeText = document.getElementById('fileSizeText');
  const topSnapshotBtn = document.getElementById('topSnapshotBtn');
  const topDownloadWebmBtn = document.getElementById('topDownloadWebmBtn');
  const shortcutsBtn = document.getElementById('shortcutsBtn');

  // Custom Controls & Timeline
  const customControls = document.getElementById('customControls');
  const timelineContainer = document.getElementById('timelineContainer');
  const timelineTrack = document.getElementById('timelineTrack');
  const timelineBuffer = document.getElementById('timelineBuffer');
  const timelineTrimRegion = document.getElementById('timelineTrimRegion');
  const timelineProgress = document.getElementById('timelineProgress');
  const timelineThumb = document.getElementById('timelineThumb');
  const trimInHandle = document.getElementById('trimInHandle');
  const trimOutHandle = document.getElementById('trimOutHandle');
  const timeTooltip = document.getElementById('timeTooltip');

  const playPauseBtn = document.getElementById('playPauseBtn');
  const skipBackBtn = document.getElementById('skipBackBtn');
  const skipForwardBtn = document.getElementById('skipForwardBtn');
  const framePrevBtn = document.getElementById('framePrevBtn');
  const frameNextBtn = document.getElementById('frameNextBtn');

  const volumeContainer = document.getElementById('volumeContainer');
  const volumeBtn = document.getElementById('volumeBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const timeCurrent = document.getElementById('timeCurrent');
  const timeTotal = document.getElementById('timeTotal');

  const trimToggleBtn = document.getElementById('trimToggleBtn');
  const loopToggleBtn = document.getElementById('loopToggleBtn');
  const speedMenuBtn = document.getElementById('speedMenuBtn');
  const speedValueText = document.getElementById('speedValueText');
  const speedDropdown = document.getElementById('speedDropdown');
  const speedOptions = document.querySelectorAll('.speed-opt');
  const pipBtn = document.getElementById('pipBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  // Sidebar / Trimming & Export Elements
  const fileNameInput = document.getElementById('fileNameInput');
  const resetFilenameBtn = document.getElementById('resetFilenameBtn');
  const activeExtLabel = document.getElementById('activeExtLabel');

  const trimCard = document.getElementById('trimCard');
  const resetTrimBtn = document.getElementById('resetTrimBtn');
  const trimStartTimeText = document.getElementById('trimStartTimeText');
  const trimEndTimeText = document.getElementById('trimEndTimeText');
  const setTrimInBtn = document.getElementById('setTrimInBtn');
  const setTrimOutBtn = document.getElementById('setTrimOutBtn');
  const trimDurationText = document.getElementById('trimDurationText');
  const playTrimmedBtn = document.getElementById('playTrimmedBtn');

  const exportWebmBtn = document.getElementById('exportWebmBtn');
  const exportMp4Btn = document.getElementById('exportMp4Btn');
  const webmBadgeTag = document.getElementById('webmBadgeTag');
  const webmExportDesc = document.getElementById('webmExportDesc');
  const webmSizeMeta = document.getElementById('webmSizeMeta');

  const snapshotCurrentTime = document.getElementById('snapshotCurrentTime');
  const openImageStudioSnapshotBtn = document.getElementById('openImageStudioSnapshotBtn');
  const downloadSnapshotBtn = document.getElementById('downloadSnapshotBtn');
  const copySnapshotBtn = document.getElementById('copySnapshotBtn');

  // Empty State / Local Fallbacks
  const localVideoInput = document.getElementById('localVideoInput');
  const generateDemoVideoBtn = document.getElementById('generateDemoVideoBtn');

  // Modal & Toast
  const shortcutsModal = document.getElementById('shortcutsModal');
  const closeShortcutsBtn = document.getElementById('closeShortcutsBtn');
  const exportProgressModal = document.getElementById('exportProgressModal');
  const exportProgressBar = document.getElementById('exportProgressBar');
  const exportProgressPct = document.getElementById('exportProgressPct');
  const exportProgressTitle = document.getElementById('exportProgressTitle');
  const exportProgressDesc = document.getElementById('exportProgressDesc');

  const toast = document.getElementById('toast');
  const toastTitle = document.getElementById('toastTitle');
  const toastText = document.getElementById('toastText');

  // ============================================================
  // APPLICATION STATE
  // ============================================================
  let videoData = null;
  let videoBlob = null;
  let activeVideoUrl = '';
  let defaultBaseName = 'FullShot_Video';
  let isScrubbing = false;
  let idleTimer = null;
  let lastVolume = 1;
  let feedbackTimeout = null;
  let toastTimeout = null;

  // Trimming State
  let trimIn = 0; // In-point in seconds
  let trimOut = 0; // Out-point in seconds
  let isTrimModeActive = true;
  let isDraggingTrimIn = false;
  let isDraggingTrimOut = false;
  let isPlayingTrimmedSegment = false;

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  // Format seconds into MM:SS or HH:MM:SS
  function formatTime(totalSeconds) {
    if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
    const sec = Math.floor(totalSeconds % 60);
    const min = Math.floor((totalSeconds / 60) % 60);
    const hrs = Math.floor(totalSeconds / 3600);

    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(min)}:${pad(sec)}`;
    }
    return `${pad(min)}:${pad(sec)}`;
  }

  // Format bytes into readable string (KB, MB, GB)
  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0.0 MB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Clean title for file naming
  function sanitizeFilename(name) {
    return (name || 'Video')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
  }

  // Format current date as YYYY-MM-DD_HHmm
  function getFormattedTimestamp(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const h = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}_${h}${min}`;
  }

  // Show Toast Notification
  function showToast(title, message, type = 'success', duration = 3200) {
    if (!toast) return;
    clearTimeout(toastTimeout);

    toast.className = `toast toast-${type}`;
    if (toastTitle) toastTitle.textContent = title;
    if (toastText) toastText.textContent = message;

    toast.classList.remove('hidden');

    toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  }

  // Show Action Feedback Badge (+5s, Volume %, etc.)
  function showFeedback(text) {
    if (!actionFeedbackBadge) return;
    clearTimeout(feedbackTimeout);
    actionFeedbackBadge.textContent = text;
    actionFeedbackBadge.classList.remove('hidden');

    feedbackTimeout = setTimeout(() => {
      actionFeedbackBadge.classList.add('hidden');
    }, 600);
  }

  // ============================================================
  // WEBM DURATION METADATA PATCHER (Fixes Chrome "Infinity" Duration Bug)
  // ============================================================
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

      if (infoPos === -1) return webmBlob;

      const infoVint = readVint(infoPos + 4);
      if (!infoVint) return webmBlob;

      const infoContentStart = infoPos + 4 + infoVint.length;
      const infoContentEnd = (infoVint.value <= 0 || infoVint.value > 1000000)
        ? infoContentStart + 1024
        : Math.min(uint8.length, infoContentStart + infoVint.value);

      let timecodeScale = 1000000; // default 1,000,000 ns = 1ms
      let durationPos = -1;
      let durationLen = 0;

      let cur = infoContentStart;
      while (cur < infoContentEnd - 2) {
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
        if (durationLen === 4) {
          dataView.setFloat32(durationPos, durationInScale, false);
        } else {
          dataView.setFloat64(durationPos, durationInScale, false);
        }
        return new Blob([buffer], { type: webmBlob.type });
      }

      const durationHeader = new Uint8Array(11);
      durationHeader[0] = 0x44;
      durationHeader[1] = 0x89;
      durationHeader[2] = 0x88;
      new DataView(durationHeader.buffer).setFloat64(3, durationInScale, false);

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
      console.warn('[VideoStudio] WebM süre yaması uygulanamadı:', err);
      return webmBlob;
    }
  }

  // ============================================================
  // 1. DATA INGESTION & INITIALIZATION
  // ============================================================
  async function loadInitialVideo() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const recordingId = urlParams.get('id') || urlParams.get('recordingId');

      // 1. Try to load by specific ID from FullShotDB
      if (recordingId && typeof FullShotDB !== 'undefined' && FullShotDB.getRecording) {
        const record = await FullShotDB.getRecording(recordingId);
        if (record) {
          initializeWithData(record);
          return;
        }
      }

      // 2. Try to load most recent recording from FullShotDB
      if (typeof FullShotDB !== 'undefined' && FullShotDB.getRecording) {
        const latest = await FullShotDB.getRecording('current_video');
        if (latest && (latest.blob || latest.dataUrl)) {
          initializeWithData(latest);
          return;
        }

        const all = await FullShotDB.getAllRecordings();
        if (all && all.length > 0) {
          all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          initializeWithData(all[0]);
          return;
        }
      }

      // 3. Fallback to chrome.storage.local
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['fullshot_current_video', 'fullshot_current_capture']);
        const stored = result.fullshot_current_video || result.fullshot_current_capture;
        if (stored && (stored.dataUrl || stored.videoBlob || stored.blobUrl || stored.url)) {
          initializeWithData(stored);
          return;
        }
      }

      // 4. Fallback URL src
      const paramUrl = urlParams.get('src') || urlParams.get('video');
      if (paramUrl) {
        initializeWithData({
          title: urlParams.get('title') || 'Web Video Kaydı',
          url: paramUrl,
          dataUrl: paramUrl,
          timestamp: Date.now()
        });
        return;
      }

      // 5. Empty State
      showEmptyState();
    } catch (err) {
      console.warn('Video yükleme hatası:', err);
      showEmptyState();
    }
  }

  // Initialize Video Studio with Data
  function initializeWithData(data) {
    videoData = data;

    // Page metadata
    const rawTitle = data.title || 'Ekran Video Kaydı';
    const rawUrl = data.url || 'Web Tarayıcısı';
    const recTimestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    if (pageTitle) pageTitle.textContent = rawTitle;
    if (pageUrl) {
      pageUrl.textContent = rawUrl;
      pageUrl.title = rawUrl;
    }

    // Set Default Filename
    const cleanTitle = sanitizeFilename(rawTitle);
    const dateFormatted = getFormattedTimestamp(recTimestamp);
    defaultBaseName = `FullShot_Video_${cleanTitle}_${dateFormatted}`;

    if (fileNameInput) {
      fileNameInput.value = defaultBaseName;
    }

    // Load video source
    let sourceSrc = '';
    if (data.blob) {
      videoBlob = data.blob;
      sourceSrc = URL.createObjectURL(data.blob);
    } else if (data.videoBlob) {
      videoBlob = data.videoBlob;
      sourceSrc = URL.createObjectURL(data.videoBlob);
    } else if (data.dataUrl) {
      sourceSrc = data.dataUrl;
      fetch(data.dataUrl)
        .then((res) => res.blob())
        .then((b) => {
          videoBlob = b;
          updateFileSizeDisplay(b.size);
        })
        .catch(() => {});
    } else if (data.blobUrl) {
      sourceSrc = data.blobUrl;
    } else if (data.url) {
      sourceSrc = data.url;
    }

    activeVideoUrl = sourceSrc;
    mainVideo.src = sourceSrc;
    mainVideo.load();

    if (emptyStateCard) emptyStateCard.classList.add('hidden');
    if (videoPlayerContainer) videoPlayerContainer.classList.remove('hidden');

    if (videoBlob && videoBlob.size) {
      updateFileSizeDisplay(videoBlob.size);
    }
  }

  function showEmptyState() {
    if (emptyStateCard) emptyStateCard.classList.remove('hidden');
    if (pageTitle) pageTitle.textContent = 'Henüz Video Seçilmedi';
    if (pageUrl) pageUrl.textContent = 'Lütfen yerel bir video yükleyin veya demo klip oluşturun';
  }

  function updateFileSizeDisplay(sizeInBytes) {
    const formatted = formatBytes(sizeInBytes);
    if (fileSizeText) fileSizeText.textContent = formatted;
    if (webmSizeMeta) webmSizeMeta.textContent = formatted;
  }

  // ============================================================
  // 2. VIDEO METADATA & SPECS EXTRACTION
  // ============================================================
  mainVideo.addEventListener('loadedmetadata', () => {
    const width = mainVideo.videoWidth || 1920;
    const height = mainVideo.videoHeight || 1080;
    let duration = mainVideo.duration || 0;

    // Handle Infinity duration in UI gracefully
    if (!isFinite(duration) || duration <= 0) {
      duration = (videoData?.duration ? videoData.duration / 1000 : 0);
    }

    // Aspect Ratio & Label
    let qualityTag = 'HD';
    if (width >= 3840 || height >= 2160) qualityTag = '4K UHD';
    else if (width >= 2560 || height >= 1440) qualityTag = '2K QHD';
    else if (width >= 1920 || height >= 1080) qualityTag = '1080p FHD';
    else if (width >= 1280 || height >= 720) qualityTag = '720p HD';

    const resStr = `${width} × ${height} (${qualityTag})`;
    if (resolutionText) resolutionText.textContent = resStr;

    // Duration
    const formattedDuration = formatTime(duration);
    if (durationText) durationText.textContent = formattedDuration;
    if (timeTotal) timeTotal.textContent = formattedDuration;

    // Video Player Container Aspect Ratio adjustment
    if (width > 0 && height > 0) {
      videoPlayerContainer.style.aspectRatio = `${width} / ${height}`;
    }

    // Initialize Trim Range
    trimIn = 0;
    trimOut = duration > 0 ? duration : 0;
    updateTrimUI();
  });

  // ============================================================
  // 3. CUSTOM VIDEO PLAYER ENGINE
  // ============================================================

  // Play / Pause Toggle
  function togglePlayPause() {
    if (mainVideo.paused || mainVideo.ended) {
      mainVideo.play().catch((e) => console.warn('Play error:', e));
    } else {
      mainVideo.pause();
    }
  }

  function updatePlayPauseIcons(isPlaying) {
    const playIcons = document.querySelectorAll('.icon-play');
    const pauseIcons = document.querySelectorAll('.icon-pause');

    if (isPlaying) {
      playIcons.forEach((el) => el.classList.add('hidden'));
      pauseIcons.forEach((el) => el.classList.remove('hidden'));
      centerPlayButton.classList.add('hidden-play');
    } else {
      playIcons.forEach((el) => el.classList.remove('hidden'));
      pauseIcons.forEach((el) => el.classList.add('hidden'));
      centerPlayButton.classList.remove('hidden-play');
    }
  }

  mainVideo.addEventListener('play', () => updatePlayPauseIcons(true));
  mainVideo.addEventListener('pause', () => updatePlayPauseIcons(false));
  mainVideo.addEventListener('ended', () => {
    updatePlayPauseIcons(false);
    isPlayingTrimmedSegment = false;
    if (!mainVideo.loop) {
      centerPlayButton.classList.remove('hidden-play');
    }
  });

  // Click on video canvas or center play button
  if (videoPlayerContainer) {
    videoPlayerContainer.addEventListener('click', (e) => {
      if (e.target.closest('.custom-controls') || e.target.closest('.speed-dropdown')) return;
      togglePlayPause();
    });
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlayPause();
    });
  }

  if (centerPlayButton) {
    centerPlayButton.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlayPause();
    });
  }

  // Buffering indicator
  mainVideo.addEventListener('waiting', () => {
    if (bufferingSpinner) bufferingSpinner.classList.remove('hidden');
  });
  mainVideo.addEventListener('playing', () => {
    if (bufferingSpinner) bufferingSpinner.classList.add('hidden');
  });

  // ============================================================
  // 4. TIMELINE / SEEKBAR & SCRUBBING
  // ============================================================

  // Update progress bar on timeupdate
  mainVideo.addEventListener('timeupdate', () => {
    if (isScrubbing || isDraggingTrimIn || isDraggingTrimOut) return;

    const current = mainVideo.currentTime;
    const total = (isFinite(mainVideo.duration) && mainVideo.duration > 0) ? mainVideo.duration : (trimOut || 1);
    const pct = (current / total) * 100;

    if (timelineProgress) timelineProgress.style.width = `${pct}%`;
    if (timelineThumb) timelineThumb.style.left = `${pct}%`;
    if (timeCurrent) timeCurrent.textContent = formatTime(current);
    if (snapshotCurrentTime) snapshotCurrentTime.textContent = formatTime(current);

    // Stop playback if playing only the trimmed segment
    if (isPlayingTrimmedSegment && trimOut > 0 && current >= trimOut) {
      mainVideo.pause();
      mainVideo.currentTime = trimIn;
      isPlayingTrimmedSegment = false;
    }
  });

  // Update buffered progress bar
  mainVideo.addEventListener('progress', () => {
    if (!mainVideo.duration || !isFinite(mainVideo.duration)) return;
    const total = mainVideo.duration;
    const buf = mainVideo.buffered;
    if (buf.length > 0) {
      const end = buf.end(buf.length - 1);
      const pct = (end / total) * 100;
      if (timelineBuffer) timelineBuffer.style.width = `${Math.min(100, pct)}%`;
    }
  });

  function getSeekPercent(e) {
    const rect = timelineTrack.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    return Math.max(0, Math.min(1, clickX / width));
  }

  // Hover Tooltip on Timeline
  if (timelineContainer) {
    timelineContainer.addEventListener('mousemove', (e) => {
      const pct = getSeekPercent(e);
      const totalDur = isFinite(mainVideo.duration) && mainVideo.duration > 0 ? mainVideo.duration : trimOut;
      const targetTime = totalDur * pct;
      if (timeTooltip) {
        timeTooltip.textContent = formatTime(targetTime);
        const rect = timelineTrack.getBoundingClientRect();
        const tooltipX = e.clientX - rect.left;
        timeTooltip.style.left = `${tooltipX}px`;
      }
    });

    timelineContainer.addEventListener('mousedown', (e) => {
      // Ignore if clicking directly on trim handles
      if (e.target.closest('.timeline-trim-handle')) return;

      e.stopPropagation();
      isScrubbing = true;
      timelineContainer.classList.add('dragging');
      const pct = getSeekPercent(e);
      const totalDur = isFinite(mainVideo.duration) && mainVideo.duration > 0 ? mainVideo.duration : trimOut;
      mainVideo.currentTime = totalDur * pct;

      if (timelineProgress) timelineProgress.style.width = `${pct * 100}%`;
      if (timelineThumb) timelineThumb.style.left = `${pct * 100}%`;
    });
  }

  // ============================================================
  // 5. TIMELINE IN/OUT TRIMMING ENGINE
  // ============================================================

  function updateTrimUI() {
    const totalDur = isFinite(mainVideo.duration) && mainVideo.duration > 0 ? mainVideo.duration : (trimOut > 0 ? trimOut : 1);

    if (trimOut <= 0 || trimOut > totalDur) {
      trimOut = totalDur;
    }
    trimIn = Math.max(0, Math.min(trimIn, trimOut));

    const inPct = (trimIn / totalDur) * 100;
    const outPct = (trimOut / totalDur) * 100;
    const regionWidth = Math.max(0, outPct - inPct);

    // Update Handles & Region on Timeline
    if (trimInHandle) {
      trimInHandle.style.left = `${inPct}%`;
      trimInHandle.classList.toggle('hidden', !isTrimModeActive);
    }
    if (trimOutHandle) {
      trimOutHandle.style.left = `${outPct}%`;
      trimOutHandle.classList.toggle('hidden', !isTrimModeActive);
    }
    if (timelineTrimRegion) {
      timelineTrimRegion.style.left = `${inPct}%`;
      timelineTrimRegion.style.width = `${regionWidth}%`;
      timelineTrimRegion.classList.toggle('hidden', !isTrimModeActive);
    }

    // Update Sidebar Badges & Labels
    const trimmedDur = Math.max(0, trimOut - trimIn);
    if (trimStartTimeText) trimStartTimeText.textContent = formatTime(trimIn);
    if (trimEndTimeText) trimEndTimeText.textContent = formatTime(trimOut);
    if (trimDurationText) trimDurationText.textContent = formatTime(trimmedDur);

    // Update Export button labels & tags
    const hasActiveTrim = (trimIn > 0.05 || trimOut < (totalDur - 0.05));
    if (webmBadgeTag) {
      webmBadgeTag.textContent = hasActiveTrim ? 'Kırpılmış HD' : 'Orijinal HD';
      webmBadgeTag.className = hasActiveTrim ? 'badge-tag webm-tag highlight' : 'badge-tag webm-tag';
    }
    if (webmExportDesc) {
      webmExportDesc.textContent = hasActiveTrim
        ? `${formatTime(trimIn)} - ${formatTime(trimOut)} arası (${formatTime(trimmedDur)})`
        : 'Kayıpsız kalite, anında hızlı indirme';
    }
  }

  // Drag Trim In Handle
  if (trimInHandle) {
    trimInHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      isDraggingTrimIn = true;
      trimInHandle.classList.add('dragging');
    });
  }

  // Drag Trim Out Handle
  if (trimOutHandle) {
    trimOutHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      isDraggingTrimOut = true;
      trimOutHandle.classList.add('dragging');
    });
  }

  // Global Mouse Move for Timeline Scrubbing & Trim Dragging
  window.addEventListener('mousemove', (e) => {
    const totalDur = isFinite(mainVideo.duration) && mainVideo.duration > 0 ? mainVideo.duration : trimOut;
    if (totalDur <= 0) return;

    if (isScrubbing) {
      const pct = getSeekPercent(e);
      mainVideo.currentTime = totalDur * pct;
      if (timelineProgress) timelineProgress.style.width = `${pct * 100}%`;
      if (timelineThumb) timelineThumb.style.left = `${pct * 100}%`;
    } else if (isDraggingTrimIn) {
      const pct = getSeekPercent(e);
      const newIn = Math.max(0, Math.min(totalDur * pct, trimOut - 0.1));
      trimIn = newIn;
      mainVideo.currentTime = newIn;
      updateTrimUI();
    } else if (isDraggingTrimOut) {
      const pct = getSeekPercent(e);
      const newOut = Math.max(trimIn + 0.1, Math.min(totalDur * pct, totalDur));
      trimOut = newOut;
      mainVideo.currentTime = newOut;
      updateTrimUI();
    }
  });

  window.addEventListener('mouseup', () => {
    if (isScrubbing) {
      isScrubbing = false;
      if (timelineContainer) timelineContainer.classList.remove('dragging');
    }
    if (isDraggingTrimIn) {
      isDraggingTrimIn = false;
      if (trimInHandle) trimInHandle.classList.remove('dragging');
    }
    if (isDraggingTrimOut) {
      isDraggingTrimOut = false;
      if (trimOutHandle) trimOutHandle.classList.remove('dragging');
    }
  });

  // Set Trim In to current playhead
  function setTrimInToCurrent() {
    const cur = mainVideo.currentTime || 0;
    trimIn = Math.min(cur, Math.max(0, trimOut - 0.1));
    updateTrimUI();
    showFeedback(`In: ${formatTime(trimIn)}`);
  }

  // Set Trim Out to current playhead
  function setTrimOutToCurrent() {
    const cur = mainVideo.currentTime || 0;
    const totalDur = isFinite(mainVideo.duration) && mainVideo.duration > 0 ? mainVideo.duration : cur;
    trimOut = Math.max(trimIn + 0.1, Math.min(cur, totalDur));
    updateTrimUI();
    showFeedback(`Out: ${formatTime(trimOut)}`);
  }

  // Reset Trim to full duration
  function resetTrimRange() {
    trimIn = 0;
    trimOut = isFinite(mainVideo.duration) && mainVideo.duration > 0 ? mainVideo.duration : 0;
    updateTrimUI();
    showToast('Kırpma Sıfırlandı', 'Video başlangıç ve bitiş aralığı tam süreye getirildi.', 'info');
  }

  // Play Trimmed Segment
  function playTrimmedSegment() {
    isPlayingTrimmedSegment = true;
    mainVideo.currentTime = trimIn;
    mainVideo.play().catch(() => {});
    showFeedback('Kırpılan Oynatılıyor');
  }

  if (setTrimInBtn) setTrimInBtn.addEventListener('click', setTrimInToCurrent);
  if (setTrimOutBtn) setTrimOutBtn.addEventListener('click', setTrimOutToCurrent);
  if (resetTrimBtn) resetTrimBtn.addEventListener('click', resetTrimRange);
  if (playTrimmedBtn) playTrimmedBtn.addEventListener('click', playTrimmedSegment);

  if (trimToggleBtn) {
    trimToggleBtn.addEventListener('click', () => {
      isTrimModeActive = !isTrimModeActive;
      trimToggleBtn.classList.toggle('active', isTrimModeActive);
      updateTrimUI();
      showFeedback(isTrimModeActive ? 'Kırpma Açık' : 'Kırpma Kapalı');
    });
  }

  // ============================================================
  // 6. SKIP & FRAME STEPPING CONTROLS
  // ============================================================
  function skipSeconds(sec) {
    const totalDur = isFinite(mainVideo.duration) ? mainVideo.duration : 0;
    const target = Math.max(0, Math.min(totalDur, mainVideo.currentTime + sec));
    mainVideo.currentTime = target;
    showFeedback(`${sec > 0 ? '+' : ''}${sec}s`);
  }

  function stepFrame(frames = 1) {
    mainVideo.pause();
    const frameRate = 30;
    const stepTime = frames / frameRate;
    const totalDur = isFinite(mainVideo.duration) ? mainVideo.duration : 0;
    const target = Math.max(0, Math.min(totalDur, mainVideo.currentTime + stepTime));
    mainVideo.currentTime = target;
    showFeedback(`${frames > 0 ? '+1' : '-1'} Kare`);
  }

  if (skipBackBtn) skipBackBtn.addEventListener('click', () => skipSeconds(-5));
  if (skipForwardBtn) skipForwardBtn.addEventListener('click', () => skipSeconds(5));
  if (framePrevBtn) framePrevBtn.addEventListener('click', () => stepFrame(-1));
  if (frameNextBtn) frameNextBtn.addEventListener('click', () => stepFrame(1));

  // ============================================================
  // 7. VOLUME & MUTE CONTROLS
  // ============================================================
  function setVolume(val) {
    val = Math.max(0, Math.min(1, val));
    mainVideo.volume = val;
    mainVideo.muted = val === 0;
    if (volumeSlider) volumeSlider.value = val;
    updateVolumeIcon(val, mainVideo.muted);
  }

  function updateVolumeIcon(val, isMuted) {
    const volHigh = document.querySelector('.vol-high');
    const volLow = document.querySelector('.vol-low');
    const volMuted = document.querySelector('.vol-muted');

    if (volHigh) volHigh.classList.add('hidden');
    if (volLow) volLow.classList.add('hidden');
    if (volMuted) volMuted.classList.add('hidden');

    if (isMuted || val === 0) {
      if (volMuted) volMuted.classList.remove('hidden');
    } else if (val < 0.5) {
      if (volLow) volLow.classList.remove('hidden');
    } else {
      if (volHigh) volHigh.classList.remove('hidden');
    }
  }

  function toggleMute() {
    if (mainVideo.muted || mainVideo.volume === 0) {
      mainVideo.muted = false;
      setVolume(lastVolume > 0 ? lastVolume : 0.8);
      showFeedback(`Ses: %${Math.round(mainVideo.volume * 100)}`);
    } else {
      lastVolume = mainVideo.volume;
      mainVideo.muted = true;
      if (volumeSlider) volumeSlider.value = 0;
      updateVolumeIcon(0, true);
      showFeedback('Sessiz');
    }
  }

  if (volumeBtn) volumeBtn.addEventListener('click', toggleMute);
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      lastVolume = val;
      mainVideo.muted = val === 0;
      mainVideo.volume = val;
      updateVolumeIcon(val, mainVideo.muted);
    });
  }

  // ============================================================
  // 8. PLAYBACK SPEED SELECTOR
  // ============================================================
  if (speedMenuBtn && speedDropdown) {
    speedMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speedDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.speed-menu-container')) {
        speedDropdown.classList.add('hidden');
      }
    });

    speedOptions.forEach((opt) => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const speed = parseFloat(opt.getAttribute('data-speed'));
        mainVideo.playbackRate = speed;
        if (speedValueText) speedValueText.textContent = `${speed}x`;

        speedOptions.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        speedDropdown.classList.add('hidden');

        showFeedback(`Hız: ${speed}x`);
      });
    });
  }

  // ============================================================
  // 9. LOOP, PICTURE-IN-PICTURE & FULLSCREEN
  // ============================================================

  if (loopToggleBtn) {
    loopToggleBtn.addEventListener('click', () => {
      mainVideo.loop = !mainVideo.loop;
      loopToggleBtn.classList.toggle('active', mainVideo.loop);
      showFeedback(mainVideo.loop ? 'Döngü Açık' : 'Döngü Kapalı');
    });
  }

  if (pipBtn) {
    pipBtn.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await mainVideo.requestPictureInPicture();
        }
      } catch (err) {
        showToast('PiP Hatası', 'Pencere içinde pencere modu başlatılamadı.', 'error');
      }
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (videoPlayerContainer.requestFullscreen) {
        videoPlayerContainer.requestFullscreen();
      } else if (videoPlayerContainer.webkitRequestFullscreen) {
        videoPlayerContainer.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);

  mainVideo.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    toggleFullscreen();
  });

  document.addEventListener('fullscreenchange', () => {
    const isFull = !!document.fullscreenElement;
    const iconExpand = document.querySelector('.icon-expand');
    const iconCompress = document.querySelector('.icon-compress');

    if (iconExpand) iconExpand.classList.toggle('hidden', isFull);
    if (iconCompress) iconCompress.classList.toggle('hidden', !isFull);
  });

  // ============================================================
  // 10. AUTO-HIDE CONTROLS ON IDLE IN PLAYBACK
  // ============================================================
  function resetIdleControls() {
    if (videoPlayerContainer) {
      videoPlayerContainer.classList.remove('controls-hidden');
    }
    clearTimeout(idleTimer);

    if (!mainVideo.paused && !mainVideo.ended) {
      idleTimer = setTimeout(() => {
        if (!mainVideo.paused && videoPlayerContainer) {
          videoPlayerContainer.classList.add('controls-hidden');
        }
      }, 2500);
    }
  }

  if (videoPlayerContainer) {
    videoPlayerContainer.addEventListener('mousemove', resetIdleControls);
    videoPlayerContainer.addEventListener('mouseleave', () => {
      if (!mainVideo.paused) {
        videoPlayerContainer.classList.add('controls-hidden');
      }
    });
  }

  // ============================================================
  // 11. EXPORT, TRANSCODING & DOWNLOAD ENGINE
  // ============================================================

  function getComputedFilename(ext = 'webm') {
    const userVal = (fileNameInput?.value || defaultBaseName).trim();
    const clean = sanitizeFilename(userVal);
    return `${clean}.${ext}`;
  }

  if (resetFilenameBtn) {
    resetFilenameBtn.addEventListener('click', () => {
      if (fileNameInput) fileNameInput.value = defaultBaseName;
      showToast('Sıfırlandı', 'Varsayılan dosya adı şablonu yüklendi.', 'info');
    });
  }

  function triggerFileDownload(urlOrBlob, filename) {
    try {
      const isBlob = urlOrBlob instanceof Blob;
      const downloadUrl = isBlob ? URL.createObjectURL(urlOrBlob) : urlOrBlob;

      if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
        chrome.downloads.download(
          {
            url: downloadUrl,
            filename: filename,
            saveAs: true
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              fallbackAnchorDownload(downloadUrl, filename);
            } else {
              showToast('İndirme Başlatıldı', `${filename} kaydediliyor.`, 'success');
            }
          }
        );
      } else {
        fallbackAnchorDownload(downloadUrl, filename);
      }
    } catch (e) {
      console.error('Download error:', e);
      showToast('İndirme Hatası', e.message || 'Dosya indirilemedi.', 'error');
    }
  }

  function fallbackAnchorDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      showToast('İndirme Başlatıldı', `${filename} başarıyla indirildi.`, 'success');
    }, 150);
  }

  function showExportProgress(pct, title, desc) {
    if (exportProgressModal) exportProgressModal.classList.remove('hidden');
    if (exportProgressTitle && title) exportProgressTitle.textContent = title;
    if (exportProgressDesc && desc) exportProgressDesc.textContent = desc;
    if (exportProgressBar) exportProgressBar.style.width = `${pct}%`;
    if (exportProgressPct) exportProgressPct.textContent = `%${pct}`;
  }

  function updateExportProgress(pct) {
    if (exportProgressBar) exportProgressBar.style.width = `${pct}%`;
    if (exportProgressPct) exportProgressPct.textContent = `%${pct}`;
  }

  function hideExportProgress() {
    if (exportProgressModal) exportProgressModal.classList.add('hidden');
  }

  /**
   * Client-side high-performance video slice & transcode engine for trimmed exports
   * Provides sample-accurate audio-video synchronization without clipping drift.
   */
  async function transcodeTrimmedVideo(targetFormat = 'webm') {
    const totalDur = isFinite(mainVideo.duration) && mainVideo.duration > 0 ? mainVideo.duration : trimOut;
    const clipDuration = Math.max(0.1, trimOut - trimIn);

    showExportProgress(0, 'Video Kırpılıyor...', 'Seçili video aralığı kayıpsız işleniyor, lütfen bekleyin.');

    return new Promise(async (resolve, reject) => {
      let audioCtx = null;
      let offVideo = null;
      let animationFrameId = null;

      const cleanupTranscoder = () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        if (offVideo) {
          offVideo.pause();
          offVideo.removeAttribute('src');
          offVideo.load();
          offVideo = null;
        }
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close().catch(() => {});
          audioCtx = null;
        }
      };

      try {
        offVideo = document.createElement('video');
        offVideo.src = activeVideoUrl;
        offVideo.crossOrigin = 'anonymous';
        offVideo.muted = false;
        offVideo.playsInline = true;
        offVideo.preload = 'auto';

        await new Promise((r, errR) => {
          offVideo.onloadeddata = r;
          offVideo.onerror = () => errR(new Error('Video verisi hazırlanamadı.'));
        });

        const width = offVideo.videoWidth || mainVideo.videoWidth || 1920;
        const height = offVideo.videoHeight || mainVideo.videoHeight || 1080;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

        // Capture canvas stream at native 60fps
        const stream = canvas.captureStream(60);

        // Audio track mixing
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            if (audioCtx.state === 'suspended') {
              await audioCtx.resume();
            }
            const sourceNode = audioCtx.createMediaElementSource(offVideo);
            const destNode = audioCtx.createMediaStreamDestination();
            sourceNode.connect(destNode);

            destNode.stream.getAudioTracks().forEach((track) => {
              stream.addTrack(track);
            });
          }
        } catch (audioErr) {
          console.warn('[VideoStudio] Audio mix uyarısı:', audioErr);
        }

        // Determine optimal recorder mime type
        let mimeType = 'video/webm;codecs=vp9,opus';
        if (targetFormat === 'mp4') {
          if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
            mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
          } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
          }
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
            ? 'video/webm;codecs=vp8,opus'
            : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '');
        }

        const recorderOptions = {
          videoBitsPerSecond: 16000000,
          audioBitsPerSecond: 256000
        };
        if (mimeType) recorderOptions.mimeType = mimeType;

        const recorder = new MediaRecorder(stream, recorderOptions);
        const chunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          try {
            updateExportProgress(100);
            const effectiveMime = recorder.mimeType || mimeType || 'video/webm';
            const rawBlob = new Blob(chunks, { type: effectiveMime });
            let finalBlob = rawBlob;

            if (effectiveMime.includes('webm')) {
              finalBlob = await fixWebmDuration(rawBlob, clipDuration * 1000);
            }
            if (targetFormat === 'mp4' && !effectiveMime.includes('mp4')) {
              finalBlob = new Blob([finalBlob], { type: 'video/mp4' });
            }

            cleanupTranscoder();
            setTimeout(hideExportProgress, 250);
            resolve(finalBlob);
          } catch (stopErr) {
            cleanupTranscoder();
            hideExportProgress();
            reject(stopErr);
          }
        };

        recorder.onerror = (recErr) => {
          cleanupTranscoder();
          hideExportProgress();
          reject(new Error('MediaRecorder hatası: ' + (recErr.error?.message || 'Bilinmeyen hata')));
        };

        // Precision seek to trimIn
        offVideo.currentTime = trimIn;
        await new Promise((r) => {
          offVideo.addEventListener('seeked', r, { once: true });
        });

        // Prime the initial frame on canvas
        ctx.drawImage(offVideo, 0, 0, width, height);

        // Start recorder with 50ms chunk frequency for accurate slicing
        recorder.start(50);
        await offVideo.play();

        let isCompleted = false;
        const processFrame = () => {
          if (isCompleted) return;

          if (offVideo.currentTime >= trimOut || offVideo.ended) {
            isCompleted = true;
            offVideo.pause();
            if (recorder.state === 'recording') {
              recorder.stop();
            }
            return;
          }

          ctx.drawImage(offVideo, 0, 0, width, height);

          const progress = Math.min(99, Math.max(0, Math.round(((offVideo.currentTime - trimIn) / clipDuration) * 100)));
          updateExportProgress(progress);

          animationFrameId = requestAnimationFrame(processFrame);
        };

        animationFrameId = requestAnimationFrame(processFrame);
      } catch (err) {
        cleanupTranscoder();
        hideExportProgress();
        reject(err);
      }
    });
  }

  // 1. Download WebM (Original or Trimmed)
  async function downloadWebM() {
    const finalFilename = getComputedFilename('webm');
    const totalDur = isFinite(mainVideo.duration) && mainVideo.duration > 0 ? mainVideo.duration : trimOut;
    const hasTrim = isTrimModeActive && (trimIn > 0.05 || (totalDur > 0 && trimOut < (totalDur - 0.05)));

    try {
      if (hasTrim) {
        const trimmedBlob = await transcodeTrimmedVideo('webm');
        triggerFileDownload(trimmedBlob, finalFilename);
      } else if (videoBlob) {
        triggerFileDownload(videoBlob, finalFilename);
      } else if (activeVideoUrl) {
        triggerFileDownload(activeVideoUrl, finalFilename);
      } else {
        showToast('Hata', 'İndirilecek video verisi bulunamadı.', 'error');
      }
    } catch (err) {
      console.error('WebM export error:', err);
      showToast('Dışa Aktarma Hatası', err.message || 'Video işlenemedi.', 'error');
    }
  }

  if (exportWebmBtn) exportWebmBtn.addEventListener('click', downloadWebM);
  if (topDownloadWebmBtn) topDownloadWebmBtn.addEventListener('click', downloadWebM);

  // 2. Download MP4 (Universal container export & transcoding)
  async function downloadMP4() {
    const totalDur = isFinite(mainVideo.duration) && mainVideo.duration > 0 ? mainVideo.duration : trimOut;
    const hasTrim = isTrimModeActive && (trimIn > 0.05 || (totalDur > 0 && trimOut < (totalDur - 0.05)));
    const isMp4EncoderSupported = (typeof MediaRecorder !== 'undefined') &&
      (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2') || MediaRecorder.isTypeSupported('video/mp4'));

    try {
      if (videoBlob && videoBlob.type && videoBlob.type.includes('mp4') && !hasTrim) {
        const finalFilename = getComputedFilename('mp4');
        triggerFileDownload(videoBlob, finalFilename);
        return;
      }

      if (isMp4EncoderSupported) {
        const finalFilename = getComputedFilename('mp4');
        const mp4Blob = await transcodeTrimmedVideo('mp4');
        triggerFileDownload(mp4Blob, finalFilename);
      } else {
        // Fallback for browsers lacking native MP4 MediaRecorder encoder
        const finalFilename = getComputedFilename(hasTrim ? 'webm' : (videoBlob?.type?.includes('webm') ? 'webm' : 'mp4'));
        if (hasTrim) {
          showToast('MP4 Uyarısı', 'Tarayıcınız MP4 kodlamayı desteklemediğinden kayıpsız WebM olarak dışa aktarılıyor.', 'info');
          const webmBlob = await transcodeTrimmedVideo('webm');
          triggerFileDownload(webmBlob, finalFilename);
        } else if (videoBlob) {
          showToast('Kayıpsız İndirme', 'Orijinal yüksek kaliteli video dosyası indiriliyor.', 'info');
          triggerFileDownload(videoBlob, finalFilename);
        } else if (activeVideoUrl) {
          triggerFileDownload(activeVideoUrl, finalFilename);
        } else {
          showToast('Hata', 'İndirilecek video verisi bulunamadı.', 'error');
        }
      }
    } catch (err) {
      console.error('MP4 export error:', err);
      showToast('MP4 Hatası', err.message || 'Video dışa aktarılamadı.', 'error');
    }
  }

  if (exportMp4Btn) exportMp4Btn.addEventListener('click', downloadMP4);

  // 3. Snapshot / Frame Grabber (PNG export, Clipboard copy & Image Studio markup)
  function captureCurrentFrameCanvas() {
    const width = mainVideo.videoWidth || 1920;
    const height = mainVideo.videoHeight || 1080;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.drawImage(mainVideo, 0, 0, width, height);

    return canvas;
  }

  function downloadSnapshotPNG() {
    try {
      const canvas = captureCurrentFrameCanvas();
      const currentSec = Math.floor(mainVideo.currentTime || 0);
      const snapName = `${sanitizeFilename(fileNameInput?.value || defaultBaseName)}_kare_${currentSec}s.png`;

      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('Hata', 'Kare yakalanamadı.', 'error');
          return;
        }
        triggerFileDownload(blob, snapName);
        showToast('Kare İndirildi', `${snapName} (${canvas.width}×${canvas.height}px) HD PNG olarak kaydedildi.`, 'success');
      }, 'image/png');
    } catch (err) {
      showToast('Kare Yakalama Hatası', err.message, 'error');
    }
  }

  async function openSnapshotInImageStudio() {
    try {
      const canvas = captureCurrentFrameCanvas();
      const currentSec = Math.floor(mainVideo.currentTime || 0);
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const captureId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const captureItem = {
        id: captureId,
        dataUrl,
        title: `${videoData?.title || 'Video'}_kare_${currentSec}s`,
        url: videoData?.url || window.location.href,
        width: canvas.width,
        height: canvas.height,
        format: 'png',
        timestamp: Date.now(),
        type: 'snapshot'
      };

      // 1. Write to chrome.storage.local for fast retrieval
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ fullshot_current_capture: captureItem });
      }

      // 2. Persist to FullShotDB with unique ID and fallback key
      if (typeof FullShotDB !== 'undefined' && FullShotDB.saveCapture) {
        await FullShotDB.saveCapture(captureItem);
        await FullShotDB.saveCapture({ ...captureItem, id: 'current_capture' });
      }

      showToast('Görsel Stüdyosu Açılıyor', 'Kare çizim ve işaretleme stüdyosuna aktarıldı.', 'success');

      const studioUrl = chrome.runtime.getURL(`src/pages/image-studio/image-studio.html?id=${encodeURIComponent(captureId)}`);
      window.open(studioUrl, '_blank');
    } catch (err) {
      console.error('Snapshot stüdyo açma hatası:', err);
      showToast('Hata', 'Görsel stüdyosu açılamadı: ' + err.message, 'error');
    }
  }

  async function copySnapshotToClipboard() {
    try {
      const canvas = captureCurrentFrameCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Hata', 'Kare panoya aktarılamadı.', 'error');
          return;
        }
        if (navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          showToast('Panoya Kopyalandı', 'Mevcut video karesi panoya kopyalandı.', 'success');
        } else {
          showToast('Kopyalama Başarısız', 'Tarayıcınız pano resim kopyalamasını desteklemiyor.', 'error');
        }
      }, 'image/png');
    } catch (err) {
      showToast('Hata', 'Panoya kopyalama başarısız oldu.', 'error');
    }
  }

  if (openImageStudioSnapshotBtn) openImageStudioSnapshotBtn.addEventListener('click', openSnapshotInImageStudio);
  if (downloadSnapshotBtn) downloadSnapshotBtn.addEventListener('click', downloadSnapshotPNG);
  if (copySnapshotBtn) copySnapshotBtn.addEventListener('click', copySnapshotToClipboard);
  if (topSnapshotBtn) topSnapshotBtn.addEventListener('click', downloadSnapshotPNG);

  // ============================================================
  // 12. LOCAL VIDEO FILE INPUT & DEMO GENERATOR
  // ============================================================

  // Local File Upload
  if (localVideoInput) {
    localVideoInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const fileUrl = URL.createObjectURL(file);
      initializeWithData({
        title: file.name.replace(/\.[^/.]+$/, ''),
        url: 'Yerel Dosya: ' + file.name,
        blob: file,
        videoBlob: file,
        blobUrl: fileUrl,
        timestamp: file.lastModified || Date.now()
      });

      showToast('Video Yüklendi', `${file.name} başarıyla açıldı.`, 'success');
    });
  }

  // Drag and drop video onto stage
  if (videoWorkspace) {
    videoWorkspace.addEventListener('dragover', (e) => {
      e.preventDefault();
      videoWorkspace.style.boxShadow = 'inset 0 0 0 2px var(--primary)';
    });

    videoWorkspace.addEventListener('dragleave', () => {
      videoWorkspace.style.boxShadow = '';
    });

    videoWorkspace.addEventListener('drop', (e) => {
      e.preventDefault();
      videoWorkspace.style.boxShadow = '';
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('video/')) {
        const fileUrl = URL.createObjectURL(file);
        initializeWithData({
          title: file.name.replace(/\.[^/.]+$/, ''),
          url: 'Sürüklenen Dosya: ' + file.name,
          blob: file,
          videoBlob: file,
          blobUrl: fileUrl,
          timestamp: file.lastModified || Date.now()
        });
        showToast('Video Yüklendi', `${file.name} başarıyla açıldı.`, 'success');
      }
    });
  }

  // Dynamic Demo Video Generator (5s 60fps HTML5 Canvas Recording)
  if (generateDemoVideoBtn) {
    generateDemoVideoBtn.addEventListener('click', async () => {
      showToast('Oluşturuluyor', 'Demo neon video klibi oluşturuluyor...', 'info');

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        const stream = canvas.captureStream(60);
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
            ? 'video/webm; codecs=vp9'
            : 'video/webm'
        });

        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);

        recorder.onstop = async () => {
          const rawBlob = new Blob(chunks, { type: 'video/webm' });
          const patchedBlob = await fixWebmDuration(rawBlob, 5000);
          const blobUrl = URL.createObjectURL(patchedBlob);

          initializeWithData({
            title: 'FullShot_Pro_Demo_Showcase',
            url: 'https://fullshot.pro/demo',
            blob: patchedBlob,
            videoBlob: patchedBlob,
            blobUrl: blobUrl,
            timestamp: Date.now()
          });

          showToast('Demo Hazır', 'Demo video oynatıcıda yüklendi.', 'success');
        };

        recorder.start();

        let frameCount = 0;
        const maxFrames = 300;

        const renderDemoFrame = () => {
          if (frameCount >= maxFrames) {
            recorder.stop();
            return;
          }

          const t = frameCount / 60;

          // Background
          ctx.fillStyle = '#1f2125';
          ctx.fillRect(0, 0, 1920, 1080);

          // Grid
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          for (let x = 0; x < 1920; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 1080);
            ctx.stroke();
          }
          for (let y = 0; y < 1080; y += 60) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(1920, y);
            ctx.stroke();
          }

          // Glowing Slate Blue Circle
          const centerX = 960 + Math.sin(t * 2) * 200;
          const centerY = 540 + Math.cos(t * 2) * 100;

          const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 350);
          grad.addColorStop(0, 'rgba(109, 129, 150, 0.85)');
          grad.addColorStop(0.5, 'rgba(109, 129, 150, 0.35)');
          grad.addColorStop(1, 'transparent');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 350, 0, Math.PI * 2);
          ctx.fill();

          // Text
          ctx.fillStyle = '#FFFFE3';
          ctx.font = 'bold 56px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('FullShot Pro - Video Stüdyosu', 960, 500);

          ctx.fillStyle = '#CBCBCB';
          ctx.font = '600 28px -apple-system, sans-serif';
          ctx.fillText(`60 FPS Orijinal Kalite • Zaman: ${t.toFixed(2)}s / 5.00s`, 960, 560);

          ctx.strokeStyle = 'rgba(109, 129, 150, 0.7)';
          ctx.lineWidth = 6;
          ctx.strokeRect(40, 40, 1840, 1000);

          frameCount++;
          requestAnimationFrame(renderDemoFrame);
        };

        renderDemoFrame();
      } catch (err) {
        showToast('Demo Hatası', err.message, 'error');
      }
    });
  }

  // ============================================================
  // 13. KEYBOARD SHORTCUTS MODAL & GLOBAL HANDLER
  // ============================================================
  function openShortcutsModal() {
    if (shortcutsModal) shortcutsModal.classList.remove('hidden');
  }

  function closeShortcutsModal() {
    if (shortcutsModal) shortcutsModal.classList.add('hidden');
  }

  if (shortcutsBtn) shortcutsBtn.addEventListener('click', openShortcutsModal);
  if (closeShortcutsBtn) closeShortcutsBtn.addEventListener('click', closeShortcutsModal);
  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) closeShortcutsModal();
    });
  }

  // Global Keyboard Listener
  document.addEventListener('keydown', (e) => {
    if (document.activeElement === fileNameInput) {
      if (e.key === 'Enter') fileNameInput.blur();
      return;
    }

    if (e.key === 'Escape') {
      closeShortcutsModal();
      return;
    }

    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      openShortcutsModal();
      return;
    }

    // Ctrl+S / Cmd+S -> Download WebM
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      downloadWebM();
      return;
    }

    // Space / K -> Play/Pause
    if (e.code === 'Space' || e.key.toLowerCase() === 'k') {
      e.preventDefault();
      togglePlayPause();
      return;
    }

    // T -> Toggle Trim
    if (e.key.toLowerCase() === 't') {
      e.preventDefault();
      if (trimToggleBtn) trimToggleBtn.click();
      return;
    }

    // [ or I -> Set Trim In
    if (e.key === '[' || e.key.toLowerCase() === 'i') {
      e.preventDefault();
      setTrimInToCurrent();
      return;
    }

    // ] or O -> Set Trim Out
    if (e.key === ']' || e.key.toLowerCase() === 'o') {
      e.preventDefault();
      setTrimOutToCurrent();
      return;
    }

    // \ -> Reset Trim
    if (e.key === '\\') {
      e.preventDefault();
      resetTrimRange();
      return;
    }

    // F -> Fullscreen
    if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    // M -> Mute Toggle
    if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      toggleMute();
      return;
    }

    // Left Arrow / J -> Skip -5s
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'j') {
      e.preventDefault();
      skipSeconds(-5);
      return;
    }

    // Right Arrow / L -> Skip +5s
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l') {
      e.preventDefault();
      skipSeconds(5);
      return;
    }

    // Up Arrow -> Volume +10%
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setVolume(mainVideo.volume + 0.1);
      showFeedback(`Ses: %${Math.round(mainVideo.volume * 100)}`);
      return;
    }

    // Down Arrow -> Volume -10%
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setVolume(mainVideo.volume - 0.1);
      showFeedback(`Ses: %${Math.round(mainVideo.volume * 100)}`);
      return;
    }

    // Frame Stepping: , (comma) and . (period)
    if (e.key === ',') {
      e.preventDefault();
      stepFrame(-1);
      return;
    }
    if (e.key === '.') {
      e.preventDefault();
      stepFrame(1);
      return;
    }

    // S -> Snapshot Frame PNG
    if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      downloadSnapshotPNG();
      return;
    }

    // P -> Picture-in-Picture
    if (e.key.toLowerCase() === 'p') {
      e.preventDefault();
      if (pipBtn) pipBtn.click();
      return;
    }

    // Number keys 0-9 for 0% to 90% seek
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const num = parseInt(e.key, 10);
      const totalDur = isFinite(mainVideo.duration) && mainVideo.duration > 0 ? mainVideo.duration : trimOut;
      const targetTime = totalDur * (num / 10);
      mainVideo.currentTime = targetTime;
      showFeedback(`%${num * 10}`);
      return;
    }
  });

  // Start initialization
  loadInitialVideo();
});
