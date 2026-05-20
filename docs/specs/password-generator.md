# Password generator
slug: password-generator
scaffold: vanilla
status: live

## What it does
Generate strong random passwords or passphrases locally. Nothing sent anywhere, nothing logged.

## UI
- Big read-only output field with the current password, large monospace, click-to-copy.
- "Regenerate" button (or Space-bar shortcut).
- Toggle: Password (random chars) vs. Passphrase (XKCD-style word list).
- Sliders/inputs: length (8-64), or word count (3-8) for passphrase.
- Character-class checkboxes (lowercase, uppercase, digits, symbols). For passphrase: separator (- / _ / .).
- Strength estimator (entropy in bits + a horizontal bar). Use zxcvbn-style heuristics if possible without the full library; else a simple entropy = log2(charset) * length calc.
- A reassurance line: "This password never leaves your browser. We don't log, store, or transmit it. View source if you want to verify."

## Privacy story
Critical. People are (rightly) suspicious of online password generators. The architecture is the entire pitch - 100% local, verifiable via DevTools Network tab.

## Libraries allowed
- None for char-random (use `crypto.getRandomValues`).
- For passphrase: include a 2048-word EFF dice-ware list inline (~40 KB). No external fetch.

## Acceptance
- Click "regenerate" - new password appears instantly.
- Click the password - copies to clipboard, flash confirmation.
- Passphrase mode produces e.g. `correct-horse-battery-staple`.
- Entropy bar reflects checkbox/length changes.
- Bundle <100 KB total (word list dominates).

## SEO
- title: "Free password generator - 100% local, nothing sent online - techtuate"
- description: "Generate strong random passwords or memorable passphrases in your browser. Cryptographically random, never transmitted, no sign-up."
- keywords: "free password generator, secure password generator, local password generator, passphrase generator, offline password generator"
