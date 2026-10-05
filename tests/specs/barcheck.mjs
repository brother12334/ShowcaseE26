import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
console.log(await p.evaluate(()=>{
  const d=document.createElement('div');
  d.innerHTML='<span class="sc-bar-t"><i style="width:74%"></i></span>'+
              '<span class="sc-bar-t"><i class="w" style="width:74%"></i></span>'+
              '<span class="sc-bar-t"><i class="b" style="width:51%"></i></span>';
  document.body.appendChild(d);
  return [...d.querySelectorAll('i')].map((x,i)=>{
    const c=getComputedStyle(x);
    return ['ok  ','warn','bad '][i]+'  background: '+c.backgroundColor+'   width: '+c.width;
  }).join('\n');
}));
await b.close();
