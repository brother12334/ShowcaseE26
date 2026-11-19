import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1600}});
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const out = await p.evaluate(fx=>{
  const boot = (scale)=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{hideModal()}catch(e){}
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true;
    if(scale != null) S.lmScale = scale;
    migrate(); try{ applySplit(); }catch(e){}
  };
  const look = (scale)=>{
    boot(scale);
    const A = bodyAnalysis();
    return ["chest","triceps","forearms"].map(g=>{
      const L = (A.lm && A.lm[g]) || adjustedLandmarks(A, g) || GROUPS[g];
      const vol = (A.vol && A.vol[g]) || 0;
      return g + " vol=" + Math.round(vol*10)/10 + " mev=" + Math.round(L.mev*10)/10
        + " mav=" + Math.round(L.mav*10)/10 + " mrv=" + Math.round(L.mrv*10)/10;
    });
  };
  return {at100: look(null), at50: look(0.5), scaleAfter: (boot(0.5), Math.round(lmScale()*100))};
}, FX);
console.log("scale 100:\n  " + out.at100.join("\n  "));
console.log("scale 50:\n  " + out.at50.join("\n  "));
console.log("lmScale() reads: " + out.scaleAfter);
await b.close();
