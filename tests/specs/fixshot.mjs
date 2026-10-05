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
console.log('weak points:', JSON.stringify(weak));
if(!weak.length){ console.log('NO WEAK POINTS'); await b.close(); process.exit(0); }
// the sheet as it opens: problem, recommendation, one button
await p.evaluate(()=>{ FIX=null; openOwnFix(0); });
await p.waitForTimeout(500);
console.log('===== AS IT OPENS =====');
console.log(await p.evaluate(()=>document.getElementById('modal').innerText));
await p.screenshot({path:D+'fix-open.png'});
console.log('\nrecommend button:', await p.evaluate(()=>!!(document.getElementById('fxSee')||document.getElementById('fxRecGo'))));
console.log('modes hidden until asked:', await p.evaluate(()=>!document.querySelector('[data-fxm]')));
// open the fold
await p.evaluate(()=>{
  /* Page one no longer carries the fold: "Choose it all myself" is the way to the panel. */
  const c=document.querySelector('[data-fxalt="custom"]'); if(c) c.click();
  const o=document.getElementById('fxOpen');
  if(o && !document.querySelector('[data-fxm]')) o.onclick();
});
await p.waitForTimeout(450);
console.log('\n===== FOLD OPEN =====');
console.log(await p.evaluate(()=>document.getElementById('modal').innerText.slice(0,1400)));
await p.screenshot({path:D+'fix-fold.png'});
for(const mode of ["spread","own","swap"]){
  await p.evaluate(m=>{ const b=[...document.querySelectorAll('[data-fxm]')].filter(x=>x.dataset.fxm===m)[0]; b.onclick(); }, mode);
  await p.waitForTimeout(400);
  const t = await p.evaluate(()=>document.getElementById('modal').innerText);
  console.log('\n===== ' + mode + ' =====');
  console.log(t.slice(t.indexOf('Or do it another way'), t.indexOf('Or do it another way')+750));
  await p.screenshot({path:D+'fix-'+mode+'.png'});
}
// pressing "Do this" writes the plan
console.log('\n=== DO THIS ===');
await p.evaluate(()=>{ FIX=null; openOwnFix(0); });
await p.waitForTimeout(400);
const before = await p.evaluate(()=> planEntriesForMuscle("chest").map(x=>x.wid+":"+x.e.name+":"+x.e.sets));
await p.evaluate(()=>(function(){const s=document.getElementById('fxSee');if(s){s.click(); const d=document.getElementById('fxDo'); if(d) d.click(); return;}const g=document.getElementById('fxRecGo'); if(g) g.onclick();})());
await p.waitForTimeout(600);
const after = await p.evaluate(()=> planEntriesForMuscle("chest").map(x=>x.wid+":"+x.e.name+":"+x.e.sets));
console.log('before:', before.join(' | '));
console.log('after :', after.join(' | '));
console.log('changed:', JSON.stringify(before)!==JSON.stringify(after));
console.log('sheet closed:', await p.evaluate(()=>!document.getElementById('modalBg').classList.contains('show')));
console.log('\nerrors:', errs);
await b.close();
