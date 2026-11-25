import { chromium, REPO, appFile, shot } from './_e26.mjs';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
/* THE GLASS TURNS IN SPACE.

   Today's hero is a pre-rendered loop of a real object rotating, and for a long time it
   was the only thing in the app that was. The History capsule and the Research bubble
   were given a CSS translate-and-rotate instead, which slides and tips the PICTURE
   without ever turning the object; the decorative shapes were drawn from a single still
   and bobbed. Beside Today, both read as a nudge rather than a spin, and the owner said
   so. Both are rendered frame sequences now.

   THE REASON SPIN WAS SWITCHED OFF IN THE FIRST PLACE IS STILL TRUE, which is why this
   spec is mostly about restraint rather than about motion. A shape sheet holds 36 frames
   in 12 columns, so a frame is 320px; Program's jack is drawn at 250pt, which on a 3x
   phone asks 750 device pixels of it. That is the blur somebody turned every sheet off
   for. The SMALL shapes have the opposite arithmetic and are the only ones turning here,
   so section 2 checks the arithmetic rather than trusting the list: every shape that
   spins must have a frame big enough for the largest slot it is placed in.

   And section 3 holds the design brief's hard limit, which is the thing a future "make
   it livelier" would quietly break: at most three moving pieces on a screen, counting a
   hero that moves as one of them. */
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

console.log("\n1. THE TWO OVERLAY HEROES STEP THROUGH RENDERED FRAMES");
/* A CSS transform on one image could pass "it moved". Stepping a background POSITION
   across a sprite sheet is something only a real frame sequence does, so that is what is
   read — and the frame count is read off the element, so an art change that silently
   drops back to a still fails here rather than looking fine. */
for(const [tab, name] of [["history", "overlay-history"], ["research", "overlay-research"]]){
  const r = await p.evaluate(async n=>{
    const g = document.querySelector('#stage .glass-layer [data-glass-hero][data-sheet$="' + n + '"]');
    const img = g && g.querySelector('.glass-img');
    const seen = new Set();
    for(let i = 0; i < 14; i++){
      if(img) seen.add(img.style.backgroundPosition);
      await new Promise(ok=> setTimeout(ok, 120));
    }
    return {there: !!g, frames: +((g || {dataset:{}}).dataset.frames || 0),
            cols: +((g || {dataset:{}}).dataset.cols || 0),
            fps: +((g || {dataset:{}}).dataset.fps || 0),
            distinct: seen.size, sample: [...seen].slice(0, 3).join(" | ")};
  }, name);
  ck("CONTROL: " + tab + " mounts its overlay hero from a sheet", r.there && r.frames > 1,
     JSON.stringify(r));
  ck(tab + "'s glass steps through more than one rendered frame", r.distinct > 1,
     r.distinct + " positions in 1.7s: " + r.sample);
  ck("and it is slow enough to be a turn rather than a flicker", r.fps > 0 && r.fps <= 8,
     "fps " + r.fps);
  if(tab === "history") await p.evaluate(()=> boot("research"));
  await p.waitForTimeout(700);
}

console.log("\n2. ONLY SHAPES WITH THE PIXELS FOR IT TURN");
let r = await p.evaluate(async ()=>{
  const L = window.GLASS_LAYOUT;
  const spun = {};
  Object.entries(L.screens).forEach(([screen, sc])=>{
    (sc.shapes || []).forEach(it=>{
      if(it.spin !== true) return;
      const o = spun[it.shape] || (spun[it.shape] = {w:0, screens:[]});
      o.w = Math.max(o.w, it.w, it.h);
      o.screens.push(screen);
    });
  });
  /* The real frame size, measured off the sheet rather than assumed from the config. */
  const out = [];
  for(const [key, o] of Object.entries(spun)){
    const def = L.shapes[key];
    if(!def || !def.sheet){ out.push({key, sheet:false}); continue; }
    const im = new Image(); im.src = def.sheet + ".webp";
    await im.decode();
    const rows = Math.ceil(def.frames / def.cols);
    const fw = im.naturalWidth / def.cols, fh = im.naturalHeight / rows;
    out.push({key, sheet:true, frame: Math.round(fw) + "x" + Math.round(fh),
              biggest: o.w, needs: o.w * 3, ok: fw >= o.w * 3 && fh >= o.w * 3,
              screens: o.screens.length});
  }
  /* and the ones deliberately left alone */
  const still = new Set();
  Object.values(L.screens).forEach(sc=> (sc.shapes || []).forEach(it=>{
    if(it.spin !== true && it.shape) still.add(it.shape); }));
  return {out, stillKeys: [...still].sort().join(",")};
});
ck("CONTROL: some shapes are set to turn", r.out.length >= 2, r.out.map(x=> x.key).join(","));
ck("every one of them has a sheet", r.out.every(x=> x.sheet), JSON.stringify(r.out));
ck("and a frame big enough for its largest slot on a 3× phone",
   r.out.every(x=> x.ok), JSON.stringify(r.out));
/* The other half of the rule, and the half a future change would break: the big shapes
   are still drawn from their stills, because their sheets cannot be sharp at those
   sizes without more memory than a phone will give. */
ck("CONTROL: the big shapes are still left still",
   /jack/.test(r.stillKeys) && /blob/.test(r.stillKeys) && /star/.test(r.stillKeys),
   r.stillKeys);
/* AND NO SPHERE HAS A SHEET, which is the finding this spec exists to stop being undone.
   One was rendered for sphere-xs and then measured: across a full 360-degree turn the
   picture changed by 0.8 of 255, against 37 for capsule-xs and 30 for x-s. A smooth
   sphere is symmetric about every axis and its window bars come from the environment
   rather than its surface, so turning it animates nothing while costing five megabytes
   a screen of decoded sheet. If a sphere ever gets one again, this says why not. */
const spheres = await p.evaluate(()=> Object.entries(window.GLASS_LAYOUT.shapes)
  .filter(([k, v])=> /sphere/.test(k)).map(([k, v])=> k + (v.sheet ? ":SHEET" : ":still")));
ck("CONTROL: there are spheres in the vocabulary", spheres.length >= 2, spheres.join(","));
ck("and not one of them is given frames to flip", spheres.every(x=> /:still$/.test(x)),
   spheres.join(","));

console.log("\n3. THE DESIGN BRIEF'S LIMIT OF THREE MOVING PIECES A SCREEN");
r = await p.evaluate(()=>{
  const L = window.GLASS_LAYOUT;
  return Object.entries(L.screens).map(([k, sc])=>{
    const h = sc.hero;
    const heroMoves = !!(h && (h.video || h.overlay)) ? 1 : 0;
    const spin = (sc.shapes || []).filter(x=> x.spin === true).length;
    return {screen:k, hero:heroMoves, spin, total: heroMoves + spin,
            shapes: (sc.shapes || []).length};
  });
});
ck("CONTROL: the layout really does describe every screen", r.length >= 10, String(r.length));
ck("CONTROL: and more than one screen moves more than one piece at once",
   r.filter(x=> x.total > 1).length > 1, JSON.stringify(r.map(x=> x.screen + ":" + x.total)));
ck("no screen moves more than three pieces at once",
   r.every(x=> x.total <= 3), JSON.stringify(r.filter(x=> x.total > 3)));
ck("and none carries more than six shapes",
   r.every(x=> x.shapes <= 6), JSON.stringify(r.filter(x=> x.shapes > 6)));
/* THE INTRO IS DELIBERATELY STILL. Its three seconds are when the app is most likely to
   run out of room — it is the moment the owner's phone kept dying on — and it plays
   once in a lifetime, so it does not get sheets to decode as well. */
ck("the intro's own shapes do not spin",
   r.find(x=> x.screen === "intro").spin === 0,
   JSON.stringify(r.find(x=> x.screen === "intro")));

console.log("\n4. A SMALL SHAPE ON AN ORDINARY SCREEN REALLY IS TURNING");
await p.evaluate(()=> boot("history"));
await p.waitForTimeout(600);
r = await p.evaluate(async ()=>{
  const g = [...document.querySelectorAll('#stage .glass-layer .glass[data-sheet]')]
    .filter(n=> n.dataset.glassHero === undefined)
    .find(n=> n.getBoundingClientRect().top < innerHeight && n.getBoundingClientRect().bottom > 0);
  if(!g) return {there:false};
  const img = g.querySelector('.glass-img');
  const seen = new Set();
  for(let i = 0; i < 16; i++){
    seen.add(img.style.backgroundPosition);
    await new Promise(ok=> setTimeout(ok, 130));
  }
  return {there:true, name:(g.dataset.sheet || "").split("/").pop(),
          fps:+(g.dataset.fps || 0), distinct: seen.size,
          w: Math.round(g.getBoundingClientRect().width)};
});
ck("CONTROL: a small shape is on screen and drawing from a sheet", r.there === true,
   JSON.stringify(r));
ck("it steps through frames of its own", r.distinct > 1, JSON.stringify(r));
ck("slowly — the owner asked for subtle", r.fps > 0 && r.fps <= 8, "fps " + r.fps);

console.log("\n5. IT STOPS WHEN IT SHOULD, AND NOTHING THREW");
/* Scrolled to, rather than hoping a particular screen happens to place one below the
   fold: the rule is that a sheet off the screen stops stepping, so the test scrolls the
   shapes out of sight and reads the flag glass-motion.js sets. */
r = await p.evaluate(async ()=>{
  const sheets = ()=> [...document.querySelectorAll('#stage .glass[data-sheet]')];
  const all = sheets().length;
  const atTop = sheets().filter(n=> n.hasAttribute('data-glass-paused')).length;
  scrollTo(0, document.documentElement.scrollHeight);
  await new Promise(ok=> setTimeout(ok, 600));
  const atBottom = sheets().filter(n=> n.hasAttribute('data-glass-paused')).length;
  scrollTo(0, 0);
  await new Promise(ok=> setTimeout(ok, 500));
  const back = sheets().filter(n=> n.hasAttribute('data-glass-paused')).length;
  return {all, atTop, atBottom, back,
    wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1};
});
ck("CONTROL: the screen has sheets on it, and they are running", r.all > 0 && r.atTop === 0,
   JSON.stringify(r));
ck("scrolled off the screen, every one of them stops", r.atBottom === r.all,
   JSON.stringify(r));
ck("and starts again when it comes back", r.back === 0, JSON.stringify(r));
ck("the page is not wider than the window", r.wide === false);
ck("no HTTP errors", httpErr.length === 0, httpErr.join(" | ") || "none");
ck("no page errors", pageErr.length === 0, pageErr.join(" | ") || "none");

await p.screenshot({path: shot("spin.png")});
await b.close();
srv.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
