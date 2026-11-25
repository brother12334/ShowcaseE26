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
OVERLAY_CAP = 390    # legacy workout overlay
HQ_OVERLAYS = {"overlay-history", "overlay-research"}
# Shapes placed too large for a 320px frame. sphere-s sits at 138pt on the paper page,
# which is 414 device pixels on a 3x phone; 440 covers it with room to spare. The cost is
# a 5280x1320 sheet, about 28 MB decoded, on the one screen that uses it.
HQ_SHAPES = {"glass-sphere-s": 440, "glass-rbox-s": 380}
FPS_IN, FPS_OUT = 8, 30   # hero loop: rendered at 8 fps, blended up to 30 fps
VID_IN, VID_OUT = 10, 30  # a shape's loop: 20 rendered frames become a 6-second turn


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


def shape_video(name, dest):
    """A decorative shape as a seamless MP4, rendered on black.

    THE SAME THING TODAY'S HERO IS, and for the same reason. MP4 is decoded in hardware,
    so a turning object costs almost nothing to play; a sprite atlas is tens of megabytes
    of decoded image and drags a masked backdrop-filter layer along behind it, which is
    what made the app crawl. MP4 has no alpha, so the frames are flattened onto black and
    the page composites them with mix-blend-mode: screen, under which black contributes
    nothing. Measured against proper alpha compositing on this app's own background the
    difference is under one value in 255 on the page itself and under thirty at its worst
    over the brightest part of the colour wash."""
    frames = sorted(glob.glob(f'{SRC}/vid-{name}/[0-9][0-9][0-9].webp'))
    if not frames:
        return None
    n = len(frames)
    tmp = tempfile.mkdtemp()
    for i, f in enumerate(frames + frames[:3]):      # extra frames so the seam blends
        im = Image.open(f).convert('RGBA')
        bg = Image.new('RGB', im.size, (0, 0, 0))
        bg.paste(im, (0, 0), im)
        bg.save(f'{tmp}/{i:03d}.png')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(VID_IN),
                    '-i', f'{tmp}/%03d.png',
                    '-vf', f'minterpolate=fps={VID_OUT}:mi_mode=blend,format=yuv420p',
                    '-frames:v', str(n * VID_OUT // VID_IN),
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21',
                    '-profile:v', 'high', '-movflags', '+faststart', '-an', dest], check=True)
    shutil.rmtree(tmp)
    return Image.open(frames[0]).size, os.path.getsize(dest)


def sheet(name, base, cap, cols=COLS):
    frames = sorted(glob.glob(f'{SRC}/{name}/[0-9][0-9][0-9].webp'))
    masks = [f.replace('.webp', '-mask.png') for f in frames]
    n = len(frames)
    rows = -(-n // cols)
    w0, h0 = Image.open(frames[0]).size
    s = min(1.0, cap / w0)
    fw, fh = round(w0 * s), round(h0 * s)
    mw, mh = max(1, fw // 2), max(1, fh // 2)
    sp = Image.new('RGBA', (fw * cols, fh * rows), (0, 0, 0, 0))
    mk = Image.new('LA', (mw * cols, mh * rows), (0, 0))
    for i, (f, m) in enumerate(zip(frames, masks)):
        c, r = i % cols, i // cols
        sp.paste(Image.open(f).convert('RGBA').resize((fw, fh), Image.LANCZOS), (c * fw, r * fh))
        a = Image.open(m).getchannel('A').resize((mw, mh), Image.LANCZOS)
        mk.paste(Image.merge('LA', (Image.new('L', (mw, mh), 0), a)), (c * mw, r * mh))
    sp.save(base + '.webp', 'WEBP', quality=86, method=6)
    mk.save(base + '-mask.png', optimize=True)
    return n, (fw, fh)


if __name__ == '__main__':
    if 'shapevid' in sys.argv[3:]:
        os.makedirs(f'{OUT}/shape-video', exist_ok=True)
        for d_ in sorted(glob.glob(f'{SRC}/vid-*')):
            nm = os.path.basename(d_.rstrip('/'))[4:]
            print('video', nm, shape_video(nm, f'{OUT}/shape-video/{nm}.mp4'), flush=True)
        sys.exit(0)
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
    for directory in sorted(glob.glob(f'{SRC}/overlay-*/')):
        name = os.path.basename(directory.rstrip('/'))
        cap, cols = (780, 6) if name in HQ_OVERLAYS else (OVERLAY_CAP, COLS)
        print('sheet', name, sheet(name, f'{OUT}/motion/{name}', cap, cols), flush=True)
    for d in sorted(glob.glob(f'{SRC}/glass-*/')):
        name = os.path.basename(d.rstrip('/'))
        print('sheet', name, sheet(name, f'{OUT}/motion/{name}', HQ_SHAPES.get(name, SHAPE_CAP)), flush=True)
