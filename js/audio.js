/* Sentinel — Audio engine
 * Real haptics (vibration motor) isn't possible in-browser, so we do the next
 * best thing: actual audio thumps + spatial panning, and the Web Speech API
 * as the calm Guard voice. On hardware this maps 1:1 to the haptic motor +
 * bone-conduction headphones.
 */
window.SEN = window.SEN || {};
window.SentAudio = (() => {
  let ctx = null, master = null, muted = false;
  let voiceEnabled = true;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function thump(freq = 220, dur = 0.09, vol = 0.7, pan = 0) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    const p = c.createStereoPanner();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.55, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    p.pan.value = Math.max(-1, Math.min(1, pan));
    o.connect(g).connect(p).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function chime(pan = 0, freq = 660, dur = 0.3) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    const p = c.createStereoPanner();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.setValueAtTime(freq * 1.5, t + 0.001);
    o.frequency.exponentialRampToValueAtTime(freq, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    p.pan.value = pan;
    o.connect(g).connect(p).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function tone(freq, dur = 0.5, vol = 0.4, seq = null, pan = 0) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    const p = c.createStereoPanner();
    o.type = 'triangle';
    if (seq) { // frequency sequence bleeps, e.g. find-my-phone
      let tt = t;
      for (const f of seq) {
        o.frequency.setValueAtTime(f, tt);
        tt += dur;
      }
      o.stop(t + seq.length * dur);
    } else {
      o.frequency.setValueAtTime(freq, t);
      o.stop(t + dur + 0.02);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    p.pan.value = pan;
    o.connect(g).connect(p).connect(master);
    o.start(t);
  }

  function speak(text, opts = {}) {
    if (!voiceEnabled) return null;
    const synth = window.speechSynthesis;
    if (!synth) return null;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate || 1;
    u.pitch = opts.pitch || 0.9;
    u.volume = 1;
    const voices = synth.getVoices();
    const calm = voices.find(v => /female|zira|samantha|google UK/i.test(v.name));
    if (calm) u.voice = calm;
    synth.speak(u);
    return u;
  }

  function stopVoice() { if (window.speechSynthesis) window.speechSynthesis.cancel(); }

  const api = { ensure, thump, chime, tone, speak, stopVoice,
           get muted(){return muted}, set muted(v){muted=v},
           get voiceEnabled(){return voiceEnabled}, set voiceEnabled(v){voiceEnabled=v} };
  window.SEN.Audio = api;   // pillars call SEN.Audio.*
  return api;
})();