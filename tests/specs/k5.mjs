import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:3});
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
  const N="Bayesian Cable Curl";
  S.program[DAYS[0]]=[{name:N, sets:3, reps:"10-16", weight:"35", rest:90,
    rebuild:{from:10, top:16, weight:35, prevWeight:32.5, at:Date.now()-86400e3}}];
  S.sessions=[{id:"s1", date:dayStr(Date.now()-3*86400e3), workoutId:DAYS[0],
    startedAt:Date.now()-3*86400e3, finishedAt:Date.now()-3*86400e3+3e6,
    entries:[{name:N, reps:"10-16", sets:[{weight:"32.5",reps:"16",rpe:"8",done:true}]}]}];
  save(); TAB='today'; render();
});
await p.waitForTimeout(400);
for(let i=0;i<10;i++){
  const done = await p.evaluate(()=>!!document.querySelector('.set'));
  if(done) break;
  await p.evaluate(()=>{
    const pick=[...document.querySelectorAll('button')].filter(x=>x.offsetParent);
    const go=pick.find(x=>/^(start|let's go|next|begin|skip|done)/i.test(x.innerText.trim()));
    if(go) go.click(); else if(pick.length) pick[pick.length-1].click();
  });
  await p.waitForTimeout(550);
}
console.log('rows with the old per-set sentence:', await p.evaluate(()=>
  [...document.querySelectorAll('.set-tag')].filter(x=>/rebuild from/i.test(x.innerText)).length));
console.log('rep-box captions               :', await p.evaluate(()=>
  [...document.querySelectorAll('.reps-aim')].map(x=>x.textContent).join(', ') || '(none)'));
console.log('the one explainer line         :', await p.evaluate(()=>{
  const el=document.querySelector('.rb-line'); return el? el.innerText.replace(/\s+/g,' ').trim() : '(none)'; }));
console.log('explainer count (must be 1)    :', await p.evaluate(()=>document.querySelectorAll('.rb-line').length));
console.log('\nrow heights (must all match):', await p.evaluate(()=>
  [...document.querySelectorAll('.set')].map(x=>Math.round(x.getBoundingClientRect().height)).join(', ')));
await p.evaluate(()=>{ const el=document.querySelector('.rb-line'); if(el) el.scrollIntoView({block:'center'}); });
await p.waitForTimeout(300);
await p.screenshot({path:shot('k5.png')});
await b.close();
