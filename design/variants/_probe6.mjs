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
console.log(JSON.stringify(await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{hideModal()}catch(e){}
  Object.keys(S).forEach(k=>{ delete S[k]; });
  Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
  S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
  const shot = (tag)=>{
    const A = bodyAnalysis();
    const direct = adjustedLandmarks({wk:A.wk, modInfo:A.modInfo, win:A.win}, "chest");
    return {tag, scale: lmScale(), stored: S.lmScale,
      fromAnalysis: Math.round(A.lm.chest.mev*100)/100,
      fromDirect:   Math.round(direct.mev*100)/100,
      why: (direct.why || []).map(w=> w.k).join(" > ")};
  };
  const a = shot("scale unset");
  S.lmScale = 0.75;
  const c = shot("scale 0.75");
  return {a, c};
}, FX), null, 1));
await b.close();
