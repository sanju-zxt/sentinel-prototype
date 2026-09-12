/* Sentinel — Phase 7: Haptic hardware integration (the "belt").
 *
 * Real haptics, in order of what the device can do:
 *   1. Vibration API  — actual motor on Android phones / bracelets
 *   2. Audio-spatial  — the Web Audio pan already wired into the pipeline
 *   3. Belt viz       — the on-screen ring so the demo audience SEES the pulse
 *
 * Direction is encoded the NaviBelt way (this is what got insurers to pay for
 * haptics): left/right/front/back tap patterns plus an urgency suffix. Every
 * alert Sentinel emits routes through SEN.Haven.pulse(), so swapping the
 * physical motor later touches exactly one file.
 */
window.SEN = window.SEN || {};

SEN.Haven = (() => {
  const PATTERNS = {
    left:  [70, 0, 40],
    right: [40, 0, 70],
    front: [90],
    back:  [30, 30, 30, 30, 30],
  };
  const URGENCY = { crit: [200, 60, 200], warn: [110], hint: [55], green: [45, 45, 45] };

  let mobile = null;             // probed once
  let pulses = 0;
  const active = { left: 0, right: 0, front: 0, back: 0 };

  function probe() {
    if (mobile !== null) return mobile;
    mobile = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    return mobile;
  }

  function vibrate(pattern) {
    if (!probe()) return;
    try { navigator.vibrate(pattern); } catch (e) { /* audio fallback handles it */ }
  }

  /* ---- one haptic event: belt viz + vibrate + DOM flash ---- */
  function pulse(side, cls) {
    const dir = active[side] !== undefined ? side : 'front';
    active[dir] = Math.min(1, active[dir] + 0.65);
    pulses++;
    const base = PATTERNS[dir] || PATTERNS.front;
    const urg = URGENCY[cls] || URGENCY.hint;
    vibrate(base.concat(urg));
    // the audience-facing flash + audio pan live in the console renderer
    if (typeof SEN.Console !== 'undefined' && SEN.Console.hapticFlash) {
      SEN.Console.hapticFlash(side, cls);
    }
  }

  function decay(dt) {
    for (const k in active) active[k] = Math.max(0, active[k] - dt * 0.7);
  }

  /* ---- optional Web Bluetooth motor pairing (feature-detected) ---- */
  function bluetooth() {
    const bt = typeof navigator !== 'undefined' && navigator.bluetooth && navigator.bluetooth.requestDevice;
    if (!bt) {
      return 'No Web Bluetooth here. Using vibration + audio-spatial haptics — the motor streams the same pattern when bonded.';
    }
    try {
      navigator.bluetooth.requestDevice({ filters: [{ services: ['0000180a-0000-1000-8000-00805f9b34fb'] }] })
        .then(() => { if (SEN.Events) SEN.Events.emit('toast', 'Haptic motor paired. Belt live.'); })
        .catch(() => {});
    } catch (e) { /* unsupported */ }
    return 'Looking for a haptic motor to bond…';
  }

  function status() {
    return { mobile: probe(), pulses, belt: Object.assign({}, active) };
  }

  return { pulse, decay, bluetooth, status, probe, get pulses(){ return pulses; } };
})();