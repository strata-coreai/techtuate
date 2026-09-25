# techtuate design system ("Flow")

The whole site uses this look as of 2026-09-24. It replaced the old white/yellow neo-brutalist `site.css`. If a new page or tool doesn't look like it belongs next to `/` and `/card-reader/`, it isn't done.

Reference implementations to copy from:
- `/index.html` + `/assets/home.css` + `/assets/home.js` - home page, search, tool cards
- `/card-reader/` - the most complete tool page (drop zone, glass panels, fields with flags, pills, phonebook)
- `/qr-code/`, `/image-resize/`, `/diff-checker/` - typical tool pages on the shared page layer
- `/vs/sejda/` - long-form article
- `/_template/` - the scaffold every new tool starts from

## 1. Files

| File | What it is | Loaded by |
|---|---|---|
| `/assets/flow.css` | Tokens, self-hosted fonts, nav, footer, buttons, chips, glass, FAQ accordion, toast, keyframes | every page |
| `/assets/flow-pages.css` | Page frame for tools and articles (`.tt-main`, `.page-head`, `.tool-ui`, `.tt-section`), shared components (`.btn`, `.callout`, `.cta`, `.compare`, `.prose`, form controls) and the token names tool CSS uses (`--ink`, `--field`, `--line`...) | every page except `/` and `/card-reader/` |
| `/assets/backdrop.js` | Animated WebGL silk backdrop (Ember mood). Falls back to a CSS gradient without WebGL, slows down for reduced motion, pauses in hidden tabs | every page except `/pdf-editor/` |
| `/assets/fonts/` | Bricolage Grotesque, Instrument Serif italic, Geist, Geist Mono (latin, woff2, SIL OFL) | via flow.css |
| `/assets/home.css`, `/assets/home.js` | Home page only | `/` |

Rules:
- No runtime font or CDN links. Fonts are self-hosted, and the old Google Fonts links are gone for good.
- CSS/JS links are cache-busted at build time (`scripts/build.mjs` adds `?v=<hash>`). Don't add version strings by hand.
- `/pdf-editor/` is a Vite app. Its `src/styles.css` carries its own copy of the tokens and `@font-face` rules, pointing at `/assets/fonts/`.

## 2. Tokens

Colors (the only colors the UI may use):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#06050a` | page, and text on yellow |
| `--text` | `#f6f2ff` | headings, primary text |
| `--body` | `#ece8f4` | body text (`--ink` in tool CSS) |
| `--text-2` | `#c9c2d8` | secondary text, intros |
| `--text-3` | `#aaa3ba` | descriptions, answers |
| `--muted` | `#8d879c` | labels, captions |
| `--faint` | `#6f6980` | hints, fine print |
| `--accent` | `#ffd60a` | the one accent: primary buttons, active states, flags, links underline, focus |
| `--accent-hover` | `#fff1a8` | primary hover |
| `--local` | `#8fe3c0` | only for "stays on device" / "valid" hints |
| glass | `rgba(20,16,32,.55)` + `blur(22px)` | panels |
| card glass | `rgba(22,18,34,.5)` + `blur(14px)` | tool cards |
| field | `rgba(8,6,14,.55)` (`--field`) | inputs, code panes, wells |
| hairlines | `rgba(255,255,255,.07-.16)` | borders, dividers |

- No reds, greens or blues in UI chrome. Errors and warnings are yellow. The single exception is the card reader's reach-out dots in real brand colors (WhatsApp, Gmail, Outlook, LinkedIn), which the founder approved on 2026-08-04.
- User content keeps its real colors: QR codes, exported images, swatches, rendered PDF pages (white paper on dark).

Type:

| Role | Font | Typical |
|---|---|---|
| Display / H1 | Bricolage Grotesque 300 | `clamp(44px, 6.4vw, 96px)`, line-height .94, letter-spacing -0.05em |
| Headings | Bricolage Grotesque 400-500 | letter-spacing -0.025em to -0.04em |
| Accent words | Instrument Serif italic 400, yellow | the last word of an H1 (`<span class="serif">`), eyebrows-as-voice, the marquee, quotes |
| Body / UI | Geist 300-600 | 15-18px, line-height 1.5-1.7 |
| Labels, tags, eyebrows | Geist Mono | 11-12.5px, uppercase, letter-spacing .08-.18em |

Radii: 999px for pills, buttons and inputs; 32px panels; 28px tool cards; 22px drop zones, frames and contacts; 16-20px rows, notes and code panes.

Spacing: side padding `clamp(20px, 6vw, 96px)`; sections 100-140px vertical on desktop.

## 3. Page shell (every page)

```html
<canvas class="tt-backdrop" aria-hidden="true"></canvas>
<div class="tt-vignette" aria-hidden="true"></div>
<div class="tt-page">
  <header class="tt-nav"> dot + "techtuate" wordmark + <span class="tt-crumb">/ tool name</span>
     links: tools (/#tools), why it's free (/why-free/), compare (/vs/), search pill (/#search) </header>
  <div class="tt-main">
    <a class="tt-backlink" href="/#tools">&larr; all tools</a>
    <div class="page-head">
      <h1>Tool <span class="serif">name</span></h1>
      <p class="lede">One or two plain sentences on what it does and where the file goes.</p>
    </div>
    <main class="tool-ui"> ...the tool... </main>
    <section class="tt-section"> <p class="eyebrow">about this tool</p> ... </section>
    <section class="tt-section faq-section"> <p class="eyebrow">questions people ask</p>
      <div class="faq"><details class="faq-item"><summary><h3>Q</h3></summary><p>A</p></details></div>
    </section>
  </div>
  <footer class="tt-footer"> ... </footer>
</div>
```

Copy it from `/_template/index.html` rather than typing it. Notes:
- The H1 is the real, keyword-bearing H1. The serif accent goes on its last word, or on a better word if the last one is a brand-name fragment (the /vs/ pages accent "vs.").
- FAQ answers are real visible HTML in `<details>`, and must match the page's FAQPage JSON-LD word for word.
- Below 640px the nav collapses to the logo, crumb and search pill.

## 4. Components

- **Buttons.** Yellow primary (`.btn.alt` / `.btn-primary`: `#ffd60a` fill, `#06050a` text, 600 weight). Ghost (`.btn.ghost` / `.btn-ghost`: 1px `rgba(255,255,255,.2)` border, border turns yellow on hover). Text buttons for low-stakes actions ("start over", "copy"). One primary per view.
- **Segmented choices and toggles.** Pill groups. The selected pill is yellow fill with dark text. Switches use the home page's `.toggle` pattern (40x22 track, yellow when on).
- **Drop zones.** 1.5px dashed `rgba(255,214,10,.45)` border, radius 22px, faint yellow radial glow, an Instrument Serif italic title ("Drop a card here") and a small hint line. Clicking opens the file picker; paste works where it makes sense. Copy `.cr-drop` from card-reader.
- **Glass panels.** One `.tool-ui` panel per tool. Inner groups use `rgba(255,255,255,.035-.05)` wells with hairline borders. Don't nest glass-on-glass more than one level.
- **Fields.** Label in Geist Mono uppercase `#8d879c`, borderless or dark-fill input, hairline row dividers. Card-reader's review form is the model, including yellow flag pills ("check", "not on card").
- **Status and loading.** Ghost bars pulsing (`tt-pulse`), a yellow scan sweep (`tt-sweep`) over an image being read, and short honest captions ("Reading the card. Usually a couple of seconds.").
- **Toast.** `#copy-flash` or `.tt-toast`: a yellow pill at the bottom center.
- **Tables.** `.compare` inside `.compare-wrap`: mono uppercase headers, hairline rows, the techtuate column tinted yellow (`.us`), and horizontal scroll inside the wrap on mobile.
- **Articles.** `article.prose` inside `.tt-main.narrow`. Links are underlined yellow, `.callout` for the TL;DR, `.cta` for the closing push.

## 5. Icons

- Tool icons are 24x24 line icons: `stroke="currentColor"`, `stroke-width="1.6"`, round caps and joins, 2 to 7 simple paths, no fills. No emoji and no icon font.
- They sit in a `.ticon` tile (48px, radius 16px, hairline border). The tile tints the stroke with the tool's hue: `color: oklch(0.88 0.09 var(--h1))`.
- Each tool owns a hue pair `--h1 / --h2`. `--h1` sets the icon tint and the card glow; `--h2` is where the glow falls off. Current pairs:

| Tool | h1 / h2 | Tool | h1 / h2 |
|---|---|---|---|
| PDF editor | 18 / 340 | Image & GIF resizer | 330 / 20 |
| PDF password remover | 40 / 10 | Business card reader | 48 / 20 |
| Photo to scan | 120 / 160 | Color palette | 290 / 340 |
| JSON formatter | 195 / 230 | Audio converter | 172 / 140 |
| Diff checker | 250 / 200 | Font finder | 95 / 60 |
| QR code | 150 / 190 | Word counter | 5 / 330 |
| Password generator | 210 / 260 | SVG converter | 265 / 300 |
| SQL to table | 225 / 190 | Business card maker | 70 / 40 |

  A new tool takes the free hue furthest from its neighbours (roughly 135, 240, 310 are open) and an h2 20-50 degrees away.
- Where the icon appears: the home tool card (source of truth, inline SVG), the search results (read from the card automatically), and "goes well with" pills on other tools (`.ticon.xs`). Use the same paths everywhere.
- UI icons inside tools (upload, lock, copy...) follow the same line style in `currentColor`. The only filled or colored marks are the glowing yellow dot (brand and disclosure) and user content.
- Favicons stay the existing yellow rounded square with a black line glyph.

## 6. Home tool card (adding a tool)

Add one `<a class="tool">` to the grid in `/index.html`, copying a neighbour:

```html
<a class="tool" href="/<slug>/" data-id="<short-id>" data-groups="paper picture"
   data-kw="synonyms people would type, file extensions, verbs"
   data-short="Four-word summary" style="--h1:70;--h2:40">
  <span class="tool-bleed" aria-hidden="true"></span>
  <span class="ticon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">...</svg></span>
  <h3 class="tool-name">Tool name</h3>
  <p class="tool-line">One sentence, under about 70 characters.</p>
  <span class="tool-foot"><span class="tag local">STAYS ON DEVICE</span><span class="arrow" aria-hidden="true">&#8599;</span></span>
</a>
```

- `data-kw` powers search, so include the words people actually type (for audio: "mp3 wav m4a aac ogg flac opus convert trim music voice memo").
- `data-groups` uses the ids in `GROUPS` in `/assets/home.js`: `paper`, `picture`, `design`, `code`, `people`, `sound`. A tool can be in several.
- AI tools add `data-ai="1"` and use `<span class="tag ai">READS WITH AI *</span>`. The device-only toggle hides them, and the `*` note under the grid explains them.
- The tool count on the page updates itself. Also add the tool to the ItemList JSON-LD in the same file, and do the rest of the wiring checklist in `CLAUDE.md`.

## 7. AI disclosure pattern

Every AI tool shows, inside its tool panel, a `.cr-disclosure`-style note: a glowing yellow dot, then **"* Where the photo goes."** and one or two plain sentences naming the service. It also repeats that in its About section. Never remove or shrink it.

## 8. Copy voice on the new design

Short, lowercase-friendly UI labels ("try a sample card", "start over"). Honest captions, and no hype. Scope "stays on your device" to local tools. Say "no ads", never "no ads, ever". No em-dashes or en-dashes anywhere. No "made with AI" or assistant attributions anywhere on the site.

## 9. Before shipping a page

- Check it at 1440px and 360-375px. There must be no horizontal page scroll; long content scrolls inside its own pane.
- Run the main interaction with no console errors.
- Contrast: no light text on yellow, and no yellow text on yellow.
- The H1, meta tags, canonical, OG and JSON-LD are present, and the FAQ matches the JSON-LD.
- No em-dashes (`grep -P "\x{2014}|\x{2013}"`).
