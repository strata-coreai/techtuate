# Name card / business card generator
feature-of: standalone tool at /name-card/
scaffold: _template/ (vanilla single-HTML) initially; reconsider Vite if template editor gets complex
status: planned (Tier 2)

## What it does
Generate a printable business card (or digital share card) with templates, custom QR code, and editable text fields. Download as PDF (print-ready) or PNG (for sharing online). Runs entirely in the browser.

The angle: the QR code on the card encodes a vCard (digital contact card) OR a URL the user chose. When someone scans the QR, their phone offers to save the contact or open the link. No app required.

## Why this matters
"Business card maker" gets ~150K/mo US searches. Canva dominates the space and gates the good templates behind their paid tier. The free competitors (e.g., MOO's online editor, Vistaprint preview) all funnel toward print-order paywalls. A truly free, no-signup, download-as-PDF tool is rare.

Plus, it's a natural funnel from the QR code generator: the "made with techtuate" banner on free QR codes directs users to this tool when they realize they want a polished surface to put the QR on.

## UI

Three panels (responsive: stack vertically on mobile):

**Left: Templates panel**
- 6-10 templates spanning styles: minimalist black-on-white, neo-brutalist yellow accent, classic letterpress feel, modern color block, monospace dev card, etc.
- Click to apply. Selected template highlighted.

**Center: Live preview**
- Standard US business card aspect ratio (3.5" x 2") with bleed lines visible (3.625" x 2.125" with 0.125" bleed).
- Front side by default; toggle to show back side.
- Selected template renders with the user's content.

**Right: Edit panel**
- Text fields per template (name, title, company, email, phone, website, social handle).
- QR code section:
  - "What does this QR link to?" - radio: vCard (contact card, builds from the entered fields) / URL (custom) / None.
  - Color picker for QR foreground.
  - Logo upload (uses the same image-overlay pattern from /qr-code/).
- Color theme: 3-4 preset accent colors per template + "custom" with foreground/background picker.

**Bottom: Download bar**
- Download PDF (print-ready, CMYK if practical, with crop marks)
- Download PNG (300 DPI, transparent or white bg)
- Optional: "share as image" copies the PNG to clipboard.

## How it works

- Use HTML+CSS for the preview rendering (each template is a styled `<div class="card">`). This is the lowest-friction path to good typography and consistent rendering.
- Convert preview to PNG via `html2canvas` (local copy, no CDN) at 300 DPI.
- Build the PDF via the same jsPDF instance used by /qr-code/ (assuming /qr-code/ shipped first and brought jsPDF in - reuse).
- QR generation: shared module with /qr-code/ if possible. Same logo overlay logic.

## Constraints

- 100% client-side, no upload, no signup.
- No new heavy deps. Use jsPDF (already in if /qr-code/ shipped first) + html2canvas (smaller than alternatives).
- Templates must look hand-designed, not auto-generated. 6 great templates > 30 mediocre ones.
- Em-dashes banned. Hyphens only.
- Mobile-friendly down to 360px. The editor collapses to vertically stacked panels.
- Print-readiness: PDF must include 0.125" bleed and crop marks. CMYK conversion is a nice-to-have, not required (most home printing is RGB anyway).

## SEO

- Title: "Free business card maker - design and download in your browser - techtuate"
- Description: "Design business cards with templates, custom QR codes (vCard or link), and your colors. Download as print-ready PDF. Free, no signup."
- Keywords: "free business card maker, business card generator, vcard qr code business card, custom business card pdf, business card no signup"
- /vs/canva-business-cards/ comparison page (Canva charges $14.99/mo for premium templates + print upsell)
- /vs/vistaprint/ (Vistaprint funnels everything to paid print)

## Acceptance

- 6+ working templates that look distinct.
- vCard QR scans on iPhone and Android and offers to save the contact with all fields populated.
- PDF download opens cleanly in Preview, Acrobat, and the macOS Print dialog. Crop marks visible.
- PNG download at 300 DPI is sharp enough to print at 3.5" x 2".
- Logo upload and color customization both work.
- Bundle delta < 100 KB gzip.
- Mobile-friendly down to 360px.

## Out of scope

- Print ordering (this is where the competitors paywall - we don't go here)
- AI logo generation
- Multi-page card decks
- Foil / spot UV / fancy print effects (PDF can't represent these meaningfully)

## Strategic note: funnel from QR generator

The /qr-code/ tool will display a "made with techtuate" banner on generated QR codes (banner toggleable). When a user customizes their QR (logo, colors), the natural next thought is "where do I put this?". The QR generator's UI should include a small CTA: "Putting this on a business card? Make one free at /name-card/." This is the link in the loop.

## Implementation notes for Claude Code

- Best built standalone at /name-card/ using the _template/ scaffold (single index.html + script.js + styles.css).
- Reuse the QR generation logic from /qr-code/ - copy the relevant functions into a shared `/assets/qr.js` so both tools can import.
- The QR generator gets refactored to use the same shared module; treat this as a follow-up after /qr-code/ branding ships.
