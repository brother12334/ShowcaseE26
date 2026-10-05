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
  for(let k=20;k>=1;k-=2){
    const wid=ROTATION[k%ROTATION.length];
    const s2={id:"s"+k, workoutId:wid, date:new Date(now-k*DAY).toLocaleDateString("en-CA"),
      startedAt:now-k*DAY, finishedAt:now-k*DAY+3600e3, feel:4,
      entries:(S.program[wid]||[]).slice(0,4).map(e=>({name:e.name, reps:e.reps, barAdd:45,
        sets:[0,1].map(()=>({weight:"110",reps:"12",rpe:"8",done:true}))}))};
    sweepSessionPRs(s2); s2.quality=scoreWorkout(s2); S.sessions.push(s2);
  }
  save(); TAB="body"; render();
});
await p.waitForTimeout(700);
const weak = await p.evaluate(()=> (bodyAnalysis().weak||[]).map(w=>({muscle:w.muscle, kind:w.kind})));
const card = ()=> p.evaluate(()=>{ const m=document.getElementById('modal'); return m? m.innerText : 'NO MODAL'; });

console.log('1 · BEFORE ACTING, THE CARD SAYS NOTHING ABOUT A PLAN CHANGE');
await p.evaluate(()=>openWeakPoint(0));
await p.waitForTimeout(400);
let t = await card();
console.log('   mentions a change:', /already changed the plan/i.test(t));

console.log('\n2 · APPLY THE FIX, THEN REOPEN');
await p.evaluate(()=>{ hideModal(); FIX=null; openOwnFix(0); });
await p.waitForTimeout(400);
await p.evaluate(()=>(function(){const s=document.getElementById('fxSee');if(s){s.click(); const d=document.getElementById('fxDo'); if(d) d.click(); return;}const g=document.getElementById('fxRecGo'); if(g) g.onclick();})());
await p.waitForTimeout(600);
console.log('   plan log:', JSON.stringify(await p.evaluate(()=>(S.planLog||[]).slice(-1).map(c=>({kind:c.kind,name:c.name,changes:c.changes})))));
await p.evaluate(()=>{ hideModal(); openWeakPoint(0); });
await p.waitForTimeout(500);
t = await card();
const i = t.indexOf('YOU HAVE ALREADY CHANGED THE PLAN');
console.log('   block present:', i > -1);
console.log(t.slice(i, i+420));
await p.screenshot({path:D+'acted.png'});

console.log('\n3 · A WEIGHT CORRECTION IS NOT ACTING ON A VOLUME SHORTFALL');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  S.planLog = [];
  const m = bodyAnalysis().weak[0].muscle;
  const ex = planEntriesForMuscle(m)[0].e.name;
  logPlanChange("edit", DAYS[0], ex, [{field:"starting weight", key:"weight", from:"60 lb", to:"70 lb"}]);
  const a = planFixesFor(m);
  logPlanChange("edit", DAYS[0], ex, [{field:"sets", key:"sets", from:"3", to:"4"}]);
  const b2 = planFixesFor(m);
  return {afterWeightEdit: a.length, afterSetsEdit: b2.length, line: b2[0] ? planFixLine(b2[0]) : ""};
}), null, 0));

console.log('\n4 · AND IT AGES OUT');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  S.planLog.forEach(c=> c.at = Date.now() - 30*86400e3);
  return planFixesFor(bodyAnalysis().weak[0].muscle).length;
})));
console.log('\nerrors:', errs);
await b.close();
