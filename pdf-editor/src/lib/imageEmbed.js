import { PDFDocument } from 'pdf-lib';

// Header sniff — avoids relying on File.type which browsers sometimes mis-report
function isJpeg(buffer) {
  const b = new Uint8Array(buffer, 0, 3);
  return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
}

/**
 * Embeds an array of image Files into a new PDF and returns it as an ArrayBuffer.
 *
 * @param {File[]} imageFiles
 * @param {'fit-letter'|'fill-letter'|'original'} pageSizeMode
 * @returns {Promise<ArrayBuffer>}
 */
export async function embedImagesToBuffer(imageFiles, pageSizeMode = 'fit-letter') {
  const doc = await PDFDocument.create();

  for (const file of imageFiles) {
    const buffer = await file.arrayBuffer();
    let embedded;
    if (isJpeg(buffer)) {
      embedded = await doc.embedJpg(buffer);
    } else {
      embedded = await doc.embedPng(buffer);
    }

    const { width: iw, height: ih } = embedded;
    let pageW, pageH, imgX, imgY, imgW, imgH;

    if (pageSizeMode === 'original') {
      pageW = iw; pageH = ih;
      imgX = 0; imgY = 0; imgW = iw; imgH = ih;
    } else if (pageSizeMode === 'fill-letter') {
      pageW = 612; pageH = 792;
      const ratio = Math.max(pageW / iw, pageH / ih);
      imgW = iw * ratio; imgH = ih * ratio;
      imgX = (pageW - imgW) / 2;
      imgY = (pageH - imgH) / 2;
    } else { // fit-letter (default) — 0.5" margin on all sides
      pageW = 612; pageH = 792;
      const margin = 36; // 0.5 inch = 36 pts
      const maxW = pageW - 2 * margin;
      const maxH = pageH - 2 * margin;
      const ratio = Math.min(maxW / iw, maxH / ih);
      imgW = iw * ratio; imgH = ih * ratio;
      imgX = (pageW - imgW) / 2;
      imgY = (pageH - imgH) / 2;
    }

    const page = doc.addPage([pageW, pageH]);
    page.drawImage(embedded, { x: imgX, y: imgY, width: imgW, height: imgH });
  }

  const bytes = await doc.save({ useObjectStreams: true });
  return bytes.buffer;
}
