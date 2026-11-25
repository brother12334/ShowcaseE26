import { chromium, REPO, appFile, shot } from './_e26.mjs';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
/* The tab scenes play transparent images rendered in different 3D poses.
   The spec verifies the actual moving pixels, the alpha channel, the loaded sources
   and the maximum number of simultaneous turns. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const FEED = JSON.parse(readFileSync(appFile('tests/fixtures/research-feed.json'), 'utf8'));
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.webp':'image/webp', '.avif':'image/avif', '.png':'image/png', '.mp4':'video/mp4',
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

console.log("\n1a. STARTUP WARMS THE STILL ARTWORK USED ON LATER TABS");
await p.waitForFunction(()=> performance.getEntriesByType("resource").some(entry=>
   entry.name.endsWith("/assets/hero-overlays/overlay-workout.webp") && entry.responseEnd > 0));
ck("CONTROL: a later tab's still was fetched without opening Workout",
   await p.evaluate(()=> TAB !== "workout" &&
     !document.querySelector('[data-dg-screen="workout"]')));
console.log("\n1b. ALL LIVE GLASS PLACEMENTS HAVE RENDERED TRANSPARENT TURNS");
{
  const r = await p.evaluate(()=>{
    const L = window.GLASS_LAYOUT;
    const missing = Object.entries(L.shapes).filter(([, shape])=> !shape.turn?.endsWith(".avif"));
    const places = Object.values(L.screens).flatMap(screen=>screen.shapes || []);
    const unmapped = places.filter(place=> !L.shapes[place.shape]?.turn);
    return {missing:missing.length, places:places.length, unmapped:unmapped.length};
  });
  ck("CONTROL: the layout has glass placements to verify", r.places >= 20, JSON.stringify(r));
  ck("every model and placement has a transparent 3D sequence", r.missing === 0 && r.unmapped === 0, JSON.stringify(r));
}
await p.evaluate(()=> boot("history"));
const capsule = p.locator('[data-glass-hero] img.glass-turn');
await capsule.waitFor();
const first = await capsule.screenshot({animations:"disabled"});
await p.waitForTimeout(320);
ck("CONTROL: the History capsule changes with CSS animation disabled",
   !first.equals(await capsule.screenshot({animations:"disabled"})));
{
  const state = await capsule.evaluate(img=>{
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img,0,0);
    const alpha = ctx.getImageData(0,0,1,1).data[3];
    return {alpha, width:img.naturalWidth,
      blend:getComputedStyle(img.closest(".dg-shapes")).mixBlendMode,
      still:getComputedStyle(img.parentElement.querySelector(".glass-img")).visibility};
  });
  ck("the capsule background is transparent without blend modes or a frozen double",
     state.width > 0 && state.alpha === 0 && state.blend === "normal" && state.still === "hidden", JSON.stringify(state));
}

console.log("\n2. ORNAMENTS TAKE TURNS WITHIN THE PLAYBACK BUDGET");
const rotation = await p.evaluate(async ()=>{
  const active = new Set();
  let max = 0;
  for(let n=0; n<25; n++){
    const playing = [...document.querySelectorAll('#stage img.glass-turn')];
    max = Math.max(max,playing.length);
    playing.filter(img=>!img.parentElement.hasAttribute('data-glass-hero')).forEach(img=>active.add(img.src));
    await new Promise(ok=>setTimeout(ok,400));
  }
  return {max, selected:active.size, ornaments:document.querySelectorAll('#stage .glass[data-turn]:not([data-glass-hero])').length};
});
ck("CONTROL: History has several ornaments and plays some of them", rotation.ornaments >= 3 && rotation.selected > 0, JSON.stringify(rotation));
ck("multiple ornaments get their turn without exceeding three active images",
   rotation.selected >= 2 && rotation.max <= 3, JSON.stringify(rotation));

let r;
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
