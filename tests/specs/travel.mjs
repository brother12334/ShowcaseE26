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
  const wid=ROTATION[0];
  S.program[wid]=[{name:"Barbell Bench Press",sets:3,reps:"6-10"},
                  {name:"Lat Pulldown",sets:3,reps:"8-12"},
                  {name:"Leg Press",sets:3,reps:"10-15"},
                  {name:"Cable Triceps Pushdown",sets:3,reps:"10-15"}];
  S.active={id:"live", workoutId:wid, date:todayStr(), startedAt:Date.now(),
    entries:S.program[wid].map(e=>({name:e.name, reps:e.reps,
      sets:[0,1,2].map(()=>({weight:"",reps:"",rpe:"",done:false}))}))};
  // one already started, to prove it is left alone
  S.active.entries[0].sets[0]={weight:"135",reps:"10",rpe:"8",done:true};
  save(); TAB="workout"; render();
});
await p.waitForTimeout(500);
console.log('tool present:', await p.evaluate(()=>!!document.getElementById('travelBtn')));
await p.evaluate(()=>document.getElementById('travelBtn').onclick());
await p.waitForTimeout(400);
console.log('--- default (full gym) ---');
console.log(await p.evaluate(()=>document.getElementById('modal').innerText));
console.log('\n--- pick "Dumbbells only" ---');
await p.evaluate(()=>document.querySelector('[data-tvp="dumbbell"]').onclick());
await p.waitForTimeout(350);
console.log(await p.evaluate(()=>document.getElementById('modal').innerText));
await p.screenshot({path:D+'tv1.png'});
console.log('\n--- plan model ---');
console.log(JSON.stringify(await p.evaluate(()=> travelPlan(["dumbbell","bodyweight","band"]).map(r=>
  ({ex:r.en.name, keep:!!r.keep, started:!!r.started, need:r.need, to:r.to&&r.to.name, stuck:!!r.stuck}))),null,1));
console.log('\n--- apply ---');
await p.evaluate(()=>document.getElementById('tvGo').onclick());
await p.waitForTimeout(500);
console.log('session now:', JSON.stringify(await p.evaluate(()=>
  S.active.entries.map(e=>({name:e.name, from:e.swapFrom||null, started:(e.sets||[]).some(x=>x.done)})))));
console.log('card:', await p.evaluate(()=>{const c=document.querySelector('.tb-card'); return c?c.innerText.replace(/\n/g,' | '):'NONE';}));
await p.screenshot({path:D+'tv2.png'});
console.log('\n--- undo ---');
await p.evaluate(()=>document.getElementById('gymPlanUndo').onclick());
await p.waitForTimeout(450);
console.log('restored:', JSON.stringify(await p.evaluate(()=>S.active.entries.map(e=>e.name))));
console.log('programme untouched:', JSON.stringify(await p.evaluate(()=>S.program[ROTATION[0]].map(e=>e.name))));
console.log('errors:', errs);
await b.close();
