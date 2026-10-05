import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

const ctx = await b.newContext({viewport:{width:390,height:800}, hasTouch:true,
  userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X');
});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit(); save();
  goTab("today");
});

/* A touch the way the phone sends it. `click` is sent separately, or withheld, so the
   two halves can be told apart — which is the whole point of the shim. */
const press = (sel, {click=true, drift=0, hold=40}={})=> p.evaluate(async ({sel, click, drift, hold})=>{
  const n = document.querySelector(sel);
  if(!n) return "no element";
  const r = n.getBoundingClientRect();
  const x = Math.round(r.left + r.width/2), y = Math.round(r.top + r.height/2);
  const ev = (t, ex, ey)=> n.dispatchEvent(new PointerEvent(t, {bubbles:true, cancelable:true,
    pointerType:"touch", isPrimary:true, pointerId:1, clientX:ex, clientY:ey}));
  ev("pointerdown", x, y);
  await new Promise(r2=> setTimeout(r2, hold));
  ev("pointerup", x + drift, y);
  if(click) n.dispatchEvent(new MouseEvent("click", {bubbles:true, cancelable:true}));
  await new Promise(r2=> setTimeout(r2, 260));
  return "";
}, {sel, click, drift, hold});

const counter = ()=> p.evaluate(()=>{
  const n = document.createElement("button");
  n.id = "tapProbe"; n.textContent = "probe";
  window.__hits = 0; n.onclick = ()=> window.__hits++;
  document.getElementById("app").appendChild(n);
});
const hits = ()=> p.evaluate(()=> window.__hits);

console.log("1 - A TAP THE BROWSER REFUSES TO TURN INTO A CLICK STILL WORKS");
{
  await counter();
  await press("#tapProbe", {click:false});
  ck("the press is completed anyway", (await hits()) === 1, String(await hits()));
}

console.log("2 - AND A TAP IT DOES COMPLETE HAPPENS EXACTLY ONCE");
{
  await p.evaluate(()=>{ window.__hits = 0; });
  await press("#tapProbe", {click:true});
  ck("not twice", (await hits()) === 1, String(await hits()));
}

console.log("3 - A NATIVE CLICK ARRIVING LATE IS NOT A SECOND PRESS");
{
  await p.evaluate(()=>{ window.__hits = 0; });
  await p.evaluate(async ()=>{
    const n = document.getElementById("tapProbe");
    const r = n.getBoundingClientRect();
    const x = Math.round(r.left+r.width/2), y = Math.round(r.top+r.height/2);
    const ev = (t)=> n.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,
      pointerType:"touch", isPrimary:true, pointerId:1, clientX:x, clientY:y}));
    ev("pointerdown"); await new Promise(r2=>setTimeout(r2,40)); ev("pointerup");
    await new Promise(r2=>setTimeout(r2,300));          // the stand-in has already run
    n.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}));
    await new Promise(r2=>setTimeout(r2,60));
  });
  ck("still one press", (await hits()) === 1, String(await hits()));
}

console.log("4 - WHAT IS NOT A TAP IS LEFT ALONE");
{
  await p.evaluate(()=>{ window.__hits = 0; });
  await press("#tapProbe", {click:false, drift:40});
  ck("a drag is not completed", (await hits()) === 0, String(await hits()));
  await p.evaluate(()=>{ window.__hits = 0; });
  await press("#tapProbe", {click:false, hold:900});
  ck("nor is a long hold", (await hits()) === 0, String(await hits()));
  await p.evaluate(()=>{ window.__hits = 0; });
  await p.evaluate(async ()=>{
    const n = document.getElementById("tapProbe");
    n.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerType:"touch",isPrimary:true,clientX:5,clientY:5}));
    n.dispatchEvent(new PointerEvent("pointercancel",{bubbles:true,pointerType:"touch",isPrimary:true}));
    n.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerType:"touch",isPrimary:true,clientX:5,clientY:5}));
    await new Promise(r=>setTimeout(r,250));
  });
  ck("nor a touch the system took away", (await hits()) === 0, String(await hits()));
}

console.log("5 - A DEAD CONTROL STAYS DEAD");
{
  await p.evaluate(()=>{ window.__hits = 0; document.getElementById("tapProbe").disabled = true; });
  await press("#tapProbe", {click:false});
  ck("a disabled button is not pressed for you", (await hits()) === 0, String(await hits()));
  await p.evaluate(()=>{ document.getElementById("tapProbe").disabled = false; });
}

console.log("6 - THE NAV BAR, WHICH IS WHAT THIS IS FOR");
{
  for(const [tab, want] of [["program","program"],["body","body"],["history","history"],["today","today"]]){
    await p.evaluate(()=>{ window.scrollTo(0,0); showNav(); });
    await press('nav button[data-tab="'+tab+'"]', {click:false});
    ck("a dropped tap on "+tab+" still opens it", (await p.evaluate(()=>TAB)) === want, await p.evaluate(()=>TAB));
  }
}

console.log("7 - NATIVE CONTROLS ARE LEFT TO THE BROWSER");
{
  const r = await p.evaluate(async ()=>{
    const wrap = document.createElement("div");
    wrap.innerHTML = '<label id="tapLab"><input type="checkbox" id="tapChk"> x</label>';
    document.getElementById("app").appendChild(wrap);
    const n = document.getElementById("tapChk");
    const ev = t=> n.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerType:"touch",isPrimary:true,clientX:5,clientY:5}));
    ev("pointerdown"); await new Promise(r2=>setTimeout(r2,40)); ev("pointerup");
    await new Promise(r2=>setTimeout(r2,260));
    return n.checked;                       // the shim must not have ticked it
  });
  ck("a checkbox is not ticked by the stand-in", r === false, String(r));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
