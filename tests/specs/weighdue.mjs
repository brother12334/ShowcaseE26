import { chromium, APP_URL, shot, shotDir, appFile, fileUrl } from './_e26.mjs';
const D=shotDir();
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
const setup = async (log)=> p.evaluate(bl=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.sleepAsked=todayStr();
  S.prefs=Object.assign({},S.prefs,{sleepPrompt:false,trackWeight:true});
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.sessions=[{id:"s",workoutId:ROTATION[0],date:todayStr(),startedAt:Date.now()-3600e3,
    finishedAt:Date.now(),feel:4,entries:[{name:"Barbell Bench Press",barAdd:45,
    sets:[{weight:"135",reps:"10",rpe:"8",done:true}]}]}];
  const DAY=86400e3, now=Date.now(), d=n=>new Date(now-n*DAY).toLocaleDateString("en-CA");
  S.bodyLog={}; bl.forEach(([n,w,t,arm])=>{ S.bodyLog[d(n)] = arm ? {w,t,arm} : {w,t}; });
  WEIGH_SNOOZE=null; save(); TAB="today"; render();
}, log);

console.log('=== A WEEKLY HABIT, 3 DAYS AGO — not due ===');
await setup([[21,178,"07:05"],[14,179,"07:10"],[7,180,"07:00"],[3,180.6,"07:05"]]);
await p.waitForTimeout(400);
console.log(JSON.stringify(await p.evaluate(()=>bodyLogDue("weight"))));
console.log('today line:', await p.evaluate(()=>!!document.getElementById('weighDue')));

console.log('\n=== SAME HABIT, 9 DAYS AGO — due and late ===');
await setup([[30,178,"07:05"],[23,179,"07:10"],[16,180,"07:00"],[9,180.6,"07:05"]]);
await p.waitForTimeout(400);
console.log(JSON.stringify(await p.evaluate(()=>bodyLogDue("weight"))));
console.log('line says:', await p.evaluate(()=>{const e=document.getElementById('weighDue'); return e?e.innerText.replace(/\n/g,' | '):'NONE';}));
await p.screenshot({path:D+'wd1.png'});

console.log('\n=== A FORTNIGHTLY HABIT — learns it, not due at 9 days ===');
await setup([[42,176,"07:05"],[28,178,"07:10"],[14,180,"07:00"],[9,180.6,"07:05"]]);
await p.waitForTimeout(400);
console.log(JSON.stringify(await p.evaluate(()=>bodyLogDue("weight"))));
console.log('today line:', await p.evaluate(()=>!!document.getElementById('weighDue')));

console.log('\n=== BODY TAB ===');
await setup([[30,178,"07:05"],[23,179,"07:10"],[16,180,"07:00"],[9,180.6,"07:05",15.4]]);
await p.evaluate(()=>{ TAB="body"; render(); });
await p.waitForTimeout(500);
console.log(await p.evaluate(()=>{const e=document.querySelector('.nb-body'); return e?e.innerText.replace(/\n/g,' | '):'NONE';}));
await p.evaluate(()=>document.querySelector('.nb-body').scrollIntoView({block:'center'}));
await p.waitForTimeout(300);
await p.screenshot({path:D+'wd2.png'});

console.log('\n=== TAPE: never used, never mentioned ===');
await setup([[30,178,"07:05"],[23,179,"07:10"],[16,180,"07:00"],[9,180.6,"07:05"]]);
console.log('tape due:', JSON.stringify(await p.evaluate(()=>bodyLogDue("tape"))));

console.log('\n=== WEIGHT TRACKING OFF: silent ===');
await p.evaluate(()=>{ trainPrefs().trackWeight=false; save(); TAB="today"; render(); });
await p.waitForTimeout(400);
console.log('today line:', await p.evaluate(()=>!!document.getElementById('weighDue')),
            '· due:', await p.evaluate(()=>bodyLogDue("weight")));

console.log('\n=== logging one clears it ===');
await p.evaluate(()=>{ trainPrefs().trackWeight=true; save(); TAB="today"; render(); });
await p.waitForTimeout(300);
console.log('line before:', await p.evaluate(()=>!!document.getElementById('weighDue')));
await p.evaluate(()=>{ document.getElementById('weighDue').onclick(); });
await p.waitForTimeout(350);
await p.evaluate(()=>{ document.getElementById('blW').value='181.5'; document.getElementById('blSave').onclick(); });
await p.waitForTimeout(450);
console.log('line after:', await p.evaluate(()=>!!document.getElementById('weighDue')));
console.log('errors:', errs);
await b.close();
