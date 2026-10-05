import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch();
const run = async (label, mut)=>{
  const p=await b.newPage({viewport:{width:390,height:844}});
  p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{localStorage.clear();
   localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
   localStorage.setItem('e26.ns0','E26-X');});
  await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
  console.log('\n===== '+label+' =====');
  console.log(await p.evaluate(m=>{
    S.setup={name:"F",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
    // eslint-disable-next-line no-new-func
    new Function('S','DAYS','musclesFor', m)(S, DAYS, musclesFor);
    // log the plan as done, three cycles of it
    let i=0;
    for(let d=20; d>=2; d--){ if(d%3===2) continue;
      const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]);
      S.sessions.push({id:"s"+d,date:dayStr(Date.now()-d*86400e3),workoutId:wid,
        startedAt:Date.now()-d*86400e3,finishedAt:Date.now()-d*86400e3+3300e3,feel:3,
        entries:prog.map((e,k)=>({name:e.name,
          sets:Array.from({length:e.sets||3},()=>({weight:String(100+k*10),reps:"9",rpe:"8",done:true,rest:120}))}))}); }
    save();
    const A=bodyAnalysis();
    const vol = g=>r1(A.wk[g].sets)+'/'+A.lm[g].mav;
    const bal=A.weak.filter(w=>w.kind==='balance');
    return 'chest '+vol('chest')+'  lats '+vol('lats')+'  upper_back '+vol('upper_back')+'\n'+
      'plan per cycle: chest '+r1(planCycleVolume('chest'))+'/'+r1(cycleLandmarks(A,'chest').mav)+
      '   lats '+r1(planCycleVolume('lats'))+'/'+r1(cycleLandmarks(A,'lats').mav)+'\n'+
      (bal.length ? bal.map(w=>'FINDING sev'+w.sev+' ('+w.score+')  '+w.title+'\n  ACT: '+w.act+'\n  WHY: '+w.why+'\n  DETAIL: '+w.detail).join('\n')
                  : 'NO BALANCE FINDING') + '\n' +
      'says "volume down" anywhere: '+(JSON.stringify(A.weak).toLowerCase().includes('volume down'));
  }, mut));
  await p.close();
};
// A: the screenshot case — pile pulling on until both sides are saturated
await run('CASE A — chest at its ceiling, pulling well ahead of it', `
  DAYS.forEach(w=>{ (S.program[w]||[]).forEach(e=>{ const mm=musclesFor(e.name)||{};
    if(mm.lats||mm.upper_back||mm.traps) e.sets=(e.sets||3)+5; }); });
`);
// B: pulling ahead, but the lats themselves have plenty of room
await run('CASE B — pressing well ahead, lats with room to grow into', `
  DAYS.forEach(w=>{ (S.program[w]||[]).forEach(e=>{ const mm=musclesFor(e.name)||{};
    if(mm.lats||mm.upper_back||mm.traps||mm.biceps) e.sets=1;
    if(mm.chest) e.sets=(e.sets||3)+4; }); });
`);
// C: the lagging muscle is ITSELF at its ceiling — nothing useful to say
await run('CASE C — pulling miles ahead AND chest already at its own cycle ceiling', `
  DAYS.forEach(w=>{ (S.program[w]||[]).forEach(e=>{ const mm=musclesFor(e.name)||{};
    if(mm.lats||mm.upper_back||mm.traps) e.sets=(e.sets||3)+8;
    if(mm.chest) e.sets=(e.sets||3)+9; }); });
`);
await b.close();
