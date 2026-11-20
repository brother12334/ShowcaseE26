import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
/* WHAT DID MOVING THE GOAL BELOW THE MODEL LINE ACTUALLY CHANGE?

   Reconstructing the arithmetic was unreliable, so this reads both builds. Every muscle,
   every goal, three scales, with NO hold in force -- so any difference is the reordering
   itself and not the fix. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const OLD = "file:///tmp/claude-0/-home-user-ShowcaseE26/cb903a36-3103-5d6a-a18b-78ade397246e/scratchpad/base52.html";
const b = await chromium.launch();

async function read(url){
  const p = await b.newPage({viewport:{width:390,height:900}});
  p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  const out = await p.evaluate(fx=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{hideModal()}catch(e){}
    const res = {};
    [1, 0.75, 1.3].forEach(sc=>{
      Object.keys(GOAL_SCALE).forEach(goal=>{
        Object.keys(S).forEach(k=>{ delete S[k]; });
        Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
        S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
        S.volHold = null;
        S.setup = Object.assign({}, S.setup, {goal});
        S.lmScale = sc;
        const A = bodyAnalysis();
        GKEYS.forEach(g=>{
          const L = adjustedLandmarks(A, g);
          res[sc + "/" + goal + "/" + g] = L.mev + "/" + L.mav + "/" + L.mrv;
        });
      });
    });
    return res;
  }, FX);
  await p.close();
  return out;
}
const a = await read(OLD), c = await read(APP_URL);
await b.close();
const keys = Object.keys(a);
const diff = keys.filter(k=> a[k] !== c[k]);
console.log("compared " + keys.length + " muscle/goal/scale combinations");
console.log("differ:  " + diff.length);
diff.slice(0, 40).forEach(k=> console.log("  " + k + "  " + a[k] + "  ->  " + c[k]));
