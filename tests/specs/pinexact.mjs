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
// the video's situation: side abs trained only on Legs B, by Captain's Chair Leg Raise
await p.evaluate(()=>{
  DAYS.forEach(w=>{ S.program[w] = (S.program[w]||[]).filter(e=> !((musclesFor(e.name)||{}).obliques)); });
  S.program[DAYS[DAYS.length-1]].push({name:"Captain's Chair Leg Raise", sets:2, reps:"12-15"});
  S.program[DAYS[1]].push({name:"Cable Crunch", sets:3, reps:"12-15"});
  save(); render();
});
await p.waitForTimeout(400);
const i = await p.evaluate(()=>{
  const a=bodyAnalysis();
  let k=(a.weak||[]).findIndex(w=>w.muscle==='obliques');
  if(k<0){ a.weak.unshift({muscle:"obliques",kind:"under",avoid:[],title:"More side abs",detail:"",act:""}); }
  return 0;
});
await p.evaluate(()=>{ BODY_ANALYSIS_FORCE=1; });
await p.evaluate(()=>{
  const a = bodyAnalysis();
  window.__W = {muscle:"obliques", kind:"under", avoid:[], title:"More side abs", detail:"", act:""};
});
// drive the real sheet via the obliques finding if present, else check the builders directly
const r = await p.evaluate(()=>{
  const a = bodyAnalysis(), w = window.__W, m = "obliques";
  const out = {};
  const mk = (spEx, days, spSets, spread)=>{
    const pin = spEx && days.length ? {name:spEx, days, sets:spSets} : null;
    const need = pin ? Math.max(0.1, days.length*spSets*muscleFrac(spEx,m)) : spread;
    const sp = spreadPlan(a, m, need, w.avoid, pin);
    return sp ? {list: spreadList(sp), gained: sp.gained} : null;
  };
  const d = DAYS[DAYS.length-1], d2 = DAYS[1];
  out.pinnedTwoDaysThree = mk("Captain's Chair Leg Raise", [d2, d], 3, 5);
  out.pinnedOneDayTwo    = mk("Captain's Chair Leg Raise", [d], 2, 5);
  out.auto               = mk("", [], 2, 3);
  out.frac = muscleFrac("Captain's Chair Leg Raise", m);
  return out;
});
console.log(JSON.stringify(r, null, 1));
console.log('errors:', errs);
await b.close();
