/**
 * FullShot Pro - Distribution Zip Packager
 * Packages all extension assets, manifest, and src files into a clean zip file
 * ready for submission to the Chrome Web Store.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ZIP_NAME = 'FullShot-Pro-Extension.zip';
const ZIP_PATH = path.join(DIST_DIR, ZIP_NAME);

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

if (fs.existsSync(ZIP_PATH)) {
  fs.unlinkSync(ZIP_PATH);
}

console.log('\x1b[36mPackaging FullShot Pro Extension into dist/' + ZIP_NAME + '...\x1b[0m');

try {
  // Use PowerShell Compress-Archive on Windows
  const cmd = `powershell -Command "Compress-Archive -Path '${path.join(ROOT_DIR, 'manifest.json')}', '${path.join(ROOT_DIR, 'assets')}', '${path.join(ROOT_DIR, 'src')}' -DestinationPath '${ZIP_PATH}' -Force"`;
  execSync(cmd, { stdio: 'inherit' });

  const stats = fs.statSync(ZIP_PATH);
  console.log(`\x1b[32m✔ Package created successfully!\x1b[0m (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log(`\x1b[35mLocation:\x1b[0m ${ZIP_PATH}\n`);
} catch (err) {
  console.error('\x1b[31m✖ Packaging failed:\x1b[0m', err.message);
  process.exit(1);
}
