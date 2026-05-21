# Seed the HN launch timeline as GitHub issues (PowerShell mirror of seed-hn-launch.sh).
# Pinned date: Tuesday 2026-05-26, 08:00 ET (12:00 UTC).
#
# Usage:
#   cd C:\Users\joshi\techtuate
#   .\scripts\seed-hn-launch.ps1
#
# Idempotent-ish: re-running creates duplicate issues. Run once.

$ErrorActionPreference = "Stop"

$Repo = if ($env:GH_REPO) { $env:GH_REPO } else { "strata-coreai/techtuate" }
$Milestone = "Week 2 - HN launch"

Write-Host "Seeding HN launch timeline for $Repo ..."

function New-LaunchIssue {
  param(
    [string]$Title,
    [string]$Body,
    [string]$Labels
  )
  gh issue create --repo $Repo --title $Title --body $Body --label $Labels --milestone $Milestone
}

# ---- T-3 ----
New-LaunchIssue "T-3: Pre-flight - walk the PDF editor end-to-end on phone + desktop" @"
**Why:** The HN front page is unforgiving. A broken Save button on iOS Safari at 09:00 ET Tuesday is the failure mode. Catch it now.

**Time:** 15 min

**What to do**
1. On your phone, open https://techtuate.com/pdf-editor/ . Drop in a real PDF (multi-page if you have one).
2. Try each tool: annotate, reorder pages, merge in another PDF, build PDF from images, fill a form, save.
3. Repeat on desktop in Chrome AND in Safari.
4. If anything is broken, file a separate issue with the ``today`` label and a screenshot. Fix or back out before Tuesday.

**Definition of done:** Every feature works on iOS Safari + macOS Safari + Chrome desktop. Save produces a valid PDF.

[Launch timeline](docs/launch/timeline.md)
"@ "launch,this-week,voice"

# ---- T-2 ----
New-LaunchIssue "T-2: Generate OG image for /pdf-editor/ + verify Twitter/Slack share preview" @"
**Why:** HN comments and replies on X get expanded with the OG image. Without one, the link looks like spam. Yellow/black palette per the brand.

**Time:** 10 min (Claude Code does 8 min, you do 2)

**What to do**
1. Ask Claude Code: "Generate OG image for /pdf-editor/. 1200x630. Yellow background, black hard border + offset shadow, big 'PDF editor' headline, subline 'free, in your browser, no upload'. Save as pdf-editor/public/og.png and wire into pdf-editor/index.html ``<meta property='og:image'>``."
2. After CF Pages deploys, paste the URL into Slack message bar - confirm yellow card with headline renders.
3. Same check via Twitter cards validator or a draft tweet.

**Definition of done:** Pasting the URL anywhere produces a yellow card with the headline visible.

[Launch timeline](docs/launch/timeline.md)
"@ "launch,this-week,approve"

# ---- T-1 ----
New-LaunchIssue "T-1: Buy Me a Coffee link live in footer + HN account has > 0 comment karma" @"
**Why:** If launch lands and someone wants to throw `$5, the link needs to work. And HN auto-flags new accounts with 0 karma.

**Time:** 10 min

**What to do**
1. Open https://techtuate.com - footer should have a "Buy me a coffee" link to your BMaC page. Click it, verify it loads.
2. Open https://news.ycombinator.com - log in. Check karma (top right). If 1, leave 2-3 real comments on stories you genuinely have something to say about.
3. If karma is still 1 Monday night, post anyway - flag risk is real but Show HN with a real demo URL usually survives.

**Definition of done:** BMaC link works. HN karma > 1 (ideally > 5).

[Launch timeline](docs/launch/timeline.md)
"@ "launch,this-week,voice"

# ---- T-0 - the big one (post body read from disk) ----
$HnBody = Get-Content -Raw -Path "docs/launch/hn-show-hn.md"
New-LaunchIssue "T-0: Submit Show HN at Tue 2026-05-26 08:00 ET (12:00 UTC)" @"
**Why:** This is the highest-leverage 2 minutes of the entire 90-day plan.

**Time:** 2 min to submit + 4-6 hours at the keyboard for replies.

**How to submit**
1. Open https://news.ycombinator.com/submit at 07:58 ET.
2. Copy each block below into the matching field, then click Submit.

---

### Full post text, copy-paste-ready:

$HnBody

---

**After submitting:**
- See the next issue (T+0:30) for your self-comment.
- Stay at the keyboard. Replies in the first 2 hours decide whether this lives or dies.

[Launch timeline](docs/launch/timeline.md)
[Full canned reply bank](docs/launch/hn-show-hn.md)
"@ "launch,today,paste,voice"

# ---- T+0:30 ----
New-LaunchIssue "T+0:30: Reply to your own HN post with the founder context" @"
**Why:** A self-reply on Show HNs is expected and warmly received - if sincere and additive.

**Time:** 5 min to write, in your voice.

**Suggested shape (~150 words, your voice)**
- Why you built it (the SmallPDF/Adobe pricing moment)
- The architectural insight ($0/mo on CF Pages = "free forever" is believable)
- What it does NOT do (text-editing existing PDFs, OCR)
- An invite: what tool would you use next? Drop it in a GitHub issue.

**Do not**
- Re-list features (the post already did).
- Link to BMaC. The comment is context, not an ask.

[Launch timeline](docs/launch/timeline.md)
"@ "launch,today,voice"

# ---- T+2h ----
New-LaunchIssue "T+2h: Cross-post to X / BlueSky / LinkedIn (IF HN is front-page)" @"
**Why:** Compound the HN signal.

**Time:** 10 min

**Gate condition:** Only if the HN post is on the front page (top 30) at 10:00 ET Tuesday. If not, hold.

**X / BlueSky (one tweet, no thread):**
> i shipped a free PDF editor that runs entirely in your browser. no signup, no upload, your file never leaves the page. free forever because hosting it costs me `$0/mo on cloudflare pages.
>
> happening on HN right now: [link to HN thread]

**LinkedIn:**
> Shipped techtuate.com today: a PDF editor that runs 100% client-side. No backend, no upload step, no account. Free forever because static hosting on Cloudflare Pages means the marginal cost of a new user is `$0.
>
> The bet: most "free" tools are actually freemium funnels because someone has to pay for the servers. If the architecture removes the server, "free forever" becomes believable.
>
> Discussion on HN: [link]

[Launch timeline](docs/launch/timeline.md)
"@ "launch,today,voice,paste"

# ---- T+24h ----
New-LaunchIssue "T+24h: Post to r/InternetIsBeautiful (IF HN went well)" @"
**Why:** Reaches a non-developer audience that values "no signup" deeply.

**Time:** 10 min

**Gate condition:** HN finished top-30 on Day 1.

**Draft:** docs/launch/reddit-internetisbeautiful.md

**What to do**
1. Open the file. Title set; body image-friendly.
2. Submit as image post (screenshot of editor with annotations). Title verbatim. Body in first comment.
3. Reply in your voice.

[Launch timeline](docs/launch/timeline.md)
"@ "launch,this-week,paste,voice"

# ---- T+48h ----
New-LaunchIssue "T+48h: Post to r/webdev (architecture angle, IF still trending)" @"
**Why:** Dev audience cares about the engineering, not the product.

**Time:** 10 min

**Gate condition:** HN traffic still flowing 48h later, OR you have the "how I did it" story queued.

**Draft:** docs/launch/reddit-webdev.md

[Launch timeline](docs/launch/timeline.md)
"@ "launch,this-week,paste,voice"

# ---- T+7d ----
New-LaunchIssue "T+7d: HN launch retro - traffic, coffees, what next" @"
**Why:** Hit or flop? The Week 3 plan hinges on this.

**Time:** 15 min (Claude Code drafts retro, you skim and decide)

**Inputs to gather (Claude Code will pull):**
- Cloudflare Web Analytics: visits Tue-Mon, top referrers, top pages
- BMaC: total coffees in the 7 days
- HN thread: rank peak, comment count, top concerns
- GitHub: stars, forks, new issues
- Email: sponsor / press / outreach replies

**Output:**
- One paragraph: hit or flop, the evidence
- One paragraph: top 3 things to fix or amplify
- One issue per follow-up (``today`` or ``this-week`` label)

[Launch timeline](docs/launch/timeline.md)
"@ "launch,this-week"

Write-Host ""
Write-Host "Done. 8 HN launch issues created in milestone: $Milestone"
Write-Host "Open https://github.com/$Repo/milestones to see them."
