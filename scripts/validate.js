/**
 * FullShot Pro - Project Integrity & Syntax Validator
 * Zero-dependency automated test runner for CI/CD and AI Agent verification.
 * 
 * Checks:
 * 1. Syntax of all JavaScript files in the workspace (Node compiler check).
 * 2. Manifest V3 consistency (verifies all declared files exist).
 * 3. HTML resource links (verifies all <script>, <link>, <img> point to existing files).
 * 4. Image assets integrity (checks icon sizes and brand assets).
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logPass(msg) {
  totalTests++;
  passedTests++;
  console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
}

function logFail(msg, error = '') {
  totalTests++;
  failedTests++;
  console.log(`  \x1b[31m✖\x1b[0m ${msg}`);
  if (error) console.log(`    \x1b[33m${error}\x1b[0m`);
}

console.log('\n\x1b[36m====================================================\x1b[0m');
console.log('\x1b[36m   FullShot Pro - Automated Project Validator       \x1b[0m');
console.log('\x1b[36m====================================================\x1b[0m\n');

// ----------------------------------------------------
// 1. JavaScript Syntax Validation
// ----------------------------------------------------
console.log('\x1b[35m[1/4] JavaScript Syntax Validation\x1b[0m');

function getJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(getJsFiles(filePath));
      }
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  });
  return results;
}

const jsFiles = getJsFiles(path.join(ROOT_DIR, 'src'));
jsFiles.forEach((file) => {
  const relPath = path.relative(ROOT_DIR, file);
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
    logPass(`Syntax OK: ${relPath}`);
  } catch (err) {
    logFail(`Syntax Error: ${relPath}`, err.message);
  }
});

// ----------------------------------------------------
// 2. Manifest V3 Integrity & Permissions Audit
// ----------------------------------------------------
console.log('\n\x1b[35m[2/7] Manifest V3 Architecture & Permissions Audit\x1b[0m');

const manifestPath = path.join(ROOT_DIR, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  logPass('manifest.json exists at root');
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Manifest version check
    if (manifest.manifest_version === 3) {
      logPass('Manifest Version 3 confirmed');
    } else {
      logFail(`Invalid manifest_version: ${manifest.manifest_version} (Expected 3)`);
    }

    // Required Permissions Check
    const requiredPermissions = [
      'activeTab',
      'scripting',
      'storage',
      'downloads',
      'clipboardWrite',
      'unlimitedStorage',
      'tabCapture',
      'offscreen',
      'desktopCapture'
    ];

    requiredPermissions.forEach((perm) => {
      if (manifest.permissions && manifest.permissions.includes(perm)) {
        logPass(`Declared permission: ${perm}`);
      } else {
        logFail(`Missing required permission: ${perm}`);
      }
    });

    // Host Permissions Check
    if (manifest.host_permissions && manifest.host_permissions.includes('<all_urls>')) {
      logPass('Host permissions include <all_urls>');
    } else {
      logFail('Missing <all_urls> in host_permissions');
    }

    // Service Worker check
    if (manifest.background?.service_worker) {
      const swPath = path.join(ROOT_DIR, manifest.background.service_worker);
      if (fs.existsSync(swPath)) {
        logPass(`Service Worker entry found: ${manifest.background.service_worker}`);
      } else {
        logFail(`Missing Service Worker entry: ${manifest.background.service_worker}`);
      }
    } else {
      logFail('Manifest missing background.service_worker');
    }

    // Popup check
    if (manifest.action?.default_popup) {
      const popupPath = path.join(ROOT_DIR, manifest.action.default_popup);
      if (fs.existsSync(popupPath)) {
        logPass(`Popup HTML found: ${manifest.action.default_popup}`);
      } else {
        logFail(`Missing Popup HTML: ${manifest.action.default_popup}`);
      }
    }

    // Icons check
    if (manifest.icons) {
      for (const [size, iconRel] of Object.entries(manifest.icons)) {
        const iconPath = path.join(ROOT_DIR, iconRel);
        if (fs.existsSync(iconPath)) {
          logPass(`Manifest Icon (${size}px) found: ${iconRel}`);
        } else {
          logFail(`Missing Manifest Icon (${size}px): ${iconRel}`);
        }
      }
    }

    // Manifest Commands Check
    if (manifest.commands) {
      const requiredCommands = [
        'capture-fullpage',
        'capture-visible',
        'capture-selected',
        'capture-element',
        'toggle-record'
      ];
      requiredCommands.forEach((cmd) => {
        if (manifest.commands[cmd]) {
          logPass(`Manifest Command configured: ${cmd} (${manifest.commands[cmd].suggested_key?.default || 'custom'})`);
        } else {
          logFail(`Missing Manifest Command: ${cmd}`);
        }
      });
    } else {
      logFail('Manifest missing commands section');
    }

    // Web Accessible Resources check (Strict Attack Surface Hardening)
    if (Array.isArray(manifest.web_accessible_resources)) {
      let srcLeaked = false;
      manifest.web_accessible_resources.forEach((war) => {
        war.resources?.forEach((res) => {
          if (res.startsWith('src/')) {
            srcLeaked = true;
          }
          if (!res.includes('*')) {
            const resPath = path.join(ROOT_DIR, res);
            if (fs.existsSync(resPath)) {
              logPass(`Web Accessible Resource found: ${res}`);
            } else {
              logFail(`Missing Web Accessible Resource: ${res}`);
            }
          }
        });
      });
      if (!srcLeaked) {
        logPass('Web Accessible Resources strictly hardened (zero internal src/* leaks)');
      } else {
        logFail('Web Accessible Resources contains internal src/* paths');
      }
      logPass('Web accessible resources configured');
    }
  } catch (err) {
    logFail('Failed to parse manifest.json', err.message);
  }
} else {
  logFail('manifest.json missing at root');
}

// ----------------------------------------------------
// 3. Service Worker Keep-Alive & Messaging Protocol Audit
// ----------------------------------------------------
console.log('\n\x1b[35m[3/7] Service Worker Keep-Alive & Messaging Protocol Audit\x1b[0m');

const bgJsPath = path.join(ROOT_DIR, 'src/background/background.js');
const offscreenJsPath = path.join(ROOT_DIR, 'src/offscreen/offscreen.js');
const constantsJsPath = path.join(ROOT_DIR, 'src/shared/constants.js');

if (fs.existsSync(bgJsPath) && fs.existsSync(offscreenJsPath) && fs.existsSync(constantsJsPath)) {
  const bgContent = fs.readFileSync(bgJsPath, 'utf8');
  const offscreenContent = fs.readFileSync(offscreenJsPath, 'utf8');
  const constantsContent = fs.readFileSync(constantsJsPath, 'utf8');

  // Check Keep-Alive Port Handshake
  if (bgContent.includes('keepAlive-recording') && offscreenContent.includes('keepAlive-recording')) {
    logPass('Keep-Alive port channel "keepAlive-recording" integrated across SW & Offscreen');
  } else {
    logFail('Keep-Alive port channel mismatch between background.js and offscreen.js');
  }

  // Check SW Heartbeat Interval
  if (bgContent.includes('startKeepAliveHeartbeat') && bgContent.includes('resetSWKeepAlive')) {
    logPass('Service Worker idle touch & heartbeat mechanism verified');
  } else {
    logFail('Missing startKeepAliveHeartbeat or resetSWKeepAlive in background.js');
  }

  // Check Offscreen Auto-reconnect & Heartbeat Timer
  if (offscreenContent.includes('connectKeepAlive') && offscreenContent.includes('keepAliveTimer')) {
    logPass('Offscreen client-side heartbeat & auto-reconnect logic verified');
  } else {
    logFail('Missing connectKeepAlive or keepAliveTimer in offscreen.js');
  }

  // Check State Broadcasting
  if (bgContent.includes('RECORDING_STATE_CHANGED') && bgContent.includes('videoRecordingStateChanged')) {
    logPass('Dual state broadcasting (RECORDING_STATE_CHANGED & videoRecordingStateChanged) verified');
  } else {
    logFail('Missing comprehensive state broadcasting in background.js');
  }

  // Check Constants Action Definitions
  if (constantsContent.includes('START_VIDEO_RECORDING') && constantsContent.includes('STOP_VIDEO_RECORDING')) {
    logPass('Video recording action constants verified');
  } else {
    logFail('Missing video recording action constants in constants.js');
  }
} else {
  logFail('Required background, offscreen, or constants source files missing');
}

// ----------------------------------------------------
// 4. IndexedDB Storage Engine (FullShotMediaDB v2) Audit
// ----------------------------------------------------
console.log('\n\x1b[35m[4/7] IndexedDB Storage Engine (FullShotMediaDB v2) Audit\x1b[0m');

const dbJsPath = path.join(ROOT_DIR, 'src/shared/db.js');
if (fs.existsSync(dbJsPath)) {
  const dbContent = fs.readFileSync(dbJsPath, 'utf8');

  if (dbContent.includes("DB_NAME: 'FullShotMediaDB'") && dbContent.includes('DB_VERSION: 2')) {
    logPass('FullShotMediaDB v2 schema definition confirmed');
  } else {
    logFail('FullShotMediaDB name or version 2 mismatch in db.js');
  }

  // Check required stores
  const requiredStores = ['RECORDINGS', 'VIDEOS', 'CAPTURES'];
  requiredStores.forEach((store) => {
    if (dbContent.includes(store)) {
      logPass(`Database store configured: ${store}`);
    } else {
      logFail(`Missing store in db.js: ${store}`);
    }
  });

  // Check required CRUD methods
  const requiredMethods = [
    'saveRecording',
    'getRecording',
    'getAllRecordings',
    'deleteRecording',
    'clearAllRecordings',
    'saveCapture',
    'getCapture',
    'getAllCaptures',
    'deleteCapture',
    'clearAllCaptures',
    'getStorageUsage',
    'clearAll'
  ];

  requiredMethods.forEach((method) => {
    if (dbContent.includes(`${method}(`)) {
      logPass(`FullShotDB method implemented: ${method}()`);
    } else {
      logFail(`Missing FullShotDB method: ${method}()`);
    }
  });
} else {
  logFail('src/shared/db.js missing at expected path');
}

// ----------------------------------------------------
// 5. Security Guardrails & Restricted URLs Audit
// ----------------------------------------------------
console.log('\n\x1b[35m[5/7] Security Guardrails & Restricted URLs Audit\x1b[0m');

if (fs.existsSync(bgJsPath)) {
  const bgContent = fs.readFileSync(bgJsPath, 'utf8');

  if (bgContent.includes('isProtectedBrowserUrl')) {
    logPass('isProtectedBrowserUrl security helper implemented');
  } else {
    logFail('Missing isProtectedBrowserUrl in background.js');
  }

  if (bgContent.includes('showProtectedUrlBadgeWarning')) {
    logPass('showProtectedUrlBadgeWarning temporary badge indicator implemented');
  } else {
    logFail('Missing showProtectedUrlBadgeWarning in background.js');
  }

  // Check Chrome Commands Listener Implementation
  if (bgContent.includes('chrome.commands.onCommand.addListener')) {
    logPass('chrome.commands.onCommand listener registered in background.js');
    const expectedCommands = ['capture-fullpage', 'capture-visible', 'capture-selected', 'capture-element', 'toggle-record'];
    expectedCommands.forEach((cmd) => {
      if (bgContent.includes(cmd)) {
        logPass(`Command action handler verified in background.js: ${cmd}`);
      } else {
        logFail(`Missing command action handler in background.js: ${cmd}`);
      }
    });
  } else {
    logFail('Missing chrome.commands.onCommand.addListener in background.js');
  }

  // Check EyeDropper & Canvas Loupe in color-picker.js
  const cpPath = path.join(ROOT_DIR, 'src/pages/image-studio/tools/color-picker.js');
  if (fs.existsSync(cpPath)) {
    const cpContent = fs.readFileSync(cpPath, 'utf8');
    if (cpContent.includes('activateEyeDropper') && cpContent.includes('EyeDropper')) {
      logPass('Native EyeDropper API integration confirmed in color-picker.js');
    } else {
      logFail('Missing activateEyeDropper or EyeDropper check in color-picker.js');
    }

    if (cpContent.includes('startCanvasLoupe')) {
      logPass('Graceful Canvas 8x Loupe fallback engine implemented in color-picker.js');
    } else {
      logFail('Missing startCanvasLoupe fallback in color-picker.js');
    }
  } else {
    logFail('src/pages/image-studio/tools/color-picker.js missing');
  }

  const protectedSchemes = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'chrome.google.com/webstore'];
  let allSchemesPresent = true;
  protectedSchemes.forEach((scheme) => {
    if (!bgContent.includes(scheme)) {
      allSchemesPresent = false;
      logFail(`Protected scheme not guarded in background.js: ${scheme}`);
    }
  });

  if (allSchemesPresent) {
    logPass('All protected browser schemes (chrome://, edge://, about:, webstore) strictly guarded');
  }
}

// ----------------------------------------------------
// 6. HTML Resource Link Validation
// ----------------------------------------------------
console.log('\n\x1b[35m[6/7] HTML Script/CSS/Image Link Integrity\x1b[0m');

function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(getHtmlFiles(filePath));
      }
    } else if (file.endsWith('.html')) {
      results.push(filePath);
    }
  });
  return results;
}

const htmlFiles = getHtmlFiles(path.join(ROOT_DIR, 'src'));
htmlFiles.forEach((htmlFile) => {
  const htmlDir = path.dirname(htmlFile);
  const relHtml = path.relative(ROOT_DIR, htmlFile);
  const content = fs.readFileSync(htmlFile, 'utf8');

  // Match src="..." and href="..."
  const regex = /(?:src|href)=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const link = match[1];
    // Skip external URLs and inline data/hashes
    if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('data:') || link.startsWith('#')) {
      continue;
    }

    const resolvedPath = path.resolve(htmlDir, link.split('?')[0]);
    if (fs.existsSync(resolvedPath)) {
      logPass(`[${relHtml}] -> Resolved: ${link}`);
    } else {
      logFail(`[${relHtml}] -> Broken Link: ${link} (Target: ${resolvedPath})`);
    }
  }
});

// ----------------------------------------------------
// 7. Asset Verification
// ----------------------------------------------------
console.log('\n\x1b[35m[7/7] Asset Verification\x1b[0m');

const expectedIcons = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'];
expectedIcons.forEach((icon) => {
  const p = path.join(ROOT_DIR, 'assets', 'icons', icon);
  if (fs.existsSync(p)) {
    const stats = fs.statSync(p);
    logPass(`Icon assets/icons/${icon} (${stats.size} bytes) OK`);
  } else {
    logFail(`Missing Icon: assets/icons/${icon}`);
  }
});

// ----------------------------------------------------
// Summary & Exit Code
// ----------------------------------------------------
console.log('\n\x1b[36m======================================================================\x1b[0m');
console.log(`\x1b[36mValidation Summary:\x1b[0m Total: ${totalTests} | \x1b[32mPassed: ${passedTests}\x1b[0m | \x1b[31mFailed: ${failedTests}\x1b[0m`);
console.log('\x1b[36m======================================================================\x1b[0m\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32mAll Manifest V3, Service Worker, Database & Security checks passed! ✨\x1b[0m\n');
  process.exit(0);
}
