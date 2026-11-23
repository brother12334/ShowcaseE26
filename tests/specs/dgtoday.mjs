import { chromium, REPO, appFile, oldBuild, shot } from './_e26.mjs';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
/* TODAY, IN DARK GLASS.

   The first screen of the redesign. What makes this spec worth having is not that the
   new markup exists — that is trivially true of any rewrite — but the two things a
   redesign is most likely to get wrong, and did:

     IT MUST NOT QUIETLY DROP FEATURES. The reference page is one screenful: a header, a
     cycle, a hero, two lines, a button. Element 26's Today also carries eight things the
     page has no slot for — a record it could not read, a plate list that disagrees with
     a gym, a weigh-in due, a muscle walking in sore, the plan's week, an auto-progression
     offer, what changed since last time, and the day's own exercise list. Section 2 is
     the guard: every element id the old screen produced must still be produced by the
     new one, on a training day AND on a rest day, and it is not a formality — it caught
     four controls vanishing from rest days because the shared notices had been moved
     below the branch that returns early.

     IT MUST NOT CLAIM YOU ARE DOING SOMETHING ELSE. The hero word is painted into the
     video, not written over it, and the art names six days. Section 3 requires that a
     day the art names gets the video and a day it does not gets its own real name as
     live text — with the control that the two cases genuinely differ.

   SERVED OVER HTTP rather than file://, because the point of most of this is whether the
   art actually loads, and a file:// page cannot fetch its own images. The server is this
   spec's own, started and closed in the same run. */
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
async function openApp(url, watch){
  const p = await b.newPage({viewport:{width:390,height:844}});
  p.on('dialog',d=>d.accept());
  if(watch){
    p.on('pageerror', e=> pageErr.push(e.message));
    p.on('response', rs=>{ if(rs.status() >= 400) httpErr.push(rs.status()+' '+rs.url().replace(BASE,'')); });
  }
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(fx=>{
    window.boot = (mutate)=>{
      const sp=document.getElementById('splash'); if(sp) sp.remove();
      try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
      ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
      document.body.classList.remove('ai-open','onboarding','pfl-open');
      Object.keys(S).forEach(k=>{ delete S[k]; });
      Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
      S.tourDone = true; S.active = null;
      if(mutate) mutate(S);
      migrate(); try{ applySplit(); }catch(e){}
      TAB = "today"; SET_PAGE = null; render();
      document.querySelectorAll('#app details').forEach(d=> d.open = true);
      document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
    };
    window.ids = ()=> [...document.querySelectorAll('#app [id]')].map(e=> e.id).sort();
    /* A rest day, written the way the app writes one. */
    window.REST = S2=>{ S2.restDays = [todayStr()]; };
    /* A day the art has no hero for. upperA is a real id from SPLITS; switching split is
       how a person gets one, and it is the whole reason the live-text path exists. */
    window.NOART = S2=>{
      S2.splitId = "ul4";                 // Upper A / Lower A / Upper B / Lower B
      S2.customSplit = null;
      S2.cycleDone = []; S2.restDays = []; S2.override = null;
    };
    /* THE POINTER HAS TO BE SET AFTER applySplit, NOT BEFORE IT.
       The fixture is mid-cycle on a six-day split, and dropping to a four-day one leaves
       the pointer past the end of the rotation — todaysWorkoutId() then has no day to
       name. The app repairs exactly this at startup (see the pointer clamp in the state
       health check); planting a state and calling render() is not startup, so the spec
       does what startup would have done. */
    window.afterSplit = ()=>{ S.pointer = 0; render(); };
    /* The art's own list, read from the app rather than copied into this file, so the
       spec cannot drift from the decision it is testing. */
    window.ARTDAYS = ()=> Object.keys(GLASS_DAY);
    window.box = sel=>{ const e = document.querySelector(sel); if(!e) return null;
      const r = e.getBoundingClientRect();
      return {top: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width)}; };
  }, FX);
  return p;
}

/* The build before the redesign. */
const oldP = await openApp(oldBuild("HEAD~1"));
const newP = await openApp(BASE, true);

console.log("\n1. THE PACKAGE IS ACTUALLY THERE, OR EVERYTHING BELOW IS A TEST OF NOTHING");
let r = await newP.evaluate(()=>{
  boot();
  return {scene: !!window.GlassScene, layout: !!window.GLASS_LAYOUT,
          motion: !!window.GlassMotion, cfg: !!window.GLASS_CONFIG,
          today: !!(window.GLASS_LAYOUT && GLASS_LAYOUT.screens && GLASS_LAYOUT.screens.today),
          font: [...document.styleSheets].some(ss=>{
            try{ return [...ss.cssRules].some(x=> /Instrument Sans/.test(x.cssText)); }
            catch(e){ return false; } })};
});
ck("CONTROL: scene.js, layout.js, glass-motion.js and the config all loaded",
   r.scene && r.layout && r.motion && r.cfg,
   "scene " + r.scene + ", layout " + r.layout + ", motion " + r.motion + ", cfg " + r.cfg);
ck("CONTROL: and the layout really describes a today screen", r.today === true);
ck("CONTROL: Instrument Sans is declared in the page's own stylesheet", r.font === true);

console.log("\n2. NOT ONE THING THE OLD SCREEN COULD DRAW HAS GONE");
/* THE GUARD THIS SPEC EXISTS FOR. Ids rather than text, because an id is what a handler
   binds to and a feature whose button is gone is a feature gone. Both days, because the
   rest branch returns early and is the one that lost four of them. */
for(const [label, mut] of [["a training day", null], ["a rest day", "REST"]]){
  const was = await oldP.evaluate(m=>{ boot(m ? window[m] : null); return window.ids(); }, mut);
  const now = await newP.evaluate(m=>{ boot(m ? window[m] : null); return window.ids(); }, mut);
  const lost = was.filter(x=> now.indexOf(x) < 0);
  ck("CONTROL: the old build drew a Today with controls on it on " + label,
     was.length > 5, was.length + " ids");
  ck("nothing lost on " + label, lost.length === 0, lost.join(", ") || "none");
}

console.log("\n3. THE SCREEN IS THE NEW ONE");
r = await newP.evaluate(()=>{
  boot();
  const q = s=> !!document.querySelector('#app ' + s);
  return {dg: q('.dg'), top: q('.dg-top'), cycle: q('.dg-cycle'), hero: q('.dg-hero'),
          close: q('.dg-close'), start: q('#startBtn.dg-start'), extra: q('.dg-extra'),
          /* And the old day card is gone, not merely hidden behind the new one. */
          oldCard: q('.day-open'), oldStrip: q('.plates-wrap')};
});
ck("the dark glass screen is drawn",
   r.dg && r.top && r.cycle && r.hero && r.close && r.extra, JSON.stringify(r));
ck("the start button is the design's own", r.start === true);
ck("and the screen it replaces is gone, not stacked underneath",
   !r.oldCard && !r.oldStrip, "day-open " + r.oldCard + ", plates " + r.oldStrip);

console.log("\n4. A DAY THE ART NAMES GETS THE VIDEO; A DAY IT DOES NOT GETS ITS OWN NAME");
/* The hero word is painted into the frame. Borrowing push-a for a day called Upper A
   would be the app telling somebody they are doing a session they are not. */
const heroFor = (mut)=> newP.evaluate(async m=>{
  boot(m ? window[m] : null);
  if(m === "NOART") window.afterSplit();
  glassSync();
  await new Promise(ok=> setTimeout(ok, 250));
  const v = document.querySelector('#stage .glass-layer video.hero-media');
  const w = document.querySelector('#app .dg-hero .hero-word');
  return {day: todaysWorkoutId(), name: dayMeta(todaysWorkoutId()).name,
          scene: GLASS_AT, video: v ? v.getAttribute('src') : null,
          word: w ? w.textContent.trim() : null,
          srOnly: !!document.querySelector('#app .dg-hero h2.rs-sr')};
}, mut);
const ARTDAYS = await newP.evaluate(()=> window.ARTDAYS());
const named = d=> ARTDAYS.indexOf(d) > -1;
const art = await heroFor(null);
const none = await heroFor("NOART");
ck("CONTROL: the two cases are different days", art.day !== none.day,
   art.day + " vs " + none.day);
ck("CONTROL: and exactly one of them is a day the art names",
   named(art.day) !== named(none.day),
   art.day + " named " + named(art.day) + ", " + none.day + " named " + named(none.day)
   + "; art names " + ARTDAYS.join("/"));
ck("the named day plays its own hero", (art.video || "").indexOf("hero-today-") > -1,
   art.video);
ck("and the word is left to the art, not printed twice",
   art.word === null && art.srOnly === true, "word " + art.word + ", sr " + art.srOnly);
ck("the unnamed day plays no video at all", none.video === null, String(none.video));
ck("and its own real name is on the screen as text",
   none.word === String(none.name).toLowerCase(), none.word + " vs " + none.name);

console.log("\n5. A REST DAY IS A REST DAY, NOT THE NEXT TRAINING DAY'S HERO");
/* todaysWorkoutId() goes on naming the next training day all through a rest, so asking
   it this question drew the rest-day text under the push-a hero. */
r = await newP.evaluate(async ()=>{
  boot(window.REST);
  glassSync();
  await new Promise(ok=> setTimeout(ok, 250));
  const v = document.querySelector('#stage .glass-layer video.hero-media');
  return {scene: GLASS_AT, src: v ? v.getAttribute('src') : null,
          resting: isRestToday(), rotationSays: todaysWorkoutId(),
          restHero: !!document.querySelector('#app .dg-hero.is-rest'),
          say: !!document.querySelector('#app .dg-say'),
          door: !!document.querySelector('#app #startBtn')};
});
ck("CONTROL: today really is a rest, and the rotation still names a training day",
   r.resting === true && !!r.rotationSays, "resting, rotation on " + r.rotationSays);
ck("the rest scene is mounted", r.scene === "rest", r.scene);
ck("and it is the rest hero", (r.src || "").indexOf("hero-rest") > -1, r.src);
ck("the screen uses the rest hero's own proportions", r.restHero === true);
ck("it says what there is to say", r.say === true);
ck("and offers no workout to start", r.door === false, String(r.door));

console.log("\n6. THE DOOR IS ON THE SCREEN, WHICH IS THE ONE THING IT HAS TO BE");
/* The brief names real exercises, and real exercise names are long. Twice during this
   build a longer brief pushed the start button under the nav — once through a stale
   flex-basis, once because the button shared a column with the text. */
r = await newP.evaluate(()=>{
  boot();
  return {start: window.box('#startBtn'), hero: window.box('.dg-hero'),
          close: window.box('.dg-close'), vh: innerHeight,
          /* The tab bar is a bare <nav>, which a first draft looked for by class and
             did not find — so "clear of the nav" passed by there being no nav. */
          nav: (()=>{ const n = document.querySelector('body > nav');
            if(!n) return null; const r2 = n.getBoundingClientRect();
            return {top: Math.round(r2.top), h: Math.round(r2.height)}; })()};
});
ck("CONTROL: the hero really does take most of the screen, or nothing is being tested",
   r.hero && r.hero.h > 400, r.hero && r.hero.h + "px tall");
ck("the start button is inside the first screenful",
   r.start && r.start.top + r.start.h <= r.vh, r.start && (r.start.top + r.start.h) + " of " + r.vh);
ck("CONTROL: the tab bar was found, or 'clear of the nav' is a pass for not looking",
   !!r.nav, r.nav ? "nav at " + r.nav.top : "NOT FOUND");
ck("and clear of the nav", !!r.nav && (r.start.top + r.start.h) <= r.nav.top + 1,
   r.nav ? "button ends " + (r.start.top + r.start.h) + ", nav starts " + r.nav.top : "no nav");

console.log("\n7. THE BRIEF STAYS WITHIN ITS SPACE WHATEVER THE LIFTS ARE CALLED");
r = await newP.evaluate(()=>{
  /* EVERY DAY, not today's. The mutator runs before applySplit(), so todaysWorkoutId()
     inside it still answers for the state being replaced — a first draft renamed a day
     the screen then did not draw, and the control passed on the real names. */
  const long = S2=>{
    Object.keys(S2.program || {}).forEach(k=>{
      (S2.program[k] || []).forEach((e, i)=>{
        e.name = "Extremely Long Competition Style Movement Name Number " + (i + 1);
      });
    });
  };
  boot(long);
  const txt = (document.querySelector('.dg-brief') || {textContent:""}).textContent;
  const n = document.querySelector('body > nav');
  return {len: txt.length, counted: /\b\d+ more\./.test(txt), txt: txt.slice(0, 90),
          start: window.box('#startBtn'), vh: innerHeight,
          nav: n ? {top: Math.round(n.getBoundingClientRect().top)} : null};
});
ck("CONTROL: the names really were replaced with long ones",
   /Extremely Long Competition/.test(r.txt), r.txt);
/* "and N more" OR "then N more": when not even the first name fits the budget, the line
   names none and counts them all, and "then and 5 more" would not be English. The first
   draft of this assertion assumed at least one lift is always named, which was true only
   while the budget was allowed to overrun to guarantee it. */
ck("the rest are counted rather than listed", r.counted === true, r.txt);
ck("the sentence stays short", r.len <= 190, r.len + " characters");
ck("and the door is still clear of the nav, not merely on the page",
   !!r.nav && r.start && (r.start.top + r.start.h) <= r.nav.top + 1,
   r.start && (r.start.top + r.start.h) + ", nav at " + (r.nav && r.nav.top));

console.log("\n8. DRAWING THE SCREEN AGAIN DOES NOT REBUILD THE ART");
/* render() runs on nearly every interaction and a spin sheet is 25 to 50 MB decoded.
   The whole reason the layer is a sibling of #app is that it must survive a re-render. */
r = await newP.evaluate(async ()=>{
  boot();
  glassSync();
  await new Promise(ok=> setTimeout(ok, 200));
  const before = document.querySelector('#stage > .glass-layer');
  render(); render(); render();
  const after = document.querySelector('#stage > .glass-layer');
  return {had: !!before, same: !!before && before === after, key: GLASS_AT,
          inApp: !!document.querySelector('#app .glass-layer')};
});
ck("CONTROL: there was a layer to keep", r.had === true);
ck("three renders later it is the very same element", r.same === true, r.key);
ck("and it is beside the app, not inside it", r.inApp === false);

console.log("\n9. NOTHING FAILED TO LOAD, AND NOTHING THREW");
ck("no HTTP errors", httpErr.length === 0, httpErr.join(" | ") || "none");
ck("no page errors", pageErr.length === 0, pageErr.join(" | ") || "none");

await newP.screenshot({path: shot("dgtoday.png")});
await b.close();
srv.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
