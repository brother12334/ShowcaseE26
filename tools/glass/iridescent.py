"""Opaque iridescent shader: chrome and pearl, for the Body screen's shapes.

WHY THIS IS A SECOND SHADER AND NOT A STYLE IN clear.py. Everything else in this folder
is CLEAR glass: light goes through the body, refracts, and the alpha is mostly made of
reflections and a caustic. The Body art is the opposite material. It is opaque, it is
metallic, and its colour is thin-film interference across the surface rather than
anything seen through it. The two share the geometry (glass3d) and the studio (clear's
_env) and nothing else, so they are separate files rather than a flag.

WHAT THIS IS AND IS NOT. The six images in assets/body are renders of sculpted forms and
the package ships no geometry for them, only the flat pictures. A single render does not
contain the shape that made it, so these are NOT those six objects: they are new ones in
the same material and the same family, built so they can actually turn. That is the
owner's decision, taken knowingly; see the commit.

    python3 iridescent.py OUTDIR [name ...]      # frames
    python3 assemble.py OUTDIR ../assets         # sheets
"""
import os
import sys
import numpy as np
from multiprocessing import Pool
from PIL import Image
from scipy import ndimage

import glass3d as G
import clear as C

S = G.S


# ---------------------------------------------------------------- geometry
class Shape(G.Obj):
    """The Body forms. Built here rather than in glass3d because they belong to this
    material: a crumpled sheet and a flower are not part of the clear-glass vocabulary,
    and adding them there would put two unrelated families in one table."""

    def __init__(self, kind, center, size, tilt, **kw):
        s = size * S
        self.kind = kind
        self.R = G.rot(*tilt)
        self.Rinv = self.R.T
        self.r = s * 0.5
        self.kw = kw
        self.bound = s * 0.78 + 4 * S
        self.c = np.array([center[0] * S, center[1] * S, 1.9 * self.r])

    def sdf(self, p):
        q = (p - self.c) @ self.Rinv.T
        r0 = self.r
        k = self.kind
        if k == 'ridge':
            # A ball whose surface is folded by two octaves of ridges. The reference's
            # spheres are this: round in silhouette, rippled all over.
            d = np.linalg.norm(q, axis=1)
            u = q / np.maximum(d, 1e-6)[:, None]
            a = self.kw.get('amp', 0.085)
            f = self.kw.get('freq', 5.2)
            w = (np.sin(f * u[:, 0] + 1.3) * np.sin(f * u[:, 1] + 2.1) * np.sin(f * u[:, 2] + 0.7)
                 + 0.55 * np.sin(2.1 * f * u[:, 1] + 0.4) * np.sin(1.7 * f * u[:, 2] + 2.9))
            return (d - r0 * (1 + a * w)) * 0.45
        if k == 'crumple':
            # A thick sheet pulled into folds: an ellipsoid squashed in z, then creased
            # along one direction so the folds run the way cloth falls.
            sq = q / np.array([1.0, 1.0, 0.62])
            d = np.linalg.norm(sq, axis=1)
            u = sq / np.maximum(d, 1e-6)[:, None]
            f = self.kw.get('freq', 3.4)
            a = self.kw.get('amp', 0.17)
            w = (np.sin(f * u[:, 0] + 0.6) * np.cos(1.4 * f * u[:, 1] - 0.9)
                 + 0.6 * np.sin(2.3 * f * u[:, 1] + 1.8)
                 + 0.35 * np.sin(3.1 * f * u[:, 0] + 2.4) * np.sin(1.9 * f * u[:, 2]))
            return (d - r0 * (0.92 + a * w)) * 0.40
        if k == 'petal':
            # Petals, each an ellipsoid stretched along its own radius and squashed flat,
            # around a small core. Built in each petal's own frame rather than scaling in
            # world axes, which is what melted the first attempt into one lump: a petal
            # pointing diagonally was being squashed on both of its long axes at once.
            n = self.kw.get('petals', 4)
            lift = self.kw.get('lift', 0.18)
            pr = r0 * self.kw.get('pr', 0.38)
            # Broad and flat, not a sausage: the first version divided only the radial
            # axis, so a petal came out as long as it was narrow. Half-extents work out
            # at roughly 0.55 r along the radius, 0.44 across it and 0.13 through, which
            # is a petal.
            long_ = self.kw.get('long', 1.45)
            wide = self.kw.get('wide', 1.15)
            flat = self.kw.get('flat', 0.34)
            d = np.linalg.norm(q / np.array([1.0, 1.0, 0.75]), axis=1) - r0 * 0.17
            for i in range(n):
                th = 2 * np.pi * i / n + 0.35
                ca, sa = np.cos(th), np.sin(th)
                # rotate into the petal's frame: x along its radius, y across it
                px = q[:, 0] * ca + q[:, 1] * sa
                py = -q[:, 0] * sa + q[:, 1] * ca
                pz = q[:, 2]
                # tip the petal up out of the plane
                tz = pz - lift * r0 * (px / np.maximum(r0, 1e-6))
                v = np.stack([(px - r0 * 0.56) / long_, py / wide, tz / flat], 1)
                lobe = np.linalg.norm(v, axis=1) - pr
                d = G.smin(d, lobe, r0 * 0.13)
            return d * 0.52
        return super().sdf(p)


# ---------------------------------------------------------------- material
# base: the metal's own colour. film: how fast the interference hue sweeps and where it
# starts. sat: how far the hue pushes away from the metal. gain: exposure.
# THESE ARE LIT SURFACES, NOT MIRRORS, and getting that wrong cost three passes. A pure
# reflection model takes its brightness from whatever the studio happens to hold behind
# the camera, which over most of a shape facing you is not much, so the shapes came out
# dark and muddy while the reference is bright all over. The body here is wrap-lit and
# coloured by the film; the environment only adds the glints and the edge.
#
# lo / hi: how dark the shadowed side goes and how bright the lit side gets.
# film_f / film_d: how fast the interference hue turns with the facing angle and with
# where the surface points. The second is what lays colour bands across the folds.
STYLES = {
    'chrome': dict(film_a=(0.14, 0.20, 0.98), film_b=(0.45, 0.24, 1.00),
                   film_c=(0.92, 0.32, 0.95),
                   lo=0.11, hi=1.42, pw=1.30, film_f=0.70, film_d=1.05, film_p=0.40,
                   warm=(0.90, 0.30, 1.00), warm_k=0.55,
                   spec=1.45, rim=0.95, rim_pow=2.2, rimcol=(0.70, 0.45, 1.00),
                   glint=1.5, gain=1.00, tone=1.15),
    'pearl':  dict(film_a=(1.00, 0.88, 0.74), film_b=(1.00, 0.62, 0.86),
                   film_c=(0.64, 0.94, 1.00),
                   lo=0.30, hi=0.95, pw=1.15, film_f=0.60, film_d=0.90, film_p=0.05,
                   warm=(1.00, 0.66, 0.86), warm_k=0.45,
                   spec=1.20, rim=0.70, rim_pow=1.9, rimcol=(1.00, 0.88, 0.96),
                   glint=1.3, gain=1.05, tone=1.30),
}

KEY = (-0.45, -0.65, 0.62)      # the window, same one the glass is lit by
FILL = (0.60, 0.35, 0.40)       # the warm counter-light that gives the second hue
SWEEP = (0.35, -0.80, 0.49)     # the axis the interference bands run along


def shade(d, n, st):
    """Glossy iridescent metal. Shares clear.py's studio so these sit in the same room
    as the glass shapes, but the body is lit rather than reflected."""
    cosi = np.clip(-(d * n).sum(1), 0, 1)
    R = d + 2 * cosi[:, None] * n

    # Thin film: the hue turns with the facing angle AND with where the surface points.
    # The facing term alone only varies near the silhouette, which is why an early pass
    # came out one flat purple - the whole body faced the camera and took one hue.
    t = st['film_f'] * (1 - cosi) + st['film_d'] * (R @ C._u(SWEEP)) + st['film_p']
    # A THREE-STOP RAMP, NOT A RAINBOW. The textbook thin-film term is three cosines a
    # third of a cycle apart, which sweeps the whole spectrum and came out as an
    # oil-slick of green and orange. The reference holds a narrow palette - deep blue
    # through violet to magenta, or cream through pink to ice - so the interference
    # drives a position along THOSE three colours instead of around the hue wheel.
    u = 0.5 + 0.5 * np.cos(2 * np.pi * t)
    m1 = np.clip(u * 2, 0, 1)[:, None]
    m2 = np.clip(u * 2 - 1, 0, 1)[:, None]
    A, B, Cc = (np.array(st[k])[None] for k in ('film_a', 'film_b', 'film_c'))
    irid = (A * (1 - m1) + B * m1) * (1 - m2) + Cc * m2

    w1 = np.clip(0.5 + 0.5 * (n @ C._u(KEY)), 0, 1)
    w2 = np.clip(0.5 + 0.5 * (n @ C._u(FILL)), 0, 1)
    col = irid * (st['lo'] + st['hi'] * w1[:, None] ** st['pw'])
    col = col + np.array(st['warm'])[None] * irid * (st['warm_k'] * w2 ** 2)[:, None]

    # Sharp reflection on top, Fresnel-weighted, which is what makes it read as metal.
    fres = 0.06 + 0.94 * (1 - cosi) ** 4
    col = col + C._env(R) * (fres * st['spec'])[:, None] * 0.10

    col = col + np.array(st['rimcol'])[None] * (st['rim'] * (1 - cosi) ** st['rim_pow'])[:, None]

    hv = C._u(KEY)[None] - d
    hv /= np.linalg.norm(hv, axis=1, keepdims=True)
    col = col + (np.clip((n * hv).sum(1), 0, 1) ** 220 * st['glint'])[:, None]

    return 255 * (1 - np.exp(-col * st['gain'] * st['tone']))


def render(out, Wc, Hc, objs, style):
    st = STYLES[style]
    W, H = Wc * S, Hc * S
    sc = G.Scene(objs)
    F = 1500.0 * S
    eye = np.array([W / 2, H / 2, F])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    P = np.stack([xx.ravel(), yy.ravel(), np.zeros(W * H)], 1)
    D = P - eye
    D /= np.linalg.norm(D, axis=1, keepdims=True)
    cm = np.zeros(W * H, bool)
    tin = np.full(W * H, np.inf)
    tout = np.zeros(W * H)
    for o in objs:
        oc = eye - o.c
        b = D @ oc
        disc = b * b - (float(oc @ oc) - o.bound ** 2)
        m = disc > 0
        sq = np.sqrt(np.where(m, disc, 0))
        tin = np.where(m, np.minimum(tin, np.clip(-b - sq, 0, None)), tin)
        tout = np.where(m, np.maximum(tout, -b + sq), tout)
        cm |= m
    cand = np.where(cm)[0]
    o_, d_ = np.repeat(eye[None], len(cand), 0), D[cand]
    t, hit = G.march(sc, o_, d_, tin[cand], tout[cand], steps=180)
    hidx = cand[hit]
    o_, d, t = o_[hit], d_[hit], t[hit]
    n = sc.normal(o_ + d * t[:, None])
    col = shade(d, n, st)

    rgba = np.zeros((W * H, 4))
    rgba[hidx, :3] = np.clip(col, 0, 255)
    rgba[hidx, 3] = 255
    img = rgba.reshape(H, W, 4)
    m = np.zeros(W * H)
    m[hidx] = 1
    m = m.reshape(H, W)
    img[..., 3] = np.clip(ndimage.gaussian_filter(m, 0.7) * 1.6, 0, 1) * 255
    small = (Wc, Hc)
    im = Image.fromarray(img.astype(np.uint8), 'RGBA')
    # premultiply before the downsample so the edge does not pick up black
    a = np.asarray(im).astype(np.float64)
    a[..., :3] *= (a[..., 3:4] / 255)
    im = Image.fromarray(a.astype(np.uint8), 'RGBA').resize(small, Image.LANCZOS)
    b = np.asarray(im).astype(np.float64)
    al = np.maximum(b[..., 3:4], 1e-6) / 255
    b[..., :3] = np.clip(b[..., :3] / al, 0, 255)
    Image.fromarray(b.astype(np.uint8), 'RGBA').save(out, 'WEBP', quality=93, method=6)
    msk = Image.fromarray((np.asarray(im)[..., 3]).astype(np.uint8), 'L')
    Image.merge('RGBA', [Image.new('L', small, 0)] * 3 + [msk]).save(
        out.replace('.webp', '-mask.png'), optimize=True)


# ---------------------------------------------------------------- the set
# name: (frame box, kind, size, tilt, style, spin axis, spins?, extra)
#
# THE BOX IS THE FRAME THE ART IS WRITTEN AT, and it is set from the slot each shape
# occupies on the Body screen multiplied by three, because that is what a 3x phone asks
# for. chrome-crumple sits at 174pt, so 540 covers it with room; chrome-sphere sits at
# 48 and does not need more than 160.
#
# ONLY THREE TURN. The design brief allows three moving pieces to a screen and Body has
# six shapes, so the three that turn are the large ones spread down the page — the
# crumple at the top, the pearl ball in the middle, the orchid near the bottom — and
# they cover both materials. The other three are stills from the same renders.
BODY = {
    'chrome-crumple': (540, 'crumple', 352, (-24, 18, 22),  'chrome', 'y', True,
                       dict(amp=0.19, freq=3.2)),
    'chrome-sphere':  (160, 'ridge',   104, (-14, 22, 8),   'chrome', 'y', False,
                       dict(amp=0.105, freq=7.6)),
    'pearl-crumple':  (380, 'crumple', 248, (18, -14, -28), 'pearl',  'y', False,
                       dict(amp=0.19, freq=3.2)),
    'pearl-sphere':   (360, 'ridge',   234, (10, -26, -6),  'pearl',  'y', True,
                       dict(amp=0.105, freq=7.6)),
    'chrome-orchid':  (520, 'petal',   330, (-52, 8, 14),   'chrome', 'z', True,
                       dict(petals=4, lift=0.22)),
    'pearl-flower':   (260, 'petal',   165, (-48, -6, -20), 'pearl',  'z', False,
                       dict(petals=5, pr=0.34, lift=0.20)),
}
FRAMES = 18
COLS = 6


def job(args):
    name, i, n, out = args
    if os.path.exists(out):
        return
    box, kind, size, tilt, style, axis, _spin, kw = BODY[name]
    o = Shape(kind, (box / 2, box / 2), size, tilt, **kw)
    if n:
        th = np.radians(360.0 * i / n)
        c, s_ = np.cos(th), np.sin(th)
        M = {'x': np.array([[1, 0, 0], [0, c, -s_], [0, s_, c]]),
             'y': np.array([[c, 0, s_], [0, 1, 0], [-s_, 0, c]]),
             'z': np.array([[c, -s_, 0], [s_, c, 0], [0, 0, 1]])}[axis]
        o.R = o.R @ M
        o.Rinv = o.R.T
    render(out, box, box, [o], style)


def sheet(src, name, dest):
    """Lay a shape's frames out in a grid, with the half-size mask glass-motion wants."""
    import glob
    fs = sorted(glob.glob(f'{src}/{name}/[0-9][0-9][0-9].webp'))
    if not fs:
        return None
    n = len(fs)
    rows = -(-n // COLS)
    fw, fh = Image.open(fs[0]).size
    mw, mh = max(1, fw // 2), max(1, fh // 2)
    sp = Image.new('RGBA', (fw * COLS, fh * rows), (0, 0, 0, 0))
    mk = Image.new('LA', (mw * COLS, mh * rows), (0, 0))
    for i, f in enumerate(fs):
        c, r = i % COLS, i // COLS
        sp.paste(Image.open(f), (c * fw, r * fh))
        m = Image.open(f.replace('.webp', '-mask.png')).getchannel('A').resize((mw, mh), Image.LANCZOS)
        mk.paste(Image.merge('LA', [Image.new('L', (mw, mh), 0), m]), (c * mw, r * mh))
    sp.save(f'{dest}/{name}.webp', 'WEBP', quality=90, method=6)
    mk.save(f'{dest}/{name}-mask.png', optimize=True)
    return n, (fw, fh), sp.size


if __name__ == '__main__':
    OUT = os.path.abspath(sys.argv[1])
    args = sys.argv[2:]
    mode = 'stills' if 'stills' in args else ('sheets' if 'sheets' in args else 'loops')
    picked = [a for a in args if a in BODY] or list(BODY)

    if mode == 'sheets':
        dest = os.path.abspath(args[args.index('sheets') + 1])
        os.makedirs(dest, exist_ok=True)
        for name in picked:
            if BODY[name][6]:
                print('sheet', name, sheet(OUT, name, dest), flush=True)
        sys.exit(0)

    jobs = []
    for name in picked:
        if mode == 'stills':
            os.makedirs(f'{OUT}/stills', exist_ok=True)
            jobs.append((name, 0, 0, f'{OUT}/stills/{name}.webp'))
        elif BODY[name][6]:
            d = f'{OUT}/{name}'
            os.makedirs(d, exist_ok=True)
            jobs += [(name, i, FRAMES, f'{d}/{i:03d}.webp') for i in range(FRAMES)]
    print(len(jobs), 'images', flush=True)
    with Pool(min(max(len(jobs), 1), int(os.environ.get('E26_RENDER_JOBS', os.cpu_count() or 1)))) as p:
        for n, _ in enumerate(p.imap_unordered(job, jobs, chunksize=1), 1):
            if n % 6 == 0:
                print(n, '/', len(jobs), flush=True)
    print('done', flush=True)
