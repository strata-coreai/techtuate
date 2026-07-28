// Cloudflare Pages Function: POST /api/scan
// Reads a business card image (or a front+back pair) with Google Gemini and
// returns structured contact JSON. The API key stays server-side (env var),
// never in the client. The image is forwarded once for reading and is not
// stored or logged here.
//
// Required env var (set in Cloudflare Pages -> Settings -> Environment variables,
// encrypted):  GEMINI_API_KEY
// Optional:     GEMINI_MODEL   (defaults to gemini-2.5-flash)
//
// Model is isolated to the small config below so the provider can be swapped
// (GLM-4.6V, Qwen-VL, Workers AI, etc.) without touching the client.

const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_IMAGES = 2;
const MAX_BYTES = 6 * 1024 * 1024; // ~6MB of base64 per image, generous for a downscaled JPEG

const PROMPT = [
  'You are reading a business card. One or two images may be provided (front and back of the same card).',
  'Extract the contact details and return ONLY the JSON described by the schema.',
  'Merge information across the front and back into a single contact.',
  'Rules:',
  '- Leave a field empty (empty string or empty array) if it is not clearly present. Do NOT guess or invent values.',
  '- Separate multiple emails and multiple phone numbers into individual array entries.',
  '- For each phone, set type to one of: mobile, work, home, other (best guess from labels/icons).',
  '- website is the plain domain or URL. address is a single human-readable line.',
  '- confidence: a 0..1 estimate for how sure you are of fullName, jobTitle, and company.'
].join('\n');

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    fullName: { type: 'STRING' },
    jobTitle: { type: 'STRING' },
    company: { type: 'STRING' },
    emails: { type: 'ARRAY', items: { type: 'STRING' } },
    phones: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { value: { type: 'STRING' }, type: { type: 'STRING' } }
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

export async function onRequestPost(context) {
  const { request, env } = context;

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
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) + ':generateContent';

  const body = {
    contents: [{ parts: parts }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA
    }
  };

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    return json({ ok: false, error: 'Could not reach the reading service. Please try again.' }, 502);
  }

  if (!res.ok) {
    // Surface a friendly message; do not leak the upstream error body.
    const status = res.status === 429 ? 429 : 502;
    const msg = res.status === 429
      ? 'The free reading quota for today has been used up. Please try again later or type the details in manually.'
      : 'The reading service returned an error. Please try again.';
    return json({ ok: false, error: msg }, status);
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    return json({ ok: false, error: 'The reading service returned an unexpected response.' }, 502);
  }

  // Gemini returns the JSON string inside candidates[0].content.parts[0].text
  let text = '';
  try {
    const cand = data.candidates && data.candidates[0];
    const p = cand && cand.content && cand.content.parts && cand.content.parts[0];
    text = (p && p.text) || '';
  } catch (e) { text = ''; }

  if (!text) return json({ ok: false, error: 'The reader could not find any details on this card.' }, 200);

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return json({ ok: false, error: 'The reader returned data we could not read. Please type the details in.' }, 200);
  }

  return json({ ok: true, data: parsed }, 200);
}

// Non-POST methods get a clean 405 (Pages routes each method to its handler).
export function onRequestGet() {
  return json({ ok: false, error: 'Use POST.' }, 405);
}
