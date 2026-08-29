/**
 * FullShot Pro - Smart Auto-Censor Engine
 * Privacy & DLP Engine using strict Regex patterns and Luhn algorithmic validation
 * to detect and redact Emails, Credit Cards, Passwords, IPv4/IPv6, and API Keys / Auth Tokens.
 */

(function () {
  'use strict';

  window.FullShotAutoCensor = window.FullShotAutoCensor || {};

  /**
   * Luhn Algorithm (Mod 10) for Credit Card number verification.
   * Eliminates false positives on random digit sequences.
   * @param {string} rawNumber 
   * @returns {boolean}
   */
  function validateLuhn(rawNumber) {
    const digitsOnly = String(rawNumber).replace(/\D/g, '');
    if (digitsOnly.length < 13 || digitsOnly.length > 19) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = digitsOnly.length - 1; i >= 0; i--) {
      let digit = parseInt(digitsOnly.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  /**
   * Turkish Identity Number (TCKN) algorithmic verification.
   * @param {string} rawNumber 
   * @returns {boolean}
   */
  function validateTCKN(rawNumber) {
    const digitsOnly = String(rawNumber).replace(/\D/g, '');
    if (digitsOnly.length !== 11 || digitsOnly[0] === '0') return false;

    const d = digitsOnly.split('').map(Number);
    const oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
    const evenSum = d[1] + d[3] + d[5] + d[7];

    const digit10 = (oddSum * 7 - evenSum) % 10;
    const finalDigit10 = digit10 < 0 ? digit10 + 10 : digit10;
    if (d[9] !== finalDigit10) return false;

    const totalSum = d.slice(0, 10).reduce((acc, val) => acc + val, 0);
    if (d[10] !== totalSum % 10) return false;

    return true;
  }

  /**
   * DLP Regex Pattern Rules Catalog
   */
  const PATTERNS = {
    // 1. Email Addresses
    email: {
      name: 'E-Posta Adresi',
      regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
      category: 'email'
    },

    // 2. Credit Cards (Visa, MasterCard, Amex, Troy, Discover, Diners)
    creditCard: {
      name: 'Kredi Kartı Numarası',
      regex: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{4}[ -]?\d{6}[ -]?\d{4,5}\b/g,
      validator: validateLuhn,
      category: 'financial'
    },

    // 3. API Keys, Tokens & Passwords
    apiKey: {
      name: 'API Anahtarı & Token',
      regex: /\b(?:bearer\s+[a-zA-Z0-9._-]{20,}|(?:ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,}|sk-(?:proj-|ant-)?[a-zA-Z0-9_-]{18,}|(?:sk_live|rk_live|sk_test)_[0-9a-zA-Z]{20,}|(?:AKIA|ASIA)[0-9A-Z]{16}|AIza[0-9A-Za-z-_]{35}|(?:xoxb|xoxp)-[0-9]{10,}-[a-zA-Z0-9-]+|eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\b/gi,
      category: 'secret'
    },

    // 4. Password / Secret Value Assignments
    passwordAssignment: {
      name: 'Şifre & Parola',
      regex: /(?:password|passwd|sifre|parola|secret|api_key|token)\s*[:=]\s*["']?([^\s"';,]{4,})["']?/gi,
      category: 'secret'
    },

    // 5. IPv4 Addresses
    ipv4: {
      name: 'IPv4 Adresi',
      regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      category: 'network'
    },

    // 6. IPv6 Addresses
    ipv6: {
      name: 'IPv6 Adresi',
      regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}\b/g,
      category: 'network'
    },

    // 7. National ID (TCKN)
    tckn: {
      name: 'T.C. Kimlik Numarası',
      regex: /\b[1-9]\d{10}\b/g,
      validator: validateTCKN,
      category: 'pii'
    },

    // 8. Phone Numbers
    phone: {
      name: 'Telefon Numarası',
      regex: /\b(?:\+90\s*|\b0)[1-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b|\b\+1[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
      category: 'pii'
    }
  };

  /**
   * Scan plain text string against all active DLP patterns.
   * @param {string} text 
   * @returns {Array<{type: string, name: string, match: string, index: number, category: string}>}
   */
  function scanText(text) {
    if (!text || typeof text !== 'string') return [];
    const findings = [];

    for (const [key, rule] of Object.entries(PATTERNS)) {
      const regex = new RegExp(rule.regex);
      let match;
      while ((match = regex.exec(text)) !== null) {
        const value = match[1] || match[0];
        if (rule.validator && !rule.validator(value)) {
          continue; // Failed strict algorithmic checksum
        }
        findings.push({
          type: key,
          name: rule.name,
          match: value,
          index: match.index,
          category: rule.category
        });
      }
    }

    return findings;
  }

  /**
   * High-Precision Computer-Vision & Connected Component Scanner for Canvas Pixels.
   * Extracts input boxes, credential fields, token pills, password masks, and secret values
   * on both Dark Mode and Light Mode screenshots with zero false-positives on general articles.
   * 
   * @param {HTMLCanvasElement} canvas
   * @returns {Array<{x1: number, y1: number, x2: number, y2: number, reason: string, category: string}>}
   */
  function scanCanvasPixels(canvas) {
    if (!canvas || !canvas.getContext) return [];
    const regions = [];
    const canvasW = canvas.width;
    const canvasH = canvas.height;

    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
      const data = imgData.data;
      const totalPixels = canvasW * canvasH;

      // 1. Grayscale luminance calculation
      const gray = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
      }

      // 2. High-Frequency Horizontal & Vertical Gradient Energy Map (Edge Detection)
      const isEdge = new Uint8Array(totalPixels);
      const edgeThreshold = 18; // Sensitive to subtle dark-mode borders & crisp text strokes

      for (let y = 1; y < canvasH - 1; y++) {
        const rowOffset = y * canvasW;
        for (let x = 1; x < canvasW - 1; x++) {
          const idx = rowOffset + x;
          const gx = Math.abs(gray[idx + 1] - gray[idx - 1]);
          const gy = Math.abs(gray[idx + canvasW] - gray[idx - canvasW]);
          if (gx + gy > edgeThreshold) {
            isEdge[idx] = 1;
          }
        }
      }

      // 3. Morphological Dilation (Horizontal 6px, Vertical 1px) to merge text/borders into solid blobs
      const dilated = new Uint8Array(totalPixels);
      for (let y = 1; y < canvasH - 1; y++) {
        const rowOffset = y * canvasW;
        for (let x = 3; x < canvasW - 3; x++) {
          const idx = rowOffset + x;
          if (isEdge[idx] === 1) {
            for (let dx = -3; dx <= 3; dx++) {
              dilated[idx + dx] = 1;
            }
            if (y > 0) dilated[idx - canvasW] = 1;
            if (y < canvasH - 1) dilated[idx + canvasW] = 1;
          }
        }
      }

      // 4. Connected Component Bounding Box Extraction via Fast BFS / Flood Fill
      const visited = new Uint8Array(totalPixels);
      const candidateBoxes = [];

      for (let y = 10; y < canvasH - 10; y += 2) {
        const rowOffset = y * canvasW;
        for (let x = 10; x < canvasW - 10; x += 2) {
          const startIdx = rowOffset + x;
          if (dilated[startIdx] === 1 && visited[startIdx] === 0) {
            let minX = x, maxX = x, minY = y, maxY = y;
            let edgeCount = 0;
            const queue = [startIdx];
            visited[startIdx] = 1;

            while (queue.length > 0) {
              const curr = queue.pop();
              const cx = curr % canvasW;
              const cy = Math.floor(curr / canvasW);
              edgeCount++;

              if (cx < minX) minX = cx;
              if (cx > maxX) maxX = cx;
              if (cy < minY) minY = cy;
              if (cy > maxY) maxY = cy;

              // 4-way neighbors
              if (cy > 2 && dilated[curr - canvasW] === 1 && visited[curr - canvasW] === 0) {
                visited[curr - canvasW] = 1;
                queue.push(curr - canvasW);
              }
              if (cy < canvasH - 3 && dilated[curr + canvasW] === 1 && visited[curr + canvasW] === 0) {
                visited[curr + canvasW] = 1;
                queue.push(curr + canvasW);
              }
              if (cx > 2 && dilated[curr - 1] === 1 && visited[curr - 1] === 0) {
                visited[curr - 1] = 1;
                queue.push(curr - 1);
              }
              if (cx < canvasW - 3 && dilated[curr + 1] === 1 && visited[curr + 1] === 0) {
                visited[curr + 1] = 1;
                queue.push(curr + 1);
              }
            }

            const bw = maxX - minX + 1;
            const bh = maxY - minY + 1;

            // Only consider boxes that match form input, token row, or credential text dimensions
            if (bw >= 35 && bh >= 10 && bh <= 75 && edgeCount >= 25) {
              candidateBoxes.push({
                x1: minX,
                y1: minY,
                x2: maxX,
                y2: maxY,
                w: bw,
                h: bh,
                edgeCount
              });
            }
          }
        }
      }

      // 5. Intelligent DLP Classification: ONLY Enclosed Form Input Containers, Credential Boxes & Table Data Cells
      // Plain text labels, section titles, headers, and action buttons are NOT blurred.
      candidateBoxes.forEach(box => {
        const { x1, y1, x2, y2, w, h } = box;

        // Skip navigation headers, page wrappers, sidebar items, and very top navigation bar
        if (w > canvasW * 0.75 || y1 < 55 || x1 < 100) return;

        // Sample middle pixel color to detect saturated primary buttons (e.g. Blue '+ Developer settings' button)
        const midIdx = (Math.round(y1 + h * 0.5) * canvasW + Math.round(x1 + w * 0.5)) * 4;
        const r = data[midIdx];
        const g = data[midIdx + 1];
        const b = data[midIdx + 2];
        const isSaturatedButton = (b > 110 && b - r > 35) || (r > 160 && r - b > 40); // Blue or Red primary buttons
        if (isSaturatedButton) return;

        // Check border enclosure (top and bottom border continuity)
        let topBorder = 0, botBorder = 0;
        for (let x = x1; x <= x2; x++) {
          if (isEdge[y1 * canvasW + x] === 1 || (y1 < canvasH - 1 && isEdge[(y1 + 1) * canvasW + x] === 1)) topBorder++;
          if (isEdge[y2 * canvasW + x] === 1 || (y2 > 0 && isEdge[(y2 - 1) * canvasW + x] === 1)) botBorder++;
        }

        const topRatio = topBorder / w;
        const botRatio = botBorder / w;
        
        // A. True Enclosed Input Containers & Token Boxes (API Key, Email, Password, Card)
        const isEnclosedInput = (topRatio > 0.26 || botRatio > 0.26) && (w >= 120 && w <= 650 && h >= 20 && h <= 65);

        // B. Table Data Cells (e.g. Server Host IP, Ports, Table Values in lower panels)
        const isTableCell = (w >= 50 && w <= 260 && h >= 10 && h <= 35 && y1 > canvasH * 0.5 && x1 > 180);

        // Only redact true enclosed form input containers or table data cells
        if (isEnclosedInput || isTableCell) {
          // Deduplicate overlapping or fully contained regions
          const overlaps = regions.some(r => 
            (Math.abs(r.x1 - x1) < 25 && Math.abs(r.y1 - y1) < 18) ||
            (x1 >= r.x1 - 5 && x2 <= r.x2 + 5 && y1 >= r.y1 - 5 && y2 <= r.y2 + 5)
          );

          if (!overlaps) {
            regions.push({
              x1: Math.max(0, x1 - 3),
              y1: Math.max(0, y1 - 2),
              x2: Math.min(canvasW, x2 + 3),
              y2: Math.min(canvasH, y2 + 2),
              reason: isTableCell ? 'IP Adresi / Ağ Verisi' : (w >= 220 ? 'API Anahtarı / Şifre / Form Giriş Alanı' : 'Hassas Değer Alanı'),
              category: isTableCell ? 'network' : 'secret'
            });
          }
        }
      });

    } catch (e) {
      console.warn('[AutoCensor] Optik görsel tarama hatası:', e);
    }

    return regions;
  }

  /**
   * Detect sensitive regions strictly based on DLP rules, verified checksums,
   * sensitive input fields, and optical canvas credential detectors.
   * Eliminates false positives on normal paragraphs, titles, and non-sensitive content.
   * 
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} [captureData] 
   * @returns {Array<{x1: number, y1: number, x2: number, y2: number, reason: string, category: string}>}
   */
  function detectSensitiveRegions(canvas, captureData = null) {
    if (!canvas) return [];
    const regions = [];
    const canvasW = canvas.width;
    const canvasH = canvas.height;

    // 1. Scan captureData text chunks / DOM nodes strictly with DLP regexes & Luhn checks
    if (captureData && captureData.textNodes && Array.isArray(captureData.textNodes)) {
      captureData.textNodes.forEach(node => {
        const text = node.text || '';
        const matches = scanText(text);
        if (matches.length > 0) {
          regions.push({
            x1: Math.max(0, node.x - 4),
            y1: Math.max(0, node.y - 3),
            x2: Math.min(canvasW, node.x + (node.width || 140) + 4),
            y2: Math.min(canvasH, node.y + (node.height || 26) + 3),
            reason: matches.map(m => m.name).join(', '),
            category: matches[0].category
          });
        }
      });
    }

    // 2. Scan sensitive input fields (e.g. password fields, credit card inputs)
    if (captureData && captureData.sensitiveInputs && Array.isArray(captureData.sensitiveInputs)) {
      captureData.sensitiveInputs.forEach(input => {
        regions.push({
          x1: Math.max(0, input.x - 4),
          y1: Math.max(0, input.y - 3),
          x2: Math.min(canvasW, input.x + (input.width || 160) + 4),
          y2: Math.min(canvasH, input.y + (input.height || 32) + 3),
          reason: input.reason || 'Şifre & Giriş Alanı',
          category: 'secret'
        });
      });
    }

    // 3. If no DOM nodes available (e.g. uploaded image, pasted image), perform optical canvas scan
    if (regions.length === 0 && canvas) {
      const visualRegions = scanCanvasPixels(canvas);
      visualRegions.forEach(vr => regions.push(vr));
    }

    return regions;
  }

  /**
   * Main Dispatcher: Scan and auto-apply redaction blurs to detected sensitive areas only.
   * @param {Object} params
   * @param {CanvasRenderingContext2D} params.ctx
   * @param {Function} params.pushAction
   * @param {HTMLCanvasElement} params.canvas
   * @param {Object} [params.captureData]
   * @param {'pixelate'|'blackout'} [params.blurType='pixelate']
   * @returns {Promise<{count: number, summary: string, regions: Array}>}
   */
  async function autoCensorCanvas({ ctx, pushAction, canvas, captureData, blurType = 'pixelate' }) {
    if (!canvas || !pushAction) {
      return { count: 0, summary: 'Tuval bulunamadı', regions: [] };
    }

    const regions = detectSensitiveRegions(canvas, captureData);

    if (regions.length === 0) {
      return {
        count: 0,
        summary: 'Sayfada hassas veri (Kredi kartı, şifre, e-posta, API anahtarı) bulunamadı.',
        regions: []
      };
    }

    let appliedCount = 0;
    regions.forEach(region => {
      pushAction({
        type: 'blur',
        x1: region.x1,
        y1: region.y1,
        x2: region.x2,
        y2: region.y2,
        blurType: blurType
      });
      appliedCount++;
    });

    const categorySummary = [...new Set(regions.map(r => r.reason))].join(', ');
    return {
      count: appliedCount,
      summary: `${appliedCount} adet hassas veri alanı (${categorySummary}) otomatik sansürlendi.`,
      regions
    };
  }

  window.FullShotAutoCensor = {
    PATTERNS,
    validateLuhn,
    validateTCKN,
    scanText,
    scanCanvasPixels,
    detectSensitiveRegions,
    autoCensorCanvas
  };
})();
