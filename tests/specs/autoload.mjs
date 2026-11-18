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
/* CORRECTED: an earlier version of this asserted that the Pull A row earns an increase
   too. It does not, and did not before the rule changed either - the 8th acceptance test
   names the lat pulldown's 5 lb increases, and the row's are not among them. The
   assertion came from a build whose sized jumps were unclamped: the row's proposal at
   170 sat above the plan's 165 and so read as a raise, and once the jump was bounded it
   landed exactly ON 165, which is the plan already saying it. A proposal at or below
   what the plan prescribes is not a raise - that is the back-off-set rule, and it is
   right. What matters here is that nothing the old rule earned was lost. */
ck("the Pull A row is left where its plan already is", ups.row.length === 0,
   ups.row.join(" | ") || "none, as before");
ck("CONTROL: every prescribed load is a weight that exists", !ups.unrounded.length,
   ups.unrounded.join(" | ") || "all round");
ck("and increases still happen across the log", ups.n >= 25, String(ups.n));

console.log("\nD3. A BIG JUMP LANDS INSIDE THE RANGE, AND SAYS WHEN IT PASSES THE CAP");
/* Two things have to be true of every raise sized off a set that beat the top of the
   range by 3 or more. It must land somewhere the range is reachable — a jump that
   predicts 5 reps against an 8-10 range has swapped one wrong load for another — and
   where it exceeds the per-movement jump cap it must say so, rather than slipping past
   because the cap is measured on a step this clause did not take.

   Predicted with the app's OWN sizing arithmetic rather than a copy of it: an earlier
   version of this check used est1RM, whose cap is deliberately lower, and reported
   failures the code had already excluded. */
const far = await p.evaluate(()=>{
  const rows = [];
  S.sessions.forEach(s=>{
    (buildProgression(s) || []).forEach(v=>{
      if(v.kind !== "up" || !(v.from > 0) || v.to == null) return;
      const en = (s.entries || []).find(e=> e.name === v.name);
      if(!en) return;
      const grp = atTopLoadSets(en);
      const at = (grp && grp.at.length) ? grp.at : null;
      const lastAt = at ? at[at.length - 1] : null;
      const st = lastAt ? lastAt.st : null;
      if(!st) return;
      const pe = findProgramEntryWhere(v.name, s.workoutId);
      const rr = repRange((pe && pe.e && pe.e.reps) || en.reps);
      if(!rr) return;
      const reps = parseFloat(st.reps) || 0;
      if(reps < rr[1] + 3) return;
      const t = rpeTargetFor(en, lastAt.i);
      const e1 = sizeE1RM(parseFloat(st.weight) || 0, reps, parseFloat(st.rpe) || 0);
      rows.push({date: s.date, name: v.name, from: v.from, to: v.to, range: rr,
                 pct: Math.round((v.to - v.from) / v.from * 1000) / 10,
                 cap: Math.round((isCompound(v.name) ? JUMP_CAP_COMPOUND : JUMP_CAP_ISO) * 100),
                 predict: Math.round(repsAtLoad(e1, v.to, t == null ? 9 : t) * 10) / 10,
                 sized: !!v.sizedFrom,
                 saysOverCap: !!(v.sizedFrom && v.sizedFrom.overCap),
                 saysSo: /past the \d/.test(v.sub || "")});
    });
  });
  return rows;
});
far.forEach(r=> console.log("    " + r.date + "  " + r.name.slice(0,26).padEnd(26)
  + " " + r.from + "->" + r.to + "  " + r.pct + "% (cap " + r.cap + "%)  predicts "
  + r.predict + " of " + r.range[0] + "-" + r.range[1] + (r.sized ? "  SIZED" : "  step")));
ck("there are big-overshoot increases to judge", far.length >= 5, String(far.length));
const sized = far.filter(r=> r.sized);
ck("and some of them were sized off the set", sized.length >= 1, String(sized.length));
ck("every sized jump lands at or above the bottom of its range",
   sized.every(r=> r.predict >= r.range[0] - 0.5),
   sized.filter(r=> r.predict < r.range[0] - 0.5).map(r=> r.name + " " + r.predict).join(" | ") || "all in range");
ck("and none of them overshoots past the top either",
   sized.every(r=> r.predict <= r.range[1] + 0.5),
   sized.filter(r=> r.predict > r.range[1] + 0.5).map(r=> r.name + " " + r.predict).join(" | ") || "all in range");
ck("a sized jump past the per-movement cap is flagged as such",
   sized.filter(r=> r.pct > r.cap).every(r=> r.saysOverCap),
   sized.filter(r=> r.pct > r.cap && !r.saysOverCap).map(r=> r.name).join(" | ") || "all flagged");
ck("and says so in words, with both figures",
   sized.filter(r=> r.saysOverCap).every(r=> r.saysSo),
   sized.filter(r=> r.saysOverCap && !r.saysSo).map(r=> r.name).join(" | ") || "all said");
ck("no sized jump is more than the hard ceiling on one step up",
   sized.every(r=> r.pct <= 20 + 1e-9), sized.map(r=> r.pct + "%").join(" "));
const sp2 = far.find(r=> /Shoulder Press/.test(r.name));
ck("THE AUDITED CASE: the Nov 16 shoulder press predicts inside 9-13",
   sp2 && sp2.predict >= 9 && sp2.predict <= 13, sp2 ? sp2.predict + " reps" : "not found");

console.log("\nC. THE PLAN KEEPS UP WITH THE LOG  (Rule C)");
const sync = await p.evaluate(()=>{
  const by = {};
  ["pushA","pullA","legsA","pushB","pullB","legsB"].forEach(w=>{
    const s = [...S.sessions].reverse().find(x=> x.workoutId === w);
    if(!s) return;
    planSyncPlan(s).forEach(r=>{ by[w + "|" + r.name] = r; });
  });
  /* THE CAP, ON A CASE THE LOG DOES NOT CONTAIN. Their row sets are at 50, which is
     also the rack limit, so the live data cannot tell a cap apart from a coincidence.
     This asks the same question of a load that IS over the rack. */
  /* THE RACK CEILING, ON A CASE THE LOG DOES NOT CONTAIN.

     Their row sets are at 50, which is also the rack limit, so the live data cannot tell
     a cap apart from a coincidence. This puts 55 into the two most recent Pull B
     sessions that carry the movement and moves the plan off 55, so the sync has real
     drift to act on - an earlier version mutated only the newest session, and the
     two-session rule correctly refused it, which looked like the cap failing when it was
     the guard working. */
  const probe = (()=>{
    const ss = S.sessions.filter(x=> x.workoutId === "pullB"
      && (x.entries || []).some(e=> /Single-Arm Dumbbell Row/.test(e.name)))
      .slice(-2);
    if(ss.length < 2) return {err: "fixture has fewer than 2 such sessions"};
    const keep = [];
    ss.forEach(x=>{
      const en = x.entries.find(e=> /Single-Arm Dumbbell Row/.test(e.name));
      keep.push({en, sets: JSON.parse(JSON.stringify(en.sets))});
      sideSetsWorking(en).forEach(y=>{ const st = y.ref || y; st.weight = "55"; });
    });
    const pe = (S.program.pullB || []).find(e=> /Single-Arm Dumbbell Row/.test(e.name));
    const wasW = pe.weight;
    pe.weight = 40;
    const r = planSyncFor(pe.name, "pullB", ss[ss.length - 1]);
    pe.weight = wasW;
    keep.forEach(k=>{ k.en.sets = k.sets; });
    return r || {err: "no row returned"};
  })();
  return {by, probe, dbMax: trainPrefs().dbMax};
});
Object.keys(sync.by).sort().forEach(k=>{
  const r = sync.by[k];
  console.log("    " + k.padEnd(46) + " " + (r.from == null ? "blank" : r.from) + " -> " + r.to + "  [" + r.why + "]");
});
const got = (w, n)=> sync.by[w + "|" + n];
ck("Legs B Seated Leg Curl syncs to 160", (got("legsB","Seated Leg Curl")||{}).to === 160,
   String((got("legsB","Seated Leg Curl")||{}).to));
ck("Leg Extension syncs to 50", (got("legsA","Leg Extension")||{}).to === 50,
   String((got("legsA","Leg Extension")||{}).to));
ck("the rear delt fly comes back to the 32.5 you lift", (got("pullA","Cable Reverse Rear Delt Fly")||{}).to === 32.5,
   String((got("pullA","Cable Reverse Rear Delt Fly")||{}).to));
ck("the incline curl to 25", (got("pullA","Incline Dumbbell Curl")||{}).to === 25,
   String((got("pullA","Incline Dumbbell Curl")||{}).to));
ck("and the Legs A squat back up to the 80 you squat",
   (got("legsA","Smith Machine Squat")||{}).to === 80, String((got("legsA","Smith Machine Squat")||{}).to));
ck("every blank plan load is filled from the log",
   ["pushA|Dumbbell Lateral Raise","pushB|Weighted Chest Dips","pushB|Cable Lateral Raise",
    "pushB|Overhead Cable Triceps Extension (V-bar)","pullB|Lat Pulldown",
    "legsB|Standing Calf Raise (Smith)","legsB|Captain's Chair Leg Raise"]
     .every(k=> sync.by[k] && sync.by[k].why === "blank"),
   Object.keys(sync.by).filter(k=> sync.by[k].why === "blank").length + " filled");
/* RULE C's OWN GUARD: one session of disagreement is not drift. */
ck("CONTROL: nothing is synced off a single session",
   Object.keys(sync.by).every(k=> sync.by[k].why === "blank" || sync.by[k].n >= 2),
   Object.keys(sync.by).map(k=> sync.by[k].why + ":" + sync.by[k].n).join(" "));
ck("Single-Arm DB Row is never prescribed above the rack",
   sync.probe && sync.probe.to === sync.dbMax,
   sync.probe && sync.probe.err ? sync.probe.err
     : (sync.probe ? "55 logged -> " + sync.probe.to + " (rack " + sync.dbMax + ")" : "no probe"));

console.log("\nC2. SYNCING IS A CORRECTION, AND IS NEVER CALLED PROGRESS");
const cRows = await p.evaluate(()=>{
  const s = [...S.sessions].reverse().find(x=> x.workoutId === "legsA");
  const before = JSON.parse(JSON.stringify(S.program.legsA));
  const rows = planSyncPlan(s);
  const n = applyPlanSync(rows);
  const log = (S.planLog || []).slice(-n);
  const after = (S.program.legsA || []).map(e=> e.name + "=" + e.weight);
  S.program.legsA = before;                     // leave the fixture as it was found
  return {n, after,
          days: log.map(r=> r.wid || r.day || "(none)"),
          rules: log.map(r=> r.rule || "(none)"),
          notes: log.map(r=> String(r.note || "")),
          undoable: log.filter(r=> (r.undo || []).length).length};
});
console.log("    " + cRows.after.join("  |  "));
console.log("    " + cRows.notes[0]);
ck("the changes are written to the plan log", cRows.n >= 2, String(cRows.n));
ck("P0-1: each under its own day", cRows.days.every(d=> d === "legsA"), cRows.days.join(","));
ck("each carries the rule that made it", cRows.rules.every(r=> r === "sync"), cRows.rules.join(","));
ck("P2-9: and none is called progression",
   cRows.notes.every(t=> !/progress|double progression|cleared the top/i.test(t)), cRows.notes.join(" | "));
ck("and every one can be put back", cRows.undoable === cRows.n, cRows.undoable + "/" + cRows.n);

console.log("\nE. WHEN A LOAD MAY COME DOWN  (Rule E)");
const notes = await p.evaluate(()=>{
  const t = {};
  ["I had a toe injury.", "no pain today", "Pain-free session", "shoulder felt fine",
   "tweaked my back", "felt great", "sore from Tuesday", "", "AC fixed in gym"]
    .forEach(x=>{ const r = noteLooksInjured(x); t[x || "(empty)"] = r ? r.word : null; });
  return t;
});
Object.keys(notes).forEach(k=> console.log("    " + JSON.stringify(k).padEnd(26) + " -> " + notes[k]));
ck("\"I had a toe injury.\" is read as an injury", !!notes["I had a toe injury."], String(notes["I had a toe injury."]));
ck("\"no pain today\" is NOT", notes["no pain today"] === null, String(notes["no pain today"]));
ck("nor is \"Pain-free session\"", notes["Pain-free session"] === null, String(notes["Pain-free session"]));
ck("nor \"shoulder felt fine\"", notes["shoulder felt fine"] === null, String(notes["shoulder felt fine"]));
ck("CONTROL: a real complaint still lands", !!notes["tweaked my back"], String(notes["tweaked my back"]));
ck("CONTROL: an ordinary note is left alone", notes["AC fixed in gym"] === null, String(notes["AC fixed in gym"]));

const nov9 = await p.evaluate(()=>{
  const s = S.sessions.find(x=> x.date === "2026-11-09");
  return {note: s.note, flagged: !!s.notRepresentative,
          forCut: sessionNotEvidenceForCut(s), forAll: sessionNotEvidence(s),
          asked: injuryAsked(s), due: !!injuryAskDue()};
});
console.log("    Nov 9: " + JSON.stringify(nov9));
ck("Nov 9 never counts as evidence for a cut", !!nov9.forCut, String(nov9.forCut));
ck("and it was never marked by hand — the note is all there was",
   !nov9.flagged && !nov9.forAll, JSON.stringify({flagged: nov9.flagged, forAll: nov9.forAll}));
ck("and the app has a question queued about it, not a silent decision", nov9.due, String(nov9.due));

const asked = await p.evaluate(()=>{
  const s = S.sessions.find(x=> x.date === "2026-11-09");
  const before = sessionNotEvidence(s);
  markInjuryAnswer(s, true);
  const after = sessionNotEvidence(s);
  const flag = ((S.dayFlags || {})["2026-11-09"] || {});
  const stillDue = !!injuryAskDue();
  return {before, after, flag, stillDue};
});
console.log("    answered: " + JSON.stringify(asked));
ck("answering yes writes a real dayFlags mark", asked.flag.notRep === true, JSON.stringify(asked.flag));
ck("which every other rule then respects too", !asked.before && !!asked.after,
   JSON.stringify({before: asked.before, after: asked.after}));
ck("and it is not asked again", asked.flag.hurtAsked === true, String(asked.flag.hurtAsked));

console.log("\nE2. THE AUDITED CUTS, AND THE RANGE THAT DID NOT FIT");
const cut = await p.evaluate(()=>{
  const s15 = S.sessions.find(x=> x.date === "2026-11-15" && x.workoutId === "legsA");
  /* The live order is sync, then cut: the plan said 70 while the session squatted 80,
     and the cut rule rightly refuses evidence at a load it is not prescribing. */
  applyPlanSync(planSyncPlan(s15));
  const squat = loadCutFor("Smith Machine Squat", "legsA", s15);
  const s16 = S.sessions.find(x=> x.date === "2026-11-16");
  applyPlanSync(planSyncPlan(s16));
  const press = loadCutFor("Smith Machine Shoulder Press", "pushB", s16);
  return {squat, press};
});
console.log("    squat: " + JSON.stringify(cut.squat && {kind: cut.squat.kind, from: cut.squat.from, to: cut.squat.to}));
console.log("    " + ((cut.squat || {}).say || (cut.squat || {}).why || ""));
ck("THE AUDITED CASE: Nov 15 squat is not cut", cut.squat && cut.squat.kind !== "apply",
   String(cut.squat && cut.squat.kind));
ck("it proposes the rep range instead", cut.squat && cut.squat.kind === "range",
   String(cut.squat && cut.squat.kind));
ck("and the range it proposes is 6-10", cut.squat && cut.squat.to === "6-10",
   String(cut.squat && cut.squat.to));
ck("a rep-range change is ALWAYS a proposal, never applied",
   cut.squat && cut.squat.kind === "range" && cut.squat.from === "9-13", String(cut.squat && cut.squat.from));

console.log("\nE3. THE GUARDS");
const guards = await p.evaluate(()=>{
  const out = {};
  /* SAME GYM ONLY. Retag the newest Legs A session to another gym and the evidence from
     it stops counting toward a cut at home. */
  const s = [...S.sessions].reverse().find(x=> x.workoutId === "legsA");
  const other = (S.gyms || []).find(g=> g.id !== S.homeGym);
  const ev1 = cutEvidenceFor("Smith Machine Squat", "legsA", s, 3).map(x=> x.skip);
  const keep = s.gymId;
  s.gymId = other.id; s.gymName = other.name;
  const ev2 = cutEvidenceFor("Smith Machine Squat", "legsA", s, 3).map(x=> x.skip);
  s.gymId = keep;
  out.sameGym = {before: ev1, after: ev2, other: other.name};
  /* TEN PER CENT. A load whose smallest step is a bigger fraction than that is offered,
     not taken. */
  out.caps = {max: CUT_MAX_FRACTION};
  return out;
});
console.log("    same gym: " + JSON.stringify(guards.sameGym));
/* The gym compared against is the gym of the session being JUDGED, so retagging that
   session to Lotus makes the Palma Vista history the mismatch - which is the rule
   working, not failing. An earlier version of this looked for the retagged gym's name
   in the skip reason and found the other one. */
ck("evidence from a different gym than the session being judged is skipped",
   (guards.sameGym.after || []).some(x=> x && /^it was at /i.test(String(x))),
   JSON.stringify(guards.sameGym.after));
ck("CONTROL: and counted before it was retagged",
   !(guards.sameGym.before || [])[0], JSON.stringify(guards.sameGym.before[0]));
ck("a cut may never take more than 10%", guards.caps.max === 0.10, String(guards.caps.max));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
