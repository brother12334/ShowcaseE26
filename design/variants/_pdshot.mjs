import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
const FX=JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'),'utf8'));
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S,null,{timeout:20000});
const info = await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  Object.keys(S).forEach(k=>{delete S[k]});
  Object.keys(fx).forEach(k=>{S[k]=JSON.parse(JSON.stringify(fx[k]))});
  S.tourDone=true;
  /* A REAL disagreement, so the notice is the one a person would actually get:
     the usual kit remembers 10 while the plates say 2.5, and Lotus remembers 25. */
  S.prefs.plateStep = 10;
  S.gyms[1].plateStep = 25;
  migrate(); try{applySplit()}catch(e){}
  try{ SEEDS_RUN=false; }catch(e){}
  runOneTimeSeeds();
  /* BEFORE the render, or render() draws the onboarding screen into #app and the card is
     looked for on a page that was never Today. */
  try{ OB=null }catch(e){} try{ PF=null }catch(e){} try{ hideModal() }catch(e){}
  ['preflight','aiFull','splash'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  TAB='today'; render();
  const nav=document.querySelector('nav'); if(nav) nav.style.display='none';
  return {queued: (S.plateDeriveAsk||[]).slice()};
}, FX);
console.log(JSON.stringify(info,null,1));
const h = await p.evaluateHandle(()=> [...document.querySelectorAll('#app .card')]
  .find(el=> /The bar now moves by the plates you own/.test(el.textContent)));
const el = h.asElement();
if(el) await el.screenshot({path: appFile('design/variants/shots/live_plate_notice.png')});
else console.log("CARD NOT FOUND ON TODAY");
await b.close();
