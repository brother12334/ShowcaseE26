import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE JUMP IS ARITHMETIC, NOT A PREFERENCE.

   A bar takes a plate on each end, so the smallest change it can make is two of the
   smallest plate in the room. Element 26 nonetheless kept a separate "smallest plate"
   number that WON over the plate list, had its own editor, and could disagree with it --
   while the global plate list had no editor at all. So the field somebody could change
   was the one that could be wrong, and the screen said "Not set, so it suggests exact
   numbers your rack can't make" to people whose plates it was already rounding off.

   Section 5 is the one that matters most and is the easiest to get wrong: on the real
   export NOTHING disagrees, so the reconciliation must stay silent. A prompt about a
   change that is not a change is how people learn to dismiss prompts unread. Its control
   plants a genuine disagreement and requires the prompt to appear. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

await p.evaluate(fx=>{
  window.boot = (mutate)=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{hideModal()}catch(e){}
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true;
    if(mutate) mutate(S);
    migrate(); try{ applySplit(); }catch(e){}
  /* A REAL BOOT, not just a load. The one-time repairs used to run from the first
     render, and this called render() to get them. They run from the startup block at the
     end of index.html now, because a render that writes is a render nobody can reason
     about \u2014 see renderpure.mjs. This does what that block does. */
  try{ SEEDS_RUN = false; appHeartbeat(); runOneTimeSeeds(); }catch(e){}

    try{ SEEDS_RUN = false; }catch(e){}
    render(); save();
  };
}, FX);

console.log("\n1. THE PLATES DECIDE, AND THE OLD NUMBER NO LONGER OVERRIDES THEM");
let r = await p.evaluate(()=>{
  boot(S2=>{ S2.prefs.plates = [45,25,10,5,2.5]; S2.prefs.plateStep = 10; });
  return {smallest: smallestPlate(), bar: loadStepFor("Barbell Back Squat"),
          smith: loadStepFor("Smith Machine Squat"), stored: trainPrefs().plateStep};
});
ck("a stored step of 10 does not beat a ticked 2.5", r.smallest === 2.5, r.smallest);
ck("so the bar moves in 5, not 20", r.bar === 5, r.bar);
ck("and the Smith takes the same plates, so the same jump", r.smith === 5, r.smith);
ck("CONTROL: the old value is still stored, it is simply not in charge", r.stored === 10, r.stored);

console.log("\n2. IT IS STILL A FALLBACK FOR SOMEBODY WHO NEVER TICKED ANY");
/* "NEVER TICKED ANY" NOW MEANS ANYWHERE, AND IT DID NOT USED TO.

   This cleared the global plate list and nothing else, which was the whole of the answer
   while smallestPlate() read only the global profile. Item 26 routed the engine through
   kitFor, so a gym\u2019s own plate list is consulted first -- and every gym in this fixture
   has one. Clearing the global list alone left the home gym still holding 2.5s, so the
   fallback under test was never reached and the section was asserting the old engine.

   The scenario it means is somebody who has named no plates at all, so the setup names
   none at all. The gym-by-gym case is section 5's, and gymkit.mjs owns the rule. */
r = await p.evaluate(()=>{
  const noPlatesAnywhere = S2=>{
    S2.prefs.plates = null;
    (S2.gyms || []).forEach(g=>{ g.plates = null; g.plateStep = null; });
  };
  boot(S2=>{ noPlatesAnywhere(S2); S2.prefs.plateStep = 10; });
  const a = {smallest: smallestPlate(), bar: loadStepFor("Barbell Back Squat"),
             /* The control that would have caught the stale setup: with the list really
                gone, no gym can still be answering from one. */
             anyGymHasPlates: (S.gyms || []).some(g=> (g.plates || []).length)};
  boot(S2=>{ noPlatesAnywhere(S2); S2.prefs.plateStep = null; });
  return Object.assign(a, {none: smallestPlate(), noneBar: loadStepFor("Barbell Back Squat")});
});
ck("CONTROL: no plate list is left anywhere, global or per gym",
   r.anyGymHasPlates === false, String(r.anyGymHasPlates));
ck("with no plates named the remembered step is used", r.smallest === 10, r.smallest);
ck("so the bar moves in 20", r.bar === 20, r.bar);
ck("CONTROL: with neither, there is no rounding to do", r.none === 0 && r.noneBar === 0,
   r.none + "/" + r.noneBar);

console.log("\n3. THE SCREEN SAYS THE JUMP AND WILL NOT LET YOU TYPE OVER IT");
r = await p.evaluate(()=>{
  boot();
  TAB='sync'; SET_PAGE='where'; render();
  const html = document.getElementById('app').innerHTML;
  return {says: /Smallest jump/.test(html),
          five: /Smallest jump: <b>5 lb<\/b>, a pair of 2\.5s/.test(html),
          picker: document.querySelectorAll('#app [data-prefpl]').length,
          editable: document.querySelectorAll('#app [data-plstep]').length,
          lie: /suggests exact numbers/.test(html)};
});
ck("the derived jump is stated", r.says);
ck("with the arithmetic and the plate named", r.five);
ck("CONTROL: the plates themselves are tappable", r.picker > 0, r.picker + " chips");
ck("and the old editable step is gone while plates are ticked", r.editable === 0, r.editable);
ck("CONTROL: the sentence that was untrue is gone", r.lie === false);

console.log("\n4. TICKING A PLATE CHANGES THE JUMP, AND IS WHAT YOU EDIT");
/* THIS CHIP EDITS THE GLOBAL LIST, AND ITEM 26 CHANGED WHO LISTENS TO IT.

   The picker used to be the only plate list the engine read, so un-ticking a 2.5 moved
   every jump in the app. The engine now reads the gym you are standing in, and a gym
   with its own list is answered from that list -- so this chip moves the jump at every
   gym that has NOT named its own plates, and no longer moves one that has.

   That is the rule working, and it is also a thing somebody can be surprised by, so both
   halves are written down: here, the gym that inherits; in section 4b, the gym that does
   not. The setup names the home gym as one that inherits, which the old setup got for
   free because there was nothing else to read. */
r = await p.evaluate(async ()=>{
  boot(S2=>{ (S2.gyms || []).forEach(g=>{ g.plates = null; g.plateStep = null; }); });
  TAB='sync'; SET_PAGE='where'; render();
  const before = smallestPlate();
  const chip = document.querySelector('#app [data-prefpl="2.5"]');
  if(chip) chip.click();
  await new Promise(x=> setTimeout(x, 60));
  const after = smallestPlate();
  const stored = (trainPrefs().plates || []).slice();
  return {before, after, stored, had: !!chip,
          ownList: (homeGym() || {}).plates || null,
          bar: loadStepFor("Barbell Back Squat")};
});
ck("CONTROL: the 2.5 chip is on the screen", r.had);
ck("CONTROL: and this gym inherits, rather than naming its own plates",
   r.ownList === null, JSON.stringify(r.ownList));
ck("it started at 2.5", r.before === 2.5, r.before);
ck("un-ticking it moves the smallest plate up to 5", r.after === 5, r.after);
ck("so the bar now moves in 10", r.bar === 10, r.bar);
ck("and the stored list is what changed", r.stored.indexOf(2.5) === -1, JSON.stringify(r.stored));

console.log("\n4b. AND A GYM THAT NAMED ITS OWN PLATES IS NOT MOVED BY IT");
/* The other half, and the consequence worth knowing about: on this fixture every gym has
   its own list, so the global picker reaches none of them. */
r = await p.evaluate(async ()=>{
  boot();
  const own = ((homeGym() || {}).plates || []).slice();
  TAB='sync'; SET_PAGE='where'; render();
  const before = smallestPlate();
  const chip = document.querySelector('#app [data-prefpl="2.5"]');
  if(chip) chip.click();
  await new Promise(x=> setTimeout(x, 60));
  return {own, before, after: smallestPlate(),
          global: (trainPrefs().plates || []).slice(),
          stillOwn: ((homeGym() || {}).plates || []).slice()};
});
ck("CONTROL: the home gym has named its own plates", r.own.indexOf(2.5) > -1,
   JSON.stringify(r.own));
ck("CONTROL: and the tap really did change the global list",
   r.global.indexOf(2.5) === -1, JSON.stringify(r.global));
ck("the gym's own list is untouched", r.stillOwn.indexOf(2.5) > -1,
   JSON.stringify(r.stillOwn));
ck("and the jump there is still its own", r.after === 2.5 && r.after === r.before,
   r.before + " -> " + r.after);

console.log("\n5. THE RECONCILIATION SPEAKS ONLY WHEN SOMETHING ACTUALLY CHANGED");
r = await p.evaluate(()=>{
  boot();
  runOneTimeSeeds();
  TAB='today'; render();
  return {rows: (S.plateDeriveAsk||[]).length, scan: plateDeriveScan().length,
          card: /The bar now moves by the plates you own/.test(document.getElementById('app').innerHTML),
          flag: S.plateDeriveV1};
});
ck("on the real export nothing disagrees", r.scan === 0, r.scan + " disagreement(s)");
ck("so nothing is queued", r.rows === 0);
ck("and Today says nothing about it", r.card === false);
ck("CONTROL: the one-time pass did run", r.flag === 1, r.flag);

r = await p.evaluate(()=>{
  /* CONTROL: a real disagreement, at one named gym and in the usual kit. */
  boot(S2=>{
    S2.prefs.plateStep = 10;                 // says 10, plates say 2.5
    S2.gyms[1].plateStep = 25;               // Lotus says 25, its plates say 2.5
  });
  runOneTimeSeeds();
  TAB='today'; render();
  const html = document.getElementById('app').innerHTML;
  return {rows: (S.plateDeriveAsk||[]).slice(), card: /The bar now moves by the plates you own/.test(html),
          names: /Lotus Gym/.test(html), usual: /Your usual kit/.test(html),
          both: /20 lb → 5 lb a jump/.test(html), seen: !!document.getElementById('pdSeen')};
});
ck("CONTROL: a genuine disagreement IS reported", r.rows.length === 2, r.rows.length + " row(s)");
ck("the card appears on Today", r.card);
ck("the gym is named", r.names);
ck("and so is the usual kit", r.usual);
ck("both jumps are given, old and new", r.both);
ck("CONTROL: there is a way to dismiss it", r.seen);

r = await p.evaluate(()=>{
  const btn = document.getElementById('pdSeen'); if(btn) btn.click();
  TAB='today'; render();
  return {gone: !S.plateDeriveAsk,
          card: /The bar now moves by the plates you own/.test(document.getElementById('app').innerHTML)};
});
ck("dismissing it clears it", r.gone);
ck("and it does not come back", r.card === false);

console.log("\n6. NOTHING THAT WAS LOGGED IS TOUCHED");
r = await p.evaluate(()=>{
  boot(S2=>{ S2.prefs.plateStep = 10; });
  const before = JSON.stringify(S.sessions);
  runOneTimeSeeds();
  return {same: JSON.stringify(S.sessions) === before, n: S.sessions.length};
});
ck("CONTROL: there are sessions to leave alone", r.n > 50, r.n + " sessions");
ck("and the reconciliation changed none of them", r.same);

ck("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
