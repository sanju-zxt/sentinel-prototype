# Sentinel hackathon deck v2 - designed, image-rich (ASCII only)
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FR = os.path.join(ROOT, 'pptx_frames')
SHOT = os.path.join(ROOT, 'shot1.png')
OUT = os.path.join(ROOT, 'sentinel-hackathon-win.pptx')

BG   = RGBColor(0x09, 0x0E, 0x18)
CARD = RGBColor(0x11, 0x1A, 0x2B)
TEAL = RGBColor(0x2E, 0xC8, 0xB5)
WARM = RGBColor(0xFF, 0xB6, 0x5C)
GREY = RGBColor(0x9A, 0xA7, 0xB8)
TEXT = RGBColor(0xEE, 0xF3, 0xFA)
DIM  = RGBColor(0x5A, 0x6A, 0x7E)
INK  = RGBColor(0x07, 0x0B, 0x13)

prs = Presentation()
prs.slide_width  = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]

def new_slide():
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = BG
    return s

def shp(s, kind, l, t, w, h, fill=CARD, line=None):
    sp = s.shapes.add_shape(kind, Inches(l), Inches(t), Inches(w), Inches(h))
    try:
        sp.adjustments[0] = 0.12
    except Exception:
        pass
    if fill is None:
        sp.fill.background()
    else:
        sp.fill.solid()
        sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line
        sp.line.width = Pt(1)
    sp.shadow.inherit = False
    return sp

def txt(s, l, t, w, h, runs, size=16, color=TEXT, bold=False, align=PP_ALIGN.LEFT):
    tb = s.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = 0; tf.margin_right = 0; tf.margin_top = 0; tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = align
    if isinstance(runs, str):
        runs = [(runs, size, color, bold)]
    for (rt, rs, rc, rb) in runs:
        r = p.add_run()
        r.text = rt
        r.font.size = Pt(rs); r.font.color.rgb = rc; r.font.bold = rb
    return tb

def kicker(s, t, label):
    shp(s, MSO_SHAPE.RECTANGLE, 0.7, t, 0.09, 0.32, fill=TEAL)
    txt(s, 0.95, t - 0.02, 11, 0.4, [(label.upper(), 13, TEAL, True)])

def title_bar(s, big, sub=None):
    txt(s, 0.7, 1.05, 12.2, 0.9, [(big, 32, TEXT, True)])
    if sub:
        txt(s, 0.7, 1.9, 12.2, 0.5, [(sub, 15, GREY, False)])

def bar(s, y, color):
    shp(s, MSO_SHAPE.RECTANGLE, 0, y, 13.333, 0.65, fill=color)

# ============ 1 HERO ============
s = new_slide()
shp(s, MSO_SHAPE.RECTANGLE, 0, 0, 13.333, 7.5, fill=INK)
bar(s, 6.85, TEAL)
txt(s, 0.9, 1.15, 11.5, 1.4, [('SENTINEL', 70, TEXT, True)])
txt(s, 0.9, 2.45, 11.5, 0.8, [('The Haptic Co-Pilot for People Who Cannot See', 27, TEAL, True)])
txt(s, 0.9, 3.45, 10.5, 0.9, [
    ('Most assistive tech narrates what you point at. ', 19, TEXT, False),
    ('Sentinel watches the world for you - and only speaks when it matters.', 19, GREY, True)])
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.9, 4.55, 8.7, 0.9, fill=RGBColor(0x0E, 0x17, 0x26))
txt(s, 1.2, 4.85, 8.2, 0.5, [('SILENCE-FIRST  /  HAPTIC-FIRST  /  ON-DEVICE AI  /  OFFLINE PWA', 15, WARM, True)])
txt(s, 0.9, 5.9, 11.5, 0.6, [('2.2 billion people  |  vanilla JS + WASM  |  deployed now  |  v0.1.0 LIVE', 13, DIM, True)])
if os.path.exists(SHOT):
    s.shapes.add_picture(SHOT, Inches(9.8), Inches(1.6), height=Inches(4.7))

# ============ 2 PROBLEM ============
s = new_slide()
kicker(s, 0.55, 'The Problem')
txt(s, 0.7, 1.05, 12.2, 0.9, [('2.2B people. A world designed for eyes. A daily sequence of gambles.', 30, TEXT, True)])
txt(s, 0.7, 1.9, 12.2, 0.5, [('Crossing streets. Catching fast approaches. Finding dropped keys. Knowing which way to turn.', 15, GREY, False)])
txt(s, 0.7, 2.6, 6.0, 0.5, [('FAILURE MODE 1  -  REACTIVE NARRATION', 16, WARM, True)])
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.7, 3.1, 5.8, 1.9, fill=CARD)
txt(s, 0.95, 3.4, 5.3, 1.5, [
    ('Seeing AI, Lookout, Envision, Be My Eyes', 16, TEXT, True),
    ('  only describe what you point at them. If you cannot think to ask, you never find out.', 15, GREY, False)])
txt(s, 7.0, 2.6, 6.0, 0.5, [('FAILURE MODE 2  -  NOTIFICATION FATIGUE', 16, WARM, True)])
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 7.0, 3.1, 5.8, 1.9, fill=CARD)
txt(s, 7.25, 3.4, 5.3, 1.5, [
    ("'Arriving at... arriving at...' ", 16, TEXT, True),
    (' Constant narration trains the ear to ignore the voice - exactly when it matters most.', 15, GREY, False)])
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.7, 5.4, 12.1, 1.3, fill=RGBColor(0x0E, 0x17, 0x26))
txt(s, 1.0, 5.7, 11.4, 0.8, [
    ('THE RESULT:  ', 16, WARM, True),
    ('users mute the tool that exists to help them see. Attention, not information, is the real scarcity.', 16, TEXT, False)])

# ============ 3 GAP ============
s = new_slide()
kicker(s, 0.55, 'The Gap')
txt(s, 0.7, 1.05, 12.2, 0.9, [('No one occupies this square.', 32, TEXT, True)])
txt(s, 0.7, 2.0, 12.2, 0.5, [('Mapped 20+ products + the 2024-25 haptic-navigation literature. Nobody combines all four:', 14, GREY, False)])
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.7, 2.8, 5.9, 3.2, fill=CARD)
txt(s, 1.0, 3.05, 5.3, 0.5, [('EVERY EXISTING PRODUCT', 14, DIM, True)])
for i, g in enumerate([
        'Reactive only - describes what you point at',
        'Narration-first - talks constantly',
        'Haptic hardware, single-purpose',
        'Cloud analysis - sends your world away']):
    txt(s, 1.0, 3.7 + i * 0.55, 5.3, 0.5, [('-  ' + g, 14, GREY, False)])
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 6.85, 2.8, 5.9, 3.2, fill=RGBColor(0x0E, 0x20, 0x1E))
txt(s, 7.2, 3.05, 5.3, 0.5, [('SENTINEL - THE FULL QUAD', 15, TEAL, True)])
for i, g in enumerate(['1  Proactive ambient sensing', '2  Haptic-first feedback', '3  On-device AI - no cloud', '4  Silence-first salience']):
    txt(s, 7.2, 3.7 + i * 0.55, 5.3, 0.5, [(g, 15, TEXT, True)])
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.7, 6.4, 12.1, 0.6, fill=RGBColor(0x0E, 0x17, 0x26))
txt(s, 1.0, 6.58, 11.4, 0.4, [('ONE product. FOUR capabilities. That is the entire gap.', 15, WARM, True)])

# ============ 4 INSIGHT ============
s = new_slide()
kicker(s, 0.55, 'The Core Insight')
txt(s, 0.7, 1.3, 12, 1.0, [('Silence is not the absence of help. Silence is the product working.', 30, TEXT, True)])
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.7, 2.7, 12.1, 1.5, fill=CARD)
txt(s, 1.0, 2.95, 11.4, 1.0, [
    ('WE INVERTED THE MODEL.  ', 18, TEAL, True),
    ('Instead of narrate-everything, Sentinel computes what deserves one alert - imminence x actionability x non-redundancy - then surfaces the single most important thing, only when it matters.', 17, TEXT, False)])
flow = ['WATCH', 'SCORE', 'DECIDE', 'ACT', 'SILENCE']
cw, gap = 2.2, 0.28
for i, f in enumerate(flow):
    lcx = 0.7 + i * (cw + gap)
    filln = TEAL if i < 4 else RGBColor(0x0E, 0x20, 0x1E)
    col = INK if i < 4 else TEAL
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, lcx, 4.6, cw, 1.15, fill=filln)
    txt(s, lcx, 5.0, cw, 0.5, [(f, 17, col, True)], align=PP_ALIGN.CENTER)
    if i < 4:
        txt(s, lcx + cw - 0.02, 4.95, 0.32, 0.5, [('>', 20, WARM, True)], align=PP_ALIGN.CENTER)
txt(s, 0.7, 6.05, 12, 0.9, [('Every down-voted alert is logged in the Silence Log - proof Sentinel is watching, choosing, and deliberately staying quiet.', 16, GREY, True)])
txt(s, 0.7, 6.85, 12, 0.4, [("'The best accessibility feature is one you never notice working.'", 15, TEAL, True)])

# ============ 5 HOW ============
s = new_slide()
kicker(s, 0.55, 'How It Works')
txt(s, 0.7, 1.05, 12.2, 0.9, [('A salience brain, not a vision app.', 32, TEXT, True)])
steps = [
    ('1  PERCEPTION', 'Webcam YOLOv8-nano + MiDaS depth, or a simulated city - cars, crowds, obstacles, approach velocity. On-device.'),
    ('2  SALIENCE', 'Perception.decide() scores imminence + actionability + redundancy on every detected event.'),
    ('3  DECISION', 'Surfaces the single most important item, only when it matters. Rejects are logged, never spoken.'),
    ('4  HAPTIC FIRST', 'Direction + urgency pulses on the belt / wearable - no listening tax.'),
    ('5  VOICE LAST', 'One precise, earned line: "Turn right - the cafe, 32 meters." Then silence again.')]
for i, (tt, dd) in enumerate(steps):
    ly = 1.95 + i * 1.05
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.7, ly, 3.1, 0.85, fill=TEAL if i % 2 == 0 else WARM)
    txt(s, 0.85, ly + 0.22, 2.9, 0.5, [(tt, 14, INK, True)])
    txt(s, 4.15, ly + 0.1, 8.5, 0.8, [(dd, 15, TEXT if i % 2 == 1 else GREY, False)])

# ============ 6 LIVE DEMO ============
s = new_slide()
kicker(s, 0.55, 'Live Demo')
txt(s, 0.7, 1.05, 12.2, 0.9, [('This is running right now.', 32, TEXT, True)])
txt(s, 0.7, 1.9, 12.2, 0.5, [('Deployed, installable, offline - not a mockup.', 15, GREY, False)])
shots = [
    ('frame_tour.png', '0  AUTO TOUR', 'Sentinel walks itself through the plaza - crosswalk, exit, keys, cafe, loop-close.'),
    ('frame_guide.png', 'N  GUIDED NAV', 'Nearest landmark, spoken side + distance, arrival announced within 70 px.'),
    ('frame_memory.png', 'VOICE + MEMORY', "Say 'where are my keys' - routed to the Memory Palace, answered."),
    ('shot1.png', 'THE FULL APP', 'Installable PWA, dark HUD, Silence Log, pillar tabs, haptic belt ring.')]
for i, (fname, cap, desc) in enumerate(shots):
    col, row = i % 2, i // 2
    lx = 0.7 + col * 6.2
    ty = 2.3 + row * 2.5
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, lx, ty, 5.9, 2.3, fill=CARD)
    tgt = SHOT if fname == 'shot1.png' else os.path.join(FR, fname)
    if os.path.exists(tgt):
        s.shapes.add_picture(tgt, Inches(lx + 0.25), Inches(ty + 0.25), height=Inches(1.35))
    txt(s, lx + 0.25, ty + 1.72, 5.4, 0.4, [(cap, 13, WARM, True)])

# ============ 7 PILLARS ============
s = new_slide()
kicker(s, 0.55, 'The Four Pillars')
txt(s, 0.7, 1.05, 12.2, 0.9, [('One brain. Four domains.', 32, TEXT, True)])
pillars = [
    ('GUARDIAN', 'Safety / navigation', 'Traffic alerts, obstacle avoidance, path finding.'),
    ('MEMORY', 'Cognition / memory', 'Memory Palace - "did I leave my keys?" + beacon-free SLAM.'),
    ('SOCIAL', 'Communication', 'Remote pilot - a trusted contact sees through your eyes.'),
    ('HEALTH', 'Body / ecosystem', 'Heart-rate (rPPG) + medication reminders.')]
for i, (tt, sub, dd) in enumerate(pillars):
    lx = 0.7 + (i % 2) * 6.2
    ty = 2.1 + (i // 2) * 2.45
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, lx, ty, 5.9, 2.25, fill=CARD)
    col = TEAL if i % 2 == 0 else WARM
    shp(s, MSO_SHAPE.OVAL, lx + 0.3, ty + 0.35, 0.85, 0.85, fill=col)
    txt(s, lx + 0.3, ty + 0.55, 0.85, 0.5, [(str(i + 1), 22, INK, True)], align=PP_ALIGN.CENTER)
    txt(s, lx + 1.4, ty + 0.35, 4.3, 0.5, [(tt, 16, TEXT, True)])
    txt(s, lx + 1.4, ty + 0.8, 4.3, 0.4, [(sub, 12, DIM, True)])
    txt(s, lx + 0.3, ty + 1.35, 5.3, 0.8, [(dd, 14, GREY, False)])

# ============ 8 TECH ============
s = new_slide()
kicker(s, 0.55, 'The Stack')
txt(s, 0.7, 1.05, 12.2, 0.9, [('Fully on-device. Zero cloud. Zero frameworks.', 30, TEXT, True)])
txt(s, 0.7, 1.9, 12.2, 0.5, [('Vanilla JS ES-modules + WASM. A server is a liability, not a feature.', 15, GREY, False)])
tech = [
    ('YOLOv8-nano', 'Real-time detection in the browser via onnxruntime-web (WASM).'),
    ('MiDaS v3.0-small', 'Monocular depth to real meters, fused with YOLO boxes.'),
    ('Visual SLAM-lite', 'Dead reckoning + loop closure - position belief with sigma, no beacons.'),
    ('Kinesthesis', 'Posture + approach intent from physics only - never faces.'),
    ('Haven (haptics)', 'NaviBelt direction + urgency: vibrate, spatial audio, motor plug.'),
    ('Voice + Guide', 'One-shot Web Speech input; turn-by-turn nudges with haptics.'),
    ('Fusion', 'GPS / compass / accelerometer merged with SLAM, graceful when absent.'),
    ('PWA + Capacitor', 'Offline service worker, manifest, installable, native shell ready.')]
for i, (tt, dd) in enumerate(tech):
    col, row = i % 2, i // 2
    lx = 0.7 + col * 6.2
    ty = 2.35 + row * 0.5
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, lx, ty, 5.9, 0.42, fill=CARD)
    txt(s, lx + 0.25, ty + 0.04, 1.9, 0.4, [(tt, 12, TEAL, True)])
    txt(s, lx + 2.1, ty + 0.04, 3.7, 0.4, [(dd, 11, GREY, False)])
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.7, 6.5, 12.1, 0.6, fill=RGBColor(0x0E, 0x17, 0x26))
txt(s, 1.0, 6.68, 11.4, 0.4, [('Privacy by physics: keys, scenes, and health never leave the phone.', 15, TEAL, True)])

# ============ 9 MAGIC ============
s = new_slide()
kicker(s, 0.55, 'The Magic')
txt(s, 0.7, 1.05, 12.2, 0.9, [('We prove it works by showing the silence.', 32, TEXT, True)])
txt(s, 0.7, 2.2, 12, 2.2, [
    ('The Silence Log lists the alerts Sentinel considered and turned down - ', 19, TEXT, False),
    ("'car (far)', 'crowd (dense)', 'phone (steady)'", 19, TEAL, True),
    (' - each scored by imminence and actionability. It earned the last alert, then went quiet again. That is not an empty app; that is the competitor-impossible feature: knowing when NOT to speak.', 19, GREY, True)])
shp(s, MSO_SHAPE.RECTANGLE, 0.7, 4.7, 12.1, 0.06, fill=DIM)
txt(s, 0.7, 5.0, 12, 1.6, [
    ('THE METRIC EVERYONE IGNORES: ATTENTION SAVED.', 22, WARM, True),
    (' Every good no-speech is a prevented interruption. Sentinel converts the world into decisions, and only the right one becomes sound.', 18, GREY, False)])
txt(s, 0.7, 6.8, 12, 0.5, [("'The best interface is no interface.'", 17, TEAL, True)])

# ============ 10 ROADMAP ============
s = new_slide()
kicker(s, 0.55, 'Roadmap')
txt(s, 0.7, 1.05, 12.2, 0.9, [('Prototype proven. Field is the last mile.', 32, TEXT, True)])
road = [
    ('NOW', 'Hardware spine', 'Swap the in-browser haptic stand-in for a LiDAR phone + real wearable at Haven.pulse().'),
    ('NEXT', 'Field study', '20 blind users, 4 weeks, real streets - measure attention saved vs narrators.'),
    ('THEN', 'Pilot', 'Remote-pilot network + pharmacy translation (EN-Hindi) already prototyped.')]
for i, (tag, tt, dd) in enumerate(road):
    lx = 0.7 + i * 4.16
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, lx, 2.4, 3.95, 3.3, fill=CARD)
    shp(s, MSO_SHAPE.OVAL, lx + 1.35, 2.7, 1.25, 1.25, fill=TEAL if i != 2 else WARM)
    txt(s, lx + 1.35, 3.05, 1.25, 0.5, [(tag, 18, INK, True)], align=PP_ALIGN.CENTER)
    txt(s, lx + 0.35, 4.2, 3.3, 0.5, [(tt, 17, TEXT, True)], align=PP_ALIGN.CENTER)
    txt(s, lx + 0.35, 4.8, 3.3, 1.0, [(dd, 13, GREY, False)], align=PP_ALIGN.CENTER)
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.7, 6.2, 12.1, 0.7, fill=RGBColor(0x0E, 0x17, 0x26))
txt(s, 1.0, 6.38, 11.4, 0.5, [('The differentiator - salience before speech - is proven in the browser today. The field is the last mile.', 15, TEXT, True)])

# ============ 11 ASK ============
s = new_slide()
kicker(s, 0.55, 'The Ask')
txt(s, 0.7, 1.5, 12, 1.1, [('Judge the gap, not the polish.', 34, TEXT, True)])
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 0.7, 2.75, 12.1, 0.06, fill=TEAL)
txt(s, 0.7, 3.1, 12, 2.0, [
    ('No competitor combines all four:  ', 20, GREY, False),
    ('proactive sensing + haptic-first + on-device AI + silence-first salience.', 20, WARM, True),
    (' We hold that with a working, deployed, offline-first prototype and real recordings against the real app.', 18, TEXT, False)])
rows = [
    ('1', 'Silence-first salience filter', 'the brain competitors do not have'),
    ('2', 'On-device everything', 'privacy by physics - nothing uploads'),
    ('3', 'Deployed + demonstrable', 'PWA live, 5 release assets, narrated walkthrough')]
for i, (n, tt, dd) in enumerate(rows):
    ly = 5.15 + i * 0.62
    shp(s, MSO_SHAPE.OVAL, 0.7, ly, 0.42, 0.42, fill=TEAL)
    txt(s, 0.7, ly + 0.02, 0.42, 0.4, [(n, 15, INK, True)], align=PP_ALIGN.CENTER)
    txt(s, 1.4, ly + 0.02, 3.6, 0.4, [(tt, 15, TEXT, True)])
    txt(s, 5.2, ly + 0.02, 7.6, 0.4, [(dd, 14, GREY, False)])
txt(s, 0.7, 6.9, 12, 0.5, [('sentinel  -  sanju-zxt/sentinel-prototype  -  https://sanju-zxt.github.io/sentinel-prototype/', 13, DIM, True)])

# ============ 12 THANK YOU ============
s = new_slide()
shp(s, MSO_SHAPE.RECTANGLE, 0, 0, 13.333, 7.5, fill=INK)
bar(s, 6.85, WARM)
txt(s, 0.9, 2.3, 11.5, 1.4, [("The best accessibility feature is one you never notice working.", 36, TEXT, True)])
txt(s, 0.9, 3.9, 11.5, 0.9, [('Thank you.', 52, TEAL, True)])
txt(s, 0.9, 5.3, 11.5, 0.5, [('Sentinel - silence-first, because attention is the scarce resource.', 18, GREY, True)])

prs.save(OUT)
print('SAVED', OUT)
print('slides =', len(prs.slides._sldIdLst))
print('bytes  =', os.path.getsize(OUT))