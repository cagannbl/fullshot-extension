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
// 2. Manifest V3 Integrity Validation
// ----------------------------------------------------
console.log('\n\x1b[35m[2/4] Manifest V3 Path Resolution\x1b[0m');

const manifestPath = path.join(ROOT_DIR, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  logPass('manifest.json exists');
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Check service worker
    if (manifest.background?.service_worker) {
      const swPath = path.join(ROOT_DIR, manifest.background.service_worker);
      if (fs.existsSync(swPath)) {
        logPass(`Service Worker found: ${manifest.background.service_worker}`);
      } else {
        logFail(`Missing Service Worker: ${manifest.background.service_worker}`);
      }
    }

    // Check popup
    if (manifest.action?.default_popup) {
      const popupPath = path.join(ROOT_DIR, manifest.action.default_popup);
      if (fs.existsSync(popupPath)) {
        logPass(`Popup HTML found: ${manifest.action.default_popup}`);
      } else {
        logFail(`Missing Popup HTML: ${manifest.action.default_popup}`);
      }
    }

    // Check icons
    if (manifest.icons) {
      for (const [size, iconRel] of Object.entries(manifest.icons)) {
        const iconPath = path.join(ROOT_DIR, iconRel);
        if (fs.existsSync(iconPath)) {
          logPass(`Icon (${size}px) found: ${iconRel}`);
        } else {
          logFail(`Missing Icon (${size}px): ${iconRel}`);
        }
      }
    }

    // Check web_accessible_resources
    if (Array.isArray(manifest.web_accessible_resources)) {
      manifest.web_accessible_resources.forEach((war) => {
        war.resources?.forEach((res) => {
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
    }
  } catch (err) {
    logFail('Failed to parse manifest.json', err.message);
  }
} else {
  logFail('manifest.json missing at root');
}

// ----------------------------------------------------
// 3. HTML Resource Link Validation
// ----------------------------------------------------
console.log('\n\x1b[35m[3/4] HTML Script/CSS/Image Link Integrity\x1b[0m');

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
// 4. Asset Summary
// ----------------------------------------------------
console.log('\n\x1b[35m[4/4] Asset Verification\x1b[0m');

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
console.log('\n\x1b[36m====================================================\x1b[0m');
console.log(`\x1b[36mValidation Summary:\x1b[0m Total: ${totalTests} | \x1b[32mPassed: ${passedTests}\x1b[0m | \x1b[31mFailed: ${failedTests}\x1b[0m`);
console.log('\x1b[36m====================================================\x1b[0m\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32mAll project integrity checks passed successfully! ✨\x1b[0m\n');
  process.exit(0);
}
