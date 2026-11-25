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
/* Both halves of the cost, on the three screens that carry the most art. A single
   backdrop-filter is the most expensive thing on an iOS page and glass-motion.js builds
   one for every shape that has an atlas, so the two are really one assertion. */
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
/* AND NOTHING IS ARMED TO START USING ONE. The shape definitions still name an atlas
   each, which is fine and deliberate - the files exist, the renderer still makes them,
   and a future screen with one large slow ornament could reasonably want one. What
   must not happen quietly is a placement turning it on across a screenful of shapes,
   which is the change that cost the frame rate. So the check is on the placements. */
{
  const layout = await p.evaluate(()=> window.GLASS_LAYOUT);
  const placements = Object.entries(layout.screens).flatMap(([k, sc])=>
    (sc.shapes || []).map(it=> ({screen:k, shape:it.shape, spin:it.spin === true})));
  const armed = placements.filter(x=> x.spin);
  ck("CONTROL: there are placements to check", placements.length >= 20,
     String(placements.length));
  ck("and not one of them asks for an atlas", armed.length === 0,
     armed.map(x=> x.screen + "/" + x.shape).join(",") || "none");
  const heroes = Object.entries(layout.screens)
    .filter(([k, sc])=> sc.hero && sc.hero.overlay).map(([k])=> k);
  ck("nor does any overlay hero", heroes.length === 0, heroes.join(",") || "none");
}

console.log("\n2. AND THE TURN IS BIG ENOUGH TO SEE");
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
ck("none of them turns by less than fifteen degrees", orn.every(x=> x.gy >= 15),
   JSON.stringify(orn.map(x=> x.n + " " + x.w + "px " + x.gy + "deg")));
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
