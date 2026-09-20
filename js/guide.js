/* Sentinel — Guided turn-by-turn navigation.
 *
 * Press N to pick a destination and Sentinel becomes an active co-pilot:
 * every few seconds it speaks side + distance ("Turn right — the café, 32
 * meters") and pulses the haptic belt in the correct direction. Cycles
 * through canned targets so the demo can prove guidance, not just alerts.
 *
 * Pure logic — no DOM — so the headless smoke tests exercise it directly.
 */
window.SEN = window.SEN || {};

SEN.Guide = (() => {
  const S = () => window.SEN.Scene;
  const STOPS = [
    { match: e => e.type === 'cafe', label: 'the café' },
    { match: e => e.type === 'exit', label: 'the nearest EXIT' },
    { match: e => e.type === 'poi' && e.obj === 'keys', label: 'your keys' },
    { match: e => e.type === 'poi' && e.obj === 'medication', label: 'your medication' },
    { match: e => e.type === 'bench', label: 'the bench' },
  ];
  const NUDGE_EVERY = 2.6;      // seconds between turn instructions
  const ARRIVE_RADIUS = 70;     // px

  let stopIdx = -1;
  let target = null;
  let lastNudge = -99;
  let arrived = false;

  function findTarget(idx) {
    for (let n = 0; n < STOPS.length; n++) {
      const i = (idx + n) % STOPS.length;
      const e = S().entities.find(STOPS[i].match);
      if (e) return { entity: e, stop: STOPS[i] };
    }
    return null;
  }

  function toggle() {
    if (target) return stop();
    stopIdx = (stopIdx + 1) % STOPS.length;
    const hit = findTarget(stopIdx);
    if (!hit) {
      stop();
      return { active: false, label: '', spoken: 'Nothing to navigate to right now.' };
    }
    target = hit.entity;
    target._guideName = hit.stop.label;   // friendly spoken name for this leg
    arrived = false;
    lastNudge = -99;
    return {
      active: true,
      label: hit.stop.label,
      spoken: `Navigating to ${hit.stop.label}. Give me a moment — then I will guide you by voice and haptics.`,
    };
  }

  function stop() {
    const was = target;
    target = null; arrived = false;
    return { active: false, label: was ? null : '', spoken: was ? 'Navigation ended — you are safe.' : 'Navigation is off.' };
  }

  /* Runs every frame; returns salience findings only when it is time to speak. */
  function update(dt, u, t) {
    if (!target) return [];
    if (!target.active) { target = null; return []; }
    const d = Math.hypot(target.x - u.x, target.y - u.y);
    const side = SEN.Perception.sideOf(u, target.x, target.y);
    const meters = Math.round(d / 15);
    const name = target._guideName || target.label || 'the target';

    if (d < ARRIVE_RADIUS) {
      if (!arrived) {
        arrived = true;
        return [{
          entity: 'navigation', side: side.key, dist: d, urgency: 'info', cue: 'green',
          keepSilent: false,
          msg: `Arrived — ${name} is ${side.key === 'front' ? 'right in front of you' : 'on your ' + side.key}.`,
          why: 'guidance: destination reached',
        }];
      }
      return [];
    }
    arrived = false;
    if (t - lastNudge < NUDGE_EVERY) return [];
    lastNudge = t;

    let msg;
    if (side.key === 'front') msg = `Straight ahead — ${name}, ${meters} meters.`;
    else if (side.key === 'back') msg = `${name} is behind you — turn around.`;
    else msg = `Turn ${side.key} — ${name}, ${meters} meters.`;
    return [{
      entity: 'navigation', side: side.key, dist: d, urgency: 'info', cue: 'hint',
      keepSilent: false, msg,
      why: 'turn-by-turn guidance to selected target',
    }];
  }

  return { toggle, stop, update,
    get active() { return !!target; },
    get target() { return target; },
  };
})();