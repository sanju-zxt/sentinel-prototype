/* Sentinel — Pillar 4: Health & Ecosystem.
 * The same sensors keep you alive and connect you to the city. Because the
 * camera is already on, rPPG watches your heart for free. Because the map is
 * shared, the community keeps the world tagged.
 */
window.SEN = window.SEN || {};

SEN.Health = (() => {
  const S = () => window.SEN.Scene;
  let hr = 72, breathe = 12, fatigue = 0;
  let distWalked = 0, prevX = null, prevY = null;
  const rx = []; let rxT = 0;
  let lastAlert = '';
  const history = [];   // health events
  const simState = { t: 0, event: null };

  // community accessibility map (shared anonymously)
  const communityTags = [
    { x: 1850, y: 640, text: 'Aroma Café doorstep has a tricky 4 cm lip', m: true },
    { x: 520, y: 990, text: 'Third curb on the west is crumbling — step wide', s: true },
    { x: 2300, y: 1080, text: 'The bench here is taken by pigeons past noon', j: true },
  ];

  function update(dt, t) {
    simState.t += dt;
    const u = S().user;
    if (prevX != null) {
      distWalked += Math.hypot(u.x - prevX, u.y - prevY) / 15; // ~meters
    }
    prevX = u.x; prevY = u.y;

    // simulated rPPG from the "camera feed"
    hr += (Math.random() - 0.5) * 4;
    if (distWalked > 80) { fatigue += dt; }        // exertion builds fatigue…
    else { fatigue = Math.max(0, fatigue - dt * 2); } // …rest decays it (HR never pins at ceiling)
    hr = clamp(hr + fatigue * 0.7, 58, 118);

    rx.push(hr); rxT += dt;
    if (rx.length > 90) rx.shift();

    // triggers
    if (simState.event === 'cardiac') {
      hr = clamp(hr, 118, 128);
      if (rxT - simState.eventT > 2 && lastAlert !== 'cardiac') {
        fire('cardiac', `Your heart rate is ${Math.round(hr)} bpm and climbing. Bench is 5 m right — sit. Breathe with me.`, 'crit');
      }
    }
    if (simState.event === 'fatigue' && lastAlert !== 'fatigue') {
      fire('fatigue', `You've walked ${distWalked.toFixed(0)} m — early fatigue sign. Pause one minute.`, 'warn');
    }
    // breathe AFTER the event clamp — never "118 bpm with resting breath rate"
    breathe = 12 + (hr - 72) * 0.05;

    // smart city: bus state
    const busPhase = (t % 12);
    const bus = busPhase < 2
      ? 'arriving in 2 min · doors 10 m ahead'
      : busPhase < 8 ? 'arriving in 5 min' : 'next bus 22 · in 9 min';
    // environment readout
    const G = () => window.SEN.Guardian.env;
    const env = `${(G() && G().sky) || 'clear'} · ${(G() && G().temp) || 22}°C · humidity 61%`;

    return { hr: Math.round(hr), breathe: breathe.toFixed(1), bus, env, dist: distWalked.toFixed(0) };
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function fire(type, text, urg) {
    lastAlert = type;
    history.unshift({ type, text, urg, at: stamp() });
    if (history.length > 80) history.pop();
    bus('health', { type, text, urg });
  }

  function push(type, text, urg) {
    history.unshift({ type, text, urg, at: stamp() });
    if (history.length > 80) history.pop();
  }

  function stamp() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  /* ---- silent heart-plot sparkline quadrants ---- */
  function spark() { return rx.slice(-60); }

  /* ---- privacy shield geofencing ---- */
  const sensitiveZones = [
    { label: 'Public washroom', x: 2500, y: 1650, r: 130 },
    { label: 'Locker room', x: 60, y: 1680, r: 130 },
  ];
  function privacyCheck(u) {
    for (const z of sensitiveZones) {
      if (Math.hypot(u.x - z.x, u.y - z.y) < z.r) {
        return z;
      }
    }
    return null;
  }

  /* ---- community tag whisper ---- */
  function communityWhisper(u) {
    for (const tag of communityTags) {
      const d = Math.hypot(u.x - tag.x, u.y - tag.y);
      if (d < 260 && !tag.said) {
        tag.said = true; tag.when = Date.now();
        return `Community note: ${tag.text}.`;
      }
      if (tag.said && Date.now() - (tag.when || 0) > 60000) tag.said = false;
    }
    return null;
  }

  /* ---- translation ----- */
  const phrases = {
    pharmacy: ['Where is the nearest pharmacy?', 'निकटतम फ़ार्मेसी कहाँ है?', 'फ़ार्मेसी'],
    toilet: ['Where are the toilets?', 'स्नानगृह कहाँ है?', 'शौचालय'],
  };
  function translate(req, from) {
    const p = req === 'pharmacy' ? phrases.pharmacy : phrases.toilet;
    return `«${p[1]}» — that's "${p[0]}" — I'll guide you to the ${p[2]} when asked.`;
  }

  /* ---- find my phone (clap-whistle ping) ---- */
  let findPhoneRinging = false;
  function findPhone() {
    findPhoneRinging = !findPhoneRinging;
    SEN.Audio.tone(880, 0.18, 0.4, [880, 880, 1174.66, 0], 0);
    setTimeout(() => SEN.Audio.tone(440, 0.14, 0.35, [659.25, 659.25, 987.77], 0.3), 320);
    return findPhoneRinging
      ? 'Phone found — it is on the bench by the café, face down. Ringing twice.'
      : 'Phone ping cancelled.';
  }

  const listeners = [];
  function bus(evt, data) { listeners.forEach(l => l(evt, data)); }

  return {
    update, spark, privacyCheck, communityWhisper, translate, findPhone,
    push, fire, setEvent(__e) { simState.event = __e; simState.eventT = simState.t; lastAlert = ''; },  // re-arm the latch so relaunching demo 6 fires again
    get history(){ return history; },
    get state(){ return simState; },
    on(cb) { listeners.push(cb); },
    resetCounters() { distWalked = 0; fatigue = 0; lastAlert = ''; },
    get tagCount(){ return communityTags.length; },
  };
})();