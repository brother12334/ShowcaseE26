import { chromium, APP_URL } from './_e26.mjs';
/* "MAKE AN ARROW WHEN CURRENTLY LOGGING A WORKOUT AT THE BOTTOM OF THE SCREEN WHEN YOU
   SCROLL UP AND IT WILL TAKE YOU BACK TO YOUR CURRENT EXERCISE."

   A session is a long page and every reason to leave the set you are on sends you up it.
   Coming back meant scrolling until you recognised the card, one-handed, mid-rest. */
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

await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.viewMode="regular";
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  S.program[wid]=["Cable Fly","Cable Row","Lat Pulldown","Dumbbell Curl","Leg Press","Seated Calf Raise Machine"]
    .map(n=>({name:n, sets:3, reps:"8-12", weight:50}));
  save(); S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
});
await p.waitForTimeout(300);
const state = ()=> p.evaluate(()=>{
  const el=document.getElementById('liveJump');
  const row=document.querySelector('.set.is-live');
  const card=row?row.closest('.card.ex'):null;
  return {shown: !!el, up: el ? el.classList.contains('lj-up') : null,
          txt: el ? el.innerText.replace(/\s+/g,' ').trim() : null,
          left: el ? Math.round(el.getBoundingClientRect().left) : null,
          cardTop: card ? Math.round(card.getBoundingClientRect().top) : null,
          y: Math.round(window.scrollY)};
});

console.log("1 - SITTING ON YOUR SET, THERE IS NOTHING TO GO BACK TO");
{
  const r = await state();
  console.log("   ", JSON.stringify(r));
  ck("the live row is on screen", r.cardTop != null && r.cardTop < 844, String(r.cardTop));
  ck("so no arrow is drawn", r.shown === false, String(r.shown));
}

console.log("2 - SCROLL DOWN PAST IT AND IT POINTS BACK UP");
{
  await p.evaluate(()=> window.scrollTo(0, document.documentElement.scrollHeight));
  await p.waitForTimeout(250);
  const r = await state();
  console.log("   ", JSON.stringify(r));
  ck("the card is above the screen now", r.cardTop != null && r.cardTop < 0, String(r.cardTop));
  ck("THE ARROW IS THERE", r.shown, String(r.shown));
  ck("pointing the way back", r.up === true, String(r.up));
  ck("and it says what it goes to", /your set/i.test(r.txt || ""), r.txt);
}

console.log("3 - AND TAPPING IT TAKES YOU BACK");
{
  const r = await p.evaluate(async ()=>{
    document.getElementById('liveJump').click();
    await new Promise(r2=> setTimeout(r2, 900));
    const card=document.querySelector('.set.is-live').closest('.card.ex');
    const t = card.getBoundingClientRect();
    return {top: Math.round(t.top), bottom: Math.round(t.bottom),
            still: !!document.getElementById('liveJump')};
  });
  console.log("   ", JSON.stringify(r));
  ck("the card you are on is on screen", r.bottom > 0 && r.top < 844, JSON.stringify(r));
  ck("and the arrow takes itself away", r.still === false, String(r.still));
}

console.log("4 - IT TRACKS THE SET YOU ARE ACTUALLY ON");
/* Log the first exercise and "here" moves down the page; from the top, the arrow has to
   point the other way. */
{
  const r = await p.evaluate(async ()=>{
    /* Far enough down that it is genuinely off the screen from the top: two cards still
       leave the third partly in view at this height, which is correctly no arrow. */
    [0,1,2].forEach(i=>{
      S.active.entries[i].sets.forEach(st=>{ st.weight="50"; st.reps="10"; st.done=true; });
    });
    S.active.restTimer = null;
    save(); render();
    window.scrollTo(0, 0);
    await new Promise(r2=> setTimeout(r2, 300));
    const el=document.getElementById('liveJump');
    const row=document.querySelector('.set.is-live');
    return {ei: row ? row.querySelector('input[data-e]').dataset.e : null,
            shown: !!el, up: el ? el.classList.contains('lj-up') : null,
            arrow: el ? el.querySelector('.lj-arrow').textContent.trim() : null};
  });
  console.log("   ", JSON.stringify(r));
  ck("the live set has moved down the page", r.ei === "3", String(r.ei));
  ck("the arrow is shown from the top of the page", r.shown, String(r.shown));
  ck("and points DOWN this time", r.up === false && r.arrow === "↓",
     JSON.stringify({up: r.up, arrow: r.arrow}));
}

console.log("5 - IT KEEPS OUT OF THE REST CLOCK'S WAY");
{
  const r = await p.evaluate(async ()=>{
    const st = S.active.entries[3].sets[0];
    st.weight="50"; st.reps="10"; save(); render();
    const chk = document.querySelector('.chk[data-e="3"][data-s="0"]');
    if(chk) chk.click();
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise(r2=> setTimeout(r2, 400));
    const j=document.getElementById('liveJump'), pill=document.getElementById('restUI');
    if(!j || !pill) return {none:true, j: !!j, pill: !!pill};
    const a=j.getBoundingClientRect(), b2=pill.getBoundingClientRect();
    return {overlap: !(a.right < b2.left || b2.right < a.left),
            jBottom: Math.round(a.bottom), pBottom: Math.round(b2.bottom)};
  });
  console.log("   ", JSON.stringify(r));
  ck("both the clock and the arrow are on screen", !r.none, JSON.stringify(r));
  ck("they do not overlap", r.overlap === false, String(r.overlap));
  ck("and they sit at the same height", Math.abs(r.jBottom - r.pBottom) <= 2,
     r.jBottom + " vs " + r.pBottom);
}

console.log("6 - AND IT IS A SESSION CONTROL, NOT A PAGE CONTROL");
{
  const r = await p.evaluate(async ()=>{
    TAB="today"; render();
    await new Promise(r2=> setTimeout(r2, 250));
    const onToday = !!document.getElementById('liveJump');
    TAB="workout"; S.viewMode="focus"; render();
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise(r2=> setTimeout(r2, 250));
    const inGym = !!document.getElementById('liveJump');
    S.viewMode="regular"; render();
    return {onToday, inGym};
  });
  console.log("   ", JSON.stringify(r));
  ck("it is not on another tab", r.onToday === false, String(r.onToday));
  ck("nor in gym mode, where there is nowhere else to be", r.inGym === false, String(r.inGym));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
