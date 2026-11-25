/* layout.js — where every shape on every screen is placed. Change a number here and the
 * app moves it. Loaded as a plain script; scene.js reads window.GLASS_LAYOUT.
 *
 * `turn` points to an animated image rendered from the geometry. `still` is the
 * artwork shown during loading, outside the playback budget, and in Reduce Motion.
 * Legacy sheet playback is opt-in through `spin`; the tab scenes use transparent
 * turns, which are decoded separately by the browser.
 */
window.GLASS_LAYOUT = {
 "shapes": {
  "links": {
   "still": "assets/shapes/glass-links",
   "turn": "assets/glass-turns/links.avif"
  },
  "star": {
   "still": "assets/shapes/glass-star",
   "sheet": "assets/motion/glass-star",
   "frames": 36,
   "cols": 12,
   "turn": "assets/glass-turns/star.avif"
  },
  "jack": {
   "still": "assets/shapes/glass-jack",
   "sheet": "assets/motion/glass-jack",
   "frames": 36,
   "cols": 12,
   "turn": "assets/glass-turns/jack.avif"
  },
  "torus-m": {
   "still": "assets/shapes/glass-torus-m",
   "sheet": "assets/motion/glass-torus-m",
   "frames": 36,
   "cols": 12,
   "turn": "assets/glass-turns/torus-m.avif"
  },
  "capsule-m": {
   "still": "assets/shapes/glass-capsule-m",
   "sheet": "assets/motion/glass-capsule-m",
   "frames": 36,
   "cols": 12,
   "turn": "assets/glass-turns/capsule-m.avif"
  },
  "capsule-amber": {
   "still": "assets/shapes/glass-capsule-amber",
   "sheet": "assets/motion/glass-capsule-amber",
   "frames": 36,
   "cols": 12,
   "turn": "assets/glass-turns/capsule-amber.avif"
  },
  "blob": {
   "still": "assets/shapes/glass-blob",
   "sheet": "assets/motion/glass-blob",
   "frames": 36,
   "cols": 12,
   "turn": "assets/glass-turns/blob.avif"
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
    }
   ]
  },
  "workout": {
   "height": 1700,
   "hero": {
    "overlay": null,
    "still": "assets/hero-overlays/overlay-workout",
    "turn": "assets/glass-turns/workout.avif",
    "refraction": "assets/glass-refraction/workout.rays",
    "frames": 36,
    "cols": 12,
    "w": 390,
    "h": 340,
    "note": "live elapsed time sits underneath"
   },
   "shapes": []
  },
  "history": {
   "height": 1500,
   "hero": {
    "turn": "assets/glass-turns/history.avif",
    "refraction": "assets/glass-refraction/history.rays",
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
    }
   ]
  },
  "research": {
   "height": 1500,
   "hero": {
    "turn": "assets/glass-turns/research.avif",
    "refraction": "assets/glass-refraction/research.rays",
    "still": "assets/hero-overlays/overlay-research",
    "w": 390,
    "h": 440,
    "note": "live text (paper count) sits underneath; the glass ring turns into depth"
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
    }
   ]
  },
  "research-paper": {
   "height": 1500,
   "shapes": [
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
    }
   ]
  },
  "settings-rest-timer": {
   "height": 1500,
   "shapes": [
    {
     "shape": "capsule-m",
     "x": 252,
     "y": 120,
     "w": 150,
     "h": 153,
     "layer": "back",
     "depth": 0.4,
     "bob": 4,
     "spin": false
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
    }
   ]
  },
  "body": {
   "height": 1500,
   "shapes": [
    {
     "shape": "torus-m",
     "x": 147,
     "y": 62,
     "w": 280,
     "h": 280,
     "layer": "back",
     "depth": 0.4,
     "bob": 4,
     "spin": false
    },
    {
     "shape": "star",
     "x": 273,
     "y": 1095,
     "w": 166,
     "h": 163,
     "layer": "back",
     "depth": 0.4,
     "bob": 4,
     "spin": false
    }
   ]
  },
  "intro": {
   "height": 844,
   "shapes": [
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
