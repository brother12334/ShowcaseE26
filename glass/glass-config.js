/* glass-config.js — every motion number for the glass layer. Load BEFORE glass-motion.js.
   Change a value, reload, watch it. Per-shape overrides go in layout.js or in data-* attributes. */
window.GLASS_CONFIG = {
  fps: 12,                   // frames per second for spinning shapes (36 frames, so 12 = a 3 second loop)
  float: {                   // the gentle bob every shape does
    amplitude: [4, 8],       // px, random per shape within this range
    period: [3.2, 4.8]           // seconds for one bob
  },
  parallax: 0.15,            // how much sprite shapes drift against the scroll
  tilt: 10,                  // px a sprite shape shifts toward the pointer
  depth: 0.4,                // default depth: <1 sits far (moves less), >1 sits near (moves more)
  entrance: { stagger: 60 }, // ms between shapes arriving (look is set in tokens.css)
  pauseOffscreen: true,      // stop animating shapes that are scrolled out of view
  // The nine videos carry a five-second loop at 60 fps. Play at 1× for even refresh timing.
  heroRate: 1,
  // Keep motion on touch screens. Reduced motion still uses the poster.
  stillHeroOnDenseTouch: false,
  /* THE HERO KEEPS PLAYING WHILE THE PAGE MOVES. This was true, to avoid compositing a
     changing frame under moving content. What it actually produced was a hero that
     stopped whenever the page twitched \u2014 and on iOS the rubber-band at the top of a
     screen fires scroll events on its own, so it stopped for no reason the owner could
     see. It still pauses off-screen and when the tab is hidden, which is where the
     saving was. */
  heroPauseOnScroll: false,
  /* How many decorative films may play at once. glass-motion.js lowers this by itself
     if the frames say the device cannot keep up, and never raises it again inside a
     session. Set it to 1 to be certain, or 0 to turn the films off and leave every
     shape on the transform, which costs nothing. */
  filmBudget: 2,
  reducedMotion: 'freeze'    // 'freeze' shows frame 0, no bob. keep this: it is an accessibility rule
};
