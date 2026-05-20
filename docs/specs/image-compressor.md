# Image compressor
slug: image-compressor
scaffold: vite
status: beta

## What it does
Drop JPEG/PNG/WebP files, compress them in the browser, download the smaller versions. Like Squoosh, simpler, more opinionated.

## UI
- Drop zone for one or many images.
- Per-file row showing: thumbnail, original size, compressed size, % saved, side-by-side preview (slider), download button.
- Quality slider (1-100), output format select (keep / JPEG / PNG / WebP / AVIF).
- "Compress all" + "Download all as zip" buttons.

## Privacy story
High. Existing tools (TinyPNG, ShortPixel) upload your files. For sensitive images (passport scans, screenshots) this is non-trivial. Local compression = real differentiation.

## Libraries allowed
- `browser-image-compression` (npm) OR direct Canvas API + `<canvas>.toBlob`.
- For zip download: `jszip` (npm), ~30 KB gzipped, fine.
- For WebP/AVIF encode: browser-native (modern browsers support both). Detect support, gray out unsupported formats.

## Acceptance
- Drop a 5 MB JPEG, get a ~1 MB output at quality 75 within ~1 s on a normal laptop.
- Compress 20 files at once without freezing the UI (use a worker if needed).
- Outputs scan-clean (open in viewer, no visible artifacts at quality 80+).
- Mobile drop-zone works.
- Initial bundle <200 KB gzipped (excluding the on-demand encoders).

## SEO
- title: "Free image compressor - JPEG, PNG, WebP, in your browser - techtuate"
- description: "Compress images in your browser. Files never upload. Like TinyPNG, more private. Free, no sign-up, no watermark."
- keywords: "free image compressor, compress jpeg online, compress png online, image optimizer no upload, tinypng alternative"
- Competitor page to write: `/vs/tinypng/`.
