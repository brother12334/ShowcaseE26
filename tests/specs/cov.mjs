import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage();
p.on('pageerror',e=>console.log('ERR',e.message));
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
console.log(await p.evaluate(()=>{
  const names=[]; Object.keys(EX_LIBRARY).forEach(k=>EX_LIBRARY[k].forEach(x=>names.push(x.name)));
  let exact=0, kw=0, miss=[];
  names.forEach(n=>{
    const t=tableKey(n), k=nrm(n);
    if(EX_MUSCLES_C[t]||EX_MUSCLES_C[k]||EX_MUSCLES_F[dashFlat(t)]||EX_MUSCLES_F[dashFlat(k)]) exact++;
    else if(musclesFor(n)) kw++;
    else miss.push(n);
  });
  return 'catalogue movements: '+names.length+'\n  exact table hit: '+exact+
    '\n  keyword only:    '+kw+'\n  no muscles:      '+miss.length+
    (miss.length?'\n    '+miss.slice(0,40).join('\n    '):'');
}));
await b.close();
