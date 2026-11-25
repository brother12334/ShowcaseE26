"""Element 26 glass renderer. Regenerates every glass image in assets/ from the settings below.

    python3 render_all.py OUTDIR            # everything
    python3 render_all.py OUTDIR stills     # just the still images (fast, about 2 min)
    python3 render_all.py OUTDIR hero-today-push-b sp-star   # only the named sets

Then run `python3 assemble.py OUTDIR ../assets` to turn the frames into MP4s and sheets.

Everything you would want to change is in the three config blocks below:
  STYLE   : the glass material ("A-bubble" is the shipped look; edit STYLES in clear.py)
  SHAPES  : each small shape: size, tilt, thickness, spin axis, how crisp (k)
  HEROES  : each hero: object, tilt, position, word, motion (spin or sway)
Requires: python3, numpy, scipy, pillow. ffmpeg for assemble.py.
"""
import os
import sys
from multiprocessing import Pool

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import glass3d as G  # noqa: E402
import clear as C  # noqa: E402

# ------------------------------------------------------------------ config

STYLE = 'A-bubble'          # a key of clear.STYLES
HERO_FRAMES = 30            # frames in a hero loop (played at 8 fps, smoothed to 30 fps)
OVERLAY_FRAMES = 18
SHAPE_FRAMES = 36           # frames in a shape's spin sheet
GLASS_TINT = (0.94, 0.97, 1.0)   # slight cool cast; (1,1,1) is neutral, try (1,0.9,0.95) for warm

# name: (box_w, box_h, [(kind, center_xy, size, tilt_xyz_deg, extra)], crispness k)
# kind: sphere capsule torus rbox x jack star blob.  `k` renders k times larger then scales
# down, which keeps window bars and rims crisp on small shapes (use 3 to 4 under 100px).
SHAPES = {
    'sphere-s':      (110, 110, [('sphere', (55, 55), 96, (0, 0, 0), {})], 2.5),
    'sphere-xs':     (74, 74, [('sphere', (37, 37), 64, (0, 0, 0), {})], 4),
    'capsule-m':     (200, 200, [('capsule', (100, 100), 180, (-20, 35, -35), dict(thick=0.22))], 1.5),
    'capsule-amber': (150, 150, [('capsule', (75, 75), 130, (15, -30, 40), dict(thick=0.24))], 2),
    'capsule-xs':    (104, 104, [('capsule', (52, 52), 88, (10, 30, 60), dict(thick=0.24))], 3),
    'torus-m':       (200, 200, [('torus', (100, 100), 170, (55, 25, 10), dict(thick=0.17))], 1.5),
    'rbox-s':        (120, 120, [('rbox', (60, 60), 70, (-25, 35, 20), {})], 2.5),
    'jack':          (220, 220, [('jack', (110, 110), 190, (-25, 35, 15), dict(thick=0.14))], 1.5),
    'links':         (240, 200, [('torus', (95, 100), 140, (10, 0, 0), dict(thick=0.15)),
                                 ('torus', (150, 100), 140, (80, 30, 0), dict(thick=0.15))], 1.5),
    'blob':          (200, 200, [('blob', (100, 100), 160, (0, 20, 0), {})], 1.5),
    'x-s':           (130, 130, [('x', (65, 65), 110, (-22, 38, 10), dict(thick=0.17))], 2),
    'star':          (210, 210, [('star', (105, 105), 180, (-35, 25, 10), dict(thick=0.13))], 1.5),
}
# which shapes get a spin sheet: (axis in the shape's own space, degrees for one seamless loop)
SPIN = {'x-s': ('z', 90), 'star': ('z', 60), 'jack': ('z', 90), 'rbox-s': ('z', 90),
        'torus-m': ('x', 180), 'capsule-m': ('z', 180), 'capsule-amber': ('z', 180),
        'capsule-xs': ('z', 180), 'blob': ('y', 360)}

CYCLE_DAYS = {'push-a': ['push', 'a.'], 'push-b': ['push', 'b.'], 'pull-a': ['pull', 'a.'],
              'pull-b': ['pull', 'b.'], 'legs-a': ['legs', 'a.'], 'legs-b': ['legs', 'b.']}

# Heroes drawn over a baked word. canvas (w, h) in CSS px; objects as in SHAPES.
# motion: 'spin' turns the first object about its own axis; 'sway' rocks every object gently.
HEROES = {
    'today':    dict(canvas=(390, 640), text=dict(px=178, top=132, left=-8), motion='spin',
                     objs=[('x', (258, 330), 470, (-22, 38, 10), {})], spin=('z', 90)),
    'rest':     dict(canvas=(390, 520), text=dict(lines=['rest.'], px=200, top=150, left=-6), motion='sway',
                     objs=[('capsule', (250, 300), 330, (-18, 34, -24), dict(thick=0.17))]),
    'program':  dict(canvas=(390, 440), text=dict(lines=['ppl.'], px=220, top=110, left=-8), motion='sway',
                     objs=[('capsule', (110, 210), 150, (-10, 30, -40), dict(thick=0.2)),
                           ('capsule', (230, 300), 190, (-20, 38, 20), dict(thick=0.2)),
                           ('capsule', (320, 180), 120, (10, -30, 70), dict(thick=0.2))]),
    'settings': dict(canvas=(390, 420), text=dict(lines=['set', 'tings.'], px=150, top=100, left=-6), motion='spin',
                     objs=[('rbox', (274, 236), 170, (-28, 36, 18), {})], spin=('z', 90)),
    # stills only (their number is live text in the app, the glass is an overlay)
    'workout':  dict(canvas=(390, 340), text=dict(lines=['18:42'], px=150, top=110, left=-4), motion='spin',
                     objs=[('torus', (282, 214), 230, (58, 22, 0), dict(thick=0.12))], spin=('x', 180), overlay=True),
    'history':  dict(canvas=(390, 440), text=dict(lines=['41'], px=300, top=96, left=-10), motion='sway',
                     objs=[('capsule', (232, 252), 314, (-16, 24, 49), dict(thick=0.235))], overlay=True),
    'research': dict(canvas=(390, 440), text=dict(lines=['62'], px=300, top=96, left=-10), motion='orbit',
                     objs=[('sphere', (227, 244), 222, (0, 0, 0), {})], overlay=True),
}

# ------------------------------------------------------------------ helpers


def axis_rot(axis, deg):
    t = np.radians(deg)
    c, s = np.cos(t), np.sin(t)
    return {'x': np.array([[1, 0, 0], [0, c, -s], [0, s, c]]),
            'y': np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]]),
            'z': np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])}[axis]


def turn(o, axis, deg):
    o.R = o.R @ axis_rot(axis, deg)
    o.Rinv = o.R.T
    return o


def premul_resize(path, size):
    im = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32) / 255
    pm = im.copy()
    pm[..., :3] *= pm[..., 3:4]
    ch = [np.asarray(Image.fromarray((pm[..., i] * 255).astype(np.uint8)).resize(size, Image.LANCZOS)).astype(np.float32) / 255
          for i in range(4)]
    out = np.dstack(ch)
    a = np.maximum(out[..., 3:4], 1e-4)
    return Image.fromarray((np.dstack([np.clip(out[..., :3] / a, 0, 1), out[..., 3:4]]) * 255).astype(np.uint8), 'RGBA')


def text_for(h, lines=None):
    cv = h['canvas']
    t = dict(h['text'])
    if lines:
        t['lines'] = lines
    return lambda: G.text_layer(cv[0] * G.S, cv[1] * G.S, **t)

# ------------------------------------------------------------------ jobs


def job_shape(args):
    """Small shape frame. i is the frame index; spin names the loop (None for a still)."""
    name, i, n, out = args
    if os.path.exists(out):
        return
    C.set_style(STYLE)
    wc, hc, ob, k = SHAPES[name]
    W2, H2 = round(wc * 1.25), round(hc * 1.25)
    objs = []
    for (kind, c, sz, tilt, kw) in ob:
        o = G.Obj(kind, ((c[0] + (W2 - wc) / 2) * k, (c[1] + (H2 - hc) / 2) * k), sz * k, tilt, **kw)
        o.c[2] = o.bound * 1.05
        if n and name in SPIN:
            turn(o, SPIN[name][0], SPIN[name][1] * i / n)
        objs.append(o)
    tmp = out.replace('.webp', '.tmp.webp')
    C.render_clear_sprite(tmp, round(W2 * k), round(H2 * k), objs, GLASS_TINT)
    size = (W2 * 2, H2 * 2)
    premul_resize(tmp, size).save(out, 'WEBP', quality=92, method=6)
    m = Image.open(tmp.replace('.webp', '-mask.png')).getchannel('A').resize(size, Image.LANCZOS)
    Image.merge('RGBA', [Image.new('L', size, 0)] * 3 + [m]).save(out.replace('.webp', '-mask.png'), optimize=True)
    os.remove(tmp)
    os.remove(tmp.replace('.webp', '-mask.png'))


def hero_objs(h, i, n):
    objs = []
    for j, (kind, c, sz, tilt, kw) in enumerate(h['objs']):
        if h['motion'] == 'orbit' and n:
            phase = 2 * np.pi * i / n
            c = (c[0] + 12 * np.sin(phase), c[1] - 6 * (1 - np.cos(phase)))
        o = G.Obj(kind, c, sz, tilt, **kw)
        if h['motion'] == 'spin' and j == 0 and n:
            turn(o, h['spin'][0], h['spin'][1] * i / n)
        elif h['motion'] == 'sway' and n:
            ph = 2 * np.pi * i / n
            o.R = o.R @ axis_rot('z', 12 * np.sin(ph + j * 2.1)) @ axis_rot('y', 7 * np.cos(ph + j * 2.1))
            o.Rinv = o.R.T
        objs.append(o)
    return objs


def job_hero(args):
    """Glass over its baked word. name like 'today-push-b' or 'rest'. Writes an opaque WEBP."""
    name, i, n, out = args
    if os.path.exists(out):
        return
    C.set_style(STYLE)
    key, _, day = name.partition('-')
    h = HEROES[key]
    lines = CYCLE_DAYS[day] if key == 'today' else None
    cv = h['canvas']
    C.render_clear_hero(out, cv[0], cv[1], h['text'], hero_objs(h, i, n), text_fn=text_for(h, lines), tint=GLASS_TINT)


def job_overlay(args):
    """Text-free glass for heroes whose number is live text. WEBP + mask."""
    key, i, n, out = args
    if os.path.exists(out):
        return
    C.set_style('A-bubble' if STYLE not in C.STYLES else STYLE)
    h = HEROES[key]
    cv = h['canvas']
    C.render_clear_sprite(out, cv[0], cv[1], hero_objs(h, i, n), GLASS_TINT)


def run(job):
    kind, args = job
    try:
        {'shape': job_shape, 'hero': job_hero, 'overlay': job_overlay}[kind](args)
    except Exception as e:  # keep the pool alive, report at the end
        return f'{kind} {args}: {e!r}'


def build_jobs(OUT, want):
    jobs = []

    def on(tag):
        return not want or tag in want or (tag.split('-')[0] in want)
    if on('stills'):
        os.makedirs(f'{OUT}/stills', exist_ok=True)
        for s in SHAPES:
            jobs.append(('shape', (s, 0, 0, f'{OUT}/stills/glass-{s}.webp')))
        for day in CYCLE_DAYS:
            jobs.append(('hero', (f'today-{day}', 0, 0, f'{OUT}/stills/hero-today-{day}.webp')))
        for key in ('rest', 'program', 'settings', 'workout', 'history', 'research'):
            jobs.append(('hero', (key, 0, 0, f'{OUT}/stills/hero-{key}.webp')))
        for key in ('workout', 'history', 'research'):
            jobs.append(('overlay', (key, 0, 0, f'{OUT}/stills/overlay-{key}.webp')))
        jobs.append(('overlay', ('today', 0, 0, f'{OUT}/stills/overlay-today.webp')))
    for key in ('history', 'research'):
        if f'overlay-still-{key}' in want:
            os.makedirs(f'{OUT}/stills', exist_ok=True)
            jobs.append(('overlay', (key, 0, 0, f'{OUT}/stills/overlay-{key}.webp')))
    for key in ('history', 'research'):
        if not want or 'loops' in want or f'overlay-{key}' in want:
            directory = f'{OUT}/overlay-{key}'
            os.makedirs(directory, exist_ok=True)
            jobs += [('overlay', (key, i, OVERLAY_FRAMES, f'{directory}/{i:03d}.webp'))
                     for i in range(OVERLAY_FRAMES)]
    if not want or 'loops' in want:
        for day in CYCLE_DAYS:
            d = f'{OUT}/hero-today-{day}'
            os.makedirs(d, exist_ok=True)
            jobs += [('hero', (f'today-{day}', i, HERO_FRAMES, f'{d}/{i:03d}.webp')) for i in range(HERO_FRAMES)]
        for key in ('rest', 'program', 'settings'):
            d = f'{OUT}/hero-{key}'
            os.makedirs(d, exist_ok=True)
            jobs += [('hero', (key, i, HERO_FRAMES, f'{d}/{i:03d}.webp')) for i in range(HERO_FRAMES)]
        for key in ('workout',):
            d = f'{OUT}/overlay-{key}'
            os.makedirs(d, exist_ok=True)
            jobs += [('overlay', (key, i, SHAPE_FRAMES, f'{d}/{i:03d}.webp')) for i in range(SHAPE_FRAMES)]
        for s in SPIN:
            d = f'{OUT}/glass-{s}'
            os.makedirs(d, exist_ok=True)
            jobs += [('shape', (s, i, SHAPE_FRAMES, f'{d}/{i:03d}.webp')) for i in range(SHAPE_FRAMES)]
    for tag in want:
        if tag.startswith('hero-') and not os.path.isdir(f'{OUT}/{tag}'):
            os.makedirs(f'{OUT}/{tag}', exist_ok=True)
            jobs += [('hero', (tag[5:], i, HERO_FRAMES, f'{OUT}/{tag}/{i:03d}.webp')) for i in range(HERO_FRAMES)]
        if tag.startswith('sp-') and tag[3:] in SPIN:
            os.makedirs(f'{OUT}/glass-{tag[3:]}', exist_ok=True)
            jobs += [('shape', (tag[3:], i, SHAPE_FRAMES, f'{OUT}/glass-{tag[3:]}/{i:03d}.webp')) for i in range(SHAPE_FRAMES)]
    return jobs


if __name__ == '__main__':
    OUT = os.path.abspath(sys.argv[1])
    want = set(sys.argv[2:])
    os.makedirs(OUT, exist_ok=True)
    if any(tag.startswith('overlay-still-') for tag in want):
        G.S = C.S = 3
    jobs = build_jobs(OUT, want)
    print(len(jobs), 'images', flush=True)
    with Pool(min(len(jobs) or 1, int(os.environ.get('E26_RENDER_JOBS', os.cpu_count() or 1)))) as p:
        errs = []
        for n, e in enumerate(p.imap_unordered(run, jobs, chunksize=2), 1):
            if e:
                errs.append(e)
            if n % 25 == 0:
                print(f'{n}/{len(jobs)}', flush=True)
    print('errors:', errs[:5], flush=True)
