/* The one case that still asks on a bodyweight movement: your PLAN carries a load for it.
   It must ask once and accept on the second tap, not trap you. */
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
  S.program[DAYS[0]] = [{name:"Weighted Chest Dips", sets:3, reps:"6-10", rest:150, weight:"25"}];
  save(); TAB='today'; render();
});
await p.waitForTimeout(400);
await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/start/i.test(x.innerText)&&x.offsetParent); b&&b.click(); });
await p.waitForTimeout(600);
console.log('plan carries a load:', await p.evaluate(()=>planLoadFor(S.active.entries[0])),
            '| loadNeeded:', await p.evaluate(()=>loadNeededFor(S.active.entries[0])));
const tick = async()=>{ await p.evaluate(()=>{ const t=document.querySelector('.set .chk[data-e="0"][data-s="0"]'); if(t) t.onclick(); }); await p.waitForTimeout(450); };
const state = ()=>p.evaluate(()=>({done:S.active.entries[0].sets[0].done,
  toast:([...document.querySelectorAll('#toasts .tst')].pop()||{innerText:''}).innerText.replace(/\s+/g,' ').trim()}));
await p.evaluate(()=>{ const r=document.querySelector('[data-f="reps"][data-e="0"][data-s="0"]');
  r.focus(); r.value='8'; r.dispatchEvent(new Event('input',{bubbles:true})); });
await p.waitForTimeout(200);
// clear the placeholder-fill so no weight is present at all
await p.evaluate(()=>{ const w=document.querySelector('[data-f="weight"][data-e="0"][data-s="0"]');
  if(w){ w.value=''; w.placeholder=unitWord(); } });
await tick(); console.log('first tap: ', JSON.stringify(await state()));
await tick(); console.log('second tap:', JSON.stringify(await state()));
console.log('remembered for the exercise:', await p.evaluate(()=>!!S.active.entries[0].noWeight));
await b.close();
