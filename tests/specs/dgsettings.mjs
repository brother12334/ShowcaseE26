import { chromium, REPO, appFile, shot } from './_e26.mjs';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
/* SETTINGS, IN DARK GLASS.

   This screen was already the design's screen — two tiles across, a name, a value, and
   the three gauges that count something real. What was left was the register, and two
   things about it are worth holding:

     THE WAY BACK IS IN FRONT OF THE NAME. It was in the right-hand slot beside the
     version, because that slot already existed. Section 2 requires it before the title
     and requires it to still work, since moving a control is the easiest way to leave
     its handler behind.

     THE GLYPHS ARE NOT TWELVE ORANGE MARKS. Accent orange means "this is the action" in
     Element 26; on a grid of twelve tiles each wearing one, it meant nothing. Section 3
     requires the tiles' glyphs to be quiet and the accent to be rare on this screen.

   And section 4 is the walk that found the mono on Body: every leaf of text, no
   uppercase typewriter type left anywhere. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
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

const p = await b.newPage({viewport:{width:390,height:844}});
p.on('dialog', d=> d.accept());
p.on('pageerror', e=> pageErr.push(e.message));
p.on('response', rs=>{ if(rs.status() >= 400) httpErr.push(rs.status()+' '+rs.url().replace(BASE,'')); });
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
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
    S.tourDone = true; S.active = null;
    S.introSeen = (typeof INTRO_GEN === "number") ? INTRO_GEN : 1;
    migrate(); try{ applySplit(); }catch(e){}
    TAB = tab || "sync"; SET_PAGE = null; render(); glassSync();
  };
  boot("sync");
}, FX);
await p.waitForTimeout(400);

console.log("\n1. IT IS THE REDESIGNED SCREEN, WITH ITS GRID");
let r = await p.evaluate(()=> ({
  dg: !!document.querySelector('[data-dg-screen="settings"]'),
  title: ((document.querySelector('.dg-top h1') || {}).textContent || "").trim(),
  tiles: document.querySelectorAll('#app .set-tile').length,
  secs: [...document.querySelectorAll('#app .set-sec')].map(x=> x.textContent.trim()),
  hero: !!document.querySelector('#stage .hero-media')
}));
ck("the tab is drawn as a dark glass screen", r.dg === true);
ck("under its own lowercase title", r.title === "settings", r.title);
ck("with its hero", r.hero === true);
ck("CONTROL: the grid really is a grid of tiles", r.tiles >= 10, String(r.tiles));
ck("in the three groups the screen is built from",
   r.secs.join(" | ") === "Training | Day to day | The app", r.secs.join(" | "));

console.log("\n2. THE WAY BACK IS IN FRONT OF THE NAME, AND IT STILL WORKS");
r = await p.evaluate(async ()=>{
  const top = document.querySelector('.dg-top');
  const back = document.getElementById('setToToday');
  const h1 = top.querySelector('h1');
  const before = !!(back && h1 &&
    (back.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING));
  const bx = back.getBoundingClientRect(), hx = h1.getBoundingClientRect();
  back.click();
  await new Promise(ok=> setTimeout(ok, 60));
  return {before, leftOf: Math.round(bx.right) <= Math.round(hx.left) + 1,
          wired: typeof back.onclick === "function", went: TAB};
});
ck("the control comes before the title in the document", r.before === true);
ck("and to the left of it on the screen", r.leftOf === true);
ck("it is wired", r.wired === true);
ck("and it goes back to Today", r.went === "today", r.went);
await p.evaluate(()=> boot("sync"));
await p.waitForTimeout(250);

console.log("\n3. THE ACCENT IS RARE AGAIN");
r = await p.evaluate(()=>{
  const acc = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();
  const norm = c=> c.replace(/\s/g, "").toLowerCase();
  const icons = [...document.querySelectorAll('#app .set-tile-i')];
  const colours = icons.map(n=> norm(getComputedStyle(n).color));
  /* The accent as the browser renders it, so hex and rgb() compare. */
  const probe = document.createElement('span');
  probe.style.color = acc; document.body.append(probe);
  const accRGB = norm(getComputedStyle(probe).color); probe.remove();
  return {n: icons.length, accRGB,
          orange: colours.filter(c=> c === accRGB).length,
          discs: icons.filter(n=> getComputedStyle(n).borderRadius.indexOf("50%") > -1
                                  || parseFloat(getComputedStyle(n).borderRadius) > 14).length};
});
ck("CONTROL: there are a dozen tile glyphs to look at", r.n >= 10, String(r.n));
ck("none of them is wearing the accent", r.orange === 0, r.orange + " of " + r.n);
ck("and each sits in a disc of its own", r.discs === r.n, r.discs + " of " + r.n);

console.log("\n4. NOTHING ON THE SCREEN IS STILL SPEAKING MONO");
r = await p.evaluate(()=>{
  const screen = document.querySelector('[data-dg-screen="settings"]');
  const out = [];
  screen.querySelectorAll('*').forEach(n=>{
    if(!n.textContent.trim() || n.children.length) return;
    const cs = getComputedStyle(n);
    if(/mono|plex mono|monospace/i.test(cs.fontFamily) || cs.textTransform === "uppercase")
      out.push((n.className || n.tagName) + " :: " + n.textContent.trim().slice(0, 22));
  });
  return {n: out.length, out: out.slice(0, 8), seen: screen.querySelectorAll('*').length};
});
ck("CONTROL: there was a screenful of text to walk", r.seen > 80, String(r.seen));
ck("no label is left in uppercase mono", r.n === 0, r.out.join(" | ") || "none");

console.log("\n5. NOTHING RAN OFF THE SIDE, AND NOTHING THREW");
r = await p.evaluate(()=> ({
  vw: document.documentElement.clientWidth,
  wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1}));
ck("the page is not wider than the window", r.wide === false, String(r.vw));
ck("no HTTP errors", httpErr.length === 0, httpErr.join(" | ") || "none");
ck("no page errors", pageErr.length === 0, pageErr.join(" | ") || "none");

console.log("\nREST TIMER. THE STEPPERS UPDATE THE REAL DEFAULT");
const timer = await p.evaluate(()=>{
  boot("sync");
  const tile = document.querySelector('[data-setopen="rest"]');
  tile?.click();
  const screen = !!document.querySelector('[data-dg-screen="settings-rest-timer"]');
  document.querySelector('[data-rest-step="15"]')?.click();
  const value = trainPrefs().restDefault;
  const fallback = restTargetFor({name:"Bench Press",reps:"8-12"},null).ideal[0];
  document.querySelector('#restAdaptive')?.click();
  const automatic = trainPrefs().restDefault === null;
  document.querySelector('#setBack')?.click();
  return {tile:!!tile,screen,value,fallback,automatic,back:SET_PAGE === null};
});
ck("CONTROL: the Settings tile opens the themed timer", timer.tile && timer.screen);
ck("a step moves the rest engine's fallback and can return to automatic",
   timer.value === 165 && timer.fallback === 165 && timer.automatic && timer.back, JSON.stringify(timer));
await p.screenshot({path: shot("dgsettings.png"), fullPage: true});
await b.close();
srv.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
