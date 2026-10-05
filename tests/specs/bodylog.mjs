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
  for(let k=10;k>=0;k--){
    S.sessions.push({id:"s"+k, workoutId:ROTATION[k%ROTATION.length],
      date:new Date(now-k*4*DAY).toLocaleDateString("en-CA"), startedAt:now-k*4*DAY,
      finishedAt:now-k*4*DAY+3600e3, feel:4,
      entries:[{name:"Barbell Bench Press", barAdd:45,
        sets:[0,1,2].map((_,q)=>({weight:String(120+(10-k)*5),reps:String(10-q),rpe:"8",done:true}))}]});
  }
  save(); TAB="body"; render();
});
await p.waitForTimeout(500);
console.log('empty state present:', await p.evaluate(()=>!!document.getElementById('blAdd')));
await p.evaluate(()=>document.getElementById('blAdd').onclick());
await p.waitForTimeout(350);
console.log('--- sheet ---'); console.log(await p.evaluate(()=>document.getElementById('modal').innerText));
await p.screenshot({path:D+'bl1.png'});
// fill weight + two measurements
await p.evaluate(()=>{
  document.getElementById('blW').value='182.4';
  const t=document.querySelector('.bl-tape'); t.open=true;
  document.getElementById('bl_arm_r').value='15.5';
  document.getElementById('bl_arm_l').value='15.3';
  document.getElementById('bl_waist').value='33';
  document.getElementById('blSave').onclick();
});
await p.waitForTimeout(400);
console.log('stored:', JSON.stringify(await p.evaluate(()=>S.bodyLog)));
// backdate a few so there is a trend
await p.evaluate(()=>{
  const DAY=86400e3, now=Date.now(), d=n=>new Date(now-n*DAY).toLocaleDateString("en-CA");
  S.bodyLog[d(56)]={w:176.0, arm_r:14.9, arm_l:14.8, waist:33.5};
  S.bodyLog[d(35)]={w:178.6, arm_r:15.1, arm_l:15.0};
  S.bodyLog[d(14)]={w:180.9, arm_r:15.3, arm_l:15.2, waist:33.2};
  save(); render();
});
await p.waitForTimeout(400);
const txt = await p.evaluate(()=>{
  const el=document.querySelector('.nb-body'); return el?el.innerText:'NO SECTION';});
console.log('--- body tab section ---'); console.log(txt);
await p.evaluate(()=>document.querySelector('.nb-body').scrollIntoView({block:'center'}));
await p.waitForTimeout(300);
await p.screenshot({path:D+'bl2.png'});
console.log('weightOn(today):', JSON.stringify(await p.evaluate(()=>weightOn(todayStr()))));
console.log('weightOn(40d ago):', JSON.stringify(await p.evaluate(()=>
  weightOn(new Date(Date.now()-40*86400e3).toLocaleDateString("en-CA")))));
console.log('in backup:', await p.evaluate(()=>BACKUP_FIELDS.indexOf('bodyLog')>-1));
// a bodyweight record should now name the bodyweight it was set at
await p.evaluate(()=>{
  const DAY=86400e3, now=Date.now();
  [40,26,12,3].forEach((k,i)=> S.sessions.push({id:"pu"+k, workoutId:ROTATION[0],
    date:new Date(now-k*DAY).toLocaleDateString("en-CA"), startedAt:now-k*DAY,
    finishedAt:now-k*DAY+3600e3, feel:4,
    entries:[{name:"Pull-Up", barAdd:0, sets:[{weight:"",reps:String(9+i),rpe:"8",done:true}]}]}));
  save(); TAB="history"; RECORDS_OPEN=true; RB_EX=null; render();
});
await p.waitForTimeout(400);
await p.evaluate(()=>{ const b=[...document.querySelectorAll('[data-rbex]')]
  .filter(x=>/Pull-Up/.test(x.innerText))[0]; b.onclick(); });
await p.waitForTimeout(400);
console.log('--- pull-up page ---');
console.log(await p.evaluate(()=>document.getElementById('app').innerText));
await p.screenshot({path:D+'bl3.png'});
console.log('errors:', errs);
await b.close();
