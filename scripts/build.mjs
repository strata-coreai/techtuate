// Builds the whole techtuate site into ./dist for Cloudflare Pages.
//
// Output layout:
//   dist/
//     index.html           (root landing)
//     robots.txt           (root file)
//     sitemap.xml          (root file)
//     llms.txt             (root file)
//     assets/              (shared CSS for marketing pages)
//     vs/                  (comparison hub + per-competitor pages)
//     why-free/            (article)
//     free-pdf-editor/     (SEO landing)
//     pdf-editor/          (built Vite app from pdf-editor/dist)
//
// Adding a new tool: drop a folder into the repo root, either
//   (a) a Vite/React app that builds to ./<name>/dist, OR
//   (b) plain static files (will be copied as-is).
// Then add the folder name to the TOOLS array below.
//
// Adding a new marketing page: drop it under STATIC_DIRS or ROOT_STATIC.

import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
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
// These are static marketing/SEO pages and shared assets.
const STATIC_DIRS = [
  'assets',
  'vs',
  'why-free',
  'free-pdf-editor',
];

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

log('done ->', dist);
