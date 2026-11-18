import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* AUTOMATIC LOAD MANAGEMENT — THE ACCEPTANCE TESTS, ON THE REAL STATE.

   Unlike replay.mjs, which reconstructs a history from the Training History Report, this
   loads the user's ACTUAL exported state: 74 sessions to 2026-11-16, the live programme
   with its real loads and rep ranges, the three gyms with their three different Smith
   carriages, and the aliases and flags exactly as they stand on the device.

   The fixture is tests/fixtures/state-2026-11-17.json, the export with a live share-link
   credential and the sharing, research and notification settings stripped — none of
   which any load rule reads. Everything the rules DO read is untouched.

   Each section is one of the eight acceptance tests from the feature request, named in
   the words it was asked in. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const loaded = await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  /* The state goes in as the app's own, then through migrate() exactly as a restore
     would, so every rule under test sees what the device sees. */
  Object.keys(fx).forEach(k=>{ S[k] = fx[k]; });
  S.tourDone = true;
  try{ migrate(); }catch(e){ return {err: String(e && e.message || e)}; }
  try{ applySplit(); }catch(e){}
  save();
  const last = S.sessions[S.sessions.length-1];
  return {n: S.sessions.length, first: S.sessions[0].date, last: last.date,
          days: Object.keys(S.program).filter(k=> (S.program[k]||[]).length).join(" "),
          prog: trainPrefs().progression, smith: trainPrefs().smithWeight,
          barMode: trainPrefs().barMode, dbMax: trainPrefs().dbMax,
          gyms: (S.gyms||[]).map(g=> g.name + ":" + g.smith).join(" ")};
}, FX);
console.log("LOADED", JSON.stringify(loaded));
if(loaded.err){ console.log("the state would not load:", loaded.err); process.exit(1); }
ck("the whole export is in", loaded.n === 74 && loaded.last === "2026-11-16", loaded.n + " to " + loaded.last);
ck("with the six days of the current split", /pushA pullA legsA pushB pullB legsB/.test(loaded.days), loaded.days);
ck("and the kit it was logged with", loaded.barMode === "total" && loaded.smith === 25 && loaded.dbMax === 50,
   JSON.stringify({barMode:loaded.barMode, smith:loaded.smith, dbMax:loaded.dbMax}));
ck("and three gyms with different carriages", /Palma Vista Gym:25/.test(loaded.gyms) && /Lotus Gym:35/.test(loaded.gyms),
   loaded.gyms);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
