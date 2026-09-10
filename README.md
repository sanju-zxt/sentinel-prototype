# Sentinel — The Haptic Co-Pilot for People Who Can't See

> Most assistive tech for blind and visually impaired people reacts — it narrates what's in front of you. **Sentinel stays silent.** It only speaks when it matters.

![Sentinel Screenshot](shot1.png)

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

## Try it

Sentinel is a self-contained HTML/CSS/JS app with no build step.

```bash
git clone https://github.com/SEANSAJU/sentinel-prototype.git
cd sentinel-prototype
npx serve .
# Open http://localhost:3000
```

Or just open `index.html` directly in your browser.

### Controls

| Key | Action |
|---|---|
| **W / S** | Move forward / back |
| **Q / E** or **← / →** | Turn left / right |
| **1 – 7** | Launch demo scenarios (traffic, crowd, escalator...) |
| **D** | Remote pilot mode |
| **F** | Fire / alert |
| **M** | Drop item |
| **R** | Scanner mode |
| **C** | Find phone |
| **G** | Focus |

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
```

The core of Sentinel is the **perception filter** — not the world simulation, not the haptics. The filter is what makes Sentinel different from every other assistive tech that narrates everything. It watches, scores, and chooses silence.

## Tech Stack

- **HTML/CSS** — dark theme, HUD overlay, perception chips
- **Vanilla JS** (ES modules) — zero dependencies
- **Web Audio API** — spatial panning for directional haptics
- **Web Speech API** — calm, minimal voice alerts
- **Web Bluetooth** — haptic wearable communication

## Roadmap

- [ ] Real-time object detection via YOLOv8-nano (on-device, webcam)
- [ ] MediaPipe skeletal tracking for crowd flow analysis
- [ ] MiDaS depth estimation for distance perception
- [ ] Hardware integration (LiDAR-equipped phones, haptic wearables)
- [ ] Native mobile wrapper (Capacitor / React Native)
- [ ] Real-world sensor fusion (GPS, compass, accelerometer)

## Built for People Who Need It

This isn't a hackathon side project. Over 2.2 billion people worldwide have a vision impairment. Most assistive AI today is narration-first — it talks constantly and becomes noise. Sentinel flips the model: **listen to the world, intervene only when it matters, and let silence be the default.**

---

**Built by Sanju** — prototype v0.1

> *"The best accessibility feature is one you never notice working."*
