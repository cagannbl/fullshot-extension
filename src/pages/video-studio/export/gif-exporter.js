/**
 * FullShot Pro - Pure JavaScript Animated GIF Exporter & Color Quantization Engine
 * Zero external libraries / CDN dependencies.
 * Compliant with GIF89a specification:
 * - Median Cut / Color Quantization to 256 colors
 * - Variable-length LZW compression encoder
 * - Sub-block chunk streaming & graphic control timing
 * - Canvas frame extraction & time-accurate playback sampling
 */

(function () {
  'use strict';

  /**
   * Color Quantizer & Palette Generator (Median-Cut algorithm)
   */
  class ColorQuantizer {
    constructor(maxColors = 256) {
      this.maxColors = maxColors;
    }

    /**
     * Quantizes an RGBA pixel array into a palette and color index map
     * @param {Uint8ClampedArray} pixels - RGBA raw image data
     * @param {number} width
     * @param {number} height
     * @returns {{ palette: Uint8Array, indexedPixels: Uint8Array }}
     */
    quantize(pixels, width, height) {
      const totalPixels = width * height;
      const sampleStep = Math.max(1, Math.floor(totalPixels / 20000)); // Sample subset for fast palette building

      // Collect sample RGB points
      const samples = [];
      for (let i = 0; i < totalPixels; i += sampleStep) {
        const idx = i * 4;
        const a = pixels[idx + 3];
        if (a >= 128) {
          samples.push([pixels[idx], pixels[idx + 1], pixels[idx + 2]]);
        }
      }

      // Build color boxes
      const boxes = [{
        colors: samples,
        rMin: 0, rMax: 255,
        gMin: 0, gMax: 255,
        bMin: 0, bMax: 255
      }];

      while (boxes.length < this.maxColors) {
        // Find box with greatest variance/range
        let maxRange = -1;
        let splitIdx = -1;

        for (let i = 0; i < boxes.length; i++) {
          const b = boxes[i];
          if (b.colors.length <= 1) continue;

          let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
          for (let c of b.colors) {
            if (c[0] < minR) minR = c[0];
            if (c[0] > maxR) maxR = c[0];
            if (c[1] < minG) minG = c[1];
            if (c[1] > maxG) maxG = c[1];
            if (c[2] < minB) minB = c[2];
            if (c[2] > maxB) maxB = c[2];
          }

          const range = Math.max(maxR - minR, maxG - minG, maxB - minB);
          if (range > maxRange) {
            maxRange = range;
            splitIdx = i;
          }
        }

        if (splitIdx === -1 || maxRange <= 0) break;

        const boxToSplit = boxes.splice(splitIdx, 1)[0];
        const colors = boxToSplit.colors;

        // Determine sort channel
        let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
        for (let c of colors) {
          if (c[0] < minR) minR = c[0]; if (c[0] > maxR) maxR = c[0];
          if (c[1] < minG) minG = c[1]; if (c[1] > maxG) maxG = c[1];
          if (c[2] < minB) minB = c[2]; if (c[2] > maxB) maxB = c[2];
        }

        const rRange = maxR - minR;
        const gRange = maxG - minG;
        const bRange = maxB - minB;
        let channel = 0;
        if (gRange >= rRange && gRange >= bRange) channel = 1;
        else if (bRange >= rRange && bRange >= gRange) channel = 2;

        colors.sort((a, b) => a[channel] - b[channel]);

        const mid = Math.floor(colors.length / 2);
        boxes.push({ colors: colors.slice(0, mid) });
        boxes.push({ colors: colors.slice(mid) });
      }

      // Generate 256 RGB Palette Table
      const palette = new Uint8Array(256 * 3);
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        let rSum = 0, gSum = 0, bSum = 0;
        const len = b.colors.length || 1;
        for (let c of b.colors) {
          rSum += c[0];
          gSum += c[1];
          bSum += c[2];
        }
        palette[i * 3] = Math.round(rSum / len);
        palette[i * 3 + 1] = Math.round(gSum / len);
        palette[i * 3 + 2] = Math.round(bSum / len);
      }

      // Fast RGB Lookup Cache
      const indexedPixels = new Uint8Array(totalPixels);
      const colorMap = new Map();

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const key = (r << 16) | (g << 8) | b;

        let bestIndex = colorMap.get(key);
        if (bestIndex === undefined) {
          let minDistance = Infinity;
          bestIndex = 0;

          for (let p = 0; p < boxes.length; p++) {
            const pr = palette[p * 3];
            const pg = palette[p * 3 + 1];
            const pb = palette[p * 3 + 2];
            const dist = ((r - pr) ** 2) * 0.3 + ((g - pg) ** 2) * 0.59 + ((b - pb) ** 2) * 0.11;
            if (dist < minDistance) {
              minDistance = dist;
              bestIndex = p;
              if (dist === 0) break;
            }
          }
          colorMap.set(key, bestIndex);
        }

        indexedPixels[i] = bestIndex;
      }

      return { palette, indexedPixels };
    }
  }

  /**
   * LZW Byte Stream Compressor for GIF Image Data
   */
  class LZWEncoder {
    static encode(minCodeSize, indexedPixels) {
      const clearCode = 1 << minCodeSize;
      const eoiCode = clearCode + 1;
      let codeSize = minCodeSize + 1;
      let nextCode = eoiCode + 1;
      const maxCode = 4095;

      const outputBytes = [];
      let curBit = 0;
      let curByte = 0;

      function writeBits(val, nBits) {
        for (let i = 0; i < nBits; i++) {
          if (val & (1 << i)) {
            curByte |= (1 << curBit);
          }
          curBit++;
          if (curBit === 8) {
            outputBytes.push(curByte);
            curByte = 0;
            curBit = 0;
          }
        }
      }

      // Initialize dictionary
      let dictionary = new Map();
      function initDictionary() {
        dictionary.clear();
        for (let i = 0; i < clearCode; i++) {
          dictionary.set(String(i), i);
        }
        codeSize = minCodeSize + 1;
        nextCode = eoiCode + 1;
      }

      initDictionary();
      writeBits(clearCode, codeSize);

      let currentPrefix = '';

      for (let i = 0; i < indexedPixels.length; i++) {
        const k = indexedPixels[i];
        const nextStr = currentPrefix === '' ? String(k) : `${currentPrefix},${k}`;

        if (dictionary.has(nextStr)) {
          currentPrefix = nextStr;
        } else {
          writeBits(dictionary.get(currentPrefix), codeSize);

          if (nextCode <= maxCode) {
            dictionary.set(nextStr, nextCode++);
            if (nextCode > (1 << codeSize) && codeSize < 12) {
              codeSize++;
            }
          } else {
            // Dictionary full, send clear code and reset
            writeBits(clearCode, codeSize);
            initDictionary();
          }
          currentPrefix = String(k);
        }
      }

      if (currentPrefix !== '') {
        writeBits(dictionary.get(currentPrefix), codeSize);
      }

      writeBits(eoiCode, codeSize);

      if (curBit > 0) {
        outputBytes.push(curByte);
      }

      // Convert into GIF sub-blocks (max 255 bytes per sub-block)
      const subBlocks = [minCodeSize];
      let offset = 0;
      while (offset < outputBytes.length) {
        const chunkSize = Math.min(255, outputBytes.length - offset);
        subBlocks.push(chunkSize);
        for (let i = 0; i < chunkSize; i++) {
          subBlocks.push(outputBytes[offset + i]);
        }
        offset += chunkSize;
      }
      subBlocks.push(0x00); // Block terminator

      return new Uint8Array(subBlocks);
    }
  }

  /**
   * Main GIF89a Exporter Engine
   */
  class FullShotGifExporter {
    /**
     * Exports video segment as high-quality animated GIF
     * @param {HTMLVideoElement|string} videoOrUrl
     * @param {Object} options
     * @param {number} [options.startTime] - Start time in seconds (trim in)
     * @param {number} [options.endTime] - End time in seconds (trim out)
     * @param {number} [options.fps=15] - GIF framerate (10-24 fps recommended)
     * @param {number} [options.maxWidth=800] - Scale down large videos to keep file size reasonable
     * @param {function} [options.onProgress] - Progress callback (pct, frame, total)
     * @returns {Promise<Blob>}
     */
    static async exportGif(videoOrUrl, options = {}) {
      const fps = Math.min(24, Math.max(5, options.fps || 15));
      const frameInterval = 1 / fps;
      const maxWidth = options.maxWidth || 800;
      const onProgress = options.onProgress || (() => {});

      let videoEl = null;
      let ownVideo = false;

      if (typeof videoOrUrl === 'string') {
        videoEl = document.createElement('video');
        videoEl.src = videoOrUrl;
        videoEl.crossOrigin = 'anonymous';
        videoEl.muted = true;
        videoEl.playsInline = true;
        ownVideo = true;
        await new Promise((resolve, reject) => {
          videoEl.onloadedmetadata = resolve;
          videoEl.onerror = () => reject(new Error('Video kaynağı yüklenemedi.'));
        });
      } else {
        videoEl = videoOrUrl;
      }

      const videoDuration = isFinite(videoEl.duration) && videoEl.duration > 0 ? videoEl.duration : 10;
      const startTime = Math.max(0, options.startTime || 0);
      const endTime = Math.min(videoDuration, options.endTime && options.endTime > startTime ? options.endTime : videoDuration);
      const totalDuration = endTime - startTime;

      const totalFrames = Math.max(1, Math.floor(totalDuration * fps));

      // Calculate scaled dimensions
      const origWidth = videoEl.videoWidth || 1280;
      const origHeight = videoEl.videoHeight || 720;
      let width = origWidth;
      let height = origHeight;

      if (width > maxWidth) {
        height = Math.round((maxWidth / width) * height);
        width = maxWidth;
      }
      // Dimensions must be even
      width = width - (width % 2);
      height = height - (height % 2);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const quantizer = new ColorQuantizer(256);
      const gifParts = [];

      // 1. Write GIF89a Header
      const header = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // 'GIF89a'
      gifParts.push(header);

      // 2. Logical Screen Descriptor (Width, Height, Global Color Table Flag, 256 colors)
      const lsd = new Uint8Array(7);
      lsd[0] = width & 0xff;
      lsd[1] = (width >> 8) & 0xff;
      lsd[2] = height & 0xff;
      lsd[3] = (height >> 8) & 0xff;
      lsd[4] = 0xf7; // 11110111: Global Color Table Present, 8 bits/pixel, 256 colors
      lsd[5] = 0x00; // Background color index
      lsd[6] = 0x00; // Pixel aspect ratio
      gifParts.push(lsd);

      // Sample first frame to establish Global Color Table
      videoEl.currentTime = startTime;
      await new Promise((r) => {
        videoEl.addEventListener('seeked', r, { once: true });
      });
      ctx.drawImage(videoEl, 0, 0, width, height);
      const firstFrameImg = ctx.getImageData(0, 0, width, height);
      const { palette } = quantizer.quantize(firstFrameImg.data, width, height);
      gifParts.push(palette);

      // 3. Netscape 2.0 Loop Application Extension (Infinite loop)
      const netscapeExt = new Uint8Array([
        0x21, 0xff, 0x0b, // Extension Intro + App Extension (11 bytes)
        0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, // 'NETSCAPE2.0'
        0x03, 0x01, 0x00, 0x00, // Sub-block length 3, loop sub-block, 0 iterations (infinite)
        0x00 // Terminator
      ]);
      gifParts.push(netscapeExt);

      const delay100ths = Math.max(2, Math.round((100 / fps)));

      // 4. Render & Encode Each Frame
      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        const targetTime = Math.min(endTime, startTime + (frameIdx * frameInterval));
        videoEl.currentTime = targetTime;

        await new Promise((r) => {
          videoEl.addEventListener('seeked', r, { once: true });
        });

        ctx.drawImage(videoEl, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const { indexedPixels } = quantizer.quantize(imgData.data, width, height);

        // Graphic Control Extension (Frame timing & disposal)
        const gce = new Uint8Array([
          0x21, 0xf9, 0x04, // Extension Intro + Graphic Control (4 bytes)
          0x04,             // Disposal method: Do not dispose / overwrite
          delay100ths & 0xff, (delay100ths >> 8) & 0xff, // Delay time in 1/100s
          0x00,             // Transparent color index
          0x00              // Terminator
        ]);
        gifParts.push(gce);

        // Image Descriptor (0x2C, left, top, width, height, no local color table)
        const imgDesc = new Uint8Array([
          0x2c,
          0x00, 0x00, // Left 0
          0x00, 0x00, // Top 0
          width & 0xff, (width >> 8) & 0xff,
          height & 0xff, (height >> 8) & 0xff,
          0x00 // No local color table (use global table)
        ]);
        gifParts.push(imgDesc);

        // LZW Compressed Raster Data
        const lzwData = LZWEncoder.encode(8, indexedPixels);
        gifParts.push(lzwData);

        const pct = Math.round(((frameIdx + 1) / totalFrames) * 100);
        onProgress(pct, frameIdx + 1, totalFrames);
      }

      // 5. GIF Trailer (0x3B)
      gifParts.push(new Uint8Array([0x3b]));

      if (ownVideo && videoEl.parentNode) {
        videoEl.parentNode.removeChild(videoEl);
      }

      return new Blob(gifParts, { type: 'image/gif' });
    }
  }

  // Export to window
  window.FullShotGifExporter = FullShotGifExporter;
})();
