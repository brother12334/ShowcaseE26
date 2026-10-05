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
  S.program[wid]=[{name:"Barbell Bench Press",sets:3,reps:"6-10"},{name:"Barbell Row",sets:3,reps:"6-10"}];
  S.active={id:"live", workoutId:wid, date:todayStr(), startedAt:Date.now(),
    entries:S.program[wid].map(e=>({name:e.name, reps:e.reps, barAdd:45,
      sets:[0,1,2].map(()=>({weight:"135",reps:"",rpe:"",done:false}))}))};
  save(); TAB="workout"; render();
});
await p.waitForTimeout(500);
console.log('hurt buttons on cards:', await p.evaluate(()=>document.querySelectorAll('[data-exhurt]').length));
await p.evaluate(()=>document.querySelector('[data-exhurt]').onclick());
await p.waitForTimeout(350);
console.log('--- sheet ---'); console.log(await p.evaluate(()=>document.getElementById('modal').innerText));
await p.screenshot({path:D+'hu1.png'});
console.log('save disabled before choosing:', await p.evaluate(()=>document.getElementById('huSave').disabled));
await p.evaluate(()=>{ document.querySelector('[data-huw="shoulder"]').onclick(); });
await p.waitForTimeout(200);
await p.evaluate(()=>{ document.querySelector('[data-hul="sore"]').onclick(); });
await p.waitForTimeout(200);
console.log('save enabled after choosing:', await p.evaluate(()=>!document.getElementById('huSave').disabled));
await p.evaluate(()=>{ document.getElementById('huNote').value='only on the way down';
  document.getElementById('huSave').onclick(); });
await p.waitForTimeout(400);
console.log('logged:', JSON.stringify(await p.evaluate(()=>S.hurts)));
console.log('hurtFor(bench):', await p.evaluate(()=>!!hurtFor("Barbell Bench Press")),
            '· hurtFor(row):', await p.evaluate(()=>!!hurtFor("Barbell Row")));
console.log('button marked:', await p.evaluate(()=>!!document.querySelector('[data-exhurt].hu-on')));

console.log('\n=== THE PROGRESSION HOLD ===');
console.log(JSON.stringify(await p.evaluate(()=>{
  const mk=(name)=>({name, reps:"6-10", barAdd:45,
    sets:[0,1,2].map(()=>({weight:"135",reps:"11",rpe:"8",done:true}))});
  const sess={id:"t", workoutId:ROTATION[0], date:todayStr(), startedAt:Date.now(), finishedAt:Date.now(),
    entries:[mk("Barbell Bench Press"), mk("Barbell Row")]};
  return sess.entries.map(en=>{ const r=progressionFor(sess,en); return {ex:en.name, kind:r&&r.kind, why:r&&r.why, to:r&&r.to}; });
}),null,1));

console.log('\n=== BODY TAB ===');
await p.evaluate(()=>{ S.active=null; S.sessions.push({id:"s1",workoutId:ROTATION[0],date:todayStr(),
  startedAt:Date.now()-3600e3, finishedAt:Date.now(), feel:4,
  entries:[{name:"Barbell Bench Press",barAdd:45,sets:[{weight:"135",reps:"10",rpe:"8",done:true}]}]});
  save(); TAB="body"; render(); });
await p.waitForTimeout(500);
console.log(await p.evaluate(()=>{const e=document.querySelector('.nb-hurt'); return e?e.innerText:'NO SECTION';}));
await p.evaluate(()=>document.querySelector('.nb-hurt').scrollIntoView({block:'center'}));
await p.waitForTimeout(300);
await p.screenshot({path:D+'hu2.png'});
console.log('\nsettle it:');
await p.evaluate(()=>document.querySelector('[data-husettle]').onclick());
await p.waitForTimeout(400);
console.log('active now:', await p.evaluate(()=>activeHurts().length),
            '· hurtFor(bench):', await p.evaluate(()=>!!hurtFor("Barbell Bench Press")));
console.log('section says:', await p.evaluate(()=>{const e=document.querySelector('.nb-hurt'); return e?e.innerText.replace(/\n/g,' | '):'gone';}));
console.log('in backup:', await p.evaluate(()=>BACKUP_FIELDS.indexOf('hurts')>-1));
console.log('errors:', errs);
await b.close();
