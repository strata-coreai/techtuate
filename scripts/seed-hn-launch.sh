#!/usr/bin/env bash
#
# Seed the HN launch timeline as GitHub issues.
# Pinned date: Tuesday 2026-05-26, 08:00 ET (12:00 UTC).
#
# Usage:
#   cd /path/to/techtuate
#   bash scripts/seed-hn-launch.sh
#
# Idempotent-ish: re-running will create duplicate issues. Run once.

set -eo pipefail

REPO="${GH_REPO:-strata-coreai/techtuate}"
MILESTONE="Week 2 - HN launch"

echo "Seeding HN launch timeline for $REPO ..."

# ---- helper ----
create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels" --milestone "$MILESTONE"
}

# ---- T-3: Sat 2026-05-23 pre-flight walkthrough ----
create_issue "T-3: Pre-flight - walk the PDF editor end-to-end on phone + desktop" \
'**Why:** The HN front page is unforgiving. A broken Save button on iOS Safari at 09:00 ET Tuesday is the failure mode. Catch it now.

**Time:** 15 min

**What to do**
1. On your phone, open https://techtuate.com/pdf-editor/ . Drop in a real PDF (multi-page if you have one).
2. Try each tool: annotate, reorder pages, merge in another PDF, build PDF from images, fill a form, save.
3. Repeat on desktop in Chrome AND in Safari (iCloud + macOS Safari are HN-heavy).
4. If anything is broken, file a separate issue with the `today` label and a screenshot. Fix or back out before Tuesday.

**Definition of done:** Every feature works on iOS Safari + macOS Safari + Chrome desktop. Save produces a valid PDF.

[Launch timeline](docs/launch/timeline.md)' \
  "launch,this-week,voice"

# ---- T-2: Sun 2026-05-24 OG image + share preview ----
create_issue "T-2: Generate OG image for /pdf-editor/ + verify Twitter/Slack share preview" \
'**Why:** HN comments and replies on X get expanded with the OG image. Without one, the link looks like spam. Yellow/black palette per the brand.

**Time:** 10 min (Claude Code does 8 min, you do 2)

**What to do**
1. Ask Claude Code in your editor: "Generate OG image for /pdf-editor/. 1200x630. Yellow background, black hard border + offset shadow, big "PDF editor" headline, subline "free, in your browser, no upload". Save as pdf-editor/public/og.png and wire into pdf-editor/index.html `<meta property="og:image">`."
2. After it ships and CF Pages deploys, paste https://techtuate.com/pdf-editor/ into the Slack message bar (do not send) - it will render the unfurl. Confirm yellow + headline visible.
3. Same check on Twitter/X via https://cards-dev.twitter.com/validator if youre still using it, or just paste into a draft tweet.

**Definition of done:** Pasting the URL anywhere produces a yellow card with the headline visible.

[Launch timeline](docs/launch/timeline.md)' \
  "launch,this-week,approve"

# ---- T-1: Mon 2026-05-25 ----
create_issue "T-1: Buy Me a Coffee link live in footer + HN account has > 0 comment karma" \
'**Why:** If launch lands and someone wants to throw $5, the link needs to work. And HN auto-flags new accounts with 0 karma - need at least a few comment posts before the Show HN.

**Time:** 10 min

**What to do**
1. Open https://techtuate.com - footer should have a "Buy me a coffee" link to your BMaC page. Click it, verify it loads your page, not a 404.
2. Open https://news.ycombinator.com - log in. Check your karma score (top right). If 1, leave a real, additive comment on 2-3 stories youd actually have something to say about. Wait at least 4 hours for the karma to be visible (HN delays it for newer accounts).
3. If karma is still 1 Monday night, post anyway - flag risk is real but Show HN with a real demo URL usually survives.

**Definition of done:** BMaC link works. HN karma > 1 (ideally > 5).

[Launch timeline](docs/launch/timeline.md)' \
  "launch,this-week,voice"

# ---- T-0: Tue 2026-05-26 08:00 ET - the big one ----
# Embed the post text inline so you can copy from mobile.
HN_BODY=$(cat docs/launch/hn-show-hn.md)
create_issue "T-0: Submit Show HN at Tue 2026-05-26 08:00 ET (12:00 UTC)" \
"**Why:** This is the highest-leverage 2 minutes of the entire 90-day plan.

**Time:** 2 min to submit + 4-6 hours at the keyboard for replies.

**How to submit**
1. Open https://news.ycombinator.com/submit at 07:58 ET.
2. Copy each block below into the matching field, then click Submit.

---

### Below is the full post text, copy-paste-ready:

$HN_BODY

---

**After submitting:**
- Pin this issue's URL or the HN thread URL somewhere you can paste from quickly.
- See the next issue (T+0:30) for your follow-up self-comment.
- Stay at the keyboard. Replies in the first 2 hours decide whether this lives or dies.

[Launch timeline](docs/launch/timeline.md)
[Full canned reply bank](docs/launch/hn-show-hn.md)" \
  "launch,today,paste,voice"

# ---- T+0:30 self-comment ----
create_issue "T+0:30: Reply to your own HN post with the founder context" \
'**Why:** A self-reply on Show HNs is expected and warmly received - if it is sincere and adds context the link does not. People are looking for the why behind the thing.

**Time:** 5 min to write, in your voice, before submitting.

**Suggested shape (~150 words, your voice, no marketing speak)**
- Why you built it (the SmallPDF/Adobe pricing moment, the "I paid $9 to merge two PDFs" annoyance)
- The architectural insight that makes "free forever" possible ($0/mo hosting on CF Pages, no backend cost to scale)
- What it does NOT do (text-editing existing PDFs, OCR) - signaling honesty
- An invite: what tool would you use next, drop it in a GitHub issue

**Do not**
- Re-list features (the post already did).
- Link to BMaC. The comment is context, not an ask.

[Launch timeline](docs/launch/timeline.md)' \
  "launch,today,voice"

# ---- T+2h cross-post ----
create_issue "T+2h: Cross-post to X / BlueSky / LinkedIn (IF HN is front-page)" \
'**Why:** Compound the HN signal. Front-page HN posts get amplified hard on dev Twitter/BlueSky when there is a story to link to.

**Time:** 10 min

**Gate condition - only do this if:**
- The HN post is on the front page (top 30) at 10:00 ET Tuesday.

If it is not, hold. A flat HN post + a flat X post is two flat posts. Save the cross-post for the next launch.

**Templates** (claude code will draft fresh versions on request; rough shape below)

**X / BlueSky (one tweet, no thread):**
> i shipped a free PDF editor that runs entirely in your browser. no signup, no upload, your file never leaves the page. free forever because hosting it costs me $0/mo on cloudflare pages.
>
> happening on HN right now: [link to HN thread]

**LinkedIn (a touch more professional, mentions the architecture):**
> Shipped techtuate.com today: a PDF editor that runs 100% client-side. No backend, no upload step, no account. Free forever because static hosting on Cloudflare Pages means the marginal cost of a new user is $0.
>
> The bet: most "free" tools are actually freemium funnels because someone has to pay for the servers. If the architecture removes the server, "free forever" becomes a believable promise.
>
> Discussion on HN: [link]

[Launch timeline](docs/launch/timeline.md)' \
  "launch,today,voice,paste"

# ---- T+24h r/IIB ----
create_issue "T+24h: Post to r/InternetIsBeautiful (IF HN went well)" \
'**Why:** Reaches a non-developer audience that values "no signup" deeply. Different from HN: tone is less technical, image-friendly.

**Time:** 10 min

**Gate condition:** Only do this if the HN post finished top-30 on Day 1.

**Where to find the draft:** docs/launch/reddit-internetisbeautiful.md

**What to do**
1. Open the file. Title is set; body is image-friendly variant.
2. Submit to r/InternetIsBeautiful via image post (screenshot of the editor with annotations on screen). Title verbatim. Body in first comment.
3. Reply in your voice as comments come in.

[Launch timeline](docs/launch/timeline.md)' \
  "launch,this-week,paste,voice"

# ---- T+48h r/webdev ----
create_issue "T+48h: Post to r/webdev (architecture angle, IF still trending)" \
'**Why:** Dev audience cares about the engineering, not the product. Different pitch - "I host a PDF editor for $0/mo on Cloudflare Pages, here is how."

**Time:** 10 min

**Gate condition:** HN traffic is still flowing 48h later, OR you have a "how I did it" story to back the post.

**Where to find the draft:** docs/launch/reddit-webdev.md

[Launch timeline](docs/launch/timeline.md)' \
  "launch,this-week,paste,voice"

# ---- T+7d retro ----
create_issue "T+7d: HN launch retro - traffic, coffees, what next" \
'**Why:** Was the launch a hit or a flop? The Week 3 plan (next tool ship + posting cadence) hinges on this answer.

**Time:** 15 min (Claude Code drafts the retro, you skim and decide)

**Inputs to gather (Claude Code will pull these):**
- Cloudflare Web Analytics: visits Tue-Mon, top referrers, top pages
- BMaC: total coffees in the 7 days
- HN thread: rank peak, final comment count, top concerns in replies
- GitHub: stars, forks, new issues
- Email: any sponsor / press / outreach replies

**Output:**
- One paragraph: hit or flop, the evidence
- One paragraph: top 3 things to fix or amplify
- One issue per follow-up (with `today` or `this-week` label)

[Launch timeline](docs/launch/timeline.md)' \
  "launch,this-week"

echo
echo "Done. 8 HN launch issues created in milestone: $MILESTONE"
echo "Open https://github.com/$REPO/milestone -> Week 2 - HN launch to see them."
