/* Sentinel — Voice input (Web Speech Recognition).
 *
 * Ask Sentinel directly: "where are my keys", "demo five". Zero dependencies,
 * on-device, and it degrades to a silent no-op in browsers without
 * SpeechRecognition — the keyboard route always still works.
 */
window.SEN = window.SEN || {};

SEN.Voice = (() => {
  let rec = null;
  let listening = false;
  let button = null;
  let onResult = null;

  const REC = (typeof window !== 'undefined')
    && (window.SpeechRecognition || window.webkitSpeechRecognition);

  function available() { return !!REC; }

  function init(el, cb) {
    button = el;
    onResult = cb;
    if (!REC) {
      if (button) button.title = 'Voice input unsupported in this browser';
      return;
    }
    if (button) button.addEventListener('click', toggle);
  }

  function start() {
    if (!REC || listening) return;
    try {
      rec = new REC();
      rec.lang = 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        const t = String(e.results && e.results[0] && e.results[0][0] && e.results[0][0].transcript || '').trim();
        stop(true);
        if (t && onResult) onResult(t);
      };
      rec.onerror = () => set(false);
      rec.onend = () => set(false);
      rec.start();
      set(true);
    } catch (e) {
      set(false);
    }
  }

  function stop(silent) {
    if (rec) { try { rec.stop(); } catch (e) { /* already ended */ } }
    if (!silent) set(false);
  }

  function toggle() { return listening ? stop() : start(); }

  function set(v) {
    listening = v;
    if (button) button.textContent = v ? 'LISTENING…' : '🎙️ VOICE';
  }

  return {
    init, start, stop, toggle, available,
    get listening() { return listening; },
  };
})();