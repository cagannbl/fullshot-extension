# AGENTS.md - Developer & AI Assistant Guide

This document is the **single source of truth** for AI assistants (Antigravity, Claude, Cursor, Copilot, ChatGPT) and software engineers modifying, maintaining, or adding features to the **FullShot Pro** Chrome Extension.

---

## 🧭 1. Complete Architectural Map & Responsibilities

```
c:\Users\cagan\Desktop\chrome ss\
├── manifest.json                            # Manifest V3 entry point, permissions, commands & web resources
├── package.json                             # Tooling scripts (npm test / npm run validate / npm run build:zip)
├── README.md                                # Human-facing introduction & features overview
├── AGENTS.md                                # AI Assistant & Developer Guidelines (this file)
├── ARCHITECTURE.md                          # System flow diagrams & detailed technical specs
│
├── assets/                                  # Static binary assets
│   ├── branding/                            # SVG logos, headers, banners
│   │   ├── fullshot-logo.svg
│   │   └── fullshot-header-logo.png
│   └── icons/                               # High-DPI extension icons (16, 32, 48, 128px PNG)
│
├── dist/                                    # Distribution build output
│   └── FullShot-Pro-Extension.zip           # Compiled release package for Chrome Web Store
│
├── scripts/                                 # Developer & CI/CD automation scripts
│   ├── validate.js                          # 126+ check zero-dependency syntax & link integrity runner
│   ├── package-zip.js                       # Production zip bundle packager
│   └── browser-test.js                      # Headless Chromium browser automation test runner
│
└── src/                                     # Modulated application source code
    ├── background/
    │   └── background.js                    # Service Worker: capture coordinator, keep-alive, state machine
    │
    ├── content/                             # Injected content scripts & in-page HUDs
    │   ├── content.js                       # Main coordinator: message routing, host registrations, shortcuts
    │   │
    │   ├── capture/                         # DOM measuring & scroll stitching engine
    │   │   ├── dom-measurer.js              # True scrollHeight, client dimensions, DPR, infinite scroll
    │   │   ├── scroll-stitcher.js           # Multi-step scroll stitching, layout shift padding, slice drawing
    │   │   └── sticky-filter.js             # Smart top-docked navbar filter (rect.top <= 2)
    │   │
    │   └── hud/                             # In-Page Shadow DOM v1 Isolated HUD Components
    │       ├── area-selector.js             # Crosshair crop box, 8x loupe, live HEX/RGB color picker ('C')
    │       ├── camera-bubble.js             # Draggable webcam overlay, 3 sizes, mirror, neon Audio Halo Meter
    │       ├── countdown-hud.js             # In-tab 3.. 2.. 1.. recording countdown timer HUD
    │       ├── cursor-effects.js            # Click shockwaves (blue/red), cursor focus spotlight (Alt+Shift+S)
    │       ├── element-picker.js            # Interactive DOM hover outline & 1-click element capture
    │       ├── pin-window.js                # Pin capture to screen, opacity slider (%10-%100), Document PiP
    │       ├── pixel-ruler.js               # Figma-style distance ruler (Alt+Shift+R), CSS dimension inspector
    │       ├── progress-hud.js              # Full-page scroll capture percentage progress bar
    │       ├── quick-bar-hud.js             # Boundary-aware floating quick action bar (Copy, Download, OCR, Studio)
    │       ├── recording-bar.js             # Draggable floating video recording toolbar with live timer
    │       └── toast-hud.js                 # In-page shortcut feedback & action notification toast
    │
    ├── offscreen/                           # Hidden MV3 offscreen document for media processing
    │   ├── offscreen.html                   # Offscreen container loading shared DB & offscreen engine
    │   └── offscreen.js                     # MediaRecorder, Web Audio mixer (mic+tab), DSP noise filters, OCR
    │
    ├── pages/                               # User Interface Views
    │   ├── popup/                           # Extension toolbar popup menu
    │   │   ├── popup.html
    │   │   ├── popup.css                    # 4-color palette, 12-16px radius, zero-scrollbar
    │   │   └── popup.js                     # Capture triggers, countdown, video mode switch, ruler trigger
    │   │
    │   ├── image-studio/                    # Advanced 2D/3D Canvas Markup & Export Studio
    │   │   ├── image-studio.html            # Main markup studio markup & modals (3D Mockup, Watermark, Shortcuts)
    │   │   ├── image-studio.css             # Fixed 250px sidebar, centered stage, zero-scrollbar
    │   │   ├── image-studio.js              # Coordinator: tools dispatcher, layer rendering, zoom/pan events
    │   │   │
    │   │   ├── engine/                      # Core Canvas Micro-Engines
    │   │   │   ├── auto-censor-engine.js    # Regex & Luhn Mod-10 DLP auto-censor (credit cards, emails, API keys)
    │   │   │   ├── canvas-renderer.js       # Dual-layer 2D canvas, Retina scaling, parametric action stack
    │   │   │   ├── history-stack.js         # Lightweight memory-safe ActionStack (<500 KB for 50 steps)
    │   │   │   └── zoom-pan.js              # Space+Drag panning, cursor-centered 10%-500% zoom
    │   │   │
    │   │   ├── export/                      # Serialization & Beautifier Exporters
    │   │   │   ├── image-exporter.js        # PNG HD, JPG, WebP downloads & native ClipboardItem API
    │   │   │   ├── mockup-beautifier.js     # 3D isometric tilt (-25°..+25°), iPhone 16 Pro, Safari, macOS, 6 mesh themes
    │   │   │   ├── pdf-generator.js         # Zero-dependency pure JS PDF 1.4 builder with UTF-8 Turkish support
    │   │   │   └── watermark.js             # Timestamp, URL, brand, confidential watermark stamps
    │   │   │
    │   │   └── tools/                       # Vector Drawing & Annotation Tools
    │   │       ├── arrow.js                 # Straight & 3-point curved Bézier arrows, single/double heads
    │   │       ├── badge.js                 # Auto-incrementing step counter badges (#1, #2, #3...)
    │   │       ├── blur.js                  # 3-Pass Gaussian blur & weighted RGB true-pixelate censor
    │   │       ├── color-picker.js          # Color picker helper & palette synchronizer
    │   │       ├── eraser.js                # Vector element remover & history modifier
    │   │       ├── highlighter.js           # Multiply blend mode smooth translucent highlighter
    │   │       ├── magnifier.js             # Circular glass magnifier lens (1.5x - 4.0x) with 3D glare
    │   │       ├── pen.js                   # Quadratic Bézier smoothed freehand brush with jitter filter
    │   │       ├── shapes.js                # Solid & dashed rectangles and ellipses
    │   │       ├── spotlight.js             # Evenodd inverse masking darkener (65%) with neon focus frame ('F')
    │   │       ├── stamp.js                 # QA badges ([APPROVED], [BUG]), 3D keycaps ([Ctrl]), emojis ('E')
    │   │       └── text.js                  # Speech bubble, thought cloud, frosted glass card, plain text
    │   │
    │   └── video-studio/                    # Video Preview, Trimming & Screen Recording Studio
    │       ├── video-studio.html            # Video player, timeline scrubber, trimming handles
    │       ├── video-studio.css             # Dark theme, video controls, audio visualizer styling
    │       ├── video-studio.js              # HTML5 video controls, timeline In/Out trim, WebM duration patch
    │       └── export/
    │           └── gif-exporter.js          # Pure JS Median-Cut + LZW animated GIF encoder
    │
    └── shared/                              # Reusable cross-boundary utilities
        ├── constants.js                     # Message actions, storage keys, ports, default options
        └── db.js                            # FullShotMediaDB v2: IndexedDB for captures & recordings
```

---

## ⚡ 2. Feature-to-Module Quick Lookup

| Feature / Capability | Primary Source Files |
|---|---|
| **Full Page Stitching** | `src/content/capture/scroll-stitcher.js`, `src/content/capture/dom-measurer.js` |
| **8x Loupe & Color Picker** | `src/content/hud/area-selector.js` (<kbd>C</kbd> copies HEX color) |
| **Tarayıcı İçi OCR (Text Recognition)** | `src/offscreen/offscreen.js`, `src/content/hud/quick-bar-hud.js` |
| **Pin to Screen (Document PiP)** | `src/content/hud/pin-window.js` |
| **Figma-Style Pixel Ruler** | `src/content/hud/pixel-ruler.js` (<kbd>Alt+Shift+R</kbd>) |
| **3D Isometric Tilt Mockups** | `src/pages/image-studio/export/mockup-beautifier.js` |
| **Device Frames (iPhone 16 Pro / Safari)** | `src/pages/image-studio/export/mockup-beautifier.js` |
| **Akıllı Otomatik Sansür (DLP / Auto-Censor)** | `src/pages/image-studio/engine/auto-censor-engine.js` (<kbd>Shift+B</kbd>) |
| **Spotlight Odak Vurgusu** | `src/pages/image-studio/tools/spotlight.js` (<kbd>F</kbd>) |
| **Cam Büyüteç Merceği** | `src/pages/image-studio/tools/magnifier.js` (<kbd>Z</kbd>) |
| **QA Damgaları & 3D Tuşlar** | `src/pages/image-studio/tools/stamp.js` (<kbd>E</kbd>) |
| **Webcam Baloncuğu & Audio Halo** | `src/content/hud/camera-bubble.js` |
| **Fare Tıklama Dalgaları & Spot** | `src/content/hud/cursor-effects.js` (<kbd>Alt+Shift+S</kbd>) |
| **Animasyonlu GIF İhracı** | `src/pages/video-studio/export/gif-exporter.js` |
| **DSP Gürültü Filtreleri (High-Pass/Notch)** | `src/offscreen/offscreen.js` (85Hz High-Pass + 50Hz/60Hz Notch) |
| **IndexedDB Depolama** | `src/shared/db.js` (`FullShotMediaDB` v2) |
| **Service Worker Keep-Alive** | `src/background/background.js` (Port: `keepAlive-recording`) |

---

## 🎨 3. Design System & Styling Rules

When creating or modifying UI elements in Popup, Content Scripts, or Studios, **ALWAYS** follow these rules:

### A. 4-Color Palette:
- **`#4A4A4A`** (Dark Charcoal / Antrasit): Main card & container backgrounds (`--bg-card`)
- **`#CBCBCB`** (Silver Gray): Secondary text, labels, subtle borders (`--text-muted`)
- **`#FFFFE3`** (Warm Ivory Cream): Primary text, headings, white accents (`--text-primary`)
- **`#6D8196`** (Slate Blue): Primary interactive accent, active/hover states (`--primary`)

### B. Geometry & Feel:
- **Rounded Corners**: Use `border-radius: 12px` for cards/buttons, `16px` for outer window cards.
- **Scrollbars**: Universal zero-scrollbar styling (`scrollbar-width: none !important; ::-webkit-scrollbar { display: none !important; }`).
- **Typography**: Clean modern sans-serif (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`).

---

## 🛡️ 4. Critical Engineering Guardrails

1. **GPU Reflow & Double rAF for Captures**:
   - Before taking any `captureVisibleTab` screenshot where an in-page element was just hidden, **ALWAYS** enforce a reflow (`void el.offsetHeight`) followed by `await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))` plus a short `50ms` delay. This prevents Chromium's compositor from capturing ghost UI elements.
2. **Canvas Dimension Limits (Blink Safety)**:
   - Max single dimension: `16384px`. Max total canvas area: `16384 * 8192 (~134M pixels)`.
   - If a webpage exceeds this, content.js safely scales down slices to prevent browser tab crashes.
3. **Shadow DOM Isolation**:
   - In-page tools (`#__fullshot_hud_host__`, `#__fullshot_pin_host__`, `#__fullshot_ruler_host__`, `#__fullshot_camera_host__`, `#__fullshot_cursor_host__`, etc.) **MUST** use `attachShadow({ mode: 'open' })` with `all: initial !important` to ensure host page CSS never corrupts the extension UI.
4. **Offscreen Lifecycle & Keep-Alive**:
   - Offscreen documents in MV3 are created on demand via `chrome.offscreen.createDocument` with reason `USER_MEDIA` or `DISPLAY_MEDIA` and closed when idle.
   - Long recordings use `chrome.runtime.connect({ name: 'keepAlive-recording' })` with 12s heartbeat pings to prevent the MV3 30s Service Worker idle shutdown.

---

## 🧪 5. Automated Validation & Packaging

Whenever you make any changes to JavaScript, HTML, CSS, or manifest files, **ALWAYS** run:

```bash
npm test
# or
node scripts/validate.js
```
All 126+ checks must output green `✔` before considering any task complete.

To compile the release distribution zip:
```bash
npm run build:zip
# or
node scripts/package-zip.js
```
The output file is generated at `dist/FullShot-Pro-Extension.zip`.
