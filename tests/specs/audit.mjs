import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>{errs.push(e.message); console.log('PAGEERR',e.message);});
p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; save();
});

console.log('1 · A MOVEMENT ALREADY IN YOUR PLAN IS NEVER OFFERED AS "NEW"');
console.log('  ', await p.evaluate(()=>{
  const inPlan = new Set();
  DAYS.concat(["finisher"]).forEach(w=> (S.program[w]||[]).forEach(e=> inPlan.add(nrm(e.name))));
  const bad = {};
  GKEYS.forEach(g=>{
    const dupes = fixCandidates(g, planEntriesForMuscle(g).map(x=>x.e.name))
      .filter(c=> inPlan.has(nrm(c.name))).map(c=>c.name);
    if(dupes.length) bad[g] = dupes;
  });
  return Object.keys(bad).length ? bad : 'no muscle offers a movement already in the plan';
}));

console.log('\n2 · PINNING A MOVEMENT ONTO A DAY THAT ALREADY HAS IT RAISES ITS SETS');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const ent=planEntriesForMuscle('chest')[0];
  const before=ent.e.sets;
  const sp=spreadPlan(A,'chest',4,null,{name:ent.e.name, days:[ent.wid], sets:2});
  return {movement:ent.e.name, day:widName(ent.wid), wasAt:before,
          plan: sp ? spreadList(sp) : null,
          noDuplicate: sp ? (sp.newExs||[]).every(n=> nrm(n.name)!==nrm(ent.e.name)) : null};
}));

console.log('\n3 · EVERY PLAN DECISION IS NOW PER CYCLE');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis(), m='chest';
  const cl=cycleLandmarks(A,m);
  const pv=planCycleVolume(m);
  // findingPlan's need, spreadPlan's room, trimPlan's floors, sideRoom, swapCollateral
  const probe={};
  probe.planPerCycle=r1(pv);
  probe.cycleFloor=r1(cl.mev); probe.cycleCeiling=r1(cl.mrv);
  probe.windowFloor=r1(((A.lm&&A.lm[m])||adjustedLandmarks(A,m)).mev);
  probe.fixPanelNow=fixProjection(A,m,0).now;
  probe.sameAsPlan = probe.fixPanelNow === probe.planPerCycle;
  const hits=swapCollateral(A, 'Barbell Bench Press', 'Lat Pulldown', 4);
  probe.collateralCountsPerCycle = hits.length ? hits.map(h=>h.name+': '+h.now+'→'+h.after+' vs '+h.mev) : 'none below its floor';
  return probe;
}));

console.log('\n4 · THE DESCRIPTIVE SCREENS STILL DESCRIBE THE WINDOW');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis(), m='chest';
  return {bodyTabBar: r1((A.wk[m]||{}).sets||0)+' over '+A.win.label,
          note:'unchanged on purpose — it answers how far through this cycle you are'};
}));

console.log('\nerrors:', errs);
await b.close();
