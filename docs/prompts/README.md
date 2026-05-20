# Claude Code session prompts

Paste these into Claude Code (`claude` in the terminal) at the repo root, or just reference them by path.

Order roughly matches the PDF editor build sequence + the new-tool pipeline. Each prompt is self-contained and assumes `CLAUDE.md` (auto-loaded by Claude Code) has the project context.

## PDF editor

| # | Prompt | What it does |
|---|---|---|
| 01 | `01-coord-helper-and-annotations.md` | Coord helper + annotation layer (highlight, text, freedraw, rect) |
| 02 | `02-page-operations.md`              | Drag-reorder, rotate, delete, duplicate, merge in, split out |
| 03 | `03-images-to-pages.md`              | Drop PNG/JPEG -> embed as PDF pages |
| 04 | `04-form-filling.md`                 | Detect & fill AcroForm fields |

## New-tool pipeline

| # | Prompt | What it does |
|---|---|---|
| 10 | `10-add-new-tool.md`                | Generic "scaffold a new tool" (manual) |
| 11 | `11-build-tool-from-spec.md`        | **Recommended.** Reads `docs/specs/<slug>.md` and builds the tool end-to-end |
| 20 | `20-pre-ship-check.md`              | Sanity sweep before deploying to CF Pages |

## How to use

```
cd C:\Users\joshi\techtuate
claude
```

Then paste a prompt, or for the build-from-spec flow:

```
> Use docs/prompts/11-build-tool-from-spec.md with docs/specs/qr-code.md.
```

Claude Code reads both files itself - no copy/paste needed.

## Where the specs live

- `docs/tools-roadmap.md` - prioritized list of which tools to build
- `docs/tools-pipeline.md` - the end-to-end loop (spec -> scaffold -> ship)
- `docs/specs/*.md` - one spec per tool (6 ready to ship: QR, password, word counter, image compressor, image-to-PDF, JSON formatter)
- `_template/` - vanilla single-HTML scaffold used by prompt #11
