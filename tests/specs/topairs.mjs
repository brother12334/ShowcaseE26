import { chromium, APP_URL } from './_e26.mjs';
/* TURNING PLAIN SETS INTO L/R PAIRS, WITH THE PERSON CHOOSING WHAT THEY MEANT.

   A one-limb movement entered in the old session editor came out as plain sets, because
   the editor had no way to say left and right. The numbers are right; the shape is not.
   And the rows mean one of two completely different things, which only the person who
   trained can say:

     alternating   each row was ONE arm, taken in turn. Four rows are two pairs.
     both arms     each row was BOTH arms. Four rows are four pairs, numbers duplicated.

   Picking wrong loses no number but halves or doubles the set count the grade reads, so
   neither is the default and neither is guessed.

   THE REPORTED CASE is the first section, asserted literally: four sets of Cable Lateral
   Raise, alternating, starting left, so set 1 and set 2 become pair 1 left and right,
   sets 3 and 4 become pair 2. That is what the preview must show before anything is
   written, because the preview is what the decision is made from - a conversion that is
   correct but previewed wrongly is still the wrong feature.

   THE CONTROL throughout is that the two modes must DIFFER on the same entry. If both
   produced the same thing, every assertion here could pass while the mode argument was
   being ignored. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:3000}});
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
  PAIRS_CONV_SIDE = "L";
  /* THE PLAN IS WHERE PER-SIDE LIVES. Cable Lateral Raise is not in the unilateral table
     and matches no one-limb name pattern, so by name alone the app calls it a two-arm
     movement - it is per side because the PROGRAMME entry says so, which is the reported
     setup and the thing pairsConvertDue() has to consult. */
  S.program[ROTATION[0]] = [
    {name:"Barbell Bench Press", sets:"3", reps:"8", rpe:"8"},
    {name:"Cable Lateral Raise", sets:"2", reps:"15", rpe:"8", uni:true}];
  /* The reported shape: re-entered through the editor, so plain sets with rests on them,
     on a movement the app treats as one-limb. */
  S.sessions=[{id:"s1", workoutId:ROTATION[0], date:"2026-11-16",
    startedAt:Date.now()-864e5, finishedAt:Date.now()-864e5+3600e3,
    entries:[
      {name:"Barbell Bench Press", sets:[{reps:"8", weight:"135", rpe:"8", done:true}]},
      {name:"Cable Lateral Raise", sets:[
        {reps:"15", weight:"25", rpe:"8", done:true, rest:20},
        {reps:"14", weight:"25", rpe:"9", done:true, rest:95},
        {reps:"13", weight:"25", rpe:"9", done:true, rest:18},
        {reps:"12", weight:"25", rpe:"10", done:true, rest:120}]}]}];
  ASYM_CACHE = {key:null, data:{}};
  save();
});
await seed();
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("\n1. the reported case: four rows, alternating, starting left");
const d1 = await p.evaluate(()=>{
  const en = S.sessions[0].entries[1];
  const plan = convertPairsPlan(en, "alt", "L");
  return {due: pairsConvertDue(en, S.sessions[0]), was: plan.wasSets, now: plan.nowSets,
          startSide: plan.startSide,
          rows: plan.rows.map(r=> r.pair + ": L " + r.L + " / R " + r.R + " <- set " + r.from.join("+")),
          notes: plan.notes};
});
ck("the entry is offered the conversion", d1.due);
ck("four rows become two pairs", d1.was === 4 && d1.now === 2, d1.was + " -> " + d1.now);
ck("the opening side is the left", d1.startSide === "L", d1.startSide);
console.log("    the preview, line by line:");
d1.rows.forEach(r=> console.log("       " + r));
ck("pair 1 is set 1 on the left and set 2 on the right",
   d1.rows[0] === "1: L 25×15 @8 / R 25×14 @9 <- set 1+2", d1.rows[0]);
ck("pair 2 is set 3 on the left and set 4 on the right",
   d1.rows[1] === "2: L 25×13 @9 / R 25×12 @10 <- set 3+4", d1.rows[1]);
ck("and with an even number of rows there is no half-set note",
   !d1.notes.some(n=> /half set/.test(n)), d1.notes.join(" | "));

console.log("\n2. applying it stores the paired shape, read through the adapter");
const d2 = await p.evaluate(()=>{
  const en = S.sessions[0].entries[1];
  applyPairsPlan(en, convertPairsPlan(en, "alt", "L"));
  const ss = sideSets(en);
  return {
    perSide: entryPerSide(en), startSide: en.startSide, sets: en.sets.length,
    sides: ss.map(x=> x.side + " " + x.weight + "x" + x.reps + "@" + x.rpe).join(", "),
    units: ss.reduce((t, x)=> t + x.count, 0),
    /* The rest after the FIRST row of a pair is the pause between the two sides, which
       is never reported as a rest; the rest after the second is the pair's. Getting this
       backwards would feed the rest grade a twenty-second rest on every set. */
    rests: en.sets.map(st=> st.rest),
    gaps: ss.map(x=> x.gap),
    topLevelEmpty: en.sets.every(st=> st.reps === undefined && st.weight === undefined),
    nothingLost: JSON.stringify(en.sets).indexOf('"12"') >= 0
  };
});
ck("the entry is now per side", d2.perSide);
ck("opening on the left", d2.startSide === "L", d2.startSide);
ck("two sets, four side-sets, left first", d2.sets === 2
   && d2.sides === "L 25x15@8, R 25x14@9, L 25x13@9, R 25x12@10", d2.sides);
ck("worth two whole sets, not four", Math.abs(d2.units - 2) < 1e-9, d2.units);
ck("the pair rests are the ones that followed the second side", d2.rests.join(",") === "95,120", d2.rests.join(","));
ck("and the 20s and 18s became the gap between sides, not rests",
   d2.gaps.join(",") === "20,,18,", d2.gaps.join(","));
ck("the sets hold nothing at their top level", d2.topLevelEmpty);
ck("and the last row's reps are still in there", d2.nothingLost);

console.log("\n3. the two modes genuinely differ (control)");
await seed();
const d3 = await p.evaluate(()=>{
  const en = S.sessions[0].entries[1];
  const a = convertPairsPlan(en, "alt", "L");
  const bo = convertPairsPlan(en, "both", "L");
  return {altPairs: a.nowSets, bothPairs: bo.nowSets,
          bothRow1: bo.rows[0].L + " / " + bo.rows[0].R,
          bothNote: bo.notes.join(" ")};
});
ck("alternating gives two pairs", d3.altPairs === 2, d3.altPairs);
ck("both arms gives four", d3.bothPairs === 4, d3.bothPairs);
ck("and each of those carries the same numbers on both sides",
   d3.bothRow1 === "25×15 @8 / 25×15 @8", d3.bothRow1);
ck("which the preview says out loud", /copied sides are not a measurement/.test(d3.bothNote),
   d3.bothNote.slice(0, 120));

console.log("\n4. copied sides are not read as evidence that the limbs are even");
/* The trap this mode would otherwise set: identical sides are exactly what the balance
   check reads as balanced, and they are identical because they were copied. */
const d4 = await p.evaluate(()=>{
  const en = S.sessions[0].entries[1];
  applyPairsPlan(en, convertPairsPlan(en, "both", "L"));
  ASYM_CACHE = {key:null, data:{}};
  const st = sideStats("Cable Lateral Raise");
  return {ok: st.ok, reason: st.reason || null, stamped: !!en.sets[0].sides.L.fromBoth};
});
ck("the sides are stamped as copied", d4.stamped);
ck("the balance check reports no usable reading", !d4.ok);
ck("and says why in those words", /copied from one row/.test(d4.reason || ""), d4.reason);

console.log("\n5. the alternating control: a real reading IS produced");
await seed();
const d5 = await p.evaluate(()=>{
  const en = S.sessions[0].entries[1];
  applyPairsPlan(en, convertPairsPlan(en, "alt", "L"));
  ASYM_CACHE = {key:null, data:{}};
  const st = sideStats("Cable Lateral Raise");
  return {ok: st.ok, reason: st.reason || null};
});
ck("alternating produces a usable side comparison", d5.ok, d5.reason);

console.log("\n6. an odd number of rows ends in a half set, and says so");
await p.evaluate(()=>{
  S.sessions[0].entries[1] = {name:"Cable Lateral Raise", sets:[
    {reps:"15", weight:"25", rpe:"8", done:true},
    {reps:"14", weight:"25", rpe:"9", done:true},
    {reps:"13", weight:"25", rpe:"9", done:true}]};
});
const d6 = await p.evaluate(()=>{
  const en = S.sessions[0].entries[1];
  const plan = convertPairsPlan(en, "alt", "L");
  applyPairsPlan(en, plan);
  const ss = sideSets(en);
  return {pairs: plan.nowSets, note: plan.notes.join(" "),
          sides: ss.map(x=> x.side).join(","), units: ss.reduce((t,x)=> t + x.count, 0)};
});
ck("three rows become two pairs", d6.pairs === 2, d6.pairs);
ck("the last of which is left only", d6.sides === "L,R,L", d6.sides);
ck("worth one and a half sets", Math.abs(d6.units - 1.5) < 1e-9, d6.units);
ck("and the preview warns about it", /half set/.test(d6.note), d6.note.slice(0, 120));

console.log("\n7. the opening side can be flipped");
await seed();
const d7 = await p.evaluate(()=>{
  const en = S.sessions[0].entries[1];
  const plan = convertPairsPlan(en, "alt", "R");
  return {start: plan.startSide, row1: plan.rows[0].L + " / " + plan.rows[0].R};
});
ck("starting right puts set 1 on the right", d7.start === "R"
   && d7.row1 === "25×14 @9 / 25×15 @8", d7.row1);

console.log("\n8. nothing is converted without being asked, and it can be undone");
await seed();
const d8 = await p.evaluate(()=>{
  const en = S.sessions[0].entries[1];
  const before = JSON.stringify(en.sets);
  renderSessEditor(S.sessions[0]);
  const offered = !!document.querySelector('#modal [data-seconv="1"]');
  const untouchedByDrawing = JSON.stringify(S.sessions[0].entries[1].sets) === before;
  document.querySelector('#modal [data-seconv="1"]').click();
  const sheet = document.getElementById("modal").innerHTML;
  const untouchedBySheet = JSON.stringify(S.sessions[0].entries[1].sets) === before;
  const twoButtons = !!document.getElementById("pcAlt") && !!document.getElementById("pcBoth");
  /* Neither preselected: no primary styling on one and ghost on the other, and no
     "recommended" anywhere. */
  const neitherDefault = document.getElementById("pcAlt").className
                      === document.getElementById("pcBoth").className
                      && !/recommend/i.test(sheet);
  document.getElementById("pcAlt").click();
  const after = JSON.stringify(S.sessions[0].entries[1].sets);
  const converted = entryPerSide(S.sessions[0].entries[1]);
  const kept = !!S.sessions[0].entries[1].preConvert;
  undoPairsPlan(S.sessions[0].entries[1]);
  return {offered, untouchedByDrawing, untouchedBySheet, twoButtons, neitherDefault,
          converted, kept, restored: JSON.stringify(S.sessions[0].entries[1].sets) === before,
          nowPlain: !entryPerSide(S.sessions[0].entries[1]), sameAfter: after !== before};
});
ck("the editor offers it on that entry", d8.offered);
ck("drawing the editor changes nothing", d8.untouchedByDrawing);
ck("opening the sheet changes nothing", d8.untouchedBySheet);
ck("both readings have a button", d8.twoButtons);
ck("and neither is presented as the default", d8.neitherDefault);
ck("choosing one converts", d8.converted && d8.sameAfter);
ck("the original is kept for an undo", d8.kept);
ck("and the undo restores it byte for byte", d8.restored && d8.nowPlain);

console.log("\n9. a movement nobody treats as one-limb is never asked about");
const d9 = await p.evaluate(()=> ({
  bench: pairsConvertDue(S.sessions[0].entries[0], S.sessions[0]),
  empty: pairsConvertDue({name:"Cable Lateral Raise", sets:[{}, {}]}, S.sessions[0]),
  already: pairsConvertDue({name:"Cable Lateral Raise", perSide:true, startSide:"L",
    sets:[{sides:{L:{reps:"10",done:true}, R:{reps:"10",done:true}}}]}, S.sessions[0]),
  /* The same movement reached from a day whose own plan does not list it. The slot is
     asked first and then any day, and that fallback is DELIBERATE here: "I do this one
     arm at a time" is a statement about the movement, not about Tuesday, and this decides
     only whether to ask a question whose answer is previewed and confirmed before
     anything is written. The P0-1 family of bugs was the same fallback producing live
     wrong answers - a load or a stall counter taken from the wrong day and acted on
     silently - which is a different thing. */
  otherSlot: pairsConvertDue(S.sessions[0].entries[1],
    {workoutId: ROTATION[2], entries: S.sessions[0].entries}),
  /* And with uni set nowhere in the plan, it is not offered at all - which is what
     proves the line above is reading the plan rather than always saying yes. */
  noPlanAnywhere: (()=>{
    const keep = S.program[ROTATION[0]];
    S.program[ROTATION[0]] = [{name:"Barbell Bench Press", sets:"3", reps:"8", rpe:"8"}];
    const out = pairsConvertDue(S.sessions[0].entries[1], S.sessions[0]);
    S.program[ROTATION[0]] = keep;
    return out;
  })()
}));
ck("not the bench press", !d9.bench);
ck("not an entry with nothing logged in it", !d9.empty);
ck("and not one that is already paired", !d9.already);
ck("the same movement reached from another day IS offered, deliberately", d9.otherSlot);
ck("but not when no day's plan marks it per side at all (control)", !d9.noPlanAnywhere);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
