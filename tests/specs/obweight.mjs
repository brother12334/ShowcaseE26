import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const D=shotDir();
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open'); hideModal();
  S.splitId=DEFAULT_SPLIT; applySplit();
  startOnboarding();
  // the flow only leaves the importer once something has been imported
  OB.imported = {program:{}}; AI_IMP = null;
  obGo(OB_STEPS.indexOf("weight"));
  const f2=document.getElementById('aiFull'); if(f2){f2.hidden=true;f2.style.display='none';}
  document.body.classList.remove('ai-open'); render();
});
await p.waitForTimeout(500);
console.log('--- the step ---');
console.log(await p.evaluate(()=>{
  const w=document.querySelector('.ob-wrap');
  return w ? w.innerText : 'NO OB WRAP · app=' + document.getElementById('app').innerText.slice(0,80);
}));
await p.screenshot({path:D+'obw.png'});
console.log('default tracksWeight:', await p.evaluate(()=>tracksWeight()));
console.log('\n--- choose NO ---');
await p.evaluate(()=>document.querySelector('[data-obwt="no"]').onclick());
await p.waitForTimeout(350);
console.log('tracksWeight:', await p.evaluate(()=>tracksWeight()));
console.log('note:', await p.evaluate(()=>document.querySelector('.ob-note').innerText));
await p.evaluate(()=>{
  try{OB=null}catch(e){} document.body.classList.remove('onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.sleepAsked=todayStr();
  S.sessions=[{id:"s",workoutId:ROTATION[0],date:todayStr(),startedAt:Date.now()-3600e3,
    finishedAt:Date.now(),feel:4,entries:[{name:"Pull-Up",barAdd:0,
    sets:[{weight:"",reps:"12",rpe:"8",done:true}]}]}];
  save(); TAB="body"; render();
});
await p.waitForTimeout(500);
console.log('\n--- with weight OFF ---');
console.log('Body tab "You" section:', await p.evaluate(()=>!!document.querySelector('.nb-body')));
console.log('openBodyLog does nothing:', await p.evaluate(()=>{ openBodyLog(); return !document.querySelector('#blW'); }));
console.log('\n--- turn it back on in Settings ---');
await p.evaluate(()=>{ TAB="sync"; SET_PAGE="gym"; render(); });
await p.waitForTimeout(400);
console.log('setting present:', await p.evaluate(()=>!!document.querySelector('[data-trackw]')));
await p.evaluate(()=>document.querySelector('[data-trackw="on"]').onclick());
await p.waitForTimeout(400);
console.log('tracksWeight:', await p.evaluate(()=>tracksWeight()));
await p.evaluate(()=>{ TAB="body"; render(); });
await p.waitForTimeout(400);
console.log('Body tab "You" back:', await p.evaluate(()=>!!document.querySelector('.nb-body')));
console.log('errors:', errs);
await b.close();
