# techtuate dashboard system

How daily tasks get from me to you in a form you can clear in < 10 min.

## The recommendation: GitHub Issues + daily markdown summary

**Primary interface: GitHub Issues** on the techtuate repo. Each task is an issue. You see them in the GitHub mobile app or web. You close as you finish, comment if you have a question.

**Daily context: `docs/dashboard/YYYY-MM-DD.md`** committed at the start of each session. Read-only summary. Tells you why each issue exists, what's happening this week, scoreboard.

## Why this design (and not Slack, not a custom webapp)

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **GitHub Issues + MD** | Free, you already use it, mobile app is great, versioned, notifications via push, I can open/close programmatically with `gh` CLI, labels for filtering | Less "real-time chat" feel | **Recommended** |
| Slack | Familiar chat UX, threads for decisions, mobile push | Requires workspace setup, $7/mo for non-trivial use, harder to version task history, AI agents in Slack still kludgy | Backup option |
| Custom dashboard webpage | Pretty, branded, fully tailored | Yet another thing to maintain, no notifications, you have to remember to check it | Skip |
| Notion | Nice UI for cards | Free tier is fine, but I can't update programmatically as cleanly as GitHub | Skip |
| Daily email | Zero new tools | No state, no checking off, you'd lose actions | Skip |

If you'd prefer Slack, that's fine - I'll set it up. But GitHub is the lower-friction default.

## Label system on GitHub Issues

Each issue gets exactly 1 priority + 0 to 2 type labels.

**Priority (one of):**
- `today` - do today, < 10 min total across all today-issues
- `this-week` - clearable any time this week
- `waiting` - I'm waiting for an external response (sponsor, partner application, etc.) - FYI only
- `decision` - needs your yes/no/judgment, not a click

**Type (zero or more):**
- `paste` - includes exact text to paste somewhere
- `approve` - just say yes/no/edit
- `voice` - needs to sound like you (rewrite if needed)
- `launch` - it's a launch-day item (HN/PH/Reddit submission)
- `2fa` - requires you to type a 2FA code

## What an issue looks like

Each issue is short enough to handle on phone. Body has 5 sections:

```
**Why this matters**
One sentence.

**Time estimate**
30 sec / 2 min / 5 min

**Where to go**
URL.

**What to do**
Numbered steps if more than one. Otherwise one line.

**What to paste (if any)**
Exact text in a code block. Tap to copy on mobile.
```

That's it. Bottom of the issue has a checkbox: `- [ ] Done` or a comment field for "blocked because X".

## A real example

If I queued the Google Search Console verification task today, it'd look like:

```
title: Verify techtuate.com in Google Search Console (5 min, one-time)
labels: today, paste

**Why this matters**
Without this, we get zero data on which Google queries our pages show up for. Day 1 setup.

**Time estimate**
5 min

**Where to go**
https://search.google.com/search-console (already logged into your Google account in this Chrome session)

**What to do**
1. Click "Add property" -> "Domain" -> paste `techtuate.com` -> Continue.
2. Google shows you a TXT record. Copy the value (looks like `google-site-verification=abc123...`).
3. Open https://dash.cloudflare.com -> techtuate.com -> DNS.
4. Add Record: Type=TXT, Name=@, Content=(paste from step 2). Proxy=Off. TTL=Auto.
5. Back to Search Console tab, click Verify. (Or wait 60s and click again if first attempt fails.)
6. Once verified, click "Sitemaps" in the left nav and submit: `https://techtuate.com/sitemap.xml`

**What to paste**
TXT record name: `@`
(Content is the value Google gives you in step 2 - I can't pre-fill that.)

- [ ] Done
```

10 min sessions can usually clear 2-4 of these.

## How I generate issues

When I have Chrome access, I can:
- Open issues via `gh` CLI from Claude Code (or `mcp__github__create_issue` if we wire that MCP).
- Add labels, set assignees, set milestones.
- Close my own queued issues when I finish a multi-step task on your behalf (e.g., I do the directory submissions, I close those issues myself).
- Comment on issues with status updates ("approved your draft, posting in 5 min").

## How you interact

- **Morning:** push notification from GitHub mobile when I post the day's issues.
- **Open the techtuate repo "Issues" tab,** filter by `today` label.
- **Work top-down:** each one is < 5 min, most are 30 sec.
- **Tap "Close issue"** as you finish each.
- **Reply with a comment** if you have a question or need to defer ("can't do today, push to Wednesday").
- **Decisions:** I'll @-mention you. You reply with `1`, `2`, or sentence.

## Bigger context (the daily MD)

For the days you want context beyond just "what to do":
- `docs/dashboard/YYYY-MM-DD.md` is a one-page summary committed at start of session.
- Scoreboard at top (visitors, coffees, queries).
- "What I did yesterday."
- This-week progress vs plan.
- Risks / flags.

You don't need to read this every day. Read on Sundays for the week ahead, or whenever something feels off and you want context.

## If you want Slack instead

Tell me which workspace + channel and I'll:
- Daily summary as a top-level message.
- Each action item as a separate message with a 1/2/3 emoji vote for decisions.
- Threads for back-and-forth on complex items.
- Same labels concept as GitHub, just emoji-based: 🔴 today, 🟡 this-week, ⚪ waiting, 🟣 decision.

Setup needs Slack workspace + me added to the channel (or webhook permission).

## What the first week's dashboard looks like

Day 1 will probably have 4-6 issues, ~30 min of your time (because account setup). After day 1, expect 2-3 issues/day, average 7 min.

I'll mock up day 1 next session so you can see it concretely.
