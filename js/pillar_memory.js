/* Sentinel — Pillar 2: The Memory Palace.
 * We never store a photo. We store *where things were, when* — a spatial memory
 * over the space we mapped. Optionally augmented by vision when you point at
 * something and ask. All local, all private.
 */
window.SEN = window.SEN || {};

SEN.Memory = (() => {
  const S = () => window.SEN.Scene;
  const known = ['keys', 'wallet', 'phone', 'medication', 'meds', 'produce', 'menu'];

  // carried item the user can drop with M
  const carried = { name: 'your keys', obj: 'keys', color: 'silver' };
  const drops = [];   // { obj, place, t, x, y }

  function seedPalace() {
    // scripted seed so the demo answer works out of the box
    stash('keys', 1230, 850, '8:15 AM');
    stash('wallet', 1430, 1370, '1:37 PM');
    stash('medication', 900, 520, '7:42 AM');
    stash('produce', 1830, 660, '11:08 AM');
    stash('menu', 1850, 650, '11:08 AM');
  }

  function stash(objKey, x, y, tOverride) {
    const place = S().placeName(x, y);
    const t = tOverride || now12h();
    const rec = { obj: objKey, place, t, x, y };
    drops.push(rec);
    S().objectMemory.set(objKey, rec);
    return rec;
  }

  function now12h() {
    const d = new Date();
    let h = d.getHours(), m = d.getMinutes();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ap}`;
  }

  function dropCarried() {
    const u = S().user;
    const rec = stash(carried.obj, u.x, u.y);
    bus('memory:drop', { name: carried.name, rec });
    return { spoken: `Noted. ${carried.name} left ${rec.place}, at ${rec.t}. You'll never lose them.`, rec };
  }

  function lookAround() {
    return `I'm mapping the plaza. ${meaningSummary()}`;
  }

  function sceneSummary() {
    const near = S().entities
      .filter(e => e.type !== 'user' && Math.hypot(e.x - S().user.x, e.y - S().user.y) < 460)
      .filter(e => ['car', 'pedestrian', 'cafe', 'bench', 'poi'].includes(e.type));
    if (!near.length) return 'A quiet corner of the plaza. Nothing moving near you.';
    const ppl = near.filter(e => e.type === 'pedestrian').length;
    const cars = near.filter(e => e.type === 'car').length;
    const cafe = near.find(e => e.type === 'cafe');
    let s = `A ${ppl} person${ppl === 1 ? '' : 's'} in view`;
    if (cars) s += `, ${cars} car${cars > 1 ? 's' : ''} on the road`;
    if (cafe) s += `, ${cafe.label} on your left`;
    s += '.';
    return s;
  }
  function meaningSummary() {
    return sceneSummary() + ' You have ' + drops.length + ' saved memories here.';
  }

  /* ---- natural language query ---- */
  function ask(q, t) {
    const ql = (q || '').toLowerCase();
    let answer = null;

    if (/(where|lost|find|put|left)/.test(ql) && /(key|keys)/.test(ql)) {
      answer = recallAnswer('keys', ql);
    } else if (/(where|lost|find|left)/.test(ql) && /(wallet|money)/.test(ql)) {
      answer = recallAnswer('wallet', ql);
    } else if (/(where|lost|find|put|left)/.test(ql) && /(phone)/.test(ql)) {
      answer = recallAnswer('phone', ql);
    } else if (/(where|lost|find|taken|left)/.test(ql) && /(med|medicine|pills|tablet)/.test(ql)) {
      answer = recallAnswer('medication', ql);
    } else if (/(what.*happen|scene|describe|what.*around|summar)/.test(ql)) {
      answer = sceneSummary();
    } else if (/(what.*color|wearing|color)/.test(ql)) {
      answer = colorAnswer();
    } else if (/(read|scan|what.*this|mano?u|document|mail|bill)/.test(ql)) {
      answer = scan('document');
    } else if (/(who.*near|who.*approaching|family)/.test(ql)) {
      answer = whoNear();
    } else if (/menu|eat|lunch|coffee/.test(ql)) {
      answer = scan('menu');
    } else if (/who are you|what can you do|help|sentinel/.test(ql)) {
      answer = 'I am Sentinel. I keep you safe, I remember your space, and I only speak when it helps.';
    } else if (/morning|good/.test(ql)) {
      answer = 'Good day. The plaza is clear. Remember — I keep quiet unless there is danger or something worth knowing.';
    } else {
      answer = 'I can tell you where you left things, describe a scene, read a menu, or check your meds. Try "where are my keys".';
    }

    bus('memory:answer', { q, answer, at: now12h() });
    return answer;
  }

  function recallAnswer(obj, ql) {
    const rec = (S().objectMemory.get(obj));
    if (rec) return `${cap(obj)} are ${rec.place}, left at ${rec.t}. Want me to guide you to them?`;
    const alt = drops.find(d => d.obj === obj) || drops.find(d => d.obj === obj.replace('medication', 'meds'));
    if (alt) return `${cap(alt.obj)} are ${alt.place}, at ${alt.t}.`;
    return `I haven't seen ${obj} yet — I'll remember them the moment you put them down.`;
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function colorAnswer() {
    const u = S().user;
    return `The object nearest you is ${nearestPoi('color')}.`;
  }

  /* find the nearest identifiable object and describe it by what was asked */
  function nearestPoi(k) {
    const u = S().user;
    const near = S().entities
      .filter(e => ['poi', 'produce', 'menu', 'bench', 'car'].includes(e.type)
        && Math.abs(e.x - u.x) < 460 && Math.abs(e.y - u.y) < 460)
      .sort((a, b) =>
        Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y));
    if (!near.length) return 'nothing recognizable close by — everything around you is out of reach.';
    const e = near[0];
    if (e.type === 'produce') {
      return e.subtype === 'cucumber'
        ? `a cucumber — dark green, rounded ends, on the stall directly ${sideLabel(u, e)}.`
        : `a zucchini — matte, slightly swollen base, ${sideLabel(u, e)}.`;
    }
    if (e.type === 'menu') return `the café menu, ${sideLabel(u, e)} — it has a laminated card feel.`;
    if (e.type === 'bench') return `a park bench, ${sideLabel(u, e)} — slatted wood, weather-darkened.`;
    if (e.type === 'car') return `a parked sedan, ${sideLabel(u, e)} — cool painted metal facing away.`;
    // poi — the carried-object family
    const byObj = {
      keys:      'a brushed silver alloy — a small bunch of keys on a metal ring',
      wallet:    'dark brown leather with worn corners',
      meds:      'a white prescription bottle with a child-proof cap',
      phone:     'your phone — smooth glass, silent',
    };
    return byObj[e.obj] || e.label || 'an object I identified earlier';
  }

  function sideLabel(u, e) {
    const dx = e.x - u.x, dy = e.y - u.y;
    const d = Math.hypot(dx, dy) || 1;
    const fwdX = Math.cos(u.heading), fwdY = Math.sin(u.heading);
    const nd = fwdY * dx - fwdX * dy;
    const dot = (dx * fwdX + dy * fwdY) / d;
    if (Math.abs(dot) > 0.707) return dot > 0 ? 'ahead of you' : 'behind you';
    return nd > 0 ? 'to your left' : 'to your right';
  }

  function whoNear() {
    const soc = window.SEN.Social && SEN.Social.nearbyKnown();
    return soc || "No family signatures close by. Strangers are never analyzed — that's a promise.";
  }

  /* ---- scanner modes (R cycles) ---- */
  const scanModes = ['object', 'currency', 'medication', 'color', 'document'];
  let mode = 0;
  function nextMode() { mode = (mode + 1) % scanModes.length; return scanModes[mode]; }
  function scan(kind) {
    switch (kind) {
      case 'menu':
        return 'Menu — Aroma Café. «2 × Artisan coffee ₹140 · Croissant ₹90 · Total ₹340 + 5% tax.» I highlighted the total; it is three hundred and forty rupees.';
      case 'object': return identifyNearest();
      case 'currency': return '₹500 note. It is yours. No face analysis, just the denomination.';
      case 'medication': return 'Amlodipine 5 mg — one tablet daily, with food. Last dose: 7:42 AM. Not yet due.';
      case 'color': return 'The coat beside you is navy blue — with good contrast against the grey kerb.';
      case 'document':
        return 'Document read. Invoice from Aroma Café — headed "Received from", one table column, total ₹340. Italicised line: "thank you".';
      default: return identifyNearest();
    }
  }

  function identifyNearest() {
    const near = S().entities
      .filter(e => ['produce', 'poi', 'menu', 'car'].includes(e.type) && Math.hypot(e.x - S().user.x, e.y - S().user.y) < 220);
    if (near.length === 0) return 'Nothing close enough to identify. Move towards the café to find produce.';
    const e = near.sort((a, b) => a.dist - b.dist)[0];
    if (e.type === 'produce') return e.subtype === 'cucumber'
      ? `Produce — cucumber. Rounded ends, dark green. (A zucchini looks like a shrunken cucumber with a bulky stem — this one is a cucumber.)`
      : `Produce — zucchini. Slightly swollen base, matte skin. Use one end, not the other.`;
    if (e.type === 'car') return 'Vehicle, sedans, facing away, stationary.';
    if (e.obj === 'keys') return 'Small bunch of keys, metal ring, ~8 g.';
    if (e.obj === 'wallet') return 'Leather wallet, dark brown, worn corners.';
    if (e.obj === 'meds') return 'Prescription bottle — white, child-proof cap.';
    return 'A café table with a menu.';
  }

  /* ---- private-mode face recognition (opt-in family only) ---- */
  const faces = [];   // { name, role, seen }
  function learnFace(name, role) { faces.push({ name, role, seen: 0 }); }

  function faceScan(near) {
    const fam = near.find(e => e.type === 'family');
    if (!fam) return null;
    const rec = faces.find(f => f.name === fam.name);
    if (!rec) return null;
    const u = S().user;
    const inFront = Math.abs(distToFacing(u, fam)) < 0.6;
    if (inFront && fam.dist < 260) {
      if (rec.seen < 8) { rec.seen++; fam.whispering = fam.whispering || 0; }
      if (fam.whisperCooldown > 0) return null;
      fam.whisperCooldown = 8;
      return { msg: `${rec.role === 'wife' ? 'Your wife' : rec.name} is approaching from the ${fam.side.key}.`, who: rec };
    }
    return null;
  }

  function distToFacing(u, e) {
    const dx = e.x - u.x, dy = e.y - u.y;
    const d = Math.hypot(dx, dy) || 1;
    const fwdX = Math.cos(u.heading), fwdY = Math.sin(u.heading);
    return (dx * fwdX + dy * fwdY) / d;
  }

  const listeners = [];
  function bus(evt, data) { listeners.forEach(l => l(evt, data)); }
  function on(evt, cb) { listeners.push(cb); }

  return {
    ask, dropCarried, lookAround, sceneSummary, seedPalace, scan, nextMode,
    stash, learnFace, faceScan, scanModes,
    get drops(){ return drops; },
    on,
  };
})();