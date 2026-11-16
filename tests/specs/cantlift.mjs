import { chromium, APP_URL } from './_e26.mjs';
/* P2-11 — A LOAD THAT IS NOT IN THE BUILDING.

   From the Nov 15 2026 audit: the user's heaviest dumbbells are 50 lb, and the log shows
   Single-Arm DB Row at 55 lb on Oct 17. Element 26 knew both facts and said nothing.

   The prescribing half of this was already done — capToRack() has stopped suggestions
   going past the rack since it was written, and roundLoadable() puts a cable on a pin.
   What was missing is the other direction: a load you have ALREADY WRITTEN DOWN that the
   equipment you described cannot produce. One of the two is wrong, and only you know
   which, so this says so and changes nothing.

   It only ever speaks from something you told it. No rack ceiling, no stack size, no
   bar weight: nothing to be sure about, and nothing said. */
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false});
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("1 - NOTHING TOLD, NOTHING SAID");
const mute = await p.evaluate(()=>{
  const pr = trainPrefs();
  pr.dbMax = null; pr.dbStep = null; pr.stackStep = 0; pr.barWeight = null; save();
  return {
    db: loadImpossible("Single-Arm DB Row", 55),
    cable: loadImpossible("Cable Row", 52.5),
    bar: loadImpossible("Bench Press", 20)
  };
});
console.log("   ", JSON.stringify(mute));
ck("no rack ceiling, no opinion about a dumbbell", mute.db == null, JSON.stringify(mute.db));
ck("no stack size, no opinion about a cable", mute.cable == null, JSON.stringify(mute.cable));
ck("no bar weight, no opinion about a bar", mute.bar == null, JSON.stringify(mute.bar));

console.log("\n2 - THE AUDITED CASE: 55 ON A RACK THAT ENDS AT 50");
const rack = await p.evaluate(()=>{
  const pr = trainPrefs();
  pr.dbMax = 50; pr.dbStep = 5; save();
  return {
    over: loadImpossible("Single-Arm DB Row", 55),
    at: loadImpossible("Single-Arm DB Row", 50),
    under: loadImpossible("Single-Arm DB Row", 45),
    /* A barbell is not limited by the dumbbell rack. */
    bar: loadImpossible("Bench Press", 185)
  };
});
console.log("   ", JSON.stringify(rack));
ck("55 is flagged", !!rack.over && rack.over.kind === "rack", JSON.stringify(rack.over));
ck("and it names the limit", rack.over && rack.over.limit === 50, rack.over && String(rack.over.limit));
ck("and says so in words", rack.over && /50/.test(rack.over.why), rack.over && rack.over.why);
ck("the heaviest dumbbell itself is fine", rack.at == null, JSON.stringify(rack.at));
ck("so is anything lighter", rack.under == null, JSON.stringify(rack.under));
ck("the rack says nothing about a bar", rack.bar == null, JSON.stringify(rack.bar));

console.log("\n3 - A WEIGHT NO PIN SETS");
const stack = await p.evaluate(()=>{
  const pr = trainPrefs(); pr.stackStep = 5; save();
  return {
    off: loadImpossible("Cable Row", 52.5),
    on: loadImpossible("Cable Row", 55),
    zero: loadImpossible("Cable Row", 0)
  };
});
console.log("   ", JSON.stringify(stack));
ck("52.5 on a 5 lb stack is flagged", !!stack.off && stack.off.kind === "stack", JSON.stringify(stack.off));
ck("55 is not", stack.on == null, JSON.stringify(stack.on));
ck("and an empty box is not a load at all", stack.zero == null, JSON.stringify(stack.zero));

console.log("\n4 - LESS THAN THE BAR");
const bar = await p.evaluate(()=>{
  const pr = trainPrefs();
  pr.barMode = "total"; pr.barWeight = 45; pr.plateStep = 2.5; save();
  return {
    under: loadImpossible("Bench Press", 35),
    exact: loadImpossible("Bench Press", 45),
    over: loadImpossible("Bench Press", 95),
    /* Logging plates only, the number in the box is the plates and 35 is ordinary. */
    plates: (function(){ trainPrefs().barMode = "plates";
      const r = loadImpossible("Bench Press", 35); trainPrefs().barMode = "total"; return r; })()
  };
});
console.log("   ", JSON.stringify(bar));
ck("a total under the bar is flagged", !!bar.under && bar.under.kind === "bar", JSON.stringify(bar.under));
ck("the empty bar is not", bar.exact == null, JSON.stringify(bar.exact));
ck("nor is a loaded one", bar.over == null, JSON.stringify(bar.over));
ck("and in plates-only it is an ordinary number", bar.plates == null, JSON.stringify(bar.plates));

console.log("\n5 - THE SET THAT CARRIES IT IS NAMED, AND NOTHING IS CHANGED");
const live = await p.evaluate(()=>{
  const pr = trainPrefs();
  pr.dbMax = 50; pr.dbStep = 5; pr.barMode = "plates"; save();
  const wid = ROTATION[0];
  S.program[wid] = [{name:"Single-Arm DB Row", sets:3, reps:"8-12", weight:45}];
  S.active = null; save(); startWorkout(wid); PF=null; TAB="workout"; save();
  const en = S.active.entries[0];
  /* Written through the adapter, which is how the logging screen writes a paired set:
     the weight of a one-limb set belongs to the side, not to the set. */
  const put = (si, w, reps)=> ["L","R"].forEach(sd=>{
    const t = sideTarget(en, si, sd); t.weight = w; t.reps = reps; t.done = true; });
  put(0, "45", "10");
  put(1, "55", "8");
  save();
  const found = entryImpossible(en);
  const html = impossibleLineHTML(en);
  render();
  const txt = document.body.innerText;
  return {found, html,
          /* Read back the way it was written: through the adapter, a side at a time. */
          kept: sideSets(en).filter(x=> x.si === 1).map(x=> x.weight).join("/"),
          onScreen: /not in the building|heaviest|rack|no pin|less than the bar/i.test(txt)};
});
console.log("   ", JSON.stringify(live.found), "|", live.html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());
/* A single-arm row is a unilateral movement, so one set is two side-sets and 55 in each
   hand is two impossible side-sets. That is the adapter being right, not a miscount \u2014
   but a person did ONE set with a 55 in each hand, and the line has to say it once. */
ck("both sides of the one set are seen", live.found.length === 2, String(live.found.length));
ck("and only that set", live.found.every(x=> x.si === 1),
   live.found.map(x=> x.si).join(","));
ck("the line names the set once", (live.html.match(/set 2/gi) || []).length === 1,
   live.html.replace(/<[^>]+>/g, " "));
ck("without reading the sides out", !/set 2 [LR]/.test(live.html),
   live.html.replace(/<[^>]+>/g, " "));
ck("and the figure", /55/.test(live.html), live.html);
ck("what you logged is left exactly as you logged it", live.kept === "55/55", live.kept);
ck("and it is on the screen you are logging on", live.onScreen, String(live.onScreen));

console.log("\n5b - WHERE THE SIDES DIFFER, THE SIDE IS THE ANSWER");
const sides = await p.evaluate(()=>{
  const en = S.active.entries[0];
  /* Written through the adapter's own per-side target, which is the only sanctioned way
     in: sideTarget() returns the object for that side of that set. */
  const L = sideTarget(en, 2, "L"), R = sideTarget(en, 2, "R");
  L.weight = "45"; L.reps = "8"; L.done = true;
  R.weight = "60"; R.reps = "8"; R.done = true;
  save();
  return {found: entryImpossible(en), html: impossibleLineHTML(en)};
});
console.log("   ", sides.html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());
ck("only the impossible side is flagged",
   sides.found.filter(x=> x.si === 2).length === 1,
   JSON.stringify(sides.found.filter(x=> x.si === 2)));
ck("and the line names which one", /set 3 R/.test(sides.html),
   sides.html.replace(/<[^>]+>/g, " "));

console.log("\n6 - AND IT IS STILL NEVER PRESCRIBED");
const presc = await p.evaluate(()=>{
  const pr = trainPrefs(); pr.dbMax = 50; pr.dbStep = 5; save();
  return {rounded: roundLoadable(57.5, "Single-Arm DB Row"),
          capped: capToRack(55, "Single-Arm DB Row"),
          cable: roundLoadable(52.5, "Cable Row")};
});
console.log("   ", JSON.stringify(presc));
ck("a suggestion past the rack is pulled back to it", presc.rounded === 50, String(presc.rounded));
ck("and so is a bare cap", presc.capped === 50, String(presc.capped));
ck("a cable lands on a pin", presc.cable % 5 === 0, String(presc.cable));
const clean = await p.evaluate(()=> {
  const pr = trainPrefs(); pr.dbMax = 50; pr.dbStep = 5; save();
  return loadImpossible("Single-Arm DB Row", roundLoadable(57.5, "Single-Arm DB Row"));
});
ck("so nothing Element 26 asks for can be flagged", clean == null, JSON.stringify(clean));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
