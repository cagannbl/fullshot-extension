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
   * Detect sensitive regions on canvas using DOM text metadata, heuristic input field detectors,
   * and visual density layout scanners.
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} [captureData] 
   * @returns {Array<{x1: number, y1: number, x2: number, y2: number, reason: string, category: string}>}
   */
  function detectSensitiveRegions(canvas, captureData = null) {
    if (!canvas) return [];
    const regions = [];
    const canvasW = canvas.width;
    const canvasH = canvas.height;

    // 1. Scan captureData text chunks / DOM nodes if available
    if (captureData && captureData.textNodes && Array.isArray(captureData.textNodes)) {
      captureData.textNodes.forEach(node => {
        const matches = scanText(node.text || '');
        if (matches.length > 0) {
          regions.push({
            x1: Math.max(0, node.x - 4),
            y1: Math.max(0, node.y - 3),
            x2: Math.min(canvasW, node.x + (node.width || 120) + 4),
            y2: Math.min(canvasH, node.y + (node.height || 24) + 3),
            reason: matches.map(m => m.name).join(', '),
            category: matches[0].category
          });
        }
      });
    }

    // 2. Scan URL and Title for leakage (e.g. Tokens, emails or passwords in query params)
    const pageUrl = captureData?.url || '';
    const urlMatches = scanText(pageUrl);
    if (urlMatches.length > 0) {
      // If URL has tokens/keys, censor address bar region at top if full page capture
      regions.push({
        x1: Math.round(canvasW * 0.15),
        y1: 10,
        x2: Math.round(canvasW * 0.85),
        y2: 44,
        reason: `URL Parametresinde Hassas Veri (${urlMatches[0].name})`,
        category: urlMatches[0].category
      });
    }

    // 3. Fallback Heuristic Computer-Vision Scan for Password Input dots (••••••) or sensitive label boxes
    if (regions.length === 0) {
      try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imgData = ctx.getImageData(0, 0, Math.min(canvasW, 1920), Math.min(canvasH, 1080));
        const data = imgData.data;
        const width = imgData.width;
        const height = imgData.height;

        // Scan for consecutive password bullet patterns (dark dots on light bg or vice versa)
        let bulletStreak = 0;
        let lastBulletX = 0;

        for (let y = 30; y < height - 30; y += 14) {
          for (let x = 30; x < width - 60; x += 10) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const isDark = (r + g + b) / 3 < 50;

            if (isDark) {
              if (x - lastBulletX < 24 && x - lastBulletX > 6) {
                bulletStreak++;
              } else {
                bulletStreak = 1;
              }
              lastBulletX = x;

              if (bulletStreak >= 6) {
                const boxX1 = Math.max(0, x - bulletStreak * 14 - 10);
                const boxY1 = Math.max(0, y - 12);
                const boxX2 = Math.min(canvasW, x + 20);
                const boxY2 = Math.min(canvasH, y + 16);

                // Ensure non-duplicate
                const alreadyHas = regions.some(r => Math.hypot(r.x1 - boxX1, r.y1 - boxY1) < 40);
                if (!alreadyHas) {
                  regions.push({
                    x1: boxX1,
                    y1: boxY1,
                    x2: boxX2,
                    y2: boxY2,
                    reason: 'Şifre / Parola Maskeli Alan',
                    category: 'secret'
                  });
                }
                bulletStreak = 0;
              }
            }
          }
        }
      } catch (e) {
        // Image data read safety
      }
    }

    return regions;
  }

  /**
   * Main Dispatcher: Scan and auto-apply redaction blurs to all detected sensitive areas.
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
      // If nothing found automatically, create a smart sample privacy bounding box or notify
      return {
        count: 0,
        summary: 'Sayfada otomatik sansürlenecek açık kredi kartı, şifre veya e-posta tespit edilmedi.',
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
      summary: `${appliedCount} adet hassas alan (${categorySummary}) otomatik sansürlendi.`,
      regions
    };
  }

  window.FullShotAutoCensor = {
    PATTERNS,
    validateLuhn,
    validateTCKN,
    scanText,
    detectSensitiveRegions,
    autoCensorCanvas
  };
})();
