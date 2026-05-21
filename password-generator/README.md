# _template

Reference scaffold for vanilla (single-HTML) tools. Copy this whole folder to `<slug>/` and rename the placeholders.

## Placeholders to find-and-replace
- `__TOOL_NAME__` - human-readable name (e.g., "QR code generator")
- `__TOOL_SLUG__` - URL slug (e.g., "qr-code")
- `__TOOL_TAGLINE__` - one-line description for the hero / meta
- `__TOOL_DESCRIPTION__` - longer description for the meta + JSON-LD
- `__TOOL_KEYWORDS__` - comma-separated SEO keywords

After copying:
1. Implement the actual tool logic in the `<main>` section and `<script>` block.
2. Add the slug to `STATIC_DIRS` in `scripts/build.mjs`.
3. Add a card to the root `index.html` tool grid.
4. Add a `<url>` to `sitemap.xml`.
5. Build to check: `npm run build` at repo root.
