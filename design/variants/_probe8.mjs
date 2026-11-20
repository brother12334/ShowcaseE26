import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
/* DOES MOVING THE GOAL TO THE END OF THE CHAIN CHANGE ANY NUMBER?

   The goal is a plain multiplier and is not inside the clamped recovery product, so the
   only thing in the chain that can make its position matter is the band floor
   "mrv < mav + 1". This walks every muscle and every goal, computing the band both ways
   from the same inputs, and reports every muscle where the two disagree. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
console.log(JSON.stringify(await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{hideModal()}catch(e){}
  Object.keys(S).forEach(k=>{ delete S[k]; });
  Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
  S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
  const out = {binds: 0, differs: [], checked: 0};
  const R = v => Math.max(0, Math.round(v*10)/10);
  Object.keys(GOAL_SCALE).forEach(goal=>{
    S.setup = S.setup || {}; S.setup.goal = goal;
    const A = bodyAnalysis();
    GKEYS.forEach(g=>{
      const L = adjustedLandmarks(A, g);
      /* Re-run the band floor both ways from the reported figures. The chain is
         multiplicative up to that floor, so the question reduces to: does the floor bind
         before the goal is applied, after it, or neither? */
      const gs = GOAL_SCALE[goal];
      const base = {mav: L.mav / (goal === "muscle" ? 1 : gs.mav),
                    mrv: L.mrv / (goal === "muscle" ? 1 : gs.mrv)};
      // goal first (today): floor sees goal-scaled figures
      let mavA = base.mav * gs.mav, mrvA = base.mrv * gs.mrv;
      if(mrvA < mavA + 1){ mrvA = mavA + 1; out.binds++; }
      // goal last (proposed): floor sees model figures, then the goal scales both
      let mavB = base.mav, mrvB = base.mrv;
      if(mrvB < mavB + 1) mrvB = mavB + 1;
      mavB *= gs.mav; mrvB *= gs.mrv;
      out.checked++;
      if(R(Math.max(mrvA, mavA+1)) !== R(Math.max(mrvB, mavB+1)))
        out.differs.push(goal + "/" + g + " " + R(mrvA) + " vs " + R(mrvB));
    });
  });
  return out;
}, FX), null, 1));
await b.close();
