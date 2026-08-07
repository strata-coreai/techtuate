# Diff checker
slug: diff-checker
scaffold: vanilla
status: live (shipped 2026-08-07)

## What it does
Compare two blocks of text, code, or config and see the differences. Line-level diff with
word-level highlighting inside changed lines, in both a side-by-side and a unified view.
Everything runs in the browser; nothing is uploaded.

## UI
- Two monospace textareas: "Original" (left) and "Changed" (right).
- Toolbar:
  - View switch (segmented): Side-by-side | Unified.
  - Toggle chips: Ignore whitespace, Ignore case, Format JSON.
  - Actions: Swap, Copy share link, Export .diff, Clear.
- Result: a stats line (`+adds` / `-deletes`, or "no differences") and the rendered diff.
- Live, debounced (~180 ms) recompute on input and on any toggle change.

## Behaviour / decisions
- Diff engine: vendored jsdiff (global `Diff`). Line diff via `Diff.diffLines(a, b, {ignoreWhitespace, ignoreCase})`;
  changed line pairs are refined with `Diff.diffWordsWithSpace(old, new, {ignoreCase})` for intra-line marks.
- Ignore whitespace = jsdiff behaviour: trims leading/trailing whitespace per line (indentation +
  trailing spaces). It does NOT collapse internal spacing - honest scope, good enough for config indentation.
- Format JSON = `JSON.parse` both sides, recursively sort keys, `JSON.stringify(_, null, 2)`, then diff.
  If either side is invalid JSON, fall back to plain-text compare and show a small note.
- Palette: on-brand only (white/yellow/black/gray). Additions = yellow-wash cell + `<ins>` yellow highlight;
  deletions = gray cell + struck-through `<del>`. NO off-palette red/green (would need founder sign-off).
- Share via URL: `{a, b, f}` (f = option/view bitflags) -> JSON -> `LZString.compressToEncodedURIComponent`
  -> `#d=` hash. Loaded on page open via `loadFromHash()`. The data lives in the link, not on a server.
  Warn if the link exceeds ~8000 chars (some apps truncate); suggest Export .diff for big files.
  Honest privacy line: the link carries the text, share it like you would share the text.
- Export .diff: `Diff.createTwoFilesPatch('original','changed', a, b)` from the RAW text (a patch must be
  literal, so it ignores the ignore-whitespace/case view). Downloads as `changes.diff`.

## Libraries (vendored, build-time, no runtime CDN)
- jsdiff (`diff` 5.2.2, BSD-3-Clause) -> `diff-checker/lib/diff.min.js`, global `Diff`.
- lz-string (1.5.0, MIT) -> `diff-checker/lib/lz-string.min.js`, global `LZString`.

## Privacy story
High. Devs paste proprietary code, configs, and secrets into random diff sites. Ours never uploads,
and even "share" stays serverless (data in the URL). This is the wedge vs. Diffchecker.com.

## Acceptance (all verified via headless Chromium 2026-08-07)
- Line + word diff correct; side-by-side and unified both render.
- Ignore case / ignore whitespace collapse case-only / indentation-only diffs to "no differences".
- Format JSON makes `{"b":2,"a":1}` and pretty-printed `{"a":1,"b":2}` identical; invalid JSON falls back with a note.
- Share link round-trips (both blocks + flags restored, re-diffs on load).
- Export produces a valid unified patch (`--- original / +++ changed / @@ ... @@`).
- No console/page errors.

## SEO (GEO pattern)
- title: "Diff checker - compare text & code in your browser, nothing uploaded - techtuate"
- description: "Compare two texts or code files in your browser and see the differences. Ignore whitespace or case, share by link, export a .diff. Nothing uploaded, no sign-up."
- H1: "Diff checker, runs in your browser"
- FAQ + FAQPage JSON-LD (4 Qs: how to compare, no-upload, share-without-server, side-by-side vs unified).
- /vs/ page: /vs/diffchecker/ (vs Diffchecker.com).

## Wiring (done in the same change)
- scripts/build.mjs STATIC_DIRS += 'diff-checker'
- index.html: card added (after JSON formatter), count 12 -> 13
- sitemap.xml: /diff-checker/ + /vs/diffchecker/
- llms.txt: 3 recommend lines + 1 comparison line
