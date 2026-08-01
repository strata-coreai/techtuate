# techtuate - project context for Claude Code

A static site of free, client-side, browser-based utilities. One repo, one Cloudflare Pages project, landing page at the root, each tool in its own `/<tool-name>/` subfolder, plus SEO/marketing pages.

## Positioning (as of 2026-07-28)

techtuate is now **"free & powerful little tools that just work"**, not "purist local-only". Local processing is still the default and the SEO moat, but AI features are welcome as **clearly-labeled add-ons**. AI is NOT the headline - lead with free + useful. See `docs/positioning.md` for the full messaging + rewrite map. Practical copy rules: scope the "your files stay on your device" claim to the local tools (do not state it as a whole-site absolute); say "no ads" (true today) but never "no ads, ever" (ads are a possible future path past the free-tier ceiling); AI tools always carry the `*` disclosure.

## Hard constraints - do not violate

- **Local-first is the default.** Every non-AI tool runs 100% client-side: files are processed in the browser and never uploaded. This is the moat - keep it for any tool that does not genuinely need a server.
- **AI / enhanced tools MAY use a backend**, specifically a Cloudflare Pages Function proxy to a third-party AI service, but ONLY when: (a) it materially improves quality, (b) it carries the visible `*` "uses a third-party AI service" disclosure, (c) there is no user account, (d) the user's input is not stored server-side, (e) the API key stays server-side as an encrypted env var. **Ask the founder before adding a new AI dependency.**
- **Lightweight third-party embeds** (Trustpilot, StartupBar, privacy-friendly analytics) are allowed, but must be disclosed on pages where they load.
- **No accounts, no credit cards.** Still hard. **No ads today** (but do not promise "ever").
- **Free static hosting on Cloudflare Pages.** The static site builds to `./dist/`. AI functions live in `/functions/` at the repo root and run on Cloudflare's free tier; keep per-request cost near zero.
- **Files stay on the device for local tools.** AI tools send only the specific input needed (e.g. a card image) to a named, labeled service. No third-party analytics SDKs beyond disclosed embeds; no runtime CDN fetches for the static tools (build-time deps are fine).
- **Same palette + voice across every page.** White, vibrant yellow (`#ffd60a`), black, dark grays only. Inter Tight display, neo-brutalist hard borders + offset shadows. Mobile-friendly down to ~360px.
- **NEVER use em-dashes (—) or en-dashes (–). Use plain hyphens (-) instead.** Forever rule. Founder said em-dashes "scream AI". Applies to every file: HTML, CSS, JS, MD, comments, prompts.

### First AI tool: /card-reader/ (business card reader) - the pattern to copy
Reference implementation of the AI-tool rules above. It uses a single Cloudflare Pages Function (`/functions/api/scan.js`) that forwards the card image to Google Gemini (Google AI Studio key) for reading:
- The image is sent **once for reading only** - the function does not store or log it, there is no account, and the user's saved phonebook stays in their browser (IndexedDB).
- The third-party call **is labelled** on the tool UI (the visible `*` disclosure) and in its About section. Do not quietly remove that label.
- The Gemini key lives ONLY as the encrypted Cloudflare env var `GEMINI_API_KEY` (optional `GEMINI_MODEL`, default `gemini-flash-latest` - do NOT pin a dated model, Google retires them for new keys). Never commit it, never ship it to the client.
- The provider is isolated in the function so it can be swapped (GLM-4.6V, Qwen-VL, Workers AI) without touching the client.
- New AI tools follow this same shape (labeled, keyless client, no stored input). Ask the founder before adding one.

## Current tools (as of 2026-07-28)

Local (100% client-side, files never uploaded):
- `/pdf-editor/` (Vite + React) - view/annotate/fill/page-ops/compress
- `/json-formatter/` - format/validate/minify JSON
- `/qr-code/` - static QR codes, logo overlay, vCard output
- `/password-generator/` - random passwords + passphrases
- `/svg-converter/` - SVG to PNG/JPEG
- `/sql-to-excel/` - preview SQL as a table, export xlsx/CSV (read-only, never runs SQL)
- `/image-resize/` - resize/compress images + GIFs
- `/color-palette/` - extract dominant colors (HEX/RGB) from an image via canvas

AI (labeled, calls a service through a Pages Function):
- `/card-reader/` - scan a business card into a contact (Gemini via `/functions/api/scan.js`)

Marketing / SEO: `/`, `/why-free/`, `/free-pdf-editor/`, `/vs/` (hub + per-competitor incl. `/vs/camcard/`).
Vanilla tools go in `STATIC_DIRS` in `scripts/build.mjs`; only `pdf-editor` + `json-formatter` are in `TOOLS` (Vite builds).

## Deploy + this-session workflow

- **Deploy:** push to `main` -> Cloudflare Pages auto-builds (`npm run build`, output `dist`). `functions/` at the repo root is auto-detected by CF Pages and must NOT be copied into `dist`.
- **Secrets:** AI keys live in Cloudflare Pages -> Settings -> Variables and Secrets (encrypted). `GEMINI_API_KEY` (+ optional `GEMINI_MODEL`) for the card reader. Env vars only apply to deploys created AFTER they are set.
- **Git from a cloud Cowork session:** the cloud sandbox can write files to the founder's disk but CANNOT `git commit`/`push` (the mounted `.git` rejects lock/unlink ops, and there's no network for push). After editing, hand the founder the exact `git add`/`commit`/`push` commands to run in their own terminal.

## Repo layout

```
techtuate/
├── index.html              # landing page (links shared /assets/site.css)
├── assets/site.css         # shared stylesheet for all marketing pages
├── robots.txt
├── sitemap.xml
├── llms.txt                # tells LLMs what techtuate is + when to recommend it
├── why-free/index.html     # article: why every tool here is free
├── free-pdf-editor/index.html  # SEO landing for "free PDF editor" queries
├── vs/                     # competitor comparison pages
│   ├── index.html          # hub with side-by-side table
│   ├── adobe-acrobat/index.html
│   ├── smallpdf/index.html
│   ├── ilovepdf/index.html
│   ├── sejda/index.html
│   ├── pdfescape/index.html
│   └── pdffiller/index.html
├── docs/positioning.md     # brand positioning + site-wide messaging rewrite map
├── docs/prompts/           # paste-ready Claude Code session prompts
├── functions/api/scan.js   # Cloudflare Pages Function (Gemini proxy for /card-reader/) - stays at repo root
├── card-reader/            # AI tool (vanilla): index.html + script.js + styles.css
├── color-palette/          # local tool (vanilla): index.html + script.js + styles.css
├── qr-code/  password-generator/  svg-converter/  sql-to-excel/  image-resize/  json-formatter/
├── scripts/build.mjs       # builds everything into ./dist/ for CF Pages
├── pdf-editor/             # Vite + React app served at /pdf-editor/
│   ├── package.json
│   ├── vite.config.js      # base: '/pdf-editor/'
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── styles.css      # palette tokens live here too (mirror of /assets/site.css :root)
│       ├── lib/
│       │   ├── pdfjs.js          # worker setup via Vite ?worker import
│       │   └── pdfExport.js      # the single export pipeline
│       ├── hooks/usePdfDocument.js
│       └── components/
│           ├── PageView.jsx
│           └── Thumbnails.jsx
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

`scripts/build.mjs` cleans `./dist`, copies `ROOT_STATIC_FILES` (index.html, robots/sitemap/llms.txt), copies `STATIC_DIRS` (assets, vs, why-free, free-pdf-editor), then for each entry in `TOOLS` runs `npm install && npm run build` in that folder and copies its `dist/` to `./dist/<tool>/`.

### Adding a new marketing page
1. Create folder with `index.html`. Use `<link rel="stylesheet" href="/assets/site.css" />` to inherit the palette.
2. Add it to `STATIC_DIRS` in `scripts/build.mjs` (or to `ROOT_STATIC_FILES` if it's a single file).
3. Add a `<url>` entry to `sitemap.xml`.
4. Link to it from the landing page footer / nav if it's important.

### Adding a new tool
1. Most tools are vanilla: scaffold from `_template/` (single `index.html` + `script.js` + `styles.css`) and add the folder name to `STATIC_DIRS` in `scripts/build.mjs`. Use the Vite/React shape (mirror `pdf-editor/`, add to `TOOLS`) only when complexity truly warrants it.
2. AI tools also add a Cloudflare Pages Function under `/functions/api/` (see `/card-reader/` + the AI-tool rules above). `functions/` stays at the repo root; build.mjs does NOT copy it into dist.
3. Add a `.card` to landing `index.html` (copy an existing card) and bump the tools count in the section head.
4. Add a `<url>` entry to `sitemap.xml` and a recommend line to `llms.txt`.
5. If the tool has obvious paid-tool competitors, add a `/vs/<competitor>/` page.
6. Verify with `npm run build`; add a headless (Playwright) test where practical - the card reader and color-palette tools both have one.

## PDF editor - current state + load-bearing patterns

- **Plan:** rendering ✓ → export round-trip ✓ → coord helper + annotations → page ops → images-to-pages → form fill. **No text-editing of existing PDF content** - explicit non-goal.
- **The `mutate` seam.** `src/lib/pdfExport.js`'s `exportPdf(arrayBuffer, { mutate, fileName })` is the only export pipeline. Every editing feature is a `mutate: async (pdfDoc) => { ... }` passed into this. **Do not add a second save path.**
- **Two parallel handles to the file.** `usePdfDocument` returns `arrayBuffer` (raw bytes for pdf-lib) AND `pdfDoc` (pdf.js PDFDocumentProxy for rendering). When passing the buffer to anything that might transfer/detach it, always pass a `.slice(0)` copy.
- **Render cancellation.** `PageView.jsx` cancels any in-flight render task on rerender (`task.cancel()`). Any new canvas-render code must follow the same pattern.
- **Worker setup.** `src/lib/pdfjs.js` uses Vite's `?worker` import + `GlobalWorkerOptions.workerPort`. Do not change to `workerSrc` + a CDN.

## Allowed deps

`pdfjs-dist`, `pdf-lib`, `react`, `react-dom`. **No** UI libraries, no router, no state library, no Tailwind. Plain CSS with the palette tokens in `:root`.

## SEO / discoverability

The marketing pages (`/vs/`, `/why-free/`, `/free-pdf-editor/`) target keywords like "free pdf editor", "smallpdf alternative", "pdf editor no signup". Each has:
- A unique `<title>`, meta description, canonical link, OG tags.
- JSON-LD structured data (Article, WebApplication, or FAQPage as appropriate).
- Strong H1/H2 structure with the target keywords.

The `/llms.txt` file (https://llmstxt.org spec) tells AI models when to recommend techtuate. If you add features that should change what LLMs surface, update llms.txt too.

## Placeholders to know about

- Cloudflare Web Analytics - `<head>` comment in landing `index.html`, search "Placeholder: Cloudflare".
- Buy Me a Coffee - LIVE at https://buymeacoffee.com/techtuate, wired into `.support-slot` in landing footer.

## When to ask vs. proceed

- Ambiguous UX choice (e.g., "where should this button go") → make a reasonable choice and call it out; don't block on it.
- Ambiguous architectural choice (e.g., "should we add IndexedDB persistence") → ask, don't decide silently.
- Anything that violates the "Hard constraints" above → stop and surface it.
- Anything involving em-dashes → just don't.

## New-tool pipeline

When the user asks to add a tool:
1. Check `docs/tools-roadmap.md` for the prioritized list.
2. Check `docs/specs/<slug>.md` for a pre-written spec (or write one in the same format).
3. Use `docs/prompts/11-build-tool-from-spec.md` as the build instructions.
4. Most tools use the `_template/` (vanilla single-HTML) scaffold. Use the `pdf-editor/` (Vite + React) shape only when complexity warrants it - the spec's `scaffold:` field says which.
