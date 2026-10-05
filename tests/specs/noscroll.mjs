import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
/* Chromium with scrollbars forced ON, so a page that still shows one has nowhere to hide.
   Headless defaults to overlay scrollbars, which would pass this test by accident. */
const b = await chromium.launch({args:["--disable-features=OverlayScrollbar"]});
const ctx = await b.newContext({viewport:{width:390,height:900}});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:true,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

const setup = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorAsked=true; S.sleepAsked=todayStr();
  S.flags=[]; S.deload=null; S.viewMode="list"; S.planStart=Date.now()-200*86400e3;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:"off"});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const mk=(d)=>({id:"s"+d, workoutId: ROTATION[d % ROTATION.length],
    date:new Date(Date.now()-d*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-d*86400e3-3600e3, finishedAt:Date.now()-d*86400e3, feel:4,
    entries:[{name:"Barbell Bench Press", reps:"8-12",
      sets:Array.from({length:4},()=>({weight:"135",reps:"10",rpe:"8",done:true}))}]});
  S.sessions=[9,7,5,3,1].map(mk);
  S.cycleStart = Date.now()-9*86400e3;
  save(); render();
  return true;
});

console.log("1 - THE PAGE IS LONG ENOUGH TO WANT ONE, AND STILL HAS NO TRACK");
await setup();
{
  const r = await p.evaluate(()=>{
    TAB="body"; render();
    const de = document.documentElement;
    return {scrolls: de.scrollHeight > window.innerHeight + 40,
            /* the width the scrollbar would take out of the layout: zero when there is
               none, 15-17px on a desktop engine that is drawing one */
            gutter: window.innerWidth - de.clientWidth,
            h: de.scrollHeight};
  });
  ck("the Body tab is taller than the screen", r.scrolls, JSON.stringify(r));
  ck("and nothing is taking width for a scrollbar", r.gutter === 0, String(r.gutter));
}

console.log("2 - NOR ON ANY OF THE OTHER TABS");
for(const tab of ["today","history","program","sync"]){
  const r = await p.evaluate((t)=>{
    TAB=t; SET_PAGE=null; DAY_EDIT=null; render();
    const de = document.documentElement;
    return {gutter: window.innerWidth - de.clientWidth, h: de.scrollHeight};
  }, tab);
  ck(tab + ": no track", r.gutter === 0, JSON.stringify(r));
}

console.log("3 - NOR INSIDE A SHEET THAT SCROLLS ON ITS OWN");
{
  const r = await p.evaluate(()=>{
    showModal("<h3>Long</h3>" + Array.from({length:120},(_,i)=>`<p>line ${i}</p>`).join(""));
    const m = document.getElementById("modal");
    const over = m.scrollHeight > m.clientHeight + 20;
    const gutter = m.offsetWidth - m.clientWidth;   // border-free here: the modal has 1px
    hideModal();
    return {over, gutter};
  });
  ck("the sheet does overflow", r.over, JSON.stringify(r));
  ck("and takes no width for a bar", r.gutter <= 2, String(r.gutter));
}

console.log("4 - SCROLLING ITSELF IS UNTOUCHED");
{
  const r = await p.evaluate(async ()=>{
    TAB="body"; render();
    window.scrollTo(0, 0);
    await new Promise(r2=> setTimeout(r2, 40));
    const top = window.pageYOffset;
    window.scrollTo(0, 400);
    await new Promise(r2=> setTimeout(r2, 40));
    const mid = window.pageYOffset;
    return {top, mid};
  });
  ck("it starts at the top", r.top === 0, String(r.top));
  ck("and still scrolls", r.mid > 300, String(r.mid));
}

console.log("5 - THE RULE IS GLOBAL, NOT ONE COMPONENT AT A TIME");
{
  const src = await (await import('node:fs/promises')).readFile(appFile('index.html'),'utf8');
  const css = src.slice(0, src.indexOf("</style>"));
  ck("webkit scrollbars are given no size", /::-webkit-scrollbar\{width:0;height:0\}/.test(css), "missing");
  ck("firefox is told too", /html\{scrollbar-width:none/.test(css), "missing");
  ck("and every nested scroller with it", /\*\{scrollbar-width:none\}/.test(css), "missing");
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
