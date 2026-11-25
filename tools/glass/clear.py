"""Clear-glass shader: transparent body, bright studio-window reflections that follow the
form, a dark total-internal-reflection band inside the rim, a focused caustic on the far
side, and a thin rainbow fringe. Reflections are HDR so a 4% Fresnel still reads strongly.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glass3d as G  # noqa: E402

S = G.S


ST = dict(fill_k=1, sheen_k=1, rim_k=1, rim_pow=1.9, film_k=1, film_body=0, band_a=0.30, absorb=0.16, band_dark=0.45, cau_k=1, shadow=0.28, shade=0.0)
STYLES = {
    'S-small': dict(fill_k=2.6, sheen_k=0.9, rim_k=1.1, rim_pow=2.3, film_k=1.6, film_body=0.12, band_a=0.4, absorb=0.1, band_dark=0.2, cau_k=1.7, shadow=0.5, shade=0.5),
    'A-bubble':  dict(fill_k=0.0, sheen_k=0.15, rim_k=0.85, rim_pow=3.0, film_k=2.2, film_body=0.10, band_a=0.06, absorb=0.03, band_dark=0.05, cau_k=0.7),
    'B-crystal': dict(fill_k=0.15, sheen_k=0.35, rim_k=1.1, rim_pow=2.5, film_k=1.0, film_body=0.0, band_a=0.15, absorb=0.07, band_dark=0.2, cau_k=1.0),
    'C-soapfilm': dict(fill_k=0.0, sheen_k=0.1, rim_k=0.6, rim_pow=3.4, film_k=3.0, film_body=0.34, band_a=0.04, absorb=0.02, band_dark=0.0, cau_k=0.5),
}


def set_style(name):
    ST.update(STYLES[name])


def _u(v):
    v = np.array(v, float)
    return v / np.linalg.norm(v)


# TURN THE STUDIO, NOT THE BALL. A perfect sphere is the same shape from every angle and
# its highlights come from this environment rather than from its surface, so rotating the
# object renders an identical frame — measured at 0.8 of 255 over a full turn. Rotating
# the environment instead sweeps the window panes and the strip light across the glass,
# which is what a turning object looks like and is still rendered rather than faked with
# a transform. render_all.py sets this per frame for the shapes in ENVSPIN and clears it
# afterwards; None means the studio sits still, which is every other render.
ENV_ROT = None


def _env(R):
    """RGB HDR studio: a paned window top-left, a tall strip light right, a cool sky ring on
    top, a warm floor bounce, and a faint horizon gradient."""
    if ENV_ROT is not None:
        R = R @ ENV_ROT
    def lobe(v, w):
        return np.exp(-(1 - np.clip(R @ _u(v), -1, 1)) / w)

    def rect(c, e1, a, b, soft, bars=0.0):
        c = _u(c); e1 = _u(e1 - (e1 @ c) * c); e2 = np.cross(c, e1)
        u, v = R @ e1, R @ e2
        f = (R @ c) > 0
        m = (1 / (1 + np.exp((np.abs(u) - a) / soft))) * (1 / (1 + np.exp((np.abs(v) - b) / soft)))
        if bars:
            m = m * (1 - 0.92 * (np.exp(-(u / bars) ** 2) + np.exp(-(v / bars) ** 2)).clip(0, 1))
        return m * f

    box = 12.0 * rect((-0.50, -0.68, 0.53), (1, 0, 0.4), 0.30, 0.18, 0.03, bars=0.022) + 5.0 * lobe((-0.50, -0.70, 0.50), 0.02)
    strip = 8.0 * rect((0.88, -0.05, 0.47), (0, 1, 0), 0.32, 0.05, 0.02) + 3.0 * rect((-0.1, 0.8, 0.6), (1, 0, 0), 0.25, 0.04, 0.02)
    top = 3.0 * lobe((0.05, -0.98, 0.2), 0.05)
    bounce = 1.8 * lobe((0.25, 0.88, 0.42), 0.14)
    hz = np.exp(-(R[:, 1] / 0.35) ** 2)
    col = (box[:, None] * np.array([1.0, 0.98, 0.95]) + strip[:, None] * np.array([0.85, 0.93, 1.0])
           + top[:, None] * np.array([0.8, 0.9, 1.0]) + bounce[:, None] * np.array([0.92, 0.94, 1.0])
           + (0.05 + 0.08 * hz)[:, None] * np.array([0.85, 0.9, 1.0]))
    return col


def back_reflection(d_in, n2_in, k=3.6):
    """Reflection off the INSIDE of the back surface: the inverted second window you see
    on the opposite side of every real bubble. n2_in points inward."""
    c2 = np.clip(-(d_in * n2_in).sum(1), 0, 1)
    r2 = d_in + 2 * c2[:, None] * n2_in
    f2 = 0.04 + 0.96 * (1 - c2) ** 5
    return _env(r2) * (f2 * k)[:, None]


def clear_shade(d, n1, tint=(0.94, 0.97, 1.0), caustic=1.0, back=None):
    cosi = np.clip(-(d * n1).sum(1), 0, 1)
    fres = 0.04 + 0.96 * (1 - cosi) ** 5
    R = d + 2 * cosi[:, None] * n1
    T = G.refract(d, n1, 1 / 1.45)
    tv = np.array(tint, float)

    def lobeT(v, w):
        return np.exp(-(1 - np.clip(T @ _u(v), -1, 1)) / w)

    # light that passes through the glass and focuses on the far side (the bright crescent)
    cau = caustic * ST['cau_k'] * (4.2 * lobeT((0.45, 0.72, -0.5), 0.035) + 0.9 * lobeT((-0.7, -0.2, -0.68), 0.025))
    refl = _env(R) * fres[:, None] * 3.4
    # fringe: reflection splits slightly by wavelength near the edge
    film = 0.5 + 0.5 * np.cos(2 * np.pi * (np.array([0.0, 0.33, 0.67])[None] + 2.2 * (1 - cosi)[:, None] + 0.1))
    rim = np.clip((1 - cosi) ** 3.0, 0, 1)[:, None]
    col = refl * (0.85 + 0.15 * film) + (cau * (1 - fres))[:, None] * tv[None] * 0.55
    side = np.exp(-(1 - np.clip(R @ _u((-0.5, -0.68, 0.53)), -1, 1)) / 0.5)
    rl = ((1 - cosi) ** ST['rim_pow'] * (0.5 + 1.2 * side) * ST['rim_k'])[:, None]
    lam = np.clip(n1 @ _u((-0.45, -0.65, 0.62)), 0, 1)
    sheen = ST['sheen_k'] * (0.2 * np.exp(-(1 - np.clip(R @ _u((-0.45, -0.6, 0.65)), -1, 1)) / 0.38) + 0.07 * lam)
    fill = (0.03 + 0.05 * lam) * ST['fill_k']
    vol = 1 - ST['shade'] * (1 - lam) ** 1.2 * (0.55 + 0.45 * (1 - cosi))
    col = col * vol[:, None] + (sheen + fill)[:, None] * tv[None] + rl * (0.75 + 0.25 * film) + rim * film * 0.3 * ST['film_k'] + film * ST['film_body'] * ((1 - cosi) ** 1.3)[:, None]
    # tight glints
    hv = _u((-0.5, -0.7, 0.5))[None] - d
    hv /= np.linalg.norm(hv, axis=1, keepdims=True)
    col = col + (np.clip((n1 * hv).sum(1), 0, 1) ** 500 * 2.2)[:, None]
    if back is not None:
        col = col + back
    col = 255 * (1 - np.exp(-col * 1.1))            # filmic tone-map so highlights roll off
    lum = col.max(1) / 255
    # dark band where light is totally internally reflected, just inside the rim
    band = np.exp(-(((1 - cosi) - 0.62) / 0.13) ** 2)
    a = np.clip(0.03 + 1.1 * lum + ST['band_a'] * band + 0.25 * (1 - cosi) ** 3, 0, 1)
    return col, a, band


def render_clear_sprite(out, Wc, Hc, objs, tint=(0.94, 0.97, 1.0), caustic=1.0, *, lossless=False, camera_scale=1):
    W, H = Wc * S, Hc * S
    sc = G.Scene(objs)
    F = 1500.0 * S * camera_scale
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
    t, hit = G.march(sc, o_, d_, tin[cand], tout[cand])
    hidx = cand[hit]
    o_, d, t = o_[hit], d_[hit], t[hit]
    n1 = sc.normal(o_ + d * t[:, None])
    p1 = o_ + d * t[:, None]
    rmax = max(ob.r for ob in objs)
    t2, _ = G.march(sc, p1 + d * S, d, np.zeros(len(p1)), np.full(len(p1), 8 * rmax), steps=80, inside=True)
    p2 = p1 + d * (t2[:, None] + S)
    n2 = -sc.normal(p2)
    back = back_reflection(d, n2)
    col, a, _ = clear_shade(d, n1, tint, caustic, back)
    rgba = np.zeros((W * H, 4))
    rgba[hidx, :3] = np.clip(col / np.maximum(a, 1e-3)[:, None], 0, 255)
    rgba[hidx, 3] = a * 255
    img = rgba.reshape(H, W, 4)
    m = np.zeros(W * H)
    m[hidx] = 1
    m = m.reshape(H, W)
    soft = ndimage.gaussian_filter(m, 0.7)
    img[..., 3] = img[..., 3] * np.clip(soft * 1.4, 0, 1)
    # faint contact shadow so it sits on the page
    sz = max(W, H)
    sh = ndimage.shift(ndimage.gaussian_filter(m, sz * 0.03), (sz * 0.07, sz * 0.035), order=1) * ST['shadow']
    oa = img[..., 3] / 255
    outa = oa + sh * (1 - oa)
    rgb = np.where(outa[..., None] > 0, img[..., :3] * (oa / np.maximum(outa, 1e-6))[..., None], 0)
    img = np.dstack([rgb, outa * 255])
    mk = (np.clip(soft * 1.4, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(np.dstack([np.zeros_like(mk)] * 3 + [mk]), 'RGBA').save(out.replace('.webp', '-mask.png'), optimize=True)
    Image.fromarray(img.astype(np.uint8), 'RGBA').save(out, 'WEBP', quality=92, method=4 if lossless else 6, lossless=lossless)


def render_clear_hero(out, Wc, Hc, text, objs, text_fn=None, tint=(0.95, 0.97, 1.0), bgcol=G.BG):
    W, H = Wc * S, Hc * S
    bg = text_fn() if text_fn else G.text_layer(W, H, bg=bgcol, **text)
    bgb = np.dstack([ndimage.gaussian_filter(bg[..., i], 1.4 * S) for i in range(3)])
    sc = G.Scene(objs)
    F = 1500.0 * S
    eye = np.array([W / 2, H * 0.45, F])
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
    t, hit = G.march(sc, o_, d_, tin[cand], tout[cand])
    hidx = cand[hit]
    o_, d, t = o_[hit], d_[hit], t[hit]
    p1 = o_ + d * t[:, None]
    n1 = sc.normal(p1)
    cosi = np.clip(-(d * n1).sum(1), 0, 1)
    fres = 0.04 + 0.96 * (1 - cosi) ** 5
    rmax = max(ob.r for ob in objs)
    d_in = G.refract(d, n1, 1 / 1.4)
    t2, _ = G.march(sc, p1 + d_in * S, d_in, np.zeros(len(p1)), np.full(len(p1), 8 * rmax), steps=80, inside=True)
    p2 = p1 + d_in * (t2[:, None] + S)
    thick = np.clip(t2 / (2 * rmax), 0, 1.6)
    n2 = -sc.normal(p2)
    trans = np.zeros((len(p1), 3))
    for ci, iorc in enumerate([1.325, 1.35, 1.375]):
        dic = G.refract(d, n1, 1 / iorc)
        pe = p1 + dic * (t2[:, None] + S)
        dout = G.refract(dic, n2, iorc)
        s = np.where(dout[:, 2] < -1e-3, -pe[:, 2] / np.minimum(dout[:, 2], -1e-3), 0)
        ph = pe + dout * s[:, None]
        trans[:, ci] = ndimage.map_coordinates(bgb[..., ci], [np.clip(ph[:, 1], 0, H - 1), np.clip(ph[:, 0], 0, W - 1)], order=1)
    trans = trans * np.exp(-ST['absorb'] * thick)[:, None] * np.array(tint)
    # reflections + caustic from the shared shader (colour only; alpha unused over text)
    col_r, _, band = clear_shade(d, n1, tint, 1.0, back_reflection(d_in, n2))
    # darker band inside the rim, like the reference bubble
    trans = trans * (1 - ST['band_dark'] * band)[:, None]
    col = trans * (1 - fres[:, None]) + col_r
    img = bg.reshape(-1, 3).copy()
    mask = np.zeros(W * H)
    mask[hidx] = 1
    m2 = mask.reshape(H, W)
    sh = ndimage.shift(ndimage.gaussian_filter(m2, 22 * S), (26 * S, 14 * S), order=1)
    img = img * (1 - 0.42 * sh.ravel() * (1 - mask))[:, None]
    img[hidx] = np.clip(col, 0, 255)
    img = img.reshape(H, W, 3)
    soft = ndimage.gaussian_filter(m2, 0.7)
    edge = (soft > 0.02) & (soft < 0.98)
    blur = np.dstack([ndimage.gaussian_filter(img[..., i], 0.8) for i in range(3)])
    img[edge] = blur[edge]
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(out, 'WEBP', quality=92, method=6)
