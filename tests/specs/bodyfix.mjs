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

const findWeak = () => p.evaluate(()=>{
  const A=bodyAnalysis();
  // a shortfall against a REAL floor, and one the app knows movements for
  const i = (A.weak||[]).findIndex(w=>{
    if(!(w.kind==='under'||w.kind==='balance'||w.kind==='none')) return false;
    const L=(A.lm&&A.lm[w.muscle])||adjustedLandmarks(A,w.muscle);
    return L && L.mev > 0 && fixCandidates(w.muscle, []).length > 0;
  });
  return i<0 ? null : {i, muscle:A.weak[i].muscle, kind:A.weak[i].kind};
});
const w = await findWeak();
console.log('a shortfall finding:', w);

console.log('\nENTRY POINT');
console.log('  ', await p.evaluate(i=>{
  openWeakPoint(i);
  return {hasOwnButton: !!document.querySelector('#wdOwn'),
          hasAppButton: !!document.querySelector('#wdApply')};
}, w.i));

console.log('\nTHE FOUR MODES + LIVE READOUT');
console.log('  ', await p.evaluate(i=>{
  document.querySelector('#wdOwn').click(); { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick();
    const _m=[...document.querySelectorAll('[data-fxm]')].filter(x=>x.dataset.fxm==='own')[0];
    if(_m) _m.onclick(); }
  const m=document.getElementById('modal');
  const modes=[...m.querySelectorAll('[data-fxm]')].map(x=>x.textContent.trim());
  const read = ()=>{ const r=m.querySelector('.fx-read');
    return r ? {tone:[...r.classList].find(c=>/^fx-(good|warn|bad)$/.test(c)),
                says:r.querySelector('.fx-say').textContent.trim(),
                nums:r.querySelector('.fx-nums').textContent.replace(/\s+/g,' ').trim()} : null; };
  return {modes, initialReadout: read()};
}, w.i));

console.log('\nADD A MOVEMENT — picking one moves the number');
console.log('  ', await p.evaluate(()=>{
  const m=document.getElementById('modal');
  const first=m.querySelector('[data-fxex]');
  const before=m.querySelector('.fx-say').textContent.trim();
  first.click();
  const after=m.querySelector('.fx-say').textContent.trim();
  const nums=m.querySelector('.fx-nums').textContent.replace(/\s+/g,' ').trim();
  // and more sets moves it again
  m.querySelector('[data-fxstep^="fxSets:up"]').click();
  m.querySelector('[data-fxstep^="fxSets:up"]').click();
  return {chose:first.querySelector('b').textContent, before, after,
          nums, afterMoreSets:m.querySelector('.fx-say').textContent.trim(),
          applyEnabled: !m.querySelector('#fxApply').disabled};
}));

console.log('\nAPPLY — it lands in the plan and the shortfall moves');
console.log('  ', await p.evaluate(i=>{
  const A0=bodyAnalysis(); const mu=A0.weak[i].muscle;
  const before=((A0.wk[mu]||{}).sets||0)+((A0.cyc&&A0.cyc.pending[mu])||0);
  const m=document.getElementById('modal');
  const name=m.querySelector('[data-fxex].on b').textContent;
  const day=m.querySelector('[data-fxwid].on').textContent;
  m.querySelector('#fxApply').click();
  const A1=bodyAnalysis();
  const after=((A1.wk[mu]||{}).sets||0)+((A1.cyc&&A1.cyc.pending[mu])||0);
  const inPlan=DAYS.some(d=>(S.program[d]||[]).some(e=>e.name===name));
  const logged=(S.planLog||[]).slice(-1)[0];
  return {name, day, pendingBefore:Math.round(before*10)/10, pendingAfter:Math.round(after*10)/10,
          inPlan, logKind:logged&&logged.kind, logNote:logged&&logged.note};
}, w.i));

console.log('\nTHE TARGET IS NO LONGER OFFERED HERE');
console.log('  ', await p.evaluate(i=>{
  openWeakPoint(i); document.querySelector('#wdOwn').click(); { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick();
    const _m=[...document.querySelectorAll('[data-fxm]')].filter(x=>x.dataset.fxm==='own')[0];
    if(_m) _m.onclick(); }
  const m=document.getElementById('modal');
  return {modes:[...m.querySelectorAll('[data-fxm]')].map(x=>x.textContent.trim()),
          noTargetMode:!m.querySelector('[data-fxm="target"]'),
          noTargetTalk:!/change the target|the floor for/i.test(m.innerText)};
}, w.i));

console.log('\nerrors:', errs);
await b.close();
