import { useEffect, useRef } from 'react';

/**
 * Renders a single PDF page to a canvas.
 * - Uses devicePixelRatio for crisp output on HiDPI screens.
 * - Cancels any in-flight render task when scale/page changes or
 *   the component unmounts, to avoid the noisy "Cannot use the same
 *   canvas during multiple render() operations" warning.
 */
export function PageView({ pdfDoc, pageNum, scale, active, registerRef }) {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  // expose the frame element to the parent so it can scroll-into-view
  useEffect(() => {
    if (registerRef) registerRef(pageNum, frameRef.current);
    return () => { if (registerRef) registerRef(pageNum, null); };
  }, [pageNum, registerRef]);

  useEffect(() => {
    let cancelled = false;
    const dpr = window.devicePixelRatio || 1;

    async function render() {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        // physical pixel size for sharp rendering, CSS size = viewport size
        canvas.width  = Math.floor(viewport.width  * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width  = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');

        // cancel any prior render before kicking off a new one
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch { /* ignore */ }
          renderTaskRef.current = null;
        }

        const task = page.render({
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        renderTaskRef.current = task;
        await task.promise;
      } catch (e) {
        if (e?.name !== 'RenderingCancelledException') {
          console.error(`Render failed for page ${pageNum}:`, e);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* ignore */ }
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNum, scale]);

  return (
    <div
      ref={frameRef}
      className={`page-frame${active ? ' active' : ''}`}
      data-page={pageNum}
    >
      <canvas ref={canvasRef} aria-label={`Page ${pageNum}`} />
      <div className="page-label">page {pageNum}</div>
    </div>
  );
}
