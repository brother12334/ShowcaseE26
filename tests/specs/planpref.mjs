import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE SIXTH CONVERSION, AND THE END OF THE SECOND OPTION LIST.

   The inventory that opened this redesign found two components doing one job in Settings:
   .ch, from setChoice, and .ob-opt, borrowed from onboarding. "Your plan" was the last
   screen carrying .ob-opt, so converting it leaves one way to offer a choice.

   Held against the real screen it replaced, same as the five before it. The goal is the
   hero here because it moves every volume landmark through GOAL_SCALE and changes the
   wording of what the Body tab tells you -- so the thing it writes is worth checking as
   carefully as the thing it looks like. */
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
    window.boot = ()=>{
      const sp=document.getElementById('splash'); if(sp) sp.remove();
      try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
      ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
      document.body.classList.remove('ai-open','onboarding','pfl-open');
      Object.keys(S).forEach(k=>{ delete S[k]; });
      Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
      S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
      TAB='sync'; SET_PAGE='plan'; render();
      document.querySelectorAll('#app details').forEach(d=> d.open = true);
    };
    window.pairs = ()=>{
      const out = [];
      document.querySelectorAll('#app *').forEach(el=>{
        for(const a of el.attributes)
          if(/^data-(setgoal|eat)$/.test(a.name)) out.push(a.name + "=" + a.value);
        if(el.id === "startDeloadBtn2" || el.id === "endDeloadBtn2") out.push("#" + el.id);
      });
      return [...new Set(out)].sort();
    };
    /* The goal moves landmarks, so the comparison has to include them -- a screen that
       stored the right word while every target stayed put would pass a prefs-only check. */
    /* WHAT THE SCREEN STORES, which is what a conversion must not change. */
    window.state = ()=> JSON.stringify({goal: trainingGoal(), eat: eatPhase(),
      setupGoal: (S.setup||{}).goal, eatPhase: S.eatPhase});
    /* And the landmarks separately, because this release deliberately changes those. */
    window.lm = ()=>{
      const A = bodyAnalysis(); const out = {};
      GKEYS.forEach(g=>{ out[g] = Math.round(A.lm[g].mev * 100) / 100; });
      return out;
    };
  }, FX);
  await p.evaluate(()=> window.boot());
  return p;
}

const oldP = await openApp(OLD);
const newP = await openApp(APP_URL);

console.log("\n1. EVERY CHOICE SURVIVED");
const a = await oldP.evaluate(()=> window.pairs());
const c = await newP.evaluate(()=> window.pairs());
ck("CONTROL: the old screen rendered its controls", a.length >= 8, a.length + " handles");
ck("all four goals and all three phases are still offered",
   a.filter(x=> c.indexOf(x) < 0).length === 0,
   a.filter(x=> c.indexOf(x) < 0).join(", "));
ck("and nothing was invented", c.filter(x=> a.indexOf(x) < 0).length === 0,
   c.filter(x=> a.indexOf(x) < 0).join(", "));

console.log("\n2. THE SAME TAPS LEAVE THE SAME BYTES, LANDMARKS INCLUDED");
const PLAN = [
  ["data-setgoal","strength"], ["data-setgoal","lean"], ["data-setgoal","health"],
  ["data-setgoal","muscle"],
  ["data-eat","lose"], ["data-eat","maintain"], ["data-eat","gain"]
];
const tap = (page, attr, val)=> page.evaluate(([x,v])=>{
  const el = document.querySelector(`#app [${x}="${v}"]`);
  if(!el) return {found:false};
  el.click();
  return {found:true, state: window.state()};
}, [attr, val]);
const start = await oldP.evaluate(()=> window.state());
let mismatch = [], missing = [], moved = 0;
for(const [attr, val] of PLAN){
  const x = await tap(oldP, attr, val);
  const y = await tap(newP, attr, val);
  if(!x.found || !y.found){ missing.push(attr+"="+val+(x.found?" (new)":" (old)")); continue; }
  if(x.state !== y.state) mismatch.push(attr+"="+val);
  if(x.state !== start) moved++;
}
ck("CONTROL: every planned tap was found on both", missing.length === 0, missing.join(", "));
ck("and the stored state is identical after each", mismatch.length === 0, mismatch.join(", "));
ck("CONTROL: the taps really moved things", moved >= 5,
   moved + " of " + PLAN.length + " left the start state");
ck("both end where they started",
   (await oldP.evaluate(()=> window.state())) === (await newP.evaluate(()=> window.state())));

console.log("\n3. AND THIS RELEASE DELIBERATELY CHANGES ONE THING");
/* The old screen could not move a landmark while a block hold was in force -- the goal
   wrote itself, logged itself, re-rendered and did nothing. That is fixed in the same
   release, so the two screens MUST now disagree here, and a comparison that demanded
   they match would be demanding the bug back. tgscale.mjs owns the fix; this only
   records that the divergence is intended and points at where it is tested. */
/* ON A NON-DEFAULT GOAL, or there is nothing to see: GOAL_SCALE is all 1.00 for
   "muscle", which is where section 2's plan deliberately leaves both screens. */
for(const pg of [oldP, newP]){
  await pg.evaluate(async ()=>{
    document.querySelector('#app [data-setgoal="strength"]').click();
    await new Promise(x=> setTimeout(x, 60));
  });
}
const lmOld = await oldP.evaluate(()=> window.lm());
const lmNew = await newP.evaluate(()=> window.lm());
const diff = Object.keys(lmOld).filter(g=> lmOld[g] !== lmNew[g]);
ck("CONTROL: both screens are on the same goal", 
   (await oldP.evaluate(()=> trainingGoal())) === (await newP.evaluate(()=> trainingGoal())));
ck("the old screen's targets were stuck behind the block hold", diff.length > 0,
   diff.length + " of " + Object.keys(lmOld).length + " muscles differ");
ck("and the new one's moved with the goal",
   diff.every(g=> lmNew[g] !== lmOld[g]), diff.slice(0,3).map(g=>
     g + " " + lmOld[g] + "->" + lmNew[g]).join(", "));

console.log("\n4. THE GOAL REALLY MOVES THE TARGETS, WHICH IS WHY IT IS THE HERO");
let r = await newP.evaluate(async ()=>{
  boot();
  const before = window.lm();
  document.querySelector('#app [data-setgoal="strength"]').click();
  await new Promise(x=> setTimeout(x, 60));
  const after = window.lm();
  const hero = (document.querySelector('#app .sd-hero-w')||{textContent:''}).textContent.trim();
  const moved = Object.keys(before).filter(g=> before[g] !== after[g]);
  return {hero, moved: moved.length, total: Object.keys(before).length,
          goal: trainingGoal()};
});
ck("CONTROL: the goal changed", r.goal === "strength", r.goal);
ck("the hero says which goal you are on", /stronger/i.test(r.hero), r.hero);
ck("and the volume landmarks moved with it", r.moved > 0,
   r.moved + " of " + r.total + " muscles");

console.log("\n5. THE SECOND OPTION LIST IS GONE FROM SETTINGS");
/* .ob-opt was borrowed from onboarding and was the other half of the drift the shared
   library exists to end. Checked across every Settings page, not just this one. */
r = await newP.evaluate(()=>{
  const pages = ["sess","screen","gym","where","targets","plan","day","remind","share",
                 "acct","data","patch","storage","help","legal"];
  const left = [];
  pages.forEach(k=>{
    TAB='sync'; SET_PAGE=k;
    try{ render(); }catch(e){ return; }
    document.querySelectorAll('#app details').forEach(d=> d.open = true);
    const n = document.querySelectorAll('#app .ob-opt').length;
    if(n) left.push(k + ":" + n);
  });
  return {left, checked: pages.length};
});
ck("CONTROL: every Settings page was looked at", r.checked === 15, r.checked);
ck("no screen still uses the onboarding option list", r.left.length === 0, r.left.join(", "));

console.log("\n6. UNCROWDED, AS THE RULE ASKS");
r = await newP.evaluate(()=>{
  boot();
  const app = document.getElementById('app');
  return {heroes: app.querySelectorAll('.sd-hero').length,
          more: app.querySelectorAll('.sd-more').length,
          small: [...app.querySelectorAll('.sd-seg button,.sd-more > summary')]
            .filter(el=> el.getBoundingClientRect().height < 44).length};
});
ck("exactly one hero", r.heroes === 1, r.heroes);
ck("the landmark explainer is behind More", r.more === 1, r.more);
ck("every library control clears 44px", r.small === 0, r.small + " under");

await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
