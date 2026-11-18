import { chromium, APP_URL } from './_e26.mjs';
/* BOTH SIDES IN EACH SET, ACROSS THE PLAN.

   Since P1-7 a set of a one-limb movement is a PAIR: left and right inside one set, one
   rest, one tick. The plan was never restated in that unit. It still said "alternate L/R
   each set", which is the instruction for the shape the app stopped using, and it still
   carried alternating set counts, where four sets of a split squat meant two per leg.

   The two halves are deliberately different kinds of thing and are tested as such:

     THE NOTE is a description of what the app does, and it was wrong. It is rewritten
     only where it is the app's OWN sentence — a note a person typed, or one an imported
     document carried, is theirs and is left alone.

     THE SET COUNT is a training decision. Nothing changes it without being asked, the
     preview says exactly what would move, and a change that takes a muscle outside its
     floor or ceiling is SHOWN rather than silently applied or silently refused.

   THE CONTROL in every section is a bilateral movement in the same plan: if the
   conversion passed while the bench press was also rewritten, the survey would be
   matching the wrong thing. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2000}});
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
  S.splitId="ppl6"; applySplit();
  /* The six the user named, plus a bilateral control and a note nobody but a person
     would have written. Set counts are the alternating ones the plan actually carried. */
  S.program[ROTATION[0]] = [
    {name:"Barbell Bench Press", sets:3, reps:"6-10", rpe:8, weight:135},
    {name:"Single-Arm Dumbbell Row", sets:2, reps:"8-12", rpe:8, weight:50},
    {name:"Preacher Curl", sets:3, reps:"8-12", rpe:8, weight:25},
    {name:"Single-Arm Cable Hammer Curl", sets:3, reps:"10-15", rpe:8, weight:20,
     note:"elbow pinned to the rib, no swing"}];
  S.program[ROTATION[1]] = [
    {name:"Single-Arm Cable Pulldown", sets:2, reps:"10-15", rpe:8, weight:45},
    {name:"Lat Pulldown", sets:3, reps:"8-12", rpe:8, weight:120}];
  S.program[ROTATION[2]] = [
    {name:"Dumbbell Bulgarian Split Squat", sets:4, reps:"8-12", rpe:8, weight:40},
    {name:"Standing Cable Hip Abduction", sets:3, reps:"12-20", rpe:8, weight:20}];
  save(); migrate(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("\n1. THE MOVEMENTS THAT APPLY, INCLUDING THE ONE NOTHING COULD SEE");
const seen = await p.evaluate(()=>{
  const r = {};
  DAYS.concat(["finisher"]).forEach(w=> (S.program[w]||[]).forEach(e=>{
    r[e.name] = {uni: isSingleArm(e), pair: entryPerSideWanted(e), sets: e.sets, note: e.note||""};
  }));
  return r;
});
console.log("   ", JSON.stringify(seen, null, 0).replace(/},/g, "},\n    "));
"Single-Arm Dumbbell Row,Single-Arm Cable Pulldown,Single-Arm Cable Hammer Curl,Dumbbell Bulgarian Split Squat,Preacher Curl,Standing Cable Hip Abduction"
  .split(",").forEach(n=> ck("one limb at a time: " + n, seen[n] && seen[n].uni === true,
    seen[n] ? String(seen[n].uni) : "MISSING"));
/* Standing Cable Hip Abduction names no limb, so the text fallback read it as bilateral
   and no new session would have recorded a side on it — while its asymmetry check is
   live off the old log's L/R rows. That is the gap this names. */
ck("CONTROL: the bench press is not", seen["Barbell Bench Press"].uni === false, String(seen["Barbell Bench Press"].uni));
ck("CONTROL: nor is the lat pulldown", seen["Lat Pulldown"].uni === false, String(seen["Lat Pulldown"].uni));
ck("and the stale note is on them to begin with",
   /alternate L\/R each set/.test(seen["Preacher Curl"].note), seen["Preacher Curl"].note);
ck("in the movement's own limb word", /single leg/.test(seen["Dumbbell Bulgarian Split Squat"].note),
   seen["Dumbbell Bulgarian Split Squat"].note);

console.log("\n2. THE SURVEY CHANGES NOTHING BY LOOKING");
const survey = await p.evaluate(()=>{
  const before = JSON.stringify(S.program);
  const rows = bothSidesPlan();
  return {same: JSON.stringify(S.program) === before,
          n: rows.length,
          rows: rows.map(r=> ({n:r.name, d:r.wid, from:r.sets, to:r.toSets,
                               setsMove:r.setsMove, noteMoves:r.noteMoves,
                               toNote:r.toNote, conflict: r.conflict ? r.conflict.kind : null}))};
});
survey.rows.forEach(r=> console.log("    " + r.n + "  " + r.from + "→" + r.to +
  (r.noteMoves ? "  “" + r.toNote + "”" : "  (note left alone)") + (r.conflict ? "  CONFLICT " + r.conflict : "")));
ck("the plan is untouched by the survey", survey.same, String(survey.same));
ck("all six are in it, and nothing else", survey.n === 6, String(survey.n));
/* 3 per leg instead of FOUR. The note says "alternate L/R each set", so 4 sets reads as
   2 per leg — but these have been logged as pairs since P1-7, so 4 sets is 4 per leg
   and this is a cut. That gap between what the plan says and what it asks for is the
   whole reason the preview prints per-side counts. */
ck("the split squat goes 4 → 3, which is 3 per leg instead of 4",
   survey.rows.some(r=> r.n === "Dumbbell Bulgarian Split Squat" && r.from === 4 && r.to === 3));
ck("a 2-set movement goes up to 3",
   survey.rows.some(r=> r.n === "Single-Arm Dumbbell Row" && r.from === 2 && r.to === 3));
ck("one already at 3 keeps its count and still converts",
   survey.rows.some(r=> r.n === "Preacher Curl" && r.from === 3 && r.to === 3 && !r.setsMove && r.noteMoves));
ck("the new note says both sides, in the movement's own limb word",
   survey.rows.some(r=> r.n === "Dumbbell Bulgarian Split Squat" && /both legs in each set/.test(r.toNote)));
/* CORRECTED FROM THE FIRST RUN OF THIS SPEC, which asserted that a hand-written note is
   not touched at all. It is: the stamp APPENDS the app's own sentence to whatever the
   person wrote, so the note reads "elbow pinned to the rib, no swing - single arm,
   alternate L/R each set". Rewriting the app's half of that is right and leaving the
   person's half alone is the thing actually worth asserting. */
ck("CONTROL: the person's own words survive the rewrite",
   survey.rows.some(r=> r.n === "Single-Arm Cable Hammer Curl"
     && /^elbow pinned to the rib, no swing/.test(r.toNote)
     && /both arms in each set/.test(r.toNote)
     && !/alternate L\/R/i.test(r.toNote)),
   (survey.rows.find(r=> r.n === "Single-Arm Cable Hammer Curl")||{}).toNote);
ck("CONTROL: no bilateral movement is in the survey",
   !survey.rows.some(r=> /Bench Press|Lat Pulldown/.test(r.n)));
/* THE SPLIT SQUAT IS A CUT, AND SAYS SO. This is the half of the feature that cannot be
   allowed to be quiet. Four sets of a movement logged as PAIRS is already four per leg,
   whatever the note says, so moving to three takes a set per leg away and quads go under
   their floor. P1-5's rule is that such a change is shown, not applied behind your back
   and not silently refused. */
const bssConflict = await p.evaluate(()=>{
  const r = bothSidesPlan().find(x=> /Bulgarian/.test(x.name));
  return r && r.conflict ? r.conflict : null;
});
ck("the set cut is checked against the floor", !!bssConflict, JSON.stringify(bssConflict));
ck("and named as a floor, not a ceiling", bssConflict && bssConflict.kind === "floor",
   bssConflict && bssConflict.kind);
ck("in words a person can act on", bssConflict && /sets a week/.test(bssConflict.say),
   bssConflict && bssConflict.say);

console.log("\n3. THE BUTTON IS IN SETTINGS, AND SHOWS THE PREVIEW BEFORE ANYTHING MOVES");
const ui = await p.evaluate(()=>{
  /* The settings screens are collapsible bodies, rendered when their row is opened.
     This is the one the one-limb choice already lives in. */
  const html = prefsSessionHTML();
  return {inSettings: /id="bothSidesAll"/.test(html),
          besideTheChoice: html.indexOf("data-prefsides") < html.indexOf("bothSidesAll"),
          anyUni: anyUnilateralInPlan()};
});
ck("the plan is seen as carrying one-limb work", ui.anyUni, String(ui.anyUni));
ck("the button is on the settings screen", ui.inSettings, String(ui.inSettings));
ck("under the one-limb setting it belongs with", ui.besideTheChoice, String(ui.besideTheChoice));
const modal = await p.evaluate(()=>{
  const before = JSON.stringify(S.program);
  openBothSides();
  const m = document.getElementById('modal');
  const txt = m ? m.innerText.replace(/\s+/g," ") : "";
  return {open: !!m, txt, rows: m ? m.querySelectorAll('.gym-row').length : 0,
          go: !!document.querySelector('#modal #bsGo'),
          untouched: JSON.stringify(S.program) === before};
});
console.log("   ", modal.txt.slice(0, 260));
ck("the preview opens", modal.open, String(modal.open));
ck("with a line per exercise", modal.rows === 6, String(modal.rows));
/* innerText carries the button's uppercase text-transform through, so the match is
   case-insensitive rather than the literal sentence in the source. */
ck("and a button that says how many", modal.go && /change 6 exercises/i.test(modal.txt), modal.txt.slice(-90));
ck("and the preview warns about the one that breaks a floor",
   /floor that grows it/i.test(modal.txt) && /overruling/i.test(modal.txt), String(/floor/i.test(modal.txt)));
ck("and says the counts are per leg, not raw sets", /4 \u2192 3 per leg/i.test(modal.txt),
   (modal.txt.match(/[0-9] \u2192 [0-9] per [a-z]+/gi) || []).join(" | "));
ck("and nothing has changed yet", modal.untouched, String(modal.untouched));

console.log("\n4. APPLYING IT");
const after = await p.evaluate(()=>{
  const n = document.querySelector('#modal #bsGo').click();
  void n;
  const r = {};
  DAYS.concat(["finisher"]).forEach(w=> (S.program[w]||[]).forEach(e=>{
    r[e.name] = {sets:e.sets, note:e.note||"", perSide:e.perSide === true, pair: entryPerSideWanted(e)};
  }));
  /* ONLY THE ROWS THIS FEATURE WROTE. The volume-model migration also writes a row on
     this fixture, correctly filed under no day because it is not a change to any one
     day. Counting it here would make the P0-1 assertion below about somebody else's
     code and fail for a reason that is not a bug. */
  const mine = (S.planLog||[]).filter(x=> x.at > Date.now() - 60000
    && /both sides in each set/i.test(String(x.note || "")));
  return {prog: r, logged: mine.length, nameless: mine.filter(x=> !(x.wid || x.day)).length,
          says: mine.map(x=> (x.changes||[]).join("+")).join(" | ")};
});
console.log("   ", JSON.stringify(after.prog, null, 0).replace(/},/g, "},\n    "));
console.log("    plan rows:", after.says);
ck("the split squat is 3 sets, 3 per leg", after.prog["Dumbbell Bulgarian Split Squat"].sets === 3,
   String(after.prog["Dumbbell Bulgarian Split Squat"].sets));
ck("and says so in its note", /both legs in each set/.test(after.prog["Dumbbell Bulgarian Split Squat"].note),
   after.prog["Dumbbell Bulgarian Split Squat"].note);
ck("the row is 3 now too", after.prog["Single-Arm Dumbbell Row"].sets === 3,
   String(after.prog["Single-Arm Dumbbell Row"].sets));
ck("every converted movement is marked as pairs outright",
   ["Single-Arm Dumbbell Row","Single-Arm Cable Pulldown","Single-Arm Cable Hammer Curl",
    "Dumbbell Bulgarian Split Squat","Preacher Curl","Standing Cable Hip Abduction"]
     .every(n=> after.prog[n].perSide === true));
ck("no note anywhere still says alternate L/R",
   !Object.keys(after.prog).some(n=> /alternate L\/R/i.test(after.prog[n].note)),
   Object.keys(after.prog).map(n=> after.prog[n].note).join(" | "));
ck("CONTROL: the hand-written note still opens with the person's own words",
   /^elbow pinned to the rib, no swing/.test(after.prog["Single-Arm Cable Hammer Curl"].note),
   after.prog["Single-Arm Cable Hammer Curl"].note);
ck("CONTROL: the bench press is untouched",
   after.prog["Barbell Bench Press"].sets === 3 && after.prog["Barbell Bench Press"].perSide === false,
   JSON.stringify(after.prog["Barbell Bench Press"]));
ck("every change is written to the plan log", after.logged >= 6, String(after.logged));
ck("and P0-1 holds: not one row is filed under no day", after.nameless === 0, String(after.nameless));

console.log("\n5. IT STAYS DONE");
const stuck = await p.evaluate(()=>{
  /* The note stamp runs on every load and used to put "alternate L/R each set" straight
     back on top of a conversion. Run the migration again and read the notes. */
  migrate(); migrate();
  const r = {};
  DAYS.concat(["finisher"]).forEach(w=> (S.program[w]||[]).forEach(e=>{
    r[e.name] = e.note || "";
  }));
  return r;
});
console.log("   ", JSON.stringify(stuck));
ck("re-running the migration does not undo the note",
   !Object.keys(stuck).some(n=> /alternate L\/R/i.test(stuck[n])), JSON.stringify(stuck));
ck("and does not say both things at once",
   !Object.keys(stuck).some(n=> /alternate L\/R/i.test(stuck[n]) && /both (arms|legs|sides) in each set/i.test(stuck[n])), "");
ck("the pair sentence is still there", /both legs in each set/.test(stuck["Dumbbell Bulgarian Split Squat"]),
   stuck["Dumbbell Bulgarian Split Squat"]);
const again = await p.evaluate(()=> bothSidesPlan().length);
ck("and there is nothing left to convert", again === 0, String(again));

console.log("\n6. A SESSION BUILT FROM THE CONVERTED PLAN IS PAIRS, 3 PER SIDE");
const live = await p.evaluate(()=>{
  S.active = null; save();
  startWorkout(ROTATION[2]);
  const en = S.active.entries.find(e=> /Bulgarian/.test(e.name));
  const ab = S.active.entries.find(e=> /Hip Abduction/.test(e.name));
  return {perSide: !!(en && en.perSide), sets: en ? en.sets.length : -1,
          sideSets: en ? sideSets(en).length : -1,
          startSide: en ? en.startSide : null,
          abPerSide: !!(ab && ab.perSide), abStart: ab ? ab.startSide : null};
});
console.log("   ", JSON.stringify(live));
ck("the split squat is logged as pairs", live.perSide, String(live.perSide));
ck("three sets", live.sets === 3, String(live.sets));
ck("which is six side-sets: three per leg", live.sideSets === 6, String(live.sideSets));
ck("opening on a named side", live.startSide === "L" || live.startSide === "R", String(live.startSide));
/* The whole point of including it: nothing was recording a side on this movement, so
   its asymmetry check was living off history and would have starved. */
ck("and the hip abduction now records sides at all", live.abPerSide && !!live.abStart,
   JSON.stringify({p:live.abPerSide, s:live.abStart}));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
