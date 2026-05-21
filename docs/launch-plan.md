# techtuate 90-day launch + activation plan

A real plan to get techtuate to: page-1 long-tail rankings, recommended in AI tools, and $300+/mo in coffees+sponsorship by day 90.

## North-star metrics (day 90)

| Metric | Target | Stretch |
|---|---|---|
| Unique monthly visitors | 5,000 | 10,000 |
| Tools live | 7 (PDF + 6 Tier-1) | 10 |
| Indexable pages | 40 | 60 |
| Long-tail keywords ranking top 10 | 15 | 30 |
| AI tools recommending techtuate (ChatGPT, Claude, Perplexity, Gemini) | 2 of 4 | all 4 |
| Coffees / month | $150 | $300 |
| Sponsorship | 1 sponsor at $100/mo | 2 sponsors total $250 |
| Affiliate revenue | $50/mo | $150/mo |
| Total revenue / mo | $300 | $700 |

## The six workstreams

### 1. Product (ship tools)

| Week | Tool | Owner | Effort |
|---|---|---|---|
| 0 (now) | PDF editor v1 (annotations + page ops merging) | Claude Code | done |
| 1 | QR code generator | Claude Code | trivial |
| 2 | Password generator | Claude Code | trivial |
| 3 | Word counter | Claude Code | trivial |
| 4 | Image-to-PDF | Claude Code | easy |
| 5-6 | Image compressor (Vite, more involved) | Claude Code | medium |
| 7 | JSON formatter | Claude Code | easy |
| 8 | Regex tester | Claude Code | easy |
| 9-10 | Image resizer + cropper | Claude Code | medium |
| 11-12 | Buffer for iteration / fixes / bonus tool | both | varies |

Pipeline: `docs/specs/*.md` + `docs/prompts/11-build-tool-from-spec.md`. One paste per tool. Already proven on the PDF editor side.

### 2. Content + SEO

Per tool shipped, Claude Code writes:
- The tool page itself (with full meta + JSON-LD).
- An SEO landing at `/free-<tool>/` targeting "free X" queries.
- A `/vs/<closest-competitor>/` page where there's an obvious paid alternative.

Plus standalone content (Claude Code drafts, you approve voice):
| Week | Piece | Target query |
|---|---|---|
| 1 | `/tools/` index page | "free online tools no signup" |
| 2 | `/blog/why-tiny-tools-cost-9-a-month.md` | dev/indie audience, HN bait |
| 4 | `/blog/how-i-host-an-unlimited-pdf-editor-for-0-a-month.md` | engineering audience, HN bait |
| 6 | `/blog/the-tinypng-alternative-comparison.md` | image tool searches |
| 8 | `/blog/no-signup-tools-the-list.md` | "no signup" cluster, lots of internal links |
| 10 | `/blog/quarterly-numbers-month-3.md` | indie hackers backlink + AI signal |

### 3. Launch

Sequence matters. Compressed: bigger waves first, then drip.

| Day | Channel | Asset |
|---|---|---|
| 1 | Google Search Console + Bing | sitemap submitted |
| 1 | Cloudflare Web Analytics | snippet pasted in `index.html` placeholder |
| 1 | GitHub | repo public, README polished, social preview card |
| 3 | alternativeto.net | listing for PDF editor with category "PDF Editors" |
| 4 | Reddit r/InternetIsBeautiful | text post, tool-focused (not self-promo-y) |
| 7 | **Hacker News Show HN** | Show HN: techtuate - free in-browser PDF editor, no sign-up, no upload |
| 8 | Twitter/X + BlueSky thread | linking to the HN post |
| 9 | Reddit r/webdev, r/selfhosted, r/privacy | one each, spaced out |
| 14 | Product Hunt | Tuesday launch, asset pack ready |
| 21 | Indie Hackers + dev.to | cross-post the engineering article |
| 30 | Lobsters | only if HN went well |
| 30 | Newsletters | TLDR, Hacker Newsletter, Pointer, Console |
| 45 | "Best of" listicle outreach (~20 sites) | template email + custom hook each |
| 60-90 | repeat for each new tool ship | mini-launches per tool |

### 4. Growth (after initial launch)

- Each Tier-1 tool ship gets its own mini-launch on PH + the relevant Reddit sub.
- AI discoverability is largely passive once `llms.txt` is in place + we have real-world mentions on indexed sites (HN, Reddit, GitHub).
- A `?utm_source=` tag on every share link so we can attribute traffic.
- Cross-link aggressively between tool pages, comparison pages, articles. Internal links are the cheapest SEO lever a new site has.
- Build relationships with 3-5 dev-tools newsletter authors. Pitch each once.

### 5. Monetization (without breaking the "no ads" promise)

Three layers, none of which compromise the brand:

**Layer A: Buy Me a Coffee** (free to set up, ~0.5-1.5% conversion)
- Wire up by day 7.
- Single small link in footer + a one-off mention on the `/why-free/` page.
- No popups. No nags. Never above-the-fold.

**Layer B: Affiliate links inside `/vs/<competitor>/` pages**
- Sejda Partner program (10% recurring, ~$0.75/mo per signup).
- Adobe Affiliate program ($72 per Acrobat annual signup).
- These go inside the "where they're actually better than us" sections we already have. Honest, useful, doesn't compromise the tool itself.
- `rel="sponsored"` per Google guidelines. Disclose in footer.

**Layer C: One small "supported by" footer slot** (NPR-style underwriting, not display ad)
- Target: privacy-aligned brand. Proton, 1Password, Tailscale, Standard Notes, Mullvad, Bitwarden, Mailbox.org.
- Ask: $100-200/mo for a single text link + small logo in the site-wide footer.
- Framing: "techtuate is supported by [Brand]. They pay us $X/mo so we can keep this free and ad-free for you. We chose them because they share the no-creep philosophy."
- This is the only thing that could be construed as an "ad" - and it's the kind of ad even ad-haters tend to accept.

**What I'd avoid:** Google AdSense, Carbon Ads, banner ads, sidebar ads, popups, modal interstitials, anything that involves a real-time bidding network. They'd torch the brand within a week.

### 6. Measurement

Weekly check (you, ~15 min):
- Cloudflare Analytics: unique visitors, top pages, top referrers.
- Google Search Console: which queries are showing up, average position, click-through rate.
- BMC: coffees this week.

Monthly review (you + me, ~1 hr):
- Which tools are sticking (high visit duration, repeat visits)?
- Which `/vs/` pages are driving traffic?
- Are AI tools mentioning us yet? Test by asking ChatGPT/Claude "what's a free PDF editor with no signup?" and noting the answer.
- Adjust the roadmap based on what's working.

## Calendar (week-by-week)

### Week 0 (now)
- PDF editor v1 ships (annotations, page ops). Claude Code finishing.
- Plan committed to repo. **You** push to git.
- **You:** verify Cloudflare Web Analytics is set up, paste snippet, commit.

### Week 1 (this week)
- **Claude Code:** ship QR code generator. Add card + vs page.
- **You (~3 hrs total):** Submit sitemap to Google Search Console + Bing Webmaster. Set up Buy Me a Coffee account. Make GitHub repo public. Sign up for Sejda Partner + Adobe Affiliate programs.
- **You (~30 min):** Post to r/InternetIsBeautiful. (I'll draft.)
- **HN launch pre-flight overlaps this week:** Sat 2026-05-23 walkthrough, Sun 2026-05-24 OG image, Mon 2026-05-25 BMaC link + HN karma check. Issues filed via `seed-hn-launch.sh`.

### Week 2 (anchored: 2026-05-25 -> 2026-05-31)
- **Claude Code:** ship password generator. Write tools index page.
- **You (~2 hrs):** **HN Show HN post Tuesday 2026-05-26, 08:00 ET (12:00 UTC).** Respond to comments for ~6 hrs across the day. (Single biggest leverage point of the entire 90 days.) Full timeline + pre-flight: [`docs/launch/timeline.md`](launch/timeline.md). Run [`scripts/seed-hn-launch.sh`](../scripts/seed-hn-launch.sh) to file the 8 timeline issues into GitHub.
- **You (~30 min):** Cross-post to X/BlueSky/LinkedIn (T+2h, gated on front-page HN).

### Week 3
- **Claude Code:** ship word counter.
- **You (~1 hr):** Post to r/webdev and r/selfhosted (spaced 2-3 days apart).

### Week 4
- **Claude Code:** ship image-to-PDF. Write the "$0/mo hosting" engineering article.
- **You (~2 hrs):** Product Hunt launch Tuesday. Coordinate with dev community.

### Weeks 5-6
- **Claude Code:** ship image compressor (the bigger one). Write TinyPNG comparison.
- **You (~30 min):** Cross-post the engineering article to dev.to, hashnode, indie hackers.

### Week 7
- **Claude Code:** ship JSON formatter.
- **You (~3 hrs):** Outreach to ~10 "best of" listicle sites. (I'll write templates per site.)

### Week 8
- **Claude Code:** ship regex tester. Write "no signup tools - the list" article.
- **You (~3 hrs):** Outreach to 5-10 newsletters with one-line pitches. (I'll draft.)

### Weeks 9-10
- **Claude Code:** ship image resizer + cropper.
- **You (~4 hrs):** Sponsorship outreach. Target Proton, 1Password, Tailscale, Mullvad with personal-sounding emails. (I'll draft.)

### Week 11
- Buffer for iteration. Whatever broke gets fixed.
- **You (~1 hr):** Month-3 numbers blog post. Indie Hackers crosspost.

### Week 12
- Review what's working, plan the next 90.

## What I (Claude) can do end to end

| Capability | Notes |
|---|---|
| Write every line of code | Via Claude Code on your laptop |
| Write every marketing page, comparison, article | Same |
| Draft every HN/Reddit/X/PH post | You polish in your voice + post |
| Draft every outreach email | You send from your domain |
| Write JSON-LD, sitemap entries, meta tags | Automatic per the build pipeline |
| Maintain `llms.txt` as tools ship | Will keep in sync |
| Run em-dash audits + lint passes | Already wired |
| Generate Open Graph / social-share images | Yes, SVG or HTML-to-PNG |
| Suggest content priorities based on Search Console data | If you share screenshots / exports |

## What only you can do (the support I'll need)

These are unavoidable. They either need credentials, real-world identity, or human judgment in the moment.

### Accounts to create (Week 1, mostly one-time, ~3 hrs total)
- [ ] **Google Search Console** - verify techtuate.com ownership (via Cloudflare DNS TXT record, 5 min)
- [ ] **Bing Webmaster Tools** - same drill (or copy from Search Console)
- [ ] **Buy Me a Coffee** - account + page customization (~30 min)
- [ ] **GitHub** - repo settings: make public, add a good README banner, enable social-preview image
- [ ] **Product Hunt** - account + ship-day asset upload (~1 hr the week of)
- [ ] **Hacker News** - account if you don't have one with karma (need at least a few comment-karma posts to avoid auto-flag)
- [ ] **Reddit** - personal account with some history in /r/programming or similar (a brand-new account posting to r/webdev gets removed)
- [ ] **X / BlueSky / LinkedIn** - posting accounts (techtuate handle ideally)
- [ ] **Sejda Partner Program**
- [ ] **Adobe Affiliate Program** (CJ Affiliate)
- [ ] **alternativeto.net** account for submissions

### Skills you need (most you already have)
- **Git basics** - `git add`, `commit`, `push`. You've shown this works.
- **PowerShell / terminal comfort** - to run Claude Code and the occasional npm command. You have this.
- **Cloudflare dashboard navigation** - to paste analytics snippet, manage DNS, monitor deploys. You have this.
- **Ability to respond to comments in your founder voice** - HN/Reddit/PH replies. This is the highest-leverage thing only you can do. ChatGPT-shaped replies kill these threads.
- **Email outreach with light personalization** - I'll write templates, you tweak first sentence + send from your address.
- **Judgment calls on tradeoffs** - "should we accept this sponsor?", "should we add this tool?", "this email looks sketchy" - founder decisions.

### Time commitment from you
- **Week 1:** ~6 hrs (account setup + first posts)
- **Weeks 2, 4:** ~4 hrs (HN launch, PH launch)
- **Weeks 3, 5-8:** ~2 hrs/week (drip posts, sitemap resubmits, weekly metrics)
- **Weeks 9-11:** ~3-4 hrs/week (sponsor outreach, deeper threads)
- **Week 12:** ~2 hrs (review, plan next cycle)
- **Total:** roughly **40-50 hours over 90 days** (~5 hrs/week average)

If you can only do half that, the plan still works but the timeline slips to ~120 days.

### What I cannot do for you
- Click "submit" on HN at the right moment.
- Reply in your voice to a Reddit comment that needs a human.
- Negotiate a sponsorship contract.
- Take an unflattering call from a sponsor.
- Verify domain ownership with Google.
- Tweet from your account.
- Make a moral call on accepting a particular sponsor.

## Risks + contingency

| Risk | Likelihood | Mitigation |
|---|---|---|
| HN post flops (front page but no traction, or never makes front page) | Medium | Have 2-3 backup posts queued for different angles. First one fails -> wait 30 days -> try with new angle (e.g., the image compressor instead of PDF) |
| AI tools don't recommend us despite `llms.txt` | Medium | The signal is HN/Reddit/GitHub mentions, not just `llms.txt`. If 60 days in we still aren't being recommended, write a "best practices" article specifically targeting LLM training data (e.g., "the no-signup tools index 2026") |
| Cloudflare Pages free tier limit hit | Low | Static site, unlikely to hit caps. If we do (1M req/day), it's a great problem - upgrade is cheap. |
| Sponsor outreach yields zero responses | Medium | Cold sponsor outreach is brutal. Don't optimize for it before month 3. Focus on coffees + affiliates first; sponsor is upside. |
| You burn out doing the human work | High if not careful | The calendar above is paced. If a week slips, shift it - don't try to catch up. The compounding still happens at lower velocity. |
| Google de-indexes us (any reason) | Low | We're a clean static site, no spammy patterns. Manual penalty extremely unlikely. |
| A scraper steals our tool pages and outranks us | Low-Medium | We file DMCA via Cloudflare. Static sites get scraped often; usually doesn't hurt. |

## Decision points along the way

These are the moments where you have a real call to make. I'll flag them in advance.

1. **Week 2, after HN:** Was the launch a hit or a flop? If hit, accelerate (ship 2 tools the next week). If flop, regroup - probably wait for image compressor to be the second launch.
2. **Week 6:** Is anyone clicking sponsorship CTAs? If yes, start outreach early. If no, wait to month 3.
3. **Week 8:** Has anyone bought coffees? Conversion rate informs whether to move the BMC link more prominent.
4. **Week 12:** What's the next 90-day shape? More tools? More content? International (translated landing for "ilovepdf alternative" in Spanish/Portuguese/Hindi has huge volume)?

## What to do right now

The next action that unblocks everything is **Week 1, the account-setup pass**. Concretely:

1. Submit sitemap to Google Search Console + Bing.
2. Make the GitHub repo public.
3. Set up Buy Me a Coffee.
4. Paste the Cloudflare Analytics snippet.

I can have a step-by-step checklist with screenshots-by-description for any of these. Tell me which and I'll write it.

---

## Addendum: YouTube workstream + dashboard interface (revised target $500/mo)

### Updated north-star metrics

| Metric | Target (was) | Target (new) |
|---|---|---|
| Total revenue / mo by day 90 | $300 | **$500** |
| YouTube channel | n/a | 1 long + 1 short per week |
| YT subscribers | n/a | 200 (path to monetization) |

### Revenue mix at $500/mo (conservative)

- Coffees: $150/mo (~5K monthly visitors, 1% conversion, $3 avg)
- Sponsor: $100/mo (one sponsor in footer)
- Affiliate clicks (/vs/ pages): $100/mo
- YT ad revenue: $50/mo (modest, might be $0 if not yet monetized at 90d)
- YouTube-driven coffees + affiliate: $100/mo
- **= $500/mo**

If YouTube hits a viral moment (one short with 100K views) the cap moves to $1-2K/mo by month 6.

### YouTube workstream

See `docs/youtube-pipeline.md`. Adds ~10 min/week of your time (recording only). All script writing, narration generation, editing assistance, thumbnail design, title/desc/tags, and short clipping is mine.

### Dashboard interface

See `docs/dashboard-system.md`. Recommendation: **GitHub Issues + daily markdown summary**. Mobile app, free, versioned, I can open/close programmatically. Slack is a fine alternative if you prefer chat UX.

### Updated day-1 setup additions

When new machine + Chrome access lands, add to the setup pass:

- [ ] Create YouTube channel `@techtuate` (~5 min, plus phone verification)
- [ ] Sign up for ElevenLabs Starter ($5/mo, ~3 min)
- [ ] Install OBS Studio or familiarize with Windows Game Bar (~2 min)
- [ ] Pick: GitHub Issues OR Slack as the dashboard

### Updated time commitment from you

- Day 1: ~30-60 min one-time setup (slightly longer if YT channel included)
- Weekly: ~10 min/day average via GitHub Issues + ~10 min/week recording = ~80 min/week
- HN launch day: ~3 hrs (unchanged)
- Total over 90 days: ~15-20 hrs (up slightly from previous ~10-15 to include video recording)
