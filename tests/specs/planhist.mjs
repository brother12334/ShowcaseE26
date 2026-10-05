import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const D=shotDir();
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
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
  S.tourDone=true; S.sleepAsked=todayStr();
  S.prefs=Object.assign({},S.prefs,{sleepPrompt:false,barMode:"total",barWeight:45});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const DAY=86400e3, now=Date.now();
  for(let k=20;k>=1;k-=2){
    const wid=ROTATION[k%ROTATION.length];
    const s2={id:"s"+k, workoutId:wid, date:new Date(now-k*DAY).toLocaleDateString("en-CA"),
      startedAt:now-k*DAY, finishedAt:now-k*DAY+3600e3, feel:4,
      entries:(S.program[wid]||[]).slice(0,4).map(e=>({name:e.name, reps:e.reps, barAdd:45,
        sets:[0,1].map(()=>({weight:"110",reps:"12",rpe:"8",done:true}))}))};
    sweepSessionPRs(s2); s2.quality=scoreWorkout(s2); S.sessions.push(s2);
  }
  save(); TAB="body"; render();
});
await p.waitForTimeout(700);
const weak = await p.evaluate(()=> (bodyAnalysis().weak||[]).map(w=>({muscle:w.muscle, kind:w.kind})));
const plan = ()=> p.evaluate(()=> DAYS.flatMap(d=> (S.program[d]||[]).map(e=> d+":"+e.name+":"+e.sets+":"+e.reps)));

console.log('1 · ACCEPT A FINDING FROM THE BODY TAB');
const before = await plan();
await p.evaluate(()=>{ FIX=null; openOwnFix(0); });
await p.waitForTimeout(400);
await p.evaluate(()=>{ (function(){const s=document.getElementById('fxSee');if(s){s.click(); const d=document.getElementById('fxDo'); if(d) d.click(); return;}const g=document.getElementById('fxRecGo'); if(g) g.onclick();})(); hideModal(); });
await p.waitForTimeout(500);
const after = await plan();
console.log('   changed rows:', JSON.stringify(after.filter((x,i)=> x!==before[i])));
console.log('   log has a snapshot:', await p.evaluate(()=>{
  const c=(S.planLog||[]).slice(-1)[0]; return !!(c && c.undo && c.undo.length); }));

console.log('\n2 · IT IS LISTED, WITH A WAY BACK');
await p.evaluate(()=>{ TAB="program"; render(); });
await p.waitForTimeout(400);
console.log('   entry point:', await p.evaluate(()=>{const b=document.getElementById('planHistBtn'); return b? b.textContent.replace(/\s+/g,' ').trim() : 'MISSING';}));
await p.evaluate(()=>openPlanHistory());
await p.waitForTimeout(400);
console.log(await p.evaluate(()=>document.getElementById('modal').innerText));
await p.screenshot({path:D+'planhist.png'});

console.log('\n3 · PUT IT BACK');
await p.evaluate(()=>document.querySelector('#modal [data-planrevert]').onclick());
await p.waitForTimeout(600);
const back = await plan();
console.log('   plan restored exactly:', JSON.stringify(back) === JSON.stringify(before));
console.log('   marked done:', await p.evaluate(()=>(S.planLog||[]).some(c=>c.reverted)));
console.log('   revert is itself logged:', await p.evaluate(()=>(S.planLog||[]).slice(-1)[0].kind));

console.log('\n4 · AND CANNOT BE DONE TWICE');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const c=(S.planLog||[]).find(x=>x.reverted);
  return planRevert(c.at);
}), null, 0));

console.log('\n5 · A NEW MOVEMENT IS REMOVED AGAIN, NOT LEFT BEHIND');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const wid=DAYS[0], n0=(S.program[wid]||[]).length;
  FIX={idx:0, mode:"own", ex:"Cable Crossover", sets:3, wid};
  applyOwnFix(0);
  const added=(S.program[wid]||[]).length;
  const c=(S.planLog||[]).filter(x=>x.kind==="added").slice(-1)[0];
  const r=planRevert(c.at);
  return {before:n0, afterAdd:added, afterRevert:(S.program[wid]||[]).length, r};
}), null, 0));

console.log('\n6 · A SWAP PUTS THE OLD MOVEMENT AND ITS LOAD BACK');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const A=bodyAnalysis(), m=A.weak[0].muscle;
  const x=planEntriesForMuscle(m).slice().sort((a,b)=>a.frac-b.frac)[0];
  const e=S.program[x.wid][x.i]; e.weight=95;
  const was={name:e.name, weight:e.weight, sets:e.sets};
  FIX={idx:0, mode:"swap", swapFrom:0, swapTo:"Chest Dip"};
  applyOwnFix(0);
  const now={name:S.program[x.wid][x.i].name, weight:S.program[x.wid][x.i].weight};
  const c=(S.planLog||[]).filter(y=>y.kind==="swapped").slice(-1)[0];
  planRevert(c.at);
  const back={name:S.program[x.wid][x.i].name, weight:S.program[x.wid][x.i].weight, sets:S.program[x.wid][x.i].sets};
  return {was, afterSwap:now, afterRevert:back, same: JSON.stringify(was)===JSON.stringify(back)};
}), null, 0));
console.log('\nerrors:', errs);
await b.close();
