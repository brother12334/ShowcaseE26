import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off';
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, barMode:'plates', plateStep:2.5});
  S.sleepAsked=todayStr(); save();
});
// a chest that is trained plenty but has not moved in six weeks
const seed = ()=> p.evaluate(()=>{
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid = ROTATION[0], ex = "Barbell Bench Press";
  S.program[wid] = [{name:ex, sets:4, reps:"6-10", rpes:[8,8,9,9], weight:135}];
  S.sessions = []; S.planLog = [];
  const DAY=86400e3, now=Date.now();
  for(let k=42;k>=2;k-=3){
    S.sessions.push({id:"s"+k, workoutId:wid, date:new Date(now-k*DAY).toLocaleDateString("en-CA"),
      startedAt:now-k*DAY-3600e3, finishedAt:now-k*DAY, feel:4,
      entries:[{name:ex, reps:"6-10", sets:[0,1,2,3].map(()=>({weight:"135",reps:"8",rpe:"9",done:true}))}]});
  }
  S.cycleStart = now - 50*DAY; save(); render();
  return (bodyAnalysis().weak||[]).map(w=> w.muscle+"/"+w.kind);
});
console.log('1 · A STALL IS FOUND:', JSON.stringify(await seed()));

console.log('\n2 · ITS OWN REMEDY IS "CHANGE THE REP RANGE"');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const A=bodyAnalysis(), w=(A.weak||[]).find(x=>x.kind==="stall");
  if(!w) return "no stall";
  const fp = findingPlan(w, A);
  return fp ? {mode:fp.mode, label:fp.label, list:fp.list} : "no plan";
}), null, 0));

console.log('\n3 · PRESSING IT TAKES THE FINDING OFF THE LIST');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const A=bodyAnalysis(), i=(A.weak||[]).findIndex(x=>x.kind==="stall");
  applyFinding(i); hideModal();
  return {planReps: findProgramEntry("Barbell Bench Press").reps,
          log: (S.planLog||[]).map(c=>c.kind+"/"+c.name),
          weak: (bodyAnalysis().weak||[]).map(w=>w.muscle+"/"+w.kind)};
}), null, 0));

console.log('\n4 · TRAINING A LOT DOES NOT RELEASE IT — THE EVIDENCE HAS NOT REFRESHED');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const at=(S.planLog||[])[0].at;
  for(let i=0;i<ROTATION.length*2;i++){
    S.sessions.push({id:"y"+i, workoutId:ROTATION[i%ROTATION.length], date:todayStr(),
      startedAt:at+(i+1)*1000, finishedAt:at+(i+1)*1000+6e4, feel:4, entries:[]});
  }
  save();
  return (bodyAnalysis().weak||[]).map(w=>w.muscle+"/"+w.kind);
})));

console.log('\n5 · THREE WEEKS ON, IT ASKS ITSELF AGAIN');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  (S.planLog||[]).forEach(c=> c.at = Date.now() - 22*86400e3);
  save();
  return (bodyAnalysis().weak||[]).map(w=>w.muscle+"/"+w.kind);
})));

console.log('\n6 · AND A REP EDIT STILL DOES NOT ANSWER A VOLUME SHORTFALL');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const c = {at:Date.now(), date:todayStr(), kind:"edit", name:"Barbell Bench Press",
             changes:[{field:"rep range", key:"reps", from:"6-10", to:"10-15"}]};
  return {forStall: planChangeAddedWork(c, "stall"), forShortfall: planChangeAddedWork(c, "under")};
}), null, 0));
console.log('\nerrors:', errs);
await b.close();
