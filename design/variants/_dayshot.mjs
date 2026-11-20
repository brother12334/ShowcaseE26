import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
/* The real day screen, both states, plus a press of the real stepper. */
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
    TAB='sync'; SET_PAGE='day'; render();
    document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
  };
}, FX);

const dir = "design/variants/shots/";
await p.evaluate(()=> boot(S2=>{ S2.sleepTarget = 8; }));
console.log("with a target: " + await p.evaluate(()=> S.sleepTarget));
await p.screenshot({path: dir + "day-set.png", fullPage: true});

await p.evaluate(()=> boot(S2=>{ S2.sleepTarget = null; }));
console.log("unset readout: " + await p.evaluate(()=>
  (document.querySelector('#app [data-sdstepv]')||{textContent:'MISSING'}).textContent));
await p.screenshot({path: dir + "day-unset.png", fullPage: true});

/* And the control actually works. */
let r = await p.evaluate(async ()=>{
  boot(S2=>{ S2.sleepTarget = null; });
  const up = document.querySelector('#app [data-sdstep$=":up"]');
  up.click();
  await new Promise(x=> setTimeout(x, 60));
  const a = S.sleepTarget;
  document.querySelector('#app [data-sdstep$=":up"]').click();
  await new Promise(x=> setTimeout(x, 60));
  const c = S.sleepTarget;
  /* All the way down, to confirm it reaches off again rather than sticking at 3. */
  let guard = 0;
  while(S.sleepTarget != null && guard++ < 40){
    const dn = document.querySelector('#app [data-sdstep$=":down"]');
    if(!dn || dn.disabled) break;
    dn.click();
    await new Promise(x=> setTimeout(x, 15));
  }
  return {fromOff: a, thenUp: c, down: S.sleepTarget, steps: guard,
          hero: (document.querySelector('#app .sd-hero-v')||{textContent:''}).textContent.trim()};
});
console.log(JSON.stringify(r));
r = await p.evaluate(()=>{
  boot(S2=>{ S2.sleepTarget = 8; });
  const app = document.getElementById('app');
  return {heroes: app.querySelectorAll('.sd-hero').length,
          more: app.querySelectorAll('.sd-more').length,
          says: app.querySelectorAll('.sd-says').length,
          small: [...app.querySelectorAll('.sd-step button,.sd-tog,.sd-more > summary')]
            .filter(el=> el.getBoundingClientRect().height < 44)
            .map(el=> el.tagName + ":" + Math.round(el.getBoundingClientRect().height))};
});
console.log(JSON.stringify(r));
console.log("page errors: " + JSON.stringify(errs));
await b.close();
