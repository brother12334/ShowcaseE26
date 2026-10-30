import { chromium, APP_URL } from './_e26.mjs';
/* "WHERE'S THE UPDATED BODY WEIGHT EXERCISE THING?" — on a weighted dips card whose
   numbers plainly counted the lifter: 144.6 lb at a bodyweight of 139.6, and last time's
   set saying the same, drawn as a plain load with no bw+ anywhere on it.

   Everything about counting yourself hangs off bwRemembered(), and that read one place:
   S.bwEx, written when the switch is pressed and living nowhere else. It was not carried
   in a backup, so a restore wiped it — and nothing could put it back, while the sessions
   and the plan kept numbers that still included the lifter.

   The log is the witness that always travels. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1300}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const ev = (fn,a)=> p.evaluate(fn,a);
const NAME = "Weighted Chest Dips";

await ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.bodyLog={[todayStr()]:{w:139.6}};
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});

console.log("1 - THE LOG SAYS THIS MOVEMENT COUNTS YOU, AND THE TABLE IS GONE");
/* Exactly the reported state: a session logged with bodyweight counted, and S.bwEx
   empty — which is every save that has been through a backup. */
{
  const r = await ev(a=>{
    const wid = ROTATION[0];
    S.program[wid] = [{name:a.NAME, sets:3, reps:"4-8", weight:144.6}];
    S.sessions = [{id:"s1", workoutId:wid, date:todayStr(-3), startedAt:Date.now()-3*864e5,
      finishedAt:Date.now()-3*864e5+3600e3,
      entries:[{name:a.NAME, bwOn:139.6, sets:[{weight:"144.6", reps:"6", rpe:"7", done:true}]}]}];
    S.bwEx = {};
    save();
    /* Guarded, so a build without the helper reports the BEHAVIOUR as broken rather
       than dying on a missing name. */
    const lg = (typeof bwLoggedOn === "function") ? bwLoggedOn(a.NAME) : null;
    return {logged: lg, remembered: bwRemembered(a.NAME)};
  }, {NAME});
  console.log("   ", JSON.stringify(r));
  ck("the log knows the last session counted you", r.logged === true, String(r.logged));
  ck("so the movement counts you, table or no table", r.remembered, String(r.remembered));
}

console.log("\n2 - SO THE CARD COMES UP SPEAKING bw+");
{
  const r = await ev(()=>{
    const wid = ROTATION[0];
    S.active = null; startWorkout(wid); PF=null; TAB="workout";
    const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
    render();
    const en = S.active.entries[0];
    const inp = document.querySelector('.set input[data-f="weight"]');
    return {on: entryBwOn(en), pre: !!document.querySelector('.wx-pre'),
            ph: inp ? inp.placeholder : null, add: inp ? (inp.dataset.bwadd||null) : null,
            line: (document.querySelector('.plate-line')||{}).innerText || null,
            sets: en.sets.map(s=> s.weight).join(",")};
  });
  console.log("   ", JSON.stringify(r));
  ck("the switch is on, stamped at what you weigh", r.on === 139.6, String(r.on));
  ck("the box carries the bw+ label", r.pre && r.add === "139.6",
     JSON.stringify({pre: r.pre, add: r.add}));
  ck("AND THE PLAN'S LOAD SURVIVES AS THE 5 LB ON THE BELT", r.ph === "5", String(r.ph));
  ck("rather than bodyweight being written over the empty rows",
     r.sets.replace(/,/g, "") === "", JSON.stringify(r.sets));
  ck("and the load line leads with bw+5", /bw\+5/.test(r.line || ""), r.line);
}

console.log("\n3 - SAYING NO IS STILL NO, AND THE LOG DOES NOT OVERRULE IT");
/* Turning it off used to delete the key, which under the rule above would read as
   "nothing said" and let the last session switch it straight back on. */
{
  const r = await ev(a=>{
    bwRemember(a.NAME, false); save();
    return {said: S.bwEx[nrm(a.NAME)], remembered: bwRemembered(a.NAME),
            logged: (typeof bwLoggedOn === "function") ? bwLoggedOn(a.NAME) : null};
  }, {NAME});
  console.log("   ", JSON.stringify(r));
  ck("off is recorded as off, not as nothing said", r.said === 0, String(r.said));
  ck("the log still says the last session counted you", r.logged === true, String(r.logged));
  ck("but your answer wins", r.remembered === false, String(r.remembered));
}

console.log("\n4 - AND A BACKUP CARRIES THE TABLE NOW");
{
  const r = await ev(a=>{
    bwRemember(a.NAME, true);
    const file = {};
    BACKUP_FIELDS.forEach(k=>{ if(S[k] !== undefined) file[k] = S[k]; });
    return {inFile: !!(file.bwEx && file.bwEx[nrm(a.NAME)] === 1),
            listed: BACKUP_FIELDS.indexOf("bwEx") > -1};
  }, {NAME});
  console.log("   ", JSON.stringify(r));
  ck("bwEx is one of the fields a backup writes", r.listed, String(r.listed));
  ck("and the answer is in the file", r.inFile, String(r.inFile));
}

console.log("\n5 - AND A MOVEMENT NOBODY HAS EVER COUNTED IS COUNTED ANYWAY NOW");
/* 59.10: counting you stopped being opt-in. A dip is a dip whether or not anybody found
   the switch, so the question the log answers is only "has this been switched OFF". */
{
  const r = await ev(()=> {
    S.bwEx = {};
    return {bench: bwRemembered("Barbell Bench Press"),
            loggedBench: (typeof bwLoggedOn === "function") ? bwLoggedOn("Barbell Bench Press") : false,
            fresh: bwRemembered("Weighted Pull Up"),
            auto: bwAutoCount("Weighted Pull Up")};
  });
  console.log("   ", JSON.stringify(r));
  ck("a barbell lift is not swept in", r.bench === false && r.loggedBench === false,
     JSON.stringify({bench: r.bench, logged: r.loggedBench}));
  ck("a bodyweight movement with nothing logged counts you from the start",
     r.fresh === true && r.auto === true, JSON.stringify({fresh: r.fresh, auto: r.auto}));
}

console.log("\n6 - BUT NOT WITHOUT A WEIGH-IN TO COUNT");
/* The one precondition. Nothing can be added until there is a figure to add. */
{
  const r = await ev(a=>{
    const keep = S.bodyLog; S.bodyLog = {};
    const out = {auto: bwAutoCount(a.NAME), ask: bwAutoAsk({name: a.NAME}),
                 applied: bwApply({name: a.NAME, sets: [{weight: ""}]}, true)};
    S.bodyLog = keep;
    return out;
  }, {NAME});
  console.log("   ", JSON.stringify(r));
  ck("nothing is counted with no weigh-in on file", r.auto === false, String(r.auto));
  ck("and nothing can be written in the meantime", r.applied === false, String(r.applied));
  ck("but the card is told to ask for one", r.ask === true, String(r.ask));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
