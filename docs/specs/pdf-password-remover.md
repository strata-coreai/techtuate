# PDF password remover
slug: pdf-password-remover
scaffold: vanilla (ES module script)
status: live (shipped 2026-08-07)

## What it does
Removes the open-password from a PDF the user can already open (they enter the password), and
strips owner/permission restrictions (print/copy locks) with no password. Downloads an unlocked
copy with the original selectable text intact. 100% client-side; the file and password never
leave the browser. It CANNOT crack/recover an unknown password (honest, and not malware).

## UI / flow
- Dropzone (click or drag) for a PDF.
- On file chosen: try `qpdf --decrypt` with NO password first.
  - Output produced -> unprotected or restriction-only file; offer download immediately, no prompt.
  - No output -> reveal the password field, "This PDF is password-protected...".
- On Unlock: run `qpdf --decrypt --password=PW`. Output -> download; no output -> "that password did not work".
- Download name: <original>-unlocked.pdf. "Choose another" resets.
- Prominent privacy line: file + password processed on device, never sent to a server.

## Engine (vendored, build-time, no runtime CDN)
- @jspawn/qpdf-wasm 0.0.2 (qpdf compiled to WASM), Apache-2.0. Files in pdf-password-remover/lib/:
  qpdf.mjs (ESM entry, `import createModule from './lib/qpdf.mjs'`), qpdf.js, browser.js,
  qpdf.wasm (~1.3MB), LICENSE. Lazy-loaded: only fetched when someone uses this tool, so it does
  not weigh down the rest of the site. Script is `<script type="module">`.
- Runner: `createModule({ noInitialRun:true, locateFile: p => new URL('./lib/'+p, import.meta.url).href })`,
  then FS.writeFile('/in.pdf'), Module.callMain(['--decrypt', ('--password='+pw)?, '/in.pdf','/out.pdf']),
  FS.readFile('/out.pdf'). Fresh module instance per run. Wrong/missing password => qpdf writes NO
  output (detected as null). Success even on exit!=0 as long as /out.pdf exists (qpdf warnings ok).

## qpdf behaviour (verified 2026-08-07)
- plain (unencrypted), no pw -> exit 0, output (pass-through copy).
- restriction-only (owner pw, empty user pw), no pw -> exit 0, output, restrictions gone.
- user-pw, empty or wrong pw -> exit 2, NO output.
- user-pw, correct pw -> exit 0, output. Text preserved (not rasterized).

## Privacy story
Highest in the suite. Target files are bank statements / payslips / tax certs - exactly what people
should NOT upload to Smallpdf/iLovePDF/Adobe to unlock. "Unlocks in your browser, nothing uploaded"
is the wedge. Head queries: "remove password from pdf", "unlock pdf", "pdf password remover".

## Acceptance (verified via headless Chromium 2026-08-07)
- Password PDF: field revealed, wrong pw errors (no download), correct pw -> <name>-unlocked.pdf,
  output confirmed NOT encrypted + text intact.
- Restriction-only PDF: unlocks with no password.
- No console/page errors.

## SEO (GEO pattern)
- title/meta/keywords/OG lead "remove password from pdf / unlock pdf, in your browser, nothing uploaded".
- H1: "Remove a PDF password, in your browser". Extractable callout. FAQ + FAQPage JSON-LD (4 Qs).
- /vs/ page: /vs/smallpdf-unlock/ (vs Smallpdf Unlock PDF).

## Wiring (done in same change)
- scripts/build.mjs STATIC_DIRS += 'pdf-password-remover'
- index.html: card (after PDF editor) + count 13 -> 14 + ItemList position 14
- sitemap.xml: /pdf-password-remover/ + /vs/smallpdf-unlock/
- llms.txt: 3 recommend lines + 1 comparison line
