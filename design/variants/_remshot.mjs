import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
const FX=JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'),'utf8'));
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:390,height:1100},deviceScaleFactor:2});
p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S,null,{timeout:20000});
await p.evaluate(fx=>{
  window.boot = (mutate)=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
    ['preflight','aiFull','splash'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    Object.keys(S).forEach(k=>{delete S[k]});
    Object.keys(fx).forEach(k=>{S[k]=JSON.parse(JSON.stringify(fx[k]))});
    S.tourDone=true; if(mutate) mutate(S);
    migrate(); try{applySplit()}catch(e){}
    window.pushBlocker = ()=> "";
    try{ PUSH_DIAG = {support:true, perm:"granted", sw:true, sub:true, account:true, sched:3}; }catch(e){}
    TAB='sync'; SET_PAGE='remind'; render();
    document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
  };
}, FX);
const dir = "design/variants/shots/";
await p.evaluate(()=> boot(S2=>{ S2.pushOn=true; S2.remindAt="17:00"; S2.remindBed=true; S2.remindWake=true; }));
await p.screenshot({path: dir + "remind-on.png", fullPage: true});
await p.evaluate(()=> boot(S2=>{ S2.pushOn=false; S2.remindAt=null; S2.remindBed=false; S2.remindWake=false; }));
await p.screenshot({path: dir + "remind-off.png", fullPage: true});
const r = await p.evaluate(()=>{
  boot(S2=>{ S2.pushOn=true; S2.remindAt="17:00"; S2.remindBed=true; S2.remindWake=true; });
  const app=document.getElementById('app');
  app.querySelectorAll('details').forEach(d=> d.open=true);
  return {heroes: app.querySelectorAll('.sd-hero').length,
          hero: (app.querySelector('.sd-hero-v')||{textContent:''}).textContent.trim(),
          secs: app.querySelectorAll('.sd-sec').length,
          togs: app.querySelectorAll('.sd-tog').length,
          more: app.querySelectorAll('.sd-more').length,
          oldSeg: app.querySelectorAll('.seg').length,
          small: [...app.querySelectorAll('.sd-tog,.sd-more > summary,.btn')]
            .filter(el=> el.getBoundingClientRect().height < 44)
            .map(el=> (el.className||el.tagName)+":"+Math.round(el.getBoundingClientRect().height)+":"+el.textContent.trim().slice(0,24))};
});
console.log(JSON.stringify(r));
console.log("page errors: " + JSON.stringify(errs));
await b.close();
