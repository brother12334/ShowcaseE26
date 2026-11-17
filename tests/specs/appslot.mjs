import { chromium, APP_URL } from './_e26.mjs';
/* SLOT DEBT 5 of 9 - progressionApplied.

   This is the one that decides whether a verdict on the grade card has ALREADY been
   written into the plan. It compares the plan's current load with the verdict's target,
   and it found the plan entry by name - so a verdict about one slot was judged against
   another slot's load.

   Both failure modes are live and both are bad in the same direction, which is why it
   matters: the card is deciding whether to show you a button.

     A raise on Legs B to 65 reads as ALREADY APPLIED because Legs A happens to sit at 65.
     The row moves to the "done" list with a tick, and the change you earned is never
     offered - there is no button left to press.

     A raise already applied to Legs B reads as NOT applied because Legs A sits elsewhere,
     so the button stays and Apply-all will write it a second time.

   The verdicts now carry the slot they came from, stamped once in buildProgression where
   the session is known, rather than threaded through every caller. */
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, stackStep:5, progression:"ask"});
  S.splitId="ppl6"; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const EX = "Cable Row";
/* Legs B earns a raise from 60 to 65. Legs A is ALREADY at 65 - which is the load the
   Legs B verdict is heading for, and the coincidence that makes the bug visible. */
const seed = ()=> p.evaluate(a=>{
  S.program.pullA = [{name: a.EX, sets:3, reps:"8-12", weight:65}];
  S.program.pullB = [{name: a.EX, sets:3, reps:"8-12", weight:60}];
  S.sessions = []; S.planLog = []; S.flags = []; S.stalls = {}; S.active = null;
  const day = i=> dayStr(Date.now() - (10 - i) * 86400000);
  /* An earlier exposure so the session being judged is not a first one. */
  S.sessions.push({id:"b0", date: day(1), workoutId:"pullB",
    startedAt: Date.parse(day(1)+"T18:00:00"), finishedAt: Date.parse(day(1)+"T19:00:00"),
    entries:[{name: a.EX, reps:"8-12", rpes:[8,8,8],
      sets:[0,1,2].map(()=> ({weight:"60", reps:"10", rpe:"8", done:true}))}]});
  /* And the session that earns it: every set at the top of the range at target RPE. */
  S.sessions.push({id:"b1", date: day(3), workoutId:"pullB",
    startedAt: Date.parse(day(3)+"T18:00:00"), finishedAt: Date.parse(day(3)+"T19:00:00"),
    entries:[{name: a.EX, reps:"8-12", rpes:[8,8,8],
      sets:[0,1,2].map(()=> ({weight:"60", reps:"12", rpe:"8", done:true}))}]});
  save();
  return null;
}, {EX});

console.log("1 - CONTROL: THE RAISE IS EARNED, AND HEADS FOR THE LOAD THE OTHER SLOT HOLDS");
await seed();
const earned = await p.evaluate(a=>{
  const sess = S.sessions.filter(s=> s.id === "b1")[0];
  const list = buildProgression(sess);
  const up = list.filter(x=> x.kind === "up")[0];
  return {kind: up && up.kind, from: up && up.from, to: up && up.to, wid: up && up.wid,
          otherSlotLoad: (findProgramEntryWhere(a.EX, "pullA") || {e:{}}).e.weight};
}, {EX});
console.log("   ", JSON.stringify(earned));
ck("the raise is earned", earned.kind === "up", String(earned.kind));
ck("from this slot's 60", earned.from === 60, String(earned.from));
ck("to 65", earned.to === 65, String(earned.to));
ck("which is exactly what the other slot already holds",
   earned.otherSlotLoad === 65, String(earned.otherSlotLoad));
ck("and the verdict names its own slot", earned.wid === "pullB", String(earned.wid));

console.log("\n2 - IT HAS NOT BEEN APPLIED, WHATEVER THE OTHER SLOT SAYS");
const notYet = await p.evaluate(a=>{
  const sess = S.sessions.filter(s=> s.id === "b1")[0];
  const list = buildProgression(sess);
  const up = list.filter(x=> x.kind === "up")[0];
  return {applied: progressionApplied(up),
          load: (findProgramEntryWhere(a.EX, "pullB") || {e:{}}).e.weight};
}, {EX});
console.log("   ", JSON.stringify(notYet));
ck("this slot is still at 60", notYet.load === 60, String(notYet.load));
ck("so the verdict is not applied", notYet.applied === false, String(notYet.applied));

console.log("\n3 - AND THE CARD STILL OFFERS IT");
const offered = await p.evaluate(a=>{
  const sess = S.sessions.filter(s=> s.id === "b1")[0];
  sess.progression = buildProgression(sess);
  S.sessions.forEach(s=>{ if(s.id !== "b1") s.progression = s.progression || []; });
  save();
  const list = sess.progression;
  return {ups: list.filter(x=> x.kind === "up" && !progressionApplied(x)).length,
          done: list.filter(x=> x.kind === "up" && progressionApplied(x)).length};
}, {EX});
console.log("   ", JSON.stringify(offered));
ck("the raise is in the list to apply", offered.ups === 1, String(offered.ups));
ck("and not in the done list", offered.done === 0, String(offered.done));

console.log("\n4 - ONCE APPLIED TO THIS SLOT, IT READS AS DONE");
const after = await p.evaluate(a=>{
  const sess = S.sessions.filter(s=> s.id === "b1")[0];
  const up = (sess.progression || []).filter(x=> x.kind === "up")[0];
  applyProgression(a.EX, up.to, null, "test", {wid: "pullB"});
  return {load: (findProgramEntryWhere(a.EX, "pullB") || {e:{}}).e.weight,
          applied: progressionApplied(up),
          other: (findProgramEntryWhere(a.EX, "pullA") || {e:{}}).e.weight};
}, {EX});
console.log("   ", JSON.stringify(after));
ck("this slot is now at 65", after.load === 65, String(after.load));
ck("the verdict reads as applied", after.applied === true, String(after.applied));
ck("and the other slot never moved", after.other === 65, String(after.other));

console.log("\n5 - THE MIRROR: APPLIED HERE, THE OTHER SLOT ELSEWHERE");
/* The second failure mode. This slot has had the change written; the other slot sits at a
   different load. Judged against the other slot it would read as unapplied and be written
   a second time. */
const mirror = await p.evaluate(a=>{
  S.program.pullA = [{name: a.EX, sets:3, reps:"8-12", weight:100}];
  S.program.pullB = [{name: a.EX, sets:3, reps:"8-12", weight:65}];
  save();
  const sess = S.sessions.filter(s=> s.id === "b1")[0];
  const up = (sess.progression || []).filter(x=> x.kind === "up")[0];
  const before = (S.planLog || []).filter(c=> c.kind === "weight").length;
  const applied = progressionApplied(up);
  /* Apply-all's own filter, which is what would write it twice. */
  const wouldWrite = (sess.progression || [])
    .filter(x=> x.kind === "up" && !progressionApplied(x)).length;
  return {applied, wouldWrite, before,
          load: (findProgramEntryWhere(a.EX, "pullB") || {e:{}}).e.weight};
}, {EX});
console.log("   ", JSON.stringify(mirror));
ck("the change is recognised as already made", mirror.applied === true,
   String(mirror.applied));
ck("so Apply-all would not write it again", mirror.wouldWrite === 0,
   String(mirror.wouldWrite));

console.log("\n6 - A MOVEMENT IN ONE SLOT IS UNAFFECTED");
const solo = await p.evaluate(a=>{
  S.program.pullA = [];
  S.program.pullB = [{name: a.EX, sets:3, reps:"8-12", weight:60}];
  S.sessions = S.sessions.filter(s=> s.workoutId === "pullB");
  save();
  const sess = S.sessions.filter(s=> s.id === "b1")[0];
  const list = buildProgression(sess);
  const up = list.filter(x=> x.kind === "up")[0];
  const beforeApply = progressionApplied(up);
  applyProgression(a.EX, up.to, null, "test", {wid: "pullB"});
  return {to: up.to, beforeApply, afterApply: progressionApplied(up),
          load: (findProgramEntryWhere(a.EX, "pullB") || {e:{}}).e.weight};
}, {EX});
console.log("   ", JSON.stringify(solo));
ck("the raise is earned", solo.to === 65, String(solo.to));
ck("unapplied before", solo.beforeApply === false, String(solo.beforeApply));
ck("and applied after", solo.afterApply === true, String(solo.afterApply));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
