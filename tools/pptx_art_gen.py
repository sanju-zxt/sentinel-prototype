# Sentinel deck visual assets - procedurally generated "AI-style" art (ASCII only)
# Produces: bg_base.png, hero_cover.png, hero_left.png, hero_mid.png, console_silence.png, code.png, qr.png
import os
import math
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'pptx_art')
os.makedirs(ART, exist_ok=True)

W, H = 2560, 1440
FDIR = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts')
F_LIGHT = os.path.join(FDIR, 'segoeuil.ttf')
F_SEMI = os.path.join(FDIR, 'seguisb.ttf')
F_BOLD = os.path.join(FDIR, 'segoeuib.ttf')
F_MONO = os.path.join(FDIR, 'consola.ttf')

INK = (7, 11, 21)
MID = (13, 21, 38)
CARD = (16, 26, 46)
MINT = (0, 229, 195)
AMBER = (255, 180, 94)
VIOLET = (139, 124, 255)
CLOUD = (234, 242, 252)
MUTE = (143, 163, 192)
DIM = (70, 87, 122)
RED = (255, 91, 110)


def solid(size, color):
    return Image.new('RGB', size, color)


def vgrad(size, top, bottom):
    a = np.zeros((size[1], size[0], 3), dtype=np.float32)
    t = np.array(top, dtype=np.float32)
    b = np.array(bottom, dtype=np.float32)
    rows = np.linspace(0, 1, size[1], dtype=np.float32)[:, None, None]
    a[:] = t * (1 - rows) + b * rows
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGB')


def add_glow(img, cx, cy, r, color, strength=0.6):
    px = img.load()
    w, h = img.size
    rc = np.array(color, dtype=np.float32)
    if r <= 0:
        return img
    step = max(1, r // 100)
    for yy in range(cy - r, cy + r, step):
        for xx in range(cx - r, cx + r, step):
            if 0 <= xx < w and 0 <= yy < h:
                d = math.hypot(xx - cx, yy - cy) / r
                if d <= 1:
                    a = (1 - d) ** 2 * strength
                    a = min(a, 1.0)
                    cur = np.array(img.getpixel((xx, yy)), dtype=np.float32)
                    img.putpixel((xx, yy), tuple(np.clip(cur * (1 - a) + rc * a, 0, 255).astype(int)))
    return img.filter(ImageFilter.GaussianBlur(radius=4))


def vignette(img, falloff=1.1, base=0.35):
    w, h = img.size
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w / 2, h / 2
    d = np.sqrt(((xx - cx) / (w * 0.62)) ** 2 + ((yy - cy) / (h * 0.62)) ** 2)
    mask = np.clip(1 - d, 0, 1) ** falloff
    mask = np.clip(mask, 0, 1).astype(np.float32)[..., None]
    arr = np.array(img, dtype=np.float32)
    dark = np.array(INK, dtype=np.float32) * base
    out = arr * mask + dark * (1 - mask)
    return Image.fromarray(np.clip(out, 0, 255).astype('uint8'))


def draw_bokeh(img, w, h, n=40, seed=7):
    rnd = random.Random(seed)
    cols = [MINT, AMBER, VIOLET, CLOUD]
    for _ in range(n):
        x = rnd.randint(0, w)
        y = rnd.randint(0, h)
        r = rnd.randint(3, 26)
        a = rnd.randint(8, 22)
        c = cols[rnd.randint(0, 3)]
        ov = Image.new('RGBA', (r * 2, r * 2), (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        od.ellipse((0, 0, r * 2, r * 2), fill=c + (a,))
        ov = ov.filter(ImageFilter.GaussianBlur(r * 0.45))
        img.paste(ov, (x - r, y - r), ov)


def draw_grid(img, spacing=96, color=DIM, alpha=26):
    d = ImageDraw.Draw(img, 'RGBA')
    w, h = img.size
    for x in range(0, w, spacing):
        d.line((x, 0, x, h), fill=color + (alpha,))
    for y in range(0, h, spacing):
        d.line((0, y, w, y), fill=color + (alpha,))


def radar_rings(img, cx, cy, r, count=4, color=MINT, alpha=110, sweep=True):
    base = img.convert('RGBA')
    ring = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ring)
    for i in range(1, count + 1):
        rr = int(r * i / count)
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=color + (alpha,), width=3)
    if sweep:
        d.pieslice((cx - r, cy - r, cx + r, cy + r), 290, 20, fill=color + (70,))
        d.pieslice((cx - r, cy - r, cx + r, cy + r), 300, 350, fill=color + (40,))
    for i in range(1, count + 1):
        rr = int(r * i / count)
        ang = 300 + i * 23
        p = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
        pd = ImageDraw.Draw(p)
        pd.ellipse((2, 2, 22, 22), fill=MINT + (200,))
        ring.paste(p, (int(cx + rr * math.cos(math.radians(ang))) - 12,
                       int(cy + rr * math.sin(math.radians(ang))) - 12), p)
    img.paste(ring, (0, 0), ring)


def draw_skyline(img, base_y, color=MID, rnd_seed=3):
    rnd = random.Random(rnd_seed)
    d = ImageDraw.Draw(img, 'RGBA')
    x = 0
    while x < img.size[0]:
        bw = rnd.randint(120, 320)
        bh = rnd.randint(120, 520)
        d.rectangle((x, base_y - bh + rnd.randint(-40, 40), x + bw, img.size[1]), fill=color + (235,))
        for wy in range(base_y - bh + 40, img.size[1] - 30, 90):
            for wx in range(x + 25, x + bw - 25, 60):
                if rnd.random() < 0.45:
                    d.rectangle((wx, wy, wx + 16, wy + 22), fill=(255, 214, 130, rnd.randint(30, 90)))
        x += bw + rnd.randint(-40, 60)


def draw_person(img, cx, base_y, scale=1.0, silhouette=MID):
    d = ImageDraw.Draw(img, 'RGBA')
    s = scale
    # soft ground shadow
    d.ellipse((cx - 150 * s, base_y - 34 * s, cx + 150 * s, base_y + 8 * s),
              fill=(0, 0, 0, 110))
    # legs
    d.rectangle((cx - 46 * s, base_y - 330 * s, cx - 8 * s, base_y), fill=silhouette + (255,))
    d.rectangle((cx + 8 * s, base_y - 330 * s, cx + 46 * s, base_y), fill=silhouette + (255,))
    # coat / torso (trapezoid)
    d.polygon([(cx - 96 * s, base_y - 470 * s), (cx + 92 * s, base_y - 470 * s),
               (cx + 52 * s, base_y - 322 * s), (cx - 56 * s, base_y - 322 * s)],
              fill=silhouette + (255,))
    # arm reaching forward with cane (right arm)
    d.polygon([(cx + 88 * s, base_y - 460 * s), (cx + 235 * s, base_y - 470 * s),
               (cx + 224 * s, base_y - 408 * s), (cx + 92 * s, base_y - 430 * s)],
              fill=silhouette + (255,))
    # cane
    d.line((cx + 224 * s, base_y - 470 * s, cx + 150 * s, base_y - 90 * s),
           fill=AMBER + (255,), width=max(3, int(7 * s)))
    d.line((cx + 150 * s, base_y - 90 * s, cx + 60 * s, base_y - 4 * s),
           fill=AMBER + (255,), width=max(3, int(7 * s)))
    # head
    d.ellipse((cx - 40 * s, base_y - 560 * s, cx + 40 * s, base_y - 478 * s),
              fill=silhouette + (255,))
    # haptic belt pulse ring around torso
    rr = Image.new('RGBA', img.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(rr)
    rd.ellipse((cx - 150 * s, base_y - 500 * s, cx + 150 * s, base_y - 300 * s),
               outline=MINT + (190,), width=6)
    rd.ellipse((cx - 176 * s, base_y - 526 * s, cx + 176 * s, base_y - 274 * s),
               outline=MINT + (70,), width=3)
    img.paste(rr, (0, 0), rr)


def draw_traffic_light(img, x, top_y, show='go', s=1.0):
    d = ImageDraw.Draw(img, 'RGBA')
    hgt = 300 * s
    wdt = 120 * s
    # pole
    d.rectangle((x + wdt / 2 - 9 * s, top_y + hgt, x + wdt / 2 + 9 * s, top_y + hgt + 260 * s),
                fill=(30, 40, 60, 255))
    # housing
    d.rounded_rectangle((x, top_y, x + wdt, top_y + hgt), radius=20 * s,
                        fill=(28, 36, 54, 255), outline=(70, 87, 122, 255), width=3)
    cy = top_y + hgt / 2
    offs = [-95 * s, 0, 95 * s]
    colors = [RED, AMBER, MINT]
    active = {'red': 0, 'amber': 1, 'go': 2}[show]
    for i, dy in enumerate(offs):
        c = colors[i]
        r = 26 * s
        if i == active:
            gl = Image.new('RGBA', (int(r * 6), int(r * 6)), (0, 0, 0, 0))
            gd = ImageDraw.Draw(gl)
            gd.ellipse((r * 3 - r, r * 3 - r, r * 3 + r, r * 3 + r), fill=c + (255,))
            gd.ellipse((0, 0, r * 6, r * 6), fill=c + (90,))
            gl = gl.filter(ImageFilter.GaussianBlur(r * 1.2))
            img.paste(gl, (int(x + wdt / 2 - r * 3), int(top_y + hgt / 2 + dy - r * 3)), gl)
            d.ellipse((x + wdt / 2 - r, top_y + hgt / 2 + dy - r,
                       x + wdt / 2 + r, top_y + hgt / 2 + dy + r), fill=c)
        else:
            d.ellipse((x + wdt / 2 - r, top_y + hgt / 2 + dy - r,
                       x + wdt / 2 + r, top_y + hgt / 2 + dy + r), fill=(52, 62, 82, 255),
                      outline=DIM + (200,), width=2)


def crosswalk(img, horizon_y, vanish_x, width_frac=0.98):
    d = ImageDraw.Draw(img, 'RGBA')
    w, h = img.size
    cx = vanish_x
    n = 14
    for i in range(n):
        t = (i + 1) / n
        y0 = horizon_y + (h - horizon_y) * (1 - (1 - t) ** 2)
        y1 = horizon_y + (h - horizon_y) * (1 - (1 - (t + 0.9 / n)) ** 2)
        frac = (1 - t)
        half = w * width_frac * 0.5 * frac * 0.9
        col = MINT + (26,) if i % 2 else (235, 244, 252, 44)
        d.polygon([(cx - half, y0), (cx + half, y0), (cx + half * 1.04, y1), (cx - half * 1.04, y1)],
                  fill=(245, 250, 255, int(14 + 56 * frac)))


def build_hero():
    img = vgrad((W, H), (19, 29, 52), (6, 10, 20))
    add_glow(img, 380, 300, 640, MINT, 0.42)
    add_glow(img, 1050, 760, 640, MINT, 0.38)
    add_glow(img, 2250, 190, 700, VIOLET, 0.36)
    add_glow(img, 2100, 1180, 560, AMBER, 0.28)
    lm = img.convert('RGBA')
    draw_grid(lm)
    draw_bokeh(lm, W, H, 46, seed=11)
    crosswalk(lm, 980, 2550, 0.96)
    draw_skyline(lm, 970, (26, 38, 60), rnd_seed=9)
    radar_rings(lm, 1500, 880, 620, count=4, color=MINT, alpha=150)
    draw_person(lm, 1500, 1240, scale=1.12, silhouette=(2, 5, 12))
    draw_traffic_light(lm, 2100, 720, 'go', s=1.25)
    draw_traffic_light(lm, 320, 700, 'red', s=1.0)
    out = Image.composite(lm, img, lm)
    out = vignette(out, 1.0, 0.25)
    out.save(os.path.join(ART, 'hero_cover.png'))


def build_bg():
    img = vgrad((W, H), (11, 17, 32), (5, 8, 16))
    add_glow(img, 150, 220, 520, MINT, 0.16)
    add_glow(img, 2440, 1330, 560, VIOLET, 0.14)
    lm = img.convert('RGBA')
    draw_bokeh(lm, W, H, 14, seed=3)
    lm = lm.filter(ImageFilter.GaussianBlur(radius=6))
    out = Image.composite(lm, img, lm)
    out = vignette(out, 1.0)
    out.save(os.path.join(ART, 'bg_base.png'))


def crop_hero(name, x0, x1):
    img = Image.open(os.path.join(ART, 'hero_cover.png'))
    c = img.crop((x0, 0, x1, H)).resize((W, H), Image.LANCZOS)
    c.save(os.path.join(ART, name))


def font(path, size):
    return ImageFont.truetype(path, size)


def console_silence():
    cw, ch = 1700, 880
    img = Image.new('RGB', (cw, ch), (10, 15, 26))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, cw, ch), radius=34, fill=(12, 18, 32),
                        outline=(58, 74, 104, 255), width=3)
    # header
    fs = font(F_BOLD, 40)
    d.text((54, 42), 'SILENCE LOG', font=fs, fill=CLOUD)
    fl = font(F_LIGHT, 30)
    d.text((cw - 470, 50), 'attention.saved  =  42', font=fl, fill=MINT)
    d.line((46, 116, cw - 46, 116), fill=(58, 74, 104, 255), width=2)
    rows = [
        ('12:01:37', 'car (far)',   'imminence 2 / action 0', 'rejected', DIM),
        ('12:01:40', 'crowd (dense)', 'imminence 4 / action 1', 'rejected', DIM),
        ('12:01:44', 'kerb ahead',  'imminence 8 / action 4', 'SENT', MINT),
        ('12:01:47', 'phone (steady)', 'imminence 1 / action 0', 'rejected', DIM),
        ('12:01:52', 'crosswalk OPEN', 'imminence 9 / action 7', 'SENT', MINT),
        ('12:01:55', 'traffic (left)', 'imminence 3 / action 1', 'rejected', DIM),
    ]
    fm = font(F_MONO, 30)
    fb = font(F_BOLD, 30)
    fl2 = font(F_LIGHT, 30)
    y = 150
    for t, name, score, status, col in rows:
        d.text((54, y), t, font=fm, fill=MUTE)
        d.text((330, y), name, font=fb, fill=(226, 236, 250, 255))
        d.text((1040, y), score, font=fm, fill=MUTE)
        if status == 'SENT':
            d.rounded_rectangle((1470, y - 6, 1640, y + 42), radius=20, fill=MINT + (255,))
            d.text((1505, y), 'SPOKEN', font=fb, fill=INK)
        else:
            d.rounded_rectangle((1470, y - 6, 1640, y + 42), radius=20,
                                fill=(40, 52, 74, 255))
            d.text((1498, y), 'SILENT', font=fb, fill=MUTE)
        y += 68
    d.text((54, y + 18), 'watched everything  /  spoke twice  =  silence earned  ->  zero notification fatigue',
           font=fl2, fill=AMBER)
    img.save(os.path.join(ART, 'console_silence.png'))


def code_shot():
    cw, ch = 1600, 470
    img = Image.new('RGB', (cw, ch), (10, 15, 26))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, cw, ch), radius=26, fill=(12, 18, 32),
                        outline=(58, 74, 104, 255), width=3)
    f = font(F_MONO, 26)
    lines = [
        ('// SEN.Perception.decide() -- the whole brain', MUTE),
        ('score = imminence  *  actionability  *  (1 - redundancy)', CLOUD),
        ('if score > THRESHOLD and not spoken_recently:', CLOUD),
        ('    Haven.pulse(direction, urgency)       # haptic first', MINT),
        ('    Voice.say(precise_line)              # voice last', AMBER),
        ('else:', CLOUD),
        ('    SilenceLog.append(fact)              # stay quiet', VIOLET),
    ]
    y = 42
    for t, c in lines:
        d.text((58, y), t, font=f, fill=c)
        y += 56
    img.save(os.path.join(ART, 'code.png'))


def qr_code():
    import qrcode
    q = qrcode.QRCode(border=2, box_size=14)
    q.add_data('https://sanju-zxt.github.io/sentinel-prototype/')
    q.make()
    img = q.make_image(fill_color=(7, 11, 21), back_color='white')
    img = img.convert('RGB').resize((640, 640), Image.NEAREST)
    img.save(os.path.join(ART, 'qr.png'))


build_hero()
build_bg()
crop_hero('hero_left.png', 0, 1500)
crop_hero('hero_mid.png', 620, 2560)
console_silence()
code_shot()
qr_code()
print('ART ok ->', sorted(os.listdir(ART)))