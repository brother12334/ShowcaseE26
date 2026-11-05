import { chromium, APP_URL } from './_e26.mjs';
/* "IF A USER SWITCHED EXERCISE ORDER IN A WORKOUT AND THEY HAD ALREADY DONE THE
   AUTOMATIC WARM UP SETS, IT SHOULD REAPPLY TO THE RIGHT ORDER — NOW MY WARMUP SETS ARE
   ALL OVER THE PLACE."

   Which ramp a movement earns is a question about WHERE IT SITS: the first lift of the
   day gets the full one, the second compound a light one, everything after that none.
   The Program tab asks that live every time it draws. The session asked it once, at
   Start, wrote the answer onto each row, and never asked again — so every reorder moved
   the rows and left the ramps behind. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const ev=(fn,a)=>p.evaluate(fn,a);

await ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'auto'});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  S.program[wid]=[
    {name:"Barbell Bench Press", sets:3, reps:"6-10", weight:185},
    {name:"Barbell Row",         sets:3, reps:"8-12", weight:135},
    {name:"Dumbbell Curl",       sets:3, reps:"10-15", weight:30}];
  save(); S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
});
const kinds = ()=> ev(()=> S.active.entries.map(e=> e.name + ":" + (e.warm || "none")));

console.log("1 - THE RAMPS LAND WHERE THEY BELONG TO START WITH");
{
  const r = await kinds();
  console.log("   ", JSON.stringify(r));
  ck("the first lift of the day gets the full ramp", /Bench Press:full/.test(r[0]), r[0]);
  ck("the second compound gets a light one", /Row:light/.test(r[1]), r[1]);
  ck("and the curl gets none", /Curl:none/.test(r[2]), r[2]);
}

console.log("2 - MOVE THE CURL TO THE FRONT AND THE RAMPS FOLLOW THE ORDER");
{
  const r = await ev(()=>{
    const list = S.active.entries;
    S.active.entries = [list[2], list[0], list[1]];
    save(); render();
    return S.active.entries.map(e=> e.name + ":" + (e.warm || "none"));
  });
  console.log("   ", JSON.stringify(r));
  ck("THE RAMP IS ON WHAT YOU ARE ABOUT TO DO FIRST", /Curl:full/.test(r[0]), r[0]);
  /* The standing rule is "index 0 gets the full ramp, the SECOND compound in the list
     gets a light one" — unchanged here, and asserted as it actually is rather than as
     the reorder makes you expect. With a curl in front, the second compound is the row.
     What this spec is about is that the answer follows the order at all. */
  ck("and the light one is on the second compound, wherever that now is",
     /Row:light/.test(r[2]), r[2]);
  ck("so nothing is left on a row that did not earn it", /Bench Press:none/.test(r[1]), r[1]);
}

console.log("3 - AND THE CARD DRAWS WHAT THE ROW SAYS");
/* The invariant that matters on screen: a ramp appears on exactly the cards whose row
   earned one, in the order the cards are in. */
{
  const r = await ev(()=>{
    const cards=[...document.querySelectorAll('.card.ex')];
    const drawn = cards.map(c=> !!c.querySelector('.warm'));
    const want  = S.active.entries.map(e=> !!e.warm);
    return {drawn, want, n: cards.length};
  });
  console.log("   ", JSON.stringify(r));
  ck("one card per movement", r.n === r.want.length, r.n + " of " + r.want.length);
  ck("and the ramps are drawn on exactly the rows that earned one",
     r.drawn.join(",") === r.want.join(","),
     "drawn " + r.drawn.join(",") + " / want " + r.want.join(","));
}

console.log("4 - TICKS DO NOT SURVIVE A RAMP THEY NO LONGER DESCRIBE");
/* "They had already done the automatic warm up sets." A tick means "I did that rung",
   and after a reorder the rungs are not the same rungs. */
{
  const r = await ev(()=>{
    S.active.entries[0].warmDone = [true, true];
    save();
    const before = S.active.entries[0].warmDone.slice();
    const list = S.active.entries;
    S.active.entries = [list[1], list[0], list[2]];   // curl back off the front
    save(); render();
    const curl = S.active.entries.find(e=> /curl/i.test(e.name));
    return {before, after: curl.warmDone, warm: curl.warm || "none"};
  });
  console.log("   ", JSON.stringify(r));
  ck("its ramp changed", r.warm !== "full", r.warm);
  ck("so the ticks on the old one are cleared",
     Array.isArray(r.after) && !r.after.some(Boolean), JSON.stringify(r.after));
}

console.log("5 - A RAMP YOUR PLAN WROTE IS NOT POSITIONAL AND IS LEFT ALONE");
{
  const r = await ev(()=>{
    const wid=ROTATION[0];
    S.program[wid]=[
      {name:"Barbell Bench Press", sets:3, reps:"6-10", weight:185,
       warmups:[{pct:0.5, reps:"8"},{pct:0.75, reps:"5"}]},
      {name:"Barbell Row", sets:3, reps:"8-12", weight:135}];
    save(); S.active=null; startWorkout(wid); PF=null;
    const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
    render();
    const list = S.active.entries;
    S.active.entries = [list[1], list[0]];
    save(); render();
    return S.active.entries.map(e=> e.name + ":" + (e.warm || "none"));
  });
  console.log("   ", JSON.stringify(r));
  ck("the prescribed ramp stays with its movement wherever it sits",
     r.some(x=> /Bench Press:plan/.test(x)), JSON.stringify(r));
  ck("and the other row takes the positional one", /Row:full/.test(r[0]), r[0]);
}

console.log("6 - IT REPAIRS A SESSION THAT IS ALREADY WRONG, WITH NOTHING TO TAP");
/* "Also make it work for current users." A session started before this release carries
   whatever the old code wrote; opening the app has to be enough. */
{
  const r = await ev(()=>{
    const wid=ROTATION[0];
    S.program[wid]=[
      {name:"Barbell Bench Press", sets:3, reps:"6-10", weight:185},
      {name:"Barbell Row", sets:3, reps:"8-12", weight:135},
      {name:"Dumbbell Curl", sets:3, reps:"10-15", weight:30}];
    save(); S.active=null; startWorkout(wid); PF=null;
    const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
    /* Exactly the shape the report describes: rows reordered by the old code, ramps left
       where they were. */
    const list = S.active.entries;
    S.active.entries = [list[2], list[0], list[1]];
    S.active.entries[0].warm = undefined;
    S.active.entries[1].warm = "full";
    S.active.entries[2].warm = "light";
    save();
    const before = S.active.entries.map(e=> e.name + ":" + (e.warm || "none"));
    render();
    return {before, after: S.active.entries.map(e=> e.name + ":" + (e.warm || "none"))};
  });
  console.log("    before", JSON.stringify(r.before));
  console.log("    after ", JSON.stringify(r.after));
  ck("a render is all it takes", /Curl:full/.test(r.after[0]), r.after[0]);
  ck("and the stale ramp is off the row that was carrying it",
     /Bench Press:none/.test(r.after[1]), r.after[1]);
  ck("with the rest where the rule puts them", /Row:light/.test(r.after[2]), r.after[2]);
}

console.log("7 - A FINISHED SESSION IS HISTORY AND IS NOT REWRITTEN");
{
  const r = await ev(()=>{
    const a = S.active;
    a.entries.forEach(e=> e.sets.forEach(st=>{ st.weight="100"; st.reps="8"; st.done=true; }));
    const snap = a.entries.map(e=> e.name + ":" + (e.warm || "none"));
    finishWorkout(); hideModal();
    const s = S.sessions[S.sessions.length-1];
    render();
    return {snap, after: s.entries.map(e=> e.name + ":" + (e.warm || "none"))};
  });
  console.log("   ", JSON.stringify(r));
  ck("the logged session keeps what it was run with",
     r.after.join("|") === r.snap.join("|"), JSON.stringify(r));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
