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
    # Match the native render's surface precision in the smaller map coordinates.
    art.G.S = SCALE / 3
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
    coordinates = []
    strengths = []
    depths = []
    for index in (1.325, 1.35, 1.375):
        inside = art.G.refract(rays, front, 1 / index)
        depth, escaped = art.G.march(scene, position + inside * SCALE, inside,
                                    np.zeros(len(rays)), np.full(len(rays), 8 * radius),
                                    steps=120, inside=True)
        exit_point = position + inside * (depth[:, None] + SCALE)
        rear = -scene.normal(exit_point)
        cosine = np.clip(-(inside * rear).sum(1), 0, 1)
        discriminant = 1 - index ** 2 * (1 - cosine ** 2)
        outgoing = art.G.refract(inside, rear, index)
        # A ray reflected internally never reaches the background. Fade out
        # grazing rays near the cutoff instead of pinning them to the exit point.
        reaches = np.maximum(-outgoing[:, 2], 1e-3)
        point = exit_point + outgoing * (exit_point[:, 2] / reaches)[:, None]
        coordinates.append(np.clip((point[:, :2] + .5) / [width, height], -.25, 1.25))
        strengths.append(escaped * smoothstep(.015, .14, discriminant) *
                         smoothstep(.03, .20, -outgoing[:, 2]))
        depths.append(depth)

    hit_pixels = candidates[hit]
    cosine = np.clip(-(rays * front).sum(1), 0, 1)
    fresnel = .04 + .96 * (1 - cosine) ** 5
    absorption = np.exp(-art.C.STYLES[art.STYLE]['absorb'] *
                        np.clip(np.mean(depths, axis=0) / (2 * radius), 0, 1.6))
    gain = np.min(strengths, axis=0) * (1 - fresnel) * absorption
    grid = np.zeros((height, width, 8), dtype=np.float32)
    coverage = np.zeros(width * height, dtype=bool)
    coverage[hit_pixels] = True
    coverage = coverage.reshape(height, width)
    interior_distance = ndimage.distance_transform_edt(coverage)
    grid[:, :, 7] = smoothstep(.5, 2.5, interior_distance)

    valid = np.zeros(width * height, dtype=bool)
    valid[hit_pixels] = gain > .025
    valid = valid.reshape(height, width)
    if not valid.any():
        return grid
    nearest = ndimage.distance_transform_edt(~valid, return_distances=False, return_indices=True)
    field = grid[:, :, :6].copy().reshape(-1, 6)
    field[hit_pixels] = np.concatenate(coordinates, axis=1)
    field = field.reshape(height, width, 6)[nearest[0], nearest[1]]
    # Soften the projection before sampling the glyph. Store the smooth field
    # at half-float precision so shallow gradients don't repeat whole texels.
    field = ndimage.gaussian_filter(field, (.75, .75, 0))
    grid[coverage, :6] = field[coverage]
    energy = np.zeros(width * height)
    energy[hit_pixels] = gain
    grid[:, :, 6] = ndimage.gaussian_filter(energy.reshape(height, width), .7)
    return grid


def smoothstep(lo, hi, value):
    t = np.clip((value - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def render(pool, name, destination):
    frames = list(pool.imap(partial(frame, name), range(FRAMES)))
    height, width = frames[0].shape[:2]
    rows = FRAMES // COLUMNS
    atlas = np.stack(frames).reshape(rows, COLUMNS, height, width, 8)
    atlas = atlas.transpose(0, 2, 1, 3, 4).reshape(rows * height, COLUMNS * width, 8)
    with gzip.open(destination / f'{name}.rays', 'wb', compresslevel=7) as file:
        file.write(struct.pack('<4s4H', b'E26P', width, height, FRAMES, COLUMNS))
        for channel in (0, 4):
            plane = np.ascontiguousarray(atlas[:, :, channel:channel + 4].transpose(2, 0, 1),
                                         dtype='<f2').view('<u2')
            plane[:, :, 1:] = plane[:, :, 1:] - plane[:, :, :-1]
            file.write(plane.astype(np.uint8).tobytes())
            file.write((plane >> 8).astype(np.uint8).tobytes())


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('names', nargs='*')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    with Pool(2) as pool:
        for name in args.names or ('history', 'research', 'workout'):
            render(pool, name, args.output)
