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
/* One context, several pages: localStorage belongs to the context, so a fresh page still
   sees what the last one stored - which is the point of this spec. */
const ctx = await b.newContext({viewport:{width:390,height:2400}});
let p = await ctx.newPage();
let errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
/* NOT localStorage.clear() like the other specs: this one RELOADS, which is the whole
   point of it, and an init script that wipes storage on every navigation would throw the
   stored session away before the probe could read it. The account is topped up only when
   it is missing, so a reload keeps whatever the editor just wrote. */
await ctx.addInitScript(()=>{
  /* Guarded because this runs on EVERY navigation, about:blank included, where touching
     localStorage throws a SecurityError that would land in the page-error list. */
  try{
  if(!localStorage.getItem('e26.account')){
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X');
  }
  }catch(e){}
});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

/* WHICH PASS'S FIXTURE THIS IS. Set before each seed and written into the state, so the
   cold boot can tell "my fixture arrived" from "I am reading the PREVIOUS pass's bytes".
   See the comment on fixtureLost below: that is the whole of item 17. */
let SEED_TAG = "";
const seed = ()=> p.evaluate(tag=>{
  S.seedTag = tag;
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
  S.seedTag = tag;
  save();
}, SEED_TAG);
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
  /* THE FORM CHANGED, AND THIS DRIVES THE NEW ONE. It used to ask for weight, reps and
     RPE in four boxes of its own - the last duplicate set-row builder, and the reason a
     one-limb movement added here came out as plain sets. It now asks only the two things
     that decide the SHAPE of the rows, and the rows take the numbers. Both limbs is
     chosen here, because this spec reproduces the reported crash, which came from an
     entry added as plain sets - the paired path is covered by editkind.mjs. */
  document.getElementById("aeBoth").click();
  document.getElementById("aeCount").value = "2";
  document.getElementById("addToSess").click();
  /* The numbers then go into the real rows, by their live attribute names. */
  const ei = S.sessions[0].entries.length - 1;
  const put = (si, f, v)=>{
    const el = document.querySelector(`#modal .set [data-e="${ei}"][data-s="${si}"][data-f="${f}"]`);
    if(el){ el.value = v; el.dispatchEvent(new Event("change", {bubbles:true})); }
  };
  put(0,"weight","25"); put(0,"reps","15"); put(1,"weight","25"); put(1,"reps","13");
  const btn = document.getElementById("closeModal");
  if(btn) btn.click();
  return {inLibrary: have, entries: (S.sessions[0].entries||[]).map(e=> e.name)};
}, name);

/* Rebuilds the starting fixture from empty, for the retry above. */
const reseed = async ()=>{
  await p.goto(APP_URL,{waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(()=>{ localStorage.clear(); });
  await p.goto("about:blank", {waitUntil:"load"});
  await p.goto(APP_URL,{waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await seed();
};

/* The reload is not optional: the live report is "even after force-closing and
   reopening", so the fault survives into a cold boot off stored data. */
const reloadAndProbe = async ()=>{
  errs = [];
  /* FREEZE WRITES, THEN RELOAD. The page is left with live timers - autosave,
     flushReports, the sync queue - and any one of them calling save() between here and
     the navigation puts the pre-edit state back, so the reload boots on the wrong bytes.
     That made this spec fail intermittently, which is worse than failing: it is a test
     nobody can trust. The editor has already written what it was going to write, so from
     this point nothing may write at all. The reload gets fresh prototypes. */
  await p.evaluate(()=>{
    Storage.prototype.setItem = function(){};
    Storage.prototype.removeItem = function(){};
  });
  /* AND LEAVE THE PAGE BEFORE COMING BACK TO IT. Chromium commits localStorage
     asynchronously: a reload - or closing the page - straight after a write can land
     before the mutation is committed, and the app then boots on storage that does not
     hold what was just saved. It looked like the app was wiping the session; it was the
     harness reading storage that had never been written. Navigating away flushes it,
     and it ends the page's timers as a reload does not. */
  await p.goto("about:blank", {waitUntil:"load"});
  /* AND IF THE WRITE STILL HAS NOT LANDED, SAY SO RATHER THAN READ NOTHING. Chromium's
     localStorage commit is asynchronous and nothing in Playwright waits on it, so the
     cold boot can occasionally read storage the seed has not reached yet. That is a
     fact about the browser, not about the app, and a spec that cannot tell the two apart
     reports the app as losing data. The fixture is required to be there before anything
     is asserted; the boot is retried, and a fixture that never arrives fails loudly. */
  /* ITEM 17 — AND "A FIXTURE" IS NOT THE SAME AS "MY FIXTURE".

     This asked only whether any sessions had arrived, which the PREVIOUS pass's leftovers
     satisfy perfectly: one session, named entries, nothing to tell them apart. So when the
     clear-and-reseed between the two movements did not reach storage in time, the cold
     boot read pass one's bytes, the guard was happy, and the spec asserted that pass two's
     movement had been lost - reporting the app as losing data when what had happened is
     that the harness read a commit that was one pass out of date.

     That is exactly the failure recorded on 2026.11.17.25: the names it printed were pass
     one's final entries, down to the movement. The tag makes the guard able to tell them
     apart, so a stale read is a retry rather than an accusation. */
  let booted = 0, tag = null;
  for(let attempt = 0; attempt < 4; attempt++){
    await p.goto(APP_URL,{waitUntil:"domcontentloaded"});
    await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
    const got = await p.evaluate(()=> ({n: (S.sessions || []).length, tag: S.seedTag || null}));
    booted = got.n; tag = got.tag;
    if(booted && tag === SEED_TAG) break;
    if(booted && tag !== SEED_TAG)
      console.log("    read a fixture tagged " + JSON.stringify(tag) + " while expecting "
                + JSON.stringify(SEED_TAG) + " - a stale commit, rebuilding");
    booted = 0;
    await p.goto("about:blank", {waitUntil:"load"});
  }
  if(!booted){
    const dead = {threw:null, chars:999, crashed:false, err:null};
    return {fixtureLost:true, today:dead, workout:dead, history:dead, body:dead,
            program:dead, research:dead, names:[], setCounts:[]};
  }
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
  console.log("    stored after the cold boot: " + await p.evaluate(()=>{
    try{ return (JSON.parse(localStorage.getItem(dataKey())||"{}").sessions||[]).length + " sessions"; }
    catch(e){ return "unreadable"; } }));
  out.names = await p.evaluate(()=> ((S.sessions[0]||{}).entries||[]).map(e=> e.name));
  out.fixtureLost = false;
  out.setCounts = await p.evaluate(()=> ((S.sessions[0]||{}).entries||[]).map(e=> (e.sets||[]).length));
  return out;
};

for(const name of ["Alternating Cable Lateral Raise", "Single-Arm Dumbbell Row"]){
  console.log("\n=== " + name + " ===");
  SEED_TAG = name;
  /* Start each movement from empty, and go out through about:blank for the same reason
     as above: the write has to be committed before the next boot reads it. */
  await p.goto(APP_URL,{waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await p.evaluate(()=>{ localStorage.clear(); Storage.prototype.setItem = function(){}; });
  await p.goto("about:blank", {waitUntil:"load"});
  await p.goto(APP_URL,{waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  await seed();
  let add = null, r = null;
  /* THE WHOLE FIXTURE IS RETRIED, not just the boot. Chromium commits localStorage
     asynchronously, and a commit that does not land cannot be recovered by rebooting -
     there is nothing in storage to boot. So if the cold boot comes up empty the fixture
     is built again from scratch. Three attempts, and then it fails loudly: a fixture that
     never arrives must not read as an app that lost the data. */
  for(let attempt = 1; attempt <= 3; attempt++){
    add = await addViaEditor(name);
    r = await reloadAndProbe();
    if(!r.fixtureLost) break;
    console.log("    the seed did not reach storage, rebuilding (attempt " + attempt + ")");
    await reseed();
  }
  console.log("    in the exercise list: " + add.inLibrary + "; entries now: " + add.entries.join(", "));
  ck("the movement was added", add.entries.indexOf(name) >= 0, add.entries.join(", "));
  ck("and the fixture reached storage", !r.fixtureLost);
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
