# QR code generator
slug: qr-code
scaffold: vanilla
status: live

## What it does
Type or paste anything (URL, text, vCard, wifi credentials), get a downloadable QR code. No tracking, no rerouting.

## UI
- Textarea, large, autofocused, placeholder "https://... or any text".
- Live-update preview canvas (SVG) below the input as the user types. Debounce ~150 ms.
- Size slider (small / medium / large -> 256 / 512 / 1024 px).
- Error correction radio (Low / Medium / Quartile / High). Default Medium.
- Foreground + background color pickers. Default black on white. Lock to high-contrast pairs (warn if contrast too low - QR readers need contrast).
- "Download PNG" + "Download SVG" buttons.
- A tiny info line: "Most QR generators redirect through their server so they can re-target your link. This one doesn't. Your QR code goes straight from your laptop to your downloads folder."

## Privacy story
Most "free QR generators" use dynamic QR codes that point at the generator's domain so they can track scans (and serve ads, change destinations, paywall analytics). techtuate's is purely static: the QR code encodes exactly what you typed. Differentiation = "no redirect, no tracking, no link rot."

## Libraries allowed
- `qrcode` (npm) bundled at build time, OR loaded as a single `<script>` from a pinned-hash CDN at build time and inlined. Vanilla scaffold, so just write a small wrapper around it.
- Pure-JS implementation is also fine (under 10 KB) - choose smallest.

## Acceptance
- Typing a URL produces a scannable QR within ~150 ms.
- Downloaded PNG scans correctly with iPhone Camera and Google Lens.
- Switching error-correction level visibly changes density.
- Switching size scales the export, not the on-screen preview only.
- Bundle <50 KB gzipped.

## SEO
- title: "Free QR code generator - no tracking, no redirect, no sign-up - techtuate"
- description: "Generate a static QR code in your browser. No tracking redirect, no account, no watermark. Downloads as PNG or SVG."
- keywords: "free qr code generator, qr code no tracking, qr code no signup, static qr code, qr code generator no redirect"
- Competitor page to write: `/vs/qr-tiger/` (QRTiger uses dynamic redirects).
