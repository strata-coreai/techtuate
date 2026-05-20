#!/usr/bin/env bash
#
# Seed labels + day-1 issues for the techtuate 90-day plan.
# Run once after `gh auth login`. Idempotent-ish (label creation
# is idempotent; issue creation will add duplicates if re-run).
#
# Usage:
#   cd /path/to/techtuate
#   gh auth login            # one-time
#   bash scripts/seed-issues.sh
#
# Requires the GitHub CLI: https://cli.github.com/

set -euo pipefail

# ---- repo target ----
REPO="${GH_REPO:-strata-coreai/techtuate}"

echo "Seeding labels + day-1 issues for $REPO ..."

# ---- 1. labels ----
# Priority labels (one per issue):
gh label create today      --repo "$REPO" --color FFD60A --description "Do today (< 10 min total)" --force
gh label create this-week  --repo "$REPO" --color FFF3A6 --description "Clearable any time this week" --force
gh label create waiting    --repo "$REPO" --color D0D0D0 --description "Waiting on external response" --force
gh label create decision   --repo "$REPO" --color F5C400 --description "Needs your yes/no or judgment" --force

# Type labels (zero or more per issue):
gh label create paste      --repo "$REPO" --color 0A0A0A --description "Includes exact text to paste" --force
gh label create approve    --repo "$REPO" --color 0A0A0A --description "Yes/no/edit a draft" --force
gh label create voice      --repo "$REPO" --color 0A0A0A --description "Needs to sound like you" --force
gh label create launch     --repo "$REPO" --color 0A0A0A --description "Launch-day item (HN/PH/Reddit)" --force
gh label create 2fa        --repo "$REPO" --color 0A0A0A --description "Requires a 2FA code" --force

echo "Labels created."

# ---- 2. milestones ----
# Big rocks of the 90-day plan, set due dates to roughly the right week.
gh api repos/$REPO/milestones -f title="Day 1 setup" -f state="open" \
  -f description="Foundational accounts + connections wired up" \
  -f due_on="$(date -u -d '+3 days' +%Y-%m-%dT23:59:59Z 2>/dev/null || date -u -v+3d +%Y-%m-%dT23:59:59Z)" || true
gh api repos/$REPO/milestones -f title="Week 2 - HN launch" -f state="open" \
  -f description="HN Show HN post + Reddit cross-posts" \
  -f due_on="$(date -u -d '+14 days' +%Y-%m-%dT23:59:59Z 2>/dev/null || date -u -v+14d +%Y-%m-%dT23:59:59Z)" || true
gh api repos/$REPO/milestones -f title="Day 90 - $500/mo target" -f state="open" \
  -f description="Coffees + sponsor + affiliate + YT-driven traffic" \
  -f due_on="$(date -u -d '+90 days' +%Y-%m-%dT23:59:59Z 2>/dev/null || date -u -v+90d +%Y-%m-%dT23:59:59Z)" || true

# ---- 3. issue helper ----
# Args: title, body, labels (comma-separated), milestone (string or empty)
create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  local milestone="${4:-}"
  local args=(--repo "$REPO" --title "$title" --body "$body" --label "$labels")
  if [ -n "$milestone" ]; then args+=(--milestone "$milestone"); fi
  gh issue create "${args[@]}"
}

# ---- 4. day-1 issues ----

create_issue "Install GitHub Mobile + enable push notifications for this repo" \
"**Why:** You'll get a push the moment I queue something. Mobile is the recommended interface for clearing issues in 30 sec each.

**Time:** 3 min

**What to do**
1. Install GitHub Mobile (iOS or Android).
2. Sign in with your strata-coreai account.
3. Open the techtuate repo -> tap the bell icon -> Custom -> check 'Issues'.

That's it. You'll get a push for every new issue I queue." \
"today,paste" "Day 1 setup"

create_issue "Install gh CLI on Windows + auth" \
"**Why:** Lets Claude Code create/close issues programmatically. Once-only setup.

**Time:** 5 min

**Where to go**
https://cli.github.com/

**What to do**
1. Download the Windows installer.
2. Run it.
3. Open PowerShell. Run: \`gh auth login\` -> follow prompts (GitHub.com -> HTTPS -> browser auth).
4. Verify: \`gh issue list -R strata-coreai/techtuate\` should print this list.

After this, I can manage issues from Claude Code without you doing anything." \
"today,paste" "Day 1 setup"

create_issue "Make GitHub repo public" \
"**Why:** Public repo = backlinks from GitHub for SEO, plus credibility for the HN launch.

**Time:** 30 sec

**Where to go**
https://github.com/strata-coreai/techtuate/settings

**What to do**
1. Scroll to 'Danger Zone' at the bottom.
2. Click 'Change visibility' -> 'Make public' -> confirm by typing the repo name." \
"today" "Day 1 setup"

create_issue "Verify techtuate.com in Google Search Console + submit sitemap" \
"**Why:** Without this, we get zero data on what Google queries we show up for. Day-1 foundational.

**Time:** 5 min

**Where to go**
https://search.google.com/search-console

**What to do**
1. Click 'Add property' -> 'Domain' -> paste \`techtuate.com\` -> Continue.
2. Google shows a TXT record value. Copy it.
3. Open https://dash.cloudflare.com -> techtuate.com -> DNS.
4. Add record: Type=\`TXT\`, Name=\`@\`, Content=(paste from step 2), Proxy=off.
5. Back in Search Console, click Verify. (Wait 60s + retry if first attempt fails.)
6. Once verified, left nav -> Sitemaps -> submit \`https://techtuate.com/sitemap.xml\`" \
"today,paste" "Day 1 setup"

create_issue "Sign up + verify in Bing Webmaster Tools, submit sitemap" \
"**Why:** Bing's market share is small but the data is good and submission is 2 min.

**Time:** 5 min

**Where to go**
https://www.bing.com/webmasters

**What to do**
1. Sign in with the same Google account.
2. 'Add site' -> select 'Import from Google Search Console' (fastest path).
3. Submit sitemap: \`https://techtuate.com/sitemap.xml\`" \
"today" "Day 1 setup"

create_issue "Set up Cloudflare Web Analytics + commit snippet to index.html" \
"**Why:** Need traffic data flowing on day 1 so the dashboard has real numbers.

**Time:** 5 min

**Where to go**
https://dash.cloudflare.com -> 'Web Analytics' (left nav)

**What to do**
1. Click 'Add a site' -> Manual setup -> paste \`techtuate.com\`.
2. Copy the snippet it gives you (one \`<script defer ...>\` tag).
3. Drop into Claude Code: 'Paste this Cloudflare Analytics snippet into index.html after the Placeholder comment block: <SNIPPET>'. Push to GitHub, CF Pages will redeploy.
4. After deploy, return to Web Analytics tab and click 'Done'." \
"today,paste" "Day 1 setup"

create_issue "Create Buy Me a Coffee account" \
"**Why:** Layer A of the monetization plan. Wire up by day 7 to start any coffees from early HN traffic.

**Time:** 5 min

**Where to go**
https://buymeacoffee.com/signup

**What to do**
1. Sign up with the techtuate@ Google account (or your preferred).
2. Set username to \`techtuate\` if available.
3. Skip 'perks' for now - I'll write them in a follow-up issue.
4. Note the BMC page URL - I'll wire it into the site." \
"today" "Day 1 setup"

create_issue "Create YouTube @techtuate channel + enable advanced features" \
"**Why:** Video workstream depends on the channel. Setting up early gives YouTube's algorithm time to know us.

**Time:** 10 min (includes phone verification)

**Where to go**
https://www.youtube.com/

**What to do**
1. Switch to a new Google account dedicated to techtuate (recommended) or use existing.
2. YouTube -> create channel -> name 'techtuate', handle '@techtuate' if available.
3. Channel settings -> 'Advanced features' -> verify phone (needed to upload >15 min, custom thumbnails, etc.).
4. Banner + avatar: I'll generate and queue separately." \
"this-week,2fa" "Day 1 setup"

create_issue "Sign up for ElevenLabs Starter (\$5/mo)" \
"**Why:** AI narration for the YT pipeline. Starter tier allows commercial use, which the free tier doesn't.

**Time:** 3 min

**Where to go**
https://elevenlabs.io/pricing

**What to do**
1. Sign up with the techtuate Google account.
2. Pick 'Starter' (\$5/mo).
3. Generate an API key in settings.
4. Comment on this issue with the API key (or drop into Claude Code via secret env var - tell me your preference)." \
"this-week,decision" "Day 1 setup"

create_issue "Apply to Sejda Partner Program" \
"**Why:** ~10% recurring affiliate revenue. To go on /vs/sejda/ page.

**Time:** 5 min

**Where to go**
https://www.sejda.com/affiliate-program

**What to do**
1. Fill the application form. Site: techtuate.com. Audience: people looking for free PDF tools.
2. Submit + wait for approval email (~3-7 days)." \
"this-week" "Day 1 setup"

create_issue "Apply to Adobe Affiliate Program (CJ Affiliate)" \
"**Why:** \$72 per Acrobat annual signup. Goes on /vs/adobe-acrobat/.

**Time:** 10 min

**Where to go**
https://www.cj.com/publisher-signup (CJ runs Adobe's program)

**What to do**
1. Sign up as Publisher on CJ.
2. Once approved, search advertiser 'Adobe' -> apply to the Acrobat program.
3. May take a few days to approve." \
"this-week" "Day 1 setup"

create_issue "Submit techtuate to AlternativeTo.net" \
"**Why:** Major backlink source for the SEO loop, and the page appears for 'X alternative' queries.

**Time:** 5 min

**Where to go**
https://alternativeto.net/software/new/

**What to do**
1. Sign up.
2. Submit techtuate's PDF editor as alternative to: SmallPDF, iLovePDF, Sejda, PDFescape, Adobe Acrobat (one submission, multi-tag).
3. Use the description from /free-pdf-editor/." \
"this-week" "Day 1 setup"

create_issue "DECISION: BMC perks page text - I'll draft three options" \
"**Why:** People who click 'Buy me a coffee' want to know what their \$3-5 supports. Three short copy options:

**Options**
1. **Earnest:** 'Coffees keep techtuate's domain renewed and let me ship tools faster. Every new tool here is built in evenings + weekends. Thanks for the fuel.'
2. **Funny:** 'You're keeping me caffeinated enough to keep merging your PDFs for free at 11pm. Genuinely thank you.'
3. **Minimal:** 'Helps keep techtuate free and ad-free, forever. That's it. Thank you.'

**My recommendation:** Option 3 (minimal). Matches the rest of the site's voice and doesn't over-explain.

**Reply with 1, 2, 3, or write your own.**" \
"this-week,decision" "Day 1 setup"

echo ""
echo "Done. ~13 issues seeded."
echo "Open https://github.com/$REPO/issues?q=is%3Aissue+is%3Aopen+label%3Atoday to see today's queue."
