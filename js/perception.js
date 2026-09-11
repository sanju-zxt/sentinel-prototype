/* Sentinel — Perception & Salience engine.
 * THIS is the heart. Most assistive AI says everything it sees. Sentinel only
 * breaks silence when an event is (a) imminent, (b) actionable, (c) not already
 * known. Everything else gets logged as "kept silent" — and that log is the
 * proof of our philosophy, not a bug.
 */
window.SEN = window.SEN || {};

SEN.Perception = (() => {
  const BUBBLE = { outer: 220, inner: 110 };       // px radii (3m / 1.5m scale)
  const SCAN_RANGE = 620;                          // "25 m ahead" context
  const REACTION_W = 900;                          // npc who could collide with us
  const TALK_COOLDOWN = 1.1;                       // seconds of silence between alerts
  const priorities = { none: 0, info: 1, warn: 2, crit: 3 };

  const detected = [];   // this tick
  let log = [];
  let spoken = 0, suppressed = 0, totalDetected = 0;
  let lastSpoken = -99;
  let lastRiver = -99;      // dedupe the crowd-flow nudge
  let state = null;
  let heat = { left: 0, right: 0, front: 0, back: 0 };

  function reset() {
    log = []; spoken = 0; suppressed = 0; totalDetected = 0;
    lastSpoken = -99;
  }

  /* ---- side of a vector relative to user ---- */
  function sideOf(u, ex, ey) {
    const dx = ex - u.x, dy = ey - u.y;
    const fwdX = Math.cos(u.heading), fwdY = Math.sin(u.heading);
    const dot = dx * fwdX + dy * fwdY;          // forward-positive
    const nd = fwdY * dx - fwdX * dy;           // left-positive (screen coords, y down)
    if (Math.abs(dot) > 0.707 * Math.hypot(dx, dy)) return { key: dot > 0 ? 'front' : 'back', pan: 0 };
    if (nd > 0) return { key: 'left', pan: -0.9 };
    return { key: 'right', pan: 0.9 };
  }

  /* ---- time-to-impact prediction for moving bodies ---- */
  function timeToImpact(u, e) {
    const rx = e.x - u.x, ry = e.y - u.y;
    const vx = Math.cos(e.heading || 0) * (e.speed || 0) - u.vx, vy = Math.sin(e.heading || 0) * (e.speed || 0) - u.vy;
    const R = (u.radius || 16) + (e.radius || 12);
    const c = rx*rx + ry*ry - R*R;
    if (c <= 0) return 0;
    const a = vx*vx + vy*vy;
    if (a < 1e-4) return Infinity;              // not moving relative to us
    const b = rx*vx + ry*vy;
    const disc = b*b - a*c;
    if (disc < 0) return Infinity;              // will miss
    const tt = (-b - Math.sqrt(disc)) / a;
    return tt > 0 ? tt : 0;
  }

  /* ---- gather everything within scan range ---- */
  function run(ents, u, dt, t) {
    detected.length = 0;
    u.vx = u.px !== undefined ? (u.x - u.px) / (dt || 0.016) : 0;
    u.vy = u.py !== undefined ? (u.y - u.py) / (dt || 0.016) : 0;
    u.px = u.x; u.py = u.y;

    for (const e of ents) {
      if (e.isUser || !e.active) continue;
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d > SCAN_RANGE) { e.perceived = false; continue; }
      e.perceived = true;
      e.dist = d;
      e.side = sideOf(u, e.x, e.y);
      e.inBubble = d < BUBBLE.outer;
      e.inCore = d < BUBBLE.inner;
      detected.push(e);
    }
    return detected;
  }

  /* ---- convert real YOLO detections into entity format ----
   * Maps camera-frame bbox center to a pseudo world position relative to
   * the user (calibrated by a nominal field of view). Camera x-offset maps
   * to the user's left/right; bbox height maps to distance (smaller = farther).
   */
  function runReal(detections, u, opts = {}) {
    const FOV = opts.fov || 62;            // horizontal field of view (deg)
    const FOCAL = (640 / 2) / Math.tan((FOV * Math.PI) / 360);
    const M_PX = opts.mPerPixel || 26;     // simulated world px per real meter
    const out = [];
    const map = (window.SEN.Detector && window.SEN.Detector.CLASS_MAP) || {};

    for (const d of detections) {
      const [bx, by, bw, bh] = d.bbox;
      const cx = bx + bw / 2;
      const cy = by + bh / 2;

      // distance from apparent size: assume a nominal object "true size"
      // per class so bigger boxes are closer. Convert meters → world px.
      const trueSize = opts.trueSize && opts.trueSize[d.label] ||
        (d.label === 'person' ? 1.7 : d.label === 'car' ? 1.8 : d.label === 'cell phone' ? 0.15 : 0.6);
      const dist = ((trueSize * FOCAL) / (bh || 1)) * M_PX;

      if (dist > SCAN_RANGE) continue;

      // angle from frame center
      const angle = Math.atan2(cx - 320, FOCAL);     // radians, +0 = right
      const az = (u.heading || 0) - angle;           // world heading toward it
      const px = u.x + Math.cos(az) * dist;
      const py = u.y + Math.sin(az) * dist;

      const type = map[d.label] || 'obstacle';
      const common = {
        x: px, y: py,
        dist, side: sideOf(u, px, py),
        inBubble: dist < BUBBLE.outer,
        inCore: dist < BUBBLE.inner,
        hazard: d.label === 'person' ? 'warn' : type === 'car' ? 'crit' : type === 'obstacle' ? 'warn' : 'info',
        label: d.label,
        active: true,
        perceived: true,
        real: true,
        confidence: d.confidence,
        bbox: d.bbox,
      };

      // pedestrian / car / obstacle carry enough shape for decide() to act on
      if (type === 'pedestrian') {
        out.push({ ...common, type, heading: az, speed: opts.assumeWalkSpeed !== false ? 1.2 : 0, radius: 12 });
      } else if (type === 'car' || type === 'cyclist') {
        out.push({ ...common, type, heading: az, speed: opts.assumeVehicleSpeed !== false ? 4.5 : 0, radius: 18 });
      } else {
        out.push({ ...common, type });
      }
    }

    for (const e of out) detected.push(e);
    return out;
  }

  /* ---- the decision engine ---- */
  function decide(detected, u, t, opts = {}) {
    if (!state) state = { alert: null, mode: 'normal' };
    const findings = [];
    const now = t || 0;

    for (const e of detected) {
      const pri = priorities[e.hazard] || 0;
      let msg = null, urgency = 'info', cue = null, why = '';

      if (e.type === 'car' || e.type === 'cyclist') {
        const tt = timeToImpact(u, e);
        const near = e.dist < REACTION_W;
        if (e.inCore) {
          msg = `${e.label} is ON you — step ${e.side.key === 'left' ? 'right' : e.side.key === 'right' ? 'left' : 'back'} now.`;
          urgency = 'crit'; cue = 'crit';
        } else if (tt < 4 && near) {
          msg = `${e.label} crossing from your ${e.side.key}. Collision in ${tt < 1 ? 'under a second' : tt.toFixed(1) + 's'}.`;
          urgency = 'crit'; cue = 'crit';
        } else if (tt < 6 && near) {
          msg = `${e.label} approaching your ${e.side.key} — hold.`;
          urgency = 'warn'; cue = 'warn';
        } else {
          why = 'not imminent — silent';
        }
      }
      else if (e.type === 'overhang') {
        if (e.dist < 170) {
          msg = `Low ${e.label.toLowerCase()} at head height, ${e.side.key}. Duck.`;
          urgency = 'crit'; cue = 'crit';
        } else why = 'head clearance fine — silent';
      }
      else if (e.type === 'stairs') {
        const nearEdge = e.dist < 120;
        msg = `Stairs ahead going ${e.dir}. ${nearEdge ? e.side.key === 'front' ? 'Edge in reach — slow.' : 'Bear right.' : 'Detected ahead.'}`;
        urgency = nearEdge ? 'warn' : 'info'; cue = nearEdge ? 'warn' : 'hint';
      }
      else if (e.type === 'escalator') {
        if (e.dist < 130) {
          msg = e.broken
            ? `Escalator is BROKEN. ${e.side.key === 'front' ? 'Take the stairs' : 'Use elevator'} — ${e.side.key === 'left' ? 'elevator to your left' : 'not where you are facing'}.`
            : `Escalator running ${e.dir} — keep left, hold rail.`;
          urgency = e.broken ? 'warn' : 'info'; cue = e.broken ? 'warn' : 'hint';
        } else why = 'escalator stable ahead — silent';
      }
      else if (e.type === 'curb' || e.type === 'pothole') {
        if (e.dist < 110) {
          msg = `${e.label} directly in path. Lift feet / step around right.`;
          urgency = 'warn'; cue = 'warn';
        } else why = 'ground clear — silent';
      }
      else if (e.type === 'pedestrian') {
        const tt = timeToImpact(u, e);
        if (e.inCore) {
          msg = `Someone right ${e.side.key} of you — ${e.side.key === 'left' ? 'shift right a step' : 'shift left a step'}. They are not turning.`;
          urgency = 'warn'; cue = 'warn';
        } else if (tt < 3.5) {
          msg = `Person steps into your path, ${e.side.key}.`;
          urgency = 'warn'; cue = 'warn';
        } else why = 'crowd flows clear — silent';
      }
      else if (e.type === 'construction') {
        if (e.dist < 120) {
          msg = `Construction on your ${e.side.key} — ${e.side.key === 'left' ? 'detour right' : 'hold, verified safe route'}. Cones sealed the path.`;
          urgency = 'warn'; cue = 'warn';
        } else why = 'worksite clear — silent';
      }
      else if (e.type === 'wet' && e.dist < 130) {
        msg = `Ground ahead is ${e.subtype || 'wet'} — brake gently.`;
        urgency = 'warn'; cue = 'warn';
      }
      else if (e.type === 'trafficlight' && e.dist < 480) {
        msg = e.state === 'green'
          ? `Walk is lit — cross now.`
          : `Don’t walk — signal ${e.state.toUpperCase()}. Wait.`;
        urgency = e.state === 'green' ? 'info' : 'warn';
        cue = e.state === 'green' ? 'green' : 'warn';
      }
      else if (e.type === 'cone' && e.dist < 60) {
        msg = `Cone at your feet — step around.`;
        urgency = 'warn'; cue = 'warn';
      }

      if (msg) {
        const stop = now - lastSpoken < TALK_COOLDOWN;
        const duplicate = state.alert && state.alert.msg === msg && now - state.alert.at < 2.5;
        findings.push({
          entity: e.label, side: e.side.key, dist: e.dist, urgency,
          msg, cue, keepSilent: stop || duplicate,
          why: stop ? 'still speaking' : duplicate ? 'already said that' : why,
        });
      }
    }

    // crowd-flow gap (the "River" algorithm) — deduped via a 4 s cooldown
    const crowdMsg = crowdFlow(u, detected, now);
    if (crowdMsg) findings.push(crowdMsg);

    // specialized pillars can inject extra findings before the salience filter
    if (opts.special) for (const s of opts.special) if (s) findings.push(s);

    if (opts.fire) { findings.push(makeEmergency(u, opts)); }

    // decide what to surface
    const surf = findings
      .filter(f => f && !f.keepSilent)
      .sort((a, b) => priorities[b.urgency] - priorities[a.urgency]);

    triggeredLog(findings, t, opts);

    const alert = surf[0] || null;
    if (alert) {
      lastSpoken = now;
      state.alert = { msg: alert.msg, urgency: alert.urgency, at: now };
    } else if (now - (state.alert && state.alert.at || -99) > 2) {
      state.alert = null;
    }
    return { alert, log: findings };
  }

  /* ---- the river algorithm: gap in crowd ---- */
  function crowdFlow(u, detected, now) {
    const crowd = detected.filter(e => e.type === 'pedestrian');
    if (crowd.length < 3) return null;                 // don't narrate 2 people
    // find the largest angular gap among the moving bodies
    const angles = crowd.map(e => Math.atan2(-(e.y - u.y), e.x - u.x));
    angles.sort((a, b) => a - b);
    let largest = 0, bestIdx = 0;
    for (let i = 0; i < angles.length; i++) {
      const a = angles[i], b = angles[(i + 1) % angles.length];
      const gap = (b - a + 2 * Math.PI) % (2 * Math.PI);
      if (gap > largest) { largest = gap; bestIdx = i; }
    }
    const blocked = crowd.filter(e => e.inCore).length > 0;
    if (blocked) return null;
    const thruAngle = angles[bestIdx] + largest / 2;
    const gapDeg = (largest * 180) / Math.PI;
    if (gapDeg < 40) return null; // too tight to mention
    // dedupe: never re-speak the river hint within 4 s
    const gapOk = gapDeg >= 40 && gapDeg <= 180;      // sane corridor
    if (!gapOk || (now - lastRiver) < 4.0) return null;
    lastRiver = now;
    return {
      urgency: 'info', cue: 'hint',
      entity: 'crowd flow', side: largest > Math.PI / 2 ? 'front' : (thruAngle > 0 ? 'right' : 'left'),
      msg: `Gap ahead — flow through at 3 o'clock. ${gapDeg.toFixed(0)}° open.`,
      why: `river analysis found a ${gapDeg.toFixed(0)}° lane through the crowd`,
    };
  }

  /* ---- emergency guardian mode ---- */
  function makeEmergency(u, opts) {
    const exit = nearestExit(u);
    const msg = exit
      ? `FIRE ALARM. Follow me — EXIT at your ${exit.side.key === 'front' ? 'front-right' : exit.side.key}. 20 m. Avert the fire. GO NOW.`
      : `FIRE ALARM. Stand still — locating exit.`;
    return {
      urgency: 'crit', cue: 'crit', entity: 'EMERGENCY', side: 'front',
      msg, why: 'fire alarm detected — rapid imperative mode',
      exit: exit ? exit.label : null,
    };
  }

  function nearestExit(u) {
    let best = null, bd = 1e9;
    const S = window.SEN.Scene;
    for (const e of S.entities) {
      if (e.type !== 'exit') continue;
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) best.side = sideOf(u, best.x, best.y);
    return best;
  }

  /* ---- silence log ---- */
  function triggeredLog(findings, t, opts = {}) {
    for (const f of findings) {
      totalDetected++;
      if (f.keepSilent) { suppressed++; continue; }
      const entry = {
        t: stamptime(),
        urgent: f.urgency,
        text: f.msg,
        why: f.why,
        tag: f.entity,
      };
      log.unshift(entry);
      if (log.length > 160) log.pop();
      spoken++;
    }
    if (opts.fire && !findings.some(f => !f.keepSilent)) {
      // even if cooldown suppresses voice, record emergency fire
      totalDetected++;
    }
  }

  function stamptime() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function sidePulse(alert) {
    if (!alert) return null;
    if (alert.cue === 'crit' || alert.cue === 'warn') {
      heat[alert.side] = 1;
    }
    return alert;
  }

  return {
    BUBBLE, decide, run, runReal, timeToImpact, sideOf, crowdFlow,
    get log(){ return log; },
    get spoken(){ return spoken; },
    get suppressed(){ return suppressed; },
    get detected(){ return totalDetected; },
    get heat(){ return heat; },
    reset,
  };
})();