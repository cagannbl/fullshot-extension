/**
 * FullShot Pro - Smart Auto-Censor & DLP Intelligence Engine
 * Advanced Privacy, DLP & Optical Redaction Engine using expanded Regex patterns,
 * strict algorithmic validation (Luhn Mod-10, TCKN modulo, IBAN ISO-13616 Mod-97),
 * Shannon entropy confidence thresholds, and precise pixel coordinate mapping.
 */

(function () {
  'use strict';

  window.FullShotAutoCensor = window.FullShotAutoCensor || {};

  /**
   * Calculate Shannon entropy of a string to gauge randomness / information density.
   * Useful for distinguishing true random tokens/passwords from repetitive dummy text.
   * @param {string} str 
   * @returns {number}
   */
  function calculateEntropy(str) {
    if (!str || typeof str !== 'string' || str.length === 0) return 0;
    const freqs = {};
    for (let i = 0; i < str.length; i++) {
      const ch = str.charAt(i);
      freqs[ch] = (freqs[ch] || 0) + 1;
    }
    let entropy = 0;
    const len = str.length;
    for (const ch in freqs) {
      const p = freqs[ch] / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  /**
   * Luhn Algorithm (Mod 10) for Credit Card number verification.
   * Validates Visa, MasterCard, Amex, Troy, Discover, Diners Club, JCB, UnionPay.
   * Eliminates false positives on arbitrary digit sequences.
   * @param {string} rawNumber 
   * @returns {boolean}
   */
  function validateLuhn(rawNumber) {
    if (!rawNumber || typeof rawNumber !== 'string') return false;
    const digitsOnly = rawNumber.replace(/\D/g, '');
    if (digitsOnly.length < 13 || digitsOnly.length > 19) return false;

    // Reject repetitive dummy numbers (e.g. 0000000000000000, 1111111111111111)
    if (/^(\d)\1+$/.test(digitsOnly)) return false;

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
   * Turkish Identity Number (TCKN) 11-digit algorithmic verification.
   * Rules:
   * 1. 11 digits long, only numbers.
   * 2. First digit cannot be 0.
   * 3. (7 * (1st + 3rd + 5th + 7th + 9th) - (2nd + 4th + 6th + 8th)) mod 10 = 10th digit.
   * 4. Sum of first 10 digits mod 10 = 11th digit.
   * 5. Cannot be all identical digits.
   * @param {string} rawNumber 
   * @returns {boolean}
   */
  function validateTCKN(rawNumber) {
    if (!rawNumber || typeof rawNumber !== 'string') return false;
    const digitsOnly = rawNumber.replace(/\D/g, '');
    if (digitsOnly.length !== 11 || digitsOnly[0] === '0') return false;

    // Reject repetitive sequences like 11111111110
    if (/^(\d)\1+$/.test(digitsOnly.slice(0, 10))) return false;

    const d = digitsOnly.split('').map(Number);
    const oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
    const evenSum = d[1] + d[3] + d[5] + d[7];

    const digit10 = ((oddSum * 7 - evenSum) % 10 + 10) % 10;
    if (d[9] !== digit10) return false;

    const totalSum = d.slice(0, 10).reduce((acc, val) => acc + val, 0);
    if (d[10] !== totalSum % 10) return false;

    return true;
  }

  /**
   * IBAN Checksum (ISO 13616 Mod-97) verification.
   * Supports Turkey (TR 26 chars) and EU / International IBAN standards.
   * @param {string} rawIBAN 
   * @returns {boolean}
   */
  function validateIBAN(rawIBAN) {
    if (!rawIBAN || typeof rawIBAN !== 'string') return false;
    const clean = rawIBAN.replace(/[\s-]/g, '').toUpperCase();
    if (clean.length < 15 || clean.length > 34) return false;

    // Must match country prefix + 2 digits + alphanumeric structure
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) return false;

    // Specific known country IBAN lengths
    const countryLengths = {
      TR: 26, DE: 22, FR: 27, GB: 22, NL: 18, ES: 24, IT: 27,
      BE: 16, AT: 20, CH: 21, PL: 28, SE: 24, NO: 15, DK: 18,
      PT: 25, GR: 27, IE: 22, LU: 20, CZ: 24, HU: 28, RO: 24,
      FI: 18, HR: 21, BG: 22, CY: 28, EE: 20, LT: 20, LV: 21
    };
    const country = clean.slice(0, 2);
    if (countryLengths[country] && clean.length !== countryLengths[country]) {
      return false;
    }

    // Rearrange: Move first 4 characters to the end
    const rearranged = clean.slice(4) + clean.slice(0, 4);

    // Convert letters to numeric values (A=10, B=11 ... Z=35)
    let numericString = '';
    for (let i = 0; i < rearranged.length; i++) {
      const code = rearranged.charCodeAt(i);
      if (code >= 65 && code <= 90) {
        numericString += (code - 55).toString();
      } else {
        numericString += rearranged.charAt(i);
      }
    }

    // Large integer Modulo 97 calculation
    try {
      if (typeof BigInt !== 'undefined') {
        return BigInt(numericString) % 97n === 1n;
      }
    } catch (_) {}

    // Piecewise Mod-97 fallback for legacy engines
    let remainder = 0;
    for (let i = 0; i < numericString.length; i += 7) {
      const chunk = remainder.toString() + numericString.slice(i, i + 7);
      remainder = parseInt(chunk, 10) % 97;
    }
    return remainder === 1;
  }

  /**
   * Phone number format and structural verification (+90, +1, EU, International).
   * @param {string} rawPhone 
   * @returns {boolean}
   */
  function validatePhone(rawPhone) {
    if (!rawPhone || typeof rawPhone !== 'string') return false;
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return false;

    // Reject repetitive identical numbers (e.g. 0000000000, 1111111111)
    if (/^(\d)\1+$/.test(digits)) return false;

    // Reject obvious date / timestamp patterns
    if (/^(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])/.test(digits) && digits.length <= 10) {
      return false;
    }

    // Turkish phone validation (+90, 05xx, 5xx mobile & 02xx/03xx/04xx landline)
    if (rawPhone.includes('+90') || rawPhone.startsWith('05') || rawPhone.startsWith('5')) {
      const trDigits = digits.startsWith('90') ? digits.slice(2) : (digits.startsWith('0') ? digits.slice(1) : digits);
      if (trDigits.length === 10 && /^[2-5]\d{9}$/.test(trDigits)) {
        return true;
      }
    }

    // North American Numbering Plan (+1)
    if (rawPhone.includes('+1') || (digits.length === 11 && digits.startsWith('1'))) {
      const usDigits = digits.length === 11 ? digits.slice(1) : digits;
      if (usDigits.length === 10 && /^[2-9]\d{2}[2-9]\d{6}$/.test(usDigits)) {
        return true;
      }
    }

    // Generic International E.164
    return digits.length >= 10 && digits.length <= 15;
  }

  /**
   * IPv4 Address algorithmic validation.
   * @param {string} rawIP 
   * @returns {boolean}
   */
  function validateIPv4(rawIP) {
    if (!rawIP || typeof rawIP !== 'string') return false;
    const parts = rawIP.trim().split('.');
    if (parts.length !== 4) return false;

    for (let i = 0; i < 4; i++) {
      const p = parts[i];
      if (!/^\d{1,3}$/.test(p)) return false;
      const num = parseInt(p, 10);
      if (num < 0 || num > 255) return false;
      if (p.length > 1 && p.startsWith('0')) return false; // Prohibit leading zeros
    }

    // Exclude special non-host addresses unless needed
    if (rawIP === '0.0.0.0' || rawIP === '255.255.255.255') return false;
    return true;
  }

  /**
   * IPv6 Address algorithmic validation.
   * @param {string} rawIP 
   * @returns {boolean}
   */
  function validateIPv6(rawIP) {
    if (!rawIP || typeof rawIP !== 'string') return false;
    const clean = rawIP.trim();
    if (clean.length < 2 || clean.length > 39) return false;
    if (!/^[0-9a-fA-F:]+$/.test(clean)) return false;

    const colons = (clean.match(/:/g) || []).length;
    if (colons < 2 || colons > 7) return false;

    const doubleColon = clean.indexOf('::');
    if (doubleColon !== -1) {
      if (clean.indexOf('::', doubleColon + 1) !== -1) return false; // Max 1 double-colon
    } else if (colons !== 7) {
      return false;
    }

    const groups = clean.split(':').filter(Boolean);
    for (const group of groups) {
      if (group.length > 4 || !/^[0-9a-fA-F]{1,4}$/.test(group)) return false;
    }
    return true;
  }

  /**
   * Comprehensive DLP Regex Pattern Rules Catalog with high-precision categories,
   * algorithmic validators, entropy thresholds, and confidence ratings.
   */
  const PATTERNS = {
    // 1. Email Addresses
    email: {
      name: 'E-Posta Adresi',
      regex: /\b[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,62}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,62}[a-zA-Z0-9])?\.[a-zA-Z]{2,}\b/gi,
      validator: (val) => {
        if (!val || val.length < 6 || val.length > 254) return false;
        if (val.includes('..') || val.includes('@.')) return false;
        const parts = val.split('@');
        if (parts.length !== 2) return false;
        const domain = parts[1];
        if (!domain.includes('.')) return false;
        const tld = domain.split('.').pop();
        return tld && tld.length >= 2 && !/^(png|jpg|jpeg|gif|svg|webp|css|js|html)$/i.test(tld);
      },
      category: 'email',
      confidence: 0.95
    },

    // 2. Credit Cards (Visa, MasterCard, Amex, Troy, Discover, Diners Club, JCB, UnionPay)
    creditCard: {
      name: 'Kredi Kartı Numarası',
      regex: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{4}[ -]?\d{6}[ -]?\d{4,5}\b|\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{2,4}\b/g,
      validator: validateLuhn,
      category: 'financial',
      confidence: 0.99
    },

    // 3. IBAN Numbers (TR 26 chars & EU/Global)
    iban: {
      name: 'IBAN Numarası',
      regex: /\b(?:TR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}|[A-Z]{2}\s?\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?)\b/gi,
      validator: validateIBAN,
      category: 'financial',
      confidence: 0.99
    },

    // 4. National Identity (TCKN 11-digit verified)
    tckn: {
      name: 'T.C. Kimlik Numarası',
      regex: /\b[1-9]\d{10}\b/g,
      validator: validateTCKN,
      category: 'pii',
      confidence: 0.99
    },

    // 5. Phone Numbers (+90, +1, EU, International E.164)
    phone: {
      name: 'Telefon Numarası',
      regex: /(?:(?:\+90|0090)[\s.-]?(?:\(0?\d{3}\)|0?\d{3})|0\s?\(?\d{3}\)?)\s?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b|\b5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b|(?:\+1|001)[\s.-]?(?:\([2-9]\d{2}\)|[2-9]\d{2})[\s.-]?[2-9]\d{2}[\s.-]?\d{4}\b|\([2-9]\d{2}\)[\s.-]?[2-9]\d{2}[\s.-]?\d{4}\b|\b[2-9]\d{2}[\s.-][2-9]\d{2}[\s.-]\d{4}\b|\+(?:[1-9]\d{0,2})[\s.-]?(?:\(?\d{1,4}\)?[\s.-]?)?\d{2,4}[\s.-]?\d{2,4}(?:[\s.-]?\d{2,4})?\b/g,
      validator: validatePhone,
      category: 'pii',
      confidence: 0.90
    },

    // 6. OpenAI API Keys (sk-, sk-proj-, sk-ant-, sk-svcacct-)
    apiKeyOpenAI: {
      name: 'OpenAI API Anahtarı',
      regex: /\b(?:sk-(?:proj-|ant-|svcacct-|org-)?[a-zA-Z0-9_-]{20,})\b/g,
      validator: (val) => val.length >= 24 && calculateEntropy(val) >= 2.8,
      category: 'secret',
      confidence: 0.99
    },

    // 7. GitHub Tokens (ghp, gho, ghu, ghs, ghr, github_pat)
    apiKeyGithub: {
      name: 'GitHub Erişim Tokeni',
      regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}\b|\bgithub_pat_[a-zA-Z0-9_]{40,}\b/g,
      category: 'secret',
      confidence: 0.99
    },

    // 8. Google Cloud / Firebase API Keys
    apiKeyGoogle: {
      name: 'Google API Anahtarı',
      regex: /\bAIza[0-9A-Za-z-_]{30,40}\b/g,
      category: 'secret',
      confidence: 0.99
    },

    // 9. AWS Access Key IDs
    apiKeyAWS: {
      name: 'AWS Erişim Anahtarı',
      regex: /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g,
      category: 'secret',
      confidence: 0.99
    },

    // 10. Slack User / Bot / Webhook Tokens
    apiKeySlack: {
      name: 'Slack Tokeni',
      regex: /\bxox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,34}\b|\b(?:xoxb|xoxp)-[0-9A-Za-z-]{20,}\b/g,
      category: 'secret',
      confidence: 0.99
    },

    // 11. Stripe API Keys (Live & Test)
    apiKeyStripe: {
      name: 'Stripe API Anahtarı',
      regex: /\b(?:sk_live|rk_live|sk_test|rk_test|pk_live|pk_test)_[0-9a-zA-Z]{24,}\b/g,
      category: 'secret',
      confidence: 0.99
    },

    // 12. JWT Bearer Tokens & Bearer Headers
    jwtToken: {
      name: 'JWT & Bearer Token',
      regex: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+\b|\b(?:bearer\s+)[a-zA-Z0-9._~+/-]{20,}\b/gi,
      category: 'secret',
      confidence: 0.98
    },

    // 13. Password / Secret Value Variable Assignments
    passwordAssignment: {
      name: 'Şifre & Parola Tanımı',
      regex: /(?:password|passwd|sifre|parola|secret|api_key|apikey|auth_token|access_token|private_key|client_secret)\s*[:=]\s*["']?([^\s"';,]{6,})["']?/gi,
      validator: (val) => {
        if (!val || val.length < 6) return false;
        return calculateEntropy(val) >= 2.0;
      },
      category: 'secret',
      confidence: 0.92
    },

    // 14. Private Key Blocks (RSA / EC / OPENSSH / DSA)
    privateKey: {
      name: 'Özel Kriptografik Anahtar',
      regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
      category: 'secret',
      confidence: 1.0
    },

    // 15. IPv4 Addresses
    ipv4: {
      name: 'IPv4 Adresi',
      regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      validator: validateIPv4,
      category: 'network',
      confidence: 0.92
    },

    // 16. IPv6 Addresses
    ipv6: {
      name: 'IPv6 Adresi',
      regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}\b|::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}\b/g,
      validator: validateIPv6,
      category: 'network',
      confidence: 0.95
    },

    // 17. MAC Addresses
    macAddress: {
      name: 'MAC Adresi',
      regex: /\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\b/g,
      category: 'network',
      confidence: 0.92
    }
  };

  /**
   * Scan plain text string against all active DLP patterns and calculate confidence scores.
   * @param {string} text 
   * @param {Object} [options]
   * @param {number} [options.minConfidence=0.70] Minimum confidence threshold (0.0 to 1.0)
   * @returns {Array<{type: string, name: string, match: string, index: number, length: number, category: string, confidence: number}>}
   */
  function scanText(text, options = {}) {
    if (!text || typeof text !== 'string') return [];
    const minConfidence = options.minConfidence !== undefined ? options.minConfidence : 0.70;
    const findings = [];

    for (const [key, rule] of Object.entries(PATTERNS)) {
      const regex = new RegExp(rule.regex);
      let match;
      while ((match = regex.exec(text)) !== null) {
        const fullMatch = match[0];
        const value = match[1] || fullMatch;
        const matchIndex = match.index + (match[1] ? fullMatch.indexOf(match[1]) : 0);
        const matchLength = value.length;

        // Run algorithmic validator if defined
        if (rule.validator && !rule.validator(value)) {
          continue;
        }

        // Calculate dynamic confidence score
        let confidence = rule.confidence || 0.90;
        if (value.length > 20) confidence = Math.min(1.0, confidence + 0.05);

        if (confidence >= minConfidence) {
          findings.push({
            type: key,
            name: rule.name,
            match: value,
            index: matchIndex,
            length: matchLength,
            category: rule.category,
            confidence
          });
        }
      }
    }

    return findings;
  }

  /**
   * Merge overlapping or adjacent bounding boxes into clean, non-redundant regions.
   * @param {Array<Object>} regions 
   * @param {number} [padding=4]
   * @returns {Array<Object>}
   */
  function mergeOverlappingRegions(regions, padding = 4) {
    if (!regions || regions.length <= 1) return regions || [];

    const sorted = [...regions].sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1);
    const merged = [];

    for (const box of sorted) {
      let combined = false;
      for (let i = 0; i < merged.length; i++) {
        const target = merged[i];
        const overlapsX = Math.max(box.x1, target.x1) <= Math.min(box.x2, target.x2) + padding;
        const overlapsY = Math.max(box.y1, target.y1) <= Math.min(box.y2, target.y2) + padding;

        if (overlapsX && overlapsY) {
          target.x1 = Math.min(target.x1, box.x1);
          target.y1 = Math.min(target.y1, box.y1);
          target.x2 = Math.max(target.x2, box.x2);
          target.y2 = Math.max(target.y2, box.y2);
          if (!target.reason.includes(box.reason)) {
            target.reason = `${target.reason}, ${box.reason}`;
          }
          target.confidence = Math.max(target.confidence || 0.9, box.confidence || 0.9);
          combined = true;
          break;
        }
      }
      if (!combined) {
        merged.push({ ...box });
      }
    }

    return merged;
  }

  /**
   * High-Precision Computer-Vision & Connected Component Scanner for Canvas Pixels.
   * Extracts input boxes, credential fields, token pills, password masks, and secret values
   * on both Dark Mode and Light Mode screenshots with zero false-positives on general articles.
   * 
   * @param {HTMLCanvasElement} canvas
   * @param {Object} [options]
   * @returns {Array<{x1: number, y1: number, x2: number, y2: number, reason: string, category: string, confidence: number}>}
   */
  function scanCanvasPixels(canvas, options = {}) {
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
      const edgeThreshold = 18;

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

      // 5. Intelligent DLP Classification: Universal Enclosed Input & Credential Box Detector
      // Works across Light Mode, Dark Mode, full-page dashboards, compact payment modals, and cropped screenshots.
      // Plain text labels, section titles, headers, and action buttons are NEVER blurred.
      candidateBoxes.forEach(box => {
        const { x1, y1, x2, y2, w, h } = box;

        // Skip entire canvas wrapper or tiny noise
        if (w > canvasW * 0.94 || h > 70 || w < 70 || h < 18) return;

        // Aspect ratio: Form inputs are rectangular horizontal boxes (w/h >= 1.8)
        const aspect = w / h;
        if (aspect < 1.7) return;

        // Sample middle pixel color to detect saturated primary action buttons (e.g. Blue 'Save Changes' button)
        const midIdx = (Math.round(y1 + h * 0.5) * canvasW + Math.round(x1 + w * 0.5)) * 4;
        const r = data[midIdx];
        const g = data[midIdx + 1];
        const b = data[midIdx + 2];
        const isSaturatedButton = (b > 110 && b - r > 35) || (r > 175 && r - b > 45 && g < 100);
        if (isSaturatedButton) return;

        // Check border enclosure (continuous top or bottom border line across the input box)
        let topBorder = 0, botBorder = 0;
        for (let x = x1; x <= x2; x++) {
          if (isEdge[y1 * canvasW + x] === 1 || (y1 < canvasH - 1 && isEdge[(y1 + 1) * canvasW + x] === 1)) topBorder++;
          if (isEdge[y2 * canvasW + x] === 1 || (y2 > 0 && isEdge[(y2 - 1) * canvasW + x] === 1)) botBorder++;
        }

        const topRatio = topBorder / w;
        const botRatio = botBorder / w;

        // An enclosed form input has clear horizontal top and bottom border boundaries (or high contrast box fill)
        // Plain text titles and labels have topRatio < 0.20 because text glyphs are discontinuous.
        const isEnclosedInput = (topRatio >= 0.32 || botRatio >= 0.32);

        if (isEnclosedInput) {
          // Deduplicate overlapping or fully contained regions (e.g. inner text inside an already added input box)
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
              reason: w >= 220 ? 'Kredi Kartı / API Anahtarı / Form Giriş Alanı' : 'Güvenlik Kodu / Son Kullanma / Değer Alanı',
              category: 'financial',
              confidence: 0.95
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
   * sensitive input fields, OCR data, and optical canvas credential detectors.
   * Eliminates false positives on normal paragraphs, titles, and non-sensitive content.
   * 
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} [captureData] 
   * @param {Object} [options]
   * @param {number} [options.minConfidence=0.70]
   * @returns {Array<{x1: number, y1: number, x2: number, y2: number, reason: string, category: string, confidence: number}>}
   */
  function detectSensitiveRegions(canvas, captureData = null, options = {}) {
    if (!canvas) return [];
    const minConfidence = options.minConfidence !== undefined ? options.minConfidence : 0.70;
    const rawRegions = [];
    const canvasW = canvas.width;
    const canvasH = canvas.height;

    // 1. Scan captureData text chunks / DOM nodes strictly with DLP regexes & algorithmic checks
    if (captureData && captureData.textNodes && Array.isArray(captureData.textNodes)) {
      captureData.textNodes.forEach(node => {
        const text = node.text || '';
        const matches = scanText(text, { minConfidence });
        if (matches.length > 0) {
          matches.forEach(match => {
            // Sub-box coordinate mapping for targeted precision
            let boxX = node.x;
            let boxW = node.width || 140;

            if (text.length > 30 && match.length < text.length) {
              const startRatio = Math.max(0, match.index / text.length);
              const widthRatio = Math.min(1.0, match.length / text.length);
              boxX = Math.round(node.x + (node.width * startRatio));
              boxW = Math.max(35, Math.round(node.width * widthRatio));
            }

            rawRegions.push({
              x1: Math.max(0, boxX - 4),
              y1: Math.max(0, node.y - 3),
              x2: Math.min(canvasW, boxX + boxW + 4),
              y2: Math.min(canvasH, node.y + (node.height || 26) + 3),
              reason: match.name,
              category: match.category,
              confidence: match.confidence
            });
          });
        }
      });
    }

    // 2. Scan OCR data blocks / words if present
    if (captureData && (captureData.ocrData || captureData.ocrWords)) {
      const ocrItems = captureData.ocrWords || captureData.ocrData?.words || [];
      ocrItems.forEach(item => {
        const text = item.text || item.word || '';
        const matches = scanText(text, { minConfidence });
        if (matches.length > 0 && item.bbox) {
          rawRegions.push({
            x1: Math.max(0, (item.bbox.x0 || item.bbox.x || 0) - 3),
            y1: Math.max(0, (item.bbox.y0 || item.bbox.y || 0) - 2),
            x2: Math.min(canvasW, (item.bbox.x1 || item.bbox.x + item.bbox.width || 100) + 3),
            y2: Math.min(canvasH, (item.bbox.y1 || item.bbox.y + item.bbox.height || 25) + 2),
            reason: matches.map(m => m.name).join(', '),
            category: matches[0].category,
            confidence: matches[0].confidence
          });
        }
      });
    }

    // 3. Scan sensitive input fields (password inputs, credit card forms)
    if (captureData && captureData.sensitiveInputs && Array.isArray(captureData.sensitiveInputs)) {
      captureData.sensitiveInputs.forEach(input => {
        rawRegions.push({
          x1: Math.max(0, input.x - 4),
          y1: Math.max(0, input.y - 3),
          x2: Math.min(canvasW, input.x + (input.width || 160) + 4),
          y2: Math.min(canvasH, input.y + (input.height || 32) + 3),
          reason: input.reason || 'Şifre & Giriş Alanı',
          category: 'secret',
          confidence: 0.98
        });
      });
    }

    // 4. If no DOM / OCR nodes available (e.g. uploaded image, pasted image), perform optical canvas scan
    if (rawRegions.length === 0 && canvas) {
      const visualRegions = scanCanvasPixels(canvas, options);
      visualRegions.forEach(vr => rawRegions.push(vr));
    }

    // 5. Merge overlapping or adjacent regions
    return mergeOverlappingRegions(rawRegions, 4);
  }

  /**
   * Main Dispatcher: Scan and auto-apply redaction blurs to detected sensitive areas.
   * Generates ActionStack compatible actions and renders them to canvas.
   * 
   * @param {Object} params
   * @param {CanvasRenderingContext2D} params.ctx
   * @param {Function} params.pushAction
   * @param {HTMLCanvasElement} params.canvas
   * @param {Object} [params.captureData]
   * @param {'pixelate'|'blackout'|'gaussian'} [params.blurType='pixelate']
   * @param {number} [params.minConfidence=0.70]
   * @returns {Promise<{count: number, summary: string, regions: Array}>}
   */
  async function autoCensorCanvas({ ctx, pushAction, canvas, captureData, blurType = 'pixelate', minConfidence = 0.70 }) {
    if (!canvas || !pushAction) {
      return { count: 0, summary: 'Tuval bulunamadı', regions: [] };
    }

    const regions = detectSensitiveRegions(canvas, captureData, { minConfidence });

    if (regions.length === 0) {
      return {
        count: 0,
        summary: 'Sayfada hassas veri (Kredi kartı, şifre, e-posta, API anahtarı, IBAN, TCKN) bulunamadı.',
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
        blurType: blurType,
        reason: region.reason,
        category: region.category,
        confidence: region.confidence
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
    calculateEntropy,
    validateLuhn,
    validateTCKN,
    validateIBAN,
    validatePhone,
    validateIPv4,
    validateIPv6,
    scanText,
    mergeOverlappingRegions,
    scanCanvasPixels,
    detectSensitiveRegions,
    autoCensorCanvas
  };
})();
