"""Render transparent geometry turns as AVIF or native HEVC and VP9 video."""
import argparse
import math
from functools import partial
from multiprocessing import Pool
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image

import render_all as art
from encode_turn_video import encode as encode_video


def objects(name, hero, scale, phase):
    if hero:
        spec = art.HEROES[name]
        width, height = spec['canvas']
        source = spec['objs']
        margin_x = margin_y = 0
    else:
        width, height, source, _ = art.SHAPES[name]
        margin_x, margin_y = width / 8, height / 8
        width, height = round(width * 1.25), round(height * 1.25)
    shapes = []
    for kind, (x, y), size, tilt, kwargs in source:
        obj = art.G.Obj(kind, ((x + margin_x) * scale, (y + margin_y) * scale),
                        size * scale, tilt, **kwargs)
        if not hero:
            obj.c[2] = obj.bound * 1.05
        if hero:
            # These solids have half-turn symmetry on the chosen local axis.
            axis = spec['spin'][0]
            obj.R = obj.R @ art.axis_rot(axis, math.degrees(phase) / 2)
        else:
            yaw = 16 * math.sin(phase)
            pitch = 11 * (1 - math.cos(phase))
            obj.R = art.axis_rot('y', yaw) @ art.axis_rot('x', pitch) @ obj.R
        obj.Rinv = obj.R.T
        shapes.append(obj)
    return round(width * scale), round(height * scale), shapes


def frame(work, i):
    name, hero, scale, frames, directory, video = work
    path = Path(directory) / f'{i:03}.webp'
    if path.exists():
        return
    art.G.S = art.C.S = 1
    art.C.set_style(art.STYLE)
    width, height, shapes = objects(name, hero, scale, 2 * math.pi * i / frames)
    art.C.render_clear_sprite(str(path), width, height, shapes, art.GLASS_TINT,
                              lossless=video, camera_scale=scale)
    path.with_name(f'{i:03}-mask.png').unlink()


def encode(directory, target, frame_count, fps, *, stride=1, max_width=None):
    frames = []
    for i in range(0, frame_count, stride):
        with Image.open(Path(directory) / f'{i:03}.webp') as image:
            rgba = image.convert('RGBA')
            if max_width and rgba.width > max_width:
                rgba = rgba.resize((max_width, round(rgba.height * max_width / rgba.width)),
                                   Image.Resampling.LANCZOS)
            frames.append(rgba)
    frame_count = len(frames)
    times = [round((i + 1) * 1000 / fps) - round(i * 1000 / fps) for i in range(frame_count)]
    frames[0].save(target, format='AVIF', save_all=True, append_images=frames[1:],
                   duration=times, loop=0, quality=64, speed=8, subsampling='4:2:0',
                   max_threads=2)



def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('names', nargs='*')
    parser.add_argument('--jobs', type=int, default=2)
    parser.add_argument('--video', action='store_true')
    parser.add_argument('--bundle', action='store_true', help='include matching stills and AVIF fallbacks with video')
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    if args.bundle and not args.video:
        parser.error('--bundle requires --video')
    heroes = ('history', 'research', 'workout')
    names = args.names or [*heroes, *(name for name in art.SHAPES if not name.startswith('sphere-'))]
    args.output.mkdir(parents=True, exist_ok=True)
    with Pool(args.jobs) as pool:
        for name in names:
            hero = name in heroes
            if args.video:
                # Match each asset's largest placement at 3x device density.
                max_width = {'links': 288, 'x-s': 112, 'star': 238, 'jack': 250,
                             'rbox-s': 138, 'torus-m': 280, 'capsule-m': 238,
                             'capsule-amber': 188, 'capsule-xs': 84, 'blob': 212}
                scale = 3 if hero else 3 * max_width[name] / round(art.SHAPES[name][0] * 1.25)
                fps, count = 60, 180
            elif name in ('history', 'research'):
                scale, fps, count = 4 / 3, 30, 90
            else:
                scale, fps, count = (2, 60, 180) if hero else (1.5, 30, 90)
            with TemporaryDirectory(prefix=f'e26-turn-{name}-') as directory:
                work = (name, hero, scale, count, directory, args.video)
                for _ in pool.imap_unordered(partial(frame, work), range(count)):
                    pass
                if args.video:
                    def rendered_frames():
                        for index in range(count):
                            with Image.open(Path(directory) / f'{index:03}.webp') as image:
                                yield image

                    size = objects(name, hero, scale, 0)[:2]
                    encode_video(rendered_frames(), size, args.output / name, fps, args.ffmpeg)
                    if args.bundle:
                        with Image.open(Path(directory) / '000.webp') as poster:
                            poster.save(args.output / f'{name}.webp', quality=94, method=6)
                        encode(directory, args.output / f'{name}.avif', count, fps // 2,
                               stride=2, max_width=520 if hero else 420)
                else:
                    encode(directory, args.output / f'{name}.avif', count, fps)
            print(f'{name}: {count} frames at {fps} fps', flush=True)


if __name__ == '__main__':
    main()
