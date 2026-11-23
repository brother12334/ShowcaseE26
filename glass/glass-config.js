/* glass-config.js — every motion number for the glass layer. Load BEFORE glass-motion.js.
   Change a value, reload, watch it. Per-shape overrides go in layout.js or in data-* attributes. */
window.GLASS_CONFIG = {
  fps: 12,                   // frames per second for spinning shapes (36 frames, so 12 = a 3 second loop)
  float: {                   // the gentle bob every shape does
    amplitude: [4, 8],       // px, random per shape within this range
    period: [4, 7]           // seconds for one bob
  },
  parallax: 0.15,            // how much shapes drift against the scroll. 0 turns it off
  tilt: 10,                  // px a shape shifts toward the pointer / device tilt. 0 turns it off
  depth: 0.4,                // default depth: <1 sits far (moves less), >1 sits near (moves more)
  entrance: { stagger: 60 }, // ms between shapes arriving (look is set in tokens.css)
  pauseOffscreen: true,      // stop animating shapes that are scrolled out of view
  /* THE HERO VIDEOS, which are 30fps clips rather than sprite sheets.
     Measured on an iPhone: playback is near perfect — a clean 30fps on a 60Hz screen,
     three held frames in four seconds — but the rotation in the clips covers enough
     angle per frame that 30fps reads as steppy next to everything else on the panel.
     Nothing is dropped; the motion is simply faster than the frame rate flatters.
     Halving it halves the angle per frame and the judder with it, and it matches the
     pacing the shapes already run at (36 frames at 12fps is a 3-second rotation).
     1 is the clip as authored. */
  heroRate: 0.5,
  heroPauseOnScroll: true,   // stop the hero while the page is moving. See the note in index.html
  reducedMotion: 'freeze'    // 'freeze' shows frame 0, no bob. keep this: it is an accessibility rule
};
