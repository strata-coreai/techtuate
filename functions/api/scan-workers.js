// Cloudflare Pages Function: POST /api/scan-workers
// Reads a business card with a Cloudflare Workers AI vision model instead of
// Gemini. Same request and response shape as /api/scan:
//   request  { images: [dataUrl, ...], model?: '@cf/...' }
//   response { ok: true, data: {...contact} } or { ok: false, error, httpStatus }
// Runs on Cloudflare's own AI (the free daily allowance of the account), needs
// no third-party key, and Cloudflare does not keep or train on the inputs.
//
// Setup: Cloudflare Pages -> Settings -> Bindings -> add "Workers AI" with the
// variable name AI, then redeploy. Optional env var WORKERS_AI_MODEL picks the
// default model.
//
// Built first as a side-by-side test against Gemini (see /card-reader/bench/).

import { PROMPT, RESPONSE_SCHEMA } from './scan.js';

const DEFAULT_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
// Only these may be picked per request (the bench compares them). Keeps anyone
// from pointing the endpoint at an expensive model.
const ALLOWED_MODELS = [
  '@cf/meta/llama-4-scout-17b-16e-instruct',
  '@cf/google/gemma-3-12b-it',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/meta/llama-3.2-11b-vision-instruct'
];
const MAX_IMAGES = 2;
const MAX_BYTES = 6 * 1024 * 1024;

function json(body, status) {
  // Never send 5xx: Cloudflare would swap the body for its own HTML error page.
  let code = status || 200;
  if (code >= 500) { body = Object.assign({ httpStatus: code }, body); code = 200; }
  return new Response(JSON.stringify(body), {
    status: code,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

// Gemini-style schema (type: 'OBJECT') -> standard JSON Schema (type: 'object').
function toJsonSchema(s) {
  if (Array.isArray(s)) return s.map(toJsonSchema);
  if (!s || typeof s !== 'object') return s;
  const out = {};
  for (const k of Object.keys(s)) {
    out[k] = k === 'type' && typeof s[k] === 'string' ? s[k].toLowerCase() : toJsonSchema(s[k]);
  }
  return out;
}
const SCHEMA = toJsonSchema(RESPONSE_SCHEMA);

const JSON_HINT = 'Reply with ONLY a JSON object with these keys: fullName, jobTitle, company, searchName, ' +
  'emails (array of strings), phones (array of {value, type, e164, isMobile}), website, address, notes, ' +
  'confidence ({fullName, jobTitle, company} numbers 0..1). No markdown, no code fences, no commentary.';

// Pull the first JSON object out of whatever the model returned.
function extractJson(res) {
  if (!res) return null;
  let r = res.response !== undefined ? res.response : res;
  if (r && typeof r === 'object' && !Array.isArray(r)) return r;
  if (typeof r !== 'string') {
    const c = res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content;
    if (typeof c === 'string') r = c; else return null;
  }
  r = r.replace(/```(?:json)?/gi, '');
  const start = r.indexOf('{');
  const end = r.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(r.slice(start, end + 1)); } catch (e) { return null; }
}

function dataUrlBytes(u) {
  const b64 = u.slice(u.indexOf(',') + 1);
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function runModel(env, model, imgs) {
  const text = PROMPT + '\n' + JSON_HINT;

  // Llama 3.2 Vision takes raw image bytes (one image) and a one-time licence "agree".
  if (/llama-3\.2-11b-vision/.test(model)) {
    const call = () => env.AI.run(model, {
      messages: [{ role: 'user', content: text }],
      image: Array.from(dataUrlBytes(imgs[0])),
      max_tokens: 1200
    });
    try { return await call(); }
    catch (e) {
      if (/agree/i.test(String(e && e.message))) { await env.AI.run(model, { prompt: 'agree' }); return await call(); }
      throw e;
    }
  }

  const content = [{ type: 'text', text: text }].concat(
    imgs.map(u => ({ type: 'image_url', image_url: { url: u } }))
  );
  const base = { messages: [{ role: 'user', content: content }], max_tokens: 1500, temperature: 0 };
  try {
    return await env.AI.run(model, Object.assign({}, base, {
      response_format: { type: 'json_schema', json_schema: SCHEMA }
    }));
  } catch (e) {
    // Some models reject structured output; fall back to the prompt-only JSON request.
    if (/response_format|json_schema|schema/i.test(String(e && e.message))) return await env.AI.run(model, base);
    throw e;
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.AI) return json({ ok: false, error: 'Workers AI is not bound to this project yet (Settings -> Bindings -> Workers AI, name AI).' }, 503);

    let payload;
    try { payload = await request.json(); } catch (e) { return json({ ok: false, error: 'Invalid request.' }, 400); }
    const imgs = payload && Array.isArray(payload.images) ? payload.images.slice(0, MAX_IMAGES) : [];
    if (!imgs.length) return json({ ok: false, error: 'No image was provided.' }, 400);
    for (const u of imgs) {
      if (typeof u !== 'string' || !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(u)) return json({ ok: false, error: 'One of the images was not a valid image.' }, 400);
      if (u.length > MAX_BYTES) return json({ ok: false, error: 'That image is too large.' }, 413);
    }

    const model = ALLOWED_MODELS.indexOf(payload.model) >= 0 ? payload.model : (env.WORKERS_AI_MODEL || DEFAULT_MODEL);
    const t0 = Date.now();
    let res;
    try {
      res = await runModel(env, model, imgs);
    } catch (e) {
      const msg = String(e && e.message || e).slice(0, 300);
      const quota = /neuron|quota|limit|429|capacity/i.test(msg);
      return json({ ok: false, error: quota ? 'The free reading quota has been used up for now. Please try again later.' : 'The reading service returned an error.', detail: msg, model: model }, quota ? 429 : 502);
    }
    const data = extractJson(res);
    if (!data) return json({ ok: false, error: 'The reader returned data we could not read.', model: model, raw: JSON.stringify(res).slice(0, 400) }, 200);
    return json({ ok: true, data: data, model: model, ms: Date.now() - t0 }, 200);
  } catch (err) {
    return json({ ok: false, error: 'Something went wrong reading the card.', detail: String(err && (err.message || err)).slice(0, 300) }, 500);
  }
}

export function onRequestGet() {
  return json({ ok: false, error: 'Use POST.' }, 405);
}
