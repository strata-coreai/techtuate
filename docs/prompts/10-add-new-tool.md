Add a new tool to techtuate, served at `/<tool-name>/`. Replace `<tool-name>` with the actual slug (e.g., `image-resizer`) before pasting.

## Steps

1. Decide the slug (folder name + URL path). Lowercase, kebab-case.
2. Scaffold `./<tool-name>/`. Choose one:
   - **Vite app** (interactive): mirror the `pdf-editor/` structure — `package.json`, `vite.config.js` (with `base: '/<tool-name>/'`), `index.html`, `src/`. Copy the palette tokens from `pdf-editor/src/styles.css`'s `:root` block.
   - **Static** (no JS or trivial JS): just an `index.html` with inline CSS/JS, palette tokens at top.
3. Add `'<tool-name>'` to the `TOOLS` array in `scripts/build.mjs`.
4. Add a tool card to the root `index.html`:
   - Copy the existing pdf-editor card (search for `<!-- ============ PDF Editor ============ -->`).
   - Swap title, description, href (`/<tool-name>/`), status badge class (`.live` / `.beta` / `.soon`), and the SVG icon.
5. Update the tool table in `README.md`.
6. Run `npm run build` at the repo root — confirm both the landing page and the new tool build into `./dist/<tool-name>/`.

## Constraints

- Same architecture: 100% client-side, no backend, no API keys, no third-party fetches at runtime.
- Same palette (white / `#ffd60a` / black). Same neo-brutalist treatment (2px black borders, offset shadows, Inter Tight display).
- Mobile-friendly to ~360px wide.
- Heavy deps only when genuinely required for the tool's core function.

## Acceptance

- `npm run build` produces `./dist/<tool-name>/` with a working `index.html`.
- The landing page's new card links to it.
- Both pages render correctly when served from `./dist/` via a static server (`npx serve dist`).
