"""Encode a baked RGBA glass turn as native transparent HEVC and VP9 video."""
import argparse
from pathlib import Path
import subprocess

from PIL import Image


def encode(frames, size, target, fps, ffmpeg):
    width, height = size
    padded = (width + width % 2, height + height % 2)
    common = [
        ffmpeg, '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', f'{width}x{height}',
        '-framerate', str(fps), '-i', '-', '-an', '-threads', '2',
        '-vf', f'pad={padded[0]}:{padded[1]}:color=black@0,format=yuva420p',
    ]
    outputs = [
        ['-c:v', 'libx265', '-preset', 'fast', '-crf', '17',
         '-x265-params', 'pools=2:frame-threads=2:log-level=error',
         '-tag:v', 'hvc1', '-movflags', '+faststart', str(target.with_suffix('.mp4'))],
        ['-c:v', 'libvpx-vp9', '-crf', '18', '-b:v', '0', '-deadline', 'good',
         '-cpu-used', '4', '-row-mt', '1', str(target.with_suffix('.webm'))],
    ]
    encoders = [subprocess.Popen(common + args, stdin=subprocess.PIPE) for args in outputs]
    try:
        for frame in frames:
            rgba = frame.convert('RGBA').tobytes()
            for encoder in encoders:
                encoder.stdin.write(rgba)
    finally:
        for encoder in encoders:
            encoder.stdin.close()
        statuses = [encoder.wait() for encoder in encoders]
    if any(statuses):
        raise RuntimeError(f'could not encode both transparent video formats for {target}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--fps', type=int, default=60)
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    with Image.open(args.source) as source:
        def frames():
            for index in range(source.n_frames):
                source.seek(index)
                yield source
        encode(frames(), source.size, args.output, args.fps, args.ffmpeg)
