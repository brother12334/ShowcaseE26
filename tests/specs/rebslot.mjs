import { chromium, APP_URL } from './_e26.mjs';
/* SLOT DEBTS 6, 7 AND 8 of 9 - prescribedLoadFor and rebuildFor's two sites.

   All three are the same shape: given a SESSION entry, fall back to the programme row
   when the entry carries no load of its own - by name, so the first slot holding that
   name answers.

   rebuildFor is the one with teeth. A rebuild marker is written when a load goes up
   ("45 lb is new, reps restart at 8 and climb back to 12"), and it changes what the set
   rows ask for. Read by name, a marker written on one slot is announced on another day's
   session - and that day's rep targets are held down to the bottom of the range on the
   strength of an increase it never had.

   There is a guard that hides this most of the time and is not a fix: the marker is
   dropped when the prescribed load no longer matches the one it was written at. Two slots
   at DIFFERENT loads therefore fail that check and the marker is discarded by accident.
   Two slots at the SAME load do not, and that is where it bites - which is the arrangement
   this spec uses.

   The asymmetry is the giveaway: clearRebuiltEntries() was converted to the session's own
   slot some time ago, so a rebuild was being READ off one day and CLEARED on another. One
   of the two had to be wrong. */
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, plateStep:5});
  S.splitId="ppl6"; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const EX = "Smith Machine Squat";
/* BOTH SLOTS AT 80. Legs A has just had an increase and carries the rebuild marker;
   Legs B has not. Equal loads are what let the marker cross - at different loads the
   mismatch guard discards it by accident and hides the fault. */
const seed = ()=> p.evaluate(a=>{
  S.program.legsA = [{name: a.EX, sets:3, reps:"8-12", weight:80,
    rebuild: {from: 8, top: 12, weight: 80, prevWeight: 70, at: Date.now() - 2*86400000}}];
  S.program.legsB = [{name: a.EX, sets:3, reps:"8-12", weight:80}];
  S.sessions = []; S.planLog = []; S.active = null;
  const day = i=> dayStr(Date.now() - (6 - i) * 86400000);
  const mk = (wid, i, extra)=> Object.assign({
    id: wid + i, date: day(i), workoutId: wid,
    startedAt: Date.parse(day(i) + "T18:00:00"), finishedAt: Date.parse(day(i) + "T19:00:00"),
    entries:[Object.assign({name: a.EX, reps:"8-12", rpes:[8,8,8],
      sets:[0,1,2].map(()=> ({weight:"80", reps:"10", rpe:"8", done:true}))}, extra || {})]
  }, {});
  S.sessions = [mk("legsA", 1), mk("legsB", 2)];
  save();
  return null;
}, {EX});

console.log("1 - CONTROL: THE SLOT THAT EARNED THE REBUILD HAS ONE");
await seed();
const control = await p.evaluate(a=>{
  const sA = S.sessions.filter(s=> s.workoutId === "legsA")[0];
  const rb = rebuildFor(sA.entries[0]);
  return {rb: rb ? {from: rb.from, top: rb.top, weight: rb.weight} : null,
          day: entryDayOf(sA.entries[0])};
}, {EX});
console.log("   ", JSON.stringify(control));
ck("the Legs A entry finds its rebuild", !!control.rb, JSON.stringify(control.rb));
ck("written at the load the slot holds", control.rb && control.rb.weight === 80,
   control.rb && String(control.rb.weight));
ck("and the entry can name its own day", control.day === "legsA", String(control.day));

console.log("\n2 - AND THE SLOT THAT DID NOT, HAS NOT");
const other = await p.evaluate(a=>{
  const sB = S.sessions.filter(s=> s.workoutId === "legsB")[0];
  return {day: entryDayOf(sB.entries[0]),
          rb: rebuildFor(sB.entries[0]),
          ownMarker: !!(findProgramEntryWhere(a.EX, "legsB") || {e:{}}).e.rebuild};
}, {EX});
console.log("   ", JSON.stringify(other));
ck("the Legs B entry is on Legs B", other.day === "legsB", String(other.day));
ck("its own slot carries no rebuild", other.ownMarker === false, String(other.ownMarker));
ck("so no rebuild is announced for it", other.rb === null, JSON.stringify(other.rb));

console.log("\n3 - THE REP TARGETS OF THE INNOCENT DAY ARE NOT HELD DOWN");
/* What the marker actually does: holds the rep target at the bottom of the range while
   you climb back. A marker borrowed from another day would hold this day's targets at 8
   when its own prescription asks for 8-12 with nothing to rebuild from. */
const targets = await p.evaluate(a=>{
  const sB = S.sessions.filter(s=> s.workoutId === "legsB")[0];
  const sA = S.sessions.filter(s=> s.workoutId === "legsA")[0];
  const rx = en=>{
    try{ return setPrescription(en, 0); }catch(e){ return {err: String(e)}; }
  };
  return {b: rx(sB.entries[0]), a: rx(sA.entries[0])};
}, {EX});
console.log("   ", JSON.stringify(targets));
ck("the rebuilding day is asked for the bottom of its range",
   targets.a && String(targets.a.reps) === "8", JSON.stringify(targets.a));
ck("and the other day is not", !targets.b || String(targets.b.reps) !== "8"
   || !targets.b.rebuild, JSON.stringify(targets.b));

console.log("\n4 - AND IT IS READ OFF THE SAME SLOT IT IS CLEARED ON");
/* clearRebuiltEntries() is already per-slot. A session that tops the range clears its own
   day's marker and leaves the other day's standing - and the read now agrees. */
const cleared = await p.evaluate(a=>{
  const markerOn = wid=> !!(findProgramEntryWhere(a.EX, wid) || {e:{}}).e.rebuild;
  const before = {legsA: markerOn("legsA"), legsB: markerOn("legsB")};
  /* A Legs B session topping the range: it has no marker of its own to clear. */
  const sB = S.sessions.filter(s=> s.workoutId === "legsB")[0];
  sB.entries[0].sets.forEach(st=>{ st.reps = "12"; });
  clearRebuiltEntries(sB);
  const mid = {legsA: markerOn("legsA"), legsB: markerOn("legsB")};
  /* Now the Legs A session tops it, which does clear its own. */
  const sA = S.sessions.filter(s=> s.workoutId === "legsA")[0];
  sA.entries[0].sets.forEach(st=>{ st.reps = "12"; });
  clearRebuiltEntries(sA);
  const after = {legsA: markerOn("legsA"), legsB: markerOn("legsB")};
  return {before, mid, after};
}, {EX});
console.log("   ", JSON.stringify(cleared));
ck("Legs A starts with the marker", cleared.before.legsA === true,
   String(cleared.before.legsA));
ck("a Legs B session topping the range does not clear it",
   cleared.mid.legsA === true, String(cleared.mid.legsA));
ck("and a Legs A session does", cleared.after.legsA === false,
   String(cleared.after.legsA));

console.log("\n5 - THE PRESCRIBED LOAD COMES FROM THE ENTRY'S OWN DAY");
/* prescribedLoadFor falls back to the programme only when the entry carries neither a
   weight nor a planWeight - an older logged session, or one built before the freeze. */
const presc = await p.evaluate(a=>{
  S.program.legsA = [{name: a.EX, sets:3, reps:"8-12", weight:100}];
  S.program.legsB = [{name: a.EX, sets:3, reps:"8-12", weight:60}];
  const day = dayStr(Date.now() - 86400000);
  const bare = {name: a.EX, reps:"8-12",
    sets:[{weight:"60", reps:"10", rpe:"8", done:true}]};
  S.sessions = [{id:"bare", date: day, workoutId:"legsB",
    startedAt: Date.parse(day + "T18:00:00"), finishedAt: Date.parse(day + "T19:00:00"),
    entries:[bare]}];
  save();
  return {day: entryDayOf(bare), got: prescribedLoadFor(bare),
          hasWeight: bare.weight !== undefined, hasPlanWeight: bare.planWeight !== undefined};
}, {EX});
console.log("   ", JSON.stringify(presc));
ck("the entry carries neither load field, so the fallback runs",
   !presc.hasWeight && !presc.hasPlanWeight,
   presc.hasWeight + "/" + presc.hasPlanWeight);
ck("and it reads this day's 60, not the other day's 100", presc.got === 60,
   String(presc.got));

console.log("\n6 - A MOVEMENT IN ONE SLOT IS UNAFFECTED");
const solo = await p.evaluate(a=>{
  S.program.legsA = [{name: a.EX, sets:3, reps:"8-12", weight:90,
    rebuild: {from: 8, top: 12, weight: 90, prevWeight: 80, at: Date.now() - 86400000}}];
  S.program.legsB = [];
  const day = dayStr(Date.now() - 86400000);
  const bare = {name: a.EX, reps:"8-12", sets:[{weight:"90", reps:"9", rpe:"8", done:true}]};
  S.sessions = [{id:"s1", date: day, workoutId:"legsA",
    startedAt: Date.parse(day + "T18:00:00"), finishedAt: Date.parse(day + "T19:00:00"),
    entries:[bare]}];
  save();
  const rb = rebuildFor(bare);
  return {load: prescribedLoadFor(bare), rb: rb ? rb.weight : null};
}, {EX});
console.log("   ", JSON.stringify(solo));
ck("the load still resolves", solo.load === 90, String(solo.load));
ck("and the rebuild is still found", solo.rb === 90, String(solo.rb));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
