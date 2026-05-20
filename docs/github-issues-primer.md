# GitHub Issues for techtuate (90-second primer)

You haven't used Issues before. Good news: for this use case, you only need to understand five things. Total reading time: 90 seconds.

## What Issues are (conceptually)

A GitHub "Issue" is just a task with a title, description, labels, and a "Close" button. There's nothing special about them - they're functionally identical to a to-do item in any app you've used, except they live in your repo, are versioned, and have notifications.

I use them as your daily task list. You use them by opening the GitHub mobile app, tapping each one, and closing it when done.

## The five things to know

### 1. Where they live

In your browser: `https://github.com/strata-coreai/techtuate/issues`

In the GitHub mobile app: Open the app -> tap the techtuate repo -> tap "Issues" tab.

The mobile app is the recommended interface. It's free, push notifications work, and the UI is built for exactly this workflow.

### 2. The label filters that matter

I'll tag every issue with one priority label. On mobile or web, tap "Labels" and filter to:

- **`today`** -> shows what to do in the next 10 minutes
- **`this-week`** -> clearable anytime in the week, no urgency
- **`waiting`** -> FYI only. I'm waiting for an external response (sponsor reply, partner application). You can read or skip.
- **`decision`** -> I need a yes/no/judgment call from you, not a click

Most days you'll only look at `today`.

### 3. How to "do" an issue

Each issue body has:
- One sentence on why it matters
- A URL to go to
- Numbered steps
- Paste text if needed (in a code block, tap to copy on mobile)

You follow the steps. Done.

### 4. How to mark it done

Scroll to the bottom of the issue, tap **"Close"**. That's it.

If you want to leave a note ("done, FYI the form looks different now"), type a comment first, then close.

### 5. How to push back / defer

Tap **"Comment"**, type a sentence:
- "Can't do today, push to Friday" -> I'll relabel and reschedule.
- "This URL is broken, current link is X" -> I'll fix.
- "Don't want to do this at all" -> I'll close and adjust the plan.
- For `decision` issues, just reply with `1`, `2`, etc. matching the options I listed.

Don't worry about syntax. Plain English. I parse it.

## What an issue actually looks like

Here's a real day-1 task as it'll appear in the mobile app:

> **#3 - Verify techtuate.com in Google Search Console**
> *Labels: today, paste*
> 
> **Why this matters**
> Without this, zero data on what queries Google shows our pages for. Day-1 setup.
> 
> **Time:** 5 min
> 
> **Where to go**
> https://search.google.com/search-console
> 
> **What to do**
> 1. Click "Add property" -> "Domain" -> paste `techtuate.com` -> Continue.
> 2. Google shows a TXT record value. Copy it.
> 3. Open https://dash.cloudflare.com -> techtuate.com -> DNS.
> 4. Add record: Type=`TXT`, Name=`@`, Content=(paste from step 2), Proxy=off.
> 5. Back in Search Console, click Verify.
> 6. Once verified, click "Sitemaps" -> submit `https://techtuate.com/sitemap.xml`
> 
> [Close]   [Comment]

Tap Close when you finish step 6. That's the whole interaction.

## Your daily rhythm

Morning (or whenever):
1. **Push notification** from GitHub mobile -> "3 new issues from claude-code".
2. Open app -> tap "Issues" tab -> filter `today`.
3. Work top-down. Most issues are 30 sec to 2 min. Total session: ~10 min.
4. Tap Close as you finish each.
5. Done. Phone away.

If you skip a day, the `today` filter just shows more items the next day. No catch-up shame.

## What I do on the back end

You won't see these, but FYI:
- I create issues with labels at the start of each session.
- I close issues I complete myself (e.g., directory submissions, dashboard generation, draft writing).
- I post status comments on long-running issues ("approved your draft, scheduling for 8am Tuesday").
- I create `decision` issues with multiple-choice options when I need your judgment.
- I close stale `waiting` issues when responses come in.

## One-time setup you need (~5 min, one time)

Before we can use this, you'll need:

1. **Install GitHub Mobile** (iOS or Android, free).
2. **Sign in** with your `strata-coreai` GitHub account.
3. **Enable push notifications** for the techtuate repo (Settings -> Notifications -> Watch -> Custom -> Issues).
4. (Optional but recommended) **Install `gh` CLI** on your laptop so Claude Code can create issues programmatically: https://cli.github.com/ -> download installer -> run -> `gh auth login` (one-time).

After that, you're set.

## What about the daily markdown summary?

For days you want context (Sundays, or when something feels off), `docs/dashboard/YYYY-MM-DD.md` has the scoreboard, yesterday's actions, this-week progress vs plan. You don't need to read it daily. It's the longer-form companion to the issue list.

## Now what?

Once you've installed the mobile app and `gh` CLI:
1. Run `bash scripts/seed-issues.sh` (or via Claude Code) from the repo root. This creates the labels + day-1 issues in one shot.
2. Open the mobile app. You'll see ~12 issues tagged `today` and `this-week`.
3. Start with `today`. Clear in ~30 min (because day 1 is bigger than usual).
4. From day 2 onward: 10 min/day.

Want me to prep the seed script now so it's ready when you are?
