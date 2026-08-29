/**
 * FullShot Pro - In-Page Area Selector (Crop HUD & 8x Magnifier Loupe)
 * Isolated Shadow DOM v1 Component for interactive crosshair region selection & capture.
 * Features: 8x Magnifier Loupe, Crosshair, Pixel Grid, Live HEX/RGB Color Picker,
 * OCR Text Extraction, Pin to Screen, Clipboard Copy, Direct Download, Image Studio.
 * 4-Color Slate/Charcoal Palette (#4A4A4A, #CBCBCB, #FFFFE3, #6D8196)
 */

(function () {
  'use strict';

  window.FullShotHUD = window.FullShotHUD || {};

  let currentHost = null;
  let currentShadow = null;
  let activeCleanup = null;

  /**
   * Utility: Sleep helper
   */
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Helper: Double rAF layout sync
   */
  function waitForDoubleRAF() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }

  /**
   * Helper: Load Image from DataURL
   */
  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Görüntü verisi yüklenemedi.'));
      img.src = dataUrl;
    });
  }

  /**
   * Helper: Copy dataURL to clipboard as PNG
   */
  async function copyDataUrlToClipboard(dataUrl) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        return true;
      }
    } catch (err) {
      console.warn('[AreaSelector] ClipboardItem kopyalama hatası:', err);
    }
    return false;
  }

  /**
   * Extracts DOM text nodes intersecting the selection bounding box.
   */
  function extractDomTextInBox(x, y, w, h) {
    try {
      const walker = document.createTreeWalker(
        document.body || document.documentElement,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent || parent.closest('[id^="__fullshot_"]')) return NodeFilter.FILTER_REJECT;
            const rect = parent.getBoundingClientRect();
            if (rect.right < x || rect.left > x + w || rect.bottom < y || rect.top > y + h) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const linesMap = new Map();
      let node;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        const rect = parent.getBoundingClientRect();
        const lineKey = Math.round(rect.top / 10) * 10;
        if (!linesMap.has(lineKey)) linesMap.set(lineKey, []);
        linesMap.get(lineKey).push(node.nodeValue.trim());
      }

      const sortedKeys = Array.from(linesMap.keys()).sort((a, b) => a - b);
      const resultLines = sortedKeys.map((k) => linesMap.get(k).join(' ')).filter(Boolean);
      return resultLines.join('\n').trim();
    } catch (e) {
      return '';
    }
  }

  /**
   * Starts the interactive crosshair area selection mode.
   * @param {Object} [options={}] - Selection and capture options
   */
  function start(options = {}) {
    cleanup();

    if (window.FullShotHUD.toast) {
      window.FullShotHUD.toast.show('Seçili Alan Modu (Alt+Shift+S) - Kırpmak için sürükleyin, Renk Kopyala [C], Çıkış [ESC]', {
        icon: 'crop',
        duration: 3200
      });
    }

    const dpr = window.devicePixelRatio || 1;
    const format = options.format === 'jpeg' ? 'jpeg' : 'png';
    const quality = typeof options.quality === 'number' ? options.quality : 95;

    const originalBodyOverflow = document.body ? document.body.style.overflow : '';
    const originalHtmlOverflow = document.documentElement ? document.documentElement.style.overflow : '';
    const originalHtmlPaddingRight = document.documentElement ? document.documentElement.style.paddingRight : '';
    const originalBodyPaddingRight = document.body ? document.body.style.paddingRight : '';
    const scrollbarWidth = window.innerWidth - (document.documentElement ? document.documentElement.clientWidth : window.innerWidth);

    if (document.documentElement) {
      document.documentElement.style.overflow = 'hidden';
    }
    if (document.body) {
      document.body.style.overflow = 'hidden';
    }
    if (scrollbarWidth > 0 && document.documentElement) {
      const computedHtmlPaddingRight = parseFloat(window.getComputedStyle(document.documentElement).paddingRight) || 0;
      document.documentElement.style.setProperty('padding-right', `${computedHtmlPaddingRight + scrollbarWidth}px`, 'important');
    }

    const host = document.createElement('div');
    host.id = '__fullshot_selection_host__';
    host.style.cssText = 'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; cursor: crosshair !important; user-select: none !important; -webkit-user-select: none !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host {
          all: initial !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
          line-height: normal !important;
          letter-spacing: normal !important;
          text-align: left !important;
          color: #FFFFE3 !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          direction: ltr !important;
        }
        *, *::before, *::after {
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
          font-family: inherit !important;
          scrollbar-width: none !important;
        }
        ::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .selection-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          cursor: crosshair;
          user-select: none;
          -webkit-user-select: none;
          box-sizing: border-box;
        }
        .selection-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .badge {
          position: absolute;
          background: #373a40;
          border: 1px solid #545862;
          color: #FFFFE3;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          pointer-events: none;
          display: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          z-index: 10;
          font-weight: 600;
          white-space: nowrap;
        }
        .banner {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #4A4A4A;
          border: 1px solid #545862;
          color: #FFFFE3;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 12px;
          font-weight: 500;
          padding: 8px 18px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(109, 129, 150, 0.2);
          pointer-events: none;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
          animation: bannerIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          max-width: calc(100vw - 32px);
          white-space: nowrap;
        }
        @keyframes bannerIn {
          from { transform: translate(-50%, -15px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .banner kbd {
          background: #24262b;
          border: 1px solid #545862;
          color: #FFFFE3;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          font-weight: 600;
        }

        /* 8x Magnifier Loupe & Live Color Picker HUD */
        .magnifier-loupe {
          position: fixed;
          display: none;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
          z-index: 25;
          gap: 6px;
        }
        .loupe-circle {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          border: 2.5px solid #6D8196;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.25), inset 0 0 8px rgba(0,0,0,0.4);
          overflow: hidden;
          background: #24262b;
          position: relative;
        }
        .loupe-canvas {
          width: 140px;
          height: 140px;
          display: block;
        }
        .color-panel {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #373a40;
          border: 1px solid #545862;
          border-radius: 8px;
          padding: 4px 8px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          color: #FFFFE3;
          white-space: nowrap;
        }
        .color-swatch {
          width: 14px;
          height: 14px;
          border-radius: 4px;
          border: 1px solid #545862;
          background: #6D8196;
          flex-shrink: 0;
        }
        .color-hex {
          font-weight: 700;
          color: #FFFFE3;
        }
        .color-rgb {
          color: #CBCBCB;
          font-size: 10px;
        }
        .color-kbd {
          background: #24262b;
          border: 1px solid #545862;
          color: #FFFFE3;
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 10px;
        }

        /* Floating Quick Action Bar */
        .quick-bar {
          position: absolute;
          display: none;
          align-items: center;
          gap: 6px;
          background: #4A4A4A;
          border: 1px solid #545862;
          border-radius: 12px;
          padding: 6px 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(109, 129, 150, 0.25);
          z-index: 20;
          animation: qbPop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: default;
          pointer-events: auto;
          user-select: none;
          -webkit-user-select: none;
          max-width: calc(100vw - 24px);
        }
        @keyframes qbPop {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .qb-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #373a40;
          color: #FFFFE3;
          border: 1px solid #545862;
          border-radius: 8px;
          padding: 7px 11px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          outline: none;
          line-height: 1;
        }
        .qb-btn:hover {
          background: #6D8196;
          border-color: #6D8196;
          color: #FFFFE3;
          transform: translateY(-1px);
        }
        .qb-btn:active {
          transform: translateY(0);
        }
        .qb-btn.qb-studio {
          background: #6D8196;
          border-color: #6D8196;
          color: #FFFFE3;
        }
        .qb-btn.qb-studio:hover {
          background: #8096ac;
          border-color: #8096ac;
        }
        .qb-btn.qb-pin {
          background: #373a40;
          color: #FFFFE3;
        }
        .qb-btn.qb-pin:hover {
          background: #6D8196;
          border-color: #6D8196;
        }
        .qb-btn.qb-ocr {
          background: #373a40;
          color: #FFFFE3;
        }
        .qb-btn.qb-ocr:hover {
          background: #6D8196;
          border-color: #6D8196;
        }
        .qb-btn.qb-cancel {
          padding: 7px 9px;
          color: #CBCBCB;
        }
        .qb-btn.qb-cancel:hover {
          background: #ef4444;
          border-color: #ef4444;
          color: #fff;
        }
        .qb-btn svg {
          display: block;
          flex-shrink: 0;
          pointer-events: none;
        }
      </style>
      <div class="selection-overlay" id="overlay">
        <canvas class="selection-canvas" id="canvas"></canvas>
        <div class="badge" id="badge">0 x 0</div>
        <div class="banner" id="banner">
          <span>Kırpmak için sürükleyin | Renk Kopyala <kbd>C</kbd> | Çıkış <kbd>ESC</kbd></span>
        </div>

        <!-- 8x Magnifier Loupe -->
        <div class="magnifier-loupe" id="loupe">
          <div class="loupe-circle">
            <canvas class="loupe-canvas" id="loupeCanvas" width="140" height="140"></canvas>
          </div>
          <div class="color-panel">
            <span class="color-swatch" id="colorSwatch"></span>
            <span class="color-hex" id="colorHex">#4A4A4A</span>
            <span class="color-rgb" id="colorRgb">rgb(74, 74, 74)</span>
            <kbd class="color-kbd">C</kbd>
          </div>
        </div>

        <!-- Floating Quick Action Bar -->
        <div class="quick-bar" id="quickBar">
          <button class="qb-btn qb-ocr" id="qbOcrBtn" title="Metni Kopyala (OCR)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"></path></svg>
            <span>Metni Kopyala (OCR)</span>
          </button>
          <button class="qb-btn qb-pin" id="qbPinBtn" title="Ekrana Sabitle (Yüzen Referans)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path></svg>
            <span>Sabitle (Pin)</span>
          </button>
          <button class="qb-btn qb-copy" id="qbCopyBtn" title="Panoya Kopyala (Ctrl+C)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
            <span>Kopyala</span>
          </button>
          <button class="qb-btn qb-download" id="qbDownloadBtn" title="Doğrudan İndir (PNG)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>İndir</span>
          </button>
          <button class="qb-btn qb-studio" id="qbStudioBtn" title="Gelişmiş Çizim ve Düzenleme Stüdyosunda Aç">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            <span>Stüdyo ↗</span>
          </button>
          <button class="qb-btn qb-cancel" id="qbCancelBtn" title="İptal Et (ESC)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
    `;

    const targetContainer = document.fullscreenElement || document.body || document.documentElement;
    if (targetContainer) {
      targetContainer.appendChild(host);
    }

    currentHost = host;
    currentShadow = shadow;

    const overlay = shadow.getElementById('overlay');
    const canvas = shadow.getElementById('canvas');
    const badge = shadow.getElementById('badge');
    const banner = shadow.getElementById('banner');
    const loupe = shadow.getElementById('loupe');
    const loupeCanvas = shadow.getElementById('loupeCanvas');
    const colorSwatch = shadow.getElementById('colorSwatch');
    const colorHex = shadow.getElementById('colorHex');
    const colorRgb = shadow.getElementById('colorRgb');
    const quickBar = shadow.getElementById('quickBar');
    const qbOcrBtn = shadow.getElementById('qbOcrBtn');
    const qbPinBtn = shadow.getElementById('qbPinBtn');
    const qbCopyBtn = shadow.getElementById('qbCopyBtn');
    const qbDownloadBtn = shadow.getElementById('qbDownloadBtn');
    const qbStudioBtn = shadow.getElementById('qbStudioBtn');
    const qbCancelBtn = shadow.getElementById('qbCancelBtn');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const loupeCtx = loupeCanvas ? loupeCanvas.getContext('2d') : null;

    // Snapshot image for instantaneous 8x pixel magnification
    let bgSnapshotImg = null;
    let bgSnapshotCanvas = null;
    let bgSnapshotCtx = null;
    let bgSnapshotDpr = dpr;
    let currentHoverHex = '#4A4A4A';
    let currentHoverRgb = 'rgb(74, 74, 74)';

    // Pre-capture background snapshot for sub-pixel sampling
    chrome.runtime.sendMessage({
      action: 'captureVisibleTab',
      format: 'png'
    }, async (res) => {
      if (res && res.success && res.dataUrl) {
        try {
          const img = await loadImage(res.dataUrl);
          bgSnapshotImg = img;
          bgSnapshotCanvas = document.createElement('canvas');
          bgSnapshotCanvas.width = img.naturalWidth || img.width;
          bgSnapshotCanvas.height = img.naturalHeight || img.height;
          bgSnapshotCtx = bgSnapshotCanvas.getContext('2d', { willReadFrequently: true });
          bgSnapshotCtx.drawImage(img, 0, 0);
          bgSnapshotDpr = (img.naturalWidth || img.width) / (window.innerWidth || 1);
        } catch (e) {
          console.warn('[AreaSelector] Arka plan görseli oluşturulamadı:', e);
        }
      }
    });

    const updateCanvasSize = () => {
      if (!canvas || !ctx) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      if (hasSelectedArea) {
        drawMask(selectedBounds.x, selectedBounds.y, selectedBounds.w, selectedBounds.h);
        positionQuickBar(selectedBounds.x, selectedBounds.y, selectedBounds.w, selectedBounds.h);
      } else {
        drawMask(0, 0, 0, 0);
      }
    };

    let isSelecting = false;
    let hasSelectedArea = false;
    let selectedBounds = { x: 0, y: 0, w: 0, h: 0 };
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;

    function drawMask(x, y, w, h) {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (w > 0 && h > 0) {
        ctx.clearRect(x * dpr, y * dpr, w * dpr, h * dpr);
        ctx.strokeStyle = '#6D8196';
        ctx.lineWidth = 2 * dpr;
        ctx.strokeRect(x * dpr, y * dpr, w * dpr, h * dpr);
      }
    }

    function positionQuickBar(x, y, w, h) {
      if (!quickBar) return;
      const barWidth = 460;
      const barHeight = 44;
      const margin = 12;

      let barLeft = x + w - barWidth;
      if (w < barWidth) {
        barLeft = x + (w / 2) - (barWidth / 2);
      }
      const maxLeft = Math.max(margin, window.innerWidth - barWidth - margin);
      barLeft = Math.max(margin, Math.min(barLeft, maxLeft));

      let barTop = y + h + 10;
      if (barTop + barHeight > window.innerHeight - margin) {
        barTop = y - barHeight - 10;
      }
      const maxTop = Math.max(margin, window.innerHeight - barHeight - margin);
      barTop = Math.max(margin, Math.min(barTop, maxTop));

      quickBar.style.left = `${Math.round(barLeft)}px`;
      quickBar.style.top = `${Math.round(barTop)}px`;
    }

    /**
     * Renders the 8x circular magnifier loupe with crosshair, pixel grid, and color swatch.
     */
    function renderMagnifierLoupe(clientX, clientY) {
      if (!loupe || !loupeCtx) return;

      // When selection is finalized and quick bar is open, hide loupe
      if (hasSelectedArea) {
        loupe.style.display = 'none';
        return;
      }

      loupe.style.display = 'flex';

      // Smart positioning near cursor (offset 24px, clamped inside viewport)
      const loupeSize = 140;
      const panelHeight = 32;
      let left = clientX + 24;
      let top = clientY + 24;

      if (left + loupeSize > window.innerWidth - 12) {
        left = clientX - loupeSize - 24;
      }
      if (top + loupeSize + panelHeight > window.innerHeight - 12) {
        top = clientY - loupeSize - panelHeight - 24;
      }

      loupe.style.left = `${Math.max(12, Math.round(left))}px`;
      loupe.style.top = `${Math.max(12, Math.round(top))}px`;

      // Draw 8x zoomed pixels on loupe canvas
      loupeCtx.clearRect(0, 0, 140, 140);

      // Default background if snapshot pending
      loupeCtx.fillStyle = '#1e2024';
      loupeCtx.fillRect(0, 0, 140, 140);

      const zoom = 8;
      const sampleW = 140 / zoom; // 17.5px source size
      const sampleH = 140 / zoom;

      if (bgSnapshotCanvas && bgSnapshotCtx) {
        const sx = Math.round((clientX * bgSnapshotDpr) - (sampleW * bgSnapshotDpr / 2));
        const sy = Math.round((clientY * bgSnapshotDpr) - (sampleH * bgSnapshotDpr / 2));
        const sw = Math.round(sampleW * bgSnapshotDpr);
        const sh = Math.round(sampleH * bgSnapshotDpr);

        loupeCtx.imageSmoothingEnabled = false;
        try {
          loupeCtx.drawImage(bgSnapshotCanvas, sx, sy, sw, sh, 0, 0, 140, 140);

          // Sample center pixel color
          const samplePixelX = Math.round(clientX * bgSnapshotDpr);
          const samplePixelY = Math.round(clientY * bgSnapshotDpr);
          const p = bgSnapshotCtx.getImageData(samplePixelX, samplePixelY, 1, 1).data;
          const r = p[0], g = p[1], b = p[2];
          currentHoverHex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
          currentHoverRgb = `rgb(${r}, ${g}, ${b})`;

          if (colorSwatch) colorSwatch.style.backgroundColor = currentHoverHex;
          if (colorHex) colorHex.textContent = currentHoverHex;
          if (colorRgb) colorRgb.textContent = currentHoverRgb;
        } catch (err) {}
      }

      // Draw Pixel Grid Overlay (Subtle 1px lines separating 8x8 pixel blocks)
      loupeCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      loupeCtx.lineWidth = 1;
      loupeCtx.beginPath();
      for (let p = 0; p <= 140; p += zoom) {
        loupeCtx.moveTo(p, 0);
        loupeCtx.lineTo(p, 140);
        loupeCtx.moveTo(0, p);
        loupeCtx.lineTo(140, p);
      }
      loupeCtx.stroke();

      // Draw Center Crosshairs (Hairlines)
      const center = 70;
      const centerBoxSize = zoom; // 8px

      loupeCtx.strokeStyle = 'rgba(255, 255, 227, 0.85)';
      loupeCtx.lineWidth = 1;
      loupeCtx.beginPath();
      // Top hairline
      loupeCtx.moveTo(center, 0);
      loupeCtx.lineTo(center, center - centerBoxSize / 2);
      // Bottom hairline
      loupeCtx.moveTo(center, center + centerBoxSize / 2);
      loupeCtx.lineTo(center, 140);
      // Left hairline
      loupeCtx.moveTo(0, center);
      loupeCtx.lineTo(center - centerBoxSize / 2, center);
      // Right hairline
      loupeCtx.moveTo(center + centerBoxSize / 2, center);
      loupeCtx.lineTo(140, center);
      loupeCtx.stroke();

      // Center Pixel Highlight Box
      loupeCtx.strokeStyle = '#6D8196';
      loupeCtx.lineWidth = 1.5;
      loupeCtx.strokeRect(center - centerBoxSize / 2, center - centerBoxSize / 2, centerBoxSize, centerBoxSize);
    }

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        if (typeof options.onCancel === 'function') {
          options.onCancel();
        }
      } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        // [C] Copy Color to Clipboard
        navigator.clipboard.writeText(currentHoverHex);
        if (window.FullShotHUD.toast) {
          window.FullShotHUD.toast.show(`Renk Kodu Kopyalandı: ${currentHoverHex} 🎨 (${currentHoverRgb})`, {
            icon: 'copy',
            duration: 2500
          });
        }
      } else if (hasSelectedArea && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (qbCopyBtn) qbCopyBtn.click();
      } else if (hasSelectedArea && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (qbDownloadBtn) qbDownloadBtn.click();
      } else if (hasSelectedArea && e.key === 'Enter') {
        e.preventDefault();
        if (qbStudioBtn) qbStudioBtn.click();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);

    const onMouseDown = (e) => {
      // Ignore clicks originating from inside the quickBar
      if (e.composedPath && e.composedPath().includes(quickBar)) return;
      if (e.button !== 0) return;

      if (window.FullShotHUD.toast) {
        window.FullShotHUD.toast.hide();
      }

      if (hasSelectedArea) {
        hasSelectedArea = false;
        if (quickBar) quickBar.style.display = 'none';
        if (banner) banner.style.display = 'flex';
      }

      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      currentX = e.clientX;
      currentY = e.clientY;
      if (badge) badge.style.display = 'block';
    };

    const onMouseMove = (e) => {
      currentX = e.clientX;
      currentY = e.clientY;

      renderMagnifierLoupe(currentX, currentY);

      if (!isSelecting) return;

      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const w = Math.abs(currentX - startX);
      const h = Math.abs(currentY - startY);

      drawMask(x, y, w, h);

      if (badge) {
        badge.textContent = `${Math.round(w * dpr)} × ${Math.round(h * dpr)} px`;
        const badgeWidth = 110;
        const badgeHeight = 28;
        const margin = 12;
        const bLeft = Math.max(margin, Math.min(x + w + 10, window.innerWidth - badgeWidth - margin));
        const bTop = Math.max(margin, Math.min(y + h + 10, window.innerHeight - badgeHeight - margin));
        badge.style.left = `${Math.round(bLeft)}px`;
        badge.style.top = `${Math.round(bTop)}px`;
      }
    };

    const onMouseUp = (e) => {
      if (!isSelecting) return;
      isSelecting = false;

      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const w = Math.abs(currentX - startX);
      const h = Math.abs(currentY - startY);

      if (w < 8 || h < 8) {
        drawMask(0, 0, 0, 0);
        if (badge) badge.style.display = 'none';
        return;
      }

      hasSelectedArea = true;
      selectedBounds = { x, y, w, h };

      if (loupe) loupe.style.display = 'none';

      // Position In-Page Quick Bar smartly near the selection
      if (quickBar) {
        quickBar.style.display = 'inline-flex';
        if (banner) banner.style.display = 'none';
        positionQuickBar(x, y, w, h);
      }
    };

    /**
     * Executes the actual capture of the selected area
     */
    async function executeCropCapture(actionType) {
      const { x, y, w, h } = selectedBounds;
      if (w < 8 || h < 8) return;

      // Hide HUD overlays before capture
      if (quickBar) quickBar.style.display = 'none';
      if (badge) badge.style.display = 'none';
      if (banner) banner.style.display = 'none';
      if (loupe) loupe.style.display = 'none';
      drawMask(0, 0, 0, 0);

      // GPU Compositor reflow & Double rAF ghosting protection
      void document.documentElement.offsetHeight;
      if (document.body) {
        void document.body.offsetHeight;
      }
      await waitForDoubleRAF();
      await sleep(50);

      chrome.runtime.sendMessage({
        action: 'captureVisibleTab',
        format,
        quality
      }, async (res) => {
        cleanup();

        if (!res || !res.success || !res.dataUrl) {
          console.error('Kırpma yakalama hatası:', res?.error);
          return;
        }

        try {
          const img = await loadImage(res.dataUrl);
          const imgWidth = img.naturalWidth || img.width;
          const imgHeight = img.naturalHeight || img.height;
          const viewportW = document.documentElement.clientWidth || window.innerWidth;
          const viewportH = document.documentElement.clientHeight || window.innerHeight;
          const imgDprX = imgWidth / viewportW;
          const imgDprY = imgHeight / viewportH;

          const sx = Math.max(0, Math.round(x * imgDprX));
          const sy = Math.max(0, Math.round(y * imgDprY));
          const sw = Math.min(imgWidth - sx, Math.round(w * imgDprX));
          const sh = Math.min(imgHeight - sy, Math.round(h * imgDprY));

          if (sw <= 0 || sh <= 0) return;

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = sw;
          cropCanvas.height = sh;
          const cropCtx = cropCanvas.getContext('2d', { alpha: true });

          cropCtx.imageSmoothingEnabled = true;
          cropCtx.imageSmoothingQuality = 'high';

          if (format === 'jpeg') {
            cropCtx.fillStyle = '#ffffff';
            cropCtx.fillRect(0, 0, sw, sh);
          }

          cropCtx.drawImage(
            img,
            sx, sy, sw, sh,
            0, 0, sw, sh
          );

          const croppedDataUrl = format === 'jpeg' 
            ? cropCanvas.toDataURL('image/jpeg', (quality || 98) / 100)
            : cropCanvas.toDataURL('image/png');

          const item = {
            dataUrl: croppedDataUrl,
            title: `Seçili Alan - ${document.title || 'Ekran'}`,
            url: window.location.href,
            width: sw,
            height: sh,
            format,
            timestamp: Date.now(),
            type: 'crop'
          };

          if (actionType === 'ocr') {
            // 1. First attempt instant high-fidelity DOM text extraction
            let text = extractDomTextInBox(x, y, w, h);

            if (text) {
              await navigator.clipboard.writeText(text);
              if (window.FullShotHUD.toast) {
                const preview = text.length > 50 ? text.substring(0, 48) + '...' : text;
                window.FullShotHUD.toast.show(`Metin Panoya Kopyalandı (OCR): "${preview}" 📋`, {
                  icon: 'copy',
                  duration: 3000
                });
              }
            } else {
              // 2. Fallback to Offscreen Raster OCR Engine
              chrome.runtime.sendMessage({
                target: 'offscreen',
                action: 'PERFORM_OCR',
                dataUrl: croppedDataUrl
              }, async (ocrRes) => {
                const ocrText = ocrRes?.text || '';
                if (ocrText) {
                  await navigator.clipboard.writeText(ocrText);
                  if (window.FullShotHUD.toast) {
                    const preview = ocrText.length > 50 ? ocrText.substring(0, 48) + '...' : ocrText;
                    window.FullShotHUD.toast.show(`Metin Panoya Kopyalandı (OCR): "${preview}" 📋`, {
                      icon: 'copy',
                      duration: 3000
                    });
                  }
                } else {
                  if (window.FullShotHUD.toast) {
                    window.FullShotHUD.toast.show('Seçili alanda algılanabilir metin bulunamadı.', {
                      icon: 'warning',
                      duration: 2500
                    });
                  }
                }
              });
            }
          } else if (actionType === 'pin') {
            if (window.FullShotHUD.pinWindow) {
              window.FullShotHUD.pinWindow.pin(item);
            }
          } else if (actionType === 'copy') {
            const copied = await copyDataUrlToClipboard(croppedDataUrl);
            if (window.FullShotHUD.toast) {
              window.FullShotHUD.toast.show(copied ? 'Görsel Panoya Kopyalandı! 📋' : 'Panoya kopyalama tamamlandı.', {
                icon: 'copy',
                duration: 2500
              });
            }
          } else if (actionType === 'download') {
            const filename = `FullShot_Crop_${Date.now()}.${format}`;
            chrome.runtime.sendMessage({
              action: 'DIRECT_DOWNLOAD',
              dataUrl: croppedDataUrl,
              filename,
              saveAs: false
            });
            if (window.FullShotHUD.toast) {
              window.FullShotHUD.toast.show('Görsel Başarıyla İndirildi! 💾', {
                icon: 'download',
                duration: 2500
              });
            }
          } else if (actionType === 'studio') {
            if (typeof options.onSelected === 'function') {
              options.onSelected(item);
            } else {
              await chrome.storage.local.set({ fullshot_current_capture: item });
              chrome.runtime.sendMessage({ action: 'OPEN_IN_STUDIO', captureData: item });
            }
          }
        } catch (err) {
          console.error('Kırpma işleme hatası:', err);
        }
      });
    }

    if (qbOcrBtn) {
      qbOcrBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        executeCropCapture('ocr');
      });
    }

    if (qbPinBtn) {
      qbPinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        executeCropCapture('pin');
      });
    }

    if (qbCopyBtn) {
      qbCopyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        executeCropCapture('copy');
      });
    }

    if (qbDownloadBtn) {
      qbDownloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        executeCropCapture('download');
      });
    }

    if (qbStudioBtn) {
      qbStudioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        executeCropCapture('studio');
      });
    }

    if (qbCancelBtn) {
      qbCancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cleanup();
        if (typeof options.onCancel === 'function') {
          options.onCancel();
        }
      });
    }

    if (overlay) {
      overlay.addEventListener('mousedown', onMouseDown);
      overlay.addEventListener('mousemove', onMouseMove);
      overlay.addEventListener('mouseup', onMouseUp);
    }

    activeCleanup = () => {
      if (window.FullShotHUD.toast) {
        window.FullShotHUD.toast.hide();
      }
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('keydown', onKeyDown, true);
      if (document.documentElement) {
        document.documentElement.style.overflow = originalHtmlOverflow;
        if (originalHtmlPaddingRight) {
          document.documentElement.style.paddingRight = originalHtmlPaddingRight;
        } else {
          document.documentElement.style.removeProperty('padding-right');
        }
      }
      if (document.body) {
        document.body.style.overflow = originalBodyOverflow;
        if (originalBodyPaddingRight) {
          document.body.style.paddingRight = originalBodyPaddingRight;
        } else {
          document.body.style.removeProperty('padding-right');
        }
      }
      if (host) {
        host.remove();
      }
      if (currentHost === host) {
        currentHost = null;
        currentShadow = null;
        activeCleanup = null;
      }
    };
  }

  /**
   * Cleans up and removes active Area Selector overlay.
   */
  function cleanup() {
    if (typeof activeCleanup === 'function') {
      activeCleanup();
      activeCleanup = null;
    }
    const existingHost = document.getElementById('__fullshot_selection_host__');
    if (existingHost) {
      existingHost.remove();
    }
    currentHost = null;
    currentShadow = null;
  }

  /**
   * Checks if area selection overlay is currently active.
   */
  function isActive() {
    return !!currentHost && document.contains(currentHost);
  }

  /**
   * Returns host element.
   */
  function getHost() {
    return currentHost;
  }

  /**
   * Hides the selector overlay with complete ghosting protection before screenshot capture.
   */
  async function hideForCapture() {
    if (currentHost) {
      currentHost.style.setProperty('display', 'none', 'important');
      void document.documentElement.offsetHeight;
      if (document.body) {
        void document.body.offsetHeight;
      }
      await waitForDoubleRAF();
      await sleep(50);
    }
  }

  /**
   * Restores visibility after screenshot capture.
   */
  function restoreAfterCapture() {
    if (currentHost) {
      currentHost.style.removeProperty('display');
    }
  }

  // Export module to FullShotHUD namespace
  window.FullShotHUD.areaSelector = {
    start,
    cancel: cleanup,
    cleanup,
    isActive,
    getHost,
    hideForCapture,
    restoreAfterCapture
  };
})();
