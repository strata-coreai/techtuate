import { useEffect, useRef, useState } from 'react';
import { AnnotationOverlay } from './AnnotationOverlay.jsx';

/**
 * Renders a single PDF page to a canvas.
 * - entryId: stable page-order entry id used for annotation keying and ref registration.
 * - rotation: additional user rotation (0 | 90 | 180 | 270) added to the page's intrinsic rotation.
 * - Sibling AnnotationOverlay canvas is mounted on top for drawing.
 */
export function PageView({
  pdfDoc, pageNum, entryId, rotation, scale, active, registerRef,
  annotations, activeTool, activeColor, strokeWidth,
  onAddAnnotation, onDeleteAnnotation, selectedId, onSelectAnnotation,
  pageHeightPts,
}) {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [cssSize, setCssSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (registerRef) registerRef(entryId, frameRef.current);
    return () => { if (registerRef) registerRef(entryId, null); };
  }, [entryId, registerRef]);

  useEffect(() => {
    let cancelled = false;
    const dpr = window.devicePixelRatio || 1;

    async function render() {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;

        // combine the page's own rotation with the user's added rotation
        const intrinsicRot = page.rotate ?? 0;
        const totalRot = (intrinsicRot + (rotation ?? 0)) % 360;
        const viewport = page.getViewport({ scale, rotation: totalRot });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width  = Math.floor(viewport.width  * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width  = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        setCssSize({ width: Math.floor(viewport.width), height: Math.floor(viewport.height) });

        const ctx = canvas.getContext('2d');
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
  }, [pdfDoc, pageNum, rotation, scale]);

  return (
    <div
      ref={frameRef}
      className={`page-frame${active ? ' active' : ''}`}
      data-page={pageNum}
      style={{ position: 'relative' }}
    >
      <canvas ref={canvasRef} aria-label={`Page ${pageNum}`} />
      {pageHeightPts > 0 && (
        <AnnotationOverlay
          pageNum={pageNum}
          entryId={entryId}
          scale={scale}
          pageHeightPts={pageHeightPts}
          cssWidth={cssSize.width}
          cssHeight={cssSize.height}
          annotations={annotations ?? []}
          activeTool={activeTool}
          activeColor={activeColor}
          strokeWidth={strokeWidth}
          onAddAnnotation={onAddAnnotation}
          onDeleteAnnotation={onDeleteAnnotation}
          selectedId={selectedId}
          onSelectAnnotation={onSelectAnnotation}
        />
      )}
      <div className="page-label">page {pageNum}</div>
    </div>
  );
}
