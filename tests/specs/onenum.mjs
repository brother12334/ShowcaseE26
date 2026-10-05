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
  // mid-cycle: some days logged, several still queued — the state that produced 10 vs 19
  S.cycleStart = Date.now() - 7*86400e3; S.cycleDone=[0]; S.pointer=1;
  const mk=(n,c)=>({name:n, sets:Array.from({length:c},()=>({weight:"100",reps:"10",rpe:"8",done:true,rest:120}))});
  for(let d=6; d>=1; d--){ const t=Date.now()-d*86400e3;
    S.sessions.push({id:"s"+d, date:dayStr(t), workoutId:ROTATION[d%3], startedAt:t, finishedAt:t+3e6, feel:3,
      entries:[mk("Barbell Bench Press",5), mk("Mid Cable Fly (on bench)",4), mk("Barbell Row",6)]}); }
  save();
});

console.log('EVERY PLACE THAT COMPARES CHEST TO ITS THRESHOLDS NOW AGREES');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const m='chest';
  const L=(A.lm&&A.lm[m])||adjustedLandmarks(A,m);
  const logged=r1((A.wk[m]||{}).sets||0);
  const queued=r1((A.cyc&&A.cyc.pending[m])||0);
  const pr=fixProjection(A,m,0);
  return {theBarShows:logged, stillQueuedThisCycle:queued,
          fixPanelOpensOn:pr.now, agrees: pr.now === logged,
          mav:r1(L.mav), mrv:r1(L.mrv),
          queuedStillReported:pr.queued};
}));

console.log('\nAND THE FINDING QUOTES THE SAME NUMBER AS THE BAR UNDER IT');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=>x.kind==='balance');
  if(i<0) return 'no balance finding in this state';
  const w=A.weak[i];
  const quoted=/(?:is|itself is only) at ([\d.]+) of(?: a)? ([\d.]+)/.exec(w.why);
  const bar=r1((A.wk[w.muscle]||{}).sets||0);
  return {why:w.why, quotedVolume: quoted?quoted[1]:'(none quoted)',
          barShows:bar, agrees: quoted ? Math.abs(parseFloat(quoted[1])-bar) < 0.05 : 'n/a'};
}));

console.log('\nTHE PANEL SAYS WHAT IS STILL COMING, SEPARATELY');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=>x.kind==='under'||x.kind==='balance'||x.kind==='none');
  if(i<0) return 'no finding';
  goTab('body'); render(); openWeakPoint(i);
  const own=document.querySelector('#wdOwn'); if(!own) return 'no own-fix';
  own.click(); {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} 
  const made=[...document.querySelectorAll('.fx-made')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
  const nums=[...document.querySelectorAll('.fx-nums')].pop().textContent.replace(/\s+/g,' ').trim();
  return {readout:nums, context:made};
}));

console.log('\nerrors:', errs);
await b.close();
