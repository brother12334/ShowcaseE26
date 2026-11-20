import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1800}});
p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
console.log(JSON.stringify(await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{hideModal()}catch(e){}
  ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  Object.keys(S).forEach(k=>{ delete S[k]; });
  Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
  S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
  TAB='sync'; SET_PAGE='plan'; render();

  const look = tag=>{
    const A = bodyAnalysis();
    const d = adjustedLandmarks({wk:A.wk, modInfo:A.modInfo, win:A.win}, "chest");
    return {tag, goal: trainingGoal(), setupGoal: (S.setup||{}).goal,
      analysisMev: Math.round(A.lm.chest.mev*100)/100,
      directMev: Math.round(d.mev*100)/100,
      why: (d.why||[]).map(w=> w.k).join(" > "),
      hold: !!S.volHold};
  };
  const before = look("before");
  document.querySelector('#app [data-setgoal="strength"]').click();
  const after = look("after click");
  /* And with the goal forced straight into state, bypassing the handler entirely. */
  S.setup = S.setup || {}; S.setup.goal = "health";
  const forced = look("forced health");
  return {before, after, forced};
}, FX), null, 1));
await b.close();
