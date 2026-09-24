// Cloudflare Pages Function: POST /api/scan
// Reads a business card image (or a front+back pair) with Google Gemini and
// returns structured contact JSON. The API key stays server-side (env var),
// never in the client. The image is forwarded once for reading and is not
// stored or logged here.
//
// Required env var (set in Cloudflare Pages -> Settings -> Variables and Secrets,
// encrypted):  GEMINI_API_KEY
// Optional:     GEMINI_MODEL   (defaults to gemini-flash-latest)
//
// Model is isolated to the small config below so the provider can be swapped
// (GLM-4.6V, Qwen-VL, Workers AI, etc.) without touching the client.

// gemini-flash-latest is an alias that tracks the newest Flash model. As of
// 2026 it points to a Gemini 3.x "thinking" model, so we set thinkingLevel to
// "low" below - otherwise the model spends seconds reasoning by default, which
// is slow, costs tokens, and on the free tier can get the function killed
// mid-request (a Cloudflare 502) before it can respond. (Gemini 3 Flash does
// not support fully turning thinking off; "low" is the minimum. Older 2.5-era
// models used thinkingBudget instead - if you pin one via GEMINI_MODEL, swap
// the thinkingConfig accordingly.) Override the model with the GEMINI_MODEL env var.
const DEFAULT_MODEL = 'gemini-flash-latest';
// When the main model is overloaded (Gemini 503 "high demand"), the last attempt
// goes to the lighter Flash-Lite alias, which usually has spare capacity.
// Override with GEMINI_FALLBACK_MODEL, or set it to "none" to disable.
const DEFAULT_FALLBACK_MODEL = 'gemini-flash-lite-latest';
const MAX_IMAGES = 2;
const MAX_BYTES = 6 * 1024 * 1024; // ~6MB of base64 per image, generous for a downscaled JPEG
const UPSTREAM_TIMEOUT_MS = 25000; // give the model time, but never hang the function

const PROMPT = [
  'You are reading a business card. One or two images may be provided (front and back of the same card).',
  'Extract the contact details and return ONLY the JSON described by the schema.',
  'Merge information across the front and back into a single contact.',
  'Rules:',
  '- Leave a field empty (empty string or empty array) if it is not clearly present. Do NOT guess or invent values.',
  '- Separate multiple emails and multiple phone numbers into individual array entries.',
  '- For each phone, set type to one of: mobile, work, home, other (best guess from labels/icons).',
  '- For each phone, also provide e164: the number in full international E.164 format (a leading +, the country calling code, then digits only, no spaces or punctuation). Infer the country from the card - the printed country code, the address, or the country of the company. If the country genuinely cannot be determined, leave e164 empty.',
  '- For each phone, set isMobile to true if it is a mobile/cell number and false otherwise (landline/office/fax). Decide using the country\'s own mobile numbering rules (mobile prefixes) plus any "mobile"/"cell"/"M:" label or phone icon on the card. Most countries clearly separate mobile from fixed-line ranges.',
  '- searchName: the short common brand name people would actually search to find this person on LinkedIn - at most 1-2 words, NOT the full legal name. Drop legal suffixes (Inc, LLC, Ltd, Limited, Corp, Corporation, Co, GmbH, Pvt Ltd, Private Limited, etc.) and leading articles. Examples: "The Coca-Cola Company" -> "Coca-Cola"; "Bright Minds Technologies Pvt Ltd" -> "Bright Minds"; "JPMorgan Chase & Co." -> "JPMorgan". Leave empty if company is empty.',
  '- website is the plain domain or URL. address is a single human-readable line.',
  '- confidence: a 0..1 estimate for how sure you are of fullName, jobTitle, and company.'
].join('\n');

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    fullName: { type: 'STRING' },
    jobTitle: { type: 'STRING' },
    company: { type: 'STRING' },
    searchName: { type: 'STRING' },
    emails: { type: 'ARRAY', items: { type: 'STRING' } },
    phones: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          value: { type: 'STRING' },
          type: { type: 'STRING' },
          e164: { type: 'STRING' },
          isMobile: { type: 'BOOLEAN' }
        }
      }
    },
    website: { type: 'STRING' },
    address: { type: 'STRING' },
    notes: { type: 'STRING' },
    confidence: {
      type: 'OBJECT',
      properties: {
        fullName: { type: 'NUMBER' },
        jobTitle: { type: 'NUMBER' },
        company: { type: 'NUMBER' }
      }
    }
  }
};

// Cloudflare swaps any 5xx a Function returns for its own HTML "502 Bad gateway"
// page, which hides our JSON error and makes the client show a generic network
// error. So error responses that would be 5xx go out as HTTP 200 with ok:false,
// and the intended status travels in the body (httpStatus) for debugging.
function json(body, status) {
  let code = status || 200;
  if (code >= 500) {
    body = Object.assign({ httpStatus: code }, body);
    code = 200;
  }
  return new Response(JSON.stringify(body), {
    status: code,
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
      return json({ ok: false, error: 'Card reading is not configured on this server yet.' }, 503);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return json({ ok: false, error: 'Invalid request.' }, 400);
    }

    const imgs = payload && Array.isArray(payload.images) ? payload.images.slice(0, MAX_IMAGES) : [];
    if (!imgs.length) return json({ ok: false, error: 'No image was provided.' }, 400);

    const parts = [{ text: PROMPT }];
    for (const raw of imgs) {
      const parsed = parseDataUrl(raw);
      if (!parsed) return json({ ok: false, error: 'One of the images was not a valid image.' }, 400);
      if (parsed.data.length > MAX_BYTES) return json({ ok: false, error: 'That image is too large. Try again - the tool downscales automatically.' }, 413);
      parts.push({ inline_data: { mime_type: parsed.mime, data: parsed.data } });
    }

    const model = env.GEMINI_MODEL || DEFAULT_MODEL;
    const fallbackModel = env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
    const urlFor = function (m) {
      return 'https://generativelanguage.googleapis.com/v1beta/models/' +
        encodeURIComponent(m) + ':generateContent';
    };

    const body = {
      contents: [{ parts: parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        // Minimize thinking: this is a straight extraction task, and default
        // ("medium") thinking makes the newer Flash aliases slow enough to time
        // out on the free tier. "low" is the least the Gemini 3 Flash allows.
        thinkingConfig: { thinkingLevel: 'low' },
        // Give the JSON output room even after low thinking uses some tokens
        // (thinking tokens count against maxOutputTokens).
        maxOutputTokens: 8192
      }
    };

    // Bound the upstream call so a slow/hanging model returns a clean JSON error
    // instead of letting the whole function get killed with a platform 502.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    let res;
    try {
      // Plan: main model, a quick retry of it, then the fallback model. Only a
      // 500/503 (overloaded) moves on to the next step; the timeout bounds it all.
      const plan = [model, model];
      if (fallbackModel && fallbackModel !== 'none' && fallbackModel !== model) plan.push(fallbackModel);
      for (let i = 0; i < plan.length; i++) {
        const m = plan[i];
        // The fallback may be an older model that rejects thinkingLevel, so it
        // gets the request without a thinkingConfig (its default is light anyway).
        let reqBody = body;
        if (m !== model) {
          const gc = Object.assign({}, body.generationConfig);
          delete gc.thinkingConfig;
          reqBody = Object.assign({}, body, { generationConfig: gc });
        }
        res = await fetch(urlFor(m), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.GEMINI_API_KEY
          },
          body: JSON.stringify(reqBody),
          signal: controller.signal
        });
        if ((res.status === 503 || res.status === 500) && i < plan.length - 1) {
          try { await res.text(); } catch (e) {}
          if (plan[i + 1] === m) await new Promise(function (r) { setTimeout(r, 1200); });
          continue;
        }
        break;
      }
    } catch (e) {
      clearTimeout(timer);
      const aborted = e && (e.name === 'AbortError' || e.name === 'TimeoutError');
      return json({
        ok: false,
        error: aborted
          ? 'The reading service took too long to respond. Please try again, or type the details in manually.'
          : 'Could not reach the reading service. Please try again.'
      }, 504);
    }
    clearTimeout(timer);

    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch (e) { detail = ''; }
      console.log('scan: gemini error', res.status, detail.slice(0, 800));

      if (res.status === 429) {
        return json({ ok: false, error: 'The free reading quota has been used up for now. Please try again later or type the details in manually.', status: 429 }, 429);
      }
      if (res.status === 503 || res.status === 500) {
        return json({ ok: false, error: 'The reading service is busy right now. Please try again in a moment.', status: res.status, detail: detail.slice(0, 400) }, 503);
      }
      return json({
        ok: false,
        error: 'The reading service returned an error (HTTP ' + res.status + '). If this is a 404, the model name is wrong - set GEMINI_MODEL to one from your key\'s model list.',
        status: res.status,
        detail: detail.slice(0, 400)
      }, 502);
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      return json({ ok: false, error: 'The reading service returned an unexpected response.' }, 502);
    }

    const text = extractText(data);
    if (!text) {
      // Surface the finish reason (e.g. SAFETY, MAX_TOKENS) to aid debugging.
      let reason = '';
      try { reason = (data.candidates && data.candidates[0] && data.candidates[0].finishReason) || ''; } catch (e) {}
      return json({ ok: false, error: 'The reader could not find any details on this card.', reason }, 200);
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return json({ ok: false, error: 'The reader returned data we could not read. Please type the details in.' }, 200);
    }

    return json({ ok: true, data: parsed }, 200);
  } catch (err) {
    // Last-resort guard: any unexpected throw becomes a readable JSON error
    // rather than an opaque platform 502.
    console.log('scan: unhandled error', err && (err.stack || err.message));
    return json({ ok: false, error: 'Something went wrong reading the card.', detail: String(err && (err.message || err)).slice(0, 300) }, 500);
  }
}

// Non-POST methods get a clean 405 (Pages routes each method to its handler).
export function onRequestGet() {
  return json({ ok: false, error: 'Use POST.' }, 405);
}
