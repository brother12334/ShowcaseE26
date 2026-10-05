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
  // the default plan, plus three months of sessions so findings actually exist
  let i=0;
  for(let d=40; d>=1; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]).slice(0,3);
    S.sessions.push({id:"s"+d, date:dayStr(Date.now()-d*86400e3), workoutId:wid,
      startedAt:Date.now()-d*86400e3, finishedAt:Date.now()-d*86400e3+3e6, feel:3,
      entries: prog.map((e,k)=>({name:e.name, sets:[0,1].map(()=>({weight:String(100+k*10), reps:"10", rpe:"8", done:true, rest:120}))}))}); }
  save();
});

console.log('1 · IT DEALS BY DAY, NOT BY EXERCISE');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const before=planEntriesForMuscle('chest').map(x=> widName(x.wid)+' · '+x.e.name+' ×'+x.e.sets);
  const plan=spreadPlan(A,'chest',6);
  return {chestIsOn:[...new Set(planEntriesForMuscle('chest').map(x=>widName(x.wid)))],
          before, plan: plan ? spreadList(plan) : null,
          gained: plan && plan.gained, daysTouched: plan && plan.daysTouched};
}));

console.log('\n2 · FRACTIONS COUNT — half-chest movements deliver half a set');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const plan=spreadPlan(A,'triceps',4);   // triceps is fed at fractions by every press
  if(!plan) return 'no plan';
  const rawSets=plan.adds.reduce((t,a)=>t+(a.to-a.from),0)+(plan.newEx?plan.newEx.sets:0);
  return {rows:spreadList(plan), rawSetsAdded:rawSets, tricepSetsGained:plan.gained,
          note: rawSets > plan.gained ? 'more slots than sets-of-muscle, as it should be' : 'equal'};
}));

console.log('\n3 · A MUSCLE ON ONE DAY ONLY GETS A SECOND DAY');
console.log('  ', await p.evaluate(()=>{
  // strip chest down to a single day
  DAYS.forEach((d,i)=>{ if(i>0) S.program[d]=(S.program[d]||[]).filter(e=>!(musclesFor(e.name)||{}).chest); });
  save();
  const A=bodyAnalysis();
  const days=[...new Set(planEntriesForMuscle('chest').map(x=>x.wid))];
  const plan=spreadPlan(A,'chest',5);
  return {chestDaysBefore:days.map(widName), plan:plan&&spreadList(plan),
          freq: plan && (plan.freqBefore+' → '+plan.freqAfter+' days'),
          newMovement: plan && plan.newEx ? plan.newEx.name+' on '+widName(plan.newEx.wid) : 'none'};
}));

console.log('\n4 · NOTHING GOES PAST 6 SETS OF ONE MOVEMENT');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const plan=spreadPlan(A,'chest',30);
  if(!plan) return 'no plan';
  const over=plan.adds.filter(a=>a.to>SPREAD_MAX_PER_EX);
  return {cap:SPREAD_MAX_PER_EX, anyOverCap:over.length, tops:plan.adds.map(a=>a.to)};
}));

console.log('\n5 · IT STOPS AT THE CEILING');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const L=(A.lm&&A.lm.chest)||adjustedLandmarks(A,'chest');
  const have=((A.wk.chest||{}).sets||0)+((A.cyc&&A.cyc.pending.chest)||0);
  const plan=spreadPlan(A,'chest',40);
  return {have:r1(have), ceiling:r1(L.mrv), wouldAdd:plan?plan.gained:0,
          staysUnder: plan ? (have+plan.gained) <= L.mrv + 0.6 : true};
}));

/* A SHORTFALL THIS SPEC OWNS. Sections 6-8 need a finding of the kind spreadPlan
   answers, and leaning on whatever the default plan happens to produce made them hostage
   to which exercise fills a slot — C2 changed one and the finding vanished. So the
   shortfall is created here: half the logged chest work is removed, which puts chest
   under its floor on purpose. */
await p.evaluate(()=>{
  S.sessions.forEach((s,i)=>{ if(i%2) return;
    s.entries = (s.entries||[]).filter(e=> !((musclesFor(e.name)||{}).chest > 0.5)); });
  save();
});

console.log('\n6 · THE APP’S OWN SUGGESTION NOW USES IT');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=>x.kind==='under'||x.kind==='balance');
  if(i<0) return 'no shortfall finding';
  const fp=findingPlan(A.weak[i],A);
  return fp ? {mode:fp.mode, label:fp.label, does:fp.does.slice(0,150)+'…', list:fp.list} : 'no plan';
}));

console.log('\n7 · AND IT IS A ROUTE IN FIX IT YOUR WAY');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=>x.kind==='under'||x.kind==='balance');
  goTab('body'); render(); openWeakPoint(i);
  const own=document.querySelector('#wdOwn'); if(!own) return 'no own-fix';
  own.click(); { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick(); }
  const m=document.getElementById('modal');
  const modes=[...m.querySelectorAll('[data-fxm]')].map(x=>x.textContent.trim());
  m.querySelector('[data-fxm="spread"]').click();
  const plan=[...m.querySelectorAll('.fx-plan div')].map(x=>x.textContent.trim());
  const read=m.querySelector('.fx-read .fx-say').textContent.trim();
  m.querySelector('[data-fxstep^="fxSpread:up"]').click();
  const bigger=[...m.querySelectorAll('.fx-plan div')].map(x=>x.textContent.trim());
  return {modes, planAt3:plan, readout:read, planAt4:bigger};
}));

console.log('\n8 · APPLYING IT WRITES EVERY LINE');
console.log('  ', await p.evaluate(()=>{
  const m=document.getElementById('modal');
  const rows=[...m.querySelectorAll('.fx-plan div')].map(x=>x.textContent.trim());
  m.querySelector('#fxApply').click();
  const log=(S.planLog||[]).slice(-1)[0];
  const check=rows.map(r=>{
    const mm=/^(.+?) · (.+?): (?:(\d+) → (\d+) sets|new, (\d+) sets)$/.exec(r);
    if(!mm) return r+' :: UNPARSED';
    const wid=DAYS.find(d=>widName(d)===mm[1]);
    const e=(S.program[wid]||[]).find(x=>x.name===mm[2]);
    const want=mm[4]||mm[5];
    return mm[2]+': wanted '+want+', plan now has '+(e?e.sets:'MISSING');
  });
  return {wrote:check, logged:log&&log.changes.length+' lines', note:log&&log.note};
}));

console.log('\nerrors:', errs);
await b.close();
