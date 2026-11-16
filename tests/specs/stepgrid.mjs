import { chromium, APP_URL } from './_e26.mjs';
/* A PROGRESSION STEP THAT CAME OUT TWICE THE SIZE IT SAID.

   The replay suite had the rear delt fly earning "32.5 lb → 40 lb a hand" off a session
   that cleared its range, with the step reported as "5 lb, one pin on the stack". 32.5 to
   40 is 7.5, a 23% jump, and 35 is on the grid and is the next pin up.

   It was not a deliberate bigger step for a big overshoot. The target is computed as
   `from + step.amount` and then snapped to the grid with roundLoadable(), which rounds to
   the NEAREST loadable value: 32.5 + 5 = 37.5, and 37.5 on a 5 lb stack rounds up to 40.
   Whenever the current load sits half a step off the grid — which the user's log is full
   of, because the loads came from a different counting convention — the step silently
   doubles. 32.5→40, 72.5→80, 152.5→160: every off-grid start, every time.

   THE RULE, stated: a progression lands on the largest loadable value that is no greater
   than `from + step`, provided it is still above `from`. Only when the gap holds no
   loadable value at all does it take the next one above. So a step is never bigger than
   the step the rule said it was, and never zero.

   Rounding to NEAREST is right for the thing roundLoadable() is for — making an arbitrary
   number loadable — and wrong for a step, where the direction and the size are both part
   of the instruction. Reductions keep their own rule and are not touched here. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, stackStep:5, dbStep:5, dbMax:50});
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("1 - A STEP IS NEVER BIGGER THAN THE STEP IT SAYS IT IS");
const grid = await p.evaluate(()=>{
  const rows = [];
  [["Cable Row", 32.5, 5], ["Cable Row", 30, 5], ["Cable Row", 72.5, 5],
   ["Cable Row", 152.5, 5], ["Cable Row", 2.5, 5],
   ["Leg Extension Machine", 47.5, 5]].forEach(([n, from, amt])=>{
    const got = stepUpLoad(null, from, amt, n);
    rows.push({n, from, amt, got, jump: Math.round((got - from) * 10) / 10});
  });
  return rows;
});
grid.forEach(x=> console.log("    " + x.n + "  " + x.from + " + " + x.amt
  + " → " + x.got + "   (a jump of " + x.jump + ")"));
ck("the audited case takes the next pin, not the one after it",
   grid[0].got === 35, String(grid[0].got));
ck("an on-grid load is unaffected", grid[1].got === 35, String(grid[1].got));
ck("and so is every other off-grid start",
   grid[2].got === 75 && grid[3].got === 155, grid[2].got + " " + grid[3].got);
ck("no step comes out larger than it was asked for",
   grid.every(x=> x.jump <= x.amt + 0.001),
   grid.filter(x=> x.jump > x.amt + 0.001).map(x=> x.from + "→" + x.got).join(", ") || "none");
ck("and none comes out as no step at all",
   grid.every(x=> x.jump > 0), grid.filter(x=> !(x.jump > 0)).length + " flat");

console.log("\n2 - WHERE THE GAP HOLDS NO LOADABLE VALUE, IT STILL MOVES");
/* A 2.5 lb intended step on a 5 lb stack: 30 + 2.5 = 32.5 is not a weight the stack
   makes, and 30 is not an increase. The next pin up is the only honest answer. */
const tight = await p.evaluate(()=> ({
  half: stepUpLoad(null, 30, 2.5, "Cable Row"),
  tiny: stepUpLoad(null, 30, 1, "Cable Row")
}));
console.log("   ", JSON.stringify(tight));
ck("a step smaller than one pin becomes one pin", tight.half === 35, String(tight.half));
ck("and so does a step much smaller", tight.tiny === 35, String(tight.tiny));

console.log("\n3 - THE RACK CEILING STILL WINS");
const cap = await p.evaluate(()=> ({
  at: stepUpLoad(null, 50, 5, "Single-Arm Dumbbell Row"),
  near: stepUpLoad(null, 45, 5, "Single-Arm Dumbbell Row")
}));
console.log("   ", JSON.stringify(cap));
ck("a step past the rack stops at the rack", cap.at === 50, String(cap.at));
ck("and one that lands on it is allowed", cap.near === 50, String(cap.near));

console.log("\n4 - THE VERDICT THE REPLAY FOUND, PUT BACK TOGETHER");
const verdict = await p.evaluate(()=>{
  const wid = ROTATION[0];
  S.program[wid] = [{name:"Cable Reverse Rear Delt Fly", sets:3, reps:"12-20", weight:32.5}];
  S.sessions = []; save();
  const sess = {id:"s1", date: todayStr(), workoutId: wid,
    startedAt: Date.now() - 3600000, finishedAt: Date.now(),
    entries: [{name:"Cable Reverse Rear Delt Fly", reps:"12-20",
      sets: [1,2,3].map(()=> ({weight:"32.5", reps:"21", rpe:"8", done:true}))}]};
  const v = progressionFor(sess, sess.entries[0]);
  return {kind: v && v.kind, from: v && v.from, to: v && v.to,
          step: v && v.step && v.step.amount, msg: v && v.msg};
});
console.log("   ", JSON.stringify(verdict));
ck("it still earns the increase", verdict.kind === "up", String(verdict.kind));
ck("the step it reports is 5", verdict.step === 5, String(verdict.step));
ck("and the target it writes is one step, 35", verdict.to === 35, String(verdict.to));
ck("the sentence says the same number", /35/.test(verdict.msg || "") && !/40/.test(verdict.msg || ""),
   verdict.msg);

console.log("\n5 - A BAR IS RELATIVE, A STACK IS ABSOLUTE");
/* The distinction phase3 caught. A barbell at 185 with 5 lb plates goes to 195 by adding
   one plate each side; 190 would want a 2.5 a side and is not a weight that bar can hold.
   A stack is the other way round \u2014 the pins sit at fixed weights, so 32.5 is not a stack
   position however you arrived at it and the next real one up is 35. */
const kind = await p.evaluate(()=>{
  trainPrefs().plateStep = 5; trainPrefs().barMode = "plates"; save();
  const bar = "Barbell Bench Press", cab = "Cable Row";
  return {barEq: equipmentOf(bar), cabEq: equipmentOf(cab),
          barStep: loadStepFor(bar), cabStep: loadStepFor(cab),
          bar185: stepUpLoad(null, 185, loadStepFor(bar), bar),
          bar180: stepUpLoad(null, 180, loadStepFor(bar), bar),
          cab325: stepUpLoad(null, 32.5, loadStepFor(cab), cab)};
});
console.log("   ", JSON.stringify(kind));
ck("a bar steps by whole plates from where it is", kind.bar185 === 195, String(kind.bar185));
ck("on-grid or off, the step is the same size", kind.bar180 === 190, String(kind.bar180));
ck("a stack goes to the next pin, not the next increment",
   kind.cab325 === 35, String(kind.cab325));
ck("and neither step exceeds what it said",
   kind.bar185 - 185 === kind.barStep && kind.bar180 - 180 === kind.barStep
   && kind.cab325 - 32.5 <= kind.cabStep,
   [kind.bar185-185, kind.bar180-180, kind.cab325-32.5].join(" / "));

console.log("\n6 - A BODYWEIGHT-INCLUSIVE TOTAL KEEPS ITS OWN ARITHMETIC");
/* Only the ADDED part is loadable on these, and where it is held in both hands it moves
   in twos. The step rule has to go through the same door rather than round the part of
   the number that is the person. */
const bw = await p.evaluate(()=>{
  const en = {name:"Dumbbell Bulgarian Split Squat", bwOn: 180};
  return {from: 200, got: stepUpLoad(en, 200, 5, en.name),
          part: bwPartOf(en)};
});
console.log("   ", JSON.stringify(bw));
ck("the bodyweight part is recognised", bw.part === 180, String(bw.part));
ck("and the step moves the added load, not the person",
   bw.got > 200 && bw.got <= 210, String(bw.got));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
