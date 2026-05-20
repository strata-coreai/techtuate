# Claude Code session prompts

Paste these into Claude Code (`claude` in the terminal) at the repo root.

Order roughly matches the PDF editor build sequence. Each prompt is self-contained and assumes `CLAUDE.md` (auto-loaded by Claude Code) has the project context.

| # | Prompt | What it does |
|---|---|---|
| 01 | `01-coord-helper-and-annotations.md` | Build the coord helper + annotation layer (highlight, text, freedraw, rect) |
| 02 | `02-page-operations.md`              | Drag-reorder, rotate, delete, duplicate, merge in, split out |
| 03 | `03-images-to-pages.md`              | Drop PNG/JPEG → embed as PDF pages |
| 04 | `04-form-filling.md`                 | Detect & fill AcroForm fields |
| 10 | `10-add-new-tool.md`                 | Generic "scaffold a new tool" prompt |
| 20 | `20-pre-ship-check.md`               | Sanity checks before deploying to CF Pages |

## How to use

1. `cd C:\Users\joshi\techtuate`
2. `claude` (starts Claude Code in this folder)
3. Paste a prompt. Add any per-session context at the top (e.g., "skip the rect tool for now").
4. Review the diff before accepting.
