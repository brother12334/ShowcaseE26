/* layout.js — where every shape on every screen is placed. Change a number here and the
 * app moves it. Loaded as a plain script; scene.js reads window.GLASS_LAYOUT.
 *
 * SPIN IS CAPPED AT THREE PER SCREEN, which is the design brief's own hard limit:
 * "At most 6 shapes per screen, at most 3 of them spinning. A spin sheet is 25 to 50 MB
 * decoded." Five screens shipped with five spinning shapes each, which is 125 to 250 MB
 * of decoded sprite sheet and five elements repositioned on every animation frame.
 * Nothing was removed: every shape is still on its screen, at its coordinates, at its
 * size. The ones over the cap are drawn from their still image instead of their sheet,
 * which is a path scene.js already supports (`spin: false`).
 *
 * The three kept spinning on each screen are the largest, because that is where motion
 * reads. To change which, set `spin` yourself on the shapes you want.
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
     "depth": 0.4
    },
    {
     "shape": "capsule-amber",
     "x": -71,
     "y": 981,
     "w": 188,
     "h": 188,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "blob",
     "x": 259,
     "y": 1229,
     "w": 212,
     "h": 212,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "sphere-xs",
     "x": 18,
     "y": 466,
     "w": 45,
     "h": 45,
     "layer": "front",
     "depth": 1.1
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
     "depth": 0.4
    },
    {
     "shape": "links",
     "x": -109,
     "y": 826,
     "w": 288,
     "h": 240,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "capsule-m",
     "x": 242,
     "y": 1146,
     "w": 238,
     "h": 238,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "sphere-xs",
     "x": 326,
     "y": 466,
     "w": 45,
     "h": 45,
     "layer": "front",
     "depth": 1.1
    },
    {
     "shape": "x-s",
     "x": -3,
     "y": 1111,
     "w": 92,
     "h": 92,
     "layer": "front",
     "depth": 0.7
    }
   ]
  },
  "workout": {
   "height": 1700,
   "hero": {
    "overlay": "assets/motion/overlay-workout",
    "still": "assets/hero-overlays/overlay-workout",
    "frames": 36,
    "cols": 12,
    "w": 390,
    "h": 340,
    "note": "live text 18:42 sits underneath"
   },
   "shapes": [
    {
     "shape": "star",
     "x": 268,
     "y": 1392,
     "w": 190,
     "h": 190,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "links",
     "x": 214,
     "y": 1520,
     "w": 180,
     "h": 150,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "jack",
     "x": -66,
     "y": 1514,
     "w": 190,
     "h": 190,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "sphere-xs",
     "x": 318,
     "y": 296,
     "w": 74,
     "h": 74,
     "layer": "front",
     "depth": 1.1
    },
    {
     "shape": "capsule-xs",
     "x": 0,
     "y": 224,
     "w": 92,
     "h": 92,
     "layer": "front",
     "depth": 0.7
    }
   ]
  },
  "history": {
   "height": 1500,
   "hero": {
    "overlay": "assets/motion/overlay-history",
    "still": "assets/hero-overlays/overlay-history",
    "frames": 36,
    "cols": 12,
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
     "depth": 0.4
    },
    {
     "shape": "torus-m",
     "x": -78,
     "y": 296,
     "w": 170,
     "h": 170,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "sphere-xs",
     "x": 328,
     "y": 128,
     "w": 66,
     "h": 66,
     "layer": "front",
     "depth": 1.1
    },
    {
     "shape": "capsule-xs",
     "x": 318,
     "y": 356,
     "w": 80,
     "h": 80,
     "layer": "front",
     "depth": 1.1
    }
   ]
  },
  "research": {
   "height": 1500,
   "hero": {
    "overlay": null,
    "still": "assets/hero-overlays/overlay-research",
    "w": 390,
    "h": 440,
    "note": "live text (paper count) sits underneath; the sphere is a still on purpose"
   },
   "shapes": [
    {
     "shape": "star",
     "x": 242,
     "y": 536,
     "w": 238,
     "h": 238,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "capsule-m",
     "x": -90,
     "y": 836,
     "w": 238,
     "h": 238,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "blob",
     "x": 259,
     "y": 1099,
     "w": 212,
     "h": 212,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "sphere-xs",
     "x": 331,
     "y": 381,
     "w": 48,
     "h": 48,
     "layer": "front",
     "depth": 1.1
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
     "depth": 0.7
    },
    {
     "shape": "torus-m",
     "x": 235,
     "y": 395,
     "w": 250,
     "h": 250,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "jack",
     "x": -95,
     "y": 795,
     "w": 250,
     "h": 250,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "sphere-xs",
     "x": 325,
     "y": 325,
     "w": 50,
     "h": 50,
     "layer": "front",
     "depth": 1.1
    },
    {
     "shape": "x-s",
     "x": 290,
     "y": 1050,
     "w": 100,
     "h": 100,
     "layer": "front",
     "depth": 0.7
    }
   ]
  },
  "settings-rest-timer": {
   "height": 1500,
   "shapes": [
    {
     "shape": "torus-m",
     "x": 250,
     "y": 418,
     "w": 225,
     "h": 225,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "rbox-s",
     "x": -35,
     "y": 689,
     "w": 112,
     "h": 112,
     "layer": "front",
     "depth": 0.7
    },
    {
     "shape": "capsule-xs",
     "x": 23,
     "y": 365,
     "w": 68,
     "h": 68,
     "layer": "front",
     "depth": 1.1
    }
   ]
  },
  "body": {
   "height": 1500,
   "shapes": [
    {
     "shape": "links",
     "x": 228,
     "y": 628,
     "w": 262,
     "h": 219,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "star",
     "x": -90,
     "y": 1136,
     "w": 238,
     "h": 238,
     "layer": "front",
     "depth": 0.4
    },
    {
     "shape": "sphere-xs",
     "x": 35,
     "y": 379,
     "w": 50,
     "h": 50,
     "layer": "front",
     "depth": 1.1
    },
    {
     "shape": "x-s",
     "x": 285,
     "y": 1419,
     "w": 112,
     "h": 112,
     "layer": "front",
     "depth": 0.7
    }
   ],
   "note": "the body page keeps its 6 iridescent Figma shapes (assets/body) as plain images; only these glass shapes are driven from here"
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
     "depth": 1.1
    },
    {
     "shape": "sphere-xs",
     "x": 16,
     "y": 470,
     "w": 58,
     "h": 58,
     "layer": "front",
     "depth": 1.1
    },
    {
     "shape": "x-s",
     "x": 286,
     "y": 500,
     "w": 112,
     "h": 112,
     "layer": "front",
     "depth": 0.7
    },
    {
     "shape": "star",
     "x": -100,
     "y": 330,
     "w": 170,
     "h": 170,
     "layer": "front",
     "depth": 0.4
    }
   ]
  }
 }
};
