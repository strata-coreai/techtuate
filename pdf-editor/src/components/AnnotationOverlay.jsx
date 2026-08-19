import { useEffect, useRef, useCallback } from 'react';
import { cssToPdf, pdfToCss } from '../lib/coords.js';

/**
 * Transparent canvas overlay on top of a PageView canvas.
 * Handles pointer input for drawing new annotations, moving a selected one,
 * and renders all existing annotations for this page. Stored coordinates are
 * in PDF points (scale-invariant); conversion happens on pointer-in and
 * render-out.
 */

const FONT_STACKS = {
  sans: 'Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: '"Courier New", Courier, monospace',
};
function cssFontStack(f) { return FONT_STACKS[f] || FONT_STACKS.sans; }
function shadowOffset(size) { return Math.max(0.8, size * 0.06); }

export function AnnotationOverlay({
  pageNum,
  entryId,
  scale,
  pageHeightPts,
  cssWidth,
  cssHeight,
  annotations,
  activeTool,
  activeColor,
  strokeWidth,
  textFont,
  textSize,
  textBold,
  textShadow,
  onAddAnnotation,
  onDeleteAnnotation,
  onUpdateAnnotation,
  selectedId,
  onSelectAnnotation,
}) {
  const canvasRef = useRef(null);
  const drawing = useRef(null);
  const moving = useRef(null);

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
      if (hit) {
        e.currentTarget.setPointerCapture(e.pointerId);
        moving.current = {
          id: hit.id,
          orig: hit,
          startPdf: cssToPdf({ ...css, scale, pageHeightPts }),
        };
      }
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const css = getPos(e);
    const pdf = cssToPdf({ ...css, scale, pageHeightPts });
    if (activeTool === 'freedraw') {
      drawing.current = { type: 'freedraw', points: [pdf], color: activeColor, strokeWidth };
    } else if (activeTool === 'text') {
      drawing.current = { type: 'text', startPdf: pdf, color: activeColor, textSize, textFont, textBold, textShadow };
    } else {
      drawing.current = { type: activeTool, startPdf: pdf, color: activeColor, strokeWidth };
    }
  }, [activeTool, activeColor, strokeWidth, textSize, textFont, textBold, textShadow, annotations, scale, pageHeightPts, onSelectAnnotation]);

  const onPointerMove = useCallback((e) => {
    // ── moving a selected annotation ──
    if (moving.current) {
      const css = getPos(e);
      const nowPdf = cssToPdf({ ...css, scale, pageHeightPts });
      const dx = nowPdf.x - moving.current.startPdf.x;
      const dy = nowPdf.y - moving.current.startPdf.y;
      const patch = translateAnn(moving.current.orig, dx, dy);
      onUpdateAnnotation(entryId, moving.current.id, patch);
      return;
    }
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
  }, [annotations, scale, pageHeightPts, selectedId, entryId, onUpdateAnnotation]);

  const onPointerUp = useCallback((e) => {
    if (moving.current) { moving.current = null; return; }
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
      if (d.type === 'text') {
        const label = window.prompt('Enter text:');
        if (!label) return;
        const size = d.textSize || 16;
        const top = Math.max(d.startPdf.y, pdf.y);
        const left = Math.min(d.startPdf.x, pdf.x);
        const bh = Math.max(h, size * 1.3);
        const bw = Math.max(w, size * 0.6 * label.length, size * 2);
        ann = {
          type: 'text', x: left, y: top - bh, width: bw, height: bh,
          text: label, fontSize: size, font: d.textFont, bold: d.textBold, shadow: d.textShadow,
          color: d.color, opacity: 1,
        };
      } else {
        if (w < 2 && h < 2) return;
        ann = {
          type: d.type, x, y, width: w, height: h,
          color: d.color, strokeWidth: d.strokeWidth,
          opacity: d.type === 'highlight' ? 0.35 : 1,
        };
      }
    }
    if (ann) onAddAnnotation(entryId, ann);
  }, [entryId, scale, pageHeightPts, onAddAnnotation]);

  const onDoubleClick = useCallback((e) => {
    if (activeTool !== 'cursor') return;
    const css = getPos(e);
    const hit = hitTest(annotations, css, scale, pageHeightPts);
    if (hit && hit.type === 'text') {
      const label = window.prompt('Edit text:', hit.text);
      if (label != null && label !== '') onUpdateAnnotation(entryId, hit.id, { text: label });
    }
  }, [activeTool, annotations, scale, pageHeightPts, entryId, onUpdateAnnotation]);

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
      onDoubleClick={onDoubleClick}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`Annotation layer page ${pageNum}`}
    />
  );
}

// ── model helpers ───────────────────────────────────────────────────────────

/** Returns a patch that moves `ann` by (dx, dy) in PDF points. */
function translateAnn(ann, dx, dy) {
  if (ann.type === 'freedraw') {
    return { points: ann.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  }
  return { x: ann.x + dx, y: ann.y + dy };
}

function annBBox(ann) {
  if (ann.type === 'freedraw') {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const p of ann.points) {
      minx = Math.min(minx, p.x); miny = Math.min(miny, p.y);
      maxx = Math.max(maxx, p.x); maxy = Math.max(maxy, p.y);
    }
    return { x: minx, y: miny, width: maxx - minx, height: maxy - miny };
  }
  return { x: ann.x, y: ann.y, width: ann.width ?? 0, height: ann.height ?? 0 };
}

// ── rendering helpers ──────────────────────────────────────────────────────

function renderAnnotations(ctx, annotations, scale, pageHeightPts, selectedId) {
  for (const ann of annotations) {
    ctx.save();
    ctx.globalAlpha = ann.opacity ?? 1;
    renderOne(ctx, ann, scale, pageHeightPts);
    ctx.restore();
  }
  if (selectedId != null) {
    const sel = annotations.find((a) => a.id === selectedId);
    if (sel) renderSelection(ctx, sel, scale, pageHeightPts);
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
    const size = ann.fontSize ?? 12;
    const bh = ann.height ?? size;
    const tl = pdfToCss({ x: ann.x, y: ann.y + bh, scale, pageHeightPts });
    const baseX = tl.x;
    const baseY = tl.y + size * scale; // baseline one line-height below box top
    ctx.fillStyle = ann.color;
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${ann.bold ? 'bold ' : ''}${size * scale}px ${cssFontStack(ann.font)}`;
    if (ann.shadow) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 1.5 * scale;
      const off = shadowOffset(size) * scale;
      ctx.shadowOffsetX = off;
      ctx.shadowOffsetY = off;
      ctx.fillText(ann.text, baseX, baseY);
      ctx.restore();
    } else {
      ctx.fillText(ann.text, baseX, baseY);
    }
  }
}

function renderSelection(ctx, ann, scale, pageHeightPts) {
  const bb = annBBox(ann);
  const tl = pdfToCss({ x: bb.x, y: bb.y + bb.height, scale, pageHeightPts });
  const pad = 3;
  ctx.save();
  ctx.strokeStyle = '#1d6fa4';
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(tl.x - pad, tl.y - pad, bb.width * scale + pad * 2, bb.height * scale + pad * 2);
  ctx.restore();
}

function renderPreview(ctx, d, scale, pageHeightPts) {
  if (!d) return;
  ctx.save();
  if (d.type === 'freedraw') {
    ctx.globalAlpha = 0.6;
    renderOne(ctx, { ...d, opacity: 1 }, scale, pageHeightPts);
  } else if (d.endPdf) {
    const x = Math.min(d.startPdf.x, d.endPdf.x);
    const y = Math.min(d.startPdf.y, d.endPdf.y);
    const w = Math.abs(d.endPdf.x - d.startPdf.x);
    const h = Math.abs(d.endPdf.y - d.startPdf.y);
    if (d.type === 'text') {
      const tl = pdfToCss({ x, y: y + h, scale, pageHeightPts });
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = d.color;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.strokeRect(tl.x, tl.y, w * scale, h * scale);
    } else {
      ctx.globalAlpha = 0.6;
      renderOne(ctx, { type: d.type, x, y, width: w, height: h, color: d.color, strokeWidth: d.strokeWidth, opacity: 0.6 }, scale, pageHeightPts);
    }
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
