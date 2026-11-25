import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844}});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit(); save(); goTab("today");
});

console.log("1 - A REMEMBERED NAME IS STILL THE RIGHT NAME");
{
  const r = await p.evaluate(()=>{
    const a = canonEx("DB Bench Press");
    const b2 = canonEx("DB Bench Press");            // second time comes from the cache
    const raw = canonExRaw("DB Bench Press");        // and the cache must agree with the work
    const spell = [canonEx("db bench press"), canonEx("  DB   Bench   Press "),
                   canonEx("Dumbbell Bench Presses")];
    return {a, b2, raw, same: spell.every(x=> x === a), spell};
  });
  ck("the same answer twice", r.a === r.b2, r.a+" vs "+r.b2);
  ck("and the same answer as doing the work", r.a === r.raw, r.a+" vs "+r.raw);
  ck("spellings of one movement still collapse", r.same, JSON.stringify(r.spell));
}

console.log("2 - A RENAME IS NOT REMEMBERED THROUGH");
{
  const r = await p.evaluate(()=>{
    const before = canonEx("Mid Row");
    S.exAliases = Object.assign({}, S.exAliases || {}, {"mid row": "Chest Supported Row"});
    USER_ALIASES = S.exAliases; invalidateTableOrigin();
    const after = canonEx("Mid Row");
    /* and undoing it comes back */
    delete S.exAliases["mid row"];
    USER_ALIASES = S.exAliases; invalidateTableOrigin();
    return {before, after, back: canonEx("Mid Row")};
  });
  ck("the new name takes effect at once", r.after !== r.before && /chest/.test(r.after), r.before+" -> "+r.after);
  ck("and undoing it comes back", r.back === r.before, r.back+" vs "+r.before);
}

console.log("3 - THE CACHE CANNOT GROW WITHOUT BOUND");
{
  const r = await p.evaluate(()=>{
    for(let i=0;i<4600;i++) canonEx("made up exercise "+i);
    return EX_CANON.size;
  });
  ck("it drops itself rather than leaking", r <= 4001, String(r));
  ck("and still answers correctly after dropping",
     await p.evaluate(()=> canonEx("DB Bench Press") === canonExRaw("DB Bench Press")), "");
}

console.log("4 - TAB CONTENT IS VISIBLE WITHOUT AN ENTRANCE ANIMATION");
{
  const state = await p.evaluate(()=>{
    goTab("history");
    goTab("body");
    const app = document.getElementById("app");
    const heading = app.querySelector('[data-dg-screen="body"] h1');
    return {selected: document.querySelector("nav button.on")?.dataset.tab,
      heading: heading?.textContent, animation: getComputedStyle(heading.parentElement).animationName,
      opacity: getComputedStyle(heading.parentElement).opacity};
  });
  ck("CONTROL: the active Body tab and its heading are present",
     state.selected === "body" && state.heading === "body", JSON.stringify(state));
  ck("the destination is visible immediately", state.opacity === "1" && state.animation === "none", JSON.stringify(state));
}

console.log("5 - AND A TAB CHANGE IS STILL FAST WITH A YEAR BEHIND IT");
{
  const t = await p.evaluate(()=>{
    const day=86400000, now=Date.now(); S.sessions=[];
    for(let i=180;i>=1;i--){
      if(i%7===0) continue;
      const wid=ROTATION[i%ROTATION.length];
      const ents=planSlotList(wid).slice(0,6);
      S.sessions.push({id:"s"+i, date:new Date(now-i*day).toISOString().slice(0,10),
        workoutId:wid, startedAt:now-i*day, finishedAt:now-i*day+3600000,
        entries:(ents.length?ents:[{name:"Barbell Bench Press"}]).map(e=>({
          name:e.name||"Barbell Bench Press", reps:"8",
          sets:[0,1,2].map(k=>({weight:String(135+k*10),reps:"8",rpe:"8",done:true}))}))});
    }
    save();
    const out={};
    for(const tab of ["today","body","history"]){
      TAB=tab; for(let i=0;i<5;i++) render();
      const runs=[]; for(let i=0;i<7;i++){ const a=performance.now(); render(); runs.push(performance.now()-a); }
      runs.sort((x,y)=>x-y); out[tab]=runs[3];
    }
    return out;
  });
  console.log("     " + JSON.stringify(Object.fromEntries(Object.entries(t).map(([k,v])=>[k,Math.round(v)+"ms"]))));
  ck("Today draws in a frame or two", t.today < 40, Math.round(t.today)+"ms");
  ck("Body too", t.body < 90, Math.round(t.body)+"ms");
  ck("and History, which draws the most", t.history < 140, Math.round(t.history)+"ms");
}

console.log("6 - HISTORY BUILDS WORKOUT DETAILS WHEN A SESSION OPENS");
{
  const result = await p.evaluate(()=>{
    goTab("history");
    const card = document.querySelector("#app [data-sess]");
    const slot = card?.querySelector("[data-history-lifts]");
    if(!slot) return {};
    const count = S.sessions.find(session=> session.id === card.dataset.sess).entries.length;
    const initiallyEmpty = slot.children.length === 0;
    card.click();
    return {count, initiallyEmpty, actual:slot.children.length, open:card.classList.contains("open"),
      wired:typeof slot.querySelector("[data-hdown]")?.onclick === "function"};
  });
  ck("CONTROL: this History card represents a workout with lifts", result.count > 0, JSON.stringify(result));
  ck("opening it builds its lift rows and wires the reorder controls",
    result.initiallyEmpty && result.open && result.actual === result.count && result.wired, JSON.stringify(result));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
