import { useEffect, useRef, useState } from 'react';

/**
 * Sidebar thumbnail strip.
 * - Iterates pageOrder (Entry[]) not a raw page count.
 * - Each thumb looks up its pdfDoc from sourceDocs by entry.sourceDocId.
 * - Supports HTML5 drag-and-drop reorder (no library). Shows an insert-line
 *   indicator while dragging.
 * - Per-thumb controls (rotate ±90°, duplicate, delete) appear on hover.
 */
export function Thumbnails({ pageOrder, sourceDocs, activePage, onPick, onReorder, onRotate, onDuplicate, onDelete }) {
  const dragSrc = useRef(null);
  const [insertAt, setInsertAt] = useState(null); // { index, before }

  const handleDragStart = (e, index) => {
    dragSrc.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index)); // required by Firefox
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setInsertAt({ index, before });
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const src = dragSrc.current;
    if (src === null || src === undefined) { setInsertAt(null); return; }
    const before = insertAt ? insertAt.before : true;
    let target = before ? index : index + 1;
    if (src < target) target--;
    if (target !== src) onReorder(src, target);
    setInsertAt(null);
    dragSrc.current = null;
  };

  const handleDragEnd = () => {
    setInsertAt(null);
    dragSrc.current = null;
  };

  return (
    <div className="thumbs">
      {pageOrder.map((entry, index) => {
        const pdfDoc = sourceDocs.get(entry.sourceDocId)?.pdfDoc;
        const showBefore = insertAt?.index === index && insertAt.before;
        const showAfter  = insertAt?.index === index && !insertAt.before;
        return (
          <Thumb
            key={entry.id}
            pdfDoc={pdfDoc}
            pageNum={entry.sourcePageIndex + 1}
            rotation={entry.rotation}
            label={index + 1}
            active={index + 1 === activePage}
            showInsertBefore={showBefore}
            showInsertAfter={showAfter}
            onClick={() => onPick(index + 1)}
            onRotateLeft={() => onRotate(entry.id, -90)}
            onRotateRight={() => onRotate(entry.id, 90)}
            onDuplicate={() => onDuplicate(entry.id)}
            onDelete={() => onDelete(entry.id)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            canDelete={pageOrder.length > 1}
          />
        );
      })}
    </div>
  );
}

function Thumb({
  pdfDoc, pageNum, rotation, label, active,
  showInsertBefore, showInsertAfter,
  onClick, onRotateLeft, onRotateRight, onDuplicate, onDelete, canDelete,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;

    async function render() {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;
        const intrinsicRot = page.rotate ?? 0;
        const totalRot = (intrinsicRot + (rotation ?? 0)) % 360;
        const v1 = page.getViewport({ scale: 1, rotation: totalRot });
        const target = 60;
        const scale = target / v1.width;
        const viewport = page.getViewport({ scale, rotation: totalRot });
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
  }, [pdfDoc, pageNum, rotation]);

  return (
    <>
      {showInsertBefore && <div className="thumb-insert-line" aria-hidden="true" />}
      <div
        className={`thumb-wrap${active ? ' active' : ''}`}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      >
        <button
          type="button"
          className="thumb"
          onClick={onClick}
          aria-current={active ? 'page' : undefined}
          tabIndex={0}
        >
          <span className="num">{label}</span>
          <canvas ref={canvasRef} />
        </button>
        <div className="thumb-controls" aria-label={`Page ${label} controls`}>
          <button type="button" className="btn icon thumb-ctrl" title="Rotate left" onClick={onRotateLeft}>↺</button>
          <button type="button" className="btn icon thumb-ctrl" title="Rotate right" onClick={onRotateRight}>↻</button>
          <button type="button" className="btn icon thumb-ctrl" title="Duplicate" onClick={onDuplicate}>⎘</button>
          {canDelete && (
            <button type="button" className="btn icon thumb-ctrl thumb-del" title="Delete page" onClick={onDelete}>✕</button>
          )}
        </div>
      </div>
      {showInsertAfter && <div className="thumb-insert-line" aria-hidden="true" />}
    </>
  );
}
