/* Sentinel — MiDaS v3.0-small monocular depth estimator
 * Runs entirely in-browser via onnxruntime-web (WASM backend).
 * Expects midas.onnx (MiDaS v3.0 small, 384×384) in the project root.
 *
 * Gives Sentinel REAL per-pixel distance instead of guessing from YOLO box
 * height. The depth map is fused with YOLO bboxes in main.js:
 *   depthAt(box) → median inverse-depth inside the box → meters via a
 *   per-class anchor (the bbox-height heuristic becomes the scale reference).
 *
 * Usage:
 *   await SEN.Depth.init('midas.onnx');
 *   const dists = SEN.Depth.measure(imageData, detections); // Array<meters|null>
 */
window.SEN = window.SEN || {};
window.SEN.Depth = (() => {
  let session = null;
  let status = 'idle'; // idle | loading | ready | no-model | no-wasm | error

  const INPUT = 384;                 // MiDaS v3.0-small native input
  let depth = null;                  // Float32Array upsampled to 640×640 (last run; larger = farther)
  let lastKey = 0;                   // frame identity, so we never re-render stale maps

  const MEAN = [0.485, 0.456, 0.406];
  const STD  = [0.229, 0.224, 0.225];

  // metric-anchor constants — MUST match perception.js runReal() so the
  // apparent-size heuristic and this depth scale speak the same units.
  const FOV = 62;                    // horizontal field of view (deg)
  const FOCAL = (640 / 2) / Math.tan((FOV * Math.PI) / 360);
  function trueSizeOf(label) {
    return label === 'person' ? 1.7 : label === 'car' ? 1.8 : label === 'cell phone' ? 0.15 : 0.6;
  }

  async function init(modelUrl = 'midas.onnx') {
    status = 'loading';
    if (typeof ort === 'undefined') {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');
      } catch (e) {
        status = 'no-wasm';
        console.warn('[SEN.Depth] onnxruntime-web not available:', e.message);
        return status;
      }
    }
    if (typeof ort !== 'undefined') {
      ort.env.wasm.numThreads = navigator.hardwareConcurrency || 2;
    } else {
      status = 'no-wasm';
      return status;
    }

    try {
      const resp = await fetch(modelUrl, { method: 'HEAD' });
      if (!resp.ok) {
        status = 'no-model';
        console.warn('[SEN.Depth] Model not found at', modelUrl);
        return status;
      }
    } catch (e) {
      status = 'no-model';
      console.warn('[SEN.Depth] Cannot fetch model:', e.message);
      return status;
    }

    try {
      session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });
      status = 'ready';
      console.log('[SEN.Depth] MiDaS loaded. Input:', session.inputNames, 'Output:', session.outputNames);
    } catch (e) {
      status = 'error';
      console.error('[SEN.Depth] Model load failed:', e.message);
    }
    return status;
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /**
   * Preprocess 640×640 ImageData to MiDaS input [1, 3, 384, 384].
   * Center-crop into the model's square aspect, then ImageNet-style
   * normalize: (x/255 − mean) / std. RGB order, CHW layout.
   * Returns { tensor, srcRect } where srcRect is the 640-space crop so the
   * caller can map box coordinates back onto image space afterwards.
   */
  function preprocess(imageData) {
    const { data, width: ow, height: oh } = imageData;
    // source crop: largest centered square of the frame → scale to INPUT
    const side = Math.min(ow, oh);
    const sx0 = Math.floor((ow - side) / 2);
    const sy0 = Math.floor((oh - side) / 2);
    const scale = INPUT / side;

    const tensor = new Float32Array(1 * 3 * INPUT * INPUT);
    for (let y = 0; y < INPUT; y++) {
      const srcY = sy0 + Math.min(side - 1, Math.floor(y / scale));
      for (let x = 0; x < INPUT; x++) {
        const srcX = sx0 + Math.min(side - 1, Math.floor(x / scale));
        const i = (srcY * ow + srcX) * 4;
        const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
        tensor[y * INPUT + x]                              = (r - MEAN[0]) / STD[0];
        tensor[INPUT * INPUT + y * INPUT + x]              = (g - MEAN[1]) / STD[1];
        tensor[2 * INPUT * INPUT + y * INPUT + x]          = (b - MEAN[2]) / STD[2];
      }
    }
    return { tensor: new ort.Tensor('float32', tensor, [1, 3, INPUT, INPUT]), sx0, sy0, side };
  }

  /**
   * Bilinear-upsample a H×W depth map into a W×H map (scale factors given).
   */
  function upsample(map, ih, iw, oh, ow) {
    const out = new Float32Array(oh * ow);
    const sx = iw / ow, sy = ih / oh;
    for (let y = 0; y < oh; y++) {
      const fy = Math.min(Math.max((y + 0.5) * sy - 0.5, 0), ih - 1);
      const y0 = Math.floor(fy), y1 = Math.min(y0 + 1, ih - 1);
      const wy = fy - y0;
      for (let x = 0; x < ow; x++) {
        const fx = Math.min(Math.max((x + 0.5) * sx - 0.5, 0), iw - 1);
        const x0 = Math.floor(fx), x1 = Math.min(x0 + 1, iw - 1);
        const wx = fx - x0;
        const v00 = map[y0 * iw + x0], v01 = map[y0 * iw + x1];
        const v10 = map[y1 * iw + x0], v11 = map[y1 * iw + x1];
        const top = v00 + (v01 - v00) * wx;
        const bot = v10 + (v11 - v10) * wx;
        out[y * ow + x] = top + (bot - top) * wy;
      }
    }
    return out;
  }

  /** Run inference on ImageData; returns true if a fresh depth map was produced. */
  async function run(imageData) {
    if (status !== 'ready' || !session || !imageData) return false;
    try {
      const { tensor, sx0, sy0, side } = preprocess(imageData);
      const res = await session.run({ [session.inputNames[0]]: tensor });
      const out = res[session.outputNames[0]];
      const odims = out.dims;                // e.g. [1, 384, 384]
      const ih = odims[odims.length - 2] || INPUT;
      const iw = odims[odims.length - 1] || INPUT;
      // MiDaS outputs inverted relative depth: large → near. Invert to
      // "closer = smaller depth" (like a real range sensor) for intuition.
      const coord = new Float32Array(ih * iw);
      const raw = out.data;
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < coord.length; i++) {
        const v = 1.0 / (raw[i] + 1e-5);     // invert disparity → pseudo-range
        coord[i] = v;
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
      // normalize to [0,1] so the anchor math in measure() is scale-agnostic
      const span = hi - lo || 1;
      for (let i = 0; i < coord.length; i++) coord[i] = (coord[i] - lo) / span;

      // upsample normalized pseudo-range to the 640×640 frame
      depth = upsample(coord, ih, iw, 640, 640);
      lastKey = (lastKey + 1) >>> 0;
      return true;
    } catch (e) {
      console.error('[SEN.Depth] inference error:', e.message);
      return false;
    }
  }

  /**
   * Median pseudo-range inside a bbox (640-space coords).
   * Returns value in [0,1] or null if no map / empty box.
   */
  function boxDepth(bbox) {
    if (!depth) return null;
    const [bx, by, bw, bh] = bbox;
    const x0 = Math.max(0, Math.floor(bx)), x1 = Math.min(639, Math.ceil(bx + bw));
    const y0 = Math.max(0, Math.floor(by)), y1 = Math.min(639, Math.ceil(by + bh));
    if (x1 <= x0 || y1 <= y0) return null;
    const vals = [];
    for (let y = y0; y < y1; y++) {
      const row = y * 640;
      for (let x = x0; x < x1; x++) vals.push(depth[row + x]);
    }
    if (!vals.length) return null;
    vals.sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)];
  }

  /**
   * Measure real-world distances (meters) for each detection.
   *
   * MiDaS relative depth has the right SHAPE but an arbitrary scale, so every
   * frame we anchor it to one metric reference. The most trustworthy reference
   * available is the bbox-height heuristic on the biggest/highest-confidence
   * object — the same formula perception.js falls back to. That gives a single
   * per-frame scale (heuristicMeters / pseudoRangeAtAnchor) applied to every
   * box. Result: real meters for every detection, clamped to [0.3 m, 12 m].
   */
  async function measure(imageData, detections) {
    if (!detections || !detections.length) return [];
    await run(imageData);
    if (!depth) return detections.map(() => null);

    // pick the anchor: highest confidence × largest area = most reliable box
    let anchor = null, anchorScore = -1;
    for (const d of detections) {
      const score = (d.confidence || 0) * ((d.bbox[2] * d.bbox[3]) || 0);
      if (score > anchorScore) { anchorScore = score; anchor = d; }
    }

    let scale = null;   // pseudoRange units → meters, per frame
    if (anchor) {
      const [, , bw, bh] = anchor.bbox;
      const hMeters = (trueSizeOf(anchor.label) * FOCAL) / (bh || 1);   // meters
      const aDepth = boxDepth(anchor.bbox) || 0.05;
      scale = hMeters / Math.max(aDepth, 0.05);
    }

    return detections.map(d => {
      if (scale == null) return null;
      const bd = boxDepth(d.bbox);
      if (bd == null) return null;
      const m = bd * scale;
      return Math.min(Math.max(m, 0.3), 12);
    });
  }

  /** Expose normalized pseudo-range map (for the PiP heatmap overlay). */
  function map() { return depth; }

  return {
    init, measure, boxDepth, map,
    get status() { return status; },
    get ready() { return status === 'ready'; }
  };
})();