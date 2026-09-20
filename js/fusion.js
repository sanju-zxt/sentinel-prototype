/* Sentinel — Phase 8: Real-world sensor fusion (GPS, compass, accelerometer).
 *
 * When a phone is available, three sensors upgrade the experience for free:
 *   • Geolocation — real GPS position (graceful drop if denied)
 *   • DeviceOrientation — compass heading that works even when the camera is off
 *   • DeviceMotion — step counter from accelerometer peaks
 *
 * In the simulator, these don't exist — so the HUD shows a live readout from
 * odometry and sim heading instead.  The two modes share one interface: the
 * display shows what the best available source is, and the "fusion lost"
 * finding fires only when a real GPS was present and then vanished.
 */
window.SEN = window.SEN || {};

SEN.Fusion = (() => {
  const S = () => window.SEN.Scene;
  const state = {
    booted: false,
    gps: false, gpsAcc: 0,
    lat: null, lon: null,
    originLat: null, originLon: null,
    compassDeg: null,
    headingDeg: 0,
    steps: 0,
    walkedM: 0,
    wasGps: false,
    lostAt: 0,
    gpsLostShown: false,
  };
  let lastStepMs = 0;
  let prevX = null, prevY = null;

  /* ---- boot: attach device sensors (no-op in desktop / headless) ---- */
  function init() {
    if (state.booted) return;
    state.booted = true;

    // orientation (compass)
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      try {
        window.addEventListener('deviceorientation', function (ev) {
          if (ev.webkitCompassHeading != null) { state.compassDeg = ev.webkitCompassHeading; return; }
          if (ev.absolute && ev.alpha != null) { state.compassDeg = 360 - ev.alpha; }
        }, { passive: true });
      } catch (e) { /* orientation unsupported */ }
    }

    // motion / step counter
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      try {
        window.addEventListener('devicemotion', function (ev) {
          const a = ev.acceleration || ev.accelerationIncludingGravity;
          if (!a) return;
          const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
          const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
          if (mag > 12 && now - lastStepMs > 480) { state.steps++; lastStepMs = now; }
        }, { passive: true });
      } catch (e) { /* motion unsupported */ }
    }

    // GPS
    if (typeof navigator !== 'undefined' && navigator.geolocation && typeof navigator.geolocation.watchPosition === 'function') {
      try {
        navigator.geolocation.watchPosition(function (pos) {
          const c = pos.coords || {};
          state.lat = c.latitude; state.lon = c.longitude;
          state.gpsAcc = c.accuracy || 0;
          state.gps = true;
          if (state.originLat == null) { state.originLat = c.latitude; state.originLon = c.longitude; }
        }, function () { state.gps = false; }, { enableHighAccuracy: true, maximumAge: 5000 });
      } catch (e) { state.gps = false; }
    }
  }

  /* ---- called every frame ---- */
  function update(dt, u) {
    if (!state.booted) init();
    if (prevX == null) { prevX = u.x; prevY = u.y; }
    const dx = u.x - prevX, dy = u.y - prevY;
    const movedM = Math.hypot(dx, dy) / 15;      // 15 px ≈ 1 m
    state.walkedM += movedM;
    // approximate step from displacement (every 0.75 m)
    if (state.walkedM > 0.75) { state.walkedM = 0; state.steps++; }
    state.headingDeg = Math.round(((360 - u.heading * 180 / Math.PI) % 360 + 360) % 360);
    prevX = u.x; prevY = u.y;
  }

  /* ---- salience: GPS-drop finding (only for real mobile) ---- */
  function special(user, nowMs) {
    if (state.gps) { state.wasGps = true; state.gpsLostShown = false; }
    if (state.wasGps && !state.gps && !state.gpsLostShown) {
      state.gpsLostShown = true;
      state.lostAt = nowMs;
      return {
        entity: 'sensor fusion', side: 'front', dist: 0, urgency: 'info', cue: 'hint', keepSilent: false,
        msg: 'GPS lost — switching to camera odometry + place memory. Position confidence is dropping; I will re-anchor at the next known landmark.',
        why: 'GNSS dropout; fusion switched to dead-reckoning',
      };
    }
    return null;
  }

  function status() {
    return {
      gps: state.gps, gpsAcc: Math.round(state.gpsAcc),
      headingDeg: state.compassDeg != null ? Math.round(state.compassDeg) : state.headingDeg,
      headingSrc: state.compassDeg != null ? 'COMPASS' : 'ODOM+SIM',
      steps: state.steps, lost: state.wasGps && !state.gps,
    };
  }

  return { init, update, special, status, get gps(){ return state.gps; }, get steps(){ return state.steps; } };
})();