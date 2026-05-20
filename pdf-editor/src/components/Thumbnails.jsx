import { useEffect, useRef } from 'react';

/**
 * Mini sidebar previews. Each thumbnail renders at a small fixed scale
 * so we keep memory cheap even on big documents. Clicking jumps to
 * that page in the main viewer.
 */
export function Thumbnails({ pdfDoc, numPages, activePage, onPick }) {
  return (
    <div className="thumbs">
      {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
        <Thumb
          key={n}
          pdfDoc={pdfDoc}
          pageNum={n}
          active={n === activePage}
          onClick={() => onPick(n)}
        />
      ))}
    </div>
  );
}

function Thumb({ pdfDoc, pageNum, active, onClick }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;
        const v1 = page.getViewport({ scale: 1 });
        const target = 60; // CSS px wide
        const scale = target / v1.width;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch { /* ignore */ }
        }
        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (e) {
        if (e?.name !== 'RenderingCancelledException') {
          console.error(`Thumb render failed for page ${pageNum}:`, e);
        }
      }
    }
    render();
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* ignore */ }
      }
    };
  }, [pdfDoc, pageNum]);

  return (
    <button
      type="button"
      className={`thumb${active ? ' active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <span className="num">{pageNum}</span>
      <canvas ref={canvasRef} />
    </button>
  );
}
