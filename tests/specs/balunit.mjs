import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:800}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S);
console.log('balanceProjection on a modest, realistic split (push 8 / pull 12):');
console.log(await p.evaluate(()=>{
  const A={wk:{}, cyc:{pending:{}}};
  GKEYS.forEach(g=> A.wk[g]={sets:0});
  A.wk.chest={sets:8}; A.wk.lats={sets:12};
  return [0,1,2,3,4,6].map(add=>{
    const r=balanceProjection(A,'chest',add);
    return add+' sets → '+r.line+'  ['+(r.ok?'LEVEL':'not yet')+']  '+r.verdict;
  });
}));
await b.close();
