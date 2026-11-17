import { chromium, APP_URL } from './_e26.mjs';
/* A PER-SIDE MOVEMENT LOGGED AS PLAIN SETS.

   The session editor had no L/R rows, so a one-limb movement re-entered there came out
   as plain sets on a movement every rule treats as per-side. The question is what that
   is counted as, and there are three readers that could get it wrong in three different
   directions. All three are pinned here against the SAME entry, because a fix to any one
   of them could break another.

     volume      must not double-count. A plain set is one set, not two side-sets.
     asymmetry   must not be fed sides that were never recorded. An entry with no sides
                 has nothing to say about left against right, and a check that invented a
                 reading from it would be comparing a limb with itself.
     completion  must compare like with like. This is the one that WAS wrong: the planned
                 figure asked the MOVEMENT whether it is per-side and doubled on the
                 answer, while the logged figure counts what the session holds. A
                 fully-completed movement therefore graded as half done.

   THE CONTROL is the same movement, same loads, logged properly as pairs. Volume has to
   match the plain version, asymmetry has to produce a reading where the plain one
   produces none, and completion has to be full in both. Without that control, "no
   asymmetry reading" would pass just as well on a fixture too thin to produce one. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2400}});
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId="ppl6"; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* The plan slot prescribes 4 sets of a movement the app treats as one-limb. */
const NM = "Cable Lateral Raise";
const build = (shape)=> p.evaluate(a=>{
  const wid = ROTATION[0];
  S.program[wid] = [{name:"Barbell Bench Press", sets:"3", reps:"8", rpe:"8"},
                    {name:a.nm, sets:"4", reps:"15", rpe:"8", uni:true}];
  /* Two sets per side at the same load, with different RPEs, which is what an asymmetry
     reading needs: matched reps alone are explicitly excluded as evidence. */
  /* FOUR pairs, because the slot prescribes four sets and a pair is one set. Two pairs
     would be half the prescribed work, and comparing that against the plan is a test of
     the fixture rather than of the code. */
  const onePair = ()=> ({sides:{L:{reps:"15",weight:"25",rpe:"8",done:true},
                                R:{reps:"12",weight:"25",rpe:"9",done:true}}});
  const paired = [onePair(), onePair(), onePair(), onePair()];
  const plain = [
    {reps:"15",weight:"25",rpe:"8",done:true}, {reps:"12",weight:"25",rpe:"9",done:true},
    {reps:"15",weight:"25",rpe:"8",done:true}, {reps:"12",weight:"25",rpe:"9",done:true}
  ];
  const ent = a.shape === "paired"
    ? {name:a.nm, perSide:true, startSide:"L", sets:paired}
    : {name:a.nm, sets:plain};
  S.sessions = [{id:"s1", workoutId:wid, date:todayStr(),
    startedAt:Date.now()-5400e3, finishedAt:Date.now()-1800e3,
    entries:[{name:"Barbell Bench Press", sets:[
      {reps:"8",weight:"135",rpe:"8",done:true},{reps:"8",weight:"135",rpe:"8",done:true},
      {reps:"7",weight:"135",rpe:"9",done:true}]}, ent]}];
  ASYM_CACHE = {key:null, data:{}};
  const q = scoreWorkout(S.sessions[0]);
  const comp = (q.sections || []).find(x=> x.key === "completion") || {};
  const st = sideStats(a.nm);
  return {
    perSideEntry: entryPerSide(S.sessions[0].entries[1]),
    perSideWanted: entryPerSideWanted(S.program[wid][1]),
    sideSetCount: sideSets(S.sessions[0].entries[1]).length,
    unitsTotal: sideSets(S.sessions[0].entries[1]).reduce((t,x)=> t + x.count, 0),
    volume: sessVolume ? sessVolume(S.sessions[0]) : null,
    completionWhy: (comp.why || []).join(" "),
    completionPct: comp.pct == null ? null : Math.round(comp.pct * 100),
    asymOk: !!st.ok, asymReason: st.reason || null
  };
}, {nm:NM, shape});

console.log("\n1. logged as plain sets, on a movement the slot marks per-side");
const plain = await build("plain");
ck("the movement is one the app treats as one-limb", plain.perSideWanted);
ck("but the ENTRY is not per-side, because it holds no sides", !plain.perSideEntry);
ck("its four sets read as four whole sets", plain.sideSetCount === 4, plain.sideSetCount);
ck("worth four, not eight — no double count", plain.unitsTotal === 4, plain.unitsTotal);
ck("the asymmetry check gets no reading from it", !plain.asymOk, plain.asymReason);
ck("and completion is full, not half", plain.completionPct === 100,
   plain.completionPct + "% :: " + plain.completionWhy);

console.log("\n2. the control: the same work logged as pairs");
const pair = await build("paired");
ck("the entry is per-side", pair.perSideEntry);
ck("four pairs read as eight side-sets", pair.sideSetCount === 8, pair.sideSetCount);
ck("worth four whole sets", Math.abs(pair.unitsTotal - 4) < 1e-9, pair.unitsTotal);
ck("the asymmetry check DOES get a reading (control)", pair.asymOk, pair.asymReason);
ck("and completion is full here too", pair.completionPct === 100,
   pair.completionPct + "% :: " + pair.completionWhy);

console.log("\n3. nothing logged at all still counts the work as undone");
const none = await p.evaluate(nm=>{
  S.sessions[0].entries = S.sessions[0].entries.filter(e=> e.name !== nm);
  const q = scoreWorkout(S.sessions[0]);
  const comp = (q.sections || []).find(x=> x.key === "completion") || {};
  return {pct: comp.pct == null ? null : Math.round(comp.pct * 100),
          why: (comp.why || []).join(" ")};
}, NM);
ck("completion is well short", none.pct !== null && none.pct < 70, none.pct + "%");
/* With nothing logged there is no entry to ask, so the movement's own setting decides:
   four prescribed sets of a one-limb movement is eight side-sets of work, and none of it
   was done. 3 of 11 rather than 3 of 7. */
ck("and the missing work is counted in side-sets: 11 planned, not 7",
   /against 11 planned/.test(none.why), none.why.slice(0, 160));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
