# JSON formatter / validator
slug: json-formatter
scaffold: vanilla
status: beta

## What it does
Paste JSON, get pretty-printed and color-coded JSON. Validation errors with line numbers. Collapsible tree view. Copy / download.

## UI
- Split view: left pane = raw input textarea, right pane = formatted output. Stack vertically on narrow screens.
- Indent selector (2 / 4 / tab).
- "Format" button (or auto-format on paste).
- "Minify" toggle.
- Validation status badge (green "valid" / red error with line + col).
- Tree view: collapsible object/array nodes with key counts.
- "Copy" + "Download .json" + "Sort keys" buttons.

## Privacy story
High. Devs paste sensitive JSON (tokens, customer data, API responses) into random formatters constantly. Local-only is the right answer. Lean into it in the copy.

## Libraries allowed
- None for parse/format (use `JSON.parse` + `JSON.stringify(obj, null, indent)`).
- For tree view + syntax highlighting: write a small recursive renderer (~150 lines). Avoid CodeMirror / Monaco - too heavy.

## Acceptance
- Paste 1 MB JSON, format completes in <100 ms.
- Errors point to the right line + column.
- Tree view collapse/expand works at any depth.
- "Sort keys" produces deterministic output.
- Bundle <30 KB gzipped.

## SEO
- title: "Free JSON formatter, validator, viewer - in your browser - techtuate"
- description: "Format, validate, and explore JSON locally. Nothing sent online. Tree view, sort keys, copy or download."
- keywords: "free json formatter, json validator, json viewer, json beautifier, online json formatter no upload, private json formatter"
- Competitor page to write: `/vs/jsonlint/` and `/vs/jsonformatter-org/`.
