# Techtuate SEO / GEO plan (per page, SERP-grounded)

Goal: make each tool page the honest, extractable answer for its category, so it can be
pulled into Google AI Overviews, "People also ask", and best-of roundups, and rank in
normal organic search. Every recommendation below is grounded in a live Google SERP check
done page by page (Aug 2026). No live pages were edited to produce this plan; it is the
blueprint to implement, one page at a time.

## Where we stand

The entity work already landed: Google now recognizes "techtuate" as a brand rather than a
typo, thanks to the Organization/Brand + WebSite + WebApplication JSON-LD and the visible
"Techtuate is a free suite..." paragraph on the homepage. That solves discovery of the
brand. This plan is the next layer: winning the category queries people actually search
("free pdf editor", "what font is this", "sql to excel"), where they do not know our brand
yet and Google decides what to surface based on the page.

## The pattern that repeats on every page

For each tool we ship the same five things. Do them in this order per page:

1. Callout: one honest, self-contained sentence at the top of the page stating category +
   differentiator (+ audience where relevant). This is the sentence an AI Overview can lift
   verbatim, so it has to stand alone and be true.
2. H1: the category phrase a person would type, with our one real differentiator attached.
3. Meta description: <=155 chars, leads with the category and the differentiator.
4. FAQ block on the page, marked up with FAQPage JSON-LD, using questions phrased the way
   people actually search (lowercase, natural). Three per page below; add more later.
5. A /vs/<competitor>/ comparison page targeting the incumbent people compare against. These
   catch high-intent "X vs Y" and "X alternative" traffic and let us state the honest contrast
   without trashing anyone.

Copy rules (hard, apply everywhere): plain hyphens only, never em or en dashes. No bald
"best" self-claims; lead with specific true differentiators. Never say "files never leave
your device" for the two AI tools (card reader, font finder) - for those, the input goes
once to a labeled AI service and is not stored, and everything else stays in the browser.
For the local tools, "runs in your browser, files not uploaded" is accurate and is our wedge.

## The one differentiator per tool (the thread to pull)

Most competitors claim "free" and "no sign up". Those are table stakes now. Our actual
wedge, page by page:

- pdf-editor / free-pdf-editor: most "no upload" claimants still send the file to a server; we run 100% in the browser.
- json-formatter: safe to paste sensitive JSON because nothing is uploaded.
- card-reader: turns the scan into instant WhatsApp/call/text/email/LinkedIn, no app, no CRM sign-up.
- font-finder: gives the closest Microsoft Office font AND the closest free Google Fonts match, not a paid-foundry upsell.
- audio-converter: convert AND trim in one page, fully local (competitors split those, and upload).
- image-resize: keeps GIFs animated and can target an exact file size (most tools do one or the other).
- color-palette: copy a single swatch or the whole palette, no account nudges.
- svg-converter: any output size + transparent/white/custom background, without uploading.
- word-counter: the same core counts with no grammar-checker upsell and no ad load.
- qr-code: truly static, no tracking redirect, no expiry (the top complaint about "free" generators).
- password-generator: cryptographically random passwords AND XKCD passphrases, with no password-manager signup wall.
- sql-to-excel: not just INSERT-to-table, but read-only plain-English warnings about what a script deletes or changes. No competitor in the SERP does this.

---

# Cluster A - PDF and developer tools

## PDF editor - /pdf-editor/

- Head query: "free pdf editor". Long-tails: "free pdf editor no sign up", "pdf editor no upload", "fill pdf form online free no account", "edit pdf online free no watermark".
- Intent: transactional (do the edit now, in page).
- SERP now: the head is owned by hosted-upload SaaS (Smallpdf, PDFgear, PDFescape, Canva, Adobe Acrobat online). The "no sign up / no watermark" long-tails surface a privacy-positioned cluster (SimplePDF, LocalPDF, Silent Editor, RaptorPDF's 2026 "doesn't upload your files" piece). No locked AI Overview on the head, but the "best free pdf editor" space is owned by listicles (xda-developers, techjournal.org "8 Best Free PDF Editors 2026, No Watermark No Sign-Up", TechWiser, EaseUS) and forum threads, which is what AI answers pull from. Likely PAA: "What is the best free PDF editor with no watermark?", "Can I edit a PDF without uploading it?", "Is there a free PDF editor with no sign up?". Nearly every top result leads on free / no sign up / no watermark, but almost all still upload your file to a server.
- Honest angle: most "no upload" claimants still send the file to a server; we run entirely in the browser so the file never leaves the device. Pair that with the honest scope (annotate, fill forms, reorder/rotate, images-to-PDF, compress) and set the expectation that it does not rewrite existing body text - which cleanly separates us from the "edit PDF text" crowd that overpromises.
- Callout: "Annotate, fill forms, reorder and rotate pages, and compress PDFs entirely in your browser - your file is never uploaded, with no account, no watermark, and no sign-up."
- H1: "PDF Editor That Runs in Your Browser, Files Never Uploaded"
- Meta: "Annotate, fill forms, reorder, rotate and compress PDFs in your browser. Files are never uploaded. No sign-up, no account, no watermark."
- FAQ:
  - "can I edit a PDF without uploading it?" -> Yes. This editor processes your PDF locally in the browser, so the file never leaves your device and nothing is sent to a server.
  - "is there a free PDF editor with no watermark and no sign-up?" -> Yes. There is no account, no sign-up, and no watermark added to your file.
  - "can I edit the existing text in a PDF here?" -> No. This tool is for annotating, filling forms, reorganizing pages, converting images to pages, and compressing; it does not rewrite the original body text.
- /vs/ page: /vs/smallpdf/ - Smallpdf is the best-known free-tier PDF SaaS but uploads files and gates volume behind sign-in. Contrast: in-browser, files not uploaded, no account.

## Free PDF editor (SEO landing) - /free-pdf-editor/

- Head query: "free pdf editor". Long-tails: "free pdf editor no sign up", "free pdf editor without watermark or account", "best free pdf editors 2026", "free pdf editor reddit".
- Intent: mixed, leaning informational (this is the evaluation/comparison SERP, not the do-it-now SERP).
- SERP now: listicles win here (techjournal.org, TechWiser, EaseUS, xda-developers). Adobe and Canva rank for the branded free landing. AlternativeTo and forum threads fill the community slot. Roundups cluster options by "no watermark", "no sign-up", and "online vs desktop", and almost none treat "no upload / local" as its own category. That gap is the wedge. Likely PAA: "What is the best free PDF editor without watermark?", "Is Adobe PDF editor free?", "What is the best free alternative to Adobe Acrobat?".
- Honest angle: as the article-style landing feeding the tool, this page should be the one honest entry that names the axis the listicles gloss over. "Free" and "no watermark" are table stakes; "runs in your browser, file not uploaded" is a privacy category most entries fail. Lead with a plain feature-scope list (what it does, and the one thing it does not: edit existing body text) so it is extractable.
- Callout: "A free PDF editor that runs entirely in your browser with no upload, no account, and no watermark, for annotating, form-filling, page reordering, and compression rather than rewriting existing text."
- H1: "Free PDF Editor, Runs in Your Browser, No Upload, No Account"
- Meta: "A free PDF editor that works in your browser. Annotate, fill forms, reorder pages and compress. No upload, no account, no watermark."
- FAQ:
  - "what is the best free PDF editor with no sign-up?" -> Look for one that is genuinely free with no watermark; this tool adds neither and also runs locally, so your file is not uploaded to a server.
  - "is there a free PDF editor that does not upload my files?" -> Yes. This editor does all processing in the browser, so the PDF stays on your device.
  - "what can a free browser PDF editor do?" -> Annotate, fill forms, reorder and rotate pages, turn images into PDF pages, and compress, though it will not rewrite the document's original body text.
- /vs/ page: /vs/adobe-acrobat-online/ - Adobe's free online editor is the default comparison but needs an Adobe account for most actions and uploads files. Contrast: in-browser, no account, no upload.

## JSON formatter - /json-formatter/

- Head query: "json formatter online". Long-tails: "json validator online", "format json without uploading", "json formatter privacy no upload", "json beautifier online".
- Intent: transactional (paste and act), light informational edge on "validator".
- SERP now: head owned by long-established utilities (jsonformatter.org, codebeautify.org, jsoneditoronline.org, jsonlint.com; curiousconcept and jsonschemavalidator.net on the validator variant). A fresh privacy-positioned wave now ranks on both head and long-tails (json-indent.com "Free, 100% In-Browser", json.site "Private, Secure & Free", dataformatterpro.com "Secure, No Uploads", prettyjson.online "Client-Side"), plus DEV posts like "I built a privacy-first JSON formatter that never uploads your data". Likely PAA: "How do I format JSON online?", "Is it safe to paste JSON into an online formatter?", "What is the difference between a JSON formatter and validator?". Newer entrants specifically emphasize "never uploaded / client-side" because pasting sensitive JSON into a server tool is the recognized fear.
- Honest angle: incumbents are ad-heavy and ambiguous about server-side processing. The winning wedge (already validated by the ranking newcomers) is "format, validate, and minify with nothing uploaded". Lead with the three concrete actions plus the local-processing guarantee, which directly answers "is it safe to paste JSON?".
- Callout: "Format, validate, and minify JSON entirely in your browser - nothing is uploaded and no account is required, so you can safely paste sensitive data."
- H1: "JSON Formatter and Validator, Runs in Your Browser, Nothing Uploaded"
- Meta: "Format, validate and minify JSON in your browser. Nothing is uploaded and no account is needed, so sensitive data stays on your device."
- FAQ:
  - "is it safe to paste JSON into an online formatter?" -> With this tool, yes; all formatting and validation happen in your browser, so your JSON is never uploaded to a server.
  - "how do I validate JSON online?" -> Paste your JSON and it is checked in-browser; invalid syntax is flagged so you can find the error without sending data anywhere.
  - "what is the difference between formatting and minifying JSON?" -> Formatting (beautifying) adds indentation for readability; minifying strips whitespace to shrink the payload. This tool does both locally.
- /vs/ page: /vs/jsonformatter-org/ - the top-ranking incumbent, but ad-heavy and not clearly client-side. Contrast: a clean, in-browser tool where nothing is uploaded.

---

# Cluster B - AI tools (input goes once to a labeled AI service, then stays in the browser)

## Business card reader - /card-reader/

- Head query: "free business card scanner". Long-tails: "scan business card to contact", "business card scanner no app", "business card reader app free no sign up", "business card scanner to vCard/CSV".
- Intent: transactional (a working scanner now), with an informational "best app" layer above it.
- SERP now: head dominated by app-store and CRM-gated players (HubSpot's free scanner, Zapier's and Salesflare's "best scanner apps 2026" listicles, Covve, generic Play Store apps, Blinq). The "no app" and "to contact" long-tails surface lighter web tools (JustScanText, brosh.io OCR-to-Excel/vCard/CSV) and Apple Community threads, a real gap where browser-based no-install tools can rank. techtuate.com/card-reader already appears on the "free no sign up" query. No persistent AI Overview locked to the head; Google leans on the app-pack and listicles. Circulating PAA: "What is the best free business card scanner app?", "Can I scan a business card directly into my contacts?", "Is there a business card scanner without an app?". Top results emphasize free tier, OCR accuracy, CRM/contacts sync, export, but nearly all are app installs or require a sign-up/CRM account.
- Honest angle: the install-free web angle plus the reach-out. Competitors stop at "scanned to a contact"; we turn the scan into instant WhatsApp/call/text/email/LinkedIn, with no app and no account. Be upfront it is an AI tool: the card image goes once to a labeled AI service, and the saved phonebook stays in the browser.
- Callout: "Scan a business card in your browser with no app and no sign-up: the card image is sent once to a labeled AI service and is not stored, the reader turns it into an editable contact, and one tap lets you WhatsApp, call, text, email, or look the person up on LinkedIn."
- H1: "Business Card Reader, Scan a Card to a Contact and Reach Out, Free"
- Meta: "Free browser business card scanner. No app, no sign-up. Turn a card into an editable contact, then WhatsApp, call, text, email or find on LinkedIn."
- FAQ:
  - "is there a business card scanner that works without an app?" -> Yes. This runs in your web browser on phone or desktop, so there is nothing to install and no account to create. Scan or upload a card and it becomes an editable contact.
  - "does my saved contact data leave my device?" -> The card image is sent once to a labeled AI service to read it and is not stored there. Your saved phonebook is kept locally in your browser, not on our servers.
  - "can I export scanned cards to my phone or CRM?" -> Yes. You can export contacts as a vCard or CSV file and import them into your phone contacts, Google Contacts, or a spreadsheet.
- /vs/ page: /vs/hubspot-business-card-scanner/ - HubSpot ranks #1 for "free business card scanner" but funnels into a CRM account. Contrast: free, no sign-up, instant reach-out, exports to vCard/CSV without a CRM.

## Font finder - /font-finder/

- Head query: "what font is this". Long-tails: "identify font from image", "font finder from screenshot", "match font to google fonts free", "what font is this free".
- Intent: mixed, strongly transactional (upload an image, get an answer) wrapped in "how to identify a font" guides.
- SERP now: crowded and mature. Incumbents own the head (MyFonts WhatTheFont, Font Squirrel Matcherator, Fontspring Matcherator, WhatFontIs, Mixfont). A newer AI cohort ranks on image/screenshot long-tails (whatfontisthis.ai, fontdetector.org, lipi.ai/identify). The Google-Fonts angle has niche winners (serbyte.net "What the Google Font", whatfont.texs.org, 10015.io pair finder). Top results emphasize upload an image, an AI/matching engine, and similar/free alternatives, but most match against a paid foundry catalog and few pair Microsoft Office fonts with free Google Fonts equivalents in one result. Circulating PAA: "How can I identify a font from a picture for free?", "What is the best free font finder?", "Can I find the Google Fonts version of a paid font?".
- Honest angle: dual-output matching. It identifies the likely font family and gives the closest Microsoft Office font AND the closest free Google Fonts match, useful for people who need something they can actually use in Word or Docs, not a paid-foundry upsell. Frame honestly: it identifies the family and closest matches from a screenshot, not a guaranteed exact match.
- Callout: "Paste a screenshot and this free tool identifies the likely font family and suggests the closest Microsoft Office font and closest free Google Fonts match, with no sign-up; the image is sent once to a labeled AI service and is not stored."
- H1: "Font Finder, Identify a Font From a Screenshot, Free"
- Meta: "Free font finder from a screenshot. No sign-up. Identify the likely font family and get the closest Microsoft Office and free Google Fonts matches."
- FAQ:
  - "how can I find out what font is in a screenshot?" -> Paste or upload the screenshot and the tool reads the text and identifies the likely font family, then suggests close matches. It identifies the family and nearest matches, not always the exact font.
  - "can I get a free Google Fonts version of a font?" -> Yes. For each identified font, the tool suggests the closest free Google Fonts equivalent alongside the closest Microsoft Office font, so you can use it in Docs or Word.
  - "is this font finder free and does it need an account?" -> It is free with no sign-up. The screenshot is sent once to a labeled AI service to identify the font and is not stored.
- /vs/ page: /vs/whatthefont/ - MyFonts WhatTheFont is the default answer for "what font is this" but points users to paid foundry fonts. Contrast: free, no sign-up, and a closest free Google Fonts plus Microsoft Office match you can actually use.

---

# Cluster C - Media tools (all local: runs in your browser, files not uploaded)

## Audio converter - /audio-converter/

- Head query: "audio converter online free". Long-tails: "convert m4a to mp3 online free", "wav to mp3 online", "audio converter no upload", "trim audio online free", "m4a to mp3 no sign up".
- Intent: transactional.
- SERP now: head and format long-tails dominated by heavy conversion brands (Zamzar, CloudConvert, FreeConvert, Convertio, Clideo, Media.io), most server-side uploaders with free-tier caps. A privacy-oriented cluster is emerging on the "no upload" long-tail (audiotools.dev, freeaudioconverteronline.com, Submind "No Upload, No Sign-Up"). Trim is a separate SERP owned by dedicated cutters (audiotrimmer.com, vocalremover.org/cutter, Clideo). AI Overview appears on broad "audio converter" / "how to convert m4a to mp3" and emphasizes free web tools and the upload-then-download flow; it rarely shows on exact format-pair queries where the tool grid wins. PAA: "How do I convert M4A to MP3 for free?", "Is it safe to convert audio files online?", "What is the difference between WAV and MP3?".
- Honest angle: convert AND trim in one page, fully client-side. Competitors split "convert" and "trim" across two tools, and most convert by uploading to a server. Lead with local processing (privacy, no file-size queue) plus the trim feature pure converters lack.
- Callout: "Convert mp3, wav, m4a, aac, ogg, opus or flac to MP3 or WAV and trim a clip, all in your browser; files are not uploaded and there is no watermark or sign-up."
- H1: "Audio Converter and Trimmer, MP3 and WAV in Your Browser"
- Meta: "Convert m4a, aac, flac, ogg, opus and more to MP3 or WAV and trim a clip. Runs in your browser, files not uploaded, no watermark, no sign-up."
- FAQ:
  - "how do I convert M4A to MP3 without uploading?" -> Open the tool, pick your m4a file, and it decodes and re-encodes to MP3 locally in the browser tab, so the audio never leaves your device.
  - "can I trim an audio clip and convert it at the same time?" -> Yes; you can set start and end points to trim, then export the trimmed section as MP3 or WAV in one step.
  - "what audio formats can I convert from?" -> It reads mp3, wav, m4a, aac, ogg, opus and flac, and exports to MP3 or WAV.
- /vs/ page: /vs/cloudconvert/ - CloudConvert is the top-ranked general converter but uploads files and gates heavy use behind minute quotas/sign-up. Contrast: local, no upload, no cap.

## Image and GIF resizer - /image-resize/

- Head query: "resize image online free". Long-tails: "compress gif online free", "reduce image to target file size", "resize image to exact pixels", "resize animated gif online", "compress image to specific kb".
- Intent: transactional.
- SERP now: head crowded with big brands and utilities (iLoveIMG, Adobe Express, Canva, simpleimageresizer.com, imageresizer.com, PicResize, bulkresizephotos.com, the ad-free jam.dev entry). "Reduce to target file size" is its own SERP led by compression specialists (TinyPNG/TinyJPG, img2go, compress2go, imagesmaller.com, resizepixel.com "reduce image in KB"). The animated-GIF need splits into a separate, less consolidated SERP (ezgif, iLoveIMG GIF compressor, imagekit.io, gifresizer.org, onlinegiftools.com). Many general resizers silently flatten or break animated GIFs, so GIF handling is the real gap. AI Overview appears on informational framings ("how to resize an image without losing quality", "how to reduce image file size"), emphasizing free browser tools and the quality-vs-size tradeoff. PAA: "How do I resize an image to a specific size?", "How can I reduce the file size of an image?", "How do I resize a GIF without losing quality?".
- Honest angle: one tool that handles both static images and animated GIFs, and can target either exact pixel dimensions OR a target file size. Most competitors do only one, and GIF animation support is inconsistent. Lead with "keeps GIF animation" plus "target an exact file size".
- Callout: "Resize or compress images and animated GIFs to exact pixel dimensions or a target file size, keeping GIFs animated, in your browser with no upload and no watermark."
- H1: "Image and GIF Resizer, Target Exact Pixels or a File Size"
- Meta: "Resize or compress images and animated GIFs to exact pixels or a target file size. GIFs stay animated. Runs in your browser, no upload, no watermark."
- FAQ:
  - "how do I resize an image to an exact file size?" -> Enter your target size in KB or MB and the tool adjusts dimensions and quality to land near it, previewing the result before you download.
  - "can I resize an animated GIF without losing the animation?" -> Yes; it resizes and compresses the GIF while preserving every frame, so the animation stays intact.
  - "does resizing happen without uploading my image?" -> Yes; the image or GIF is processed locally in your browser tab and is not uploaded to a server.
- /vs/ page: /vs/ezgif/ - ezgif is the default for GIF resize/optimize but is ad-heavy and uploads files server-side. Contrast: local, no upload, exact-size or exact-pixel targeting in one page.

## Color palette extractor - /color-palette/

- Head query: "extract color palette from image". Long-tails: "get hex colors from image", "image color picker", "dominant colors from image online", "color palette from photo", "image to hex codes".
- Intent: mixed (transactional "give me the swatches" plus informational "what colors are in this image").
- SERP now: two overlapping SERPs. Palette extraction is led by design-community and utility brands (Coolors coolors.co/image-picker, ColorKit, Picsart Quicktools, mdigi.tools, hexcolor.co). Single-color picking is a separate entrenched SERP (imagecolorpicker.com, htmlcolorcodes.com, RedKetchup, Figma's picker). "Dominant colors" pulls in ginifab, imgonline, freetool.dev. AI Overview frequently appears because intent is partly informational; it explains what a palette extractor does and often extracts a step list ("upload an image, the tool samples pixels, copy the HEX codes"), so a clean definition sentence can win the overview. PAA: "How do I find the HEX code of a color in an image?", "How do I extract a color palette from a picture?", "What is a dominant color in an image?".
- Honest angle: fast, no-frills, in-browser extraction with easy copy of a single swatch OR the whole palette, and no sign-up (Coolors nudges toward accounts/pro). Lead with "copy one swatch or the entire palette as HEX or RGB, in the browser".
- Callout: "Drop in an image and get its dominant colors as HEX and RGB, then copy a single swatch or the whole palette, all in your browser."
- H1: "Color Palette Extractor, Get HEX and RGB From Any Image"
- Meta: "Drop an image to pull its dominant colors as HEX and RGB, then copy one swatch or the full palette. Runs in your browser, no upload, no sign-up."
- FAQ:
  - "how do I get the HEX codes from an image?" -> Drop the image into the tool and it samples the dominant colors, showing each as a HEX and RGB value you can copy with one click.
  - "how do I extract a color palette from a photo?" -> Add the photo and the tool returns its main colors as a palette; you can copy the whole set or any single swatch.
  - "does the tool upload my image to get the colors?" -> No; the image is read locally in your browser tab, so it is not uploaded to a server.
- /vs/ page: /vs/coolors/ - Coolors is the best-known palette tool but routes users toward accounts and pro features. Contrast: extract, copy a swatch or full palette, no sign-up, nothing uploaded.

## SVG converter - /svg-converter/

- Head query: "svg to png converter online". Long-tails: "svg to jpg online free", "convert svg to png custom size", "svg to png transparent background", "svg to png high resolution", "svg to png no upload".
- Intent: transactional.
- SERP now: dominated by conversion platforms and design brands (CloudConvert, Convertio, FreeConvert, Canva, ezgif, svgviewer.dev, svgtopng.com), with niche entrants on the long-tails (picflow "Free, Fast & No Ads", SvgTrace and vectorink.io on "custom size", onlinepngtools and svgpng.com on "transparent background"). The two differentiators buyers actually search for are custom output size and background control, and several competitors already lead with exactly those. Most mainstream converters upload the SVG to a server. AI Overview shows on "how to convert SVG to PNG" and emphasizes free converters and the raster-vs-vector tradeoff. PAA: "How do I convert an SVG to PNG for free?", "Can I convert SVG to PNG without losing quality?", "How do I keep a transparent background when converting SVG to PNG?".
- Honest angle: all three power features in one local tool - PNG or JPEG, any output size, and transparent/white/custom background - without uploading the file. Individual competitors offer one or two. Lead: "set the size and the background, exported in your browser".
- Callout: "Convert SVG to PNG or JPEG at any size, with a transparent, white or custom background, right in your browser without uploading the file."
- H1: "SVG Converter, SVG to PNG or JPEG at Any Size"
- Meta: "Convert SVG to PNG or JPEG at any size, with transparent, white or custom background. Runs in your browser, files not uploaded, no watermark."
- FAQ:
  - "how do I convert an SVG to PNG with a transparent background?" -> Load the SVG, choose PNG, and select the transparent background option before exporting; the raster keeps the see-through areas.
  - "can I set a custom size when converting SVG to PNG?" -> Yes; enter the exact width and height (or scale) you want and the SVG is rendered to PNG or JPEG at that resolution.
  - "is my SVG uploaded to a server to convert it?" -> No; the SVG is rendered and exported locally in your browser tab, so the file is not uploaded.
- /vs/ page: /vs/cloudconvert/ (shared with audio converter) - CloudConvert ranks first for "svg to png" but uploads files and caps free conversions. Contrast: local, any size, choose the background, nothing uploaded. (Alternative: /vs/ezgif/ for the ad-heavy angle.)

---

# Cluster D - Utility tools (all local: runs in your browser, nothing uploaded)

## Word and character counter - /word-counter/

- Head query: "word counter". Long-tails: "character counter online free", "words and characters counter with reading time", "word count with reading time", "character limit checker online", "count sentences and paragraphs online".
- Intent: transactional (paste and count now), thin informational slice ("how many words is X").
- SERP now: dominated by high-authority incumbents (WordCounter.net, Grammarly's word-counter and character-counter pages, QuillBot, Semrush free-tools, ZeroGPT, WordCountTool.com). Nearly all bundle a grammar/AI-writing upsell. No classic AI Overview reliably triggers on bare "word counter" - Google usually surfaces an interactive count widget/tool pack; informational phrasings ("how many words is a page") are more likely to draw an AI Overview about words-per-page and reading speed. PAA appears: "How do I count the number of words?", "Is there a free word counter?", "How many characters are in a word on average?". Top results emphasize live counting, characters with/without spaces, keyword density, reading time, but most push a grammar-checker account or heavy ads.
- Honest angle: a clean, no-upsell, everything-on-one-screen counter that runs locally - words, characters (with and without spaces), sentences, paragraphs, reading time, plus a real character-limit checker - with nothing sent to a server.
- Callout: "Paste text to see live word count, characters with and without spaces, sentences, paragraphs, reading time, and a character-limit check, all in your browser with nothing uploaded."
- H1: "Word and Character Counter"
- Meta: "Free word and character counter. Live counts for words, characters with and without spaces, sentences, paragraphs, and reading time. Runs in your browser."
- FAQ:
  - "how do I count characters with and without spaces?" -> Paste your text and the counter shows both totals side by side, updating as you type, so you can match a field's exact limit.
  - "is there a word counter that doesn't upload my text?" -> Yes. This tool counts entirely in your browser, so your text is never sent to a server.
  - "how is reading time calculated?" -> Reading time is estimated from your word count at an average reading speed, giving a rough minutes-to-read figure for the pasted text.
- /vs/ page: /vs/wordcounter-net/ - the category's default destination. Contrast: same core counts, no grammar-checker upsell, and your text stays in the browser.

## QR code generator - /qr-code/

- Head query: "free qr code generator". Long-tails: "free qr code generator no sign up", "qr code generator with logo free", "static qr code no tracking", "qr code generator vcard free", "download qr code svg pdf".
- Intent: transactional (make and download a code now).
- SERP now: crowded commercial field (QRCode Monkey, Canva, Adobe Express, QR-Code-Generator.com, QR Planet, Hovercode, QRStuff), plus listicles ranking for "no sign-up / doesn't expire". A recurring pain surfaces: many "free" generators produce dynamic codes routed through a tracking redirect that can expire or be gated behind an account. Listicle/PAA content heavily emphasizes "no sign-up required", "never expires", and static-vs-dynamic. AI Overview commonly appears on "static vs dynamic qr code", explaining that static codes encode the data directly (no redirect, no expiry, not editable) while dynamic ones use a trackable redirect. PAA: "Do free QR codes expire?", "What is the difference between a static and dynamic QR code?", "Are QR code generators with logos really free?".
- Honest angle: what the big players quietly avoid - truly static codes with no tracking redirect, no account, no expiry, still with logo, color, and vCard, downloadable as PNG/SVG/PDF. That answers the top complaint in the SERP head-on.
- Callout: "Create static QR codes with custom colors, a logo overlay, or vCard output and download PNG, SVG, or PDF - no account, no tracking redirect, and the code never expires because the data is encoded directly."
- H1: "QR Code Generator (Static, No Tracking)"
- Meta: "Free static QR code generator with logo, custom colors, and vCard. Download PNG, SVG, or PDF. No sign-up, no tracking redirect, no expiry."
- FAQ:
  - "do free qr codes expire?" -> Static codes like these do not expire, because the data is encoded directly in the image rather than routed through a redirect link that a service could turn off.
  - "can I add a logo to a qr code for free?" -> Yes. You can overlay a logo and set custom colors, then download the result as PNG, SVG, or PDF at no cost and without an account.
  - "does this qr code track scans?" -> No. These are static codes with no tracking redirect, so scans go straight to your content and are not logged by us.
- /vs/ page: /vs/qr-code-generator-com/ - ranks for the head term but defaults to dynamic, tracked codes and account gating. Contrast: static, no redirect, no sign-up, no expiry.

## Password generator - /password-generator/

- Head query: "password generator". Long-tails: "strong password generator online", "passphrase generator", "xkcd password generator", "random password generator no ads", "memorable password generator".
- Intent: transactional (generate now), informational overlap on "how strong / how random".
- SERP now: almost entirely password-manager brands using the tool as a funnel (1Password, Bitwarden, LastPass, Norton, Proton Pass, RoboForm), plus RANDOM.ORG and StrongPasswordGenerator.org. For passphrase/XKCD long-tails a distinct cluster ranks (xkpasswd.net, xkpass.com, preshing.com) and most head-term incumbents do NOT offer XKCD passphrases. AI Overview frequently appears on "how to create a strong password", emphasizing length over complexity, no reuse, passphrases, and using a password manager. PAA: "What is the strongest type of password?", "Are online password generators safe?", "Is a passphrase safer than a password?". Most top results reassure that generation happens locally, so "generated locally" is table stakes to state explicitly, not a unique claim.
- Honest angle: combining both modes cleanly without a password-manager signup wall - cryptographically random character passwords AND XKCD-style passphrases in one tool - with an explicit plain statement that generation happens in your browser using the browser's cryptographic randomness and nothing is ever sent anywhere.
- Callout: "Generate cryptographically random passwords or XKCD-style passphrases entirely in your browser - each one is created locally and never sent anywhere."
- H1: "Password and Passphrase Generator"
- Meta: "Free password and passphrase generator. Cryptographically random passwords or XKCD-style passphrases, generated locally in your browser and never sent anywhere."
- FAQ:
  - "are online password generators safe to use?" -> This one generates every password locally in your browser using the browser's cryptographic random source, so the password is never transmitted or stored on a server.
  - "what is an xkcd style passphrase?" -> It is a password made of several random common words, which is easy to remember but hard to guess; this tool can produce them alongside standard random-character passwords.
  - "is a passphrase stronger than a password?" -> A long random-word passphrase can be both easier to remember and harder to crack than a short complex password, because length adds more resistance than symbol variety.
- /vs/ page: /vs/1password-generator/ - 1Password's free generator ranks near the top but is a funnel into its paid manager. Contrast: no account or manager required, adds XKCD passphrases, and generation stays in your browser.

## SQL to table - /sql-to-excel/

- Head query: "sql to excel". Long-tails: "convert sql insert to excel", "sql to csv online", "sql insert to csv converter", "preview sql insert rows as table", "what will this sql script delete".
- Intent: transactional (convert/preview now), informational edge on "what does this SQL do / delete".
- SERP now: the converter niche is owned by TableConvert (sql-to-excel, sql-to-csv), plus RebaseData, CodeBeautify, BeautifyTools, Aspose, GroupDocs, bfotool; broader "sql to excel" also pulls in how-to articles (n8n, Integrate.io). Critically, every ranking converter only transforms INSERT values into a table; none read or explain UPDATE/DELETE/DROP or warn about destructive statements. No AI Overview reliably triggers on the transactional converter query; it appears on "how to export SQL data to Excel", emphasizing running the query in a DB client and exporting. PAA: "How do I convert a SQL query to Excel?", "How do I export SQL INSERT statements to Excel?", "Can I convert SQL to CSV online for free?".
- Honest angle: the strongest unique wedge in the whole suite - not just an INSERT-to-table converter but a read-only safety previewer. It shows the rows an INSERT would add AND gives plain-English warnings about what a script deletes or changes, without ever running the SQL. No competitor in the SERP does the "what will this script delete/change" part.
- Callout: "Paste a SQL script to preview the rows an INSERT would add as an Excel or CSV table and get plain-English warnings about what the script deletes or changes - it is read-only and never runs your SQL."
- H1: "SQL to Table Preview and Excel Export"
- Meta: "Paste SQL to preview INSERT rows as an Excel or CSV table and get plain-English warnings about deletes and changes. Read-only, never runs the SQL. In-browser."
- FAQ:
  - "how do I convert sql insert statements to excel?" -> Paste your INSERT statements and the tool renders the values as a table you can export to xlsx or CSV, all in your browser with no upload.
  - "can I see what a sql script will delete before running it?" -> Yes. It reads the script and gives plain-English warnings about DELETE and UPDATE statements, without ever executing the SQL against a database.
  - "does this tool run or connect to my database?" -> No. It only parses the pasted text to preview and warn; it is read-only, runs in your browser, and never connects to or runs against any database.
- /vs/ page: /vs/tableconvert/ - TableConvert is the default "sql to excel / sql to csv" result. Contrast: same INSERT-to-table export, plus read-only plain-English warnings about what a script deletes or changes, with nothing uploaded.

---

# New /vs/ pages to build (one place)

Each is a short, honest comparison page: what the incumbent does well, the one axis where we
differ, and a link to our tool. No trashing; state facts. Build them as static pages under /vs/.

1. /vs/smallpdf/ (pdf-editor)
2. /vs/adobe-acrobat-online/ (free-pdf-editor)
3. /vs/jsonformatter-org/ (json-formatter)
4. /vs/hubspot-business-card-scanner/ (card-reader)
5. /vs/whatthefont/ (font-finder)
6. /vs/cloudconvert/ (audio-converter and svg-converter share this)
7. /vs/ezgif/ (image-resize; optional second angle for svg-converter)
8. /vs/coolors/ (color-palette)
9. /vs/wordcounter-net/ (word-counter)
10. /vs/qr-code-generator-com/ (qr-code)
11. /vs/1password-generator/ (password-generator)
12. /vs/tableconvert/ (sql-to-excel)

Note: there is already a /vs/ area on the site. Two whole-site absolute claims in
vs/index.html still need scoping (see the cleanup section) before we expand this area, so the
comparison pages do not inherit a claim that is false for the two AI tools.

---

# Suggested rollout order

Ranked by (strength of a unique, honest differentiator) x (how well our page can actually own
the query). Do the on-page five (callout, H1, meta, FAQ + FAQPage JSON-LD, one /vs/ page) per
page in this order.

Tier 1 - unique wedge, little direct competition on the exact angle. Highest return first:

1. sql-to-excel - no competitor warns about destructive statements. We can own "preview what a SQL script deletes".
2. qr-code - "static, no tracking, no expiry" answers the loudest complaint in the SERP.
3. card-reader - the reach-out after scanning is genuinely differentiated, and we already rank for one long-tail.
4. password-generator - XKCD passphrases without a manager signup wall is a clean gap on the head term.
5. image-resize - "keeps GIF animation" + "target a file size" is a real, searched-for combo most tools miss.

Tier 2 - strong local-privacy wedge, higher-volume but more crowded:

6. pdf-editor - big volume; "100% in-browser, file never uploaded" is a true category the listicles ignore.
7. audio-converter - "convert AND trim, local" against server-side converters.
8. svg-converter - "any size + choose background, local" against upload-based converters.
9. font-finder - dual Microsoft Office + free Google Fonts match against paid-foundry upsells.
10. json-formatter - "safe to paste, nothing uploaded"; newcomers already prove this ranks.

Tier 3 - table-stakes category, do the on-page basics for completeness:

11. free-pdf-editor - the listicle-facing landing; make it the honest "no upload" entry.
12. word-counter - clean, no-upsell counter; incumbents are entrenched, so expect slower gains.
13. color-palette - AI Overview is winnable with a clean definition sentence; otherwise crowded.

---

# Related on-page cleanup (do alongside, not blocking)

Two whole-site absolute claims in vs/index.html overstate privacy and are the on-page source
of the stale "all tools local / files never uploaded" line an AI Overview was quoting. They
should be scoped to the local tools before we expand the /vs/ area, because the card reader
and font finder DO send their input to a labeled AI service:

- vs/index.html line ~57: "these tools run in your browser with no server involved"
- vs/index.html line ~286: "techtuate runs entirely in your browser... There's no server to scale"

Suggested scoping: change absolute "these tools / techtuate runs entirely in your browser" to
"most of these tools run entirely in your browser, and the two AI tools (card reader, font
finder) send only their input once to a labeled AI service". Exact wording to be finalized
when we implement.

After the on-page changes ship, request a re-crawl in Google Search Console (URL Inspection ->
Request Indexing) for the homepage and any page whose callout/meta/FAQ changed, so the AI
Overview and snippet refresh from the corrected copy rather than the cached version.
