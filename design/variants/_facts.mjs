import { chromium, APP_URL, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
const FX=JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'),'utf8'));
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:1400}});
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S,null,{timeout:20000});
const PAGE = process.argv[2] || 'sess';
const t = await p.evaluate(([fx,PAGE])=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
  ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  Object.keys(S).forEach(k=>{delete S[k]});
  Object.keys(fx).forEach(k=>{S[k]=JSON.parse(JSON.stringify(fx[k]))});
  S.tourDone=true; migrate(); try{applySplit()}catch(e){}
  TAB='sync'; SET_PAGE=PAGE; render();
  document.querySelectorAll('#app details').forEach(d=> d.open=true);
  return document.getElementById('app').innerText.replace(/\s+/g,' ');
}, [FX, PAGE]);
const SETS = {
 gym: [
  ["loads are shown and entered in lb", /entered in lb/i],
  ["and in kg if you switch",           /entered in kg/i],
  ["switching converts nothing logged", /Nothing already logged is converted/i],
  ["bodyweight: the Body tab log",      /weigh-in log on the Body tab/i],
  ["bodyweight off asks for nothing",   /nothing in the app asks for it or shows it/i],
  ["bodyweight off deletes nothing",    /does not delete a single weigh-in/i],
  ["tape in inches",                    /the rest in <b>in<\/b>|the rest in in\b/i],
  ["tape in centimetres",               /same measurements in/i],
  ["tape is independent of lb\/kg",     /Independent of pounds or kilos/i],
  ["the bar example uses your bar",     /on each end is/i],
  ["plates only leaves the bar out",    /the plates, with the bar left out/i],
  ["it is always the whole load",       /never one side/i]
 ]
};
const FACTS = SETS[PAGE] || [
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
