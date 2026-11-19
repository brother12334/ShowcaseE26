import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE FOURTH CONVERSION, AND THE ONLY ONE WHERE THE CONTROLS WERE LEFT ALONE ON PURPOSE.

   Volume targets was not a reskin. All three of its controls carry behaviour the shared
   library does not have: the dial drags, takes the keyboard, and repaints through
   tgDialPaint() WITHOUT a render, because re-drawing twenty-one rows per frame stutters;
   the steppers hold to accelerate and commit on release; and a landmark change writes
   PLAN HISTORY as well as lmFloor. Swapping in the library's dial and stepper would have
   replaced all of that with markup that does nothing.

   So the layout moved and the machinery did not, and this spec exists to prove the second
   half. It checks what the screen WRITES -- lmFloor, lmScale and planLog -- rather than
   what it looks like, which is the part a redesign can quietly break. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1600}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

await p.evaluate(fx=>{
  window.boot = ()=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
    ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
    try{ TG_OPEN = null; }catch(e){}
    TAB='sync'; SET_PAGE='targets'; render();
    document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
  };
}, FX);
await p.evaluate(()=> window.boot());

console.log("\n1. EVERY CONTROL THE SCREEN HAD IS STILL WIRED");
let r = await p.evaluate(()=>{
  const n = sel=> document.querySelectorAll('#app ' + sel).length;
  return {dial: n('#tgDial'), cal: n('[data-lmcal]'), rows: n('[data-tgopen]'),
          gkeys: GKEYS.length,
          areas: n('.tg-area'), clearAll: n('#tgClearAll'),
          reset: n('#tgScaleReset'), hero: n('.sd-hero'), more: n('.sd-more')};
});
ck("CONTROL: the dial is on the screen", r.dial === 1, r.dial);
/* NINETEEN, NOT TWENTY-ONE. The figure came from a comment in setGroups that still says
   "twenty-one controls and a scale"; GROUPS has nineteen entries and GKEYS and AREA_OF
   agree. Shins were removed from GROUPS at some point and the comment was not. Counted
   from GKEYS rather than written down, so the next removal moves this with it. */
ck("every muscle in GKEYS has a row", r.rows === r.gkeys, r.rows + " rows, " + r.gkeys + " muscles");
ck("grouped by body area", r.areas === 6, r.areas);
ck("the calibration choice is here", r.cal === 2, r.cal);
ck("and the clear-all for floors you set", r.clearAll === 1, r.clearAll);
ck("exactly one hero", r.hero === 1, r.hero);
ck("and the explainer is one tap, not four paragraphs", r.more === 1, r.more);

console.log("\n2. THE DIAL STILL TAKES THE KEYBOARD, AND STILL WRITES THE SCALE");
await p.evaluate(()=>{ boot(); document.getElementById('tgDial').focus(); });
const before = await p.evaluate(()=> ({scale: lmScale(), focused: document.activeElement.id}));
ck("CONTROL: the dial can be focused", before.focused === "tgDial", before.focused);
await p.keyboard.press("ArrowRight");
await p.keyboard.press("ArrowRight");
/* THE DIAL REPAINTS AT ONCE AND COMMITS 450ms AFTER THE KEYS STOP, deliberately: writing
   re-renders the twenty-one rows below, and a render replaces the very element the key
   event came from, so pressing the arrow twice used to work once and then land on an
   element that no longer existed. Waiting 150ms read the painted value and the unwritten
   one and called that a bug -- the spec's stopwatch, not the control. */
const painted = await p.evaluate(()=> Number((document.getElementById('tgPct')||{}).textContent));
await p.waitForTimeout(700);
r = await p.evaluate(()=> ({scale: lmScale(), now: Number((document.getElementById('tgPct')||{}).textContent)}));
ck("CONTROL: the readout moved the moment the key did", painted !== Math.round(before.scale*100),
   Math.round(before.scale*100) + " -> " + painted + " painted");
ck("two presses move the scale once the keys stop", r.scale !== before.scale,
   Math.round(before.scale*100) + "% -> " + Math.round(r.scale*100) + "%");
ck("and what was stored is what was shown",
   Math.round(r.scale * 100) === painted, painted + " painted, " + Math.round(r.scale*100) + " stored");

console.log("\n3. A LANDMARK EDIT STILL WRITES THE FLOOR AND THE PLAN HISTORY");
r = await p.evaluate(async ()=>{
  boot();
  const g = "quads";
  const logBefore = (S.planLog || []).length;
  const floorBefore = (S.lmFloor || {})[g];
  /* Open the row the way a finger does. */
  document.querySelector(`#app [data-tgopen="${g}"]`).click();
  await new Promise(x=> setTimeout(x, 60));
  const stepper = document.querySelector(`#app [data-tgstep="${g}:mev:up"]`);
  if(!stepper) return {none:true};
  /* Press and release, which is how the control commits: the hold accelerates, the
     release writes. A click alone would never reach tgFloorCommit. */
  /* A TAP, NOT A HOLD. The press itself is the first tenth and the hold repeats every
     110ms, so a 140ms press is two tenths -- which is the control working and the spec
     counting wrong. Released well inside the first interval. */
  stepper.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true, pointerId:1}));
  await new Promise(x=> setTimeout(x, 40));
  stepper.dispatchEvent(new PointerEvent("pointerup", {bubbles:true, pointerId:1}));
  await new Promise(x=> setTimeout(x, 120));
  return {opened: true, floorBefore, floorAfter: (S.lmFloor || {})[g],
          logBefore, logAfter: (S.planLog || []).length};
});
ck("CONTROL: the row opened and the stepper was found", r.opened === true);
ck("the floor moved", r.floorAfter !== r.floorBefore, r.floorBefore + " -> " + r.floorAfter);
ck("and it moved by a tenth, not a whole set",
   Math.abs((r.floorAfter - r.floorBefore) - 0.1) < 0.001,
   String(Math.round((r.floorAfter - r.floorBefore) * 1000) / 1000));
ck("the change is in the plan history", r.logAfter > r.logBefore,
   r.logBefore + " -> " + r.logAfter);

console.log("\n4. THE CALIBRATION CHOICE STILL SWITCHES");
r = await p.evaluate(async ()=>{
  boot();
  const was = calibrationOff();
  document.querySelector('#app [data-lmcal="pub"]').click();
  await new Promise(x=> setTimeout(x, 60));
  const off = calibrationOff();
  document.querySelector('#app [data-lmcal="learn"]').click();
  await new Promise(x=> setTimeout(x, 60));
  return {was, off, back: calibrationOff()};
});
ck("CONTROL: it starts on learning", r.was === false, String(r.was));
ck("published-only turns calibration off", r.off === true, String(r.off));
ck("and switching back restores it", r.back === false, String(r.back));

console.log("\n5. UNCROWDED, AS THE RULE ASKS");
r = await p.evaluate(()=>{
  boot();
  const app = document.getElementById('app');
  return {oldLists: app.querySelectorAll('.ch-list').length,
          small: [...app.querySelectorAll('.sd-seg button,.sd-more > summary')]
            .filter(el=> el.getBoundingClientRect().height < 44).length};
});
ck("CONTROL: none of the old stacked option lists is left", r.oldLists === 0, r.oldLists);
ck("every library control clears 44px", r.small === 0, r.small + " under");

ck("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
