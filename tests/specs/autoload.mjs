import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* AUTOMATIC LOAD MANAGEMENT — THE ACCEPTANCE TESTS, ON THE REAL STATE.

   Unlike replay.mjs, which reconstructs a history from the Training History Report, this
   loads the user's ACTUAL exported state: 74 sessions to 2026-11-16, the live programme
   with its real loads and rep ranges, the three gyms with their three different Smith
   carriages, and the aliases and flags exactly as they stand on the device.

   The fixture is tests/fixtures/state-2026-11-17.json, the export with a live share-link
   credential and the sharing, research and notification settings stripped — none of
   which any load rule reads. Everything the rules DO read is untouched.

   Each section is one of the eight acceptance tests from the feature request, named in
   the words it was asked in. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const loaded = await p.evaluate(fx=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  /* The state goes in as the app's own, then through migrate() exactly as a restore
     would, so every rule under test sees what the device sees. */
  Object.keys(fx).forEach(k=>{ S[k] = fx[k]; });
  S.tourDone = true;
  try{ migrate(); }catch(e){ return {err: String(e && e.message || e)}; }
  try{ applySplit(); }catch(e){}
  /* A REAL BOOT, not just a load. The one-time repairs run on the first render, which is
     where they have to run: migrate() is too early for anything that walks the programme
     through functions whose constants are still in their temporal dead zone. This page
     already rendered once on an empty profile, so the flag is cleared to put the state
     in front of them the way a device start does. */
  try{ SEEDS_RUN = false; }catch(e){}
  try{ render(); }catch(e){ return {err: "render: " + String(e && e.message || e)}; }
  save();
  const last = S.sessions[S.sessions.length-1];
  return {n: S.sessions.length, first: S.sessions[0].date, last: last.date,
          days: Object.keys(S.program).filter(k=> (S.program[k]||[]).length).join(" "),
          prog: trainPrefs().progression, smith: trainPrefs().smithWeight,
          barMode: trainPrefs().barMode, dbMax: trainPrefs().dbMax,
          gyms: (S.gyms||[]).map(g=> g.name + ":" + g.smith).join(" ")};
}, FX);
console.log("LOADED", JSON.stringify(loaded));
if(loaded.err){ console.log("the state would not load:", loaded.err); process.exit(1); }
ck("the whole export is in", loaded.n === 74 && loaded.last === "2026-11-16", loaded.n + " to " + loaded.last);
ck("with the six days of the current split", /pushA pullA legsA pushB pullB legsB/.test(loaded.days), loaded.days);
ck("and the kit it was logged with", loaded.barMode === "total" && loaded.smith === 25 && loaded.dbMax === 50,
   JSON.stringify({barMode:loaded.barMode, smith:loaded.smith, dbMax:loaded.dbMax}));
ck("and three gyms with different carriages", /Palma Vista Gym:25/.test(loaded.gyms) && /Lotus Gym:35/.test(loaded.gyms),
   loaded.gyms);

console.log("\nA. TWO ATTACHMENTS ARE TWO EXERCISES  (Rule A)");
/* The audited case: a rename registered an alias that made the straight bar and the V-bar
   one key, and swept the Push A log under the Push B name. Both are undone on load. */
const att = await p.evaluate(()=>{
  const names = ["Overhead Cable Triceps Extension", "Overhead Cable Triceps Extension (V-bar)",
                 "OVERHEAD CABLE TRICEP EXTENSION (V-bar)"];
  const bySlot = {};
  (S.sessions || []).forEach(s=>{
    (s.entries || []).forEach(e=>{
      if(!e || !/tricep/i.test(e.name) || !/extension/i.test(e.name)) return;
      if(s.workoutId !== "pushA" && s.workoutId !== "pushB") return;
      const k = s.workoutId + " | " + e.name;
      (bySlot[k] = bySlot[k] || []).push(s.date);
    });
  });
  return {alias: JSON.parse(JSON.stringify(S.exAliases || {})),
          keys: names.map(n=> nrm(n)),
          same: nrm(names[0]) === nrm(names[1]),
          bySlot,
          undo: !!S.attachFixUndo,
          renamed: S.attachFixUndo ? S.attachFixUndo.renamed.length : 0,
          /* THE CONTROL: the two slots must still have their own last loads, and a
             lookup on one must not be answered by the other's sets. */
          lastA: lastLoggedLoad("Overhead Cable Triceps Extension", "pushA"),
          lastB: lastLoggedLoad("Overhead Cable Triceps Extension (V-bar)", "pushB")};
});
Object.keys(att.bySlot).sort().forEach(k=> console.log("    " + k + "  x" + att.bySlot[k].length +
  "  (" + att.bySlot[k][0] + " to " + att.bySlot[k][att.bySlot[k].length-1] + ")"));
ck("the bad alias is gone", !att.alias["overhead cable triceps extension"], JSON.stringify(att.alias));
ck("the straight bar and the V-bar are different keys", !att.same, att.keys.join(" | "));
ck("and the odd casing goes with the V-bar, not the straight bar",
   att.keys[1] === att.keys[2] && att.keys[0] !== att.keys[2], att.keys.join(" | "));
ck("Push A carries one name now", Object.keys(att.bySlot).filter(k=> k.indexOf("pushA") === 0).length === 1,
   Object.keys(att.bySlot).filter(k=> k.indexOf("pushA") === 0).join(" / "));
ck("and it is the straight bar its own plan prescribes",
   !!att.bySlot["pushA | Overhead Cable Triceps Extension"], Object.keys(att.bySlot).join(" / "));
ck("Push A keeps its whole history, Aug 2 to Nov 11",
   (att.bySlot["pushA | Overhead Cable Triceps Extension"] || []).length === 10,
   String((att.bySlot["pushA | Overhead Cable Triceps Extension"] || []).length));
ck("CONTROL: Push B is untouched and still the V-bar",
   (att.bySlot["pushB | Overhead Cable Triceps Extension (V-bar)"] || []).length === 5,
   String((att.bySlot["pushB | Overhead Cable Triceps Extension (V-bar)"] || []).length));
ck("the relabel is undoable", att.undo && att.renamed === 6, att.renamed + " entries");
ck("CONTROL: each slot answers with its own last load", att.lastA === 90 && att.lastB === 90,
   JSON.stringify({pushA: att.lastA, pushB: att.lastB}));

console.log("\nD. THE NOV 16 SHOULDER PRESS EARNS THE WEIGHT IT EARNED  (Rule D)");
/* 60 lb for 11, 14 and 17 reps against a 9-13 range, at RPE 8, 8 and 9 against targets
   of 7, 8 and 9. The old rule wanted every set at the load within a rep of the top, so a
   session that beat the top by FOUR reps came back "Need 12-13 on every set at this
   load" — while the plan sat at 60, where a cut had overshot it to. */
const press = await p.evaluate(()=>{
  const s = S.sessions.find(x=> x.date === "2026-11-16");
  const v = (buildProgression(s) || []).find(x=> /Shoulder Press/.test(x.name));
  const en = s.entries.find(e=> /Shoulder Press/.test(e.name));
  return {kind: v && v.kind, from: v && v.from, to: v && v.to,
          msg: (v && v.msg || "").slice(0, 70),
          sets: (en.sets || []).map(x=> x.weight + "x" + x.reps + "@" + x.rpe).join(" "),
          repeat: topClearedRecently(en.name, "pushB", repRange("9-13"), s)};
});
console.log("    " + press.sets + "  ->  " + press.kind + " " + press.from + " to " + press.to);
console.log("    evidence: " + JSON.stringify(press.repeat));
ck("it is a load increase, not a hold", press.kind === "up", String(press.kind));
ck("from the 60 it was actually lifting", press.from === 60, String(press.from));
ck("to about 70-75", press.to >= 70 && press.to <= 75, String(press.to));
/* THE CONTROL ON THE CLAUSE THAT ALLOWED IT: this slot has cleared the top ONCE in its
   last three, so the 2-of-3 route cannot be what earned this. It is earned by the set
   being four reps past the top, which is not a close call — and that distinction is
   the whole of why this session no longer has to wait for another one. */
ck("CONTROL: and not because it cleared the top twice, because it did not",
   press.repeat && press.repeat.hits === 1 && press.repeat.of === 3, JSON.stringify(press.repeat));

console.log("\nD2. AND THE INCREASES THAT USED TO FIRE STILL FIRE  (Rule D, 8th test)");
const ups = await p.evaluate(()=>{
  const rows = [];
  S.sessions.forEach(s=>{
    (buildProgression(s) || []).forEach(v=>{
      if(v.kind !== "up") return;
      rows.push({date: s.date, wid: s.workoutId, name: v.name, from: v.from, to: v.to});
    });
  });
  const pick = re => rows.filter(r=> re.test(r.name)).map(r=> r.date + " " + r.wid + " " + r.from + "->" + r.to);
  return {n: rows.length,
          pulldown: pick(/Lat Pulldown/),
          row: pick(/Chest Supported Row/),
          /* Every proposed load has to be one a person could load. An unrounded
             prescription is the estimate leaking into the number — the first version
             of the e1RM sizing proposed a preacher curl at 28.947368421052637 lb.

             A MOVEMENT THAT COUNTS YOU IS EXEMPT, and that is not a loophole: on a
             weighted dip the total is bodyweight plus what is on the belt, so 142.6 is
             137.6 of lifter and a 5 lb plate. The belt is round; the person is not. */
          unrounded: rows.filter(r=> r.to != null && !isBodyweightMove(r.name)
                                     && Math.abs(r.to * 2 - Math.round(r.to * 2)) > 1e-9)
                         .map(r=> r.name + " " + r.to)};
});
ups.pulldown.forEach(x=> console.log("    pulldown  " + x));
ups.row.forEach(x=> console.log("    row       " + x));
ck("the Oct 26 lat pulldown 5 lb increase still happens",
   ups.pulldown.some(x=> /2026-10-26 .* 135->140/.test(x)), ups.pulldown.join(" | "));
ck("and the Nov 7 one", ups.pulldown.some(x=> /2026-11-07 .* 140->145/.test(x)), ups.pulldown.join(" | "));
ck("the Pull A row earns one too", ups.row.length > 0, ups.row.join(" | "));
ck("CONTROL: every prescribed load is a weight that exists", !ups.unrounded.length,
   ups.unrounded.join(" | ") || "all round");
ck("and increases still happen across the log", ups.n >= 25, String(ups.n));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
