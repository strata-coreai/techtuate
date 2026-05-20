Build a new techtuate tool from a spec file. The spec is in `docs/specs/<slug>.md`; tell me which one to use before starting if it's ambiguous from the conversation.

## What this prompt does

1. Reads the spec file.
2. Scaffolds the tool folder from `_template/` (vanilla) or `pdf-editor/` (vite-react), based on the spec's `scaffold:` field.
3. Implements the tool per the spec.
4. Wires it into the build: adds slug to `STATIC_DIRS` (or `TOOLS`) in `scripts/build.mjs`, adds a card to root `index.html`, adds a `<url>` to `sitemap.xml`.
5. Runs `npm run build` at the repo root and confirms it's clean.

## Constraints (non-negotiable)

- **No backend, no APIs.** 100% client-side. If the spec implies a server, stop and surface it.
- **No new third-party fetches at runtime.** Build-time deps (npm packages) are fine; runtime CDN script tags are not.
- **Palette + voice match the rest of the site.** Use `/assets/site.css`. Mirror `:root` tokens if you must add anything.
- **Mobile-friendly to ~360 px.**
- **Never use em-dashes (—) or en-dashes (–).** Use plain hyphens (-). This is a forever rule.
- **No UI library, no router, no state library.** Plain CSS + React-only (if vite scaffold).
- **`<noscript>` fallback** for SEO crawlers.
- **`<title>`, meta description, canonical, OG, JSON-LD (WebApplication).** All required.

## Vanilla scaffold steps

When `scaffold: vanilla`:
1. `cp -r _template <slug>`
2. In `<slug>/index.html`, find-and-replace:
   - `__TOOL_NAME__` -> spec name
   - `__TOOL_SLUG__` -> spec slug
   - `__TOOL_TAGLINE__` -> spec tagline (one short line)
   - `__TOOL_DESCRIPTION__` -> spec description (meta-length, ~150 chars)
   - `__TOOL_KEYWORDS__` -> comma-separated keywords from spec
3. Replace the `<!-- TOOL UI GOES HERE -->` block with the actual UI.
4. Replace the `// TOOL LOGIC` block with the actual JS.
5. Delete `<slug>/README.md` (or replace with tool-specific notes).

## Vite scaffold steps

When `scaffold: vite`:
1. `cp -r pdf-editor <slug>` (then strip the PDF-specific src files).
2. Set `base: '/<slug>/'` in `vite.config.js`.
3. Update `package.json` name and description.
4. Rebuild `src/App.jsx`, `src/styles.css` for the tool.
5. Keep the palette tokens at the top of `styles.css` identical to `/assets/site.css`'s `:root`.

## After implementing

- Add `'<slug>'` to either `STATIC_DIRS` (vanilla) or `TOOLS` (vite) in `scripts/build.mjs`.
- Add a tool card to root `index.html` - copy the existing PDF-editor card, swap icon/title/desc/href/status.
- Add a `<url><loc>https://techtuate.com/<slug>/</loc></url>` entry to `sitemap.xml`.
- If the spec lists a competitor (in the `SEO` section), also write `vs/<competitor>/index.html` modeled on the existing comparison pages.
- Run `npm run build` at repo root. Confirm: no errors, `dist/<slug>/` exists, file sizes are sane (vanilla tools usually <10 KB).

## When to ask vs. proceed

- Ambiguous UX (e.g., "should there be a Copy button vs. auto-copy") -> pick the obvious choice and call it out.
- Ambiguous architecture (e.g., "should we persist settings in localStorage") -> ask before deciding.
- Anything that breaks the constraints above -> stop and surface it.

## Report back

When done, tell me:
- Path to the new tool folder.
- Approximate KB shipped (gzipped).
- Any open follow-ups or TODOs left in the code.
