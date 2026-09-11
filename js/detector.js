/* Sentinel — YOLOv8-nano ONNX object detector
 * Runs entirely in-browser via onnxruntime-web (WASM backend).
 * Expects yolov8n.onnx in the project root.
 *
 * Usage:
 *   await SEN.Detector.init('yolov8n.onnx');
 *   const detections = SEN.Detector.detect(imageData);
 */
window.SEN = window.SEN || {};
window.SEN.Detector = (() => {
  let session = null;
  let status = 'idle'; // idle | loading | ready | no-model | no-wasm | error
  let onnxReady = false;

  const MODEL_SIZE = 640;
  const CONF_THRESHOLD = 0.25;
  const IOU_THRESHOLD = 0.45;

  // COCO 80-class labels
  const LABELS = [
    'person','bicycle','car','motorcycle','airplane','bus','train','truck',
    'boat','traffic light','fire hydrant','stop sign','parking meter','bench',
    'bird','cat','dog','horse','sheep','cow','elephant','bear','zebra',
    'giraffe','backpack','umbrella','handbag','tie','suitcase','frisbee',
    'skis','snowboard','sports ball','kite','baseball bat','baseball glove',
    'skateboard','surfboard','tennis racket','bottle','wine glass','cup',
    'fork','knife','spoon','bowl','banana','apple','sandwich','orange',
    'broccoli','carrot','hot dog','pizza','donut','cake','chair','couch',
    'potted plant','bed','dining table','toilet','tv','laptop','mouse',
    'remote','keyboard','cell phone','microwave','oven','toaster','sink',
    'refrigerator','book','clock','vase','scissors','teddy bear',
    'hair drier','toothbrush'
  ];

  // Map YOLO classes to Sentinel entity types
  const CLASS_MAP = {
    person:          'pedestrian',
    car:             'car',
    bicycle:         'cyclist',
    motorcycle:      'cyclist',
    bus:             'car',
    truck:           'car',
    'traffic light': 'trafficlight',
    'stop sign':     'sign',
    bench:           'bench',
    'cell phone':    'poi',
    'potted plant':  'obstacle',
    chair:           'obstacle',
    couch:           'obstacle',
    'dining table':  'obstacle',
    'fire hydrant':  'sign'
  };

  async function init(modelUrl = 'yolov8n.onnx') {
    status = 'loading';

    // Check if onnxruntime-web is available
    if (typeof ort === 'undefined') {
      // Try loading from CDN
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');
      } catch (e) {
        status = 'no-wasm';
        console.warn('[SEN.Detector] onnxruntime-web not available:', e.message);
        return status;
      }
    }

    // Configure WASM backend
    if (typeof ort !== 'undefined') {
      ort.env.wasm.numThreads = navigator.hardwareConcurrency || 2;
      onnxReady = true;
    }

    if (!onnxReady) {
      status = 'no-wasm';
      return status;
    }

    // Check if model file exists
    try {
      const resp = await fetch(modelUrl, { method: 'HEAD' });
      if (!resp.ok) {
        status = 'no-model';
        console.warn('[SEN.Detector] Model not found at', modelUrl);
        return status;
      }
    } catch (e) {
      status = 'no-model';
      console.warn('[SEN.Detector] Cannot fetch model:', e.message);
      return status;
    }

    // Load model
    try {
      session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });
      status = 'ready';
      console.log('[SEN.Detector] Model loaded. Input:', session.inputNames, 'Output:', session.outputNames);
    } catch (e) {
      status = 'error';
      console.error('[SEN.Detector] Model load failed:', e.message);
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
   * Preprocess ImageData to YOLOv8 input tensor [1, 3, 640, 640].
   * Normalizes to [0,1], HWC→CHW layout.
   */
  function preprocess(imageData) {
    const { data, width: origW, height: origH } = imageData;
    const size = MODEL_SIZE;
    const tensor = new Float32Array(1 * 3 * size * size);

    // Resize with nearest-neighbor (fast) and normalize
    const scaleX = origW / size;
    const scaleY = origH / size;

    for (let y = 0; y < size; y++) {
      const srcY = Math.min(Math.floor(y * scaleY), origH - 1);
      for (let x = 0; x < size; x++) {
        const srcX = Math.min(Math.floor(x * scaleX), origW - 1);
        const srcIdx = (srcY * origW + srcX) * 4;
        // CHW layout, BGR (YOLO expects BGR)
        tensor[0 * size * size + y * size + x] = data[srcIdx + 2] / 255.0;     // R→B
        tensor[1 * size * size + y * size + x] = data[srcIdx + 1] / 255.0;     // G→G
        tensor[2 * size * size + y * size + x] = data[srcIdx] / 255.0;         // B→R
      }
    }

    return new ort.Tensor('float32', tensor, [1, 3, size, size]);
  }

  /**
   * Post-process raw output tensor [1, 84, 8400] into detections.
   * Transposes to [8400, 84], extracts bboxes + scores, applies NMS.
   */
  function postprocess(outputTensor, origW, origH) {
    const data = outputTensor.data;   // Float32Array
    const dims = outputTensor.dims;   // [1, 84, 8400]
    const numDetections = dims[2];    // 8400
    const numClasses = dims[1] - 4;   // 80

    // Transpose to [8400, 84]: each row = [cx, cy, w, h, score0, score1, ..., score79]
    const rows = new Array(numDetections);
    for (let i = 0; i < numDetections; i++) {
      const row = new Float32Array(84);
      for (let j = 0; j < 84; j++) {
        row[j] = data[j * numDetections + i];
      }
      rows[i] = row;
    }

    // Filter by confidence, extract best class
    const candidates = [];
    for (let i = 0; i < numDetections; i++) {
      const row = rows[i];
      let maxScore = 0;
      let maxClass = 0;
      for (let c = 0; c < numClasses; c++) {
        if (row[4 + c] > maxScore) {
          maxScore = row[4 + c];
          maxClass = c;
        }
      }
      if (maxScore < CONF_THRESHOLD) continue;

      // Convert from center format to corner format
      const cx = row[0], cy = row[1], w = row[2], h = row[3];
      const x1 = (cx - w / 2) / MODEL_SIZE * origW;
      const y1 = (cy - h / 2) / MODEL_SIZE * origH;
      const x2 = (cx + w / 2) / MODEL_SIZE * origW;
      const y2 = (cy + h / 2) / MODEL_SIZE * origH;

      candidates.push({
        x1, y1, x2, y2,
        score: maxScore,
        classId: maxClass,
        label: LABELS[maxClass] || `class_${maxClass}`
      });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Non-Maximum Suppression
    return nms(candidates);
  }

  /**
   * Greedy NMS — IoU threshold based filtering.
   */
  function nms(boxes) {
    const keep = [];
    const suppressed = new Set();

    for (let i = 0; i < boxes.length; i++) {
      if (suppressed.has(i)) continue;
      keep.push(boxes[i]);
      for (let j = i + 1; j < boxes.length; j++) {
        if (suppressed.has(j)) continue;
        if (boxes[i].classId !== boxes[j].classId) continue;
        if (iou(boxes[i], boxes[j]) > IOU_THRESHOLD) {
          suppressed.add(j);
        }
      }
    }

    return keep.map(b => ({
      class: b.classId,
      label: b.label,
      confidence: Math.round(b.score * 100) / 100,
      bbox: [
        Math.round(b.x1),
        Math.round(b.y1),
        Math.round(b.x2 - b.x1),
        Math.round(b.y2 - b.y1)
      ]
    }));
  }

  function iou(a, b) {
    const ix1 = Math.max(a.x1, b.x1);
    const iy1 = Math.max(a.y1, b.y1);
    const ix2 = Math.min(a.x2, b.x2);
    const iy2 = Math.min(a.y2, b.y2);
    const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
    const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
    const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
    return inter / (areaA + areaB - inter + 1e-6);
  }

  /**
   * Run full detection pipeline on ImageData.
   * Returns Array<{ class, label, confidence, bbox: [x, y, w, h] }>
   */
  function detect(imageData) {
    if (status !== 'ready' || !session) return [];
    if (!imageData) return [];

    try {
      const tensor = preprocess(imageData);
      const inputName = session.inputNames[0];
      const results = session.run({ [inputName]: tensor });
      const outputName = session.outputNames[0];
      const output = results[outputName];
      return postprocess(output, imageData.width, imageData.height);
    } catch (e) {
      console.error('[SEN.Detector] Inference error:', e.message);
      return [];
    }
  }

  const api = {
    init, detect, CLASS_MAP, LABELS,
    get status() { return status; },
    get ready() { return status === 'ready'; }
  };
  window.SEN.Detector = api;
  return api;
})();
