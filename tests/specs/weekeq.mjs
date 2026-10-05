import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
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
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=60; save();
});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
const near=(a,b2,t=0.05)=> Math.abs(a-b2)<=t;

console.log("D2a - THE LANDMARK IS A WEEKLY FIGURE AGAIN");
{
  const r = await p.evaluate(()=>{
    S.splitId=DEFAULT_SPLIT; applySplit();
    S.cycleStart = Date.now()-4*86400e3; S.cycleDone=[0];
    S.sessions=[{id:"s1", workoutId:ROTATION[0],
      date:new Date(Date.now()-4*86400e3).toLocaleDateString("en-CA"),
      startedAt:Date.now()-4*86400e3, finishedAt:Date.now()-4*86400e3+3600e3, feel:4,
      entries:[{name:"Barbell Bench Press", reps:"8-12",
        sets:Array.from({length:4},()=>({weight:"135",reps:"10",rpe:"8",done:true}))}]}];
    save();
    const A = bodyAnalysis();
    return {mav:A.lm.chest.mav, cycleMav:A.lm.chest.cycle.mav, scale:A.lm.chest.scale,
            planDays:A.planDays, layout:CYCLE_LAYOUT.length};
  });
  ck("planned cycle length comes from the layout", r.planDays===r.layout, JSON.stringify(r));
  ck("the primary MAV is weekly and unscaled", r.mav===20, String(r.mav));
  ck("the per-cycle figure is derived, not primary",
     near(r.cycleMav, 20*r.scale, 0.15), JSON.stringify(r));
  ck("and they differ when the cycle isn't 7 days", r.planDays!==7 ? r.cycleMav!==r.mav : true,
     JSON.stringify(r));
}

console.log("D2b - VOLUME IS CONVERTED, NOT THE TARGET");
{
  const r = await p.evaluate(()=>{
    const A = bodyAnalysis();
    return {eff:A.wk.chest.eff, vol:A.vol.chest, planDays:A.planDays,
            expect: A.wk.chest.eff*7/A.planDays};
  });
  ck("weeklyEquivalent = eff x 7 / planned days", near(r.vol, r.expect), JSON.stringify(r));
  ck("4 sets of bench = 4 effective chest sets", near(r.eff,4), String(r.eff));
}

console.log("D2c - MID-CYCLE PROJECTS, IT DOES NOT JUDGE");
{
  const r = await p.evaluate(()=>{
    const A = bodyAnalysis();
    return {mid:A.midCycle, k:A.state.chest.k, label:A.state.chest.label,
            txt:A.state.chest.txt, proj:A.projected.chest};
  });
  ck("mid-cycle is detected", r.mid===true, JSON.stringify(r));
  ck("the state is a projection", r.k==="proj" && r.label==="on track", JSON.stringify(r));
  ck("it says what it is heading for", /on track for/.test(r.txt), r.txt);
  ck("projection includes the sets still prescribed", r.proj > 0, String(r.proj));
  console.log("     " + r.txt);
}

console.log("D2d - A FINISHED CYCLE GETS A REAL VERDICT");
{
  const r = await p.evaluate(()=>{
    S.cycleDone = ROTATION.map((_,i)=>i);        // all done
    save();
    const A = bodyAnalysis();
    return {mid:A.midCycle, k:A.state.chest.k, txt:A.state.chest.txt};
  });
  ck("no longer mid-cycle", r.mid===false, JSON.stringify(r));
  ck("a banded verdict returns", ["under","optimal","high","over"].includes(r.k), JSON.stringify(r));
  ck("stated per week", /sets a week|weekly sets/.test(r.txt), r.txt);
}

console.log("D4 - THE MID-CYCLE FLIP IS GONE (PPL rest PPL rest)");
{
  const r = await p.evaluate(()=>{
    S.splitId=DEFAULT_SPLIT; applySplit();
    const layout = CYCLE_LAYOUT.length;
    const CHEST_DAYS = [1, 5];                 // trained on day 1 and day 5 of the cycle
    const bench = ()=> ({name:"Barbell Bench Press", reps:"8-12",
      sets:Array.from({length:5},()=>({weight:"135",reps:"10",rpe:"8",done:true}))});
    const out = [];
    for(let day=1; day<=layout; day++){
      S.cycleStart = Date.now() - (day-1)*86400e3;
      // sessions on whichever chest days have already happened
      S.sessions = CHEST_DAYS.filter(d=> d <= day).map(d=>({
        id:"c"+d, workoutId:ROTATION[0],
        date:new Date(Date.now()-(day-d)*86400e3).toLocaleDateString("en-CA"),
        startedAt:Date.now()-(day-d)*86400e3, finishedAt:Date.now()-(day-d)*86400e3+3600e3,
        feel:4, entries:[bench()]}));
      // mark the rotation as partly done in proportion to the day reached
      S.cycleDone = ROTATION.map((_,i)=>i).filter(i=> i < Math.floor((day-1)*ROTATION.length/layout));
      save();
      const A = bodyAnalysis();
      out.push({day, k:A.state.chest.k, band:A.state.chest.band || null,
                eff:r1(A.wk.chest.eff), wk:r1(A.vol.chest), proj:r1(A.projected.chest)});
    }
    return {out, layout};
  });
  const trained = r.out.filter(x=> x.eff > 0);
  ck("chest volume really was logged mid-cycle", trained.length >= 3, JSON.stringify(r.out));
  ck("every mid-cycle reading is a projection",
     trained.every(x=> x.k==="proj"), JSON.stringify(r.out));
  const bands = trained.map(x=> x.band);
  ck("and the projected band never flips from too little to too much",
     !(bands.includes("under") && bands.includes("over")), JSON.stringify(bands));
  ck("the projection is stable as the cycle runs",
     Math.max(...trained.map(x=>x.proj)) - Math.min(...trained.map(x=>x.proj)) <=
       Math.max(...trained.map(x=>x.proj)) * 0.5,
     JSON.stringify(trained.map(x=>x.proj)));
  console.log("     " + r.out.map(x=> "d"+x.day+" "+(x.band||x.k)+" wk="+x.wk+" proj="+x.proj).join("  "));
}

console.log("D2e - NO PROGRAM MEANS A ROLLING WEEK, UNCHANGED");
{
  const r = await p.evaluate(()=>{
    S.cycleStart = null; S.cycleDone=[];
    save();
    const A = bodyAnalysis();
    return {planDays:A.planDays, eq: weeklyEquivalent(10, A.planDays), win:A.win.mode};
  });
  ck("no cycle, no conversion", r.planDays===0 && r.eq===10, JSON.stringify(r));
  ck("and the window falls back to a rolling week", r.win==="week", r.win);
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
