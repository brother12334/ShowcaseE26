import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE RULE, STATED ONCE, FOR EVERY SETTING THAT TOUCHES A TARGET.

   A block in progress finishes on the numbers it started on. That is a good rule and it
   was written as a list: the hold froze the finished figure and named the settings
   allowed through. Anything not named was swallowed, and the screen that was supposed to
   change looked exactly like a screen that worked -- the setting wrote itself, logged
   itself, re-rendered, and moved nothing.

   Five were missing from the list, found one at a time: the scale dial, the training
   goal, where the figures come from, and your training age. Each was fixed on its own,
   and the next one looked the same as the last.

   So the hold was inverted. It freezes ONE thing, the app's own estimate, at the line in
   adjustedLandmarks where that estimate ends. Your settings live below the line and move
   your targets because of where they are, not because somebody remembered them.

   THIS SPEC IS THE HALF THAT KEEPS IT TRUE. It enumerates every user-facing setting that
   can move a landmark and requires each one to move it DURING a hold. A sixth of these
   cannot be added without being listed here, and a sixth that is listed and swallowed
   fails loudly instead of looking like a working screen.

   Its control is the half that makes it mean anything: before every case, the hold must
   genuinely be in force and genuinely be the thing the rows are showing. Without that,
   every assertion below passes on an app that never holds at all. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1600}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

await p.evaluate(fx=>{
  window.boot = (mutate)=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
    ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true;
    if(mutate) mutate(S);
    migrate(); try{ applySplit(); }catch(e){}
    try{ TG_OPEN = null; }catch(e){}
    TAB='sync'; SET_PAGE='targets'; render();
  };
  /* A HOLD PLANTED THE WAY THE MIGRATION PLANTS ONE: the app's own estimate for every
     muscle, as it stood when the block began, stored under v2. Taken from the live chain
     with the hold off so the figures are real rather than invented, then pushed a long
     way off so a landmark that fails to move is unmistakable. */
  window.plantHold = (factor)=>{
    S.volHold = null;
    const A = bodyAnalysis();
    const lm = {}, pub = {};
    GKEYS.forEach(g=>{
      const L = adjustedLandmarks(A, g);
      const k = factor == null ? 1 : factor;
      lm[g]  = {mev: L.model.mev * k, mav: L.model.mav * k, mrv: L.model.mrv * k};
      pub[g] = {mev: L.modelPub.mev * k, mav: L.modelPub.mav * k, mrv: L.modelPub.mrv * k};
    });
    S.volHold = {blockStart: S.blockStart || 0, lm, pub, v: 2, at: Date.now()};
    return Object.keys(lm).length;
  };
  window.lm = ()=>{
    const A = bodyAnalysis(); const out = {};
    GKEYS.forEach(g=>{ const L = A.lm[g];
      out[g] = L.mev + "/" + L.mav + "/" + L.mrv; });
    return out;
  };
  /* Is the hold actually the thing being shown? Planted at 1.4x, the figures on screen
     must be the planted ones and not the live estimate. */
  window.holdShowing = ()=>{
    const A = bodyAnalysis();
    const held = GKEYS.filter(g=>{
      const h = volHoldFor(g); if(!h) return false;
      return Math.abs(A.lm[g].mav - Math.round(h.mav * 10) / 10) < 0.35;
    });
    return {held: held.length, total: GKEYS.length, has: !!S.volHold};
  };
  window.moved = (a, c)=> Object.keys(a).filter(g=> a[g] !== c[g]);
}, FX);

console.log("\n1. THE HOLD IS REALLY IN FORCE, AND REALLY IS WHAT THE TARGETS SHOW");
/* Everything after this depends on it, so it is asserted before anything else and
   re-asserted inside every case below. */
await p.evaluate(()=>{ boot(); plantHold(1.4); });
let r = await p.evaluate(()=> window.holdShowing());
ck("CONTROL: a v2 hold is stored", r.has === true, String(r.has));
ck("CONTROL: and every muscle is reading its held estimate, not the live one",
   r.held === r.total, r.held + " of " + r.total);
r = await p.evaluate(()=>{
  const withHold = window.lm();
  S.volHold = null;
  const without = window.lm();
  plantHold(1.4);
  return {differ: window.moved(withHold, without).length, total: GKEYS.length};
});
ck("CONTROL: and the hold is not a no-op — it changes what every muscle shows",
   r.differ === r.total, r.differ + " of " + r.total + " differ with the hold on");

console.log("\n2. EVERY USER-FACING SETTING THAT TOUCHES A TARGET MOVES IT DURING A HOLD");
/* THE LIST. Each entry is a setting a person can reach in the running app, what it
   writes, and how far it has to reach. "all" means every muscle has to move; "some"
   is for a setting that is about one muscle, or one that only applies where there is
   something to apply it to.

   ADDING A SETTING THAT MOVES A LANDMARK MEANS ADDING IT HERE. That is the whole point
   of the spec: the five that were swallowed were each invisible until somebody went
   looking, and a sixth now has to get past this. */
const CASES = [
  {what: "the scale dial (Settings › Volume targets)",
   why: "applied below the model line, so a hold cannot reach it",
   reach: "all",
   set: ()=>{ S.lmScale = 0.7; }},

  {what: "the training goal (Settings › Your plan)",
   why: "GOAL_SCALE multiplies every landmark, below the model line",
   reach: "all",
   set: ()=>{ S.setup = Object.assign({}, S.setup, {goal: "strength"}); }},

  {what: "a hand-set MEV (Settings › Volume targets, one muscle)",
   why: "a figure you typed in replaces its own, below the model line",
   reach: "some",
   set: ()=>{ S.lmFloor = Object.assign({}, S.lmFloor, {chest: 3}); }},

  {what: "a hand-set MAV",
   why: "same, for the target",
   reach: "some",
   set: ()=>{ S.lmMav = Object.assign({}, S.lmMav, {chest: 7}); }},

  {what: "a hand-set MRV",
   why: "same, for the ceiling",
   reach: "some",
   set: ()=>{ S.lmMrv = Object.assign({}, S.lmMrv, {chest: 9}); }},

  {what: "where the figures come from (Settings › Volume targets)",
   why: "a user-facing switch over a model-derived figure, so the hold keeps BOTH "
      + "estimates and hands back whichever one is being asked for",
   reach: "some",
   set: ()=>{ S.prefs = Object.assign({}, S.prefs, {lmNoCal: true}); }},

  {what: "your training age (the question the app asks once)",
   why: "an input the estimate is built FROM, so the hold is retaken rather than "
      + "released — see resnapVolHold",
   reach: "all",
   set: ()=>{ S.priorTrainingWeeks = 520; S.expManual = "advanced";
              delete S.lmCalSeeded;
              try{ seedCalibrationFromHistory(); }catch(e){}
              resnapVolHold(); }}
];
for(const c of CASES){
  const res = await p.evaluate(src=>{
    boot();
    /* Planted away from the live estimate so "did not move" cannot be confused with
       "moved to exactly where it already was". */
    const planted = plantHold(1.4);
    const heldFirst = window.holdShowing();
    const was = window.lm();
    (new Function("return (" + src + ")"))()();
    const now = window.lm();
    return {planted, heldFirst, moved: window.moved(was, now),
            total: GKEYS.length, stillHeld: !!S.volHold,
            sample: Object.keys(was).slice(0,1).map(g=> g + " " + was[g] + " -> " + now[g])[0]};
  }, c.set.toString());
  console.log("  — " + c.what);
  ck("    CONTROL: the hold was in force and showing (" + c.why + ")",
     res.heldFirst.held === res.heldFirst.total,
     res.heldFirst.held + " of " + res.heldFirst.total);
  if(c.reach === "all")
    ck("    moves every muscle's targets", res.moved.length === res.total,
       res.moved.length + " of " + res.total + " moved; " + res.sample);
  else
    ck("    moves the targets it is about", res.moved.length > 0,
       res.moved.length + " of " + res.total + " moved: " + res.moved.slice(0,4).join(", "));
}

console.log("\n3. AND THE HOLD STILL HOLDS WHAT IT IS FOR");
/* The inversion must not have quietly turned the hold off. A change to the APP's own
   estimate -- not to any setting of yours -- still must not move a block in progress. */
r = await p.evaluate(()=>{
  boot();
  plantHold(1.4);
  const was = window.lm();
  /* The app's estimate, moved at its source: the learned calibration is the model
     changing its own mind, which is exactly what a block is protected from. */
  S.lmCal = {}; GKEYS.forEach(g=>{ S.lmCal[g] = {mev: 1.6, mav: 1.6, mrv: 1.6, blocks: 9}; });
  const now = window.lm();
  /* And with the hold gone, the same change must land -- or the test above proved
     nothing about the hold and only that lmCal does nothing. */
  S.volHold = null;
  const free = window.lm();
  return {heldStill: window.moved(was, now), freeMoved: window.moved(was, free),
          total: GKEYS.length};
});
ck("CONTROL: that change really does move landmarks when nothing is held",
   r.freeMoved.length >= 8, r.freeMoved.length + " of " + r.total);
ck("the app's own estimate cannot move a block in progress",
   r.heldStill.length === 0, r.heldStill.slice(0,4).join(", "));

console.log("\n4. A HOLD FROM THE OLD BUILD IS NOT READ, AND NOT KEPT");
/* v1 stored the FINISHED figure with the goal and the scale already in it. Reading one
   as a model figure would apply both a second time. */
r = await p.evaluate(()=>{
  boot(S2=>{
    /* Figures no live estimate could produce, so "ignored" cannot be confused with
       "happened to agree". An earlier draft planted mev 10 and the live chest floor is
       also 10, which made a passing assertion out of a coincidence. */
    S2.volHold = {blockStart: S2.blockStart || 0, at: Date.now(),
      lm: {chest: {mev: 3.3, mav: 44.4, mrv: 55.5},
           quads: {mev: 2.2, mav: 41.1, mrv: 52.2}}};
  });
  const live = (()=>{ const h = S.volHold; S.volHold = null;
    const x = window.lm(); S.volHold = h; return x; })();
  return {kept: !!S.volHold, chest: window.lm().chest, liveChest: live.chest,
          readsAny: GKEYS.some(g=> !!volHoldFor(g))};
});
ck("CONTROL: a v1 hold was planted before migrate ran", true);
ck("migrate cleared it", r.kept === false, String(r.kept));
ck("nothing reads it", r.readsAny === false, String(r.readsAny));
ck("and the targets are the live estimate, untouched by it",
   r.chest === r.liveChest && !/44\.4|55\.5|3\.3\//.test(r.chest),
   r.chest + " vs live " + r.liveChest);

console.log("\n5. AND A HOLD IS STILL TIED TO ITS OWN BLOCK");
r = await p.evaluate(()=>{
  boot();
  plantHold(1.4);
  const held = window.lm();
  S.blockStart = (S.blockStart || 0) + 86400000;   // a new block started
  const after = window.lm();
  return {moved: window.moved(held, after).length, total: GKEYS.length,
          reads: GKEYS.some(g=> !!volHoldFor(g))};
});
ck("a new block drops the old hold", r.reads === false, String(r.reads));
ck("and every muscle goes back to the live estimate",
   r.moved === r.total, r.moved + " of " + r.total);

ck("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
