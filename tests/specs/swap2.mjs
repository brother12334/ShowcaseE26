import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
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
  let i=0;
  for(let d=16; d>=1; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]).slice(0,3);
    S.sessions.push({id:"s"+d, date:dayStr(Date.now()-d*86400e3), workoutId:wid,
      startedAt:Date.now()-d*86400e3, finishedAt:Date.now()-d*86400e3+3e6, feel:3,
      entries: prog.map((e,k)=>({name:e.name, sets:[0,1].map(()=>({weight:String(100+k*10), reps:"10", rpe:"8", done:true, rest:120}))}))}); }
  save(); goTab('body'); render();
});
console.log('SWAP, ON A MUSCLE WHERE ONE EXISTS');
console.log('  ', await p.evaluate(()=>{
  buildExSpellings();
  const A=bodyAnalysis();
  const mu = Object.keys(MUSCLES).find(k=>{
    const ents=planEntriesForMuscle(k); if(!ents.length) return false;
    const low=ents.slice().sort((a,b)=>a.frac-b.frac)[0];
    return fixCandidates(k, ents.map(x=>x.e.name)).some(c=>c.frac>low.frac);
  });
  const ents=planEntriesForMuscle(mu).slice().sort((a,b)=>a.frac-b.frac);
  const from=ents[0];
  const to=fixCandidates(mu, ents.map(x=>x.e.name)).filter(c=>c.frac>from.frac)[0];
  return {muscle:mu, takeOut:from.e.name+" ("+Math.round(from.frac*100)+"%)",
          putIn:to.name+" ("+Math.round(to.frac*100)+"%)",
          collateral: swapCollateral(A, from.e.name, to.name, from.e.sets||1)
            .map(x=> x.name+": "+x.now+"→"+x.after+" vs "+x.mev+" floor")};
}));
console.log('\nWHEN IT WOULD ACTUALLY HURT, IT SAYS SO');
console.log('  ', await p.evaluate(()=>{
  // strip the plan down so chest sits right on its floor, then swap the bench out
  const A0=bodyAnalysis();
  DAYS.forEach(d=>{ S.program[d]=(S.program[d]||[]).filter(e=>!/fly|incline|dip|cable chest/i.test(e.name)); });
  S.sessions=S.sessions.slice(-2); save();
  const A=bodyAnalysis();
  const bench=planEntriesForMuscle('chest').find(x=>/bench press/i.test(x.e.name));
  if(!bench) return 'no bench in plan';
  const hits=swapCollateral(A, bench.e.name, 'Smith Machine Shoulder Press', bench.e.sets||1);
  const L=(A.lm&&A.lm.chest)||adjustedLandmarks(A,'chest');
  return {chestNow:Math.round((((A.wk.chest||{}).sets||0)+((A.cyc&&A.cyc.pending.chest)||0))*10)/10,
          chestFloor:Math.round(L.mev*10)/10,
          warns:hits.map(x=>x.name+': '+x.now+'→'+x.after+' vs '+x.mev)};
}));

console.log('\nAND IT SHOWS IN THE SHEET');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const mu = Object.keys(MUSCLES).find(k=>{
    const ents=planEntriesForMuscle(k); if(!ents.length) return false;
    const low=ents.slice().sort((a,b)=>a.frac-b.frac)[0];
    return fixCandidates(k, ents.map(x=>x.e.name)).some(c=>c.frac>low.frac);
  });
  const idx=(A.weak||[]).findIndex(x=>x.muscle===mu);
  if(idx<0) return 'that muscle is not currently a finding';
  openWeakPoint(idx);
  const own=document.querySelector('#wdOwn'); if(!own) return 'no own-fix button for this finding';
  own.click();
  const m=document.getElementById('modal');
  m.querySelector('[data-fxm="swap"]').click();
  const t=m.querySelector('[data-fxswt]'); if(!t) return 'no candidates in sheet';
  t.click();
  const warn=[...m.querySelectorAll('.sub')].map(x=>x.textContent.trim()).find(x=>/also takes/.test(x));
  return {readout:m.querySelector('.fx-say').textContent.trim(),
          warning: warn || '(none — nothing else drops below its floor)',
          applyStillOffered: !m.querySelector('#fxApply').disabled};
}));
console.log('\nerrors:', errs);
await b.close();
