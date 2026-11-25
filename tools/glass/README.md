# Changing the glass art

Everything in `assets/` was made by the scripts in this folder. You can change any of it and regenerate.

## Setup (once)
    pip install numpy scipy "pillow>=11.3"        # ffmpeg must be on PATH for assemble.py

## Regenerate
    python3 render_all.py /tmp/render stills       # every still, about 1 minute
    python3 render_all.py /tmp/render loops        # every spin and hero loop, about 25 minutes on 2 cores
    python3 render_all.py /tmp/overlays overlay-still-history overlay-still-research  # native 3x transparent art
    python3 render_all.py /tmp/render sp-star      # just one shape's spin sheet
    python3 render_all.py /tmp/render hero-today-push-b   # just one hero loop
    python3 assemble.py /tmp/render ../assets      # turn frames into MP4s and sheets, copy stills in

For the native transparent clips, run `python3 render_turns.py --video /tmp/turns` with FFmpeg 8+ built with an alpha-capable libx265 and libvpx. The renderer produces both HEVC MP4 (for Safari) and VP9 WebM. Copy both formats to `assets/glass-turns/`. Use the optional model names to do one at a time. Add `--bundle` to render matching WebP stills and lightweight AVIF fallbacks from the same frames. The video files use native-size 3× frames at 60 fps. The app verifies transparency before displaying the video.

To regenerate only the animated-image fallbacks, run `python3 render_turns.py /tmp/turns` and copy the AVIF files to `assets/glass-turns/`. Add a model name after the output directory to render just that asset. Workout turns at 60 fps. History and Research use 520-pixel-wide, 30 fps turns to cut decode work. Ornaments use a gentler 30 fps turn. The AVIF path retains real transparency and the live counts remain text.

Re-running skips frames that already exist. Delete a frame folder to force a redo.

## What to edit, and where
| Want to change | Edit | In |
|---|---|---|
| Glass material (clearer, more rim, more rainbow, darker) | the `A-bubble` entry of `STYLES` | `clear.py` |
| Cool or warm cast of all glass | `GLASS_TINT` | `render_all.py` |
| A shape's size, tilt, thickness, how crisp | its row in `SHAPES` | `render_all.py` |
| Spin axis / speed / frame count | `SPIN`, `SHAPE_FRAMES` | `render_all.py` |
| A hero's object, tilt, position, word | its entry in `HEROES` | `render_all.py` |
| Words on the Today heroes | `CYCLE_DAYS` | `render_all.py` |
| Add a new shape | a row in `SHAPES`, plus a key in `code/layout.js` `shapes` | both |

Object kinds: `sphere capsule torus rbox x jack star blob`. Tilt is `(x, y, z)` degrees. `thick` is wall thickness, 0.1 thin to 0.3 chunky.
Style keys in `clear.py`: `fill_k` body darkness, `rim_k` rim brightness, `film_k` rainbow strength, `cau_k` bright crescent, `band_a` window-bar visibility.

Keep these rules or the glass stops looking like glass: render small shapes large and scale down (`k` in `SHAPES`), never render a shape below about 60 px source, keep the same style on every shape.

# Changing the motion (no re-render needed)
Open `demo/motion-lab.html` over http (`python3 -m http.server` in this folder, then visit /demo/motion-lab.html). Drag the sliders, copy the result box into `code/glass-config.js`.
Placement lives in `code/layout.js`. The old to new transition lives in `code/intro.js` (`E26Intro.timing`).

### Live-text transmission

Run `python3 render_refraction.py ../../assets/glass-refraction` from this
directory after changing an overlay hero's geometry, camera, or loop. The maps
contain the renderer's separate red, green, and blue landing coordinates, plus
transmission and silhouette coverage. The browser applies them to the live
number in sync with the transparent video. Keep the maps and the native videos
on the same pose sequence.
