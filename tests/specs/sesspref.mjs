import { chromium, APP_URL, appFile, oldBuild } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* A VISUAL REDESIGN THAT CHANGES WHAT GETS STORED IS NOT A VISUAL REDESIGN.

   "How training is run" was nine option lists stacked in a row and is now a hero, two
   groups and a More. The promise attached to that was that every setting still reads and
   writes exactly what it did before, and a promise is not a test.

   So this compares the converted screen against the REAL OLD ONE, loaded from the commit
   before the conversion (a71826e) rather than from a description of it. Section 1 proves
   no setting was dropped, gained, or had its stored values altered -- comparing the
   attribute/value pairs the two screens actually emit. Section 2 drives every control on
   the new screen and requires the stored preferences to come out byte-identical to the
   old screen's for the same taps. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const OLD = oldBuild("a71826e");
const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

async function openApp(url){
  const p = await b.newPage({viewport:{width:390,height:1400}});
  p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(fx=>{
    window.boot = ()=>{
      const sp=document.getElementById('splash'); if(sp) sp.remove();
      try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
      ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
      document.body.classList.remove('ai-open','onboarding','pfl-open');
      Object.keys(S).forEach(k=>{ delete S[k]; });
      Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
      S.tourDone = true;
      if(typeof INTRO_GEN === "number") S.introSeen = INTRO_GEN;
      migrate(); try{ applySplit(); }catch(e){}
      TAB='sync'; SET_PAGE='sess'; render();
    };
    window.pairs = ()=>{
      const out = [];
      document.querySelectorAll('#app *').forEach(el=>{
        for(const a of el.attributes){
          if(/^data-(pref|setdayorder)/.test(a.name)) out.push(a.name + "=" + a.value);
        }
      });
      return out.sort();
    };
    window.prefsNow = ()=> JSON.stringify(trainPrefs(), Object.keys(trainPrefs()).sort());
  }, FX);
  await p.evaluate(()=> window.boot());
  return p;
}

const oldP = await openApp(OLD);
const newP = await openApp(APP_URL);

console.log("\n1. EVERY SETTING SURVIVED, WITH THE SAME STORED VALUES");
const oldPairs = await oldP.evaluate(()=> window.pairs());
const newPairs = await newP.evaluate(()=> window.pairs());
ck("CONTROL: the old screen really did render its controls", oldPairs.length >= 18,
   oldPairs.length + " pairs");
const attrOf = x=> x.split("=")[0];
const oldAttrs = [...new Set(oldPairs.map(attrOf))].sort();
const newAttrs = [...new Set(newPairs.map(attrOf))].sort();
ck("every setting the old screen had is still here",
   oldAttrs.filter(a=> newAttrs.indexOf(a) < 0).length === 0,
   oldAttrs.filter(a=> newAttrs.indexOf(a) < 0).join(", "));
ck("and none was invented", newAttrs.filter(a=> oldAttrs.indexOf(a) < 0).length === 0,
   newAttrs.filter(a=> oldAttrs.indexOf(a) < 0).join(", "));
/* A SNAPSHOT IS THE WRONG COMPARISON FOR A TOGGLE. Three of these settings were a pair of
   buttons and are a single switch now, so one render offers one write -- the value it will
   set -- where the old screen offered both. The question is not whether both appear at
   once; it is whether both are still REACHABLE. So every value the old screen could write
   is required to appear on the new one, within one flip of its own control. */
const reach = await newP.evaluate(async (wanted)=>{
  const seen = new Set();
  const sweep = ()=> document.querySelectorAll('#app *').forEach(el=>{
    for(const a of el.attributes)
      if(/^data-(pref|setdayorder)/.test(a.name)) seen.add(a.name + "=" + a.value);
  });
  sweep();
  /* One flip of each control that is a switch, then look again. */
  for(const attr of [...new Set(wanted.map(x=> x.split("=")[0]))]){
    const el = document.querySelector(`#app [${attr}]`);
    if(el){ el.click(); await new Promise(r=> setTimeout(r, 20)); sweep(); }
  }
  return [...seen].sort();
}, oldPairs);
const unreachable = oldPairs.filter(x=> reach.indexOf(x) < 0);
ck("CONTROL: the sweep reached more than one render's worth",
   reach.length > newPairs.length, reach.length + " vs " + newPairs.length + " in one render");
ck("every value the old screen could write is still reachable",
   unreachable.length === 0, unreachable.join(", "));

/* Section 1's reach sweep flipped every switch on the new page to see what it could
   write, so the two pages are no longer standing in the same place. Both are reset before
   anything is compared, or the comparison below is between two different starting states. */
await oldP.evaluate(()=> window.boot());
await newP.evaluate(()=> window.boot());
console.log("\n2. THE SAME TAPS LEAVE THE SAME BYTES");
/* Each attribute, each value it can carry, applied to BOTH screens in the same order. */
const PLAN = [
  ["data-prefprog","auto"], ["data-prefprog","hold"], ["data-prefprog","ask"],
  ["data-prefwarm","planOnly"], ["data-prefwarm","manual"], ["data-prefwarm","auto"],
  ["data-prefrpe","off"], ["data-prefrpe","on"],
  ["data-prefpo","off"], ["data-prefpo","on"],
  ["data-prefrpicks","off"], ["data-prefrpicks","on"],
  ["data-prefclimb","off"], ["data-prefclimb","peak"],
  ["data-prefdeload","planOnly"], ["data-prefdeload","auto"],
  ["data-prefsides","separate"], ["data-prefsides","both"], ["data-prefsides","matchWeaker"],
  ["data-setdayorder","any"], ["data-setdayorder","fixed"]
];
const tap = (page, attr, val)=> page.evaluate(([a,v])=>{
  /* MORE IS CLOSED BY DEFAULT ON THE NEW SCREEN, and a control inside a closed <details>
     is still in the DOM and still clickable, which is what matters for what gets stored. */
  const el = document.querySelector(`#app [${a}="${v}"]`);
  if(!el) return {found:false};
  el.click();
  return {found:true, prefs: window.prefsNow()};
}, [attr, val]);

const startOld = await oldP.evaluate(()=> window.prefsNow());
let mismatches = [], notFound = [], moved = 0;
for(const [attr, val] of PLAN){
  const a = await tap(oldP, attr, val);
  const c = await tap(newP, attr, val);
  if(!a.found || !c.found){ notFound.push(attr+"="+val+(a.found?" (new)":" (old)")); continue; }
  if(a.prefs !== c.prefs) mismatches.push(attr+"="+val);
  if(a.prefs !== startOld) moved++;
}
ck("CONTROL: every planned tap was found on both screens", notFound.length === 0, notFound.join(", "));
ck("and after each one the stored preferences are identical",
   mismatches.length === 0, mismatches.join(", "));

const finalOld = await oldP.evaluate(()=> window.prefsNow());
const finalNew = await newP.evaluate(()=> window.prefsNow());
ck("so the whole preference object matches at the end", finalOld === finalNew);
/* The plan deliberately returns every setting to the value it started on, so the two
   objects matching AT THE END is expected and proves nothing on its own. What has to be
   true is that they were genuinely moved in between — otherwise a screen with no working
   controls at all would pass this section. */
ck("CONTROL: the settings really were moved along the way",
   moved >= PLAN.length - 9, moved + " of " + PLAN.length + " taps left the start state");
ck("and the sequence ends where it started, on both", finalOld === startOld);

console.log("\n3. INSTANT SAVE, WITH THE WAY BACK");
const u = await newP.evaluate(async ()=>{
  boot();
  document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
  const before = trainPrefs().warmups;
  document.querySelector('#app [data-prefwarm="manual"]').click();
  await new Promise(r=> setTimeout(r, 60));
  /* The LAST toast. Earlier sections left a pile, and the first one in the host is the
     oldest \u2014 which is not the one this tap just produced. */
  const all = document.querySelectorAll('#toasts .tst');
  const t = all[all.length - 1];
  return {before, after: trainPrefs().warmups, toasted: !!t,
          hasUndo: !!(t && t.querySelector('.tst-u'))};
});
ck("CONTROL: the tap really changed the setting", u.before === "auto" && u.after === "manual",
   u.before + " -> " + u.after);
ck("CONTROL: it produced a toast to act on", u.toasted);
ck("which carries Undo as a button, not a word on the toast itself", u.hasUndo);

/* PRESSED THROUGH THE BROWSER, not from inside evaluate(). A scripted click is untrusted
   and is refused on purpose, so the undo has to travel the path a thumb takes \u2014 which
   is also why this assertion had to move out of the page context when the guard landed. */
await newP.locator('#toasts .tst-u').last().click();
await newP.waitForTimeout(220);
const u2 = await newP.evaluate(()=>{
  const key = Object.keys(localStorage).find(k=> k.indexOf("ironlog.v1") === 0);
  return {back: trainPrefs().warmups, key: !!key,
          onDisk: key ? (JSON.parse(localStorage.getItem(key) || "{}").prefs || {}).warmups : null};
});
ck("and taking it restores what was actually there", u2.back === "auto", u2.back);
ck("CONTROL: there is a stored copy to check", u2.key);
ck("including on disk", u2.onDisk === "auto", u2.onDisk);

console.log("\n4. UNCROWDED, AS THE RULE ASKS");
const shape = await newP.evaluate(()=>{
  boot();
  const app = document.getElementById('app');
  return {heroes: app.querySelectorAll('.sd-hero').length,
          more: app.querySelectorAll('.sd-more').length,
          oldLists: app.querySelectorAll('.ch-list').length,
          small: [...app.querySelectorAll('.sd-seg button,.sd-tog,.sd-more > summary')]
            .filter(el=> el.getBoundingClientRect().height < 44).length};
});
ck("exactly one hero", shape.heroes === 1, shape.heroes);
ck("and the rare settings are behind More", shape.more === 1, shape.more);
ck("CONTROL: none of the old stacked option lists is left", shape.oldLists === 0, shape.oldLists);
ck("every control clears 44px", shape.small === 0, shape.small + " under");

await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
