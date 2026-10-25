import { chromium, APP_URL } from './_e26.mjs';
/* "HUGE DESIGN ISSUES ON WORKOUT TAB WHEN SCROLLING UP AND DOWN ONLY WITH THE REST TIMER
   ON, THE NAV BAR LIKE GLITCHES OUT."

   The tab bar moves: --navGap lifts it off whatever Safari's bottom toolbar is covering,
   and the auto-hide slides it away. The rest pill was fixed at a hard 86px, measured once
   against a bar sitting flat on the bottom of the screen — so every scroll with a rest
   running had the two of them drift apart and then overlap. They read one variable now,
   and this spec is about the GAP between them staying put while the bar moves. */
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
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  S.program[wid]=[{name:"Cable Fly", sets:3, reps:"8-12", weight:30}];
  save(); if(S.active) S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
  const st=S.active.entries[0].sets[0]; st.reps="10"; st.weight="30"; save(); render();
  document.querySelector('.chk[data-e="0"][data-s="0"]').click();
});
await p.waitForTimeout(400);
const meas = ()=> p.evaluate(()=>{
  const nav=document.querySelector('nav'), pill=document.getElementById('restUI');
  if(!nav || !pill) return {none:true};
  const n=nav.getBoundingClientRect(), q=pill.getBoundingClientRect();
  return {gap: Math.round(n.top - q.bottom), pillBottom: Math.round(q.bottom),
          navTop: Math.round(n.top)};
});

console.log("1 - THE PILL IS ON SCREEN AND ABOVE THE BAR");
const flat = await meas();
console.log("   ", JSON.stringify(flat));
ck("a rest pill is drawn", !flat.none, JSON.stringify(flat));
ck("it clears the tab bar rather than sitting under it", flat.gap > 0, flat.gap + "px");
ck("and the page gains tail for the row it covers",
   await p.evaluate(()=> document.body.classList.contains('rest-up')));

console.log("\n2 - THE BAR LIFTS OFF A BROWSER TOOLBAR AND THE PILL GOES WITH IT");
await p.evaluate(()=>{
  document.querySelector('nav').style.setProperty('--navGap','60px');
  document.documentElement.style.setProperty('--navGap','60px');
});
await p.waitForTimeout(400);
const lifted = await meas();
console.log("   ", JSON.stringify(lifted));
ck("the bar moved", lifted.navTop < flat.navTop - 50, (flat.navTop - lifted.navTop) + "px");
ck("the pill moved with it", lifted.pillBottom < flat.pillBottom - 50,
   (flat.pillBottom - lifted.pillBottom) + "px");
ck("so the gap between them is unchanged", Math.abs(lifted.gap - flat.gap) <= 2,
   flat.gap + " -> " + lifted.gap);

console.log("\n3 - AND BACK DOWN AGAIN");
await p.evaluate(()=>{
  document.querySelector('nav').style.setProperty('--navGap','0px');
  document.documentElement.style.setProperty('--navGap','0px');
});
await p.waitForTimeout(400);
const back = await meas();
console.log("   ", JSON.stringify(back));
ck("the gap survives the round trip", Math.abs(back.gap - flat.gap) <= 2,
   flat.gap + " -> " + back.gap);

console.log("\n4 - ONE SOURCE OF TRUTH, NOT TWO GUESSES");
{
  /* The hard 86px is what the bug was. The pill's offset has to be a function of the
     same variable the bar is positioned from, which is what this reads: move the
     variable, the computed offset moves by exactly as much.
     Measured after the transition rather than during it — getComputedStyle returns the
     interpolated value mid-transition, which is the old number for a frame. */
  const at = g=> p.evaluate(v=>{
    document.documentElement.style.setProperty('--navGap', v);
    return new Promise(r=> setTimeout(()=> r(getComputedStyle(document.getElementById('restUI')).bottom), 400));
  }, g);
  const b0 = await at('0px'), b30 = await at('30px');
  console.log("   ", b0, "->", b30);
  ck("the offset tracks --navGap one for one",
     parseFloat(b30) - parseFloat(b0) === 30, b0 + " -> " + b30);
  const css = (await import('node:fs')).readFileSync(
    new URL('../../index.html', import.meta.url), 'utf8');
  ck("and the rule says so in the source",
     /\.rest-mini\{[^}]*var\(--navGap/s.test(css), "rest-mini reads --navGap");
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
