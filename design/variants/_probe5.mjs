import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
/* Drive the REAL dial the way a finger does, and watch the rows and bars. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1600}});
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{hideModal()}catch(e){}
  ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  Object.keys(S).forEach(k=>{ delete S[k]; });
  Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
  S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
  TAB='sync'; SET_PAGE='targets'; render();
}, FX);

const read = ()=> p.evaluate(()=>{
  const row = [...document.querySelectorAll('#app .tg-row')]
    .find(x=> (x.querySelector('[data-tgopen]')||{dataset:{}}).dataset.tgopen === 'chest');
  const bar = row && row.querySelector('.tg-bar');
  return {
    scale: Math.round(lmScale() * 100),
    stored: S.lmScale === undefined ? "unset" : S.lmScale,
    rowText: (row.querySelector('.tg-v')||{textContent:''}).textContent.trim(),
    bandLeft: bar ? bar.querySelector('.tg-bar-band').style.left : "none",
    bandRight: bar ? bar.querySelector('.tg-bar-band').style.right : "none",
    fnLm: (()=>{ const A = bodyAnalysis(); const L = A.lm.chest;
      return Math.round(L.mev*10)/10 + "/" + Math.round(L.mav*10)/10 + "/" + Math.round(L.mrv*10)/10; })()
  };
});

console.log("before:  " + JSON.stringify(await read()));
await p.evaluate(()=> document.getElementById('tgDial').focus());
for(let i = 0; i < 5; i++) await p.keyboard.press("ArrowLeft");
await p.waitForTimeout(800);
console.log("after 5 lefts: " + JSON.stringify(await read()));
await b.close();
