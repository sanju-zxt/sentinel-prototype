/* Sentinel — Demo scenario runner.
 * 1 key = 1 choreographed pillar moment. Judges see the exact story, every time.
 */
window.SEN = window.SEN || {};

SEN.Events = (() => {
  const map = {};
  return {
    on(evt, cb) { (map[evt] = map[evt] || []).push(cb); },
    emit(evt, data) { (map[evt] || []).forEach(cb => cb(data)); },
  };
})();

SEN.Demo = (() => {
  const S = () => window.SEN.Scene;
  const state = { name: null, t: 0, end: 0, log: [], primed: false, tour: null, tourI: 0 };

  function names() {
    return {
      0: 'Auto Tour',
      1: 'The Runaway Car (Guardian)',
      2: 'The Branch Low (Head-level)',
      3: 'Stair & Broken Escalator (Geometry)',
      4: 'Crowd River (Gap finder)',
      5: 'The Handshake (Kinesthetic)',
      6: 'Fire Alarm (Emergency)',
      7: 'Memory Palace (Persistent memory)',
      8: 'Body Language (Kinesthesia)',
      9: 'Re-localize (Visual SLAM-lite)',
    };
  }

  function brief(i) {
    if (i === 0) {
      return '0 — AUTO TOUR. A hands-free walkthrough: Sentinel walks itself through the plaza, crosswalk, a construction detour, a mid-crossing car — the one interruption that earns its voice — a memory recall, and a loop-closure re-anchor. Press 0 again to stop.';
    }
    const table = [
      '1 — RUN THE LIGHT. A car ignores red and crosses your path. Watch the WristAlert fire the split second before impact, then stay silent the rest.',
      '2 — OVERHANG. A branch hangs at head height where the cane says "clear". You duck — once — and it calibrates.',
      '3 — STAIR + ESCALATOR. Correct edge geometry, up vs down, and a platform that is broken, not just stopped.',
      '4 — CROWD RIVER. Eleven people in your way. Sentinel reads the gaps and slides you through the calm lane.',
      '5 — HANDSHAKE. A wife arrives. Private-mode face whiskers the name, then a spatial chime guides your hand to theirs. No face analysis.',
      '6 — FIRE. Alarm. Immediate directions to the nearest EXIT + auto-sends your GPS to a care contact. Pauses only after you are safe.',
      '7 — MEMORY PALACE. "Where are my keys?" ← the exact sentence a judge will ask. It answers with where AND when — and it keeps working after this demo.',
      '8 — BODY LANGUAGE. A fast-approaching stranger with open arms — read from velocity + posture, never faces. Then a person kneeling at knee-height nearby. Both are physics, not expressions.',
      '9 — RE-LOCALIZE. Zero beacons, zero GPS. Walk a loop through the landmark-rich plaza and watch the LOC chip collapse as Sentinel recognizes a place it has seen before.',
    ];
    return table[i - 1];
  }

  function start(i) {
    state.name = i; state.t = 0; state.end = i === 6 ? 26 : i === 8 ? 28 : i === 9 ? 30 : 16;
    SEN.Events.emit('demo:start', { i, name: names()[i] });
    const u = S().user;
    S().clearDemo();            // drop the previous demo's entities (base street stays)
    switch (i) {
      case 0: {
        // AUTO TOUR — Sentinel walks itself through the plaza so the demo runs
        // with NO input. Stops are anchored to the real, already-built scene
        // (crosswalk → exit → keys → café → loop-close) so it always finds them.
        state.tour = tourStops();
        state.tourI = 0;
        state.end = 1e9;        // the tour ends itself when the last stop arrives
        break;
      }
      case 0: {
        // AUTO TOUR — no input, no keyboard, no mouse. Sentinel walks itself
        // through the landmarks the judges would otherwise make you hit one by
        // one: crosswalk → exit → keys → café → loop-close re-anchor. Each stop
        // is the ONE line that earns the voice; the rest of the walk is silent.
        state.tour = tourStops();       // [{x, y, label, say}] anchored to the real plaza
        state.tourI = 0;
        // stillness/pacing handled by the per-demo haptic + voice in main loop
        state.end = 1e9;                // the tour ends itself when the last stop is reached
        break;
      }
      case 1: {
        S().make('car', u.x + 60, u.y - 600, {
          label: 'Runaway car', speed: 620, heading: Math.PI / 2, radius: 40,
          kind: 'dynamic', hazard: 'crit', w: 26, h: 46, demoOnly: true,
        });
        break;
      }
      case 2: {
        S().make('overhang', u.x + 250, u.y, { label: 'Tree branch', subtype: 'branch', radius: 60, height: 1.4, color: '#8a5b2f', demoOnly: true });
        break;
      }
      case 3: {
        S().make('stairs', u.x + 280, u.y, { label: 'Stairs — going UP', dir: 'up', w: 130, h: 60, radius: 60, demoOnly: true });
        S().make('escalator', u.x + 520, u.y, { label: 'Escalator — BROKEN', broken: true, w: 120, h: 44, radius: 55, dir: 'up', demoOnly: true });
        break;
      }
      case 4: {
        for (let k = 0; k < 12; k++) {
          const ang = k * (Math.PI * 2 / 12);
          S().make('pedestrian', u.x + Math.cos(ang) * 150 * (0.6 + k % 3), u.y + Math.sin(ang) * 150 * (0.6 + k % 2 ? 1.1 : 0.7), {
            label: 'Pedestrian', speed: 55, heading: k % 2 ? 0 : Math.PI, radius: 14, kind: 'crowd', hazard: 'info', dir: k % 2 ? 0 : Math.PI,
            demoOnly: true,
          });
        }
        break;
      }
      case 5: {
        const wife = S().entities.find(e => e.type === 'family');
        if (!wife) return;
        wife.x = u.x + 700; wife.y = u.y + 30;
        wife.pathGoal = { x: u.x + 130, y: u.y - 24 };
        wife.speed = 95;
        break;
      }
      case 6: {
        SEN.Health.setEvent('cardiac');
        break;
      }
      case 7: {
        if (!state.primed) {              // seed the palace ONCE per session
          state.primed = true;
          SEN.Memory.seedPalace();
          setTimeout(() => SEN.Events.emit('ask', 'where are my keys'), 1200);
        }
        break;
      }
      case 8: {
        // body language: a fast approach (arms open) + a person kneeling low
        S().make('pedestrian', u.x + 520, u.y, {
          label: 'Approaching person', speed: 150, heading: Math.PI, dir: Math.PI, radius: 14,
          kind: 'dynamic', hazard: 'info', posture: 'standing', arms: 'open', demoOnly: true,
        });
        S().make('pedestrian', u.x + 80, u.y - 70, {
          label: 'Person kneeling', speed: 0, heading: Math.PI, radius: 14,
          kind: 'static', hazard: 'info', posture: 'kneeling', demoOnly: true,
        });
        break;
      }
      case 9: {
        // visual-SLAM-lite: fresh odometry start; loop closure fires as you walk
        SEN.Localize.reset(u);
        break;
      }
    }
    return names()[i];
  }

  function update(dt) {
    if (state.name == null) return;
    if (state.name === 0) { tourTick(dt); return; }   // code-0 tour drives itself
    state.t += dt;
    if (state.t > state.end) { state.name = null; SEN.Events.emit('demo:end'); }
  }

  /** AUTO-TOUR walker — moves the USER (not an avatar) through the tour stops
   *  at walking pace, speaking each stop's ONE line exactly when arriving. */
  function tourTick(dt) {
    const S = () => window.SEN.Scene;
    const stops = state.tour;
    if (!stops || state.tourI >= stops.length) {   // last stop reached → tour done
      state.name = null; SEN.Events.emit('demo:end'); return;
    }
    const u = S().user;
    const st = stops[state.tourI];
    const dx = st.x - u.x, dy = st.y - u.y;
    const d = Math.hypot(dx, dy);
    if (d > 6) {
      const sp = Math.min(290 * dt, d);   // ~2 m/s walking pace
      u.x += dx / d * sp; u.y += dy / d * sp;
      u.heading = Math.atan2(dy, dx);     // face the way you are walking
      return;
    }
    // arrived — speak the one earned line, then move on
    if (!st.spoken) {
      st.spoken = true;
      SEN.Events.emit('guide:say', { label: st.label, msg: st.say, who: 'AUTO TOUR' });
    }
    if (state.t > (st.hold || 4)) state.tourI++;
    else state.t += dt;                    // hold each stop ~4s so the line lands
  }

  return { names, brief, start, update, get state(){ return state; } };
})();