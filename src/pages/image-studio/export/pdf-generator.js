/**
 * FullShot Pro - Native Pure JS PDF Generator
 * Manifest V3 compatible, 100% offline, zero external dependencies.
 * Creates standard PDF 1.4 documents with single-page or paginated multi-page A4 layouts.
 * Full UTF-8 & Turkish character set support (ç, ğ, ı, ö, ş, ü, İ, Ç, Ğ, Ö, Ş, Ü).
 */

class PDFDocumentBuilder {
  constructor() {
    this.objects = [];
  }

  addObject(content) {
    const objNum = this.objects.length + 1;
    this.objects.push({ num: objNum, content });
    return objNum;
  }

  // Convert binary & text chunks into standard PDF 1.4 Blob
  build(infoObjNum = null) {
    const encoder = new TextEncoder();
    const parts = [];
    let currentOffset = 0;

    const pushString = (str) => {
      const bytes = encoder.encode(str);
      parts.push(bytes);
      currentOffset += bytes.length;
    };

    const pushBytes = (uint8) => {
      parts.push(uint8);
      currentOffset += uint8.length;
    };

    // PDF 1.4 Binary Header (with 4 high-bit binary bytes for binary stream detection)
    pushString('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    const xrefOffsets = [];

    // Write Objects
    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i];
      xrefOffsets[obj.num] = currentOffset;

      pushString(`${obj.num} 0 obj\n`);

      if (typeof obj.content === 'string') {
        pushString(obj.content);
        pushString('\nendobj\n');
      } else if (obj.content.type === 'stream') {
        const dict = obj.content.dict;
        const streamBytes = obj.content.bytes;
        pushString(`<< ${dict} /Length ${streamBytes.length} >>\nstream\n`);
        pushBytes(streamBytes);
        pushString('\nendstream\nendobj\n');
      }
    }

    // XRef Table
    const startXref = currentOffset;
    const totalObjs = this.objects.length + 1;
    pushString(`xref\n0 ${totalObjs}\n`);
    pushString('0000000000 65535 f \n');

    for (let i = 1; i <= this.objects.length; i++) {
      const offset = xrefOffsets[i] || 0;
      const padded = String(offset).padStart(10, '0');
      pushString(`${padded} 00000 n \n`);
    }

    // Trailer
    const infoPart = infoObjNum ? ` /Info ${infoObjNum} 0 R` : '';
    pushString(`trailer\n<< /Size ${totalObjs} /Root 1 0 R${infoPart} >>\nstartxref\n${startXref}\n%%EOF\n`);

    // Combine all parts into single Uint8Array
    const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const part of parts) {
      result.set(part, pos);
      pos += part.length;
    }

    return new Blob([result], { type: 'application/pdf' });
  }
}

/**
 * Encodes a Unicode string (supporting Turkish characters) into PDF UTF-16BE hex format.
 * PDF readers (Chrome, Adobe Acrobat, Edge, Preview) natively parse <FEFF...> hex strings in Info dicts.
 */
function utf16HexEncode(str) {
  if (!str) return '<FEFF>';
  let hex = 'FEFF'; // UTF-16BE Byte Order Mark
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hex += code.toString(16).padStart(4, '0').toUpperCase();
  }
  return `<${hex}>`;
}

/**
 * Converts a Canvas/Image element to raw JPEG Uint8Array bytes.
 */
async function canvasToJpegBytes(canvas, quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas JPEG dönüşümü başarısız oldu.'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(new Uint8Array(reader.result));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    }, 'image/jpeg', quality);
  });
}

/**
 * Safe PDF Text Formatter with Turkish Character & UTF-8 transliteration for Type 1 Helvetica font streams.
 */
function safePdfText(text) {
  if (!text) return '';

  const turkishMap = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };

  let clean = String(text).replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => turkishMap[ch] || ch);

  // Normalize other Unicode diacritics
  clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Escape standard PDF structural literals (\, (, ))
  clean = clean
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

  // Keep all standard printable ASCII characters
  return clean.replace(/[^\x20-\x7E]/g, ' ');
}

/**
 * 1. Generate Single-Page PDF matching image aspect ratio with full Turkish UTF-16 metadata
 */
async function generateSinglePagePDF(imgOrCanvas, title = 'FullShot Ekran Görüntüsü') {
  const imgWidth = imgOrCanvas.naturalWidth || imgOrCanvas.width;
  const imgHeight = imgOrCanvas.naturalHeight || imgOrCanvas.height;

  // Convert full image/canvas to JPEG
  const canvas = document.createElement('canvas');
  canvas.width = imgWidth;
  canvas.height = imgHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, imgWidth, imgHeight);
  ctx.drawImage(imgOrCanvas, 0, 0);

  const jpegBytes = await canvasToJpegBytes(canvas, 0.95);

  // PDF standard points (72 pt per inch, base scale 0.75 from 96 dpi)
  const scale = 72 / 96;
  const pdfWidth = Math.round(imgWidth * scale);
  const pdfHeight = Math.round(imgHeight * scale);

  const builder = new PDFDocumentBuilder();

  // Obj 1: Catalog
  builder.addObject('<< /Type /Catalog /Pages 2 0 R >>');

  // Obj 2: Pages container
  builder.addObject('<< /Type /Pages /Kids [ 3 0 R ] /Count 1 >>');

  // Obj 4: Font
  const fontObj = builder.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  // Obj 5: Image XObject
  const imgObj = builder.addObject({
    type: 'stream',
    dict: `/Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
    bytes: jpegBytes
  });

  // Obj 6: Content Stream
  const contentStr = `q\n${pdfWidth} 0 0 ${pdfHeight} 0 0 cm\n/Im1 Do\nQ\n`;
  const contentBytes = new TextEncoder().encode(contentStr);
  const contentObj = builder.addObject({
    type: 'stream',
    dict: '',
    bytes: contentBytes
  });

  // Obj 3: Page Object
  builder.addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${pdfWidth} ${pdfHeight} ] /Contents ${contentObj} 0 R /Resources << /ProcSet [ /PDF /Text /ImageC ] /XObject << /Im1 ${imgObj} 0 R >> /Font << /F1 ${fontObj} 0 R >> >> >>`);

  // Obj 7: Info Object with UTF-16BE Turkish Title
  const now = new Date();
  const dateIso = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const infoObj = builder.addObject(`<< /Title ${utf16HexEncode(title)} /Creator (FullShot Pro - Chrome Extension) /Producer (FullShot Pro PDF Engine 1.4) /CreationDate (D:${dateIso}Z) >>`);

  return builder.build(infoObj);
}

/**
 * 2. Generate Paginated Multi-Page A4 PDF
 * Fits long/tall screenshots onto clean A4 pages with crisp high-DPI Turkish headers, footers & margins.
 */
async function generateMultiPageA4PDF(imgOrCanvas, title = 'FullShot Pro Ekran Görüntüsü', onProgress = null) {
  const imgWidth = imgOrCanvas.naturalWidth || imgOrCanvas.width;
  const imgHeight = imgOrCanvas.naturalHeight || imgOrCanvas.height;

  // A4 dimensions in PDF Points: 595.28 x 841.89 pt
  const a4Width = 595.28;
  const a4Height = 841.89;

  const marginX = 28;
  const marginTop = 28;
  const marginBottom = 38;

  const contentWidthPt = a4Width - (marginX * 2); // 539.28 pt
  const contentHeightPt = a4Height - marginTop - marginBottom; // 775.89 pt

  // Scale ratio from original image pixels to PDF points content width
  const scale = contentWidthPt / imgWidth;

  // Slice height in original image pixels per page
  const sliceHeightPx = Math.floor(contentHeightPt / scale);
  const totalPages = Math.ceil(imgHeight / sliceHeightPx);

  const builder = new PDFDocumentBuilder();

  // Obj 1: Catalog
  builder.addObject('<< /Type /Catalog /Pages 2 0 R >>');

  // Obj 2: Placeholder for Pages (will be updated)
  builder.addObject('<< /Type /Pages /Kids [] /Count 0 >>');

  // Obj 3: Font
  const fontObj = builder.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const pageObjNums = [];
  const displayTitle = (title || 'Ekran Görüntüsü').slice(0, 60);
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (onProgress) {
      onProgress(pageIdx + 1, totalPages);
    }

    const startY = pageIdx * sliceHeightPx;
    const currentSliceHeight = Math.min(sliceHeightPx, imgHeight - startY);

    // Create high-resolution slice canvas with embedded Turkish typography footer
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = imgWidth;
    sliceCanvas.height = currentSliceHeight;
    const sliceCtx = sliceCanvas.getContext('2d');
    sliceCtx.imageSmoothingEnabled = true;
    sliceCtx.imageSmoothingQuality = 'high';
    sliceCtx.fillStyle = '#ffffff';
    sliceCtx.fillRect(0, 0, imgWidth, currentSliceHeight);

    sliceCtx.drawImage(
      imgOrCanvas,
      0, startY, imgWidth, currentSliceHeight,
      0, 0, imgWidth, currentSliceHeight
    );

    const jpegBytes = await canvasToJpegBytes(sliceCanvas, 0.98);

    // Image XObject
    const imgObj = builder.addObject({
      type: 'stream',
      dict: `/Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${currentSliceHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
      bytes: jpegBytes
    });

    // Dimensions on A4 page
    const renderedHeightPt = currentSliceHeight * scale;
    const imgPosY = a4Height - marginTop - renderedHeightPt;

    // Stream text fallback
    const pageNumText = safePdfText(`Sayfa ${pageIdx + 1} / ${totalPages}`);
    const footerText = safePdfText(`${displayTitle}  |  ${dateStr}`);

    const contentStr = [
      'q',
      // Draw screenshot slice
      `${contentWidthPt} 0 0 ${renderedHeightPt} ${marginX} ${imgPosY} cm`,
      '/Im1 Do',
      'Q',
      // Draw footer divider line
      'q',
      '0.82 0.82 0.82 RG',
      '0.5 w',
      `${marginX} ${marginBottom - 10} m`,
      `${a4Width - marginX} ${marginBottom - 10} l`,
      'S',
      'Q',
      // Draw footer text (Title & Date)
      'BT',
      `/F1 8 Tf`,
      '0.4 0.4 0.4 rg',
      `${marginX} ${marginBottom - 22} Td`,
      `(${footerText}) Tj`,
      'ET',
      // Draw page number right aligned
      'BT',
      `/F1 8 Tf`,
      '0.3 0.3 0.3 rg',
      `${a4Width - marginX - 55} ${marginBottom - 22} Td`,
      `(${pageNumText}) Tj`,
      'ET'
    ].join('\n');

    const contentBytes = new TextEncoder().encode(contentStr);
    const contentObj = builder.addObject({
      type: 'stream',
      dict: '',
      bytes: contentBytes
    });

    // Page Object
    const pageObj = builder.addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${a4Width} ${a4Height} ] /Contents ${contentObj} 0 R /Resources << /ProcSet [ /PDF /Text /ImageC ] /XObject << /Im1 ${imgObj} 0 R >> /Font << /F1 ${fontObj} 0 R >> >> >>`);

    pageObjNums.push(`${pageObj} 0 R`);
  }

  // Update Obj 2 (Pages Container)
  builder.objects[1].content = `<< /Type /Pages /Kids [ ${pageObjNums.join(' ')} ] /Count ${totalPages} >>`;

  // Info Object with UTF-16BE Turkish Title
  const dateIso = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const infoObj = builder.addObject(`<< /Title ${utf16HexEncode(displayTitle)} /Creator (FullShot Pro - Chrome Extension) /Producer (FullShot Pro PDF Engine 1.4) /CreationDate (D:${dateIso}Z) >>`);

  return builder.build(infoObj);
}

// Global Export
if (typeof window !== 'undefined') {
  window.FullShotPDF = {
    PDFDocumentBuilder,
    utf16HexEncode,
    safePdfText,
    canvasToJpegBytes,
    generateSinglePagePDF,
    generateMultiPageA4PDF
  };
}
