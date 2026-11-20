import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
const FX=JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'),'utf8'));
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:390,height:1200},deviceScaleFactor:2});
p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-7K4Q-2M18',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-7K4Q-2M18'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S,null,{timeout:20000});
await p.evaluate(fx=>{
  window.boot=(page)=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
    ['preflight','aiFull','splash'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    Object.keys(S).forEach(k=>{delete S[k]});
    Object.keys(fx).forEach(k=>{S[k]=JSON.parse(JSON.stringify(fx[k]))});
    S.tourDone=true; migrate(); try{applySplit()}catch(e){}
    TAB='sync'; SET_PAGE=page; render();
    document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
  };
}, FX);
const out={};
for(const page of ["acct","data","patch","storage","help","legal"]){
  await p.evaluate(pg=> boot(pg), page);
  await p.screenshot({path:"design/variants/shots/six-"+page+".png", fullPage:true});
  out[page] = await p.evaluate(()=>{
    const app=document.getElementById('app');
    const small=[...app.querySelectorAll('.sd-tog,.sd-more > summary,.sd-seg button')]
      .filter(el=> el.getBoundingClientRect().height < 44).length;
    return {heroes: app.querySelectorAll('.sd-hero').length,
            secs: [...app.querySelectorAll('.sd-sec')].map(x=>x.textContent.trim()),
            more: app.querySelectorAll('.sd-more').length,
            oldBlocks: app.querySelectorAll('.set-block').length,
            len: app.innerHTML.length, small};
  });
}
console.log(JSON.stringify(out,null,1));
console.log("errors: "+JSON.stringify(errs));
await b.close();
