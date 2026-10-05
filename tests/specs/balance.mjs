import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>{errs.push(e.message); console.log('PAGEERR:', e.message);}); p.on('dialog',d=>d.accept());
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
  save();
});

/* pull-heavy: lots of rows, a little pressing — the shape in the screenshots */
const seed = ({press, pull}) => p.evaluate(({press, pull})=>{
  S.sessions=[]; S.planLog=[]; delete S.lmFloor; delete S.lmScale;
  const mk = (name, sets) => ({name, sets: Array.from({length:sets},()=>({weight:"100", reps:"10", rpe:"8", done:true, rest:120}))});
  for(let d=6; d>=0; d--){
    const t=Date.now()-d*86400e3;
    S.sessions.push({id:"s"+d, date:dayStr(t), workoutId:ROTATION[0], startedAt:t, finishedAt:t+3e6, feel:3,
      entries:[mk("Barbell Bench Press", press), mk("Barbell Row", pull)]});
  }
  save();
  const A=bodyAnalysis();
  const w=(A.weak||[]).find(x=>x.kind==='balance');
  return w ? {found:true, muscle:w.muscle, title:w.title, act:w.act, why:w.why} : {found:false};
}, {press, pull});

console.log('1 · PRESSING BEHIND, AND IT HAS ROOM — should say ADD');
console.log('  ', await seed({press:1, pull:4}));

console.log('\n2 · PRESSING BEHIND, BUT ALREADY AT ITS CEILING — no finding at all now');
console.log('   (it used to offer to cut the pulling; a ratio never asks you to do less');
console.log('    of something that is working, so with nowhere to add there is nothing to say)');
console.log('  ', await seed({press:5, pull:14}));

/* Case 3 needs a finding to open a panel for, and case 2 deliberately leaves none.
   Back to the shape from case 1: pressing behind, with room to add. */
await seed({press:1, pull:4});
console.log('\n3 · THE PANEL MEASURES THE RATIO, NOT THE FLOOR');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=>x.kind==='balance');
  if(i<0) return 'no balance finding';
  goTab('body'); render();
  openWeakPoint(i);
  const own=document.querySelector('#wdOwn'); if(!own) return 'no own-fix button';
  own.click(); { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick();
    const _m=[...document.querySelectorAll('[data-fxm]')].filter(x=>x.dataset.fxm==='own')[0];
    if(_m) _m.onclick(); }
  const m=document.getElementById('modal');
  const first=m.querySelector('[data-fxex]'); if(first) first.click();
  const r=m.querySelector('.fx-read');
  if(!r) return {noReadout:true, bodyHTML:(m.querySelector('#fxBody')||{}).innerHTML ? 'has body' : 'EMPTY BODY',
                 modalText:m.innerText.slice(0,120)};
  return {ratioLine:r.querySelector('.fx-ratio') ? r.querySelector('.fx-ratio').textContent.trim() : '(none)',
          verdict:r.querySelector('.fx-say').textContent.trim(),
          setsLine:[...r.querySelectorAll('.fx-nums')].pop().textContent.replace(/\s+/g,' ').trim(),
          basis:r.querySelector('.fx-made') ? r.querySelector('.fx-made').textContent.replace(/\s+/g,' ').trim() : '(no queued sets)',
          tone:[...r.classList].find(c=>/^fx-(good|warn|bad)$/.test(c))};
}));

console.log('\n   adding more moves the ratio:');
console.log('  ', await p.evaluate(()=>{
  const m=document.getElementById('modal');
  for(let k=0;k<5;k++) m.querySelector('[data-fxstep^="fxSets:up"]').click();
  const r=m.querySelector('.fx-read');
  return {ratio:r.querySelector('.fx-ratio').textContent.trim(),
          verdict:r.querySelector('.fx-say').textContent.trim(),
          tone:[...r.classList].find(c=>/^fx-(good|warn|bad)$/.test(c))};
}));

console.log('\n3b · ENOUGH SETS ACTUALLY BRINGS IT LEVEL');
console.log('  ', await p.evaluate(()=>{
  const m=document.getElementById('modal');
  // push the stepper to its ceiling, then read the ratio
  for(let k=0;k<20;k++){ const b2=m.querySelector('[data-fxstep^="fxSets:up"]'); if(b2) b2.click(); }
  const r=m.querySelector('.fx-read');
  return {sets:m.querySelector('.fx-step b').textContent,
          ratio:r.querySelector('.fx-ratio').textContent.trim(),
          verdict:r.querySelector('.fx-say').textContent.trim()};
}));

console.log('\n3c · A MILD IMBALANCE THAT ONE MOVEMENT CAN FIX');
console.log('  ', await seed({press:2, pull:3}));
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=>x.kind==='balance');
  if(i<0) return 'no balance finding';
  goTab('body'); render(); openWeakPoint(i);
  { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick();
    const _m=[...document.querySelectorAll('[data-fxm]')].filter(x=>x.dataset.fxm==='own')[0];
    if(_m) _m.onclick(); }
  const own=document.querySelector('#wdOwn'); if(!own) return 'no own-fix';
  own.click();
  { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick();
    const _m=[...document.querySelectorAll('[data-fxm]')].filter(x=>x.dataset.fxm==='own')[0];
    if(_m) _m.onclick(); }
  const m=document.getElementById('modal');
  m.querySelector('[data-fxex]').click();
  const read=()=>{ const r=m.querySelector('.fx-read');
    return {ratio:r.querySelector('.fx-ratio').textContent.trim(),
            says:r.querySelector('.fx-say').textContent.trim(),
            tone:[...r.classList].find(c=>/^fx-(good|warn|bad)$/.test(c))}; };
  const before=read();
  for(let k=0;k<5;k++) m.querySelector('[data-fxstep^="fxSets:up"]').click();
  return {at3sets:before, atMoreSets:read()};
}));

console.log('\n4 · A NON-BALANCE FINDING IS UNCHANGED (still judged on the floor)');
console.log('  ', await p.evaluate(()=>{
  hideModal();
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=>x.kind==='under');
  if(i<0) return 'no under finding in this profile';
  openWeakPoint(i);
  const own=document.querySelector('#wdOwn'); if(!own) return 'no own-fix button';
  own.click();
  { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick();
    const _m=[...document.querySelectorAll('[data-fxm]')].filter(x=>x.dataset.fxm==='own')[0];
    if(_m) _m.onclick(); }
  const r=document.querySelector('.fx-read');
  return {noRatioLine:!r.querySelector('.fx-ratio'), says:r.querySelector('.fx-say').textContent.trim()};
}));

console.log('\nerrors:', errs);
await b.close();
