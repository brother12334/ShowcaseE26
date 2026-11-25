import { chromium, REPO, appFile, shot } from './_e26.mjs';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
/* THE GLASS TURNS, AND NOTHING DECODES A SPRITE ATLAS TO DO IT.

   This spec is the record of a wrong turn, because the wrong turn is the thing that
   will be taken again. Today's hero is a rendered loop of a real object rotating, so
   the obvious way to make the other shapes turn was to give each of them the same:
   a sprite atlas of rendered frames, stepped by changing a background-position.

   It was correct and it was unusable. An atlas is 10 to 50MB decoded and a screen
   carries three; every shape that has one gets a masked backdrop-filter layer built
   behind it by glass-motion.js; and stepping the background-position repaints that
   layer every frame. The owner's phone went from smooth to crawling, and the small
   ornaments - which had been floating and tilting - stopped doing even that, because
   a shape with an atlas does not get the float.

   What replaced it costs nothing: the baked art stays one sharp still and the browser
   turns it on the GPU. Section 1 holds the rule that makes it fast, section 2 that the
   motion is actually big enough to see, and section 3 the design brief's shape budget.

   SECTION 2 IS THE ONE THAT MATTERS. The transform was already there before any of
   this, at rotateX 3deg and rotateY 5deg, and the owner reported the small shapes as
   not animating. They were animating, by a sixteenth of a turn, on a 45 pixel sphere.
   "There is an animation attached" is exactly the sort of thing a spec will happily
   confirm while the screen looks frozen, so what is asserted is the ANGLE. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const FEED = JSON.parse(readFileSync(appFile('tests/fixtures/research-feed.json'), 'utf8'));
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.webp':'image/webp', '.png':'image/png', '.mp4':'video/mp4',
  '.ttf':'font/ttf', '.svg':'image/svg+xml', '.mp3':'audio/mpeg',
  '.webmanifest':'application/manifest+json' };
const srv = createServer(async (q, r)=>{
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = join(REPO, normalize(u === '/' ? '/index.html' : u));
  try{ const bytes = await readFile(f);
    r.writeHead(200, {'content-type': MIME[extname(f)] || 'application/octet-stream'});
    r.end(bytes); }
  catch(e){ r.writeHead(404); r.end('no'); }
});
await new Promise(ok=> srv.listen(0, ok));
const BASE = 'http://127.0.0.1:' + srv.address().port + '/';

const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const httpErr = [], pageErr = [];

const NOW = Date.now();
const SEED = {at: NOW, papers: FEED.papers.map((x, i)=>
  Object.assign({}, x, {authors:["Pelland","Remmert"], addedAt: NOW - i * 3600000}))};

const p = await b.newPage({viewport:{width:390,height:844}, deviceScaleFactor:3});
p.on('dialog', d=> d.accept());
p.on('pageerror', e=> pageErr.push(e.message));
p.on('response', rs=>{ if(rs.status() >= 400) httpErr.push(rs.status()+' '+rs.url().replace(BASE,'')); });
await p.addInitScript(seed=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X');
  localStorage.setItem('e26.research.v1', JSON.stringify(seed)); }, SEED);
await p.goto(BASE, {waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S !== 'undefined' && !!S, null, {timeout:20000});
await p.evaluate(fx=>{
  window.boot = (tab)=>{
    const sp = document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
    ['preflight','aiFull'].forEach(id=>{ const el = document.getElementById(id); if(el) el.remove(); });
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true; S.active = null; S.seenNews = "x";
    S.introSeen = (typeof INTRO_GEN === "number") ? INTRO_GEN : 1;
    S.tourGen = (typeof TOUR_GEN === "number") ? TOUR_GEN : 1;
    try{ RESEARCH_PAPER = null; }catch(e){}
    migrate(); try{ applySplit(); }catch(e){}
    TAB = tab; SET_PAGE = null; render(); try{ glassSync(); }catch(e){}
  };
  boot("history");
}, FX);
await p.waitForTimeout(700);

console.log("\n1. NOT ONE SPRITE ATLAS, AND NOT ONE BACKDROP FILTER");
/* Both halves of the cost that made the app crawl, on the screens carrying the most
   art. A single backdrop-filter is the most expensive thing on an iOS page and
   glass-motion.js builds one for every shape drawn from an atlas, so the two are
   really one assertion. */
for(const tab of ["history", "research", "sync", "body"]){
  const r = await p.evaluate(t=>{
    boot(t);
    const g = [...document.querySelectorAll('#stage .glass')];
    return {n: g.length,
            atlas: g.filter(x=> x.dataset.sheet).map(x=> x.dataset.sheet.split('/').pop()),
            blur: document.querySelectorAll('#stage .glass-blur').length};
  }, tab);
  ck("CONTROL: " + tab + " really has art on it", r.n > 0, String(r.n));
  ck(tab + " mounts no sprite atlas", r.atlas.length === 0, r.atlas.join(",") || "none");
  ck("and builds no backdrop-filter layer", r.blur === 0, String(r.blur));
}
{
  const layout = await p.evaluate(()=> window.GLASS_LAYOUT);
  const armed = Object.entries(layout.screens).flatMap(([k, sc])=>
    (sc.shapes || []).filter(it=> it.spin === true).map(it=> k + "/" + it.shape));
  ck("and not one placement asks for one", armed.length === 0, armed.join(",") || "none");
}

console.log("\n1b. THE SHAPES TURN FROM A FILM, THE WAY TODAY'S HERO DOES");
/* MP4 is decoded in hardware, which is why Today's x has never been the slow part of
   any screen, and it is a real render of a real object turning rather than a transform
   on a picture. Every shape in the vocabulary has one and every placement reaches it. */
{
  const r = await p.evaluate(()=>{
    const L = window.GLASS_LAYOUT;
    const noFilm = Object.entries(L.shapes).filter(([k, v])=> !v.video).map(([k])=> k);
    const places = Object.entries(L.screens).flatMap(([k, sc])=> (sc.shapes || []).map(it=> ({
      screen: k, name: it.shape || (it.still || "").split("/").pop(),
      film: !!(it.video || (it.shape && L.shapes[it.shape] && L.shapes[it.shape].video))})));
    return {noFilm, places, without: places.filter(x=> !x.film)};
  });
  ck("CONTROL: there are placements to check", r.places.length >= 20, String(r.places.length));
  ck("every shape in the vocabulary has a film", r.noFilm.length === 0, r.noFilm.join(","));
  ck("and every placement on every screen reaches one", r.without.length === 0,
     r.without.map(x=> x.screen + "/" + x.name).join(",") || "none");
}
{
  /* It plays, it is lazy, and the still is underneath it the whole time. */
  const r = await p.evaluate(async ()=>{
    boot("history");
    await new Promise(ok=> setTimeout(ok, 2200));
    const films = [...document.querySelectorAll('#stage .glass-film')];
    return {n: films.length,
            playing: films.filter(v=> v.src && !v.paused).length,
            lazy: films.filter(v=> !v.src).length,
            blend: (()=>{ const w = document.querySelector('.dg-shapes');
              return w ? getComputedStyle(w).mixBlendMode : "-"; })(),
            onFilm: films.length ? getComputedStyle(films[0]).mixBlendMode : "-",
            ghosts: [...document.querySelectorAll('#stage .glass[data-film] > .glass-img')]
              .filter(i=> +getComputedStyle(i).opacity > 0.01).length,
            posters: [...document.querySelectorAll('#stage .glass .glass-img')]
              .filter(i=> /url\(/.test(getComputedStyle(i).backgroundImage)).length};
  });
  ck("CONTROL: the screen builds its films", r.n >= 3, String(r.n));
  ck("at least one of them is actually playing", r.playing >= 1, JSON.stringify(r));
  /* THE BLEND IS ON THE WRAPPER AND NOT ON THE FILM, and the difference is the whole
     bug the owner photographed. mix-blend-mode composites against the nearest ancestor
     that forms a stacking context; .dg-shapes is one, because it carries a transform
     and a z-index. On the <video> the blend therefore reached an empty box instead of
     the page, every black pixel stayed black, and the torus arrived on the phone inside
     a solid black rectangle. Chromium had been lenient about it, which is why this had
     to be asserted on the element that actually does the blending. */
  ck("the shapes layer is what carries the screen blend", r.blend === "screen", r.blend);
  ck("and the film itself does not, or it would blend against nothing",
     r.onFilm === "normal", r.onFilm);
  /* And the still has to get out of the way underneath, because screen ADDS the film
     rather than painting over it: the two together were a frozen copy of every shape. */
  ck("no shape wears a still behind its running film", r.ghosts === 0, String(r.ghosts));
  ck("and every shape still has its still underneath, so nothing pops in",
     r.posters >= r.n, r.posters + " stills for " + r.n + " films");
}

console.log("\n1c. AND NO MORE OF THEM RUN AT ONCE THAN THE DEVICE CAN TAKE");
/* The measurement that set this: in a headless browser with no GPU, at quarter speed,
   one playing film is free - 17ms frames, no long frames in 89 - and two doubles the
   frame time whatever resolution the video is. That is software decode and a phone
   does better, so the budget is a starting guess that lowers itself rather than a
   constant somebody has to be right about. What must hold is that there IS a cap. */
{
  const r = await p.evaluate(async ()=>{
    boot("history");
    await new Promise(ok=> setTimeout(ok, 2500));
    const films = [...document.querySelectorAll('#stage .glass-film')];
    const fr = []; let last = performance.now();
    await new Promise(ok=>{ let n = 0;
      const t = x=>{ fr.push(x - last); last = x; if(++n < 80) requestAnimationFrame(t); else ok(); };
      requestAnimationFrame(t); });
    fr.shift();
    const sorted = fr.slice().sort((a, b)=> a - b);
    return {playing: films.filter(v=> v.src && !v.paused).length, all: films.length,
            budget: (window.GLASS_CONFIG || {}).filmBudget,
            med: Math.round(sorted[Math.floor(sorted.length / 2)]),
            long: fr.filter(x=> x > 24).length, n: fr.length};
  });
  ck("CONTROL: the screen has more films than the budget allows", r.all > r.playing,
     JSON.stringify(r));
  ck("so only a few play at once", r.playing <= Math.max(1, r.budget), JSON.stringify(r));
  ck("and the frames are not long ones", r.long <= 4 && r.med <= 20, JSON.stringify(r));
}

console.log("\n2. AND THE ONES NOT PLAYING STILL TURN BIG ENOUGH TO SEE");
await p.evaluate(()=> boot("history"));
await p.waitForTimeout(500);
let r = await p.evaluate(async ()=>{
  const read = ()=> [...document.querySelectorAll('#stage .glass')].map(g=>{
    const i = g.querySelector('.glass-img');
    const cs = i ? getComputedStyle(i) : null;
    return {n: (g.dataset.still || '').split('/').pop(),
            w: Math.round(g.getBoundingClientRect().width),
            on: !!cs && cs.animationName !== "none",
            gy: Math.abs(parseFloat(cs ? cs.getPropertyValue('--gy') : "0") || 0),
            t: cs ? cs.transform : ""};
  });
  const a = read();
  await new Promise(ok=> setTimeout(ok, 1500));
  const b = read();
  return a.map((x, i)=> Object.assign(x, {moved: b[i] && b[i].t !== x.t}));
});
const orn = r.filter(x=> x.gy > 0);
ck("CONTROL: the screen's ornaments are all animating", orn.length >= 3 && orn.every(x=> x.on),
   JSON.stringify(orn.map(x=> x.n + ":" + x.on)));
/* Five degrees is what "not animating" looked like. Fifteen is the floor, and the
   smallest shapes - which have the least silhouette to show a turn with - must swing
   furthest rather than the same as everything else. */
ck("none of them turns by less than nineteen degrees", orn.every(x=> x.gy >= 19),
   JSON.stringify(orn.map(x=> x.n + " " + x.w + "px " + x.gy + "deg")));
/* AND IT TRAVELS THE WHOLE TIME. This is the one that caught the shapes the owner kept
   reporting as still. Every transform WAS changing, continuously, and could be measured
   doing so - but the animation alternates with an ease at both ends, so each shape spent
   a large part of its cycle parked at a turnaround while the pixels did not move. A
   true assertion about the transform would have passed happily over a screen that looks
   frozen; what has to hold is that there is no dwell, which is the timing function. */
{
  const ease = await p.evaluate(()=> [...document.querySelectorAll('#stage .glass[data-float] > .glass-img')]
    .map(i=> getComputedStyle(i).animationTimingFunction));
  ck("CONTROL: the ornaments carry a timing function", ease.length >= 3, ease.join(","));
  ck("and it is a constant speed, so none of them dwells",
     ease.every(x=> x === "linear"), ease.join(","));
}
ck("and the small ones turn furthest", (()=>{
    const small = orn.filter(x=> x.w <= 90), big = orn.filter(x=> x.w >= 150);
    return !small.length || !big.length
      || Math.min(...small.map(x=> x.gy)) > Math.max(...big.map(x=> x.gy)) - 1;
  })(), JSON.stringify(orn.map(x=> x.w + "px:" + x.gy)));
ck("the ones on screen are moving right now", r.filter(x=> x.moved).length >= 2,
   JSON.stringify(r.map(x=> x.n + ":" + x.moved)));

console.log("\n3. THE DESIGN BRIEF'S SHAPE BUDGET");
r = await p.evaluate(()=>{
  const L = window.GLASS_LAYOUT;
  return Object.entries(L.screens).map(([k, sc])=> ({screen:k, shapes:(sc.shapes || []).length}));
});
ck("CONTROL: the layout describes every screen", r.length >= 10, String(r.length));
ck("no screen carries more than six shapes", r.every(x=> x.shapes <= 6),
   JSON.stringify(r.filter(x=> x.shapes > 6)));

console.log("\n4. IT STILL STOPS WHEN IT SHOULD");
await p.evaluate(()=> boot("sync"));
await p.waitForTimeout(500);
r = await p.evaluate(async ()=>{
  const all = ()=> [...document.querySelectorAll('#stage .glass')];
  const paused = ()=> all().filter(n=> n.hasAttribute('data-glass-paused')).length;
  const atTop = paused();
  scrollTo(0, document.documentElement.scrollHeight);
  await new Promise(ok=> setTimeout(ok, 700));
  const atBottom = paused();
  scrollTo(0, 0);
  await new Promise(ok=> setTimeout(ok, 600));
  return {n: all().length, atTop, atBottom, back: paused()};
});
ck("CONTROL: there is art to pause", r.n > 0, JSON.stringify(r));
ck("scrolled away, the ones off the screen stop", r.atBottom > 0, JSON.stringify(r));
ck("and they are running again when they come back", r.back < r.atBottom, JSON.stringify(r));

console.log("\n5. REDUCED MOTION STOPS ALL OF IT");
await p.emulateMedia({reducedMotion:"reduce"});
await p.evaluate(()=> boot("history"));
await p.waitForTimeout(400);
r = await p.evaluate(()=> [...document.querySelectorAll('#stage .glass .glass-img')]
  .map(i=> getComputedStyle(i).animationName));
ck("CONTROL: there are ornaments to stop", r.length >= 3, String(r.length));
ck("every one of them is still", r.every(x=> x === "none"), r.join(","));
await p.emulateMedia({reducedMotion:"no-preference"});

console.log("\n6. NOTHING RAN OFF THE SIDE, AND NOTHING THREW");
r = await p.evaluate(()=> document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
ck("the page is not wider than the window", r === false);
ck("no HTTP errors", httpErr.length === 0, httpErr.join(" | ") || "none");
ck("no page errors", pageErr.length === 0, pageErr.join(" | ") || "none");

await p.screenshot({path: shot("spin.png")});
await b.close();
srv.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
