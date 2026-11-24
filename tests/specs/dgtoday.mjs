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
async function openApp(url, watch, device = {}){
  const p = await b.newPage({viewport:{width:390,height:844}, ...device});
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
      /* The intro now fires from render() when it is owed, and it MOVES #stage into its
         own stage for three seconds — so a spec that plants a state and renders would
         find the hero missing. This one is about Today, not the intro; dgintro covers
         that. Marking it seen is the same thing a person who has seen it has. */
      S.introSeen = (typeof INTRO_GEN === "number") ? INTRO_GEN : 1;
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

console.log("\n2. A TRAINING DAY IS THE REFERENCE AND NOTHING ELSE; A REST DAY KEEPS WHAT IT HAD");
/* THIS SECTION USED TO ASSERT THE OPPOSITE FOR BOTH DAYS, and the change is an owner's
   decision rather than a loosening.

   It held the whole id list the old screen produced and required the new one to produce
   every one of them, on a training day and on a rest day. It earned that twice: once
   catching four controls vanishing from rest days, once catching this rewrite.

   The owner has since asked for Today to be the one screenful its reference draws, and
   chose to delete what sat below the start button rather than fold it away, having been
   told which three prompts exist on no other screen. So on a training day the guard
   would now be asserting that a deliberate removal did not happen.

   What replaces it is the same guard pointed at the new intent, which is not weaker: the
   screen must contain the reference's parts and must NOT contain the rest, and the old
   build is still read to prove the removal is real rather than a selector that stopped
   matching. The rest branch keeps the original check unchanged \u2014 it has its own
   reference, its content is what that reference draws, and it is the branch that lost
   four controls the last time somebody reordered this function. */
{
  const was = await oldP.evaluate(()=>{ boot(window.REST); return window.ids(); });
  const now = await newP.evaluate(()=>{ boot(window.REST); return window.ids(); });
  const lost = was.filter(x=> now.indexOf(x) < 0);
  ck("CONTROL: the old build drew a rest day with controls on it", was.length > 5,
     was.length + " ids");
  ck("nothing lost on a rest day", lost.length === 0, lost.join(", ") || "none");
}
{

  const now = await newP.evaluate(()=>{ boot(); return {
    extra: document.querySelectorAll('#app [data-today-extra]').length,
    lifts: document.querySelectorAll('#app [data-today-lift]').length,
    /* What is below the button is one closed fold and the cycle's own footer, and the
       fold is inside it rather than beside it. */
    fold: document.querySelectorAll('#app details.dg-more').length,
    /* Read from a fresh render: boot() opens every details on the screen so the rest of
       this spec can see inside them, and a fold this one opened is not a fold the
       screen opened. */
    foldOpen: (()=>{ render();
      const d = document.querySelector('#app details.dg-more');
      return !!d && d.hasAttribute('open'); })(),
    foldHolds: !!document.querySelector('#app details.dg-more [data-today-extra]'),
    foldSays: ((document.querySelector('#app details.dg-more summary') || {}).textContent || "").trim(),
    /* the reference's own parts, which must all still be here */
    head: !!document.querySelector('.dg-top h1'),
    cycle: document.querySelectorAll('.dg-cycle .dg-cy').length,
    hero: !!document.querySelector('#stage .hero-media, .dg-hero'),
    read: !!document.querySelector('.dg-read'),
    brief: !!document.querySelector('.dg-brief'),
    start: !!document.getElementById('startBtn'),
    week: !!document.querySelector('.dg-week')}; });
  /* THE CONTROL HERE USED TO READ THE PREVIOUS BUILD and require it to carry a
     screenful below the button, which proved the removal was real rather than a
     selector that had stopped matching. It compared against a moving target: once the
     removal itself was a commit, "the previous build" was the stripped one and the
     control failed on its own history.

     What replaces it does not depend on history at all. The things are still being
     BUILT \u2014 the fold says how many it is holding and holds them \u2014 so a selector that
     stopped matching would show as a fold with nothing in it, which the assertions
     below would catch. */
  ck("the day's exercise list is gone from the screen for good",
     now.lifts === 0, String(now.lifts));
  ck("and everything else that was below the button is behind one closed fold",
     now.fold === 1 && now.foldOpen === false && now.foldHolds === true
     && now.extra === 1, JSON.stringify(now));
  ck("which says how many things it is holding",
     /^\d+ things? to look at$/.test(now.foldSays), now.foldSays);
  /* AND ON A DAY WITH NOTHING TO REPORT THERE IS NO FOLD AT ALL, which is the half that
     makes the screen the reference: a control that is always there is content.

     The quiet day is made by silencing the builders rather than by hunting for a state
     that happens to say nothing. Two earlier drafts tried the state route and silenced
     the wrong things \u2014 which is its own small lesson: what this needs to prove is that
     the fold follows its contents, and the shortest honest way to say that is to empty
     the contents and look. */
  const quiet = await newP.evaluate(()=>{
    boot();
    const KEEP = {};
    const OFF = ["plateDeriveCardHTML", "dataIssueCardHTML", "weighDueHTML",
                 "soreDueHTML", "planWeekStripHTML", "autoProgCardHTML"];
    OFF.forEach(k=>{ KEEP[k] = window[k]; window[k] = ()=> ""; });
    KEEP.todayNotes = window.todayNotes; window.todayNotes = ()=> [];
    render();
    const out = {fold: document.querySelectorAll('#app details.dg-more').length,
                 extra: document.querySelectorAll('#app [data-today-extra]').length,
                 start: !!document.getElementById('startBtn'),
                 foot: !!document.querySelector('#app .dg-foot')};
    Object.keys(KEEP).forEach(k=>{ window[k] = KEEP[k]; });
    render();
    out.backAgain = document.querySelectorAll('#app details.dg-more').length;
    return out;
  });
  ck("CONTROL: the quiet state still drew the screen",
     quiet.start === true && quiet.foot === true, JSON.stringify(quiet));
  ck("with nothing to report, nothing is below the button but the cycle's own footer",
     quiet.fold === 0 && quiet.extra === 0, JSON.stringify(quiet));
  ck("CONTROL: and the fold comes back when there is something to say again",
     quiet.backAgain === 1, String(quiet.backAgain));
  /* The week badge is drawn from the plan's own week notes, and a plan that names no
     weeks has none to draw. */
  const wk = await newP.evaluate(()=>{
    boot();
    try{ const n = planWeekNotes(); return !!(n && n.week); }catch(e){ return false; } });
  ck("and still draws every part the reference has",
     now.head && now.cycle > 1 && now.hero && now.start,
     JSON.stringify(now));
  ck("with the week badge exactly when the plan states a week",
     now.week === wk, "badge " + now.week + ", plan says " + wk);
  ck("CONTROL: including the two lines, which are read from the day",
     now.read || now.brief, "read " + now.read + ", brief " + now.brief);
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
/* `extra` has gone from this list rather than being inverted: section 2 is where the
   absence of everything below the button is asserted, and asserting it twice in two
   places is two things to update the next time it moves. */
ck("the dark glass screen is drawn",
   r.dg && r.top && r.cycle && r.hero && r.close, JSON.stringify(r));
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

console.log("\n9. THE SCREEN STILL ARRIVES THE WAY EVERY OTHER SCREEN DOES");
/* .dg is one full-bleed element, so Today went from a dozen direct children of #app to
   one and the whole screen began arriving as a block instead of settling in part by
   part. This is the half of that claim norepaint.mjs can no longer make, because a card
   on this screen is no longer a direct child of #app. */
r = await newP.evaluate(()=>{
  boot();
  const app = document.getElementById('app');
  app.classList.add('view-in');
  const kids = [...app.querySelectorAll('.dg > *')];
  const names = kids.map(k=> getComputedStyle(k).animationName);
  const delays = kids.map(k=> getComputedStyle(k).animationDelay);
  const wrapper = getComputedStyle(app.querySelector('.dg')).animationName;
  /* Nothing deeper than the screen's own sections may animate, or the notices below the
     door each arrive on their own schedule. */
  const deep = app.querySelector('.dg-extra > *');
  return {n: kids.length, names, delays, wrapper,
          deep: deep ? getComputedStyle(deep).animationName : "none"};
});
ck("CONTROL: the screen has several sections to stagger", r.n >= 4, r.n + " sections");
ck("every one of them uses the app's one entrance",
   r.names.length > 0 && r.names.every(x=> x === "viewIn"), r.names.join(", "));
ck("and they are staggered, not simultaneous",
   new Set(r.delays).size > 1, r.delays.join(", "));
ck("the wrapper itself does not animate as well", r.wrapper === "none", r.wrapper);
ck("and nothing nested deeper animates", r.deep === "none", r.deep);

console.log("\n10. NO ART ON A SCREEN THAT HAS NOT BEEN BUILT FOR IT");
/* layout.js places each shape against that screen's REDESIGNED layout. Mounted over the
   screen that is still there, Program's shapes landed on the plan buttons and across the
   sentence describing them. A screen gets its art when it is built to hold it. */
r = await newP.evaluate(async ()=>{
  const look = async (tab)=>{
    boot(); TAB = tab; SET_PAGE = null; render(); glassSync();
    await new Promise(ok=> setTimeout(ok, 120));
    /* WHERE THE APP ACTUALLY WENT, not where it was sent. With no session running the
       workout tab shows Today, so asserting "no art on workout" against a screen that
       is Today asserts the opposite of the truth. */
    return {key: GLASS_AT, landed: TAB,
            layer: !!document.querySelector('#stage > .glass-layer'),
            wide: document.documentElement.scrollWidth > innerWidth + 1};
  };
  const out = {};
  for(const t of ["today","program","history","body","research","workout"]) out[t] = await look(t);
  return {out, ready: Object.keys(GLASS_READY)};
});
ck("CONTROL: Today, which IS built for it, mounts its art",
   r.out.today.layer === true && !!r.out.today.key, r.out.today.key);
["program","history","body","research","workout"].forEach(t=>{
  if(r.ready.indexOf(t) > -1){ console.log("     (" + t + " is listed as built — skipped)"); return; }
  if(r.out[t].landed !== t){
    console.log("     (" + t + " redirected to " + r.out[t].landed + " — nothing to check)");
    return;
  }
  ck("no art on " + t + ", which is not built for it yet",
     r.out[t].layer === false && r.out[t].key === "", r.out[t].key || "no key");
});
Object.keys(r.out).forEach(t=>
  ck("and " + t + " does not scroll sideways", r.out[t].wide === false, String(r.out[t].wide)));

console.log("\n11. THE HERO STOPS WHEN IT IS NOT ON THE SCREEN");
/* It is 780x1280 at 30fps and nothing was watching it: GlassMotion pauses the shapes,
   and the hero is not one of them. It went on decoding every frame while the screen was
   scrolled past, which is what made the page feel heavy on a phone. */
r = await newP.evaluate(async ()=>{
  boot(); glassSync();
  await new Promise(ok=> setTimeout(ok, 400));
  const v = document.querySelector('#stage .glass-layer video.hero-media');
  if(!v) return {none: true};
  const playingAtTop = !v.paused;
  /* SOMETHING TO SCROLL PAST. Today is one screenful now, so scrollTo(0, 4000) moved
     the page nowhere and the hero never left the viewport \u2014 the assertion below was
     about to start failing for a reason that has nothing to do with the hero. The
     spacer belongs to this test: what is being checked is that the video stops when it
     is off screen, not how tall the screen is. */
  const spacer = document.createElement('div');
  spacer.id = 'heroSpacer';
  spacer.style.cssText = 'height:3000px;width:1px';
  document.getElementById('app').append(spacer);
  scrollTo(0, 4000);
  await new Promise(ok=> setTimeout(ok, 500));
  const pausedAway = v.paused;
  scrollTo(0, 0);
  await new Promise(ok=> setTimeout(ok, 500));
  const backOn = !v.paused;
  spacer.remove();
  return {playingAtTop, pausedAway, backOn,
          /* And it is not under a transform, which is the compositor's slow path for a
             video; the shapes are scaled in a wrapper of their own instead. */
          heroTransform: getComputedStyle(v).transform,
          inShapes: !!v.closest('.dg-shapes')};
});
ck("CONTROL: it was playing while on screen", r.playingAtTop === true, String(r.playingAtTop));
ck("scrolled past, it stops", r.pausedAway === true, String(r.pausedAway));
ck("and starts again when it comes back", r.backOn === true, String(r.backOn));
ck("the hero carries no transform of its own",
   r.heroTransform === "none", r.heroTransform);
ck("and is not inside the scaled shape wrapper", r.inShapes === false, String(r.inShapes));

console.log("\n11a. AND IT PLAYS AT THE RATE THE CLIP WAS AUTHORED AT");
/* THE STUTTER THE OWNER REPORTED WAS THIS NUMBER. It was 0.5, on the reasoning that
   the rotation covers a lot of angle per frame and halving the rate halves the angle.
   It does, and it also halves how often the picture changes: a screen recording of the
   phone showed the hero updating once every four captured frames \u2014 about 15 a second \u2014
   in a cadence so regular that nothing was being dropped. The device was displaying
   exactly what it was asked to.

   Below 1 is therefore not a performance setting, it is a slower slideshow, and this
   says so rather than leaving the next person to measure it again. A clip that needs
   slower motion needs more frames, not fewer. */
r = await newP.evaluate(async ()=>{
  boot(); glassSync();
  await new Promise(ok=> setTimeout(ok, 300));
  const v = document.querySelector('#stage video.hero-media');
  return {cfg: glassCfg("heroRate", 1), rate: v ? v.playbackRate : null, has: !!v};
});
ck("CONTROL: there is a hero video to ask about", r.has === true);
ck("the clip is not slowed below the rate it was drawn at", r.cfg >= 1, String(r.cfg));
ck("and the element is actually set to it", r.rate === r.cfg, r.rate + " vs " + r.cfg);

console.log("\n11b. AND IT DOES NOT PLAY WHILE THE PAGE IS MOVING");
/* Pausing off-screen was not enough on a real phone. The cost is compositing, not
   decoding: the frame under a 4,500px page with text and a scrim over it is recomposited
   on every scroll frame. You cannot watch an animation while scrolling past it, so it
   stops the instant the page moves and comes back when it settles. */
r = await newP.evaluate(async ()=>{
  boot(); glassSync();
  await new Promise(ok=> setTimeout(ok, 400));
  const v = document.querySelector('#stage .glass-layer video.hero-media');
  if(!v) return {none: true};
  const before = !v.paused;
  /* A small scroll, so the hero is still well on screen — this must be the scroll
     stopping it, not the intersection observer. */
  scrollTo(0, 40);
  dispatchEvent(new Event('scroll'));
  await new Promise(ok=> setTimeout(ok, 30));
  const stillVisible = v.getBoundingClientRect().bottom > 100;
  const duringScroll = v.paused;
  await new Promise(ok=> setTimeout(ok, 420));
  const afterSettling = !v.paused;
  scrollTo(0, 0);
  return {before, duringScroll, afterSettling, stillVisible};
});
ck("CONTROL: it was playing, and the hero is still on screen throughout",
   r.before === true && r.stillVisible === true,
   "playing " + r.before + ", visible " + r.stillVisible);
ck("it stops the moment the page moves", r.duringScroll === true, String(r.duringScroll));
ck("and comes back once the page settles", r.afterSettling === true, String(r.afterSettling));

console.log("\n11c. THE HERO FADES IN; IT DOES NOT SPRING");
/* glass.css gives everything in the layer the same springy arrival and its easing
   overshoots past scale 1. On a shape that is the point; on a full-bleed hero it made
   the picture wider than the window for 600ms — a sideways scroll that came and went —
   and put a running transform on a video for the whole of it. */
r = await newP.evaluate(async ()=>{
  boot(); glassSync();
  await new Promise(ok=> setTimeout(ok, 60));
  const v = document.querySelector('#stage .glass-layer video.hero-media');
  if(!v) return {none: true};
  let widest = 0;
  for(let i = 0; i < 24; i++){
    widest = Math.max(widest, v.getBoundingClientRect().width,
                      document.documentElement.scrollWidth);
    await new Promise(ok=> requestAnimationFrame(ok));
  }
  return {widest: Math.round(widest), vw: document.documentElement.clientWidth,
          name: getComputedStyle(v).animationName};
});
ck("it never grows past the window, at any point in its arrival",
   r.widest <= r.vw + 1, r.widest + " in " + r.vw);
ck("CONTROL: it is animating, so there was something to overshoot",
   r.name && r.name !== "none", r.name);

console.log("\n12. NOTHING IS LAID OVER THE TOP OF THE SCREEN");
/* THIS SECTION USED TO ASSERT THE OPPOSITE, and the change is deliberate rather than a
   loosening. There was a dark-to-transparent scrim across the top of every converted
   screen, so the header and the cycle would hold 4.5:1 on a frame where the hero comes
   up bright. It has been taken off on request: it was the one thing on these screens
   that was neither content nor the design's own art, and it read as a haze over the
   picture.

   So what is checked now is that it is really gone — nothing between the art and the
   text — and that the header and cycle still sit ABOVE the art rather than behind it,
   which is the part that was never about the scrim.

   The contrast this protected is now unprotected on the brightest frames. That is a
   known cost, written down in the stylesheet where the scrim used to be; if it reads
   badly on a phone the answer is a backing behind those two elements, not a wash across
   the band. */
r = await newP.evaluate(()=>{
  boot();
  const z = n2=> parseInt(getComputedStyle(n2).zIndex, 10) || 0;
  const top = document.querySelector('#app .dg-top');
  const cyc = document.querySelector('#app .dg-cycle');
  return {scrim: !!document.querySelector('#app .dg-scrim'),
          gradients: [...document.querySelectorAll('#app .dg > *')]
            .filter(n2=> /gradient/.test(getComputedStyle(n2).backgroundImage))
            .map(n2=> n2.className),
          topZ: z(top), cycZ: z(cyc),
          topPos: getComputedStyle(top).position};
});
ck("the scrim is gone", r.scrim === false, String(r.scrim));
ck("and nothing else lays a gradient across the top",
   r.gradients.length === 0, r.gradients.join(", ") || "none");
ck("CONTROL: the header is still lifted above the art", r.topZ > 0 && r.topPos === "absolute",
   "z " + r.topZ + ", " + r.topPos);
ck("and so is the cycle", r.cycZ > 0, "z " + r.cycZ);

console.log("\n13. THE WORKOUT SCREEN'S LIFTS ARE THE DESIGN'S LIFTS");
/* THIS SECTION USED TO COMPARE TODAY'S LIFTS WITH WORKOUT'S, and the comparison has
   lost one of its two subjects: Today draws no lifts any more, by the owner's decision
   recorded in section 2. What it was really guarding is still worth guarding, so it is
   pointed at the half that still exists \u2014 a lift on the Workout screen is drawn in the
   design's surface and its own face, not in the app's old card.

   The control is the one that matters here: the measurements have to come from a lift
   that actually rendered, or this passes by comparing nothing with nothing. */
r = await newP.evaluate(()=>{
  boot();
  startWorkout(todaysWorkoutId());
  document.getElementById('preflight')?.remove();
  PF = null;
  TAB = 'workout';
  render();
  const lift = document.querySelector('[data-workout-lift]');
  const head = lift && lift.querySelector('.ex-head b');
  const notice = document.querySelector('[data-dg-screen="workout"] [data-glass-notice]');
  const cs = el=> el ? getComputedStyle(el) : null;
  const out = {
    lifts: document.querySelectorAll('[data-workout-lift]').length,
    radius: lift ? cs(lift).borderRadius : "",
    face: head ? cs(head).fontFamily : "",
    noticeRadius: notice ? cs(notice).borderRadius : "",
    noticeFace: notice ? cs(notice).fontFamily : ""};
  boot();
  return out;
});
ck("CONTROL: the Workout screen rendered lifts to measure", r.lifts > 1, String(r.lifts));
ck("a lift is the design's surface, not a square card",
   parseFloat(r.radius) >= 16, r.radius);
ck("and its heading is the design's face",
   /Instrument Sans/.test(r.face), r.face);
ck("CONTROL: an action notice rendered beside them", !!r.noticeFace, r.noticeFace);
ck("and it is the design's face too", /Instrument Sans/.test(r.noticeFace), r.noticeFace);

console.log("\n14. STILL SHAPES USE A PAUSABLE CSS ANIMATION");
await newP.evaluate(()=>{
  scrollTo(0, 0);
  const shape = document.createElement('div');
  shape.id = 'testGlass';
  shape.className = 'glass';
  shape.dataset.still = 'assets/shapes/glass-capsule-xs';
  shape.style.cssText = 'position:absolute;top:180px;left:5px;width:60px;height:60px';
  document.getElementById('stage').append(shape);
  /* SOMETHING TO SCROLL PAST. This used to scroll to the bottom of the document and
     rely on Today being longer than the window; Today is one screenful now, so the
     scroll went nowhere and the shape never left the viewport. The spacer belongs to
     this test rather than to the screen \u2014 what is being tested is that a shape pauses
     when it is not on screen, not how tall Today happens to be. */
  const spacer = document.createElement('div');
  spacer.id = 'testSpacer';
  spacer.style.cssText = 'height:2400px;width:1px';
  document.getElementById('app').append(spacer);
  GlassMotion.mount(shape.parentElement);
});
const still = newP.locator('#testGlass .glass-img');
await newP.waitForFunction(()=> !document.querySelector('#testGlass').hasAttribute('data-glass-paused'));
ck("CONTROL: the still artwork is loaded into an animated CSS layer",
   await still.evaluate(el=> getComputedStyle(el).animationName === 'glass-bob' &&
     el.style.backgroundImage.includes('glass-capsule-xs.webp')));
ck("no live backdrop filter is added to a still",
   await newP.locator('#testGlass .glass-blur').count() === 0);
r = await newP.evaluate(()=>{
  dispatchEvent(new Event('scroll'));
  return getComputedStyle(document.querySelector('#testGlass .glass-img')).animationPlayState;
});
ck("still shapes pause during scroll", r === 'paused', r);
await newP.waitForFunction(()=> !document.querySelector('#testGlass').hasAttribute('data-glass-paused'));
await newP.evaluate(()=> scrollTo(0, document.documentElement.scrollHeight));
await newP.waitForFunction(()=> document.querySelector('#testGlass').hasAttribute('data-glass-paused'));
await newP.waitForTimeout(200);
ck("still shapes remain paused offscreen",
   await still.evaluate(el=> getComputedStyle(el).animationPlayState === 'paused'));
await newP.emulateMedia({reducedMotion:'reduce'});
ck("reduced motion removes the bob",
   await still.evaluate(el=> getComputedStyle(el).animationName === 'none'));
await newP.emulateMedia({reducedMotion:'no-preference'});
await newP.evaluate(()=>{ document.getElementById('testGlass').remove(); scrollTo(0, 0); });

/* THIS SECTION USED TO ASSERT THE OPPOSITE — that a high-density touch screen is served
   the hero STILL — and the reversal is deliberate rather than a loosening. The still swap
   was a guess at why the phone looked laggy, made without re-measuring after the motion
   rework that had already halved the hero frame rate; the owner's answer was that he wants
   the heroes moving on his phone and static is not the answer. So the shipped setting is
   stillHeroOnDenseTouch: false, and a dense touch screen gets the video.

   What is asserted here is therefore the SWITCH, not the setting: with the flag off the
   video mounts, and with it on the same viewport gets the day's still instead. Asserting
   both positions is what keeps this honest — a spec that only read the shipped value would
   pass just as happily if scene.js stopped consulting the flag at all. */
console.log("\n15. THE HERO MOVES ON A HIGH-DENSITY TOUCH SCREEN, AND THE STILL SWAP STILL WORKS");
const phone = await openApp(BASE, true, {isMobile:true, hasTouch:true, deviceScaleFactor:3});
r = await phone.evaluate(async ()=>{
  boot();
  const vid = document.querySelector('#stage video.hero-media');
  return {dense:matchMedia('(pointer: coarse) and (min-resolution: 2.5dppx)').matches,
    flag:GLASS_CONFIG.stillHeroOnDenseTouch,
    day:GLASS_DAY[todaysWorkoutId()],
    video:vid?.getAttribute('src'), image:!!document.querySelector('#stage img.hero-media')};
});
ck("CONTROL: this viewport is a high-density touch screen", r.dense === true);
ck("CONTROL: the day has baked art, so there is a hero to argue about", !!r.day, r.day);
ck("the shipped setting leaves the motion on", r.flag === false, String(r.flag));
ck("the day's hero video is what mounted, with no still in its place",
   r.video === "assets/hero-video/hero-today-" + r.day + ".mp4" && !r.image, r.video);
/* And the other way: turn the flag on, remount, and the same phone takes the still. */
const r15b = await phone.evaluate(async ()=>{
  GLASS_CONFIG.stillHeroOnDenseTouch = true;
  GLASS_AT = null; GlassScene.unmount(); glassSync();
  const image = document.querySelector('#stage img.hero-media');
  if(image) await image.decode();
  return {src:image?.getAttribute('src'), w:image?.naturalWidth,
    day:GLASS_DAY[todaysWorkoutId()],
    video:!!document.querySelector('#stage video.hero-media')};
});
ck("with the flag on, the same screen gets the day's still, loaded, and no video",
   r15b.src === "assets/heroes/hero-today-" + r15b.day + ".webp" && r15b.w > 0 && !r15b.video,
   r15b.src + " @" + r15b.w);
await phone.close();

console.log("\n16. NOTHING FAILED TO LOAD, AND NOTHING THREW");
ck("no HTTP errors", httpErr.length === 0, httpErr.join(" | ") || "none");
ck("no page errors", pageErr.length === 0, pageErr.join(" | ") || "none");

await newP.screenshot({path: shot("dgtoday.png")});
await b.close();
srv.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
