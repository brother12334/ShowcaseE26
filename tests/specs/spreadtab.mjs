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
  DAYS.forEach(w=>{ (S.program[w]||[]).forEach(e=>{ const mm=musclesFor(e.name)||{}; if(mm.chest) e.sets=1; }); });
  let i=0;
  for(let d=20; d>=2; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]);
    S.sessions.push({id:"s"+d,date:dayStr(Date.now()-d*86400e3),workoutId:wid,
      startedAt:Date.now()-d*86400e3,finishedAt:Date.now()-d*86400e3+3300e3,feel:3,
      entries:prog.map((e,k)=>({name:e.name,sets:Array.from({length:e.sets||3},()=>({weight:String(100+k*10),reps:"9",rpe:"8",done:true,rest:120}))}))}); }
  save(); TAB='body'; render();
});
await p.waitForTimeout(400);
const idx = await p.evaluate(()=>bodyAnalysis().weak.findIndex(w=>w.muscle==='chest'));
await p.evaluate(i=>{FIX=null; openOwnFix(i); { {const _c=document.querySelector('[data-fxalt="custom"]'); if(_c) _c.click();} const _o=document.getElementById('fxOpen'); if(_o && !document.querySelector('[data-fxm]')) _o.onclick(); }}, idx);
await p.waitForTimeout(300);
await p.evaluate(()=>{ [...document.querySelectorAll('[data-fxm]')].find(x=>x.dataset.fxm==='spread').click(); });
await p.waitForTimeout(400);
const t = await p.evaluate(()=>document.querySelector('#fxBody').innerText);
console.log(t.slice(t.toUpperCase().indexOf('A MOVEMENT OF YOUR OWN')).slice(0,520));
await p.screenshot({path:shot('spreadtab.png'),fullPage:true});
console.log('\n--- pick one of yours, on a day it is not on ---');
await p.evaluate(()=>{ document.querySelector('[data-fxspex="Barbell Bench Press"]').click(); });
await p.waitForTimeout(300);
await p.evaluate(()=>{ const d=[...document.querySelectorAll('[data-fxspday]')]; d.length&&d[d.length-1].click(); });
await p.waitForTimeout(400);
const t2 = await p.evaluate(()=>document.querySelector('#modal').innerText);
console.log(t2.slice(t2.indexOf('0.'), t2.indexOf('0.')+240) || t2.slice(-400));
await b.close();
