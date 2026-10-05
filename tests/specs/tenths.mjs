import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.prefs=Object.assign({},S.prefs,{sleepPrompt:false}); S.sleepAsked=todayStr();
  let i=0;
  for(let d=20; d>=2; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]).slice(0,4);
    S.sessions.push({id:"s"+d,date:dayStr(Date.now()-d*86400e3),workoutId:wid,
      startedAt:Date.now()-d*86400e3,finishedAt:Date.now()-d*86400e3+3300e3,feel:3,
      entries:prog.map((e,k)=>({name:e.name,sets:[0,1,2].map(()=>({weight:String(100+k*15),reps:"9",rpe:"8",done:true,rest:120}))}))}); }
  save(); TAB='sync'; render();
});
await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('[data-setopen="targets"]').click());
await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('[data-tgopen="chest"]').click());
await p.waitForTimeout(300);
const floor = ()=>p.evaluate(()=>r1(adjustedLandmarks(bodyAnalysis(),'chest').mev));
const open = async()=>{ await p.evaluate(()=>{ if(TG_OPEN!=='chest') document.querySelector('[data-tgopen="chest"]').click(); }); await p.waitForTimeout(160); };
console.log('starting chest floor:', await floor());
console.log('\n--- single taps step a TENTH ---');
for(let k=0;k<4;k++){
  await p.evaluate(()=>{ const b=document.querySelector('[data-tgstep="chest:mev:up"]');
    b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); });
  await p.waitForTimeout(160);
  await open();
  process.stdout.write('  '+await floor());
}
console.log('\n  S.lmFloor =', await p.evaluate(()=>JSON.stringify(S.lmFloor)));
console.log('\n--- down a tenth ---');
await p.evaluate(()=>{ const b=document.querySelector('[data-tgstep="chest:mev:down"]');
  b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); });
await p.waitForTimeout(200);
console.log('  ', await floor());
console.log('\n--- holding accelerates (0.1 then 0.5 a tick) ---');
await open();
await p.evaluate(()=>{ const b=document.querySelector('[data-tgstep="chest:mev:up"]');
  b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); });
await p.waitForTimeout(1500);
console.log('  readout mid-hold (not yet written):', await p.evaluate(()=>document.querySelector('.tg-body b.num').textContent),
            '| S.lmFloor still', await p.evaluate(()=>JSON.stringify(S.lmFloor)));
await p.evaluate(()=>{ const b=document.querySelector('[data-tgstep="chest:mev:up"]');
  b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); });
await p.waitForTimeout(300);
console.log('  after release:', await floor());
console.log('\n--- typing a value ---');
await open();
await p.evaluate(()=>{ const i=document.querySelector('[data-tgtype="chest:mev"]'); i.focus(); i.value='7.3'; i.blur(); });
await p.waitForTimeout(300);
console.log('  typed 7.3 ->', await floor(), '| stored', await p.evaluate(()=>JSON.stringify(S.lmFloor)));
await open();
await p.evaluate(()=>{ const i=document.querySelector('[data-tgtype="chest:mev"]'); i.focus(); i.value='abc'; i.blur(); });
await p.waitForTimeout(300);
console.log('  typed nonsense ->', await floor(), '(unchanged)');
console.log('\n--- the Body tab reads the tenth back ---');
console.log('  ', await p.evaluate(()=>{ const A=bodyAnalysis(); const L=A.lm.chest;
  return 'floor '+L.mev+' / mav '+L.mav+' / mrv '+L.mrv+'   why: '+
    (L.why.find(x=>x.k==='Your MEV')||{}).v; }));
await open();
await p.screenshot({path:shot('tenths.png'),fullPage:false});
await b.close();
