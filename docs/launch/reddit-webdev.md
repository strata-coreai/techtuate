# r/webdev

## Title

```
Built a PDF editor that runs 100% in the browser (pdf.js + pdf-lib + Cloudflare Pages)
```

## Body

```
Short writeup of the architecture in case it's useful to anyone building a similar "browser-only" tool.

Tech:
- pdf.js for rendering (canvas, with worker via Vite's ?worker import)
- pdf-lib for all editing (annotations, page ops, form fill, image embed)
- React + Vite (~330 KB main bundle gzip; pdf.js worker is a separate 1.3 MB chunk)
- Hosted on Cloudflare Pages as a static site, $0/mo regardless of traffic

The interesting bit was the coordinate translation. pdf.js renders top-left-origin in CSS pixels at the current zoom; pdf-lib draws bottom-left-origin in PDF points. Once I built a small helper to map between the two, every editing feature became "draw an overlay in canvas-space, translate on save."

The other thing: ArrayBuffer detachment. pdf.js can transfer the buffer to its worker, which detaches it on the main thread. I kept two parallel handles to the file - the original ArrayBuffer (for pdf-lib later) and the pdf.js doc - so saves never broke after a render.

Live: https://techtuate.com/pdf-editor/
Source: https://github.com/strata-coreai/techtuate

Happy to answer build/arch questions.
```

## Posting note

r/webdev rewards specific technical detail and punishes anything that smells like marketing. Lead with the architecture, mention the tool itself only twice. The link gets clicks because devs are curious, not because they "need a PDF editor."
