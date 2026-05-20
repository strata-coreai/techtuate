# techtuate

A drawer of free, browser-based little tools. No accounts, no credit cards, no ads — every tool runs entirely on the user's device.

## Architecture

- **100% client-side / static.** No backend, no server, no databases. Every tool's logic runs in the user's browser.
- **One repo, one Cloudflare Pages project.** A landing page lives at the root; each tool lives in its own subfolder and is served from `/<tool-name>/`.
- **Deploy target: Cloudflare Pages.** Free hosting with unlimited bandwidth and no per-request cost.

### Repo layout

```
techtuate/
├── index.html              # landing page (static, self-contained)
├── package.json            # root build script + dev helpers
├── scripts/build.mjs       # builds everything into ./dist for CF Pages
├── pdf-editor/             # Vite + React app, served at /pdf-editor/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js      # base: '/pdf-editor/'
│   └── src/
└── dist/                   # build output (gitignored, what CF Pages serves)
    ├── index.html
    └── pdf-editor/
```

### Adding a new tool

1. Create a folder at the repo root: `./<tool-name>/`
2. Either:
   - A Vite app (any framework). Set `base: '/<tool-name>/'` in its `vite.config.js`. The root build script auto-runs `npm install && npm run build` and copies `./<tool-name>/dist` to `./dist/<tool-name>/`.
   - Or just plain static files — they'll be copied as-is.
3. Add `'<tool-name>'` to the `TOOLS` array in `scripts/build.mjs`.
4. Add a tool card to `index.html` (copy the existing card, swap title/icon/href/status).

## Deployment

Cloudflare Pages settings:
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (the repo root)

Web Analytics and Buy Me a Coffee placeholders are in `index.html` — search the file for `Placeholder:` to find where to drop in the snippets.

## Tools

| Tool | Path | Status |
| --- | --- | --- |
| PDF editor | `/pdf-editor/` | in progress — see below |

## PDF editor — planned build sequence

Scope: annotation/markup, form filling, page operations (merge/split/reorder/rotate/delete), and adding pages from images. **No text editing** of existing PDF content.

1. **Rendering** *(done — current session)*
   pdf.js loads a user-supplied file, all pages render to canvases at a configurable scale, prev/next + jump-to-page navigation, sidebar thumbnails. The file is held as both an `ArrayBuffer` (for pdf-lib later) and a `PDFDocumentProxy` (for rendering).

2. **Export round-trip**
   Load with pdf-lib from the same `ArrayBuffer`, save it back unchanged, and verify pdf.js can re-open the output. This is the "no edits, but full round-trip works" milestone — once this is solid, every subsequent feature is just "make a change before save."

3. **Coordinate helper + annotations**
   The annoying part: pdf.js renders top-left-origin in CSS pixels, pdf-lib edits bottom-left-origin in PDF points. Build a small helper that maps canvas (x, y, scale) → pdf-lib (x, y) once, then use it for everything that follows. First annotation type: free-draw and highlight; then text notes, shapes, signatures.

4. **Page operations**
   Reorder pages (drag in the sidebar), rotate (90° steps), delete, duplicate, and merge in pages from another uploaded PDF. Implemented via pdf-lib's `copyPages` / `removePage` / `setRotation`. Also split: export a selected page range as a new file.

5. **Images-to-pages**
   Accept PNG/JPEG drops, embed them as new pages with sensible sizing (fit, fill, original). pdf-lib's `embedJpg` / `embedPng`. Bonus: rasterize a folder of images into one PDF.

6. **Form filling**
   Use pdf-lib's form API (`getForm()`, `getTextField()`, `getCheckBox()`, …) to expose detected form fields as a side panel. Type values in the panel, fill the visual overlay on top of the rendered page in sync. Save flattens (or doesn't, configurable).

Each step has a clean stopping point and shippable value on its own.

## Local development

```
# run the PDF editor's Vite dev server
npm run dev:pdf-editor

# do a full Cloudflare-Pages-style production build
npm run build
```

Open `http://localhost:5173/pdf-editor/` for the PDF editor dev server (it serves the app at its prod base path, matching production behavior).

To preview the landing page locally, just open `index.html` directly in a browser — it's a single self-contained file.
