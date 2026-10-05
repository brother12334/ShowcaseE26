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
const snap = ()=> p.evaluate(()=> JSON.stringify(DAYS.map(d=> (S.program[d]||[]).map(e=>
  [e.name,e.sets,e.reps,e.rpe,e.weight===undefined?null:e.weight,e.note||null]))));

console.log('1 · A HAND EDIT IN THE DAY EDITOR');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  S.planLog=[];
  const wid=DAYS[0], e=S.program[wid][0];
  const before={name:e.name, sets:e.sets, reps:e.reps};
  const ne=Object.assign({}, e, {sets:(e.sets||3)+2, reps:"4-6"});
  const diff=planDiff(e, ne);
  const undo=[planSnapOne(wid, e, ne.name)];
  S.program[wid][0]=ne;
  logPlanChange("edit", wid, ne.name, diff, Object.assign({undo}, null));
  save();
  const c=(S.planLog||[]).slice(-1)[0];
  const listed=planChangeBig(c), can=planRevertable(c);
  const r=planRevert(c.at);
  const after=S.program[wid][0];
  return {listed, can, r, restored: after.sets===before.sets && after.reps===before.reps};
}), null, 0));

console.log('\n2 · REMOVING A MOVEMENT, AND PUTTING IT BACK WHERE IT WAS');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const wid=DAYS[0], idx=1, gone=S.program[wid][idx];
  const was=S.program[wid].map(e=>e.name);
  const undo=[planSnapGone(wid, gone, idx)];
  S.program[wid].splice(idx,1);
  logPlanChange("remove", wid, gone.name, [], {undo});
  const missing=S.program[wid].map(e=>e.name);
  const c=(S.planLog||[]).slice(-1)[0];
  const r=planRevert(c.at);
  const back=S.program[wid].map(e=>e.name);
  return {was, missing, back, sameOrder: JSON.stringify(was)===JSON.stringify(back), r};
}), null, 0));

console.log('\n3 · A SWITCH RESTORES THE CUE, THE RAMP AND THE LOAD TOO');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const wid=DAYS[0], e=S.program[wid][0];
  e.note="Touch the chest, no bounce."; e.weight=135; e.rpes=[7,8,9]; e.rpe="7-9";
  const was=JSON.stringify([e.name,e.note,e.weight,e.rpes,e.rpe]);
  const undo=[planSnapOne(wid, e, "Machine Chest Press")];
  e.name="Machine Chest Press"; delete e.note; e.weight=null; e.rpes=[8,8]; e.rpe="8";
  logPlanChange("swapped", wid, e.name, ["x → y"], {undo});
  const c=(S.planLog||[]).slice(-1)[0];
  planRevert(c.at);
  const e2=S.program[wid][0];
  const now=JSON.stringify([e2.name,e2.note,e2.weight,e2.rpes,e2.rpe]);
  return {was, now, same: was===now};
}), null, 0));

console.log('\n4 · NOTHING IS PUT BACK TWICE');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const c=(S.planLog||[]).filter(x=>x.reverted)[0];
  return {second: planRevert(c.at), stillReverted: !!c.reverted};
}), null, 0));

console.log('\n5 · AND A DUPLICATE IS UN-DUPLICATED');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const wid=DAYS[0], n0=S.program[wid].length;
  const copy=Object.assign({}, S.program[wid][0], {name:S.program[wid][0].name+" (2)"});
  S.program[wid].push(copy);
  logPlanChange("added", wid, copy.name, ["Duplicated from the same day"], {undo:[planSnapAdd(wid, copy.name)]});
  const n1=S.program[wid].length;
  planRevert((S.planLog||[]).slice(-1)[0].at);
  return {before:n0, afterDup:n1, afterRevert:S.program[wid].length};
}), null, 0));
console.log('\nerrors:', errs);
await b.close();
