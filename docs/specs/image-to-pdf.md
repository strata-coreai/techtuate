# Image to PDF
slug: image-to-pdf
scaffold: vanilla
status: live

## What it does
Drop one or many images (JPEG / PNG), get a single PDF download. Each image becomes a page.

## UI
- Drop zone, accepts multiple files.
- Ordered preview list of dropped images (thumbnails). Drag to reorder, X to remove.
- Page sizing select: "Fit to letter" (8.5 x 11", centered with margin) / "Original" (page = image dimensions in pts) / "Fill letter" (cover, may crop).
- Orientation: auto / portrait / landscape.
- Output filename input (default: `images-<date>.pdf`).
- "Build PDF" button -> downloads.

## Privacy story
High. Same story as the PDF editor - existing converters upload your images.

## Libraries allowed
- `pdf-lib` - already a project dep, bundle as ESM module via `<script type="module">`. (Or vendor a tiny build of it under `/_template/_vendor/` if simpler.)

## Acceptance
- Drop 10 JPEGs, click Build PDF - get a 10-page PDF, images correctly oriented.
- "Fit to letter" centers with a 0.5" margin. "Original" page size = image dimensions.
- Reorder via drag - PDF reflects new order.
- Output file opens cleanly in Preview, Acrobat, Chrome.
- Bundle <300 KB gzipped (pdf-lib is the bulk).

## SEO
- title: "Free image to PDF converter - JPG, PNG to PDF, in your browser - techtuate"
- description: "Convert JPG / PNG images to a single PDF in your browser. No upload, no watermark, no sign-up. Free."
- keywords: "free image to pdf, jpg to pdf, png to pdf, image to pdf no signup, image to pdf no upload, image to pdf no watermark"
- Competitor page to write: `/vs/jpg-to-pdf/` covering iLovePDF, SmallPDF, FreeConvert.
