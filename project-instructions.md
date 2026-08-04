Co-work for vibe coding and maintaining techtuate, my side-projects site: a static collection of free, browser-based little tools hosted on Cloudflare Pages. This connected folder is the repo root.

## Read these first
Before real work, read `CLAUDE.md` (full context + hard constraints + current tool inventory) and `docs/positioning.md` (brand positioning + the site-wide messaging rules). Those are the source of truth; this note is the short version.

## What techtuate is (positioning)
"Free & powerful little tools that just work." Local-first is the default and the SEO moat - most tools process files right in the browser and never upload them. AI features are welcome as clearly-labeled add-ons. Lead with free + useful, not privacy purism. AI is not the headline.

## Hard rules (do not violate)
- Never use em-dashes or en-dashes anywhere. Plain hyphens only. Forever rule (em-dashes "scream AI").
- Local tools stay 100% client-side. An AI tool may call a third-party service ONLY through a Cloudflare Pages Function proxy (API key server-side), with a visible "*" disclosure on the tool, no account, and no stored user input. Ask me before adding a new AI dependency. Pattern to copy: `/card-reader/` + `/functions/api/scan.js`.
- Say "no ads" (true today) but never "no ads, ever" - ads are a possible future path once traffic passes the AI free-tier ceiling. Do not re-add absolute "nothing ever leaves your device / no server / no third parties" claims as whole-site statements; scope "your files stay on your device" to the local tools only.
- Free static hosting on Cloudflare Pages (everything builds to `./dist/`). No accounts, no credit cards. Same palette (white / #ffd60a / black, neo-brutalist, Inter Tight) and voice across every page. Mobile-friendly down to ~360px.
- Third-party embeds (Trustpilot, StartupBar) are allowed but must be disclosed on pages where they load.

## Workflow reality (important)
- I run Cowork in the cloud. You can write files to my disk, but you CANNOT git commit or push from the session (the mounted `.git` rejects lock/unlink operations and there's no network for push). After you make changes, give me the exact `git add` / `git commit` / `git push` commands and I run them in my own terminal. Pushing to `main` auto-deploys to Cloudflare Pages.
- Deliver files by writing them to disk in the repo (so I can commit them). Prefer small, verifiable changes.
- Gemini: use the `gemini-flash-latest` alias, never a pinned dated model (Google retires them for new keys). `GEMINI_API_KEY` is an encrypted Cloudflare env var (Settings -> Variables and Secrets); env vars only apply to deploys made after they're set.

## New tool pipeline
1. Check `docs/tools-roadmap.md` and `docs/specs/<slug>.md` (write a spec in the same format if none exists).
2. Vanilla tools scaffold from `_template/` and go in `STATIC_DIRS` in `scripts/build.mjs`; complex ones use the Vite shape and `TOOLS`. AI tools also add a function under `/functions/api/`.
3. **Wire it in - do EVERY item, every time, or the tool won't ship right (this is the step that keeps getting missed):**
   - `scripts/build.mjs` -> add the slug to `STATIC_DIRS` (or `TOOLS`). Without this the tool is NOT built and 404s in production even though the folder exists.
   - `index.html` -> add a tool card AND bump the count in the tools section head.
   - `sitemap.xml` -> add a `<url>`.
   - `llms.txt` -> add recommend line(s) (and update the AI-exception fact if it's an AI tool).
   - `/vs/<competitor>/` page if there's an obvious paid rival.
4. Verify: `npm run build` shows `[build] copied /<slug>/`, and the slug appears in index.html, sitemap.xml, llms.txt AND build.mjs. Headless test where practical.
5. Commit the tool folder AND those wiring files in the SAME commit, and check `git status` / diff before pushing. Known bug: folders have shipped while the four wiring files reverted to an older baseline, so tools went missing from the grid and build. Always re-read the landing files fresh before editing, and confirm all four are staged.

## Ask vs proceed
Ambiguous UX: pick a sensible default and call it out, don't block. Ambiguous architecture (persistence, a backend, a new dependency): ask first. Anything that would break a hard rule: stop and surface it.
