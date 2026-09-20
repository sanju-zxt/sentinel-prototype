/* Sentinel — Camera stream manager
 * Wraps getUserMedia for rear-facing camera access.
 * Provides frame snapshots for the YOLOv8 detector.
 */
window.SEN = window.SEN || {};
window.SEN.Camera = (() => {
  let stream = null;
  let videoEl = null;
  let enabled = false;
  let permissionDenied = false;
  let noCamera = false;

  async function init(video) {
    videoEl = video;
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('muted', '');
    videoEl.muted = true;
  }

  async function start() {
    if (enabled) return true;
    if (permissionDenied || noCamera) return false;
    if (!videoEl) return false;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      videoEl.srcObject = stream;
      await videoEl.play();
      enabled = true;
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        permissionDenied = true;
        console.warn('[SEN.Camera] Permission denied:', err.message);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        noCamera = true;
        console.warn('[SEN.Camera] No camera found:', err.message);
      } else {
        console.warn('[SEN.Camera] Error:', err.name, err.message);
      }
      enabled = false;
      return false;
    }
  }

  function stop() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
    }
    enabled = false;
  }

  function toggle() {
    if (enabled) {
      stop();
      return false;
    } else {
      return start();
    }
  }

  /**
   * Draw current video frame to an offscreen canvas (640×640).
   * Returns ImageData or null if camera is off / video not ready.
   */
  function snapshot(canvas) {
    if (!enabled || !videoEl || videoEl.readyState < 2) return null;
    const w = 640, h = 640;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    // Center-crop the video to square (cover fit)
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    const scale = Math.max(w / vw, h / vh);
    const sw = Math.min(Math.round(w / scale), vw);   // source crop width
    const sh = Math.min(Math.round(h / scale), vh);   // source crop height
    const sx = (vw - sw) / 2;                         // centered crop offset
    const sy = (vh - sh) / 2;
    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }

  const api = {
    init, start, stop, toggle, snapshot,
    get enabled() { return enabled; },
    get permissionDenied() { return permissionDenied; },
    get noCamera() { return noCamera; }
  };
  window.SEN.Camera = api;
  return api;
})();
