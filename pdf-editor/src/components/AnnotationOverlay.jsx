import { useEffect, useRef, useCallback } from 'react';
import { cssToPdf, pdfToCss } from '../lib/coords.js';

/**
 * Transparent canvas overlay on top of a PageView canvas.
 * Handles pointer input for drawing new annotations and renders all
 * existing annotations for this page. Stored coordinates are in PDF
 * points (scale-invariant); conversion happens on pointer-in and render-out.
 */
export function AnnotationOverlay({
  pageNum,
  entryId,           // stable entry id — used as annotation map key
  scale,
  pageHeightPts,
  cssWidth,
  cssHeight,
  annotations,
  activeTool,
  activeColor,
  strokeWidth,
  onAddAnnotation,
  onDeleteAnnotation,
  selectedId,
  onSelectAnnotation,
}) {
  const canvasRef = useRef(null);
  const drawing = useRef(null);

  // ── resize canvas to match CSS size ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cssWidth || !cssHeight) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    canvas.style.width = `${Math.floor(cssWidth)}px`;
    canvas.style.height = `${Math.floor(cssHeight)}px`;
  }, [cssWidth, cssHeight]);

  // ── redraw all annotations whenever model or scale changes ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cssWidth || !cssHeight) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    renderAnnotations(ctx, annotations, scale, pageHeightPts, selectedId);
    ctx.restore();
  }, [annotations, scale, pageHeightPts, cssWidth, cssHeight, selectedId]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = useCallback((e) => {
    if (activeTool === 'cursor') {
      const css = getPos(e);
      const hit = hitTest(annotations, css, scale, pageHeightPts);
      onSelectAnnotation(hit ? hit.id : null);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const css = getPos(e);
    const pdf = cssToPdf({ ...css, scale, pageHeightPts });
    if (activeTool === 'freedraw') {
      drawing.current = { type: 'freedraw', points: [pdf], color: activeColor, strokeWidth };
    } else {
      drawing.current = { type: activeTool, startPdf: pdf, color: activeColor, strokeWidth };
    }
  }, [activeTool, activeColor, strokeWidth, annotations, scale, pageHeightPts, onSelectAnnotation]);

  const onPointerMove = useCallback((e) => {
    if (!drawing.current) return;
    const css = getPos(e);
    const pdf = cssToPdf({ ...css, scale, pageHeightPts });
    if (drawing.current.type === 'freedraw') {
      drawing.current.points.push(pdf);
    } else {
      drawing.current.endPdf = pdf;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    renderAnnotations(ctx, annotations, scale, pageHeightPts, selectedId);
    renderPreview(ctx, drawing.current, scale, pageHeightPts);
    ctx.restore();
  }, [annotations, scale, pageHeightPts, selectedId]);

  const onPointerUp = useCallback((e) => {
    if (!drawing.current) return;
    const d = drawing.current;
    drawing.current = null;
    const css = getPos(e);
    const pdf = cssToPdf({ ...css, scale, pageHeightPts });
    let ann = null;
    if (d.type === 'freedraw') {
      if (d.points.length < 2) return;
      ann = { type: 'freedraw', points: d.points, color: d.color, strokeWidth: d.strokeWidth, opacity: 1 };
    } else {
      const x = Math.min(d.startPdf.x, pdf.x);
      const y = Math.min(d.startPdf.y, pdf.y);
      const w = Math.abs(pdf.x - d.startPdf.x);
      const h = Math.abs(pdf.y - d.startPdf.y);
      if (w < 2 && h < 2) return;
      if (d.type === 'text') {
        const label = window.prompt('Enter text:');
        if (!label) return;
        ann = { type: 'text', x, y, width: w, height: h, text: label, fontSize: 12, color: d.color, opacity: 1 };
      } else {
        ann = {
          type: d.type, x, y, width: w, height: h,
          color: d.color, strokeWidth: d.strokeWidth,
          opacity: d.type === 'highlight' ? 0.35 : 1,
        };
      }
    }
    if (ann) onAddAnnotation(entryId, ann);
  }, [entryId, scale, pageHeightPts, onAddAnnotation]);

  const onKeyDown = useCallback((e) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && selectedId != null) {
      onDeleteAnnotation(entryId, selectedId);
    }
  }, [entryId, selectedId, onDeleteAnnotation]);

  const cursor = activeTool === 'cursor' ? 'default' : 'crosshair';

  return (
    <canvas
      ref={canvasRef}
      className="annotation-overlay"
      style={{ cursor, position: 'absolute', top: 0, left: 0, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`Annotation layer page ${pageNum}`}
    />
  );
}

// ── rendering helpers ──────────────────────────────────────────────────────

function renderAnnotations(ctx, annotations, scale, pageHeightPts, selectedId) {
  for (const ann of annotations) {
    ctx.save();
    ctx.globalAlpha = ann.opacity ?? 1;
    if (ann.id === selectedId) {
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 6;
    }
    renderOne(ctx, ann, scale, pageHeightPts);
    ctx.restore();
  }
}

function renderOne(ctx, ann, scale, pageHeightPts) {
  if (ann.type === 'freedraw') {
    if (!ann.points || ann.points.length < 2) return;
    ctx.strokeStyle = ann.color;
    ctx.lineWidth = ann.strokeWidth ?? 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const p0 = pdfToCss({ ...ann.points[0], scale, pageHeightPts });
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < ann.points.length; i++) {
      const p = pdfToCss({ ...ann.points[i], scale, pageHeightPts });
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  } else if (ann.type === 'highlight') {
    const tl = pdfToCss({ x: ann.x, y: ann.y + ann.height, scale, pageHeightPts });
    ctx.fillStyle = ann.color;
    ctx.fillRect(tl.x, tl.y, ann.width * scale, ann.height * scale);
  } else if (ann.type === 'rectangle') {
    const tl = pdfToCss({ x: ann.x, y: ann.y + ann.height, scale, pageHeightPts });
    ctx.strokeStyle = ann.color;
    ctx.lineWidth = ann.strokeWidth ?? 2;
    ctx.strokeRect(tl.x, tl.y, ann.width * scale, ann.height * scale);
  } else if (ann.type === 'text') {
    const tl = pdfToCss({ x: ann.x, y: ann.y + ann.height, scale, pageHeightPts });
    ctx.fillStyle = ann.color;
    ctx.font = `${(ann.fontSize ?? 12) * scale}px sans-serif`;
    ctx.fillText(ann.text, tl.x, tl.y + (ann.fontSize ?? 12) * scale);
  }
}

function renderPreview(ctx, d, scale, pageHeightPts) {
  if (!d) return;
  ctx.save();
  ctx.globalAlpha = 0.6;
  if (d.type === 'freedraw') {
    renderOne(ctx, { ...d, opacity: 1 }, scale, pageHeightPts);
  } else if (d.endPdf) {
    const x = Math.min(d.startPdf.x, d.endPdf.x);
    const y = Math.min(d.startPdf.y, d.endPdf.y);
    const w = Math.abs(d.endPdf.x - d.startPdf.x);
    const h = Math.abs(d.endPdf.y - d.startPdf.y);
    renderOne(ctx, { type: d.type, x, y, width: w, height: h, color: d.color, strokeWidth: d.strokeWidth, opacity: 0.6 }, scale, pageHeightPts);
  }
  ctx.restore();
}

function hitTest(annotations, css, scale, pageHeightPts) {
  for (let i = annotations.length - 1; i >= 0; i--) {
    const ann = annotations[i];
    if (ann.type === 'freedraw') {
      const hit = ann.points.some((p) => {
        const c = pdfToCss({ ...p, scale, pageHeightPts });
        return Math.hypot(c.x - css.x, c.y - css.y) < 8;
      });
      if (hit) return ann;
    } else {
      const tl = pdfToCss({ x: ann.x, y: ann.y + ann.height, scale, pageHeightPts });
      const w = ann.width * scale;
      const h = ann.height * scale;
      if (css.x >= tl.x && css.x <= tl.x + w && css.y >= tl.y && css.y <= tl.y + h) return ann;
    }
  }
  return null;
}
