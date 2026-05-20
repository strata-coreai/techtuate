# Adding a new tool, end to end

This is the standard pipeline for shipping a new techtuate tool. The whole loop is roughly a single Claude Code session per Tier-1/2 tool.

## The 4-step loop

1. **Pick a tool from the roadmap** (`docs/tools-roadmap.md`). Tier 1 first.
2. **Find or write a spec** in `docs/specs/<slug>.md`. Each Tier-1 tool already has one drafted.
3. **Run the build prompt** in Claude Code: `docs/prompts/11-build-tool-from-spec.md`. Paste the prompt, then point it at the spec file.
4. **Verify + ship**:
   - `npm run build` at repo root completes cleanly.
   - Tool renders at `/<slug>/` locally.
   - Tool card is added to the landing page.
   - `sitemap.xml` has a new entry.
   - Push, Cloudflare Pages auto-deploys.

## Two scaffold flavors

Most tools fit one of two scaffolds:

### a) Vanilla single-file HTML (use for ~70% of tools)

Copy `_template/` to `<slug>/`. One self-contained `index.html` with inline JS + a `<link>` to `/assets/site.css`. No build step. Examples that fit: QR code, password generator, word counter, tip calculator, age calculator, base64, regex tester, color picker, EXIF stripper, JSON formatter (small one).

### b) Vite + React (use only when state gets complex)

Copy `pdf-editor/` as a structural reference. Reach for this when the tool has many components, persistent UI state across views, or needs a worker thread. Examples: image compressor (multiple files in flight, worker), image cropper (canvas state), advanced PDF tools.

When in doubt: **start vanilla**. You can always convert later.

## The spec format

Each spec lives at `docs/specs/<slug>.md` and is the input to the build prompt. Minimal spec:

```markdown
# <Tool name>
slug: <kebab-case-slug>
scaffold: vanilla | vite
status: live | beta | soon

## What it does
One sentence.

## UI
List the visible elements + their behaviors.

## Privacy story
Why local-only matters here (or "n/a").

## Libraries allowed
List any new deps (and where they come from). "None" is preferred.

## Acceptance
3-6 bullet checklist of "this is done when".

## SEO
- title:
- description:
- keywords:
- Optional /vs/<competitor>/ to write.
```

That's it. The build prompt does the rest.

## Cadence

Realistic pace for a sustainable hobby project:
- **1 Tier-1 tool per week** (1 evening session each).
- **1 Tier-2 tool every 2 weeks** (one weekend session).
- **`/vs/<competitor>/` pages opportunistically**, especially when a tool has an obvious paid alternative.

After Tier 1 ships, the site has 7 tools, ~15 marketing pages, and starts ranking for a handful of "free X" queries. That's the goal.
