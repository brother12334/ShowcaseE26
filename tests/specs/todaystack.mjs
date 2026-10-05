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
  S.tourDone=true; S.sleepAsked=todayStr(); S.sleepTarget=8;
  S.prefs=Object.assign({},S.prefs,{sleepPrompt:false,barMode:"total",barWeight:45});
  S.splitId=DEFAULT_SPLIT; applySplit();
  // six weeks in, so the deload is due
  S.blockStart = Date.now() - 42*86400e3; S.planStart = S.blockStart;
  const DAY=86400e3, now=Date.now();
  const wid=ROTATION[0];
  for(let k=12;k>=1;k--){
    const s2={id:"s"+k, workoutId:ROTATION[k%ROTATION.length], date:new Date(now-k*3*DAY).toLocaleDateString("en-CA"),
      startedAt:now-k*3*DAY, finishedAt:now-k*3*DAY+3600e3, feel:4,
      entries:(S.program[ROTATION[k%ROTATION.length]]||[]).slice(0,4).map(e=>({name:e.name, reps:e.reps, barAdd:45,
        sets:[0,1,2].map(()=>({weight:String(100+(12-k)*5),reps:"13",rpe:"7",done:true}))}))};
    sweepSessionPRs(s2); s2.quality=scoreWorkout(s2); s2.progression=buildProgression(s2);
    S.sessions.push(s2);
  }
  save(); TAB="today"; render();
});
await p.waitForTimeout(600);
console.log('notes:', await p.evaluate(()=>todayNotes(ROTATION[S.pointer]).map(n=>({k:n.k, act:n.act, label:n.label}))));
console.log('\n--- the stack ---');
console.log(await p.evaluate(()=>{const e=document.querySelector('.nt-list'); return e?e.innerText:'NONE';}));
console.log('\n--- day card meta ---');
console.log(await p.evaluate(()=>{const e=document.querySelector('.day-open-n'); return e?e.innerText:'NONE';}));
console.log('old cards gone:', await p.evaluate(()=>
  !document.querySelector('.deload-card,.fc-card,.rule-card,.asym-card,.sleep-ok')));
await p.evaluate(()=>window.scrollTo(0,0));
await p.waitForTimeout(200);
await p.screenshot({path:D+'ts1.png'});
console.log('\n=== IS IT DUPLICATED? ===');
console.log(JSON.stringify(await p.evaluate(()=>{
  const wid = ROTATION[S.pointer];
  const note = focusNote(wid);
  const tips = focusTipsFor(wid);
  const flags = openFlags();
  return {
    noteLine: note && note.line,
    inlineTipsOnToday: [...document.querySelectorAll('.fc-inline')].map(x=>x.innerText.replace(/\n/g,' ')),
    tipKeys: Object.keys(tips),
    bodyTabFlags: flags.map(f=>({title:f.title, ex:f.ex, msg:(f.msg||'').slice(0,70), fix:(f.fix||'').slice(0,60)}))
  };
}),null,1));

console.log('\n--- expand a row ---');
await p.evaluate(()=>{ const d=document.querySelector('.nt-r'); d.open=true; });
await p.waitForTimeout(300);
console.log(await p.evaluate(()=>document.querySelector('.nt-r').innerText.replace(/\n/g,' | ')));
console.log('deload button present:', await p.evaluate(()=>!!document.getElementById('startDeloadBtn')));
await p.screenshot({path:D+'ts2.png'});
console.log('\n--- a quiet day has no box ---');
console.log('stack when nothing fires:', await p.evaluate(()=> noteStackHTML([]) === "" ));
console.log('errors:', errs);
await b.close();
