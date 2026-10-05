import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:1000}});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:true,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* Dumbbells that end at 50, said on the GYM rather than under "your usual kit" — which is
   where the app asks for it when you set a room up, and which is what somebody who trains
   in one place actually fills in. */
const setup = (where)=> p.evaluate((w)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorAsked=true; S.sleepAsked=todayStr();
  S.flags=[]; S.deload=null; S.planStart=Date.now()-200*86400e3;
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.active = null;
  trainPrefs().dbStep = 5;
  trainPrefs().dbMax = (w === "prefs") ? 50 : null;
  S.gyms = [{id:"g1", name:"Palma Vista", dbMax: (w === "gym") ? 50 : null}];
  const mk=(d)=>({id:"s"+d, workoutId: ROTATION[d % ROTATION.length], gymId:"g1", gymName:"Palma Vista",
    date:new Date(Date.now()-d*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-d*86400e3-3600e3, finishedAt:Date.now()-d*86400e3, feel:4,
    entries:[{name:"Dumbbell RDL", reps:"8-12",
      sets:[{weight:"50",reps:"13",rpe:"9",done:true}]}]});
  S.sessions=[5,3,1].map(mk);
  save();
  return true;
}, where);

console.log("1 - THE CEILING SET ON YOUR GYM REACHES A SCREEN WITH NO SESSION RUNNING");
{
  await setup("gym");
  const r = await p.evaluate(()=>({
    active: !!S.active,
    max: rackMaxNow(),
    src: rackMaxSrc(),
    round: roundLoadable(55, "Dumbbell RDL"),
    cap: capToRack(55, "Dumbbell RDL")
  }));
  ck("no workout is running", !r.active, String(r.active));
  ck("the ceiling is still found", r.max === 50, JSON.stringify(r.src));
  ck("and it is named after the room", r.src.gym === "Palma Vista", JSON.stringify(r.src));
  ck("55 rounds down to the top of the rack", r.round === 50, String(r.round));
  ck("and nothing above it survives the cap", r.cap === 50, String(r.cap));
}

console.log("2 - SO THE CARD STOPS ASKING FOR A WEIGHT THAT IS NOT IN THE BUILDING");
{
  const r = await p.evaluate(()=>{
    const sess = S.sessions[S.sessions.length - 1];
    const en = sess.entries[0];
    const g = progressionFor(sess, en);
    return g ? {kind:g.kind, msg:g.msg, sub:g.sub, to:g.to} : {none:true};
  });
  ck("the session earns a progression", !r.none, JSON.stringify(r));
  ck("it is not a raise off the end of the rack", r.kind !== "up" || parseFloat(r.to) <= 50,
     JSON.stringify(r));
  ck("it holds the load instead", r.kind === "hold", JSON.stringify(r));
  ck("and says where the ceiling is", /the rack at Palma Vista ends at 50 lb/.test(r.sub || ""), r.sub);
}

console.log("3 - YOUR USUAL KIT STILL ANSWERS WHEN NO GYM SAYS ANYTHING");
{
  await setup("prefs");
  const r = await p.evaluate(()=>({max: rackMaxNow(), src: rackMaxSrc(),
                                   round: roundLoadable(55, "Dumbbell RDL")}));
  ck("the ceiling comes from your kit", r.max === 50, JSON.stringify(r.src));
  ck("unnamed, because no room claimed it", r.src.gym === "", JSON.stringify(r.src));
  ck("and it still caps", r.round === 50, String(r.round));
}

console.log("4 - THE ROOM YOU ARE IN BEATS THE ONE YOU WERE IN LAST");
{
  const r = await p.evaluate(()=>{
    trainPrefs().dbMax = 50;
    S.gyms = [{id:"g1", name:"Palma Vista", dbMax:50}, {id:"g2", name:"Hotel", dbMax:30}];
    S.active = {id:"a", workoutId:ROTATION[0], date:todayStr(), startedAt:Date.now(),
                gymId:"g2", entries:[]};
    const inHotel = rackMaxSrc();
    S.active = null;
    const after = rackMaxSrc();
    return {inHotel, after};
  });
  ck("training at the hotel, the hotel's rack wins", r.inHotel.max === 30 && r.inHotel.gym === "Hotel",
     JSON.stringify(r.inHotel));
  ck("back out, the gym you last trained in answers", r.after.max === 50, JSON.stringify(r.after));
}

console.log("5 - AND A GYM THAT SAYS NOTHING DOES NOT SILENCE THE ONE THAT DOES");
{
  const r = await p.evaluate(()=>{
    trainPrefs().dbMax = null;
    S.gyms = [{id:"g1", name:"Palma Vista", dbMax:50}, {id:"g3", name:"Unsaid"}];
    // most recent session is at the gym with nothing set
    S.sessions[S.sessions.length-1].gymId = "g3";
    S.active = null;
    return rackMaxSrc();
  });
  ck("it walks back to the one that knows", r.max === 50 && r.gym === "Palma Vista", JSON.stringify(r));
}

console.log("6 - NOTHING ANYWHERE MEANS NO CAP, EXACTLY AS BEFORE");
{
  const r = await p.evaluate(()=>{
    trainPrefs().dbMax = null;
    S.gyms = [];
    S.sessions.forEach(s=> delete s.gymId);
    S.active = null;
    return {max: rackMaxSrc().max, round: roundLoadable(55, "Dumbbell RDL")};
  });
  ck("no ceiling is invented", !(r.max > 0), String(r.max));
  ck("and 55 stays 55", r.round === 55, String(r.round));
}

console.log("7 - AND IT ONLY EVER APPLIES TO THINGS ON A RACK");
{
  const r = await p.evaluate(()=>{
    trainPrefs().dbMax = 50;
    return {db: capToRack(55, "Dumbbell RDL"),
            cable: capToRack(55, "Cable Lat Prayer"),
            bar: capToRack(155, "Barbell Row"),
            kb: capToRack(80, "Kettlebell Swing")};
  });
  ck("dumbbells are capped", r.db === 50, String(r.db));
  ck("kettlebells too", r.kb === 50, String(r.kb));
  ck("a cable stack is not", r.cable === 55, String(r.cable));
  ck("and neither is a barbell", r.bar === 155, String(r.bar));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
