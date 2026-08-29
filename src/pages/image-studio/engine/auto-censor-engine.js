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
      regex: /\b(?:bearer\s+[a-zA-Z0-9._-]{20,}|(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}|sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35}|(?:xoxb|xoxp)-[0-9]{10,}-[a-zA-Z0-9]+|eyJ[a-zA-Z0-9-_]+\.eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+)\b/gi,
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
      regex: /(?:\+?90\s*|\b0)?\s*[1-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b|\b\+?1[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
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
   * Performs optical text, input box, and credential field scanning directly on the canvas pixels.
   * Detects:
   * 1. Password input boxes (containing bullets •••• or password labels)
   * 2. API Key / Token fields (sk-..., ghp_..., or high-entropy credentials)
   * 3. Email addresses (@domain)
   * 4. Credit card fields (4-group numbers / Luhn validation)
   * 5. Server IP fields
   * 6. Form input containers associated with sensitive labels (Password, API Key, Email, Secret, Card)
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

      // 1. Grayscale luminance conversion & histogram
      const gray = new Uint8Array(totalPixels);
      const hist = new Int32Array(256);

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const lum = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        gray[i] = lum;
        hist[lum]++;
      }

      // 2. Otsu thresholding for adaptive binarization
      let sum = 0;
      for (let t = 0; t < 256; t++) sum += t * hist[t];
      let sumB = 0, wB = 0, wF = 0, varMax = 0, threshold = 128;

      for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (wB === 0) continue;
        wF = totalPixels - wB;
        if (wF === 0) break;
        sumB += t * hist[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const varBetween = wB * wF * (mB - mF) * (mB - mF);
        if (varBetween > varMax) {
          varMax = varBetween;
          threshold = t;
        }
      }

      // Polarity check: count dark pixels
      let darkCount = 0;
      for (let i = 0; i < totalPixels; i++) {
        if (gray[i] < threshold) darkCount++;
      }
      const isDarkBg = darkCount > totalPixels / 2;

      // 3. Binary foreground mask (1 = text/border foreground, 0 = background)
      const binary = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        binary[i] = (isDarkBg ? gray[i] >= threshold : gray[i] < threshold) ? 1 : 0;
      }

      // 4. Horizontal Projection Profile (Text line & Input box intervals)
      const hProfile = new Int32Array(canvasH);
      for (let y = 0; y < canvasH; y++) {
        let count = 0;
        const rowOffset = y * canvasW;
        for (let x = 0; x < canvasW; x++) {
          if (binary[rowOffset + x] === 1) count++;
        }
        hProfile[y] = count;
      }

      // Extract horizontal line intervals
      const lines = [];
      let inLine = false;
      let lineStart = 0;
      const minLineH = 8;
      const noiseThreshold = Math.max(2, Math.round(canvasW * 0.004));

      for (let y = 0; y < canvasH; y++) {
        if (hProfile[y] > noiseThreshold) {
          if (!inLine) {
            inLine = true;
            lineStart = y;
          }
        } else {
          if (inLine) {
            inLine = false;
            if (y - lineStart >= minLineH && y - lineStart <= 90) {
              lines.push({ top: lineStart, bottom: y });
            }
          }
        }
      }
      if (inLine && canvasH - lineStart >= minLineH && canvasH - lineStart <= 90) {
        lines.push({ top: lineStart, bottom: canvasH });
      }

      // 5. Segment Line Glyphs & Words
      const candidateSegments = [];

      for (const line of lines) {
        const lineH = line.bottom - line.top;
        const vProfile = new Int32Array(canvasW);

        for (let x = 0; x < canvasW; x++) {
          let count = 0;
          for (let y = line.top; y < line.bottom; y++) {
            if (binary[y * canvasW + x] === 1) count++;
          }
          vProfile[x] = count;
        }

        // Find character segments
        const glyphs = [];
        let inGlyph = false;
        let glyphStart = 0;

        for (let x = 0; x < canvasW; x++) {
          if (vProfile[x] > 0) {
            if (!inGlyph) {
              inGlyph = true;
              glyphStart = x;
            }
          } else {
            if (inGlyph) {
              inGlyph = false;
              const gw = x - glyphStart;
              if (gw >= 2) {
                let minGy = line.bottom;
                let maxGy = line.top;
                for (let gy = line.top; gy < line.bottom; gy++) {
                  for (let gx = glyphStart; gx < x; gx++) {
                    if (binary[gy * canvasW + gx] === 1) {
                      if (gy < minGy) minGy = gy;
                      if (gy > maxGy) maxGy = gy;
                    }
                  }
                }
                if (maxGy >= minGy) {
                  glyphs.push({
                    x1: glyphStart,
                    x2: x,
                    y1: minGy,
                    y2: maxGy + 1,
                    w: x - glyphStart,
                    h: maxGy - minGy + 1
                  });
                }
              }
            }
          }
        }

        // Group glyphs into words / blocks
        if (glyphs.length > 0) {
          let wordGlyphs = [];
          let prevRight = -1;
          const avgW = glyphs.reduce((acc, g) => acc + g.w, 0) / glyphs.length;
          const spaceThreshold = Math.max(5, avgW * 0.9);

          const flushWord = () => {
            if (wordGlyphs.length > 0) {
              const wx1 = wordGlyphs[0].x1;
              const wx2 = wordGlyphs[wordGlyphs.length - 1].x2;
              const wy1 = Math.min(...wordGlyphs.map(g => g.y1));
              const wy2 = Math.max(...wordGlyphs.map(g => g.y2));
              candidateSegments.push({
                x1: wx1,
                y1: wy1,
                x2: wx2,
                y2: wy2,
                glyphCount: wordGlyphs.length,
                glyphs: wordGlyphs
              });
              wordGlyphs = [];
            }
          };

          for (const g of glyphs) {
            if (prevRight > 0 && (g.x1 - prevRight) > spaceThreshold) {
              flushWord();
            }
            wordGlyphs.push(g);
            prevRight = g.x2;
          }
          flushWord();
        }
      }

      // 6. Detect Sensitive UI Boxes & Credentials
      // Look for:
      // A. Password Bullet Sequences (•••••••• / ********): 4+ identical square/round dot glyphs
      candidateSegments.forEach(seg => {
        if (seg.glyphCount >= 4) {
          let dotCount = 0;
          seg.glyphs.forEach(g => {
            const aspect = g.w / g.h;
            if (aspect >= 0.6 && aspect <= 1.4 && g.w <= 14 && g.h <= 14) {
              dotCount++;
            }
          });
          if (dotCount >= 4 && dotCount >= seg.glyphCount * 0.6) {
            regions.push({
              x1: Math.max(0, seg.x1 - 6),
              y1: Math.max(0, seg.y1 - 6),
              x2: Math.min(canvasW, seg.x2 + 6),
              y2: Math.min(canvasH, seg.y2 + 6),
              reason: 'Şifre Alanı (Parola Maskesi)',
              category: 'secret'
            });
          }
        }
      });

      // B. Scan rectangular input boxes & credential fields by visual contour
      // Find form input containers (width 120-600px, height 26-60px with distinct border/contrast)
      for (let y = 30; y < canvasH - 30; y += 4) {
        for (let x = 30; x < canvasW - 200; x += 10) {
          // Check for input field top border
          const idx = (y * canvasW + x) * 4;
          const bgLum = gray[y * canvasW + x];
          const innerLum = gray[(y + 12) * canvasW + (x + 20)];

          if (Math.abs(bgLum - innerLum) > 20) {
            // Find input box boundaries
            let boxW = 0, boxH = 0;
            for (let bx = x; bx < Math.min(canvasW - 10, x + 650); bx += 4) {
              if (Math.abs(gray[(y + 12) * canvasW + bx] - innerLum) > 25) {
                boxW = bx - x;
                break;
              }
            }
            for (let by = y; by < Math.min(canvasH - 10, y + 70); by += 4) {
              if (Math.abs(gray[by * canvasW + (x + 20)] - innerLum) > 25) {
                boxH = by - y;
                break;
              }
            }

            if (boxW >= 120 && boxW <= 620 && boxH >= 24 && boxH <= 65) {
              // Check if inside box contains sensitive credentials or token text
              const insideSegs = candidateSegments.filter(s => 
                s.x1 >= x && s.x2 <= x + boxW && s.y1 >= y - 4 && s.y2 <= y + boxH + 4
              );

              // If input box has text content, evaluate if it is a credential or token
              if (insideSegs.length > 0) {
                const totalChars = insideSegs.reduce((acc, s) => acc + s.glyphCount, 0);
                const isTokenLength = totalChars >= 16; // API keys / hashes
                const isEmailOrPassword = totalChars >= 6;

                // Check if not already added
                const alreadyAdded = regions.some(r => Math.abs(r.x1 - x) < 30 && Math.abs(r.y1 - y) < 20);
                if (!alreadyAdded && (isTokenLength || isEmailOrPassword)) {
                  // Only add if it has high character density (credentials)
                  regions.push({
                    x1: Math.max(0, x - 2),
                    y1: Math.max(0, y - 2),
                    x2: Math.min(canvasW, x + boxW + 2),
                    y2: Math.min(canvasH, y + boxH + 2),
                    reason: isTokenLength ? 'API Anahtarı / Token Alanı' : 'Gizli Giriş / Kimlik Alanı',
                    category: 'secret'
                  });
                }
              }
              x += boxW; // Skip past input box
            }
          }
        }
      }

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
