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
  // the screenshot's shape: lots of pressing and rowing, so delts/triceps saturate
  // while chest itself still has headroom
  const mk=(n,c)=>({name:n, sets:Array.from({length:c},()=>({weight:"100",reps:"10",rpe:"8",done:true,rest:120}))});
  for(let d=3; d>=0; d--){ const t=Date.now()-d*86400e3;
    S.sessions.push({id:"s"+d, date:dayStr(t), workoutId:ROTATION[0], startedAt:t, finishedAt:t+3e6, feel:3,
      entries:[mk("Barbell Overhead Press",4), mk("Tricep Pushdown",4),
               mk("Mid Cable Fly (on bench)",1), mk("Barbell Row",6)]}); }
  save();
});

console.log('WHERE EACH PART OF THE PUSHING SIDE ACTUALLY SITS');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const o={};
  ['chest','delts_front','triceps'].forEach(m=>{
    const L=(A.lm&&A.lm[m])||adjustedLandmarks(A,m);
    o[m]=r1(((A.wk[m]||{}).sets||0)+((A.cyc&&A.cyc.pending[m])||0))+' / '+r1(L.mav)+' productive';
  });
  return o;
}));

console.log('\nTHE FINDING NOW DISTINGUISHES THE SIDE FROM THE MUSCLE');
const f = await p.evaluate(()=>{
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=>x.kind==='balance');
  if(i<0) return {none:true};
  const w=A.weak[i];
  return {i, act:w.act, why:w.why, noRoom:!!w.noRoom, avoid:w.avoid||null};
});
console.log('  ', f);

if(!f.none){
  console.log('\nAND THE PLAN PICKS MOVEMENTS THAT MISS THE FULL ONES');
  console.log('  ', await p.evaluate(i=>{
    const A=bodyAnalysis(); const w=A.weak[i];
    const fp=findingPlan(w,A);
    const cands=fixCandidates(w.muscle, [], w.avoid).slice(0,5).map(c=>
      c.name+'  ('+Math.round(c.frac*100)+'% '+gName(w.muscle).toLowerCase()+', '+Math.round(c.cost*100)+'% into the full ones)');
    return {mode:fp&&fp.mode, label:fp&&fp.label, list:fp&&fp.list, topCandidates:cands};
  }, f.i));

  console.log('\n  the same list WITHOUT the steer, for comparison:');
  console.log('  ', await p.evaluate(i=>{
    const A=bodyAnalysis(); const w=A.weak[i];
    return fixCandidates(w.muscle, []).slice(0,5).map(c=> c.name+'  ('+Math.round(c.frac*100)+'%)');
  }, f.i));
}

console.log('\nerrors:', errs);
await b.close();
