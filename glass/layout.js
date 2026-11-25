/* layout.js — where every shape on every screen is placed. Change a number here and the
 * app moves it. Loaded as a plain script; scene.js reads window.GLASS_LAYOUT.
 *
 * SPIN IS OFF EVERYWHERE, and it was measured rather than decided.
 *
 * A spin sheet is 3840x960 holding 36 frames in 12 columns, so ONE FRAME IS 320x320.
 * Program's jack is drawn at 250pt, which on a 3x phone is 750 device pixels asked of a
 * 320 pixel frame — a 2.3x upscale, and that is why the spinning shapes looked soft on
 * the device while the still ones looked sharp. The stills are 500 to 550px square and
 * have pixels to spare at every size used here.
 *
 * The same sheet is about 15 MB decoded, three of them to a screen, which is the other
 * half of the complaint: the shapes were heavy AND blurry, and both came from the same
 * file. Drawing from the still fixes both at once.
 *
 * NOTHING STOPPED MOVING. glass-motion.js animates every shape's float, parallax and
 * tilt whether or not it has frames; `spin` only chooses the sheet over the still. The
 * shapes still drift and bob, they are simply no longer flipping through frames.
 *
 * To put a shape's rotation back, set `spin: true` on it. It will be sharper first if
 * the sheet is re-rendered at 2x (tools/README.md) — at 640px a frame it would be
 * crisp at these sizes.
 */
window.GLASS_LAYOUT = {
 "shapes": {
  "sphere-s": {
   "still": "assets/shapes/glass-sphere-s",
   "video": "assets/shape-video/sphere-s.mp4"
  },
  "sphere-xs": {
   "still": "assets/shapes/glass-sphere-xs",
   "video": "assets/shape-video/sphere-xs.mp4"
  },
  "links": {
   "still": "assets/shapes/glass-links",
   "video": "assets/shape-video/links.mp4"
  },
  "x-s": {
   "still": "assets/shapes/glass-x-s",
   "sheet": "assets/motion/glass-x-s",
   "frames": 36,
   "cols": 12,
   "video": "assets/shape-video/x-s.mp4"
  },
  "star": {
   "still": "assets/shapes/glass-star",
   "sheet": "assets/motion/glass-star",
   "frames": 36,
   "cols": 12,
   "video": "assets/shape-video/star.mp4"
  },
  "jack": {
   "still": "assets/shapes/glass-jack",
   "sheet": "assets/motion/glass-jack",
   "frames": 36,
   "cols": 12,
   "video": "assets/shape-video/jack.mp4"
  },
  "rbox-s": {
   "still": "assets/shapes/glass-rbox-s",
   "sheet": "assets/motion/glass-rbox-s",
   "frames": 36,
   "cols": 12,
   "video": "assets/shape-video/rbox-s.mp4"
  },
  "torus-m": {
   "still": "assets/shapes/glass-torus-m",
   "sheet": "assets/motion/glass-torus-m",
   "frames": 36,
   "cols": 12,
   "video": "assets/shape-video/torus-m.mp4"
  },
  "capsule-m": {
   "still": "assets/shapes/glass-capsule-m",
   "sheet": "assets/motion/glass-capsule-m",
   "frames": 36,
   "cols": 12,
   "video": "assets/shape-video/capsule-m.mp4"
  },
  "capsule-amber": {
   "still": "assets/shapes/glass-capsule-amber",
   "sheet": "assets/motion/glass-capsule-amber",
   "frames": 36,
   "cols": 12,
   "video": "assets/shape-video/capsule-amber.mp4"
  },
  "capsule-xs": {
   "still": "assets/shapes/glass-capsule-xs",
   "sheet": "assets/motion/glass-capsule-xs",
   "frames": 36,
   "cols": 12,
   "video": "assets/shape-video/capsule-xs.mp4"
  },
  "blob": {
   "still": "assets/shapes/glass-blob",
   "sheet": "assets/motion/glass-blob",
   "frames": 36,
   "cols": 12,
   "video": "assets/shape-video/blob.mp4"
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
     "spin": false
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
     "spin": false
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
     "spin": false
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
    "motion": "sway",
    "still": "assets/hero-overlays/overlay-history",
    "w": 390,
    "h": 440,
    "note": "live text (session count) sits underneath"
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
     "spin": false
    }
   ]
  },
  "research": {
   "height": 1500,
   "hero": {
    "motion": "orbit",
    "still": "assets/hero-overlays/overlay-research",
    "w": 390,
    "h": 440,
    "note": "live text (paper count) sits underneath; the sphere moves gently through an orbit"
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
     "spin": false
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
     "spin": false
    }
   ]
  },
  "settings-rest-timer": {
   "height": 1500,
   "shapes": [
    {
     "still": "assets/body/chrome-cube",
     "x": 252,
     "y": 120,
     "w": 150,
     "h": 153,
     "layer": "back",
     "bob": 4,
     "video": "assets/shape-video/chrome-cube.mp4"
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
     "spin": false
    }
   ]
  },
  "body": {
   "height": 1500,
   "shapes": [
    {
     "still": "assets/body/chrome-ring",
     "x": 224,
     "y": 86,
     "w": 174,
     "h": 173,
     "layer": "back",
     "bob": 4,
     "video": "assets/shape-video/chrome-ring.mp4"
    },
    {
     "still": "assets/body/pearl-bar",
     "x": 24,
     "y": 115,
     "w": 48,
     "h": 48,
     "layer": "back",
     "bob": 4,
     "video": "assets/shape-video/pearl-bar.mp4"
    },
    {
     "still": "assets/body/pearl-cross",
     "x": -55,
     "y": 495,
     "w": 105,
     "h": 119,
     "layer": "back",
     "bob": 4,
     "video": "assets/shape-video/pearl-cross.mp4"
    },
    {
     "still": "assets/body/chrome-cube",
     "x": 314,
     "y": 755,
     "w": 112,
     "h": 114,
     "layer": "back",
     "bob": 4,
     "video": "assets/shape-video/chrome-cube.mp4"
    },
    {
     "still": "assets/body/pearl-star",
     "x": 273,
     "y": 1095,
     "w": 166,
     "h": 163,
     "layer": "back",
     "bob": 4,
     "video": "assets/shape-video/pearl-star.mp4"
    },
    {
     "still": "assets/body/chrome-capsule",
     "x": -40,
     "y": 1390,
     "w": 80,
     "h": 82,
     "layer": "back",
     "bob": 4,
     "video": "assets/shape-video/chrome-capsule.mp4"
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
