/*
 * scene.js — builds a screen's glass art from layout.js, so nobody writes shape markup by hand.
 *
 *   GlassScene.mount(document.querySelector('#screen'), 'today', { base: '../', day: 'push-b' });
 *   GlassScene.unmount();
 *
 * The container must be position:relative. Heroes with a baked word are drawn as <video> (a still
 * under reduced motion or on high-density touch screens). Heroes with a live number are drawn as a glass overlay you place above the text.
 * Needs glass-config.js, layout.js, glass-motion.js loaded first.
 */
(function () {
  let root = null;
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, style) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (style) Object.assign(e.style, style);
    return e;
  }
  const px = (n) => n + 'px';

  function hero(container, h, o) {
    if (!h) return null;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fill = (s) => s.replace('{day}', o.day || 'push-b');
    if (h.video) {
      // WHAT THIS ACTUALLY BUYS, because the first comment here overstated it.
      // The poster and video share the same native resolution.
      const denseTouch = matchMedia('(pointer: coarse) and (min-resolution: 2.5dppx)').matches;
      const stillOnDenseTouch = (window.GLASS_CONFIG || {}).stillHeroOnDenseTouch !== false;
      if (reduce || (stillOnDenseTouch && denseTouch)) {
        const im = el('img', 'hero-media');
        im.alt = ''; im.src = o.base + fill(h.poster);
        container.append(im); return im;
      }
      const v = el('video', 'hero-media');
      v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.setAttribute('aria-hidden', 'true');
      v.poster = o.base + fill(h.poster);
      v.src = o.base + fill(h.video);
      container.append(v); v.play().catch(() => {});
      return v;
    }
    // live-number hero: a glass overlay, above the text
    const d = el('div', 'glass front', { left: '0', top: '0', width: px(h.w), height: px(h.h) });
    d.dataset.glassHero = '';
    if (h.motion) d.dataset.heroMotion = h.motion;
    if (h.overlay && (!reduce || !h.still)) {
      if (h.fps) d.dataset.fps = h.fps;
      d.dataset.sheet = o.base + h.overlay; d.dataset.frames = h.frames; d.dataset.cols = h.cols;
    } else d.dataset.still = o.base + h.still;
    d.dataset.depth = '0.2'; d.dataset.bob = String(h.bob ?? 0);
    d.setAttribute('aria-hidden', 'true');
    container.append(d);
    return d;
  }

  function mount(container, screen, opts) {
    unmount();
    const o = Object.assign({ base: '', layout: window.GLASS_LAYOUT }, opts);
    const L = o.layout, S = L.screens[screen];
    if (!S) throw new Error('GlassScene: no screen "' + screen + '" in layout');
    root = container;
    const stagger = ((window.GLASS_CONFIG || {}).entrance || {}).stagger || 60;
    const layer = el('div', 'glass-layer');
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:visible';
    if (o.hero !== false) hero(layer, S.hero, o);
    (S.shapes || []).forEach((it, i) => {
      const def = it.still ? { still: it.still } : L.shapes[it.shape];
      if (!def) { console.warn('GlassScene: unknown shape', it.shape); return; }
      const d = el('div', 'glass ' + (it.layer || 'front'),
        { left: px(it.x), top: px(it.y), width: px(it.w), height: px(it.h) });
      /* A SHAPE THAT HAS A FILM PLAYS IT, the same way Today's hero does. The still is
         kept as the poster, so the shape is on screen the moment the layer mounts and
         before a byte of video has arrived, and glass-motion.js only attaches the src
         once it scrolls into view. Video is decoded in hardware; a sprite atlas is not,
         which is the whole reason this path exists. */
      const spin = def.sheet && it.spin === true;
      d.dataset[spin ? 'sheet' : 'still'] = o.base + (spin ? def.sheet : def.still);
      if (spin) { d.dataset.frames = def.frames; d.dataset.cols = def.cols; }
      const film = it.video || def.video;
      if (film && it.video !== false && !reduceMotion()) d.dataset.video = o.base + film;
      for (const k of ['depth', 'fps', 'bob', 'period']) if (it[k] != null) d.dataset[k] = it[k];
      if (def.drift) d.dataset.drift = '';
      d.style.setProperty('--glass-delay', (o.delay || 0) + i * stagger + 'ms');
      layer.append(d);
    });
    container.append(layer);
    GlassMotion.mount(layer);
    return layer;
  }

  function unmount() {
    if (!root) return;
    GlassMotion.unmount();
    root.querySelectorAll('.glass-layer').forEach((n) => n.remove());
    root = null;
  }
  window.GlassScene = { mount, unmount };
})();
