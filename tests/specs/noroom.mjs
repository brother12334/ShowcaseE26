/* Was: "when the lagging side has no room, offer to trim the leading side."
   Now:  there is no trim. A ratio never asks you to do less of something that is working.
   This spec asserts the new contract. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
console.log(await p.evaluate(()=>{
  S.setup={name:"F",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  // saturate BOTH sides: pulling miles ahead, chest already over its own cycle ceiling
  DAYS.forEach(w=>{ (S.program[w]||[]).forEach(e=>{ const mm=musclesFor(e.name)||{};
    if(mm.lats||mm.upper_back||mm.traps) e.sets=(e.sets||3)+8;
    if(mm.chest) e.sets=(e.sets||3)+9; }); });
  let i=0;
  for(let d=20; d>=2; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]);
    S.sessions.push({id:"s"+d,date:dayStr(Date.now()-d*86400e3),workoutId:wid,
      startedAt:Date.now()-d*86400e3,finishedAt:Date.now()-d*86400e3+3300e3,feel:3,
      entries:prog.map((e,k)=>({name:e.name,
        sets:Array.from({length:e.sets||3},()=>({weight:String(100+k*10),reps:"9",rpe:"8",done:true,rest:120}))}))}); }
  save();
  const A=bodyAnalysis(), all=JSON.stringify(A.weak).toLowerCase(), errs=[];
  const bal=A.weak.filter(w=>w.kind==='balance');

  if(all.includes('volume down')) errs.push('still offers to bring a side down');
  if(all.includes('no room to add')) errs.push('still reports a side as having no room');
  if(bal.some(w=>w.noRoom)) errs.push('a finding still carries noRoom');
  if(typeof trimPlan!=='undefined') errs.push('trimPlan still exists');
  if(bal.some(w=>(findingPlan(w,A)||{}).mode==='trim')) errs.push('a balance finding still plans a trim');
  // push:pull must be suppressed here — the lagging muscle is over its own ceiling
  if(bal.some(w=>w.muscle==='chest')) errs.push('push:pull fired with chest over its ceiling');
  // and it must never outrank a real shortfall
  if(bal.some(w=>w.score>62)) errs.push('a ratio scored above the 62 cap');
  /* NOT ASSERTED: that the chest being over its ceiling gets reported here. It does not,
     and it never did — rule 5 judges the logged WINDOW, and this plan's 37 sets a cycle
     have not landed in a 7-day window yet. That is a real gap, but it is a gap in the
     over-volume rule and not something the ratio was ever covering: the old trim branch
     fired on the RATIO being out of band, which only caught this case by coincidence and
     answered it by cutting the wrong muscle. Noted here so the next person does not read
     its absence as a regression from this change. */

  return 'balance findings: '+(bal.map(w=>w.muscle+' ('+w.score+') '+w.act).join(' | ')||'none')+
    '\nchest finding: '+(A.weak.filter(w=>w.muscle==='chest').map(w=>w.kind+' — '+w.act).join(' | ')||'none')+
    '\n\nerrors: '+(errs.length?JSON.stringify(errs,null,1):'[] PASS');
}));
await b.close();
