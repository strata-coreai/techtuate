import CompressWorker from './pdfCompress.worker.js?worker';

export async function compressPdf(arrayBuffer, { mode }) {
  if (mode === 'light') {
    return { mutate: async () => {}, summary: { warnings: [] } };
  }

  const workerResult = await runWorker(arrayBuffer, mode);
  const summary = { warnings: workerResult.warnings };

  const mutate = async (doc) => {
    // Build a lookup from "objNum_genNum" -> original PDFRef (identity matters for Map)
    const refByKey = new Map();
    for (const [ref] of doc.context.indirectObjects) {
      refByKey.set(`${ref.objectNumber}_${ref.generationNumber}`, ref);
    }

    for (const { refNum, genNum, newBytes, newWidth, newHeight } of workerResult.replacements) {
      const ref = refByKey.get(`${refNum}_${genNum}`);
      if (!ref) continue;

      const newStream = doc.context.stream(new Uint8Array(newBytes), {
        Type: 'XObject',
        Subtype: 'Image',
        Width: newWidth,
        Height: newHeight,
        ColorSpace: 'DeviceRGB',
        BitsPerComponent: 8,
        Filter: 'DCTDecode',
      });

      doc.context.assign(ref, newStream);
    }
  };

  return { mutate, summary };
}

function runWorker(arrayBuffer, mode) {
  return new Promise((resolve, reject) => {
    const worker = new CompressWorker();
    const slicedBuf = arrayBuffer.slice(0);

    worker.onmessage = ({ data }) => {
      worker.terminate();
      if (data.error) reject(new Error(data.error));
      else resolve(data);
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message ?? 'Compression worker failed.'));
    };

    worker.postMessage({ arrayBuffer: slicedBuf, mode }, [slicedBuf]);
  });
}
