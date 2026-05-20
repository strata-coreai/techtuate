import { useCallback, useMemo, useRef, useState } from 'react';
import { usePdfDocument } from './hooks/usePdfDocument.js';
import { PageView } from './components/PageView.jsx';
import { Thumbnails } from './components/Thumbnails.jsx';
import { exportPdf, suffixFilename } from './lib/pdfExport.js';

const SCALE_OPTIONS = [
  { label: '50%',  value: 0.5  },
  { label: '75%',  value: 0.75 },
  { label: '100%', value: 1.0  },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5  },
  { label: '200%', value: 2.0  },
];

export default function App() {
  const { pdfDoc, arrayBuffer, fileName, error, loading, loadFile, clear } = usePdfDocument();

  const [activePage, setActivePage] = useState(1);
  const [scale, setScale] = useState(1.25);
  const [pageInput, setPageInput] = useState('1');
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const fileInputRef = useRef(null);
  // map of pageNum -> DOM frame element, used to scroll into view
  const frameRefs = useRef(new Map());

  const numPages = pdfDoc?.numPages ?? 0;

  const registerRef = useCallback((pageNum, el) => {
    if (el) frameRefs.current.set(pageNum, el);
    else frameRefs.current.delete(pageNum);
  }, []);

  const scrollToPage = useCallback((n) => {
    const el = frameRefs.current.get(n);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const goTo = useCallback((n) => {
    if (!numPages) return;
    const clamped = Math.min(numPages, Math.max(1, Math.floor(n)));
    setActivePage(clamped);
    setPageInput(String(clamped));
    scrollToPage(clamped);
  }, [numPages, scrollToPage]);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      loadFile(f).then(() => {
        setActivePage(1);
        setPageInput('1');
      });
    }
    e.target.value = ''; // allow re-opening the same file
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      loadFile(f).then(() => {
        setActivePage(1);
        setPageInput('1');
      });
    }
  }, [loadFile]);

  const onPageInputChange = (e) => setPageInput(e.target.value);
  const onPageInputCommit = () => {
    const n = parseInt(pageInput, 10);
    if (!Number.isNaN(n)) goTo(n);
    else setPageInput(String(activePage));
  };

  const onSave = useCallback(async () => {
    if (!arrayBuffer || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await exportPdf(arrayBuffer, {
        fileName: suffixFilename(fileName, '-saved'),
        // No `mutate` yet — pure round-trip. Future features pass a function here.
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e) {
      console.error('Save failed:', e);
      setSaveError(e?.message || 'Could not save this PDF.');
    } finally {
      setSaving(false);
    }
  }, [arrayBuffer, fileName, saving]);

  // memoize the list of page numbers so we don't recreate frames on
  // every re-render (which would trash the canvases mid-render).
  const pageNumbers = useMemo(
    () => (numPages ? Array.from({ length: numPages }, (_, i) => i + 1) : []),
    [numPages],
  );

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" title="Back to techtuate">
          <span className="brand-mark" aria-hidden="true"></span>
          <span>tech<span>tuate</span></span>
        </a>
        <span className="sep">/</span>
        <span className="tool-name">pdf-editor</span>

        <div className="spacer" />

        {pdfDoc && (
          <div className="file-info">
            <span className="dot">●</span>
            <span title={fileName}>{truncate(fileName, 36)}</span>
            <span>·</span>
            <span>{numPages} {numPages === 1 ? 'page' : 'pages'}</span>
            <span>·</span>
            <span>{(arrayBuffer?.byteLength / 1024).toFixed(0)} KB</span>
            <button className="btn ghost icon" onClick={clear} title="Close this file">close</button>
          </div>
        )}
      </header>

      <div className="workspace">
        <aside className="sidebar">
          {pdfDoc ? (
            <>
              <h4>Pages</h4>
              <Thumbnails
                pdfDoc={pdfDoc}
                numPages={numPages}
                activePage={activePage}
                onPick={goTo}
              />
            </>
          ) : (
            <>
              <h4>About</h4>
              <p style={{ color: 'var(--ink-mute)', fontSize: 13, lineHeight: 1.55 }}>
                A client-side PDF editor. Open a file to start. Nothing is uploaded — it all happens in this tab.
              </p>
            </>
          )}
        </aside>

        <main className="viewer">
          {!pdfDoc && (
            <EmptyState
              loading={loading}
              error={error}
              dragOver={dragOver}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onPick={() => fileInputRef.current?.click()}
            />
          )}

          {pdfDoc && (
            <>
              {error && <div className="error">{error}</div>}

              <div className="controls" role="toolbar" aria-label="Page controls">
                <div className="group">
                  <span className="label">page</span>
                  <button
                    className="btn icon"
                    disabled={activePage <= 1}
                    onClick={() => goTo(activePage - 1)}
                    aria-label="Previous page"
                  >‹</button>
                  <input
                    className="page-input"
                    value={pageInput}
                    onChange={onPageInputChange}
                    onBlur={onPageInputCommit}
                    onKeyDown={(e) => { if (e.key === 'Enter') { onPageInputCommit(); e.currentTarget.blur(); } }}
                    inputMode="numeric"
                    aria-label="Jump to page"
                  />
                  <span className="total">/ {numPages}</span>
                  <button
                    className="btn icon"
                    disabled={activePage >= numPages}
                    onClick={() => goTo(activePage + 1)}
                    aria-label="Next page"
                  >›</button>
                </div>

                <div className="spacer" />

                <div className="group">
                  <span className="label">zoom</span>
                  <select
                    className="scale-select"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    aria-label="Zoom level"
                  >
                    {SCALE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="group">
                  <button className="btn" onClick={() => fileInputRef.current?.click()}>open another</button>
                  <button
                    className="btn primary"
                    onClick={onSave}
                    disabled={saving || !arrayBuffer}
                    title="Round-trip the PDF through pdf-lib and download a copy"
                  >
                    {saving ? <span className="loading">saving…</span>
                      : savedFlash ? '✓ saved'
                      : 'save copy'}
                  </button>
                </div>
              </div>

              {saveError && <div className="error">{saveError}</div>}

              <div className="pages">
                {pageNumbers.map((n) => (
                  <PageView
                    key={n}
                    pdfDoc={pdfDoc}
                    pageNum={n}
                    scale={scale}
                    active={n === activePage}
                    registerRef={registerRef}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="file-input"
        onChange={onPickFile}
      />
    </div>
  );
}

function EmptyState({ loading, error, dragOver, onDragOver, onDragLeave, onDrop, onPick }) {
  return (
    <div className="empty">
      <div
        className={`drop${dragOver ? ' over' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <h2>Open a PDF</h2>
        <p>Drop a file here, or pick one from your computer. Stays on your device.</p>
        <button className="btn primary" onClick={onPick} disabled={loading}>
          {loading ? <span className="loading">opening…</span> : 'Choose PDF'}
        </button>
        {error && <div className="error" style={{ marginTop: 18 }}>{error}</div>}
      </div>
    </div>
  );
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
