import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

const base = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  S.gyms=[]; S.active=null;
  S.prefs = Object.assign({}, S.prefs, {dbMax:null, dbStep:null});
  save();
});

console.log("1 - A RACK LIMIT WITH NO STEP SET IS STILL A LIMIT");
{
  await base();
  const r = await p.evaluate(()=>{
    trainPrefs().dbMax = 50; trainPrefs().dbStep = null; save();
    return {capped: roundLoadable(55, "Single-Arm Dumbbell Row"),
            under: roundLoadable(45, "Single-Arm Dumbbell Row"),
            bar: roundLoadable(230, "Barbell Bench Press")};
  });
  ck("55 comes back as 50", r.capped===50, String(r.capped));
  ck("a weight inside the rack is untouched", r.under===45, String(r.under));
  ck("and a barbell is not a rack", r.bar===230, String(r.bar));
}

console.log("2 - THE GYM YOU ARE IN ANSWERS FIRST");
{
  await base();
  const r = await p.evaluate(()=>{
    trainPrefs().dbMax = 100;                       // your usual place has heavy dumbbells
    /* A saved gym, written the way the app stores one, without needing a location. */
    if(!Array.isArray(S.gyms)) S.gyms = [];
    const g = {id:"g-hotel", name:"Hotel gym", at:Date.now(), dbMax:40};
    S.gyms.push(g);
    S.active = {date:todayStr(), workoutId:ROTATION[0], startedAt:Date.now(), entries:[],
                gymId:g.id, gymName:g.name};
    save();
    const here = roundLoadable(55, "Single-Arm Dumbbell Row");
    S.active.gymId = null;
    const usual = roundLoadable(55, "Single-Arm Dumbbell Row");
    return {here, usual, max: rackMaxNow()};
  });
  ck("the hotel rack caps it at 40", r.here===40, String(r.here));
  ck("and back at your usual gym it does not", r.usual===55, String(r.usual));
}

console.log("3 - A RAISE THE RACK CANNOT DELIVER IS NOT OFFERED AS ONE");
{
  await base();
  const r = await p.evaluate(()=>{
    trainPrefs().dbMax = 50; trainPrefs().dbStep = 5; save();
    const wid = ROTATION[0];
    S.program[wid]=[{name:"Single-Arm Dumbbell Row", sets:2, reps:"8-12", weight:50, rpe:"6-7"}];
    const t = Date.now()-3600e3;
    const sess = {id:"r1", workoutId:wid, date:new Date(t).toLocaleDateString("en-CA"),
      startedAt:t, finishedAt:Date.now(), feel:4,
      entries:[{name:"Single-Arm Dumbbell Row", reps:"8-12", rpe:"6-7", sets:[
        {weight:"50", reps:"12", rpe:"7", done:true},
        {weight:"50", reps:"12", rpe:"7", done:true}]}]};
    S.sessions=[sess]; save();
    const row = progressionFor(sess, sess.entries[0]) || {};
    return {kind: row.kind, msg: row.msg, sub: row.sub};
  });
  console.log("     " + (r.kind||"(nothing)") + ": " + (r.msg||""));
  ck("it is not an 'add weight' finding", r.kind !== "up", String(r.kind));
  ck("it says the rack stops here", /rack stops here/.test(r.msg||""), r.msg);
  ck("and names the ceiling", /50/.test(r.sub||""), (r.sub||"").slice(0,120));
  ck("and points at reps instead", /reps higher|make the set harder/.test(r.sub||""), (r.sub||"").slice(0,160));
}

console.log("4 - WITH ROOM ON THE RACK, THE RAISE IS STILL OFFERED");
{
  const r = await p.evaluate(()=>{
    trainPrefs().dbMax = 80; save();
    const sess = S.sessions[0];
    const row = progressionFor(sess, sess.entries[0]) || {};
    return {kind: row.kind, msg: row.msg, to: row.to};
  });
  ck("it is a raise again", r.kind==="up", String(r.kind));
  ck("to the next dumbbell up", r.to===55, String(r.to));
  console.log("     " + r.msg);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
