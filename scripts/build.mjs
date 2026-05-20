// Builds the whole techtuate site into ./dist for Cloudflare Pages.
//
// Layout the script produces:
//   dist/
//     index.html         (root landing page, copied as-is)
//     pdf-editor/        (built Vite app from pdf-editor/dist)
//     <other tool>/      (each future tool's built output)
//
// Adding a new tool: drop it into ./<tool-name>/ as either:
//   (a) a Vite/React app that builds to ./<tool-name>/dist, OR
//   (b) a folder of plain static files (will be copied as-is).
// Then add the tool name to the TOOLS list below.

import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, rmSync, existsSync, statSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = join(root, 'dist');

// Each entry is the folder name (relative to repo root) of a tool.
const TOOLS = [
  'pdf-editor',
];

// --- root static files copied as-is ---
const ROOT_STATIC = ['index.html']; // add more as the landing page grows

function log(...args) { console.log('[build]', ...args); }

function isVitelike(toolDir) {
  return existsSync(join(toolDir, 'package.json')) && existsSync(join(toolDir, 'vite.config.js'));
}

function buildTool(name) {
  const toolDir = join(root, name);
  if (!existsSync(toolDir)) {
    log(`! skipping "${name}" — folder not found`);
    return;
  }
  const outTarget = join(dist, name);

  if (isVitelike(toolDir)) {
    log(`building ${name} (vite)…`);
    execSync('npm install --no-audit --no-fund', { cwd: toolDir, stdio: 'inherit' });
    execSync('npm run build', { cwd: toolDir, stdio: 'inherit' });
    const buildOut = join(toolDir, 'dist');
    cpSync(buildOut, outTarget, { recursive: true });
  } else {
    log(`copying ${name} (static)…`);
    cpSync(toolDir, outTarget, { recursive: true });
  }
}

// --- clean ---
if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// --- copy root statics ---
for (const f of ROOT_STATIC) {
  const src = join(root, f);
  if (existsSync(src)) {
    copyFileSync(src, join(dist, f));
    log(`copied /${f}`);
  }
}

// --- build each tool ---
for (const tool of TOOLS) {
  buildTool(tool);
}

log('done →', dist);
