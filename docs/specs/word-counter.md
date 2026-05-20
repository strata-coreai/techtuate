# Word counter
slug: word-counter
scaffold: vanilla
status: live

## What it does
Paste or type text, see live counts: characters, words, sentences, paragraphs, reading time, speaking time.

## UI
- Big textarea, autofocused, takes up most of the viewport.
- Stats bar above or below the textarea, updating live (debounce 50 ms):
  - Characters (with and without spaces)
  - Words
  - Sentences (split on `[.!?]+`)
  - Paragraphs (double newline or single newline grouping)
  - Reading time (200 wpm)
  - Speaking time (130 wpm)
- "Top words" panel (collapsible): top 10 words by frequency, stop-word filter toggle.
- "Clear" button + char/word limit input that highlights when exceeded (useful for tweet/SMS/essay limits).

## Privacy story
Medium. Many word counters log what you paste. Ours doesn't (because there's no server). A small reassurance line wins trust for writers handling sensitive drafts.

## Libraries allowed
- None. Plain JS regex split is enough.

## Acceptance
- Live counts update under 50 ms while typing fast.
- Word count matches Microsoft Word's count on the same paragraph (close enough - within ~2 %).
- Paste a 50,000-word document - still smooth.
- Bundle <15 KB.

## SEO
- title: "Free word counter - characters, sentences, reading time - techtuate"
- description: "Live word, character, sentence, paragraph counts. Reading and speaking time. Nothing sent online, no sign-up."
- keywords: "free word counter, character counter, word count tool, online word counter no signup, reading time calculator"
