# Sentinel — Competitive Analysis (Sept 2025)

## Executive Summary

**No product on the market combines proactive ambient sensing + haptic-first feedback + on-device AI + silence-first philosophy.** Sentinel occupies a unique intersection that no competitor fills.

| Dimension | Current Market | Sentinel |
|-----------|---------------|----------|
| Trigger | User-initiated (reactive) | **Ambient/autonomous (proactive)** |
| Feedback | Audio narration (cognitive load) | **Haptic-first, silence-by-default** |
| AI Location | Cloud-dependent | **On-device (YOLO/MediaPipe/MiDaS)** |
| Form Factor | Phone / glasses / cane / belt | **Wearable-agnostic perception core** |
| Intelligence | Object detection only | **Salience filter + intent prediction** |
| Social | Remote human only | **Kinesthetic body language + remote pilot** |

---

## Major Competitors

### 1. Envision AI (Free app / $399-$3,499 glasses)

**What they have:**
- Free smartphone app with OCR, scene description, face recognition, barcode scanning, color detection, handwriting
- **Ally** AI assistant (freemium, €10/mo Pro): dynamic tool routing across LLMs (Llama, GPT-class, Gemini), custom personalities, memory
- **Envision Glasses** (built on Google Glass Enterprise 2): Read ($1,899), Home ($2,499), Professional ($3,499)
- **Ally Solos Glasses** (new, Aug 2025): $399, 15hr battery, HD cameras
- 100M+ text reads, 50M+ image descriptions, 180+ countries
- **On-device AI (2026)**: Partnership with Arm + Google Gemma 4 for offline scene description

**What they don't have:**
- No proactive alerts — entirely user-triggered
- No haptic feedback
- No obstacle avoidance or navigation
- No salience filtering — narrates everything requested
- No silence-first philosophy
- No health monitoring
- No body language reading

**User complaints (iOS 4.2★):**
- Camera focus/blurry scans → garbage OCR
- Robot voices / poor TTS quality
- Endless text repeat loops
- Random language switching
- Barcode scanning broken
- Subscription/glasses upsell suspicion

**Sentinel advantage:** Proactive + haptic + silence-first + salience filter

---

### 2. Microsoft Seeing AI (Free, iOS + Android)

**What they have:**
- 7 channels: Short Text, Documents, Products, People, Currency, Scene, Color
- Free, 70+ countries
- Some on-device OCR, cloud for scene description/handwriting
- Age/gender/emotion estimation for people
- GPT-4 Conversational Image Description (2023 update)
- iOS 12+, Android 9+

**What they don't have:**
- No proactive alerts
- No haptic feedback
- No obstacle avoidance or navigation
- No health monitoring
- No body language reading
- Audio-only feedback (narrates constantly)
- Cloud-dependent for scene description

**Sentinel advantage:** Same reactive limitations as Envision + audio-only

---

### 3. Google Lookout (Free, Android only)

**What they have:**
- 7 modes: Text, Documents, Explore, Currency, Food labels, Find, Images
- **Gemini-powered Images mode** (Sep 2025 update): AI describes surroundings
- Auto-language detection, Arabic support, natural voices
- "Find" mode for searching objects
- Android 5.0+

**What they don't have:**
- No proactive alerts
- No haptic feedback
- No obstacle avoidance or navigation
- No health monitoring
- Cloud-dependent (Gemini)
- Android only (no iOS)

**Sentinel advantage:** Same reactive model + platform agnostic + on-device AI

---

### 4. Be My Eyes / Be My AI (Free)

**What they have:**
- 10M+ volunteers, 1M+ BLV users
- Be My AI: GPT-4o vision for image description
- Meta Ray-Ban integration
- Enterprise partnerships (Microsoft, Meta, Hilton, Tesco)

**What they don't have:**
- Entirely reactive — user must initiate every call/scan
- No ambient monitoring
- No obstacle detection
- No navigation
- No haptic feedback
- Privacy concerns with image upload

**Sentinel advantage:** Proactive vs reactive + haptic vs audio

---

### 5. Aira (Subscription ~$35-50/mo)

**What they have:**
- Live human visual interpreters via video
- AI powered by Project Astra
- Free at partner venues (Walmart, Google, Target, Starbucks)
- Meta AI glasses support

**What they don't have:**
- Human-dependent (scalability/cost)
- Reactive only
- No obstacle avoidance
- No haptic feedback
- No proactive alerts

**Sentinel advantage:** Fully automated + proactive + haptic

---

### 6. WeWALK Smart Cane 2 ($70/mo = $840/yr)

**What they have:**
- Ultrasonic chest-level obstacle detection
- GPS navigation + AI voice assistant
- CES 2025 award winner
- HSA/FSA eligible

**What they don't have:**
- Cane form factor limits sensor placement (no 360°)
- Audio-first (minimal handle vibration only)
- No upper-body/head detection
- No scene understanding
- No health monitoring

**Sentinel advantage:** Full 360° perception + multi-pillar intelligence + haptic-first

---

### 7. FeelSpace NaviBelt (Germany, insurance-covered)

**What they have:**
- 16-motor vibration belt for 360° directional guidance
- Compass mode (proactive north sense) + smartphone nav mode
- **Haptic-only** — no audio
- Covered by German health insurance

**What they don't have:**
- No obstacle detection
- No scene understanding
- No AI — GPS-only
- No indoor navigation
- No health monitoring
- No body language reading

**Sentinel advantage:** AI perception + salience filtering + four-pillar intelligence

---

### 8. ASHIRASE (Japan)

**What they have:**
- Shoe-mounted haptic devices (both feet)
- Vibration patterns for turn guidance
- Dual-foot vibrotactile

**What they don't have:**
- No obstacle detection
- No AI scene understanding
- Japan-only
- No upper body awareness

**Sentinel advantage:** Full perception + multi-pillar intelligence

---

### 9. OrCam MyEye / MyMe — **DISCONTINUED (2024)**

Pivoted entirely to hearing technology. Proves dedicated wearable cameras are being commoditized by smartphone AI.

---

## Market Gap Matrix

| Feature | Envision | Seeing AI | Lookout | BeMyAI | Aira | WeWALK | NaviBelt | ASHIRASE | **Sentinel** |
|---------|----------|-----------|---------|--------|------|--------|----------|----------|-------------|
| Proactive/Ambient | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ obstacles | ⚠️ compass | ❌ | **✅** |
| Haptic-First | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | **✅** |
| Silence-by-Default | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | **✅** |
| On-Device AI | ⚠️ 2026 | ⚠️ partial | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Obstacle Avoidance | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ ultrasonic | ❌ | ❌ | **✅** |
| Scene Understanding | ✅ basic | ✅ | ✅ Gemini | ✅ GPT-4o | ✅ AI | ❌ | ❌ | ❌ | **✅** |
| Navigation | Limited | Limited | Limited | Human | Human | ✅ GPS | ✅ GPS | ✅ GPS | **✅** |
| Body Language | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Health Monitoring | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Memory Palace | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Remote Pilot | ✅ Aira | ❌ | ❌ | ✅ vol. | ✅ pro | ❌ | ❌ | ❌ | **✅** |
| No Phone Required | ✅ glasses | ❌ | ❌ | ❌ | ✅ glasses | ❌ | ❌ | ❌ | **✅** |

---

## Sentinel's Unique Differentiators

### 1. Salience Filter (The Brain)
No competitor filters. They all narrate everything or require user queries. Sentinel's `SEN.Perception.decide()` scores every potential alert by imminence, actionability, and non-redundancy — surfacing only the single most important thing.

### 2. Silence Log (Proof of Trust)
Every suppressed event is logged. This is a trust mechanism no competitor has. Users can verify Sentinel is watching, choosing, and deliberately staying quiet.

### 3. Four-Pillar Intelligence
Competitors do 1 pillar (navigation). Sentinel unifies Guardian + Memory + Social + Health.

### 4. Kinesthetic Body Language
No competitor reads body language or provides "feel" feedback for social cues. MediaPipe pose + haptic patterns = "someone extending hand."

### 5. Health + Context Fusion
No product combines navigation with vitals. rPPG from camera + context = "heart rate elevated + crossing street = pause alert."

---

## Key Insights from Research

1. **On-device AI is the 2026 differentiator** — Envision's Arm/Gemma 4 move makes this clear
2. **Navigation is a white space** — No player has good native turn-by-turn + obstacle avoidance + scene understanding
3. **Hardware cost is the biggest barrier** — $2,500+ glasses exclude most users; $399 Solos changes this but is unproven
4. **Insurance reimbursement exists** — NaviBelt proves haptic navigation is reimbursable (Germany); VA/US pathways emerging
5. **Free apps are the funnel** — Envision's free app (100M+ reads) builds trust before hardware
6. **Community co-design matters** — Envision runs 90-min onboarding, beta programs
7. **Cloud dependency breaks proactive** — 200-500ms latency = too late for "car approaching"
8. **Street crossing = major academic gap** — Ren 2025 explicitly identifies this
9. **Indoor navigation = major gap** — NavCog requires $10k+ beacons; no beacon-free solution exists

---

## What Sentinel Should Build (Based on Research)

### Priority 1: YOLOv8 On-Device Detection (Current Sprint)
- Proves on-device AI works in browser
- Foundation for all perception features
- Differentiates from cloud-only competitors

### Priority 2: MiDaS Depth Estimation
- Distance perception for obstacle avoidance
- Fills the "upper-body/head obstacle" gap (WeWALK only does chest-level)

### Priority 3: MediaPipe Pose Estimation
- Body language reading (unique differentiator)
- Crowd flow analysis
- Gesture recognition

### Priority 4: Indoor Positioning (No Beacons)
- Visual SLAM + floor plane detection
- Fills NavCog's gap without infrastructure dependency

### Priority 5: Insurance/B2B Pathway
- Target VA/HCPCS codes (US)
- Follow NaviBelt's German insurance model
- B2B licensing of perception engine to wearable makers

---

## Sources

- letsenvision.com (product pages, blog 2025-2026)
- ally.me
- shop.letsenvision.com
- AFB AccessWorld review (2023)
- Apple App Store (iTunes API + reviews)
- Wikipedia (Seeing AI, OrCam, Be My Eyes, Soundscape)
- Aira.io
- WeWALK.io
- feelSpace.de
- ashirase.com
- locussuit.com
- haptic-vision.com
- haptic.works / TechCrunch Disrupt 2024
- APKMirror (Lookout version history)
- GitHub (Microsoft/Soundscape, SightlineAI)
- CMU Cognitive Assist Lab (NavCog, CaBot)
- arXiv papers (WhatsAI, survey papers)
- ACM CHI 2025 (LifeInsight)
- Google Scholar (2024-2025 haptic navigation literature)
