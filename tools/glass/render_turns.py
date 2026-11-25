"""Render transparent geometry turns as independently decoded animated AVIF files."""
import argparse
import math
from functools import partial
from multiprocessing import Pool
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image

import render_all as art


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
    name, hero, scale, frames, directory = work
    path = Path(directory) / f'{i:03}.webp'
    if path.exists():
        return
    art.G.S = art.C.S = 1
    art.C.set_style('A-bubble')
    width, height, shapes = objects(name, hero, scale, 2 * math.pi * i / frames)
    art.C.render_clear_sprite(str(path), width, height, shapes, art.GLASS_TINT)
    path.with_name(f'{i:03}-mask.png').unlink()


def encode(directory, target, frame_count, fps):
    frames = [Image.open(Path(directory) / f'{i:03}.webp').convert('RGBA') for i in range(frame_count)]
    times = [round((i + 1) * 1000 / fps) - round(i * 1000 / fps) for i in range(frame_count)]
    frames[0].save(target, format='AVIF', save_all=True, append_images=frames[1:],
                   duration=times, loop=0, quality=64, speed=8, subsampling='4:2:0',
                   max_threads=2)



def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('names', nargs='*')
    parser.add_argument('--jobs', type=int, default=2)
    args = parser.parse_args()
    heroes = ('history', 'research', 'workout')
    names = args.names or [*heroes, *(name for name in art.SHAPES if not name.startswith('sphere-'))]
    args.output.mkdir(parents=True, exist_ok=True)
    with Pool(args.jobs) as pool:
        for name in names:
            hero = name in heroes
            if name in ('history', 'research'):
                # Keep the three-second depth turn with fewer pixels to decode.
                scale, fps, count = 4 / 3, 30, 90
            else:
                scale, fps, count = (2, 60, 180) if hero else (1.5, 30, 90)
            with TemporaryDirectory(prefix=f'e26-turn-{name}-') as directory:
                work = (name, hero, scale, count, directory)
                for _ in pool.imap_unordered(partial(frame, work), range(count)):
                    pass
                encode(directory, args.output / f'{name}.avif', count, fps)
            print(f'{name}: {count} frames at {fps} fps', flush=True)


if __name__ == '__main__':
    main()
