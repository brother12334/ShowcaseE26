import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
/* WHICH STEP of the chain differs for lean/upper_back between the two builds. */
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
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
    S.volHold = null;
    S.setup = Object.assign({}, S.setup, {goal: "lean"});
    S.lmScale = 1;
    const A = bodyAnalysis();
    const L = adjustedLandmarks(A, "upper_back");
    return {out: L.mev + "/" + L.mav + "/" + L.mrv, base: L.base,
            why: L.why.map(w=> w.k + " = " + w.v)};
  }, FX);
  await p.close();
  return out;
}
console.log("OLD  " + JSON.stringify(await read(OLD), null, 1));
console.log("NEW  " + JSON.stringify(await read(APP_URL), null, 1));
await b.close();
