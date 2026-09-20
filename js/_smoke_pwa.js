/* PWA installability + offline-surface smoke test (headless, no DOM).
 *
 * Proves the four things that must never drift apart:
 *   1. the manifest is valid and references icons that exist with the right raster size
 *   2. every file the index.html loads is in the service worker's ASSETS cache
 *      (misses here = offline breaks — e.g. the pillar_memory.js regression)
 *   3. every file in the ASSETS cache exists on disk (a cached 404 is fatal offline)
 *   4. the manifest and the <head> agree (theme color, icon, links)
 *
 *   node js/_smoke_pwa.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name); } }

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// ---- 1. manifest basics + icons ----
check('manifest is valid JSON', !!manifest.name);
check('standalone display + correct start_url', manifest.display === 'standalone' && /index\.html/.test(manifest.start_url || ''));
check('theme_color present and matches <meta>', manifest.theme_color === '#0b0d10' && new RegExp(`theme-color" content="${manifest.theme_color}"`).test(html));

function pngMagic(p) { const b = fs.readFileSync(p).subarray(0, 8); return b.length === 8 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71; }
function pngSize(p) { // IHDR width/height (big-endian at bytes 16..23)
  const b = fs.readFileSync(p);
  if (b.length < 24) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const iconSizes = new Set();
for (const ic of (manifest.icons || [])) {
  const file = path.join(root, ic.src);
  check(`manifest icon ${ic.src} exists`, fs.existsSync(file));
  if (!/\.png$/i.test(ic.src)) continue;
  check(`manifest icon ${ic.src} is a real PNG`, pngMagic(file));
  const want = /^(\d+)x(\d+)$/.exec(ic.sizes || '');
  const got = pngSize(file);
  if (want && got) {
    check(`manifest icon ${ic.src} is really ${ic.sizes}`, got.w === +want[1] && got.h === +want[2]);
    iconSizes.add(got.w);
  }
}
// installability needs a 192px and a 512px raster; maskable covers Android adaptive icons
check('has a 192px raster icon', iconSizes.has(192));
check('has a 512px raster icon', iconSizes.has(512));
check('has a maskable icon for Android adaptive icons', (manifest.icons || []).some(ic => (ic.purpose || '').includes('maskable')));
check('apple-touch-icon (180) linked and present in head', /apple-touch-icon" sizes="180x180" href="assets\/icon-180\.png"/.test(html) && fs.existsSync(path.join(root, 'assets/icon-180.png')));

// ---- 2. sw.js ASSETS list ----
const m = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
check('sw.js has an ASSETS array', !!m);
const assets = [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1].replace(/^\.\//, '').replace(/\/$/, ''));
check('every cached asset exists on disk', assets.every(a => a === '' || fs.existsSync(path.join(root, a))));

// every runtime asset index.html loads must be in the cache
const refs = [...html.matchAll(/\b(?:src|href)="([^"]+\.(?:js|css|webmanifest|png|svg))"/g)].map(x => x[1]);
const missing = [];
for (const href of refs) {
  const rel = href.split('?')[0].replace(/^\.\//, '');
  if (/^https?:|^\/|^#/.test(href)) continue;
  if (!assets.includes(rel)) missing.push(rel);
}
check('every <script>/<link> in index.html is covered by the offline cache' +
      (missing.length ? ` (missing: ${missing.join(', ')})` : ''), missing.length === 0);

// guard specifically against the pillar_memory-style silent offline break
check('pillar_memory.js is cached (Memory Palace works offline)', assets.includes('js/pillar_memory.js'));

// manifest + icons themselves cached
check('manifest + icons are cached', ['manifest.webmanifest', 'assets/icon-192.png', 'assets/icon-512-maskable.png'].every(a => assets.includes(a)));

// ---- 4. sw.js is syntactically valid ----
try { new Function(sw); check('sw.js parses as JS', true); } catch (e) { check('sw.js parses as JS', false, e); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);