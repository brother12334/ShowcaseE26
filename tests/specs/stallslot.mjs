import { chromium, APP_URL } from './_e26.mjs';
/* ITEM 11 - THE STALL COUNTER IS A FACT ABOUT A SLOT, NOT ABOUT A NAME.

   S.stalls was keyed by exercise name alone. A movement in two days of the split - the
   same Smith squat on Legs A and Legs B, at different loads and different rep ranges -
   shared one counter, so a flat session on Monday and a flat session on Thursday read as
   two stalled sessions of the same thing. Three of those offers to cut a set from a slot
   that may never have stalled.

   THE TWO-SLOT FIXTURE IS THE TEST. Every section runs the same movement in two days at
   different loads, because that is the only arrangement where a by-name counter and a
   by-slot counter disagree - and the whole class of bug these specs were written for is
   one that only shows up when a movement sits in more than one place.

   AND THE CONTROL IS THAT ONE SLOT GENUINELY STALLS. If neither did, "no false stall"
   would pass against a counter that had simply stopped counting. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const NM = "Smith Machine Squat";
/* `rows` is [dayIndex, load, reps, opts]. Sessions are laid out one every three days, in
   order, so the layoff reset never fires unless a section asks for it. */
const build = (rows)=> p.evaluate(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId="ppl6"; applySplit();
  S.flags=[]; S.planLog=[]; S.dayFlags={}; S.deload=null;
  const A = ROTATION[2], B = ROTATION[5];          // two different days
  S.program[A] = [{name:a.nm, sets:"3", reps:"8", rpe:"8", weight:100}];
  S.program[B] = [{name:a.nm, sets:"3", reps:"8", rpe:"8", weight:60}];
  const day = 864e5;
  const t0 = Date.now() - 60 * day;
  S.sessions = a.rows.map((r, i)=>{
    const [which, w, reps, opt] = r;
    const at = t0 + (opt && opt.gapDays != null ? opt.gapDays : i * 3) * day;
    const s = {id:"s"+i, workoutId: which === "A" ? A : B,
      date: new Date(at).toISOString().slice(0,10),
      startedAt: at, finishedAt: at + 3600e3,
      entries:[{name:a.nm, sets:[
        {weight:String(w), reps:String(reps), rpe:"8", done:true},
        {weight:String(w), reps:String(reps), rpe:"8", done:true},
        {weight:String(w), reps:String(reps), rpe:"9", done:true}]}]};
    if(opt && opt.notRep) s.notRepresentative = true;
    return s;
  });
  S.stalls = {}; delete S.stallsV2;
  save();
  const r = rebuildStalls();
  const keyA = stallKey(A, a.nm), keyB = stallKey(B, a.nm);
  return {rebuild: r, A: S.stalls[keyA] || null, B: S.stalls[keyB] || null,
          keys: Object.keys(S.stalls),
          verdictA: !!stallVerdict(a.nm, A), verdictB: !!stallVerdict(a.nm, B),
          wids: {A, B}};
}, {nm: NM, rows});

console.log("\n1. one slot stalls, the other does not");
/* Day A: 100 lb, flat for four sessions - a real stall. Day B: 60 lb, improving every
   time. By name there is one counter and it sees four flat sessions among eight; by slot
   there are two, and only one of them is stalled. */
const d1 = await build([
  ["A",100,8], ["B",60,8], ["A",100,8], ["B",60,9],
  ["A",100,8], ["B",60,10], ["A",100,8], ["B",60,11]
]);
console.log("    A: " + JSON.stringify(d1.A) + "\n    B: " + JSON.stringify(d1.B));
ck("there are two counters, one per slot", d1.keys.length === 2, d1.keys.join(" , "));
ck("both keys name their day", d1.keys.every(k=> k.indexOf("|") > 0), d1.keys.join(","));
ck("the flat slot has counted its stalls", d1.A && d1.A.n >= 3, d1.A && d1.A.n);
ck("and offers the verdict", d1.verdictA);
ck("the improving slot has not", d1.B && d1.B.n === 0, d1.B && d1.B.n);
ck("and offers nothing (control)", !d1.verdictB);

console.log("\n2. the same movement improving in BOTH slots stalls in neither");
/* The arrangement that caught the original bug: alternate days, each improving on its
   own previous session but never on the other's, because the loads differ. */
const d2 = await build([
  ["A",100,8], ["B",60,8], ["A",100,9], ["B",60,9],
  ["A",100,10], ["B",60,10], ["A",100,11], ["B",60,11]
]);
console.log("    A: " + JSON.stringify(d2.A) + "\n    B: " + JSON.stringify(d2.B));
ck("neither slot has a stall", (d2.A || {}).n === 0 && (d2.B || {}).n === 0,
   (d2.A||{}).n + "/" + (d2.B||{}).n);
ck("and neither offers a verdict", !d2.verdictA && !d2.verdictB);

console.log("\n3. a session marked not-representative holds the count, and does not reset it");
/* The injury case the audit named: the count either side of it is one run, not two, and
   the marked session itself adds nothing. */
const d3 = await build([
  ["A",100,8], ["A",100,8], ["A",100,8, {notRep:true}], ["A",100,8]
]);
console.log("    A: " + JSON.stringify(d3.A));
/* Four sessions: the first has no prior and starts the counter at zero, the second is
   flat and counts, the third is marked and is HELD - neither counted nor reset - and the
   fourth is flat and counts. Two, and the control below is what makes that number mean
   something: the same log without the mark counts three. */
ck("the marked session is held, so two are counted", d3.A && d3.A.n === 2, d3.A && d3.A.n);
const d3b = await build([
  ["A",100,8], ["A",100,8], ["A",100,8], ["A",100,8]
]);
ck("and WITHOUT the mark the same log counts one more (control)",
   d3b.A && d3b.A.n === (d3.A.n + 1), (d3.A||{}).n + " vs " + (d3b.A||{}).n);

console.log("\n4. a long layoff resets the run rather than pausing it");
const d4 = await build([
  ["A",100,8,{gapDays:0}], ["A",100,8,{gapDays:3}], ["A",100,8,{gapDays:6}],
  ["A",100,8,{gapDays:40}]
]);
console.log("    A: " + JSON.stringify(d4.A));
ck("the counter is back to zero after the break", d4.A && d4.A.n === 0, d4.A && d4.A.n);
ck("and it says why", d4.A && d4.A.afterBreak > 0, d4.A && d4.A.afterBreak);

console.log("\n5. the rebuild is exact: replaying twice gives the same answer");
/* The claim that makes drop-and-rebuild safe at all. If a second rebuild moved the
   numbers, the first would have been an approximation of a history the app never had. */
const d5 = await p.evaluate(()=>{
  const once = JSON.stringify(S.stalls);
  rebuildStalls();
  const twice = JSON.stringify(S.stalls);
  rebuildStalls(); rebuildStalls();
  return {same: once === twice && twice === JSON.stringify(S.stalls), once};
});
ck("three rebuilds, one answer", d5.same, d5.once.slice(0, 90));

console.log("\n6. it matches what live grading produced, session by session");
/* The strongest claim available: the rebuild is not merely stable, it agrees with the
   counters updateStalls() writes when each session is finished in turn. */
const d6 = await p.evaluate(()=>{
  const all = S.sessions.slice().sort((a,b)=> a.startedAt - b.startedAt);
  /* Live: start from nothing and feed the sessions in as they happen. */
  S.stalls = {};
  all.forEach(s=> updateStalls(s));
  const live = JSON.stringify(S.stalls);
  const r = rebuildStalls();
  return {same: live === JSON.stringify(S.stalls), live, rebuilt: JSON.stringify(S.stalls),
          n: r.sessions};
});
ck("the rebuild equals the live run", d6.same, d6.same ? d6.n + " sessions" : d6.live + "\n   vs " + d6.rebuilt);

console.log("\n7. editing a past session rebuilds the counters");
/* Back to the stalling fixture, because the layoff one above ends at zero whatever is
   edited - a test that cannot move is not a test. The LAST flat session of the stalled
   slot is corrected upward, which should break the run and drop the count. */
const d7pre = await build([
  ["A",100,8], ["B",60,8], ["A",100,8], ["B",60,9],
  ["A",100,8], ["B",60,10], ["A",100,8], ["B",60,11]
]);
const d7 = await p.evaluate(()=>{
  const A = ROTATION[2];
  const key = stallKey(A, "Smith Machine Squat");
  const before = JSON.stringify(S.stalls[key] || null);
  const last = S.sessions.filter(s=> s.workoutId === A)
    .sort((a,b)=> b.startedAt - a.startedAt)[0];
  /* It was not flat after all: a heavier set than anything before it. */
  last.entries[0].sets.forEach(st=>{ st.weight = "120"; });
  setEditSaved(last);
  return {before, after: JSON.stringify(S.stalls[key] || null),
          n: (S.stalls[key] || {}).n};
});
console.log("    " + d7.before + "\n    -> " + d7.after);
ck("the slot was stalled before the edit", JSON.parse(d7pre.A ? JSON.stringify(d7pre.A) : "{}").n >= 3,
   d7pre.A && d7pre.A.n);
ck("and the correction broke the run", d7.n === 0, String(d7.n));
ck("without anything else being asked to do it", d7.before !== d7.after);

console.log("\n8. an old by-name map is dropped, not inherited");
const d8 = await p.evaluate(()=>{
  S.stalls = {"smith machine squat": {n: 7, dates:["2026-01-01"]}};
  delete S.stallsV2;
  SEEDS_RUN = false;
  runOneTimeSeeds();
  return {keys: Object.keys(S.stalls), marker: S.stallsV2,
          leftover: Object.keys(S.stalls).filter(k=> k.indexOf("|") < 0)};
});
ck("no name-only key survives", d8.leftover.length === 0, d8.leftover.join(","));
ck("the map was rebuilt with slot keys", d8.keys.length > 0 && d8.keys.every(k=> k.indexOf("|") > 0),
   d8.keys.join(" , "));
ck("and the marker is set so it runs once", d8.marker === 2, String(d8.marker));

console.log("\n9. a sync from an older device cannot seed name-only counters");
const d9 = await p.evaluate(()=>{
  const merged = mergeStalls(S.stalls, {"smith machine squat": {n: 9, dates:[]}});
  return {keys: Object.keys(merged), bad: Object.keys(merged).filter(k=> k.indexOf("|") < 0)};
});
ck("the old-shape key is dropped on merge", d9.bad.length === 0, d9.bad.join(","));
ck("and the slot-keyed ones survive (control)", d9.keys.length > 0, d9.keys.join(" , "));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
