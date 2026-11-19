import { chromium, APP_URL } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
const FX=JSON.parse(readFileSync('/tmp/claude-0/-home-user-ShowcaseE26/cb903a36-3103-5d6a-a18b-78ade397246e/scratchpad/live.json','utf8'));
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900}});
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S,null,{timeout:20000});
const r=await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  Object.keys(S).forEach(k=>{delete S[k]});
  Object.keys(fx).forEach(k=>{S[k]=JSON.parse(JSON.stringify(fx[k]))});
  S.tourDone=true; migrate(); try{applySplit()}catch(e){}
  try{ SEEDS_RUN=false }catch(e){}
  const scan = plateDeriveScan();
  runOneTimeSeeds();
  return {scan, queued:(S.plateDeriveAsk||[]).length,
          smallest: smallestPlate(),
          bar: loadStepFor("Barbell Back Squat"),
          smith: loadStepFor("Smith Machine Squat"),
          say: plateJumpSay()};
}, FX);
console.log(JSON.stringify(r,null,1));
await b.close();
