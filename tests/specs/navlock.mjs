import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE TAB BAR FROZEN HALFWAY UP THE SCREEN, WITH THE PAGE CARRYING ON UNDERNEATH IT.

   Reported three times, the third with a video. overflow:hidden on BODY is the cause:
   on iOS Safari it is the classic way to break position:fixed — fixed children stop
   tracking the viewport and are left where the document had them, which is the middle
   of the screen, until something forces a repaint and they snap back.

   2026.11.06.1 took it off html and body for the width guard. That was one of four
   places setting it. The other three are scroll locks, and they are worse, because a
   class added when an overlay opens can outlive the overlay: the preflight class has
   been seen on a body whose preflight element was long gone.

   Nothing on this engine reproduces the iOS fault, so what this spec can hold is the
   rule rather than the symptom: no path in this app puts overflow:hidden on the body or
   the root, and a lock class cannot survive the thing it was locking for. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:844}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const ev=(fn,a)=>p.evaluate(fn,a);

await ev(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false});
  S.splitId=DEFAULT_SPLIT; applySplit(); save(); TAB="today"; render();
});

console.log("1 - NO LOCK IN THIS APP HIDES THE BODY'S OVERFLOW");
/* Read off the stylesheet, because this is a rule about the source: a future lock that
   reaches for overflow:hidden on the body is the bug coming back. */
{
  const src = readFileSync(appFile("index.html"), "utf8");
  const css = src.slice(0, src.indexOf("</style>"));
  const hits = (css.match(/(^|\})\s*(html|body)[^{}]*\{[^}]*overflow(-x|-y)?\s*:\s*hidden/g) || []);
  console.log("   ", JSON.stringify(hits));
  ck("nothing sets overflow:hidden on html or body", hits.length === 0, hits.join(" | "));
}

console.log("2 - AND THE BODY STAYS SCROLLABLE WITH A SHEET OPEN");
{
  const r = await ev(async ()=>{
    showModal("<h3>A sheet</h3><p>something</p>");
    await new Promise(r2=> setTimeout(r2, 120));
    const cs = getComputedStyle(document.body);
    const bg = getComputedStyle(document.getElementById('modalBg'));
    const m  = getComputedStyle(document.getElementById('modal'));
    const out = {live: document.body.classList.contains('modal-live'),
                 bodyOv: cs.overflowY, bodyChain: cs.overscrollBehaviorY,
                 bgTouch: bg.touchAction, modalTouch: m.touchAction,
                 modalOv: m.overflowY};
    hideModal();
    return out;
  });
  console.log("   ", JSON.stringify(r));
  ck("the sheet is open and marked", r.live, String(r.live));
  ck("THE BODY IS NOT OVERFLOW-HIDDEN", r.bodyOv !== "hidden", r.bodyOv);
  ck("a scroll inside it does not chain out to the page", r.bodyChain === "contain", r.bodyChain);
  ck("the backdrop swallows the gesture instead", r.bgTouch === "none", r.bgTouch);
  ck("while the sheet itself still scrolls", r.modalTouch === "pan-y" && r.modalOv === "auto",
     r.modalTouch + " / " + r.modalOv);
}

console.log("3 - A LOCK CANNOT OUTLIVE WHAT IT WAS LOCKING FOR");
/* The failure that makes this worth a sweep: the class is added by one path and removed
   by another, and the removing one can be skipped. */
{
  const r = await ev(()=>{
    /* Nothing is actually open: the panels are hidden, the sheet is down. The boot
       state leaves #aiFull showing, and a sweep that dropped ai-open while the panel
       was up would be a worse bug than the one it is here to prevent. */
    document.querySelectorAll('.ai-full').forEach(n=> n.hidden = true);
    const LOCKS = ["modal-live","pfl-open","tour-live","cele-open",
                   "ai-open","spec-open","build-open","news-open"];
    LOCKS.forEach(c=> document.body.classList.add(c));
    const before = LOCKS.filter(c=> document.body.classList.contains(c));
    render();
    const after = LOCKS.filter(c=> document.body.classList.contains(c));
    return {before, after};
  });
  console.log("   ", JSON.stringify(r));
  ck("all eight were stuck on", r.before.length === 8, JSON.stringify(r.before));
  ck("AND A RENDER SWEEPS EVERY ONE OF THEM", r.after.length === 0, JSON.stringify(r.after));
}

console.log("3b - AND A PANEL THAT IS GENUINELY UP KEEPS ITS CLASS");
/* The other half of the same rule: #aiFull is on screen from boot in this state, so
   sweeping ai-open off it would hide the jump-back arrow's own reason to stay away. */
{
  const r = await ev(()=>{
    const w = document.getElementById('aiFull');
    w.hidden = false;
    document.body.classList.add("ai-open");
    render();
    const kept = document.body.classList.contains("ai-open");
    w.hidden = true; render();
    return {kept, gone: !document.body.classList.contains("ai-open")};
  });
  console.log("   ", JSON.stringify(r));
  ck("an open panel keeps its class", r.kept, String(r.kept));
  ck("and loses it once it is hidden", r.gone, String(r.gone));
}

console.log("4 - BUT A LOCK THAT IS DOING ITS JOB IS LEFT ALONE");
{
  const r = await ev(async ()=>{
    showModal("<h3>Still open</h3>");
    await new Promise(r2=> setTimeout(r2, 100));
    render();                                   // a render while the sheet is up
    const kept = document.body.classList.contains("modal-live");
    const shown = document.getElementById('modalBg').classList.contains("show");
    hideModal();
    await new Promise(r2=> setTimeout(r2, 100));
    render();
    return {kept, shown, gone: !document.body.classList.contains("modal-live")};
  });
  console.log("   ", JSON.stringify(r));
  ck("an open sheet keeps its lock", r.kept && r.shown, JSON.stringify(r));
  ck("and loses it once it closes", r.gone, String(r.gone));
}

console.log("5 - THE TAB BAR IS FIXED TO THE BOTTOM, AND STAYS THERE");
{
  const r = await ev(async ()=>{
    const out = [];
    for(const y of [0, 500, 1200]){
      window.scrollTo(0, y);
      await new Promise(r2=> setTimeout(r2, 220));
      const n = document.querySelector('nav');
      const rc = n.getBoundingClientRect();
      out.push({y: Math.round(window.scrollY), pos: getComputedStyle(n).position,
                offBottom: Math.round(window.innerHeight - rc.bottom)});
    }
    window.scrollTo(0, 0);
    return out;
  });
  console.log("   ", JSON.stringify(r));
  ck("it is fixed at every scroll position", r.every(x=> x.pos === "fixed"),
     JSON.stringify(r.map(x=>x.pos)));
  /* Either flush with the bottom, or slid fully out of the way by the auto-hide. Never
     parked somewhere in the middle. */
  ck("and never parked halfway up the screen",
     r.every(x=> x.offBottom <= 1 || x.offBottom < -40), JSON.stringify(r.map(x=>x.offBottom)));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
