import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE FIFTH CONVERSION, HELD AGAINST THE REAL SCREEN IT REPLACED.

   "Where you train" leads with how many rooms Element 26 knows, and the control under
   that hero is the list of them -- the count's control is the thing it counts. The kit
   follows; the location switch folds away, because recognising where you are is a
   convenience while the plates decide what you are prescribed.

   This screen carries more per-row machinery than any converted so far: four icon buttons
   on every gym (home, kit, rename, forget), the whole of gymGearHTML with its plate
   picker, and three different ways in and out of geolocation. None of it was rewritten,
   so this spec exists to prove none of it was lost. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const OLD = "file:///tmp/claude-0/-home-user-ShowcaseE26/cb903a36-3103-5d6a-a18b-78ade397246e/scratchpad/cmp/index.html";
const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

async function openApp(url){
  const p = await b.newPage({viewport:{width:390,height:1800}});
  p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(fx=>{
    window.boot = (mutate)=>{
      const sp=document.getElementById('splash'); if(sp) sp.remove();
      try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
      ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
      document.body.classList.remove('ai-open','onboarding','pfl-open');
      Object.keys(S).forEach(k=>{ delete S[k]; });
      Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
      S.tourDone = true;
      if(mutate) mutate(S);
      migrate(); try{ applySplit(); }catch(e){}
      TAB='sync'; SET_PAGE='where'; render();
      document.querySelectorAll('#app details').forEach(d=> d.open = true);
      document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
    };
    window.ids = ()=>{
      const out = [];
      document.querySelectorAll('#app *').forEach(el=>{
        if(el.id) out.push("#" + el.id);
        for(const a of el.attributes)
          if(/^data-(gym|pref|pl|db|stk|tape|track)/.test(a.name)) out.push(a.name);
      });
      return [...new Set(out)].sort();
    };
    window.kit = ()=> JSON.stringify({
      prefs: JSON.parse(JSON.stringify(trainPrefs(), Object.keys(trainPrefs()).sort())),
      gyms: S.gyms, homeGym: S.homeGym, geo: S.geo
    });
  }, FX);
  await p.evaluate(()=> window.boot());
  return p;
}

const oldP = await openApp(OLD);
const newP = await openApp(APP_URL);

console.log("\n1. NOTHING ON THE SCREEN WENT MISSING");
const a = await oldP.evaluate(()=> window.ids());
const c = await newP.evaluate(()=> window.ids());
ck("CONTROL: the old screen rendered its controls", a.length >= 10, a.length + " handles");
const gone = a.filter(x=> c.indexOf(x) < 0);
ck("every control the old screen had is still here", gone.length === 0, gone.join(", "));

console.log("\n2. EVERY GYM KEEPS ITS FOUR BUTTONS");
let r = await newP.evaluate(()=>{
  const rows = [...document.querySelectorAll('#app .gym-row')];
  return {rows: rows.length, gyms: (S.gyms||[]).length,
    complete: rows.filter(x=> x.querySelector('[data-gymhome]') && x.querySelector('[data-gymkit]')
      && x.querySelector('[data-gymren]') && x.querySelector('[data-gymdel]')).length,
    starred: rows.filter(x=> x.querySelector('[data-gymhome][aria-pressed="true"]')).length};
});
ck("CONTROL: the gyms are listed", r.rows === r.gyms, r.rows + " of " + r.gyms);
ck("each has home, kit, rename and forget", r.complete === r.rows, r.complete + " complete");
ck("and exactly one is marked home", r.starred === 1, r.starred);

console.log("\n3. THE HERO COUNTS WHAT IS THERE");
r = await newP.evaluate(()=>{
  /* The unit lives inside the readout as an <i>, so textContent is "3gyms". The number
     is the first child node, which is what the hero is actually counting. */
  const el = document.querySelector('#app .sd-hero-v');
  const v = el ? (el.firstChild ? String(el.firstChild.textContent).trim() : "") : "";
  const sub = (document.querySelector('#app .sd-hero-s')||{textContent:''}).textContent;
  return {v, sub, n: (S.gyms||[]).length, home: (homeGym()||{}).name || ""};
});
ck("the number is the number of gyms", r.v === String(r.n), r.v + " vs " + r.n);
ck("and the line under it names your usual", r.sub.indexOf(r.home) > -1, r.sub.slice(0, 70));

console.log("\n4. THE KIT STILL WRITES WHAT IT ALWAYS WROTE");
/* Each control tapped on both screens in the same order, comparing prefs, gyms and the
   geolocation setting after every one. */
const PLAN = [
  ["data-dbstep","10"], ["data-dbstep","5"],
  ["data-stkstep","5"], ["data-stkstep","2.5"],
  ["data-prefpl","1.25"], ["data-prefpl","1.25"],
  ["data-prefpl","2.5"],  ["data-prefpl","2.5"]
];
const tap = (page, attr, val)=> page.evaluate(([x,v])=>{
  const el = document.querySelector(`#app [${x}="${v}"]`);
  if(!el) return {found:false};
  el.click();
  return {found:true, state: window.kit()};
}, [attr, val]);
const start = await oldP.evaluate(()=> window.kit());
let mismatch = [], missing = [], moved = 0;
for(const [attr, val] of PLAN){
  const x = await tap(oldP, attr, val);
  const y = await tap(newP, attr, val);
  if(!x.found || !y.found){ missing.push(attr+"="+val+(x.found?" (new)":" (old)")); continue; }
  if(x.state !== y.state) mismatch.push(attr+"="+val);
  if(x.state !== start) moved++;
}
ck("CONTROL: every planned tap was found on both", missing.length === 0, missing.join(", "));
ck("and the stored kit is identical after each", mismatch.length === 0, mismatch.join(", "));
ck("CONTROL: the taps really changed something", moved >= 4,
   moved + " of " + PLAN.length + " left the start state");
ck("and both end where they started",
   (await oldP.evaluate(()=> window.kit())) === (await newP.evaluate(()=> window.kit())));

console.log("\n5. THE DEAD END IS STILL NOT A DEAD END");
/* No geolocation and no gyms used to return "", opening a settings row onto an empty
   card. The conversion had to keep the replacement, which is easy to lose. */
r = await newP.evaluate(()=>{
  boot(S2=>{ S2.gyms = []; S2.homeGym = null; });
  const before = document.getElementById('app').innerHTML.length;
  /* Pretend the device cannot read a location at all. */
  const real = window.geoReady;
  window.geoReady = ()=> false;
  TAB='sync'; SET_PAGE='where'; render();
  const t = document.getElementById('app').innerText;
  const len = document.getElementById('app').innerHTML.length;
  window.geoReady = real;
  return {before, len, says: /nothing to switch on/.test(t),
          kit: /plates you have/i.test(t)};
});
ck("CONTROL: the screen still draws something substantial", r.len > 800, r.len + " chars");
ck("it explains why there is no switch", r.says);
ck("and the kit is still editable without a gym", r.kit);

console.log("\n6. UNCROWDED, AS THE RULE ASKS");
r = await newP.evaluate(()=>{
  boot();
  const app = document.getElementById('app');
  return {heroes: app.querySelectorAll('.sd-hero').length,
          more: app.querySelectorAll('.sd-more').length,
          oldSeg: app.querySelectorAll('.seg.step-seg').length,
          small: [...app.querySelectorAll('.sd-seg button,.sd-more > summary')]
            .filter(el=> el.getBoundingClientRect().height < 44).length};
});
ck("exactly one hero", r.heroes === 1, r.heroes);
ck("the location switch is behind More", r.more === 1, r.more);
ck("CONTROL: the old step chooser's styling is gone", r.oldSeg === 0, r.oldSeg);
ck("every library control clears 44px", r.small === 0, r.small + " under");

await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
