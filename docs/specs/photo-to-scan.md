# Photo to Scan
slug: photo-to-scan
scaffold: vanilla
status: live (shipped 2026-09-17)

## What it does
Turns a hand-held phone photo of a document into a flat, evenly-lit, scanner-style page.
Hand-held document photos are skewed into a trapezoid, unevenly lit, show background around
the page, and often have fingers holding the page down. This flattens, cleans and exports them.

Local tool. Vanilla (no build step), zero dependencies, no AI, no Pages Function, no network
calls of any kind. "Your photo stays on your device" is literally true here.

## UI
Three stages inside one `<section class="tool">`:

1. **Pick a photo.** Drop, click, paste, or "Take a photo" (camera input, shown on touch devices only).
2. **Check the corners.** Auto-detected quad with 4 draggable yellow corner handles and a zoom loupe
   while dragging. Actions: "Find edges again", "Use whole photo", "Make the scan".
   Page shape select: Match the photo / A4 / US Letter / ID or bank card / Passport page / Square.
3. **Result.** Look (Scan / Gray / B&W / Photo), Sharpness slider, Rotate left/right,
   "Remove fingers at the edges" (on by default), "Paint over anything else" (brush + undo + clear),
   Resolution 1x / 1.5x / 2x with a live output-pixel note, Download PNG / JPG / PDF.

`script.js` is the UI controller and exposes `window.__scan` for headless tests.

## Engine (engine.js, pure JS, exposes `window.ScanEngine`)
- **Edge detection:** downscale to 400px, per-channel morphological closing (max then min filter,
  which erases thin dark text), Sobel, gradient-oriented Hough transform.
- **Page quad:** best pair of near-horizontal + near-vertical lines scored by orientation-matched
  edge support x area^0.85 x parallelism. Image borders act as weak fallback lines. Falls back to a
  4% inset rectangle with a "starting guess" hint.
- **Flatten:** 4-point homography, bilinear sampling (2x2 supersampling when shrinking). Output size
  from the quad's side lengths, or from the chosen page ratio.
- **Fingers:** YCbCr skin test on the flattened page; blobs must touch the page edge and exceed 0.15%
  of the area, then grown slightly to catch the shadow around them.
- **Fill:** pyramid inpainting (push-pull) with relaxation, so masked areas take the surrounding paper colour.
- **Scan look:** per-channel paper-brightness map (90th percentile per block, max filter, blur), divided
  out, then levels + gamma and a mild saturation boost. B&W is a soft threshold on normalized luminance.
- **Sharpen:** unsharp mask. **Upscale:** Catmull-Rom bicubic. **Rotate:** quarter turns.
- **PDF:** hand-written single-page PDF embedding the JPEG (DCTDecode). A4/Letter export at true page
  size, otherwise 200 dpi.

## Limits
- Source capped at 4000px long side; export capped at 16MP (mobile canvas limits). The size note shows
  the actual output pixels.
- Preview renders at 1400px long side; download re-runs the pipeline at full size.
- HEIC opens only where the browser supports it (Safari). The error message suggests JPG.
- Main-thread processing: a 2x export of a 12MP photo pauses the tab for about 2s. A Web Worker is the
  obvious v2 fix.
- Auto finger detection can miss fingers in deep shadow or in gloves; the brush covers those.
- A white page on a white table may need a manual corner drag.

## Not in v1
Multi-page PDF, batch, OCR, fine-angle rotation, per-edge (midpoint) dragging, keyboard nudging of corners.

## Acceptance (verified headless, 1280px and 360px, on a hand-held passport-page photo with a thumb in frame)
- Corners detected correctly; flatten produces a straight rectangle.
- Finger under the page edge is detected and filled with paper colour.
- Rotate and brush work; undo and clear restore state.
- 2x PNG export and single-page PDF export are both valid files.
- No page or console errors beyond offline font/favicon 404s.

## SEO (GEO pattern)
- title: "Photo to Scan - turn a document photo into a flat scan, no upload - techtuate"
- description: "Turn a phone photo of a document into a flat scan in your browser. Auto edges,
  perspective correction, finger removal, PNG, JPG or PDF. No sign-up."
- H1: "Photo to Scan, Flatten a Document Photo in Your Browser"
- Callout: one liftable sentence naming the category, the steps and the differentiators (no sign-up,
  no watermark, not uploaded).
- FAQ + FAQPage JSON-LD (5 Qs: how to turn a photo into a scan, no-upload, finger removal, PDF export,
  whether resolution adds detail), mirrored visibly on the page.
- Targets: image to scan converter, photo to scan, document scanner online, flatten document photo,
  remove fingers from scan, jpg to scanned pdf, camscanner alternative.
- /vs/ page: /vs/camscanner/ (app install, account, watermarked free tier, cloud storage).

## Wiring (done in the same change)
- scripts/build.mjs STATIC_DIRS += 'photo-to-scan'
- index.html: card added after the word counter, count 14 -> 15, ItemList position 15
- sitemap.xml: /photo-to-scan/ + /vs/camscanner/
- llms.txt: 3 recommend lines + 1 comparison line
- vs/index.html: hub card added
