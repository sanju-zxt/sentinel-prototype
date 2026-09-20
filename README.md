# Sentinel — The Haptic Co-Pilot for People Who Can't See

> Most assistive tech for blind and visually impaired people reacts — it narrates what's in front of you. **Sentinel stays silent.** It only speaks when it matters.

![Sentinel Screenshot](shot1.png)

> **Why this exists:** We analyzed Envision, Seeing AI, Google Lookout, Be My Eyes, Aira, WeWALK, NaviBelt, ASHIRASE, Soundscape, and 15 more products + the 2024–25 haptic-navigation literature. **No product combines proactive ambient sensing + haptic-first feedback + on-device AI + silence-first salience filtering.** See [`COMPETITIVE_ANALYSIS.md`](COMPETITIVE_ANALYSIS.md) for the full gap matrix.

## What is this?

Sentinel is a **proactive, haptic co-pilot** for people who are blind or visually impaired. It solves the core problem that existing tools like Microsoft Seeing AI, Google Lookout, and Envision all share: **they only describe what you point at.** Sentinel watches the world *for* you and intervenes only when it matters.

This is an early interactive prototype — a dark room simulator where you walk through a city with cars, crowds, broken escalators, and traffic lights, and Sentinel decides what deserves your attention (and what gets logged in the **Silence Log** as proof it watched and chose not to disturb).

## The 4 Pillars

| Pillar | What it covers |
|---|---|
| **Guardian** | Safety & Navigation — traffic alerts, obstacle avoidance, path finding |
| **Memory** | Cognition & Memory — spatial memory palace, "did I leave my keys?" |
| **Social** | Social & Communication — remote pilot for trusted contacts, kinesthetic body language |
| **Health** | Health & Ecosystem — heart rate monitoring, medication reminders |

## The Silence-First Philosophy

> *"The best interface is no interface."*

Every AI system today has the same problem: it tries to be helpful by *talking more*. Sentinel inverts this. The **Perception Engine** (`SEN.Perception.decide()`) is a salience filter — it scores every potential alert by how imminent, actionable, and non-redundant it is, then surfaces only the **single most important thing**, and only when it matters.

Everything else is logged in the Silence Log — visible proof that Sentinel is watching, choosing, and deliberately staying quiet.

**No more notification fatigue. No more "Arriving at... arriving at... arriving at..."**

## Live demo

Pushed to GitHub Pages — installable PWA, works fully offline:

🔗 **<https://sanju-zxt.github.io/sentinel-prototype/>**

From the live app press **0** for the hands-free AUTO TOUR, **N** for guided turn-by-turn navigation, or tap the **🎙️ VOICE** button and say *"guide me"* / *"where are my keys"*. Install it (Add to Home screen) and it runs with no network.

## Try it

Sentinel is a self-contained HTML/CSS/JS app with no build step.

```bash
git clone https://github.com/SEANSAJU/sentinel-prototype.git
cd sentinel-prototype
npx serve .
# Open http://localhost:3000
```

Or just open `index.html` directly in your browser.

## Install it as an app

**PWA (works today, no toolchain)**
1. `npx serve .` and open the URL in Chrome / Edge / mobile Chrome.
2. Install → "Add to Home screen" (**Install App** in mobile Chrome). The service worker caches the whole app, so it runs fully offline and launches standalone with its own icon.

**Native Android (Capacitor shell)**
```bash
npm install                 # @capacitor/cli + @capacitor/android
node tools/build-www.js     # assemble www/ (the offline surface, from sw.js ASSETS)
npx cap add android         # scaffold the native project once (generated, not committed)
npx cap sync                # copy www/ + config into the native project
npx cap open android        # needs Android Studio + SDK → build & run, or
# gradlew assembleDebug      # inside android/ → outputs apk/debug/sentinel.apk
```
`www/` is generated and git-ignored; `node tools/build-www.js` is the only build step. The remaining hardware spine (a real LiDAR-phone or haptic motor) intentionally stays a plug — swap the physical motor at `SEN.Haven.pulse()` in one place.

## Smoke tests (all headless, run from the repo root)
```bash
node js/_smoke.js        # 23 logic checks — salience, pillars, kinesthesia, SLAM, haptics, fusion
node js/_smoke_dom.js    # boot + 30 frames + console renderers under a fake DOM
node js/_smoke_pwa.js    # 23 checks — manifest, icons (real raster dims), offline cache cover, head parity
```

### Controls

| Key | Action |
|---|---|
| **W / S** | Move forward / back |
| **Q / E** or **← / →** | Turn left / right |
| **1 – 9** | Launch demo scenarios (1–7 pillars, 8 body language, 9 re-localize) |
| **D** (tap twice fast) | Uplink / hang up the remote pilot |
| **F** | Fire / alert |
| **M** | Drop item |
| **R** | Scanner mode (object → currency → medication → color → document) |
| **C** | Find phone |
| **V** | Silent modal — type what you'd say, Sentinel speaks it |
| **G** | Conversation focus (home-in on a person, quiet the crowd) |
| **T** | Translation whisper (pharmacy phrase, EN ⇄ Hindi) |
| **B** | Pair a haptic motor (Web Bluetooth, feature-detected) |
| **0** | AUTO TOUR — Sentinel walks itself through the plaza, hands-free |
| **N** | Guided turn-by-turn navigation (nearest landmark, voice + haptics) |
| **🎙️** (button) | Voice input — one-shot listen; say "5", "where are my keys", "guide me" |

### Pillar tabs

- **PITCH** — the dark room simulator intro
- **SILENCE LOG** — everything Sentinel watched and chose not to say
- **MEMORY PALACE** — spatial memory visualization
- **REMOTE PILOT** — let a trusted contact see through your eyes
- **HEART** — health monitoring (simulated rPPG)
- **HELP** — guidance and controls

## Architecture

Pure vanilla JS modules — no frameworks, no build step, no dependencies.

```
index.html            Entry point
style.css             Dark theme + HUD
js/
  main.js             Game loop, input, state
  scene.js            World simulation (cars, crowds, obstacles)
  perception.js       Salience filter — the brain
  audio.js            Web Audio spatial panning + Web Speech voice
  console.js          Console panel (Silence Log, Memory Palace, etc.)
  demo.js             Scenario playback (1–7)
  pillar_guardian.js  Safety & navigation
  pillar_memory.js    Spatial memory
  pillar_social.js    Remote pilot + kinesthetic body language
  pillar_health.js    Heart rate simulation (rPPG)
  camera.js           getUserMedia stream manager (webcam)
  detector.js         YOLOv8-nano ONNX inference + NMS (on-device)
  depth.js            MiDaS v3.0-small monocular depth → real meters (on-device)
  kinesthesis.js      Skeleton-agnostic body language (posture, gait, approach intent)
  localize.js         Beacon-free visual-SLAM-lite (dead reckoning + loop closure)
  haven.js            Haptic "belt" — NaviBelt direction+urgency → vibrate + viz
  fusion.js           Real-world sensor fusion (GPS, compass, accelerometer)
  guide.js            Turn-by-turn guided navigation (N) — nearest landmark, spoken side+distance nudges
  voice.js            Voice input — one-shot Web Speech Recognition, routes words to Sentinel (🎙️)
  _smoke.js           Headless logic tests (23 checks)
  _smoke_dom.js       Fake-DOM boot/render tests
  _smoke_pwa.js       Headless PWA installability/offline-surface audit (23 checks)

PWA + native shell: manifest.webmanifest, sw.js (offline-first), assets/icon*.png|svg,
capacitor.config.json (native shell bound to `www/`), package.json (@capacitor/*),
tools/build-www.js (assembles `www/` from the sw.js ASSETS list — the single
source of truth), tools/gen-icons.js (rasterizes icon PNGs, no dependencies).
```

The core of Sentinel is the **perception filter** — not the world simulation, not the haptics. The filter is what makes Sentinel different from every other assistive tech that narrates everything. It watches, scores, and chooses silence.

## Tech Stack

- **HTML/CSS** — dark theme, HUD overlay, perception chips
- **Vanilla JS** (ES modules) — zero dependencies
- **Web Audio API** — spatial panning for directional haptics (the in-browser stand-in for the haptic motor)
- **Web Speech API** — calm, minimal voice alerts
- **onnxruntime-web** — real-time YOLOv8-nano object detection in the browser (WASM, on-device)
- **Web Bluetooth** *(planned)* — haptic wearable communication once a motor peripheral exists

## Real-World Camera + YOLOv8-nano

Sentinel can watch your **actual room** through your webcam and merge the detections into the same salience pipeline as the simulation — proving the perception core works on the real world.

```
getUserMedia() → video → 640×640 snapshot → YOLOv8-nano (ONNX/WASM)
                    → NMS → detections → SEN.Perception.runReal() → decide()
```

- Click the **🎥 CAMERA** button in the top-right HUD
- Grant camera permission — the PiP shows what YOLO sees, with bounding boxes
- Person / car / bicycle / traffic light / stop sign / bench / cell phone detections become real entities that `decide()` scores exactly like simulated ones
- Works offline — all inference is on-device via WebAssembly. No cloud, no upload.
- No model? The app degrades gracefully to simulation-only with a spoken hint.

### Providing the model

YOLOv8-nano is ~6 MB. Download it once, export to ONNX, and drop it in the project root:

```bash
# requires Python + ultralytics (https://docs.ultralytics.com)
pip install ultralytics
yolo export model=yolov8n.pt format=onnx imgsz=640   # → yolov8n.onnx
```

Then place the resulting `yolov8n.onnx` next to `index.html`. The detector hot-checks for it and shows a helpful status if it's missing.

> Tip: use a **facingMode:environment** (rear) camera on a phone for best street-like results.

### Adding real distance (MiDaS depth)

YOLO alone estimates distance from box height — an assumption. **MiDaS v3.0-small** gives Sentinel a real per-pixel depth map from the same single camera, and each frame is anchored to metric scale using the YOLO boxes (relative depth → meters). The PiP shows a teal→magenta depth wash, and every box gets a live **meters** label.

```bash
pip install ultralytics
yolo export model=midas_v3.0-small.pt format=onnx imgsz=384 opset=12
# or download any MiDaS v3.0-small ONNX export
mv midas_v3.0-small.onnx midas.onnx   # → next to index.html
```

No depth model? The app flags it once and keeps running on YOLO-only box-height estimation — silence-first, graceful by design.

- [x] Depth perception via MiDaS (real meters, on-device, fused with YOLO) — **done in-browser**

## Roadmap

- [x] Real-time object detection via YOLOv8-nano (on-device, webcam) — **done in-browser**
- [x] Competitive analysis — **see `COMPETITIVE_ANALYSIS.md`**
- [x] MediaPipe skeletal tracking for crowd flow analysis + kinesthetic body language — **done as `kinesthesis.js`**. Full MediaPipe model-landmarks can drop into `SEN.Kinesthesis.attach()` later; the physics layer (posture, gait, approach intent) already works from YOLO boxes / sim metadata — no faces, deterministic, testable.
- [x] ~~MiDaS depth estimation for distance perception~~ — **done: real meters via `depth.js`**
- [x] Beacon-free indoor positioning (visual SLAM) — **done as `localize.js`**. Dead-reckoning odometry + appearance-based place memory (landmark geometry in sim, a 4×4 MiDaS depth-sector fingerprint in camera mode). Loop closure collapses drift — no beacons, no GPS.
- [x] Hardware integration (LiDAR-equipped phones, haptic wearables) — **done as `haven.js`**. Every alert pulses direction+urgency (NaviBelt encoding) through `navigator.vibrate`, Web Audio spatial pan, and the on-screen belt ring; optional Web Bluetooth motor pairing behind feature detection.
- [x] Native mobile wrapper (Capacitor / React Native) — **done as a Capacitor scaffold** (`capacitor.config.json`) + installable/offline PWA (`manifest.webmanifest`, `sw.js`, icon).
- [x] Real-world sensor fusion (GPS, compass, accelerometer) — **done as `fusion.js`**. Geolocation watch + device compass heading + accelerometer step count, merged with the SLAM readout; graceful when sensors are absent.

### New modules & demo scenarios

| Key | Demo | What it proves |
|---|---|---|
| **8** | Body Language | Fast approach + kneeling body surfaced from *physics* (velocity projection, posture), never faces |
| **9** | Re-localize | Walk a loop; the **📍 LOC** chip's σ collapses when Sentinel re-anchors on a place it has seen |
| **0** | AUTO TOUR | The hands-free walkthrough: Sentinel walks ITSELF through the real plaza — crosswalk → nearest EXIT → the keys POI → the café → loop-close re-anchor. Each stop is the one precise spoken line that earns the voice; the rest of the walk stays calm and silent. Ends itself at the last stop (or press `0` again to stop) |

- **Kinesthesia** (`kinesthesis.js`) — posture (`sitting`/`kneeling`/`leaning`/`standing`), approach intent from velocity-onto-radial projection, erratic-gait detection. The wired-figure crowd in the world now renders seated and kneeling people distinctly.
- **Localization** (`localize.js`) — position belief with a σ (uncertainty) that grows with distance walked and collapses on place-memory match. Indoor, zero infrastructure.
- **Haptic belt** (`haven.js`) — left/right/front/back tap patterns + urgency suffix; pulse counter and belt energy live in the HUD (`vibrating 17`).
- **Sensor fusion** (`fusion.js`) — the **📍 LOC** chip reads GPS/compass accents on mobile; a spoken finding fires if a real GPS vanishes mid-walk. In the desktop sim it runs odometry + sim heading, so the chip is never dead.
- **Voice input** (`voice.js`) — the **🎙️ VOICE** button opens a one-shot listen and routes recognized words straight to Sentinel — say "5" for demo 5, "where are my keys" for Memory Palace, "guide me" for guidance. Web Speech API (feature-detected), entirely on-device — no cloud, keys never uploaded; a silent no-op with a one-line hint where the browser lacks SpeechRecognition, and the keyboard always still works.
- **Guided navigation** (`guide.js`) — press **N** and Sentinel picks the nearest reachable landmark and announces a friendly spoken name for that leg; every ~2.6s it speaks a side + distance nudge ("Turn right — the café, 32 meters") and pulses the haptic belt in the correct direction, announcing arrival when within 70px. Pure logic folded into the fusion loop, so its findings flow through the same salience/haptic/voice pipeline as everything else. Press `N` again (or `SEN.Guide.stop()`) to end guidance.

## Built for People Who Need It

This isn't a hackathon side project. Over 2.2 billion people worldwide have a vision impairment. Most assistive AI today is narration-first — it talks constantly and becomes noise. Sentinel flips the model: **listen to the world, intervene only when it matters, and let silence be the default.**

---

**Built by Sanju** — prototype v0.1

> *"The best accessibility feature is one you never notice working."*
