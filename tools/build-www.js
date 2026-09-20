/* Sentinel — assemble the installable `www/` bundle for Capacitor + PWA serving.
 *
 * The single source of truth for *what ships* is the service worker's ASSETS
 * list (sw.js): everything Sentinel needs offline is in that array. This script
 * copies exactly those files into www/, so the native shell, the PWA, and the
 * smoke test can never disagree about the runtime surface.
 *
 *   node tools/build-www.js          # rebuild www/ from the repo root
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

function assetList() {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const m = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
  if (!m) throw new Error('sw.js: could not find the ASSETS array');
  const out = [];
  const re = /'((?:[^'\\]|\\.)*)'/g;
  let hit;
  while ((hit = re.exec(m[1]))) out.push(hit[1].replace(/\\'/g, "'"));
  return out;
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function main() {
  const assets = assetList();
  rmrf(www);
  fs.mkdirSync(www, { recursive: true });

  let copied = 0;
  for (const entry of assets) {
    const rel = entry.replace(/^\.\//, '');
    if (!rel) continue;                 // './' is the navigation root, not a file
    const src = path.join(root, rel);
    if (!fs.existsSync(src)) throw new Error(`sw.js ASSETS references ${entry} but it is missing on disk — build aborted`);
    const dst = path.join(www, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    copied++;
  }
  console.log(`www/ built: ${copied} files from sw.js ASSETS`);
  console.log('now: npx cap sync  (Copies www/ into the native project)');
}

main();