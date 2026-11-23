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
  let items = [], raf = 0, io = null, scrollY = 0;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };

  function build(el) {
    if (el.dataset.ready) return null;
    el.dataset.ready = '1';
    const C = cfg();
    const blur = document.createElement('div');
    const img = document.createElement('div');
    blur.className = 'glass-blur';
    img.className = 'glass-img';
    el.append(blur, img);
    const base = el.dataset.sheet || el.dataset.still;
    img.style.backgroundImage = `url(${base}.webp)`;
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
      bob: el.dataset.bob ? +el.dataset.bob : rnd(C.float.amplitude),
      period: el.dataset.period ? +el.dataset.period : rnd(C.float.period),
      visible: true, last: -1
    };
  }

  function setFrame(it, f) {
    if (f === it.last) return;
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
      if (!it.visible && C.pauseOffscreen) continue;
      if (it.frames > 1) setFrame(it, Math.floor((t + it.phase) * it.fps) % it.frames);
      const bob = Math.sin(((t + it.phase) / it.period) * Math.PI * 2) * it.bob;
      const par = -scrollY * (it.depth - 1) * C.parallax;
      it.el.style.transform = `translate3d(${tilt.x * C.tilt * it.depth}px, ${bob + par + tilt.y * C.tilt * it.depth}px, 0)`;
    }
    raf = requestAnimationFrame(tick);
  }
  const start = () => { if (!raf && items.length) raf = requestAnimationFrame(tick); };

  function mount(root) {
    const fresh = [...(root || document).querySelectorAll('.glass')].map(build).filter(Boolean);
    if (!io) {
      io = new IntersectionObserver((entries) => {
        for (const e of entries) { const it = items.find((i) => i.el === e.target); if (it) it.visible = e.isIntersecting; }
      }, { rootMargin: '120px' });
    }
    for (const it of fresh) { io.observe(it.el); setFrame(it, 0); }
    items = items.concat(fresh);
    start();
  }
  function unmount() {
    for (const it of items) io && io.unobserve(it.el);
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
  document.addEventListener('visibilitychange', start);
  reduce.addEventListener('change', () => {
    if (reduce.matches) items.forEach((it) => { setFrame(it, 0); it.el.style.transform = ''; });
    start();
  });
  window.GlassMotion = { mount, unmount, pulse };
})();
