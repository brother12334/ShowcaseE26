import { chromium, APP_URL } from './_e26.mjs';
/* SLOT DEBT 9 of 9 - tmWanted.

   This one is NOT a scoping bug, and saying so is the point of the spec: the fix is the
   opposite direction.

   tmWanted(name) decides whether the max sheet should ask for a TRAINING max or a
   one-rep max. It asked the first slot holding the name. But `wave` and `pct` are
   per-ENTRY fields, so two slots of one movement can differ - and the number itself is
   stored per MOVEMENT, in maxStore()[nrm(name)], with one entry per exercise and no slot
   in the key.

   So the honest question is not "what does this slot want" but "does ANY slot of this
   movement run on a training max" - because there is one number and it has to be the
   right KIND of number for whichever slot needs it. Asked of the first slot, the answer
   depends on the order the movement happens to appear in the plan: a waved slot that is
   not first reads as not wanting a TM at all, and the sheet asks for the wrong thing.

   Scoping it to a slot would be worse than leaving it alone, because the sheet it feeds
   is not about a slot. */
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

const EX = "Barbell Squat";
const setup = (waveOn)=> p.evaluate(a=>{
  /* legsA is the plain slot, legsB runs the wave - so the waved one is NOT first. */
  S.program.legsA = [{name: a.EX, sets:3, reps:"6-10", weight:100}];
  S.program.legsB = [{name: a.EX, sets:3, reps:"5", wave: a.waveOn ? "531" : undefined}];
  S.maxes = {}; S.sessions = []; save();
  return {order: DAYS.filter(w=> (S.program[w]||[]).some(e=> e.name === a.EX))};
}, {EX, waveOn: waveOn});

console.log("1 - CONTROL: A WAVED SLOT THAT COMES FIRST IS SEEN");
const first = await p.evaluate(a=>{
  S.program.legsA = [{name: a.EX, sets:3, reps:"5", wave:"531"}];
  S.program.legsB = [{name: a.EX, sets:3, reps:"6-10", weight:100}];
  save();
  return {wanted: tmWanted(a.EX),
          waveOnA: !!waveFor((findProgramEntryWhere(a.EX,"legsA")||{e:{}}).e),
          waveOnB: !!waveFor((findProgramEntryWhere(a.EX,"legsB")||{e:{}}).e)};
}, {EX});
console.log("   ", JSON.stringify(first));
ck("the wave is on the first slot", first.waveOnA && !first.waveOnB,
   first.waveOnA + "/" + first.waveOnB);
ck("and a training max is wanted", first.wanted === true, String(first.wanted));

console.log("\n2 - THE SAME PLAN, THE OTHER WAY ROUND");
const second = await setup(true).then(()=> p.evaluate(a=>({
  order: DAYS.filter(w=> (S.program[w]||[]).some(e=> e.name === a.EX)),
  waveOnA: !!waveFor((findProgramEntryWhere(a.EX,"legsA")||{e:{}}).e),
  waveOnB: !!waveFor((findProgramEntryWhere(a.EX,"legsB")||{e:{}}).e),
  wanted: tmWanted(a.EX)
}), {EX}));
console.log("   ", JSON.stringify(second));
ck("the wave is on the second slot this time", !second.waveOnA && second.waveOnB,
   second.waveOnA + "/" + second.waveOnB);
ck("and a training max is still wanted, because the movement still runs on one",
   second.wanted === true, String(second.wanted));

console.log("\n3 - NO SLOT ON A WAVE MEANS NO TRAINING MAX");
const none = await setup(false).then(()=> p.evaluate(a=>({
  wanted: tmWanted(a.EX),
  waveAnywhere: DAYS.some(w=> (S.program[w]||[]).some(e=>
    e.name === a.EX && waveFor(e)))
}), {EX}));
console.log("   ", JSON.stringify(none));
ck("nothing is waved", none.waveAnywhere === false, String(none.waveAnywhere));
ck("so a one-rep max is what is asked for", none.wanted === false, String(none.wanted));

console.log("\n4 - A PERCENTAGE-OF-TM SLOT COUNTS THE SAME WAY");
/* The other half of tmWanted: an entry written as a percentage OF A TRAINING MAX rather
   than carrying a wave. Put on the second slot again. */
const pct = await p.evaluate(a=>{
  S.program.legsA = [{name: a.EX, sets:3, reps:"6-10", weight:100}];
  S.program.legsB = [{name: a.EX, sets:3, reps:"5", pct: 0.85, pctOf: "tm"}];
  save();
  const both = {a: pctSpecFor((findProgramEntryWhere(a.EX,"legsA")||{e:{}}).e),
                b: pctSpecFor((findProgramEntryWhere(a.EX,"legsB")||{e:{}}).e)};
  return {both, wanted: tmWanted(a.EX)};
}, {EX});
console.log("   ", JSON.stringify(pct));
ck("the second slot is a percentage of a training max",
   pct.both.b && pct.both.b.of === "tm", JSON.stringify(pct.both.b));
ck("and that is what the sheet asks for", pct.wanted === true, String(pct.wanted));

console.log("\n5 - AND THE SHEET ITSELF ASKS THE RIGHT QUESTION");
const sheet = await p.evaluate(a=>{
  openMaxSheet(a.EX);
  const t = (document.querySelector("#modal") || {}).innerText || "";
  hideModal();
  return {asksTm: /training max/i.test(t), text: t.slice(0, 160)};
}, {EX});
console.log("   ", JSON.stringify(sheet));
ck("the max sheet mentions a training max", sheet.asksTm, sheet.text);

console.log("\n6 - A MOVEMENT IN ONE SLOT IS UNAFFECTED");
const solo = await p.evaluate(a=>{
  S.program.legsA = [{name: a.EX, sets:3, reps:"5", wave:"531"}];
  S.program.legsB = [];
  save();
  const waved = tmWanted(a.EX);
  S.program.legsA = [{name: a.EX, sets:3, reps:"6-10", weight:100}];
  save();
  return {waved, plain: tmWanted(a.EX)};
}, {EX});
console.log("   ", JSON.stringify(solo));
ck("waved, a training max is wanted", solo.waved === true, String(solo.waved));
ck("plain, it is not", solo.plain === false, String(solo.plain));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
