# Show HN post draft

## Title (must be < 80 chars)

```
Show HN: Techtuate - free in-browser PDF editor (no sign-up, no upload)
```

Alternative title if the first feels too plain:
```
Show HN: A PDF editor that runs entirely in your browser, free forever
```

## URL field

```
https://techtuate.com/pdf-editor/
```

## Body text

```
I got tired of paying $9/mo to merge two PDFs, or hitting a watermark wall on the "free" tier, or making yet another account to fill one form one time. So I built techtuate.

The pitch: free, runs in your browser, your file never leaves the page. No upload, no account, no watermark. It does:

- View any PDF
- Annotate (highlight, freedraw, text, shapes)
- Reorder, rotate, delete, duplicate pages
- Merge in another PDF, split out page ranges
- Build a PDF from images
- Fill existing form fields (optional flatten on save)

It does NOT edit existing text in the PDF. That's an explicit non-goal - complex problem, rarely what people actually want, and there are paid tools that do it well already.

How it works: pdf.js for rendering, pdf-lib for editing, both running in the browser. Hosted on Cloudflare Pages as a static site, which means $0 to run regardless of how many people use it. That's why I can keep it free without ads or accounts - there's no marginal cost to scale.

Source code: https://github.com/strata-coreai/techtuate

Six more tools planned (image compressor, QR code, password gen, JSON formatter, word counter, image-to-PDF), shipping roughly one a week. The vs/ page compares techtuate honestly against Adobe / SmallPDF / iLovePDF / Sejda / PDFescape / pdfFiller - including what each of them does better.

Happy to answer questions about the tech, the architecture, the "free forever" claim, or why I'm doing this at all.
```

## Posting checklist

- [ ] Submit Tuesday-Thursday, 8:00-10:00 ET (peak HN traffic, weekday-evening UK overlap).
- [ ] Don't tweet or share before submitting - HN flags coordinated traffic.
- [ ] Be at the keyboard for the next 4-6 hours to reply to comments.
- [ ] Don't pitch in replies. Answer the question, mention features only when directly relevant.

## Canned reply bank (rewrite in your voice before sending)

### Q: What's the catch? How are you making money?

Not yet. Eventually I'd like to cover the domain renewal with Buy Me a Coffee tips and maybe a small "supported by" link in the footer for a privacy-aligned brand (Proton, 1Password, etc., not ads). The architecture makes hosting essentially free so there's no business pressure to add a paywall. Worst case I pay $12/yr out of pocket.

### Q: How is this different from PDF.js?

PDF.js renders, and it's great at it - we use it under the hood. This adds the editing layer on top (via pdf-lib): annotations, form fill, page operations, image-to-PDF. Think of PDF.js as the canvas, this is the toolbar.

### Q: Why client-side specifically?

Two reasons. (1) Privacy - your file genuinely doesn't leave your laptop, and you can verify that in DevTools Network tab. (2) Cost - $0/mo to host on Cloudflare Pages no matter the traffic, which is why "free forever" can be a real promise instead of marketing. Server-side processing would force a paywall sooner or later.

### Q: What's the file size limit?

Your browser's RAM. In practice that's hundreds of MB on any modern device. Bigger than most paid services' free tiers (TinyPDF caps at 5 MB, SmallPDF watermarks above 2 ops/hr, iLovePDF caps at 15 MB).

### Q: Does it work offline?

Once a page is loaded, yes. Disconnect wifi and keep editing.

### Q: How big is the bundle?

Main bundle ~330 KB gzip. pdf.js worker is a separate 1.3 MB chunk (loaded once). pdf-lib is most of the main bundle. Loads in under a second on broadband.

### Q: Will you accept PRs?

Yes, public repo. Open an issue before a meaningful PR so we can sync on direction.

### Q: What about OCR / scanned PDFs?

Not yet. Browser-side OCR requires shipping a model (Tesseract is 5-15 MB, modern ones bigger). Doable but bloats the page. Possibly later as an optional load when you actually drop a scanned PDF. Currently the editor will load a scanned PDF but treat each page as an image, so you can annotate but not extract text.

### Q: How does it compare to (SmallPDF / iLovePDF / Adobe / etc.)?

I wrote https://techtuate.com/vs/ comparing techtuate to each major paid alternative - honest table with pricing, free-tier limits, sign-up requirement, watermark, upload behavior. Spoiler: paid tools are better at OCR, e-signature flows, and Office-format conversion. We're better at "do the thing without an account and without uploading your file."

### Q: Why "techtuate" - what does the name mean?

Honestly, it was an available domain. The brand is the site, not the word.

### Q: Have you thought about [X]?

Probably. Drop the idea in a GitHub issue and I'll respond. The roadmap is at docs/tools-roadmap.md in the repo.
