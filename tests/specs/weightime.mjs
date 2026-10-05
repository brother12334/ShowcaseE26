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
  S.prefs=Object.assign({},S.prefs,{sleepPrompt:false});
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.sessions=[{id:"s",workoutId:ROTATION[0],date:todayStr(),startedAt:Date.now()-3600e3,
    finishedAt:Date.now(),feel:4,entries:[{name:"Barbell Bench Press",barAdd:45,
    sets:[{weight:"135",reps:"10",rpe:"8",done:true}]}]}];
  save(); TAB="body"; render();
});
await p.waitForTimeout(500);

console.log('=== FIRST EVER WEIGH-IN ===');
await p.evaluate(()=>{ BODYLOG_T=null; openBodyLog(); });
await p.waitForTimeout(350);
console.log(await p.evaluate(()=>document.querySelector('.bl-when').innerText));
console.log('time field:', await p.evaluate(()=>document.getElementById('blT').value));
await p.screenshot({path:D+'wt1.png'});
await p.evaluate(()=>{ document.getElementById('blW').value='181.2';
  document.getElementById('blT').value='07:10'; document.getElementById('blSave').onclick(); });
await p.waitForTimeout(400);
console.log('stored:', JSON.stringify(await p.evaluate(()=>S.bodyLog)));

console.log('\n=== A HISTORY OF MORNING WEIGH-INS ===');
await p.evaluate(()=>{
  const DAY=86400e3, now=Date.now(), d=n=>new Date(now-n*DAY).toLocaleDateString("en-CA");
  S.bodyLog[d(21)]={w:178.4,t:"07:05"}; S.bodyLog[d(14)]={w:179.1,t:"07:20"};
  S.bodyLog[d(7)]={w:180.2,t:"06:55"};
  save(); render();
});
await p.waitForTimeout(300);
console.log('usual:', JSON.stringify(await p.evaluate(()=>usualWeighTime())));
console.log('body tab foot:', await p.evaluate(()=>document.querySelector('.bl-foot').innerText));

console.log('\n=== SAME TIME AGAIN (no warning) ===');
await p.evaluate(()=>{ BODYLOG_T="07:15"; openBodyLog(new Date(Date.now()-86400e3).toLocaleDateString("en-CA")); });
await p.waitForTimeout(350);
console.log('drift class:', await p.evaluate(()=>document.querySelector('.bl-when').className));
console.log(await p.evaluate(()=>document.querySelector('.bl-when').innerText));

console.log('\n=== EVENING WEIGH-IN (warning) ===');
await p.evaluate(()=>{ const t=document.getElementById('blT'); t.value='19:40'; t.onchange(); });
await p.waitForTimeout(400);
console.log('drift class:', await p.evaluate(()=>document.querySelector('.bl-when').className));
console.log(await p.evaluate(()=>document.querySelector('.bl-when').innerText));
await p.screenshot({path:D+'wt2.png'});

console.log('\n=== typed weight survives the redraw ===');
await p.evaluate(()=>{ document.getElementById('blW').value='183.9';
  const t=document.getElementById('blT'); t.value='20:10'; t.onchange(); });
await p.waitForTimeout(400);
console.log('weight box still:', await p.evaluate(()=>document.getElementById('blW').value));

console.log('\n=== midnight wrap: 23:40 vs 00:20 is 40 min, not 23 hours ===');
console.log('gap:', await p.evaluate(()=>clockGap(hmToMin("23:40"), hmToMin("00:20"))));
console.log('errors:', errs);
await b.close();
