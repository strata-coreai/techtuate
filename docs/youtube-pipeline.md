# techtuate YouTube pipeline

A repeatable system for turning every new tool into a 2-3 min how-to video + a 60-sec short, with AI narration, that you can record in ~10 min and we publish weekly.

## Why Google Vids over raw Veo

Google Vids (part of Workspace / Google AI Pro) is purpose-built for this exact workflow: drop in a screen recording, paste a script as scenes, Vids generates narration via Gemini and overlays a talking-head avatar. Veo alone is text-to-video; Vids is "video editor with AI." Use Vids; you already pay for it.

## The loop (per video)

1. **I write the script** (1 page, timestamped, with screen actions called out).
2. **I write the recording instructions** (exact clicks, the order, what to highlight).
3. **I write the Vids script** (one paragraph per scene, with timing markers tied to the screen recording, plus the avatar style + voice tone to set once for the channel).
4. **You record screen** for ~5-8 min (no voice). OBS, QuickTime, or built-in Windows Game Bar all work.
5. **You upload the raw recording into Google Vids + paste my script as the scene narration.** Vids generates narration with the consistent voice + drops in the talking-head avatar overlay.
6. **You download the finished video.** No mux step.
7. **I generate the thumbnail** (SVG/PNG, palette-matched).
8. **You upload to YouTube** (title, description, tags I prep).
9. **I clip the same video into a 60-sec short** for YouTube Shorts.

Fallback if Vids doesn't handle a specific edit: drop the exported Vids video into CapCut, add the missing element, re-export (~2 min). Rarely needed.

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
| Narration + avatar | **Google Vids** via your existing Google AI Pro / Workspace ($0 incremental) | Synthesia / HeyGen ($24+/mo) - skip, Vids handles it |
| Thumbnail | I generate SVG; you can upload as-is | Canva (free) for tweaks |
| Upload | YouTube Studio (free) | - |

**Minimum monthly cost: $0.** Everything runs through your existing Google AI Pro. No API keys, no extra subscriptions.

## YouTube channel setup (one-time, ~30 min you-time)

You'll need to:

- [ ] Create YouTube account `@techtuate` (use the techtuate Google account, not personal).
- [ ] Set channel art (I'll provide a banner PNG matching the palette).
- [ ] Set channel description (I'll write).
- [ ] Add channel links to techtuate.com, GitHub, BMC.
- [ ] Set default thumbnails template (I'll provide).
- [ ] Enable "advanced features" (needs phone verification, ~2 min).
- [ ] (Skipping - using Google AI Pro you already have for narration + avatar.)
- [ ] **On the test video: lock the avatar look + voice.** Save the Veo prompt that produced it as the canonical brand prompt - reuse on every subsequent video so the channel feels consistent.

## What I do per video

- Write the script (English, ~300 words for a 3-min video).
- Write the recording instructions (numbered list of exact actions).
- Write the Google Vids script: one paragraph per scene, timing markers tied to your screen recording, avatar + voice style spec (locked on the first video, reused after).
- Generate the thumbnail (SVG/PNG, palette-matched).
- Write title, description, tags, end-screen text.
- Specify the 60-sec short clip points (which seconds of the long video to extract).
- Write the pinned-reply comment for your channel.

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
