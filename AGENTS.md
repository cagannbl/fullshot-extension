# AGENTS.md - Developer & AI Assistant Guide

This document is the **single source of truth** for AI assistants (Antigravity, Claude, Cursor, Copilot, ChatGPT) and software engineers modifying, maintaining, or adding features to the **FullShot Pro** Chrome Extension.

---

## 🧭 1. Architectural Map & Responsibilities

```
c:\Users\cagan\Desktop\chrome ss\
├── manifest.json                  # Manifest V3 entry point & permissions
├── package.json                   # Tooling scripts (npm test / npm run validate)
├── README.md                      # Human-facing introduction & setup
├── AGENTS.md                      # AI Assistant & Developer Guidelines (this file)
├── ARCHITECTURE.md                # System flow diagrams & detailed technical specs
│
├── assets/                        # Static binary assets
│   ├── branding/                  # Logos, banners, hero illustrations
│   └── icons/                     # Extension icons (16, 32, 48, 128px)
│
├── scripts/                       # Developer & CI/CD automation scripts
│   ├── validate.js                # Zero-dependency syntax & link integrity runner
│   └── package-zip.js             # Web store distribution packager
│
└── src/                           # Modulated application source code
    ├── background/
    │   └── background.js          # Service Worker: capture coordinator, state machine, tabs
    ├── content/
    │   └── content.js             # Injected content script: DOM measuring, smooth scrolling, HUD, crop
    ├── offscreen/
    │   ├── offscreen.html         # Hidden offscreen document container for audio/video recording
    │   └── offscreen.js           # MediaRecorder, Web Audio mixing (mic + system tab), chunk store
    ├── pages/                     # User Interface Views
    │   ├── popup/                 # Extension toolbar popup menu
    │   │   ├── popup.html
    │   │   ├── popup.css          # Slate/Charcoal 4-color palette, 12-16px radius, zero-scrollbar
    │   │   └── popup.js           # Mode switching, countdown, trigger dispatch
    │   ├── image-studio/          # Image preview, markup tools, blur censorship, PDF generator
    │   │   ├── image-studio.html
    │   │   ├── image-studio.css
    │   │   ├── image-studio.js    # Canvas engine, shape drawers, zoom/pan, export handlers
    │   │   └── pdf-generator.js   # Single & Multi-page A4 PDF builder
    │   └── video-studio/          # Video preview, trimming & export studio
    │       ├── video-studio.html
    │       ├── video-studio.css
    │       └── video-studio.js    # HTML5 video controls, frame scrubber, WebM/MP4 exporter
    └── shared/                    # Reusable cross-boundary utilities
        ├── constants.js           # Centralized message actions, storage keys, default options
        └── db.js                  # IndexedDB persistence layer for recordings and captures
```

---

## ⚡ 2. Message Passing Protocol

All cross-context communication uses `chrome.runtime.sendMessage` and `chrome.runtime.onMessage`.
Constants are defined in `src/shared/constants.js`.

### Common Message Actions:
| Action | Sender | Receiver | Purpose |
|---|---|---|---|
| `captureVisibleTab` | Content / Popup | Background | Requests `chrome.tabs.captureVisibleTab` snapshot |
| `startFullPageCapture` | Popup | Content | Triggers vertical scroll stitching sequence |
| `startSelectedAreaCapture`| Popup | Content | Activates Shadow DOM crosshair area crop tool |
| `startElementPicker` | Popup | Content | Activates interactive DOM hover & click element picker |
| `openPreview` | Content / Popup | Background | Opens `src/pages/image-studio/image-studio.html` |
| `openVideoPreview` | Background / Offscreen | Background | Opens `src/pages/video-studio/video-studio.html` |
| `START_RECORDING` | Popup | Background -> Offscreen | Initializes tab/screen video recording with audio |
| `STOP_RECORDING` | Popup / Content | Background -> Offscreen | Finalizes recording, commits to IndexedDB, opens studio |

---

## 🎨 3. Design System & Styling Rules

When creating or modifying UI elements in Popup or Studios, **ALWAYS** follow these strict rules:

### A. 4-Color Palette:
- **`#4A4A4A`** (Dark Charcoal / Antrasit): Main card backgrounds (`--bg-card`)
- **`#CBCBCB`** (Silver Gray): Secondary text, labels, subtle borders (`--on-surface-variant`)
- **`#FFFFE3`** (Warm Ivory Cream): Primary text, headings, white accents (`--on-surface`)
- **`#6D8196`** (Slate Blue): Primary interactive accent, button active/hover states (`--primary`)

### B. Geometry & Feel:
- **Rounded Corners**: Use `border-radius: 12px` for cards/buttons, `16px` for outer window cards.
- **Scrollbars**: Universal zero-scrollbar styling (`scrollbar-width: none; ::-webkit-scrollbar { display: none; }`).
- **Typography**: Clean modern sans-serif (`Hanken Grotesk`, `Inter`, `-apple-system`).

---

## 🛡️ 4. Critical Engineering Guardrails

1. **GPU Reflow & Double rAF for Captures**:
   - Before taking any `captureVisibleTab` screenshot where an in-page element was just hidden, **ALWAYS** enforce a reflow (`void el.offsetHeight`) followed by `await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))` plus a short `50ms` delay. This prevents Chromium's compositor from capturing ghost UI elements.
2. **Canvas Dimension Limits (Blink Safety)**:
   - Max single dimension: `16384px`. Max total canvas area: `16384 * 8192 (~134M pixels)`.
   - If a webpage exceeds this, content.js safely scales down slices to prevent browser tab crashes.
3. **Shadow DOM Isolation**:
   - In-page tools (`#__fullshot_hud_host__`, `#__fullshot_selection_host__`, `#__fullshot_picker_host__`) **MUST** use `attachShadow({ mode: 'open' })` with `all: initial !important` to ensure host page CSS never corrupts the extension UI.
4. **Offscreen Lifecycle**:
   - Offscreen documents in MV3 are created on demand via `chrome.offscreen.createDocument` with reason `USER_MEDIA` or `DISPLAY_MEDIA` and closed when idle.

---

## 🛠️ 5. How-To Guides for Common AI Tasks

### Adding a New Tool to Image Studio (`image-studio.js`):
1. Add the tool button in `src/pages/image-studio/image-studio.html` with `data-tool="your_tool_name"`.
2. In `src/pages/image-studio/image-studio.js`, add state tracking in the `activeTool` switch.
3. Implement `onMouseDown`, `onMouseMove`, and `onMouseUp` handlers to draw on the active layer canvas.
4. Push the drawn stroke/object to `historyStack` for full `Ctrl+Z` / `Ctrl+Y` undo/redo support.

### Adding a New Export Format:
1. Add an action button in `image-studio.html` or `video-studio.html`.
2. Implement export serializer in `image-studio.js` (e.g. SVG or WebP).
3. Dispatch download using `chrome.downloads.download` via message to `background.js`.

---

## 🧪 6. Automated Validation Command

Whenever you make any changes to JavaScript, HTML, CSS, or manifest files, **ALWAYS** run the automated validator:

```bash
node scripts/validate.js
```
or
```bash
npm test
```
All checks must output green `✔` before considering any task complete.
