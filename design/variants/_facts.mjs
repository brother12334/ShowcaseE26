import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
const FX=JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'),'utf8'));
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:1400}});
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S,null,{timeout:20000});
const t = await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
  ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  Object.keys(S).forEach(k=>{delete S[k]});
  Object.keys(fx).forEach(k=>{S[k]=JSON.parse(JSON.stringify(fx[k]))});
  S.tourDone=true; migrate(); try{applySplit()}catch(e){}
  TAB='sync'; SET_PAGE='sess'; render();
  document.querySelectorAll('#app details').forEach(d=> d.open=true);
  return document.getElementById('app').innerText.replace(/\s+/g,' ');
}, FX);
const FACTS = [
  ["a skipped day stays next",       /stays next in line/i],
  ["tapping a day on Today picks it",/Tap any day on the strip at the top of Today/i],
  ["deload off is for self-scheduling plans", /for a programme that schedules its own/i],
  ["the fixed side is the right",    /opens every session on the same side|opens on the right/i],
  ["RPE off drops the column",       /Off drops the column/i],
  ["the RPE glossary link",          /What RPE means/i],
  ["overload off leaves last time's sets", /last time's sets are still shown/i],
  ["picks off is everyone's feed",   /everyone's feed, newest first/i]
];
let bad=0;
FACTS.forEach(([name,re])=>{ const ok=re.test(t); if(!ok) bad++;
  console.log((ok?"  ok   ":"  MISSING ")+name); });
await b.close(); process.exit(bad?1:0);
