/* Logging a bodyweight-rooted movement must never be blocked for want of a number —
   plural names included — while a genuinely loaded lift still asks. */
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
  S.program[DAYS[0]] = [
    {name:"Weighted Chest Dips", sets:2, reps:"6-10", rest:150},   // the one reported
    {name:"Push-Ups",            sets:2, reps:"12-20", rest:90},   // plural, plain
    {name:"Weighted Pull-Ups",   sets:2, reps:"5-8",  rest:150},
    {name:"Barbell Bench Press", sets:2, reps:"6-8",  rest:180}];  // must still ask
  save(); TAB='today'; render();
});
await p.waitForTimeout(400);
await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>/start/i.test(x.innerText)&&x.offsetParent); b&&b.click(); });
await p.waitForTimeout(600);
const errs=[];
for(const [i,name] of (await p.evaluate(()=>S.active.entries.map(e=>e.name))).entries()){
  await p.evaluate(j=>{ const r=document.querySelector('[data-f="reps"][data-e="'+j+'"][data-s="0"]');
    if(r){ r.focus(); r.value='9'; r.dispatchEvent(new Event('input',{bubbles:true})); } }, i);
  await p.waitForTimeout(150);
  await p.evaluate(j=>{ const t=document.querySelector('.set .chk[data-e="'+j+'"][data-s="0"]'); if(t) t.onclick(); }, i);
  await p.waitForTimeout(450);
  const r = await p.evaluate(j=>({
    done: S.active.entries[j].sets[0].done,
    toast: ([...document.querySelectorAll('#toasts .tst')].pop()||{innerText:''}).innerText.replace(/\s+/g,' ').trim()
  }), i);
  const loaded = /bench press/i.test(name);
  console.log((r.done?'BANKED  ':'BLOCKED ')+name.padEnd(22)+(r.toast?'  toast: '+r.toast:''));
  if(loaded && r.done) errs.push(name+' banked with no weight — it should ask');
  if(!loaded && !r.done) errs.push(name+' was blocked for want of a weight');
  // clear the rest clock so the next exercise is not gated on it
  await p.evaluate(()=>{ if(S.active) S.active.restTimer=null; render(); });
  await p.waitForTimeout(200);
}
console.log('\nerrors: '+(errs.length?JSON.stringify(errs,null,1):'[] PASS'));
await b.close();
