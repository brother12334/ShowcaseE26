"""Turn render_all.py output into the files the app loads.

    python3 assemble.py RENDER_DIR ASSETS_DIR     # e.g.  python3 assemble.py /tmp/render ../assets

Copies stills into heroes/, shapes/, hero-overlays/; builds hero MP4 loops in hero-video/;
builds spin sheets (12 columns, plus a matching -mask.png at half size) in motion/.
Needs: pillow, ffmpeg.
"""
import glob
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

SRC, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
COLS = 12
SHAPE_CAP = 320      # max frame width in a shape sheet (px). Raise for sharper, costs memory.
OVERLAY_CAP = 390    # hero overlay sheets at 1x
FPS_IN, FPS_OUT = 8, 30   # hero loop: rendered at 8 fps, blended up to 30 fps


def hero_video(name, dest):
    frames = sorted(glob.glob(f'{SRC}/{name}/[0-9][0-9][0-9].webp'))
    n = len(frames)
    tmp = tempfile.mkdtemp()
    for i, f in enumerate(frames + frames[:3]):   # extra frames so the loop seam blends
        Image.open(f).convert('RGB').save(f'{tmp}/{i:03d}.png')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS_IN), '-i', f'{tmp}/%03d.png',
                    '-vf', f'minterpolate=fps={FPS_OUT}:mi_mode=blend,format=yuv420p',
                    '-frames:v', str(n * FPS_OUT // FPS_IN), '-c:v', 'libx264', '-preset', 'veryfast',
                    '-crf', '20', '-profile:v', 'high', '-movflags', '+faststart', '-an', dest], check=True)
    shutil.rmtree(tmp)


def sheet(name, base, cap):
    frames = sorted(glob.glob(f'{SRC}/{name}/[0-9][0-9][0-9].webp'))
    masks = [f.replace('.webp', '-mask.png') for f in frames]
    n = len(frames)
    rows = -(-n // COLS)
    w0, h0 = Image.open(frames[0]).size
    s = min(1.0, cap / w0)
    fw, fh = round(w0 * s), round(h0 * s)
    mw, mh = max(1, fw // 2), max(1, fh // 2)
    sp = Image.new('RGBA', (fw * COLS, fh * rows), (0, 0, 0, 0))
    mk = Image.new('LA', (mw * COLS, mh * rows), (0, 0))
    for i, (f, m) in enumerate(zip(frames, masks)):
        c, r = i % COLS, i // COLS
        sp.paste(Image.open(f).convert('RGBA').resize((fw, fh), Image.LANCZOS), (c * fw, r * fh))
        a = Image.open(m).getchannel('A').resize((mw, mh), Image.LANCZOS)
        mk.paste(Image.merge('LA', (Image.new('L', (mw, mh), 0), a)), (c * mw, r * mh))
    sp.save(base + '.webp', 'WEBP', quality=86, method=6)
    mk.save(base + '-mask.png', optimize=True)
    return n, (fw, fh)


if __name__ == '__main__':
    for d in ('heroes', 'shapes', 'hero-overlays', 'hero-video', 'motion'):
        os.makedirs(f'{OUT}/{d}', exist_ok=True)
    for f in glob.glob(f'{SRC}/stills/*'):
        b = os.path.basename(f)
        d = 'heroes' if b.startswith('hero-') else 'hero-overlays' if b.startswith('overlay-') else 'shapes'
        shutil.copy(f, f'{OUT}/{d}/{b}')
    for d in sorted(glob.glob(f'{SRC}/hero-*/')):
        name = os.path.basename(d.rstrip('/'))
        hero_video(name, f'{OUT}/hero-video/{name}.mp4')
        print('video', name, flush=True)
    for name in ('overlay-workout', 'overlay-history'):
        print('sheet', name, sheet(name, f'{OUT}/motion/{name}', OVERLAY_CAP), flush=True)
    for d in sorted(glob.glob(f'{SRC}/glass-*/')):
        name = os.path.basename(d.rstrip('/'))
        print('sheet', name, sheet(name, f'{OUT}/motion/{name}', SHAPE_CAP), flush=True)
