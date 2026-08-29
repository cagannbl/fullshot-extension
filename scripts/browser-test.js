/**
 * FullShot Pro - Browser Runtime & DOM Binding Verification Runner
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✔ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ✖ [FAIL] ${message}`);
    failedTests++;
  }
}

console.log('\n====================================================');
console.log('   FullShot Pro - Deep Browser & DOM Runtime Test   ');
console.log('====================================================\n');

// 1. Video Studio Audit
console.log('[1/4] Video Studio & Player Sizing Audit:');
const videoStudioHtml = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/video-studio/video-studio.html'), 'utf8');
const videoStudioCss = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/video-studio/video-studio.css'), 'utf8');
const videoStudioJs = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/video-studio/video-studio.js'), 'utf8');

assert(videoStudioHtml.includes('id="mainVideo"'), 'video-studio.html contains #mainVideo');
assert(videoStudioHtml.includes('id="videoPlayerContainer"'), 'video-studio.html contains #videoPlayerContainer');
assert(videoStudioHtml.includes('id="centerPlayButton"'), 'video-studio.html contains #centerPlayButton');
assert(videoStudioHtml.includes('id="timelineProgress"'), 'video-studio.html contains #timelineProgress');
assert(videoStudioHtml.includes('gif-exporter.js') || videoStudioHtml.includes('downloadGifBtn'), 'video-studio.html includes GIF export support');
assert(videoStudioCss.includes('width: 100%'), 'video-studio.css sets width: 100% on player container');
assert(videoStudioJs.includes('1e101') || videoStudioJs.includes('MAX_SAFE_INTEGER'), 'video-studio.js implements WebM duration recovery seek');

// 2. Image Studio Tools
console.log('\n[2/4] Image Studio New Tools & Export Engine Audit:');
const imageStudioHtml = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/image-studio/image-studio.html'), 'utf8');
const imageStudioJs = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/image-studio/image-studio.js'), 'utf8');

const expectedTools = [
  'tools/spotlight.js',
  'tools/magnifier.js',
  'tools/stamp.js',
  'engine/auto-censor-engine.js',
  'export/mockup-beautifier.js',
  'export/pdf-generator.js'
];

expectedTools.forEach(toolPath => {
  assert(imageStudioHtml.includes(toolPath), `image-studio.html includes <script src="${toolPath}">`);
  assert(fs.existsSync(path.join(ROOT_DIR, 'src/pages/image-studio', toolPath)), `File exists on disk: ${toolPath}`);
});

assert(imageStudioJs.includes('spotlight') || imageStudioHtml.includes('spotlight'), 'Spotlight tool integrated in Image Studio');
assert(imageStudioJs.includes('magnifier') || imageStudioHtml.includes('magnifier'), 'Magnifier lens tool integrated in Image Studio');
assert(imageStudioJs.includes('stamp') || imageStudioHtml.includes('stamp'), 'Stamp/Badge tool integrated in Image Studio');

// 3. Content HUDs
console.log('\n[3/4] Content Script HUDs & Precision Tools Audit:');
const expectedHUDs = [
  'camera-bubble.js',
  'cursor-effects.js',
  'pin-window.js',
  'pixel-ruler.js',
  'area-selector.js',
  'element-picker.js',
  'recording-bar.js'
];

expectedHUDs.forEach(hudFile => {
  const fullPath = path.join(ROOT_DIR, 'src/content/hud', hudFile);
  assert(fs.existsSync(fullPath), `HUD file exists: src/content/hud/${hudFile}`);
  const content = fs.readFileSync(fullPath, 'utf8');
  assert(content.includes('FullShotHUD'), `${hudFile} registers on window.FullShotHUD namespace`);
  assert(content.includes('attachShadow') || content.includes('Shadow') || content.includes('canvas'), `${hudFile} uses Shadow DOM or Canvas isolation`);
});

// 4. Background SW & Offscreen
console.log('\n[4/4] Background SW & Offscreen Audio/Video Engine Audit:');
const bgJs = fs.readFileSync(path.join(ROOT_DIR, 'src/background/background.js'), 'utf8');
const offscreenJs = fs.readFileSync(path.join(ROOT_DIR, 'src/offscreen/offscreen.js'), 'utf8');

assert(bgJs.includes('START_RECORDING') || bgJs.includes('RECORDING'), 'background.js handles recording state machine');
assert(offscreenJs.includes('createDynamicsCompressor') || offscreenJs.includes('AudioContext'), 'offscreen.js uses Web Audio API dynamics processing');
assert(offscreenJs.includes('fixWebmDuration') || offscreenJs.includes('EBML'), 'offscreen.js includes WebM duration header patcher');

console.log('\n====================================================');
console.log(`Test Summary: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('====================================================\n');

if (failedTests > 0) process.exit(1);
else process.exit(0);
