/* Sentinel — Phase 5: Kinesthetic sensing (skeleton-agnostic body language).
 *
 * The "MediaPipe" roadmap item, delivered the Sentinel way: we read *physics*,
 * not faces. Every person Sentinel perceives is reduced to a body state —
 * posture, arms, gait, and approach intent — computed from actual motion and
 * geometry over time. No expressions, no identity.
 *
 * Sources, in order of fidelity:
 *   sim  — pedestrians carry explicit `posture` / `arms` metadata (the dark-room
 *          world IS the training skeleton)
 *   real — YOLO person boxes give a box-lite posture proxy (aspect ratio), and
 *          per-frame centroid drift gives a movement read; cross-frame particle
 *          tracking can upgrade this to full skeletal intent later
 *
 * Live hardware note: a full MediaPipe skeletal add-on can drop into
 * SEN.Kinesthesis.attach(landmarks) later — the salience interface stays flat.
 */
window.SEN = window.SEN || {};

SEN.Kinesthesis = (() => {
  const S = () => window.SEN.Scene;
  const INTENTS = ['stationary', 'approaching', 'retreating', 'passing'];
  const POSTURES = ['standing', 'sitting', 'kneeling', 'bending', 'leaning'];

  // thresholds (world px / s)
  const APPROACH_SPEED = 90;     // closing px/s that reads as "coming at you"
  const APPROACH_TRACK = 480;    // px at which we start tracking it
  const APPROACH_WARN = 300;     // px at which we speak
  const ERRATIC_RATE = 3.2;      // rad/s of heading wobble = erratic gait

  function wrapDelta(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

  /* ---- posture: metadata first, else box-proxy ---- */
  function postureOf(e) {
    if (e.posture) return e.posture;
    if (e.bbox) {                       // real mode: tall+thin = upright
      const bw = e.bbox[2] || 1, bh = e.bbox[3] || 1;
      const ar = bh / bw;
      return ar >= 1.75 ? 'standing' : ar >= 1.25 ? 'leaning' : 'sitting';
    }
    return null;
  }

  /* ---- arms: only ever a seeded observation, never invented ---- */
  function armsOf(e) { return e.arms || null; }

  /* ---- per-person physical read (velocity + posture + intent) ---- */
  function readOf(u, e, nowSec) {
    let vx = 0, vy = 0, dt = 0;
    if (e._px != null) {
      dt = Math.max(0.016, nowSec - (e._pt != null ? e._pt : nowSec));
      vx = (e.x - e._px) / dt;
      vy = (e.y - e._py) / dt;
    }
    e._px = e.x; e._py = e.y; e._pt = nowSec;

    const speed = Math.hypot(vx, vy);
    const dx = e.x - u.x, dy = e.y - u.y;
    const d = Math.hypot(dx, dy) || 1;
    const rx = dx / d, ry = dy / d;
    const vToward = vx * rx + vy * ry;      // >0 = moving away, <0 = closing

    let intent = 'stationary';
    if (speed > 18) {
      const along = vToward / Math.max(speed, 1);
      if (along < -0.45) intent = 'approaching';
      else if (along > 0.45) intent = 'retreating';
      else intent = 'passing';
    }

    // gait wobble: heading change rate across the observation window
    let dHeading = 0;
    if (e._prevHeading != null) {
      dHeading = Math.abs(wrapDelta(e.heading - e._prevHeading)) / Math.max(dt, 0.016);
    }
    e._prevHeading = e.heading;
    const erratic = e.erratic === true || dHeading > ERRATIC_RATE;

    return {
      posture: postureOf(e), arms: armsOf(e), intent,
      speed, vToward, closing: Math.max(0, -vToward), erratic,
    };
  }

  /* ---- update the live read for every perceived person ---- */
  function live(user, detected, nowMs) {
    const ts = nowMs / 1000;
    for (const e of detected) {
      if (e.type !== 'pedestrian' && e.type !== 'family') continue;
      e.read = readOf(user, e, ts);
    }
  }

  /* ---- findings for the salience engine ---- */
  function special(user, detected, nowMs) {
    const out = [];
    for (const e of detected) {
      const rd = e.read;
      if (!rd || (rd.intent === 'stationary' && !rd.posture)) continue;
      const side = (e.side && e.side.key) || SEN.Perception.sideOf(user, e.x, e.y).key;

      // aggressive approach — the crowd-interaction hazard the river misses
      if (rd.intent === 'approaching' && rd.closing > APPROACH_SPEED && e.dist < APPROACH_TRACK) {
        const near = e.dist < APPROACH_WARN;
        out.push({
          entity: 'bodies', side, dist: e.dist,
          urgency: near ? 'warn' : 'info', cue: near ? 'warn' : 'hint',
          keepSilent: !near,
          msg: near
            ? `${rd.erratic ? 'Erratic runner ' : 'Person '}cutting toward you from your ${side}${side === 'left' ? ' — step right now' : side === 'right' ? ' — step left now' : ' — brace'}.`
            : `Fast approach ${side === 'front' ? 'ahead' : 'on your ' + side}. Tracking.`,
          why: `closing ${rd.closing.toFixed(0)} px/s · intent ${rd.intent} · gait ${rd.erratic ? 'erratic' : 'steady'} (physics, not faces)`,
        });
      }

      // low posture near the feet — trip risk or someone needing help
      if (rd.posture === 'kneeling' && e.dist < 150) {
        out.push({
          entity: 'bodies', side, dist: e.dist, urgency: 'info', cue: 'hint', keepSilent: false,
          msg: `Someone is kneeling low ${side === 'front' ? 'right ahead' : 'on your ' + side} — hard to see. They may need help or be a trip risk.`,
          why: 'kneeled posture detected at close range',
        });
      }
    }
    return out;
  }

  return { live, special, readOf, postureOf, armsOf, INTENTS, POSTURES };
})();