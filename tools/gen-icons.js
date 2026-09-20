/* Sentinel — PWA icon rasterizer (no dependencies, no network).
 *
 * The app ships an SVG icon; installable PWAs (and the Play store) also need
 * real PNG rasters. This draws the same geometry by hand — a dark disc, two teal
 * pulse rings, the center "you" dot, and the four NaviBelt directional pips —
 * direct to a pixel buffer, then encodes PNG using Node's built-in zlib.
 *
 *   node tools/gen-icons.js
 *
 * Writes assets/icon-180.png, icon-192.png, icon-512.png (full-bleed, "any"),
 * and icon-512-maskable.png (artwork pulled into the 80% safe zone for the
 * Android adaptive-icon mask).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [11, 13, 16];          // #0b0d10
const TEAL = [0, 229, 160];       // #00e5a0

/* The icon, in 192-viewBox coordinates. */
const FEATURES = (s) => [
  // disc filled to the viewBox edge (base canvas is the same color already)
  { kind: 'fill', cx: 96, cy: 96, r: 96 * s, color: BG, alpha: 1 },
  // outer pulse ring
  { kind: 'ring', cx: 96, cy: 96, r: 84 * s, sw: 6 * s, color: TEAL, alpha: 0.4 },
  // inner accent ring
  { kind: 'ring', cx: 96, cy: 96, r: 58 * s, sw: 3 * s, color: TEAL, alpha: 1 },
  // center dot = the user
  { kind: 'fill', cx: 96, cy: 96, r: 10 * s, color: TEAL, alpha: 1 },
  // four directional pips (NaviBelt encoding): front / right / back / left
  { kind: 'fill', cx: 96, cy: 24 * s + 96 * (1 - s), r: 6 * s, color: TEAL, alpha: 0.9 },
  { kind: 'fill', cx: 168 * s + 96 * (1 - s), cy: 96, r: 6 * s, color: TEAL, alpha: 0.7 },
  { kind: 'fill', cx: 96, cy: 168 * s + 96 * (1 - s), r: 6 * s, color: TEAL, alpha: 0.7 },
  { kind: 'fill', cx: 24 * s + 96 * (1 - s), cy: 96, r: 6 * s, color: TEAL, alpha: 0.7 },
];

function rasterize(size, scale) {
  const buf = Buffer.alloc(size * size * 4);       // RGBA
  const feats = FEATURES(scale);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x + 0.5) / size * 192;           // pixel center in viewBox coords
      const fy = (y + 0.5) / size * 192;
      let r = BG[0], g = BG[1], b = BG[2], a = 255;
      for (const f of feats) {
        const d = Math.hypot(fx - f.cx, fy - f.cy);
        let inside = f.kind === 'fill' ? d <= f.r : Math.abs(d - f.r) <= f.sw / 2;
        if (!inside) continue;
        const o = f.alpha;
        r = r + (f.color[0] - r) * o;
        g = g + (f.color[1] - g) * o;
        b = b + (f.color[2] - b) * o;
      }
      const i = (y * size + x) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
    }
  }
  return buf;
}

/* ---- minimal PNG encoding (color type 6, filter 0, zlib) ---- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function encodePNG(pixelBuf, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;                       // 8-bit RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) pixelBuf.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, '..', 'assets');
const targets = [
  ['icon-180.png', 180, 1.0],
  ['icon-192.png', 192, 1.0],
  ['icon-512.png', 512, 1.0],
  ['icon-512-maskable.png', 512, 0.8],            // content inside adaptive-icon safe zone
];
for (const [name, size, scale] of targets) {
  const png = encodePNG(rasterize(size, scale), size);
  const file = path.join(outDir, name);
  fs.writeFileSync(file, png);
  console.log(`wrote ${name} (${size}×${size}, ${(png.length / 1024).toFixed(1)} KiB)`);
}