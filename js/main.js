/* Sentinel — Main loop & conductors.
 * Boots the scene, wires input and panels, and runs the live loop: world →
 * sensors → perception → salience → the single line Sentinel actually says.
 */
window.SEN = window.SEN || {};
SEN.Main = (() => {
  const S = () => window.SEN.Scene;
  const P = () => window.SEN.Perception;
  const C = () => window.SEN.Console;
  const keys = {};
  let t = 0, last = performance.now();
  let fireActive = false, fireUntil = 0;
  const carried = { obj: 'keys', name: 'your keys' };
  let lastD = 0;   // for double-tap D
  let lastHint = 0;

  // --- real-world camera + YOLOv8 ---
  let camOn = false;                 // camera stream active?
  let detectorInitiated = false;     // tried to load ONNX model yet?
  let lastDetect = 0;                // frame-throttle timestamp
  const DETECT_INTERVAL = 180;       // ms between YOLO inferences
  const CAM_INPUT = document.createElement('canvas');  // 640×640 detector input
  const CAM_DISPLAY = document.createElement('canvas');// PiP overlay draw target

  /* ---------- bootstrap ---------- */
  function boot() {
    S().reset();
    SEN.Memory.seedPalace();
    SEN.Memory.learnFace('Aisha', 'wife');
    SEN.Memory.learnFace('Meera', 'colleague');
    C().resize();

    wireTabs();
    wireInput();
    wireMemoryInput();
    wireSilentModal();
    wireCamera();
    wireEvents();

    introStory();

    // pre-load onnxruntime-web so the first camera click is fast
    ensureOrt();

    requestAnimationFrame(loop);
  }

  function introStory() {
    setStory(`
      <div class="h1">SENTINEL · THE DARK ROOM SIMULATOR</div>
      <div class="p">A proactive, haptic co-pilot for people who cannot see. This is not a descriptive camera — most of what happens is kept silent.</div>
      <div class="p">Walk with <b>WASD</b>, steer with <b>Q / E</b>. The world runs itself: cars, crowds, a broken escalator. Watch what Sentinel chooses to <b>interrupt</b> — and log in to the <b>Silence Log</b> to see everything it chose not to disturb.</div>
      <div class="p" style="color:var(--dim)">Press <b>1-7</b> for a guided pillar demo. Press <b>D</b> twice for a Remote Pilot.</div>
    `);
  }

  function setStory(html) { document.getElementById('story').innerHTML = html; }

  /* ---------- real camera + YOLOv8 ---------- */
  function ensureOrt() {
    if (window.ort || detectorInitiated || !document.head) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/ort.min.js';
    s.onload = () => {
      if (window.ort) ort.env.wasm.numThreads = navigator.hardwareConcurrency || 2;
    };
    s.onerror = () => console.warn('[SEN] onnxruntime-web failed to load');
    document.head.appendChild(s);
  }

  function wireCamera() {
    document.getElementById('camera-toggle').addEventListener('click', toggleCamera);
    document.getElementById('camera-dismiss').addEventListener('click', () => {
      toggleCamera(false);
    });
  }

  async function toggleCamera(force) {
    const next = force !== undefined ? !!force : !camOn;
    const v = document.getElementById('camera-video');

    if (!next) {
      SEN.Camera.stop();
      camOn = false;
      setHudSensor();
      document.getElementById('camera-toggle').textContent = 'CAMERA';
      document.getElementById('camera-pip').classList.add('hidden');
      voice('Camera off. Simulation only.', 'hint', { who: 'REAL-WORLD CAMERA' });
      return;
    }

    // load the ONNX model on first use
    if (!detectorInitiated) {
      detectorInitiated = true;
      document.getElementById('cv-status').textContent = 'MODEL LOADING…';
      const detStatus = await SEN.Detector.init('yolov8n.onnx');
      if (detStatus !== 'ready') {
        document.getElementById('cv-status').textContent = detStatus === 'no-model'
          ? 'NO MODEL · place yolov8n.onnx in project root'
          : detStatus === 'no-wasm'
            ? 'NO WASM · onnxruntime-web unavailable'
            : 'MODEL ERROR';
        voice('Camera online, but the detection model is missing. Place yolov8n.onnx in the project folder — see the README. Simulation continues without it.', 'hint', { who: 'REAL-WORLD CAMERA' });
        return;
      }
    }

    await SEN.Camera.init(v);   // point Camera at the hidden <video>
    const started = await SEN.Camera.start();
    if (!started) {
      document.getElementById('cv-status').textContent = SEN.Camera.permissionDenied
        ? 'CAMERA DENIED'
        : SEN.Camera.noCamera ? 'NO CAMERA' : 'CAMERA ERROR';
      voice(SEN.Camera.permissionDenied
        ? 'Camera access was denied. Grant permission and try again — until then, simulation only.'
        : 'No camera found on this device. Simulation continues.', 'hint', { who: 'REAL-WORLD CAMERA' });
      return;
    }

    camOn = true;
    document.getElementById('camera-toggle').textContent = 'CAMERA·LIVE';
    document.getElementById('camera-pip').classList.remove('hidden');
    document.getElementById('cv-status').textContent = 'YOLOV8-NANO ACTIVE';
    setHudSensor();
    voice('Camera online. I am watching the real room now — same silence rule applies.', 'hint', { who: 'REAL-WORLD CAMERA' });
  }

  function setHudSensor() {
    const b = document.getElementById('plane-state');
    if (b) b.textContent = camOn ? 'CAMERA+YOLO' : 'CAMERA+ULTRASOUND';
  }

  // snapshot → detect → merge into perception (runReal adds to `detected`)
  function realSense(dt) {
    if (!camOn) return;
    const img = SEN.Camera.snapshot(CAM_INPUT);
    if (!img) return;
    const detections = SEN.Detector.detect(img);
    if (!detections || !detections.length) return;

    const u = S().user;
    P().runReal(detections, u, {});
    drawPip(detections);
  }

  // render detections onto the PiP canvas (visualize what Sentinel "sees")
  function drawPip(dets) {
    const pip = document.getElementById('camera-pip');
    if (pip.classList.contains('hidden')) return;
    const c = CAM_DISPLAY;
    const ctx = c.getContext('2d');
    const v = document.getElementById('camera-video');
    if (!v || !v.videoWidth) return;
    c.width = 300;
    c.height = (v.videoHeight / v.videoWidth) * 300;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const sx = c.width / v.videoWidth, sy = c.height / v.videoHeight;
    for (const d of dets) {
      const [bx, by, bw, bh] = d.bbox;
      ctx.strokeStyle = d.label === 'person' ? '#43f5a8' : d.label === 'car' ? '#ffc24d' : '#37e2ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx * sx, by * sy, bw * sx, bh * sy);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(
        `${d.label} ${Math.round(d.confidence * 100)}%`,
        bx * sx, Math.max(2, by * sy - 4)
      );
    }
    // replace DOM canvas with our drawing
    const holder = document.getElementById('camera-canvas');
    if (holder && holder.parentNode) {
      if (holder.firstChild !== c) {
        holder.innerHTML = '';
        holder.appendChild(c);
      }
    }
  }

  /* ---------- tabs ---------- */
  function wireTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tb => tb.addEventListener('click', () => {
      tabs.forEach(x => x.classList.toggle('active', x === tb));
      document.querySelectorAll('.panel').forEach(p => p.classList.toggle('hidden', p.id !== 'panel-' + tb.dataset.tab));
    }));
  }

  /* ---------- keys ---------- */
  function wireInput() {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
      keys[k] = true;
      handleHotkey(e);
    });
    window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
  }

  function handleHotkey(e) {
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '7') { startDemo(+k); return; }
    switch (k) {
      case 'd': {
        const now = performance.now();
        if (now - lastD < 420) {
          const msg = SEN.Social.doubleTap();
          voice(msg, 'hint', { who: 'REMOTE PILOT' });
          setStory(`<div class="h1">THE REMOTE PILOT</div><div class="p">${msg}</div><div class="p">The agent joins, sees an anonymized (face-blurred) view, and guides you voice-only for a few seconds.</div>`);
        }
        lastD = now;
        break;
      }
      case 'f': triggerFire(true); break;
      case 'm': dropCarried(); break;
      case 'r': {
        const m = SEN.Memory.nextMode();
        const res = SEN.Memory.scan(m);
        voice(res, 'hint', { who: 'SCANNER · ' + m.toUpperCase() });
        setStory(`<div class="h1">SCAN MODE — ${m.toUpperCase()}</div><div class="p">${res}</div>`);
        break;
      }
      case 'c': {
        const msg = SEN.Health.findPhone();
        voice(msg, 'hint', { who: 'FIND MY PHONE' });
        setStory(`<div class="h1">FIND MY PHONE</div><div class="p">${msg}</div>`);
        break;
      }
      case 'v': togglesilent(); break;
      case 'g': {
        const msg = SEN.Social.toggleFocus();
        voice(msg, 'hint', { who: 'CONVERSATION FOCUS' });
        break;
      }
      case 't': {
        const msg = SEN.Health.translate('pharmacy');
        voice(msg, 'hint', { who: 'TRANSLATION' });
        break;
      }
      default: break;
    }
  }

  function dropCarried() {
    const r = SEN.Memory.dropCarried();
    voice(r.spoken, 'hint', { who: 'MEMORY PALACE' });
    setStory(`<div class="h1">MEMORY PALACE</div><div class="p">${r.spoken}</div><div class="p">It's stored as a vector + time. No photo, no cloud. Ask me again later — I'll guide you.</div>`);
    C().renderMemory();
  }

  /* ---------- fire ---------- */
  function triggerFire(on) {
    fireActive = on;
    SEN.Events.emit(on ? 'fire:on' : 'fire:off');
    if (on) fireUntil = t + 26;
    else { fireUntil = 0; SEN.Health.setEvent(null); }
  }

  /* ---------- demo ---------- */
  function startDemo(i) {
    SEN.Demo.start(i);
    C().hapticFlash('front', 'hint');
    const txt = SEN.Demo.brief(i);
    C().setHud({ mode: `DEMO ${i} · ${SEN.Demo.names()[i]}` });
    voice('Standing by. Watch the world — ' + SEN.Demo.names()[i] + '. I stay quiet and step in only when it counts.', 'hint', { who: 'DEMO ' + i });
    setStory(`<div class="h1">DEMO ${i} — ${SEN.Demo.names()[i]}</div><div class="p">${txt}</div>`);
    if (i === 6) { triggerFire(true); setTimeout(() => triggerFire(false), 26000); }
    if (i === 5) setTimeout(() => { voice('Someone is reaching out to you. Notice how I never touch their face.', 'hint', { who: 'SOCIAL' }); }, 9000);
  }

  /* ---------- main loop ---------- */
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    const u = S().user;
    stepUser(u, dt);
    S().tick(dt, t);
    SEN.Demo.update(dt);

    const detected = P().run(S().entities, u, dt, t);

    // real-world YOLO detections merge into the same perception pipeline
    // (throttled — model runs at most every ~180 ms to keep the loop smooth)
    if (camOn && detectorInitiated && now - lastDetect > 180) {
      lastDetect = now;
      realSense(dt);
    }

    // privacy shield geofence
    const zone = SEN.Health.privacyCheck(u);
    C().showPrivacy(!!zone, zone || {});
    if (zone) C().setHud({ plane: 'ULTRASONIC' });
    else C().setHud({ plane: 'CAMERA+ULTRASOUND' });

    // specials from guardian + social + memory whisper + community tag + focus
    const specials = [
      ...SEN.Guardian.special(u, detected),
      ...SEN.Social.special(u, detected),
      senMemoryWhisper(detected),
      communityWhisper(),
    ].filter(Boolean);

    const fire = fireActive || (t < fireUntil);
    const res = P().decide(detected, u, t, { fire, special: specials });
    SEN.Social.pilotUpdate(dt, specials);

    // health + ecosystem
    const metrics = SEN.Health.update(dt, t);

    // output: the ONE line Sentinel says
    if (res.alert && res.alert.msg) {
      speakAlert(res.alert);
    }

    // visuals
    C().renderSeebar(detected);
    C().drawWorld(S().entities, u, t);
    drawMinimap(S().entities, u);
    decayHeat(dt);

    C().renderLog();
    C().renderMemory();
    C().renderPilot();
    C().renderHealth(metrics);
  }

  /* ---- extra whisper modules ---- */
  function senMemoryWhisper(detected) {
    const whisper = SEN.Memory.faceScan(detected);
    return whisper ? { entity: whisper.who.role, side: 'front', dist: 200, urgency: 'info', cue: 'hint',
      keepSilent: Date.now() - (whisper.t || 0) < 0, msg: whisper.msg,
      why: 'opt-in family recognition — stranger analysis is never performed' } : null;
  }
  function communityWhisper() {
    const msg = SEN.Health.communityWhisper(S().user);
    return msg ? { entity: 'community', side: 'front', dist: 250, urgency: 'info', cue: 'hint', keepSilent: false, msg,
      why: 'anonymous community accessibility map' } : null;
  }

  function speakAlert(alert) {
    C().renderVoice(alert);
    const cls = alert.cue === 'crit' ? 'fire-side' : alert.cue === 'warn' ? 'warn' : 'hint';
    C().hapticFlash(alert.side, cls);
    SEN.Audio.thump(alert.cue === 'crit' ? 160 : 220, 0.11, 0.8, alert.side === 'left' ? -0.9 : alert.side === 'right' ? 0.9 : 0);
    if (alert.cue !== 'hint' || alert.urgency === 'info') {
      if (nowReasonable()) SEN.Audio.speak(alert.msg);
    }
    if (alert.chime !== undefined) SEN.Audio.chime(alert.chime, 660, 0.35);
    if (alert.vibrate) SEN.Audio.thump(300, 0.05, 0.5, 0);
  }

  function nowReasonable() { return true; }

  function voice(text, cue, meta = {}) {
    C().renderVoice({ msg: text, cue: cue || 'hint', side: 'front' }, meta);
    SEN.Audio.speak(text);
  }

  function decayHeat(dt) {
    const h = P().heat;
    for (const k in h) if (h[k] > 0) h[k] = Math.max(0, h[k] - dt * 3);
  }

  /* ---------- user movement ---------- */
  function stepUser(u, dt) {
    const sp = 190;
    // Q / E and left/right arrows turn; W/S + up/down move along heading
    if (keys['q'] || keys['arrowleft']) u.heading -= 2.6 * dt;
    if (keys['e'] || keys['arrowright']) u.heading += 2.6 * dt;

    let fwd = 0;
    if (keys['w'] || keys['arrowup']) fwd += 1;
    if (keys['s'] || keys['arrowdown']) fwd -= 1;

    u.x += Math.cos(u.heading) * fwd * sp * dt;
    u.y += Math.sin(u.heading) * fwd * sp * dt;
    u.x = Math.max(30, Math.min(SEN.WORLD.w - 30, u.x));
    u.y = Math.max(30, Math.min(SEN.WORLD.h - 30, u.y));
  }

  /* ---------- minimap ---------- */
  function drawMinimap(ents, u) {
    const mini = document.getElementById('minimap');
    const m = mini.getContext('2d');
    const mw = mini.width, mh = mini.height;
    m.clearRect(0, 0, mw, mh);
    const sx = mw / SEN.WORLD.w, sy = mh / SEN.WORLD.h;
    m.strokeStyle = 'rgba(255,255,255,.04)'; m.fillStyle = 'rgba(8,14,24,.9)';
    m.fillRect(0, 0, mw, mh);
    for (const e of ents) {
      if (e.isUser) continue;
      m.globalAlpha = 0.7;
      m.fillStyle = e.hazard === 'crit' ? '#ff4d5e' : e.hazard === 'warn' ? '#ffc24d' : '#37e2ff';
      m.fillRect(e.x * sx - 1.5, e.y * sy - 1.5, 3, 3);
    }
    m.globalAlpha = 1;
    m.fillStyle = '#ffffff';
    m.fillRect(u.x * sx - 2.5, u.y * sy - 2.5, 5, 5);
  }

  /* ---------- memory input ---------- */
  function wireMemoryInput() {
    const ask = () => {
      const q = document.getElementById('mem-input').value.trim() || 'where are my keys';
      const a = SEN.Memory.ask(q);
      const el = document.getElementById('mem-answer');
      el.classList.add('show'); el.textContent = '❧  ' + a;
      voice(a, 'hint', { who: 'MEMORY PALACE' });
    };
    document.getElementById('mem-ask').addEventListener('click', ask);
    document.getElementById('mem-input').addEventListener('keydown', e => { if (e.key === 'Enter') ask(); });
  }

  /* ---------- silent modal ---------- */
  function togglesilent() {
    const m = document.getElementById('silent-modal');
    m.classList.toggle('hidden');
    if (!m.classList.contains('hidden')) document.getElementById('silent-input').focus();
  }

  function wireSilentModal() {
    document.getElementById('silent-speak').addEventListener('click', () => {
      const text = document.getElementById('silent-input').value;
      if (!text) return;
      SEN.Audio.speak(text);
      voice('Spoken for you.', 'green', { who: 'SILENT MODE' });
      document.getElementById('silent-modal').classList.add('hidden');
    });
  }

  /* ---------- event wiring ---------- */
  function wireEvents() {
    SEN.Events.on('ask', q => {
      const a = SEN.Memory.ask(q || 'where are my keys');
      const el = document.getElementById('mem-answer');
      el.classList.add('show'); el.textContent = '❧  ' + a;
    });
    SEN.Events.on('demo:start', ({ i }) => { C().setHud({ mode: `DEMO ${i} · RUNNING` }); });
    SEN.Events.on('fire:on', () => {
      // Sentinel texts GPS to a saved contact (simulated external action)
      const gps = `${(S().user.x / 15).toFixed(4)}, ${(S().user.y / 15).toFixed(4)}`;
      voice(`Emergency GPS: ${gps} — texted to your contact. Keep moving to the exit, I am with you.`, 'crit', { who: 'SMS · SAVED CONTACT' });
      C().renderLog();
    });
    SEN.Events.on('toast', txt => voice(txt, 'hint', {}));
  }

  function stamp() { return new Date().toLocaleTimeString(); }

  return { boot };
})();
SEN.Main.boot();