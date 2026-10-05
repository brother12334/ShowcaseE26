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
const w = await p.evaluate(()=>{
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=>{
    if(!(x.kind==='under'||x.kind==='balance'||x.kind==='none')) return false;
    const L=(A.lm&&A.lm[x.muscle])||adjustedLandmarks(A,x.muscle);
    return L && L.mev>0 && planEntriesForMuscle(x.muscle).length>0;
  });
  return i<0?null:{i, muscle:A.weak[i].muscle};
});
console.log('finding:', w);

console.log('\nADD SETS TO ONE MOVEMENT YOU CHOOSE');
console.log('  ', await p.evaluate(i=>{
  openWeakPoint(i); document.querySelector('#wdOwn').click(); { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick(); }
  const m=document.getElementById('modal');
  m.querySelector('[data-fxm="one"]').click();
  const opts=[...m.querySelectorAll('[data-fxpick]')].map(x=>x.querySelector('b').textContent);
  const chosen=m.querySelector('[data-fxpick].on b').textContent;
  const before=m.querySelector('.fx-say').textContent.trim();
  m.querySelector('[data-fxstep^="fxSetsOne:up"]').click();
  const after=m.querySelector('.fx-say').textContent.trim();
  const mu=bodyAnalysis().weak[i].muscle;
  const wasSets=(()=>{const e=planEntriesForMuscle(mu)[0]; return e.e.sets;})();
  m.querySelector('#fxApply').click();
  const nowSets=(()=>{const e=planEntriesForMuscle(mu).find(x=>x.e.name===chosen); return e&&e.e.sets;})();
  const log=(S.planLog||[]).slice(-1)[0];
  return {options:opts.slice(0,3), chosen, before, after, wasSets, nowSets,
          logged:log&&log.changes&&log.changes[0]};
}, w.i));

console.log('\nSWAP ONE OUT FOR A BETTER FIT');
console.log('  ', await p.evaluate(i=>{
  // a deliberately poor contributor in the plan, so there IS something better
  const mu0=bodyAnalysis().weak[i].muscle;
  const weak=Object.keys(EX_MUSCLES_C).find(k=>{const f=EX_MUSCLES_C[k][mu0]; return f>=0.34 && f<=0.45;});
  if(weak) S.program[DAYS[0]].push({name:prettyExName(weak), sets:3, reps:"8-12", weight:99});
  save();
  openWeakPoint(i); document.querySelector('#wdOwn').click(); { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick(); }
  const m=document.getElementById('modal');
  m.querySelector('[data-fxm="swap"]').click();
  const outs=[...m.querySelectorAll('[data-fxswf]')].map(x=>x.querySelector('b').textContent);
  const ins=[...m.querySelectorAll('[data-fxswt]')].map(x=>x.querySelector('b').textContent);
  if(!ins.length) return 'nothing hits it harder than what is already in the plan';
  const before=m.querySelector('.fx-say').textContent.trim();
  const applyOffBefore = m.querySelector('#fxApply').disabled;
  m.querySelector('[data-fxswt]').click();
  const after=m.querySelector('.fx-say').textContent.trim();
  const from=m.querySelector('[data-fxswf].on b').textContent;
  const to=m.querySelector('[data-fxswt].on b').textContent;
  const setsBefore=(()=>{const e=planEntriesForMuscle(bodyAnalysis().weak[i].muscle).find(x=>x.e.name===from); return e&&e.e.sets;})();
  m.querySelector('#fxApply').click();
  const gone=!DAYS.some(d=>(S.program[d]||[]).some(e=>e.name===from));
  const there=DAYS.map(d=>(S.program[d]||[]).find(e=>e.name===to)).find(Boolean);
  const log=(S.planLog||[]).slice(-1)[0];
  return {outs:outs.slice(0,3), insTop:ins.slice(0,3), applyDisabledBeforePicking:applyOffBefore,
          before, after, from, to, setsBefore, setsKept:there&&there.sets,
          oldGone:gone, loadCleared: there && there.weight === undefined,
          logKind:log&&log.kind};
}, w.i));

console.log('\nerrors:', errs);
await b.close();
