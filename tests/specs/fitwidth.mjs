import { chromium, APP_URL } from './_e26.mjs';
/* "THE HUGE PADDING AT THE RIGHT IS THE ISSUE, LIKE IT'S NOT FITTING THE SCREEN."

   Every card ended about 45px short of the right edge while the tab bar still spanned it.
   That shape is specific: it is what iOS does when something inside the page is wider than
   the viewport. It widens the LAYOUT viewport to fit the content and scales the page down,
   so the part that fits looks inset, while a fixed bar — which sizes to the layout
   viewport — still reaches both edges.

   So one stray width anywhere rescales every screen in the app. This sweeps the tabs at
   three phone widths and fails on any element that reaches past the viewport, which is the
   only way to keep that element from existing. The page also clips horizontally now, so a
   miss here costs a clipped edge rather than a shrunken app. */
const b = await chromium.launch();
const errs=[];
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* 320 is the narrowest phone still in use, 390 the common one, 430 the big one. */
for(const width of [320, 390, 430]){
  const p = await b.newPage({viewport:{width, height:844}});
  p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(()=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
    S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
    S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
    S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false});
    S.splitId='ppl6'; applySplit();
    const d=86400000, now=Date.now();
    S.sessions=[];
    for(let i=9;i>=1;i--){
      const t=now-i*d, wid=ROTATION[(9-i)%ROTATION.length];
      S.sessions.push({id:"s"+i, workoutId:wid, date:dayStr(t), startedAt:t, finishedAt:t+3600e3, feel:4,
        entries:[{name:"Smith Machine Squat", reps:"9-13", sets:[
          {weight:"70", reps:"10", rpe:"8", done:true},{weight:"70", reps:"9", rpe:"9", done:true}]},
          {name:"Dumbbell Bulgarian Split Squat", reps:"8-12", bwOn:139.6, sets:[
          {weight:"159.6", reps:"10", rpe:"8", done:true}]}]});
    }
    S.cycleDone=[0,1]; S.pointer=2;
    /* A gym name and an exercise name long enough to be awkward, because real ones are. */
    S.gyms=[{id:"g1", name:"Palma Vista Fitness & Performance Centre"}];
    S.checkins = {[todayStr()]:{sleep:"7", energy:"6", sore:{hamstrings:2, abs:2}}};
    save();
  });
  console.log("\n" + width + "px WIDE");
  for(const tab of ["today","workout","history","body","program","research","sync"]){
    const r = await p.evaluate(t=>{
      TAB = t; SET_PAGE = null; render();
      const vw = document.documentElement.clientWidth;
      const over = [];
      document.querySelectorAll("#app *").forEach(el=>{
        const box = el.getBoundingClientRect();
        if(box.width === 0 && box.height === 0) return;
        /* An element INSIDE something that scrolls sideways on purpose — the research
           filter chips — is allowed past the edge; the page still is not. */
        let scroller = false;
        for(let n = el.parentElement; n && n.id !== "app"; n = n.parentElement){
          const ox = getComputedStyle(n).overflowX;
          if(ox === "auto" || ox === "scroll" || ox === "clip" || ox === "hidden"){ scroller = true; break; }
        }
        if(scroller) return;
        if(box.right > vw + 1 || box.width > vw + 1)
          over.push((el.className||el.tagName).toString().slice(0,30) + " right:" + Math.round(box.right));
      });
      return {vw, scrollW: document.documentElement.scrollWidth, over: over.slice(0,4)};
    }, tab);
    ck(tab + " fits the screen", r.over.length === 0 && r.scrollW <= r.vw + 1,
       r.over.length ? r.over.join(" | ") : (r.scrollW + " wide in " + r.vw));
  }
  await p.close();
}

console.log("\nAND THE PAGE CANNOT BE MADE TO SCROLL SIDEWAYS");
{
  const p = await b.newPage({viewport:{width:390, height:844}});
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  const r = await p.evaluate(()=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    const app = document.getElementById("app");
    /* Something deliberately far too wide, standing in for whatever real element does it. */
    const bad2 = document.createElement("div");
    bad2.style.cssText = "width:900px;height:20px";
    app.appendChild(bad2);
    const after = {scrollW: document.documentElement.scrollWidth,
                   vw: document.documentElement.clientWidth,
                   htmlClip: getComputedStyle(document.documentElement).overflowX,
                   bodyClip: getComputedStyle(document.body).overflowX};
    bad2.remove();
    return after;
  });
  console.log("   ", JSON.stringify(r));
  ck("a 900px element does not widen the document", r.scrollW <= r.vw + 1, r.scrollW + " vs " + r.vw);
  ck("because the page clips rather than scrolling", /clip|hidden/.test(r.htmlClip), r.htmlClip);
  ck("and it is clip, which keeps sticky headers working", r.htmlClip === "clip", r.htmlClip);
  await p.close();
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
