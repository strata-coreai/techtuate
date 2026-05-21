Compress a loaded PDF in three modes (Light / Medium / Aggressive). README feature #7. Spec: `docs/specs/pdf-compress.md` - read it first, this prompt is the execution wrapper, not the source of truth.

## Scope

1. New module: `pdf-editor/src/lib/pdfCompress.js` exporting
   ```js
   export async function compressPdf(arrayBuffer, { mode }) -> { mutate, summary }
   ```
   - `mode`: `'light' | 'medium' | 'aggressive'`
   - Returns a `mutate` function compatible with the existing `exportPdf({ mutate, fileName })` pipeline (NOT a new save path).
   - `summary` holds anything the UI needs after the compress runs (warnings, originalSize, etc.). The actual final size is whatever `exportPdf` reports - don't duplicate that calculation.

2. **Light mode.** No image work. The `mutate` is essentially a no-op; the win comes from pdf-lib's default object-stream dedup on save (`{ useObjectStreams: true }` already in `pdfExport.js`). Confirm by round-tripping; if a round-tripped Light-mode save isn't smaller than the original on a sample input, log a one-line warning and ship anyway - some PDFs are already optimized.

3. **Medium / Aggressive modes.**
   - Walk every page's `Resources().XObject()` and find each entry whose `/Subtype` is `/Image`.
   - For each image:
     - Inspect the filter (`/Filter`). If `/JPXDecode` (JPEG2000) or `/JBIG2Decode`, skip and add a warning to `summary.warnings` ("N images use a codec your browser can't decode and were left unchanged"). Do NOT raster the page as a fallback - that destroys text.
     - For `/DCTDecode` (JPEG) and `/FlateDecode` (PNG/raw): decode the raw stream into an `ImageBitmap`. JPEG path: `createImageBitmap(new Blob([rawBytes], { type: 'image/jpeg' }))`. PNG / raw: easier path is to read the image via `pdfDoc.embeddedJpgs` / `embeddedPngs` if available; if not, decode via a temp canvas plus PDFImage helper.
     - If `max(width, height)` exceeds the threshold (1200 px Medium, 800 px Aggressive), downsample on an `OffscreenCanvas` (or HTMLCanvasElement fallback) with `imageSmoothingQuality = 'high'`.
     - Re-encode to JPEG at the chosen quality (75 Medium, 55 Aggressive) via `canvas.convertToBlob({ type: 'image/jpeg', quality })` (OffscreenCanvas) or `canvas.toBlob` (HTMLCanvasElement).
     - Replace the image XObject in the page resources by registering the new image with `pdfDoc.embedJpg(newBytes)` and overwriting the entry in the page's XObject dict (`page.node.Resources().XObject().set(name, newImageRef.ref)`).
   - The mutate function is everything above wrapped to run against the `PDFDocument` instance that `exportPdf` already loaded.

4. **Web Worker.** Image decode + canvas re-encode + pdf-lib mutation are CPU-heavy. Move the compression to a worker.
   - Use Vite's `?worker` import syntax (same pattern as `lib/pdfjs.js`). Add `pdf-editor/src/lib/pdfCompress.worker.js`.
   - Pass the `ArrayBuffer` via `postMessage(buf, [buf])` to transfer (not copy). Caller already has a copy in React state - this is fine because we always pass `.slice(0)` to anything that may detach.
   - Worker returns the compressed `Uint8Array`. App.jsx feeds it back into `exportPdf` via a mutate that simply replaces the source bytes... actually cleaner: the worker IS the mutate. Call sites become `exportPdf(arrayBuffer, { mutate: workerCompressFn(mode), fileName })`. The mutate-the-doc seam is preserved.

5. **UI** (in `App.jsx` or a new `CompressPanel.jsx`):
   - "Compress" button in the controls bar, adjacent to existing save controls.
   - Click reveals an inline panel (not a modal) with three radios:
     - Light - "fast, small win"
     - Medium - "re-encode images, ~50% smaller"
     - Aggressive - "preview quality, ~80% smaller"
   - Live size preview: Light shows immediately (cheap), Medium / Aggressive compute lazily on hover or selection with 200ms debounce. If the worker takes more than 3s, just show "computing..." rather than blocking.
   - "Compress and save" primary button + "cancel" ghost button.
   - Result toast: "Reduced from X MB to Y MB (Z% smaller)" using the bytes returned from `exportPdf`. Use `pdf-editor/src/lib/format.js` for MB formatting (create if absent: `formatBytes(n) -> "12.3 MB"`).

6. **Warnings UI.** If `summary.warnings` is non-empty after compression, show them inline below the toast for 8 seconds before fading. Per-warning: small icon + one-line text. No blocking dialog.

## Constraints (load-bearing - read CLAUDE.md if unsure)

- No new dependencies. Only `pdfjs-dist`, `pdf-lib`, `react`, `react-dom` are allowed.
- The `mutate` seam in `lib/pdfExport.js` is the only save path. Compression is a mutate, not a parallel save.
- Two parallel file handles still apply: don't transfer the user's `arrayBuffer` to the worker without `.slice(0)` first - React state must keep a usable copy for subsequent saves.
- Worker via Vite's `?worker` import. Do NOT switch to `workerSrc` + CDN.
- Render cancellation: any new canvas-render code follows the `task.cancel()` pattern from `PageView.jsx`.
- Palette: use the existing tokens in `:root` in `src/styles.css`. No new colors.
- Mobile: panel must be usable down to 360px. Stack the radios vertically below 480px.
- Em-dashes / en-dashes are forever-banned. Hyphens only. In files, comments, prompts, everywhere.

## Acceptance

- Drop a real ~15 MB phone-scan PDF in `pdf-editor`. Click Compress, pick Medium. Get a ~3-5 MB file in under 10 seconds on a normal laptop.
- The compressed PDF opens cleanly in Preview, Acrobat, and Chrome PDF viewer.
- Selectable text in the input stays selectable in the output (Medium mode).
- A form-fillable PDF can still be filled after Medium compression (form fields survive).
- A PDF with JPEG2000 (`/JPXDecode`) images compresses successfully but shows a warning that N images couldn't be re-encoded.
- A tiny text-only PDF reports a near-0% reduction in Light mode without erroring.
- UI thread does not freeze during compression of a 20MB PDF (worker is doing the work).
- `npm run build` succeeds. Bundle delta < 30 KB gzip for the main chunk.
- No em-dashes anywhere in new code, comments, UI strings, or docs touched.

## Out of scope

- Font subsetting.
- OCR or "scan-to-text-PDF".
- Encryption / password protection on output.
- Streaming compression for files larger than RAM (rare; we cap at whatever the browser can `arrayBuffer()`).
- Compressor as a standalone tool at `/pdf-compress/`. This is integrated into the existing `/pdf-editor/`. (A standalone landing page is a separate marketing-page task, not this prompt.)

## After implementation

- Update `README.md`: feature #7 moves from "planned next" to "shipped" with the date.
- Update `llms.txt`: add "PDF size reducer / compressor" to the feature list.
- Update `pdf-editor/src/App.jsx` controls bar UI to expose the new Compress button next to Save.
- Update `index.html` (root landing) PDF editor card subtitle if it currently says "annotate, merge, fill" - add ", compress".
- Verify `npm run build` and `npm run dev` both succeed. Spot-check on Safari (image decode paths vary).
- Write the marketing companion page later: `/vs/ilovepdf-compressor/` (separate task).
