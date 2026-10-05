import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
const seed = ()=>p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.prefs=Object.assign({},S.prefs,{sleepPrompt:false}); S.sleepAsked=todayStr();
  let i=0;
  for(let d=20; d>=2; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]).slice(0,4);
    S.sessions.push({id:"s"+d,date:dayStr(Date.now()-d*86400e3),workoutId:wid,
      startedAt:Date.now()-d*86400e3,finishedAt:Date.now()-d*86400e3+3300e3,feel:3,
      entries:prog.map((e,k)=>({name:e.name,sets:[0,1,2].map(()=>({weight:String(100+k*15),reps:"9",rpe:"8",done:true,rest:120}))}))}); }
  save(); TAB='body'; render();
});
await seed(); await p.waitForTimeout(500);

console.log('--- findings, with severity ---');
console.log(await p.evaluate(()=>bodyAnalysis().weak.map(w=>
  '  sev'+w.sev+' ('+w.score+') '+w.muscle.padEnd(12)+' '+w.act).join('\n')));

const idx = await p.evaluate(()=>bodyAnalysis().weak.findIndex(w=>w.muscle==='neck'));
console.log('\nneck finding at index', idx);
await p.evaluate(i=>openWeakPoint(i), idx);
await p.waitForTimeout(300);
console.log('\n--- the neck card ---');
console.log(await p.evaluate(()=>document.querySelector('#modal').innerText));

console.log('\n--- tapping the decline button ---');
await p.evaluate(()=>document.querySelector('#wdDecline').click());
await p.waitForTimeout(300);
console.log(await p.evaluate(()=>document.querySelector('#modal').innerText));

console.log('\n--- "Show me neck movements" goes to the fix panel ---');
await p.evaluate(()=>document.querySelector('#dcKeep').click());
await p.waitForTimeout(400);
console.log(await p.evaluate(()=>document.querySelector('#modal').innerText.slice(0,600)));
console.log('declined so far:', await p.evaluate(()=>JSON.stringify(S.declined||{})));

console.log('\n--- back, and this time drop it ---');
await p.evaluate(i=>{ hideModal(); openWeakPoint(i); }, idx);
await p.waitForTimeout(250);
await p.evaluate(()=>document.querySelector('#wdDecline').click());
await p.waitForTimeout(250);
await p.evaluate(()=>document.querySelector('#dcDrop').click());
await p.waitForTimeout(500);
console.log('S.declined =', await p.evaluate(()=>JSON.stringify(S.declined)));
console.log('neck still flagged?', await p.evaluate(()=>bodyAnalysis().weak.some(w=>w.muscle==='neck')));
console.log('remaining findings:');
console.log(await p.evaluate(()=>bodyAnalysis().weak.map(w=>'  sev'+w.sev+' '+w.muscle+' '+w.act).join('\n')));

console.log('\n--- it survives a reload (persisted + in BACKUP_FIELDS) ---');
console.log('in BACKUP_FIELDS:', await p.evaluate(()=>BACKUP_FIELDS.indexOf('declined')>-1));
console.log('in backupObject:', await p.evaluate(()=>JSON.stringify(backupObject().declined)));

console.log('\n--- un-declining from the group card ---');
await p.evaluate(()=>{ hideModal(); openGroupDetail('neck'); });
await p.waitForTimeout(300);
const t = await p.evaluate(()=>document.querySelector('#modal').innerText);
console.log(t.split('\n').filter(x=>/turned this one off|don't train|Flag it again|counted/i.test(x)).join('\n'));
await p.evaluate(()=>document.querySelector('#gUndecline').click());
await p.waitForTimeout(400);
console.log('S.declined =', await p.evaluate(()=>JSON.stringify(S.declined)));
console.log('neck flagged again?', await p.evaluate(()=>bodyAnalysis().weak.some(w=>w.muscle==='neck')));
await b.close();
