import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { pdfjsLib } from './lib/pdfjs.js';
import { PageView } from './components/PageView.jsx';
import { Thumbnails } from './components/Thumbnails.jsx';
import { AnnotationToolbar } from './components/AnnotationToolbar.jsx';
import { ExtractDialog } from './components/ExtractDialog.jsx';
import { ImageImportDialog } from './components/ImageImportDialog.jsx';
import { FormPanel, getFieldType, getFieldOptions, getFieldCurrentValue, applyFormValue } from './components/FormPanel.jsx';
import { exportPdf, suffixFilename } from './lib/pdfExport.js';
import { getPdfPageSize } from './lib/coords.js';
import { embedImagesToBuffer } from './lib/imageEmbed.js';
import { compressPdf } from './lib/pdfCompress.js';
import { CompressPanel } from './components/CompressPanel.jsx';
import { CoffeePrompt } from './components/CoffeePrompt.jsx';
import { formatBytes } from './lib/format.js';

const SCALE_OPTIONS = [
  { label: '50%',  value: 0.5  },
  { label: '75%',  value: 0.75 },
  { label: '100%', value: 1.0  },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5  },
  { label: '200%', value: 2.0  },
];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  );
}

let _entrySeq = 0;
const nextEntryId = () => `pg-${++_entrySeq}`;
let _annSeq = 0;
const nextAnnId = () => ++_annSeq;

function docIdFromIndex(i) { return String.fromCharCode(97 + i); }

function buildEntries(sourceDocId, numPages) {
  return Array.from({ length: numPages }, (_, i) => ({
    id: nextEntryId(), sourceDocId, sourcePageIndex: i, rotation: 0,
  }));
}

async function loadWithPdfjs(file) {
  const ab = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: ab.slice(0) });
  const doc = await task.promise;
  return { pdfDoc: doc, arrayBuffer: ab };
}

async function loadArrayBufferWithPdfjs(arrayBuffer) {
  const task = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
  const doc = await task.promise;
  return doc;
}

export function isImageFile(f) {
  if (f.type === 'image/jpeg' || f.type === 'image/png') return true;
  const name = f.name.toLowerCase();
  return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg');
}

export function isPdfFile(f) {
  if (f.type === 'application/pdf') return true;
  return f.name.toLowerCase().endsWith('.pdf');
}

export default function App() {
  const [sourceDocs, setSourceDocs] = useState(new Map());
  const [pageOrder, setPageOrder] = useState([]);
  const [annotationsMap, setAnnotationsMap] = useState(new Map());
  const [pageSizes, setPageSizes] = useState(new Map());
  const [activePage, setActivePage] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [pageInput, setPageInput] = useState('1');
  const [dragOver, setDragOver] = useState(false);
  const [viewerDragOver, setViewerDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showExtract, setShowExtract] = useState(false);
  const [activeTool, setActiveTool] = useState('cursor');
  const [activeColor, setActiveColor] = useState('#ffd60a');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [selectedId, setSelectedId] = useState(null);

  // Image import
  const [pendingImages, setPendingImages] = useState(null);
  const [imageImportMode, setImageImportMode] = useState('build');

  // Form filling
  const [formFields, setFormFields] = useState([]);
  const [formValues, setFormValues] = useState(new Map());
  const [flattenForm, setFlattenForm] = useState(false);
  const [showFormPanel, setShowFormPanel] = useState(false);

  const [showCompressPanel, setShowCompressPanel] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressResult, setCompressResult] = useState(null);
  const [compressError, setCompressError] = useState(null);

  const fileInputRef = useRef(null);
  const addPagesInputRef = useRef(null);
  const addImagesInputRef = useRef(null);
  const frameRefs = useRef(new Map());
  const sourceDocCounter = useRef(0);
  const pdfjsDocsRef = useRef(new Map());

  // Coffee prompt: show once per browser session at first save/export.
  // Per-session by design: never nag, never block (escape = save for free).
  const [coffeeOpen, setCoffeeOpen] = useState(false);
  const coffeeResolverRef = useRef(null);
  const maybeAskForCoffee = useCallback(() => {
    try {
      if (sessionStorage.getItem('tt:coffeeAsked')) return Promise.resolve();
    } catch {}
    return new Promise((resolve) => {
      coffeeResolverRef.current = () => {
        try { sessionStorage.setItem('tt:coffeeAsked', '1'); } catch {}
        coffeeResolverRef.current = null;
        setCoffeeOpen(false);
        resolve();
      };
      setCoffeeOpen(true);
    });
  }, []);
  const askThenExport = useCallback(async (arrayBuffer, opts) => {
    await maybeAskForCoffee();
    return exportPdf(arrayBuffer, opts);
  }, [maybeAskForCoffee]);

  useEffect(() => {
    return () => {
      for (const doc of pdfjsDocsRef.current.values()) {
        try { doc.destroy(); } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (!compressResult) return;
    const t = setTimeout(() => setCompressResult(null), 8000);
    return () => clearTimeout(t);
  }, [compressResult]);

  const isOpen = sourceDocs.size > 0;
  const numPages = pageOrder.length;
  const primaryFileName = sourceDocs.get('a')?.fileName ?? null;
  const primarySize = sourceDocs.get('a')?.arrayBuffer?.byteLength ?? 0;

  // ── Form fields effect ─────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const primaryArrayBuffer = sourceDocs.get('a')?.arrayBuffer;
  useEffect(() => {
    if (!primaryArrayBuffer) { setFormFields([]); setFormValues(new Map()); return; }
    let cancelled = false;
    setFormFields(null); // loading
    (async () => {
      try {
        const pdfDoc = await PDFDocument.load(primaryArrayBuffer.slice(0), { ignoreEncryption: true, updateMetadata: false });
        if (cancelled) return;
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        const infos = fields.map((f) => {
          const type = getFieldType(f);
          const options = getFieldOptions(f);
          const currentValue = getFieldCurrentValue(f, type);
          return { name: f.getName(), type, options, currentValue };
        });
        if (cancelled) return;
        setFormFields(infos);
        const initValues = new Map();
        for (const info of infos) {
          if (info.currentValue !== '' && info.currentValue !== false && info.currentValue !== null) {
            initValues.set(info.name, info.currentValue);
          }
        }
        setFormValues(initValues);
        if (infos.length > 0) setShowFormPanel(true);
        else setShowFormPanel(false);
      } catch {
        if (!cancelled) setFormFields([]);
      }
    })();
    return () => { cancelled = true; };
  }, [primaryArrayBuffer]); // eslint-disable-line react-hooks/exhaustive-deps

  const addPageSizes = useCallback(async (sourceDocId, pdfjsDoc) => {
    const entries = await Promise.all(
      Array.from({ length: pdfjsDoc.numPages }, async (_, i) => {
        const size = await getPdfPageSize(pdfjsDoc, i + 1);
        return [`${sourceDocId}:${i}`, size];
      })
    );
    setPageSizes((prev) => {
      const next = new Map(prev);
      for (const [k, v] of entries) next.set(k, v);
      return next;
    });
  }, []);

  const loadPrimaryFile = useCallback(async (file) => {
    if (!file) return;
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('That doesn\'t look like a PDF file.');
      return;
    }
    setError(null); setLoading(true);
    try {
      for (const doc of pdfjsDocsRef.current.values()) { try { await doc.destroy(); } catch {} }
      pdfjsDocsRef.current.clear();
      sourceDocCounter.current = 0;
      const docId = docIdFromIndex(sourceDocCounter.current++);
      const { pdfDoc: doc, arrayBuffer } = await loadWithPdfjs(file);
      pdfjsDocsRef.current.set(docId, doc);
      setSourceDocs(new Map([[docId, { arrayBuffer, pdfDoc: doc, fileName: file.name }]]));
      setPageOrder(buildEntries(docId, doc.numPages));
      setAnnotationsMap(new Map()); setPageSizes(new Map());
      setActivePage(1); setPageInput('1'); setSelectedId(null); setSaveError(null);
      setFormFields(null);
      await addPageSizes(docId, doc);
    } catch (e) { setError(e?.message || 'Could not open this PDF.'); }
    finally { setLoading(false); }
  }, [addPageSizes]);

  // Load from an ArrayBuffer directly (no file.arrayBuffer() step)
  const loadFromArrayBuffer = useCallback(async (arrayBuffer, fileName) => {
    setError(null); setLoading(true);
    try {
      for (const doc of pdfjsDocsRef.current.values()) { try { await doc.destroy(); } catch {} }
      pdfjsDocsRef.current.clear();
      sourceDocCounter.current = 0;
      const docId = docIdFromIndex(sourceDocCounter.current++);
      const doc = await loadArrayBufferWithPdfjs(arrayBuffer);
      pdfjsDocsRef.current.set(docId, doc);
      setSourceDocs(new Map([[docId, { arrayBuffer, pdfDoc: doc, fileName: fileName ?? 'document.pdf' }]]));
      setPageOrder(buildEntries(docId, doc.numPages));
      setAnnotationsMap(new Map()); setPageSizes(new Map());
      setActivePage(1); setPageInput('1'); setSelectedId(null); setSaveError(null);
      setFormFields(null);
      await addPageSizes(docId, doc);
    } catch (e) { setError(e?.message || 'Could not open this PDF.'); }
    finally { setLoading(false); }
  }, [addPageSizes]);

  // Append pages from an ArrayBuffer to existing sourceDocs
  const addPagesFromBuffer = useCallback(async (arrayBuffer, fileName) => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const docId = docIdFromIndex(sourceDocCounter.current++);
      const doc = await loadArrayBufferWithPdfjs(arrayBuffer);
      pdfjsDocsRef.current.set(docId, doc);
      setSourceDocs(prev => new Map([...prev, [docId, { arrayBuffer, pdfDoc: doc, fileName: fileName ?? 'added.pdf' }]]));
      setPageOrder(prev => [...prev, ...buildEntries(docId, doc.numPages)]);
      await addPageSizes(docId, doc);
    } catch (e) { setError(e?.message || 'Could not add pages.'); }
    finally { setLoading(false); }
  }, [isOpen, addPageSizes]);

  const addPagesFromFile = useCallback(async (file) => {
    if (!file || !isOpen) return;
    setLoading(true);
    try {
      const docId = docIdFromIndex(sourceDocCounter.current++);
      const { pdfDoc: doc, arrayBuffer } = await loadWithPdfjs(file);
      pdfjsDocsRef.current.set(docId, doc);
      setSourceDocs(prev => new Map([...prev, [docId, { arrayBuffer, pdfDoc: doc, fileName: file.name }]]));
      setPageOrder(prev => [...prev, ...buildEntries(docId, doc.numPages)]);
      await addPageSizes(docId, doc);
    } catch (e) { setError(e?.message || 'Could not open this PDF.'); }
    finally { setLoading(false); }
  }, [isOpen, addPageSizes]);

  // Confirm image import: embed images then load or append
  const onConfirmImages = useCallback(async (files, pageSizeMode) => {
    setLoading(true);
    try {
      const buf = await embedImagesToBuffer(files, pageSizeMode);
      const baseName = files.length === 1 ? files[0].name.replace(/\.[^.]+$/, '') + '.pdf' : 'images.pdf';
      if (!isOpen) {
        await loadFromArrayBuffer(buf, baseName);
      } else {
        await addPagesFromBuffer(buf, baseName);
      }
    } catch (e) { setError(e?.message || 'Could not embed images.'); }
    finally { setLoading(false); }
  }, [isOpen, loadFromArrayBuffer, addPagesFromBuffer]);

  const clear = useCallback(async () => {
    for (const doc of pdfjsDocsRef.current.values()) { try { await doc.destroy(); } catch {} }
    pdfjsDocsRef.current.clear();
    sourceDocCounter.current = 0;
    setSourceDocs(new Map()); setPageOrder([]); setAnnotationsMap(new Map()); setPageSizes(new Map());
    setActivePage(1); setPageInput('1'); setError(null); setSaveError(null); setSelectedId(null);
    setFormFields([]); setFormValues(new Map()); setFlattenForm(false); setShowFormPanel(false);
    setPendingImages(null);
  }, []);

  const registerRef = useCallback((entryId, el) => {
    if (el) frameRefs.current.set(entryId, el); else frameRefs.current.delete(entryId);
  }, []);

  const scrollToEntry = useCallback((index1) => {
    const entry = pageOrder[index1 - 1];
    if (!entry) return;
    const el = frameRefs.current.get(entry.id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pageOrder]);

  const goTo = useCallback((n) => {
    if (!numPages) return;
    const c = Math.min(numPages, Math.max(1, Math.floor(n)));
    setActivePage(c); setPageInput(String(c)); scrollToEntry(c);
  }, [numPages, scrollToEntry]);

  const onReorder = useCallback((from, to) => {
    setPageOrder(prev => { const n = [...prev]; const [m] = n.splice(from, 1); n.splice(to, 0, m); return n; });
    setActivePage(prev => prev - 1 === from ? to + 1 : prev);
  }, []);

  const onRotate = useCallback((entryId, delta) => {
    setPageOrder(prev => prev.map(e => e.id === entryId ? { ...e, rotation: ((e.rotation + delta) % 360 + 360) % 360 } : e));
  }, []);

  const onDuplicate = useCallback((entryId) => {
    setPageOrder(prev => {
      const idx = prev.findIndex(e => e.id === entryId);
      if (idx === -1) return prev;
      const clone = { ...prev[idx], id: nextEntryId() };
      setAnnotationsMap(am => {
        const ex = am.get(entryId) ?? [];
        if (!ex.length) return am;
        const n = new Map(am); n.set(clone.id, ex.map(a => ({ ...a, id: nextAnnId() }))); return n;
      });
      const n = [...prev]; n.splice(idx + 1, 0, clone); return n;
    });
  }, []);

  const onDeletePage = useCallback((entryId) => {
    setPageOrder(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(e => e.id !== entryId);
      setActivePage(ap => Math.min(ap, next.length));
      setPageInput(pi => String(Math.min(isNaN(parseInt(pi)) ? 1 : parseInt(pi), next.length)));
      return next;
    });
    setAnnotationsMap(am => { const n = new Map(am); n.delete(entryId); return n; });
  }, []);

  const onAddAnnotation = useCallback((entryId, ann) => {
    setAnnotationsMap(prev => {
      const n = new Map(prev);
      n.set(entryId, [...(n.get(entryId) ?? []), { ...ann, id: nextAnnId(), entryId }]);
      return n;
    });
  }, []);

  const onDeleteAnnotation = useCallback((entryId, id) => {
    setAnnotationsMap(prev => {
      const n = new Map(prev); n.set(entryId, (n.get(entryId) ?? []).filter(a => a.id !== id)); return n;
    });
    setSelectedId(null);
  }, []);

  const onSelectAnnotation = useCallback(id => setSelectedId(id), []);

  // ── Structural modification check ─────────────────────────────────────────
  const isStructurallyModified = useMemo(() => {
    if (sourceDocs.size !== 1) return true;
    const primaryDoc = sourceDocs.get('a')?.pdfDoc;
    if (!primaryDoc) return true;
    if (pageOrder.length !== primaryDoc.numPages) return true;
    return pageOrder.some((e, i) => e.sourceDocId !== 'a' || e.sourcePageIndex !== i);
  }, [sourceDocs, pageOrder]);

  const buildMutate = useCallback((targetPageOrder) => async (doc) => {
    for (let i = doc.getPageCount() - 1; i >= 0; i--) doc.removePage(i);
    const pdfLibDocs = new Map();
    for (const [docId, { arrayBuffer }] of sourceDocs) {
      pdfLibDocs.set(docId, await PDFDocument.load(arrayBuffer.slice(0), { ignoreEncryption: true, updateMetadata: false }));
    }
    for (const entry of targetPageOrder) {
      const srcDoc = pdfLibDocs.get(entry.sourceDocId);
      if (!srcDoc) continue;
      const [p] = await doc.copyPages(srcDoc, [entry.sourcePageIndex]);
      if (entry.rotation !== 0) p.setRotation(degrees((p.getRotation().angle + entry.rotation) % 360));
      doc.addPage(p);
    }
    for (let i = 0; i < targetPageOrder.length; i++) {
      const anns = annotationsMap.get(targetPageOrder[i].id) ?? [];
      if (!anns.length) continue;
      const page = doc.getPage(i);
      drawAnnotationsOnPdfPage(page, anns);
    }
    // Apply form values
    try {
      if (formValues.size > 0) {
        const form = doc.getForm();
        for (const [name, value] of formValues) {
          applyFormValue(form, name, value);
        }
        if (flattenForm) {
          try { form.flatten(); } catch {}
        }
      }
    } catch {}
  }, [sourceDocs, annotationsMap, formValues, flattenForm]);

  // directMutate: apply rotations, form values, annotations without rebuilding pages
  const directMutate = useCallback(async (doc) => {
    // Apply rotations
    for (let i = 0; i < pageOrder.length; i++) {
      const entry = pageOrder[i];
      if (entry.rotation !== 0) {
        const page = doc.getPage(i);
        page.setRotation(degrees((page.getRotation().angle + entry.rotation) % 360));
      }
    }
    // Apply annotations
    for (let i = 0; i < pageOrder.length; i++) {
      const anns = annotationsMap.get(pageOrder[i].id) ?? [];
      if (!anns.length) continue;
      const page = doc.getPage(i);
      drawAnnotationsOnPdfPage(page, anns);
    }
    // Apply form values
    try {
      if (formValues.size > 0) {
        const form = doc.getForm();
        for (const [name, value] of formValues) {
          applyFormValue(form, name, value);
        }
        if (flattenForm) {
          try { form.flatten(); } catch {}
        }
      }
    } catch {}
  }, [pageOrder, annotationsMap, formValues, flattenForm]);

  const onSave = useCallback(async () => {
    if (!isOpen || saving) return;
    setSaving(true); setSaveError(null);
    try {
      const mutate = !isStructurallyModified ? directMutate : buildMutate(pageOrder);
      await askThenExport(sourceDocs.get('a').arrayBuffer, {
        fileName: suffixFilename(primaryFileName, '-edited'),
        mutate,
      });
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1800);
    } catch (e) { setSaveError(e?.message || 'Could not save.'); }
    finally { setSaving(false); }
  }, [isOpen, saving, sourceDocs, primaryFileName, pageOrder, buildMutate, directMutate, isStructurallyModified, askThenExport]);

  const onCompress = useCallback(async (mode) => {
    if (!isOpen || compressing) return;
    setCompressing(true); setCompressError(null);
    try {
      const { mutate, summary } = await compressPdf(
        sourceDocs.get('a').arrayBuffer,
        { mode }
      );
      const { bytes } = await askThenExport(sourceDocs.get('a').arrayBuffer, {
        fileName: suffixFilename(primaryFileName, '-compressed'),
        mutate,
      });
      const origSize = sourceDocs.get('a').arrayBuffer.byteLength;
      setCompressResult({ origSize, newSize: bytes.byteLength, warnings: summary.warnings });
      setShowCompressPanel(false);
    } catch (e) {
      setCompressError(e?.message || 'Compression failed.');
    } finally {
      setCompressing(false);
    }
  }, [isOpen, compressing, sourceDocs, primaryFileName, askThenExport]);

  const onExtract = useCallback(async (from, to) => {
    try {
      await askThenExport(sourceDocs.get('a').arrayBuffer, {
        fileName: suffixFilename(primaryFileName, `-pages-${from}-${to}`),
        mutate: buildMutate(pageOrder.slice(from - 1, to)),
      });
    } catch (e) { setSaveError(e?.message || 'Could not extract.'); }
  }, [sourceDocs, primaryFileName, pageOrder, buildMutate, askThenExport]);

  const onPickFile = e => { const f = e.target.files?.[0]; if (f) loadPrimaryFile(f); e.target.value = ''; };
  const onAddPagesFile = e => { const f = e.target.files?.[0]; if (f) addPagesFromFile(f); e.target.value = ''; };

  const onImagesFileInput = useCallback((e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    const images = files.filter(isImageFile);
    if (!images.length) return;
    setImageImportMode(isOpen ? 'add' : 'build');
    setPendingImages(images);
  }, [isOpen]);

  // Empty-state drop: route images vs PDFs
  const onDrop = useCallback(e => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;
    const pdfs = files.filter(isPdfFile);
    const images = files.filter(isImageFile);
    if (pdfs.length > 0) {
      loadPrimaryFile(pdfs[0]);
    } else if (images.length > 0) {
      setImageImportMode('build');
      setPendingImages(images);
    }
  }, [loadPrimaryFile]);

  // Viewer drop: detect image files dropped on the viewer when PDF is open
  const onViewerDrop = useCallback(e => {
    e.preventDefault(); setViewerDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;
    const images = files.filter(isImageFile);
    const pdfs = files.filter(isPdfFile);
    if (images.length > 0) {
      setImageImportMode('add');
      setPendingImages(images);
    } else if (pdfs.length > 0) {
      addPagesFromFile(pdfs[0]);
    }
  }, [addPagesFromFile]);

  const totalAnnotations = useMemo(() => { let n = 0; for (const a of annotationsMap.values()) n += a.length; return n; }, [annotationsMap]);
  const fieldCount = formFields ? formFields.length : 0;

  return (
    <div className="app">
      <CoffeePrompt open={coffeeOpen} onResolve={() => coffeeResolverRef.current?.()} />
      <header className="topbar">
        <a className="brand" href="/" title="Back to techtuate"><span className="brand-mark" aria-hidden="true"></span><span>tech<span>tuate</span></span></a>
        <span className="sep">/</span><span className="tool-name">pdf-editor</span>
        <div className="spacer" />
        {isOpen && (
          <div className="file-info">
            <span className="dot">●</span>
            <span title={primaryFileName}>{truncate(primaryFileName, 36)}</span>
            <span>·</span><span>{numPages} {numPages === 1 ? 'page' : 'pages'}</span>
            <span>·</span><span>{(primarySize / 1024).toFixed(0)} KB</span>
            {totalAnnotations > 0 && <><span>·</span><span>{totalAnnotations} annotation{totalAnnotations !== 1 ? 's' : ''}</span></>}
            <button className="btn ghost icon" onClick={clear} title="Close">close</button>
          </div>
        )}
      </header>
      <div className={`workspace${showFormPanel && isOpen ? ' with-form' : ''}`}>
        <aside className="sidebar">
          {isOpen ? (<><h4>Pages</h4><Thumbnails pageOrder={pageOrder} sourceDocs={sourceDocs} activePage={activePage} onPick={goTo} onReorder={onReorder} onRotate={onRotate} onDuplicate={onDuplicate} onDelete={onDeletePage} /></>) : (<><h4>About</h4><p style={{ color: 'var(--ink-mute)', fontSize: 13, lineHeight: 1.55 }}>A client-side PDF editor. Open a file to start. Nothing is uploaded.</p></>)}
        </aside>
        <main
          className={`viewer${viewerDragOver ? ' img-drag-over' : ''}`}
          onDragOver={isOpen ? (e) => { e.preventDefault(); setViewerDragOver(true); } : undefined}
          onDragLeave={isOpen ? () => setViewerDragOver(false) : undefined}
          onDrop={isOpen ? onViewerDrop : undefined}
        >
          {!isOpen && <EmptyState loading={loading} error={error} dragOver={dragOver} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} onPick={() => fileInputRef.current?.click()} onPickImages={() => addImagesInputRef.current?.click()} />}
          {isOpen && (<>
            {error && <div className="error">{error}</div>}
            <div className="controls" role="toolbar" aria-label="Page controls">
              <div className="group"><span className="label">page</span><button className="btn icon" disabled={activePage <= 1} onClick={() => goTo(activePage - 1)}>‹</button><input className="page-input" value={pageInput} onChange={e => setPageInput(e.target.value)} onBlur={() => { const n = parseInt(pageInput, 10); if (!isNaN(n)) goTo(n); else setPageInput(String(activePage)); }} onKeyDown={e => { if (e.key === 'Enter') { const n = parseInt(pageInput, 10); if (!isNaN(n)) goTo(n); e.currentTarget.blur(); } }} inputMode="numeric" aria-label="Jump to page" /><span className="total">/ {numPages}</span><button className="btn icon" disabled={activePage >= numPages} onClick={() => goTo(activePage + 1)}>›</button></div>
              <div className="spacer" />
              <div className="group"><span className="label">zoom</span><select className="scale-select" value={scale} onChange={e => setScale(parseFloat(e.target.value))} aria-label="Zoom level">{SCALE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div className="group">
                <button className="btn" onClick={() => fileInputRef.current?.click()}>open another</button>
                <button className="btn" onClick={() => addPagesInputRef.current?.click()}>+ add pages</button>
                <button className="btn" onClick={() => addImagesInputRef.current?.click()}>+ images</button>
                <button className="btn" onClick={() => setShowExtract(true)}>extract…</button>
                <button
                  className={`btn${showCompressPanel ? ' primary' : ''}`}
                  onClick={() => { setShowCompressPanel(v => !v); setCompressResult(null); setCompressError(null); }}
                >
                  compress
                </button>
                <button
                  className={`btn${showFormPanel ? ' primary' : ''}`}
                  onClick={() => setShowFormPanel(v => !v)}
                  title="Toggle form fields panel"
                >
                  fields{fieldCount > 0 ? ` (${fieldCount})` : ''}
                </button>
                <button className="btn primary" onClick={onSave} disabled={saving || !isOpen}>{saving ? <span className="loading">saving…</span> : savedFlash ? '✓ saved' : 'save copy'}</button>
              </div>
            </div>
            {showCompressPanel && (
              <CompressPanel
                origSize={primarySize}
                compressing={compressing}
                onCompress={onCompress}
                onCancel={() => { setShowCompressPanel(false); setCompressError(null); }}
              />
            )}
            <AnnotationToolbar activeTool={activeTool} setActiveTool={setActiveTool} activeColor={activeColor} setActiveColor={setActiveColor} strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth} />
            {saveError && <div className="error">{saveError}</div>}
            {compressError && <div className="error">{compressError}</div>}
            {compressResult && (
              <div className="compress-result">
                <span>
                  Reduced from {formatBytes(compressResult.origSize)} to {formatBytes(compressResult.newSize)}
                  {' '}({Math.round((1 - compressResult.newSize / compressResult.origSize) * 100)}% smaller)
                </span>
                {compressResult.warnings.map((w, i) => (
                  <div key={i} className="compress-warn">{w}</div>
                ))}
                <button className="btn ghost icon" onClick={() => setCompressResult(null)}>close</button>
              </div>
            )}
            <div className="pages">
              {pageOrder.map((entry, index) => {
                const src = sourceDocs.get(entry.sourceDocId);
                return (<PageView key={entry.id} pdfDoc={src?.pdfDoc} pageNum={entry.sourcePageIndex + 1} entryId={entry.id} rotation={entry.rotation} scale={scale} active={index + 1 === activePage} registerRef={registerRef} annotations={annotationsMap.get(entry.id) ?? []} activeTool={activeTool} activeColor={activeColor} strokeWidth={strokeWidth} onAddAnnotation={onAddAnnotation} onDeleteAnnotation={onDeleteAnnotation} selectedId={selectedId} onSelectAnnotation={onSelectAnnotation} pageHeightPts={pageSizes.get(`${entry.sourceDocId}:${entry.sourcePageIndex}`)?.heightPts ?? 0} />);
              })}
            </div>
          </>)}
        </main>
        {showFormPanel && isOpen && (
          <aside className="form-sidebar">
            <div className="form-sidebar-header">
              <h4>Form fields</h4>
              <button className="btn ghost icon" onClick={() => setShowFormPanel(false)}>✕</button>
            </div>
            <FormPanel
              formFields={formFields}
              formValues={formValues}
              setFormValues={setFormValues}
              flattenForm={flattenForm}
              setFlattenForm={setFlattenForm}
              structurallyModified={isStructurallyModified}
            />
          </aside>
        )}
      </div>
      {showExtract && <ExtractDialog numPages={numPages} onExtract={onExtract} onClose={() => setShowExtract(false)} />}
      {pendingImages != null && (
        <ImageImportDialog
          initialFiles={pendingImages}
          mode={imageImportMode}
          onConfirm={onConfirmImages}
          onClose={() => setPendingImages(null)}
        />
      )}
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="file-input" onChange={onPickFile} />
      <input ref={addPagesInputRef} type="file" accept="application/pdf,.pdf" className="file-input" onChange={onAddPagesFile} />
      <input ref={addImagesInputRef} type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" multiple className="file-input" onChange={onImagesFileInput} />
    </div>
  );
}

function drawAnnotationsOnPdfPage(page, anns) {
  for (const ann of anns) {
    const color = hexToRgb(ann.color);
    const opacity = ann.opacity ?? 1;
    if (ann.type === 'freedraw') {
      for (let j = 0; j < ann.points.length - 1; j++) {
        page.drawLine({ start: ann.points[j], end: ann.points[j+1], thickness: ann.strokeWidth ?? 2, color, opacity });
      }
    } else if (ann.type === 'highlight') {
      page.drawRectangle({ x: ann.x, y: ann.y, width: ann.width, height: ann.height, color, opacity, borderWidth: 0 });
    } else if (ann.type === 'rectangle') {
      page.drawRectangle({ x: ann.x, y: ann.y, width: ann.width, height: ann.height, borderColor: color, borderWidth: ann.strokeWidth ?? 2, opacity });
    } else if (ann.type === 'text') {
      page.drawText(ann.text, { x: ann.x, y: ann.y, size: ann.fontSize ?? 12, color, opacity });
    }
  }
}

function EmptyState({ loading, error, dragOver, onDragOver, onDragLeave, onDrop, onPick, onPickImages }) {
  return (
    <div className="empty"><div className={`drop${dragOver ? ' over' : ''}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <h2>Open a PDF</h2><p>Drop a PDF or images here, or pick one from your computer. Stays on your device.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={onPick} disabled={loading}>{loading ? <span className="loading">opening…</span> : 'Choose PDF'}</button>
        <button className="btn" onClick={onPickImages} disabled={loading}>or use images &rarr;</button>
      </div>
      {error && <div className="error" style={{ marginTop: 18 }}>{error}</div>}
    </div></div>
  );
}

function truncate(s, n) { if (!s) return ''; return s.length > n ? s.slice(0, n - 1) + '…' : s; }
