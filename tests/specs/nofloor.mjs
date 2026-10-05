import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900}});
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
const open = async g=>{ await p.evaluate(x=>{ if(TG_OPEN!==x) document.querySelector('[data-tgopen="'+x+'"]').click(); }, g); await p.waitForTimeout(180); };
const floor = g=>p.evaluate(x=>r1(adjustedLandmarks(bodyAnalysis(),x).mev), g);
const tap = async (g,dir)=>{ await p.evaluate(s=>{ const b=document.querySelector('[data-tgstep="'+s.replace(':', ':mev:')+'"]');
  b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); }, g+':'+dir); await p.waitForTimeout(200); };

console.log('NECK — published at no floor at all');
console.log('  starts at:', await floor('neck'), '(row reads "no floor")');
await open('neck'); await tap('neck','down');
console.log('  press DOWN from nothing:', await floor('neck'), '— nothing happens, correctly');
console.log('  S.lmFloor:', await p.evaluate(()=>JSON.stringify(S.lmFloor||{})));
await open('neck'); await tap('neck','up');
console.log('  press UP  from nothing:', await floor('neck'), '— a usable starting floor, not 0.1');
await open('neck'); await tap('neck','up');
console.log('  and tenths from there:', await floor('neck'));
await open('neck'); await tap('neck','down');
console.log('  back down a tenth:     ', await floor('neck'));
console.log('\n  is neck now a group the Body tab watches?',
  await p.evaluate(()=>{ const A=bodyAnalysis(); return 'floor '+A.lm.neck.mev+', sets '+r1(A.wk.neck.sets); }));
await b.close();
