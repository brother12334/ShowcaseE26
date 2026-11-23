import { chromium, APP_URL, appFile, oldBuild } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE SECOND CONVERSION, HELD AGAINST THE REAL SCREEN IT REPLACED.

   "The workout screen" was six option lists in a row, every one the same weight, on a
   screen whose entire subject is what the screen looks like. It is a picture of the
   session now, with the controls under it.

   Same method as sesspref.mjs and the same reason: the old screen is loaded from the
   commit before the conversion rather than described, because a description is written by
   the same person who wrote the change. Two of these settings live on S rather than on
   prefs -- viewMode and askWhy -- so the snapshot covers both, which the first conversion
   did not have to. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const OLD = oldBuild("3e51f41");
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
      TAB='sync'; SET_PAGE='screen'; render();
      document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
    };
    window.pairs = ()=>{
      const out = [];
      document.querySelectorAll('#app *').forEach(el=>{
        for(const a of el.attributes)
          if(/^data-(vmode|prefrestclock|prefrestalert|prefsound|prefhaptics|askwhy)$/.test(a.name))
            out.push(a.name + "=" + a.value);
      });
      return out.sort();
    };
    /* BOTH HOMES. viewMode and askWhy are stored on S, not in prefs; a comparison that
       only read trainPrefs() would call this conversion identical while silently losing
       either of them. */
    window.stateNow = ()=> JSON.stringify({
      prefs: JSON.parse(JSON.stringify(trainPrefs(), Object.keys(trainPrefs()).sort())),
      viewMode: S.viewMode, askWhy: S.askWhy
    });
  }, FX);
  await p.evaluate(()=> window.boot());
  return p;
}

const oldP = await openApp(OLD);
const newP = await openApp(APP_URL);

console.log("\n1. EVERY SETTING SURVIVED");
const oldPairs = await oldP.evaluate(()=> window.pairs());
const newPairs = await newP.evaluate(()=> window.pairs());
const attrOf = x=> x.split("=")[0];
const oldAttrs = [...new Set(oldPairs.map(attrOf))].sort();
const newAttrs = [...new Set(newPairs.map(attrOf))].sort();
ck("CONTROL: the old screen rendered its controls", oldPairs.length >= 11, oldPairs.length + " pairs");
ck("every setting is still here", oldAttrs.filter(a=> newAttrs.indexOf(a) < 0).length === 0,
   oldAttrs.filter(a=> newAttrs.indexOf(a) < 0).join(", "));
ck("and none was invented", newAttrs.filter(a=> oldAttrs.indexOf(a) < 0).length === 0,
   newAttrs.filter(a=> oldAttrs.indexOf(a) < 0).join(", "));
/* Sound, Buzz and Ask-me-why became switches, so one render offers one write where the old
   screen offered two. Reachability is the question, not simultaneity. */
const reach = await newP.evaluate(async (wanted)=>{
  const seen = new Set();
  const sweep = ()=> document.querySelectorAll('#app *').forEach(el=>{
    for(const a of el.attributes)
      if(/^data-(vmode|prefrestclock|prefrestalert|prefsound|prefhaptics|askwhy)$/.test(a.name))
        seen.add(a.name + "=" + a.value);
  });
  sweep();
  for(const attr of [...new Set(wanted.map(x=> x.split("=")[0]))]){
    const el = document.querySelector(`#app [${attr}]`);
    if(el){ el.click(); await new Promise(r=> setTimeout(r, 30)); sweep(); }
  }
  return [...seen].sort();
}, oldPairs);
ck("CONTROL: the sweep saw more than one render's worth", reach.length > newPairs.length,
   reach.length + " vs " + newPairs.length);
ck("every value the old screen could write is still reachable",
   oldPairs.filter(x=> reach.indexOf(x) < 0).length === 0,
   oldPairs.filter(x=> reach.indexOf(x) < 0).join(", "));

await oldP.evaluate(()=> window.boot());
await newP.evaluate(()=> window.boot());

console.log("\n2. THE SAME TAPS LEAVE THE SAME BYTES");
/* notify is left out on purpose: it asks the browser for notification permission, which
   is a prompt rather than a stored value, and what it writes is covered by buzz and off. */
const PLAN = [
  ["data-vmode","focus"], ["data-vmode","regular"],
  ["data-prefrestclock","up"], ["data-prefrestclock","down"],
  ["data-prefrestalert","buzz"], ["data-prefrestalert","off"],
  ["data-prefsound","off"], ["data-prefsound","on"],
  ["data-prefhaptics","off"], ["data-prefhaptics","on"],
  ["data-askwhy","off"], ["data-askwhy","on"]
];
const tap = (page, attr, val)=> page.evaluate(([a,v])=>{
  const el = document.querySelector(`#app [${a}="${v}"]`);
  if(!el) return {found:false};
  el.click();
  return {found:true, state: window.stateNow()};
}, [attr, val]);
const start = await oldP.evaluate(()=> window.stateNow());
let mismatches = [], notFound = [], moved = 0;
for(const [attr, val] of PLAN){
  const a = await tap(oldP, attr, val);
  const c = await tap(newP, attr, val);
  if(!a.found || !c.found){ notFound.push(attr+"="+val+(a.found?" (new)":" (old)")); continue; }
  if(a.state !== c.state) mismatches.push(attr+"="+val);
  if(a.state !== start) moved++;
}
ck("CONTROL: every planned tap was found on both", notFound.length === 0, notFound.join(", "));
ck("and after each one the stored state is identical", mismatches.length === 0, mismatches.join(", "));
ck("CONTROL: the settings really moved along the way", moved >= 6,
   moved + " of " + PLAN.length + " taps left the start state");
ck("and both end where they started",
   (await oldP.evaluate(()=> window.stateNow())) === (await newP.evaluate(()=> window.stateNow())));

console.log("\n3. THE PICTURE IS OF THE SETTING, NOT A DECORATION");
const pic = await newP.evaluate(async ()=>{
  boot();
  const sessionShape = document.querySelectorAll('#app .wsm-row').length;
  document.querySelector('#app [data-vmode="focus"]').click();
  await new Promise(r=> setTimeout(r, 40));
  const focusShape = {rows: document.querySelectorAll('#app .wsm-row').length,
                      card: document.querySelectorAll('#app .wsm-card').length};
  /* NO TEXT IN IT. It shows structure; the moment it carries a word it can be wrong. */
  const words = (document.querySelector('#app .wsm') || {textContent:""}).textContent.trim();
  const hidden = (document.querySelector('#app .wsm') || {}).getAttribute
    ? document.querySelector('#app .wsm').getAttribute('aria-hidden') : null;
  return {sessionShape, focusShape, words, hidden};
});
ck("CONTROL: the session view draws its rows", pic.sessionShape >= 3, pic.sessionShape);
ck("gym mode draws something else entirely",
   pic.focusShape.rows === 0 && pic.focusShape.card === 1, JSON.stringify(pic.focusShape));
ck("the picture carries no words at all", pic.words === "", pic.words);
ck("and is hidden from a screen reader, which would only hear furniture",
   pic.hidden === "true", pic.hidden);

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
ck("the rare setting is behind More", shape.more === 1, shape.more);
ck("CONTROL: none of the old stacked option lists is left", shape.oldLists === 0, shape.oldLists);
ck("every control clears 44px", shape.small === 0, shape.small + " under");

await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
