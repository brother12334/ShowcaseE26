import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* A fake bottom-of-screen strip. Headless Chromium's visual viewport always matches the
   layout one, so the only way to exercise the correction is to say a strip exists. */
const init = ()=>{
  localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X');
  window.__strip = 0;
  const vv = window.visualViewport;
  if(vv){
    Object.defineProperty(vv, 'height', {configurable:true, get(){ return window.innerHeight - (window.__strip||0); }});
    Object.defineProperty(vv, 'offsetTop', {configurable:true, get(){ return 0; }});
    window.__setStrip = n=>{ window.__strip = n; vv.dispatchEvent(new Event('resize')); };
  }else{
    window.__setStrip = ()=>{};
  }
};
const clear = ()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit(); save();
  TAB="sync"; SET_PAGE=null; render(); window.scrollTo(0,0); showNav();
};
const open = async (ua)=>{
  const ctx = await b.newContext(Object.assign({viewport:{width:390,height:800}}, ua?{userAgent:ua}:{}));
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.addInitScript(init);
  await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(clear);
  return {p, errs, ctx};
};
/* WHERE THE BAR ACTUALLY SITS, AND WHERE IT SHOULD SIT.

   It used to be flush with the bottom, and every assertion below said so. The dark
   glass design floats it clear of the edge by --navLift, so "flush" now describes a bar
   that has LOST its float rather than one that is working. `rest` is where it belongs:
   the bottom of the visible area, less that float. Read from the stylesheet rather than
   written as 22 here, so changing the design's number does not make this spec wrong.

   Nothing else about the behaviour changed, and the parts of it that matter are still
   checked exactly as they were: the correction lifts the bar by precisely the toolbar
   strip, puts it back when the strip goes, never slides, and never parks in between. */
const where = p=> p.evaluate(()=>{
  const n = document.querySelector("nav");
  const r = n.getBoundingClientRect();
  const lift = Math.round(parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue("--navLift")) || 0);
  return {bottom: Math.round(r.bottom), top: Math.round(r.top),
          h: window.innerHeight, lift, rest: window.innerHeight - lift,
          gap: n.style.getPropertyValue("--navGap").trim(),
          y: n.style.getPropertyValue("--navY").trim()};
});

const ANDROID = null;   // headless Chromium's own UA: no bottom toolbar anywhere
const IPHONE  = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

console.log("1 - THE BAR SITS ON THE BOTTOM OF THE VISIBLE AREA, WHATEVER THE BROWSER IS");
{
  /* THIS SECTION USED TO ASSERT THE SNIFF, and the sniff was the reported bug.
     It said: on a non-iPhone user agent, a bottom strip must not lift the bar, because a
     top URL bar reports the same measurement as Safari's bottom toolbar. Which is true of
     this FIXTURE but not of a top URL bar: chrome at the top is already outside
     innerHeight, so it produces no strip at all. What the fixture actually describes —
     vv.height short of innerHeight with offsetTop at 0 — is a bottom toolbar, on any
     browser that has one, and the right answer to it is the same everywhere.

     So the invariant is no longer "only iOS gets corrected". It is "the bar ends up on the
     bottom of the visible area", which is the thing a person can see, and which no longer
     needs the app to guess what it is running on. */
  const {p, errs} = await open(ANDROID);
  const a = await where(p);
  ck("CONTROL: the bar has a resting float, or 'at rest' means nothing", a.lift > 0,
     a.lift + "px");
  ck("at its resting height to start", a.bottom === a.rest, a.bottom+" of "+a.rest);
  await p.evaluate(()=> window.__setStrip(72));
  await p.waitForTimeout(600);          // the correction confirms itself at 180ms and 520ms
  const c = await where(p);
  ck("a bottom strip lifts it clear, by exactly the strip", c.gap === "72px", c.gap || "(unset)");
  ck("so it rests above the visible bottom", c.bottom === c.h - 72 - c.lift,
     c.bottom+" of "+(c.h - 72 - c.lift));
  /* AND THIS IS THE HALF THE OLD RULE COULD NOT DO. Its correction was computed from a
     quantity that is always positive, so a bar that had been lifted could never come back
     down. The residual has a sign, so the strip going away puts it back. */
  await p.evaluate(()=> window.__setStrip(0));
  await p.waitForTimeout(600);
  const d = await where(p);
  ck("and the strip going away puts it back down", d.bottom === d.rest, d.bottom+" of "+d.rest);
  ck("with the correction returned to zero", d.gap === "0px" || d.gap === "", d.gap || "(unset)");
  ck("no page errors", errs.length===0, errs.join(" | "));
}

console.log("2 - ON iOS, WHERE THE TOOLBAR IS AT THE BOTTOM, THE CORRECTION STILL APPLIES");
{
  const {p, errs} = await open(IPHONE);
  await p.evaluate(()=> window.__setStrip(72));
  await p.waitForTimeout(420);          // the bar slides, it does not jump
  const a = await where(p);
  ck("the bar is lifted clear of the toolbar", a.gap === "72px", a.gap);
  ck("by exactly the strip, no more", a.bottom === a.h - 72 - a.lift,
     a.bottom+" of "+(a.h - 72 - a.lift));
  console.log("2b - AND A KEYBOARD IS NOT A TOOLBAR");
  const kb = await p.evaluate(async ()=>{
    /* the keyboard sweeps the whole range on its way up, including the 1-90 band */
    window.__setStrip(260);
    const big = document.querySelector("nav").style.getPropertyValue("--navGap").trim();
    const inp = document.createElement("input");
    document.body.appendChild(inp); inp.focus();
    window.__setStrip(40);               // a frame caught mid-animation
    const mid = document.querySelector("nav").style.getPropertyValue("--navGap").trim();
    inp.blur(); inp.remove(); window.__setStrip(72);
    await new Promise(r=> setTimeout(r, 300));
    return {big, mid, after: document.querySelector("nav").style.getPropertyValue("--navGap").trim()};
  });
  /* Both readings are refused, and refusing means the bar does not move: it keeps the 72px
     it was correctly given for the toolbar, rather than being zeroed and then having to
     climb back up once the keyboard closes, which is a jump you would see. */
  ck("a full keyboard is ignored", kb.big === "72px", kb.big || "(unset)");
  ck("and so is a frame of it on the way up", kb.mid === "72px", kb.mid || "(unset)");
  ck("the correction comes back once typing is over", kb.after === "72px", kb.after);
  ck("no page errors", errs.length===0, errs.join(" | "));
}

console.log("3 - IT IS ON THE BOTTOM IN EVERY STATE THE APP HAS");
{
  const {p, errs} = await open(ANDROID);
  const states = [
    ["a plain page",        ()=>{}],
    ["the rest pill up",    ()=> document.body.classList.add("rest-up")],
    ["a modal open",        ()=> document.body.classList.add("modal-live")],
    ["the day sheet open",  ()=> document.body.classList.add("pfl-open")],
    ["a shake running",     ()=>{ const a=document.getElementById("app"); if(a) a.classList.add("shake"); }]
  ];
  for(const [name, fn] of states){
    const r = await p.evaluate((n)=>{
      document.body.classList.remove("rest-up","modal-live","pfl-open");
      const a=document.getElementById("app"); if(a) a.classList.remove("shake");
      ({
        "a plain page":       ()=>{},
        "the rest pill up":   ()=> document.body.classList.add("rest-up"),
        "a modal open":       ()=> document.body.classList.add("modal-live"),
        "the day sheet open": ()=> document.body.classList.add("pfl-open"),
        "a shake running":    ()=>{ const b=document.getElementById("app"); if(b) b.classList.add("shake"); }
      })[n]();
      const nav = document.querySelector("nav");
      const rect = nav.getBoundingClientRect();
      /* A transform, filter or backdrop-filter on ANY ancestor re-homes a fixed element
         onto that ancestor's box — which is the one mechanism that can strand a
         `bottom:0` bar in the middle of the screen. */
      const bodyT = getComputedStyle(document.body);
      const htmlT = getComputedStyle(document.documentElement);
      const capt = s=> s.transform !== "none" || s.filter !== "none"
                    || (s.backdropFilter && s.backdropFilter !== "none") || s.perspective !== "none";
      const lift = Math.round(parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue("--navLift")) || 0);
      return {bottom: Math.round(rect.bottom), h: window.innerHeight,
              rest: window.innerHeight - lift,
              captured: capt(bodyT) || capt(htmlT)};
    }, name);
    ck(name+": at its resting height", r.bottom === r.rest, r.bottom+" of "+r.rest);
    ck(name+": nothing above it claims the fixed bar", !r.captured, String(r.captured));
  }
  ck("no page errors", errs.length===0, errs.join(" | "));
}

console.log("4 - THE BAR DOES NOT MOVE ON SCROLL, EVER");
/* It used to retract on the way down and come back on the way up, to save a long Body
   tab from a 78px letterbox. Three bug reports later \u2014 "nav bar floating mid-screen",
   twice, then a screenshot of a session with no tab bar on it at all \u2014 the 78px was
   not worth it. A navigation bar that is sometimes not there is one you have to think
   about, and the only way to find out whether it is gone on purpose is to scroll and
   see. The browser-chrome correction below is a correction, not a movement, and stays. */
{
  const {p, errs} = await open(ANDROID);
  const r = await p.evaluate(async ()=>{
    TAB="body"; render();
    /* give the page something to scroll through */
    const pad = document.createElement("div"); pad.style.height = "3000px";
    document.getElementById("app").appendChild(pad);
    refreshNavBounds();
    const wait = ()=> new Promise(r2=> setTimeout(r2, 120));
    const at = ()=>{
      const n = document.querySelector("nav");
      return {y: n.style.getPropertyValue("--navY").trim(),
              off: Math.round(n.getBoundingClientRect().bottom - window.innerHeight)};
    };
    const out = [];
    for(const to of [60, 700, 1800, 400, 0]){ window.scrollTo(0, to); await wait(); out.push(at()); }
    return out;
  });
  console.log("    " + JSON.stringify(r));
  /* `off` is measured as bottom minus innerHeight, so a bar resting --navLift above the
     edge reads as minus the lift. */
  const lift = await p.evaluate(()=> Math.round(parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--navLift")) || 0));
  ck("nothing ever writes the slide variable", r.every(x=> x.y === ""), JSON.stringify(r.map(x=>x.y)));
  ck("and the bar is at its resting height at every scroll position",
     r.every(x=> Math.abs(x.off + lift) <= 1),
     JSON.stringify(r.map(x=>x.off)) + " against -" + lift);
  ck("no page errors", errs.length===0, errs.join(" | "));
}

console.log("5 - THE BAR HOLDS STILL UNDER A FINGER, SO THE TAP LANDS WHERE IT WAS AIMED");
{
  const {p, errs} = await open(IPHONE);
  const gap = ()=> p.evaluate(()=> document.querySelector("nav").style.getPropertyValue("--navGap").trim());
  const y   = ()=> p.evaluate(()=> document.querySelector("nav").style.getPropertyValue("--navY").trim());
  const down = ()=> p.evaluate(()=> document.querySelector("nav").dispatchEvent(new PointerEvent("pointerdown",{bubbles:true})));
  const up   = ()=> p.evaluate(()=> document.querySelector("nav").dispatchEvent(new PointerEvent("pointerup",{bubbles:true})));

  await down();
  await p.evaluate(()=> window.__setStrip(72));
  await p.waitForTimeout(120);
  const held = await gap();
  ck("a correction arriving mid-press does not move it", held === "" || held === "0px", held || "(unset)");
  await up();
  await p.waitForTimeout(120);
  ck("and it is applied the moment the finger lifts", (await gap()) === "72px", await gap());

  console.log("5b - AND SCROLLING UNDER THE FINGER DOES NOT MOVE IT EITHER");
  await p.evaluate(()=>{ window.__setStrip(0); TAB="body"; render();
    const pad=document.createElement("div"); pad.style.height="3000px";
    document.getElementById("app").appendChild(pad); refreshNavBounds(); window.scrollTo(0,0); showNav(); });
  await p.waitForTimeout(120);
  await down();
  await p.evaluate(()=> window.scrollTo(0, 900));
  await p.waitForTimeout(160);
  const heldY = await y();
  ck("it stays put while held", heldY === "0px" || heldY === "", heldY || "(unset)");
  await up();
  await p.waitForTimeout(120);
  ck("and after the finger lifts, still", (await y()) === "" || (await y()) === "0px", await y());

  console.log("5c - A TAP DURING ALL THAT STILL SWITCHES TABS");
  await p.evaluate(()=>{ window.scrollTo(0,0); showNav(); });
  await p.waitForTimeout(200);
  const tab = await p.evaluate(async ()=>{
    const btn = document.querySelector('nav button[data-tab="history"]') ||
                Array.from(document.querySelectorAll("nav button")).find(b=> /history/i.test(b.textContent||""));
    btn.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}));
    window.__setStrip(72);                      // the chrome shifts under the finger
    await new Promise(r=> setTimeout(r, 80));
    btn.dispatchEvent(new PointerEvent("pointerup",{bubbles:true}));
    btn.click();
    return TAB;
  });
  ck("the press is registered", tab === "history", tab);
  ck("no page errors", errs.length===0, errs.join(" | "));
}

console.log("6 - A TAP IS NEVER WAITED ON FOR A DOUBLE-TAP");
{
  const css = await (await import('node:fs/promises')).readFile(appFile('index.html'),'utf8');
  const blk = (css.match(/\nnav\{[^}]*\}/) || [""])[0];
  ck("the bar opts out of the 300ms delay", /touch-action:\s*manipulation/.test(blk), blk.slice(0,120));
  /* The claim is where the correction rides, not how the value is spelled. It used to
     be `bottom:var(--navGap)` exactly; the bar now also carries its resting float, so
     it is `bottom:calc(var(--navGap...) + var(--navLift...))`. Still bottom, still not
     the transform, which is the thing that must never change: a correction sharing the
     transform turns a one-pixel adjustment into a 260ms animation, and a tap landing
     during an animation lands where the button was. */
  const bottomDecl = (blk.match(/bottom:[^;]*;/) || [""])[0];
  ck("the correction rides on bottom, not the animated transform",
     /--navGap/.test(bottomDecl) && !/translate3d\([^)]*--navGap/.test(blk),
     bottomDecl || blk.slice(0,120));
}

console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
