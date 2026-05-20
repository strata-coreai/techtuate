Build the annotation/markup layer for the PDF editor. This is the third item in the README's build sequence (after rendering and export round-trip, both already done). It also adds the coordinate helper that every subsequent editing feature reuses.

## Scope

1. **Coordinate helper — `pdf-editor/src/lib/coords.js`.** The annoying-but-foundational bit: pdf.js renders top-left-origin in CSS pixels at our current scale; pdf-lib draws bottom-left-origin in PDF points (1 pt = 1/72"). Build:
   - `cssToPdf({ x, y, scale, pageHeightPts })` → `{ x, y }` in points
   - `pdfToCss({ x, y, scale, pageHeightPts })` → `{ x, y }` in CSS px
   - `getPdfPageSize(pdfDoc, pageNum)` → `{ widthPts, heightPts }` (use `page.getViewport({ scale: 1 })`)
   Sanity check on paper: a letter page is 612×792 pts. At scale 1.0, css top-left (0,0) → pdf (0, 792). css (100, 50) → pdf (100, 742). Include a short comment explaining the math.

2. **Annotation model — in-memory only this PR.** A `Map<pageNum, Annotation[]>` held in App state. Each annotation:
   ```js
   { id, pageNum, type, color, strokeWidth, opacity, ...typeSpecific }
   ```
   Types in scope: `freedraw` (array of points in CSS px at scale 1), `highlight` (rect), `text` (rect + string + fontSize), `rectangle` (rect). **Skip signatures for now.**

   Coordinates inside the model are stored in **PDF points** (scale-invariant), converted on the way in (pointer → model) and on the way out (model → render).

3. **Drawing UX**
   - Left rail or floating toolbar with: tool select (cursor / freedraw / highlight / text / rect), color swatches (yellow / black / red / blue / green only — palette discipline), stroke width 1–6.
   - For each page, render an overlay `<canvas>` absolutely positioned on top of the existing `PageView` canvas, same size. Pointer events on the overlay create new annotations.
   - Existing annotations re-render on the overlay from the model on every change. Idempotent — derived state only.
   - Click an existing annotation to select (hit-test on the overlay); Backspace/Delete removes it.

4. **Export integration**
   - In `App.jsx`, the existing `onSave` already calls `exportPdf(arrayBuffer, { mutate })`. Extend the `mutate` to walk the annotations model and draw each annotation onto the right pdf-lib `PDFPage` using `drawLine`, `drawRectangle`, `drawText` — converting coords via the helper.
   - **Do not change `exportPdf`'s signature.** It already accepts `mutate`.

## Constraints

- Match the existing palette + neo-brutalist look. Reuse `.btn` and surrounding styles in `styles.css`. Add new tokens only if needed.
- No new dependencies. pdf-lib already provides everything for drawing primitives.
- Don't break the render-cancellation lifecycle in `PageView.jsx`. The overlay canvas is a sibling, not a replacement.
- Annotations live in-memory only. **Don't add persistence in this PR** — note as a TODO.
- Undo/redo is **out of scope** for this PR. Note as TODO.

## Acceptance

- Drop a PDF, draw a yellow highlight across part of a sentence on page 2, click **save copy**, open the downloaded PDF in any reader → highlight appears in the right place.
- Switch to page 3, draw a rectangle, switch to page 1, switch back to page 3 → drawings persist (in-memory).
- Change zoom from 125% to 200% → existing annotations re-render at the new scale, still aligned to the underlying content.
- Delete an annotation with Backspace → it disappears from view AND from the next saved file.
- `npm run build` at repo root succeeds with no errors.

## Out of scope

Text-editing of existing PDF content. Signatures. Image annotations. Persistence (IndexedDB). Undo/redo. Multi-select.
