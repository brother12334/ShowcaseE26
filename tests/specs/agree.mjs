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
await p.evaluate(()=>{
  const d = DAYS[DAYS.length-1];
  DAYS.forEach(w=>{ S.program[w] = (S.program[w]||[]).filter(e=> !((musclesFor(e.name)||{}).obliques)); });
  S.program[d].push({name:"Captain's Chair Leg Raise", sets:2, reps:"12-15"});
  save(); render();
});
await p.waitForTimeout(500);
const out = await p.evaluate(()=>{
  const a = bodyAnalysis();
  const w = {muscle:"obliques", kind:"under", avoid:[], title:"More side abs", detail:"", act:""};
  const g = fixGap(a, "obliques", w);
  const sheet = g.need > 0 ? spreadPlan(a, "obliques", g.need, w.avoid, null) : null;
  const fp = findingPlan(w, a);
  return {have:g.have, floor:g.floor, need:g.need,
          sheet: sheet ? spreadList(sheet) : null,
          drawer: fp ? fp.list : null, does: fp ? fp.does : null, label: fp ? fp.label : null,
          inPlan: DAYS.flatMap(d=>(S.program[d]||[]).map(e=>e.name))};
});
console.log('have/floor/need:', out.have, out.floor, out.need);
console.log('fix sheet :', JSON.stringify(out.sheet));
console.log('drawer    :', JSON.stringify(out.drawer));
console.log('SAME:', JSON.stringify(out.sheet)===JSON.stringify(out.drawer));
console.log('label:', out.label);
console.log('does:', out.does);
console.log('every movement already in plan:', (out.drawer||[]).every(l=>{
  const n = l.split(' · ')[1].split(':')[0]; return out.inPlan.includes(n); }));
console.log('errors:', errs);
await b.close();
