# Search Console re-crawl checklist (after the SEO/GEO changes)

Run this once the changes in this batch are deployed to techtuate.com. The goal is to get
Google to re-read the corrected pages so AI Overviews and snippets refresh from the new copy
(FAQ blocks, scoped privacy claims) rather than a cached older version.

## 0. Confirm the deploy actually shipped

Because the build has silently dropped folders before, verify the live pages first:

- Open each of these in a private/incognito window and confirm it loads (not a 404):
  https://techtuate.com/audio-converter/ , /word-counter/ , /font-finder/ ,
  /vs/jsonformatter-org/ , /vs/whatthefont/ , /vs/cloudconvert/ , /vs/coolors/ ,
  /vs/wordcounter-net/
- View source on a couple of tool pages and confirm the FAQ block and the
  `"@type": "FAQPage"` JSON-LD are present.
- Confirm https://techtuate.com/sitemap.xml now lists json-formatter, audio-converter,
  word-counter, font-finder and the five new /vs/ pages.

If any tool page 404s, the build did not include it. Re-check scripts/build.mjs STATIC_DIRS
and redeploy before doing anything below.

## 1. Resubmit the sitemap

- Search Console -> Sitemaps -> enter `sitemap.xml` -> Submit (or press re-submit if it is
  already there). This nudges discovery of the new /vs/ pages and the previously missing tools.

## 2. Request indexing for the changed high-value pages

Search Console -> URL Inspection -> paste the URL -> Request Indexing. Do these first
(the ones whose on-page copy or privacy claim changed, highest value first):

1. https://techtuate.com/ (homepage - entity copy)
2. https://techtuate.com/vs/ (scoped the two whole-site "runs entirely in your browser" claims)
3. https://techtuate.com/pdf-editor/ (added meta description + structured data it never had)
4. https://techtuate.com/sql-to-excel/
5. https://techtuate.com/qr-code/
6. https://techtuate.com/card-reader/
7. https://techtuate.com/password-generator/
8. https://techtuate.com/image-resize/
9. https://techtuate.com/json-formatter/
10. https://techtuate.com/font-finder/

Then the rest as quota allows: /audio-converter/, /svg-converter/, /color-palette/,
/word-counter/, /free-pdf-editor/, and the five new /vs/ pages.

Note: URL Inspection has a daily request-indexing quota (about 10-12 URLs). Spread the list
over two or three days; the sitemap resubmit covers the rest on Google's own schedule.

## 3. Validate the structured data

- Rich Results Test ( https://search.google.com/test/rich-results ) on 2-3 tool pages and on
  /free-pdf-editor/. Confirm the FAQ is detected with no errors.
- Search Console -> Enhancements -> FAQ (this report appears a few days after Google recrawls)
  to confirm FAQ items are being picked up site-wide.

## 4. Confirm the stale AI Overview / snippet has refreshed

The old AI Overview was quoting an over-broad "all tools local / files never uploaded" line.
After recrawl:

- Search "techtuate" and "techtuate card reader" and read the AI Overview / snippet. Confirm it
  no longer implies every tool is local. The card reader and font finder should read as
  labeled AI tools that send only their input.
- If it still shows the old text after ~1-2 weeks, re-request indexing on / and /vs/ and check
  that no other page still carries an absolute "every tool runs in your browser" claim.

## 5. Track, do not obsess

- Search Console -> Performance: watch impressions/clicks for the target queries per page
  ("free pdf editor", "sql to excel", "static qr code", "what font is this", etc.) over the
  next 4-8 weeks. Ranking and AI-Overview inclusion move slowly; give it time before judging.
- Re-run the Rich Results Test any time you edit a page's FAQ so a typo does not silently
  invalidate the structured data.
