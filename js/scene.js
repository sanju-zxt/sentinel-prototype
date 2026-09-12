/* Sentinel — Simulation world.
 * A top-down synthetic street. Every object the Guardian cares about is here.
 * People are rendered as wireframe skeletons — that's the product philosophy.
 */
window.SEN = window.SEN || {};

SEN.WORLD = { w: 2600, h: 1800 };

SEN.Scene = (() => {
  let idc = 1;
  const entities = [];
  let user = null;

  function newId() { return 'e' + (idc++); }

  /* ---- factory ---- */
  function make(type, x, y, extra = {}) {
    const e = Object.assign({
      id: newId(), type, x, y,
      heading: 0, speed: 0, radius: 12,
      kind: 'static',    // static | dynamic | crowd
      hazard: 'low',     // none | info | warn | crit
      label: type,       // display name
      seen: 0,           // frames since perceived
      active: true,
    }, extra);
    entities.push(e);
    return e;
  }

  function clear() {
    entities.length = 0;
  }

  function reset() {
    clear();
    buildStreet();
  }

  /* ---- seed content ---- */
  function buildStreet() {
    const W = SEN.WORLD.w, H = SEN.WORLD.h;

    // ground zone labelling: roads + sidewalk
    make('road', W/2, 300,  { label: 'Road (east-west)', w: W, h: 240, color: '#0a0f16' });
    make('road', W/2, H-300,{ label: 'Road (east-west)', w: W, h: 240, color: '#0a0f16' });
    make('crosswalk', W/2, H/2, { label: 'Crosswalk', w: 180, h: 70, color: '#1c2735' });

    // traffic light near the crosswalk
    make('trafficlight', W/2 - 90, H/2 - 120, { label: 'Traffic light', state: 'red', stateT: 0 });

    // cars driving on the roads
    for (let i = 0; i < 3; i++) {
      const lane = (i % 2 === 0) ? 1 : -1;
      make('car', 300 + i * 700, lane > 0 ? 300 : H-300, {
        label: 'Car', speed: 150 * lane, heading: lane > 0 ? 0 : Math.PI,
        radius: 40, kind: 'dynamic', hazard: 'crit', w: 26, h: 46,
      });
    }
    // a cyclist that cuts across the user's path
    make('cyclist', W/3, 1100, {
      label: 'Cyclist', speed: 240, heading: 0, radius: 22,
      kind: 'dynamic', hazard: 'crit', curve: 1.2,
    });

    // overhangs the white cane misses
    make('overhang', W*0.32, H*0.42, { label: 'Tree branch', subtype: 'branch', radius: 60, height: 1.4, color: '#8a5b2f' });
    make('overhang', W*0.68, H*0.30, { label: 'Open truck door', subtype: 'door', radius: 55, height: 1.5, color: '#7a4a4a' });
    make('overhang', W*0.55, H*0.75, { label: 'Low sign', subtype: 'sign', radius: 40, height: 1.2, color: '#6a7a5a' });

    // ground hazards
    make('stairs', W*0.20, H*0.55, { label: 'Stairs — going DOWN', dir: 'down', w: 130, h: 60, radius: 60 });
    make('escalator', W*0.88, H*0.60, { label: 'Escalator — MOVING', broken: false, w: 120, h: 44, radius: 55, dir: 'up' });
    make('curb', W*0.42, H*0.86, { label: 'Curb drop-off', w: 90, h: 40, radius: 40 });
    make('pothole', W*0.72, H*0.88, { label: 'Pothole', radius: 60 });

    // crowd flowing across the plaza
    for (let i = 0; i < 10; i++) {
      make('pedestrian', 500 + i * 160, H*0.55 + (Math.sin(i) * 140), {
        label: 'Pedestrian', speed: 60, heading: 0, radius: 14,
        kind: 'crowd', hazard: 'info', dir: (i % 2 === 0) ? 0 : Math.PI,
      });
    }

    // construction
    make('cone', W*0.60, H*0.62, { label: 'Cone', radius: 14 });
    make('cone', W*0.62, H*0.64, { label: 'Cone', radius: 14 });
    make('tape', W*0.60, H*0.655, { label: 'Barrier tape', w: 90, h: 12, radius: 34 });
    make('scaffold', W*0.665, H*0.60, { label: 'Scaffolding', radius: 40 });

    // slippery patch
    make('wet', W*0.50, H*0.62, { label: 'Wet patch (rain)', subtype: 'wet', rx: 90, ry: 40, radius: 60 });

    // exit (emergency)
    make('exit', W-120, 120, { label: 'EXIT north-east', radius: 50, color: '#0f3a2e' });
    make('exit', 120, 120, { label: 'EXIT north-west', radius: 50, color: '#0f3a2e' });

    // points of interest for the Memory Palace
    make('poi', W*0.48, H*0.47, { label: 'your keys', obj: 'keys', wallet: false, ipc: 'POI' });
    make('poi', W*0.55, H*0.76, { label: 'your wallet', obj: 'wallet', ipc: 'POI' });
    make('poi', W*0.35, H*0.30, { label: 'medication', obj: 'meds', ipc: 'POI' });

    // a bench & cafe landmark for describing location
    make('bench', W*0.40, H*0.40, { label: 'Bench', radius: 30, ipc: 'LANDMARK' });
    make('cafe', W*0.70, H*0.35, { label: 'Café (Aroma)', radius: 60, ipc: 'LANDMARK' });

    // seeded posture (kinesthetic sensing): someone seated on the bench, someone
    // kneeling by the pothole. No `arms` — arms are only ever a *witnessed*
    // observation (demo 8), never seeded randomly, so body language stays real.
    make('pedestrian', W*0.40 - 75, H*0.40 + 40, {
      label: 'Person seated', speed: 0, heading: 0, radius: 14,
      kind: 'static', hazard: 'info', posture: 'sitting',
    });
    make('pedestrian', W*0.72 - 62, H*0.88, {
      label: 'Person kneeling', speed: 0, heading: 0, radius: 14,
      kind: 'static', hazard: 'info', posture: 'kneeling',
    });

    // produce stand (memory palace scanner demo: cucumber vs zucchini)
    make('produce', W*0.70, H*0.47, { label: 'Cucumber', subtype: 'cucumber', radius: 18 });
    make('produce', W*0.715, H*0.47, { label: 'Zucchini', subtype: 'zucchini', radius: 18 });
    make('menu', W*0.705, H*0.50, { label: 'Café menu', radius: 16, hasTotal: true });

    // family member for private-mode face recognition + handshake
    make('family', W*0.66, H*0.30, {
      label: 'Aisha (family)', name: 'Aisha', role: 'wife',
      speed: 55, heading: 0, radius: 14, kind: 'dynamic', hazard: 'none',
      pathGoal: { x: W*0.60, y: H*0.52 }, handshake: false, whisperCooldown: 0,
    });

    // user
    user = make('user', W/2, H/2, { label: 'You', radius: 16 });
    user.isUser = true;
    user.sunBearing = 0.6;
  }

  /* ---- dynamics ---- */
  function tick(dt, t) {
    for (const e of entities) {
      if (e.isUser) continue;
      if (!e.active) continue;

      if (e.type === 'car') {
        e.x += Math.cos(e.heading) * e.speed * dt;
        e.y += Math.sin(e.heading) * e.speed * dt;
        if (e.x < -50) e.x = SEN.WORLD.w + 50;
        if (e.x > SEN.WORLD.w + 50) e.x = -50;
        // traffic light stops cars near the crossing when red
        if (e.y < 260 || e.y > SEN.WORLD.h - 260) {
          const tl = findNearby('trafficlight', e.x, e.y, 400);
          if (tl && tl.state === 'red' && Math.abs(e.x - (SEN.WORLD.w/2)) < 120) {
            e.x -= Math.cos(e.heading) * e.speed * dt * 0.9;
          }
        }
      }
      else if (e.type === 'cyclist') {
        e.heading += Math.sin(t * 0.9 + e.id.length) * e.curve * dt;
        e.x += Math.cos(e.heading) * e.speed * dt;
        e.y += Math.sin(e.heading) * e.speed * dt;
        if (e.x < 0 || e.x > SEN.WORLD.w) e.heading = Math.PI - e.heading;
        if (e.y < 0 || e.y > SEN.WORLD.h) e.heading = -e.heading;
      }
      else if (e.type === 'pedestrian') {
        e.heading = (e.dir || 0) + Math.sin(t * 0.6 + e.id.length) * 0.5;
        // crowd separation
        for (const o of entities) {
          if (o === e || o.type !== 'pedestrian') continue;
          const dx = e.x - o.x, dy = e.y - o.y;
          const d = Math.hypot(dx, dy);
          if (d < 34 && d > 0) { e.x += dx/d * 30 * dt; e.y += dy/d * 30 * dt; }
        }
        e.x += Math.cos(e.heading) * e.speed * dt;
        e.y += Math.sin(e.heading) * e.speed * dt;
        if (e.x < 60) { e.x = 60; e.dir = 0; }
        if (e.x > SEN.WORLD.w - 60) { e.x = SEN.WORLD.w - 60; e.dir = Math.PI; }
        if (e.y < 60) e.y = 60;
        if (e.y > SEN.WORLD.h - 60) e.y = SEN.WORLD.h - 60;
      }
      else if (e.type === 'trafficlight') {
        const cycle = 6;
        const k = (t % cycle) / cycle;
        e.state = k < 0.5 ? 'red' : 'green';
        e.stateT = t;
      }
      else if (e.type === 'family') {
        // walks toward a goal, then extends a hand for a handshake
        const goal = e.pathGoal;
        const dx = goal.x - e.x, dy = goal.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d > 46) {
          e.heading = Math.atan2(dy, dx);
          e.x += Math.cos(e.heading) * e.speed * dt;
          e.y += Math.sin(e.heading) * e.speed * dt;
          e.arrived = false;
        } else {
          e.arrived = true;
          e.handshake = (Math.floor(t) % 2) === 0; // cycles extend/relax to show detection
        }
        if (e.whisperCooldown > 0) e.whisperCooldown -= dt;
      }
      else if (e.type === 'poi') {
        // Memory Palace: refresh the "last seen" of the object on each frame it
        // is near the user (simulated "placed here at 8am" is scripted in demo)
      }
      if (e.type !== 'user') {
        e.seen--;
        if (e.seen < -5) { /* fall out of awareness */ }
      }
    }
    sendPoIs(entities, user); // memory palace keeps spatial track
  }

  function findNearby(type, x, y, r) {
    let best = null, bd = r;
    for (const e of entities) {
      if (e.type !== type) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  /* ---- memory palace: remember where objects are ---- */
  const objectMemory = new Map();
  const usedTimes = ['7:42 AM','8:15 AM','11:08 AM','1:37 PM','6:03 PM','9:26 PM'];

  function recordStash(objKey, x, y) {
    const place = placeName(x, y);
    const t = usedTimes[Math.floor(Math.random() * usedTimes.length)];
    objectMemory.set(objKey, { place, t, x, y });
    return objectMemory.get(objKey);
  }
  function recall(objKey) { return objectMemory.get(objKey); }

  function placeName(x, y) {
    const W = SEN.WORLD.w, H = SEN.WORLD.h;
    const near = (etype, r=70) => findNearby(etype, x, y, r);
    const named = [
      ['cafe', 'next to the café'],
      ['bench', 'on the bench'],
      ['crosswalk', 'at the crosswalk'],
      ['escalator', 'near the escalator'],
      ['pothole', 'by the pothole'],
    ];
    for (const [type, phrase] of named) {
      const n = near(type);
      if (n) {
        if (type === 'cafe') return 'by the café (' + n.label + ')';
        return phrase + ' · on ' + (y < H/2 ? 'the north' : 'the south') + ' side';
      }
    }
    if (y < H*0.3) return 'on the north road shoulder';
    if (x < W*0.35) return 'at the western plaza edge';
    if (x > W*0.65) return 'near the eastern shops';
    return 'mid-plaza, south side';
  }

  // Data flowing back to the frontend: memory objects that have been dropped.
  function sendPoIs(ents, u) {
    for (const e of ents) {
      if (e.type === 'poi') {
        e.dist = Math.hypot(e.x - u.x, e.y - u.y);
      }
    }
  }

  return { entities, make, clear, reset, tick, buildStreet,
           get user(){return user}, set user(v){user=v},
           recordStash, recall, placeName, objectMemory };
})();