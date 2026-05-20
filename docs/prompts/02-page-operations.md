Build page-level structural operations for the PDF editor: reorder, rotate, delete, duplicate, merge in another PDF, split out a range. README feature #4. **Does not depend on the coord helper** — can be built before or after annotations.

## Scope

1. **`pageOrder` state.** Introduce `pageOrder: Entry[]` in App state where each `Entry = { id, sourceDocId, sourcePageIndex, rotation }`. The render loop iterates `pageOrder` instead of `[1..numPages]`. **Key each `<PageView>` by `entry.id`, not array index** — otherwise pdf.js will paint the wrong page during reorders.

2. **Multi-source documents.** The first opened PDF gets `sourceDocId = 'a'`; merged-in PDFs get `'b'`, `'c'`, etc. Maintain a `Map<sourceDocId, { arrayBuffer, pdfDoc }>`. Never mutate any source `arrayBuffer`.

3. **Sidebar = drag-reorderable.** Extend `Thumbnails.jsx` to support HTML5 drag-and-drop (no library). Drop reorders `pageOrder`. Show a visual insert-line during drag.

4. **Per-thumb controls** (visible on hover, palette-matched icon buttons): rotate-left 90°, rotate-right 90°, duplicate, delete. Rotation is stored in the `Entry` and is in {0, 90, 180, 270}.

5. **+ Add pages** button in the controls bar — opens a file picker, loads another PDF, appends its pages to `pageOrder`.

6. **Extract pages…** button — pops a tiny dialog with from / to inputs. Clicking "extract" runs a separate `exportPdf` with a `mutate` that builds a new doc containing only the selected range (no edits to the open doc).

7. **Save integration.** The existing `onSave` already uses `exportPdf`. Extend its `mutate` to:
   - Create a fresh `PDFDocument`
   - For each `Entry` in `pageOrder`, `copyPages` from the right source doc, apply rotation via `setRotation(degrees(entry.rotation))`, append.
   - Save as today.

## Constraints

- Don't break the existing thumbnails component — extend it.
- Don't introduce a UI library, dnd library, or state library. HTML5 DnD is enough.
- The first-load case must still work: when a PDF is loaded fresh, `pageOrder` is built as one entry per source page.

## Acceptance

- Drag page 5 to position 2 in the sidebar, save → downloaded PDF reflects the new order.
- Rotate page 3 by 90°, save → it's rotated in the output.
- Click + add pages, pick a 2-page PDF → the editor shows N+2 pages; save produces a valid combined PDF.
- Extract pages 4–6 → a new download appears containing exactly those pages, in order; the open doc is unchanged.
- `npm run build` succeeds.

## Out of scope

Splitting at a delimiter, batch operations across many tabs, undo/redo (note as TODO).
