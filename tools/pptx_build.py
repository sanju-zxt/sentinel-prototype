# Sentinel hackathon deck builder - python-pptx, dark theme
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'sentinel-pitch.pptx')
SHOT = os.path.join(ROOT, 'shot1.png')

BG = RGBColor(0x0D, 0x0F, 0x17)
ACCENT = RGBColor(0x2E, 0xC8, 0xB5)     # sentinel teal
WARM = RGBColor(0xFF, 0xB6, 0x5C)       # warm amber
GREY = RGBColor(0x8A, 0x94, 0xA6)
TEXT = RGBColor(0xEA, 0xEF, 0xF8)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]

def slide():
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = BG
    return s

def box(s, l, t, w, h):
    tb = s.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    return tb, tf

def txt(s, l, t, w, h, lines, size=18, color=TEXT, bold=False, align=PP_ALIGN.LEFT, font='Calibri'):
    _, tf = box(s, l, t, w, h)
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run()
        r.text = ln
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.color.rgb = color
        r.font.name = font
    return tf

def kicker(s, text, l=0.7, t=0.55):
    txt(s, l, t, 12, 0.4, [text.upper()], size=13, color=ACCENT, bold=True)

# ---------- 1 TITLE ----------
s = slide()
txt(s, 0.7, 1.7, 12, 1.2, ['Sentinel'], size=66, color=TEXT, bold=True)
txt(s, 0.7, 2.8, 12, 0.8, ['The Haptic Co-Pilot for People Who Cannot See'], size=26, color=ACCENT, bold=True)
txt(s, 0.7, 3.7, 12, 0.6, ['Most assistive tech narrates what you point at.  Sentinel stays silent and only speaks when it matters.'], size=16, color=GREY)
txt(s, 0.7, 5.0, 12, 0.5, ['Silence-first  /  On-device AI  /  Haptic-first  /  Offline PWA'], size=15, color=WARM, bold=True)
txt(s, 0.7, 6.5, 12, 0.4, ['2.2 Billion People  |  Pure Vanilla JS  |  v0.1.0 - LIVE  |  git  sanju-zxt/sentinel-prototype'], size=13, color=GREY)
if os.path.exists(SHOT):
    s.shapes.add_picture(SHOT, Inches(9.3), Inches(4.3), height=Inches(2.6))

# ---------- 2 PROBLEM ----------
s = slide()
kicker(s, 'The Problem')
txt(s, 0.7, 1.2, 12, 1.0, ['2.2 billion people live with vision loss.  Daily life is a sequence of gambles:  crossing streets, catching fast approaches, finding dropped keys, knowing which way to turn.'], size=20)
txt(s, 0.7, 2.7, 12, 0.6, ['Today = two failure modes, both about noise:'], size=17, color=TEXT)
pts = [
    ('Reactive narration', 'Seeing AI, Lookout, Envision, Be My Eyes only describe what you point at them.  You must know what to ask.  Most of the world is never noticed.'),
    ('Notification fatigue', 'Narrators talk constantly - "Arriving at... arriving at..." - so the ear learns to ignore the voice, exactly when it matters most.'),
    ('Half hardware', 'WeWALK, NaviBelt, ASHIRASE do haptics but single-purpose, chatty, and not perception-aware.'),
]
tb, tf = box(s, 0.7, 3.3, 12, 3.4)
for name, desc in pts:
    p = tf.paragraphs[0] if tf.paragraphs[0].runs == [] else tf.add_paragraph()
    p.space_after = Pt(12)
    r = p.add_run(); r.text = name + '  '
    r.font.bold = True; r.font.size = Pt(18); r.font.color.rgb = WARM
    r2 = p.add_run(); r2.text = '- ' + desc
    r2.font.size = Pt(15); r2.font.color.rgb = GREY

# ---------- 3 GAP ----------
s = slide()
kicker(s, 'The Gap')
txt(s, 0.7, 1.2, 12, 0.9, ['We mapped 20+ products and the 2024-25 haptic-navigation literature.  No product combines all four:'], size=20)
gaps = ['Proactive ambient sensing (watches for you)', 'Haptic-first feedback (voice as the last resort)', 'On-device AI (no cloud, no upload)', 'Silence-first salience filtering (speaks only when it matters)']
tb, tf = box(s, 0.7, 2.5, 12, 3.0)
for g in gaps:
    p = tf.paragraphs[0] if tf.paragraphs[0].runs == [] else tf.add_paragraph()
    p.space_after = Pt(16)
    r = p.add_run(); r.text = '  ' + g
    r.font.size = Pt(18); r.font.color.rgb = TEXT
    r.font.bold = True
txt(s, 0.7, 5.6, 12, 1.2, ['Every existing product targets one of these.  Sentinel is the single system that delivers all four together.'], size=18, color=ACCENT, bold=True)

# ---------- 4 INSIGHT ----------
s = slide()
kicker(s, 'The Core Insight')
txt(s, 0.7, 1.3, 12, 1.1, ['The problem is not "get told more".  The problem is attention:  knowing what deserves yours.'], size=24, bold=True)
txt(s, 0.7, 2.6, 12, 0.9, ['So we inverted the entire model.'], size=20, color=WARM, bold=True)
txt(s, 0.7, 3.6, 12, 1.4, ['Watch everything  ->  score every alert  ->  surface the single most important thing  ->  act haptically  ->  stay silent otherwise'], size=19, color=ACCENT, bold=True)
txt(s, 0.7, 5.2, 12, 1.0, ['Every down-voted alert is logged in the Silence Log - visible proof Sentinel is watching, choosing, and deliberately staying quiet.'], size=17, color=GREY)
txt(s, 0.7, 6.4, 12, 0.6, ['"The best accessibility feature is one you never notice working."'], size=16, color=TEXT, bold=True)

# ---------- 5 HOW ----------
s = slide()
kicker(s, 'How It Works')
flow = [('1  Perception', 'YOLOv8-nano + MiDaS depth, or simulated world - cars, crowds, obstacles, approach velocity. All on-device.'),
        ('2  Salience  Engine', 'SEN.Perception.decide()  scores imminence + actionability + redundancy for every detected event.'),
        ('3  Decision', 'Surfaces the single most important item, only when it matters. Rejects are logged, never spoken.'),
        ('4  Haptics first', 'Direction + urgency pulses on the belt / wearable - no listening tax. Voice is the last resort.'),
        ('5  Voice, sparingly', 'One precise, earned line - "Turn right - the cafe, 32 meters." Then silence again.')]
tb, tf = box(s, 0.7, 1.3, 12, 5.2)
for name, desc in flow:
    p = tf.paragraphs[0] if tf.paragraphs[0].runs == [] else tf.add_paragraph()
    p.space_after = Pt(14)
    r = p.add_run(); r.text = name + '   '
    r.font.bold = True; r.font.size = Pt(19); r.font.color.rgb = ACCENT
    r2 = p.add_run(); r2.text = desc
    r2.font.size = Pt(15); r2.font.color.rgb = GREY

# ---------- 6 PILLARS ----------
s = slide()
kicker(s, 'The 4 Pillars')
tb, tf = box(s, 0.7, 1.3, 12, 5.2)
pillars = [
    ('Guardian', 'Safety & Navigation - traffic alerts, obstacle avoidance, path finding.'),
    ('Memory', 'Memory Palace - "did I leave my keys?" + beacon-free visual-SLAM-lite localization.'),
    ('Social', 'Remote Pilot - a trusted contact sees through your eyes; kinesthetic body language.'),
    ('Health', 'Heart-rate monitoring (rPPG) + medication reminders.'),
]
for name, desc in pillars:
    p = tf.paragraphs[0] if tf.paragraphs[0].runs == [] else tf.add_paragraph()
    p.space_after = Pt(20)
    r = p.add_run(); r.text = '  ' + name + '  '
    r.font.bold = True; r.font.size = Pt(24); r.font.color.rgb = WARM
    r2 = p.add_run(); r2.text = desc
    r2.font.size = Pt(16); r2.font.color.rgb = TEXT
txt(s, 0.7, 6.3, 12, 0.6, ['Same salience brain behind all four - one pipeline, four domains.'], size=15, color=GREY)

# ---------- 7 TECH ----------
s = slide()
kicker(s, 'Fully On-Device, Zero Cloud')
rows = [('YOLOv8-nano', 'Real-time object detection in the browser (ONNX / WASM, onnxruntime-web).'),
        ('MiDaS v3.0-small', 'Monocular depth -> real meters, fused with YOLO boxes, per-pixel.'),
        ('Visual SLAM-lite', 'Dead reckoning + loop closure. Position belief with uncertainty. No beacons, no GPS.'),
        ('Kinesthesis', 'Posture / approach-intent from physics - never faces, privacy by design.'),
        ('Haptic Haven', 'Direction + urgency pulse encoding (NaviBelt language) -> vibrate, spatial audio, or paired motor.'),
        ('Voice + Guide', 'Web Speech one-shot input routes words to pillars; turn-by-turn spoken nudges + haptics.'),
        ('Fusion', 'GPS / compass / accelerometer merged with SLAM; graceful when any sensor is absent.')]
tb, tf = box(s, 0.7, 1.3, 12, 5.2)
for name, desc in rows:
    p = tf.paragraphs[0] if tf.paragraphs[0].runs == [] else tf.add_paragraph()
    p.space_after = Pt(10)
    r = p.add_run(); r.text = name + '   '
    r.font.bold = True; r.font.size = Pt(16); r.font.color.rgb = ACCENT
    r2 = p.add_run(); r2.text = desc
    r2.font.size = Pt(14); r2.font.color.rgb = GREY
txt(s, 0.7, 6.5, 12, 0.5, ['Vanilla JS ES-modules, Capacitor + PWA manifest + service worker.  No frameworks, no dependencies, no cloud.'], size=14, color=TEXT, bold=True)

# ---------- 8 FEATURES ----------
s = slide()
kicker(s, 'Built Features')
feat = [('0  AUTO TOUR', 'Sentinel walks ITSELF through the plaza: crosswalk -> exit -> keys -> cafe -> loop-close. Ends itself.'),
        ('N  Guided Nav', 'Nearest landmark, spoken side + distance every ~2.6 s, arrival announced within 70 px.'),
        ('MIC  Voice Input', 'One-shot listen: say "guide me" or "where are my keys" - routed to the right pillar.'),
        ('CAM  Real World', 'Point Sentinel at your room: YOLO + depth merge into the same salience pipeline.'),
        ('Uncertainty', 'Every position carries a sigma that collapses on loop closure - honest about what it knows.'),
        ('Privacy', 'Everything runs on-device. Keys, scenes, health never leave the phone.')]
tb, tf = box(s, 0.7, 1.3, 12, 5.2)
for name, desc in feat:
    p = tf.paragraphs[0] if tf.paragraphs[0].runs == [] else tf.add_paragraph()
    p.space_after = Pt(12)
    r = p.add_run(); r.text = name + '   '
    r.font.bold = True; r.font.size = Pt(17); r.font.color.rgb = WARM
    r2 = p.add_run(); r2.text = desc
    r2.font.size = Pt(14); r2.font.color.rgb = GREY

# ---------- 9 DEMO ----------
s = slide()
kicker(s, 'Live Demo')
txt(s, 0.7, 1.3, 12, 1.2, ['This is running right now - deployed, not a mockup.'], size=28, bold=True)
rows = [('Hosted PWA', 'https://sanju-zxt.github.io/sentinel-prototype/  (installable, works offline)'),
        ('Release v0.1.0', '5 assets: 3 real screen recordings + narrated MP4 demo + screenshot'),
        ('Recordings', 'Real Chromium captures of AUTO TOUR, guided navigation, and Memory Palace'),
        ('Smoke suites', '3 headless suites, 23 logic + 23 PWA + DOM boot - all green')]
tb, tf = box(s, 0.7, 2.7, 12, 3.2)
for name, desc in rows:
    p = tf.paragraphs[0] if tf.paragraphs[0].runs == [] else tf.add_paragraph()
    p.space_after = Pt(16)
    r = p.add_run(); r.text = name + '   '
    r.font.bold = True; r.font.size = Pt(18); r.font.color.rgb = ACCENT
    r2 = p.add_run(); r2.text = desc
    r2.font.size = Pt(15); r2.font.color.rgb = TEXT
txt(s, 0.7, 6.1, 12, 0.6, ['1-2 min script: 0  AUTO TOUR  ->  N  guided walk  ->  voice "where are my keys"  ->  Silence Log.'], size=16, color=WARM, bold=True)

# ---------- 10 MAGIC ----------
s = slide()
kicker(s, 'The Magic')
txt(s, 0.7, 1.3, 12, 1.6, ['We prove it works by showing the silence.'], size=30, bold=True)
txt(s, 0.7, 3.0, 12, 2.5, ['Open the Silence Log and you see the alerts Sentinel considered and turned down - "car (far)", "crowd (dense)", "phone (steady)" - each scored by imminence and actionability.  The demo earns the voice, then goes quiet again.  That is not an empty app;  that is the product doing the one thing competitors cannot:  knowing when NOT to speak.'], size=19, color=GREY)
txt(s, 0.7, 6.2, 12, 0.7, ['The best interface is no interface.'], size=20, color=ACCENT, bold=True)

# ---------- 11 ROADMAP ----------
s = slide()
kicker(s, 'Roadmap')
rows = [('Now - hardware spine', 'Swap the in-browser haptic stand-in for a real LiDAR phone + haptic wearable at SEN.Haven.pulse().'),
        ('Next - field study', '20 blind users, 4 weeks, real streets - measure attention saved vs existing narrators.'),
        ('Then - pilot', 'Remote-pilot network + pharmacy translation already prototyped (EN <-> Hindi).')]
tb, tf = box(s, 0.7, 1.3, 12, 3.4)
for name, desc in rows:
    p = tf.paragraphs[0] if tf.paragraphs[0].runs == [] else tf.add_paragraph()
    p.space_after = Pt(20)
    r = p.add_run(); r.text = name + '   '
    r.font.bold = True; r.font.size = Pt(19); r.font.color.rgb = WARM
    r2 = p.add_run(); r2.text = desc
    r2.font.size = Pt(15); r2.font.color.rgb = GREY
txt(s, 0.7, 5.1, 12, 1.2, ['We hold the prototype.  The differentiator - salience before speech - is proven in the browser.  The field is the last mile.'], size=17, color=TEXT, bold=True)

# ---------- 12 ASK ----------
s = slide()
kicker(s, 'Ask')
txt(s, 0.7, 1.6, 12, 1.1, ['Judge the gap, not the polish.'], size=30, bold=True)
txt(s, 0.7, 2.9, 12, 2.4, ['No competitor combines proactive sensing + haptic-first feedback + on-device AI + silence-first salience.  We hold that position with a working, deployed, offline-first prototype and real recordings against the real app.'], size=19, color=GREY)
rows = [('Silence-first salience filter', 'the brain competitors do not have'),
        ('On-device everything', 'deep privacy by physics - nothing uploads'),
        ('Deployed + demonstrable', 'PWA live, 5 release assets, narrated walkthrough')]
tb, tf = box(s, 0.7, 5.3, 12, 1.8)
for name, desc in rows:
    p = tf.paragraphs[0] if tf.paragraphs[0].runs == [] else tf.add_paragraph()
    p.space_after = Pt(8)
    r = p.add_run(); r.text = name + '   '
    r.font.bold = True; r.font.size = Pt(16); r.font.color.rgb = ACCENT
    r2 = p.add_run(); r2.text = desc
    r2.font.size = Pt(14); r2.font.color.rgb = GREY

prs.save(OUT)
print('SAVED', OUT)
print('slides =', len(prs.slides._sldIdLst))
print('bytes  =', os.path.getsize(OUT))