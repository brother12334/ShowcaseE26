import { chromium, APP_URL } from './_e26.mjs';
/* "STILL HAWKING ME FOR THE PLATE SIZES EVERY TIME."

   There are two ways to answer "which plates do you have", and the plate maths only ever
   read one of them. The chip writes plateStep — "my smallest is 2.5". Where you train
   takes the full answer: the exact sizes on the tree, which is strictly MORE information
   and is what the plate count uses in preference to the step once it gets that far.

   Every reader checked plateStep alone, so ticking your plate sizes and leaving the step
   blank read as "nothing said": no plate line, no rounding on a bar, and the card asking
   for the plates on every barbell in every session, for good. Answering in the better
   form made the app ask more. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const ev = (fn,a)=> p.evaluate(fn,a);
await ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, barMode:"total",
                                      barWeight:45, smithWeight:25, plateStep:null, plates:null});
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});

console.log("1 - NOTHING SAID, SO IT ASKS");
{
  const r = await ev(()=> ({gap: !!plateGapFor("Barbell Bench Press", 135),
                            miss: (plateGapFor("Barbell Bench Press", 135)||{}).miss,
                            line: plateLine(135, "Barbell Bench Press"),
                            step: loadStepFor("Barbell Bench Press")}));
  console.log("   ", JSON.stringify(r));
  ck("the card is shown", r.gap, String(r.gap));
  ck("and it asks for the plates", (r.miss||[]).join("|").includes("plates"), JSON.stringify(r.miss));
  ck("with no plate count to give", r.line === "", JSON.stringify(r.line));
}

console.log("\n2 - TICKING YOUR PLATE SIZES IS AN ANSWER");
/* The exact sizes on the tree, and no step. This is the state the report was in. */
{
  const r = await ev(()=>{
    S.prefs.plates = [45, 25, 10, 5, 2.5]; S.prefs.plateStep = null; save();
    /* Read through a guard, so a build without the helper reports the BEHAVIOUR as
       broken rather than dying on a missing name. */
    const small = (typeof smallestPlate === "function") ? smallestPlate() : null;
    return {smallest: small,
            gap: plateGapFor("Barbell Bench Press", 135),
            line: plateLine(135, "Barbell Bench Press"),
            step: loadStepFor("Barbell Bench Press")};
  });
  console.log("   ", JSON.stringify(r));
  ck("the smallest plate is read off the tree", r.smallest === 2.5, String(r.smallest));
  ck("SO IT STOPS ASKING", r.gap === null, JSON.stringify(r.gap));
  ck("the plate count appears", /45/.test(r.line || ""), r.line);
  ck("and a bar moves in two of the smallest", r.step === 5, String(r.step));
}

console.log("\n3 - AND IT USES EXACTLY THE PLATES YOU NAMED");
{
  const r = await ev(()=>{
    S.prefs.plates = [45, 10, 5]; save();      // no 25 and no 2.5 in this gym
    const small = (typeof smallestPlate === "function") ? smallestPlate() : null;
    return {line: plateLine(145, "Barbell Bench Press"), smallest: small,
            step: loadStepFor("Barbell Bench Press")};
  });
  console.log("   ", JSON.stringify(r));
  ck("the count is built from the named sizes only",
     !/25|2\.5/.test(r.line || ""), r.line);
  ck("and the step follows the smallest of them", r.smallest === 5 && r.step === 10,
     JSON.stringify({smallest: r.smallest, step: r.step}));
}

console.log("\n4 - THE CHIP ANSWER STILL WINS WHERE IT IS GIVEN");
{
  const r = await ev(()=>{
    S.prefs.plateStep = 1.25; S.prefs.plates = [45, 25, 10]; save();
    const small = (typeof smallestPlate === "function") ? smallestPlate() : trainPrefs().plateStep;
    return {smallest: small, gap: plateGapFor("Barbell Bench Press", 135)};
  });
  ck("an explicit smallest plate is not overridden by the tree",
     r.smallest === 1.25, String(r.smallest));
  ck("and nothing is being asked for", r.gap === null, JSON.stringify(r.gap));
}

console.log("\n5 - THE OTHER HALF OF THE QUESTION IS STILL ASKED");
/* Half an answer must still ask for the other half, and say which half it already has.
   A bar rather than a Smith, because a Smith carriage left unset means "the usual" and
   has a default to fall back on — there is nothing missing there to ask about. */
{
  const r = await ev(()=>{
    S.prefs.plateStep = null; S.prefs.plates = [45, 25, 10, 5, 2.5];
    S.prefs.barWeight = null; save();
    const g = plateGapFor("Barbell Bench Press", 135);
    return {miss: g && g.miss, html: g ? plateGapHTML(g, 135, "Barbell Bench Press") : ""};
  });
  console.log("   ", JSON.stringify(r.miss));
  ck("it still wants the bar weight", (r.miss||[]).join("|").includes("bar"),
     JSON.stringify(r.miss));
  ck("but no longer asks for the plates", !(r.miss||[]).join("|").includes("plates"),
     JSON.stringify(r.miss));
  ck("and it says the plates are already known",
     /plates from 2\.5/.test(r.html), (r.html||"").slice(0, 160));
  ck("so the four plate chips are not drawn again",
     !/data-plfast/.test(r.html), /data-plfast/.test(r.html) ? "chips shown" : "no chips");
}

console.log("\n6 - A RESTORE CANNOT UNANSWER IT EITHER");
/* The same symptom by another road: PREF_DEFAULTS seeds every preference, so "never
   answered" is an explicit null — and a plain merge let a null in the file beat a real
   answer on this device. */
{
  const r = await ev(()=>{
    const into = {prefs: {plateStep: 2.5, barWeight: 45, units: "lb"}, sessions: []};
    mergeBackup(into, {sessions: [], prefs: {plateStep: null, dbStep: 5, barWeight: 35}});
    return into.prefs;
  });
  console.log("   ", JSON.stringify(r));
  ck("a null in the file does not wipe an answer here", r.plateStep === 2.5, String(r.plateStep));
  ck("a real value in the file still wins", r.barWeight === 35, String(r.barWeight));
  ck("and a setting only the file has still arrives", r.dbStep === 5, String(r.dbStep));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
