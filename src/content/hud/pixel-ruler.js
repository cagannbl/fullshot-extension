/**
 * FullShot Pro - In-Page Pixel Ruler & Element Measurement Tool
 * Isolated Shadow DOM v1 Component for pixel-perfect element distance inspection,
 * Figma-style guideline badges, freeform pixel ruler, and CSS dimension inspector.
 * 4-Color Slate/Charcoal Palette (#4A4A4A, #CBCBCB, #FFFFE3, #6D8196)
 */

(function () {
  'use strict';

  window.FullShotHUD = window.FullShotHUD || {};

  let currentHost = null;
  let currentShadow = null;
  let activeCleanup = null;
  let isRulerActive = false;

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
   * Helper: Format CSS color to clean hex/rgb string
   */
  function formatCssValue(val) {
    if (!val || val === 'none' || val === 'rgba(0, 0, 0, 0)') return '-';
    return val;
  }

  /**
   * Calculates spacing / gap geometry between two bounding client rects.
   * @param {DOMRect} ref - Reference element rectangle
   * @param {DOMRect} target - Target element rectangle
   * @returns {Object} Distances and guide lines
   */
  function calculateElementDistances(ref, target) {
    const dpr = window.devicePixelRatio || 1;
    const lines = [];

    // Horizontal relative position
    const targetIsRight = target.left >= ref.right;
    const targetIsLeft = target.right <= ref.left;
    const horizontalOverlap = !(targetIsRight || targetIsLeft);

    // Vertical relative position
    const targetIsBelow = target.top >= ref.bottom;
    const targetIsAbove = target.bottom <= ref.top;
    const verticalOverlap = !(targetIsBelow || targetIsAbove);

    // 1. Direct Gaps (Outside)
    if (targetIsRight) {
      const gap = Math.round(target.left - ref.right);
      const midY = Math.min(Math.max(ref.top, target.top) + Math.min(ref.bottom, target.bottom), window.innerHeight) / 2;
      const y = horizontalOverlap || verticalOverlap ? midY : (ref.top + ref.height / 2);
      lines.push({
        type: 'horizontal',
        x1: ref.right,
        x2: target.left,
        y: y,
        dist: gap,
        label: `${gap} px`,
        kind: 'gap'
      });
    } else if (targetIsLeft) {
      const gap = Math.round(ref.left - target.right);
      const midY = Math.min(Math.max(ref.top, target.top) + Math.min(ref.bottom, target.bottom), window.innerHeight) / 2;
      const y = horizontalOverlap || verticalOverlap ? midY : (ref.top + ref.height / 2);
      lines.push({
        type: 'horizontal',
        x1: target.right,
        x2: ref.left,
        y: y,
        dist: gap,
        label: `${gap} px`,
        kind: 'gap'
      });
    }

    if (targetIsBelow) {
      const gap = Math.round(target.top - ref.bottom);
      const midX = Math.min(Math.max(ref.left, target.left) + Math.min(ref.right, target.right), window.innerWidth) / 2;
      const x = horizontalOverlap || verticalOverlap ? midX : (ref.left + ref.width / 2);
      lines.push({
        type: 'vertical',
        x: x,
        y1: ref.bottom,
        y2: target.top,
        dist: gap,
        label: `${gap} px`,
        kind: 'gap'
      });
    } else if (targetIsAbove) {
      const gap = Math.round(ref.top - target.bottom);
      const midX = Math.min(Math.max(ref.left, target.left) + Math.min(ref.right, target.right), window.innerWidth) / 2;
      const x = horizontalOverlap || verticalOverlap ? midX : (ref.left + ref.width / 2);
      lines.push({
        type: 'vertical',
        x: x,
        y1: target.bottom,
        y2: ref.top,
        dist: gap,
        label: `${gap} px`,
        kind: 'gap'
      });
    }

    // 2. Overlapping Distances (Figma-style edge-to-edge measurements)
    if (horizontalOverlap || verticalOverlap) {
      // Top edge distance
      const topDiff = Math.round(target.top - ref.top);
      if (Math.abs(topDiff) > 1) {
        lines.push({
          type: 'vertical',
          x: target.left + target.width / 2,
          y1: Math.min(ref.top, target.top),
          y2: Math.max(ref.top, target.top),
          dist: Math.abs(topDiff),
          label: `${Math.abs(topDiff)} px`,
          kind: 'offset'
        });
      }

      // Bottom edge distance
      const bottomDiff = Math.round(ref.bottom - target.bottom);
      if (Math.abs(bottomDiff) > 1) {
        lines.push({
          type: 'vertical',
          x: target.left + target.width / 2,
          y1: Math.min(ref.bottom, target.bottom),
          y2: Math.max(ref.bottom, target.bottom),
          dist: Math.abs(bottomDiff),
          label: `${Math.abs(bottomDiff)} px`,
          kind: 'offset'
        });
      }

      // Left edge distance
      const leftDiff = Math.round(target.left - ref.left);
      if (Math.abs(leftDiff) > 1) {
        lines.push({
          type: 'horizontal',
          x1: Math.min(ref.left, target.left),
          x2: Math.max(ref.left, target.left),
          y: target.top + target.height / 2,
          dist: Math.abs(leftDiff),
          label: `${Math.abs(leftDiff)} px`,
          kind: 'offset'
        });
      }

      // Right edge distance
      const rightDiff = Math.round(ref.right - target.right);
      if (Math.abs(rightDiff) > 1) {
        lines.push({
          type: 'horizontal',
          x1: Math.min(ref.right, target.right),
          x2: Math.max(ref.right, target.right),
          y: target.top + target.height / 2,
          dist: Math.abs(rightDiff),
          label: `${Math.abs(rightDiff)} px`,
          kind: 'offset'
        });
      }
    }

    return lines;
  }

  /**
   * Starts the Pixel Ruler & Element Measurement HUD.
   */
  function start(options = {}) {
    stop();

    if (window.FullShotHUD.toast) {
      window.FullShotHUD.toast.show('Piksel Cetveli & Mesafe Ölçer (Alt+Shift+R) - Öğe seçin veya boşlukta sürükleyin, çıkmak için ESC', {
        icon: 'element',
        duration: 3500
      });
    }

    isRulerActive = true;
    const dpr = window.devicePixelRatio || 1;

    const host = document.createElement('div');
    host.id = '__fullshot_ruler_host__';
    host.style.cssText = 'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483646 !important; cursor: crosshair !important; user-select: none !important; -webkit-user-select: none !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host {
          all: initial !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 13px !important;
          line-height: normal !important;
          color: #FFFFE3 !important;
          direction: ltr !important;
          -webkit-font-smoothing: antialiased !important;
          box-sizing: border-box !important;
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
        .ruler-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          cursor: crosshair;
          box-sizing: border-box;
          pointer-events: auto;
        }
        .ruler-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .banner {
          position: fixed;
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
          z-index: 20;
          white-space: nowrap;
          animation: bannerIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
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
        /* Floating CSS / Dimension Inspector Card */
        .inspector-card {
          position: fixed;
          display: none;
          flex-direction: column;
          background: #373a40;
          border: 1px solid #545862;
          border-radius: 10px;
          padding: 8px 12px;
          color: #FFFFE3;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(109, 129, 150, 0.25);
          pointer-events: none;
          z-index: 30;
          max-width: 280px;
          gap: 4px;
        }
        .insp-title {
          font-weight: 700;
          color: #6D8196;
          font-size: 12px;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .insp-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: #CBCBCB;
        }
        .insp-val {
          color: #FFFFE3;
          font-weight: 600;
        }
        .insp-hint {
          font-size: 10px;
          color: #CBCBCB;
          margin-top: 4px;
          border-top: 1px solid #545862;
          padding-top: 4px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
      </style>
      <div class="ruler-overlay" id="overlay">
        <canvas class="ruler-canvas" id="canvas"></canvas>
        <div class="banner" id="banner">
          <span>🎯 Öğe kilitlemek için <b>Tıklayın</b> | Ölçüm için <b>Sürükleyin</b> | Kopyala <kbd>C</kbd> | Çıkış <kbd>ESC</kbd></span>
        </div>
        <div class="inspector-card" id="inspectorCard">
          <div class="insp-title">
            <span id="inspTag">div</span>
            <span id="inspSize">0 × 0 px</span>
          </div>
          <div class="insp-row"><span>padding:</span><span class="insp-val" id="inspPad">-</span></div>
          <div class="insp-row"><span>margin:</span><span class="insp-val" id="inspMargin">-</span></div>
          <div class="insp-row"><span>color:</span><span class="insp-val" id="inspColor">-</span></div>
          <div class="insp-row"><span>bg:</span><span class="insp-val" id="inspBg">-</span></div>
          <div class="insp-hint">CSS kopyalamak için <kbd>C</kbd> tuşuna basın</div>
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
    const inspectorCard = shadow.getElementById('inspectorCard');
    const inspTag = shadow.getElementById('inspTag');
    const inspSize = shadow.getElementById('inspSize');
    const inspPad = shadow.getElementById('inspPad');
    const inspMargin = shadow.getElementById('inspMargin');
    const inspColor = shadow.getElementById('inspColor');
    const inspBg = shadow.getElementById('inspBg');
    const ctx = canvas ? canvas.getContext('2d') : null;

    let referenceElement = null;
    let referenceRect = null;
    let hoveredElement = null;
    let hoveredRect = null;

    // Freeform drag measurement state
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let dragCurrentX = 0, dragCurrentY = 0;

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      render();
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    /**
     * Renders all Figma-style guidelines, element boxes, distance lines, and badges on canvas.
     */
    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Freeform Drag Measurement Mode
      if (isDragging) {
        const x1 = Math.round(dragStartX * dpr);
        const y1 = Math.round(dragStartY * dpr);
        const x2 = Math.round(dragCurrentX * dpr);
        const y2 = Math.round(dragCurrentY * dpr);

        const dx = Math.round(Math.abs(dragCurrentX - dragStartX));
        const dy = Math.round(Math.abs(dragCurrentY - dragStartY));
        const dist = Math.round(Math.hypot(dx, dy));

        // Bounding rect box
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1);
        const rh = Math.abs(y2 - y1);

        ctx.fillStyle = 'rgba(109, 129, 150, 0.15)';
        ctx.fillRect(rx, ry, rw, rh);

        ctx.strokeStyle = '#6D8196';
        ctx.lineWidth = 1.5 * dpr;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.strokeRect(rx, ry, rw, rh);

        // Diagonal vector
        ctx.setLineDash([]);
        ctx.strokeStyle = '#FFFFE3';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Measurement Badges
        drawBadge((rx + rw / 2) / dpr, ry / dpr - 14, `W: ${dx} px`, '#6D8196');
        drawBadge((rx + rw) / dpr + 24, (ry + rh / 2) / dpr, `H: ${dy} px`, '#6D8196');
        drawBadge((x1 + x2) / 2 / dpr, (y1 + y2) / 2 / dpr, `D: ${dist} px`, '#EF4444');
        return;
      }

      // 2. Reference Element Box (Locked Red Box)
      if (referenceElement && referenceRect) {
        drawElementBox(referenceRect, '#EF4444', 'rgba(239, 68, 68, 0.12)', 'REF');
      }

      // 3. Hovered Element Box (Slate Blue Box)
      if (hoveredElement && hoveredRect) {
        const isSame = referenceElement === hoveredElement;
        if (!isSame) {
          drawElementBox(hoveredRect, '#6D8196', 'rgba(109, 129, 150, 0.16)', `${Math.round(hoveredRect.width)} × ${Math.round(hoveredRect.height)}`);
        }
      }

      // 4. Element-to-Element Distance Calculation & Guide Lines
      if (referenceRect && hoveredRect && referenceElement !== hoveredElement) {
        const lines = calculateElementDistances(referenceRect, hoveredRect);

        lines.forEach((line) => {
          if (line.type === 'horizontal') {
            const lx1 = Math.round(line.x1 * dpr);
            const lx2 = Math.round(line.x2 * dpr);
            const ly = Math.round(line.y * dpr);

            // Guide line
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 1.5 * dpr;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(lx1, ly);
            ctx.lineTo(lx2, ly);
            ctx.stroke();

            // End caps (ticks)
            ctx.beginPath();
            ctx.moveTo(lx1, ly - 4 * dpr);
            ctx.lineTo(lx1, ly + 4 * dpr);
            ctx.moveTo(lx2, ly - 4 * dpr);
            ctx.lineTo(lx2, ly + 4 * dpr);
            ctx.stroke();

            // Badge
            drawBadge((line.x1 + line.x2) / 2, line.y, line.label, '#EF4444');
          } else if (line.type === 'vertical') {
            const lx = Math.round(line.x * dpr);
            const ly1 = Math.round(line.y1 * dpr);
            const ly2 = Math.round(line.y2 * dpr);

            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 1.5 * dpr;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(lx, ly1);
            ctx.lineTo(lx, ly2);
            ctx.stroke();

            // End caps (ticks)
            ctx.beginPath();
            ctx.moveTo(lx - 4 * dpr, ly1);
            ctx.lineTo(lx + 4 * dpr, ly1);
            ctx.moveTo(lx - 4 * dpr, ly2);
            ctx.lineTo(lx + 4 * dpr, ly2);
            ctx.stroke();

            // Badge
            drawBadge(line.x, (line.y1 + line.y2) / 2, line.label, '#EF4444');
          }
        });
      }
    }

    /**
     * Draws an outlined element box on the canvas with label.
     */
    function drawElementBox(rect, strokeColor, fillColor, label) {
      if (!ctx || !rect) return;
      const x = Math.round(rect.left * dpr);
      const y = Math.round(rect.top * dpr);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);

      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2 * dpr;
      ctx.setLineDash([]);
      ctx.strokeRect(x, y, w, h);

      if (label) {
        drawBadge(rect.left + rect.width / 2, rect.top - 12, label, strokeColor);
      }
    }

    /**
     * Draws a crisp rounded badge with text on canvas.
     */
    function drawBadge(x, y, text, bgColor) {
      if (!ctx) return;
      const cx = Math.round(x * dpr);
      const cy = Math.round(y * dpr);

      ctx.font = `600 ${11 * dpr}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      const textMetrics = ctx.measureText(text);
      const padX = 6 * dpr;
      const padY = 3 * dpr;
      const bw = textMetrics.width + padX * 2;
      const bh = 18 * dpr;
      const bx = cx - bw / 2;
      const by = cy - bh / 2;

      // Rounded rect
      ctx.fillStyle = bgColor || '#4A4A4A';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 4 * dpr);
      ctx.fill();

      ctx.strokeStyle = '#545862';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      ctx.fillStyle = '#FFFFE3';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(text, cx, cy);
    }

    /**
     * Updates floating CSS & Dimension inspector card.
     */
    function updateInspector(el, rect, clientX, clientY) {
      if (!inspectorCard || !el) {
        if (inspectorCard) inspectorCard.style.display = 'none';
        return;
      }

      inspectorCard.style.display = 'flex';
      const tagName = el.tagName ? el.tagName.toLowerCase() : 'div';
      let className = '';
      try {
        if (el.className && typeof el.className === 'string') {
          const first = el.className.trim().split(/\s+/)[0];
          if (first) className = `.${first}`;
        }
      } catch (e) {}

      inspTag.textContent = `<${tagName}${className}>`;
      inspSize.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)} px`;

      try {
        const cs = window.getComputedStyle(el);
        inspPad.textContent = `${formatCssValue(cs.paddingTop)} ${formatCssValue(cs.paddingRight)} ${formatCssValue(cs.paddingBottom)} ${formatCssValue(cs.paddingLeft)}`;
        inspMargin.textContent = `${formatCssValue(cs.marginTop)} ${formatCssValue(cs.marginRight)} ${formatCssValue(cs.marginBottom)} ${formatCssValue(cs.marginLeft)}`;
        inspColor.textContent = formatCssValue(cs.color);
        inspBg.textContent = formatCssValue(cs.backgroundColor);
      } catch (err) {}

      // Smart positioning near cursor
      const cardW = 220;
      const cardH = 140;
      let left = clientX + 16;
      let top = clientY + 16;

      if (left + cardW > window.innerWidth - 12) {
        left = clientX - cardW - 16;
      }
      if (top + cardH > window.innerHeight - 12) {
        top = clientY - cardH - 16;
      }

      inspectorCard.style.left = `${Math.max(12, left)}px`;
      inspectorCard.style.top = `${Math.max(12, top)}px`;
    }

    // --- MOUSE & KEYBOARD EVENT LISTENERS ---

    const onMouseMove = (e) => {
      e.stopPropagation();
      if (isDragging) {
        dragCurrentX = e.clientX;
        dragCurrentY = e.clientY;
        render();
        return;
      }

      // Temporarily hide host to pick underlying DOM element
      host.style.pointerEvents = 'none';
      const el = document.elementFromPoint(e.clientX, e.clientY);
      host.style.pointerEvents = 'auto';

      if (!el || el === host || el.closest('[id^="__fullshot_"]')) return;

      hoveredElement = el;
      hoveredRect = el.getBoundingClientRect();

      updateInspector(el, hoveredRect, e.clientX, e.clientY);
      render();
    };

    const onMouseDown = (e) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      e.preventDefault();

      if (e.shiftKey || !hoveredElement) {
        // Start freeform drag ruler
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragCurrentX = e.clientX;
        dragCurrentY = e.clientY;
        if (inspectorCard) inspectorCard.style.display = 'none';
        return;
      }

      // Click locks / unlocks Reference Element
      if (hoveredElement) {
        if (referenceElement === hoveredElement) {
          // Deselect
          referenceElement = null;
          referenceRect = null;
        } else {
          referenceElement = hoveredElement;
          referenceRect = hoveredElement.getBoundingClientRect();
        }
        render();
      }
    };

    const onMouseUp = (e) => {
      e.stopPropagation();
      if (isDragging) {
        isDragging = false;
        render();
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        stop();
        if (typeof options.onCancel === 'function') {
          options.onCancel();
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        // Space clears reference
        referenceElement = null;
        referenceRect = null;
        render();
      } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        // Copy computed CSS details to clipboard
        if (hoveredElement && hoveredRect) {
          try {
            const cs = window.getComputedStyle(hoveredElement);
            const cssText = `/* FullShot Pro Element Inspector */\nwidth: ${Math.round(hoveredRect.width)}px;\nheight: ${Math.round(hoveredRect.height)}px;\npadding: ${cs.padding};\nmargin: ${cs.margin};\ncolor: ${cs.color};\nbackground-color: ${cs.backgroundColor};\nfont-family: ${cs.fontFamily};\nfont-size: ${cs.fontSize};\nline-height: ${cs.lineHeight};\nborder-radius: ${cs.borderRadius};`;
            navigator.clipboard.writeText(cssText);
            if (window.FullShotHUD.toast) {
              window.FullShotHUD.toast.show('CSS Özellikleri Panoya Kopyalandı! 📋', { icon: 'copy', duration: 2500 });
            }
          } catch (err) {}
        }
      }
    };

    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('mousedown', onMouseDown);
    overlay.addEventListener('mouseup', onMouseUp);
    overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    overlay.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: true });
    window.addEventListener('keydown', onKeyDown, true);

    activeCleanup = () => {
      isRulerActive = false;
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', onKeyDown, true);
      if (host) {
        host.remove();
      }
      currentHost = null;
      currentShadow = null;
      activeCleanup = null;
    };
  }

  /**
   * Stops and closes Pixel Ruler HUD.
   */
  function stop() {
    if (typeof activeCleanup === 'function') {
      activeCleanup();
      activeCleanup = null;
    }
    const existing = document.getElementById('__fullshot_ruler_host__');
    if (existing) {
      existing.remove();
    }
    currentHost = null;
    currentShadow = null;
    isRulerActive = false;
  }

  /**
   * Toggles Pixel Ruler mode on/off.
   */
  function toggle(options = {}) {
    if (isRulerActive) {
      stop();
    } else {
      start(options);
    }
  }

  /**
   * Checks if Pixel Ruler is currently active.
   */
  function isActive() {
    return isRulerActive && !!currentHost && document.contains(currentHost);
  }

  /**
   * Hides ruler overlay with complete ghosting protection before taking a screenshot.
   */
  async function hideForCapture() {
    if (currentHost) {
      currentHost.style.setProperty('display', 'none', 'important');
      void document.documentElement.offsetHeight;
      if (document.body) {
        void document.body.offsetHeight;
      }
      await waitForDoubleRAF();
      await new Promise((r) => setTimeout(r, 50));
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
  window.FullShotHUD.pixelRuler = {
    start,
    stop,
    destroy: stop,
    toggle,
    isActive,
    hideForCapture,
    restoreAfterCapture
  };
})();
