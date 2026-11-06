import { chromium, APP_URL } from './_e26.mjs';
/* "LAST 149.8×7@7.5" on weighted dips, from a lifter who weighs 139.8 — ten pounds on a
   belt written as a number that is mostly a person.

   59.0 promised that last time's sets would read as bw+, and on this path they never
   did. lastEntryFor() hands its result straight to fmtSet()/fmtSetShort() AS the entry,
   and those ask bwPartOf() whether the load counts the lifter — which reads the stamp,
   and failing that the movement's NAME. The object carried neither: it was built out of
   the session and the sets and nothing else, so every answer was 0. */
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

const boot = (stamped)=> ev(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.bodyLog={[todayStr()]:{w:139.8}};
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], d=86400000;
  S.program[wid]=[{name:"Weighted Chest Dips", sets:3, reps:"4-8", weight:154.8, rpe:"7-9"}];
  S.sessions=[{id:"s1", workoutId:wid, date:dayStr(Date.now()-7*d),
    startedAt:Date.now()-7*d, finishedAt:Date.now()-7*d+3600e3,
    entries:[Object.assign({name:"Weighted Chest Dips", reps:"4-8", rpe:"7-9",
      sets:[{weight:"149.8", reps:"7", rpe:"7.5", done:true}]},
      a.stamped ? {bwOn:139.8} : {})]}];
  S.bwEx={}; save();
  const l = lastEntryFor(wid, "Weighted Chest Dips", false, 0);
  return {name: l.name, bwOn: l.bwOn || null, part: bwPartOf(l),
          chip: fmtSetShort(l.sets[0], l), long: fmtSet(l.sets[0], l),
          box: (lastBox(wid,"Weighted Chest Dips",false,0)||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim()};
}, {stamped});

console.log("1 - A SESSION LOGGED BEFORE THE STAMP EXISTED");
/* The commonest case by far: every dip anybody logged before counting-you was automatic.
   There is no stamp on it, so the NAME is the only way to know the number counts you. */
{
  const r = await boot(false);
  console.log("   ", JSON.stringify(r));
  ck("the movement's name travels with last time's sets", r.name === "Weighted Chest Dips", r.name);
  ck("so the load is read as counting you", r.part === 139.8, String(r.part));
  ck("THE CHIP SAYS bw+10, NOT 149.8", r.chip === "bw+10×7 @7.5", r.chip);
  ck("and so does the long form", /^bw\+10×7/.test(r.long), r.long);
  ck("and the box the card draws", /bw\+10/.test(r.box), r.box);
}

console.log("2 - AND ONE LOGGED WITH THE STAMP ON IT");
{
  const r = await boot(true);
  console.log("   ", JSON.stringify(r));
  ck("the stamp travels too", r.bwOn === 139.8, String(r.bwOn));
  ck("and is what gets used", r.part === 139.8, String(r.part));
  ck("same reading", r.chip === "bw+10×7 @7.5", r.chip);
}

console.log("3 - THE STAMP WINS OVER WHAT YOU WEIGH TODAY");
/* A session is what happened on the day. Reading an old set against today's bodyweight
   would move numbers in the log every time somebody steps on a scale. */
{
  const r = await ev(()=>{
    S.sessions[0].entries[0].bwOn = 180;          // you weighed 180 back then
    save();
    const l = lastEntryFor(ROTATION[0], "Weighted Chest Dips", false, 0);
    return {part: bwPartOf(l), chip: fmtSetShort(l.sets[0], l)};
  });
  console.log("   ", JSON.stringify(r));
  ck("the figure from the day is used", r.part === 180, String(r.part));
  ck("so the set reads as it was lifted", /bw−30\.2/.test(r.chip), r.chip);
}

console.log("4 - AN ORDINARY LIFT IS UNTOUCHED");
{
  const r = await ev(()=>{
    const wid=ROTATION[0], d=86400000;
    S.program[wid]=[{name:"Barbell Bench Press", sets:3, reps:"6-10", weight:185}];
    S.sessions=[{id:"s2", workoutId:wid, date:dayStr(Date.now()-7*d),
      startedAt:Date.now()-7*d, finishedAt:Date.now()-7*d+3600e3,
      entries:[{name:"Barbell Bench Press", reps:"6-10",
        sets:[{weight:"185", reps:"8", rpe:"8", done:true}]}]}];
    save();
    const l = lastEntryFor(wid, "Barbell Bench Press", false, 0);
    return {name: l.name, part: bwPartOf(l), chip: fmtSetShort(l.sets[0], l)};
  });
  console.log("   ", JSON.stringify(r));
  ck("the name still travels", r.name === "Barbell Bench Press", r.name);
  ck("nothing is counted", r.part === 0, String(r.part));
  ck("and the chip is the plain load", /^185×8/.test(r.chip), r.chip);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
