// Builds the whole techtuate site into ./dist for Cloudflare Pages.
//
// Adding a new tool: drop a folder into the repo root, either
//   (a) a Vite/React app that builds to ./<name>/dist, OR
//   (b) plain static files (will be copied as-is).
// Then add the folder name to the TOOLS array below.

import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, existsSync, copyFileSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = join(root, 'dist');

// Tools each have their own build step (typically a Vite app).
const TOOLS = [
  'pdf-editor',
  'json-formatter',
];

// Single root-level files to copy as-is.
const ROOT_STATIC_FILES = [
  'index.html',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
];

// Whole directories at the repo root to copy as-is (recursively).
const STATIC_DIRS = [
  'assets',
  'vs',
  'why-free',
  'free-pdf-editor',
  'qr-code',
  'password-generator',
  'svg-converter',
  'sql-to-excel',
  'image-resize',
  'card-reader',
  'color-palette',
  'audio-converter',
  'word-counter',
  'font-finder',
  'diff-checker',
  'pdf-password-remover',
  'photo-to-scan',
  'business-card-maker',
  'c',
];

// NOTE: the /card-reader/ tool also relies on a Cloudflare Pages Function at
// /functions/api/scan.js. That functions/ directory lives at the REPO ROOT and
// is auto-detected and compiled by Cloudflare Pages at deploy time. It is NOT
// copied into ./dist (Cloudflare requires functions to sit outside the static
// output dir), so this build script deliberately does nothing with it.

function log(...args) { console.log('[build]', ...args); }

function isVitelike(toolDir) {
  return existsSync(join(toolDir, 'package.json')) && existsSync(join(toolDir, 'vite.config.js'));
}

function buildTool(name) {
  const toolDir = join(root, name);
  if (!existsSync(toolDir)) {
    log(`! skipping "${name}" - folder not found`);
    return;
  }
  const outTarget = join(dist, name);

  if (isVitelike(toolDir)) {
    log(`building ${name} (vite)...`);
    execSync('npm install --no-audit --no-fund', { cwd: toolDir, stdio: 'inherit' });
    execSync('npm run build', { cwd: toolDir, stdio: 'inherit' });
    const buildOut = join(toolDir, 'dist');
    cpSync(buildOut, outTarget, { recursive: true });
  } else {
    log(`copying ${name} (static)...`);
    cpSync(toolDir, outTarget, { recursive: true });
  }
}

// --- clean ---
if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// --- root static files ---
for (const f of ROOT_STATIC_FILES) {
  const src = join(root, f);
  if (existsSync(src)) {
    copyFileSync(src, join(dist, f));
    log(`copied /${f}`);
  } else {
    log(`! missing root file: ${f}`);
  }
}

// --- static directories ---
for (const d of STATIC_DIRS) {
  const src = join(root, d);
  if (existsSync(src)) {
    cpSync(src, join(dist, d), { recursive: true });
    log(`copied /${d}/`);
  } else {
    log(`! missing static dir: ${d}`);
  }
}

// --- build each tool ---
for (const tool of TOOLS) {
  buildTool(tool);
}

// --- cache-busting ---
// Cloudflare serves CSS/JS with a 4-hour browser cache, so after a deploy a
// returning visitor can get the NEW html with the OLD script and styles (this
// broke the card reader once). Every local .css/.js reference in the built
// HTML gets ?v=<content hash>, so a changed file is always a new URL and an
// unchanged one stays cached. Vite-built tools already hash their files.
function walkHtml(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkHtml(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}
const hashCache = new Map();
function hashOf(file) {
  if (!hashCache.has(file)) {
    hashCache.set(file, createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 10));
  }
  return hashCache.get(file);
}
let busted = 0;
for (const htmlFile of walkHtml(dist, [])) {
  const html = readFileSync(htmlFile, 'utf8');
  const next = html.replace(/(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"?#]+\.(?:css|js))(")/g, (m, pre, url, post) => {
    if (/^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('data:')) return m; // external
    const file = url.startsWith('/') ? join(dist, url) : join(dirname(htmlFile), url);
    if (!existsSync(file)) return m;
    busted++;
    return pre + url + '?v=' + hashOf(file) + post;
  });
  if (next !== html) writeFileSync(htmlFile, next);
}
log(`cache-busted ${busted} css/js references`);

log('done ->', dist);
