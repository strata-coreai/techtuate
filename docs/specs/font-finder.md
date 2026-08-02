# Font finder (identify fonts from a screenshot)
slug: font-finder
scaffold: vanilla (AI tool)
status: beta

## What it does
Paste or upload a screenshot. The tool sends it once to a vision AI (Google Gemini, via a Cloudflare Pages Function) and returns the distinct typefaces it sees, grouped by role (heading, body, UI, etc), with: a best-guess name, a family classification, whether it looks custom/proprietary, and 1-3 free equivalents (prefer Google Fonts) so you can recreate the look. Second AI tool on the site; follows the /card-reader/ pattern exactly.

## Honesty framing (important, do not oversell)
- It is a "font family + closest free equivalent" finder, NOT a forensic exact-match engine. Even dedicated services (WhatTheFont, WhatFontIs) with proprietary fingerprint databases are only so-so at exact IDs.
- The UI must say so plainly, and show a confidence per font. When unsure of an exact name, lead with the family and the free equivalents rather than a confident wrong name.

## UI
- Drop zone (drag / click / paste), mirroring /color-palette/. A one-line "how to paste" hint at the top of the panel (Ctrl/Cmd + V).
- Preview of the pasted screenshot + a "Find fonts" button.
- Visible `*` disclosure by the action button (third-party AI service; screenshot not stored; no account).
- Results: one card per detected font showing role, the sample text seen, best-guess name, family, a "likely custom" flag, confidence, and the free alternatives. Each Google Fonts alternative is rendered live in that font so the user sees the match.
- Live previews load font CSS from Google Fonts at runtime -> disclose this (third-party fetch), same way Trustpilot/StartupBar are disclosed.

## Backend (Cloudflare Pages Function: /functions/api/font.js)
- POST { image: dataURL } -> { ok, data: { fonts: [...], notes } }. Key server-side (reuse GEMINI_API_KEY, optional GEMINI_MODEL, default gemini-flash-latest). Image forwarded once, not stored/logged. Mirror /functions/api/scan.js: MAX_BYTES ~6MB base64, temperature 0, responseSchema-constrained JSON, 429/5xx handling.
- Client downscales the screenshot before upload (longest edge ~1600px, JPEG) so text stays legible but payload stays small.

## Response schema (per font)
role, sampleText, identifiedName (may be ""), family, isLikelyCustom (bool), confidence (0..1), freeAlternatives: [{ name, source, note }]. Plus top-level notes.

## Privacy story
This is an AI tool: the screenshot leaves the device once, to a named, labeled service, and is not stored. Everything else (rendering results, previews) stays in the browser. Scope any "stays on your device" language away from this tool, like the card reader.

## Acceptance
- Paste a screenshot with a heading + body in different fonts -> two cards, each with a plausible family and at least one Google Fonts equivalent that renders live.
- A custom/branded wordmark is flagged isLikelyCustom with equivalents rather than a fake exact name.
- Function rejects non-images and oversized payloads cleanly; 429 surfaces a friendly "quota used up" message.
- No account, nothing stored. Works on mobile down to ~360px.

## SEO
- title: "Font finder - identify fonts from a screenshot, free - techtuate"
- description: "Paste a screenshot and find the fonts. Get the family and free Google Fonts equivalents for any type you see. Free, no sign-up."
- keywords: "identify font from image, what font is this, font finder from screenshot, find fonts in image, font identifier free, closest google font"
- Competitor page to consider later: /vs/whatthefont/ or /vs/whatfontis/.

## Wiring
STATIC_DIRS in scripts/build.mjs; landing card (bump count); sitemap.xml url; llms.txt recommend lines; functions/ stays at repo root (not copied to dist).
