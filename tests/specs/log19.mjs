import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}, deviceScaleFactor:2});
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
  S.tourDone=true; S.geo='off'; save();
  goTab('today'); render(); startWorkout(ROTATION[0]); render();
});
console.log('workout screen:', await p.evaluate(()=>({
  inputs:document.querySelectorAll('#app input').length,
  setRows:document.querySelectorAll('#app .set').length
})));
// actually log a set
console.log('log a set:', await p.evaluate(()=>{
  const w=document.querySelector('input[data-f="weight"]'), r=document.querySelector('input[data-f="reps"]');
  if(!w||!r) return 'no weight/rep inputs';
  w.value='135'; w.dispatchEvent(new Event('change',{bubbles:true}));
  r.value='8';   r.dispatchEvent(new Event('change',{bubbles:true}));
  document.querySelector('.chk[data-f="done"]').click();
  const e=S.active.entries[0];
  return {weight:e.sets[0].weight, reps:e.sets[0].reps, done:e.sets[0].done};
}));
console.log('errors:', errs);
await b.close();
