#!/usr/bin/env bash
# Resume the techtuate issue seeding after the $5 bash-expansion error.
# Creates milestone #3 + the 12 day-1 issues. Idempotent on milestone.

set -eo pipefail   # no -u this time, so $-anything is tolerated

REPO="${GH_REPO:-strata-coreai/techtuate}"

# Milestone 3 (the one that failed)
DUE3=$(date -u -d '+90 days' +%Y-%m-%dT23:59:59Z 2>/dev/null || date -u -v+90d +%Y-%m-%dT23:59:59Z)
TITLE3='Day 90 - $500/mo target'   # single quotes - no expansion
DESC3='Coffees + sponsor + affiliate + YT-driven traffic'
gh api "repos/$REPO/milestones" \
  -f title="$TITLE3" \
  -f state='open' \
  -f description="$DESC3" \
  -f due_on="$DUE3" 2>/dev/null || echo "(milestone 3 may already exist - continuing)"

# helper
create_issue() {
  local title="$1"; local body="$2"; local labels="$3"; local milestone="${4:-}"
  local args=(--repo "$REPO" --title "$title" --body "$body" --label "$labels")
  if [ -n "$milestone" ]; then args+=(--milestone "$milestone"); fi
  gh issue create "${args[@]}"
}

create_issue 'Install GitHub Mobile + enable push notifications for this repo' \
'**Why:** You will get a push the moment I queue something. Mobile is the recommended interface for clearing issues in 30 sec each.

**Time:** 3 min

**What to do**
1. Install GitHub Mobile (iOS or Android).
2. Sign in with your strata-coreai account.
3. Open the techtuate repo -> tap the bell icon -> Custom -> check "Issues".

After this you get a push for every new issue I queue.' \
'today,paste' 'Day 1 setup'

create_issue 'Make GitHub repo public' \
'**Why:** Public repo = backlinks from GitHub for SEO, plus credibility for the HN launch.

**Time:** 30 sec

**Where to go**
https://github.com/strata-coreai/techtuate/settings

**What to do**
1. Scroll to "Danger Zone" at the bottom.
2. Click "Change visibility" -> "Make public" -> confirm by typing the repo name.' \
'today' 'Day 1 setup'

create_issue 'Verify techtuate.com in Google Search Console + submit sitemap' \
'**Why:** Without this, zero data on what Google queries we show up for. Day-1 foundational.

**Time:** 5 min

**Where to go**
https://search.google.com/search-console

**What to do**
1. Click "Add property" -> "Domain" -> paste techtuate.com -> Continue.
2. Google shows a TXT record value. Copy it.
3. Open https://dash.cloudflare.com -> techtuate.com -> DNS.
4. Add record: Type=TXT, Name=@, Content=(paste from step 2), Proxy=off.
5. Back in Search Console, click Verify. (Wait 60s + retry if first attempt fails.)
6. Once verified, left nav -> Sitemaps -> submit https://techtuate.com/sitemap.xml' \
'today,paste' 'Day 1 setup'

create_issue 'Sign up + verify in Bing Webmaster Tools, submit sitemap' \
'**Why:** Bing market share is small but the data is good and submission is 2 min.

**Time:** 5 min

**Where to go**
https://www.bing.com/webmasters

**What to do**
1. Sign in with the same Google account.
2. "Add site" -> "Import from Google Search Console" (fastest path).
3. Submit sitemap: https://techtuate.com/sitemap.xml' \
'today' 'Day 1 setup'

create_issue 'Set up Cloudflare Web Analytics + commit snippet to index.html' \
'**Why:** Need traffic data flowing on day 1 so the dashboard has real numbers.

**Time:** 5 min

**Where to go**
https://dash.cloudflare.com -> "Web Analytics" (left nav)

**What to do**
1. Click "Add a site" -> Manual setup -> paste techtuate.com.
2. Copy the snippet it gives you (one <script defer ...> tag).
3. Drop into Claude Code: "Paste this Cloudflare Analytics snippet into index.html after the Placeholder comment block: <SNIPPET>". Push to GitHub, CF Pages will redeploy.
4. After deploy, return to Web Analytics tab and click "Done".' \
'today,paste' 'Day 1 setup'

create_issue 'Create Buy Me a Coffee account' \
'**Why:** Layer A of the monetization plan. Wire up by day 7 to start any coffees from early HN traffic.

**Time:** 5 min

**Where to go**
https://buymeacoffee.com/signup

**What to do**
1. Sign up with the techtuate Google account (or your preferred).
2. Set username to "techtuate" if available.
3. Skip "perks" for now - I will write them in a follow-up issue.
4. Note the BMC page URL - I will wire it into the site.' \
'today' 'Day 1 setup'

create_issue 'Create YouTube @techtuate channel + enable advanced features' \
'**Why:** Video workstream depends on the channel. Setting up early gives YouTube algorithm time to know us.

**Time:** 10 min (includes phone verification)

**Where to go**
https://www.youtube.com/

**What to do**
1. Switch to a new Google account dedicated to techtuate (recommended) or use existing.
2. YouTube -> create channel -> name "techtuate", handle "@techtuate" if available.
3. Channel settings -> "Advanced features" -> verify phone (needed to upload >15 min, custom thumbnails, etc.).
4. Banner + avatar: I will generate and queue separately.' \
'this-week,2fa' 'Day 1 setup'

create_issue 'Sign up for ElevenLabs Starter ($5/mo)' \
'**Why:** AI narration for the YT pipeline. Starter tier allows commercial use, free tier does not.

**Time:** 3 min

**Where to go**
https://elevenlabs.io/pricing

**What to do**
1. Sign up with the techtuate Google account.
2. Pick "Starter" ($5/mo).
3. Generate an API key in settings.
4. Comment on this issue with the API key (or store as a secret env var - tell me which you prefer).' \
'this-week,decision' 'Day 1 setup'

create_issue 'Apply to Sejda Partner Program' \
'**Why:** ~10% recurring affiliate revenue. To go on /vs/sejda/ page.

**Time:** 5 min

**Where to go**
https://www.sejda.com/affiliate-program

**What to do**
1. Fill the application form. Site: techtuate.com. Audience: people looking for free PDF tools.
2. Submit + wait for approval email (~3-7 days).' \
'this-week' 'Day 1 setup'

create_issue 'Apply to Adobe Affiliate Program (CJ Affiliate)' \
'**Why:** $72 per Acrobat annual signup. Goes on /vs/adobe-acrobat/.

**Time:** 10 min

**Where to go**
https://www.cj.com/publisher-signup (CJ runs Adobe Acrobat affiliate program)

**What to do**
1. Sign up as Publisher on CJ.
2. Once approved, search advertiser "Adobe" -> apply to the Acrobat program.
3. May take a few days to approve.' \
'this-week' 'Day 1 setup'

create_issue 'Submit techtuate to AlternativeTo.net' \
'**Why:** Major backlink source for the SEO loop, and the page appears for "X alternative" queries.

**Time:** 5 min

**Where to go**
https://alternativeto.net/software/new/

**What to do**
1. Sign up.
2. Submit techtuate PDF editor as alternative to: SmallPDF, iLovePDF, Sejda, PDFescape, Adobe Acrobat (one submission, multi-tag).
3. Use the description from /free-pdf-editor/.' \
'this-week' 'Day 1 setup'

create_issue 'DECISION: BMC perks page text - three options' \
'**Why:** People who click "Buy me a coffee" want to know what their $3-5 supports. Three short copy options:

**Options**
1. **Earnest:** "Coffees keep techtuate domain renewed and let me ship tools faster. Every new tool here is built in evenings + weekends. Thanks for the fuel."
2. **Funny:** "You are keeping me caffeinated enough to keep merging your PDFs for free at 11pm. Genuinely thank you."
3. **Minimal:** "Helps keep techtuate free and ad-free, forever. That is it. Thank you."

**My recommendation:** Option 3 (minimal). Matches the rest of the site voice and does not over-explain.

**Reply with 1, 2, 3, or write your own.**' \
'this-week,decision' 'Day 1 setup'

echo ""
echo "Done. 12 issues created."
echo "View today's queue: https://github.com/$REPO/issues?q=is%3Aissue+is%3Aopen+label%3Atoday"
