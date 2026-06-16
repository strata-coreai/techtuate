# techtuate tools roadmap

A prioritized list of single-purpose web tools to add. Ranking is **ROI = search demand / build complexity**, weighted up if the tool also has a strong privacy story (genuine reason to do it client-side) or synergy with what we've already shipped.

## How signal is measured

- **Demand:** quick proxy via search-volume hints + density of competing sites + presence in "best of" lists. Hard numbers cited where I have them. Otherwise tagged as Estimate.
- **Build:** rough effort. Trivial = a few hours, Easy = a day, Medium = a week, Hard = multiple weeks.
- **Privacy edge:** how much does "runs in your browser, no upload" actually matter for this tool vs. server-based alternatives?

## Tier 1 - ship these next (highest ROI)

| # | Tool | Slug | Demand | Build | Privacy edge | Why |
|---|---|---|---|---|---|---|
| 1 | **QR code generator** | `qr-code` | **110K/mo US** (confirmed) | Trivial | Low | Massive search volume, ~50 lines of JS with `qrcode.js`. Trivial to ship in a session. |
| 2 | **Image compressor** | `image-compressor` | Very high (TinyPNG/Squoosh tier) | Easy | High | Squoosh proved the market. Browser-native via Canvas + `browser-image-compression`. Files never upload = real differentiation. |
| 3 | **Image to PDF** | `image-to-pdf` | High | Easy | High | We already have `pdf-lib` in deps; this is a 100-line page. Direct synergy with `/pdf-editor/`. |
| 4 | **Password generator** | `password-generator` | High | Trivial | Critical | Many users actively avoid online password generators because they're scared. Local-only is the right answer and we can shout about it. |
| 5 | **Word counter** | `word-counter` | Very high | Trivial | n/a | Every writer/student wants this. Trivial to ship. SEO bait. |
| 6 | **JSON formatter / validator** | `json-formatter` | High (devs) | Easy | High | Devs paste sensitive JSON into random sites all the time. Local-only is a real win. Fragmented competitor space = room to rank. |

These six alone would 5-10x the surface area of the site. Each ships in under a day.

## Tier 2 - second wave (high value, slightly more work)

| # | Tool | Slug | Demand | Build | Privacy edge | Why |
|---|---|---|---|---|---|---|
| 7 | **Image resizer / cropper** | `image-resize` | Very high | Easy-Medium | High | Canvas-native. Higher complexity if we add aspect-ratio presets and batch. |
| 8 | **Image converter (JPG/PNG/WebP)** | `image-converter` | High | Easy | High | Canvas can decode JPG/PNG; WebP encode is supported in modern browsers. |
| 9 | **Regex tester** | `regex-tester` | Moderate (devs) | Easy | Low | Devs love a clean regex tester. Live highlighting + capture groups. |
| 10 | **Base64 encoder/decoder** | `base64` | Moderate (devs) | Trivial | High | Privacy-relevant for tokens/keys. Pair with URL-encode in the same UI. |
| 11 | **Age calculator** | `age-calculator` | Very high (people search "how old am I") | Trivial | n/a | SEO-friendly, surprisingly popular. |
| 12 | **Tip calculator** | `tip-calculator` | High | Trivial | n/a | Evergreen. |
| 13 | **EXIF metadata viewer/stripper** | `exif` | Moderate | Easy | Critical | Privacy story is the entire pitch. Strip GPS before posting a photo. |
| 14 | **Color picker / palette** | `color` | Moderate | Easy | Low | Designer-friendly. Picker, contrast checker, hex/rgb/hsl converter. |
| 15 | **Name card / business card generator** | `name-card` | **150K/mo US** ("business card maker") | Medium | High | Templates + custom QR + edit fields + PDF download. Direct funnel from the QR generator's "made with techtuate" banner (users who customize QR often want a place to USE that QR - their card). Canva owns this market with paid templates; the free-forever-with-vCard-QR angle is wide open. Spec: docs/specs/name-card.md |

## Tier 3 - useful, lower ROI (build when scratching an itch)

- **Markdown editor + preview** (`md`) - dev/writer overlap, moderate volume.
- **Pomodoro timer** (`pomodoro`) - high volume but saturated.
- **JWT decoder** (`jwt`) - dev niche, privacy-critical.
- **UUID generator** (`uuid`) - dev niche, trivial.
- **Hash generator (md5/sha)** (`hash`) - dev niche.
- **URL encoder/decoder** (`url-encode`) - pair with `base64`.
- **Lorem ipsum** (`lorem`) - trivial, low volume.
- **Loan / mortgage calculator** (`loan`) - very high volume but heavy and people trust their bank's.
- **BMI calculator** (`bmi`) - high volume, but health-adjacent and we'd want disclaimers.

## Avoid / defer

- **Background remover** - very high volume but needs an ML model (~5-50 MB download), changes the architecture story.
- **Video tools** (compressor, trim, to-gif) - browser video processing is slow and memory-hungry; results are mediocre vs. desktop tools.
- **OCR** - same problem: needs a large model.
- **AI image generator** - requires inference, can't be 100% client-side.
- **Cloud sync / accounts** - violates the hard constraint.

## What "ship" means for each tool

The minimum bar for shipping a tool to techtuate (any tier):

1. Lives at `/<slug>/` as a self-contained page (or Vite app for the complex few).
2. Matches the palette (white / `#ffd60a` / black, neo-brutalist), via `/assets/site.css`.
3. Mobile-friendly down to ~360 px.
4. Has its own `<title>`, meta description, canonical, OG tags, and JSON-LD (WebApplication).
5. Listed in `index.html` tool grid and in `sitemap.xml`.
6. Has a `<noscript>` fallback message ("This tool runs in your browser. Please enable JavaScript.") for SEO.
7. If there's an obvious paid competitor (or paywall trap), spin up a `/vs/<competitor>/` page.

## Why this list, in one line

Pick the smallest, highest-traffic things people are paying $9/mo for, give them away.
