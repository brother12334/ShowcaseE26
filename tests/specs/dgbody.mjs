import { chromium, REPO, appFile, shot } from './_e26.mjs';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
/* BODY, IN DARK GLASS.

   THE FIGURE STAYS. The design's own mockup draws this screen's body as fourteen rounded
   blocks, and the owner's instruction was the opposite: keep the anatomical figure that
   is here and change its colours to suit the theme. So the first thing this spec does is
   refuse the mockup — section 2 requires a drawing with real anatomy in it, front and
   back, and would fail the day somebody swaps it for the blocks.

   AND ITS COLOURS STILL MEAN SOMETHING. Retuning a palette is the easiest way to lose a
   signal by accident: the five constants carry a three-step verdict across five views,
   and if "fine" and "in trouble" ever render the same the picture is decoration. Section
   3 reads them back and requires them to stay apart, and requires the two that mean
   "look at this" to be the warm ones.

   THE SCREEN SPEAKS ONE LANGUAGE. Everything else here was uppercase IBM Plex Mono
   labels over a screen set in Instrument Sans. Section 4 walks every label on it. */
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
  const sp = document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
  ['preflight','aiFull'].forEach(id=>{ const el = document.getElementById(id); if(el) el.remove(); });
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  Object.keys(S).forEach(k=>{ delete S[k]; });
  Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
  S.tourDone = true; S.active = null;
  S.introSeen = (typeof INTRO_GEN === "number") ? INTRO_GEN : 1;
  migrate(); try{ applySplit(); }catch(e){}
  TAB = "body"; SET_PAGE = null; render(); glassSync();
  /* The per-muscle table and the drill controls are behind Advanced; open everything, so
     section 4 walks what the screen BUILDS rather than what happens to be unfolded. */
  document.querySelectorAll('#app details').forEach(d=> d.open = true);
}, FX);
await p.waitForTimeout(400);

console.log("\n1. IT IS THE REDESIGNED SCREEN, AND THE HEADER SAYS WHICH WEEK");
let r = await p.evaluate(()=>{
  let w = null; try{ w = planWeekNow(); }catch(e){}
  return {dg: !!document.querySelector('[data-dg-screen="body"]'),
          right: ((document.querySelector('.dg-top-r') || {}).textContent || "").trim(),
          week: w ? w.week : null, of: w ? w.of : null,
          title: ((document.querySelector('.dg-top h1') || {}).textContent || "").trim()};
});
ck("the tab is drawn as a dark glass screen", r.dg === true);
ck("under its own lowercase title", r.title === "body", r.title);
ck("CONTROL: the plan knows which week it is on", r.week > 0, String(r.week));
ck("and the header states it", r.right === "week " + r.week + (r.of ? " of " + r.of : ""),
   r.right);

/* THIS LOOKED FOR assets/body/, AND THAT FOLDER IS GONE. The expectation was not wrong
   about anything that matters — Body's decoration must sit behind the content, must not
   catch a tap, and must have the pixels for a 3x phone — but it named the art by the
   folder it happened to live in. Body carried six iridescent objects supplied with the
   design pack, then six I rendered to replace them when the originals could not be made
   to turn, and the owner's answer to both was that this screen should use the same clear
   glass as every other one. It does, so the subject is the same and only the source
   moved. The three real rules are asserted off whatever art the screen actually mounts. */
console.log("\n1b. BODY'S DECORATION SITS BEHIND IT AND CANNOT BE TAPPED");
r = await p.evaluate(async ()=>{
  const wrapper = document.querySelector('#stage > .glass-layer > [aria-hidden="true"]');
  const shapes = [...(wrapper?.querySelectorAll('.glass[data-still]') || [])];
  const art = await Promise.all(shapes.map(async shape=>{
    const image = new Image();
    image.src = shape.dataset.still + '.webp';
    await image.decode();
    return {src: shape.dataset.still.split('/').pop(),
            back: shape.classList.contains('back'),
            quiet: getComputedStyle(shape).pointerEvents === 'none',
            sharp: image.naturalWidth >= 3 * parseFloat(shape.style.getPropertyValue("--glass-width"))};
  }));
  return {art, behind: wrapper && getComputedStyle(wrapper).zIndex === '0',
          map: !!document.querySelector('.nb-map .bm-fig')};
});
ck("CONTROL: the seeded Body still renders its anatomy map", r.map);
ck("CONTROL: and it really does mount its six shapes", r.art.length === 6,
   r.art.map(x=> x.src).join(","));
ck("none of them can intercept a tap", r.art.every(x=> x.quiet),
   JSON.stringify(r.art.filter(x=> !x.quiet)));
ck("each one has the pixels for a 3\u00d7 phone", r.art.every(x=> x.sharp),
   JSON.stringify(r.art.filter(x=> !x.sharp)));
ck("every one of them is on the back layer", r.art.every(x=> x.back),
   JSON.stringify(r.art.filter(x=> !x.back)));
ck("and the art is behind the Body content", r.behind);

console.log("\n2. THE ANATOMICAL FIGURE IS STILL THE ANATOMICAL FIGURE");
r = await p.evaluate(()=>{
  const figs = [...document.querySelectorAll('.bm-fig svg')];
  const shapes = figs.map(f=> ({
    paths: f.querySelectorAll('path').length,
    rects: f.querySelectorAll('rect').length,
    box: Math.round(f.getBoundingClientRect().width)}));
  return {n: figs.length, shapes,
          labels: [...document.querySelectorAll('.bm-fig-label')].map(x=> x.textContent.trim())};
});
ck("there are two figures", r.n === 2, String(r.n));
ck("front and back", r.labels.join(",") === "Front,Back", r.labels.join(","));
ck("each is drawn from real anatomy, not from a handful of blocks",
   r.shapes.every(x=> x.paths >= 30), JSON.stringify(r.shapes));
ck("and both are actually on screen", r.shapes.every(x=> x.box > 60),
   JSON.stringify(r.shapes.map(x=> x.box)));

console.log("\n3. THE COLOURS MOVED; WHAT THEY MEAN DID NOT");
r = await p.evaluate(()=>{
  const hex = h=>{ const n = parseInt(h.slice(1), 16);
    return {r:(n>>16)&255, g:(n>>8)&255, b:n&255}; };
  const warmth = h=>{ const c = hex(h); return c.r - c.b; };
  const dist = (a, c)=>{ const x = hex(a), y = hex(c);
    return Math.abs(x.r-y.r) + Math.abs(x.g-y.g) + Math.abs(x.b-y.b); };
  return {ok: C_OK, warn: C_WARN, bad: C_BAD, flat: C_FLAT, low: C_LOW,
          okWarn: dist(C_OK, C_WARN), okBad: dist(C_OK, C_BAD), warnBad: dist(C_WARN, C_BAD),
          okWarmth: warmth(C_OK), warnWarmth: warmth(C_WARN), badWarmth: warmth(C_BAD),
          /* the figure really does paint with them */
          used: [...document.querySelectorAll('.bm-fig svg [fill]')]
            .map(n=> (n.getAttribute('fill') || "").toLowerCase())
            .filter(v=> v && v !== "none").length};
});
ck("a muscle that is fine cannot be mistaken for one that is not",
   r.okBad > 90 && r.okWarn > 60, "ok->bad " + r.okBad + ", ok->warn " + r.okWarn);
ck("and the two warnings are not each other", r.warnBad > 40, String(r.warnBad));
ck("the two that mean 'look at this' are the warm ones",
   r.warnWarmth > 40 && r.badWarmth > 40 && r.okWarmth < 20,
   "ok " + r.okWarmth + ", warn " + r.warnWarmth + ", bad " + r.badWarmth);
ck("CONTROL: the figure is painted with them", r.used > 10, String(r.used));

console.log("\n4. NOTHING ON THE SCREEN IS STILL SPEAKING MONO");
r = await p.evaluate(()=>{
  const screen = document.querySelector('[data-dg-screen="body"]');
  const out = [];
  screen.querySelectorAll('*').forEach(n=>{
    if(!n.textContent.trim()) return;
    if(n.children.length) return;                 // leaves only, or every parent counts twice
    const cs = getComputedStyle(n);
    const mono = /mono|plex mono|monospace/i.test(cs.fontFamily);
    const shout = cs.textTransform === "uppercase";
    if(mono || shout) out.push((n.className || n.tagName) + " :: "
      + n.textContent.trim().slice(0, 24) + (mono ? " [mono]" : "") + (shout ? " [caps]" : ""));
  });
  return {out: out.slice(0, 8), n: out.length,
          /* a control that must fire: the screen has plenty of text to have caught */
          seen: screen.querySelectorAll('*').length};
});
ck("CONTROL: there was a screenful of text to walk", r.seen > 150, String(r.seen));
ck("no label is left in uppercase mono", r.n === 0, r.out.join(" | ") || "none");

console.log("\n5. NOTHING RAN OFF THE SIDE, AND NOTHING THREW");
r = await p.evaluate(()=> ({
  vw: document.documentElement.clientWidth,
  wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1}));
ck("the page is not wider than the window", r.wide === false, String(r.vw));
ck("no HTTP errors", httpErr.length === 0, httpErr.join(" | ") || "none");
ck("no page errors", pageErr.length === 0, pageErr.join(" | ") || "none");

console.log("\n6. THE BODY SUMMARY SHOWS LIVE MEASUREMENTS AND OPENS ITS DETAILS");
r = await p.evaluate(()=>{
  const counts = () => Object.fromEntries([...document.querySelectorAll('[data-body-stat]')]
    .map(el=> [el.dataset.bodyStat, el.querySelector('.nb-tile-v').textContent.trim()]));
  const initial = counts();
  const now = Date.now(), date = dayStr(now);
  S.sessions.push({id:'body-tile-test', date, workoutId:DAYS[0], startedAt:now - 60000,
    finishedAt:now, entries:[{name:'Barbell Bench Press',sets:[
      {weight:'100',reps:'5',rpe:'9',done:true},
      {weight:'50',reps:'5',rpe:'9',done:true,warmup:true}
    ]}]});
  const weights = bodyLog();
  const today = {...weights[date]};
  weights[date] = {...today, w:192};
  render();
  const changed = counts();
  const links = [...document.querySelectorAll('[data-body-fact]')];
  const order = !!(document.querySelector('.nb-tiles').compareDocumentPosition(links[0]) &
    Node.DOCUMENT_POSITION_FOLLOWING);
  links[0].click();
  return {initial, changed, order, links:links.length,
    focused:document.activeElement.dataset.bodyTarget};
});
ck("CONTROL: the tiles and facts exist", Object.keys(r.initial).length === 4 && r.links >= 3);
ck("a warm-up does not add to the week's hard sets", Number(r.changed.hard) === Number(r.initial.hard) + 1,
   JSON.stringify([r.initial,r.changed]));
ck("the seven-day number is drawn when a weigh-in exists", Number(r.changed.weight) > 0);
ck("the session count advances", parseInt(r.changed.sessions) === parseInt(r.initial.sessions) + 1);
ck("facts follow the tiles and open their own sections", r.order && r.focused === "cycle");

await p.evaluate(()=> scrollTo(0, 0));
await p.screenshot({path: shot("dgbody.png"), fullPage: true});
await b.close();
srv.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
