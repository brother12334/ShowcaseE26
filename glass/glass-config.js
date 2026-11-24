/* glass-config.js — every motion number for the glass layer. Load BEFORE glass-motion.js.
   Change a value, reload, watch it. Per-shape overrides go in layout.js or in data-* attributes. */
window.GLASS_CONFIG = {
  fps: 12,                   // frames per second for spinning shapes (36 frames, so 12 = a 3 second loop)
  float: {                   // the gentle bob every shape does
    amplitude: [4, 8],       // px, random per shape within this range
    period: [4, 7]           // seconds for one bob
  },
  parallax: 0.15,            // how much sprite shapes drift against the scroll
  tilt: 10,                  // px a sprite shape shifts toward the pointer
  depth: 0.4,                // default depth: <1 sits far (moves less), >1 sits near (moves more)
  entrance: { stagger: 60 }, // ms between shapes arriving (look is set in tokens.css)
  pauseOffscreen: true,      // stop animating shapes that are scrolled out of view
  /* THE HERO VIDEOS, which are 30fps clips rather than sprite sheets.

     THIS WAS 0.5 AND THAT WAS THE STUTTER. The reasoning was that the rotation covers
     enough angle per frame to read as steppy, so halving the rate halves the angle per
     frame. It does — and it also halves how often the picture changes, which is the
     part that matters. A screen recording of the real phone, 1170x2532 at 53fps, shows
     the hero changing once every four captured frames, in a perfectly regular cadence:
     about 15 updates a second. Fifteen is below where motion reads as motion. The
     owner reported it as stuttering and he was reading it correctly.

     THE SAME RECORDING SAYS THE PHONE IS NOT STRUGGLING. The cadence is metronomic —
     no change, no change, no change, change, over and over, with no irregular gap
     anywhere in nine seconds. Nothing is being dropped. The device was displaying
     exactly what it was told to display, and it was told to display half a clip.

     So it is back to the rate the clips were authored at. If the rotation still feels
     fast at 30fps, the fix is a clip with more frames over the same angle, not fewer
     frames over the same time: lowering this slows the motion by making it jerkier,
     which is a trade that only looks like a win on paper. */
  heroRate: 1,
  /* STEP 1 OF FINDING THE REAL COST. This was switched on before the motion rework —
     before still shapes stopped each carrying a backdrop-filter, before the rAF loop
     was limited to visible sprite shapes, and before everything paused during a scroll.
     It has never been tried since. The heroes are only about 0.8 MB of H.264 at
     780x1280, which no iPhone struggles to decode, so the suspect is compositing the
     video under the frosted masked shapes rather than the video itself.
     true  = high-density touch screens get the still poster, no hero motion.
     false = everybody gets the video. */
  stillHeroOnDenseTouch: false,
  heroPauseOnScroll: true,   // stop the hero while the page is moving. See the note in index.html
  reducedMotion: 'freeze'    // 'freeze' shows frame 0, no bob. keep this: it is an accessibility rule
};
