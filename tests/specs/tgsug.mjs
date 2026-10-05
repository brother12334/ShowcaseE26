import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const D=shotDir();
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
  save();
});

/* 12 weeks of sessions for one exercise that is ~100% one muscle, with a controllable
   weekly set count and a controllable strength trend. */
const seed = (opts) => p.evaluate(({name, setsPerWeek, gainPct, weeks})=>{
  S.sessions = []; S.exNotes=[]; S.planLog=[]; delete S.lmFloor; delete S.lmSuggest; delete S.lmScale;
  const wid = ROTATION[0];
  const perSession = 2;
  const sessionsPerWeek = Math.max(1, Math.round(setsPerWeek / perSession));
  const total = weeks * sessionsPerWeek;
  for(let i = 0; i < total; i++){
    const daysAgo = Math.round((total - 1 - i) * (weeks*7) / total);
    const t = Date.now() - daysAgo*86400e3;
    const frac = i / Math.max(1, total - 1);
    const w = Math.round(100 * (1 + gainPct*frac));
    S.sessions.push({id:"s"+i, date:dayStr(t), workoutId:wid, startedAt:t, finishedAt:t+3e6, feel:3,
      entries:[{name, sets:Array.from({length:perSession},()=>({weight:String(w), reps:"8", rpe:"8", done:true, rest:120}))}]});
  }
  save();
  const A=bodyAnalysis();
  const g = Object.keys(musclesFor(name)).find(k=>musclesFor(name)[k] >= 0.9);
  const L=(A.lm&&A.lm[g])||adjustedLandmarks(A,g);
  return {muscle:g, floor:r1(L.mev), sessions:S.sessions.length};
}, opts);

const look = () => p.evaluate(()=>{
  goTab('body'); render();
  const c=document.querySelector('.tgs');
  if(!c) return null;
  return {title:c.querySelector('.tgs-t').textContent,
          why:c.querySelector('.tgs-why').textContent,
          move:c.querySelector('.tgs-move').textContent.replace(/\s+/g,' ').trim()};
});

console.log('A · UNDER THE FLOOR AND GETTING STRONGER — should propose LOWERING');
console.log('  ', await seed({name:"Barbell Bench Press", setsPerWeek:6, gainPct:0.10, weeks:12}));
console.log('  ', await look());

console.log('\nB · UNDER THE FLOOR AND GOING NOWHERE — must say NOTHING');
console.log('  (this is the compliance trap: less work, no progress, no evidence about the target)');
console.log('  ', await seed({name:"Barbell Bench Press", setsPerWeek:6, gainPct:0, weeks:12}));
console.log('  ', await look());

console.log('\nC · MEETING THE FLOOR AND FLAT — should propose RAISING');
console.log('  ', await seed({name:"Barbell Bench Press", setsPerWeek:8, gainPct:0.001, weeks:12}));
console.log('  ', await look());

console.log('\nC2 · FLAT BUT WELL PAST THE FLOOR — must say NOTHING (that is the stall finding, not a target)');
console.log('  ', await seed({name:"Barbell Bench Press", setsPerWeek:16, gainPct:0.001, weeks:12}));
console.log('  ', await look());

console.log('\nD · MEETING THE FLOOR AND GOING BACKWARDS — must say NOTHING');
console.log('  (falling strength at adequate volume is fatigue; "do more" would be the worst advice in the app)');
console.log('  ', await seed({name:"Barbell Bench Press", setsPerWeek:8, gainPct:-0.08, weeks:12}));
console.log('  ', await look());

console.log('\nE · NOT ENOUGH HISTORY — must say NOTHING');
console.log('  ', await seed({name:"Barbell Bench Press", setsPerWeek:6, gainPct:0.10, weeks:4}));
console.log('  ', await look());

console.log('\nF · ACCEPTING IT');
await seed({name:"Barbell Bench Press", setsPerWeek:6, gainPct:0.10, weeks:12});
console.log('  ', await p.evaluate(()=>{
  goTab('body'); render();
  const g=document.querySelector('[data-tgsyes]').dataset.tgsyes;
  const before=r1(adjustedLandmarks(bodyAnalysis(),g).mev);
  document.querySelector('[data-tgsyes]').click();
  const after=r1(adjustedLandmarks(bodyAnalysis(),g).mev);
  const log=(S.planLog||[]).slice(-1)[0];
  return {muscle:g, floorBefore:before, floorAfter:after, stored:S.lmFloor[g],
          gone:!document.querySelector('.tgs'),
          logged:log.changes[0], note:log.note.slice(0,64)+'…'};
}));

console.log('\nG · TURNING IT DOWN');
await seed({name:"Barbell Bench Press", setsPerWeek:6, gainPct:0.10, weeks:12});
console.log('  ', await p.evaluate(()=>{
  goTab('body'); render();
  const g=document.querySelector('[data-tgsno]').dataset.tgsno;
  document.querySelector('[data-tgsno]').click();
  return {muscle:g, cardGone:!document.querySelector('.tgs'),
          floorUntouched:!(S.lmFloor&&g in S.lmFloor),
          rememberedUntil:'~10 weeks', nothingLogged:(S.planLog||[]).length===0};
}));

console.log('\nH · A FLOOR YOU ALREADY SET IS NEVER SECOND-GUESSED');
console.log('  ', await p.evaluate(()=>{
  delete S.lmSuggest; S.lmFloor={chest:4}; save();
  goTab('body'); render();
  return {chestEvidence: tgEvidence(bodyAnalysis(),'chest'), anyCard: !!document.querySelector('.tgs')};
}));

console.log('\nerrors:', errs);
await b.close();
