import { PDFDocument } from 'pdf-lib';

/**
 * The single export pipeline for the whole editor.
 *
 * Every "edit" feature we add later (annotations, page ops, form-fill,
 * images-to-pages) is just a different `mutate` function passed in here:
 *
 *   await exportPdf(arrayBuffer, {
 *     fileName: 'foo.pdf',
 *     mutate: async (doc) => { doc.removePage(0); },
 *   });
 *
 * The round-trip case (no mutation) verifies that load → save produces
 * a file that's still a valid PDF — that's this session's milestone.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @param {object} [opts]
 * @param {(doc: import('pdf-lib').PDFDocument) => Promise<void> | void} [opts.mutate]
 * @param {string} [opts.fileName]
 * @returns {Promise<{bytes: Uint8Array, size: number}>}
 */
export async function exportPdf(arrayBuffer, opts = {}) {
  const { mutate, fileName = 'document.pdf' } = opts;

  // Hand pdf-lib its own copy. It mutates the buffer internally and
  // we want our `arrayBuffer` cached in React state to stay reusable
  // for subsequent saves.
  const doc = await PDFDocument.load(arrayBuffer.slice(0), {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  if (typeof mutate === 'function') {
    await mutate(doc);
  }

  const bytes = await doc.save({ useObjectStreams: true });
  triggerDownload(bytes, fileName);
  return { bytes, size: bytes.byteLength };
}

function triggerDownload(bytes, fileName) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  // Some browsers need the element in the DOM for click() to honor `download`.
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the download a beat to start before we revoke the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "report.pdf" → "report-saved.pdf". Keeps the extension. */
export function suffixFilename(name, suffix = '-saved') {
  if (!name) return `document${suffix}.pdf`;
  const i = name.lastIndexOf('.');
  if (i <= 0) return `${name}${suffix}.pdf`;
  return `${name.slice(0, i)}${suffix}${name.slice(i)}`;
}
