import { chromium, APP_URL } from './_e26.mjs';
/* THE LIVE CRASH: ADDING A MOVEMENT IN THE SESSION EDITOR BLANKED THREE TABS.

   Reported on 2026.11.17.9. A finished session was opened in the editor, "Alternating
   Cable Lateral Raise" was picked from the exercise list, sets were entered, Done was
   pressed - and from then on Today, History and Body drew nothing at all. Program and
   Research still worked, which says the state loaded and it is the readers that walk
   sessions that fall over.

   WHAT THIS SPEC DOES. It reproduces the user's exact sequence through the real editor -
   not a hand-built fixture - then reloads and requires all six tabs to draw with the
   movement present. "Alternating Cable Lateral Raise" matters specifically: isSingleArm()
   matches /\balternating\b/ on the NAME, so the entry is one every rule treats as
   one-limb, while the editor's "Add an exercise" builds flat sets with no sides object
   and no startSide. That is a shape nothing else in the app produces.

   A normal per-side movement is driven through the same sequence as the control, because
   if only the "Alternating" name breaks, the fault is in the name handling, and if both
   break it is in the editor's entry shape. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2400}});
let errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
/* NOT localStorage.clear() like the other specs: this one RELOADS, which is the whole
   point of it, and an init script that wipes storage on every navigation would throw the
   stored session away before the probe could read it. The account is topped up only when
   it is missing, so a reload keeps whatever the editor just wrote. */
await p.addInitScript(()=>{
  if(!localStorage.getItem('e26.account')){
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X');
  }
});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

const seed = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId="ppl6"; applySplit();
  S.sessions=[{id:"s1", workoutId:ROTATION[0], date:todayStr(),
    startedAt:Date.now()-5400e3, finishedAt:Date.now()-1800e3,
    entries:[{name:"Barbell Bench Press", sets:[
      {reps:8, weight:135, done:true},{reps:8, weight:135, done:true},{reps:7, weight:135, done:true}]}]}];
  save();
});
await seed();
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* Drives the real editor: pick the name, fill two set rows, Add to session, Done. */
const addViaEditor = (name)=> p.evaluate(nm=>{
  const s = S.sessions[0];
  renderSessEditor(s);
  const sel = document.getElementById("addExSel");
  const have = Array.from(sel.options).some(o=> o.value === nm || o.textContent === nm);
  const fire = (el)=> el.dispatchEvent(new Event("change", {bubbles:true}));
  if(have){ sel.value = nm; fire(sel); }
  else {
    sel.value = "__custom__"; fire(sel);
    const c = document.getElementById("customName"); if(c){ c.value = nm; fire(c); }
  }
  /* Two sets, both sides' worth of numbers typed, exactly as the editor offers them. */
  document.getElementById("plusSet").click();
  const put = (i, f, v)=>{ const el = document.querySelector(`#newSets [data-ns="${i}"][data-f="${f}"]`);
    if(el){ el.value = v; el.dispatchEvent(new Event("change", {bubbles:true})); } };
  put(0,"weight","25"); put(0,"reps","15"); put(1,"weight","25"); put(1,"reps","13");
  document.getElementById("addToSess").click();
  const btn = document.getElementById("closeModal");
  if(btn) btn.click();
  return {inLibrary: have, entries: (S.sessions[0].entries||[]).map(e=> e.name)};
}, name);

/* The reload is not optional: the live report is "even after force-closing and
   reopening", so the fault survives into a cold boot off stored data. */
const reloadAndProbe = async ()=>{
  errs = [];
  console.log("    stored before reload: " + await p.evaluate(()=>{
    try{ return (JSON.parse(localStorage.getItem(dataKey())||"{}").sessions||[]).length + " sessions, key " + dataKey(); }
    catch(e){ return "unreadable"; } }));
  await p.reload({waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(()=>{ const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding'); });
  const out = {};
  for(const t of ["today","workout","history","body","program","research"]){
    out[t] = await p.evaluate(tab=>{
      TAB = tab;
      let threw = null;
      try{ render(); }catch(e){ threw = String(e && e.message || e); }
      const app = document.getElementById("app");
      const html = app ? app.innerHTML : "";
      return {threw, chars: html.replace(/\s+/g,"").length,
              crashed: /could not be drawn|only half working/.test(html),
              err: TAB_ERR ? (TAB_ERR.where + ": " + String(TAB_ERR.err && TAB_ERR.err.message)) : null};
    }, t);
  }
  console.log("    stored after reload: " + await p.evaluate(()=>{
    try{ return (JSON.parse(localStorage.getItem(dataKey())||"{}").sessions||[]).length + " sessions, key " + dataKey(); }
    catch(e){ return "unreadable"; } }));
  out.names = await p.evaluate(()=> ((S.sessions[0]||{}).entries||[]).map(e=> e.name));
  out.setCounts = await p.evaluate(()=> ((S.sessions[0]||{}).entries||[]).map(e=> (e.sets||[]).length));
  return out;
};

for(const name of ["Alternating Cable Lateral Raise", "Single-Arm Dumbbell Row"]){
  console.log("\n=== " + name + " ===");
  await p.evaluate(()=>{ localStorage.clear(); });
  await p.reload({waitUntil:"domcontentloaded"});      // the init script puts the account back
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await seed();
  const add = await addViaEditor(name);
  console.log("    in the exercise list: " + add.inLibrary + "; entries now: " + add.entries.join(", "));
  ck("the movement was added", add.entries.indexOf(name) >= 0, add.entries.join(", "));
  const r = await reloadAndProbe();
  for(const t of ["today","history","body","program","research"]){
    ck(t + " drew", !r[t].threw && r[t].chars > 300 && !r[t].crashed,
       (r[t].threw ? "THREW " + r[t].threw : r[t].crashed ? "BOUNDARY " + r[t].err : r[t].chars + " chars"));
  }
  ck("the movement survived the reload", r.names.indexOf(name) >= 0, r.names.join(", "));
  ck("with both of its sets", r.setCounts.join(",") === "3,2", r.setCounts.join(","));
  if(errs.length) console.log("    page errors: " + errs.join(" | "));
}

console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
