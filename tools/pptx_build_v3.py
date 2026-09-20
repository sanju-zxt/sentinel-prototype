# Sentinel hackathon deck v3 - "winner" design system
# Dark cinematic, Bahnschrift display type, 5-color system, procedural AI-style art
# Run: python tools/pptx_build_v3.py   (run art generator first)
import os
import math

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'pptx_art')
FR = os.path.join(ROOT, 'pptx_frames')
SHOT = os.path.join(ROOT, 'shot1.png')
OUT = os.path.join(ROOT, 'sentinel-hackathon-win-v3.pptx')

EMU = Inches
SW, SH = 13.333, 7.5
M = 0.75
CW = SW - 2 * M

# ---------------- palette (the 5-color system) ----------------
INK   = RGBColor(0x07, 0x0B, 0x15)
MID   = RGBColor(0x10, 0x17, 0x28)
CARD  = RGBColor(0x0E, 0x16, 0x28)
CARD2 = RGBColor(0x13, 0x1E, 0x36)
MINT  = RGBColor(0x00, 0xE5, 0xC3)
AMBER = RGBColor(0xFF, 0xB4, 0x5E)
VIOLET = RGBColor(0x8B, 0x7C, 0xFF)
RED   = RGBColor(0xFF, 0x5B, 0x6E)
CLOUD = RGBColor(0xEA, 0xF2, 0xFC)
MUTE  = RGBColor(0x8F, 0xA3, 0xC0)
DIM   = RGBColor(0x46, 0x57, 0x7A)
LINE  = RGBColor(0x1E, 0x2B, 0x44)

DISP = 'Bahnschrift SemiBold'   # display / titles
SEGO = 'Segoe UI'
SEGOL = 'Segoe UI Light'
MONO = 'Consolas'
SERIF = 'Georgia'

prs = Presentation()
prs.slide_width = EMU(SW)
prs.slide_height = EMU(SH)
BLANK = prs.slide_layouts[6]

_slide_no = 0


def new_slide(bg_art=True, hero=None, scrim=False):
    global _slide_no
    _slide_no += 1
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = INK
    if bg_art:
        s.shapes.add_picture(os.path.join(ART, 'bg_base.png'), 0, 0, EMU(SW), EMU(SH))
    if hero:
        hx, hy, hw, hh = hero
        s.shapes.add_picture(os.path.join(ART, 'hero_cover.png'), EMU(hx), EMU(hy), EMU(hw), EMU(hh))
    if scrim:
        s.shapes.add_picture(os.path.join(ART, 'scrim_cover.png'), 0, 0, EMU(SW), EMU(SH))
    return s


def shp(s, kind, l, t, w, h, fill=CARD, line=None, lw=1.0, adj=None):
    sp = s.shapes.add_shape(kind, EMU(l), EMU(t), EMU(w), EMU(h))
    if adj is not None:
        try:
            for i, v in enumerate(adj):
                sp.adjustments[i] = v
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
        sp.line.width = Pt(lw)
    sp.shadow.inherit = False
    return sp


def txt(s, x, y, w, h, paras, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP,
        wrap=True, spacing=None, space_after=None):
    tb = s.shapes.add_textbox(EMU(x), EMU(y), EMU(w), EMU(h))
    tf = tb.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    first = True
    for para in paras:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = para.get('align', align)
        if spacing:
            p.line_spacing = spacing
        if space_after is not None:
            p.space_after = Pt(space_after)
        for rn in para['runs']:
            r = p.add_run()
            r.text = rn[0]
            f = r.font
            f.size = Pt(rn[1])
            f.color.rgb = rn[2]
            f.bold = rn[3]
            f.name = rn[4] if len(rn) > 4 else SEGO
            f.italic = rn[5] if len(rn) > 5 else False
    return tb


def kicker(s, x, y, label, col=MINT):
    shp(s, MSO_SHAPE.RECTANGLE, x, y, 0.09, 0.26, fill=col)
    txt(s, x + 0.22, y - 0.03, 11, 0.32, [{'runs': [(label.upper(), 12, col, True, SEGO)]}])


def display(s, x, y, w, text, size=40, col=CLOUD, align=PP_ALIGN.LEFT, spacing=1.0):
    txt(s, x, y, w, 3.5, [{'runs': [(text, size, col, False, DISP)], 'align': align}], spacing=spacing)


def sub(s, x, y, w, text, size=16, col=MUTE, align=PP_ALIGN.LEFT, spacing=1.15):
    txt(s, x, y, w, 1.6, [{'runs': [(text, size, col, False, SEGOL)], 'align': align}], spacing=spacing)


def chip(s, x, y, text, col=MINT, fill=CARD2, size=12, w=1.0, h=0.5, mono=False, align=PP_ALIGN.CENTER, bold=True):
    sp = shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h, fill=fill, line=col, lw=1.2, adj=0.5)
    txt(s, x, y + 0.13, w, 0.3, [{'runs': [(text, size, col, bold, MONO if mono else SEGO)], 'align': align}])


def footer(s, note=None):
    txt(s, M, SH - 0.45, 6, 0.3,
        [{'runs': [('SENTINEL', 10, MINT, True, SEGO), ('   /  silence-first, because attention is the scarce resource', 10, DIM, False, SEGO)]}])
    txt(s, EMU_in(SW) - M - 1.2, SH - 0.45, 1.2, 0.3,
        [{'runs': [(f'{_slide_no:02d}', 10, DIM, False, MONO)], 'align': PP_ALIGN.RIGHT}])
    if note:
        txt(s, M, 0.35, 10, 0.3, [{'runs': [(note, 10, DIM, False, SEGO)]}])


def EMU_in(v):
    return v


def A(*args):
    return args


# ============================================================ 1 COVER
s = new_slide(bg_art=False, hero=(0, 0, SW, SH), scrim=True)
shp(s, MSO_SHAPE.RECTANGLE, 0, SH - 0.16, SW, 0.16, fill=MINT)
# brand row
shp(s, MSO_SHAPE.RECTANGLE, M, 0.55, 0.5, 0.5, fill=MINT)
txt(s, M + 0.07, 0.62, 0.4, 0.4, [{'runs': [('S', 30, INK, True, DISP)], 'align': PP_ALIGN.CENTER}])
txt(s, M + 0.68, 0.6, 4.5, 0.4, [{'runs': [('SENTINEL', 22, CLOUD, False, DISP), ('   v0.1.0', 12, MUTE, False, SEGO)]}])
chip(s, SW - M - 2.35, 0.62, 'LIVE  /  OFFLINE  /  PWA', MINT, fill=CARD2, size=10, w=2.35, mono=True)
# tagline + title
kicker(s, M, 2.05, 'The Haptic Co-Pilot for People Who Cannot See')
display(s, M, 2.5, 11.6, 'SENTINEL', size=96, col=CLOUD, spacing=0.92)
shp(s, MSO_SHAPE.RECTANGLE, M + 0.03, 4.15, 1.6, 0.10, fill=MINT)
sub(s, M, 4.45, 8.6,
    'Most assistive tech narrates what you point at.  Sentinel watches '
    'the world for you - every car, crowd, kerb and crosswalk - and only '
    'speaks when it matters.', size=17, col=MUTE)
# stat chips bottom
stats = [('2.2B', 'people with vision impairment'),
         ('4', 'pillars - one brain'),
         ('100%', 'on-device AI')]
for i, (n, lab) in enumerate(stats):
    lx = M + i * 2.85
    txt(s, lx, 5.75, 2.4, 0.7, [{'runs': [(n, 30, MINT, False, DISP)]}])
    txt(s, lx, 6.45, 2.6, 0.4, [{'runs': [(lab, 12, MUTE, False, SEGO)]}])
# qr bottom-right
qr = s.shapes.add_picture(os.path.join(ART, 'qr.png'), EMU(SW - M - 1.35), EMU(5.6), EMU(1.3), EMU(1.3))
txt(s, SW - M - 1.35, 6.95, 1.35, 0.32, [{'runs': [('scan to run it', 10, DIM, False, MONO)], 'align': PP_ALIGN.CENTER}])

# ============================================================ 2 THE HOOK ('TL;DR')
s = new_slide()
kicker(s, M, 0.55, 'The Problem is the Scale')
display(s, M, 1.0, 11.8, '2.2 billion people walk a world', size=42)
display(s, M, 1.78, 11.8, 'that was built for eyes.', size=42, col=MINT)
sub(s, M, 2.6, 11.8, 'Every commute is a sequence of gambles - crossing, catching, finding, turning. '
                    'Sound and memory are doing all the seeing.', size=16)
cards = [
    ('2.2B', 'people', 'live with a vision impairment worldwide (WHO).'),
    ('36M', 'have no sight', 'at all. The world they share is not designed for them.'),
    ('6s', 'of attention', 'is all narration yields before the ear tunes it out.'),
]
for i, (n, u, d) in enumerate(cards):
    lx = M + i * (CW / 3 + 0.25)
    w = CW / 3 - 0.25
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, lx, 3.5, w, 2.7, fill=CARD, line=LINE, lw=1.0, adj=0.06)
    shp(s, MSO_SHAPE.RECTANGLE, lx, 3.5, w, 0.05, fill=MINT)
    txt(s, lx + 0.4, 3.8, w - 0.8, 1.2, [{'runs': [(n, 56, MINT if i < 2 else AMBER, False, DISP)]}])
    txt(s, lx + 0.4, 5.05, w - 0.8, 0.4, [{'runs': [(u.upper(), 14, VIOLET, True, SEGO)]}])
    txt(s, lx + 0.4, 5.5, w - 0.8, 0.7, [{'runs': [(d, 14, MUTE, False, SEGOL)], 'align': PP_ALIGN.LEFT}], spacing=1.1)
bar = shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, M, 6.65, CW, 0.55, fill=CARD2, line=LINE, lw=1, adj=0.5)
txt(s, M + 0.35, 6.83, CW - 0.7, 0.3, [{'runs': [('The real scarcity is not sight. ', 15, AMBER, True, SEGO), ('It is attention.', 15, CLOUD, True, SEGO)]}])
footer(s)

# ============================================================ 3 PROBLEM
s = new_slide()
kicker(s, M, 0.55, 'The Problem - Existing Tools Fail')
display(s, M, 1.0, 11.8, 'Their guide AI talks. Noise, not safety.', size=40)
sub(s, M, 1.85, 11.8, 'We analyzed Envision, Seeing AI, Google Lookout, Be My Eyes, Aira, WeWALK, NaviBelt, ASHIRASE, '
                     'Soundscape and 15 more products + the 2024-25 haptic-navigation literature.', size=14)
fails = [
    ('REACTIVE NARRATION', RED,
     'They only describe what you point at them. If you cannot think to ask, you never find out. '
     'The 2.2B who need help most get the least of it.'),
    ('NOTIFICATION FATIGUE', AMBER,
     '"Arriving at... arriving at..." Constant narration trains the ear to ignore the voice - '
     'exactly when it matters most. Users mute the tool that exists to help them see.'),
]
for i, (t, c, d) in enumerate(fails):
    lx = M + i * (CW / 2 + 0.25)
    w = CW / 2 - 0.25
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, lx, 2.7, w, 2.9, fill=CARD, line=LINE, lw=1, adj=0.06)
    shp(s, MSO_SHAPE.OVAL, lx + 0.4, 3.0, 0.66, 0.66, fill=c)
    txt(s, lx + 0.4, 3.18, 0.66, 0.4, [{'runs': [(str(i + 1), 26, INK, True, DISP)], 'align': PP_ALIGN.CENTER}])
    txt(s, lx + 1.3, 3.05, w - 1.8, 0.5, [{'runs': [(t, 19, CLOUD, True, SEGO)]}])
    txt(s, lx + 0.4, 3.95, w - 0.8, 1.5, [{'runs': [(d, 15, MUTE, False, SEGOL)]}], spacing=1.25)
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, M, 6.0, CW, 0.9, fill=CARD2, line=LINE, lw=1, adj=0.14)
txt(s, M + 0.4, 6.2, CW - 0.8, 0.6, [{'runs': [
    ('THE RESULT:  ', 17, AMBER, True, SEGO),
    ('attention, not information, is the scarce resource - and everyone is wasting it.', 17, CLOUD, True, SEGO)]}])
footer(s)

# ============================================================ 4 THE GAP (2x2)
s = new_slide()
kicker(s, M, 0.55, 'The Gap - a 2x2 No One Occupies')
display(s, M, 1.0, 11.8, 'Nobody occupies this square.', size=40)
sub(s, M, 1.8, 11.8, 'Every competitor is stuck somewhere in the grey. Sentinel is alone in the bright one.', size=15)
# axis labels
txt(s, M, 2.3, 1.8, 0.3, [{'runs': [('REACTIVE', 11, DIM, True, MONO)]}])
txt(s, SW - M - 2.3, 2.3, 2.3, 0.3, [{'runs': [('PROACTIVE', 11, MINT, True, MONO)], 'align': PP_ALIGN.RIGHT}])
txt(s, SW - M - 2.6, 6.72, 2.6, 0.3, [{'runs': [('HAPTIC-FIRST', 11, MINT, True, MONO)], 'align': PP_ALIGN.RIGHT}])
txt(s, M, 6.72, 2.6, 0.3, [{'runs': [('NARRATION-FIRST', 11, DIM, True, MONO)]}])
# matrix frame
gx, gy, gw = M, 2.62, CW
gh = 4.0
shp(s, MSO_SHAPE.RECTANGLE, gx, gy, gw, gh, fill=None, line=LINE, lw=1.2)
shp(s, MSO_SHAPE.RECTANGLE, gx + gw / 2, gy, 0, gh, fill=None, line=LINE, lw=1.2)
shp(s, MSO_SHAPE.RECTANGLE, gx, gy + gh / 2, gw, 0, fill=None, line=LINE, lw=1.2)
cells = [
    (0, 0, 'Seeing AI', 'narrates everything you point at it.', DIM, 'Microsoft'),
    (1, 0, 'Be My Eyes / Aira', 'a human on the other end of your camera.', DIM, 'call centers'),
    (0, 1, 'WeWALK / NaviBelt', 'haptic hardware, but single-purpose and blindness-only sensors.', DIM, 'hardware'),
    (1, 1, 'SENTINEL', 'proactive ambient sensing  +  haptic-first  +  on-device  +  silence-first salience.', MINT, ''),
]
for (cx, cy, t, d, c, tag) in cells:
    x = gx + cx * gw / 2 + 0.35
    y = gy + cy * gh / 2 + 0.28
    if (cx, cy) == (1, 1):
        boxw, boxh = gw / 2 - 0.7, gh / 2 - 0.56
        shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, x - 0.1, y - 0.1, boxw, boxh, fill=RGBColor(0x0D, 0x26, 0x28), line=MINT, lw=2.2, adj=0.08)
        txt(s, x + 0.15, y + 0.15, boxw - 0.3, 0.6, [{'runs': [('SENTINEL', 22, MINT, False, DISP)]}])
        txt(s, x + 0.15, y + 0.85, boxw - 0.3, 1.2, [{'runs': [(d, 14, CLOUD, False, SEGOL)]}], spacing=1.15)
    else:
        shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, x - 0.05, y - 0.05, gw / 2 - 0.62, gh / 2 - 0.5, fill=RGBColor(0x08, 0x0D, 0x19), adj=0.06)
        txt(s, x + 0.2, y + 0.22, gw / 2 - 0.95, 0.5, [{'runs': [(t, 16, c, True, SEGO)]}])
        txt(s, x + 0.2, y + 0.95, gw / 2 - 0.95, 1.3, [{'runs': [(d, 13, MUTE, False, SEGOL)]}], spacing=1.15)
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, M, 6.78, CW, 0.66, fill=CARD2, line=LINE, lw=1, adj=0.5)
txt(s, M + 0.4, 6.96, CW - 0.8, 0.3, [{'runs': [('ONE product.  FOUR capabilities.  THAT is the entire gap.', 16, AMBER, True, SEGO)]}])
footer(s)

# ============================================================ 5 THE INSIGHT
s = new_slide()
kicker(s, M, 0.55, 'The Core Insight')
display(s, M, 1.0, 11.9, 'Silence is not the absence of help.', size=42)
display(s, M, 1.78, 11.9, 'It is the product working.', size=42, col=MINT)
sub(s, M, 2.62, 11.6,
    'We inverted the assistive-tech model: instead of narrate-everything, Sentinel scores every '
    'event by imminence x actionability x non-redundancy - and surfaces the ONE thing that matters, '
    'only when it matters. Everything else is logged, never spoken.', size=15, spacing=1.2)
# pipeline
flow = ['WATCH', 'SCORE', 'DECIDE', 'ACT', 'SILENCE']
gap = 0.5
cw_box = (CW - 4 * gap) / 5.0
ry = 4.0
rwh = 0.95
for i, f in enumerate(flow):
    lx = M + i * (cw_box + gap)
    last = (i == 4)
    fillc = MINT if i == 0 else (AMBER if i == 1 else (VIOLET if i == 4 else CARD2 if i == 3 else CARD))
    col = INK if i in (0, 1) else CLOUD
    linec = MINT if (last or i in (0, 1)) else LINE
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, lx, ry, cw_box, rwh, fill=fillc, line=linec, lw=1.4, adj=0.16)
    txt(s, lx, ry + 0.3, cw_box, 0.4, [{'runs': [(f, 19 if not last else 21, col, True, DISP)], 'align': PP_ALIGN.CENTER}])
    if not last:
        txt(s, lx + cw_box - 0.1, ry + 0.2, gap + 0.2, 0.6, [{'runs': [('>', 22, AMBER, True, MONO)], 'align': PP_ALIGN.CENTER}])
sub(s, M + 0.2, 5.35, 11.4,
    'Every down-voted alert is stored in the Silence Log - visible proof Sentinel is watching, choosing, and deliberately staying quiet.',
    size=15, col=MUTE)
shp(s, MSO_SHAPE.RECTANGLE, M, 6.15, CW, 0.02, fill=LINE)
txt(s, M, 6.45, 11.9, 0.8, [{'runs': [
    ('THE HEADLINE COMPETITORS CANNOT PRINT:  ', 16, CLOUD, True, SEGO),
    ('attention saved.', 16, MINT, True, SEGO)]}])
footer(s)

# ============================================================ 6 HOW IT WORKS
s = new_slide()
kicker(s, M, 0.55, 'How It Works - the Salience Brain')
display(s, M, 1.0, 11.8, 'A salience brain, not a vision app.', size=40)
steps = [
    ('1', 'PERCEPTION', 'Webcam YOLOv8-nano + MiDaS depth, or a simulated city - cars, crowds, approach velocity, kerbs. On-device.'),
    ('2', 'SALIENCE', 'Perception.decide() scores imminence, actionability and redundancy on every event.'),
    ('3', 'DECISION', 'Surfaces the single most important item - only when it matters. Rejects go to the Silence Log.'),
    ('4', 'HAPTIC FIRST', 'Direction + urgency pulses on the wearable belt. No listening tax, no ear fatigue.'),
    ('5', 'VOICE LAST', 'One precise earned line - "Turn right - the cafe, 32 meters." Then silence.'),
]
span = 5.4
for i, (n, t, d) in enumerate(steps):
    ly = 1.95 + i * 0.98
    c = [MINT, AMBER, VIOLET, MINT, AMBER][i]
    shp(s, MSO_SHAPE.OVAL, M + 0.15, ly + 0.1, 0.7, 0.7, fill=c)
    txt(s, M + 0.15, ly + 0.27, 0.7, 0.4, [{'runs': [(n, 24, INK, True, DISP)], 'align': PP_ALIGN.CENTER}])
    txt(s, M + 1.2, ly + 0.05, 3.4, 0.4, [{'runs': [(t, 17, CLOUD, True, SEGO)]}])
    txt(s, M + 1.2, ly + 0.42, span, 0.55, [{'runs': [(d, 13, MUTE, False, SEGOL)]}], spacing=1.05)
shp(s, MSO_SHAPE.RECTANGLE, M + 0.52, 2.55, 0.02, 3.6, fill=DIM)
# right: code visual
cx = M + span + 0.55
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, cx, 2.1, 5.9, 3.35, fill=CARD, line=LINE, lw=1, adj=0.08)
shp(s, MSO_SHAPE.RECTANGLE, cx, 2.1, 0.06, 3.35, fill=MINT)
txt(s, cx + 0.3, 2.28, 5.3, 0.4, [{'runs': [('the whole brain, in 7 lines', 12, DIM, False, MONO)]}])
s.shapes.add_picture(os.path.join(ART, 'code.png'), EMU(cx + 0.35), EMU(3.0), EMU(5.2), EMU(5.2 * 470 / 1600))
footer(s)

# ============================================================ 7 LIVE DEMO
s = new_slide()
kicker(s, M, 0.55, 'Live Demo - Deployed, Running')
display(s, M, 1.0, 11.9, 'This is running right now.', size=40)
sub(s, M, 1.8, 11.9, 'Not a mockup. An installable PWA that works fully offline - camera, YOLO, depth, haptics, voice.', size=15)
shots = [
    ('frame_tour.png', 'AUTO TOUR', 'Sentinel walks ITSELF through the plaza - crosswalk, exit, keys, cafe, loop-close.'),
    ('frame_guide.png', 'GUIDED NAV', 'Nearest landmark, spoken side + distance nudges ("Turn right - the cafe, 32m").'),
    ('frame_memory.png', 'VOICE + MEMORY', 'Say "where are my keys" - routed to the Memory Palace, answered.'),
    ('shot1.png', 'THE FULL APP', 'Dark HUD, Silence Log, pillar tabs, haptic belt ring, in-browser radar.'),
]
for i, (fname, cap, d) in enumerate(shots):
    col, row = i % 2, i // 2
    lx = M + col * (CW / 2 + 0.25)
    ty = 2.35 + row * 2.05
    w = CW / 2 - 0.25
    tgt = SHOT if fname == 'shot1.png' else os.path.join(FR, fname)
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, lx, ty, w, 1.95, fill=CARD, line=LINE, lw=1, adj=0.06)
    shp(s, MSO_SHAPE.RECTANGLE, lx, ty + 0.02, 0.05, 1.9, fill=MINT if i % 2 == 0 else AMBER)
    if os.path.exists(tgt):
        s.shapes.add_picture(tgt, EMU(lx + 0.18), EMU(ty + 0.18), EMU(2.7), EMU(1.55))
    txt(s, lx + 3.0, ty + 0.22, w - 3.2, 0.4, [{'runs': [(cap, 15, AMBER, True, SEGO)]}])
    txt(s, lx + 3.0, ty + 0.62, w - 3.2, 1.2, [{'runs': [(d, 12.5, MUTE, False, SEGOL)]}], spacing=1.1)
chips = ['DEPLOYED', 'OFFLINE-FIRST', 'INSTALLABLE', '0 DEPENDENCIES', 'ON-DEVICE AI']
for i, c in enumerate(chips):
    chip(s, M + i * 1.62, 6.5, c, MINT, fill=CARD2, size=10, w=1.5, h=0.48, mono=True)
footer(s, note='press 0 = AUTO TOUR')

# ============================================================ 8 PILLARS
s = new_slide()
kicker(s, M, 0.55, 'The Four Pillars')
display(s, M, 1.0, 11.8, 'One brain. Four domains.', size=40)
sub(s, M, 1.8, 11.8, 'A single salience engine serving every part of a daily life.', size=15)
pillars = [
    ('GUARDIAN', 'safety / navigation', 'Traffic alerts, obstacle avoidance, path finding. The watch that never blinks.', MINT),
    ('MEMORY', 'cognition / memory', 'Memory Palace - "did I leave my keys?" - plus beacon-free visual SLAM.', VIOLET),
    ('SOCIAL', 'communication', 'Remote pilot: a trusted contact sees through your eyes, in real time.', AMBER),
    ('HEALTH', 'body / ecosystem', 'Heart rate (rPPG) + medication reminders. Health that hides in the background.', RED),
]
for i, (t, subb, d, c) in enumerate(pillars):
    col, row = i % 2, i // 2
    lx = M + col * (CW / 2 + 0.25)
    ty = 2.5 + row * 1.9
    w = CW / 2 - 0.25
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, lx, ty, w, 1.78, fill=CARD, line=LINE, lw=1, adj=0.07)
    shp(s, MSO_SHAPE.OVAL, lx + 0.3, ty + 0.28, 1.1, 1.1, fill=c)
    txt(s, lx + 0.3, ty + 0.52, 1.1, 0.6, [{'runs': [(str(i + 1), 34, INK, True, DISP)], 'align': PP_ALIGN.CENTER}])
    txt(s, lx + 1.62, ty + 0.26, w - 1.9, 0.5, [{'runs': [(t, 20, CLOUD, True, DISP)]}])
    txt(s, lx + 1.62, ty + 0.72, w - 1.9, 0.4, [{'runs': [(subb.upper(), 11, c, True, MONO)]}])
    txt(s, lx + 0.34, ty + 1.52, w - 0.9, 0.3, [{'runs': [(d, 13, MUTE, False, SEGOL)]}])
footer(s)

# ============================================================ 9 STACK
s = new_slide()
kicker(s, M, 0.55, 'The Stack - Privacy by Physics')
display(s, M, 1.0, 11.8, 'Everything on-device. Zero cloud.', size=40)
sub(s, M, 1.8, 11.8, 'A server is a liability, not a feature. Vanilla JS ES-modules + WebAssembly.', size=15)
tech = [
    ('YOLOv8-nano', 'real-time detection in the browser via onnxruntime-web (WASM)', MINT),
    ('MiDaS v3.0', 'monocular depth to real meters, fused with YOLO boxes', MINT),
    ('Visual SLAM-lite', 'dead reckoning + loop closure - position belief with sigma', VIOLET),
    ('Kinesthesis', 'posture + approach intent from physics only - never faces', VIOLET),
    ('Haven haptics', 'NaviBelt direction + urgency: vibrate, spatial audio, motor plug', AMBER),
    ('Voice + Guide', 'one-shot Web Speech input; turn-by-turn nudges with haptics', AMBER),
    ('Fusion', 'GPS / compass / accelerometer merged with SLAM', RED),
    ('PWA + Capacitor', 'offline service worker, manifest, installable, native shell', RED),
]
for i, (t, d, c) in enumerate(tech):
    col, row = i % 2, i // 2
    lx = M + col * (CW / 2 + 0.25)
    ty = 2.45 + row * 0.9
    w = CW / 2 - 0.25
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, lx, ty, w, 0.78, fill=CARD, line=LINE, lw=1, adj=0.14)
    shp(s, MSO_SHAPE.OVAL, lx + 0.22, ty + 0.2, 0.38, 0.38, fill=c)
    txt(s, lx + 0.75, ty + 0.14, w - 0.95, 0.4, [{'runs': [(t, 14, CLOUD, True, SEGO)]}])
    txt(s, lx + 0.75, ty + 0.44, w - 0.95, 0.3, [{'runs': [(d, 11.5, MUTE, False, SEGOL)]}], spacing=0.95)
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, M, 6.15, CW, 0.85, fill=RGBColor(0x0D, 0x26, 0x28), line=MINT, lw=1.2, adj=0.14)
txt(s, M + 0.42, 6.35, CW - 0.85, 0.5, [{'runs': [
    ('PRIVACY BY PHYSICS:  ', 16, MINT, True, SEGO),
    ('scenes, keys and health data never leave the phone. The camera is the only sensor.', 16, CLOUD, False, SEGOL)]}])
footer(s)

# ============================================================ 10 THE MAGIC
s = new_slide()
kicker(s, M, 0.55, 'The Proof That Breaks the Market')
display(s, M, 1.0, 11.8, 'We prove it works by showing the silence.', size=40)
sub(s, M, 1.8, 11.8, 'The Silence Log is the competitor-impossible feature: knowing when NOT to speak.', size=15)
console = s.shapes.add_picture(os.path.join(ART, 'console_silence.png'), EMU(M), EMU(2.45), EMU(6.35), EMU(6.35 * 880 / 1700))
rx = M + 6.8
txt(s, rx, 2.5, 5.2, 0.5, [{'runs': [('THE METRIC EVERYONE IGNORES', 13, DIM, True, MONO)]}])
txt(s, rx, 2.85, 5.2, 1.1, [{'runs': [('ATTENTION SAVED', 40, AMBER, False, DISP)]}])
txt(s, rx, 4.0, 5.3, 1.4, [{'runs': [(
    'Every good no-speech is a prevented interruption. Sentinel converts the world into decisions, '
    'and only the right one becomes sound.', 15, MUTE, False, SEGOL)]}], spacing=1.2)
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, rx, 5.15, 5.0, 1.55, fill=CARD, line=LINE, lw=1, adj=0.1)
txt(s, rx + 0.35, 5.4, 4.4, 1.1, [{'runs': [
    ('"car (far)"  ->  silent.  ', 16, MUTE, False, MONO), ('\n', 16, MUTE, False, MONO),
    ('"crosswalk OPEN"  ->  ONE earned line.  ', 16, MINT, True, MONO), ('\n', 16, MUTE, False, MONO),
    ('then silence again.', 16, MUTE, False, SEGOL)]}], spacing=1.3)
footer(s)

# ============================================================ 11 ROADMAP
s = new_slide()
kicker(s, M, 0.55, 'Roadmap')
display(s, M, 1.0, 11.8, 'Prototype proven. Field is the last mile.', size=40)
sub(s, M, 1.8, 11.8, 'The salience-first difference already works in the browser today.', size=15)
road = [
    ('NOW', 'Hardware spine', 'Swap the in-browser haptic stand-in for a LiDAR phone + a real wearable at Haven.pulse().', MINT),
    ('NEXT', 'Field study', '20 blind users, 4 weeks, real streets. Measure attention-saved vs. narrator apps.', AMBER),
    ('THEN', 'Pilot', 'Remote-pilot network + pharmacy translation (EN-Hindi) already prototyped.', VIOLET),
]
for i, (tag, t, d, c) in enumerate(road):
    lx = M + i * (CW / 3 + 0.25)
    w = CW / 3 - 0.25
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, lx, 2.6, w, 3.1, fill=CARD, line=LINE, lw=1, adj=0.07)
    shp(s, MSO_SHAPE.OVAL, lx + w / 2 - 0.6, 2.9, 1.2, 1.2, fill=c)
    txt(s, lx + w / 2 - 0.6, 3.12, 1.2, 0.6, [{'runs': [(tag, 17, INK, True, DISP)], 'align': PP_ALIGN.CENTER}])
    txt(s, lx + 0.4, 4.35, w - 0.8, 0.5, [{'runs': [(t, 17, CLOUD, True, SEGO)], 'align': PP_ALIGN.CENTER}])
    txt(s, lx + 0.45, 4.9, w - 0.9, 0.8, [{'runs': [(d, 13, MUTE, False, SEGOL)], 'align': PP_ALIGN.CENTER}], spacing=1.15)
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, M, 6.15, CW, 0.75, fill=CARD2, line=LINE, lw=1, adj=0.14)
txt(s, M + 0.4, 6.35, CW - 0.8, 0.5, [{'runs': [
    ('The differentiator - salience before speech - is shipped. ', 15, CLOUD, True, SEGO),
    ('The field is the last mile.', 15, MINT, True, SEGO)]}])
footer(s)

# ============================================================ 12 WHY WE WIN / ASK
s = new_slide()
kicker(s, M, 0.55, 'Why Sentinel Wins')
display(s, M, 1.0, 11.8, 'Judge the gap, not the polish.', size=42)
sub(s, M, 1.85, 10.0, 'We stand on a working, deployed, offline-first prototype - and real recordings against the real app.', size=15)
claims = [
    ('1', 'Silence-first salience filter', 'the brain competitors do not have - known-when-NOT-to-speak.'),
    ('2', 'On-device everything', 'privacy by physics - scenes, keys, health never upload.'),
    ('3', 'Deployed + demonstrable', 'PWA live, 3 demo recordings, narrated walkthrough, 23/23 smoke tests green.'),
]
for i, (n, t, d) in enumerate(claims):
    ly = 2.6 + i * 1.15
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, M, ly, CW, 1.0, fill=CARD, line=LINE, lw=1, adj=0.16)
    shp(s, MSO_SHAPE.OVAL, M + 0.28, ly + 0.2, 0.6, 0.6, fill=MINT)
    txt(s, M + 0.28, ly + 0.26, 0.6, 0.5, [{'runs': [(n, 22, INK, True, DISP)], 'align': PP_ALIGN.CENTER}])
    txt(s, M + 1.15, ly + 0.14, 4.1, 0.5, [{'runs': [(t, 17, CLOUD, True, SEGO)]}])
    txt(s, M + 5.5, ly + 0.3, CW - 6.1, 0.5, [{'runs': [(d, 14, MUTE, False, SEGOL)]}])
shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, M, 6.3, CW, 0.65, fill=CARD2, line=MINT, lw=1.2, adj=0.5)
txt(s, M + 0.4, 6.48, CW - 3.2, 0.4, [{'runs': [
    ('Take 40 seconds: ', 15, AMBER, True, SEGO),
    ('sanju-zxt.github.io/sentinel-prototype', 15, CLOUD, True, MONO)]}])
s.shapes.add_picture(os.path.join(ART, 'qr.png'), EMU(SW - M - 1.55), EMU(1.45), EMU(1.5), EMU(1.5))
footer(s)

# ============================================================ 13 THANK YOU
s = new_slide(bg_art=False, hero=(0, 0, SW, SH), scrim=True)
shp(s, MSO_SHAPE.RECTANGLE, 0, SH - 0.16, SW, 0.16, fill=AMBER)
kicker(s, M, 2.0, 'Close')
txt(s, M, 2.45, 11.6, 1.6, [{'runs': [
    ('"The best accessibility feature is ', 34, CLOUD, False, SERIF, True),
    ('one you never notice working.', 34, MINT, False, SERIF, True)]}], spacing=1.1)
txt(s, M, 4.35, 11.6, 0.9, [{'runs': [('Thank you.', 60, CLOUD, False, DISP)]}])
sub(s, M, 5.65, 11.6, 'Sentinel - silence-first, because attention is the scarce resource.', size=17)
txt(s, M, 6.5, 11.6, 0.4, [{'runs': [('sanju-zxt.github.io/sentinel-prototype', 14, MINT, True, MONO)]}])

prs.save(OUT)
print('SAVED', OUT)
print('slides =', len(prs.slides._sldIdLst))
print('bytes  =', os.path.getsize(OUT))