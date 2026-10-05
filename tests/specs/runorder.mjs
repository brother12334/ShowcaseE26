import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
/* Two sessions, described by the order they were PERFORMED in. `null` marks a row that
   was in the plan but never logged into. */
const mk = (names)=> ({entries: names.map(n=> n == null ? null : n).map(n=>{
  if(typeof n === "object") return n;
  return {name: n, reps:"8", sets:[{weight:"100", reps:"8", rpe:"8", done:true}]};
})});
const rank = (nowList, wasList, name)=> p.evaluate(({nowList, wasList, name})=>{
  const build = arr => ({entries: arr.map(x=> typeof x === "string"
    ? {name:x, reps:"8", sets:[{weight:"100",reps:"8",rpe:"8",done:true}]}
    : {name:x.name, reps:"8", sets:[]} )});
  return runOrderRank(build(nowList), build(wasList), name);
}, {nowList, wasList, name});

console.log("1 - THE CASE FROM THE SCREENSHOT: ONE PLACE, NOT THREE");
{
  /* It moved exactly one place among the lifts done both times. The raw indices differ
     by three only because of rows that are not comparable. */
  const was = ["Smith Flat Bench Press", "Mid Cable Fly (on bench)",
               "Incline Dumbbell Bench Press", "Overhead Cable Triceps Extension"];
  const now = ["Smith Flat Bench Press", "Incline Dumbbell Bench Press",
               "Mid Cable Fly (on bench)", "Overhead Cable Triceps Extension"];
  const r = await rank(now, was, "Mid Cable Fly (on bench)");
  ck("it is one place later, not three", r && r.now - r.was === 1, JSON.stringify(r));
  const raw = now.indexOf("Mid Cable Fly (on bench)") - was.indexOf("Mid Cable Fly (on bench)");
  ck("and the old raw-index answer would have said one here too", raw === 1, String(raw));
}

console.log("2 - AN EXERCISE ONLY ONE SESSION HAD CANNOT MOVE ANYTHING");
{
  const was = ["Bench", "Fly", "Triceps"];
  const now = ["Bench", "Pull-Up", "Dip", "Fly", "Triceps"];   // two added before it
  const r = await rank(now, was, "Fly");
  ck("the fly has not moved at all", r && r.now === r.was, JSON.stringify(r));
  const raw = now.indexOf("Fly") - was.indexOf("Fly");
  ck("where raw indices would have claimed two places", raw === 2, String(raw));
}

console.log("3 - A ROW YOU NEVER LOGGED INTO IS NOT A PLACE IN THE ORDER");
{
  const was = ["Bench", "Fly", "Triceps"];
  const now = ["Bench", {name:"Pull-Up"}, {name:"Dip"}, "Fly", "Triceps"];  // planned, not done
  const r = await rank(now, was, "Fly");
  ck("the skipped rows do not count", r && r.now === r.was, JSON.stringify(r));
}

console.log("4 - BUT A REAL MOVE IS STILL REPORTED");
{
  const was = ["Fly", "Bench", "Triceps", "Row"];
  const now = ["Bench", "Triceps", "Row", "Fly"];
  const r = await rank(now, was, "Fly");
  ck("three places later is three places later", r && r.now - r.was === 3, JSON.stringify(r));
}

console.log("5 - AND IT ANSWERS 'CANNOT TELL' RATHER THAN GUESSING");
{
  const a = await rank(["Bench","Fly"], ["Bench","Triceps"], "Fly");
  ck("a lift the other session did not do: no answer", a === null, JSON.stringify(a));
  const b2 = await rank([], ["Bench","Fly"], "Fly");
  ck("an empty session: no answer", b2 === null, JSON.stringify(b2));
}

console.log("6 - THE GRADE CARD ONLY SAYS IT WHEN IT IS TRUE, AND ONLY FOR THE SAME DAY");
{
  const r = await p.evaluate(()=>{
    const day = 86400000, now = Date.now();
    const sets = w => [{weight:String(w), reps:"8", rpe:"8", done:true}];
    const mkS = (id, at, wid, rows)=> ({id, workoutId:wid, date:new Date(at).toLocaleDateString("en-CA"),
      startedAt:at, finishedAt:at+36e5, feel:4,
      entries: rows.map(([n,w])=> ({name:n, reps:"8", sets: sets(w)}))});
    const wid = ROTATION[0];
    /* last time: fly second. this time: fly third, with one extra lift inserted. */
    const prevS = mkS("p1", now-7*day, wid, [
      ["Smith Flat Bench Press",140], ["Mid Cable Fly (on bench)",75],
      ["Incline Dumbbell Bench Press",50], ["Overhead Cable Triceps Extension",113]]);
    const nowS = mkS("n1", now-1*day, wid, [
      ["Smith Flat Bench Press",144], ["Incline Dumbbell Bench Press",47],
      ["Mid Cable Fly (on bench)",72], ["Overhead Cable Triceps Extension",114]]);
    S.sessions = [prevS, nowS];
    save();
    const q = scoreWorkout(nowS);
    const sec = (q.sections||[]).find(x=> x.key === "overload");
    const txt = JSON.stringify(sec || {});
    const m = txt.match(/ran (\d+) places later/);
    return {said: !!m, n: m ? parseInt(m[1],10) : null, label: sec && sec.label,
            why: sec && sec.why};
  });
  ck("the overload section exists", !!r.label, JSON.stringify(r));
  ck("and it no longer claims a three-place move", !(r.n >= 2), JSON.stringify(r));
}

console.log("7 - A DIFFERENT ROTATION DAY IS NOT A BASELINE FOR RUNNING ORDER");
{
  const r = await p.evaluate(()=>{
    const src = String(downContext);
    return {gated: /if\(prior\.sameDay\)[\s\S]{0,200}runOrderRank/.test(src)};
  });
  ck("the claim is only made against the same day", r.gated, String(r.gated));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
