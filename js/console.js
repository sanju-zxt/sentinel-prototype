/* Sentinel — Console & renderer.
 * The only "screen" is for the demo audience. Strip away the dashboard and the
 * real user interface is: a vibration on the wrist, a chime by the ear, a calm
 * voice — never more than one line at a time.
 */
window.SEN = window.SEN || {};

SEN.Console = (() => {
  const cvs = document.getElementById('world');
  const ctx = cvs.getContext('2d');
  const mini = document.getElementById('minimap');
  const mctx = mini.getContext('2d');
  const seebar = document.getElementById('seebar-view');
  const voiceBanner = document.getElementById('voice-banner');
  const hudMode = document.getElementById('mode-badge');
  const hrBadge = document.getElementById('hr-val');
  const planeBadge = document.getElementById('plane-state');
  const planeEl = document.getElementById('plane-badge');
  const privacyLayer = document.getElementById('privacy-layer');
  const priv = document.getElementById('privacy-layer');
  let W = 0, H = 0;
  let lastRender = { chat: '' };

  function resize() {
    W = cvs.width = window.innerWidth - 430;
    H = cvs.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);

  /* ---------- camera ---------- */
  function cam(u, sx, sy) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.translate(-sx, -sy);
  }

  /* ---------- world ---------- */
  function drawWorld(ents, u, t) {
    ctx.clearRect(0, 0, W, H);
    // ground
    ctx.fillStyle = '#0a0f16';
    ctx.fillRect(0, 0, SEN.WORLD.w, SEN.WORLD.h);

    const grid = 140;
    ctx.strokeStyle = 'rgba(30,46,70,.14)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= SEN.WORLD.w; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SEN.WORLD.h); ctx.stroke(); }
    for (let y = 0; y <= SEN.WORLD.h; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SEN.WORLD.w, y); ctx.stroke(); }

    for (const e of ents) {
      if (e.isUser) continue;
      if (e.demoOnly && e.dist && e.dist > 900) continue;
      drawEntity(ctx, e, t);
    }

    // worlds close to user glow when inside the bubble
    for (const e of ents) {
      if (e.isUser || !e.inBubble) continue;
      ctx.save();
      ctx.strokeStyle = alertColor(e) ;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, (e.radius || 16) + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // bubbles
    ctx.save();
    ctx.strokeStyle = 'rgba(55,226,255,.16)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(u.x, u.y, SEN.Perception.BUBBLE.outer, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(55,226,255,.34)';
    ctx.beginPath(); ctx.arc(u.x, u.y, SEN.Perception.BUBBLE.inner, 0, Math.PI * 2); ctx.stroke();
    // scan wedge (25m context) ahead
    ctx.fillStyle = 'rgba(55,226,255,.045)';
    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.arc(u.x, u.y, SEN.Perception.SCAN_RANGE, u.heading - 0.65, u.heading + 0.65);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // user
    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.rotate(u.heading);
    ctx.fillStyle = '#eaf6ff';
    ctx.strokeStyle = '#37e2ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 0); ctx.lineTo(-14, -14); ctx.lineTo(-8, 0); ctx.lineTo(-14, 14);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // label
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.font = '10px "Cascadia Code", monospace';
    ctx.fillText('YOU', u.x + 34, u.y - 16);
  }

  function alertColor(e) {
    if (e.hazard === 'crit') return '#ff4d5e';
    if (e.hazard === 'warn') return '#ffc24d';
    if (e.inCore) return '#ff4d5e';
    return '#37e2ff';
  }

  function drawEntity(ctx, e, t) {
    ctx.save();
    switch (e.type) {
      case 'car': case 'cyclist': {
        ctx.translate(e.x, e.y);
        if (e.type === 'car' && e.label === 'Runaway car') ctx.globalAlpha = .4;
        ctx.rotate(e.heading);
        ctx.fillStyle = e.type === 'cyclist' ? '#d47bff' : '#b9cbd9';
        ctx.strokeStyle = '#5c7397'; ctx.lineWidth = 1.5;
        if (e.type === 'cyclist') { ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        else { ctx.fillRect(-13, -23, 26, 46); ctx.strokeRect(-13, -23, 26, 46); }
        break;
      }
      case 'pedestrian': {
        skeleton(ctx, e, 14, '#37e2ff');
        break;
      }
      case 'family': {
        skeleton(ctx, e, 16, e.handshake ? '#9b7bff' : '#43f5a8', e.arrived && e.handshake);
        if (e.arrived && e.handshake) {
          // extended arm toward user
          ctx.strokeStyle = 'rgba(155,123,255,.9)'; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y - 6);
          ctx.lineTo(e.x + Math.cos(e.heading) * 42, e.y - 6 + Math.sin(e.heading) * 42);
          ctx.stroke();
        }
        break;
      }
      case 'overhang': {
        // head-level, shown as a halo dome
        ctx.fillStyle = e.color + '55';
        ctx.strokeStyle = e.color;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = e.color;
        ctx.font = '10px monospace';
        ctx.fillText(e.label, e.x - 34, e.y);
        break;
      }
      case 'stairs': case 'escalator': case 'curb': case 'crosswalk': case 'road': {
        ctx.fillStyle = e.color || (e.type === 'stairs' ? '#4a3d2e' : e.type === 'curb' ? '#43374d' : '#101a28');
        ctx.strokeStyle = '#2a3b52';
        ctx.fillRect(e.x - (e.w || 60) / 2, e.y - (e.h || 40) / 2, e.w || 60, e.h || 40);
        ctx.strokeRect(e.x - (e.w||60)/2, e.y - (e.h||40)/2, e.w||60, e.h||40);
        ctx.fillStyle = e.type === 'escalator' && e.broken ? '#ff4d5e' : '#9fb2cc';
        ctx.font = '9px monospace';
        ctx.fillText(e.label, e.x - 70, e.y);
        break;
      }
      case 'trafficlight': {
        const on = p => { ctx.fillStyle = p; ctx.beginPath(); ctx.arc(e.x, e.y + (p === '#ff4d5e' ? -10 : 10), 6, 0, Math.PI * 2); ctx.fill(); };
        on(e.state === 'red' ? '#ff4d5e' : '#2a3b52');
        on(e.state === 'green' ? '#43f5a8' : '#2a3b52');
        break;
      }
      case 'pothole': {
        ctx.fillStyle = '#2a1b1b';
        ctx.strokeStyle = '#5c2f2f';
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ff8a8a'; ctx.font = '9px monospace';
        ctx.fillText(e.label, e.x - 30, e.y);
        break;
      }
      case 'wet': {
        ctx.fillStyle = 'rgba(80,160,220,.3)';
        ctx.strokeStyle = 'rgba(110,190,240,.5)';
        ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.ellipse(e.x, e.y, e.rx || 90, e.ry || 40, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case 'cone': {
        ctx.fillStyle = '#ff9f3c'; ctx.strokeStyle = '#b8591a';
        ctx.beginPath(); ctx.moveTo(e.x, e.y - 18); ctx.lineTo(e.x + 9, e.y + 8); ctx.lineTo(e.x - 9, e.y + 8);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 'tape': {
        ctx.strokeStyle = '#ffb03c'; ctx.lineWidth = 3;
        ctx.setLineDash([10,6]);
        ctx.beginPath(); ctx.moveTo(e.x - (e.w||40)/2, e.y); ctx.lineTo(e.x + (e.w||40)/2, e.y); ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case 'scaffold': {
        ctx.fillStyle = '#3a4d6d88';
        ctx.strokeStyle = '#5c7397';
        ctx.strokeRect(e.x - 30, e.y - 14, 60, 28);
        ctx.strokeRect(e.x - 26, e.y - 10, 52, 20);
        ctx.strokeRect(e.x - 8, e.y - 24, 16, 48);
        break;
      }
      case 'exit': {
        ctx.fillStyle = '#0f3a2e'; ctx.strokeStyle = '#43f5a8';
        ctx.strokeRect(e.x - 28, e.y - 18, 56, 36);
        ctx.fillStyle = '#43f5a8'; ctx.font = 'bold 13px monospace';
        ctx.fillText('EXIT →', e.x - 36, e.y + 4);
        break;
      }
      case 'poi': {
        const colors = { keys: '#ffd76a', wallet: '#c58a44', meds: '#9be7ff' };
        ctx.fillStyle = colors[e.obj] || '#ffd76a';
        ctx.beginPath(); ctx.arc(e.x, e.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.font = '8px monospace';
        ctx.fillText(e.label, e.x + 10, e.y + 3);
        break;
      }
      case 'produce': case 'menu': {
        ctx.fillStyle = e.subtype === 'cucumber' ? '#5a8a4a' : e.subtype === 'zucchini' ? '#4a7a5a' : '#c9a76a';
        ctx.beginPath(); ctx.ellipse(e.x, e.y, e.subtype === 'menu' ? 14 : 8, e.subtype === 'menu' ? 4 : 12, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffd76a'; ctx.font = '9px monospace';
        if (e.subtype) ctx.fillText(e.label, e.x - 24, e.y - 10);
        break;
      }
      case 'bench': case 'cafe': {
        ctx.fillStyle = e.type === 'cafe' ? 'rgba(120,80,40,.8)' : 'rgba(90,100,120,.5)';
        ctx.fillRect(e.x - 30, e.y - 10, 60, 20);
        ctx.fillStyle = e.type === 'cafe' ? '#ffe0b0' : '#9fb2cc';
        ctx.font = '9px monospace';
        ctx.fillText(e.label, e.x - 40, e.y - 16);
        break;
      }
      default:
        break;
    }
    ctx.restore();
  }

  /* wireframe skeleton — our way of "seeing" people without faces.
   Posture-aware: kneeling and seated people are drawn differently, because the
   kinesthesia engine reads the same physics we render. */
  function skeleton(ctx, e, s, color, extend) {
    const posture = (e.read && e.read.posture) || e.posture;
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();

    if (posture === 'kneeling') {
      // one knee down — compact and low
      const hs = s * 0.55;
      ctx.arc(e.x - 3, e.y - hs * 2.2, 3.2, 0, Math.PI * 2);                 // head
      ctx.moveTo(e.x - 3, e.y - hs * 1.3); ctx.lineTo(e.x - 4, e.y - hs * 0.2); // torso
      ctx.moveTo(e.x - 4, e.y - hs); ctx.lineTo(e.x + hs, e.y - hs * 1.05);    // raised knee
      ctx.moveTo(e.x - 4, e.y - hs); ctx.lineTo(e.x - hs, e.y + hs * 0.5);     // ground knee
      ctx.moveTo(e.x - 4, e.y - hs); ctx.lineTo(e.x + hs * 0.7, e.y + hs * 0.8); // back foot
      ctx.stroke();
      return;
    }
    if (posture === 'sitting') {
      // seated — short torso, knees forward
      const hs = s * 0.6;
      ctx.arc(e.x, e.y - hs - 3, 3.4, 0, Math.PI * 2);                 // head at seat height
      ctx.moveTo(e.x, e.y - hs + 2); ctx.lineTo(e.x, e.y - hs * 0.55);  // torso
      ctx.moveTo(e.x, e.y - hs * 0.55); ctx.lineTo(e.x + hs * 0.95, e.y - hs * 0.5); // thigh
      ctx.moveTo(e.x + hs * 0.95, e.y - hs * 0.5); ctx.lineTo(e.x + hs * 0.6, e.y - hs * 0.05); // shin
      ctx.moveTo(e.x, e.y - hs * 0.55); ctx.lineTo(e.x - hs * 0.5, e.y - hs * 0.15); // other leg
      ctx.stroke();
      return;
    }

    const lift = e.arrived && e.handshake ? -4 : 0;
    // head
    ctx.arc(e.x, e.y - s - (extend ? 10 : 0), 3.6, 0, Math.PI * 2); ctx.stroke();
    // torso
    ctx.moveTo(e.x, e.y - s + 4); ctx.lineTo(e.x, e.y + s - 4);
    // shoulders (rotated by heading)
    const hx = Math.cos(e.heading), hy = Math.sin(e.heading);
    ctx.moveTo(e.x - hx * 5, e.y - s + 2 - hy * 5); ctx.lineTo(e.x + hx * 5, e.y - s + 2 + hy * 5);
    // legs
    ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + hy * 7, e.y + s);
    ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - hy * 7, e.y + s);
    ctx.stroke();
  }

  /* ---------- seebar ---------- */
  function renderSeebar(detected) {
    // move chips to the labels of things in range
    const order = { crit: 0, warn: 1, info: 2 };
    const list = detected.slice(0, 8).sort((a, b) => (order[a.hazard] || 3) - (order[b.hazard] || 3));
    const pool = seebar._chips || (seebar._chips = []);
    while (pool.length < list.length) {
      const chip = document.createElement('span');
      chip.style.display = 'none';
      seebar.appendChild(chip);
      pool.push(chip);
    }
    for (let i = 0; i < pool.length; i++) {
      const chip = pool[i];
      if (i >= list.length) { chip.style.display = 'none'; continue; }
      const e = list[i];
      chip.style.display = '';
      chip.className = 'seebar-chip ' + (e.hazard === 'crit' ? 'crit' : e.hazard === 'warn' ? 'hot' : 'safe');
      chip.textContent = e.label + '·' + Math.round(e.dist / 15) + 'm';
    }
  }

  /* ---------- haptic pulse ---------- */
  function hapticFlash(side, cls) {
    const el = document.querySelector(`.pulse.${side}`);
    if (!el) return;
    el.classList.remove('fire', 'fire-side', 'warn', 'hint', 'green');
    void el.offsetWidth;   // reflow to restart animation
    el.classList.add(cls || 'warn');
  }

  /* ---------- localization + haptic HUD ---------- */
  function renderLoc(loc, haptic) {
    const val = $('loc-val');
    if (!val) return;
    const chip = $('loc-chip');
    if (loc.lost) {
      val.textContent = 'GPS LOST · DR';
      chip.classList.add('lost');
      chip.title = 'GNSS dropped — fusing compass + odometry until the next visual anchor';
    } else {
      val.textContent = `${loc.sigmaM.toFixed(1)}m σ · ${loc.closures} recall${loc.closures === 1 ? '' : 's'}`;
      chip.classList.remove('lost');
      chip.title = 'Beacon-free position belief · place-memory loop closure';
    }
    const hv = $('haptic-val');
    if (hv) hv.textContent = haptic.pulses;
    const belt = haptic.belt || {};
    $('haptic-badge').classList.toggle('pulsing',
      (belt.left || 0) + (belt.right || 0) + (belt.front || 0) + (belt.back || 0) > 0.4);
  }

  /* ---------- voice banner + synth ---------- */
  function renderVoice(alert, opts = {}) {
    voiceBanner.classList.remove('hidden', 'crit');
    if (alert.cue === 'crit') voiceBanner.classList.add('crit');
    voiceBanner.textContent = '';
    const msg = document.createElement('span');
    msg.textContent = alert.msg;                 // textContent only — alert.msg can carry user words
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = `${opts.who || ''} · ${alert.side.toUpperCase()} · ${alert.cue === 'crit' ? 'VOICE' : 'HAPTIC'}`;
    voiceBanner.appendChild(msg);
    voiceBanner.appendChild(who);
    heartbeat(alert);
  }

  function heartbeat(alert) {
    clearTimeout(heartbeat._t);
    heartbeat._t = setTimeout(() => { voiceBanner.classList.add('hidden'); }, alert.cue === 'crit' ? 5200 : 3800);
  }
  heartbeat._t = 0;

  /* ---------- silence log ---------- */
  const $ = id => document.getElementById(id);
  function renderLog() {
    $('stat-spoken').textContent = SEN.Perception.spoken;
    $('stat-detected').textContent = SEN.Perception.detected;
    $('stat-suppressed').textContent = SEN.Perception.suppressed;
    const list = $('log-list');
    if (list._k === SEN.Perception.spoken + ':' + SEN.Perception.suppressed) return;
    list._k = SEN.Perception.spoken + ':' + SEN.Perception.suppressed;
    list.innerHTML = '';
    const start = SEN.Perception.log.slice(0, 40);
    for (const l of start) {
      const div = document.createElement('div');
      div.className = 'logline ' + (l.urgent === 'crit' ? 'crit' : l.urgent === 'warn' ? 'warn' : l.urgent === 'info' ? 'spoken' : '');
      div.innerHTML = `<span class="tag">${l.tag}</span>${l.text}<div class="why">${l.why || ''}</div>`;
      list.appendChild(div);
    }
  }

  /* ---------- memory ---------- */
  function renderMemory() {
    const box = $('mem-objects');
    const drops = SEN.Memory.drops;
    if (box._k === drops.length) return;    // rebuild only when the palace grows
    box._k = drops.length;
    box.innerHTML = '';
    for (const d of drops.slice().reverse()) {
      const row = document.createElement('div');
      row.className = 'mobj';
      row.innerHTML = `<span class="n">${cap(d.obj)}</span><span class="meta"><span class="lbl">${cap(d.place)}</span>${d.t}</span>`;
      box.appendChild(row);
    }
  }
  function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------- pilot ---------- */
  function renderPilot() {
    const st = $('pilot-status');
    const p = SEN.Social.pilot;
    st.classList.toggle('live', p.state === 'live');
    if (p.state === 'connecting') st.textContent = 'CONNECTING… ROUTING TO A TRAINED OPERATOR';
    else if (p.state === 'live') st.textContent = `● LIVE — human pilot on your side · ${p.transcript.length} exchanges`;
    else st.textContent = 'TAP TWICE ANYWHERE IN THE WORLD TO UPLINK A HUMAN PILOT (press D)';
    const t = $('pilot-transcript');
    if (t._k !== p.transcript.length) {
      t._k = p.transcript.length;
      t.innerHTML = '';
      for (const m of p.transcript) {
        const div = document.createElement('div');
        div.className = 'pmsg ' + (m.who === 'pilot' ? 'agent' : 'user');
        div.innerHTML = `<span class="t">${m.who || 'user'}</span>${m.text}`;
        t.appendChild(div);
      }
      t.scrollTop = t.scrollHeight;
    }
  }

  /* ---------- health ---------- */
  function renderHealth(metrics) {
    $('hr-val').textContent = metrics.hr;
    hrBadge.textContent = metrics.hr;
    const spark = SEN.Health.spark();
    const c = $('health-plot');
    if (!c || !c.getContext) return;
    const g = c.getContext('2d');
    if (!c._sized) { c._sized = true; c.width = c.offsetWidth || 320; c.height = c.offsetHeight || 130; }
    g.clearRect(0, 0, c.width, c.height);
    const base = 70, amp = 18;
    g.strokeStyle = 'rgba(55,226,255,.35)'; g.beginPath();
    spark.forEach((v, i) => {
      const x = i * (c.width / 60), y = c.height - (v - base) / amp * 40 - 20;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
    g.strokeStyle = '#37e2ff'; g.lineWidth = 1.5; g.beginPath();
    spark.slice(-40).forEach((v, i) => {
      const x = (spark.length - 40 + i) * (c.width / 60), y = c.height - (v - base) / amp * 40 - 20;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
    $('health-readout').innerHTML = `
      <div class="hr-call"><div class="v">${metrics.hr}</div><div class="k">HEART · rPPG</div></div>
      <div class="hr-call"><div class="v">${metrics.breathe}</div><div class="k">BREATH / MIN</div></div>
      <div class="hr-call"><div class="v">${metrics.dist}m</div><div class="k">WALKED TODAY</div></div>`;
    $('bus-state').textContent = metrics.bus;
    const evt = $('health-events');
    const h = SEN.Health.history.slice(0, 16);
    if (evt._known !== h.length) {
      evt._known = h.length;
      evt.innerHTML = '';
      for (const e of h) {
        const d = document.createElement('div');
        d.className = 'logline ' + (e.urg === 'crit' ? 'crit' : e.urg === 'warn' ? 'warn' : '');
        d.innerHTML = `<span class="tag">${e.type.toUpperCase()}</span>${e.text}`;
        evt.appendChild(d);
      }
    }
  }

  function setHud({ mode, plane }) {
    if (mode) { hudMode.textContent = mode; }
    if (plane) { planeBadge.textContent = plane; planeEl.classList.toggle('dim-mode', plane.includes('ULTRASONIC')); }
  }

  function showPrivacy(on, zone) {
    privacyLayer.classList.toggle('hidden', !on);
    if (on) {
      priv.querySelector('.shield-text').innerHTML = `PRIVACY SHIELD ACTIVE — ${zone.label.toUpperCase()}<br><span>Camera off · Ultrasonic mode · Nothing leaves this room</span>`;
    }
  }

  function toast(text) { SEN.Events.emit('toast', text); }

  return { resize, drawWorld, renderSeebar, hapticFlash, renderLoc, renderVoice, renderLog, renderMemory, renderPilot, renderHealth, setHud, showPrivacy, toast,
           get W(){ return W; }, get H(){ return H; } };
})();