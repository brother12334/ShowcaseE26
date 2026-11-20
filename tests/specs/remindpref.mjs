import { chromium, APP_URL, appFile, oldBuild } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE EIGHTH CONVERSION, HELD AGAINST THE REAL SCREEN IT REPLACED.

   "Reminders" leads with how many of the three are actually on, because that is the one
   thing somebody opening this screen wants to know, and the button under the hero is the
   hero's own control: with reminders off the count can only be zero, whatever the three
   switches would say.

   THIS SCREEN HAS FOUR STATES and only one of them is the interesting one. Busy, blocked
   (the phone or the account will not carry a notification), off, and on. A conversion
   that quietly dropped a state would look perfect on whichever one the fixture happens to
   be in -- and the fixture is in the BLOCKED state, because a test page has no account
   registered with the push service. So every assertion here says which state it is in,
   and the ones about the three reminders neutralise the blocker and then CHECK that they
   got past it. Without that check this whole spec would pass on a screen that draws
   nothing but a warning. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
/* The build this screen replaced: remind B is converted in this release. */
const OLD = oldBuild("8f3cbc0");
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
    /* THE REAL BLOCKER, KEPT. Overriding it is how the other sections reach the screen,
       and an override is permanent -- so the state that only exists when it reports
       something could never be reached again. An earlier draft tested the blocked state
       on a screen that was not blocked, and passed the two assertions it should have
       failed. */
    window.realBlocker = window.pushBlocker;
    window.boot = (mutate, blocked)=>{
      const sp=document.getElementById('splash'); if(sp) sp.remove();
      try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
      ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
      document.body.classList.remove('ai-open','onboarding','pfl-open');
      Object.keys(S).forEach(k=>{ delete S[k]; });
      Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
      S.tourDone = true;
      if(mutate) mutate(S);
      migrate(); try{ applySplit(); }catch(e){}
      /* A TEST PAGE HAS NO PUSH SUBSCRIPTION, so pushBlocker() reports one and the screen
         draws a warning instead of itself. Stood aside deliberately, and section 1 proves
         the screen really did get past it. */
      window.pushBlocker = blocked ? window.realBlocker : (()=> "");
      try{ PUSH_BUSY = false; }catch(e){}
      try{ PUSH_DIAG = {support:true, perm:"granted", sw:true, sub:true,
                        account:true, sched:3}; }catch(e){}
      TAB='sync'; SET_PAGE='remind'; render();
      document.querySelectorAll('#app details').forEach(d=> d.open = true);
      document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
    };
    window.allOn = (S2)=>{ S2.pushOn = true; S2.remindAt = "17:00";
      S2.remindBed = true; S2.remindWake = true;
      S2.prefs = Object.assign({}, S2.prefs, {sleepPrompt: true}); };
    window.ids = ()=>{
      const out = [];
      document.querySelectorAll('#app *').forEach(el=>{
        if(el.id) out.push("#" + el.id);
        for(const a of el.attributes)
          if(/^data-(remtrain|rembed|remwake|pushtest)$/.test(a.name)) out.push(a.name);
      });
      return [...new Set(out)].sort();
    };
    window.state = ()=> JSON.stringify({pushOn: S.pushOn, at: S.remindAt,
      bed: S.remindBed, wake: S.remindWake});
  }, FX);
  return p;
}

const oldP = await openApp(OLD);
const newP = await openApp(APP_URL);
const bothOn = async ()=>{
  for(const pg of [oldP, newP]) await pg.evaluate(()=> boot(window.allOn));
};

console.log("\n1. THE SCREEN REALLY IS DRAWING ITSELF, NOT A WARNING");
/* The control the rest of the spec rests on. */
await bothOn();
let r = await newP.evaluate(()=> ({
  warn: document.querySelectorAll('#app .sync-warn').length,
  togs: document.querySelectorAll('#app .sd-tog').length,
  secs: document.querySelectorAll('#app .sd-sec').length}));
ck("CONTROL: no blocker warning is showing", r.warn === 0, r.warn + " warnings");
ck("CONTROL: and the three reminders are drawn", r.togs === 3 && r.secs === 3,
   r.togs + " switches, " + r.secs + " sections");

console.log("\n2. NOTHING ON THE SCREEN WENT MISSING");
const a = await oldP.evaluate(()=> window.ids());
const c = await newP.evaluate(()=> window.ids());
ck("CONTROL: the old screen rendered its controls", a.length >= 5, a.join(", "));
const gone = a.filter(x=> c.indexOf(x) < 0);
ck("every control the old screen had is still here", gone.length === 0, gone.join(", "));
ck("and nothing was invented", c.filter(x=> a.indexOf(x) < 0).length === 0,
   c.filter(x=> a.indexOf(x) < 0).join(", "));

console.log("\n3. THE SAME TAPS LEAVE THE SAME BYTES");
const PLAN = [
  ["data-remtrain","off"], ["data-remtrain","on"],
  ["data-rembed","off"],   ["data-rembed","on"],
  ["data-remwake","off"],  ["data-remwake","on"]
];
const tap = (page, attr, val)=> page.evaluate(([x,v])=>{
  const el = document.querySelector(`#app [${x}="${v}"]`);
  if(!el) return {found:false};
  el.click();
  return {found:true, state: window.state()};
}, [attr, val]);
await bothOn();
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
ck("CONTROL: the taps really moved things", moved >= 3,
   moved + " of " + PLAN.length + " left the start state");
ck("both end where they started",
   (await oldP.evaluate(()=> window.state())) === (await newP.evaluate(()=> window.state())));

console.log("\n4. THE TRAINING HOUR STILL WRITES WHAT IT ALWAYS WROTE");
const setTime = page=> page.evaluate(()=>{
  const el = document.querySelector('#app #remindAtIn');
  if(!el) return {none:true};
  el.value = "18:30";
  el.dispatchEvent(new Event("change", {bubbles:true}));
  return {state: window.state()};
});
await bothOn();
let x = await setTime(oldP), y = await setTime(newP);
ck("CONTROL: the time field is on both screens", !x.none && !y.none,
   (x.none ? "old missing " : "") + (y.none ? "new missing" : ""));
ck("and writes the same bytes", x.state === y.state, "OLD " + x.state + "  NEW " + y.state);

console.log("\n5. EVERY STATE THIS SCREEN HAS IS STILL A STATE");
/* The three that are not "on", each checked for the thing that makes it that state. */
r = await newP.evaluate(()=>{
  const out = {};
  /* BLOCKED: the warning, and the diagnostic under it rather than instead of it. */
  boot(S2=>{ S2.pushOn = true; }, true);
  out.blocked = {why: pushBlocker(),
                 warn: document.querySelectorAll('#app .sync-warn').length,
                 diag: document.querySelectorAll('#app .rem-diag').length,
                 togs: document.querySelectorAll('#app .sd-tog').length};
  /* OFF: the one button that turns it on, and no switches to tease with. */
  boot(S2=>{ S2.pushOn = false; S2.remindAt = null;
             S2.remindBed = false; S2.remindWake = false; });
  out.off = {btn: !!document.querySelector('#app #pushOnBtn'),
             offBtn: !!document.querySelector('#app #pushOffBtn'),
             togs: document.querySelectorAll('#app .sd-tog').length,
             hero: (document.querySelector('#app .sd-hero-v')||{firstChild:null}).firstChild,
             diag: document.querySelectorAll('#app .rem-diag').length};
  out.off.hero = out.off.hero ? out.off.hero.textContent.trim() : "";
  /* BUSY: the spinner, and nothing else to press while it works. */
  try{ PUSH_BUSY = true; }catch(e){}
  TAB='sync'; SET_PAGE='remind'; render();
  out.busy = {spin: document.querySelectorAll('#app .ai-spin').length,
              btns: document.querySelectorAll('#app #pushOnBtn, #app #pushOffBtn').length};
  try{ PUSH_BUSY = false; }catch(e){}
  /* ON: the way out. */
  boot(window.allOn);
  out.on = {offBtn: !!document.querySelector('#app #pushOffBtn'),
            onBtn: !!document.querySelector('#app #pushOnBtn')};
  return out;
});
ck("CONTROL: this page really is blocked, so there is a state to test",
   !!r.blocked.why, r.blocked.why || "(not blocked)");
ck("blocked says what is wrong", r.blocked.warn === 1, r.blocked.warn);
ck("  and still offers the diagnostic to check a fix against",
   r.blocked.diag === 1, r.blocked.diag);
ck("  and does not draw switches that cannot work", r.blocked.togs === 0, r.blocked.togs);
ck("off offers the one button that turns it on", r.off.btn === true && r.off.offBtn === false,
   "on " + r.off.btn + ", off " + r.off.offBtn);
ck("  and counts zero of three", r.off.hero === "0", r.off.hero);
ck("  and keeps the diagnostic, which is how you check before turning anything on",
   r.off.diag === 1, r.off.diag);
ck("busy shows it is working", r.busy.spin === 1, r.busy.spin);
ck("  and offers nothing to press meanwhile", r.busy.btns === 0, r.busy.btns);
ck("on offers the way back out", r.on.offBtn === true && r.on.onBtn === false,
   "off " + r.on.offBtn + ", on " + r.on.onBtn);

console.log("\n6. THE HERO COUNTS WHAT IS ACTUALLY ON");
r = await newP.evaluate(()=>{
  const read = ()=>{ const el = document.querySelector('#app .sd-hero-v');
    return el && el.firstChild ? el.firstChild.textContent.trim() : ""; };
  const out = {};
  boot(window.allOn); out.three = read();
  boot(S2=>{ window.allOn(S2); S2.remindBed = false; }); out.two = read();
  /* SLEEP TRACKING OFF takes two of the three with it, and the count has to know -- the
     switches are drawn off and say why, so a hero reading 3 would be contradicting the
     screen under it. */
  boot(S2=>{ window.allOn(S2);
    S2.prefs = Object.assign({}, S2.prefs, {sleepPrompt: false}); });
  out.sleepOff = read();
  out.saysWhy = /nothing to remind you about/i.test(document.getElementById('app').innerText);
  return out;
});
ck("all three on reads 3", r.three === "3", r.three);
ck("one off reads 2", r.two === "2", r.two);
ck("and with sleep tracking off it reads 1, not 3", r.sleepOff === "1", r.sleepOff);
ck("CONTROL: and the screen says why the other two are dark", r.saysWhy === true);

console.log("\n7. UNCROWDED, AS THE RULE ASKS");
r = await newP.evaluate(()=>{
  boot(window.allOn);
  const app = document.getElementById('app');
  return {heroes: app.querySelectorAll('.sd-hero').length,
          more: app.querySelectorAll('.sd-more').length,
          oldSeg: app.querySelectorAll('.seg').length,
          oldRow: app.querySelectorAll('.rem-row').length,
          /* .btn.small is 36px app chrome on every Settings screen, back button included,
             and the conversion did not touch it. The rule is about library controls. */
          small: [...app.querySelectorAll('.sd-tog,.sd-more > summary,.sd-step button')]
            .filter(el=> el.getBoundingClientRect().height < 44).length};
});
ck("exactly one hero", r.heroes === 1, r.heroes);
ck("the diagnostic is behind More", r.more === 1, r.more);
ck("CONTROL: the old On/Off segmenteds are gone", r.oldSeg === 0, r.oldSeg);
ck("CONTROL: and so are the old reminder rows", r.oldRow === 0, r.oldRow);
ck("every library control clears 44px", r.small === 0, r.small + " under");

await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
