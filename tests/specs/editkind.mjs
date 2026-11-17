import { chromium, APP_URL } from './_e26.mjs';
/* A SET ADDED IN THE EDITOR IS THE SAME OBJECT AS THE SAME SET ADDED LIVE.

   The editor's "Add an exercise" used to be four boxes of its own - weight, reps, RPE,
   + set - which is why a one-limb movement added there came out as plain sets and why no
   set type could be chosen at all. The form now asks only the two things the ROWS cannot
   ask, because they decide what shape the rows have: one limb or both, and how many.
   Everything else is the shared row builder and the shared addSetOfKind().

   HOW THIS IS TESTED, AND WHY NOT BY LISTING THE TYPES. A spec that wrote out "normal,
   partials, failure, AMRAP" would be a second list to drift from setKindOptions(). So
   every type that function offers is driven, whatever it offers, and the stored set is
   compared FIELD BY FIELD against the same type added live to a live session. If logging
   gains a type tomorrow, this covers it without being edited.

   Worth being plain about one thing: drop set, myo-reps, rest-pause and cluster are NOT
   per-set choices in this app, live or in the editor. They are techniques set on the
   EXERCISE in the programme, and their sub-rows hang off whichever set carries them -
   editable in both places through the shared row. Section 5 pins that, so nobody reads
   this spec as evidence they were forgotten. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:3200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const seed = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId="ppl6"; applySplit();
  S.program[ROTATION[0]] = [
    {name:"Barbell Bench Press", sets:"3", reps:"8", rpe:"8"},
    {name:"Cable Lateral Raise", sets:"3", reps:"15", rpe:"8", uni:true}];
  S.sessions=[{id:"s1", workoutId:ROTATION[0], date:"2026-11-15",
    startedAt:Date.now()-2*864e5, finishedAt:Date.now()-2*864e5+3600e3,
    entries:[{name:"Barbell Bench Press", sets:[{reps:"8", weight:"135", rpe:"8", done:true}]}]}];
  S.active = null;
  save();
});
await seed();
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("\n1. the form asks for a shape and a count, and nothing else");
const d1 = await p.evaluate(()=>{
  renderSessEditor(S.sessions[0]);
  const m = document.getElementById("modal");
  return {
    name: !!m.querySelector("#addExSel"),
    both: !!m.querySelector("#aeBoth"),
    side: !!m.querySelector("#aeSide"),
    count: !!m.querySelector("#aeCount"),
    add: !!m.querySelector("#addToSess"),
    /* The four boxes that used to be here, and the + set that drew them. */
    noOwnRows: !m.querySelector("#newSets") && !m.querySelector("#plusSet"),
    noOwnInputs: m.querySelectorAll("[data-ns]").length === 0
  };
});
ck("it asks which exercise", d1.name);
ck("and whether it was one limb or both", d1.both && d1.side);
ck("and how many sets", d1.count);
ck("the four boxes of its own are gone", d1.noOwnRows && d1.noOwnInputs);
ck("and there is an Add button", d1.add);

console.log("\n2. the shape is defaulted from the plan, and is changeable");
const d2 = await p.evaluate(()=>{
  const pick = (nm)=>{
    const sel = document.getElementById("addExSel");
    sel.value = nm;
    sel.dispatchEvent(new Event("change", {bubbles:true}));
    return {both: document.getElementById("aeBoth").classList.contains("on"),
            side: document.getElementById("aeSide").classList.contains("on")};
  };
  const lat = pick("Cable Lateral Raise");
  const bench = pick("Barbell Bench Press");
  /* And it can be overridden: the plan is a default, not a decision taken for you. */
  document.getElementById("aeSide").click();
  const after = document.getElementById("aeSide").classList.contains("on");
  return {lat, bench, after};
});
ck("a movement the plan marks per side defaults to one limb", d2.lat.side && !d2.lat.both,
   JSON.stringify(d2.lat));
ck("the bench press defaults to both limbs", d2.bench.both && !d2.bench.side,
   JSON.stringify(d2.bench));
ck("and the default can be overridden", d2.after);

console.log("\n3. a per-side movement added here comes out as pairs");
const d3 = await p.evaluate(()=>{
  renderSessEditor(S.sessions[0]);
  const sel = document.getElementById("addExSel");
  sel.value = "Cable Lateral Raise"; sel.dispatchEvent(new Event("change", {bubbles:true}));
  document.getElementById("aeCount").value = "4";
  document.getElementById("addToSess").click();
  const en = S.sessions[0].entries.find(e=> e.name === "Cable Lateral Raise");
  const ss = sideSets(en);
  return {perSide: entryPerSide(en), sets: (en.sets||[]).length,
          sides: ss.map(x=> x.side).join(","),
          units: ss.reduce((t,x)=> t + x.count, 0),
          rows: document.querySelectorAll('#modal .set [data-sd="L"],#modal .set [data-sd="R"]').length > 0};
});
ck("the entry is per side", d3.perSide);
ck("four sets, eight side-sets, left first", d3.sets === 4
   && d3.sides === "L,R,L,R,L,R,L,R", d3.sides);
ck("worth four whole sets, not eight", Math.abs(d3.units - 4) < 1e-9, d3.units);
ck("and the editor drew L/R rows for it", d3.rows);

console.log("\n4. every type setKindOptions offers, stored the same here as live");
/* Driven from the function rather than from a list written here, so a type added to
   logging tomorrow is covered without this spec being touched. */
const d4 = await p.evaluate(()=>{
  const out = [];
  const kinds = setKindOptions({name:"Barbell Bench Press"}).map(o=> o.k || "");
  kinds.forEach(k=>{
    /* The same type, added live to a live session and to a filed one in the editor. */
    S.active = {id:"live", workoutId:ROTATION[0], date:todayStr(), startedAt:Date.now(),
      entries:[{name:"Barbell Bench Press", sets:[]}]};
    addSetOfKind(0, k);
    const live = S.active.entries[0].sets[0];

    S.sessions[0].entries[0].sets = [];
    addSetOfKind(0, k, S.sessions[0]);
    const edit = S.sessions[0].entries[0].sets[0];

    /* done differs by design: a live set has not happened yet. Everything that says what
       KIND of set it is has to match. */
    const keys = Array.from(new Set(Object.keys(live).concat(Object.keys(edit))))
      .filter(x=> x !== "done").sort();
    const diff = keys.filter(x=> JSON.stringify(live[x]) !== JSON.stringify(edit[x]));
    out.push({k, keys: keys.join(","), diff: diff.join(","),
              tech: edit.tech === undefined ? null : edit.tech,
              liveTech: live.tech === undefined ? null : live.tech});
  });
  S.active = null;
  return out;
});
console.log("    " + d4.length + " types offered: " + d4.map(x=> x.k || "normal").join(", "));
d4.forEach(x=>{
  ck("'" + (x.k || "normal") + "' stores identically in both places", x.diff === "",
     x.diff ? "differs on " + x.diff : x.keys);
  ck("  and carries the type the menu named", x.tech === x.liveTech && x.tech === (x.k || null),
     String(x.tech));
});
ck("more than one type was actually driven", d4.length >= 3, d4.length);

console.log("\n5. and it grades the same, after a save and a reload");
const d5 = await p.evaluate(()=>{
  /* One session, one exercise, one AMRAP set, built in the editor. The grade is what
     every one of these fields exists to feed, so it is the real test of "stored the
     same": techFor() reads st.tech, and the effort section reads what that implies. */
  S.sessions[0].entries[0].sets = [];
  addSetOfKind(0, "amrap", S.sessions[0]);
  const st = S.sessions[0].entries[0].sets[0];
  st.weight = "135"; st.reps = "12"; st.rpe = "10"; st.done = true;
  const q = scoreWorkout(S.sessions[0]);
  const techSeen = techFor(S.sessions[0].entries[0], 0, 1).map(t=> t.k);
  const working = entryWorkingSets(S.sessions[0].entries[0]).length;
  save();
  return {graded: !!(q && q.sections), techSeen, working,
          raw: JSON.stringify(S.sessions[0].entries[0].sets[0])};
});
ck("the technique is visible to techFor()", d5.techSeen.indexOf("amrap") >= 0, d5.techSeen.join(","));
ck("the set counts as a working set", d5.working === 1, d5.working);
ck("and the session grades", d5.graded, d5.raw);

const d5b = await p.evaluate(()=>{
  S = load(); migrate(); applySplit();
  const en = S.sessions[0].entries[0];
  return {tech: (en.sets[0] || {}).tech, reps: (en.sets[0] || {}).reps,
          techSeen: techFor(en, 0, 1).map(t=> t.k).join(",")};
});
ck("it survives a reload with its type intact", d5b.tech === "amrap", d5b.tech);
ck("the reps too", d5b.reps === "12", d5b.reps);
ck("and techFor() still sees it", /amrap/.test(d5b.techSeen), d5b.techSeen);

console.log("\n6. the sub-row techniques are a plan setting, in both places alike");
/* Drop set, myo-reps, rest-pause and cluster are not per-set choices live either. They
   are set on the exercise, and this pins that the editor reads them through the same
   shared row rather than pretending to offer them. */
const d6 = await p.evaluate(()=>{
  const subs = Object.keys(TECHNIQUES).filter(k=> TECHNIQUES[k].sub);
  const perSetMenu = setKindOptions({name:"Barbell Bench Press"}).map(o=> o.k || "");
  const offeredLive = subs.filter(k=> perSetMenu.indexOf(k) >= 0);
  /* With the technique on the exercise, the shared row draws its sub-rows in the editor. */
  const en = S.sessions[0].entries[0];
  en.tech = [{k:"dropset"}];
  en.sets[0].sub = [{weight:"95", reps:"6"}];
  renderSessEditor(S.sessions[0]);
  return {subs, offeredLive,
          subRowsInEditor: document.querySelectorAll('#modal .sub-set').length,
          addSubInEditor: !!document.querySelector('#modal [data-subadd]')};
});
ck("there are sub-row techniques", d6.subs.length >= 4, d6.subs.join(","));
ck("none of them is a per-set menu choice, live or here", d6.offeredLive.length === 0,
   d6.offeredLive.join(",") || "none");
ck("and with one set on the exercise, the editor draws its sub-rows",
   d6.subRowsInEditor === 1, d6.subRowsInEditor);
ck("with the same + button logging has", d6.addSubInEditor);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
