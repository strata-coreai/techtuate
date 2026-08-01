# Audio converter
slug: audio-converter
scaffold: vanilla
status: beta

## What it does
Drop one or many audio files, convert them to MP3 or WAV, trim a clip out of each, and adjust channels / sample rate, all in the browser. Files are never uploaded. Decode is whatever the browser natively supports (mp3, wav, m4a/aac, ogg, opus, flac, webm audio); encode targets are MP3 and WAV (the two formats we can do well 100% client-side without a heavy wasm codec).

## Scope note (honest limits)
- Output is MP3 + WAV only in v1. OGG/Opus/M4A/AAC encode need a wasm encoder (extra weight) and are deferred. Input decoding is wide because we lean on the browser's own decoders.
- This is the local-first sibling to the deferred video converter. No server, no key, no upload.

## UI
- Drop zone (drag / click / paste) that accepts multiple audio files.
- Per-file card: filename, duration, source format + size, and a small waveform.
- Trim: two draggable handles on the waveform plus numeric start/end (mm:ss.ms) inputs, and a "play selection" preview button. Default selection is the whole clip.
- Output controls (per batch, sensible defaults, overridable per file):
  - Format: MP3 or WAV.
  - MP3 bitrate: 128 / 192 / 256 / 320 kbps (only shown for MP3).
  - Sample rate: keep / 44100 / 48000 / 32000 / 22050 Hz.
  - Channels: keep / mono / stereo.
- "Convert all" + per-file "Download" and "Download all" buttons. Output name is `<original>-techtuate.<ext>`.
- Progress per file (encode can take a moment on long files); UI stays responsive (encode in chunks, yield to the event loop).

## Privacy story
High, and it is the whole pitch. Online converters (Zamzar, CloudConvert, Online-Audio-Converter, media.io) upload your audio to a server. For voice notes, interview recordings, unreleased music, or anything private that upload is the real cost. Here the file is decoded and re-encoded in the tab and never leaves the device.

## Libraries allowed
- MP3 encode: `@breezystack/lamejs` (maintained lamejs fork), vendored as `lib/lamejs.min.js` (IIFE build, exposes a `lamejs` global). Same-origin, no runtime CDN fetch. ~165 KB.
- WAV encode: hand-written 16-bit PCM writer (no dependency).
- Decode + resample: Web Audio API (`decodeAudioData`, `OfflineAudioContext`). No dependency.
- lamejs supported MP3 rates: 8000/11025/12000/16000/22050/24000/32000/44100/48000. If a chosen "keep" rate is outside this set for an MP3 output, resample to 44100.

## Acceptance
- Drop a 5 min MP3, trim to a 30 s clip, export MP3 320 kbps that plays in any player and matches the selection.
- Convert m4a -> mp3 and wav -> mp3 correctly (right pitch, no chipmunking = sample rate handled right).
- Mono downmix and 48000 -> 44100 resample both audibly correct.
- Convert several files in one go without freezing the tab.
- Works on mobile down to ~360 px (waveform + handles usable with touch).
- No file leaves the browser (verify: no network requests on convert).

## SEO
- title: "Free audio converter - MP3, WAV, trim audio, in your browser - techtuate"
- description: "Convert audio to MP3 or WAV and trim clips right in your browser. Files never upload. Free, no sign-up, no watermark. A private alternative to online audio converters."
- keywords: "free audio converter, convert to mp3 online, m4a to mp3, wav to mp3, trim audio online, audio converter no upload, online audio converter alternative"
- Competitor page to consider later: `/vs/cloudconvert/` or `/vs/online-audio-converter/`.

## Deferred (later waves)
- OGG/Opus and M4A/AAC encode (wasm codec).
- Volume normalize / gain, fade in-out.
- Extract-audio-from-video (belongs with the video converter once that ships).
