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
/* Where the bar actually sits, and where it should sit: flush with the bottom. */
const where = p=> p.evaluate(()=>{
  const n = document.querySelector("nav");
  const r = n.getBoundingClientRect();
  return {bottom: Math.round(r.bottom), top: Math.round(r.top),
          h: window.innerHeight, gap: n.style.getPropertyValue("--navGap").trim(),
          y: n.style.getPropertyValue("--navY").trim()};
});

const ANDROID = null;   // headless Chromium's own UA: no bottom toolbar anywhere
const IPHONE  = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

console.log("1 - ON A BROWSER WITH ITS CHROME AT THE TOP, THE BAR SITS ON THE BOTTOM");
{
  const {p, errs} = await open(ANDROID);
  const a = await where(p);
  ck("flush with the bottom to start", a.bottom === a.h, a.bottom+" of "+a.h);
  /* This is the bug: a top URL bar produces exactly the same measurement as Safari's
     bottom toolbar, and the old correction lifted the bar 72px for it. */
  await p.evaluate(()=> window.__setStrip(72));
  await p.waitForTimeout(60);
  const c = await where(p);
  ck("a hidden strip does not lift it", c.bottom === c.h, c.bottom+" of "+c.h);
  /* unset is the same as 0px: the property is only written when the bar actually moves */
  ck("the correction stays at zero", c.gap === "0px" || c.gap === "", c.gap || "(unset)");
  await p.evaluate(()=> window.__setStrip(0));
  ck("no page errors", errs.length===0, errs.join(" | "));
}

console.log("2 - ON iOS, WHERE THE TOOLBAR IS AT THE BOTTOM, THE CORRECTION STILL APPLIES");
{
  const {p, errs} = await open(IPHONE);
  await p.evaluate(()=> window.__setStrip(72));
  await p.waitForTimeout(420);          // the bar slides, it does not jump
  const a = await where(p);
  ck("the bar is lifted clear of the toolbar", a.gap === "72px", a.gap);
  ck("by exactly the strip, no more", a.bottom === a.h - 72, a.bottom+" of "+a.h);
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
  ck("a full keyboard is ignored", kb.big === "0px" || kb.big === "", kb.big || "(unset)");
  ck("and so is a frame of it on the way up", kb.mid === "0px" || kb.mid === "", kb.mid || "(unset)");
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
      return {bottom: Math.round(rect.bottom), h: window.innerHeight,
              captured: capt(bodyT) || capt(htmlT)};
    }, name);
    ck(name+": flush with the bottom", r.bottom === r.h, r.bottom+" of "+r.h);
    ck(name+": nothing above it claims the fixed bar", !r.captured, String(r.captured));
  }
  ck("no page errors", errs.length===0, errs.join(" | "));
}

console.log("4 - THE AUTO-HIDE STILL WORKS");
{
  const {p, errs} = await open(ANDROID);
  const r = await p.evaluate(async ()=>{
    TAB="body"; render();
    /* give the page something to scroll through */
    const pad = document.createElement("div"); pad.style.height = "3000px";
    document.getElementById("app").appendChild(pad);
    refreshNavBounds();
    const wait = ()=> new Promise(r2=> setTimeout(r2, 120));
    const gy = ()=> document.querySelector("nav").style.getPropertyValue("--navY").trim();
    window.scrollTo(0, 60);  await wait(); const near = gy();
    window.scrollTo(0, 700); await wait(); const down = gy();
    window.scrollTo(0, 400); await wait(); const up   = gy();
    window.scrollTo(0, 0);   await wait(); const top  = gy();
    return {near, down, up, top};
  });
  // unset is the same as 0px: the property is only written when the bar actually moves
  ck("it stays put near the top", r.near === "0px" || r.near === "", "["+r.near+"]");
  ck("it retracts on the way down", /100%/.test(r.down), r.down);
  ck("it comes back on the way up", r.up === "0px", r.up);
  ck("and it is up at the top of the page", r.top === "0px", r.top);
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

  console.log("5b - NOR DOES THE AUTO-HIDE PULL IT OUT FROM UNDER THE FINGER");
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
  ck("and retracts once released", /100%/.test(await y()), await y());

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
  ck("the correction rides on bottom, not the animated transform",
     /bottom:var\(--navGap/.test(blk) && !/translate3d\(0,[^)]*--navGap/.test(blk), blk.slice(0,120));
}

console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
