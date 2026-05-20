import { useState, useCallback, useRef, useEffect } from 'react';
import { pdfjsLib } from '../lib/pdfjs.js';

/**
 * Loads a PDF file and keeps two parallel handles to it:
 *   - `arrayBuffer`: the raw bytes, untouched, ready for pdf-lib later.
 *   - `pdfDoc`:      the pdf.js PDFDocumentProxy used for rendering.
 *
 * We feed pdf.js a *copy* of the buffer because pdf.js may transfer
 * (detach) the buffer it's given to its worker thread. Keeping our
 * own copy guarantees pdf-lib has something intact to work with.
 */
export function usePdfDocument() {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [arrayBuffer, setArrayBuffer] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const docRef = useRef(null);

  const loadFile = useCallback(async (file) => {
    if (!file) return;
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('That doesn’t look like a PDF file.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // tear down any previous document
      if (docRef.current) {
        try { await docRef.current.destroy(); } catch { /* ignore */ }
        docRef.current = null;
      }

      const ab = await file.arrayBuffer();
      const forPdfjs = ab.slice(0);

      const task = pdfjsLib.getDocument({ data: forPdfjs });
      const doc = await task.promise;

      docRef.current = doc;
      setArrayBuffer(ab);
      setPdfDoc(doc);
      setFileName(file.name);
    } catch (e) {
      console.error('PDF load failed:', e);
      setError(e?.message || 'Could not open this PDF.');
      setPdfDoc(null);
      setArrayBuffer(null);
      setFileName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(async () => {
    if (docRef.current) {
      try { await docRef.current.destroy(); } catch { /* ignore */ }
      docRef.current = null;
    }
    setPdfDoc(null);
    setArrayBuffer(null);
    setFileName(null);
    setError(null);
  }, []);

  // make sure the doc is released if the component using us unmounts
  useEffect(() => {
    return () => {
      if (docRef.current) {
        try { docRef.current.destroy(); } catch { /* ignore */ }
      }
    };
  }, []);

  return { pdfDoc, arrayBuffer, fileName, error, loading, loadFile, clear };
}
