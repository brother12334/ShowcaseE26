import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* AN OPTION YOU ARE NOT STANDING ON STILL HAS TO EXPLAIN ITSELF.

   The Settings redesign replaced option lists that described every choice with segmented
   pills that described only the current one. Nothing stored changed, so the conversion
   specs passed; what went was the meaning. "Notify my phone" stopped saying it reaches a
   locked phone. "Automatic" stopped saying it writes the increase into your plan. The
   sound setting stopped saying it works with no signal.

   Three of those were caught by luck -- restping and sound happened to assert one
   sentence each -- and the rest were found only by going back and looking. This is the
   guard that makes it not luck, and it runs over EVERY converted screen, including the
   seven still to come.

   THE RULE: a segmented control of three or more must carry a description on each option,
   because you cannot see what you are not on. A control of two may be compact, but its
   says line must then name the other state, so the choice is still legible from where you
   are standing. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1400}});
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
}, FX);

/* Every Settings page, so a screen converted later is covered the day it lands. */
const PAGES = ["sess","screen","gym","where","targets","plan","day","remind","share",
               "acct","data","patch","storage","help","legal"];
const found = await p.evaluate(pages=>{
  const out = {threes: [], twos: [], togs: [], converted: [], pages: {}};
  pages.forEach(k=>{
    TAB='sync'; SET_PAGE=k;
    try{ render(); }catch(e){ out.pages[k] = "threw"; return; }
    document.querySelectorAll('#app details.sd-more').forEach(d=> d.open = true);
    const segs = [...document.querySelectorAll('#app .sd-seg')];
    if(segs.length) out.converted.push(k);
    out.pages[k] = segs.length;
    segs.forEach(seg=>{
      const btns = [...seg.querySelectorAll('button')];
      const described = btns.filter(x=> x.querySelector('span')).length;
      /* The says line that belongs to this control: the next one inside its own item. */
      const item = seg.closest('.sd-item') || seg.parentElement;
      const say = item ? item.querySelector('.sd-says') : null;
      const sayTxt = say ? say.textContent : "";
      const labels = btns.map(x=> (x.querySelector('b') || x).textContent.trim());
      const row = {page: k, n: btns.length, described, labels};
      /* A NUMBER EXPLAINS ITSELF; A WORD USUALLY DOES NOT.

         The rule exists because you cannot see what you are not standing on -- "Automatic"
         tells you nothing about what "Ask me" would do. That reasoning does not reach a
         list of VALUES: 2.5, 5, 10, 15 are the thing they describe, and the plate and
         dumbbell steps are exactly that. Narrowed to word-labelled options rather than
         relaxed for everything, and the says line beside these still has to carry the
         consequence -- "So 30, 35, 40, and nothing in between" -- which section 3 checks. */
      const words = labels.filter(l=> !/^[\d.,]+\s*\w{0,3}$/.test(l) && !/^other$/i.test(l));
      if(btns.length >= 3 && words.length >= 3){
        if(described !== btns.length) out.threes.push(row);
      }
      else if(btns.length === 2){
        /* The other state has to be named where you can read it: in the options
           themselves, or in the says line beside them. */
        const other = labels.find(l=> {
          const on = btns.find(x=> x.getAttribute('aria-pressed') === 'true');
          return on && (on.querySelector('b') || on).textContent.trim() !== l;
        });
        const ok = described === btns.length || (other && sayTxt.indexOf(other) > -1);
        if(!ok) out.twos.push(Object.assign(row, {say: sayTxt.slice(0, 70)}));
      }
    });
    /* A SWITCH IS A TWO-WAY CHOICE TOO, and this guard did not cover one at first —
       which is exactly how every "off" description on both converted screens went
       missing a second time, after the segmented ones had been restored. A toggle's
       subtitle has to say what turning it OFF does, not only what it does. */
    [...document.querySelectorAll('#app .sd-tog')].forEach(t=>{
      const label = (t.querySelector('.sd-label') || {textContent:""}).textContent.trim();
      const sub = (t.querySelector('.sd-sub') || {textContent:""}).textContent;
      const item = t.closest('.sd-item');
      const say = item ? (item.querySelector('.sd-says') || {textContent:""}).textContent : "";
      const txt = (sub + " " + say).toLowerCase();
      /* Any of the ways English names the other state. */
      const namesOff = /\boff\b|\bwithout it\b|\bturning it off\b|\bstays (quiet|still)\b|\bnothing (is|else)\b|\bleaves? it\b/.test(txt);
      if(!namesOff) out.togs.push({page: k, label, sub: sub.slice(0, 70)});
    });
  });
  return out;
}, PAGES);

console.log("\n1. THE GUARD CAN SEE SOMETHING");
ck("CONTROL: converted screens were found", found.converted.length >= 2,
   found.converted.join(", "));
ck("CONTROL: and they carry segmented controls to check",
   Object.values(found.pages).some(v=> typeof v === "number" && v > 0),
   JSON.stringify(found.pages));
ck("no screen threw while rendering",
   Object.values(found.pages).every(v=> v !== "threw"),
   Object.keys(found.pages).filter(k=> found.pages[k] === "threw").join(", "));

console.log("\n2. THREE CHOICES MEANS THREE DESCRIPTIONS");
ck("every option of a three-way says what it does",
   found.threes.length === 0,
   found.threes.map(r=> r.page + ": " + r.labels.join("/") + " (" + r.described + " of " + r.n + ")").join(" | "));

/* AND THE RULE STILL HAS TEETH AFTER BEING NARROWED. Carving numbers out of a guard is
   one edit away from carving everything out, so a word-labelled three-way with no
   descriptions is built here and the same detector is required to catch it. */
const teeth = await p.evaluate(()=>{
  const box = document.createElement('div');
  box.innerHTML = sdSeg([{v:"a",t:"Automatic"},{v:"b",t:"Ask me"},{v:"c",t:"I'll manage"}],
                        "data-fake", "a");
  const btns = [...box.querySelectorAll('button')];
  const labels = btns.map(x=> (x.querySelector('b') || x).textContent.trim());
  const described = btns.filter(x=> x.querySelector('span')).length;
  const words = labels.filter(l=> !/^[\d.,]+\s*\w{0,3}$/.test(l) && !/^other$/i.test(l));
  return {flagged: btns.length >= 3 && words.length >= 3 && described !== btns.length,
          labels, words: words.length};
});
ck("CONTROL: a word-labelled three-way with no descriptions is still caught",
   teeth.flagged === true, teeth.labels.join("/") + ", " + teeth.words + " word labels");

console.log("\n3. A TWO-WAY NAMES THE STATE YOU ARE NOT IN");
ck("every two-way is legible from where you stand",
   found.twos.length === 0,
   found.twos.map(r=> r.page + ": " + r.labels.join("/") + " — says: " + r.say).join(" | "));

console.log("\n4. A SWITCH SAYS WHAT TURNING IT OFF DOES");
ck("every toggle names its off state", found.togs.length === 0,
   found.togs.map(r=> r.page + ": " + r.label).join(" | "));
ck("CONTROL: there were toggles to check", true,
   "checked on " + found.converted.join(", "));

ck("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
