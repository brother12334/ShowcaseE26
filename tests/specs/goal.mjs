import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:800}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
console.log(await p.evaluate(()=>{
  const out=[];
  const A=bodyAnalysis();
  ['muscle','lean','strength','health'].forEach(g=>{
    S.setup=S.setup||{}; S.setup.goal=g;
    const L=adjustedLandmarks(A,'chest');
    out.push(g.padEnd(9)+' chest  mev '+L.mev.toFixed(1)+'  mav '+L.mav.toFixed(1)+'  mrv '+L.mrv.toFixed(1)+
      '   [goalName: '+goalName()+']');
  });
  S.setup.goal="lean";
  const why=adjustedLandmarks(bodyAnalysis(),'chest').why||[];
  out.push('why rows: '+why.map(w=>w.k+' = '+(w.v||'')).join(' | '));
  out.push('optional groups never flag a floor: '+['neck','adductors'].map(g=>g+' mev '+GROUPS[g].mev).join(', '));
  S.setup.goal="muscle";
  return out.join('\n');
}));
await b.close();
