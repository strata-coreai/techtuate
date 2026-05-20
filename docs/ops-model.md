# techtuate ops model: 10 minutes of you, the rest of me

How this site gets to its goals with ~10 min/day of your time and a Chrome session I can drive.

## The deal

- **You:** ~10 min/day skimming the dashboard, approving 1-3 queued actions, deciding 0-2 multiple-choice questions. Total: ~70 min/week. The one exception is HN launch day (~3 hrs).
- **Me:** Everything else. Code, copy, browser navigation, analytics, outreach drafts, dashboards, weekly reviews.

## Why this works

The bottleneck on a project like this isn't volume of work - it's how much human-bandwidth each piece of work demands. The slow expensive things are: account creation (one-time), HN comment replies (in your voice, but brief), and judgment calls. Almost everything else is mechanical clicking.

With your Chrome session open and accounts logged in, I can do the mechanical clicking. With clear queued drafts, you can knock out the voice work in 30 sec apiece.

## What I can do with Chrome access

Once each service is logged in once (you handle that initial login + any 2FA), I can navigate it on subsequent sessions.

**Setup, monitoring, submission tasks (I do solo):**
- Google Search Console: submit sitemap, request reindex, check queries, export reports.
- Bing Webmaster Tools.
- Cloudflare dashboard: monitor analytics, manage DNS, paste snippets.
- GitHub: settings, releases, issue replies, social preview, topics.
- Buy Me a Coffee: page setup, perk configuration.
- Product Hunt: listing prep, screenshot uploads, scheduling.
- Directory submissions (~20 sites): alternativeto, toolify, futuretools, etc.
- Newsletter submission forms: TLDR, Hacker Newsletter, Console, Pointer.
- Affiliate program applications: Sejda Partner, Adobe Affiliate (CJ).
- Cloudflare Email Routing.
- Web analytics dashboards across all services.

**Content tasks (I do solo):**
- Every line of code (via Claude Code).
- Every marketing page, comparison page, article.
- Every social post draft.
- Every sponsor outreach email draft.
- Every HN/Reddit/PH post body.
- Daily dashboard generation.
- Weekly metrics review write-up.

## What still requires you (after Chrome is set up)

These cannot be automated. The good news: each is < 5 min when it happens.

| Task | Frequency | Time per | Notes |
|---|---|---|---|
| Skim dashboard | Daily | 5-10 min | Most of your weekly budget |
| Approve 1-2 queued actions | Daily | 2 min | "Yes / No / change to X" |
| Paste HN/Reddit/social post when I've drafted it | Launch days only | 30 sec each | I draft 1-3 a week max |
| HN launch day - reply to comments in your voice | Once in 90 days | 2-4 hrs | The single biggest human-time block |
| Sponsor email replies in your voice | Maybe 5-10x in 90 days | 1-2 min each | I draft, you tweak + send |
| 2FA codes | First login per service | 10 sec | One-time per account |
| Yes/no on judgment calls | A few per week | 30 sec each | I always include my recommendation |
| Make GitHub repo public | One-time | 30 sec | First-week setup |

## Day-one setup (the only "big" day for you)

**~30-60 minutes, one-time, before regular ops start.**

The first time we open Chrome together, you'll spend 30-60 min logging into each service once. Save passwords in Chrome's password manager so future sessions don't re-prompt. After that, I have access and you don't need to log in again unless 2FA expires.

Services to log in to (rough order of urgency):

1. **Google Search Console** (cloudflare DNS auto-handles verification - 5 min)
2. **Bing Webmaster Tools** (import from GSC - 2 min)
3. **Cloudflare** (dashboard - probably already logged in)
4. **GitHub** (settings panel - 2 min)
5. **Buy Me a Coffee** (sign up first - 5 min)
6. **Product Hunt** (sign up if needed - 3 min)
7. **Hacker News** (existing account preferred - if you don't have one with karma, your launch will be harder)
8. **Reddit** (existing account with some karma in /r/programming or similar)
9. **X / BlueSky / LinkedIn** (each one - 2 min)
10. **Sejda Partner** + **Adobe Affiliate (CJ)** (sign up - 10 min)

You also tell me which email address to use for "from" on outreach. I'll never send from an account without telling you first.

## Anti-goals (what I won't do without you)

To avoid surprises:

- **Never post anything publicly in your name** without you reviewing the exact text first. Even on social, even if it's tiny.
- **Never reply in your voice to a thread** without your approval. Drafted, queued, but not sent.
- **Never apply for a sponsorship that names a dollar figure** without you approving the figure.
- **Never sign anything** (TOS for new services count if they involve a billing relationship).
- **Never change palette / hard-constraints stuff** (em-dashes, no-ads, etc.) without asking.

## The dashboard

See `docs/dashboard/TEMPLATE.md`. Each day's actual dashboard is generated as `docs/dashboard/YYYY-MM-DD.md` (so you have a versioned trail).

Three formats depending on the day:
- **Quiet day** (~5 min for you): scoreboard, "I did these things yesterday", "no action needed today".
- **Normal day** (~10 min for you): scoreboard + 1-3 queued actions + 0-1 decisions.
- **Big day** (HN launch / sponsor signed / something material): the dashboard says so up top + we agree the time.

## Cadence

- **Daily:** dashboard at start of session, you skim, act, done.
- **Weekly (Sundays):** I generate a 7-day rollup with what's working and what's not. You read but no action required.
- **Monthly:** strategic review with proposed changes to the plan. ~15 min for you.

## Where this could fail

Honest list:

1. **You skip the dashboard for 5+ days.** Things keep happening (I can keep clicking on autopilot), but decisions queue up and your sense of control erodes. Mitigation: I'll email you (via the dashboard system) if anything truly blocks for >48 hrs.
2. **HN launch day where you're not available.** This is the only true exception to "10 min/day." If you can't spare ~3 hrs that day, we delay. The launch fails without a present founder voice.
3. **A sponsor wants a real-time meeting.** That's a you-thing. ~30 min each.
4. **Anything legal** - contracts, privacy policy edits if regulations change. You handle, with my drafts as input.

## How we start

Three options for the first Chrome session. Pick one:

1. **The full setup pass.** 30-60 min together, get all the accounts logged in, kick off the SEO + analytics workstreams immediately.
2. **A small wedge - GSC + Cloudflare Analytics only.** 10 min, just gets us measurement working so the dashboard has real numbers from day one. Rest of accounts later.
3. **Don't open Chrome yet, just keep shipping tools via Claude Code.** Defensible if you want to wait until the new machine arrives.

My recommendation: (2) immediately, (1) on the new machine when it arrives.
