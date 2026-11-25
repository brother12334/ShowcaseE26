import { chromium, REPO, appFile, shot } from './_e26.mjs';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
/* RESEARCH, IN DARK GLASS.

   Two things on this screen are worth a spec of their own.

     THE HERO IS A SHEET OF GLASS WITH NOTHING UNDER IT WHEN THERE ARE NO PAPERS. The
     screen's hero is an overlay: a bubble for the app to put its own live number under.
     dgScreenHTML draws no hero band at all when there is no number — Research has none
     until it has reached the service — and the layer mounted the bubble regardless, 440
     pixels of it, at the top of the screen, on the title, the search box and all three
     rows of filters. Section 2 is that bug, from both sides: nothing over the content
     when the feed is empty, and the hero present the moment there are papers.

     THE CARD IS THE PAPER, NOT THE SUMMARY. Every card carried what they studied, what
     they found and what it means for lifters, so four papers were six screens. The card
     is the reason it is there, the title and the byline; the paper's own screen carries
     all of it. Section 4 requires the summary to be gone from the feed AND present one
     tap in, because moving something and losing it look identical from the feed. */
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
/* The feed, with authors and dated into this week, because the byline names the first
   author and the sections split on when a paper arrived. */
const NOW = Date.now();
const AUTH = [["Pelland","Remmert"], ["Schoenfeld"], ["Halperin","Wolf","Steele"], ["Morton"]];
const SEEDED = {at: NOW, papers: FEED.papers.map((p, i)=>
  Object.assign({}, p, {authors: AUTH[i % AUTH.length], addedAt: NOW - i * 3600000}))};

async function openApp(feed){
  const p = await b.newPage({viewport:{width:390,height:844}});
  p.on('dialog', d=> d.accept());
  p.on('pageerror', e=> pageErr.push(e.message));
  p.on('response', rs=>{ if(rs.status() >= 400) httpErr.push(rs.status()+' '+rs.url().replace(BASE,'')); });
  await p.addInitScript(seed=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X');
    if(seed) localStorage.setItem('e26.research.v1', JSON.stringify(seed));
  }, feed || null);
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
    try{ RESEARCH_PAPER = null; }catch(e){}
    migrate(); try{ applySplit(); }catch(e){}
    TAB = "research"; SET_PAGE = null; render(); glassSync();
  }, FX);
  await p.waitForTimeout(500);
  return p;
}

const empty = await openApp(null);
const full  = await openApp(SEEDED);

console.log("\n1. IT IS THE REDESIGNED SCREEN, AND IT HAS ITS PAPERS");
let r = await full.evaluate(()=> ({
  dg: !!document.querySelector('[data-dg-screen="research"]'),
  cards: document.querySelectorAll('#app .rs-card').length,
  right: ((document.querySelector('.dg-top-r') || {}).textContent || "").trim(),
  n: (researchCacheRead() || {papers:[]}).papers.length
}));
ck("the tab is drawn as a dark glass screen", r.dg === true);
ck("CONTROL: the seeded feed really is on screen", r.cards === r.n && r.cards > 1,
   r.cards + " cards for " + r.n + " papers");
ck("paper cards paint without waiting for intersection or an entrance transition",
   await full.locator('.rs-card').evaluateAll(cards=> cards.every(card=> Number(getComputedStyle(card).opacity) > 0)));
ck("and the header states the count", r.right === r.n + " papers", r.right);

console.log("\n2. NO HERO MEANS NO SHEET OF GLASS ON THE CONTENT");
{
  const e = await empty.evaluate(()=>{
    const band = document.querySelector('.dg-ghero');
    const first = document.querySelector('#app .rs-search input, #app .rs-chip');
    const fb = first ? first.getBoundingClientRect() : null;
    const over = [...document.querySelectorAll('#stage .glass-layer .glass, #stage .hero-media')]
      .map(g=>{ const b = g.getBoundingClientRect();
        return {cls: g.className, h: Math.round(b.height),
                hits: g.classList.contains("front") && getComputedStyle(g).visibility !== "hidden" && !!fb && b.bottom > fb.top && b.top < fb.bottom && b.right > fb.left && b.left < fb.right}; });
    return {papers: (researchCacheRead() || {papers:[]}).papers.length,
            noart: !!band && band.classList.contains('dg-noart'),
            hero: !!document.querySelector("[data-glass-hero]"), art: over.length, over: over.filter(x=> x.hits).length,
            what: JSON.stringify(over)};
  });
  ck("CONTROL: with no connection this screen really has no papers", e.papers === 0, String(e.papers));
  ck("CONTROL: so it reserves no hero band", e.noart === true);
  ck("decorations can mount, but there is no hero ring", e.art > 0 && !e.hero, e.what);
  ck("so nothing is laid over the first thing you can tap", e.over === 0, e.what);

  const f = await full.evaluate(()=>{
    const band = document.querySelector('.dg-ghero');
    const art = [...document.querySelectorAll('#stage .glass-layer .glass')];
    return {noart: !!band && band.classList.contains('dg-noart'),
            art: art.length,
            num: (document.querySelector('.dg-num') || {}).textContent};
  });
  ck("CONTROL: with papers the screen does reserve its band", f.noart === false);
  ck("and the ring comes back with it", f.art > 0, String(f.art));
  ck("over the count it is drawn to sit on",
     f.num === String(r.n), f.num + " vs " + r.n);
}

console.log("\n2b. THE RING PLAYS ITS RENDERED 3D FRAMES");
const ring = full.locator('[data-glass-hero] video.glass-turn');
await ring.waitFor();
const source = await ring.evaluate(img=>({src:img.getAttribute('src'), width:img.videoWidth}));
ck("CONTROL: the seeded feed mounts the rendered Research turn",
   /^assets\/glass-turns\/research\.(mp4|webm)$/.test(source.src) && source.width === 1170, JSON.stringify(source));
const firstFrame = await ring.screenshot({animations:"disabled"});
await full.waitForTimeout(320);
const nextFrame = await ring.screenshot({animations:"disabled"});
ck("the baked frames change even with CSS animations disabled", !firstFrame.equals(nextFrame));
await full.locator('.glass-refraction').waitFor();
ck("CONTROL: the live paper count passes through the lens",
   (await full.locator('.dg-num[data-glass-lensed]').textContent()) === String(r.n));
await full.emulateMedia({reducedMotion:"reduce"});
await ring.waitFor({state:"detached"});
ck("Reduce Motion restores the still", await full.locator('[data-glass-hero] .glass-img').evaluate(
   el=>getComputedStyle(el).visibility === "visible"));
ck("Reduce Motion puts the live number back in its original layer",
   await full.locator('.glass-refraction, .dg-num[data-glass-lensed]').count() === 0);
await full.emulateMedia({reducedMotion:"no-preference"});

console.log("\n3. ONE HEADING, AND THE NAME IS STILL ON IT");
r = await full.evaluate(()=> ({
  h1s: [...document.querySelectorAll('#stage h1')].map(x=> x.textContent.trim()),
  named: /research lab/i.test(document.getElementById('app').innerText),
  sub: (document.querySelector('.rs-sub') || {}).textContent
}));
ck("the screen is headed once", r.h1s.length === 1 && /^research$/i.test(r.h1s[0]), r.h1s.join(" | "));
ck("the destination is still named", r.named === true);
ck("and the brief's sentence is still its own line",
   r.sub === "New science for better training.", r.sub);

console.log("\n4. THE CARD IS THE PAPER; THE SUMMARY IS ONE TAP IN");
r = await full.evaluate(async ()=>{
  const card = document.querySelector('#app .rs-card');
  const id = card.dataset.rspaper;
  const p = (researchCacheRead() || {papers:[]}).papers.find(x=> x.id === id);
  const out = {id,
    inData: !!(p && p.whatTheyStudied && p.whatTheyFound),
    blocks: card.querySelectorAll('.rs-b').length,
    hasSummary: !!(p && p.whatTheyStudied) && card.textContent.indexOf(p.whatTheyStudied) > -1,
    title: !!card.querySelector('.rs-t'),
    kick: (card.querySelector('.rs-kick') || {}).textContent || "",
    whyInside: !!card.querySelector('.rs-why'),
    whyOutside: !!document.querySelector('#app .rs-card + .rs-why, #app .rs-why + .rs-card')};
  card.click();
  await new Promise(ok=> setTimeout(ok, 60));
  const app = document.getElementById('app');
  out.openedSummary = !!(p && p.whatTheyStudied) && app.textContent.indexOf(p.whatTheyStudied) > -1;
  out.onPaper = (typeof RESEARCH_PAPER !== "undefined") && RESEARCH_PAPER === id;
  return out;
});
ck("CONTROL: the paper under test does have a summary, so its absence means something",
   r.inData === true, String(r.inData));
ck("the feed card carries no summary blocks", r.blocks === 0, String(r.blocks));
ck("and does not print the summary another way", r.hasSummary === false);
ck("it carries the title", r.title === true);
ck("and a byline with the author, the date and the study type",
   /et al\.|^[A-Z]/.test(r.kick) && /20\d\d/.test(r.kick), r.kick);
ck("the reason is inside the card, not floating above it",
   r.whyInside === true && r.whyOutside === false, "inside " + r.whyInside);
ck("CONTROL: tapping the card opens that paper", r.onPaper === true, String(r.onPaper));
ck("and the summary is there, where it was moved to", r.openedSummary === true);

console.log("\n5. THE PAPER HAS ITS OWN DARK-GLASS LAYOUT");
r = await full.evaluate(()=>{
  const screen = document.querySelector('[data-dg-screen="research-paper"]');
  const title = screen?.querySelector('h1.rs-dt');
  const summary = screen?.querySelector('.rs-quick');
  const back = screen?.querySelector('#rsBack');
  return {title:title?.textContent, size:title && getComputedStyle(title).fontSize,
    radius:summary && getComputedStyle(summary).borderRadius, save:!!screen?.querySelector('header [data-rssave]'),
    back:back?.getAttribute('aria-label'), source:!!screen?.querySelector('#rsOrig')};
});
ck("CONTROL: the opened paper has its real heading and takeaway", !!r.title && !!r.radius);
ck("the heading and takeaway use the reference sizes", r.size === "30px" && r.radius === "22px");
ck("the back, save and original-paper controls are present", r.save && r.source && r.back === "Back to Research");

console.log("\n6. NOTHING RUNS OFF THE SIDE, AND NOTHING THREW");
r = await full.evaluate(()=>{
  const vw = document.documentElement.clientWidth;
  return {wide: document.documentElement.scrollWidth > vw + 1, vw};
});
ck("the page is not wider than the window", r.wide === false, String(r.vw));
ck("no HTTP errors", httpErr.length === 0, httpErr.join(" | ") || "none");
ck("no page errors", pageErr.length === 0, pageErr.join(" | ") || "none");

await full.screenshot({path: shot("dgresearch.png"), fullPage: true});
await b.close();
srv.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
