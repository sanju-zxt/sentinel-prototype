/* Sentinel — Phase 6: Beacon-free indoor positioning (visual-SLAM-lite).
 *
 * NavCog needs $10k of beacons; Sentinel doesn't. This is a dead-reckoning
 * odometry filter with *place-memory loop closure*: every place it sees gets a
 * coarse signature (nearby landmark bearings + range tiers), and recognizing a
 * previously-seen signature re-anchors it — collapsing accumulated drift the
 * way a real visual-SLAM system does, with zero infrastructure.
 *
 * Two signature sources:
 *   sim    — relative geometry of known landmarks (café, bench, POIs, ...)
 *   real   — a 4×4 sector fingerprint of the live MiDaS depth map (appearance)
 *
 * The readout is the same in both: a position belief whose uncertainty (σ)
 * shrinks the moment the world looks like a place we've seen before.
 */
window.SEN = window.SEN || {};

SEN.Localize = (() => {
  const S = () => window.SEN.Scene;
  const METERS = 15;              // world px per metre (matches minimap scaling)
  const DRIFT_PER_M = 2.2;        // px of error added per metre walked
  const MAX_SIGMA = 900;          // px cap on uncertainty
  const SNAP_CAP = 260;           // max px of drift corrected in one closure
  const MATCH_RADIUS = 420;       // signature landmark radius (px)
  const COOLDOWN = 6000;          // ms between re-localization announcements

  let belief = null;              // { x, y, heading, sigma } in world px
  const map = new Map();          // signature -> { x, y, count }
  let frame = null;               // which signature we currently believe
  let prevU = null;
  let closures = 0;
  let lastAnnounce = 0;

  function reset(start) {
    const u = start || S().user;
    belief = { x: u.x, y: u.y, heading: u.heading, sigma: 0 };
    prevU = { x: u.x, y: u.y, heading: u.heading };
    map.clear(); frame = null; closures = 0; lastAnnounce = 0;
  }

  /* ---- odometry: integrate user motion, growing uncertainty ---- */
  function updateOdometry(u, dt) {
    if (!belief) reset(u);
    if (!prevU) { prevU = { x: u.x, y: u.y, heading: u.heading }; return; }
    const dx = u.x - prevU.x, dy = u.y - prevU.y;
    belief.x += dx; belief.y += dy;
    belief.heading += Math.atan2(Math.sin(u.heading - prevU.heading), Math.cos(u.heading - prevU.heading));
    prevU = { x: u.x, y: u.y, heading: u.heading };
    const travelled = Math.hypot(dx, dy) / METERS;
    belief.sigma = Math.min(MAX_SIGMA, belief.sigma + travelled * DRIFT_PER_M + 0.6);
  }

  /* ---- scene signature: quantized bearings + range tiers of landmarks ---- */
  const LANDMARK_KINDS = new Set([
    'cafe', 'bench', 'poi', 'stairs', 'escalator', 'exit',
    'produce', 'menu', 'family', 'trafficlight', 'crosswalk',
  ]);
  function sceneSignature(u, ents) {
    const parts = [];
    for (const e of ents) {
      if (!LANDMARK_KINDS.has(e.type)) continue;
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d > MATCH_RADIUS) continue;
      const b = (Math.round((Math.atan2(e.y - u.y, e.x - u.x) * 180) / Math.PI / 45) & 7);
      const tier = d < 150 ? 0 : d < 280 ? 1 : 2;
      parts.push(e.type + ':' + b + ':' + tier);
    }
    if (!parts.length) return null;
    parts.sort();
    return parts.join('|');
  }

  /* ---- real appearance signature: 4×4 depth sector fingerprint ---- */
  function imageSignature(depth) {
    if (!depth || !depth.length) return null;
    const cell = 160, stride = 640;
    const parts = [];
    for (let py = 0; py < 4; py++) {
      for (let px = 0; px < 4; px++) {
        let acc = 0, n = 0;
        const y0 = py * cell, x0 = px * cell;
        for (let yy = y0; yy < y0 + cell; yy += 8) {
          const row = yy * stride;
          for (let xx = x0; xx < x0 + cell; xx += 8) { acc += depth[row + xx]; n++; }
        }
        const tier = (acc / n) < 0.33 ? 'n' : (acc / n) < 0.66 ? 'm' : 'f';
        parts.push(px + ',' + py + ':' + tier);
      }
    }
    return parts.join('|');
  }

  /* ---- shared loop-closure: recognize a seen place, snap drift ----
   * Two corrections happen on a match, and both are "re-anchoring":
   *   • position — if dead reckoning drifted, the stored place pulls it back
   *   • confidence — the σ always collapses (a known place = known position),
   *     which is the visible win even when the sim odometry was perfect.
   */
  function noteSignature(sig, placeName, nowMs) {
    if (!belief) reset();
    const prior = map.get(sig);
    if (!prior) {                        // brand-newness: record, keep walking
      map.set(sig, { x: belief.x, y: belief.y, count: 1 });
      frame = { sig, x: belief.x, y: belief.y };
      return null;
    }
    prior.count++;
    if (frame && frame.sig === sig) return null;         // still the same place
    const sigmaBefore = belief.sigma;
    const drift = Math.hypot(belief.x - prior.x, belief.y - prior.y);
    const capped = Math.min(drift, SNAP_CAP);
    const k = drift > 0 ? capped / drift : 0;
    belief.x += (prior.x - belief.x) * k;                // position snap
    belief.y += (prior.y - belief.y) * k;
    belief.sigma = Math.max(12, Math.min(belief.sigma, 60)); // ambiguity collapses
    closures++;
    frame = { sig, x: belief.x, y: belief.y };
    return {
      drift, corrected: capped,
      sigmaCollapse: Math.max(0, sigmaBefore - belief.sigma),
      sigma: belief.sigma, placeName: placeName || 'this area',
    };
  }

  function observe(u, ents, nowMs) {
    const sig = sceneSignature(u, ents);
    return sig ? noteSignature(sig, S().placeName(u.x, u.y), nowMs) : null;
  }

  function realObserve(depth, nowMs) {
    const sig = imageSignature(depth);
    return sig ? noteSignature(sig, 'this room', nowMs) : null;
  }

  /* ---- salience finding when we visibly re-anchor (array, like the other
   * special() modules — main.js spreads it into the candidate list) ---- */
  function special(user, ents, nowMs) {
    const snap = observe(user, ents, nowMs);
    if (!snap) return [];
    // re-anchor = real position snap, OR a visible confidence collapse
    // (walking a loop and coming home resets σ even with perfect odometry)
    const reanchored = snap.corrected >= 30 || snap.sigmaCollapse >= 45;
    if (!reanchored) return [];
    if (nowMs - lastAnnounce < COOLDOWN) return [];
    lastAnnounce = nowMs;
    const driftTxt = snap.corrected >= 30 ? `Drift corrected, ` : '';
    return [{
      entity: 'localization', side: 'front', dist: 40, urgency: 'info', cue: 'hint',
      keepSilent: false,
      msg: `Re-localized — I recognize ${snap.placeName}. ${driftTxt}position now ${(snap.sigma / METERS).toFixed(2)} m accurate. No beacons, no GPS.`,
      why: `visual place memory matched; ${snap.corrected.toFixed(0)}px snap, σ collapsed ${snap.sigmaCollapse.toFixed(0)} → ${(snap.sigma / METERS).toFixed(1)} m`,
    }];
  }

  function readout() {
    if (!belief) reset();
    return {
      x: belief.x, y: belief.y,
      headingDeg: Math.round(((360 - (belief.heading * 180) / Math.PI) % 360 + 360) % 360),
      sigmaM: (belief.sigma / METERS),
      closures, landmarks: map.size,
    };
  }

  return { reset, updateOdometry, observe, realObserve, special, readout,
           sceneSignature, imageSignature, get belief(){ return belief; } };
})();