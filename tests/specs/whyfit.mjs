import { chromium, APP_URL } from './_e26.mjs';
/* THE "WHAT HAPPENED THERE?" SHEET, OPENING WITH ITS HEAD OFF THE TOP OF THE SCREEN.

   Photographed: the heading and the first option above the top edge, unreachable, with
   no way to scroll up to them.

   Two sheets in this app write #modal themselves instead of going through showModal(),
   which is where the size class is set. askConfirm() sets its own — .mo-prompt, which is
   max-height:none because a one-question prompt never needs a cap — and nothing took it
   off again. So any confirm anywhere in the session left that class on the element, and
   the next time this sheet opened it inherited "no maximum height" while being five
   options, a text field and a button. The backdrop aligns to the BOTTOM, so everything
   past the screen went off the top, and max-height:none leaves nothing to scroll. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:700}});
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  S.program[wid]=[{name:"Smith Machine Shoulder Press", sets:3, reps:"9-13", weight:75}];
  save(); S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
});

/* Open the sheet the way a short set does, and measure it against the screen. */
const openWhy = ()=> ev(async ()=>{
  const en = S.active.entries[0];
  const st = en.sets[0];
  st.weight = "75"; st.reps = "4";          // four reps against a 9-13 target
  delete en.whyAsked; delete st.why;
  const miss = shouldAskWhy(0, 0);
  if(!miss) return {none: true};
  askSetReason(en, st, miss);                // resolves when it is answered
  await new Promise(r=> setTimeout(r, 250));
  const m = document.getElementById('modal');
  const r = m.getBoundingClientRect();
  const head = m.querySelector('h3');
  const hr = head ? head.getBoundingClientRect() : null;
  return {cls: m.className,
          top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height),
          vh: window.innerHeight,
          headTop: hr ? Math.round(hr.top) : null,
          scrollable: m.scrollHeight > m.clientHeight + 1,
          maxH: getComputedStyle(m).maxHeight};
});

console.log("1 - OPENED CLEAN, IT FITS THE SCREEN");
{
  const r = await openWhy();
  console.log("   ", JSON.stringify(r));
  /* `from-btn` is the arrival animation's own class, added after the size class and
     nothing to do with the shape. What must not be here is a size somebody else asked
     for. */
  ck("it is not wearing another sheet's shape", !/mo-prompt|mo-page/.test(r.cls), r.cls);
  ck("the top is on the screen", r.top >= 0, String(r.top));
  ck("and the heading is visible", r.headTop !== null && r.headTop >= 0, String(r.headTop));
  ck("it is no taller than the screen", r.h <= r.vh, r.h + " of " + r.vh);
  await ev(()=> hideModal());
}

console.log("2 - AND STILL FITS AFTER A CONFIRM HAS BEEN AND GONE");
/* The reported path. askConfirm leaves .mo-prompt behind; anything opening after it used
   to wear that shape. */
{
  const left = await ev(async ()=>{
    askConfirm({title:"Is that right?", body:"120 reps is a lot", yes:"Yes", no:"No"});
    await new Promise(r=> setTimeout(r, 150));
    const during = document.getElementById('modal').className;
    document.getElementById('askNo').click();
    await new Promise(r=> setTimeout(r, 150));
    return {during, after: document.getElementById('modal').className};
  });
  console.log("   ", JSON.stringify(left));
  ck("the confirm takes the prompt shape", /mo-prompt/.test(left.during), left.during);
  ck("AND HANDS IT BACK ON THE WAY OUT", !/mo-prompt/.test(left.after), left.after);

  const r = await openWhy();
  console.log("   ", JSON.stringify(r));
  ck("so the sheet after it is not wearing that shape", !/mo-prompt/.test(r.cls), r.cls);
  ck("ITS HEADING IS ON THE SCREEN", r.headTop !== null && r.headTop >= 0, String(r.headTop));
  ck("its top is not cut off", r.top >= 0, String(r.top));
  ck("and it is capped at the screen", r.h <= r.vh, r.h + " of " + r.vh);
}

console.log("3 - AND WHEN IT IS TALLER THAN THE SCREEN IT SCROLLS, RATHER THAN HIDING ITS TOP");
/* 88vh and overflow-y:auto: the cap is what gives it something to scroll. */
{
  const r = await ev(()=>{
    const m = document.getElementById('modal');
    return {maxH: getComputedStyle(m).maxHeight, over: getComputedStyle(m).overflowY,
            canScroll: m.scrollHeight > m.clientHeight + 1,
            reachesTop: (()=>{ m.scrollTop = 0;
              const h = m.querySelector('h3');
              return h ? Math.round(h.getBoundingClientRect().top) >= Math.round(m.getBoundingClientRect().top) - 1 : null;
            })()};
  });
  console.log("   ", JSON.stringify(r));
  ck("there is a cap", r.maxH !== "none", r.maxH);
  ck("and it scrolls inside it", r.over === "auto" || r.over === "scroll", r.over);
  ck("so the heading can always be reached", r.reachesTop === true, String(r.reachesTop));
  await ev(()=> hideModal());
}

console.log("4 - A PROMPT IS STILL A PROMPT");
/* The variant has a job: a one-question sheet is not capped and rises a shorter
   distance. Clearing it on the way out must not take that away while it is open. */
{
  const r = await ev(async ()=>{
    askConfirm({title:"Delete this?", body:"It cannot be undone", yes:"Delete", no:"Cancel"});
    await new Promise(r2=> setTimeout(r2, 150));
    const m = document.getElementById('modal');
    const out = {cls: m.className, maxH: getComputedStyle(m).maxHeight};
    document.getElementById('askNo').click();
    await new Promise(r2=> setTimeout(r2, 120));
    return out;
  });
  console.log("   ", JSON.stringify(r));
  ck("it still takes the prompt shape while it is up", /mo-prompt/.test(r.cls), r.cls);
  ck("and is uncapped, as that shape intends", r.maxH === "none", r.maxH);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
