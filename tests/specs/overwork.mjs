import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S);
console.log('A PROGRAMME THAT ALREADY PRESCRIBES A LOT OF CHEST');
console.log(await p.evaluate(()=>{
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; save();
  // load the plan up until the cycle delivers well past the productive range
  const wid=DAYS[0];
  S.program[wid]=(S.program[wid]||[]).concat([
    {name:"Dumbbell Bench Press", sets:6, reps:"8-12", rest:120},
    {name:"Chest Dips", sets:6, reps:"8-12", rest:120},
    {name:"Guillotine Press", sets:6, reps:"8-12", rest:120}]);
  save();
  const A=bodyAnalysis(), m='chest';
  const cyc=cycleLandmarks(A,m);
  const out=[0,1,3,6].map(add=>{
    const pr=fixProjection(A,m,add);
    return '+'+add+' → '+pr.now+' to '+pr.after+'  ['+pr.tone+']  '+pr.verdict;
  });
  return {planDeliversPerCycle:r1(planCycleVolume(m)),
          cycleFloor:r1(cyc.mev), cycleProductive:r1(cyc.mav), cycleCeiling:r1(cyc.mrv),
          readouts:out,
          plannerRefuses: spreadPlan(A,m,5) ? 'STILL ADDS' : 'refuses — no room'};
}));
await b.close();
