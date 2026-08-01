# techtuate positioning: from "purist local-only" to "free & powerful, AI-forward"
status: PLAN - for founder approval before the site-wide sweep
date: 2026-07-28

## Why we are changing it

The site currently sells one idea above all: *nothing ever leaves your device, no server, no third parties, privacy by architecture.* That claim is woven through 40+ files (homepage alone has ~15 instances; every `/vs/` page leans on it). It was true when every tool was 100% client-side. It stopped being fully true the moment we added:

- the business card reader (sends the card image to Google Gemini via a function), and
- runtime embeds (Trustpilot, StartupBar).

We are adding more AI features and enhancing the PDF reader. So the absolutist framing now overclaims. We fix that honestly rather than quietly leaving stale promises up.

## The one insight that makes this easy

There are two different claims tangled together in the current copy. They do not have to move together:

1. **"Your files are processed on your device / not uploaded."** Still TRUE for every core tool (PDF, QR, password, image, SQL, SVG, JSON). Still the SEO moat. **We keep this** - just scoped to the local tools instead of stated as an absolute about the whole site.
2. **"Zero third parties / no server ever / privacy by architecture."** Broken by AI + embeds. **We retire the absolutist version** and replace it with honest, scoped language.

Net effect: the ranking-relevant "we don't upload your files" distinction survives on the tool pages and `/vs/` pages. Only the whole-site absolutes get softened.

## New positioning (decided)

- **Lead:** free & powerful little tools that just work. Capability first, not asceticism.
- **Local by default:** most tools run in your browser, so your files stay on your device.
- **AI as labeled add-ons:** a few newer tools use AI. They are clearly tagged, send only the specific input needed, use no account, and do not store your data. AI is NOT the hero headline - it is present and honestly labeled.
- **Unchanged and still true:** free forever, no sign-up, no credit card, no ads.

### One-line description (canonical, reuse everywhere)
> techtuate - free little tools that just work. Most run right in your browser, so your files stay on your device. A few use AI and say so. No sign-up, no ads.

### Messaging pillars (in priority order)
1. Free, no sign-up, no ads. (unchanged)
2. Actually useful and good. (new emphasis - lead with power)
3. Local by default - your files stay on your device for the in-browser tools.
4. AI when it helps, always labeled - we tell you when a tool sends anything out.

## Mechanism: a small "local / AI" tag

Because AI stays a labeled add-on (not a headline), the honest signal is a small chip on each tool card and tool page, not a hero rewrite:

- `local` chip (yellow): "runs in your browser, files stay on your device". On PDF, QR, password, image, SQL, SVG, JSON.
- `uses AI` chip (outline) + the existing `*` disclosure: on card-reader and future AI tools.

This keeps the "labeled add-ons only" decision literal: the difference is visible per-tool, without turning the homepage into an AI billboard. CSS: reuse `.status`/`.pill` tokens, add `.tag-local` / `.tag-ai` variants in site.css.

## Claim-by-claim rewrite map

### 1. Homepage `index.html` (highest priority)
| Element | Now | Becomes |
|---|---|---|
| `<title>` | "Free PDF editor and other little tools. No sign-up. No ads." | "techtuate - free, powerful little tools. No sign-up, no ads." |
| meta description | "...No account, no upload, no ads. Always free. Your files never leave your device." | "A growing set of free tools - PDF editor, QR codes, image resize and more. Most run in your browser so your files stay on your device; a few use AI and say so. No sign-up, no ads." |
| hero eyebrow | "free pdf editor & more, in your browser" | "free little tools that just work" |
| h1 | "Little tools that just work. No catch." | KEEP (brand-safe, capability-first) |
| lede | "Starting with a free PDF editor. No sign-up, no uploads, no ads, ever. Everything runs locally on your device, your files never leave the page." | "A growing drawer of free tools - PDF, images, QR codes, passwords and more. Most run entirely in your browser, so your files stay on your device. A few newer ones use AI and are clearly labeled. No sign-up, no ads, ever." |
| pills | no sign-up / no credit card / no ads / no uploads / no ad tracking | no sign-up / no credit card / no ads / **files stay local** / **AI, labeled** |
| tools count subhead | "05 / infinity" (already bumped to 08) | keep 08; unchanged |
| tool cards | plain | add `local` chip to the 7 local tools; card-reader already has the `*` note, add `uses AI` chip |
| StartupBar disclosure line | already updated to mention StartupBar | KEEP (already honest) |
| founder note | paywall rant, "Always free, no sign-up, no ads" | KEEP; optionally add one line: "Some newer tools use AI to do more - those are labeled, and still free to you." |

### 2. `why-free/index.html` (second priority - most absolute claims)
| Line | Now | Becomes |
|---|---|---|
| "How it costs me $0/mo" section | "techtuate is 100% client-side. There's no backend... Nothing uploads." | "Most of techtuate is 100% client-side - no backend, nothing uploaded, which is why it costs about $0 to host. A couple of newer AI tools call a lightweight serverless function; that runs on a free tier too, and it's always labeled." |
| "$0 forever / no business pressure" narrative | implies zero marginal cost forever | add honest caveat: AI tools use a metered free-tier API; if one gets very popular it could cost a little, and if that ever forces a change we will say so plainly rather than paywall quietly. |
| "What client-side buys you: Privacy - Your file never leaves your browser." | absolute | "For the in-browser tools, your file never leaves your browser." (scope it) |
| "What about your data?" para | "The tools ... never call my server (because there isn't one) and never call a third-party. The one exception is Trustpilot..." | Rewrite: local tools call no server; AI tools (labeled) send only the specific input to a named service (e.g. the card reader sends the card image to Google Gemini), not stored, no account; homepage also loads the Trustpilot and StartupBar embeds. Keep the "open DevTools and check" honesty invitation, updated. |
| CTA "Free, no sign-up, no upload." | fine for PDF | KEEP (PDF editor is local) |

### 3. `CLAUDE.md` - Hard constraints (critical: future sessions read this)
Rewrite the constraints block from "100% client-side / no functions / no data leaves device" to the new policy:
- **Local-first is the default.** Every non-AI tool runs 100% client-side; files are processed in the browser and never uploaded. This is the moat - do not weaken it for tools that do not need a server.
- **AI / enhanced tools MAY use a Cloudflare Pages Function proxy to a third-party AI service,** but only when: (a) it materially improves quality, (b) it carries the visible `*` disclosure + `uses AI` tag, (c) no user account, (d) the input is not stored, (e) the API key stays server-side. Ask the founder before adding a new AI dependency.
- **Lightweight third-party embeds** (Trustpilot, StartupBar, privacy-analytics) are allowed but must be disclosed on pages where they load.
- Replace "No data leaves the device" absolute with: "Files stay on the device for local tools; AI tools send only the specific input needed, and say so."
- KEEP unchanged: no accounts / credit cards / ads; free static hosting to `./dist`; palette + voice; **no em-dashes**.
- Fold the existing `/card-reader/` exception block into this as the first example of an AI tool rather than a one-off exception.

### 4. `llms.txt`
- Top `>` description: change "Everything runs entirely on the user's device. Privacy-respecting by architecture (no server to upload to)." to "Most tools run entirely on the user's device (files are not uploaded). A few newer tools use AI and are clearly labeled. Free, no accounts, no ads."
- "Key facts": the "no backend" line already carries the card-reader exception (done). Generalize it to "AI tools use a labeled serverless proxy; every other tool is client-side."

### 5. `/vs/` pages (SEO moat - mostly KEEP)
- Per-competitor pages (adobe, smallpdf, camcard, etc.) compare a specific tool. Their "they upload your files, we don't" claim stays TRUE for those local tools. **No change** to the core distinction - this protects rankings.
- `vs/index.html` hub: soften ONE absolute - "everything runs entirely in your browser with no server involved" becomes "most tools run in your browser with no server involved". Leave the per-tool tables intact.
- `vs/camcard/` already handles the AI nuance honestly - no change.

### 6. Tool pages (local: PDF, QR, password, image, SQL, SVG, JSON)
- Keep their "runs in your browser / not uploaded" copy - still true.
- Add the small `local` tag near the H1 (optional but recommended for consistency with the new tag system).

### 7. `_template/index.html`
- Update the boilerplate About paragraph ("Runs entirely in your browser - nothing is uploaded") to a default local blurb PLUS a commented AI variant, so new tools start honest by type.
- Add the `local` tag to the template by default; AI tools swap it for `uses AI` + the `*` disclosure.

### 8. `docs/*` (launch copy, roadmap, ops-model)
- Lower priority (not user-facing SEO). Update launch scripts and ops-model where they repeat "no server ever / 100% client-side" as the pitch, so future launches match the new line. Can be a follow-up pass.

## Suggested sequencing (once approved)
1. site.css: add `.tag-local` / `.tag-ai` chip styles. (small)
2. Homepage: title, meta, eyebrow, lede, pills, tool-card tags. (highest visibility)
3. CLAUDE.md constraints rewrite. (unblocks future AI tools cleanly)
4. why-free rewrite. (retires the biggest absolutes)
5. llms.txt top + facts.
6. vs/index hub one-line softening; leave per-competitor pages.
7. _template + local tool-page tags.
8. Follow-up: docs/ launch + ops copy.

## Explicitly NOT changing
- The `/vs/` per-competitor file-upload distinction (true + ranks).
- "Free, no sign-up, no ads." (still true)
- The palette, voice, neo-brutalist look, no-em-dash rule.
- The card-reader's existing `*` disclosure and the third-party labeling pattern.

## Resolved decisions (2026-07-28)
- **No chips.** Copy-only. Skip the `local` / `uses AI` chip system and the site.css tag styles (sequencing step 1 is dropped).
- **No payment/cost talk in why-free.** Do not add the metered-AI "$0 forever" caveat. Keep the "what about your data" rewrite (privacy/labeling), but drop the cost discussion. Monetization path (ads past ~1,500 users/day) stays internal.
- **"no ads" but never "no ads, ever".** Drop the absolute "ever" everywhere (topbanner on every page, pills, copy). Keep present-tense "no ads" (true today). Ads are a possible future path, so no forever-pledge.
- **Sequencing left to Claude, done in a couple of passes.**

### Pass status
- Pass 1 (DONE): homepage `index.html` (title, meta, OG/Twitter, topbanner, eyebrow, lede, pills, JSON-LD desc, third-party line), `CLAUDE.md` constraints rewrite, `llms.txt` top description.
- Pass 2 (next): `why-free/index.html` rewrite, `vs/index.html` one-line softening, site-wide topbanner "ever" removal on all remaining pages, `_template/index.html`.
- Pass 3 (follow-up): `docs/` launch scripts + ops-model copy.
