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
  let i=0;
  for(let d=16; d>=1; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]).slice(0,3);
    S.sessions.push({id:"s"+d, date:dayStr(Date.now()-d*86400e3), workoutId:wid,
      startedAt:Date.now()-d*86400e3, finishedAt:Date.now()-d*86400e3+3e6, feel:3,
      entries: prog.map((e,k)=>({name:e.name, sets:[0,1].map(()=>({weight:String(100+k*10), reps:"10", rpe:"8", done:true, rest:120}))}))}); }
  save();
});

console.log('1 · GONE FROM FIX IT YOUR WAY');
console.log('  ', await p.evaluate(()=>{
  goTab('body'); render();
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=>x.kind==='under'||x.kind==='balance'||x.kind==='none');
  openWeakPoint(i);
  const own=document.querySelector('#wdOwn'); if(!own) return 'no own-fix on this finding';
  own.click();
  const m=document.getElementById('modal');
  const modes=[...m.querySelectorAll('[data-fxm]')].map(x=>x.textContent.trim());
  const mentionsTarget=/change the target|the floor for/i.test(m.innerText);
  hideModal();
  return {modes, anyTargetTalk:mentionsTarget};
}));

console.log('\n2 · THE SETTINGS SCREEN');
console.log('  ', await p.evaluate(()=>{
  TAB='sync'; SET_PAGE='targets'; render();
  const rows=[...document.querySelectorAll('.tg-row')];
  const areas=[...document.querySelectorAll('.tg-area')].map(x=>x.textContent);
  const g=setGroups().find(x=>x.k==='targets');
  return {row:{title:g.title, val:g.val}, areas, muscleRows:rows.length,
          allGroups: rows.length === Object.keys(GROUPS).length,
          firstRow: rows[0] && rows[0].textContent.replace(/\s+/g,' ').trim()};
}));

console.log('\n3 · THE ALL-AT-ONCE DIAL MOVES EVERY GROUP');
console.log('  ', await p.evaluate(()=>{
  const before={}; GKEYS.slice(0,4).forEach(g=> before[g]=r1(adjustedLandmarks(bodyAnalysis(),g).mev));
  S.lmScale = 0.8; save(); render();          // the dial's own drag is covered in dial.mjs
  const after={}; GKEYS.slice(0,4).forEach(g=> after[g]=r1(adjustedLandmarks(bodyAnalysis(),g).mev));
  return {scale:Math.round(lmScale()*100)+'%', before, after,
          rowVal:setGroups().find(x=>x.k==='targets').val,
          allMoved: GKEYS.slice(0,4).every(g=> after[g] < before[g])};
}));

console.log('\n4 · ONE MUSCLE ON ITS OWN, ON TOP OF THE SCALE');
console.log('  ', await p.evaluate(()=>{
  document.querySelector('[data-tgopen="chest"]').click();
  const shown=document.querySelector('.tg-row.is-open .fx-step b').textContent;
  for(let k=0;k<3;k++) document.querySelector('[data-tgstep="chest:mev:up"]').click();
  const L=adjustedLandmarks(bodyAnalysis(),'chest');
  const otherBefore=r1(adjustedLandmarks(bodyAnalysis(),'lats').mev);
  return {openedAt:shown, chestFloorNow:r1(L.mev), stored:S.lmFloor&&S.lmFloor.chest,
          orderKept:L.mev<=L.mav&&L.mav<=L.mrv,
          latsUntouched:otherBefore,
          marked:!!document.querySelector('.tg-row.is-mine'),
          rowVal:setGroups().find(x=>x.k==='targets').val,
          labelled:(L.why||[]).map(x=>x.k).filter(k=>/Your/.test(k))};
}));

console.log('\n5 · PUTTING IT BACK');
console.log('  ', await p.evaluate(()=>{
  const wasChest=r1(adjustedLandmarks(bodyAnalysis(),'chest').mev);
  document.querySelector('[data-tgclear="chest"]').click();
  const back=r1(adjustedLandmarks(bodyAnalysis(),'chest').mev);
  document.querySelector('#tgScaleReset').click();
  const published=r1(adjustedLandmarks(bodyAnalysis(),'chest').mev);
  return {yours:wasChest, afterClearingChest:back, afterResettingScale:published,
          scale:Math.round(lmScale()*100)+'%', floorsLeft:Object.keys(S.lmFloor||{}).length,
          rowVal:setGroups().find(x=>x.k==='targets').val};
}));

console.log('\n6 · IT IS ALL IN THE PLAN HISTORY');
console.log('  ', await p.evaluate(()=> (S.planLog||[]).filter(c=>c.kind==='rule')
  .map(c=> c.changes[0]).slice(-6)));

console.log('\n6b · A GROUP WITH NO PUBLISHED FLOOR');
console.log('  ', await p.evaluate(()=>{
  TAB='sync'; SET_PAGE='targets'; TG_OPEN=null; render();
  const zero=GKEYS.find(g=> !(adjustedLandmarks(bodyAnalysis(),g).mev > 0));
  if(!zero) return 'every group has a floor in this profile';
  const row=[...document.querySelectorAll('.tg-row')].find(r=>r.textContent.includes(gName(zero)));
  const before=row.textContent.replace(/\s+/g,' ').trim();
  document.querySelector('[data-tgopen="'+zero+'"]').click();
  const says=document.querySelector('.tg-row.is-open .set-says').textContent.replace(/\s+/g,' ').trim();
  document.querySelector('[data-tgstep="'+zero+':mev:up"]').click();
  const after=r1(adjustedLandmarks(bodyAnalysis(),zero).mev);
  return {group:gName(zero), rowRead:before, opensWith:says.slice(0,90)+'…', afterOnePress:after};
}));

console.log('\n7 · NO OVERFLOW');
for(const w of [320,390,430]){
  await p.setViewportSize({width:w, height:900});
  await p.evaluate(()=>{ TAB='sync'; SET_PAGE='targets'; TG_OPEN='chest'; render(); });
  console.log('  ', w+'px', await p.evaluate(()=> ({
    overflow: document.documentElement.scrollWidth > window.innerWidth+1 })));
}
await p.setViewportSize({width:390, height:900});
await p.evaluate(()=>{ TAB='sync'; SET_PAGE='targets'; TG_OPEN='chest'; render(); });
await p.waitForTimeout(200);
await (await p.$('#app')).screenshot({path:D+'targets.png'});
console.log('\nerrors:', errs);
await b.close();
