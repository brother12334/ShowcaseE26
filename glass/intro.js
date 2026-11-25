/*
 * intro.js — the old-to-new design transition (about 3.4 s). Web Animations API, no dependencies.
 *
 *   E26Intro.play({
 *     stage:  el,        // .intro-stage, position:relative, holds the two screens
 *     legacy: el,        // the OLD screen, child of stage with class intro-legacy
 *     next:   el,        // the NEW screen, child of stage with class intro-next
 *     origin: { x: 195, y: 470 },   // where the bubble is born, in stage px
 *     base:   '../',     // folder that holds assets/
 *     hero:   el,        // optional: the new hero <video>/<img>, it scales and de-blurs in
 *     rise:   '[data-rise]',        // elements inside `next` that float up in sequence
 *     scene:  'intro',   // layout.js screen whose shapes drop in (null for none)
 *     on:     { bubble, burst, land, done },   // hooks: fire haptics / sound here
 *   }).then(() => { ...real app is now live... });
 *
 * Returns a promise with .skip() and .reset(). Tapping the stage skips. Under prefers-reduced-motion
 * the intro is a 300 ms cross-fade. Every timing and curve is in E26Intro.timing: edit it, replay.
 */
(function () {
  const timing = {
    tension: 420,        // old screen tightens before anything happens
    bubbleAt: 220,       // the bubble starts inflating
    bubbleIn: 620,       // ...and takes this long
    burstAt: 1000,       // the bubble bursts, the lens opens
    burstDur: 1250,      // lens travels edge to edge
    echoDelay: 110,      // second, warm-coloured ring trails the first
    heroAt: 1050, heroDur: 1500,   // new hero scales and de-blurs in
    riseAt: 1500, riseStep: 75, riseDur: 560,   // content floats up, one after another
    shapesAt: 1550, shapesStep: 95,             // glass shapes drop in
    pulseAt: 2750, pulseStep: 90,               // a final ripple across the shapes
    burstEase: 'cubic-bezier(.55,0,.2,1)',
    bubbleEase: 'cubic-bezier(.2,1.4,.35,1)',
    riseEase: 'cubic-bezier(.2,.8,.2,1)'
  };

  function play(o) {
    const T = Object.assign({}, timing, o.timing);
    const { stage, legacy, next } = o;
    const W = stage.clientWidth, H = stage.clientHeight;
    const ox = o.origin ? o.origin.x : W / 2, oy = o.origin ? o.origin.y : H * 0.55;
    const R = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) + 40;   // radius that covers the stage
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const anims = [], timers = [], made = [];
    const on = Object.assign({ bubble() {}, burst() {}, land() {}, done() {} }, o.on);
    let finished = false, resolve;
    const done = new Promise((r) => (resolve = r));
    const A = (e, kf, opt) => { const a = e.animate(kf, Object.assign({ fill: 'both' }, opt)); anims.push(a); return a; };
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const make = (tag, cls) => { const e = document.createElement(tag); e.className = cls; stage.append(e); made.push(e); return e; };

    stage.classList.add('is-playing');
    stage.style.setProperty('--ox', ox + 'px'); stage.style.setProperty('--oy', oy + 'px');

    function shapes(delay) {
      if (!o.scene || !window.GlassScene) return;
      GlassScene.mount(next, o.scene, { base: o.base || '', hero: false, delay: delay || 0 });
    }

    if (reduce) {
      A(legacy, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
      A(next, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      shapes(0);
      later(320, finish);
    } else {
      // 1. the old screen tightens
      A(legacy, [{ transform: 'scale(1)', filter: 'none' }, { transform: 'scale(.97)', filter: 'saturate(.8)' }],
        { duration: T.tension, easing: 'ease-out' });
      // 2. a rounded glass tile expands in the middle of it
      const bub = make('div', 'intro-bubble');
      bub.style.left = ox + 'px'; bub.style.top = oy + 'px';
      const im = document.createElement('img'); im.alt = ''; im.src = (o.base || '') + 'assets/shapes/glass-rbox-s.webp'; bub.append(im);
      A(bub, [{ opacity: 0, transform: 'scale(.05)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: T.bubbleIn, delay: T.bubbleAt, easing: T.bubbleEase });
      A(bub, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.5)' }],
        { duration: 260, delay: T.burstAt, easing: 'ease-out' });
      later(T.bubbleAt, on.bubble);
      // 3. it bursts: the lens ring travels out, and inside it is the new screen
      const ring = make('div', 'intro-ring'), echo = make('div', 'intro-ring echo');
      for (const [r, d] of [[ring, 0], [echo, T.echoDelay]]) {
        r.style.left = ox + 'px'; r.style.top = oy + 'px';
        A(r, [{ width: '120px', height: '120px', opacity: 1 }, { width: 2 * R + 'px', height: 2 * R + 'px', opacity: 0.9 },
              { width: 2 * R + 40 + 'px', height: 2 * R + 40 + 'px', opacity: 0 }],
          { duration: T.burstDur + 220, delay: T.burstAt + d, easing: T.burstEase, offset: [0, 0.82, 1] });
      }
      A(next, [{ clipPath: `circle(60px at ${ox}px ${oy}px)` }, { clipPath: `circle(${R}px at ${ox}px ${oy}px)` }],
        { duration: T.burstDur, delay: T.burstAt, easing: T.burstEase });
      const flash = make('div', 'intro-flash');
      A(flash, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 520, delay: T.burstAt });
      A(legacy, [{ transform: 'scale(.97)', filter: 'saturate(.8)', opacity: 1 },
                 { transform: 'scale(.88)', filter: 'blur(7px) saturate(.5) brightness(.6)', opacity: 0.2 }],
        { duration: T.burstDur, delay: T.burstAt, easing: T.burstEase });
      later(T.burstAt, on.burst);
      // 4. the new hero settles in
      if (o.hero) {
        A(o.hero, [{ transform: 'scale(1.4)', filter: 'blur(16px)' }, { transform: 'scale(1)', filter: 'blur(0)' }],
          { duration: T.heroDur, delay: T.heroAt, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
      // 5. content floats up, then the glass shapes drop in
      [...next.querySelectorAll(o.rise || '[data-rise]')].forEach((e, i) =>
        A(e, [{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: T.riseDur, delay: T.riseAt + i * T.riseStep, easing: T.riseEase }));
      later(T.shapesAt, () => { if (!finished) shapes(0); });
      later(T.shapesAt + 700, on.land);
      // 6. a final ripple of pulses
      later(T.pulseAt, () => {
        next.querySelectorAll('.glass').forEach((g, i) => later(i * T.pulseStep, () => window.GlassMotion && GlassMotion.pulse(g)));
      });
      later(T.pulseAt + 900, finish);
    }

    function cleanup() {
      anims.forEach((a) => { try { a.cancel(); } catch (e) {} });
      made.forEach((e) => e.remove());
      stage.classList.remove('is-playing');
      stage.removeEventListener('pointerdown', skip);
    }
    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      anims.forEach((a) => { try { a.finish(); a.cancel(); } catch (e) {} });   // land on the end state, then release
      legacy.style.display = 'none';
      next.style.clipPath = 'none'; next.style.visibility = 'visible';
      made.forEach((e) => e.remove());
      stage.classList.remove('is-playing');
      stage.removeEventListener('pointerdown', skip);
      if (!next.querySelector('.glass')) shapes(0);
      on.done(); resolve();
    }
    function skip() { finish(); }
    function reset() {
      timers.forEach(clearTimeout);
      cleanup();
      if (window.GlassScene) GlassScene.unmount();
      legacy.style.display = ''; legacy.style.cssText = '';
      next.style.cssText = ''; next.querySelectorAll('*').forEach((e) => { e.style.opacity = ''; e.style.transform = ''; });
      finished = true;
    }
    stage.addEventListener('pointerdown', skip);
    done.skip = skip; done.reset = reset;
    return done;
  }
  window.E26Intro = { play, timing };
})();
