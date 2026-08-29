/**
 * FullShot Pro - Advanced 3D Mockup Beautifier & Device Frame Engine
 * (CleanShot X & Shots.so Level Visual Excellence)
 * 
 * Features:
 * 1. 3D Perspective & Isometric Tilt Engine (X/Y axis rotation with contact + ambient soft shadows)
 * 2. Multi-Device Frame Mockups (macOS Window, iPhone 16 Pro Titanium, Safari Browser, Minimalist Glass, None)
 * 3. Ultra-HD Mesh Gradients (Aurora Borealis, Sunset Mirage, Midnight Cyber, Emerald Glow, Frosted Obsidian, Pastel Dream)
 * 4. Procedural Film Grain Texture Filter (prevents color banding, adds analog depth)
 * 5. Social Media Aspect Ratio Presets (16:9, 1:1, 4:5, 4:3, 1.91:1, Auto)
 */

const MOCKUP_THEMES = {
  aurora: {
    id: 'aurora',
    name: 'Aurora Borealis',
    stops: ['#0b1021', '#064e3b', '#06b6d4', '#4f46e5'],
    spots: [
      { x: 0.15, y: 0.2, r: 0.65, color: 'rgba(6, 182, 212, 0.45)' },
      { x: 0.85, y: 0.75, r: 0.7, color: 'rgba(16, 185, 129, 0.35)' },
      { x: 0.5, y: 0.9, r: 0.55, color: 'rgba(79, 70, 229, 0.4)' }
    ],
    dark: true
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Mirage',
    stops: ['#2e0854', '#831843', '#ea580c', '#facc15'],
    spots: [
      { x: 0.2, y: 0.8, r: 0.65, color: 'rgba(234, 88, 12, 0.5)' },
      { x: 0.8, y: 0.25, r: 0.7, color: 'rgba(219, 39, 119, 0.45)' },
      { x: 0.5, y: 0.5, r: 0.6, color: 'rgba(131, 24, 67, 0.4)' }
    ],
    dark: true
  },
  cyber: {
    id: 'cyber',
    name: 'Midnight Cyber',
    stops: ['#030712', '#1e1b4b', '#0891b2', '#db2777'],
    spots: [
      { x: 0.1, y: 0.15, r: 0.6, color: 'rgba(8, 145, 178, 0.45)' },
      { x: 0.9, y: 0.85, r: 0.7, color: 'rgba(219, 39, 119, 0.4)' },
      { x: 0.5, y: 0.2, r: 0.5, color: 'rgba(30, 27, 75, 0.6)' }
    ],
    dark: true
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Glow',
    stops: ['#022c22', '#065f46', '#10b981', '#6ee7b7'],
    spots: [
      { x: 0.2, y: 0.3, r: 0.65, color: 'rgba(16, 185, 129, 0.45)' },
      { x: 0.8, y: 0.8, r: 0.7, color: 'rgba(110, 231, 183, 0.35)' },
      { x: 0.5, y: 0.1, r: 0.5, color: 'rgba(6, 95, 70, 0.5)' }
    ],
    dark: true
  },
  obsidian: {
    id: 'obsidian',
    name: 'Frosted Obsidian',
    stops: ['#0f1117', '#1a1d24', '#2d3139', '#14161d'],
    spots: [
      { x: 0.15, y: 0.15, r: 0.55, color: 'rgba(109, 129, 150, 0.25)' },
      { x: 0.85, y: 0.85, r: 0.6, color: 'rgba(45, 49, 57, 0.4)' }
    ],
    dark: true
  },
  pastel: {
    id: 'pastel',
    name: 'Pastel Dream',
    stops: ['#c7d2fe', '#fbcfe8', '#fed7aa', '#ddd6fe'],
    spots: [
      { x: 0.2, y: 0.2, r: 0.6, color: 'rgba(251, 207, 232, 0.6)' },
      { x: 0.8, y: 0.75, r: 0.65, color: 'rgba(199, 210, 254, 0.6)' },
      { x: 0.5, y: 0.85, r: 0.55, color: 'rgba(254, 215, 170, 0.5)' }
    ],
    dark: false
  },
  slate: {
    id: 'slate',
    name: 'Slate Minimalist',
    stops: ['#24262b', '#383b42', '#4A4A4A', '#2c2e33'],
    spots: [
      { x: 0.3, y: 0.2, r: 0.6, color: 'rgba(109, 129, 150, 0.3)' },
      { x: 0.7, y: 0.8, r: 0.6, color: 'rgba(74, 74, 74, 0.4)' }
    ],
    dark: true
  }
};

const ASPECT_RATIO_PRESETS = {
  auto: { name: 'Serbest (Auto)', ratio: null },
  '16:9': { name: 'Twitter/YT (16:9)', ratio: 16 / 9 },
  '1:1': { name: 'Instagram Post (1:1)', ratio: 1 },
  '4:5': { name: 'Instagram Portrait (4:5)', ratio: 4 / 5 },
  '4:3': { name: 'Dribbble (4:3)', ratio: 4 / 3 },
  '1.91:1': { name: 'LinkedIn (1.91:1)', ratio: 1.91 / 1 }
};

/**
 * Procedural Film Grain Noise Generator (Cached Pattern)
 * Creates a micro-granule analog grain texture to prevent color banding.
 */
function generateGrainTexture(opacity = 0.055) {
  const size = 256;
  const noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = size;
  noiseCanvas.height = size;
  const nCtx = noiseCanvas.getContext('2d');
  
  const imgData = nCtx.createImageData(size, size);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const val = Math.floor(Math.random() * 255);
    data[i] = val;     // R
    data[i + 1] = val; // G
    data[i + 2] = val; // B
    data[i + 3] = Math.floor(Math.random() * (opacity * 255)); // Alpha
  }

  nCtx.putImageData(imgData, 0, 0);
  return noiseCanvas;
}

/**
 * Draws a rounded rectangle path cross-browser.
 */
function drawRoundedRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    const r = typeof radius === 'number' ? { tl: radius, tr: radius, br: radius, bl: radius } : radius;
    const tl = (r && r.tl) || 0;
    const tr = (r && r.tr) || 0;
    const br = (r && r.br) || 0;
    const bl = (r && r.bl) || 0;

    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + width - tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
    ctx.lineTo(x + width, y + height - br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
    ctx.lineTo(x + bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
    ctx.lineTo(x + tl, y);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }
}

/**
 * Draws an Ultra-HD Mesh Gradient with glowing radial ambient spots.
 */
function drawMeshBackdrop(ctx, width, height, theme, enableGrain = true) {
  // 1. Base Linear Multi-Stop Gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  const stops = theme.stops || ['#111215', '#1e2025', '#0d0e11'];
  stops.forEach((stop, idx) => {
    grad.addColorStop(idx / (stops.length - 1), stop);
  });
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient Radial Mesh Spots
  if (theme.spots && theme.spots.length > 0) {
    ctx.save();
    theme.spots.forEach(spot => {
      const spotX = spot.x * width;
      const spotY = spot.y * height;
      const spotRadius = spot.r * Math.max(width, height);

      const rGrad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotRadius);
      rGrad.addColorStop(0, spot.color);
      rGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = rGrad;
      ctx.fillRect(0, 0, width, height);
    });
    ctx.restore();
  }

  // 3. Film Grain Overlay
  if (enableGrain) {
    ctx.save();
    const grainTile = generateGrainTexture(theme.dark ? 0.065 : 0.04);
    const pattern = ctx.createPattern(grainTile, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }
}

/**
 * Renders the device frame or window around the screenshot.
 * Returns an offscreen canvas with the complete framed graphic (un-tilted).
 */
function renderDeviceFrame(sourceCanvas, config = {}) {
  const frameType = config.frameType || 'macos';
  const hasHeader = config.hasHeader !== false;
  const displayTitle = (config.title || 'Ekran Görüntüsü').slice(0, 56);

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  const frameCanvas = document.createElement('canvas');
  let fCtx = frameCanvas.getContext('2d');
  fCtx.imageSmoothingEnabled = true;
  fCtx.imageSmoothingQuality = 'high';

  if (frameType === 'macos') {
    // ----------------------------------------------------
    // macOS Window Frame
    // ----------------------------------------------------
    const headerHeight = hasHeader ? 44 : 0;
    const windowRadius = 14;
    const winW = srcW;
    const winH = srcH + headerHeight;

    frameCanvas.width = winW;
    frameCanvas.height = winH;
    fCtx = frameCanvas.getContext('2d');
    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';

    // Window Base Clip & Background
    fCtx.save();
    drawRoundedRectPath(fCtx, 0, 0, winW, winH, windowRadius);
    fCtx.clip();

    fCtx.fillStyle = '#1c1e22';
    fCtx.fillRect(0, 0, winW, winH);

    // Titlebar
    if (hasHeader) {
      // Header Background
      const headerGrad = fCtx.createLinearGradient(0, 0, 0, headerHeight);
      headerGrad.addColorStop(0, '#2e3037');
      headerGrad.addColorStop(1, '#23252a');
      fCtx.fillStyle = headerGrad;
      fCtx.fillRect(0, 0, winW, headerHeight);

      // Header bottom border
      fCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      fCtx.lineWidth = 1;
      fCtx.beginPath();
      fCtx.moveTo(0, headerHeight);
      fCtx.lineTo(winW, headerHeight);
      fCtx.stroke();

      // Traffic Lights (🔴🟡🟢)
      const dotY = headerHeight / 2;
      const dotRadius = 5.5;

      // Close (Red)
      fCtx.beginPath();
      fCtx.arc(18, dotY, dotRadius, 0, Math.PI * 2);
      fCtx.fillStyle = '#ff5f56';
      fCtx.fill();
      fCtx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      fCtx.lineWidth = 0.8;
      fCtx.stroke();

      // Minimize (Yellow)
      fCtx.beginPath();
      fCtx.arc(36, dotY, dotRadius, 0, Math.PI * 2);
      fCtx.fillStyle = '#ffbd2e';
      fCtx.fill();
      fCtx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      fCtx.lineWidth = 0.8;
      fCtx.stroke();

      // Maximize (Green)
      fCtx.beginPath();
      fCtx.arc(54, dotY, dotRadius, 0, Math.PI * 2);
      fCtx.fillStyle = '#27c93f';
      fCtx.fill();
      fCtx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      fCtx.lineWidth = 0.8;
      fCtx.stroke();

      // Centered Address / Title Pill
      const pillWidth = Math.min(420, Math.max(140, winW - 170));
      const pillHeight = 24;
      const pillX = (winW - pillWidth) / 2;
      const pillY = (headerHeight - pillHeight) / 2;

      fCtx.fillStyle = 'rgba(18, 19, 23, 0.85)';
      fCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      fCtx.lineWidth = 1;
      drawRoundedRectPath(fCtx, pillX, pillY, pillWidth, pillHeight, 6);
      fCtx.fill();
      fCtx.stroke();

      // Title Text
      fCtx.fillStyle = '#CBCBCB';
      fCtx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      fCtx.textAlign = 'center';
      fCtx.textBaseline = 'middle';
      fCtx.fillText(displayTitle, pillX + pillWidth / 2, pillY + pillHeight / 2);
    }

    // Main Screenshot
    fCtx.drawImage(sourceCanvas, 0, headerHeight, winW, srcH);
    fCtx.restore();

    // 1px Subtle Outer Highlight Border
    fCtx.save();
    fCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    fCtx.lineWidth = 1;
    drawRoundedRectPath(fCtx, 0.5, 0.5, winW - 1, winH - 1, windowRadius);
    fCtx.stroke();
    fCtx.restore();

  } else if (frameType === 'safari') {
    // ----------------------------------------------------
    // Safari Browser Bar Frame
    // ----------------------------------------------------
    const headerHeight = 54;
    const windowRadius = 16;
    const winW = srcW;
    const winH = srcH + headerHeight;

    frameCanvas.width = winW;
    frameCanvas.height = winH;
    fCtx = frameCanvas.getContext('2d');
    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';

    // Window Base Clip
    fCtx.save();
    drawRoundedRectPath(fCtx, 0, 0, winW, winH, windowRadius);
    fCtx.clip();

    // Safari Top Bar Background (Frosted Silver/Dark)
    const safariGrad = fCtx.createLinearGradient(0, 0, 0, headerHeight);
    safariGrad.addColorStop(0, '#2d3038');
    safariGrad.addColorStop(1, '#202227');
    fCtx.fillStyle = safariGrad;
    fCtx.fillRect(0, 0, winW, headerHeight);

    // Header bottom border
    fCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    fCtx.lineWidth = 1;
    fCtx.beginPath();
    fCtx.moveTo(0, headerHeight);
    fCtx.lineTo(winW, headerHeight);
    fCtx.stroke();

    // Traffic Lights
    const dotY = 22;
    const dotRadius = 5.5;
    fCtx.beginPath(); fCtx.arc(18, dotY, dotRadius, 0, Math.PI * 2); fCtx.fillStyle = '#ff5f56'; fCtx.fill();
    fCtx.beginPath(); fCtx.arc(36, dotY, dotRadius, 0, Math.PI * 2); fCtx.fillStyle = '#ffbd2e'; fCtx.fill();
    fCtx.beginPath(); fCtx.arc(54, dotY, dotRadius, 0, Math.PI * 2); fCtx.fillStyle = '#27c93f'; fCtx.fill();

    // Navigation Icons (< >)
    fCtx.strokeStyle = 'rgba(203, 203, 203, 0.6)';
    fCtx.lineWidth = 1.6;
    fCtx.lineCap = 'round';
    fCtx.lineJoin = 'round';

    // Back Arrow (<)
    fCtx.beginPath();
    fCtx.moveTo(82, dotY);
    fCtx.lineTo(76, dotY - 5);
    fCtx.moveTo(82, dotY);
    fCtx.lineTo(76, dotY + 5);
    fCtx.stroke();

    // Forward Arrow (>)
    fCtx.beginPath();
    fCtx.moveTo(96, dotY);
    fCtx.lineTo(102, dotY - 5);
    fCtx.moveTo(96, dotY);
    fCtx.lineTo(102, dotY + 5);
    fCtx.stroke();

    // Safari Omnibox (Address Bar)
    const omniW = Math.min(520, Math.max(180, winW - 240));
    const omniH = 28;
    const omniX = (winW - omniW) / 2;
    const omniY = (headerHeight - omniH) / 2;

    fCtx.fillStyle = 'rgba(15, 16, 20, 0.85)';
    fCtx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    fCtx.lineWidth = 1;
    drawRoundedRectPath(fCtx, omniX, omniY, omniW, omniH, 8);
    fCtx.fill();
    fCtx.stroke();

    // SSL Padlock Icon 🔒
    fCtx.fillStyle = '#10b981';
    const lockX = omniX + 14;
    const lockY = omniY + omniH / 2;
    
    // Lock Body
    fCtx.fillRect(lockX - 3.5, lockY - 1, 7, 6);
    // Lock Shackle
    fCtx.beginPath();
    fCtx.arc(lockX, lockY - 2, 2.8, Math.PI, 0);
    fCtx.strokeStyle = '#10b981';
    fCtx.lineWidth = 1.2;
    fCtx.stroke();

    // URL / Title text
    fCtx.fillStyle = '#FFFFE3';
    fCtx.font = '500 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    fCtx.textAlign = 'center';
    fCtx.textBaseline = 'middle';
    fCtx.fillText(displayTitle, omniX + omniW / 2, omniY + omniH / 2);

    // Main Screenshot
    fCtx.drawImage(sourceCanvas, 0, headerHeight, winW, srcH);
    fCtx.restore();

    // Outer Glass Border
    fCtx.save();
    fCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    fCtx.lineWidth = 1;
    drawRoundedRectPath(fCtx, 0.5, 0.5, winW - 1, winH - 1, windowRadius);
    fCtx.stroke();
    fCtx.restore();

  } else if (frameType === 'iphone16pro') {
    // ----------------------------------------------------
    // iPhone 16 Pro Titanium Frame
    // ----------------------------------------------------
    const bezel = 18;
    const topBarH = 38;
    const bottomBarH = 26;
    const phoneRadius = 48;
    const screenRadius = 38;

    const totalPhoneW = srcW + bezel * 2;
    const totalPhoneH = srcH + bezel * 2 + topBarH + bottomBarH;

    frameCanvas.width = totalPhoneW;
    frameCanvas.height = totalPhoneH;
    fCtx = frameCanvas.getContext('2d');
    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';

    // 1. Titanium Outer Bezel (Brushed Titanium Gradient)
    fCtx.save();
    const titaniumGrad = fCtx.createLinearGradient(0, 0, totalPhoneW, totalPhoneH);
    titaniumGrad.addColorStop(0, '#4b4845');
    titaniumGrad.addColorStop(0.3, '#2a2826');
    titaniumGrad.addColorStop(0.7, '#1b1a19');
    titaniumGrad.addColorStop(1, '#3a3734');

    fCtx.fillStyle = titaniumGrad;
    drawRoundedRectPath(fCtx, 0, 0, totalPhoneW, totalPhoneH, phoneRadius);
    fCtx.fill();

    // Inner Metallic Chamfer
    fCtx.strokeStyle = 'rgba(255, 235, 200, 0.25)';
    fCtx.lineWidth = 1.5;
    drawRoundedRectPath(fCtx, 1, 1, totalPhoneW - 2, totalPhoneH - 2, phoneRadius);
    fCtx.stroke();
    fCtx.restore();

    // 2. Black Inner Bezel Border
    fCtx.save();
    fCtx.fillStyle = '#050505';
    drawRoundedRectPath(fCtx, bezel - 4, bezel - 4, srcW + 8, srcH + topBarH + bottomBarH + 8, screenRadius + 4);
    fCtx.fill();

    // 3. Screen Clip
    drawRoundedRectPath(fCtx, bezel, bezel, srcW, srcH + topBarH + bottomBarH, screenRadius);
    fCtx.clip();

    // Screen Base
    fCtx.fillStyle = '#000000';
    fCtx.fillRect(bezel, bezel, srcW, srcH + topBarH + bottomBarH);

    // Draw Main Screenshot inside Screen Area
    fCtx.drawImage(sourceCanvas, bezel, bezel + topBarH, srcW, srcH);

    // 4. Dynamic Island (Pill Shape)
    const islandW = Math.min(126, srcW * 0.35);
    const islandH = 30;
    const islandX = bezel + (srcW - islandW) / 2;
    const islandY = bezel + 10;

    fCtx.fillStyle = '#000000';
    fCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    fCtx.lineWidth = 1;
    drawRoundedRectPath(fCtx, islandX, islandY, islandW, islandH, islandH / 2);
    fCtx.fill();
    fCtx.stroke();

    // Camera Lens Reflection inside Dynamic Island
    fCtx.beginPath();
    fCtx.arc(islandX + islandW - 18, islandY + islandH / 2, 4.5, 0, Math.PI * 2);
    fCtx.fillStyle = '#0b0f19';
    fCtx.fill();
    fCtx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    fCtx.lineWidth = 1;
    fCtx.stroke();

    // Sensor dot
    fCtx.beginPath();
    fCtx.arc(islandX + 18, islandY + islandH / 2, 3, 0, Math.PI * 2);
    fCtx.fillStyle = '#080a0f';
    fCtx.fill();

    // 5. iOS Home Indicator Bar
    const homeW = Math.min(140, srcW * 0.4);
    const homeH = 4.5;
    const homeX = bezel + (srcW - homeW) / 2;
    const homeY = totalPhoneH - bezel - 12;

    fCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    drawRoundedRectPath(fCtx, homeX, homeY, homeW, homeH, homeH / 2);
    fCtx.fill();

    // 6. Realistic Screen Glass Glare Sheen
    const glareGrad = fCtx.createLinearGradient(bezel, bezel, bezel + srcW, bezel + srcH + topBarH);
    glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    glareGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.02)');
    glareGrad.addColorStop(0.7, 'transparent');
    fCtx.fillStyle = glareGrad;
    fCtx.fillRect(bezel, bezel, srcW, srcH + topBarH + bottomBarH);

    fCtx.restore();

  } else if (frameType === 'glass') {
    // ----------------------------------------------------
    // Minimalist Glass Frame
    // ----------------------------------------------------
    const glassBorder = 8;
    const windowRadius = 16;
    const winW = srcW + glassBorder * 2;
    const winH = srcH + glassBorder * 2;

    frameCanvas.width = winW;
    frameCanvas.height = winH;
    fCtx = frameCanvas.getContext('2d');
    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';

    // Glass backdrop container
    fCtx.save();
    drawRoundedRectPath(fCtx, 0, 0, winW, winH, windowRadius);
    fCtx.clip();

    // Frosted Border Gradient
    const borderGrad = fCtx.createLinearGradient(0, 0, winW, winH);
    borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    borderGrad.addColorStop(0.5, 'rgba(109, 129, 150, 0.2)');
    borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    fCtx.fillStyle = borderGrad;
    fCtx.fillRect(0, 0, winW, winH);

    // Inner Image Draw
    fCtx.save();
    drawRoundedRectPath(fCtx, glassBorder, glassBorder, srcW, srcH, windowRadius - 4);
    fCtx.clip();
    fCtx.drawImage(sourceCanvas, glassBorder, glassBorder, srcW, srcH);
    fCtx.restore();

    fCtx.restore();

    // 1px Neon / Frost Edge
    fCtx.save();
    fCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    fCtx.lineWidth = 1;
    drawRoundedRectPath(fCtx, 0.5, 0.5, winW - 1, winH - 1, windowRadius);
    fCtx.stroke();
    fCtx.restore();

  } else {
    // ----------------------------------------------------
    // None / Borderless Smooth Frame
    // ----------------------------------------------------
    const windowRadius = 12;
    frameCanvas.width = srcW;
    frameCanvas.height = srcH;
    fCtx = frameCanvas.getContext('2d');
    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';

    fCtx.save();
    drawRoundedRectPath(fCtx, 0, 0, srcW, srcH, windowRadius);
    fCtx.clip();
    fCtx.drawImage(sourceCanvas, 0, 0, srcW, srcH);
    fCtx.restore();

    // Subtle edge
    fCtx.save();
    fCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    fCtx.lineWidth = 1;
    drawRoundedRectPath(fCtx, 0.5, 0.5, srcW - 1, srcH - 1, windowRadius);
    fCtx.stroke();
    fCtx.restore();
  }

  return frameCanvas;
}

/**
 * 3D Isometric & Perspective Projection Renderer.
 * Uses true affine transformation matrix for ultra-sharp, seamless rasterization
 * with dynamic perspective lighting and accurate projected drop shadows.
 * 
 * @param {CanvasRenderingContext2D} targetCtx - Destination 2D context
 * @param {HTMLCanvasElement} frameCanvas - Pre-rendered framed graphic
 * @param {Object} options - { centerX, centerY, tiltX, tiltY, shadow }
 */
function draw3DTiltedFrame(targetCtx, frameCanvas, options = {}) {
  const {
    centerX = 0,
    centerY = 0,
    tiltX = 0, // -30 to +30 deg (Pitch)
    tiltY = 0, // -30 to +30 deg (Yaw)
    shadow = 'deep'
  } = options;

  const fw = frameCanvas.width;
  const fh = frameCanvas.height;

  if (fw <= 0 || fh <= 0) return;

  const radX = (tiltX * Math.PI) / 180;
  const radY = (tiltY * Math.PI) / 180;

  targetCtx.save();
  targetCtx.translate(centerX, centerY);

  // 1. Calculate 3D Matrix Transform factors (Pitch & Yaw)
  const cosY = Math.cos(radY);
  const sinY = Math.sin(radY);
  const cosX = Math.cos(radX);
  const sinX = Math.sin(radX);

  const scaleX = cosY * (1 - Math.abs(sinX) * 0.12);
  const scaleY = cosX * (1 - Math.abs(sinY) * 0.12);
  const skewX = -sinY * 0.42;
  const skewY = sinX * 0.42;

  // 2. Render Matching 3D Projected Drop Shadow
  if (shadow !== 'none') {
    targetCtx.save();
    targetCtx.transform(scaleX, skewY, skewX, scaleY, 0, 0);

    const shadowAlpha = shadow === 'deep' ? 0.44 : 0.25;
    const shadowBlur = shadow === 'deep' ? 44 : 22;
    const shadowOffX = -sinY * 32;
    const shadowOffY = 26 + Math.abs(sinX) * 28;

    targetCtx.shadowColor = `rgba(0, 0, 0, ${shadowAlpha})`;
    targetCtx.shadowBlur = shadowBlur;
    targetCtx.shadowOffsetX = shadowOffX;
    targetCtx.shadowOffsetY = shadowOffY;

    // Single pass shadow projection matching exact device frame shape
    targetCtx.drawImage(frameCanvas, -fw / 2, -fh / 2, fw, fh);
    targetCtx.restore();
  }

  // 3. Render Main Device Frame with 3D Matrix Transform
  targetCtx.save();
  targetCtx.transform(scaleX, skewY, skewX, scaleY, 0, 0);
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = 'high';

  // Crisp single-pass rendering: Zero slice gaps, Zero lines on face
  targetCtx.drawImage(frameCanvas, -fw / 2, -fh / 2, fw, fh);

  // 4. Realistic 3D Studio Light & Shadow Glare Reflection
  if (Math.abs(tiltX) > 0.5 || Math.abs(tiltY) > 0.5) {
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'source-atop';

    const lightGrad = targetCtx.createLinearGradient(-fw / 2, -fh / 2, fw / 2, fh / 2);
    const highlightAlpha = Math.max(0, Math.min(0.20, (tiltY * 0.005 + tiltX * 0.004) + 0.07));
    const shadeAlpha = Math.max(0, Math.min(0.24, (-tiltY * 0.005 - tiltX * 0.004) + 0.07));

    lightGrad.addColorStop(0, `rgba(255, 255, 255, ${highlightAlpha})`);
    lightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    lightGrad.addColorStop(1, `rgba(0, 0, 0, ${shadeAlpha})`);

    targetCtx.fillStyle = lightGrad;
    targetCtx.fillRect(-fw / 2, -fh / 2, fw, fh);
    targetCtx.restore();
  }

  targetCtx.restore();
  targetCtx.restore();
}

/**
 * Master Canvas Generator: Synthesizes Backdrop + Device Frame + 3D Tilt + Grain + Aspect Ratio.
 * 
 * @param {HTMLCanvasElement} sourceCanvas - Original canvas with screenshot + annotations
 * @param {Object} config - { theme, frameType, padding, tiltX, tiltY, aspectRatio, enableGrain, shadow, title, hasHeader }
 * @returns {HTMLCanvasElement}
 */
function generateMockupCanvas(sourceCanvas, config = {}) {
  if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) {
    throw new Error('Geçersiz kaynak tuval.');
  }

  const themeKey = config.theme || 'obsidian';
  const theme = MOCKUP_THEMES[themeKey] || MOCKUP_THEMES.obsidian;
  const padding = typeof config.padding === 'number' ? config.padding : 48;
  const tiltX = typeof config.tiltX === 'number' ? config.tiltX : 0;
  const tiltY = typeof config.tiltY === 'number' ? config.tiltY : 0;
  const frameType = config.frameType || 'macos';
  const aspectRatioKey = config.aspectRatio || 'auto';
  const enableGrain = config.enableGrain !== false;
  const shadow = config.shadow || 'deep';
  const hasHeader = config.hasHeader !== false;
  const displayTitle = config.title || 'Ekran Görüntüsü';

  // 1. Render Raw Framed Device Canvas
  const frameCanvas = renderDeviceFrame(sourceCanvas, {
    frameType,
    hasHeader,
    title: displayTitle
  });

  const fw = frameCanvas.width;
  const fh = frameCanvas.height;

  // 2. Calculate Output Dimensions taking 3D Tilt Bounding Box into account
  const radX = Math.abs((tiltX * Math.PI) / 180);
  const radY = Math.abs((tiltY * Math.PI) / 180);
  const expandedFw = fw * (Math.cos(radY) + Math.sin(radX) * 0.42);
  const expandedFh = fh * (Math.cos(radX) + Math.sin(radY) * 0.42);

  let totalW = Math.round(Math.max(fw + padding * 2, expandedFw + padding * 2));
  let totalH = Math.round(Math.max(fh + padding * 2, expandedFh + padding * 2));

  const targetRatio = ASPECT_RATIO_PRESETS[aspectRatioKey]?.ratio;
  if (targetRatio && targetRatio > 0) {
    // If a fixed aspect ratio is selected (e.g. 16:9, 1:1, 4:5):
    const currentRatio = totalW / totalH;
    if (currentRatio < targetRatio) {
      // Need wider canvas
      totalW = Math.round(totalH * targetRatio);
    } else {
      // Need taller canvas
      totalH = Math.round(totalW / targetRatio);
    }
  }

  // 3. Initialize Master Output Canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = totalW;
  outCanvas.height = totalH;
  const mCtx = outCanvas.getContext('2d');
  mCtx.imageSmoothingEnabled = true;
  mCtx.imageSmoothingQuality = 'high';

  // 4. Render Ultra-HD Mesh Gradient Backdrop & Grain
  drawMeshBackdrop(mCtx, totalW, totalH, theme, enableGrain);

  // 5. Render 3D Tilted Device Frame with Shadows
  const centerX = totalW / 2;
  const centerY = totalH / 2;

  draw3DTiltedFrame(mCtx, frameCanvas, {
    centerX,
    centerY,
    tiltX,
    tiltY,
    shadow
  });

  return outCanvas;
}

/**
 * Renders a live real-time preview of the mockup onto a preview canvas element.
 */
function renderMockupPreview(sourceCanvas, previewCanvas, config = {}) {
  if (!sourceCanvas || !previewCanvas) return;
  const rendered = generateMockupCanvas(sourceCanvas, config);
  previewCanvas.width = rendered.width;
  previewCanvas.height = rendered.height;
  const pCtx = previewCanvas.getContext('2d');
  pCtx.imageSmoothingEnabled = true;
  pCtx.imageSmoothingQuality = 'high';
  pCtx.drawImage(rendered, 0, 0);
}

// Global Export
if (typeof window !== 'undefined') {
  window.FullShotMockup = {
    MOCKUP_THEMES,
    ASPECT_RATIO_PRESETS,
    generateGrainTexture,
    drawRoundedRectPath,
    drawMeshBackdrop,
    renderDeviceFrame,
    draw3DTiltedFrame,
    generateMockupCanvas,
    renderMockupPreview
  };
}

