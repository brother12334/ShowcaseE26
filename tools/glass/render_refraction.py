"""Bake RGB transmission coordinates for the animated, transparent live-number heroes."""
import argparse
import gzip
import math
from functools import partial
from multiprocessing import Pool
from pathlib import Path
import struct

import numpy as np
from scipy import ndimage

import render_all as art
from render_turns import objects

FRAMES = 90
COLUMNS = 10
SCALE = 1 / 2


def frame(name, i):
    art.G.S = art.C.S = 1
    width, height, shapes = objects(name, True, SCALE, 2 * math.pi * i / FRAMES)
    scene = art.G.Scene(shapes)
    eye = np.array([width / 2, height * .45, 1500 * SCALE])
    yy, xx = np.mgrid[:height, :width]
    direction = np.column_stack((xx.ravel(), yy.ravel(), np.zeros(width * height))) - eye
    direction /= np.linalg.norm(direction, axis=1, keepdims=True)
    near = np.full(width * height, np.inf)
    far = np.zeros(width * height)
    for shape in shapes:
        delta = eye - shape.c
        along = direction @ delta
        disc = along ** 2 - (delta @ delta - shape.bound ** 2)
        radius = np.sqrt(np.maximum(disc, 0))
        near = np.where(disc > 0, np.minimum(near, np.maximum(-along - radius, 0)), near)
        far = np.where(disc > 0, np.maximum(far, -along + radius), far)
    candidates = np.flatnonzero(np.isfinite(near))
    rays = direction[candidates]
    distance, hit = art.G.march(scene, np.repeat(eye[None], len(rays), 0), rays,
                                near[candidates], far[candidates])
    rays = rays[hit]
    position = eye + rays * distance[hit, None]
    front = scene.normal(position)
    radius = max(shape.r for shape in shapes)
    _, rear, depth = art.C.trace_glass_interior(scene, position, rays, front, radius, SCALE)
    result = np.zeros((width * height, 8), dtype=np.uint8)
    hit_pixels = candidates[hit]
    for channel, point in enumerate(art.C.transmission_points(rays, front, rear, position, depth, SCALE)):
        # The receiver clamps to the artwork canvas, matching the baked hero.
        coords = np.clip((point[:, :2] + .5) / [width, height], 0, 1)
        result[hit_pixels, channel * 2:channel * 2 + 2] = np.rint(coords * 255)
    cosine = np.clip(-(rays * front).sum(1), 0, 1)
    fresnel = .04 + .96 * (1 - cosine) ** 5
    absorption = np.exp(-art.C.STYLES[art.STYLE]['absorb'] * np.clip(depth / (2 * radius), 0, 1.6))
    result[hit_pixels, 6] = np.rint((1 - fresnel) * absorption * 255)
    result[hit_pixels, 7] = 255
    grid = result.reshape(height, width, 8)
    outside = grid[:, :, 7] == 0
    nearest = ndimage.distance_transform_edt(outside, return_distances=False, return_indices=True)
    # Extend the UV field across the silhouette so bilinear sampling softens only
    # the coverage at the rim. Zero UV coordinates would drag in another glyph.
    rim = outside & ndimage.binary_dilation(~outside, structure=np.ones((3, 3), dtype=bool))
    grid[rim, :7] = grid[nearest[0][rim], nearest[1][rim], :7]
    return grid


def render(pool, name, destination):
    frames = list(pool.imap(partial(frame, name), range(FRAMES)))
    height, width = frames[0].shape[:2]
    rows = FRAMES // COLUMNS
    atlas = np.stack(frames).reshape(rows, COLUMNS, height, width, 8)
    atlas = atlas.transpose(0, 2, 1, 3, 4).reshape(rows * height, COLUMNS * width, 8)
    with gzip.open(destination / f'{name}.rays', 'wb', compresslevel=7) as file:
        file.write(struct.pack('<4H', width, height, FRAMES, COLUMNS))
        for channel in (0, 4):
            file.write(np.ascontiguousarray(atlas[:, :, channel:channel + 4]).tobytes())


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('names', nargs='*')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    with Pool(2) as pool:
        for name in args.names or ('history', 'research', 'workout'):
            render(pool, name, args.output)
