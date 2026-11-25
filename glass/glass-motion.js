/*
 * glass-motion.js — plays the pre-rendered glass shapes and adds ambient motion.
 * All numbers come from window.GLASS_CONFIG (glass-config.js); data-* attributes override per shape.
 *
 *   <div class="glass front" data-sheet="assets/motion/glass-star" data-frames="36" data-cols="12"
 *        data-fps="12" data-depth="0.4" style="left:204px; top:536px; width:238px; height:238px"></div>
 *   <div class="glass front" data-still="assets/shapes/glass-sphere-xs" data-depth="1.1" style="..."></div>
 *
 * Normally you do not write that markup: scene.js builds it from layout.js.
 * Call GlassMotion.mount(root) after a screen renders and GlassMotion.unmount() before it is replaced.
 * Shapes pause off-screen and in hidden tabs, and freeze on frame 0 under prefers-reduced-motion.
 */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const D = { fps: 12, float: { amplitude: [4, 8], period: [4, 7] }, parallax: 0.15, tilt: 10, depth: 0.4, pauseOffscreen: true };
  const cfg = () => Object.assign({}, D, window.GLASS_CONFIG || {});
  const rnd = (r) => r[0] + Math.random() * (r[1] - r[0]);
  let items = [], raf = 0, io = null, scrollY = 0, scrollTimer = 0;
  let scrolling = false;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };

  /* THE FILM, IF THE SHAPE HAS ONE. Created empty and left that way until the shape is
     actually on screen: a page with six <video> elements all holding a decoder open is
     a different kind of expensive from one that plays two. syncPlayback attaches the
     src on first sight and pauses it when it leaves. */
  function filmFor(el) {
    const src = el.dataset.video;
    if (!src) return null;
    const v = document.createElement('video');
    v.className = 'glass-film';
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('aria-hidden', 'true');
    v.dataset.src = src;
    el.append(v);
    return v;
  }

  function build(el) {
    if (el.dataset.ready) return null;
    el.dataset.ready = '1';
    const C = cfg();
    const img = document.createElement('div');
    img.className = 'glass-img';
    el.append(img);
    const film = filmFor(el);
    const base = el.dataset.sheet || el.dataset.still;
    img.style.backgroundImage = `url(${base}.webp)`;
    const bob = el.dataset.bob ? +el.dataset.bob : rnd(C.float.amplitude);
    const period = el.dataset.period ? +el.dataset.period : rnd(C.float.period);
    if (!el.dataset.sheet) {
      if (bob > 0) {
        el.setAttribute('data-float', '');
        img.style.setProperty('--glass-bob', bob + 'px');
        img.style.setProperty('--glass-period', period + 's');
        /* HOW FAR IT TURNS, by how big it is drawn. A 45px sphere and a 250px jack
           given the same five degrees do not read the same: the small one shows almost
           no change in silhouette, which is why the little ornaments looked frozen. So
           the swing scales inversely with the drawn size, within limits, and the signs
           and phase are jittered so a screenful of them does not rock in unison. */
        const w = parseFloat(el.style.width) || 120;
        const k = Math.max(0.75, Math.min(2.3, 150 / w));
        const sx = Math.random() < 0.5 ? -1 : 1, sy = Math.random() < 0.5 ? -1 : 1;
        img.style.setProperty('--gx', (sx * (5 + 3.5 * k)).toFixed(1) + 'deg');
        img.style.setProperty('--gy', (sy * (9 + 9 * k)).toFixed(1) + 'deg');
        img.style.setProperty('--gz', (sx * (1.5 + 2 * k)).toFixed(1) + 'deg');
        img.style.setProperty('--glass-persp', Math.round(380 + 2.2 * w) + 'px');
        img.style.animationDelay = (-Math.random() * period).toFixed(2) + 's';
      }
      return { el, film, frames: 1, visible: false };
    }

    const blur = document.createElement('div');
    blur.className = 'glass-blur';
    el.prepend(blur);
    blur.style.webkitMaskImage = blur.style.maskImage = `url(${base}-mask.png)`;
    const frames = +el.dataset.frames || 1, cols = +el.dataset.cols || 1, rows = Math.ceil(frames / cols);
    const size = `${cols * 100}% ${rows * 100}%`;
    img.style.backgroundSize = size;
    blur.style.webkitMaskSize = blur.style.maskSize = size;
    return {
      el, img, blur, film, frames, cols, rows,
      fps: +el.dataset.fps || C.fps,
      depth: el.dataset.depth ? +el.dataset.depth : C.depth,
      phase: Math.random() * 1000,
      bob, period,
      visible: false, last: -1
    };
  }

  function setFrame(it, f) {
    if (!it.img || f === it.last) return;
    it.last = f;
    const c = f % it.cols, r = Math.floor(f / it.cols);
    const x = it.cols > 1 ? (c / (it.cols - 1)) * 100 : 0;
    const y = it.rows > 1 ? (r / (it.rows - 1)) * 100 : 0;
    const pos = `${x}% ${y}%`;
    it.img.style.backgroundPosition = pos;
    it.blur.style.webkitMaskPosition = it.blur.style.maskPosition = pos;
  }

  function tick(now) {
    raf = 0;
    /* `scrolling` is no longer a reason to stop \u2014 see start(). It still drives the
       parallax below, which is the one thing it was always right about. */
    if (document.hidden || reduce.matches) return;
    const C = cfg(), t = now / 1000;
    tilt.x += (tilt.tx - tilt.x) * 0.08;
    tilt.y += (tilt.ty - tilt.y) * 0.08;
    for (const it of items) {
      if (it.frames <= 1 || (!it.visible && C.pauseOffscreen)) continue;
      setFrame(it, Math.floor((t + it.phase) * it.fps) % it.frames);
      if (it.el.hasAttribute('data-glass-hero')) continue;
      const bob = Math.sin(((t + it.phase) / it.period) * Math.PI * 2) * it.bob;
      const par = -scrollY * (it.depth - 1) * C.parallax;
      it.el.style.transform = `translate3d(${tilt.x * C.tilt * it.depth}px, ${bob + par + tilt.y * C.tilt * it.depth}px, 0)`;
    }
    start();
  }
  function start() {
    /* SCROLLING NO LONGER STOPS ANYTHING. It used to, on the theory that compositing a
       moving shape under a moving page is what costs; the owner's answer is that a
       shape which stops every time the page twitches reads as broken, and on iOS the
       rubber-band at the top of a screen fires scroll events constantly, so the X
       appeared to halt at random. Visibility still gates it, which is the rule that
       was actually buying anything. */
    if (document.hidden || reduce.matches) return;
    if (!raf && items.some(it => it.frames > 1 && (it.visible || !cfg().pauseOffscreen))) {
      raf = requestAnimationFrame(tick);
    }
  }
  /* HOW MANY FILMS MAY RUN AT ONCE, and why it is a budget rather than a constant.
     Measured in a headless browser with no GPU, at a quarter speed: one playing film
     costs nothing at all (17ms frames, no long frames in 89) and two doubles the frame
     time, whatever size the video is. That is software decode, which is the worst case
     and not what a phone does - an iPhone decodes these in hardware, which is the whole
     reason Today's hero has never been the slow part of any screen. So guessing a
     number for every device would be guessing twice.
     The budget starts at three and comes down on its own if the frames say it should.
     It never goes back up inside a session, because a budget that oscillates is worse
     than one that is simply too low. */
  let filmBudget = Math.max(0, cfg().filmBudget == null ? 2 : cfg().filmBudget);
  let probe = 0, slowRun = 0, lastTs = 0;

  function filmWatch(ts) {
    probe = 0;
    if (lastTs) {
      const dt = ts - lastTs;
      if (dt > 26) slowRun++; else slowRun = Math.max(0, slowRun - 1);
      if (slowRun > 6 && filmBudget > 1) { filmBudget--; slowRun = 0; syncPlayback(); }
    }
    lastTs = ts;
    if (items.some((it) => it.film && it.film.src && !it.film.paused)) {
      probe = requestAnimationFrame(filmWatch);
    } else { lastTs = 0; }
  }

  function syncPlayback() {
    const pauseOffscreen = cfg().pauseOffscreen;
    const off = reduce.matches || document.hidden;
    /* Nearest the middle of the screen wins the budget: the shape you are looking at is
       the one that actually turns, and the rest keep the transform, which is free. */
    const mid = innerHeight / 2;
    const live = items.filter((it) => it.film && it.visible && !off)
      .sort((a, b) => {
        const ra = a.el.getBoundingClientRect(), rb = b.el.getBoundingClientRect();
        return Math.abs(ra.top + ra.height / 2 - mid) - Math.abs(rb.top + rb.height / 2 - mid);
      });
    const playing = new Set(live.slice(0, filmBudget));
    for (const it of items) {
      const idle = document.hidden || (pauseOffscreen && !it.visible);
      it.el.toggleAttribute('data-glass-paused', idle);
      const v = it.film;
      if (!v) continue;
      if (!playing.has(it)) {
        try { v.pause(); } catch (e) {}
        it.el.removeAttribute('data-film');
        continue;
      }
      if (!v.src) v.src = v.dataset.src;
      it.el.setAttribute('data-film', '');
      v.play().catch(() => {});
    }
    if (!probe && playing.size) probe = requestAnimationFrame(filmWatch);
    start();
  }

  function mount(root) {
    const fresh = [...(root || document).querySelectorAll('.glass')].map(build).filter(Boolean);
    if (!io) {
      io = new IntersectionObserver((entries) => {
        for (const e of entries) { const it = items.find((i) => i.el === e.target); if (it) it.visible = e.isIntersecting; }
        syncPlayback();
      });
    }
    for (const it of fresh) { io.observe(it.el); setFrame(it, 0); }
    items = items.concat(fresh);
    syncPlayback();
  }
  function unmount() {
    for (const it of items) io && io.unobserve(it.el);
    items = [];
    if (probe) cancelAnimationFrame(probe);
    probe = 0; lastTs = 0; slowRun = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  /* A little reaction, e.g. when a set is logged: GlassMotion.pulse(element) */
  function pulse(el) {
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
    el.addEventListener('animationend', () => el.classList.remove('pulse'), { once: true });
  }

  addEventListener('scroll', () => {
    scrollY = window.scrollY;
    if (!scrolling) {
      scrolling = true;
      syncPlayback();
    }
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      scrolling = false;
      syncPlayback();
    }, 160);
  }, { passive: true });
  addEventListener('pointermove', (e) => {
    tilt.tx = (e.clientX / innerWidth - 0.5) * 2;
    tilt.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  document.addEventListener('visibilitychange', syncPlayback);
  reduce.addEventListener('change', () => {
    if (reduce.matches) items.forEach((it) => { setFrame(it, 0); it.el.style.transform = ''; });
    start();
  });
  window.GlassMotion = { mount, unmount, pulse };
})();
