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
  try{OB=null}catch(e){} const f=document.getElementById('aiFull'); if(f){f.hidden=true;f.style.display='none';}
  document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off';
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false}); S.sleepAsked=todayStr();
  S.splitId='ppl6'; applySplit();
  let i=0;
  for(let d=16; d>=1; d--){ if(d%3===2) continue;
    const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]).slice(0,3);
    S.sessions.push({id:"s"+d, date:dayStr(Date.now()-d*86400e3), workoutId:wid,
      startedAt:Date.now()-d*86400e3, finishedAt:Date.now()-d*86400e3+3e6, feel:3,
      entries: prog.map((e,k)=>({name:e.name, sets:[0,1].map(()=>({weight:String(100+k*10), reps:"10", rpe:"8", done:true, rest:120}))}))}); }
  save(); goTab('body'); render();
});

console.log('1 · THE FLOATING-POINT "STILL 0 SHORT"');
console.log('  ', await p.evaluate(()=>{
  const A=bodyAnalysis();
  // the exact shape from the screenshot: 1.4 now, 4 sets at 30%, a 2.6 floor
  const fake={ lm:{x:{mev:2.6, mav:5, mrv:9}}, wk:{x:{sets:1.4}}, cyc:{pending:{}} };
  const pr=fixProjection(fake,'x', 4*0.30);
  return {raw: 1.4 + 4*0.30, shown: pr.now+' → '+pr.after, tone:pr.tone, says:pr.verdict};
}));

console.log('\n3 · "STILL 0 SHORT" IS NOW IMPOSSIBLE');
console.log('  ', await p.evaluate(()=>{
  const out=[];
  for(let k=0;k<400;k++){
    const mev=Math.round((1+Math.random()*12)*10)/10;
    const now=Math.random()*mev;
    const add=Math.random()*6*0.3;
    const pr=fixProjection({lm:{x:{mev,mav:mev+3,mrv:mev+8}},wk:{x:{sets:now}},cyc:{pending:{}}},'x',add);
    if(/Still 0 short/.test(pr.verdict)) out.push({mev, now, add, says:pr.verdict});
  }
  return out.length ? out.slice(0,3) : 'none in 400 random cases';
}));

console.log('\nerrors:', errs);
await b.close();
