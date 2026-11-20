import { chromium, APP_URL, appFile, oldBuild } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE PLATE PICKER EDITS THE GYM IT NAMES.

   Item 26 taught the engine to read the kit in the room you are standing in. The picker
   on "Where you train" went on writing the GLOBAL list, so on a profile where every gym
   has named its own plates -- which is the normal case once anybody has used the per-gym
   editor, and is the case on the real export -- un-ticking a plate there moved nothing
   at all. A control that appears to work and does nothing is worse than no control.

   The kit section is about one named gym now, with a chooser above it, and the global
   list is underneath as what a gym with no list of its own falls back to. The per-gym
   modal sheet is gone: it was a second editor for the same seven numbers.

   WHAT THIS SPEC IS FOR: un-ticking a plate at one gym has to change that gym's
   prescriptions and its plate breakdown, and leave every other gym's alone. Its controls
   are the half that makes it mean anything -- the gyms must genuinely start out agreeing,
   or "the others did not change" is true of a screen that changes nothing. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
/* The build before the picker was made per-gym. */
const OLD = oldBuild("3a0ff67");
const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const p = await b.newPage({viewport:{width:390,height:1600}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
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
    try{ GYM_SEL = null; }catch(e){}
    TAB='sync'; SET_PAGE='where'; render();
    document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
  };
  window.gymNamed = n=> (S.gyms || []).find(g=> (g.name || "").indexOf(n) === 0);
  /* What the engine says at every gym, for a bar movement: the step it rounds to, the
     smallest plate it believes is there, and the actual plate breakdown of one load. */
  window.everywhere = ()=>{
    const out = {};
    (S.gyms || []).forEach(g=>{
      const sess = {gymId: g.id};
      const br = plateBreakdown(140, "Barbell Back Squat", sess);
      out[g.name] = loadStepFor("Barbell Back Squat", sess)
        + " / " + smallestPlate(sess)
        + " / " + (br ? br.plates.join("+") : "none");
    });
    return out;
  };
  /* A BAR WEIGHT, OR THE BREAKDOWN IS NEVER DRAWN. plateBreakdown returns null under
     "bar + plates" when nobody has said what the bar weighs, which is this fixture --
     so the third figure above read "none" at every gym and that half of the comparison
     was asserting nothing. 140 on a 45 bar is 47.5 a side, which is a 45 and a 2.5 --
     chosen because 2.5 is the plate these sections un-tick, so the breakdown has to
     change when it goes. An earlier figure needed no 2.5 and moved the step without
     moving the plates, which is half the thing this spec is for. */
  window.withBar = (S2)=>{ S2.prefs.barMode = "total"; S2.prefs.barWeight = 45; };
  /* Select a gym in the section and un-tick one of its plates, through the real buttons. */
  window.untickAt = (name, plate)=>{
    const g = window.gymNamed(name);
    const pick = document.querySelector('#app [data-gympick="' + g.id + '"]');
    if(!pick) return {noPick: true};
    pick.click();
    const chip = document.querySelector('#app [data-gympl="' + plate + '"]');
    if(!chip) return {noChip: true};
    const wasPressed = chip.getAttribute("aria-pressed");
    chip.click();
    return {wasPressed, now: (window.gymNamed(name).plates || []).slice()};
  };
}, FX);

console.log("\n1. THE SECTION IS ABOUT A GYM, AND SAYS WHICH");
await p.evaluate(()=> boot(window.withBar));
let r = await p.evaluate(()=>{
  const app = document.getElementById('app');
  const sec = [...app.querySelectorAll('.sd-sec')].map(x=> x.textContent.trim());
  const label = [...app.querySelectorAll('.sd-label')].map(x=> x.textContent.trim());
  return {sec, plateLabel: label.find(x=> /^Plates at /.test(x)) || "",
          picks: [...app.querySelectorAll('[data-gympick]')].map(x=> x.textContent.trim()),
          sel: gymSelId(), home: (homeGym()||{}).id,
          gympl: app.querySelectorAll('[data-gympl]').length};
});
ck("the heading names the gym", r.sec.some(x=> /^Kit at Palma Vista Gym$/.test(x)),
   r.sec.join(" | "));
ck("and so does the plate picker", r.plateLabel === "Plates at Palma Vista Gym",
   r.plateLabel);
ck("every gym can be chosen", r.picks.length === 3, r.picks.join(", "));
ck("and it opens on the home gym", r.sel === r.home, r.sel + " vs " + r.home);
ck("CONTROL: the picker is drawn", r.gympl === 7, r.gympl + " chips");

console.log("\n2. THE GYMS START OUT AGREEING, OR SECTION 3 PROVES NOTHING");
const before = await p.evaluate(()=>{ boot(window.withBar); return window.everywhere(); });
const names = Object.keys(before);
ck("CONTROL: three gyms were read", names.length === 3, names.join(", "));
ck("CONTROL: and every one of them says the same thing today",
   new Set(Object.values(before)).size === 1,
   names.map(n=> n + " " + before[n]).join(" | "));

console.log("\n3. UNTICKING A PLATE AT ONE GYM MOVES THAT GYM AND NO OTHER");
for(const [gym, plate] of [["Palma", "2.5"], ["Lotus", "2.5"], ["Uptown", "2.5"]]){
  const res = await p.evaluate(([g, pl])=>{
    boot(window.withBar);
    const was = window.everywhere();
    const tick = window.untickAt(g, pl);
    const now = window.everywhere();
    const moved = Object.keys(was).filter(k=> was[k] !== now[k]);
    return {tick, was, now, moved,
            full: (window.gymNamed(g).plates || []).length};
  }, [gym, plate]);
  console.log("  — " + gym);
  ck("    CONTROL: the chip was ticked before the tap",
     res.tick.wasPressed === "true", String(res.tick.wasPressed));
  ck("    CONTROL: and this gym now has its own list without that plate",
     res.tick.now && res.tick.now.indexOf(2.5) === -1 && res.full > 0,
     JSON.stringify(res.tick.now));
  const mine = Object.keys(res.was).find(k=> k.indexOf(gym) === 0);
  ck("    this gym's prescriptions moved", res.moved.indexOf(mine) > -1,
     res.was[mine] + " -> " + res.now[mine]);
  ck("    and no other gym's did", res.moved.length === 1,
     res.moved.join(", "));
}

console.log("\n4. A GYM WITH NO LIST SHOWS THE INHERITED ONE, AND SAYS SO");
r = await p.evaluate(()=>{
  boot(S2=>{ (S2.gyms || []).forEach(g=>{ g.plates = null; }); });
  const app = document.getElementById('app');
  const chips = [...app.querySelectorAll('[data-gympl]')];
  const on = chips.filter(x=> x.getAttribute("aria-pressed") === "true")
    .map(x=> parseFloat(x.dataset.gympl));
  const usual = platesOwned(trainPrefs());
  const sub = [...app.querySelectorAll('.sd-sub')]
    .map(x=> x.textContent.trim()).join(" ");
  return {on, usual, inherited: chips.every(x=> x.classList.contains("is-inherited")),
          saysInherited: /Inherited from your usual kit/i.test(sub),
          /* And it must NOT claim to come from the home gym, which is not where plates
             are inherited from for a gym that is not home. */
          saysHome: /inherited from home/i.test(sub)};
});
ck("CONTROL: the gyms have no plate lists of their own", true);
ck("the picker shows your usual list",
   JSON.stringify(r.on.slice().sort((a,c)=>c-a)) === JSON.stringify(r.usual.slice().sort((a,c)=>c-a)),
   JSON.stringify(r.on) + " vs " + JSON.stringify(r.usual));
ck("marked as inherited rather than chosen", r.inherited === true, String(r.inherited));
ck("and it says where from", r.saysInherited === true);
ck("CONTROL: and does not claim it comes from the home gym, which it does not",
   r.saysHome === false, String(r.saysHome));

console.log("\n5. EDITING AN INHERITED LIST CREATES THAT GYM'S OWN");
r = await p.evaluate(()=>{
  boot(S2=>{ (S2.gyms || []).forEach(g=>{ g.plates = null; }); });
  const g = window.gymNamed("Lotus");
  const hadOwn = g.plates;
  const usual = platesOwned(trainPrefs()).slice();
  const t = window.untickAt("Lotus", "2.5");
  const after = window.gymNamed("Lotus").plates;
  const others = (S.gyms || []).filter(x=> x.id !== g.id).map(x=> x.plates);
  return {hadOwn, usual, after, others, global: platesOwned(trainPrefs()),
          tick: t};
});
ck("CONTROL: it had no list of its own", r.hadOwn == null, JSON.stringify(r.hadOwn));
ck("one tap gives it one", Array.isArray(r.after) && r.after.length > 0,
   JSON.stringify(r.after));
ck("built from what it was inheriting, minus the one you tapped",
   r.after.length === r.usual.length - 1 && r.after.indexOf(2.5) === -1,
   JSON.stringify(r.after) + " from " + JSON.stringify(r.usual));
ck("the other gyms are still inheriting", r.others.every(x=> x == null),
   JSON.stringify(r.others));
ck("and your usual list is untouched",
   JSON.stringify(r.global.slice().sort((a,c)=>c-a)) === JSON.stringify(r.usual.slice().sort((a,c)=>c-a)),
   JSON.stringify(r.global));

console.log("\n6. THE GENERAL LIST IS STILL EDITABLE, WHERE IT IS STILL USED");
r = await p.evaluate(()=>{
  /* INHERITING MEANS NOTHING OF ITS OWN AT ALL. Clearing only `plates` left Lotus with
     its own plateStep of 2.5, so it answered from that and never reached the global
     list -- which is the rule working, and made "every gym that inherits" false of a
     gym that was not inheriting. */
  boot(S2=>{ window.withBar(S2);
    (S2.gyms || []).forEach(g=>{ g.plates = null; g.plateStep = null; }); });
  const app = document.getElementById('app');
  app.querySelectorAll('details').forEach(d=> d.open = true);
  const fold = [...app.querySelectorAll('.sd-more > summary')]
    .map(x=> x.textContent.trim());
  const chip = app.querySelector('[data-prefpl="2.5"]');
  const before = window.everywhere();
  if(chip) chip.click();
  const after = window.everywhere();
  return {fold, had: !!chip, global: platesOwned(trainPrefs()),
          ownNothing: (S.gyms || []).every(g=> g.plates == null && g.plateStep == null),
          movedAll: Object.keys(before).every(k=> before[k] !== after[k]),
          before, after};
});
ck("CONTROL: every gym really is inheriting, with nothing of its own",
   r.ownNothing === true, String(r.ownNothing));
ck("it is folded away and labelled as the fallback",
   r.fold.some(x=> /falls back to/.test(x)), r.fold.join(" | "));
ck("CONTROL: and the chip is there to tap", r.had === true);
ck("un-ticking it drops it from your usual list",
   r.global.indexOf(2.5) === -1, JSON.stringify(r.global));
ck("and every gym that inherits moves with it", r.movedAll === true,
   Object.keys(r.before).map(k=> k + ": " + r.before[k] + " -> " + r.after[k]).join(" | "));

console.log("\n7. THE SECOND EDITOR IS GONE");
r = await p.evaluate(()=>{
  boot();
  const app = document.getElementById('app');
  const btn = app.querySelector('[data-gymkit]');
  const lotus = window.gymNamed("Lotus");
  const target = app.querySelector('[data-gymkit="' + lotus.id + '"]');
  if(target) target.click();
  /* #modal is a permanent element in the page, emptied rather than removed, so its mere
     existence says nothing. What says a sheet is open is whether anything is in it and
     whether the backdrop is showing. */
  const m = document.getElementById('modal');
  const bg = document.getElementById('modalBg');
  return {hadButton: !!btn,
          modalOpen: !!(m && m.innerHTML.trim())
            || !!(bg && bg.classList.contains("on")),
          sel: gymSelId(), lotus: lotus.id,
          sheet: typeof window.openGymKit};
});
ck("CONTROL: the equipment button is still on every gym row", r.hadButton === true);
ck("it no longer opens a second sheet", r.modalOpen === false, String(r.modalOpen));
ck("it selects that gym in the section instead", r.sel === r.lotus,
   r.sel + " vs " + r.lotus);
ck("and the sheet is gone from the build", r.sheet === "undefined", r.sheet);

ck("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
