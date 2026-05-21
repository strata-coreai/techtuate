# PDF compress (size reducer)
feature-of: pdf-editor
scaffold: extends existing pdf-editor (Vite)
status: planned

## What it does
Shrink the file size of a loaded PDF while preserving as much quality as practical. Three modes the user picks per save:
- **Light** (~10-30% reduction): re-save via pdf-lib with object stream consolidation + duplicate stream removal. Text intact, fonts intact, images untouched.
- **Medium** (~40-70% reduction): re-encode embedded images to JPEG at quality 75, downsample any image above 1200px on the long edge to 1200px. Text + form fields + vector content untouched.
- **Aggressive** (~70-90% reduction): same as Medium but quality 55 and max 800px. For shareable previews of huge scans, not archival.

## Why this matters
Gigantic PDFs are the most common user complaint about PDFs. Phone scans of 5-page documents routinely come in at 30+ MB because the camera embeds 12MP photos as page images. Email attachment limits, slow uploads, slow renders. This is high-traffic territory (~50K/mo searches for "compress pdf").

## UI
- **"Compress" button** in the controls bar, next to "save copy".
- Click opens a small inline panel (not a modal) showing:
  - Three radio choices (Light / Medium / Aggressive) with one-line descriptions
  - **Live size preview** if cheap to compute (Light always shows; Medium / Aggressive compute on hover with a 200ms debounce, since they re-encode)
  - "Compress and save" primary button + "cancel" ghost button
- Result toast: "Reduced from X MB to Y MB (Z% smaller)".

## How it works (technically, in the browser)

### Light
- Re-load via pdf-lib with `{ ignoreEncryption: true, updateMetadata: false }`
- Save with `{ useObjectStreams: true }` (default, but explicit)
- pdf-lib already de-duplicates identical streams on save. That's the win.

### Medium / Aggressive (the interesting one)

Walk each page's resource dict, find every embedded image (XObject of subtype `/Image`):
1. Use pdf-lib's `PDFDocument.embeddedJpgs` and `embeddedPngs` to enumerate, OR walk the low-level `context.indirectObjects` looking for image streams.
2. For each image:
   - Decode to an `ImageBitmap` (use the existing `pdfjs-dist` PDFPageProxy if convenient, or decode directly from the raw stream via `createImageBitmap(new Blob([...]))` when the image is already JPEG/PNG).
   - If the long edge is over the threshold (1200 / 800 px), downsample via a temporary canvas using `ctx.drawImage` with `imageSmoothingQuality = 'high'`.
   - Re-encode via `canvas.toBlob('image/jpeg', quality)` at the chosen quality.
   - Replace the original PDF image XObject with the new JPEG bytes via pdf-lib (`page.node.Resources().XObject().set(name, newImageRef)`).
3. Save the document.

**The tricky bits:**
- pdf-lib's high-level API doesn't natively support replacing an existing image. We'll need to use its lower-level `context.register` to add the new image XObject, then mutate the page's resource dict to point to it. There are working examples in pdf-lib issues #1234 and similar. Verify before committing to the spec.
- Some images are JPEG2000 (`/JPXDecode`) or JBIG2 - browsers can't decode these natively. Fall back to: leave them untouched OR raster the page entirely (loses text). Detect and warn the user when this happens.
- Color profiles attached to images get stripped on re-encode. For photo-heavy PDFs this is fine; for color-critical work (print proofs), skip Medium/Aggressive.

### Worker
This is CPU-heavy. Use a Web Worker so the UI doesn't freeze. Pattern: pass the ArrayBuffer to a worker via `postMessage` with `[arrayBuffer]` transfer; worker does pdf-lib + canvas work; posts back the new bytes.

## Acceptance
- Drop a 15 MB phone-scan PDF, click Compress, choose Medium, get a 3-5 MB PDF in under 10 seconds on a normal laptop.
- Output opens cleanly in Preview, Acrobat, Chrome PDF viewer.
- Text content is still selectable and searchable (Medium mode).
- Form fields still work (when present, Medium mode).
- The "Reduced from X to Y" toast shows accurate numbers.
- Compressing a PDF that's already image-only-and-tiny shouldn't error - it just shows 0% reduction.
- Compressing a PDF with JPEG2000 images shows a warning instead of silently corrupting.
- Bundle delta < 30 KB gzip (the only new code is the compression logic; pdf-lib + pdf.js are already loaded).

## Out of scope
- Compressing fonts (sub-setting). Pdf-lib doesn't support this in-browser well; complex topic.
- OCR-then-recompress (converting scanned PDFs to text PDFs).
- Encryption / password protection on output.

## SEO / marketing
- title: "Free PDF compressor - shrink PDF size in your browser, no upload - techtuate"
- description: "Compress big PDFs in your browser. Reduce 30 MB phone-scan PDFs to a few MB. No upload, no watermark, no sign-up."
- keywords: "free pdf compressor, reduce pdf size, compress pdf online no upload, pdf compressor no signup, shrink pdf without uploading"
- Search demand: ~50K/mo US for "compress pdf" cluster.
- Competitor page to write: `/vs/ilovepdf-compressor/` (ILovePDF's compressor has a 200MB upload limit + freemium ceiling).

## Implementation notes for Claude Code

This is best built as a new file `pdf-editor/src/lib/pdfCompress.js` exporting `compressPdf(arrayBuffer, { mode: 'light'|'medium'|'aggressive' }) -> Promise<Uint8Array>`. App.jsx then exposes a "Compress" button that calls it and feeds the result into the existing `exportPdf` pipeline. **Do not add a second save path** - the mutate-then-save pattern still applies: `mutate` here is the compression itself.

Add as the next prompt in `docs/prompts/`. Suggested filename: `docs/prompts/05-pdf-compress.md`.
