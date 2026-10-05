import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const D=shotDir();
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
  let i=0;
  for(let d=30; d>=1; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]).slice(0,2);
    S.sessions.push({id:"s"+d, date:dayStr(Date.now()-d*86400e3), workoutId:wid,
      startedAt:Date.now()-d*86400e3, finishedAt:Date.now()-d*86400e3+3e6, feel:3,
      entries: prog.map((e,k)=>({name:e.name, sets:[0].map(()=>({weight:"100", reps:"10", rpe:"8", done:true, rest:120}))}))}); }
  save(); goTab('body'); render();
});

const open = () => p.evaluate(()=>{
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=>
    (x.kind==='under'||x.kind==='balance'||x.kind==='none')
    && fixCandidates(x.muscle, []).length > 2
    && planEntriesForMuscle(x.muscle).length > 0);
  if(i<0) return null;
  goTab('body'); render(); openWeakPoint(i);
  const own=document.querySelector('#wdOwn'); if(!own) return null;
  own.click(); { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick(); }
  document.querySelector('[data-fxm="spread"]').click();
  return {muscle: A.weak[i].muscle};
});
console.log('opened on:', await open());

console.log('\n1 · THE APP’S CHOICE IS THE DEFAULT');
console.log('  ', await p.evaluate(()=>{
  const m=document.getElementById('modal');
  return {selected: m.querySelector('[data-fxspex].on b').textContent,
          recommendations: [...m.querySelectorAll('[data-fxspex]')].slice(1,4)
            .map(x=>x.textContent.replace(/\s+/g,' ').trim()),
          dayPickerHidden: !m.querySelector('[data-fxspday]'),
          plan: [...m.querySelectorAll('.fx-plan div')].map(x=>x.textContent.trim())};
}));

console.log('\n2 · PICK A MOVEMENT — THE DAYS APPEAR, WITH THE ONES THAT FIT MARKED');
console.log('  ', await p.evaluate(()=>{
  const m=document.getElementById('modal');
  m.querySelectorAll('[data-fxspex]')[1].click();
  const days=[...m.querySelectorAll('[data-fxspday]')].map(x=>({
    day:x.textContent.replace(/[^A-Za-z ]/g,'').trim(), fits:x.classList.contains('fx-fits')}));
  return {chose: m.querySelector('[data-fxspex].on b').textContent,
          days, says: [...m.querySelectorAll('.set-says')].pop().textContent.replace(/\s+/g,' ').trim(),
          preselected: [...m.querySelectorAll('[data-fxspday].on')].map(x=>x.textContent.replace(/[^A-Za-z ]/g,'').trim()),
          perDayStepper: !!m.querySelector('[data-fxstep^="fxSpSets:"]'),
          totalStepperGone: !m.querySelector('[data-fxstep^="fxSpread:"]')};
}));

console.log('\n3 · PICK DAYS — IT PLANS THEM IN AND SAYS WHAT IT DOES');
console.log('  ', await p.evaluate(()=>{
  const m=document.getElementById('modal');
  /* The suggested days arrive already ticked, so "pick days" means adding the ones that
     fit and are not on yet — clicking a ticked one would take it back off. */
  const fit=[...m.querySelectorAll('[data-fxspday].fx-fits')].filter(x=>!x.classList.contains('on'));
  fit.slice(0,2).forEach(x=>x.click());
  return {picked:[...m.querySelectorAll('[data-fxspday].on')].map(x=>x.textContent.replace(/[^A-Za-z ]/g,'').trim()),
          plan:[...m.querySelectorAll('.fx-plan div')].map(x=>x.textContent.trim()),
          readout:[...m.querySelectorAll('.fx-nums')].pop().textContent.replace(/\s+/g,' ').trim(),
          verdict:m.querySelector('.fx-read .fx-say').textContent.trim()};
}));

console.log('\n4 · SETS PER DAY MOVES THE NUMBER — AND IS THE ONLY AMOUNT ASKED FOR');
console.log('  ', await p.evaluate(()=>{
  const m=document.getElementById('modal');
  const read=()=>({plan:[...m.querySelectorAll('.fx-plan div')].map(x=>x.textContent.trim()),
                   readout:[...m.querySelectorAll('.fx-nums')].pop().textContent.replace(/\s+/g,' ').trim()});
  const before=read();
  m.querySelector('[data-fxstep^="fxSpSets:down"]').click();
  const fewer=read();
  m.querySelector('[data-fxstep^="fxSpSets:up"]').click();
  return {before, fewer, back:read(),
          onlyOneAmountOnScreen: m.querySelectorAll('[data-fxstep^="fxSpSets:"],[data-fxstep^="fxSpread:"]').length === 2};
}));

console.log('\n5 · A DAY THAT DOES NOT SUIT IT IS ALLOWED, AND SAID SO');
console.log('  ', await p.evaluate(()=>{
  const m=document.getElementById('modal');
  const poor=[...m.querySelectorAll('[data-fxspday]')].find(x=>!x.classList.contains('fx-fits'));
  if(!poor) return 'every day suits it';
  poor.click();
  const warn=[...m.querySelectorAll('.sub')].map(x=>x.textContent.replace(/\s+/g,' ').trim())
    .find(x=>/trains? nothing this movement uses/.test(x));
  return {warned: warn || 'NO WARNING', stillPlanned:
    [...m.querySelectorAll('.fx-plan div')].map(x=>x.textContent.trim())};
}));

console.log('\n6 · APPLYING PUTS IT ON EVERY DAY CHOSEN');
console.log('  ', await p.evaluate(()=>{
  const m=document.getElementById('modal');
  const rows=[...m.querySelectorAll('.fx-plan div')].map(x=>x.textContent.trim());
  m.querySelector('#fxApply').click();
  const check=rows.filter(r=>/new,/.test(r)).map(r=>{
    const mm=/^(.+?) · (.+?): new, (\d+) set/.exec(r);
    const wid=DAYS.find(d=>widName(d)===mm[1]);
    const e=(S.program[wid]||[]).find(x=>x.name===mm[2]);
    return mm[1]+': '+(e ? 'added with '+e.sets+' sets' : 'MISSING');
  });
  return {newMovements:check, logged:(S.planLog||[]).slice(-1)[0].changes};
}));

console.log('\nerrors:', errs);
await b.close();
