import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
const FX=JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'),'utf8'));
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900}});
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S,null,{timeout:20000});
const r=await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{hideModal()}catch(e){}
  Object.keys(S).forEach(k=>{delete S[k]});
  Object.keys(fx).forEach(k=>{S[k]=JSON.parse(JSON.stringify(fx[k]))});
  S.tourDone=true; migrate(); try{applySplit()}catch(e){}
  const pr=trainPrefs();
  const gy=(S.gyms||[]).map(g=>({name:g.name, plateStep:g.plateStep,
    plates:Array.isArray(g.plates)?g.plates.slice().sort((a,b)=>a-b)[0]:null, smith:g.smith}));
  return {
    prefsPlateStep: pr.plateStep,
    prefsPlatesMin: Array.isArray(pr.plates)?Math.min(...pr.plates):null,
    smallestPlate: smallestPlate(),
    barStep: loadStepFor("Barbell Back Squat"),
    smithStep: loadStepFor("Smith Machine Squat"),
    dbStep: loadStepFor("Dumbbell Row"),
    cableStep: loadStepFor("Cable Row"),
    uiSaysNotSet: pr.plateStep > 0 ? false : true,
    gyms: gy
  };
}, FX);
console.log(JSON.stringify(r,null,1));
await b.close();
