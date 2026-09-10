/* Headless smoke test for Sentinel's logic modules (no DOM needed).
 * Loads the pure-logic files into node with a stub `window`, then simulates:
 *   1. a car approaching -> must trigger a crit alert
 *   2. then silence (salience filter: not redundant, but different events)
 *   3. memory palace: ask "where are my keys" -> must answer with place+time
 *   4. health: metrics + cardiac trigger
 *   5. social: remote pilot uplink transitions
 */
const fs = require('fs');
const path = require('path');

const globalStorage = {};
global.window = global;                       // so window.SEN === global.SEN
global.window.SEN = {};
global.window.AudioContext = undefined;
global.window.speechSynthesis = undefined;
global.window.SpeechSynthesisUtterance = undefined;
global.window.addEventListener = () => {};
global.window.setTimeout = setTimeout;

// minimal document stub for modules that touch the DOM at load time
global.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = () => {};

// Ordered: base modules first
const files = [
  'audio.js', 'scene.js', 'demo.js', 'perception.js', 'pillar_guardian.js',
  'pillar_memory.js', 'pillar_social.js', 'pillar_health.js',
];
for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, f), 'utf8');
  try { eval(code); } catch (e) { console.error('LOAD FAIL', f, e.message); process.exit(1); }
}

const S = window.SEN.Scene;
const P = window.SEN.Perception;
const M = window.SEN.Memory;
const H = window.SEN.Health;
const So = window.SEN.Social;
const G = window.SEN.Guardian;

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name); } }

// ---- seed ----
S.reset();
M.seedPalace();
const u = S.user;

// #1: put a car 500px away, heading straight at the user
const car = S.make('car', u.x + 500, u.y, { label: 'Car', speed: 300, heading: Math.PI, radius: 40, kind: 'dynamic', hazard: 'crit' });

let alertSeen = false, critSeen = false;
for (let i = 0; i < 300; i++) {
  S.tick(0.016, i * 0.016);
  const det = P.run(S.entities, u, 0.016, i * 0.016);
  const spec = G.special(u, det).concat(So.special(u, det));
  const res = P.decide(det, u, i * 0.016, { special: spec });
  if (res.alert && res.alert.msg) {
    alertSeen = true;
    if (res.alert.cue === 'crit') critSeen = true;
  }
  if (alertSeen && i > 20) { /* stop when it trips to keep loop bounded */ }
  if (critSeen) break;
}
check('car firing a collision alert at all', alertSeen);
check('alert escalates to critical', critSeen);

// #2: salience suppression — a STATIC threat must not nag every frame.
// Move the user next to a pothole and confirm an identical repeated warning
// is not re-surfaced by the cooldown (TALK_COOLDOWN = 1.1s).
S.clear();
S.buildStreet();
const u2 = S.user;
u2.x = 500; u2.y = window.SEN.WORLD.h * 0.86; // near the seeded pothole
const hole = S.entities.find(e => e.type === 'pothole');
hole.x = u2.x + 40; hole.y = u2.y;
P.reset();
const msgCounts = {};
// 40 ticks, triggered when within 110px
const dangerLoops = [];
for (let i = 0; i < 40; i++) {
  const det = P.run(S.entities, u2, 0.016, 300 + i * 0.016);
  const res = P.decide(det, u2, 300 + i * 0.016, { special: G.special(u2, det).concat(So.special(u2, det)) });
  if (res.alert && res.alert.msg) msgCounts[res.alert.msg] = (msgCounts[res.alert.msg] || 0) + 1;
}
const maxRepeat = Math.max(0, ...Object.values(msgCounts));
check('static threat fired at least once', Object.keys(msgCounts).length >= 1);
check('salience never broadcasts the same danger twice (cooldown)', maxRepeat <= 1);

// #3: memory palace
const ans = M.ask('where are my keys');
check('memory answers "where are my keys"', /keys|Key/i.test(ans) && /AM|PM/.test(ans));

// #4: health cardioresp
const m1 = H.update(0.016, 0);
check('health returns hr metrics', m1.hr > 30 && m1.hr < 200 && m1.bus.length > 0);
H.setEvent('cardiac');
let cardiac = false;
for (let i = 0; i < 300; i++) {
  H.update(0.02, i * 0.02);
  if (H.history.length && H.history[0].type === 'cardiac') { cardiac = true; break; }
}
check('cardiac distress triggers a health alert', cardiac);

// #5: remote pilot
So.doubleTap();
let live = false;
for (let i = 0; i < 200; i++) {
  So.pilotUpdate(0.02, []);
  if (So.pilot.state === 'live') { live = true; break; }
}
check('remote pilot uplinks to live', live);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);