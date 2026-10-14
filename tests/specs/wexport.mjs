import { chromium, APP_URL } from './_e26.mjs';
/* "EXPORT AN ENTIRE WORKOUT WHEN FINISHED ... WITH ALL THE INFO INCLUDING TIMESTAMPS FOR
   SETS AND REPS AND HOW MANY REPS AND WHAT EXERCISE AND ALL OF THAT", offered after every
   workout and from the History tab.

   The log knew the ORDER of your sets and the rest between them and never the clock time
   of any of them, so the honest half of this feature is the half that says which sessions
   have those times and which cannot. */
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
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr();
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  S.program[wid]=[{name:"Barbell Bench Press", sets:3, reps:"8-12", rpes:[7,8,9], weight:100}];
  save(); if(S.active) S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("1 - A SET REMEMBERS WHEN IT WAS LOGGED");
{
  const r = await p.evaluate(()=>{
    const en=S.active.entries[0];
    en.sets[0].weight="100"; en.sets[0].reps="10"; en.sets[0].rpe="8"; save(); render();
    const before = Date.now();
    document.querySelector('.chk[data-e="0"][data-s="0"]').click();
    return {at: en.sets[0].at, done: en.sets[0].done, before, now: Date.now()};
  });
  ck("the tick writes the time", r.at > 0, String(r.at));
  ck("and it is the time it happened", r.at >= r.before && r.at <= r.now, String(r.at));
}

console.log("\n2 - TAKING THE TICK BACK TAKES THE TIME WITH IT");
{
  const r = await p.evaluate(()=>{
    document.querySelector('.chk[data-e="0"][data-s="0"]').click();
    const st=S.active.entries[0].sets[0];
    return {at: st.at, done: st.done};
  });
  ck("a set that did not happen has no time", r.at === undefined, String(r.at));
  ck("because it is not a logged set", r.done === false, String(r.done));
}

console.log("\n3 - THE EXPORT CARRIES THE WHOLE SESSION");
{
  const r = await p.evaluate(()=>{
    const en=S.active.entries[0];
    en.sets.forEach((st,i)=>{ st.weight="100"; st.reps=String(12-i); st.rpe=String(7+i); });
    /* The rest clock blocks the next tick until it is stopped, which is the app working:
       you cannot log a set you have not had time to do. Stopped between each one. */
    [0,1,2].forEach(i=>{ recordRestIfRunning();
      document.querySelector(`.chk[data-e="0"][data-s="${i}"]`).click(); });
    recordRestIfRunning();
    S.active.finishedAt = Date.now(); S.active.feel = 4;
    const x = workoutExport(S.active);
    return {x, text: workoutExportText(S.active).slice(0, 80),
            name: workoutExportName(S.active)};
  });
  const x = r.x;
  console.log("   ", JSON.stringify(x.exercises[0].sets[0]), "|", x.setTimes);
  ck("it says what it is and which version wrote it",
     x.format === "element26.workout" && x.formatVersion >= 1 && !!x.app.version,
     x.format + " v" + x.formatVersion + " app " + x.app.version);
  ck("the exercise is named", x.exercises[0].exercise === "Barbell Bench Press", x.exercises[0].exercise);
  ck("every set is there", x.exercises[0].sets.length === 3, String(x.exercises[0].sets.length));
  ck("with its reps", x.exercises[0].sets.map(s=>s.reps).join("/") === "12/11/10",
     x.exercises[0].sets.map(s=>s.reps).join("/"));
  ck("its load as a number, not a string", typeof x.exercises[0].sets[0].weight === "number",
     typeof x.exercises[0].sets[0].weight);
  ck("its effort", x.exercises[0].sets[0].rpe === 7, String(x.exercises[0].sets[0].rpe));
  ck("AND ITS TIMESTAMP, in a form anything can read",
     /^\d{4}-\d\d-\d\dT/.test(x.exercises[0].sets[0].at || ""), x.exercises[0].sets[0].at);
  ck("with the raw milliseconds beside it", x.exercises[0].sets[0].atEpochMs > 0,
     String(x.exercises[0].sets[0].atEpochMs));
  ck("the session's own times are there", !!x.workout.startedAt && !!x.workout.finishedAt,
     x.workout.startedAt + " to " + x.workout.finishedAt);
  ck("the volume is the sum of what was logged, not of what was planned",
     x.workout.totalVolume === 100*12 + 100*11 + 100*10, String(x.workout.totalVolume));
  ck("and the working-set count agrees with it", x.workout.workingSets === 3,
     String(x.workout.workingSets));
  ck("the units are stated", !!x.units, x.units);
  ck("and it parses as JSON", (()=>{ try{ JSON.parse(JSON.stringify(x)); return true; }catch(e){ return false; } })());
  ck("the file is named after the session", /element26-.*\.json$/.test(r.name), r.name);
}

console.log("\n3b - AND A WARM-UP EARNS NO VOLUME HERE EITHER");
{
  /* The first export ever generated showed a 135 x 8 warm-up inside a bench press's
     totalVolume and counted in its working sets, over a `warmup: true` flag on the very
     same set. An export that contradicts itself three lines apart is worse than one that
     leaves the figure out. */
  const r = await p.evaluate(()=>{
    const s = {id:"warm1", workoutId:ROTATION[0], date:todayStr(),
      startedAt:Date.now()-3600e3, finishedAt:Date.now(),
      entries:[{name:"Barbell Bench Press", reps:"6-10", sets:[
        {weight:"135", reps:"8",  rpe:"6", done:true, warmup:true},
        {weight:"185", reps:"8",  rpe:"8", done:true},
        {weight:"185", reps:"7",  rpe:"9", done:true}]}]};
    const x = workoutExport(s);
    return {flagged: x.exercises[0].sets[0].warmup, vol: x.exercises[0].totalVolume,
            n: x.exercises[0].workingSets, total: x.workout.totalVolume};
  });
  console.log("   ", JSON.stringify(r));
  ck("the warm-up is still marked as one", r.flagged === true, String(r.flagged));
  ck("but it is not in the volume", r.vol === 185*8 + 185*7, String(r.vol));
  ck("nor in the working-set count", r.n === 2, String(r.n));
  ck("and the session total agrees", r.total === r.vol, r.total + " vs " + r.vol);
}

console.log("\n4 - A SESSION WITH NO PER-SET TIMES SAYS SO RATHER THAN INVENTING THEM");
{
  const r = await p.evaluate(()=>{
    const old = {id:"old1", workoutId:ROTATION[0], date:"2025-01-02",
      startedAt: new Date("2025-01-02T10:00:00Z").getTime(),
      finishedAt: new Date("2025-01-02T11:00:00Z").getTime(), feel:3,
      entries:[{name:"Barbell Row", reps:"8-12", sets:[
        {weight:"80", reps:"10", rpe:"8", done:true, rest:120}]}]};
    S.sessions.push(old); save();
    const x = workoutExport(old);
    return {says: x.setTimes, set: x.exercises[0].sets[0]};
  });
  console.log("   ", JSON.stringify(r));
  ck("no timestamp is invented", r.set.at === undefined, String(r.set.at));
  ck("and the export says which case this is", /predates per-set timestamps/.test(r.says), r.says);
  ck("while the rest it DID record is still there", r.set.restSeconds === 120, String(r.set.restSeconds));
}

console.log("\n5 - IT IS OFFERED FROM HISTORY");
{
  const r = await p.evaluate(()=>{
    TAB="history"; render();
    const btn = document.querySelector('[data-exportsess]');
    if(!btn) return {none:true};
    btn.click();
    const m = document.getElementById("modal");
    return {opened: !!(m && /Export this workout/.test((m||{}).textContent||"")),
            preview: !!document.querySelector(".exp-pre"),
            copy: !!document.getElementById("expCopy"),
            file: !!document.getElementById("expFile")};
  });
  console.log("   ", JSON.stringify(r));
  ck("every session row offers it", !r.none, String(!r.none));
  ck("it opens the sheet", r.opened, String(r.opened));
  ck("which shows you what you are about to send", r.preview, String(r.preview));
  ck("with both destinations", r.copy && r.file, "copy:"+r.copy+" file:"+r.file);
}

console.log("\n6 - AND AT THE END OF A WORKOUT");
{
  const r = await p.evaluate(()=>{
    hideModal();
    const s = S.sessions[S.sessions.length-1];
    openScoreCard(s, null);
    const has = !!document.getElementById("scExport");
    if(has) document.getElementById("scExport").click();
    const m = document.getElementById("modal");
    return {has, opened: !!(m && /Export this workout/.test((m||{}).textContent||"")),
            stacked: document.querySelectorAll("#modal .scf").length};
  });
  console.log("   ", JSON.stringify(r));
  ck("the finish card offers it", r.has, String(r.has));
  ck("and it opens the same sheet", r.opened, String(r.opened));
  ck("replacing the card rather than stacking on it", r.stacked === 0, String(r.stacked));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
