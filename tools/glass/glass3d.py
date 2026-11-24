import json
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

S = 2
BG = (10, 10, 10)
INK = (233, 230, 225)
import os
FONT = os.environ.get('E26_FONT', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'fonts', 'InstrumentSans.ttf'))


def text_layer(W, H, lines, px, top, left, track=-0.07, lh=0.82, color=INK, bg=BG, weight=700):
    img = Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT, int(px * S))
    f.set_variation_by_axes([100, weight])
    tr = track * px * S
    lhp = lh * px * S
    asc, desc = f.getmetrics()
    y0 = top * S + (lhp - (asc + desc)) / 2
    for li, line in enumerate(lines):
        x = left * S
        for ch in line:
            d.text((x, y0 + li * lhp), ch, font=f, fill=color)
            x += f.getlength(ch) + tr
    return np.asarray(img).astype(np.float64)


def rot(ax, ay, az):
    ax, ay, az = np.radians([ax, ay, az])
    Rx = np.array([[1, 0, 0], [0, np.cos(ax), -np.sin(ax)], [0, np.sin(ax), np.cos(ax)]])
    Ry = np.array([[np.cos(ay), 0, np.sin(ay)], [0, 1, 0], [-np.sin(ay), 0, np.cos(ay)]])
    Rz = np.array([[np.cos(az), -np.sin(az), 0], [np.sin(az), np.cos(az), 0], [0, 0, 1]])
    return Rx @ Ry @ Rz


def seg(q, u, L, r):
    t = np.clip(q @ u, -L, L)
    return np.linalg.norm(q - t[:, None] * u[None, :], axis=1) - r


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


class Obj:
    """kind: x | capsule | torus | sphere | rbox. sizes in CSS px."""
    def __init__(self, kind, center, size, tilt, z=None, **kw):
        self.kind = kind
        s = size * S
        self.R = rot(*tilt)
        self.Rinv = self.R.T
        if kind == 'x':
            self.r = s * 0.125; self.L = s * 0.5 - self.r; self.bound = s * 0.5 + 4 * S
        elif kind == 'capsule':
            self.r = s * kw.get('thick', 0.17); self.L = s * 0.5 - self.r; self.bound = s * 0.5 + 4 * S
        elif kind == 'torus':
            self.r = s * kw.get('thick', 0.11); self.Rt = s * 0.5 - self.r; self.bound = s * 0.5 + 4 * S
        elif kind == 'sphere':
            self.r = s * 0.5; self.bound = self.r + 4 * S
        elif kind in ('jack', 'star'):
            self.r = s * kw.get('thick', 0.11); self.L = s * 0.5 - self.r; self.bound = s * 0.5 + 4 * S
        elif kind == 'blob':
            self.r = s * 0.24; self.bound = s * 0.6 + 4 * S
        elif kind == 'rbox':
            self.rr = s * 0.12; self.b = np.array([s * 0.5, s * 0.5, s * 0.5]) - self.rr; self.r = s * 0.5; self.bound = s * 0.87 + 4 * S
        zz = (z if z is not None else 2.2) * (self.r if kind != 'rbox' else s * 0.35)
        self.c = np.array([center[0] * S, center[1] * S, zz])

    def sdf(self, p):
        q = (p - self.c) @ self.Rinv.T
        k = self.kind
        if k == 'x':
            a = np.array([1, 1, 0]) / np.sqrt(2); b = np.array([1, -1, 0]) / np.sqrt(2)
            return smin(seg(q, a, self.L, self.r), seg(q, b, self.L, self.r), self.r * 0.45)
        if k == 'capsule':
            return seg(q, np.array([1.0, 0, 0]), self.L, self.r)
        if k == 'jack':
            d = seg(q, np.array([1.0, 0, 0]), self.L, self.r)
            d = smin(d, seg(q, np.array([0, 1.0, 0]), self.L, self.r), self.r * 0.5)
            return smin(d, seg(q, np.array([0, 0, 1.0]), self.L, self.r), self.r * 0.5)
        if k == 'star':
            d = None
            for a in (0, 60, 120):
                u = np.array([np.cos(np.radians(a)), np.sin(np.radians(a)), 0])
                e = seg(q, u, self.L, self.r)
                d = e if d is None else smin(d, e, self.r * 0.5)
            return d
        if k == 'blob':
            pts = [(-0.9, -0.3, 0.1), (0.7, -0.6, -0.2), (0.3, 0.7, 0.3), (-0.4, 0.5, -0.5)]
            rs = [1.0, 0.8, 0.9, 0.65]
            d = None
            for (px, py, pz), rr in zip(pts, rs):
                e = np.linalg.norm(q - np.array([px, py, pz]) * self.r, axis=1) - self.r * rr
                d = e if d is None else smin(d, e, self.r * 0.7)
            return d
        if k == 'torus':
            qx = np.sqrt(q[:, 0] ** 2 + q[:, 1] ** 2) - self.Rt
            return np.sqrt(qx ** 2 + q[:, 2] ** 2) - self.r
        if k == 'sphere':
            return np.linalg.norm(q, axis=1) - self.r
        if k == 'rbox':
            dq = np.abs(q) - self.b
            return np.linalg.norm(np.maximum(dq, 0), axis=1) + np.minimum(dq.max(1), 0) - self.rr


class Scene:
    def __init__(self, objs):
        self.objs = objs

    def sdf(self, p):
        return np.min(np.stack([o.sdf(p) for o in self.objs], 0), 0)

    def normal(self, p):
        e = 0.6 * S
        n = np.stack([self.sdf(p + v) - self.sdf(p - v) for v in (np.array([e, 0, 0]), np.array([0, e, 0]), np.array([0, 0, e]))], 1)
        return n / np.linalg.norm(n, axis=1, keepdims=True)


def march(sc, o, d, t0, tmax, steps=120, inside=False):
    t = t0.copy(); hit = np.zeros(len(o), bool); alive = np.ones(len(o), bool)
    for _ in range(steps):
        idx = np.where(alive)[0]
        if len(idx) == 0:
            break
        s = sc.sdf(o[idx] + d[idx] * t[idx, None])
        if inside:
            s = -s
        done = s < 0.25 * S
        hit[idx[done]] = True; alive[idx[done]] = False
        t[idx[~done]] += np.maximum(s[~done], 0.4 * S)
        far = t[idx] > tmax[idx]
        alive[idx[far & ~done]] = False
    return t, hit


def refract(d, n, eta):
    cosi = -(d * n).sum(1, keepdims=True)
    k = 1 - eta ** 2 * (1 - cosi ** 2)
    tir = (k < 0)[:, 0]
    t = eta * d + (eta * cosi - np.sqrt(np.clip(k, 0, None))) * n
    t[tir] = (d + 2 * cosi * n)[tir]
    return t / np.linalg.norm(t, axis=1, keepdims=True)


def render(out, Wc, Hc, text, objs, tint=(0.95, 0.97, 1.0), bgcol=BG):
    W, H = Wc * S, Hc * S
    bg = text_layer(W, H, bg=bgcol, **text)
    bgb = np.dstack([ndimage.gaussian_filter(bg[..., i], 2.0 * S) for i in range(3)])
    sc = Scene(objs)
    F = 1500.0 * S
    eye = np.array([W / 2, H * 0.45, F])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    P = np.stack([xx.ravel(), yy.ravel(), np.zeros(W * H)], 1)
    D = P - eye; D /= np.linalg.norm(D, axis=1, keepdims=True)
    cand_mask = np.zeros(W * H, bool); tin = np.full(W * H, np.inf); tout = np.zeros(W * H)
    for o in objs:
        oc = eye - o.c; b = D @ oc; disc = b * b - (float(oc @ oc) - o.bound ** 2)
        m = disc > 0
        sq = np.sqrt(np.where(m, disc, 0))
        tin = np.where(m, np.minimum(tin, np.clip(-b - sq, 0, None)), tin)
        tout = np.where(m, np.maximum(tout, -b + sq), tout)
        cand_mask |= m
    cand = np.where(cand_mask)[0]
    o_, d_ = np.repeat(eye[None], len(cand), 0), D[cand]
    t, hit = march(sc, o_, d_, tin[cand], tout[cand])
    hidx = cand[hit]; o_, d, t = o_[hit], d_[hit], t[hit]
    p1 = o_ + d * t[:, None]; n1 = sc.normal(p1)
    cosi = np.clip(-(d * n1).sum(1), 0, 1)
    fres = 0.04 + 0.96 * (1 - cosi) ** 5
    rmax = max(ob.r for ob in objs)
    d_in = refract(d, n1, 1 / 1.34)
    t2, _ = march(sc, p1 + d_in * S, d_in, np.zeros(len(p1)), np.full(len(p1), 8 * rmax), steps=80, inside=True)
    p2 = p1 + d_in * (t2[:, None] + S)
    thick = np.clip(t2 / (2 * rmax), 0, 1.6)
    n2 = -sc.normal(p2)
    trans = np.zeros((len(p1), 3))
    for ci, iorc in enumerate([1.325, 1.34, 1.36]):
        dic = refract(d, n1, 1 / iorc)
        pe = p1 + dic * (t2[:, None] + S)
        dout = refract(dic, n2, iorc)
        s = np.where(dout[:, 2] < -1e-3, -pe[:, 2] / np.minimum(dout[:, 2], -1e-3), 0)
        ph = pe + dout * s[:, None]
        trans[:, ci] = ndimage.map_coordinates(bgb[..., ci], [np.clip(ph[:, 1], 0, H - 1), np.clip(ph[:, 0], 0, W - 1)], order=1)
    trans = trans * np.exp(-0.55 * thick)[:, None] * np.array(tint)
    R = d + 2 * cosi[:, None] * n1
    def lobe(v, w):
        v = np.array(v, float); v /= np.linalg.norm(v)
        return np.exp(-(1 - np.clip(R @ v, -1, 1)) / w)
    env = 1.3 * lobe((-0.55, -0.7, 0.45), 0.05) + 0.8 * lobe((0.8, -0.1, 0.55), 0.025) + 0.35 * lobe((0.0, 0.9, 0.4), 0.12)
    film = 0.5 + 0.5 * np.cos(2 * np.pi * (np.array([0.0, 0.33, 0.67])[None] + 3.0 * (1 - cosi)[:, None] + 0.2))
    refl = 255 * env[:, None] * (0.55 + 0.45 * film)
    def glint(v, p):
        v = np.array(v, float); v /= np.linalg.norm(v)
        hv = v - d; hv /= np.linalg.norm(hv, axis=1, keepdims=True)
        return np.clip((n1 * hv).sum(1), 0, 1) ** p
    gl = glint((-0.5, -0.7, 0.5), 400) * 1.6 + glint((0.7, -0.2, 0.7), 160) * 0.7
    rimw = np.clip((1 - cosi) ** 2.2 * 1.7, 0, 1)[:, None]
    rimcol = 255 * (0.55 + 0.45 * film)
    col = trans * (1 - fres[:, None]) + refl * (0.25 + 0.75 * fres[:, None])
    col = col * (1 - rimw * 0.65) + rimcol * rimw * 0.65 + 255 * gl[:, None]
    img = bg.reshape(-1, 3).copy()
    mask = np.zeros(W * H); mask[hidx] = 1
    m2 = mask.reshape(H, W)
    sh = ndimage.shift(ndimage.gaussian_filter(m2, 20 * S), (26 * S, 14 * S), order=1)
    img = img * (1 - 0.5 * sh.ravel() * (1 - mask))[:, None]
    img[hidx] = np.clip(col, 0, 255)
    img = img.reshape(H, W, 3)
    soft = ndimage.gaussian_filter(m2, 0.7)
    edge = (soft > 0.02) & (soft < 0.98)
    blur = np.dstack([ndimage.gaussian_filter(img[..., i], 0.8) for i in range(3)])
    img[edge] = blur[edge]
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(out, 'WEBP', quality=90, method=6)


def render_sprite(out, Wc, Hc, objs, tint=None):
    W, H = Wc * S, Hc * S
    sc = Scene(objs)
    F = 1500.0 * S
    eye = np.array([W / 2, H / 2, F])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    P = np.stack([xx.ravel(), yy.ravel(), np.zeros(W * H)], 1)
    D = P - eye; D /= np.linalg.norm(D, axis=1, keepdims=True)
    cand_mask = np.zeros(W * H, bool); tin = np.full(W * H, np.inf); tout = np.zeros(W * H)
    for o in objs:
        oc = eye - o.c; b = D @ oc; disc = b * b - (float(oc @ oc) - o.bound ** 2)
        m = disc > 0; sq = np.sqrt(np.where(m, disc, 0))
        tin = np.where(m, np.minimum(tin, np.clip(-b - sq, 0, None)), tin)
        tout = np.where(m, np.maximum(tout, -b + sq), tout)
        cand_mask |= m
    cand = np.where(cand_mask)[0]
    o_, d_ = np.repeat(eye[None], len(cand), 0), D[cand]
    t, hit = march(sc, o_, d_, tin[cand], tout[cand])
    hidx = cand[hit]; o_, d, t = o_[hit], d_[hit], t[hit]
    p1 = o_ + d * t[:, None]; n1 = sc.normal(p1)
    cosi = np.clip(-(d * n1).sum(1), 0, 1)
    fres = 0.04 + 0.96 * (1 - cosi) ** 5
    R = d + 2 * cosi[:, None] * n1
    def lobe(v, w):
        v = np.array(v, float); v /= np.linalg.norm(v)
        return np.exp(-(1 - np.clip(R @ v, -1, 1)) / w)
    env = 1.3 * lobe((-0.55, -0.7, 0.45), 0.04) + 0.8 * lobe((0.8, -0.1, 0.55), 0.02) + 0.1 * lobe((0.0, 0.9, 0.4), 0.08)
    film = 0.5 + 0.5 * np.cos(2 * np.pi * (np.array([0.0, 0.33, 0.67])[None] + 3.0 * (1 - cosi)[:, None] + 0.2))
    refl = 255 * env[:, None] * (0.8 + 0.2 * film)
    def glint(v, p):
        v = np.array(v, float); v /= np.linalg.norm(v)
        hv = v - d; hv /= np.linalg.norm(hv, axis=1, keepdims=True)
        return np.clip((n1 * hv).sum(1), 0, 1) ** p
    gl = glint((-0.5, -0.7, 0.5), 400) * 1.6 + glint((0.7, -0.2, 0.7), 160) * 0.7
    rimw = np.clip((1 - cosi) ** 2.2 * 1.7, 0, 1)[:, None]
    rimcol = 255 * (0.78 + 0.22 * film)
    tv = np.array(tint if tint else (1, 1, 1), float)
    T = refract(d, n1, 1 / 1.42)
    def lobeT(v, w):
        v = np.array(v, float); v /= np.linalg.norm(v)
        return np.exp(-(1 - np.clip(T @ v, -1, 1)) / w)
    inner = 1.0 * lobeT((0.35, 0.8, -0.5), 0.07) + 0.35 * lobeT((-0.7, -0.2, -0.7), 0.05)
    lam = np.clip(n1 @ (np.array([-0.45, -0.6, 0.66]) / np.linalg.norm([-0.45, -0.6, 0.66])), 0, 1)
    body = 255 * (tv * (0.04 + 0.08 * lam)[:, None] + (inner * 0.55)[:, None] * (0.6 + 0.4 * tv)) * (1 - fres[:, None])
    band = np.exp(-(((1 - cosi) - 0.62) / 0.12) ** 2)
    body = body * (1 - 0.55 * band[:, None])
    rimw = np.clip((1 - cosi) ** 3.2 * 2.2, 0, 1)[:, None]
    col = body + refl * (0.3 + 0.8 * fres[:, None])
    col = col * (1 - rimw * 0.7) + rimcol * rimw * 0.7 * (0.6 + 0.4 * tv)
    gl2 = glint((-0.5, -0.7, 0.5), 60) * 0.35
    col = col + 255 * (gl + gl2)[:, None]
    col = np.clip(col, 0, 255)
    a = np.clip(np.maximum(np.maximum(0.14, col.max(1) / 255 * 1.05), 0.5 * band), 0, 1)
    rgba = np.zeros((W * H, 4))
    rgba[hidx, :3] = np.clip(col / a[:, None], 0, 255)
    rgba[hidx, 3] = a * 255
    img = rgba.reshape(H, W, 4)
    m = np.zeros(W * H); m[hidx] = 1; m = m.reshape(H, W)
    soft = ndimage.gaussian_filter(m, 0.7)
    img[..., 3] = img[..., 3] * np.clip(soft * 1.4, 0, 1)
    # soft shadow under the object
    sz = max(W, H)
    sh = ndimage.gaussian_filter(m, sz * 0.035)
    sh = ndimage.shift(sh, (sz * 0.07, sz * 0.035), order=1) * 0.42
    oa = img[..., 3] / 255
    outa = oa + sh * (1 - oa)
    rgb = np.where(outa[..., None] > 0, img[..., :3] * (oa / np.maximum(outa, 1e-6))[..., None], 0)
    img = np.dstack([rgb, outa * 255])
    mk = (np.clip(soft * 1.4, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(np.dstack([np.zeros_like(mk)] * 3 + [mk]), 'RGBA').save(out.replace('.webp', '-mask.png'), optimize=True)
    Image.fromarray(img.astype(np.uint8), 'RGBA').save(out, 'WEBP', quality=90, method=6)


SPRITES = {
    'sphere-s': (110, 110, [('sphere', (55, 55), 96, (0, 0, 0), {})], None),
    'sphere-xs': (56, 56, [('sphere', (28, 28), 48, (0, 0, 0), {})], (0.6, 0.75, 1.0)),
    'capsule-m': (200, 200, [('capsule', (100, 100), 180, (-20, 35, -35), dict(thick=0.18))], None),
    'capsule-amber': (150, 150, [('capsule', (75, 75), 130, (15, -30, 40), dict(thick=0.2))], (1.0, 0.7, 0.35)),
    'torus-m': (200, 200, [('torus', (100, 100), 170, (55, 25, 10), dict(thick=0.13))], (0.6, 0.7, 1.0)),
    'rbox-s': (120, 120, [('rbox', (60, 60), 70, (-25, 35, 20), {})], None),
    'jack': (220, 220, [('jack', (110, 110), 190, (-25, 35, 15), dict(thick=0.11))], None),
    'links': (240, 200, [('torus', (95, 100), 140, (10, 0, 0), dict(thick=0.12)), ('torus', (150, 100), 140, (80, 30, 0), dict(thick=0.12))], (0.8, 0.65, 1.0)),
    'blob': (200, 200, [('blob', (100, 100), 160, (0, 20, 0), {})], (0.75, 0.6, 1.0)),
    'x-s': (130, 130, [('x', (65, 65), 110, (-22, 38, 10), {})], None),
    'star': (210, 210, [('star', (105, 105), 180, (-35, 25, 10), dict(thick=0.1))], (0.6, 0.85, 1.0)),
    'capsule-xs': (80, 80, [('capsule', (40, 40), 68, (10, 30, 60), dict(thick=0.2))], None),
}


SCENES = {
    'rest': dict(Wc=390, Hc=520, text=dict(lines=['rest.'], px=200, top=150, left=-6),
                 objs=[('capsule', (250, 300), 330, (-18, 34, -24), dict(thick=0.17))]),
    'workout': dict(Wc=390, Hc=340, text=dict(lines=['18:42'], px=150, top=110, left=-4),
                    objs=[('torus', (282, 214), 230, (58, 22, 0), dict(thick=0.12))]),
    'history': dict(Wc=390, Hc=440, text=dict(lines=['41'], px=300, top=96, left=-10),
                    objs=[('capsule', (220, 250), 300, (-20, 30, 52), dict(thick=0.2))]),
    'program': dict(Wc=390, Hc=440, text=dict(lines=['ppl.'], px=220, top=110, left=-8),
                    objs=[('capsule', (110, 210), 150, (-10, 30, -40), dict(thick=0.2)),
                          ('capsule', (230, 300), 190, (-20, 38, 20), dict(thick=0.2)),
                          ('capsule', (320, 180), 120, (10, -30, 70), dict(thick=0.2))]),
    'research': dict(Wc=390, Hc=440, text=dict(lines=['62'], px=300, top=96, left=-10),
                     objs=[('sphere', (212, 250), 230, (0, 0, 0), {})]),
    'settings': dict(Wc=390, Hc=420, text=dict(lines=['set', 'tings.'], px=150, top=100, left=-6),
                     objs=[('rbox', (274, 236), 170, (-28, 36, 18), {})]),
}


if __name__ == '__main__':
    outdir = sys.argv[1]
    if len(sys.argv) > 2 and sys.argv[2] == 'sprites':
        for nme, (wc, hc, ob, tint) in SPRITES.items():
            objs = []
            W2, H2 = round(wc * 1.25), round(hc * 1.25)
            for (k, c, sz, t, kw) in ob:
                c2 = (c[0] + (W2 - wc) / 2, c[1] + (H2 - hc) / 2)
                o = Obj(k, c2, sz, t, **kw); o.c[2] = o.bound * 1.05; objs.append(o)
            render_sprite(f'{outdir}/glass-{nme}.webp', W2, H2, objs, tint)
            print('sprite', nme)
        sys.exit()
    names = sys.argv[2:] or list(SCENES)
    for nme in names:
        sc = SCENES[nme]
        objs = [Obj(k, c, s, t, **kw) for (k, c, s, t, kw) in sc['objs']]
        render(f'{outdir}/hero-{nme}.webp', sc['Wc'], sc['Hc'], sc['text'], objs)
        print('done', nme)
