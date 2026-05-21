# r/privacy

## Title

```
PDF editor that doesn't upload your file - everything runs in the browser tab
```

## Body

```
For anyone tired of uploading sensitive PDFs (passport scans, tax forms, medical paperwork) to "free" PDF sites that may or may not delete them: built one that doesn't have an upload step at all. The file stays in your browser tab.

You can verify in DevTools Network panel - drop a PDF, do your editing, save, and you'll see zero outbound requests carrying your file. There's no server to upload to.

Does annotate, merge, split, rotate, fill forms, build PDFs from images. Doesn't do OCR (yet) or text editing (won't).

Static site on Cloudflare Pages, no accounts, no ads, no third-party analytics SDKs. Source code open: https://github.com/strata-coreai/techtuate

https://techtuate.com/pdf-editor/

The architecture writeup of why it can be free forever: https://techtuate.com/why-free/
```

## Posting note

r/privacy is the most thoughtful audience and will actually verify claims. Don't oversell. The "verify in DevTools" line is the most important sentence in the post - it makes the privacy claim falsifiable, which builds credibility.
