/**
 * FullShot Pro - Image Studio Main Coordinator
 * Integrates CanvasRenderer, HistoryStack, ZoomPanController, and Vector Tools.
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  const CanvasTools = window.FullShotCanvas || {};
  const { CanvasRenderer, HistoryStack, ZoomPanController, Pen, Badge, Highlighter, Arrow, Shapes, Blur, Text, Spotlight, Magnifier, Stamp } = CanvasTools;
  const AutoCensorEngine = window.FullShotAutoCensor;

  // --- DOM Elements ---
  const mainCanvas = document.getElementById('mainCanvas');
  const overlayCanvas = document.getElementById('overlayCanvas');
  const canvasStage = document.getElementById('canvasStage');
  const viewport = document.getElementById('viewport');

  const pageTitle = document.getElementById('pageTitle');
  const pageUrl = document.getElementById('pageUrl');
  const dimText = document.getElementById('dimText');
  const zoomLevel = document.getElementById('zoomLevel');

  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomFitBtn = document.getElementById('zoomFitBtn');
  const zoomActualBtn = document.getElementById('zoomActualBtn');

  const autoCensorBtn = document.getElementById('autoCensorBtn');
  const copyClipboardBtn = document.getElementById('copyClipboardBtn');
  const downloadDropdownBtn = document.getElementById('downloadDropdownBtn');
  const downloadMenu = document.getElementById('downloadMenu');
  const downloadPngBtn = document.getElementById('downloadPngBtn');
  const downloadJpgBtn = document.getElementById('downloadJpgBtn');
  const downloadWebpBtn = document.getElementById('downloadWebpBtn');
  const downloadSinglePdfBtn = document.getElementById('downloadSinglePdfBtn');
  const downloadMultiPdfBtn = document.getElementById('downloadMultiPdfBtn');

  const shortcutsBtn = document.getElementById('shortcutsBtn');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const closeShortcutsBtn = document.getElementById('closeShortcutsBtn');

  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const clearBtn = document.getElementById('clearBtn');

  const floatingToolbar = document.getElementById('floatingToolbar');
  const toolButtons = document.querySelectorAll('.tool-icon-btn[data-tool]');

  // Option Groups
  const colorOptionGroup = document.getElementById('colorOptionGroup');
  const strokeOptionGroup = document.getElementById('strokeOptionGroup');
  const penTypeOptionGroup = document.getElementById('penTypeOptionGroup');
  const lineStyleOptionGroup = document.getElementById('lineStyleOptionGroup');
  const stepOptionGroup = document.getElementById('stepOptionGroup');
  const blurOptionGroup = document.getElementById('blurOptionGroup');
  const textSizeOptionGroup = document.getElementById('textSizeOptionGroup');
  const spotlightOptionGroup = document.getElementById('spotlightOptionGroup');
  const magnifierOptionGroup = document.getElementById('magnifierOptionGroup');
  const stampOptionGroup = document.getElementById('stampOptionGroup');

  const colorSwatches = document.querySelectorAll('.color-swatch');
  const activeColorBadge = document.getElementById('activeColorBadge');
  const customColorTriggerBtn = document.getElementById('customColorTriggerBtn');
  const customColorDisc = document.getElementById('customColorDisc');
  const strokeButtons = document.querySelectorAll('.stroke-btn');
  const penTypeButtons = document.querySelectorAll('.pen-type-btn');
  const lineSolidBtn = document.getElementById('lineSolidBtn');
  const lineDashedBtn = document.getElementById('lineDashedBtn');
  const arrowModeSelector = document.getElementById('arrowModeSelector');
  const arrowSingleBtn = document.getElementById('arrowSingleBtn');
  const arrowDoubleBtn = document.getElementById('arrowDoubleBtn');
  const arrowCurveSelector = document.getElementById('arrowCurveSelector');
  const arrowStraightBtn = document.getElementById('arrowStraightBtn');
  const arrowCurvedBtn = document.getElementById('arrowCurvedBtn');
  const spotlightShapeButtons = document.querySelectorAll('.spotlight-shape-btn');
  const spotlightDarknessButtons = document.querySelectorAll('.spotlight-dark-btn');
  const magZoomButtons = document.querySelectorAll('.mag-zoom-btn');
  const stampTabs = document.querySelectorAll('.stamp-tab');
  const stampSelectorGrid = document.getElementById('stampSelectorGrid');
  const calloutStyleButtons = document.querySelectorAll('.callout-style-btn');
  const stepBadgePreview = document.getElementById('stepBadgePreview');
  const stepResetBtn = document.getElementById('stepResetBtn');
  const blurTypeButtons = document.querySelectorAll('.blur-type-btn');
  const blurIntensityButtons = document.querySelectorAll('.blur-intensity-btn');
  const blurDockAutoCensorBtn = document.getElementById('blurDockAutoCensorBtn');
  const textSizeButtons = document.querySelectorAll('.text-size-btn');
  const textBgCheckbox = document.getElementById('textBgCheckbox');

  // Text Overlay Input Elements
  const textInputContainer = document.getElementById('textInputContainer');
  const textInputField = document.getElementById('textInputField');
  const textApplyBtn = document.getElementById('textApplyBtn');
  const textCancelBtn = document.getElementById('textCancelBtn');

  // Watermark Modal Elements
  const watermarkBtn = document.getElementById('watermarkBtn');
  const watermarkModal = document.getElementById('watermarkModal');
  const closeWatermarkBtn = document.getElementById('closeWatermarkBtn');
  const wmPresetUrl = document.getElementById('wmPresetUrl');
  const wmPresetDate = document.getElementById('wmPresetDate');
  const wmPresetBrand = document.getElementById('wmPresetBrand');
  const wmPresetConfidential = document.getElementById('wmPresetConfidential');
  const wmCustomTextInput = document.getElementById('wmCustomTextInput');
  const wmPositionSelect = document.getElementById('wmPositionSelect');
  const wmStyleSelect = document.getElementById('wmStyleSelect');
  const wmCancelBtn = document.getElementById('wmCancelBtn');
  const wmApplyBtn = document.getElementById('wmApplyBtn');

  // Mockup Modal Elements
  const mockupBtn = document.getElementById('mockupBtn');
  const mockupModal = document.getElementById('mockupModal');
  const closeMockupBtn = document.getElementById('closeMockupBtn');
  const mockupPreviewCanvas = document.getElementById('mockupPreviewCanvas');
  const mockupPreviewContainer = document.getElementById('mockupPreviewContainer');
  const mockupRatioBadge = document.getElementById('mockupRatioBadge');
  const activeFrameLabel = document.getElementById('activeFrameLabel');
  const activeThemeLabel = document.getElementById('activeThemeLabel');
  const tiltValueText = document.getElementById('tiltValueText');
  const tiltPuckTrack = document.getElementById('tiltPuckTrack');
  const tiltPuckHandle = document.getElementById('tiltPuckHandle');
  const tiltXRange = document.getElementById('tiltXRange');
  const tiltYRange = document.getElementById('tiltYRange');
  const tiltXNum = document.getElementById('tiltXNum');
  const tiltYNum = document.getElementById('tiltYNum');
  const tiltPresetBtns = document.querySelectorAll('.tilt-preset-btn');
  const mockupFrameBtns = document.querySelectorAll('.mockup-frame-btn');
  const mockupThemeCards = document.querySelectorAll('.mockup-theme-card');
  const mockupRatioBtns = document.querySelectorAll('.ratio-pill-btn');
  const mockupPaddingBtns = document.querySelectorAll('#mockupPaddingGroup .mockup-opt-btn');
  const mockupShadowBtns = document.querySelectorAll('#mockupShadowGroup .mockup-opt-btn');
  const mockupGrainCheckbox = document.getElementById('mockupGrainCheckbox');
  const mockupHeaderCheckbox = document.getElementById('mockupHeaderCheckbox');
  const mockupHeaderToggleWrap = document.getElementById('mockupHeaderToggleWrap');
  const downloadMockupPngBtn = document.getElementById('downloadMockupPngBtn');
  const downloadMockupWebpBtn = document.getElementById('downloadMockupWebpBtn');
  const copyMockupClipboardBtn = document.getElementById('copyMockupClipboardBtn');

  // Toast Elements
  const toast = document.getElementById('toast');
  const toastTitle = document.getElementById('toastTitle');
  const toastText = document.getElementById('toastText');

  // --- Initialize Micro-Engine Instances ---
  const renderer = new CanvasRenderer(mainCanvas, overlayCanvas);
  const history = new HistoryStack(50);

  let zoomPan = null;
  if (ZoomPanController) {
    zoomPan = new ZoomPanController({
      viewport,
      canvasStage,
      zoomLevelEl: zoomLevel,
      onCursorChange: updateCursor
    });
  }

  // --- State Variables ---
  let captureData = null;
  let baseImage = null;

  let activeTool = 'select'; // 'select' | 'pan' | 'pen' | 'line' | 'highlighter' | 'arrow' | 'rect' | 'circle' | 'step' | 'callout' | 'blur' | 'text' | 'spotlight' | 'magnifier' | 'stamp'
  let activeColor = '#000000';
  let activeStrokeWidth = 4;
  let activePenType = 'ballpoint'; // 'ballpoint' | 'calligraphy' | 'neon' | 'pencil'
  let activeLineDashed = false;
  let activeArrowMode = 'single'; // 'single' | 'double'
  let activeArrowCurved = false;
  let activeBlurType = 'pixelate'; // 'pixelate' | 'blackout' | 'gaussian' | 'tape'
  let activeBlurIntensity = 'medium'; // 'light' | 'medium' | 'strong'
  let activeFontSize = 24;
  let activeTextBg = true;
  let activeCalloutStyle = 'bubble'; // 'bubble' | 'thought' | 'frosted' | 'plain'
  let activeSpotlightShape = 'rounded-rect'; // 'rounded-rect' | 'ellipse' | 'rect'
  let activeSpotlightDarkness = 0.65;
  let activeMagnifierZoom = 2.0;
  let activeStampId = 'approved';
  let activeStampCategory = 'qa';
  let stepCounter = 1;

  // Interactive Drawing State
  let isDrawing = false;
  let startPos = { x: 0, y: 0 };
  let currentPos = { x: 0, y: 0 };
  let penPath = [];
  let pendingTextPos = null;
  let pendingCallout = null;

  // Advanced 3D Mockup Configuration (CleanShot X & Shots.so Düzeyi)
  const mockupConfig = {
    theme: 'obsidian',
    frameType: 'macos',
    padding: 48,
    tiltX: 0,
    tiltY: 0,
    aspectRatio: 'auto',
    enableGrain: true,
    hasHeader: true,
    shadow: 'deep'
  };

  // --- 1. LOAD CAPTURE DATA ---
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const captureId = urlParams.get('id') || urlParams.get('captureId');

    // 1. Try to load by specific ID from FullShotDB
    if (captureId && typeof FullShotDB !== 'undefined' && FullShotDB.getCapture) {
      const dbCapture = await FullShotDB.getCapture(captureId);
      if (dbCapture && (dbCapture.dataUrl || dbCapture.data)) {
        captureData = {
          ...dbCapture,
          dataUrl: dbCapture.dataUrl || dbCapture.data
        };
      }
    }

    // 2. Fallback to chrome.storage.local
    if (!captureData && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const storage = await chrome.storage.local.get('fullshot_current_capture');
      captureData = storage.fullshot_current_capture;
    }

    // 3. Fallback to latest capture from FullShotDB
    if (!captureData && typeof FullShotDB !== 'undefined' && FullShotDB.getCapture) {
      const latestCapture = await FullShotDB.getCapture('current_capture');
      if (latestCapture && (latestCapture.dataUrl || latestCapture.data)) {
        captureData = {
          ...latestCapture,
          dataUrl: latestCapture.dataUrl || latestCapture.data
        };
      }
    }
  } catch (e) {
    console.error('[ImageStudio] Storage/DB erişim hatası:', e);
  }

  if (!captureData || !captureData.dataUrl) {
    if (pageTitle) pageTitle.textContent = 'Görüntü bulunamadı veya süre aşımına uğradı.';
    if (viewport) {
      viewport.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8; gap: 12px; font-family: sans-serif;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <p style="font-size: 14px; font-weight: 500;">Görüntü verisi bulunamadı. Lütfen eklenti menüsünden yeni bir ekran görüntüsü alın.</p>
        </div>
      `;
    }
    return;
  }

  // Set Page Meta
  if (pageTitle) pageTitle.textContent = captureData.title || 'Ekran Görüntüsü';
  if (pageUrl) {
    pageUrl.textContent = captureData.url || '';
    if (captureData.url) pageUrl.title = captureData.url;
  }

  // Load Base Image
  baseImage = new Image();
  baseImage.onload = () => {
    const width = baseImage.naturalWidth || captureData.width;
    const height = baseImage.naturalHeight || captureData.height;

    renderer.setSize(width, height);
    if (dimText) dimText.textContent = `${width} × ${height} px`;

    // Draw initial screenshot
    renderer.drawBaseImage(baseImage);

    // Auto-fit to viewport
    if (zoomPan) {
      zoomPan.fitToScreen(width);
    }
  };
  baseImage.onerror = () => {
    showToast('Hata', 'Görüntü verisi yüklenirken sorun oluştu.');
  };
  baseImage.src = captureData.dataUrl;

  // --- 2. HISTORY & ACTION COORDINATION ---
  function pushAction(action) {
    history.push(action);
    renderer.executeAction(renderer.mainCtx, action, baseImage);
    updateHistoryUI();
  }

  function undo() {
    if (history.undo()) {
      renderer.redrawAll(history.getStack(), history.getIndex(), baseImage);
      syncStepCounterFromHistory();
      updateHistoryUI();
      showToast('Geri Alındı', 'Son işlem geri alındı.');
    }
  }

  function redo() {
    const act = history.redo();
    if (act) {
      renderer.executeAction(renderer.mainCtx, act, baseImage);
      syncStepCounterFromHistory();
      updateHistoryUI();
      showToast('İleri Alındı', 'İşlem tekrar uygulandı.');
    }
  }

  function clearAll() {
    if (confirm('Tüm çizimleri ve düzenlemeleri temizlemek istediğinizden emin misiniz?')) {
      pushAction({ type: 'clear' });
      showToast('Temizlendi', 'Tüm çizimler sıfırlandı.');
    }
  }

  function updateHistoryUI() {
    if (undoBtn) undoBtn.disabled = !history.canUndo();
    if (redoBtn) redoBtn.disabled = !history.canRedo();
  }

  function syncStepCounterFromHistory() {
    const maxStep = history.getMaxStepBadgeNumber();
    stepCounter = maxStep + 1;
    updateStepBadgePreview();
  }

  function updateStepBadgePreview() {
    if (stepBadgePreview) {
      stepBadgePreview.textContent = `#${stepCounter}`;
      stepBadgePreview.style.backgroundColor = activeColor;
    }
  }

  if (undoBtn) undoBtn.addEventListener('click', undo);
  if (redoBtn) redoBtn.addEventListener('click', redo);
  if (clearBtn) clearBtn.addEventListener('click', clearAll);

  if (stepResetBtn) {
    stepResetBtn.addEventListener('click', () => {
      stepCounter = 1;
      updateStepBadgePreview();
      showToast('Sayaç Sıfırlandı', 'Sıradaki rozet: #1');
    });
  }

  // --- 3. TOOL SELECTION & OPTIONS DOCK ROUTING ---
  function setActiveTool(toolName) {
    activeTool = toolName;
    if (renderer) renderer.clearOverlay();

    // Update Toolbar Button States
    toolButtons.forEach(btn => {
      const isActive = btn.dataset.tool === toolName;
      if (isActive) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    updateCursor();

    // Adjust Options Dock visibility
    if (colorOptionGroup) colorOptionGroup.classList.add('hidden');
    if (strokeOptionGroup) strokeOptionGroup.classList.add('hidden');
    if (penTypeOptionGroup) penTypeOptionGroup.classList.add('hidden');
    if (lineStyleOptionGroup) lineStyleOptionGroup.classList.add('hidden');
    if (stepOptionGroup) stepOptionGroup.classList.add('hidden');
    if (blurOptionGroup) blurOptionGroup.classList.add('hidden');
    if (textSizeOptionGroup) textSizeOptionGroup.classList.add('hidden');
    if (spotlightOptionGroup) spotlightOptionGroup.classList.add('hidden');
    if (magnifierOptionGroup) magnifierOptionGroup.classList.add('hidden');
    if (stampOptionGroup) stampOptionGroup.classList.add('hidden');

    if (toolName === 'pen') {
      if (colorOptionGroup) colorOptionGroup.classList.remove('hidden');
      if (strokeOptionGroup) strokeOptionGroup.classList.remove('hidden');
      if (penTypeOptionGroup) penTypeOptionGroup.classList.remove('hidden');
    } else if (toolName === 'blur') {
      if (blurOptionGroup) blurOptionGroup.classList.remove('hidden');
    } else if (toolName === 'spotlight') {
      if (colorOptionGroup) colorOptionGroup.classList.remove('hidden');
      if (strokeOptionGroup) strokeOptionGroup.classList.remove('hidden');
      if (spotlightOptionGroup) spotlightOptionGroup.classList.remove('hidden');
    } else if (toolName === 'magnifier') {
      if (colorOptionGroup) colorOptionGroup.classList.remove('hidden');
      if (strokeOptionGroup) strokeOptionGroup.classList.remove('hidden');
      if (magnifierOptionGroup) magnifierOptionGroup.classList.remove('hidden');
    } else if (toolName === 'stamp') {
      if (stampOptionGroup) stampOptionGroup.classList.remove('hidden');
      renderStampCatalog(activeStampCategory);
    } else if (toolName === 'text') {
      if (colorOptionGroup) colorOptionGroup.classList.remove('hidden');
      if (textSizeOptionGroup) textSizeOptionGroup.classList.remove('hidden');
    } else if (toolName === 'callout') {
      if (colorOptionGroup) colorOptionGroup.classList.remove('hidden');
      if (strokeOptionGroup) strokeOptionGroup.classList.remove('hidden');
      if (textSizeOptionGroup) textSizeOptionGroup.classList.remove('hidden');
    } else if (toolName === 'step') {
      if (colorOptionGroup) colorOptionGroup.classList.remove('hidden');
      if (strokeOptionGroup) strokeOptionGroup.classList.remove('hidden');
      if (stepOptionGroup) stepOptionGroup.classList.remove('hidden');
      updateStepBadgePreview();
    } else if (toolName === 'line' || toolName === 'arrow' || toolName === 'rect' || toolName === 'circle') {
      if (colorOptionGroup) colorOptionGroup.classList.remove('hidden');
      if (strokeOptionGroup) strokeOptionGroup.classList.remove('hidden');
      if (lineStyleOptionGroup) {
        lineStyleOptionGroup.classList.remove('hidden');
        if (arrowModeSelector) {
          if (toolName === 'arrow') {
            arrowModeSelector.classList.remove('hidden');
            if (arrowCurveSelector) arrowCurveSelector.classList.remove('hidden');
          } else {
            arrowModeSelector.classList.add('hidden');
            if (arrowCurveSelector) arrowCurveSelector.classList.add('hidden');
          }
        }
      }
    } else if (toolName === 'select' || toolName === 'pan') {
      // No extra tool options needed
    } else {
      // Highlighter etc.
      if (colorOptionGroup) colorOptionGroup.classList.remove('hidden');
      if (strokeOptionGroup) strokeOptionGroup.classList.remove('hidden');
    }

    if (toolName !== 'text' && toolName !== 'callout') {
      closeTextInput();
    }
  }

  function updateCursor() {
    if (!canvasStage) return;
    const isSpace = zoomPan ? zoomPan.isSpaceActive() : false;
    const isPanning = zoomPan ? zoomPan.isPanningActive() : false;

    if (isSpace || activeTool === 'pan') {
      canvasStage.className = `canvas-stage cursor-pan ${isPanning ? 'is-panning' : ''}`;
    } else {
      canvasStage.className = `canvas-stage cursor-${activeTool}`;
    }
  }

  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveTool(btn.dataset.tool);
    });
  });

  // Initialize Dark-Themed Color Studio Picker
  let colorPicker = null;
  if (window.FullShotCanvas && window.FullShotCanvas.ColorPicker) {
    colorPicker = new window.FullShotCanvas.ColorPicker({
      container: document.body,
      initialColor: activeColor,
      canvasTarget: mainCanvas,
      onColorChange: (hex) => {
        activeColor = hex;
        if (activeColorBadge) activeColorBadge.textContent = hex;
        if (customColorDisc) customColorDisc.style.backgroundColor = hex;

        colorSwatches.forEach(s => {
          const isMatch = s.dataset.color.toLowerCase() === hex.toLowerCase();
          s.classList.toggle('active', isMatch);
          s.setAttribute('aria-checked', isMatch ? 'true' : 'false');
        });

        updateStepBadgePreview();
      },
      onColorPicked: (hex) => {
        showToast('Renk Seçildi 🎨', `${hex} palete ve araca uygulandı.`);
      }
    });
  }

  if (customColorTriggerBtn && colorPicker) {
    customColorTriggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      colorPicker.toggle(customColorTriggerBtn);
    });
  }

  // Color Swatch Selection
  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      colorSwatches.forEach(s => {
        s.classList.remove('active');
        s.setAttribute('aria-checked', 'false');
      });
      swatch.classList.add('active');
      swatch.setAttribute('aria-checked', 'true');
      activeColor = swatch.dataset.color;
      if (activeColorBadge) activeColorBadge.textContent = activeColor;
      if (customColorDisc) customColorDisc.style.backgroundColor = activeColor;
      if (colorPicker) colorPicker.setColor(activeColor, false);
      updateStepBadgePreview();
    });
  });

  // Stroke Width Selection
  strokeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      strokeButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      activeStrokeWidth = parseInt(btn.dataset.width, 10);
    });
  });

  // Line Style Selection (Solid vs Dashed)
  if (lineSolidBtn) {
    lineSolidBtn.addEventListener('click', () => {
      lineSolidBtn.classList.add('active');
      lineSolidBtn.setAttribute('aria-checked', 'true');
      if (lineDashedBtn) {
        lineDashedBtn.classList.remove('active');
        lineDashedBtn.setAttribute('aria-checked', 'false');
      }
      activeLineDashed = false;
    });
  }
  if (lineDashedBtn) {
    lineDashedBtn.addEventListener('click', () => {
      lineDashedBtn.classList.add('active');
      lineDashedBtn.setAttribute('aria-checked', 'true');
      if (lineSolidBtn) {
        lineSolidBtn.classList.remove('active');
        lineSolidBtn.setAttribute('aria-checked', 'false');
      }
      activeLineDashed = true;
    });
  }

  // Arrow Head Mode
  if (arrowSingleBtn) {
    arrowSingleBtn.addEventListener('click', () => {
      arrowSingleBtn.classList.add('active');
      arrowSingleBtn.setAttribute('aria-checked', 'true');
      if (arrowDoubleBtn) {
        arrowDoubleBtn.classList.remove('active');
        arrowDoubleBtn.setAttribute('aria-checked', 'false');
      }
      activeArrowMode = 'single';
    });
  }
  if (arrowDoubleBtn) {
    arrowDoubleBtn.addEventListener('click', () => {
      arrowDoubleBtn.classList.add('active');
      arrowDoubleBtn.setAttribute('aria-checked', 'true');
      if (arrowSingleBtn) {
        arrowSingleBtn.classList.remove('active');
        arrowSingleBtn.setAttribute('aria-checked', 'false');
      }
      activeArrowMode = 'double';
    });
  }

  // Arrow Curve Mode (Straight vs Curved Bézier)
  if (arrowStraightBtn) {
    arrowStraightBtn.addEventListener('click', () => {
      arrowStraightBtn.classList.add('active');
      arrowStraightBtn.setAttribute('aria-checked', 'true');
      if (arrowCurvedBtn) {
        arrowCurvedBtn.classList.remove('active');
        arrowCurvedBtn.setAttribute('aria-checked', 'false');
      }
      activeArrowCurved = false;
    });
  }
  if (arrowCurvedBtn) {
    arrowCurvedBtn.addEventListener('click', () => {
      arrowCurvedBtn.classList.add('active');
      arrowCurvedBtn.setAttribute('aria-checked', 'true');
      if (arrowStraightBtn) {
        arrowStraightBtn.classList.remove('active');
        arrowStraightBtn.setAttribute('aria-checked', 'false');
      }
      activeArrowCurved = true;
    });
  }

  // Spotlight Shape & Darkness Listeners
  spotlightShapeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      spotlightShapeButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      activeSpotlightShape = btn.dataset.shape;
    });
  });

  spotlightDarknessButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      spotlightDarknessButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      activeSpotlightDarkness = parseFloat(btn.dataset.darkness);
    });
  });

  // Magnifier Zoom Listeners
  magZoomButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      magZoomButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      activeMagnifierZoom = parseFloat(btn.dataset.zoom);
    });
  });

  // Stamp Category Tabs & Grid Selector
  function renderStampCatalog(category) {
    if (!stampSelectorGrid) return;
    stampSelectorGrid.innerHTML = '';
    const presets = window.FullShotCanvas.Stamp?.STAMP_PRESETS || {};

    for (const [id, item] of Object.entries(presets)) {
      if (item.category === category) {
        const btn = document.createElement('button');
        btn.className = `stamp-item-btn ${id === activeStampId ? 'active' : ''}`;
        btn.dataset.stamp = id;
        btn.title = item.label || item.key || item.char || id;

        if (item.type === 'keycap') {
          btn.textContent = `[${item.key}]`;
        } else if (item.type === 'emoji') {
          btn.textContent = `${item.char} ${id.replace('emoji-', '')}`;
        } else {
          btn.textContent = `${item.icon} ${item.label}`;
        }

        btn.addEventListener('click', () => {
          document.querySelectorAll('.stamp-item-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeStampId = id;
        });

        stampSelectorGrid.appendChild(btn);
      }
    }
  }

  stampTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      stampTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activeStampCategory = tab.dataset.cat;
      renderStampCatalog(activeStampCategory);
    });
  });

  // Pen Type Selection
  penTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      penTypeButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      activePenType = btn.dataset.pentype || 'ballpoint';
    });
  });

  // Callout & Text Style Listeners
  calloutStyleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      calloutStyleButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      activeCalloutStyle = btn.dataset.textstyle;
    });
  });

  // Blur Type Selection
  blurTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      blurTypeButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      activeBlurType = btn.dataset.blur;
    });
  });

  // Blur Intensity Selection
  blurIntensityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      blurIntensityButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      activeBlurIntensity = btn.dataset.intensity;
    });
  });

  if (blurDockAutoCensorBtn) {
    blurDockAutoCensorBtn.addEventListener('click', () => {
      runAutoCensor();
    });
  }

  // Text Size Selection
  textSizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      textSizeButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      activeFontSize = parseInt(btn.dataset.fontsize, 10);
    });
  });

  if (textBgCheckbox) {
    textBgCheckbox.addEventListener('change', () => {
      activeTextBg = textBgCheckbox.checked;
    });
  }

  // --- 4. INTERACTIVE DRAWING & ANNOTATION ENGINE ---
  overlayCanvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Primary click only

    const isSpace = zoomPan ? zoomPan.isSpaceActive() : false;
    if (isSpace || activeTool === 'pan') {
      if (zoomPan) zoomPan.startPan(e.clientX, e.clientY);
      return;
    }

    if (activeTool === 'select') return;

    const coords = renderer.getCanvasCoordinates(e);

    // Smart Object Eraser Tool (Click/Touch to Delete Annotation)
    if (activeTool === 'eraser') {
      if (window.FullShotCanvas && window.FullShotCanvas.Eraser) {
        const hitIdx = window.FullShotCanvas.Eraser.findHitActionIndex(coords.x, coords.y, history.getStack(), history.getIndex());
        if (hitIdx !== -1) {
          history.removeAt(hitIdx);
          renderer.redrawAll(history.getStack(), history.getIndex(), baseImage);
          syncStepCounterFromHistory();
          updateHistoryUI();
          renderer.clearOverlay();
          showToast('Silindi', 'Anotasyon nesnesi kaldırıldı.');
        }
      }
      return;
    }

    // Numbered Step Badge Tool
    if (activeTool === 'step') {
      const badgeRadius = Math.max(14, Math.min(26, Math.round(activeStrokeWidth * 3.5)));
      pushAction({
        type: 'step',
        x: coords.x,
        y: coords.y,
        number: stepCounter,
        color: activeColor,
        radius: badgeRadius
      });
      stepCounter++;
      updateStepBadgePreview();

      // Immediately refresh live preview for next step number
      renderer.clearOverlay();
      renderer.overlayCtx.save();
      renderer.overlayCtx.globalAlpha = 0.75;
      if (Badge && Badge.drawStepBadge) {
        Badge.drawStepBadge(renderer.overlayCtx, coords.x, coords.y, stepCounter, activeColor, badgeRadius);
      }
      renderer.overlayCtx.restore();
      return;
    }

    // QA Stamp / Keycap / Emoji Tool
    if (activeTool === 'stamp') {
      pushAction({
        type: 'stamp',
        x: coords.x,
        y: coords.y,
        stampId: activeStampId,
        scale: 1.0
      });

      // Immediately refresh live hover preview at current position
      if (Stamp && Stamp.drawStampPreview) {
        renderer.clearOverlay();
        Stamp.drawStampPreview(renderer.overlayCtx, coords.x, coords.y, activeStampId, 1.0);
      }
      return;
    }

    // Text Overlay Tool
    if (activeTool === 'text') {
      openTextInput(coords, e.clientX, e.clientY);
      return;
    }

    // Interactive Drag Tools
    isDrawing = true;
    startPos = coords;
    currentPos = coords;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      penPath = [coords];
    }
  });

  // --- Dynamic Live Hover Previews for Stamp, Step Badge & Eraser ---
  overlayCanvas.addEventListener('mousemove', (e) => {
    if (isDrawing) return;
    const isSpace = zoomPan ? zoomPan.isSpaceActive() : false;
    if (isSpace || activeTool === 'pan' || activeTool === 'select') return;

    const coords = renderer.getCanvasCoordinates(e);

    if (activeTool === 'stamp' && Stamp && Stamp.drawStampPreview) {
      renderer.clearOverlay();
      Stamp.drawStampPreview(renderer.overlayCtx, coords.x, coords.y, activeStampId, 1.0);
    } else if (activeTool === 'step') {
      renderer.clearOverlay();
      const badgeRadius = Math.max(14, Math.min(26, Math.round(activeStrokeWidth * 3.5)));
      renderer.overlayCtx.save();
      renderer.overlayCtx.globalAlpha = 0.75;
      if (Badge && Badge.drawStepBadge) {
        Badge.drawStepBadge(renderer.overlayCtx, coords.x, coords.y, stepCounter, activeColor, badgeRadius);
      }
      renderer.overlayCtx.restore();
    } else if (activeTool === 'eraser') {
      renderer.clearOverlay();
      renderer.overlayCtx.save();
      renderer.overlayCtx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      renderer.overlayCtx.lineWidth = 2;
      renderer.overlayCtx.beginPath();
      renderer.overlayCtx.arc(coords.x, coords.y, 14, 0, Math.PI * 2);
      renderer.overlayCtx.stroke();
      renderer.overlayCtx.restore();
    }
  });

  overlayCanvas.addEventListener('mouseleave', () => {
    if (!isDrawing && (activeTool === 'stamp' || activeTool === 'step' || activeTool === 'eraser')) {
      renderer.clearOverlay();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    currentPos = renderer.getCanvasCoordinates(e);

    renderer.clearOverlay();

    if (activeTool === 'pen' && Pen) {
      penPath.push(currentPos);
      Pen.drawSmoothedPath(renderer.overlayCtx, penPath, activeColor, activeStrokeWidth, 1.0, false, activePenType);
    } else if (activeTool === 'highlighter' && Highlighter) {
      penPath.push(currentPos);
      Highlighter.drawHighlighter(renderer.overlayCtx, penPath, activeColor, activeStrokeWidth * 4, 0.45);
    } else if (activeTool === 'line' && Arrow) {
      Arrow.drawLine(renderer.overlayCtx, startPos.x, startPos.y, currentPos.x, currentPos.y, activeColor, activeStrokeWidth, activeLineDashed);
    } else if (activeTool === 'arrow' && Arrow) {
      Arrow.drawArrow(renderer.overlayCtx, startPos.x, startPos.y, currentPos.x, currentPos.y, activeColor, activeStrokeWidth, activeLineDashed, activeArrowMode === 'double', activeArrowCurved);
    } else if (activeTool === 'spotlight' && Spotlight) {
      Spotlight.drawSpotlightPreview(renderer.overlayCtx, startPos.x, startPos.y, currentPos.x, currentPos.y, activeSpotlightShape, activeColor, activeStrokeWidth, activeSpotlightDarkness);
    } else if (activeTool === 'magnifier' && Magnifier) {
      Magnifier.drawMagnifierPreview(renderer.overlayCtx, startPos.x, startPos.y, currentPos.x, currentPos.y, activeMagnifierZoom, baseImage || mainCanvas, activeColor, activeStrokeWidth);
    } else if (activeTool === 'rect' && Shapes) {
      Shapes.drawRect(renderer.overlayCtx, startPos.x, startPos.y, currentPos.x, currentPos.y, activeColor, activeStrokeWidth, activeLineDashed);
    } else if (activeTool === 'circle' && Shapes) {
      Shapes.drawCircle(renderer.overlayCtx, startPos.x, startPos.y, currentPos.x, currentPos.y, activeColor, activeStrokeWidth, activeLineDashed);
    } else if (activeTool === 'callout' && Text) {
      Text.drawCalloutPreview(renderer.overlayCtx, startPos.x, startPos.y, currentPos.x, currentPos.y, activeColor, activeStrokeWidth, activeCalloutStyle);
    } else if (activeTool === 'blur' && Blur) {
      Blur.drawBlurPreview(renderer.overlayCtx, startPos.x, startPos.y, currentPos.x, currentPos.y, activeBlurType);
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;
    currentPos = renderer.getCanvasCoordinates(e);

    renderer.clearOverlay();

    if (activeTool === 'pen' && penPath.length > 1) {
      pushAction({
        type: 'pen',
        points: [...penPath],
        color: activeColor,
        width: activeStrokeWidth,
        penType: activePenType
      });
    } else if (activeTool === 'highlighter' && penPath.length > 1) {
      pushAction({
        type: 'highlighter',
        points: [...penPath],
        color: activeColor,
        width: activeStrokeWidth * 4
      });
    } else if (activeTool === 'line') {
      const dist = Math.hypot(currentPos.x - startPos.x, currentPos.y - startPos.y);
      if (dist > 4) {
        pushAction({
          type: 'line',
          x1: startPos.x,
          y1: startPos.y,
          x2: currentPos.x,
          y2: currentPos.y,
          color: activeColor,
          width: activeStrokeWidth,
          dashed: activeLineDashed
        });
      }
    } else if (activeTool === 'arrow') {
      const dist = Math.hypot(currentPos.x - startPos.x, currentPos.y - startPos.y);
      if (dist > 5) {
        pushAction({
          type: 'arrow',
          x1: startPos.x,
          y1: startPos.y,
          x2: currentPos.x,
          y2: currentPos.y,
          color: activeColor,
          width: activeStrokeWidth,
          dashed: activeLineDashed,
          isDouble: activeArrowMode === 'double',
          isCurved: activeArrowCurved
        });
      }
    } else if (activeTool === 'spotlight') {
      const w = Math.abs(currentPos.x - startPos.x);
      const h = Math.abs(currentPos.y - startPos.y);
      if (w > 8 && h > 8) {
        pushAction({
          type: 'spotlight',
          x1: startPos.x,
          y1: startPos.y,
          x2: currentPos.x,
          y2: currentPos.y,
          shape: activeSpotlightShape,
          color: activeColor,
          width: activeStrokeWidth,
          darkness: activeSpotlightDarkness
        });
      }
    } else if (activeTool === 'magnifier') {
      const dist = Math.hypot(currentPos.x - startPos.x, currentPos.y - startPos.y);
      const radius = Math.max(35, Math.min(220, dist > 5 ? dist : 65));
      pushAction({
        type: 'magnifier',
        x: startPos.x,
        y: startPos.y,
        radius: radius,
        zoomFactor: activeMagnifierZoom,
        color: activeColor,
        width: activeStrokeWidth
      });
    } else if (activeTool === 'rect') {
      const w = Math.abs(currentPos.x - startPos.x);
      const h = Math.abs(currentPos.y - startPos.y);
      if (w > 4 && h > 4) {
        pushAction({
          type: 'rect',
          x1: startPos.x,
          y1: startPos.y,
          x2: currentPos.x,
          y2: currentPos.y,
          color: activeColor,
          width: activeStrokeWidth,
          dashed: activeLineDashed
        });
      }
    } else if (activeTool === 'circle') {
      const w = Math.abs(currentPos.x - startPos.x);
      const h = Math.abs(currentPos.y - startPos.y);
      if (w > 4 && h > 4) {
        pushAction({
          type: 'circle',
          x1: startPos.x,
          y1: startPos.y,
          x2: currentPos.x,
          y2: currentPos.y,
          color: activeColor,
          width: activeStrokeWidth,
          dashed: activeLineDashed
        });
      }
    } else if (activeTool === 'callout') {
      let tailX = startPos.x;
      let tailY = startPos.y;
      let bubbleX = currentPos.x;
      let bubbleY = currentPos.y;
      const dist = Math.hypot(bubbleX - tailX, bubbleY - tailY);
      if (dist < 10) {
        bubbleX = tailX + 80;
        bubbleY = tailY - 60;
      }
      pendingCallout = { tailX, tailY, bubbleX, bubbleY };
      openTextInput({ x: bubbleX, y: bubbleY }, e.clientX, e.clientY);
    } else if (activeTool === 'blur') {
      const w = Math.abs(currentPos.x - startPos.x);
      const h = Math.abs(currentPos.y - startPos.y);
      if (w > 4 && h > 4) {
        pushAction({
          type: 'blur',
          x1: startPos.x,
          y1: startPos.y,
          x2: currentPos.x,
          y2: currentPos.y,
          blurType: activeBlurType,
          intensity: activeBlurIntensity,
          rounded: true
        });
      }
    }
  });

  // Eraser Tool Live Hover Feedback
  overlayCanvas.addEventListener('mousemove', (e) => {
    if (activeTool === 'eraser' && !isDrawing && window.FullShotCanvas && window.FullShotCanvas.Eraser) {
      const hoverCoords = renderer.getCanvasCoordinates(e);
      const hitIdx = window.FullShotCanvas.Eraser.findHitActionIndex(hoverCoords.x, hoverCoords.y, history.getStack(), history.getIndex());
      renderer.clearOverlay();
      if (hitIdx !== -1) {
        window.FullShotCanvas.Eraser.drawHitHighlight(renderer.overlayCtx, history.getStack()[hitIdx]);
        window.FullShotCanvas.Eraser.drawEraserCursor(renderer.overlayCtx, hoverCoords.x, hoverCoords.y, true);
      } else {
        window.FullShotCanvas.Eraser.drawEraserCursor(renderer.overlayCtx, hoverCoords.x, hoverCoords.y, false);
      }
    }
  });

  overlayCanvas.addEventListener('mouseleave', () => {
    if (activeTool === 'eraser') {
      renderer.clearOverlay();
    }
  });

  // --- 5. TEXT OVERLAY INPUT ---
  function openTextInput(canvasCoords, screenX, screenY) {
    pendingTextPos = canvasCoords;

    const stageRect = canvasStage.getBoundingClientRect();
    const relLeft = (canvasCoords.x / mainCanvas.width) * stageRect.width;
    const relTop = (canvasCoords.y / mainCanvas.height) * stageRect.height;

    textInputContainer.style.left = `${Math.max(10, Math.min(stageRect.width - 240, relLeft))}px`;
    textInputContainer.style.top = `${Math.max(10, Math.min(stageRect.height - 100, relTop))}px`;
    textInputContainer.classList.remove('hidden');

    textInputField.value = '';
    textInputField.focus();
  }

  function closeTextInput() {
    if (textInputContainer) {
      textInputContainer.classList.add('hidden');
    }
    if (textInputField) {
      textInputField.value = '';
    }
    pendingTextPos = null;
    pendingCallout = null;
  }

  function applyText() {
    const text = textInputField.value.trim();
    if (text) {
      if (pendingCallout) {
        pushAction({
          type: 'callout',
          tailX: pendingCallout.tailX,
          tailY: pendingCallout.tailY,
          bubbleX: pendingCallout.bubbleX,
          bubbleY: pendingCallout.bubbleY,
          text,
          color: activeColor,
          width: activeStrokeWidth,
          fontSize: activeFontSize,
          style: activeCalloutStyle,
          hasBg: activeTextBg
        });
      } else if (pendingTextPos) {
        pushAction({
          type: 'text',
          text,
          x: pendingTextPos.x,
          y: pendingTextPos.y,
          fontSize: activeFontSize,
          color: activeColor,
          bgStyle: activeCalloutStyle === 'plain' ? false : activeCalloutStyle,
          hasBg: activeTextBg
        });
      }
    }
    closeTextInput();
  }

  if (textApplyBtn) textApplyBtn.addEventListener('click', applyText);
  if (textCancelBtn) textCancelBtn.addEventListener('click', closeTextInput);

  if (textInputField) {
    textInputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
        e.preventDefault();
        applyText();
      } else if (e.key === 'Escape') {
        closeTextInput();
      }
    });
  }

  // --- 6. ZOOM BUTTON LISTENERS ---
  if (zoomInBtn && zoomPan) {
    zoomInBtn.addEventListener('click', () => zoomPan.zoomTo(zoomPan.getScale() + 0.25));
  }
  if (zoomOutBtn && zoomPan) {
    zoomOutBtn.addEventListener('click', () => zoomPan.zoomTo(zoomPan.getScale() - 0.25));
  }
  if (zoomFitBtn && zoomPan) {
    zoomFitBtn.addEventListener('click', () => zoomPan.fitToScreen(mainCanvas.width));
  }
  if (zoomActualBtn && zoomPan) {
    zoomActualBtn.addEventListener('click', () => zoomPan.zoomTo(1.0));
  }

  // --- 7. TOAST NOTIFICATION ---
  let toastTimer = null;
  function showToast(title, message) {
    if (!toast) return;
    if (toastTitle) toastTitle.textContent = title;
    if (toastText) toastText.textContent = message;
    toast.classList.remove('hidden');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  // --- 8. CLEAN FILENAME GENERATOR ---
  function getFilename(extension) {
    if (window.FullShotImageExporter) {
      return window.FullShotImageExporter.getExportFilename(captureData?.title, extension);
    }
    const rawTitle = (captureData?.title || 'Ekran_Goruntusu')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `FullShot_${rawTitle}_${dateStr}.${extension}`;
  }

  // --- 9. COPY TO CLIPBOARD ---
  async function copyCanvasToClipboard(targetCanvas) {
    try {
      if (window.FullShotImageExporter) {
        await window.FullShotImageExporter.copyCanvasToClipboard(targetCanvas);
      } else {
        const blob = await new Promise(resolve => targetCanvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Blob oluşturulamadı.');
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
      }

      if (canvasStage) {
        canvasStage.classList.remove('stage-flash');
        void canvasStage.offsetWidth; // Force reflow
        canvasStage.classList.add('stage-flash');
      }

      showToast('Panoya Kopyalandı', 'Görüntüyü dilediğiniz yere (Ctrl+V) yapıştırabilirsiniz.');
      return true;
    } catch (err) {
      console.error('Kopyalama hatası:', err);
      showToast('Kopyalama Başarısız', err.message);
      return false;
    }
  }

  if (copyClipboardBtn) {
    copyClipboardBtn.addEventListener('click', async () => {
      const ok = await copyCanvasToClipboard(mainCanvas);
      if (ok) {
        copyClipboardBtn.classList.add('copied');
        setTimeout(() => copyClipboardBtn.classList.remove('copied'), 2200);
      }
    });
  }

  // --- 10. EXPORT & DOWNLOAD HELPERS (PNG / JPG / WEBP / PDF) ---
  if (downloadDropdownBtn && downloadMenu) {
    downloadDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = downloadMenu.classList.toggle('hidden');
      downloadDropdownBtn.parentElement.classList.toggle('active', !isHidden);
      downloadDropdownBtn.setAttribute('aria-expanded', String(!isHidden));
    });

    window.addEventListener('click', () => {
      downloadMenu.classList.add('hidden');
      downloadDropdownBtn.parentElement.classList.remove('active');
      downloadDropdownBtn.setAttribute('aria-expanded', 'false');
    });
  }

  function triggerBlobDownload(blob, filename) {
    if (window.FullShotImageExporter) {
      window.FullShotImageExporter.triggerBlobDownload(blob, filename);
      showToast('İndirme Başlatıldı', filename);
      return;
    }

    const blobUrl = URL.createObjectURL(blob);
    chrome.runtime.sendMessage({
      action: 'downloadImage',
      dataUrl: blobUrl,
      filename
    }, (res) => {
      if (res && res.success) {
        showToast('İndirme Başlatıldı', filename);
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Dosya İndirildi', filename);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    });
  }

  // PNG Export
  if (downloadPngBtn) {
    downloadPngBtn.addEventListener('click', async () => {
      try {
        const filename = getFilename('png');
        if (window.FullShotImageExporter) {
          await window.FullShotImageExporter.downloadCanvasAsImage(mainCanvas, 'png', 1.0, filename);
          showToast('İndirme Başlatıldı', filename);
        } else {
          mainCanvas.toBlob((blob) => {
            if (blob) triggerBlobDownload(blob, filename);
          }, 'image/png');
        }
      } catch (err) {
        showToast('PNG Hatası', err.message);
      }
    });
  }

  // JPG Export
  if (downloadJpgBtn) {
    downloadJpgBtn.addEventListener('click', async () => {
      try {
        const filename = getFilename('jpg');
        if (window.FullShotImageExporter) {
          await window.FullShotImageExporter.downloadCanvasAsImage(mainCanvas, 'jpg', 0.94, filename);
          showToast('İndirme Başlatıldı', filename);
        } else {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = mainCanvas.width;
          tempCanvas.height = mainCanvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.fillStyle = '#ffffff';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(mainCanvas, 0, 0);

          tempCanvas.toBlob((blob) => {
            if (blob) triggerBlobDownload(blob, filename);
          }, 'image/jpeg', 0.94);
        }
      } catch (err) {
        showToast('JPG Hatası', err.message);
      }
    });
  }

  // WebP Export
  if (downloadWebpBtn) {
    downloadWebpBtn.addEventListener('click', async () => {
      try {
        const filename = getFilename('webp');
        if (window.FullShotImageExporter) {
          await window.FullShotImageExporter.downloadCanvasAsImage(mainCanvas, 'webp', 0.95, filename);
          showToast('İndirme Başlatıldı', filename);
        } else {
          mainCanvas.toBlob((blob) => {
            if (blob) triggerBlobDownload(blob, filename);
          }, 'image/webp', 0.95);
        }
      } catch (err) {
        showToast('WebP Hatası', err.message);
      }
    });
  }

  // Single-Page PDF Export
  if (downloadSinglePdfBtn) {
    downloadSinglePdfBtn.addEventListener('click', async () => {
      try {
        showToast('PDF Hazırlanıyor', 'Tek sayfa PDF oluşturuluyor...');
        const filename = getFilename('pdf');
        if (window.FullShotPDF && window.FullShotPDF.generateSinglePagePDF) {
          const pdfBlob = await window.FullShotPDF.generateSinglePagePDF(mainCanvas, captureData?.title);
          triggerBlobDownload(pdfBlob, filename);
        } else {
          throw new Error('PDF modülü bulunamadı.');
        }
      } catch (err) {
        console.error('PDF hatası:', err);
        showToast('PDF Hatası', err.message);
      }
    });
  }

  // Multi-Page A4 PDF Export
  if (downloadMultiPdfBtn) {
    downloadMultiPdfBtn.addEventListener('click', async () => {
      try {
        showToast('A4 PDF Hazırlanıyor', 'Sayfalar A4 formatına bölünüyor...');
        const filename = getFilename('pdf');
        if (window.FullShotPDF && window.FullShotPDF.generateMultiPageA4PDF) {
          const pdfBlob = await window.FullShotPDF.generateMultiPageA4PDF(mainCanvas, captureData?.title, (curr, total) => {
            showToast('PDF İşleniyor', `Sayfa ${curr} / ${total} oluşturuluyor...`);
          });
          triggerBlobDownload(pdfBlob, filename);
        } else {
          throw new Error('PDF modülü bulunamadı.');
        }
      } catch (err) {
        console.error('A4 PDF hatası:', err);
        showToast('PDF Hatası', err.message);
      }
    });
  }

  // --- ACCESSIBLE FOCUS TRAP CONTROLLER ---
  function createFocusTrap(modalElement, onCloseCallback) {
    let previousActiveElement = null;

    function getFocusableElements() {
      return Array.from(modalElement.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(el => {
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
      });
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = getFocusableElements();
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modalElement.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalElement.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    function open(triggerEl = null) {
      previousActiveElement = triggerEl || document.activeElement;
      modalElement.classList.remove('hidden');
      modalElement.setAttribute('aria-hidden', 'false');
      document.addEventListener('keydown', handleKeyDown, true);

      requestAnimationFrame(() => {
        const focusables = getFocusableElements();
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          modalElement.focus();
        }
      });
    }

    function close() {
      modalElement.classList.add('hidden');
      modalElement.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', handleKeyDown, true);

      if (onCloseCallback) {
        onCloseCallback();
      }

      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    }

    function isOpen() {
      return !modalElement.classList.contains('hidden');
    }

    return { open, close, isOpen, handleKeyDown };
  }

  // --- 11. ADVANCED 3D MOCKUP & DEVICE FRAME STUDIO CONTROLLER ---
  function updateMockupPreview() {
    if (!mockupPreviewCanvas || !mainCanvas) return;
    if (window.FullShotMockup) {
      window.FullShotMockup.renderMockupPreview(mainCanvas, mockupPreviewCanvas, {
        ...mockupConfig,
        title: captureData?.title || captureData?.url
      });
    } else if (renderer && renderer.generateMockupCanvas) {
      const rendered = renderer.generateMockupCanvas(mainCanvas, mockupConfig, captureData);
      if (rendered) {
        mockupPreviewCanvas.width = rendered.width;
        mockupPreviewCanvas.height = rendered.height;
        const pCtx = mockupPreviewCanvas.getContext('2d');
        pCtx.imageSmoothingEnabled = true;
        pCtx.imageSmoothingQuality = 'high';
        pCtx.drawImage(rendered, 0, 0);
      }
    }
  }

  function updateTiltUI(x, y) {
    const tiltX = Math.max(-25, Math.min(25, parseInt(x, 10) || 0));
    const tiltY = Math.max(-25, Math.min(25, parseInt(y, 10) || 0));

    mockupConfig.tiltX = tiltX;
    mockupConfig.tiltY = tiltY;

    if (tiltXRange) tiltXRange.value = tiltX;
    if (tiltYRange) tiltYRange.value = tiltY;
    if (tiltXNum) tiltXNum.textContent = `${tiltX}°`;
    if (tiltYNum) tiltYNum.textContent = `${tiltY}°`;
    if (tiltValueText) tiltValueText.textContent = `X: ${tiltX}° | Y: ${tiltY}°`;

    // Update 2D Joystick Puck Position
    if (tiltPuckHandle) {
      const maxOffset = 26; // px radius in trackpad
      const normX = (tiltY / 25) * maxOffset;
      const normY = (-tiltX / 25) * maxOffset;
      tiltPuckHandle.style.transform = `translate(calc(-50% + ${normX}px), calc(-50% + ${normY}px))`;
    }

    // Sync Active Tilt Preset state
    tiltPresetBtns.forEach(btn => {
      const px = parseInt(btn.dataset.tiltx, 10);
      const py = parseInt(btn.dataset.tilty, 10);
      if (px === tiltX && py === tiltY) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    updateMockupPreview();
  }

  // Interactive 3D Tilt Joystick Trackpad
  let isPuckDragging = false;

  function handlePuckMove(e) {
    if (!tiltPuckTrack) return;
    const rect = tiltPuckTrack.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const deltaY = (e.clientY - centerY) / (rect.height / 2);

    const clampedX = Math.max(-1, Math.min(1, deltaX));
    const clampedY = Math.max(-1, Math.min(1, deltaY));

    const newTiltY = Math.round(clampedX * 25);
    const newTiltX = Math.round(-clampedY * 25);

    updateTiltUI(newTiltX, newTiltY);
  }

  if (tiltPuckTrack) {
    tiltPuckTrack.addEventListener('mousedown', (e) => {
      isPuckDragging = true;
      handlePuckMove(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isPuckDragging) {
        handlePuckMove(e);
      }
    });

    window.addEventListener('mouseup', () => {
      if (isPuckDragging) {
        isPuckDragging = false;
      }
    });
  }

  // Tilt Sliders
  if (tiltXRange) {
    tiltXRange.addEventListener('input', (e) => {
      updateTiltUI(e.target.value, mockupConfig.tiltY);
    });
  }

  if (tiltYRange) {
    tiltYRange.addEventListener('input', (e) => {
      updateTiltUI(mockupConfig.tiltX, e.target.value);
    });
  }

  // Quick Tilt Presets
  tiltPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const px = parseInt(btn.dataset.tiltx, 10) || 0;
      const py = parseInt(btn.dataset.tilty, 10) || 0;
      updateTiltUI(px, py);
    });
  });

  // Device Frame Switcher
  mockupFrameBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      mockupFrameBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');

      const frame = btn.dataset.frame;
      mockupConfig.frameType = frame;

      const frameNames = {
        macos: 'macOS Window',
        iphone16pro: 'iPhone 16 Pro',
        safari: 'Safari Browser',
        glass: 'Minimalist Glass',
        none: 'Çerçevesiz (Düz)'
      };
      if (activeFrameLabel) activeFrameLabel.textContent = frameNames[frame] || frame;

      // Adjust Header checkbox visibility for frames without titlebars
      if (mockupHeaderToggleWrap) {
        if (frame === 'iphone16pro' || frame === 'glass' || frame === 'none') {
          mockupHeaderToggleWrap.style.opacity = '0.4';
          mockupHeaderToggleWrap.style.pointerEvents = 'none';
        } else {
          mockupHeaderToggleWrap.style.opacity = '1';
          mockupHeaderToggleWrap.style.pointerEvents = 'auto';
        }
      }

      updateMockupPreview();
    });
  });

  // Social Media Aspect Ratio Presets
  mockupRatioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      mockupRatioBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');

      mockupConfig.aspectRatio = btn.dataset.ratio;
      if (mockupRatioBadge) {
        mockupRatioBadge.textContent = btn.textContent;
      }
      updateMockupPreview();
    });
  });

  // Ultra-HD Mesh Gradient Themes
  mockupThemeCards.forEach(card => {
    card.addEventListener('click', () => {
      mockupThemeCards.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('active');
      card.setAttribute('aria-checked', 'true');

      mockupConfig.theme = card.dataset.theme;
      if (activeThemeLabel) {
        activeThemeLabel.textContent = card.dataset.name || card.dataset.theme;
      }
      updateMockupPreview();
    });
  });

  // Padding Options
  mockupPaddingBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      mockupPaddingBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      mockupConfig.padding = parseInt(btn.dataset.padding, 10);
      updateMockupPreview();
    });
  });

  // Shadow Options
  mockupShadowBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      mockupShadowBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      mockupConfig.shadow = btn.dataset.shadow;
      updateMockupPreview();
    });
  });

  // Film Grain Toggle
  if (mockupGrainCheckbox) {
    mockupGrainCheckbox.addEventListener('change', () => {
      mockupConfig.enableGrain = mockupGrainCheckbox.checked;
      updateMockupPreview();
    });
  }

  // Window Header Toggle
  if (mockupHeaderCheckbox) {
    mockupHeaderCheckbox.addEventListener('change', () => {
      mockupConfig.hasHeader = mockupHeaderCheckbox.checked;
      updateMockupPreview();
    });
  }

  // Modal Focus Trap & Open / Close
  let mockupTrap = null;
  if (mockupModal) {
    mockupTrap = createFocusTrap(mockupModal);

    if (mockupBtn) {
      mockupBtn.addEventListener('click', () => {
        mockupTrap.open(mockupBtn);
        updateTiltUI(mockupConfig.tiltX, mockupConfig.tiltY);
        updateMockupPreview();
      });
    }

    if (closeMockupBtn) {
      closeMockupBtn.addEventListener('click', () => {
        mockupTrap.close();
      });
    }

    mockupModal.addEventListener('click', (e) => {
      if (e.target === mockupModal) {
        mockupTrap.close();
      }
    });
  }

  // Export Actions
  if (downloadMockupPngBtn) {
    downloadMockupPngBtn.addEventListener('click', async () => {
      const rendered = window.FullShotMockup
        ? window.FullShotMockup.generateMockupCanvas(mainCanvas, { ...mockupConfig, title: captureData?.title || captureData?.url })
        : (renderer?.generateMockupCanvas(mainCanvas, mockupConfig, captureData));
      if (!rendered) return;
      const filename = getFilename('mockup.png');
      if (window.FullShotImageExporter) {
        await window.FullShotImageExporter.downloadCanvasAsImage(rendered, 'png', 1.0, filename);
        showToast('Mockup İndirildi', filename);
      } else {
        rendered.toBlob((blob) => {
          if (blob) triggerBlobDownload(blob, filename);
        }, 'image/png');
      }
    });
  }

  if (downloadMockupWebpBtn) {
    downloadMockupWebpBtn.addEventListener('click', async () => {
      const rendered = window.FullShotMockup
        ? window.FullShotMockup.generateMockupCanvas(mainCanvas, { ...mockupConfig, title: captureData?.title || captureData?.url })
        : (renderer?.generateMockupCanvas(mainCanvas, mockupConfig, captureData));
      if (!rendered) return;
      const filename = getFilename('mockup.webp');
      if (window.FullShotImageExporter) {
        await window.FullShotImageExporter.downloadCanvasAsImage(rendered, 'webp', 0.95, filename);
        showToast('Mockup İndirildi', filename);
      } else {
        rendered.toBlob((blob) => {
          if (blob) triggerBlobDownload(blob, filename);
        }, 'image/webp', 0.95);
      }
    });
  }

  if (copyMockupClipboardBtn) {
    copyMockupClipboardBtn.addEventListener('click', async () => {
      const rendered = window.FullShotMockup
        ? window.FullShotMockup.generateMockupCanvas(mainCanvas, { ...mockupConfig, title: captureData?.title || captureData?.url })
        : (renderer?.generateMockupCanvas(mainCanvas, mockupConfig, captureData));
      if (!rendered) return;
      await copyCanvasToClipboard(rendered);
    });
  }

  // --- 12. WATERMARK & STAMP MODAL HANDLERS ---
  let watermarkTrap = null;
  if (watermarkModal) {
    watermarkTrap = createFocusTrap(watermarkModal);

    if (watermarkBtn) {
      watermarkBtn.addEventListener('click', () => {
        if (wmCustomTextInput && (!wmCustomTextInput.value || wmCustomTextInput.value === '')) {
          wmCustomTextInput.value = captureData?.url || 'https://fullshot.app';
        }
        watermarkTrap.open(watermarkBtn);
      });
    }

    if (closeWatermarkBtn) {
      closeWatermarkBtn.addEventListener('click', () => {
        watermarkTrap.close();
      });
    }

    if (wmCancelBtn) {
      wmCancelBtn.addEventListener('click', () => {
        watermarkTrap.close();
      });
    }

    watermarkModal.addEventListener('click', (e) => {
      if (e.target === watermarkModal) {
        watermarkTrap.close();
      }
    });
  }

  // Watermark Presets
  if (wmPresetUrl && wmCustomTextInput) {
    wmPresetUrl.addEventListener('click', () => {
      const presets = window.FullShotWatermark ? window.FullShotWatermark.getWatermarkPresets(captureData?.url) : null;
      wmCustomTextInput.value = presets ? presets.url : (captureData?.url || 'https://fullshot.app');
      showToast('Şablon Seçildi', 'Web URL damgası yerleştirildi.');
    });
  }

  if (wmPresetDate && wmCustomTextInput) {
    wmPresetDate.addEventListener('click', () => {
      const presets = window.FullShotWatermark ? window.FullShotWatermark.getWatermarkPresets(captureData?.url) : null;
      if (presets) {
        wmCustomTextInput.value = presets.date;
      } else {
        const now = new Date();
        const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        wmCustomTextInput.value = `📅 ${dateStr} ${timeStr}`;
      }
      showToast('Şablon Seçildi', 'Tarih & Saat damgası seçildi.');
    });
  }

  if (wmPresetBrand && wmCustomTextInput) {
    wmPresetBrand.addEventListener('click', () => {
      const presets = window.FullShotWatermark ? window.FullShotWatermark.getWatermarkPresets(captureData?.url) : null;
      wmCustomTextInput.value = presets ? presets.brand : '⚡ FullShot Pro';
      showToast('Şablon Seçildi', 'FullShot Pro marka damgası seçildi.');
    });
  }

  if (wmPresetConfidential && wmCustomTextInput) {
    wmPresetConfidential.addEventListener('click', () => {
      const presets = window.FullShotWatermark ? window.FullShotWatermark.getWatermarkPresets(captureData?.url) : null;
      wmCustomTextInput.value = presets ? presets.confidential : '🔒 GİZLİ / CONFIDENTIAL';
      if (wmPositionSelect) wmPositionSelect.value = 'center';
      if (wmStyleSelect) wmStyleSelect.value = 'diagonal';
      showToast('Şablon Seçildi', 'Gizli / Draft filigranı seçildi.');
    });
  }

  // Watermark Apply Action
  if (wmApplyBtn && watermarkModal) {
    wmApplyBtn.addEventListener('click', () => {
      const text = wmCustomTextInput ? wmCustomTextInput.value.trim() : '';
      if (!text) {
        showToast('Metin Gerekli', 'Lütfen bir damga veya filigran metni girin.');
        return;
      }

      const position = wmPositionSelect ? wmPositionSelect.value : 'bottom-right';
      const style = wmStyleSelect ? wmStyleSelect.value : 'pill';

      pushAction({
        type: 'watermark',
        text,
        position,
        style
      });

      if (watermarkTrap) watermarkTrap.close();
      showToast('Damga Eklendi', 'Filigran tuval üzerine işlendi.');
    });
  }

  // --- 14. AUTO-CENSOR ENGINE ACTION ---
  if (autoCensorBtn) {
    autoCensorBtn.addEventListener('click', async () => {
      if (AutoCensorEngine && AutoCensorEngine.autoCensorCanvas) {
        showToast('Otomatik Tarama', 'Sayfadaki hassas veriler taranıyor...');
        const res = await AutoCensorEngine.autoCensorCanvas({
          ctx: renderer.mainCtx,
          pushAction,
          canvas: mainCanvas,
          captureData,
          blurType: activeBlurType
        });
        if (res && res.count > 0) {
          showToast('Sansürleme Tamamlandı', res.summary);
        } else {
          setActiveTool('blur');
          showToast('Sansür Aracı Aktif', 'Mozaiklemek istediğiniz alanın üzerine fareyle kutu çizin.');
        }
      }
    });
  }

  // --- 13. KEYBOARD SHORTCUTS & MODAL ---
  let shortcutsTrap = null;
  if (shortcutsModal) {
    shortcutsTrap = createFocusTrap(shortcutsModal);

    if (shortcutsBtn) {
      shortcutsBtn.addEventListener('click', () => {
        shortcutsTrap.open(shortcutsBtn);
      });
    }

    if (closeShortcutsBtn) {
      closeShortcutsBtn.addEventListener('click', () => {
        shortcutsTrap.close();
      });
    }

    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) {
        shortcutsTrap.close();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    const isTextInputFocused = document.activeElement === textInputField || (wmCustomTextInput && document.activeElement === wmCustomTextInput);

    if (isTextInputFocused) {
      if (e.key === 'Escape') {
        closeTextInput();
      }
      return;
    }

    // Modal Escape handling
    if (e.key === 'Escape') {
      if (shortcutsTrap && shortcutsTrap.isOpen()) {
        shortcutsTrap.close();
        return;
      }
      if (mockupTrap && mockupTrap.isOpen()) {
        mockupTrap.close();
        return;
      }
      if (watermarkTrap && watermarkTrap.isOpen()) {
        watermarkTrap.close();
        return;
      }
      if (downloadMenu && !downloadMenu.classList.contains('hidden')) {
        downloadMenu.classList.add('hidden');
        downloadDropdownBtn?.parentElement.classList.remove('active');
        downloadDropdownBtn?.setAttribute('aria-expanded', 'false');
        downloadDropdownBtn?.focus();
        return;
      }
      closeTextInput();
      return;
    }

    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      if (shortcutsTrap) {
        if (shortcutsTrap.isOpen()) {
          shortcutsTrap.close();
        } else {
          shortcutsTrap.open(shortcutsBtn);
        }
      }
      return;
    }

    // Shift + B -> Auto Censor
    if (e.shiftKey && (e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (autoCensorBtn) autoCensorBtn.click();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      if (!window.getSelection().toString()) {
        e.preventDefault();
        if (copyClipboardBtn) copyClipboardBtn.click();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (downloadPngBtn) downloadPngBtn.click();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      if (downloadSinglePdfBtn) downloadSinglePdfBtn.click();
    } else if (e.key === 'v' || e.key === 'V') {
      setActiveTool('select');
    } else if (e.key === 'f' || e.key === 'F') {
      setActiveTool('spotlight');
    } else if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey) {
      setActiveTool('magnifier');
    } else if (e.key === 'e' || e.key === 'E') {
      setActiveTool('eraser');
    } else if (e.key === 'k' || e.key === 'K') {
      setActiveTool('stamp');
    } else if (e.key === 'm' || e.key === 'M') {
      if (mockupTrap) {
        if (mockupTrap.isOpen()) {
          mockupTrap.close();
        } else {
          mockupTrap.open(mockupBtn);
          updateMockupPreview();
        }
      }
    } else if (e.key === 'w' || e.key === 'W') {
      if (watermarkTrap) {
        if (watermarkTrap.isOpen()) {
          watermarkTrap.close();
        } else {
          if (wmCustomTextInput && (!wmCustomTextInput.value || wmCustomTextInput.value === '')) {
            wmCustomTextInput.value = captureData?.url || 'https://fullshot.app';
          }
          watermarkTrap.open(watermarkBtn);
        }
      }
    } else if (e.key === 'q' || e.key === 'Q') {
      setActiveTool('callout');
    } else if (e.key === 'p' || e.key === 'P') {
      setActiveTool('pen');
    } else if (e.key === 'l' || e.key === 'L') {
      setActiveTool('line');
    } else if (e.key === 'h' || e.key === 'H') {
      setActiveTool('highlighter');
    } else if (e.key === 'a' || e.key === 'A') {
      setActiveTool('arrow');
    } else if (e.key === 'r' || e.key === 'R') {
      setActiveTool('rect');
    } else if (e.key === 'c' || e.key === 'C') {
      setActiveTool('circle');
    } else if (e.key === 's' || e.key === 'S') {
      setActiveTool('step');
    } else if (e.key === 'b' || e.key === 'B') {
      setActiveTool('blur');
    } else if (e.key === 't' || e.key === 'T') {
      setActiveTool('text');
    } else if (e.key === 'i' || e.key === 'I') {
      if (colorPicker) {
        colorPicker.activateEyeDropper(mainCanvas);
      }
    } else if (e.key === '+' || e.key === '=') {
      if (zoomPan) zoomPan.zoomTo(zoomPan.getScale() + 0.25);
    } else if (e.key === '-') {
      if (zoomPan) zoomPan.zoomTo(zoomPan.getScale() - 0.25);
    } else if (e.key === '0') {
      if (zoomPan) zoomPan.fitToScreen(mainCanvas.width);
    }
  });
});

