import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* AN UNDO MAY ONLY COME FROM A FINGER.

   Making a toast tap mean Undo turned an ordinary piece of housekeeping into a silent
   data change. The toast host keeps at most three, and it used to dismiss the oldest by
   calling .click() on it — harmless for years, because a click only ever dismissed. The
   moment a click could reverse a setting, a fourth toast reversed a change made three
   toasts earlier, with nobody touching the screen.

   Dismissing without running the action fixed that ONE caller. It did not fix the class:
   any .click() on a toast from anywhere would do it again. So the guard is on the event —
   opts.undo runs only for a trusted one.

   Section 1 is the case that was reported: five in a row, nothing undone. Its control is
   the half that makes it mean anything — the sweep must actually have run, or five toasts
   that never overflowed would pass without exercising the bug at all. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{PF=null}catch(e){} try{hideModal()}catch(e){}
  ['preflight','aiFull'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();});
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  Object.keys(S).forEach(k=>{ delete S[k]; });
  Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
  S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
  TAB='sync'; SET_PAGE='sess'; render();
  /* A counter each toast would bump if its undo ever ran. */
  window.UNDONE = 0;
  window.boot2 = ()=>{
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true; migrate(); try{ applySplit(); }catch(e){}
    TAB='sync'; SET_PAGE='sess'; render();
    document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
  };
  window.fiveToasts = ()=>{
    document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
    window.UNDONE = 0;
    for(let i = 1; i <= 5; i++)
      toast("Change number " + i, "good", {undo: ()=> { window.UNDONE++; }});
    return document.querySelectorAll('#toasts .tst').length;
  };
}, FX);

console.log("\n1. FIVE TOASTS IN A ROW, AND NOTHING IS UNDONE");
let r = await p.evaluate(async ()=>{
  const left = window.fiveToasts();
  await new Promise(x=> setTimeout(x, 400));
  return {left, undone: window.UNDONE,
          still: document.querySelectorAll('#toasts .tst').length};
});
ck("the host keeps at most three", r.left <= 3, r.left + " on screen");
ck("CONTROL: so the sweep really ran — five were asked for", r.left < 5, r.left);
ck("and not one undo fired", r.undone === 0, r.undone + " fired");

console.log("\n2. A SETTING CANNOT BE REVERSED BY HOUSEKEEPING");
r = await p.evaluate(async ()=>{
  boot2();
  const start = trainPrefs().warmups;
  document.querySelector('#app [data-prefwarm="manual"]').click();   // writes, and toasts
  await new Promise(x=> setTimeout(x, 50));
  const after = trainPrefs().warmups;
  /* Four more toasts, which pushes the setting's own toast out of the host. */
  for(let i = 0; i < 4; i++) toast("Filler " + i, "info");
  await new Promise(x=> setTimeout(x, 300));
  return {start, after, now: trainPrefs().warmups,
          onDisk: (()=>{ const k = Object.keys(localStorage).find(x=> x.indexOf("ironlog.v1") === 0);
            return k ? (JSON.parse(localStorage.getItem(k) || "{}").prefs || {}).warmups : null; })()};
});
ck("CONTROL: the tap really changed the setting", r.start === "auto" && r.after === "manual",
   r.start + " -> " + r.after);
ck("and four more toasts do not put it back", r.now === "manual", r.now);
ck("on disk either", r.onDisk === "manual", r.onDisk);

console.log("\n3. SCRIPTED CLICKS DISMISS, THEY DO NOT ACT");
r = await p.evaluate(async ()=>{
  document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
  window.UNDONE = 0;
  toast("Scripted", "good", {undo: ()=> { window.UNDONE++; }});
  await new Promise(x=> setTimeout(x, 30));
  const before = document.querySelectorAll('#toasts .tst').length;
  document.querySelector('#toasts .tst').click();      // untrusted, from code
  await new Promise(x=> setTimeout(x, 300));
  return {before, undone: window.UNDONE,
          after: document.querySelectorAll('#toasts .tst').length};
});
ck("CONTROL: there was a toast to click", r.before === 1, r.before);
ck("a scripted click does not undo", r.undone === 0, r.undone + " fired");
ck("but it does dismiss, as a tap always has", r.after === 0, r.after + " left");

console.log("\n4. CONTROL: A REAL TAP STILL UNDOES, OR NONE OF THE ABOVE MEANS ANYTHING");
await p.evaluate(()=>{
  document.querySelectorAll('#toasts .tst').forEach(el=> el.remove());
  window.UNDONE = 0;
  boot2();
  document.querySelector('#app [data-prefwarm="manual"]').click();
});
/* THE BUTTON, not the toast. Tapping the toast dismisses it, as it always has; Undo has
   its own target now, which is what removed the collision with the queue's housekeeping
   and is also the only thing a keyboard can land on. */
await p.locator('#toasts .tst-u').last().click();     // trusted, through the browser
await p.waitForTimeout(250);
r = await p.evaluate(()=> ({warmups: trainPrefs().warmups,
  onDisk: (()=>{ const k = Object.keys(localStorage).find(x=> x.indexOf("ironlog.v1") === 0);
    return k ? (JSON.parse(localStorage.getItem(k) || "{}").prefs || {}).warmups : null; })()}));
ck("a trusted tap puts the old value back", r.warmups === "auto", r.warmups);
ck("and on disk", r.onDisk === "auto", r.onDisk);

console.log("\n5. THE THINGS A KEYBOARD AND VOICEOVER NEED, BEFORE ASKING THEM TO WORK");
/* Enter and Space produce trusted clicks ON A BUTTON. A div with an onclick is neither
   focusable nor announced as actionable, so both of the sections below would be testing
   nothing if these were not true first. */
r = await p.evaluate(async ()=>{
  boot2();
  document.querySelector('#app [data-prefwarm="manual"]').click();
  await new Promise(x=> setTimeout(x, 50));
  const all = document.querySelectorAll('#toasts .tst');
  const t = all[all.length - 1];
  const u = t && t.querySelector('.tst-u');
  if(!u) return {none:true};
  u.focus();
  /* MEASURED AFTER THE ENTRY ANIMATION, not during it. tstIn scales the toast on the way
     in, so a rect read 40ms after creation reports 43.5px for a 44px button and the
     failure is the stopwatch, not the control. */
  await new Promise(x=> setTimeout(x, 420));
  const h = u.getBoundingClientRect().height;
  return {tag: u.tagName, name: u.getAttribute('aria-label') || "",
          focused: document.activeElement === u, tall: h,
          live: (document.getElementById('toasts')||{}).getAttribute
                 ? document.getElementById('toasts').getAttribute('aria-live') : null};
});
ck("Undo is a real button", r.tag === "BUTTON", r.tag);
ck("it takes focus", r.focused === true);
ck("it has a name that says what it reverses", /^Undo \u2014 .+/.test(r.name), r.name);
ck("it is a 44px target", r.tall >= 44, r.tall + "px");
ck("CONTROL: and the toast host is a live region, so the message is announced at all",
   r.live === "polite", r.live);

console.log("\n6. ENTER AND SPACE PUT IT BACK");
for(const key of ["Enter", "Space"]){
  await p.evaluate(async ()=>{
    boot2();
    document.querySelector('#app [data-prefwarm="manual"]').click();
    await new Promise(x=> setTimeout(x, 40));
    const all = document.querySelectorAll('#toasts .tst');
    all[all.length - 1].querySelector('.tst-u').focus();
  });
  await p.keyboard.press(key);
  await p.waitForTimeout(220);
  const back = await p.evaluate(()=> ({w: trainPrefs().warmups,
    d: (()=>{ const k = Object.keys(localStorage).find(x=> x.indexOf("ironlog.v1") === 0);
      return k ? (JSON.parse(localStorage.getItem(k) || "{}").prefs || {}).warmups : null; })()}));
  ck(key + " restores the old value", back.w === "auto", back.w);
  ck("and writes it to disk", back.d === "auto", back.d);
}

console.log("\n7. AN UNDO YOU CANNOT REACH IN TIME IS NO UNDO");
r = await p.evaluate(async ()=>{
  boot2();
  document.querySelector('#app [data-prefwarm="manual"]').click();
  await new Promise(x=> setTimeout(x, 40));
  const all = document.querySelectorAll('#toasts .tst');
  const t = all[all.length - 1];
  /* An ordinary toast is gone in 2.8s, which is not long enough to tab to anything. */
  const plain = (()=>{ toast("Plain one", "info"); const n = document.querySelectorAll('#toasts .tst');
    return n[n.length-1]; })();
  t.querySelector('.tst-u').focus();
  await new Promise(x=> setTimeout(x, 3200));          // past an ordinary toast's life
  return {undoStillThere: document.body.contains(t), plainGone: !document.body.contains(plain)};
});
ck("CONTROL: an ordinary toast has gone by 3.2s", r.plainGone);
ck("but the one carrying Undo is still there while focused", r.undoStillThere);

ck("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
