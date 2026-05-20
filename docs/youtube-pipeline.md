# techtuate YouTube pipeline

A repeatable system for turning every new tool into a 2-3 min how-to video + a 60-sec short, with AI narration, that you can record in ~10 min and we publish weekly.

## The loop (per video)

1. **I write the script** (1 page, timestamped, with screen actions called out).
2. **I write the recording instructions** (exact clicks, the order, what to highlight).
3. **You record screen** for ~5-8 min (no voice). OBS, QuickTime, or built-in Windows Game Bar all work.
4. **You drop the raw screen recording** in `youtube/raw/` in the repo (or a Dropbox/Drive folder).
5. **I generate narration** via ElevenLabs API, time-aligned to the script. Output a single audio file.
6. **You (or I via a small script) muxes audio + video** in CapCut, DaVinci Resolve, or one-click via FFmpeg if you want fully automated. ~3 min on your end if it's manual.
7. **I generate the thumbnail** (SVG/PNG, palette-matched).
8. **You upload to YouTube** (title, description, tags I prep).
9. **I clip the same video into a 60-sec short** for YouTube Shorts.

**Your time per video: ~10 min total.** Recording + upload. Everything else is me.

## Cadence

- **1 long video per week** (each new tool's how-to).
- **1 short per week** (clipped from the long one or a standalone "did you know" hook).
- **1 comparison video per month** ("techtuate vs SmallPDF: same task, no upload").
- **1 build-in-public video per month** ("how I built a free PDF editor that costs $0/mo to run").

Total: ~6 pieces of YouTube content per month after we're warmed up.

## Script template

Every long-form video follows:

| Time | Beat | Why |
|---|---|---|
| 0-5s | **Hook** ("Stop paying $9/mo to merge two PDFs") | If you don't grab them in 5s they're gone |
| 5-20s | **Agitate** (show paywall, sign-up gate, watermark on competitor) | Make the pain visceral |
| 20-30s | **Solution intro** ("techtuate does this for free, in your browser, no upload") | The promise |
| 30-150s | **Demo** (the actual tool, screen capture) | The proof |
| 150-170s | **Why this is possible** ("no server = no cost = no paywall") | Differentiation |
| 170-180s | **CTA** ("link in description, free forever, share with one friend") | The ask |

Shorts collapse this to:
- 0-3s: hook
- 3-50s: speed demo
- 50-60s: "free, no signup, link in bio"

## Recording instructions format

Per video, I'll write something like:

```
RECORDING SCRIPT FOR: pdf-editor-merge-howto.mp4

1. Open Chrome in a clean profile (no extensions visible).
2. Maximize to 1920x1080.
3. Navigate to techtuate.com - hold for 2 seconds.
4. Click "PDF editor" card.
5. Hold for 1 second on the empty state.
6. Open a Finder window with 2 PDFs visible.
7. Drag the first PDF into the drop zone. Wait for render.
8. ...
```

You follow the numbered list, no voice, no editing. Stop recording. Drop file. I do the rest.

## Tools you need (one-time setup)

| Item | Free option | Paid option (if you want it) |
|---|---|---|
| Screen recording | Windows Game Bar (Win + G) or OBS Studio | Loom Pro ($15/mo, adds polish) |
| Video editor (if muxing manually) | CapCut (free, great), DaVinci Resolve (free, pro-grade) | Adobe Premiere ($23/mo) |
| AI narration | ElevenLabs free tier (10K chars/mo, **non-commercial only**) | ElevenLabs Starter ($5/mo, commercial) - **required for YouTube monetization** |
| Thumbnail | I generate SVG; you can upload as-is | Canva (free) for tweaks |
| Upload | YouTube Studio (free) | - |

**Minimum monthly cost: $5/mo (ElevenLabs Starter).** Could go fully free with manual TTS (worse quality).

## YouTube channel setup (one-time, ~30 min you-time)

You'll need to:

- [ ] Create YouTube account `@techtuate` (use the techtuate Google account, not personal).
- [ ] Set channel art (I'll provide a banner PNG matching the palette).
- [ ] Set channel description (I'll write).
- [ ] Add channel links to techtuate.com, GitHub, BMC.
- [ ] Set default thumbnails template (I'll provide).
- [ ] Enable "advanced features" (needs phone verification, ~2 min).
- [ ] Sign up for ElevenLabs Starter ($5/mo).

## What I do per video

- Write the script (English, ~300 words for a 3-min video).
- Write the recording instructions (numbered list of exact actions).
- Generate AI narration via ElevenLabs (I'll use a consistent voice across all videos so we have an audio brand - probably "Adam" or "Brian" who sound conversational, not stiff).
- Time-align narration to your screen capture (this is the only non-trivial step - I'll either provide an FFmpeg command or do it inside an editing template you can open).
- Generate thumbnail.
- Write title, description, tags, end-screen text.
- Clip the short.
- Add captions / subtitles (auto-generated, then corrected).
- Write the comment for your pinned reply ("link to free tool here", "answers to common questions").

## Revenue model for YouTube specifically

Direct (slow):
- YouTube Partner Program kicks in at 1,000 subs + 4,000 watch hours.
- Even after that, niche tech tutorials make ~$1-3 per 1,000 views.
- Realistic by month 6: maybe $20-50/mo in YT ad revenue.

Indirect (fast, this is the real win):
- Each video drives viewers to techtuate.com.
- Even modest YouTube traffic (1,000 views per video = 200-300 site clicks) compounds.
- Videos appear in Google's video search results (a separate SERP from regular search) - new domain still ranks here much faster.
- Perplexity, ChatGPT, and Gemini cite YouTube transcripts. So videos = AI discoverability.

**Conservative model for $500/mo by day 90:**
- $150/mo from coffees (~5K monthly site visitors at 1% conversion at $3 avg)
- $100/mo from one sponsor
- $100/mo from affiliate links on /vs/ pages
- $50/mo from YouTube ad rev (very rough, may be $0 in 90 days if not monetized yet)
- $100/mo from YouTube-driven coffees + affiliate clicks (counted separately for tracking)
- = $500/mo total

If YouTube takes off (one viral short can do 100K views easily), the cap on this is much higher - $2K+/mo is realistic by month 6.

## What I need from you to start

When the channel is set up, just record one thing: a 2-min "tour of techtuate" video to be the channel's intro. I'll write the script. You record. We use that to test the whole pipeline end-to-end before doing per-tool videos.
