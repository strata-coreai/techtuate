import { PDFDocument, PDFName } from 'pdf-lib';

const MODE_CONFIG = {
  medium:     { quality: 0.75, maxDim: 1200 },
  aggressive: { quality: 0.55, maxDim: 800  },
};

self.onmessage = async ({ data }) => {
  const { arrayBuffer, mode } = data;
  try {
    const result = await compress(new Uint8Array(arrayBuffer), mode);
    self.postMessage(result, result.replacements.map(r => r.newBytes));
  } catch (err) {
    self.postMessage({ error: err?.message ?? String(err) });
  }
};

async function compress(bytes, mode) {
  const { quality, maxDim } = MODE_CONFIG[mode];
  const replacements = [];
  const warnings = [];
  let skippedCount = 0;

  const pdfDoc = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  for (const [ref, obj] of pdfDoc.context.indirectObjects) {
    if (!obj.dict || !obj.contents) continue;

    const subtype = obj.dict.get(PDFName.of('Subtype'));
    if (subtype?.asString?.() !== 'Image') continue;

    const filterEntry = obj.dict.get(PDFName.of('Filter'));
    if (!filterEntry || typeof filterEntry.asString !== 'function') {
      skippedCount++;
      continue;
    }
    const filterName = filterEntry.asString();
    if (filterName !== 'DCTDecode') {
      skippedCount++;
      continue;
    }

    const origW = obj.dict.get(PDFName.of('Width'))?.asNumber?.() ?? 0;
    const origH = obj.dict.get(PDFName.of('Height'))?.asNumber?.() ?? 0;
    if (!origW || !origH) continue;

    let targetW = origW;
    let targetH = origH;
    const longest = Math.max(origW, origH);
    if (longest > maxDim) {
      const scale = maxDim / longest;
      targetW = Math.max(1, Math.round(origW * scale));
      targetH = Math.max(1, Math.round(origH * scale));
    }

    try {
      const blob = new Blob([obj.contents], { type: 'image/jpeg' });
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(targetW, targetH);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      bitmap.close();
      const newBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
      const newBuf = await newBlob.arrayBuffer();
      if (newBuf.byteLength < obj.contents.length) {
        replacements.push({
          refNum: ref.objectNumber,
          genNum: ref.generationNumber,
          newBytes: newBuf,
          newWidth: targetW,
          newHeight: targetH,
        });
      }
    } catch {
      skippedCount++;
    }
  }

  if (skippedCount > 0) {
    warnings.push(
      `${skippedCount} image${skippedCount !== 1 ? 's' : ''} use a codec that couldn't be re-encoded and were left unchanged.`
    );
  }

  return { replacements, warnings };
}
