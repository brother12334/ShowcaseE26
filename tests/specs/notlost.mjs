import { chromium, APP_URL } from './_e26.mjs';
/* NOTHING YOU TYPED IS DROPPED WITHOUT A WORD.

   Two filters in this app decide whether a set is worth keeping: the one finishWorkout
   runs before a session is filed, and the one the session editor runs before adding a
   movement. Both were written as "does this row have reps or a weight", and both are
   therefore wrong in the same way - a row where the only thing recorded was an RPE went
   in the bin silently. That is the same class of fault as the one that deleted a whole
   paired movement at finish: a test for "is this empty" that does not know about one of
   the fields a person can fill in.

   THE CONTROL IS A ROW THAT REALLY IS EMPTY. Both filters have to keep dropping those,
   or this spec would pass against no filter at all - and a trailing blank row is the
   normal case, so keeping it would put phantom sets in everybody's history. Every section
   asserts the empty row goes AND the typed row stays. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
/* Both filters sit behind a confirm(), which Playwright must answer or finish never runs. */
p.on('dialog',d=>d.accept());
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

/* ---------- 1. setHasAnything knows every field a person fills in ---------- */
console.log("\n1. what counts as 'something in this set'");
const d1 = await p.evaluate(()=>({
  reps:    setHasAnything({reps:"8"}),
  weight:  setHasAnything({weight:"135"}),
  rpe:     setHasAnything({rpe:"8"}),
  rpeNum:  setHasAnything({rpe:8}),
  done:    setHasAnything({done:true}),
  empty:   setHasAnything({}),
  blanks:  setHasAnything({reps:"", weight:"", rpe:""}),
  appOnly: setHasAnything({rest:90, side:"L", warm:true}),
  nul:     setHasAnything(null)
}));
ck("reps count", d1.reps);
ck("a weight counts", d1.weight);
ck("an RPE counts, as a string", d1.rpe);
ck("and as a number", d1.rpeNum);
ck("a tick counts", d1.done);
ck("an empty set does not", !d1.empty);
ck("nor blank strings", !d1.blanks);
ck("nor fields the APP wrote rather than you", !d1.appOnly);
ck("nor a missing set", !d1.nul);

/* ---------- 2. finishWorkout keeps an RPE-only set ---------- */
/* Four sets on one movement: a normal one, an RPE-only one, a tick-only one and an empty
   one. The empty one is the control. */
console.log("\n2. finishWorkout, on a plain movement");
const d2 = await p.evaluate(()=>{
  S.active = {id:"a1", workoutId:ROTATION[0], date:todayStr(), startedAt:Date.now()-3600e3,
    entries:[{name:"Barbell Bench Press", sets:[
      {reps:"8", weight:"135", done:true},
      {rpe:"8"},
      {done:true},
      {}
    ]}]};
  finishWorkout();
  const s = S.sessions[S.sessions.length-1] || {};
  const e = (s.entries||[])[0] || {};
  return {sets:(e.sets||[]).length, json:JSON.stringify(e.sets||[])};
});
ck("the three sets with something in them are kept", d2.sets === 3, d2.sets);
ck("including the RPE-only one", d2.json.indexOf('"rpe":"8"') >= 0, d2.json);
ck("and the empty one is still dropped", d2.sets === 3);

/* ---------- 3. finishWorkout, on a paired movement, one side only ---------- */
/* A paired set keeps nothing at the top level, so "has anything" has to look inside both
   sides. Three pairs: both sides, left only, and an RPE on the right only. */
console.log("\n3. finishWorkout, on a per-side movement");
const d3 = await p.evaluate(()=>{
  S.active = {id:"a2", workoutId:ROTATION[0], date:todayStr(), startedAt:Date.now()-3600e3,
    entries:[{name:"Cable Lateral Raise", perSide:true, startSide:"L", sets:[
      {sides:{L:{reps:"15",weight:"25",done:true}, R:{reps:"14",weight:"25",done:true}}},
      {sides:{L:{reps:"13",weight:"25",done:true}, R:{}}},
      {sides:{L:{}, R:{rpe:"9"}}},
      {sides:{L:{}, R:{}}},
      {sides:{}}
    ]}]};
  finishWorkout();
  const s = S.sessions[S.sessions.length-1] || {};
  const e = (s.entries||[]).find(x=> x.name === "Cable Lateral Raise") || {};
  return {there: !!e.name, sets:(e.sets||[]).length, json:JSON.stringify(e.sets||[])};
});
ck("the movement survived at all", d3.there);
ck("the three pairs with something in them are kept", d3.sets === 3, d3.sets);
ck("including the one logged on the left only", d3.json.indexOf('"13"') >= 0);
ck("and the one that is only an RPE on the right", d3.json.indexOf('"rpe":"9"') >= 0, d3.json);
ck("the two empty pairs are dropped", d3.sets === 3);

/* ---------- 4. the session editor keeps an RPE-only row ---------- */
console.log("\n4. the session editor's Add an exercise");
const d4 = await p.evaluate(()=>{
  const s = S.sessions[0];
  const before = (s.entries||[]).length;
  renderSessEditor(s);
  const sel = document.getElementById("addExSel");
  sel.value = "__custom__"; sel.dispatchEvent(new Event("change", {bubbles:true}));
  const c = document.getElementById("customName"); c.value = "Spider Curl";
  c.dispatchEvent(new Event("change", {bubbles:true}));
  document.getElementById("plusSet").click();
  document.getElementById("plusSet").click();
  const put = (i, f, v)=>{ const el = document.querySelector(`#newSets [data-ns="${i}"][data-f="${f}"]`);
    if(el){ el.value = v; el.dispatchEvent(new Event("change", {bubbles:true})); } };
  put(0,"weight","30"); put(0,"reps","12");
  put(1,"rpe","8");                       // RPE and nothing else
  /* row 2 left completely blank - the control */
  document.getElementById("addToSess").click();
  const e = (s.entries||[]).find(x=> x.name === "Spider Curl") || {};
  return {added: (s.entries||[]).length - before, sets:(e.sets||[]).length, json:JSON.stringify(e.sets||[])};
});
ck("the movement was added", d4.added === 1, d4.added);
ck("both rows with something in them went in", d4.sets === 2, d4.sets);
ck("including the RPE-only row", d4.json.indexOf('"rpe":"8"') >= 0, d4.json);
ck("and the blank row did not", d4.sets === 2);

/* ---------- 5. the static guard ---------- */
/* Any NEW filter written the old way is the next instance of this bug, so the shape is
   pinned: nothing may test reps-or-weight for emptiness without going through
   setHasAnything / setPairHasAnything or saying why. */
console.log("\n5. no new emptiness test written the old way");
const { readFileSync } = await import("node:fs");
const { appFile } = await import("./_e26.mjs");
const src = readFileSync(appFile("index.html"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, m=> m.replace(/[^\n]/g, " "))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, a)=> a + m.slice(a.length).replace(/[^\n]/g, " "));
const hits = [];
src.split("\n").forEach((ln, n)=>{
  /* A filter or guard that asks about reps and weight together and mentions neither the
     adapter nor rpe. */
  if(!/\b(filter|some|every)\s*\(/.test(ln)) return;
  if(!/\breps\b/.test(ln) || !/\bweight\b/.test(ln)) return;
  /* Only tests about SETS. A filter over plan-change rows or over a list of candidate
     RPE values mentions reps and weight for unrelated reasons. */
  if(!/\bst\b|\.sets\b|\bsets\b/.test(ln)) return;
  if(/setHasAnything|setPairHasAnything|entryHasAnything|rpe|empty:ok/.test(ln)) return;
  hits.push((n+1) + "  " + ln.trim().slice(0, 100));
});
console.log("    " + hits.length + " emptiness tests that know nothing about rpe");
hits.forEach(x=> console.log("       " + x));
ck("there are none", hits.length === 0, hits.join(" | ") || "none");

/* ---------- 6. the CSV, which is what the analysis is built from ---------- */
/* buildCSV read e.sets directly, so a paired movement had no sets and the entry was
   skipped altogether - the exercise was simply absent from the export, with nothing to
   say it had been left out. The bilateral row beside it is the control: if the paired
   movement is missing while that one is present, the fault is the adapter, and if both
   are missing the fixture never reached the file. */
console.log("\n6. a per-side movement reaches the CSV");
const d6 = await p.evaluate(()=>{
  S.sessions = [{id:"c1", workoutId:ROTATION[0], date:todayStr(),
    startedAt:Date.now()-5400e3, finishedAt:Date.now()-1800e3,
    entries:[
      {name:"Barbell Bench Press", sets:[{reps:"8",weight:"135",done:true}]},
      {name:"Cable Lateral Raise", perSide:true, startSide:"L", sets:[
        {sides:{L:{reps:"15",weight:"25",done:true}, R:{reps:"14",weight:"25",done:true}}},
        {sides:{L:{reps:"13",weight:"25",done:true}, R:{reps:"12",weight:"25",done:true}}}]}]}];
  const csv = buildCSV();
  const line = csv.split("\n").find(l=> l.indexOf("Cable Lateral Raise") === 0) || "";
  return {csv, line, cols: line.split(",").length,
          bench: csv.indexOf("Barbell Bench Press") >= 0};
});
ck("the bilateral movement is there (control)", d6.bench);
ck("so is the per-side one", d6.line.length > 0, d6.line || "ABSENT");
ck("with all four side-sets as columns", /15/.test(d6.line) && /14/.test(d6.line)
   && /13/.test(d6.line) && /12/.test(d6.line), d6.line);
ck("so the header widened to fit them", d6.cols >= 5, d6.cols);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
