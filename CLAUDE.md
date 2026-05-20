# techtuate — project context for Claude Code

A static site of free, client-side, browser-based utilities. One repo, one Cloudflare Pages project, landing page at the root, each tool in its own `/<tool-name>/` subfolder.

## Hard constraints — do not violate

- **100% client-side / static.** No backend, no server, no APIs we own, no functions, no edge workers. Every tool runs entirely in the user's browser.
- **No accounts, no credit cards, no ads.** The site's whole promise to users.
- **Free hosting on Cloudflare Pages.** Whatever you ship must build to `./dist/` and serve as static files. No per-request cost.
- **No data leaves the device.** No third-party analytics SDKs, no CDN fetches at runtime (CDN'd build deps at build time are fine).
- **Same palette + voice across every tool.** White, vibrant yellow (`#ffd60a`), black, dark grays only. Inter Tight display, neo-brutalist hard borders + offset shadows. Mobile-friendly down to ~360px.

## Repo layout

```
techtuate/
├── index.html              # landing page (single self-contained file)
├── package.json            # root build script
├── scripts/build.mjs       # builds all tools into ./dist for Cloudflare Pages
├── pdf-editor/             # Vite + React app at /pdf-editor/
│   ├── package.json
│   ├── vite.config.js      # base: '/pdf-editor/'
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── styles.css      # palette tokens live here too
│       ├── lib/
│       │   ├── pdfjs.js          # worker setup via Vite ?worker import
│       │   └── pdfExport.js      # the single export pipeline
│       ├── hooks/usePdfDocument.js
│       └── components/
│           ├── PageView.jsx
│           └── Thumbnails.jsx
├── docs/prompts/           # paste-ready Claude Code session prompts
└── dist/                   # build output (gitignored)
```

## Build / dev

```
# at repo root
npm run build           # builds all tools into ./dist/ for CF Pages
npm run dev:pdf-editor  # vite dev server at http://localhost:5173/pdf-editor/

# inside a tool, also works
cd pdf-editor && npm install && npm run dev
```

The root `scripts/build.mjs` iterates a `TOOLS` array and for each entry runs `npm install && npm run build` in that folder, then copies its `dist/` to `./dist/<tool-name>/`. Adding a new tool = drop a folder, add to that array, add a card to landing `index.html`.

## PDF editor — current state + load-bearing patterns

- **Plan:** rendering ✓ → export round-trip ✓ → coord helper + annotations → page ops → images-to-pages → form fill. **No text-editing of existing PDF content** — that scope decision is final.
- **The `mutate` seam.** `src/lib/pdfExport.js`'s `exportPdf(arrayBuffer, { mutate, fileName })` is the only export pipeline. Every editing feature is a `mutate: async (pdfDoc) => { ... }` passed into this. **Do not add a second save path.**
- **Two parallel handles to the file.** `usePdfDocument` returns `arrayBuffer` (raw bytes for pdf-lib) AND `pdfDoc` (pdf.js PDFDocumentProxy for rendering). When passing the buffer to anything that might transfer/detach it, always pass a `.slice(0)` copy so the cached buffer stays valid.
- **Render cancellation.** `PageView.jsx` cancels any in-flight render task on rerender (`task.cancel()`). Any new canvas-render code must follow the same pattern or zoom changes will throw "same canvas" warnings.
- **Worker setup.** `src/lib/pdfjs.js` uses Vite's `?worker` import + `GlobalWorkerOptions.workerPort`. Do not change to `workerSrc` + a CDN — the current setup is what makes this work identically in dev and in the CF Pages build.

## Allowed deps

`pdfjs-dist`, `pdf-lib`, `react`, `react-dom`. **No** UI libraries, no router, no state library, no Tailwind. Plain CSS with the palette tokens in `:root`.

## Placeholders to know about

- Cloudflare Web Analytics — `<head>` comment in landing `index.html`, search "Placeholder: Cloudflare".
- Buy Me a Coffee — `.support-slot` div in landing footer, search "Placeholder: Buy Me".

## When to ask vs. proceed

- Ambiguous UX choice (e.g., "where should this button go") → make a reasonable choice and call it out; don't block on it.
- Ambiguous architectural choice (e.g., "should we add IndexedDB persistence") → ask, don't decide silently.
- Anything that violates the "Hard constraints" above → stop and surface it.
