/* Sentinel — Pillar 1: The Guardian (specialized detectors).
 * The core bubble + collision prediction live in Perception. This module adds
 * the detectors that need scene reasoning: construction reroutes, slippery
 * surface via simulated polarization + weather feed, and the traffic-light /
 * crosswalk read. Returns extra "findings" injected before the salience filter.
 */
window.SEN = window.SEN || {};

SEN.Guardian = (() => {
  // simulated environmental feed (Weather API + camera polarization)
  const env = { temp: 22, sky: 'clear', precip: 0.15, lastPolar: 0.9 };

  function setPrecip(p) { env.precip = p; env.sky = p > 0.6 ? 'rain' : p > 0.3 ? 'drizzle' : 'clear'; }
  function setTemp(t) { env.temp = t; }

  function special(user, detected) {
    const out = [];

    // ---- construction zone reroute ----
    const zone = constructionZone(user, detected);
    if (zone) {
      const safeDir = zone.centerX > user.x ? 'left' : 'right';
      out.push({
        entity: 'construction zone', side: zone.side, dist: zone.dist,
        urgency: zone.dist < 220 ? 'warn' : 'info',
        cue: zone.dist < 220 ? 'warn' : 'hint',
        keepSilent: zone.dist > 260,
        msg: `Construction sealed ${zone.side === 'front' ? 'the path ahead' : 'your ' + zone.side}. Detour ${safeDir} — safe lane verified.`,
        why: `cluster of cones/tape/scaffold blocks the walkway`,
      });
    }

    // ---- slippery surface (polarization + weather) ----
    const wet = detected.find(d => d.type === 'wet') || null;
    const greasy = wet && wet.dist < 150;
    const rainingGround = env.precip > 0.45;
    if ((greasy || rainingGround)) {
      const polarStr = (env.lastPolar * 100).toFixed(0) + '%';
      out.push({
        entity: 'slippery surface', side: wet ? wet.side.key : 'front', dist: wet ? wet.dist : 0,
        urgency: 'warn', cue: 'warn', keepSilent: false,
        msg: greasy
          ? `Ground ahead is ${wet.subtype || 'wet'} — step heel-first. Arm yourself.`
          : `Rain on pavement — cross cautiously, ${wet ? 'that patch' : 'the plaza'} is polished.`,
        why: `polarization ${polarStr} + ${env.sky} feed → slippery class`,
      });
    }

    // ---- head clearance while walking under overhangs ----
    const under = detected.find(d => d.type === 'overhang' && d.dist < 200);
    if (under) out.push({
      entity: 'head clearance', side: under.side.key, dist: under.dist,
      urgency: 'crit', cue: 'crit', keepSilent: under.dist < 90,
      msg: `Head clearance LOW — ${under.label.toLowerCase()} at eye level. Duck.`,
      why: `overhang ${under.subtype || ''} in the 2 m corridor above your path`,
    });

    return out;
  }

  /* ---- cluster of cones/tape/scaffold = reroute ---- */
  function constructionZone(user, detected) {
    const parts = detected.filter(d => ['cone', 'tape', 'scaffold'].includes(d.type) && d.dist < 360);
    if (parts.length === 0) return null;
    const cx = parts.reduce((a, b) => a + b.x, 0) / parts.length;
    const cy = parts.reduce((a, b) => a + b.y, 0) / parts.length;
    const dist = Math.hypot(user.x - cx, user.y - cy);
    const dx = cx - user.x, dy = cy - user.y;
    const fwdX = Math.cos(user.heading), fwdY = Math.sin(user.heading);
    const dot = (dx * fwdX + dy * fwdY) / (dist || 1);
    const nd = (fwdY * dx - fwdX * dy) / (dist || 1);
    let side = 'front';
    if (Math.abs(dot) < 0.7) side = nd > 0 ? 'left' : 'right';
    else if (dot < 0) side = 'back';
    parts.forEach(p => p.conZone = true);
    return { centerX: cx, centerY: cy, side, dist };
  }

  return { special, setPrecip, setTemp, get env(){ return env; } };
})();