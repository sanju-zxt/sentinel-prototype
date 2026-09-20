# Sentinel - Release Notes

**Sentinel is the haptic co-pilot for people who can't see.** This is the single consolidated release notes covering all versions.

Live: **<https://sanju-zxt.github.io/sentinel-prototype/>** - an installable PWA that runs fully offline. Everything runs on-device, silence-first, in the browser or on your phone. No cloud, no upload, no data leaves the device.

## Version history

- **v0.1.1** (Sep 2026) - Voice input, guided turn-by-turn navigation, AUTO TOUR, performance optimizations (hot loops, PiP heatmap, detector postprocess), offline navigation fallback, 13-slide hackathon deck + pptx build tooling.
- **v0.1.0** (Sep 2026) - First prototype: the 4 pillars, silence-first perception engine, on-device YOLOv8-nano + MiDaS depth estimation, kinesthesia, visual-SLAM-lite, haptic belt, Capacitor/PWA shell.

## The 4 Pillars

- **Guardian** - Safety and Navigation - traffic alerts, obstacle avoidance, path finding
- **Memory** - Cognition and Memory - spatial memory palace, "did I leave my keys?"
- **Social** - Social and Communication - remote pilot for trusted contacts, kinesthetic body language
- **Health** - Health and Ecosystem - heart rate monitoring, medication reminders

## The Silence-First Philosophy

Sentinel inverts the assistive-tech model. The **Perception Engine** is a salience filter - it scores every potential alert by how imminent, actionable, and non-redundant it is, then surfaces only the single most important thing, and only when it matters. Everything else is logged in the **Silence Log** - visible proof that Sentinel is watching, choosing, and deliberately staying quiet. It stays silent, and only speaks when it matters.

## Everything that ships (all versions combined)

- 🎙️ **Voice input** (`voice.js`) - the **🎙️ VOICE** button opens a one-shot listen and routes recognized words straight to Sentinel: say *"5"*, *"where are my keys"*, or *"guide me"*. Web Speech API, feature-detected, entirely on-device.
- 🧭 **Guided turn-by-turn nav** (`guide.js`) - press **N** and Sentinel picks the nearest reachable landmark, speaks a friendly name for that leg, and every ~2.6s gives a spoken side + distance nudge ("Turn right - the cafe, 32 meters"), pulsing the haptic belt in the correct direction. Announces arrival within 70px.
- 🚶 **AUTO TOUR** - press **0** and Sentinel walks ITSELF through the real plaza - crosswalk → nearest EXIT → the keys POI → the cafe → loop-close re-anchor. Each stop is one precise spoken line that earns the voice; the rest of the walk stays calm and silent. It ends itself at the last stop.
- In-browser real-camera **YOLOv8-nano + MiDaS deepmixture** pipeline (on-device, WASM), **kinesthesia**, **visual-SLAM-lite** localization with loop closure, the haptic **belt**, and the **Capacitor/PWA** shell.

## Run it + all hotkeys

```bash
git clone https://github.com/sanju-zxt/sentinel-prototype.git
cd sentinel-prototype
npx serve .
# or just open index.html directly in your browser
```

| Key | Action |
|---|---|
| **W / S** | Move forward / back |
| **Q / E** or **← / →** | Turn left / right |
| **1 - 9** | Launch demo scenarios (1-7 pillars, 8 body language, 9 re-localize) |
| **D** (tap twice fast) | Uplink / hang up the remote pilot |
| **F** | Fire / alert |
| **M** | Drop item |
| **R** | Scanner mode (object → currency → medication → color → document) |
| **C** | Find phone |
| **V** | Silent modal - type what you'd say, Sentinel speaks it |
| **G** | Conversation focus (home-in on a person, quiet the crowd) |
| **T** | Translation whisper (pharmacy phrase, EN <-> Hindi) |
| **B** | Pair a haptic motor (Web Bluetooth, feature-detected) |
| **0** | AUTO TOUR - Sentinel walks itself through the plaza, hands-free |
| **N** | Guided turn-by-turn navigation (nearest landmark, voice + haptics) |
| **🎙️** (button) | Voice input - one-shot listen; say "5", "where are my keys", "guide me" |

## Known limitations (graceful by design)

- **Voice input** is a silent no-op with a one-line hint where the browser lacks SpeechRecognition (currently most non-Chrome/desktop browsers). The **keyboard always works.**
- **Depth model (MiDaS)** is optional - without it Sentinel flags it once and keeps running on YOLO-only box-height estimation.
- **Camera** is optional - without it the app degrades gracefully to simulation-only with a spoken hint.

Silence-first, graceful by design.

## Assets

GitHub assets include:

- **`shot1.png`** - app screenshot (also in the README)
- **Three demo recordings** in **`tools/demo-rec/out/`** - three `.webm` screen recordings of the live app (the AUTO TOUR and the guided workflows)

## Build & smoke tests

Run from the repo root, all headless:

```bash
node js/_smoke.js        # 23 logic checks - salience, pillars, kinesthesia, SLAM, haptics, fusion
node js/_smoke_dom.js    # boot + 30 frames + console renderers under a fake DOM
node js/_smoke_pwa.js    # 23 checks - manifest, icons, offline cache cover, head parity
```

All 23 checks across the three suites are green.

---

**Built by Sanju** - prototype

> "The best accessibility feature is one you never notice working."