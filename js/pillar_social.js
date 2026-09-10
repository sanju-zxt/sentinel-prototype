/* Sentinel — Pillar 3: Social & Communication.
 * We never read faces or emotions. We read *physics* — the orientation of the
 * body, the extension of a hand, the pause before a turn. That's enough to be
 * human, and it keeps every stranger anonymous.
 */
window.SEN = window.SEN || {};

SEN.Social = (() => {
  const S = () => window.SEN.Scene;
  let pilot = { state: 'idle', t: 0, transcript: [], liveSince: 0, lastGuidance: 0 };
  const talkers = [];        // people we are quietly studying
  const lookAtCool = { };

  /* ---- kinesthetic intent: the handshake ---- */
  function handshakeCandidate(detected) {
    return detected.find(e => e.type === 'family' && e.arrived && e.handshake && e.dist < 150);
  }

  /* ---- body language (posture, not expressions) ---- */
  function bodyWhisper(detected) {
    const p = detected.find(e => e.type === 'pedestrian' && e.frontDist && e.frontDist < 190 && e.dist < 200);
    if (!p) return null;
    const arms = p.arms;   // 'open' | 'crossed' | null
    if (!arms) return null;
    if (arms === 'open') {
      return {
        entity: 'body language', side: p.side.key, dist: p.dist, urgency: 'info', cue: 'hint',
        keepSilent: false,
        msg: `${p.label.split(' ')[0] || 'Someone'} faces you, arms open — approachable.`,
        why: 'posture open + facing you (no face analysis)',
      };
    }
    return {
      entity: 'body language', side: p.side.key, dist: p.dist, urgency: 'info', cue: 'hint',
      keepSilent: false,
      msg: `${p.label.split(' ')[0] || 'Someone'} has crossed arms and is fixed in place — probably busy. Don’t interrupt.`,
      why: 'posture closed + stationary (no face analysis)',
    };
  }

  /* ---- look-at-me: the meeting nudge ---- */
  function lookAtMe(detected) {
    const p = detected.find(e => (e.type === 'family') && e.arrived && !e.handshake);
    if (!p) return null;
    const u = S().user;
    const d = Math.hypot(u.x - p.x, u.y - p.y);
    if (d < 150) {
      const key = p.id;
      if (!lookAtCool[key] || Date.now() - lookAtCool[key] > 6000) {
        lookAtCool[key] = Date.now();
        return {
          entity: 'look-at-me', side: p.side ? p.side.key : 'front', dist: d,
          urgency: 'info', cue: 'hint', keepSilent: false,
          msg: `${p.name || 'The speaker'} paused and is looking at you — they want your answer.`,
          why: 'speaker pause + gaze turn toward you (no micro-expressions)',
          vibrate: true,
        };
      }
    }
    return null;
  }

  /* ---- aggregate findings for the salience engine ---- */
  function special(user, detected) {
    const out = [];
    // primes frontDist for body language
    for (const p of detected) {
      if (p.type !== 'pedestrian' && p.type !== 'family') continue;
      const dx = p.x - user.x, dy = p.y - user.y;
      const d = Math.hypot(dx, dy) || 1;
      p.frontDist = (dx * Math.cos(user.heading) + dy * Math.sin(user.heading)) / d;
      if (p.arms === undefined) p.arms = (Math.random() < 0.4) ? (Math.random() < 0.5 ? 'open' : 'crossed') : null;
    }
    const hs = handshakeCandidate(detected);
    if (hs && hs.welcomed !== true) {
      hs.welcomed = true;
      const side = hs.side || SEN.Perception.sideOf(user, hs.x, hs.y);
      out.push({
        entity: 'kinesthetic intent', side: side.key, dist: hs.dist,
        urgency: 'info', cue: 'hint', keepSilent: false, pan: side.pan,
        msg: `${hs.name} is reaching out to shake your hand. Reach to your ${side.key}, palm down.`,
        why: 'hand extended toward you — physics, not reading emotions',
        chime: side.pan,
      });
    }
    const body = bodyWhisper(detected);
    if (body) out.push(body);
    const lam = lookAtMe(detected);
    if (lam) out.push(lam);
    return out;
  }

  /* ---- the Remote Pilot (human-in-the-loop) ---- */
  function doubleTap() {
    if (pilot.state === 'live' || pilot.state === 'connecting') { hangUp(); return; }
    pilot.state = 'connecting'; pilot.t = 0; pilot.transcript = [];
    pilot.transcript.push({ who: 'pilot', t: 0, text: '… routing to a trained operator. Hold.' });
    return 'Routing to a human pilot…';
  }

  function pilotUpdate(dt, specials) {
    if (pilot.state === 'connecting') {
      pilot.t += dt;
      if (pilot.t > 1.6) {
        pilot.state = 'live'; pilot.liveSince = 0; pilot.lastGuidance = 99;
        const name = ['Marcus', 'Priya', 'Chen', 'Aisha'][Math.floor(Math.random() * 4)];
        pilot.transcript.push({ who: 'pilot', t: 0, text: `Hi — ${name}, senior pilot. I can see your feed. You're safe. Where are we headed?` });
      }
    } else if (pilot.state === 'live') {
      pilot.liveSince += dt;
      if (pilot.liveSince - pilot.lastGuidance > 5) {
        pilot.lastGuidance = pilot.liveSince;
        pilot.transcript.push({ who: 'pilot', t: pilot.liveSince, text: pilotGuidance(specials) });
      }
    }
  }

  function pilotGuidance(specials) {
    const top = specials && specials.find(f => !f.keepSilent);
    if (top) return `Noticed that too — ${top.msg.toLowerCase()} Steady on, I've got you.`;
    const near = S().entities.find(e => e.type === 'cafe' && Math.hypot(e.x - S().user.x, e.y - S().user.y) < 300);
    if (near) return `Straight ahead 8 metres — the café's on your left. Level ground, dry.`;
    return 'Path is clear to your left. Keep your pace, one step at a time.';
  }

  function hangUp() {
    if (pilot.state === 'idle') return 'No pilot on the line.';
    pilot.state = 'idle';
    return 'Pilot disconnected. You were safe the whole time.';
  }

  /* ---- conversation focus assist ---- */
  let focusOn = false;
  function toggleFocus(detected) {
    focusOn = !focusOn;
    return focusOn
      ? 'Conversation focus on — I am isolating the voice directly in front of you.'
      : 'Focus off — full ambient audio restored.';
  }

  /* ---- nearby known people (for memory "who is near") ---- */
  function nearbyKnown() {
    const fams = S().entities.filter(e => e.type === 'family' && e.dist < 320);
    if (!fams.length) return null;
    return fams.map(f => `${f.name} (${f.role}) is ${Math.round(f.dist / 15)} m ${(f.side || {}).key || 'ahead'}`).join('. ') + '.';
  }

  return {
    special, doubleTap, pilotUpdate, pilotGuidance, hangUp, toggleFocus, nearbyKnown,
    get pilot(){ return pilot; },
  };
})();