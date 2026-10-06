/* THE TAB BAR STAYS ON THE BOTTOM OF THE SCREEN.

   Reported from a recording: scrolling up at the very top of a page, the bar stops
   sticking to the bottom and climbs. That is the correction for Safari's bottom toolbar
   firing on a measurement taken mid-rubber-band -- the gesture that pulls the toolbar
   back is the same gesture, so the viewport is changing size at exactly the moment the
   page reports a scroll.

   The old rule could only ever push the bar UP: it lifted by
   innerHeight - (vv.height + vv.offsetTop), which is never negative, so once a bad sample
   lifted the bar nothing could discover it had gone too far. navGapFor() measures the
   residual between where the bar IS and where the bottom of the screen IS, which has a
   sign -- and this spec is the numbers from that situation, so it needs no phone. */
import { chromium, APP_URL, shot } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const ev = (fn,a)=> p.evaluate(fn,a);

/* The shape of one reading. Defaults are a phone sitting still with the bar where it
   belongs: nothing to correct. */
const M = o=> Object.assign({
  gapNow: 0, typing: false, hidden: false, overscrolled: false,
  navBottom: 844, visibleBottom: 844
}, o || {});

console.log("1 - WHEN THERE IS NOTHING TO CORRECT, NOTHING IS CORRECTED");
{
  const r = await ev(m=> navGapFor(m), M());
  ck("a bar already on the bottom is left alone", r === 0, String(r));
  const r2 = await ev(m=> navGapFor(m), M({gapNow: 44, navBottom: 800, visibleBottom: 800}));
  ck("and so is one already corrected", r2 === 44, String(r2));
}

console.log("2 - A BAR HIDDEN BEHIND THE TOOLBAR IS LIFTED ONTO IT");
{
  /* Safari's toolbar is up: the layout viewport runs 50px past what you can see, so a
     bottom:0 bar sits 50px below the visible bottom. */
  const r = await ev(m=> navGapFor(m), M({navBottom: 844, visibleBottom: 794}));
  ck("lifted by exactly what is hidden", r === 50, String(r));
  const r2 = await ev(m=> navGapFor(m), M({gapNow: 50, navBottom: 794, visibleBottom: 794}));
  ck("and then it stops", r2 === 50, String(r2));
}

console.log("3 - AND A BAR THAT HAS BEEN LIFTED TOO FAR COMES BACK DOWN");
{
  /* THE REPORTED BUG. A sample taken while the toolbar was animating lifted the bar 50px;
     the toolbar then finished collapsing, so nothing is hidden any more and the bar is
     floating 50px up the screen. The old arithmetic had no way to express this: its
     correction could only ever be positive. */
  const r = await ev(m=> navGapFor(m), M({gapNow: 50, navBottom: 794, visibleBottom: 844}));
  ck("THE RESIDUAL IS NEGATIVE AND IT IS PUT BACK", r === 0, String(r));
  const r2 = await ev(m=> navGapFor(m), M({gapNow: 50, navBottom: 814, visibleBottom: 844}));
  ck("and a partial over-correction is partly undone", r2 === 20, String(r2));
}

console.log("4 - RUBBER-BANDING IS NOT A MEASUREMENT");
{
  const r = await ev(m=> navGapFor(m), M({gapNow: 0, overscrolled: true,
                                          navBottom: 844, visibleBottom: 790}));
  ck("pulled past the top, the reading is thrown away", r === 0, String(r));
  const r2 = await ev(m=> navGapFor(m), M({gapNow: 36, overscrolled: true,
                                           navBottom: 700, visibleBottom: 844}));
  ck("and the bar is left exactly where it was", r2 === 36, String(r2));
}

console.log("5 - THE AUTO-HIDE AND THE CORRECTION NEVER MEASURE EACH OTHER");
{
  /* A retracted bar is translated a full height down. Measured then, its bottom edge is
     far below the screen and the residual would read as a 90px toolbar. */
  const r = await ev(m=> navGapFor(m), M({gapNow: 0, hidden: true,
                                          navBottom: 1700, visibleBottom: 844}));
  ck("a sliding bar is not measured", r === 0, String(r));
}

console.log("6 - A KEYBOARD IS NOT A TOOLBAR");
{
  const r = await ev(m=> navGapFor(m), M({gapNow: 0, typing: true,
                                          navBottom: 844, visibleBottom: 540}));
  ck("the bar does not climb onto the keyboard", r === 0, String(r));
}

console.log("7 - AND IT NEVER GOES FURTHER THAN A TOOLBAR COULD");
{
  /* 444px is not a toolbar. It is a keyboard that got past the typing guard, or a frame
     of one on the way up, and the answer is to decline the reading rather than to clamp
     it: clamping would lift the bar 90px, which is a wrong answer you can see, where
     declining leaves it where it was and the confirmation pass looks again. */
  const r = await ev(m=> navGapFor(m), M({gapNow: 0, navBottom: 844, visibleBottom: 400}));
  ck("a reading too big to be a toolbar is declined, not clamped", r === 0, String(r));
  const held = await ev(m=> navGapFor(m), M({gapNow: 72, navBottom: 772, visibleBottom: 400}));
  ck("and a correction already applied is kept, not reset", held === 72, String(held));
  const r2 = await ev(m=> navGapFor(m), M({gapNow: 0, navBottom: 700, visibleBottom: 844}));
  ck("and never below the bottom of the screen", r2 === 0, String(r2));
}

console.log("8 - THE WIRING READS THE REAL BAR");
{
  const r = await ev(()=>{
    const nav = document.querySelector("nav");
    const vv = window.visualViewport;
    const rect = nav.getBoundingClientRect();
    return {bottom: Math.round(rect.bottom),
      visible: vv ? Math.round(vv.offsetTop + vv.height) : null,
      gap: getComputedStyle(nav).getPropertyValue("--navGap").trim(),
      pinned: Math.abs(rect.bottom - (vv ? vv.offsetTop + vv.height : rect.bottom)) < 2};
  });
  ck("the bar is on the bottom of the visible area", r.pinned === true, JSON.stringify(r));
  ck("with no correction applied, because none is needed",
     r.gap === "" || r.gap === "0px", "'" + r.gap + "'");
}

console.log("9 - SCROLLING TO THE TOP AND PULLING UP LEAVES IT THERE");
{
  const r = await ev(async ()=>{
    S.setup = {name:"Fer", goal:"muscle", level:"intermediate", gear:"full", at:Date.now()};
    S.tourDone = true; S.seenNews = "x"; S.priorTrainingWeeks = 104;
    S.splitId = DEFAULT_SPLIT; applySplit();
    DAYS.forEach(w=>{ S.program[w] = [{name:"Barbell Bench Press", sets:4, reps:"6-10", rpes:[7,8,8,9]}]; });
    save(); TAB = "body"; render();
    await new Promise(r2=> setTimeout(r2, 250));
    const nav = document.querySelector("nav");
    const at = ()=> Math.round(nav.getBoundingClientRect().bottom);
    window.scrollTo(0, 600);
    await new Promise(r2=> setTimeout(r2, 160));
    window.scrollTo(0, 0);
    await new Promise(r2=> setTimeout(r2, 160));
    const top = at();
    /* up again, from a standstill at the top -- the gesture in the recording */
    for(let i = 0; i < 6; i++){
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event("scroll"));
      await new Promise(r2=> setTimeout(r2, 40));
    }
    await new Promise(r2=> setTimeout(r2, 700));     // past both confirmation passes
    return {top, after: at(), h: window.innerHeight,
      gap: getComputedStyle(nav).getPropertyValue("--navGap").trim()};
  });
  ck("the bar is on the bottom at the top of the page", Math.abs(r.top - r.h) < 2,
     JSON.stringify(r));
  ck("AND IT IS STILL THERE AFTER PULLING UP AT THE TOP", Math.abs(r.after - r.h) < 2,
     JSON.stringify(r));
  ck("with nothing left applied", r.gap === "" || r.gap === "0px", "'" + r.gap + "'");
  await p.screenshot({path: shot("navstick.png")});
}

console.log("10 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
