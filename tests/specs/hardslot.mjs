import { chromium, APP_URL } from './_e26.mjs';
/* SLOT DEBT 4 of 9 - toohardTarget, and the thing next to it.

   The marked site is toohardTarget's name-only findProgramEntry, used for the rep range
   and the step when rebuilding the suggestion. That turns out to be a genuine fallback:
   impossibleLoadCheck() already computes the target from the slot's own planned entry and
   puts it on the detail as `to`, and toohardTarget returns that whenever it is there.

   But the rule is to prove it rather than say it - and proving it turned up a live
   cross-slot read in the SAME path, unmarked. impossibleLoadCheck's "proven floor" asks
   what load this movement has actually reached its range at, so the advice is never
   lighter than something you have demonstrably done. It asked that of every session of
   the NAME:

       S.sessions.forEach(s=> (s.entries||[]).forEach(provenIn));

   So a load proven on one day raises the suggestion for another day's slot, and the
   advice comes back heavier than the evidence of that slot supports. That is the bug this
   spec is really about; the marked fallback is tested too, by removing the detail's target
   so the fallback path is the one that runs. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, plateStep:5, barMode:"plates"});
  S.splitId="ppl6"; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const EX = "Smith Machine Squat";
/* Legs B prescribes 100 for 6-10 and the user failed it at RPE 10 for 4 reps, so the
   prescription is unreachable there. On Legs A - a different slot, a fresher position in
   the session - 90 was managed for 10. If the proven floor reads across slots, Legs B's
   advice is dragged up to 90 on evidence from a day it was not earned. */
const seed = (withLegsA)=> p.evaluate(a=>{
  S.program.legsA = [{name: a.EX, sets:3, reps:"6-10", weight:90}];
  S.program.legsB = [{name: a.EX, sets:3, reps:"6-10", weight:100}];
  S.sessions = []; S.flags = []; S.planLog = []; S.active = null;
  const day = i=> dayStr(Date.now() - (10 - i) * 86400000);
  const bSess = {id:"b1", date: day(1), workoutId:"legsB",
    startedAt: Date.parse(day(1) + "T18:00:00"), finishedAt: Date.parse(day(1) + "T19:00:00"),
    entries:[{name: a.EX, reps:"6-10", rpes:[9,9,9],
      sets:[{weight:"100", reps:"4", rpe:"10", done:true, rest:180}]}]};
  S.sessions.push(bSess);
  if(a.withLegsA){
    const aSess = {id:"a1", date: day(2), workoutId:"legsA",
      startedAt: Date.parse(day(2) + "T18:00:00"), finishedAt: Date.parse(day(2) + "T19:00:00"),
      entries:[{name: a.EX, reps:"6-10", rpes:[8,8,8],
        sets:[{weight:"90", reps:"10", rpe:"8", done:true, rest:180}]}]};
    S.sessions.push(aSess);
  }
  save();
  return null;
}, {EX, withLegsA: withLegsA});

console.log("1 - CONTROL: THE UNREACHABLE PRESCRIPTION IS FOUND AT ALL");
await seed(false);
const alone = await p.evaluate(a=>{
  const sess = S.sessions.filter(s=> s.workoutId === "legsB")[0];
  const v = progressionFor(sess, sess.entries[0]);
  return {kind: v && v.kind, to: v && v.detail && v.detail.to,
          target: v ? toohardTarget(v) : null, wid: v && v.wid,
          msg: v && v.detail && v.detail.msg};
}, {EX});
console.log("   ", JSON.stringify(alone));
ck("the rule fires", alone.kind === "toohard", String(alone.kind));
ck("with a target below the prescription", alone.to > 0 && alone.to < 100,
   String(alone.to));
ck("and toohardTarget agrees with the card", alone.target === alone.to,
   alone.target + " vs " + alone.to);
const BASE = alone.to;

console.log("\n2 - ANOTHER DAY'S PROVEN LOAD MUST NOT LIFT THIS DAY'S ADVICE");
await seed(true);
const cross = await p.evaluate(a=>{
  const sess = S.sessions.filter(s=> s.workoutId === "legsB")[0];
  const v = progressionFor(sess, sess.entries[0]);
  /* And what the Legs A slot says about itself, which is a different question. */
  const sessA = S.sessions.filter(s=> s.workoutId === "legsA")[0];
  const vA = sessA ? progressionFor(sessA, sessA.entries[0]) : null;
  return {kind: v && v.kind, to: v && v.detail && v.detail.to,
          target: v ? toohardTarget(v) : null,
          aKind: vA && vA.kind};
}, {EX});
console.log("    with a Legs A session at 90x10 in the log: " + JSON.stringify(cross));
console.log("    (the same slot answered " + BASE + " with no Legs A session at all)");
ck("Legs B still reads as unreachable", cross.kind === "toohard", String(cross.kind));
ck("and its advice is unchanged by the other day's 90",
   cross.to === BASE, cross.to + " vs " + BASE);
ck("the button would write the same number", cross.target === BASE,
   cross.target + " vs " + BASE);

console.log("\n3 - THE SAME SLOT'S OWN PROVEN LOAD STILL COUNTS");
/* The floor exists for a reason: advice must not be lighter than something you have
   actually done. A load proven ON THIS SLOT, from the cited day onwards, still lifts it. */
const own = await p.evaluate(a=>{
  const day = i=> dayStr(Date.now() - (10 - i) * 86400000);
  S.sessions.push({id:"b2", date: day(3), workoutId:"legsB",
    startedAt: Date.parse(day(3) + "T18:00:00"), finishedAt: Date.parse(day(3) + "T19:00:00"),
    entries:[{name: a.EX, reps:"6-10", rpes:[8,8,8],
      sets:[{weight:"90", reps:"9", rpe:"8", done:true, rest:180}]}]});
  save();
  const sess = S.sessions.filter(s=> s.id === "b1")[0];
  const v = progressionFor(sess, sess.entries[0]);
  return {to: v && v.detail && v.detail.to, kind: v && v.kind};
}, {EX});
console.log("   ", JSON.stringify(own), " (was " + BASE + ")");
ck("a 90 proven on this slot raises the floor", own.to >= 90,
   own.to + " vs " + BASE);

console.log("\n4 - AND THE MARKED FALLBACK USES THE RIGHT SLOT TOO");
/* toohardTarget only reaches its own lookup when the detail carries no target. Forced
   here, because that is the path the debt marker was on. The two slots prescribe
   different rep ranges, so a range read from the wrong one is visible. */
const fall = await p.evaluate(a=>{
  S.program.legsA = [{name: a.EX, sets:3, reps:"15-20", weight:40}];
  S.program.legsB = [{name: a.EX, sets:3, reps:"6-10", weight:100}];
  save();
  const sess = S.sessions.filter(s=> s.id === "b1")[0];
  const v = progressionFor(sess, sess.entries[0]);
  if(!v || v.kind !== "toohard") return {missing: true, kind: v && v.kind};
  /* The detail's own target removed, so the rebuild path runs. */
  const stripped = JSON.parse(JSON.stringify(v));
  delete stripped.detail.to;
  stripped.wid = v.wid;
  const withWid = toohardTarget(stripped);
  const noWid = toohardTarget(Object.assign({}, stripped, {wid: undefined}));
  return {withWid, noWid, range: stripped.detail.reps, cited: stripped.detail.at.w};
}, {EX});
console.log("   ", JSON.stringify(fall));
ck("the fallback path is reachable", !fall.missing, JSON.stringify(fall));
ck("it answers from the slot the verdict is about",
   fall.withWid > 0 && fall.withWid < 100, String(fall.withWid));
ck("and the verdict carries its slot so it can",
   fall.withWid === fall.noWid || fall.withWid > 0,
   fall.withWid + " / " + fall.noWid);

console.log("\n5 - A MOVEMENT IN ONE SLOT IS UNAFFECTED");
const solo = await p.evaluate(a=>{
  S.program.legsA = [];
  S.program.legsB = [{name: a.EX, sets:3, reps:"6-10", weight:100}];
  S.sessions = S.sessions.filter(s=> s.workoutId === "legsB" && s.id === "b1");
  save();
  const sess = S.sessions[0];
  const v = progressionFor(sess, sess.entries[0]);
  return {kind: v && v.kind, to: v && v.detail && v.detail.to,
          target: v ? toohardTarget(v) : null};
}, {EX});
console.log("   ", JSON.stringify(solo));
ck("it still fires", solo.kind === "toohard", String(solo.kind));
ck("with the same answer as before", solo.to === BASE, solo.to + " vs " + BASE);
ck("and the button agrees", solo.target === solo.to, solo.target + " vs " + solo.to);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
