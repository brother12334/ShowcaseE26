import { chromium, APP_URL } from './_e26.mjs';
/* THE SESSION EDITOR DRAWS LIVE LOGGING'S SET ROWS.

   The editor used to build its own: four boxes, no L/R, no set type, no warm-up mark.
   That one duplication is the root of a family of reports - a one-limb movement
   re-entered there came out as plain sets because the editor had no way to say left and
   right, and any field added to logging had to be added here too by somebody who
   remembered this existed.

   So this spec does not check that the editor's rows LOOK like the live ones. It checks
   that they ARE the live ones: same builder, same pair loop, same per-side inputs, and
   the values typed into them land in the session being edited rather than anywhere else.

   THE CONTROL, in every section, is a plain movement in the same session. If the paired
   assertions passed while the plain entry stopped rendering, the shared builder would be
   broken in a way a paired-only test cannot see. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:3000}});
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
  S.sessions=[{id:"s1", workoutId:ROTATION[0], date:"2026-11-14",
    startedAt:Date.now()-3*864e5, finishedAt:Date.now()-3*864e5+3600e3,
    entries:[
      {name:"Barbell Bench Press", sets:[
        {reps:"8", weight:"135", rpe:"8", done:true},
        {reps:"8", weight:"135", rpe:"8", done:true}]},
      {name:"Cable Lateral Raise", perSide:true, startSide:"L", sets:[
        {sides:{L:{reps:"15", weight:"25", rpe:"8", done:true},
                R:{reps:"14", weight:"25", rpe:"9", done:true}}}]}]}];
  save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const openEd = ()=> p.evaluate(()=>{ renderSessEditor(S.sessions[0]); return true; });

console.log("\n1. the editor draws real rows, and they are the live builder's");
await openEd();
const d1 = await p.evaluate(()=>{
  const wrap = document.querySelector('#modal [data-setsess]');
  const rows = Array.from(document.querySelectorAll('#modal .set'));
  const bench = rows.filter(r=> r.querySelector('[data-e="0"]'));
  const lat = rows.filter(r=> r.querySelector('[data-e="1"]'));
  const sides = lat.map(r=> (r.querySelector('[data-sd]') || {}).dataset
    ? r.querySelector('[data-sd]').dataset.sd : null);
  return {
    wrapped: !!wrap,
    sessId: wrap ? wrap.dataset.setsess : null,
    benchRows: bench.length,
    latRows: lat.length,
    sides,
    chips: lat.map(r=> (r.querySelector('.side-chip') || {}).textContent || "").join(","),
    /* The live builder's fields, by their live attribute names. A second builder would
       have to reproduce all of these to pass. */
    hasWeight: !!document.querySelector('#modal .set input[data-f="weight"]'),
    hasReps: !!document.querySelector('#modal .set input[data-f="reps"]'),
    hasRpe: !!document.querySelector('#modal .set [data-f="rpe"]'),
    hasCheck: !!document.querySelector('#modal .set .chk[data-f="done"]'),
    hasWarm: !!document.querySelector('#modal [data-setwarm]'),
    labels: !!document.querySelector('#modal .set-labels')
  };
});
ck("the rows are wrapped with the session id", d1.wrapped && d1.sessId === "s1", d1.sessId);
ck("the plain movement has two rows (control)", d1.benchRows === 2, d1.benchRows);
ck("the per-side movement has TWO rows for its one set", d1.latRows === 2, d1.latRows);
ck("left first, then right", d1.sides.join(",") === "L,R", d1.sides.join(","));
ck("each row carries its own side chip", /L/.test(d1.chips) && /R/.test(d1.chips), d1.chips);
ck("the weight, reps, RPE and tick are all there", d1.hasWeight && d1.hasReps && d1.hasRpe && d1.hasCheck);
ck("so is the warm-up mark, which the old editor had no idea about", d1.hasWarm);
ck("and the column headings", d1.labels);

console.log("\n2. typing into a side writes to that side, in this session");
await openEd();
const d2 = await p.evaluate(()=>{
  const row = Array.from(document.querySelectorAll('#modal .set'))
    .find(r=> (r.querySelector('[data-sd="R"]')));
  const el = row.querySelector('[data-sd="R"][data-f="reps"]');
  el.value = "13";
  el.dispatchEvent(new Event("change", {bubbles:true}));
  const st = S.sessions[0].entries[1].sets[0];
  return {R: st.sides.R.reps, L: st.sides.L.reps, top: st.reps === undefined,
          live: !S.active};
});
ck("the right side has the new count", d2.R === "13", d2.R);
ck("the left side is untouched", d2.L === "15", d2.L);
ck("and nothing was written at the set's top level", d2.top);
ck("there is no live session for it to have gone to instead", d2.live);

console.log("\n3. + set opens the SAME menu the workout screen opens");
/* The editor's + set used to add a plain set straight away. It now opens the live
   screen's own menu, from setKindOptions(), so the two cannot offer different kinds of
   set - and the kinds themselves are asserted against that function rather than against
   a list written out here, which would just be a second list to drift. */
await openEd();
const d3m = await p.evaluate(()=>{
  document.querySelector('#modal [data-seaddset="1"]').click();
  const dd = document.querySelector(".dd");
  const offered = Array.from(dd ? dd.querySelectorAll("[data-ddk]") : []).map(b=> b.dataset.ddk);
  const want = setKindOptions(S.sessions[0].entries[1]).map(o=> o.k || "");
  return {open: !!dd, offered, want, added: S.sessions[0].entries[1].sets.length};
});
ck("a menu opened", d3m.open);
ck("offering exactly what logging offers", d3m.offered.join(",") === d3m.want.join(","),
   d3m.offered.join(",") + " vs " + d3m.want.join(","));
ck("and nothing was added by merely opening it", d3m.added === 1, d3m.added);

console.log("\n3b. choosing Normal adds a PAIR, not a half set");
const d3 = await p.evaluate(()=>{
  document.querySelector('.dd [data-ddk=""]').click();
  const sets = S.sessions[0].entries[1].sets;
  const last = sets[sets.length-1];
  return {n: sets.length, hasBoth: !!(last.sides && last.sides.L && last.sides.R),
          blank: last.sides && last.sides.L.weight === "" && last.sides.L.reps === "",
          rows: document.querySelectorAll('#modal .set [data-e="1"][data-f="reps"]').length};
});
ck("there are two sets now", d3.n === 2, d3.n);
ck("the new one has both sides", d3.hasBoth);
/* The load is NOT carried over, and that is the change: logging does not carry it
   either, and two screens that add a set differently is the problem this whole piece of
   work exists to end. */
ck("and both sides start empty, as they do live", d3.blank);
ck("it drew as two more rows", d3.rows === 4, d3.rows);

console.log("\n3c. and a technique chosen in the menu lands on the set");
const d3t = await p.evaluate(()=>{
  document.querySelector('#modal [data-seaddset="1"]').click();
  const b = document.querySelector('.dd [data-ddk="amrap"]');
  if(!b) return {skipped:true};
  b.click();
  const sets = S.sessions[0].entries[1].sets;
  const last = sets[sets.length-1];
  return {tech: last.tech, onSide: !!(last.sides && last.sides.L && last.sides.L.tech),
          n: sets.length};
});
ck("AMRAP was offered and taken", !d3t.skipped && d3t.n === 3, JSON.stringify(d3t));
ck("stored on the set, where techFor() reads it", d3t.tech === "amrap", d3t.tech);
ck("and not on a side, because a technique is a property of the set", !d3t.onSide);

console.log("\n4. + set on the plain movement adds a plain set (control)");
const d4 = await p.evaluate(()=>{
  document.querySelector('#modal [data-seaddset="0"]').click();
  document.querySelector('.dd [data-ddk=""]').click();
  const sets = S.sessions[0].entries[0].sets;
  const last = sets[sets.length-1];
  return {n: sets.length, plain: !last.sides, blank: last.weight === ""};
});
ck("three sets now", d4.n === 3, d4.n);
ck("the new one holds no sides", d4.plain);
ck("and starts empty", d4.blank);

console.log("\n5. the grade is redone on every edit, and the session stamped");
const d5 = await p.evaluate(()=>{
  S.sessions[0].quality = null; delete S.sessions[0].edited;
  const el = document.querySelector('#modal .set input[data-f="weight"]');
  el.value = "140";
  el.dispatchEvent(new Event("change", {bubbles:true}));
  return {graded: !!(S.sessions[0].quality && S.sessions[0].quality.sections),
          edited: !!S.sessions[0].edited,
          stillOpen: !!document.querySelector('#modal [data-setsess]')};
});
ck("re-graded", d5.graded);
ck("stamped as edited", d5.edited);
ck("and the editor is still open afterwards", d5.stillOpen);

console.log("\n6. the editor has no set-row builder of its own left");
/* The point of the whole change. A second builder is what let the two drift, so its
   absence is the thing worth pinning: nothing outside setRowHTML() may emit a set row. */
const { readFileSync } = await import("node:fs");
const { appFile } = await import("./_e26.mjs");
const src = readFileSync(appFile("index.html"), "utf8");
const builders = src.split("\n")
  .map((l, i)=> [i+1, l])
  .filter(([n, l])=> /<div class="set(["$>]|-labels)/.test(l))
  .filter(([n, l])=> !/^\s*\./.test(l))           // CSS, not markup
  .filter(([n, l])=> !/rows:demo/.test(src.split("\n")[n - 3] || "")
                  && !/rows:demo/.test(src.split("\n")[n - 2] || ""));   // declared
console.log("    places that emit a set row or its headings:");
builders.forEach(([n, l])=> console.log("       " + n + "  " + l.trim().slice(0, 90)));
/* TWO ARE THE SHARED BUILDERS: setRowHTML's row and setLabelsHTML's headings. The other
   two are the editor's "Add an exercise" mini-form, which still builds its own four-box
   rows - it is the last duplicate left and the next piece of work replaces it.

   THREE, WHICH IS THE FLOOR: setRowHTML's row, and setLabelsHTML's headings on two lines,
   one per branch. The editor's Add an exercise mini-form was the fourth and fifth and is
   gone - it asked for weight, reps and RPE in boxes of its own, which is why a movement
   added there came out as plain sets with no way to say left and right.

   PINNED, AND IT MAY ONLY GO DOWN. There is now exactly one set row in the app, so any
   increase is a second one appearing and this fails. */
const BUILDER_PIN = 3;
ck("no new set-row builder has appeared", builders.length <= BUILDER_PIN, builders.length + " of at most " + BUILDER_PIN);
ck("and the pin is still the real count, so a new one cannot hide under it",
   builders.length === BUILDER_PIN, builders.length);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
