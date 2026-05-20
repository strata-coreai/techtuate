Let the user drop PNG/JPEG files and embed them as new PDF pages. README feature #5.

## Two modes

- **No PDF open** → drop images on the empty state → "build PDF from images" → creates a fresh `PDFDocument` from just those images.
- **PDF open** → an "+ add pages from images" button in the controls bar opens a file picker (or accept drops anywhere on the viewer). Each image becomes an appended page (if `pageOperations` is in place, append as new `Entry`s in `pageOrder`; otherwise append at end of current source).

## Scope

1. Accept one or more files; validate by mime + extension (`image/png`, `image/jpeg`, `.png`, `.jpg`, `.jpeg`).
2. For each, read as `ArrayBuffer`. Sniff header bytes — JPEG starts `FF D8 FF`, PNG starts `89 50 4E 47 0D 0A 1A 0A` — and call `embedJpg` or `embedPng` on the target `PDFDocument`.
3. Page sizing options (small `<select>` in the dialog or toolbar):
   - **Fit to letter** (default): page is 8.5×11" (612×792 pts), image scaled to fit with a 0.5" margin, centered.
   - **Original**: page is the image's pixel dimensions (1 px = 1 pt).
   - **Fill letter**: page is letter; image scaled to cover, may crop edges.
4. Show a small preview list of dropped images in the dialog before committing, with a remove-X per image.

## Constraints

- No image-processing libs. pdf-lib handles embed + transform. Use a `<canvas>` only if you need a sidebar preview at small size.
- Drop zone reuses the existing `.empty .drop` aesthetic for the "no PDF" case; the loaded-PDF case uses the standard button + file input pattern.
- Don't break existing file-load flow — image drops should not be mis-routed to `loadFile`.

## Acceptance

- Drop three JPEGs on the empty state → click "build PDF" → save → downloaded PDF has 3 pages, images embedded, sized per the chosen mode.
- With a PDF open, drop a PNG → it appears as a new page at the end; save → PDF has the new page.
- Mixing PNG + JPEG in one drop works.
- `npm run build` succeeds.
