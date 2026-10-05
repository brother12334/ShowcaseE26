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
console.log('1 · WHAT COUNTS AS BIG');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const mk = (kind, changes)=> ({at:Date.now(), date:todayStr(), kind, name:"Barbell Bench Press", changes});
  return {
    loadRaise:      planChangeBig(mk("weight", ["60 lb → 65 lb"])),
    reorder:        planChangeBig(mk("move", [])),
    handWeightEdit: planChangeBig(mk("edit", [{field:"starting weight", key:"weight", from:"60", to:"70"}])),
    handSetsEdit:   planChangeBig(mk("edit", [{field:"sets", key:"sets", from:"3", to:"4"}])),
    bodyTabFix:     planChangeBig(mk("programme", ["Barbell Bench Press: 6-10 → 9-13 reps"])),
    movementAdded:  planChangeBig(mk("added", ["3 sets of 8-12"])),
    movementSwapped:planChangeBig(mk("swapped", ["A → B"])),
    easeOff:        planChangeBig(mk("ease", ["cut"])),
    aRevert:        planChangeBig(mk("revert", ["x"]))
  };
}), null, 1));

console.log('\n2 · A LOAD RAISE DOES NOT REACH THE SCREEN');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  S.planLog = [];
  applyProgression("Barbell Bench Press", 145, null, "Double progression");
  const kinds = (S.planLog||[]).map(c=>c.kind);
  return {logged: kinds, listed: (S.planLog||[]).filter(planChangeBig).length};
}), null, 0));

console.log('\n3 · A FINDING DOES, AND WITH A BUTTON');
await p.evaluate(()=>{ FIX=null; openOwnFix(0); });
await p.waitForTimeout(400);
await p.evaluate(()=>{ (function(){const s=document.getElementById('fxSee');if(s){s.click(); const d=document.getElementById('fxDo'); if(d) d.click(); return;}const g=document.getElementById('fxRecGo'); if(g) g.onclick();})(); hideModal(); });
await p.waitForTimeout(500);
await p.evaluate(()=>{ TAB="program"; render(); });
await p.waitForTimeout(300);
console.log('   button:', await p.evaluate(()=>document.getElementById('planHistBtn').textContent.replace(/\s+/g,' ').trim()));
await p.evaluate(()=>openPlanHistory());
await p.waitForTimeout(400);
const t = await p.evaluate(()=>document.getElementById('modal').innerText);
console.log(t);
console.log('   says "no way back":', /no way back/i.test(t));
console.log('   put-back buttons:', await p.evaluate(()=>document.querySelectorAll('#modal [data-planrevert]').length));
await p.screenshot({path:D+'planbig.png'});

console.log('\n4 · A HAND EDIT IS LISTED, WITH NO BUTTON AND NO SCOLDING');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  logPlanChange("edit", DAYS[0], "Barbell Bench Press", [{field:"sets", key:"sets", from:"4", to:"5"}]);
  hideModal(); openPlanHistory();
  const m=document.getElementById('modal');
  return {rows: m.querySelectorAll('.ph-row').length,
          buttons: m.querySelectorAll('[data-planrevert]').length,
          none: m.querySelectorAll('.ph-none').length};
}), null, 0));
console.log('\nerrors:', errs);
await b.close();
