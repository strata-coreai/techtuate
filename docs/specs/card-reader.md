# Business card reader (scan a card -> contact)
feature-of: standalone tool at /card-reader/
scaffold: _template/ (vanilla single-HTML) for the UI, PLUS one Cloudflare Pages Function at /functions/api/scan.js for the OCR proxy
status: planned (Tier 2)

## What it does
Point it at a business card (upload a photo, snap one with the phone camera, or paste from the clipboard), and it reads the card, pulls out the contact fields (name, job title, company, email, phone, website, address), lets the user fix anything in an editable review form, and saves it. Saved cards land in a local in-browser phonebook you can export as a vCard (.vcf) to drop straight into your phone/Outlook/Google Contacts, or as a CSV for a spreadsheet/CRM.

The inverse of /name-card/ (which designs a card). This one ingests a card someone handed you and turns it into a contact, no typing.

Two-sided cards are supported: scan front and back, the two images are read together and merged into one contact (back sides often carry the address, alternate phone, or a second language).

## The engine decision (read this - it deviates from a hard constraint)
Client-only OCR (Tesseract WASM) was the first plan, but the founder chose accuracy over strict on-device processing for this one tool. So:

- OCR/extraction is done by **Google Gemini Flash** (via a free Google AI Studio API key, no credit card).
- The image is sent to Gemini through a **Cloudflare Pages Function** (`/functions/api/scan.js`) that runs server-side on our own domain. The API key lives as an encrypted Cloudflare env var, never in client JS.
- Gemini returns structured JSON directly (name/title/company/emails/phones/website/address), so there is no separate "OCR then parse with regex" step - the model does both, and handles logos, layout, and multiple languages far better than Tesseract.

This breaks two hard constraints for this tool only: "no functions/edge workers" and "no data leaves the device." That is a deliberate, founder-approved exception. It MUST be labeled on the tool (see UI) and recorded as an exception in CLAUDE.md. The rest of the site keeps its "nothing is uploaded" promise; this tool wears an explicit asterisk instead.

Why Gemini via AI Studio: best genuinely-free vision tier with no credit card (~1,500 requests/day on Flash at time of writing), strong at document/structured extraction. The proxy is written model-agnostic (base URL + model + key as function config) so swapping to GLM-4.6V, Qwen-VL, or Cloudflare Workers AI later is a small change in one file.

## Why this matters
"Business card scanner" and "business card reader app" pull steady search volume, and every well-known option (CamCard, ABBYY Business Card Reader, Google Lens contact save) either needs an app install, an account, or uploads your contacts to their cloud with no way to opt out. Our angle is different-but-honest: no app, no signup, runs in the browser, and it is transparent about the single third-party call it makes (image is sent for scanning only, nothing stored server-side, no account, no resale). Pairs naturally with /name-card/ - make cards on one tool, read cards on the other.

## UI

Single-column, mobile-first (this is a phone-at-an-event tool first, desktop second). Stages flow top to bottom:

**1. Capture panel**
- Big drop zone: "Drop a card photo, or..." with three actions: Upload, Use camera, Paste.
- Use camera opens the rear camera via getUserMedia (environment facing), with a capture button and a framing guide sized to a 3.5x2 card. Falls back to the file picker's `capture` attribute if getUserMedia is unavailable.
- Optional "Add back side" toggle -> lets the user attach a second image before scanning.
- Thumbnails of the attached image(s) with a remove (x).

**2. Scan action**
- "Read card" button. Shows a progress state while the request is in flight.
- Small print under it: the third-party disclosure (see Constraints -> Labeling).

**3. Review form (the quality step - never auto-save)**
- Editable fields, pre-filled from the model's JSON: Full name, Job title, Company, Email(s), Phone(s) (with type: mobile/work/other), Website, Address, Notes.
- Multiple emails/phones supported (add/remove rows).
- Low-confidence fields (model unsure, or empty) are visually flagged so the user knows what to check.
- "Save to phonebook" adds it to the local list. "Download .vcf" exports just this card.

**4. Phonebook panel**
- List of saved contacts this browser has stored (IndexedDB), newest first. Each row: name, company, quick edit, delete.
- Bulk bar: select all / selected -> "Export vCard (.vcf)" (single file, multiple contacts), "Export CSV", "Clear phonebook".
- Per-contact: "Copy details" (plain text to clipboard).
- Empty state explains the phonebook lives only in this browser, nothing is on a server.

## How it works

- **Capture:** File input + getUserMedia + `paste` event -> a canvas -> a downscaled JPEG (cap the longest edge ~1600px, quality ~0.85) to keep the upload small and fast. Front and optional back become one or two data URLs.
- **Proxy call:** POST the image(s) as base64 JSON to `/api/scan`. The Pages Function calls Gemini's `generateContent` with a fixed extraction prompt + a JSON response schema (responseMimeType application/json), passing the image inline. It returns the parsed object to the client. The function does not log or store the image.
- **Prompt/schema:** Ask for a strict JSON object: `{ fullName, firstName, lastName, jobTitle, company, emails[], phones[{value,type}], website, address{street,city,state,postalCode,country}, notes, confidence{field:0-1} }`. Instruct it to leave fields empty rather than guess, and to merge front+back.
- **vCard build:** Local JS builds vCard 3.0 (or 4.0) text from the fields: FN, N, ORG, TITLE, TEL (typed), EMAIL, URL, ADR, NOTE. Blob download as `<name>.vcf`. Batch export concatenates BEGIN/END VCARD blocks into one .vcf.
- **CSV build:** Local JS, standard columns (Name, Title, Company, Email, Phone, Website, Address, Notes). Quote-escaped.
- **Phonebook:** IndexedDB store `contacts` (id, fields, createdAt, thumbnail optional). All reads/writes local. "Clear" wipes the store.

## Constraints

- Client is still static and free-hosted; the ONLY server-side piece is the one Pages Function proxy. No database, no per-user state server-side.
- **Labeling (required).** A visible note near the scan action and in the About section: "This tool sends the card image to a third-party AI service (Google Gemini) for high-quality reading. The image is used only to read the card - it is not stored by us and there is no account. Everything else (your saved phonebook) stays in this browser." Keep the wording honest and plain.
- Key handling: `GEMINI_API_KEY` as a Cloudflare Pages encrypted env var. Never in the repo, never shipped to the client. Add basic abuse protection (Cloudflare Turnstile or a simple per-IP rate limit in the function) so the free quota is not burned by bots.
- Palette + voice match the site. Use /assets/site.css tokens. Neo-brutalist, yellow accent, Inter Tight.
- Mobile-friendly to 360px. Camera path must work on iOS Safari and Android Chrome.
- Em-dashes banned. Hyphens only.
- Graceful failure: if the proxy/model errors or quota is hit, tell the user plainly and let them still type the fields manually into the review form (so the tool degrades to a clean vCard maker rather than dead-ending).

## SEO

- Title: "Free business card scanner - read a card into a contact in your browser - techtuate"
- Description: "Scan a business card and save it as a contact. Upload or snap a photo, get an editable vCard and CSV. Free, no app, no signup."
- Keywords: "business card scanner, business card reader, scan business card to contact, card to vcard, business card ocr, no app business card scanner"
- /vs/camcard/ comparison page (CamCard requires an account + uploads your cards; premium is paywalled).
- Cross-link with /name-card/ both ways ("made a card? read cards here" and vice versa) and from /qr-code/.

## Acceptance

- Upload, camera, and paste all get an image into the tool on desktop and mobile.
- A normal card returns name + company + at least one email/phone correctly on the first scan.
- Front + back scan merges into one contact.
- Review form is fully editable; nothing saves without the user pressing save.
- .vcf single export opens on iPhone and Android and offers to save the contact with fields populated; batch .vcf imports multiple contacts.
- CSV opens cleanly in a spreadsheet.
- Phonebook persists across reloads (IndexedDB) and "Clear" empties it.
- API key never appears in any client asset or network response body.
- Third-party disclosure is visible before the user scans.
- Works down to 360px.

## Out of scope (v1)

- Batch multi-card-in-one-photo detection (v1 is one card, optionally two sides). Batch stack scanning is a fast follow.
- Server-side storage / syncing the phonebook across devices (it stays local).
- Enrichment (looking up the person/company online).
- OCR of anything that is not a business card (receipts, IDs, etc.).
- Fully-offline mode. (Could be added later as a Tesseract "private mode" toggle if wanted.)

## Implementation notes for Claude Code

- Scaffold the UI from `_template/` at `/card-reader/` (index.html + script.js + styles.css). Client stays small; the heavy lifting is the model call, so no big client deps. vCard/CSV building is hand-written, no library needed.
- Add the proxy at `/functions/api/scan.js` (Cloudflare Pages Functions convention: a `functions/` dir at the deployment root maps to routes). Confirm how this interacts with `scripts/build.mjs` and the `./dist` output - Cloudflare Pages needs the `functions/` directory available at deploy; decide whether build.mjs copies `functions/` into `dist/` or whether the Pages project is configured to read functions from repo root. Surface the chosen approach.
- Env var: document that `GEMINI_API_KEY` must be set in the Cloudflare Pages dashboard (Settings -> Environment variables, encrypted) before deploy. The tool should detect a missing/failed key and fall back to manual entry with a clear message.
- Wire-in: add `'card-reader'` to STATIC_DIRS in `scripts/build.mjs`, add a tool card to root `index.html` (copy an existing card, note the "* uses a 3rd-party service" caveat on the card), add a `<url>` to `sitemap.xml`, update `llms.txt` (new capability), and add the exception note to `CLAUDE.md` under Hard constraints so future sessions know this tool intentionally uses a function + a third-party call.
- Keep the model call behind a small config object in the function so the provider can be swapped without touching the client.
- Report back: tool path, KB shipped (client), the functions/build decision made, the Cloudflare env-var + Turnstile setup steps the founder must do by hand, and any TODOs.
