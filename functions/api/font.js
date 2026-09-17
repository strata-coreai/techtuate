// Cloudflare Pages Function: POST /api/font
// Looks at a screenshot with Google Gemini (vision) and returns the distinct
// typefaces it sees, grouped by role, with a best-guess name, a family
// classification, whether the type looks custom, and free equivalents.
// The API key stays server-side (env var), never in the client. The image is
// forwarded once for reading and is not stored or logged here.
//
// Required env var (Cloudflare Pages -> Settings -> Variables and Secrets,
// encrypted):  GEMINI_API_KEY
// Optional:     GEMINI_MODEL   (defaults to gemini-flash-latest)
//
// This is the second AI tool on techtuate and reuses the /api/scan.js shape so
// the provider stays isolated and swappable. See scan.js for why thinking is
// minimized (thinkingLevel "low") + the timeout + top-level catch: the
// gemini-flash-latest alias now points to a Gemini 3.x thinking model, whose
// default reasoning is slow enough to get the free-tier function killed (a
// Cloudflare 502) before it can respond.

const DEFAULT_MODEL = 'gemini-flash-latest';
const MAX_BYTES = 6 * 1024 * 1024; // ~6MB of base64, generous for a downscaled screenshot
const UPSTREAM_TIMEOUT_MS = 25000; // give the model time, but never hang the function

const PROMPT = [
  'You are a typography expert. You are shown ONE screenshot (a UI, a website, a poster, a document, or similar).',
  'Identify the DISTINCT typefaces visible in the image and return ONLY the JSON described by the schema.',
  'Group by visual role (for example: Heading, Subheading, Body, Button / UI, Caption, Logo / wordmark). Merge duplicates: if the same typeface is used in several places, report it once with the most representative role.',
  'Return at most 6 fonts, most prominent first.',
  'For each font:',
  '- sampleText: a short snippet of the actual text shown in that typeface (a few words is enough).',
  '- identifiedName: your single best guess at the actual font name. If you are not reasonably sure, leave it EMPTY rather than inventing a specific name.',
  '- family: a plain-language classification, e.g. "Geometric sans-serif", "Humanist sans-serif", "Transitional serif", "Slab serif", "Monospace", "Script", "Display".',
  '- isLikelyCustom: true if this looks like a proprietary/custom or brand-exclusive typeface unlikely to be freely available.',
  '- confidence: 0..1, how sure you are of identifiedName specifically. Use low values when guessing.',
  '- alternatives: 3 to 5 real fonts a person could actually get and use to reproduce this look, ordered best match first. They must span more than one source. Specifically:',
  '  * ALWAYS include the closest Microsoft Office / Windows-bundled font. This is a priority - MS Office availability matters most. Draw from fonts that ship with current Microsoft Office / Windows, e.g. Aptos (the current Office default), Calibri, Cambria, Segoe UI, Arial, Times New Roman, Georgia, Verdana, Tahoma, Corbel, Constantia, Candara, Consolas.',
  '  * ALSO include at least one freely downloadable font (Google Fonts, or another free / open-source foundry).',
  '  * Do NOT return only Google Fonts.',
  '  Each alternative has: name (the exact font family name); availability, one of "office" (ships with Microsoft Office or Windows), "google" (available on Google Fonts), "free" (free download from another source), "system" (other OS system font), "paid" (commercial); source (a short human label like "Microsoft Office" or "Google Fonts"); note (why it matches, and where to get it if not obvious).',
  'Be honest: it is better to give the family and good real-world equivalents than a confidently wrong exact name. Do not invent font names you are unsure of.',
  'notes: one short overall remark (optional, may be empty).'
].join('\n');

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    fonts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          role: { type: 'STRING' },
          sampleText: { type: 'STRING' },
          identifiedName: { type: 'STRING' },
          family: { type: 'STRING' },
          isLikelyCustom: { type: 'BOOLEAN' },
          confidence: { type: 'NUMBER' },
          alternatives: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                availability: { type: 'STRING' },
                source: { type: 'STRING' },
                note: { type: 'STRING' }
              }
            }
          }
        }
      }
    },
    notes: { type: 'STRING' }
  }
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

// data:image/jpeg;base64,XXXX  ->  { mime, data }
function parseDataUrl(s) {
  if (typeof s !== 'string') return null;
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(s.trim());
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

// Gemini (thinking models included) may return several parts; the JSON we want
// is in the first part that actually carries text. Skip thought-only parts.
function extractText(data) {
  const cand = data && data.candidates && data.candidates[0];
  const parts = cand && cand.content && cand.content.parts;
  if (!Array.isArray(parts)) return '';
  for (const p of parts) {
    if (p && typeof p.text === 'string' && p.text.trim()) return p.text;
  }
  return '';
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.GEMINI_API_KEY) {
      return json({ ok: false, error: 'Font finding is not configured on this server yet.' }, 503);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return json({ ok: false, error: 'Invalid request.' }, 400);
    }

    const parsed = parseDataUrl(payload && payload.image);
    if (!parsed) return json({ ok: false, error: 'No image was provided.' }, 400);
    if (parsed.data.length > MAX_BYTES) {
      return json({ ok: false, error: 'That image is too large. Try again - the tool downscales automatically.' }, 413);
    }

    const parts = [
      { text: PROMPT },
      { inline_data: { mime_type: parsed.mime, data: parsed.data } }
    ];

    const model = env.GEMINI_MODEL || DEFAULT_MODEL;
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(model) + ':generateContent';

    const body = {
      contents: [{ parts: parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        // Minimize thinking (default "medium" is slow enough to time out on the
        // free tier). "low" is the least the Gemini 3 Flash models allow. If you
        // pin an older 2.5-era model via GEMINI_MODEL, use { thinkingBudget: 0 }.
        thinkingConfig: { thinkingLevel: 'low' },
        // Thinking tokens count against maxOutputTokens - leave room for the JSON.
        maxOutputTokens: 8192
      }
    };

    // Bound the upstream call so a slow/hanging model returns a clean JSON error
    // instead of letting the whole function get killed with a platform 502.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (e) {
      clearTimeout(timer);
      const aborted = e && (e.name === 'AbortError' || e.name === 'TimeoutError');
      return json({
        ok: false,
        error: aborted
          ? 'The font service took too long to respond. Please try again.'
          : 'Could not reach the font service. Please try again.'
      }, 504);
    }
    clearTimeout(timer);

    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch (e) { detail = ''; }
      console.log('font: gemini error', res.status, detail.slice(0, 800));

      if (res.status === 429) {
        return json({ ok: false, error: 'The free quota has been used up for now. Please try again later.', status: 429 }, 429);
      }
      return json({
        ok: false,
        error: 'The font service returned an error (HTTP ' + res.status + '). If this is a 404, the model name is wrong - set GEMINI_MODEL to one from your key\'s model list.',
        status: res.status,
        detail: detail.slice(0, 400)
      }, 502);
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      return json({ ok: false, error: 'The font service returned an unexpected response.' }, 502);
    }

    const text = extractText(data);
    if (!text) {
      let reason = '';
      try { reason = (data.candidates && data.candidates[0] && data.candidates[0].finishReason) || ''; } catch (e) {}
      return json({ ok: false, error: 'Could not read any fonts from this image.', reason }, 200);
    }

    let out;
    try {
      out = JSON.parse(text);
    } catch (e) {
      return json({ ok: false, error: 'The service returned data we could not read. Please try another screenshot.' }, 200);
    }

    return json({ ok: true, data: out }, 200);
  } catch (err) {
    // Last-resort guard: any unexpected throw becomes a readable JSON error
    // rather than an opaque platform 502.
    console.log('font: unhandled error', err && (err.stack || err.message));
    return json({ ok: false, error: 'Something went wrong reading the fonts.', detail: String(err && (err.message || err)).slice(0, 300) }, 500);
  }
}

export function onRequestGet() {
  return json({ ok: false, error: 'Use POST.' }, 405);
}
