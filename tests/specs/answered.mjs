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
const list = ()=> p.evaluate(()=> (bodyAnalysis().weak||[]).map(w=> w.muscle+"/"+w.kind));
const target = await p.evaluate(()=> bodyAnalysis().weak[0].muscle);
console.log('1 · THE FINDING IS THERE —', JSON.stringify(await list()), '| target:', target);

// add chest until the PLAN clears the ratio floor, and log it the way the Body tab does
console.log('\n2 · FILL IT PROPERLY IN THE PLAN, AND LOG THE CHANGE');
console.log('  ', JSON.stringify(await p.evaluate(m=>{
  const R = ratioPairFor(m);
  const need = ()=>{
    const va=R.a.reduce((t,x)=>t+planCycleVolume(x),0), vb=R.b.reduce((t,x)=>t+planCycleVolume(x),0);
    return va/Math.max(0.5,vb);
  };
  let guard=0;
  while(need() < R.lo && guard++ < 40){
    const e = planEntriesForMuscle(m)[0];
    S.program[e.wid][e.i].sets = (S.program[e.wid][e.i].sets||1) + 1;
  }
  logPlanChange("programme", null, MUSCLES[m].name, ["filled by hand"]);
  save();
  const A=bodyAnalysis();
  return {ratioNow: +need().toFixed(2), floor: R.lo,
          answers: planAnswersFinding(A, {muscle:m, kind:"balance"}),
          weak: (A.weak||[]).map(w=>w.muscle+"/"+w.kind)};
}, target), null, 0));

console.log('\n3 · IT IS NOT MERELY QUIETED — IT IS OFF THE LIST AND OFF THE PUT-DOWN LIST');
console.log('  ', JSON.stringify(await p.evaluate(()=>{
  const A=bodyAnalysis();
  return {weak:(A.weak||[]).length, quiet:(A.weak.quiet||[]).length};
}), null, 0));

console.log('\n4 · THE BODY TAB SHOWS ONE FEWER');
await p.evaluate(()=>{ TAB="body"; render(); });
await p.waitForTimeout(500);
console.log('   rows:', JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('#app [data-wp]')].map(b=>b.textContent.replace(/\s+/g,' ').trim().slice(0,40)))));

console.log('\n5 · A FULL ROTATION LATER WITHOUT THE LOG AGREEING, IT COMES BACK');
console.log('  ', JSON.stringify(await p.evaluate(m=>{
  const at = (S.planLog||[])[S.planLog.length-1].at;
  for(let i=0;i<ROTATION.length;i++){
    S.sessions.push({id:"z"+i, workoutId:ROTATION[i], date:todayStr(),
      startedAt: at + (i+1)*1000, finishedAt: at + (i+1)*1000 + 60000, feel:4, entries:[]});
  }
  save();
  const A=bodyAnalysis();
  return {weak:(A.weak||[]).map(w=>w.muscle+"/"+w.kind), held: planFixAnswers(A, {muscle:m, kind:"balance"})};
}, target), null, 0));

console.log('\n6 · AND WITHOUT A LOGGED PLAN CHANGE, A GOOD PLAN SUPPRESSES NOTHING');
console.log('  ', JSON.stringify(await p.evaluate(m=>{
  S.sessions = S.sessions.filter(s=> !/^z/.test(s.id));
  S.planLog = []; save();
  const A=bodyAnalysis();
  return {weak:(A.weak||[]).map(w=>w.muscle+"/"+w.kind), held: planFixAnswers(A, {muscle:m, kind:"balance"})};
}, target), null, 0));
console.log('\nerrors:', errs);
await b.close();
