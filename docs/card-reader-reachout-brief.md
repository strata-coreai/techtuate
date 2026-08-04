# Implement: card reader "reach-out" buttons + layout (approved design)

Scope: only `card-reader/` and `functions/api/scan.js`. Do not touch other tools.

## The design (approved)

After the card reader recognizes a card, the **review form** shows one-tap "reach out" buttons built from the contact. Required layout:

- Each recognized field (each email, each phone) stays **full width on its own line**.
- The reach-out buttons sit in a **wrapping row directly BELOW that field, inside the same bordered container** (the Email / Phone fieldset). They must NOT be placed to the right of the input (that is the current wrong/cramped layout).
- A small mono-uppercase **"Reach out"** label sits above each button row.
- The **primary** action in each block is filled techtuate yellow (`--yellow`): Email for the email block; WhatsApp for a mobile phone (Call if no WhatsApp is possible); Call for a landline.
- Buttons are **pill-shaped** (2px black border, `2px 2px 0` offset shadow, white bg) with the **real brand-colored logos** (WhatsApp green `#25D366`, Gmail red `#EA4335`, Outlook/LinkedIn blue, iMessage/FaceTime green). This colored-logo palette exception is approved and documented in CLAUDE.md - keep the brand colors.
- A **"Connect"** row (LinkedIn + Web search, built from name + company) sits just under the Company field.

Channels (client-side deep links only, nothing sent to a server):
- Mobile phone: **WhatsApp** (`https://wa.me/<digits>?text=`), **Call** (`tel:`), **Text** (`sms:`), **FaceTime** (`facetime:` - Apple devices only, by user-agent).
- Landline/work phone: **Call** only.
- Email: **Email** (`mailto:` with subject+body - opens the default mail app), **Gmail**, **Outlook**.
- Connect: **LinkedIn** (`https://www.linkedin.com/search/results/people/?keywords=<name company>`) + **Web search** (Google `<name company> linkedin`).
- Do NOT add WeChat / Line / Telegram - they can't start a chat from a phone number on the web.

Gmail/Outlook must open the **app on mobile** and web compose on desktop:
- Mobile (user-agent match `/Android|iPhone|iPad|iPod|Mobile/`): `googlegmail://co?to=&subject=&body=` and `ms-outlook://compose?to=&subject=&body=`.
- Desktop: `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=&su=&body=` and `https://outlook.office.com/mail/deeplink/compose?to=&subject=&body=`.

## How to implement (use the two attached files verbatim)

Replace these two files with the attached, tested versions - they already produce the exact design above and pass headless tests:
- `card-reader/script.js`
- `card-reader/styles.css`

If you integrate by hand instead of overwriting, these are the load-bearing details you must keep:

1. **Row structure.** `emailRow()` / `phoneRow()` build `<div class="cr-multi-row cr-has-acts">` containing:
   - `<div class="cr-row-top">` = the existing select/input/delete (a flex row), and
   - `<div class="cr-acts">` = the reach-out buttons.
   The CSS makes `.cr-multi-row.cr-has-acts { flex-direction: column }` so buttons render BELOW the field. This is the whole fix - the current bug is the buttons being siblings in a horizontal row.

2. **Ship the layout CSS from JS too.** `script.js` injects a `<style id="cr-reach-style">` with the reach-out CSS on load. KEEP THIS. It guarantees the layout applies even if `card-reader/styles.css` is stale/cached (which is what has been happening). The same rules also live in `styles.css` for cleanliness.

3. `populateReview()` passes `p.e164` and `p.isMobile` into `phoneRow(value, type, e164, isMobile)`; the type defaults to `mobile` when `isMobile`. Messaging buttons show when the row's type select === `'mobile'`.

## Also apply to functions/api/scan.js (needed for WhatsApp + mobile detection)

In the `PROMPT` array (after the existing "- For each phone, set type to one of..." line), add:

```
'- For each phone, also provide e164: the number in full international E.164 format (a leading +, the country calling code, then digits only, no spaces or punctuation). Infer the country from the card - the printed country code, the address, or the country of the company. If the country genuinely cannot be determined, leave e164 empty.',
'- For each phone, set isMobile to true if it is a mobile/cell number and false otherwise (landline/office/fax). Decide using the country\'s own mobile numbering rules (mobile prefixes) plus any "mobile"/"cell"/"M:" label or phone icon on the card. Most countries clearly separate mobile from fixed-line ranges.',
```

In `RESPONSE_SCHEMA.properties.phones.items.properties`, add two fields so the object becomes:

```
properties: {
  value: { type: 'STRING' },
  type: { type: 'STRING' },
  e164: { type: 'STRING' },
  isMobile: { type: 'BOOLEAN' }
}
```

## Acceptance

- Mobile phone row shows, in order: WhatsApp (yellow), Call, Text, and FaceTime (only on Apple UA). WhatsApp href is `https://wa.me/<digits-from-e164>?text=...`.
- Landline row shows Call only (yellow).
- Email row shows Email (yellow, mailto with subject+body), Gmail, Outlook. On a mobile UA the Gmail/Outlook hrefs use `googlegmail://co?...` / `ms-outlook://compose?...`; on desktop they use the web-compose URLs.
- A "Connect" row under Company shows LinkedIn (people search on name+company) and Web search.
- Each field is full width; its buttons wrap on a row below it, inside the container, with a "Reach out" label. Nothing sits to the right of the input.

## Deploy / cache note (this is why it looked unchanged)

The layout lives in the NEW `script.js`. After deploying, the browser/CDN may still serve a cached `script.js`/`styles.css`. Hard-refresh, or open the page in a private/incognito tab, to confirm. Because the layout CSS is injected from `script.js`, once the new `script.js` is served the layout is correct regardless of the `styles.css` cache.
