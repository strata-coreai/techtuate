Add a new tool to techtuate, served at `/<tool-name>/`. Replace `<tool-name>` with the actual slug (e.g., `image-resizer`) before pasting.

## Steps

1. Decide the slug (folder name + URL path). Lowercase, kebab-case.
2. Scaffold `./<tool-name>/`. Choose one:
   - **Vite app** (interactive): mirror the `pdf-editor/` structure - `package.json`, `vite.config.js` (with `base: '/<tool-name>/'`), `index.html`, `src/`. Copy the Flow tokens and `@font-face` rules from `pdf-editor/src/styles.css`.
   - **Static** (most tools): copy `_template/`, which already has the Flow page shell and loads `/assets/flow.css` + `/assets/flow-pages.css` + `/assets/backdrop.js`.
3. Add `'<tool-name>'` to the `TOOLS` array in `scripts/build.mjs`.
4. Add a tool card to the root `index.html`: copy an existing `<a class="tool">` in the grid and set href, name, one-line description, `data-kw` (search synonyms), `data-short`, `data-groups`, `data-ai="1"` for AI tools, the `--h1/--h2` hue pair and a new 24px line icon (see section 5-6 of `docs/design-system.md`). Add it to the ItemList JSON-LD too.
5. Update the tool table in `README.md`.
6. Run `npm run build` at the repo root - confirm both the landing page and the new tool build into `./dist/<tool-name>/`.

## Constraints

- Local-first by default: core tools are 100% client-side (no backend, no API keys, no runtime third-party fetches). AI tools may use a labeled Cloudflare Pages Function proxy - see CLAUDE.md before adding one.
- Same design system on every page: the dark "Flow" look in `docs/design-system.md` (glass panels, one yellow accent, Bricolage / Instrument Serif / Geist, pill controls, line icons). No hard black borders or offset shadows.
- Mobile-friendly to ~360px wide.
- Heavy deps only when genuinely required for the tool's core function.

## Acceptance

- `npm run build` produces `./dist/<tool-name>/` with a working `index.html`.
- The landing page's new card links to it.
- Both pages render correctly when served from `./dist/` via a static server (`npx serve dist`).
