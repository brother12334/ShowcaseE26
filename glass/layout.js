/* layout.js — where every shape on every screen is placed. Change a number here and the
 * app moves it. Loaded as a plain script; scene.js reads window.GLASS_LAYOUT.
 *
 * WHAT TURNS IN 3D, AND WHY IT IS ONLY THE SMALL ONES AND THE TWO OVERLAY HEROES.
 *
 * Today spins because its hero is a pre-rendered video of a real object turning. Nothing
 * else did: the decorative shapes were drawn from their stills and the History and
 * Research heroes were given a CSS translate-and-rotate, which moves the picture without
 * rotating the object and next to Today reads as a nudge. Both are rendered loops now.
 *
 * THE SHARPNESS RULE THAT TURNED SPIN OFF IN THE FIRST PLACE still holds and is the
 * reason the big shapes stay still. A shape sheet is 3840x960 holding 36 frames in 12
 * columns, so one frame is 320x320. Program's jack is drawn at 250pt, which on a 3x
 * phone asks 750 device pixels of a 320 pixel frame — a 2.3x upscale, and that is
 * exactly why the spinning shapes once looked soft while the still ones looked sharp.
 *
 * The SMALL shapes have the opposite arithmetic. capsule-xs is placed at 68 to 80pt and
 * x-s at 92 to 112, so the largest on a 3x phone is 336 device pixels against a 320
 * pixel frame — no meaningful upscale at all. They turn at full sharpness with no
 * re-render, which is why they are the ones that turn.
 *
 * sphere-xs DOES NOT, and that was measured rather than assumed. A sheet was rendered
 * for it; across a full turn the picture changed by 0.8 of 255, against 37 for
 * capsule-xs and 30 for x-s. A smooth sphere is symmetric about every axis and its
 * highlights come from the environment, not its surface, so turning it is a still
 * frame that costs five megabytes a screen. The sheet was deleted again.
 *
 * RESEARCH'S HERO ORBITS INSTEAD OF SPINNING, for the same reason: it is a bubble. The
 * renderer moves it through the scene between frames so the rim light and refraction
 * are re-rendered each time, which is a different thing from the browser sliding one
 * picture around, and measures at 20 of 255 against the sphere's 0.8.
 *
 * THE TWO OVERLAY HEROES ARE RENDERED AT 2x, 18 frames in 6 columns: 780x880 a frame,
 * a 4680x2640 sheet, about 49 MB decoded. 36 frames at 2x would be 24.7M pixels, over
 * what iOS Safari will decode, and 36 at 1x is the blur above. Neither screen carries a
 * video hero, so that sheet is the only large surface on it.
 *
 * SPEED IS SET PER PLACEMENT, not in the art. The small shapes run at 6fps over 36
 * frames, so one turn takes six seconds — the owner asked for subtle. The heroes run at
 * 5fps over 18, which is 3.6 seconds a loop against Today's 5.
 *
 * The budget holds: at most 3 turning per screen, counting a hero that turns as one.
 * The intro's four shapes are deliberately left still — its three seconds are when the
 * app is most likely to run out of room, and it plays once.
 */
window.GLASS_LAYOUT = {
 "shapes": {
  "sphere-s": {
   "still": "assets/shapes/glass-sphere-s"
  },
  "sphere-xs": {
   "still": "assets/shapes/glass-sphere-xs"
  },
  "links": {
   "still": "assets/shapes/glass-links"
  },
  "x-s": {
   "still": "assets/shapes/glass-x-s",
   "sheet": "assets/motion/glass-x-s",
   "frames": 36,
   "cols": 12
  },
  "star": {
   "still": "assets/shapes/glass-star",
   "sheet": "assets/motion/glass-star",
   "frames": 36,
   "cols": 12
  },
  "jack": {
   "still": "assets/shapes/glass-jack",
   "sheet": "assets/motion/glass-jack",
   "frames": 36,
   "cols": 12
  },
  "rbox-s": {
   "still": "assets/shapes/glass-rbox-s",
   "sheet": "assets/motion/glass-rbox-s",
   "frames": 36,
   "cols": 12
  },
  "torus-m": {
   "still": "assets/shapes/glass-torus-m",
   "sheet": "assets/motion/glass-torus-m",
   "frames": 36,
   "cols": 12
  },
  "capsule-m": {
   "still": "assets/shapes/glass-capsule-m",
   "sheet": "assets/motion/glass-capsule-m",
   "frames": 36,
   "cols": 12
  },
  "capsule-amber": {
   "still": "assets/shapes/glass-capsule-amber",
   "sheet": "assets/motion/glass-capsule-amber",
   "frames": 36,
   "cols": 12
  },
  "capsule-xs": {
   "still": "assets/shapes/glass-capsule-xs",
   "sheet": "assets/motion/glass-capsule-xs",
   "frames": 36,
   "cols": 12
  },
  "blob": {
   "still": "assets/shapes/glass-blob",
   "sheet": "assets/motion/glass-blob",
   "frames": 36,
   "cols": 12
  }
 },
 "screens": {
  "today": {
   "height": 844,
   "hero": {
    "video": "assets/hero-video/hero-today-{day}.mp4",
    "poster": "assets/heroes/hero-today-{day}.webp",
    "w": 390,
    "h": 640,
    "days": [
     "push-a",
     "push-b",
     "pull-a",
     "pull-b",
     "legs-a",
     "legs-b"
    ]
   },
   "shapes": []
  },
  "rest": {
   "height": 844,
   "hero": {
    "video": "assets/hero-video/hero-rest.mp4",
    "poster": "assets/heroes/hero-rest.webp",
    "w": 390,
    "h": 520
   },
   "shapes": []
  },
  "program": {
   "height": 1500,
   "hero": {
    "video": "assets/hero-video/hero-program.mp4",
    "poster": "assets/heroes/hero-program.webp",
    "w": 390,
    "h": 440
   },
   "shapes": [
    {
     "shape": "jack",
     "x": 235,
     "y": 565,
     "w": 250,
     "h": 250,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "capsule-amber",
     "x": -71,
     "y": 981,
     "w": 188,
     "h": 188,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "blob",
     "x": 259,
     "y": 1229,
     "w": 212,
     "h": 212,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "sphere-xs",
     "x": 18,
     "y": 466,
     "w": 45,
     "h": 45,
     "layer": "front",
     "depth": 1.1,
     "spin": false
    },
    {
     "shape": "capsule-xs",
     "x": 323,
     "y": 1103,
     "w": 70,
     "h": 70,
     "layer": "front",
     "depth": 1.1,
     "spin": true,
     "fps": 6
    }
   ]
  },
  "settings": {
   "height": 1500,
   "hero": {
    "video": "assets/hero-video/hero-settings.mp4",
    "poster": "assets/heroes/hero-settings.webp",
    "w": 390,
    "h": 420
   },
   "shapes": [
    {
     "shape": "torus-m",
     "x": 242,
     "y": 536,
     "w": 238,
     "h": 238,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "links",
     "x": -109,
     "y": 826,
     "w": 288,
     "h": 240,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "capsule-m",
     "x": 242,
     "y": 1146,
     "w": 238,
     "h": 238,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "sphere-xs",
     "x": 326,
     "y": 466,
     "w": 45,
     "h": 45,
     "layer": "front",
     "depth": 1.1,
     "spin": false
    },
    {
     "shape": "x-s",
     "x": -3,
     "y": 1111,
     "w": 92,
     "h": 92,
     "layer": "front",
     "depth": 0.7,
     "spin": true,
     "fps": 6
    }
   ]
  },
  "workout": {
   "height": 1700,
   "hero": {
    "overlay": null,
    "still": "assets/hero-overlays/overlay-workout",
    "frames": 36,
    "cols": 12,
    "w": 390,
    "h": 340,
    "note": "live elapsed time sits underneath"
   },
   "shapes": [
    {
     "shape": "capsule-xs",
     "x": 8,
     "y": 228,
     "w": 70,
     "h": 70,
     "layer": "front",
     "depth": 1,
     "spin": true,
     "fps": 6
    },
    {
     "shape": "sphere-xs",
     "x": 344,
     "y": 255,
     "w": 38,
     "h": 38,
     "layer": "front",
     "depth": 1,
     "spin": false
    }
   ]
  },
  "history": {
   "height": 1500,
   "hero": {
    "still": "assets/hero-overlays/overlay-history",
    "w": 390,
    "h": 440,
    "note": "live text (session count) sits underneath; the capsule turns about its own axis",
    "overlay": "assets/motion/overlay-history",
    "frames": 18,
    "cols": 6,
    "fps": 5
   },
   "shapes": [
    {
     "shape": "blob",
     "x": 266,
     "y": 250,
     "w": 150,
     "h": 150,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "torus-m",
     "x": -78,
     "y": 296,
     "w": 170,
     "h": 170,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "sphere-xs",
     "x": 328,
     "y": 128,
     "w": 66,
     "h": 66,
     "layer": "front",
     "depth": 1.1,
     "spin": false
    },
    {
     "shape": "capsule-xs",
     "x": 318,
     "y": 356,
     "w": 80,
     "h": 80,
     "layer": "front",
     "depth": 1.1,
     "spin": true,
     "fps": 6
    }
   ]
  },
  "research": {
   "height": 1500,
   "hero": {
    "still": "assets/hero-overlays/overlay-research",
    "w": 390,
    "h": 440,
    "note": "live text (paper count) sits underneath; the bubble turns about its own axis",
    "overlay": "assets/motion/overlay-research",
    "frames": 18,
    "cols": 6,
    "fps": 5
   },
   "shapes": [
    {
     "shape": "star",
     "x": 242,
     "y": 536,
     "w": 238,
     "h": 238,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "capsule-m",
     "x": -90,
     "y": 836,
     "w": 238,
     "h": 238,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "blob",
     "x": 259,
     "y": 1099,
     "w": 212,
     "h": 212,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "sphere-xs",
     "x": 331,
     "y": 381,
     "w": 48,
     "h": 48,
     "layer": "front",
     "depth": 1.1,
     "spin": false
    },
    {
     "shape": "capsule-xs",
     "x": 1,
     "y": 1203,
     "w": 70,
     "h": 70,
     "layer": "front",
     "depth": 1.1,
     "spin": true,
     "fps": 6
    }
   ]
  },
  "research-paper": {
   "height": 1500,
   "shapes": [
    {
     "shape": "sphere-s",
     "x": 256,
     "y": 82,
     "w": 138,
     "h": 138,
     "layer": "front",
     "depth": 0.7,
     "spin": false
    },
    {
     "shape": "torus-m",
     "x": 235,
     "y": 395,
     "w": 250,
     "h": 250,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "jack",
     "x": -95,
     "y": 795,
     "w": 250,
     "h": 250,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "sphere-xs",
     "x": 325,
     "y": 325,
     "w": 50,
     "h": 50,
     "layer": "front",
     "depth": 1.1,
     "spin": false
    },
    {
     "shape": "x-s",
     "x": 290,
     "y": 1050,
     "w": 100,
     "h": 100,
     "layer": "front",
     "depth": 0.7,
     "spin": true,
     "fps": 6
    }
   ]
  },
  "settings-rest-timer": {
   "height": 1500,
   "shapes": [
    {
     "still": "assets/body/pearl-sphere",
     "x": 252,
     "y": 120,
     "w": 150,
     "h": 153,
     "layer": "back",
     "bob": 4
    },
    {
     "shape": "torus-m",
     "x": 250,
     "y": 418,
     "w": 225,
     "h": 225,
     "layer": "back",
     "depth": 0.4,
     "spin": false
    },
    {
     "shape": "rbox-s",
     "x": -35,
     "y": 689,
     "w": 112,
     "h": 112,
     "layer": "back",
     "depth": 0.7,
     "spin": false
    },
    {
     "shape": "capsule-xs",
     "x": 23,
     "y": 365,
     "w": 68,
     "h": 68,
     "layer": "back",
     "depth": 1.1,
     "spin": true,
     "fps": 6
    }
   ]
  },
  "body": {
   "height": 1500,
   "shapes": [
    {
     "still": "assets/body/chrome-crumple",
     "x": 224,
     "y": 86,
     "w": 174,
     "h": 173,
     "layer": "back",
     "bob": 4
    },
    {
     "still": "assets/body/chrome-sphere",
     "x": 24,
     "y": 115,
     "w": 48,
     "h": 48,
     "layer": "back",
     "bob": 4
    },
    {
     "still": "assets/body/pearl-crumple",
     "x": -55,
     "y": 495,
     "w": 105,
     "h": 119,
     "layer": "back",
     "bob": 4
    },
    {
     "still": "assets/body/pearl-sphere",
     "x": 314,
     "y": 755,
     "w": 112,
     "h": 114,
     "layer": "back",
     "bob": 4
    },
    {
     "still": "assets/body/chrome-orchid",
     "x": 273,
     "y": 1095,
     "w": 166,
     "h": 163,
     "layer": "back",
     "bob": 4
    },
    {
     "still": "assets/body/pearl-flower",
     "x": -40,
     "y": 1390,
     "w": 80,
     "h": 82,
     "layer": "back",
     "bob": 4
    }
   ]
  },
  "intro": {
   "height": 844,
   "shapes": [
    {
     "shape": "capsule-xs",
     "x": 306,
     "y": 150,
     "w": 84,
     "h": 84,
     "layer": "front",
     "depth": 1.1,
     "spin": false
    },
    {
     "shape": "sphere-xs",
     "x": 16,
     "y": 470,
     "w": 58,
     "h": 58,
     "layer": "front",
     "depth": 1.1,
     "spin": false
    },
    {
     "shape": "x-s",
     "x": 286,
     "y": 500,
     "w": 112,
     "h": 112,
     "layer": "front",
     "depth": 0.7,
     "spin": false
    },
    {
     "shape": "star",
     "x": -100,
     "y": 330,
     "w": 170,
     "h": 170,
     "layer": "front",
     "depth": 0.4,
     "spin": false
    }
   ]
  }
 }
};
