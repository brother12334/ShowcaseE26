import { chromium, APP_URL } from './_e26.mjs';
/* WHICH SESSION DOES A SET ROW WRITE TO?

   Every set handler in this app read S.active, because for most of the app's life a set
   row only existed inside a live workout. The session editor is going to render the same
   rows for a session from last week, and the failure mode if that is got wrong is the
   worst kind: last week's reps written into today's session, with no error, no symptom,
   and nobody any the wiser until they read their own history months later.

   So the session is carried by the ROW - a [data-setsess] wrapper - and not by a
   module-level "currently editing" variable. This spec is the argument for that choice,
   and it tests the property a global cannot have: with a live session and a past session
   on the page AT THE SAME TIME, each row writes to its own.

   THE CONTROL in every section is the live row beside the past one. If the past row
   writes nowhere, the past assertions would pass while the editor was simply broken; if
   the live row stops working, the refactor has broken logging. Both are checked on every
   write. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2600}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId="ppl6"; applySplit();
  /* A finished session from last week, and a live one today, with the SAME exercise at
     the same entry index - which is the arrangement that makes a mix-up invisible. */
  S.sessions=[{id:"old1", workoutId:ROTATION[0], date:"2026-11-10",
    startedAt:Date.now()-7*864e5, finishedAt:Date.now()-7*864e5+3600e3,
    entries:[{name:"Barbell Bench Press", sets:[
      {reps:"8", weight:"135", rpe:"8", done:true},
      {reps:"8", weight:"135", rpe:"8", done:true}]}]}];
  S.active={id:"live1", workoutId:ROTATION[0], date:todayStr(), startedAt:Date.now()-600e3,
    entries:[{name:"Barbell Bench Press", sets:[
      {reps:"", weight:"", rpe:"", done:false},
      {reps:"", weight:"", rpe:"", done:false}]}]};
  save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* Puts both lots of rows on the page: the live ones with no wrapper, exactly as the
   workout screen builds them, and the past ones inside [data-setsess], exactly as the
   editor will. Then binds, once, the way a render does. */
const draw = ()=> p.evaluate(()=>{
  const live = S.active.entries[0];
  const old = S.sessions[0].entries[0];
  const liveRows = live.sets.map((st, si)=> setRowHTML(live, 0, si, null)).join("");
  const pastRows = old.sets.map((st, si)=> setRowHTML(old, 0, si, null, null, null, {sess: S.sessions[0]})).join("");
  document.getElementById("app").innerHTML =
    `<div id="liveWrap">${liveRows}</div>
     <div id="pastWrap" data-setsess="${S.sessions[0].id}">${pastRows}</div>`;
  bind();
  return {
    liveRows: document.querySelectorAll('#liveWrap .set').length,
    pastRows: document.querySelectorAll('#pastWrap .set').length
  };
});

console.log("\n1. both lots of rows are on the page at once");
const d0 = await draw();
ck("the live rows drew", d0.liveRows === 2, d0.liveRows);
ck("the past rows drew", d0.pastRows === 2, d0.pastRows);

console.log("\n2. a value typed into a past row lands in the past session");
const d2 = await p.evaluate(()=>{
  const el = document.querySelector('#pastWrap .set input[data-f="reps"]');
  el.value = "11";
  el.dispatchEvent(new Event("change", {bubbles:true}));
  return {past: S.sessions[0].entries[0].sets[0].reps,
          live: S.active.entries[0].sets[0].reps};
});
ck("the past session has it", d2.past === "11", d2.past);
ck("and the live session is untouched (control)", d2.live === "", JSON.stringify(d2.live));

console.log("\n3. and a value typed into a live row lands in the live session");
await draw();
const d3 = await p.evaluate(()=>{
  const el = document.querySelector('#liveWrap .set input[data-f="reps"]');
  el.value = "7";
  el.dispatchEvent(new Event("change", {bubbles:true}));
  return {live: S.active.entries[0].sets[0].reps,
          past: S.sessions[0].entries[0].sets[0].reps};
});
ck("the live session has it", d3.live === "7", d3.live);
ck("and the past session still reads 11, not 7 (control)", d3.past === "11", d3.past);

console.log("\n4. ticking a past set does not start a rest clock");
await draw();
const d4 = await p.evaluate(()=>{
  const before = !!(S.active && S.active.restTimer);
  /* The fixture's past sets are done, as a finished session's are, so the first tap is
     an UN-tick - which is the operation that matters here: correcting a tick you got
     wrong is most of the reason to open the editor, and the live rule that a finished
     exercise stays finished would refuse it. */
  const wasDone = !!S.sessions[0].entries[0].sets[0].done;
  document.querySelector('#pastWrap .set .chk').click();
  return {before, wasDone, after: !!(S.active && S.active.restTimer),
          nowDone: !!S.sessions[0].entries[0].sets[0].done};
});
ck("no clock was running to begin with", !d4.before);
ck("and none is now", !d4.after);
/* The tick still has to DO something, or "no clock started" would pass on a dead
   button - and in the editor a tick must also be reversible, because correcting one you
   got wrong is the whole reason to be in there. */
ck("the set started out done, as a filed one is", d4.wasDone);
ck("and the tap took it back", !d4.nowDone);

/* Redrawn first: setEditSaved() re-renders the editor, which in the app replaces these
   rows. Here it leaves them stale, so the rows are rebuilt before tapping again. */
await draw();
const d4b = await p.evaluate(()=>{
  document.querySelector('#pastWrap .set .chk').click();
  return {done: !!S.sessions[0].entries[0].sets[0].done,
          clock: !!(S.active && S.active.restTimer)};
});
ck("tapping again puts it back", d4b.done);
ck("and still no clock", !d4b.clock);

console.log("\n5. the stored grade is redone when a past set changes");
const d5 = await p.evaluate(()=>{
  S.sessions[0].quality = null;
  const el = document.querySelector('#pastWrap .set input[data-f="weight"]');
  el.value = "145";
  el.dispatchEvent(new Event("change", {bubbles:true}));
  return {weight: S.sessions[0].entries[0].sets[0].weight,
          graded: !!(S.sessions[0].quality && S.sessions[0].quality.sections),
          edited: !!S.sessions[0].edited};
});
ck("the weight is stored", d5.weight === "145", d5.weight);
ck("the session was re-graded", d5.graded);
ck("and stamped as edited", d5.edited);

console.log("\n6. a row naming a session that is gone writes nowhere");
const d6 = await p.evaluate(()=>{
  const live = S.active.entries[0];
  document.getElementById("app").innerHTML =
    `<div data-setsess="no-such-session">${setRowHTML(live, 0, 0, null, null, null, {sess: S.sessions[0]})}</div>`;
  bind();
  const before = JSON.stringify(S.active.entries[0].sets[0]);
  const el = document.querySelector('.set input[data-f="reps"]');
  el.value = "99";
  el.dispatchEvent(new Event("change", {bubbles:true}));
  return {same: JSON.stringify(S.active.entries[0].sets[0]) === before,
          pastUntouched: S.sessions[0].entries[0].sets[0].reps === "11"};
});
ck("the live session was not written to", d6.same);
ck("nor the past one", d6.pastUntouched);

console.log("\n7. nothing holds a 'currently editing' session between renders");
/* The property the DOM-scoped design has and a module global does not: after the editor's
   rows are gone, a live row is a live row again with nothing to clear. */
const d7 = await p.evaluate(()=>{
  const live = S.active.entries[0];
  document.getElementById("app").innerHTML = live.sets.map((st, si)=> setRowHTML(live, 0, si, null)).join("");
  bind();
  const el = document.querySelector('.set input[data-f="reps"]');
  el.value = "5";
  el.dispatchEvent(new Event("change", {bubbles:true}));
  return {live: S.active.entries[0].sets[0].reps, past: S.sessions[0].entries[0].sets[0].reps};
});
ck("the live row wrote to the live session", d7.live === "5", d7.live);
ck("and the past session is where it was", d7.past === "11", d7.past);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
