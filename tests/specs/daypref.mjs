import { chromium, APP_URL, appFile, oldBuild } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE SEVENTH CONVERSION, HELD AGAINST THE REAL SCREEN IT REPLACED.

   "Sleep and mornings" leads with the hours you want, because every other line on the
   screen is worked out from them: the bedtime, the latest you can still be training, and
   what Today tells you if you train now. So the hours are the hero and the stepper under
   them is the hero's own control.

   ONE CONTROL GENUINELY CHANGED, which is the first time that has been true in this
   redesign. The hours were a decimal text field whose placeholder read "e.g. 8 - blank
   turns this off": three instructions for one number. They are the library's stepper now,
   and the one thing the field could do that a stepper cannot -- empty itself -- is where
   the stepper goes when you press down off the bottom.

   So this spec has to do more than the six before it. It checks that the screen still
   stores what it stored, AND that the new control can reach every value the old one could
   reasonably express, including off, from the keyboard as well as by tap. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
/* The build this screen replaced: day A is converted in this release. Taken out of git rather than
   read from a scratchpad, so the comparison cannot be changed by what somebody
   copied there last -- see oldBuild() in _e26.mjs. */
const OLD = oldBuild("9660f21");
const b = await chromium.launch();
let bad = 0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

async function openApp(url){
  const p = await b.newPage({viewport:{width:390,height:1600}});
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
      TAB='sync'; SET_PAGE='day'; render();
      document.querySelectorAll('#app details').forEach(d=> d.open = true);
      document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
    };
    window.ids = ()=>{
      const out = [];
      document.querySelectorAll('#app *').forEach(el=>{
        if(el.id) out.push("#" + el.id);
        for(const a of el.attributes)
          if(/^data-(slprompt|sleepall|sleepunskip)$/.test(a.name)) out.push(a.name);
      });
      return [...new Set(out)].sort();
    };
    window.state = ()=> JSON.stringify({
      sleepPrompt: trainPrefs().sleepPrompt, sleepTime: trainPrefs().sleepTime,
      sleepTarget: S.sleepTarget, wakeTime: S.wakeTime});
  }, FX);
  await p.evaluate(()=> window.boot());
  return p;
}

const oldP = await openApp(OLD);
const newP = await openApp(APP_URL);

console.log("\n1. NOTHING ON THE SCREEN WENT MISSING");
const a = await oldP.evaluate(()=> window.ids());
const c = await newP.evaluate(()=> window.ids());
ck("CONTROL: the old screen rendered its controls", a.length >= 4, a.join(", "));
/* #sleepTargetIn is the one handle that is deliberately gone: it IS the control that
   changed. Everything else has to still be here. */
const gone = a.filter(x=> c.indexOf(x) < 0 && x !== "#sleepTargetIn");
ck("every control the old screen had is still here, bar the field that was replaced",
   gone.length === 0, gone.join(", "));
ck("CONTROL: and the field really was the thing replaced",
   a.indexOf("#sleepTargetIn") > -1 && c.indexOf("#sleepTargetIn") < 0);
ck("the stepper took its place",
   (await newP.evaluate(()=> document.querySelectorAll('#app [data-sdstep]').length)) === 2);

console.log("\n2. THE SAME TAPS LEAVE THE SAME BYTES");
const PLAN = [
  ["data-slprompt","off"], ["data-slprompt","on"],
  ["data-slprompt","off"], ["data-slprompt","on"]
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
  if(x.state !== y.state) mismatch.push(attr+"="+val+" OLD "+x.state+" NEW "+y.state);
  if(x.state !== start) moved++;
}
ck("CONTROL: every planned tap was found on both", missing.length === 0, missing.join(", "));
ck("and the stored state is identical after each", mismatch.length === 0, mismatch.join(" | "));
ck("CONTROL: the taps really moved things", moved >= 2,
   moved + " of " + PLAN.length + " left the start state");
ck("both end where they started",
   (await oldP.evaluate(()=> window.state())) === (await newP.evaluate(()=> window.state())));

console.log("\n3. THE TIME FIELDS STILL WRITE WHAT THEY ALWAYS WROTE");
for(const [id, set, read] of [
  ["#prefSleepT", "23:15", ()=> "sleepTime"],
  ["#wakeIn",     "06:45", ()=> "wakeTime"]
]){
  const go = page=> page.evaluate(([id, v])=>{
    const el = document.querySelector('#app ' + id);
    if(!el) return {none:true};
    el.value = v;
    el.dispatchEvent(new Event("change", {bubbles:true}));
    return {state: window.state()};
  }, [id, set]);
  const x = await go(oldP), y = await go(newP);
  ck("CONTROL: " + id + " is on both screens", !x.none && !y.none,
     (x.none ? "old missing " : "") + (y.none ? "new missing" : ""));
  ck("  and writes the same bytes", x.state === y.state,
     "OLD " + x.state + "  NEW " + y.state);
}
/* And the Clear button, which only exists once a wake time is set and is the only route
   back out of it on a phone. */
let r = await newP.evaluate(()=>{
  boot(S2=>{ S2.wakeTime = "06:45"; });
  const btn = document.querySelector('#app #wakeClear');
  if(!btn) return {none:true};
  btn.click();
  return {wake: S.wakeTime};
});
ck("CONTROL: Clear appears once a wake time is set", !r.none, r.none ? "missing" : "there");
ck("and it still clears it", r.wake == null, String(r.wake));

console.log("\n4. THE STEPPER REACHES EVERY VALUE THE FIELD COULD");
r = await newP.evaluate(async ()=>{
  boot(S2=>{ S2.sleepTarget = null; });
  const up = ()=> document.querySelector('#app [data-sdstep$=":up"]');
  const dn = ()=> document.querySelector('#app [data-sdstep$=":down"]');
  const wait = ()=> new Promise(x=> setTimeout(x, 15));
  const seen = [];
  /* Off is where it starts, and down from off must do nothing at all. */
  const downDisabled = dn().disabled;
  dn().click(); await wait();
  const stillOff = S.sleepTarget;
  /* Up from off lands on the figure the app was already assuming, so the first press
     never changes the behaviour the readout has been describing. */
  up().click(); await wait();
  const first = S.sleepTarget;
  let guard = 0;
  while(guard++ < 60){
    const u = up(); if(!u || u.disabled) break;
    u.click(); await wait();
    seen.push(S.sleepTarget);
  }
  const top = S.sleepTarget;
  guard = 0;
  while(guard++ < 80){
    const d = dn(); if(!d || d.disabled) break;
    d.click(); await wait();
    if(S.sleepTarget == null) break;
    seen.push(S.sleepTarget);
  }
  return {downDisabled, stillOff, first, top, bottom: S.sleepTarget,
          half: seen.indexOf(8.5) > -1, whole: seen.indexOf(9) > -1,
          min: Math.min.apply(null, seen), count: seen.length};
});
ck("CONTROL: off is where an unset target starts, and down from it is dead",
   r.downDisabled === true && r.stillOff == null,
   "disabled " + r.downDisabled + ", value " + r.stillOff);
ck("up from off lands on the figure the app assumes", r.first === 8, String(r.first));
ck("it reaches half hours", r.half === true, String(r.half));
ck("and whole ones", r.whole === true, String(r.whole));
ck("it stops at the top rather than running away", r.top === 14, String(r.top));
ck("CONTROL: and it travelled to get there", r.count >= 20, r.count + " steps");
ck("and it comes all the way back to off", r.bottom == null, String(r.bottom));

console.log("\n5. AND FROM THE KEYBOARD, WHICH IS WHAT role=spinbutton PROMISES");
r = await newP.evaluate(()=>{
  boot(S2=>{ S2.sleepTarget = 8; });
  const el = document.querySelector('#app [data-sdstepv]');
  if(!el) return {none:true};
  const fire = k=> document.querySelector('#app [data-sdstepv]')
    .dispatchEvent(new KeyboardEvent("keydown", {key:k, bubbles:true, cancelable:true}));
  const role = el.getAttribute("role"), tab = el.getAttribute("tabindex");
  const label = el.getAttribute("aria-valuenow");
  fire("ArrowUp");
  const up = S.sleepTarget;
  fire("ArrowDown"); fire("ArrowDown");
  return {role, tab, label, up, down: S.sleepTarget,
          now: document.querySelector('#app [data-sdstepv]').getAttribute("aria-valuenow")};
});
ck("CONTROL: the readout is a focusable spinbutton",
   r.role === "spinbutton" && r.tab === "0", r.role + " / tabindex " + r.tab);
ck("CONTROL: and it announces the value it is showing", r.label === "8", r.label);
ck("the up arrow raises it", r.up === 8.5, String(r.up));
ck("the down arrow lowers it", r.down === 7.5, String(r.down));
ck("and what it announces keeps up", r.now === "7.5", r.now);

console.log("\n6. UNCROWDED, AS THE RULE ASKS");
r = await newP.evaluate(()=>{
  boot();
  const app = document.getElementById('app');
  return {heroes: app.querySelectorAll('.sd-hero').length,
          more: app.querySelectorAll('.sd-more').length,
          oldBlocks: app.querySelectorAll('.set-block, .ch-list').length,
          small: [...app.querySelectorAll('.sd-step button,.sd-tog,.sd-more > summary')]
            .filter(el=> el.getBoundingClientRect().height < 44).length};
});
ck("exactly one hero", r.heroes === 1, r.heroes);
ck("the wake time is behind More", r.more === 1, r.more);
ck("CONTROL: none of the old blocks are left on this screen", r.oldBlocks === 0, r.oldBlocks);
ck("every library control clears 44px", r.small === 0, r.small + " under");

await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
