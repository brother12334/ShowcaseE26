import { chromium, REPO, appFile, shot } from './_e26.mjs';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
/* The tab scenes play transparent video rendered in different 3D poses.
   The spec verifies the actual moving pixels, the alpha channel, the loaded sources
   and the maximum number of simultaneous turns. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const FEED = JSON.parse(readFileSync(appFile('tests/fixtures/research-feed.json'), 'utf8'));
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.webp':'image/webp', '.avif':'image/avif', '.png':'image/png', '.mp4':'video/mp4', '.webm':'video/webm',
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

const p = await b.newPage({viewport:{width:390,height:844}, deviceScaleFactor:3, serviceWorkers:"block"});
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
    return {missing:missing.length, places:places.length, unmapped:unmapped.length,
      small:places.filter(place=> Math.min(place.w, place.h) < 150).length,
      spheres:places.filter(place=>place.shape.startsWith("sphere")).length};
  });
  ck("CONTROL: the layout has glass placements to verify", r.places >= 15, JSON.stringify(r));
  ck("no scene places a small glass accent", r.small === 0, JSON.stringify(r));
  ck("none of the active scenes places a sphere", r.spheres === 0, JSON.stringify(r));
  ck("every model and placement has a transparent 3D sequence", r.missing === 0 && r.unmapped === 0, JSON.stringify(r));
}
await p.evaluate(()=> boot("history"));
const capsule = p.locator('[data-glass-hero] video.glass-turn');
await capsule.waitFor();
const frame = video=>{
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  canvas.getContext("2d").drawImage(video, 0, 0, 64, 64);
  return canvas.toDataURL();
};
const first = await capsule.evaluate(frame);
await p.waitForTimeout(320);
ck("CONTROL: the History decoder produces different rendered frames",
   first !== await capsule.evaluate(frame));
{
  const state = await capsule.evaluate(img=>{
    const canvas = document.createElement("canvas");
    canvas.width = img.videoWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img,0,0);
    const alpha = ctx.getImageData(0,0,1,1).data[3];
    return {alpha, width:img.videoWidth, muted:img.muted, inline:img.playsInline,
      paused:img.paused,
      blend:getComputedStyle(img.closest(".dg-shapes")).mixBlendMode,
      transform:getComputedStyle(img.closest(".dg-shapes")).transform,
      still:getComputedStyle(img.parentElement.querySelector(".glass-img")).visibility};
  });
  ck("the History turn fills the hero at 3× density", state.width === 1170, JSON.stringify(state));
  ck("the capsule plays inline and muted", state.muted && state.inline && !state.paused, JSON.stringify(state));
  ck("the video layer has no scale transform", state.transform === "none", JSON.stringify(state));
  ck("the capsule background is transparent without blend modes or a frozen double",
     state.width > 0 && state.alpha === 0 && state.blend === "normal" && state.still === "hidden", JSON.stringify(state));
}
const lens = p.locator('.glass-refraction');
await lens.waitFor();
const readout = p.locator('.dg-num[data-glass-lensed]');
ck("CONTROL: the lens is drawing the real session count",
   (await readout.textContent()) === await p.evaluate(()=> String(S.sessions.length)));
await p.evaluate(()=> document.querySelectorAll('video.glass-turn').forEach(video=> video.pause()));
const refracted = await capsule.screenshot({animations:"disabled"});
await p.evaluate(()=>{
  document.querySelector('.glass-refraction').style.visibility = "hidden";
  document.querySelector('.dg-num').removeAttribute("data-glass-lensed");
});
const plain = await capsule.screenshot({animations:"disabled"});
ck("the same paused glass pose visually changes when refraction is removed", !refracted.equals(plain));
await p.evaluate(()=>{
  document.querySelector('.glass-refraction').style.visibility = "";
  document.querySelector('.dg-num').setAttribute("data-glass-lensed", "");
  document.querySelectorAll('video.glass-turn').forEach(video=> video.play().catch(()=>{}));
});
await p.setViewportSize({width:1024, height:844});
await p.waitForFunction(()=> Number(document.getElementById("stage").style.getPropertyValue("--dg-k")) > 1);
const centered = await capsule.evaluate(video=>{
  const art = video.getBoundingClientRect();
  const app = document.getElementById("app").getBoundingClientRect();
  return {left: Math.abs(art.left - app.left), width: Math.abs(art.width - app.width),
    app: app.width, viewport: innerWidth};
});
ck("CONTROL: the desktop app column is narrower than the viewport", centered.app < centered.viewport);
ck("the untransformed glass stays aligned to the desktop app column",
   centered.left < 1 && centered.width < 1, JSON.stringify(centered));
await p.setViewportSize({width:390, height:844});

console.log("\n2. ORNAMENTS TAKE TURNS WITHIN THE PLAYBACK BUDGET");
const rotation = await p.evaluate(async ()=>{
  const active = new Set();
  let max = 0;
  for(let n=0; n<25; n++){
    const playing = [...document.querySelectorAll('#stage video.glass-turn')];
    max = Math.max(max,playing.length);
    playing.filter(img=>!img.parentElement.hasAttribute('data-glass-hero')).forEach(img=>active.add(img.src));
    await new Promise(ok=>setTimeout(ok,400));
  }
  return {max, selected:active.size, ornaments:document.querySelectorAll('#stage .glass[data-turn]:not([data-glass-hero])').length};
});
ck("CONTROL: History keeps its two large ornaments and plays some of them", rotation.ornaments === 2 && rotation.selected > 0, JSON.stringify(rotation));
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
  const paused = n=> n.hasAttribute('data-glass-paused');
  const top = all().filter(n=> !paused(n));
  scrollTo(0, document.documentElement.scrollHeight);
  await new Promise(ok=> setTimeout(ok, 700));
  const left = top.filter(paused);
  scrollTo(0, 0);
  await new Promise(ok=> setTimeout(ok, 600));
  return {top:top.length, left:left.length, back:left.filter(n=> !paused(n)).length};
});
ck("CONTROL: there is visible art to pause", r.top > 0, JSON.stringify(r));
ck("scrolled away, the ones off the screen stop", r.left > 0, JSON.stringify(r));
ck("and those same shapes resume when they come back", r.back === r.left, JSON.stringify(r));

console.log("\n5. REDUCED MOTION STOPS ALL OF IT");
await p.emulateMedia({reducedMotion:"reduce"});
await p.evaluate(()=> boot("history"));
await p.waitForTimeout(400);
r = await p.evaluate(()=> [...document.querySelectorAll('#stage .glass .glass-img')]
  .map(i=> getComputedStyle(i).animationName));
ck("CONTROL: there are ornaments to stop", r.length >= 3, String(r.length));
ck("every one of them is still", r.every(x=> x === "none"), r.join(","));
await p.emulateMedia({reducedMotion:"no-preference"});

console.log("\n5a. A DECODER THAT DROPS THE ALPHA CHANNEL GETS THE TRANSPARENT FALLBACK");
await p.emulateMedia({reducedMotion:"reduce"});
await p.route(/\/assets\/glass-turns\/history\.(mp4|webm)$/, route=>route.fulfill({
  path: appFile("assets/hero-video/hero-today-push-b.mp4"), contentType: "video/mp4"
}));
await p.emulateMedia({reducedMotion:"no-preference"});
const fallback = p.locator('[data-glass-hero] img.glass-turn');
await fallback.waitFor();
ck("CONTROL: the History scene mounted its transparent image fallback", await fallback.evaluate(
  img=>img.naturalWidth > 0 && img.getAttribute("src") === "assets/glass-turns/history.avif"));
ck("the opaque video is never left in the scene",
   await p.locator('[data-glass-hero] video').count() === 0);
ck("the fallback restores the original readable number",
   await p.locator('.glass-refraction, .dg-num[data-glass-lensed]').count() === 0);

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
