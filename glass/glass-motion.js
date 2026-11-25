/*
 * glass-motion.js — plays the pre-rendered glass shapes and adds ambient motion.
 * All numbers come from window.GLASS_CONFIG (glass-config.js); data-* attributes override per shape.
 *
 *   <div class="glass front" data-sheet="assets/motion/glass-star" data-frames="36" data-cols="12"
 *        data-fps="12" data-depth="0.4" style="left:204px; top:536px; width:238px; height:238px"></div>
 *   <div class="glass front" data-still="assets/shapes/glass-rbox-s" data-depth="1.1" style="..."></div>
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
  let items = [], raf = 0, io = null, scrollY = 0;
  let turnTimer = 0, turnOffset = 0, bakedHero = false;
  let qualityLimit = 3, sample = 0, lastFrame = 0, frameCount = 0, slowFrames = 0;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };

  function build(el) {
    if (el.dataset.ready) return null;
    el.dataset.ready = '1';
    const C = cfg();
    const img = document.createElement('div');
    img.className = 'glass-img';
    el.append(img);
    const base = el.dataset.sheet || el.dataset.still;
    img.style.backgroundImage = `url(${base}.webp)`;
    const bob = el.dataset.bob ? +el.dataset.bob : rnd(C.float.amplitude);
    const period = el.dataset.period ? +el.dataset.period : rnd(C.float.period);
    if (!el.dataset.sheet) {
      if (bob > 0) {
        el.setAttribute('data-float', '');
        img.style.setProperty('--glass-bob', bob + 'px');
        img.style.setProperty('--glass-period', period + 's');
      }
      return { el, frames: 1, visible: false, still: img };
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
      el, img, blur, frames, cols, rows,
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
  function stopTurn(item) {
    if (!item.turn) return;
    clearTimeout(item.turnTimeout);
    item.stopRefraction?.();
    item.stopRefraction = null;
    item.turn.onerror = item.turn.onload = null;
    if (item.turn.tagName === 'VIDEO') {
      item.turn.pause();
    }
    item.turn.removeAttribute('src');
    if (item.turn.tagName === 'VIDEO') item.turn.load();
    item.turn.remove();
    item.turn = null;
    item.still.style.visibility = '';
  }

  function watchTurns(now) {
    sample = 0;
    const active = items.filter(item => item.turn?.classList.contains('glass-turn')).length + Number(bakedHero);
    if (document.hidden || active < 3) { lastFrame = frameCount = slowFrames = 0; return; }
    if (lastFrame) {
      frameCount++;
      if (now - lastFrame > 27) slowFrames++;
    }
    lastFrame = now;
    if (slowFrames >= 5 && qualityLimit > 2) {
      qualityLimit = 2;
      frameCount = slowFrames = 0;
      syncTurns();
    } else if (frameCount >= 48) {
      frameCount = slowFrames = 0;
    }
    if (!sample && qualityLimit > 2) sample = requestAnimationFrame(watchTurns);
  }

  // A platform can report support for the color codec and drop the alpha layer.
  // Verify the clear corner of the first decoded frame before swapping the still.
  function hasVideoAlpha(video) {
    const probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    const g = probe.getContext('2d', { willReadFrequently: true });
    if (!g) return false;
    try {
      g.drawImage(video, 0, 0, 4, 4, 0, 0, 1, 1);
      return g.getImageData(0, 0, 1, 1).data[3] < 64;
    } catch (error) {
      return false;
    }
  }

  function playTurn(item) {
    const source = item.el.dataset.turn;
    const base = source.replace(/\.avif$/, '');
    const formats = [
      { extension: '.mp4', type: 'video/mp4; codecs="hvc1"' },
      { extension: '.webm', type: 'video/webm; codecs="vp9"' }
    ];
    function reveal(turn) {
      if (item.turn !== turn || !item.el.isConnected) return;
      clearTimeout(item.turnTimeout);
      turn.className = 'glass-turn';
      if (!turn.isConnected) item.el.append(turn);
      item.still.style.visibility = 'hidden';
      if (turn.tagName === 'VIDEO' && item.el.dataset.refraction) {
        item.stopRefraction = window.GlassRefraction?.start(item.el, turn, item.el.dataset.refraction);
      }
      if (!sample && qualityLimit > 2) sample = requestAnimationFrame(watchTurns);
    }
    function attempt(index) {
      const format = formats[index];
      if (!format) {
        const turn = document.createElement('img');
        turn.alt = '';
        turn.decoding = 'async';
        item.turn = turn;
        turn.onload = () => reveal(turn);
        turn.onerror = () => { if (item.turn === turn) stopTurn(item); };
        turn.src = source;
        return;
      }
      const video = document.createElement('video');
      if (!video.canPlayType(format.type)) {
        attempt(index + 1);
        return;
      }
      const next = () => {
        if (item.turn !== video) return;
        stopTurn(item);
        attempt(index + 1);
      };
      video.className = 'glass-turn-loading';
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.loop = true;
      video.disablePictureInPicture = true;
      video.setAttribute('aria-hidden', 'true');
      item.turn = video;
      video.onerror = next;
      item.turnTimeout = setTimeout(next, 2500);
      item.el.append(video);
      video.src = base + format.extension;
      video.play().then(() => {
        if (item.turn !== video) return;
        if (hasVideoAlpha(video)) reveal(video);
        else next();
      }, next);
    }
    attempt(0);
  }

  function syncTurns() {
    clearTimeout(turnTimer);
    const eligible = document.hidden || reduce.matches ? [] : items.filter(item =>
      item.visible && item.el.dataset.turn && getComputedStyle(item.el).visibility !== 'hidden');
    const hero = eligible.find(item => item.el.hasAttribute('data-glass-hero'));
    const ornaments = eligible.filter(item => item !== hero);
    const slots = qualityLimit - Number(bakedHero) - Number(!!hero);
    const offset = turnOffset % Math.max(ornaments.length, 1);
    const selected = new Set(ornaments.concat(ornaments).slice(offset, offset + Math.min(slots, ornaments.length)));
    if (hero) selected.add(hero);
    for (const item of items) {
      if (!selected.has(item)) { stopTurn(item); continue; }
      if (item.turn) continue;
      playTurn(item);
    }
    if (ornaments.length > slots) {
      turnTimer = setTimeout(() => { turnOffset += slots; syncTurns(); }, 3600);
    }
  }

  function syncPlayback() {
    const pauseOffscreen = cfg().pauseOffscreen;
    for (const it of items) {
      it.el.toggleAttribute('data-glass-paused', document.hidden || (pauseOffscreen && !it.visible));
    }
    syncTurns();
    start();
  }

  function mount(root) {
    bakedHero = !!(root || document).querySelector("video.hero-media");
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
    clearTimeout(turnTimer);
    if (sample) cancelAnimationFrame(sample);
    sample = 0; lastFrame = frameCount = slowFrames = 0;
    turnOffset = 0;
    for (const it of items) {
      if (io) io.unobserve(it.el);
      stopTurn(it);
    }
    items = [];
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  /* A little reaction, e.g. when a set is logged: GlassMotion.pulse(element) */
  function pulse(el) {
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
    el.addEventListener('animationend', () => el.classList.remove('pulse'), { once: true });
  }

  addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  addEventListener('pointermove', (e) => {
    tilt.tx = (e.clientX / innerWidth - 0.5) * 2;
    tilt.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  document.addEventListener('visibilitychange', syncPlayback);
  reduce.addEventListener('change', () => {
    if (reduce.matches) items.forEach((it) => { setFrame(it, 0); it.el.style.transform = ''; });
    syncPlayback();
  });
  window.GlassMotion = { mount, unmount, pulse, refresh: syncPlayback };
})();
