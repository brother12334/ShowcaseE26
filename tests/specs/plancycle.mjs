import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}, deviceScaleFactor:2});
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
  S.tourDone=true; S.geo='off';
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false}); S.sleepAsked=todayStr();
  // part way through a cycle: some logged, plenty still prescribed
  S.cycleStart = Date.now() - 7*86400e3; S.cycleDone=[0]; S.pointer=1;
  const mk=(n,c)=>({name:n, sets:Array.from({length:c},()=>({weight:"100",reps:"10",rpe:"8",done:true,rest:120}))});
  for(let d=6; d>=5; d--){ const t=Date.now()-d*86400e3;
    S.sessions.push({id:"s"+d, date:dayStr(t), workoutId:ROTATION[0], startedAt:t, finishedAt:t+3e6, feel:3,
      entries:[mk("Barbell Bench Press",5), mk("Mid Cable Fly (on bench)",5)]}); }
  save();
});

console.log('THE THREE FIGURES, SIDE BY SIDE');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis(), m='chest';
  const shown=(A.lm&&A.lm[m])||adjustedLandmarks(A,m);
  const cyc=cycleLandmarks(A,m);
  const pr=fixProjection(A,m,0);
  return {
    loggedSoFar: r1((A.wk[m]||{}).sets||0),
    stillPrescribedThisCycle: r1((A.cyc&&A.cyc.pending[m])||0),
    whatThePlanDeliversPerCycle: r1(planCycleVolume(m)),
    cycleLength: cycleLenDays()+' days',
    windowThresholds: r1(shown.mev)+' / '+r1(shown.mav)+' / '+r1(shown.mrv),
    cycleThresholds: r1(cyc.mev)+' / '+r1(cyc.mav)+' / '+r1(cyc.mrv),
    panelOpensOn: pr.now, panelCeiling: pr.mrv
  };
}));

console.log('\nTHE CASE FROM THE SCREENSHOT: ADDING 3 NO LONGER READS "CLEARS IT"');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis(), m='chest';
  return [0,1,3,6].map(add=>{
    const pr=fixProjection(A,m,add);
    return '+'+add+' → '+pr.now+' to '+pr.after+' per cycle  ['+pr.tone+']  '+pr.verdict;
  });
}));

console.log('\nAND THE PLANNER WILL NOT FILL PAST THE CYCLE CEILING');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis(), m='chest';
  const cyc=cycleLandmarks(A,m);
  const have=planCycleVolume(m);
  const sp=spreadPlan(A,m,20);
  return {planNow:r1(have), cycleCeiling:r1(cyc.mrv),
          wouldAdd: sp ? sp.gained : 'refuses — no room',
          endsAt: sp ? r1(have+sp.gained) : r1(have),
          staysUnder: sp ? (have+sp.gained) <= cyc.mrv+0.6 : true};
}));

console.log('\nTHE CAPTION NAMES THE QUESTION IT IS ANSWERING');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=>x.kind==='under'||x.kind==='balance'||x.kind==='none');
  if(i<0) return 'no finding';
  goTab('body'); render(); openWeakPoint(i);
  const own=document.querySelector('#wdOwn'); if(!own) return 'no own-fix';
  own.click();
  return [...document.querySelectorAll('.fx-made')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
}));

console.log('\nerrors:', errs);
await b.close();
