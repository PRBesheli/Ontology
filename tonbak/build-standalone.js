/**
 * Bundles the app into one self-contained .html file.
 *
 * The point is a file you can open straight from the Files app or a LAN
 * server with nothing else alongside it. That rules out ES modules — a
 * `file://` page cannot load them (opaque origin, blocked by CORS) — so each
 * module is wrapped in an IIFE and wired through a small registry instead of
 * import/export.
 *
 * Concatenating the modules flat would be simpler and wrong: `ring` is a
 * function in synth.js and an object in app.js, and there are more collisions
 * waiting the moment anyone adds a helper. The IIFE-per-module approach keeps
 * each file's scope exactly as it was.
 *
 *   node build-standalone.js  →  dist/tonbak.html
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'dist');

// Dependency order — a module may only reference ones already defined.
const MODULES = [
  'js/data/strokes.js',
  'js/data/rhythms.js',
  'js/data/dastgah.js',
  'js/audio/synth.js',
  'js/audio/context.js',
  'js/audio/engine.js',
  'js/audio/drone.js',
  'js/app.js',
];

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const key = (p) => path.basename(p, '.js');

const IMPORT_RE = /^[ \t]*import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?[ \t]*$/gm;
const EXPORT_DECL_RE = /^[ \t]*export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;

function transform(src, file) {
  // Collect `import { a, b } from './x.js'` → destructuring off the registry.
  const bindings = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const names = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length) bindings.push(`  const { ${names.join(', ')} } = __m.${key(m[2])};`);
  }

  // Collect exported names so the module can hand them back.
  const exported = [];
  EXPORT_DECL_RE.lastIndex = 0;
  while ((m = EXPORT_DECL_RE.exec(src)) !== null) exported.push(m[1]);

  if (/^\s*export\s+(default|\{)/m.test(src)) {
    throw new Error(`${file}: default and re-exports are not handled by this bundler`);
  }

  const body = src
    .replace(IMPORT_RE, '')
    .replace(/^([ \t]*)export\s+(?=(?:async\s+)?(?:const|let|var|function|class)\b)/gm, '$1');

  const ret = exported.length ? `\n  return { ${exported.join(', ')} };\n` : '\n';

  return [
    `/* ── ${file} ${'─'.repeat(Math.max(0, 64 - file.length))} */`,
    `__m.${key(file)} = (function () {`,
    bindings.join('\n'),
    body,
    ret,
    `})();`,
  ]
    .filter(Boolean)
    .join('\n');
}

function build() {
  const bundle = MODULES.map((f) => transform(read(f), f)).join('\n\n');

  const script = `(function () {
'use strict';
// Module registry standing in for ES import/export.
const __m = {};

${bundle}
})();`;

  const css = read('css/styles.css');
  const iconB64 = fs.readFileSync(path.join(ROOT, 'icons/icon-180.png')).toString('base64');
  const iconUri = `data:image/png;base64,${iconB64}`;

  let html = read('index.html');

  // Inline the stylesheet.
  html = html.replace(
    /<link rel="stylesheet" href="css\/styles\.css">/,
    `<style>\n${css}\n</style>`
  );

  // Icons become data URIs; the manifest goes, since a standalone file has no
  // origin for one to be scoped to and iOS reads the apple-touch meta tags here.
  html = html.replace(/<link rel="apple-touch-icon"[^>]*>/, `<link rel="apple-touch-icon" href="${iconUri}">`);
  html = html.replace(/<link rel="icon"[^>]*>\s*/, `<link rel="icon" type="image/png" href="${iconUri}">\n`);
  html = html.replace(/\s*<link rel="manifest"[^>]*>/, '');

  // Swap the module script for the bundle.
  html = html.replace(
    /<script type="module" src="js\/app\.js"><\/script>/,
    `<script>\n${script}\n</script>`
  );

  // Nothing to cache and no origin to register against in this build.
  html = html.replace(
    /<p class="gate-note">[\s\S]*?<\/p>/,
    '<p class="gate-note">Standalone build — everything runs on-device, with no network of any kind.<br>Share ▸ Add to Home Screen for full-screen play.</p>'
  );

  if (html.includes('type="module"') || html.includes('css/styles.css')) {
    throw new Error('inlining missed something — the file still references external assets');
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, 'tonbak.html');
  fs.writeFileSync(out, html);

  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`dist/tonbak.html  ${kb} KB  (${MODULES.length} modules inlined)`);
  return out;
}

build();
