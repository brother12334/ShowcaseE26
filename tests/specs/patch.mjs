import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* PLAN PATCHES — THE CHECKER AND THE DRY RUN  (item 15, stage one)

   A patch arrives from outside. It may have been written by an AI that was confident and
   wrong, and it can rewrite a plan in one press. So the two things under test here are
   that it is READ AS DATA — unknown op, unknown field, wrong type, all refused by name —
   and that the preview is honest, which can only mean that the preview runs the ops.

   Everything runs against the real export, because a checker that only ever sees its own
   fixtures has not met a plan with the same movement on two days, a day of seven slots, or
   a muscle whose floor is already set. */
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
  Object.keys(fx).forEach(k=>{ S[k] = fx[k]; });
  S.tourDone = true;
  try{ migrate(); }catch(e){ return {err: String(e && e.message || e)}; }
  try{ applySplit(); }catch(e){}
  try{ SEEDS_RUN = false; }catch(e){}
  try{ render(); }catch(e){ return {err: "render: " + String(e && e.message || e)}; }
  save();
  return {days: DAYS.map(d=> dayName(d)).join(", "), n: S.sessions.length};
}, FX);
if(loaded.err){ console.log("the state would not load:", loaded.err); process.exit(1); }
ck("the real export is in", loaded.n === 74, loaded.days);
/* CORRECTED, and the correction is the good kind. This asserted that a bare
   rebuildStalls() MOVES S.stalls on this fixture, which was true and was the honest
   explanation for stalls turning up in section 12's post-undo diff. It was true because
   Rule A's attachment split relabelled the log and rebuilt nothing, leaving a counter filed
   under a name the alias table no longer produces. exerciseKeysChanged() fixed that at
   2026.11.17.32, so the expectation inverts: after a boot the stored counters must already
   equal a rebuild, and section 12's allowed list loses a member. */
const STALLS_STABLE = await p.evaluate(()=>{
  const was = JSON.stringify(S.stalls);
  rebuildStalls();
  return JSON.stringify(S.stalls) === was;
});
ck("and a bare rebuildStalls() changes nothing after a boot",
   STALLS_STABLE, String(STALLS_STABLE));

/* A patch a person would actually write, against their actual plan: the cable raise moves
   from Push B to Push A, side delts get a floor, and the squat's range narrows. */
const GOOD = {e26patch: 1,
  note: "Side delts are short, and the cable raise belongs on Push A",
  ops: [
    {op: "slot.remove", day: "Push B", exercise: "Cable Lateral Raise"},
    {op: "slot.add", day: "Push A", exercise: "Cable Lateral Raise", at: 5,
     sets: 3, reps: "12-20", rpe: "8-9", rest: [90, 120], load: 17.5},
    {op: "volume.floor", muscle: "delts_side", to: 10},
    {op: "slot.set", day: "Legs A", exercise: "Smith Machine Squat", sets: 4, reps: "6-10"}
  ]};
const pv = async (patch)=> p.evaluate(j=> patchPreview(j), JSON.stringify(patch));

console.log("\n1 - THE PREVIEW OF A PATCH SOMEBODY WOULD ACTUALLY WRITE");
{
  const r = await pv(GOOD);
  r.rows.forEach(x=> console.log("    " + x.day + "  |  " + x.what + ":  " + x.from + " -> " + x.to));
  r.warnings.forEach(w=> console.log("    WARNING " + w.slice(0, 80)));
  ck("it is clean", r.ok && !r.errors.length, r.errors.join(" / "));
  ck("the move is two rows, off one day and onto the other",
     r.rows.some(x=> x.day === "Push B" && /removed/.test(x.to))
     && r.rows.some(x=> x.day === "Push A" && /position 5/.test(x.to)),
     r.rows.map(x=> x.day + ":" + x.to).join(" | "));
  ck("the floor says what it was before", r.rows.some(x=> /Side Delts/.test(x.what) && x.from === "5" && x.to === "10"),
     JSON.stringify(r.rows.filter(x=> /Side Delts/.test(x.what))));
  ck("the rep range change is reported", r.rows.some(x=> /Smith Machine Squat . reps/.test(x.what) && x.to === "6-10"),
     JSON.stringify(r.rows.filter(x=> /Squat/.test(x.what))));
  ck("and the logged sessions on the moved slot are named",
     r.warnings.some(w=> /7 logged sessions/.test(w)), r.warnings.join(" / ").slice(0, 100));
  /* THE NO-OP RULE: sets was already 4, so there is no sets row. A preview that shows
     "4 -> 4" invites somebody to believe twelve things moved when none did. */
  ck("a field set to what it already is is not a row",
     !r.rows.some(x=> /Squat . sets/.test(x.what)),
     JSON.stringify(r.rows.map(x=> x.what)));
}

console.log("\n2 - AND THE DRY RUN TOUCHES NOTHING");
{
  const r = await p.evaluate(j=>{
    const before = JSON.stringify(S);
    const a = patchPreview(j), b2 = patchPreview(j);
    return {same: JSON.stringify(S) === before,
            stable: JSON.stringify(a.rows) === JSON.stringify(b2.rows),
            bytes: before.length};
  }, JSON.stringify(GOOD));
  ck("the whole state is byte-identical afterwards", r.same, r.bytes + " bytes");
  ck("and two previews of one patch agree", r.stable, String(r.stable));
}

console.log("\n3 - THE PREVIEW MATCHES THE RESULT, BECAUSE IT IS THE SAME CODE");
{
  const r = await p.evaluate(j=>{
    const keep = JSON.stringify(S);
    const dry = patchPreview(j);
    const real = patchRun(j, {dry: false});
    const after = {pushA: (S.program.pushA || []).map(e=> e.name),
                   pushB: (S.program.pushB || []).map(e=> e.name),
                   floor: (S.lmFloor || {}).delts_side,
                   reps: ((S.program.legsA || []).find(e=> /Smith Machine Squat/.test(e.name)) || {}).reps};
    S = JSON.parse(keep); USER_ALIASES = S.exAliases; invalidateCanon(); applySplit();
    return {rowsMatch: JSON.stringify(dry.rows) === JSON.stringify(real.rows), after,
            restored: JSON.stringify(S) === keep};
  }, JSON.stringify(GOOD));
  ck("the dry run's rows and the real run's rows are identical", r.rowsMatch, String(r.rowsMatch));
  ck("and the real run did what the rows said",
     r.after.pushA.indexOf("Cable Lateral Raise") === 4
     && r.after.pushB.indexOf("Cable Lateral Raise") < 0
     && r.after.floor === 10 && r.after.reps === "6-10",
     JSON.stringify(r.after));
  ck("the fixture is back for the rest of this spec", r.restored, String(r.restored));
}

console.log("\n4 - WHAT IT REFUSES, AND WHETHER THE MESSAGE IS USABLE");
{
  const cases = [
    ["a version it does not know", {e26patch: 2, ops: []}, /not a version 1 patch/],
    ["a top-level field it does not know", {e26patch: 1, ops: [], apply: true}, /Unknown top-level field "apply"/],
    ["ops that is not a list", {e26patch: 1, ops: {}}, /ops must be a list/],
    ["an op it does not know", {e26patch: 1, ops: [{op: "plan.optimise", day: "Legs A"}]}, /unknown op "plan.optimise"/],
    ["a field the op does not take", {e26patch: 1, ops: [{op: "volume.floor", muscle: "quads", to: 8, hard: true}]}, /unknown field "hard"/],
    ["a number sent as a string", {e26patch: 1, ops: [{op: "slot.set", day: "Legs A", exercise: "Leg Extension", sets: "4"}]}, /sets must be whole number, 1 or more, not "4"/],
    ["a missing required field", {e26patch: 1, ops: [{op: "volume.floor", muscle: "quads"}]}, /to is required/],
    ["an op that changes nothing", {e26patch: 1, ops: [{op: "slot.set", day: "Legs A", exercise: "Leg Extension"}]}, /nothing to change/],
    ["a day that does not exist", {e26patch: 1, ops: [{op: "slot.set", day: "Legs C", exercise: "x", sets: 3}]}, /no day called "Legs C"/],
    ["an exercise not on the day named", {e26patch: 1, ops: [{op: "slot.set", day: "Legs A", exercise: "Hack Squat", sets: 4}]}, /"Hack Squat" is not on Legs A/],
    ["a muscle that is not a muscle", {e26patch: 1, ops: [{op: "volume.floor", muscle: "side_delts", to: 10}]}, /is not a muscle/],
    ["a gym it has never heard of", {e26patch: 1, ops: [{op: "gym.home", gym: "Gold's"}]}, /no gym called "Gold's"/],
    ["an RPE that is not a range", {e26patch: 1, ops: [{op: "slot.set", day: "Legs A", exercise: "Leg Extension", rpe: "hard"}]}, /rpe must be string/],
    ["a setting that is not one of the five", {e26patch: 1, ops: [{op: "settings.set", restDefault: 120}]}, /unknown field "restDefault"/],
    ["a setting value outside its list", {e26patch: 1, ops: [{op: "settings.set", progression: "aggressive"}]}, /progression must be "auto" \| "ask" \| "off"/],
    ["a session with no such date", {e26patch: 1, ops: [{op: "session.flag", date: "1999-01-01", flag: "injury"}]}, /no session logged on 1999-01-01/],
    ["a day removed with exercises still on it", {e26patch: 1, ops: [{op: "day.remove", day: "Legs A"}]}, /still has 6 exercises/],
    ["a rotation missing a day", {e26patch: 1, ops: [{op: "rotation.order", days: ["Push A", "Pull A", "Legs A"]}]}, /Missing: Push B, Pull B, Legs B/]
  ];
  for(const [what, patch, re] of cases){
    const r = await pv(patch);
    const msg = r.errors.join(" | ");
    ck(what, !r.ok && re.test(msg), msg.slice(0, 150));
  }
  const notJson = await p.evaluate(()=> patchPreview("{not json"));
  ck("something that is not JSON at all", !notJson.ok && /not valid JSON/.test(notJson.errors[0]),
     notJson.errors[0]);
}

console.log("\n5 - AND IT STOPS AT THE FIRST OP IT CANNOT RESOLVE, SAYING SO");
{
  const r = await pv({e26patch: 1, ops: [
    GOOD.ops[2],
    {op: "slot.set", day: "Legs A", exercise: "Hack Squat", sets: 4},
    {op: "volume.floor", muscle: "quads", to: 9}
  ]});
  ck("one error, not three", r.errors.length === 1, r.errors.length + ": " + r.errors.join(" | ").slice(0, 80));
  ck("and it says the rest were not checked", /ops\[2\] onwards were not checked/.test(r.errors[0]),
     r.errors[0].slice(-90));
  ck("nothing is applied, including the op that was fine", !r.ok, String(r.ok));
}

console.log("\n6 - A NAME THE APP KNOWS BY ANOTHER SPELLING IS NOT AN ERROR");
{
  const r = await pv({e26patch: 1, ops: [{op: "slot.set", day: "Legs A", exercise: "Smith Squat", sets: 5}]});
  ck("the alias table resolves it", r.ok && r.rows.length === 1, r.errors.join(" / "));
  ck("and the row names the slot by its real name", /Smith Machine Squat/.test((r.rows[0] || {}).what || ""),
     (r.rows[0] || {}).what);
}

console.log("\n7 - ONE NAME ON ONE DAY TWICE IS AMBIGUOUS, AND SAYS WHAT TO DO");
{
  const r = await p.evaluate(()=>{
    const keep = JSON.stringify(S.program.legsA);
    S.program.legsA.push({name: "Leg Extension", sets: 2, reps: "12-15"});
    const out = patchPreview(JSON.stringify({e26patch: 1,
      ops: [{op: "slot.set", day: "Legs A", exercise: "Leg Extension", sets: 4}]}));
    const byId = patchPreview(JSON.stringify({e26patch: 1,
      ops: [{op: "slot.set", day: "Legs A", slotId: "legsA#7", sets: 4}]}));
    S.program.legsA = JSON.parse(keep);
    return {out, byId};
  });
  ck("it refuses rather than picking one", !r.out.ok, r.out.errors.join(" | ").slice(0, 60));
  ck("and names both slot ids", /legsA#2 or legsA#7/.test(r.out.errors[0] || ""), r.out.errors[0]);
  ck("naming one by id works", r.byId.ok && r.byId.rows.length === 1,
     (r.byId.errors || []).join(" / ") || JSON.stringify(r.byId.rows[0]));
}

console.log("\n8 - WHAT A PATCH CANNOT ADDRESS AT ALL");
{
  const r = await p.evaluate(()=>{
    const fields = [];
    Object.keys(PATCH_OPS).forEach(k=> Object.keys(PATCH_OPS[k].fields).forEach(f=> fields.push(k + "." + f)));
    return {fields, danger: fields.filter(f=> /key|token|account|sync|cloud|share|secret|ns\b/i.test(f)),
            n: fields.length};
  });
  /* Not "refused if you try" — not addressable. There is no op whose field names an
     account, a key, a token or a sync setting, so a patch cannot reach them however it is
     written, and this asserts that over the whole table rather than over examples. */
  ck("no op has a field that names an account, key, token or sync setting",
     r.danger.length === 0, r.danger.join(", ") || r.n + " fields, none of them");
  const keyed = await p.evaluate(()=> patchPreview(JSON.stringify({e26patch: 1,
    ops: [{op: "settings.set", accountKey: "x"}]})));
  ck("and naming one anyway is an unknown field", !keyed.ok && /unknown field "accountKey"/.test(keyed.errors[0]),
     keyed.errors[0]);
}

console.log("\n9 - THE WARNINGS THAT ARE WARNINGS AND NOT BLOCKS");
{
  const load = await pv({e26patch: 1, ops: [
    {op: "slot.set", day: "Legs B", exercise: "Dumbbell RDL", load: 52}]});
  ck("a load the kit cannot make is a warning, and applies as asked",
     load.ok && load.warnings.some(w=> /not a weight/.test(w)),
     (load.warnings[0] || "none").slice(0, 110));
  const alias = await pv({e26patch: 1, ops: [
    {op: "slot.replace", day: "Legs B", exercise: "Dumbbell RDL", to: "Barbell Romanian Deadlift", keepHistory: true}]});
  ck("keepHistory across two implements warns about the merge Rule A repaired",
     alias.ok && alias.warnings.some(w=> /ONE movement/.test(w)),
     (alias.warnings[0] || "none").slice(0, 110));
  const same = await pv({e26patch: 1, ops: [
    {op: "slot.replace", day: "Legs B", exercise: "Dumbbell RDL", to: "Dumbbell Romanian Deadlift", keepHistory: true}]});
  ck("CONTROL: and the same movement renamed does not warn",
     same.ok && !same.warnings.some(w=> /ONE movement/.test(w)),
     same.warnings.join(" / ") || "no warning");
  const sess = await pv({e26patch: 1, ops: [
    {op: "session.flag", date: "2026-11-14", flag: "illness"}]});
  ck("a session op's warning is kept apart from the plan ones",
     sess.ok && sess.sessionWarnings.length === 1 && sess.warnings.length === 0,
     (sess.sessionWarnings[0] || "none").slice(0, 90));
}

console.log("\n10 - THE TEMPLATE A MODEL READS IS GENERATED FROM THE CHECKER'S OWN TABLE");
{
  const t = await p.evaluate(()=> ({text: patchTemplateText(),
                                    ops: Object.keys(PATCH_OPS),
                                    muscles: Object.keys(GROUPS).length}));
  ck("every op the checker accepts is in it", t.ops.every(o=> t.text.indexOf(o) > -1),
     t.ops.filter(o=> t.text.indexOf(o) < 0).join(", ") || t.ops.length + " ops");
  ck("so is the plan, with slot ids", /legsB#1\s+Dumbbell RDL/.test(t.text),
     (t.text.match(/legsB#1.*/) || ["missing"])[0]);
  ck("and the gyms with their kit", /Palma Vista Gym.*dbMax 50/.test(t.text),
     (t.text.match(/Palma Vista Gym.*/) || ["missing"])[0]);
  ck("and the floors already set by hand", /floor: .*delts_side 5/.test(t.text),
     (t.text.match(/floor: .*/) || ["missing"])[0]);
  ck("and the muscle keys, so a model cannot invent one",
     t.text.indexOf("delts_side") > -1 && /MUSCLE KEYS/.test(t.text), String(t.muscles));
  /* THE CONTROL THAT MUST FIRE: the reference is generated, so adding an op to the table
     adds it to the reference. If this ever has to be written by hand, the two will drift
     and the model will be handed a format the app does not accept. */
  const planted = await p.evaluate(()=>{
    PATCH_OPS["zz.planted"] = {fields: {thing: "str"}, req: ["thing"], note: "planted by a test"};
    const has = patchOpsReference().indexOf("zz.planted") > -1;
    delete PATCH_OPS["zz.planted"];
    return {has, gone: patchOpsReference().indexOf("zz.planted") < 0};
  });
  ck("CONTROL: an op added to the table appears in the reference", planted.has && planted.gone,
     JSON.stringify(planted));
}

console.log("\n11 - APPLYING ONE, AND WHAT IT LEAVES BEHIND");
const APPLIED = await p.evaluate(async j=>{
  const before = JSON.stringify(S);
  const r = await patchApply(j);
  return {ok: r.ok, rows: r.rows.length, snap: r.snap, id: r.id, before: before,
          pushA: (S.program.pushA || []).map(e=> e.name),
          pushB: (S.program.pushB || []).map(e=> e.name),
          floor: (S.lmFloor || {}).delts_side,
          log: (S.planLog || []).slice(-3).map(x=> ({kind: x.kind, rule: x.rule, day: x.day,
                                                     name: x.name, changes: x.changes, note: x.note})),
          hist: (S.patchLog || []).map(x=> ({id: x.id, snap: x.snap, changes: x.changes,
                                             note: x.note, undone: x.undone,
                                             paths: x.journal.map(y=> y.path)}))};
}, JSON.stringify(GOOD));
ck("it applies", APPLIED.ok && APPLIED.rows === 4, APPLIED.rows + " rows");
ck("the plan moved", APPLIED.pushA[4] === "Cable Lateral Raise"
   && APPLIED.pushB.indexOf("Cable Lateral Raise") < 0 && APPLIED.floor === 10,
   APPLIED.pushA.join(",") + " | floor " + APPLIED.floor);
ck("every change is in the plan history under rule patch",
   APPLIED.log.every(x=> x.kind === "patch" && x.rule === "patch" && /^Plan patch/.test(x.note || "")),
   JSON.stringify(APPLIED.log.map(x=> x.kind + "/" + x.rule)));
ck("and the note travels with it",
   APPLIED.log.every(x=> /the cable raise|Side delts are short/.test(x.note || "")),
   (APPLIED.log[0] || {}).note);
/* THE JOURNAL IS EXACTLY WHAT THE OPS TOUCHED. Not more: the first round trip journaled
   storageAsked and storagePersisted, which the snapshot write had caused, and undo would
   have written them back. */
ck("the journal holds exactly the paths the ops touched, and nothing else",
   JSON.stringify((APPLIED.hist[0] || {}).paths)
     === JSON.stringify(["lmFloor", "program.legsA", "program.pushA", "program.pushB"]),
   JSON.stringify((APPLIED.hist[0] || {}).paths));
ck("and a full snapshot was taken", APPLIED.snap && APPLIED.hist[0].snap, String(APPLIED.snap));
{
  const snap = await p.evaluate(async id=>{
    const raw = localStorage.getItem(PATCH_SNAP_PREFIX + id);
    const text = await patchSnapRead(id);
    let parsed = null; try{ parsed = JSON.parse(text); }catch(e){}
    return {how: (raw || "").slice(0, 3), stored: (raw || "").length,
            readable: !!parsed, sessions: parsed && (parsed.sessions || []).length,
            hadRaiseOnPushB: !!(parsed && (parsed.program.pushB || []).some(e=> /Cable Lateral Raise/.test(e.name)))};
  }, APPLIED.id);
  console.log("    snapshot " + snap.how + ", " + snap.stored + " chars stored");
  ck("the snapshot is gzipped, not the raw 848 KB", snap.how === "gz:" && snap.stored < 300000,
     snap.how + " " + snap.stored);
  ck("it reads back as the state from before the patch",
     snap.readable && snap.sessions === 74 && snap.hadRaiseOnPushB,
     JSON.stringify({sessions: snap.sessions, raiseStillOnPushB: snap.hadRaiseOnPushB}));
}

console.log("\n12 - AND UNDOING IT PUTS BACK EXACTLY WHAT IT CHANGED");
{
  const r = await p.evaluate(id=>{
    const chk = patchUndoCheck(id);
    const out = patchUndoRun(id);
    return {clean: chk.clean.length, clash: chk.clash.length, out: out, after: JSON.stringify(S)};
  }, APPLIED.id);
  ck("nothing had moved, so everything reverses", r.clash === 0 && r.out.reversed === 4,
     r.out.reversed + " reversed, " + r.clash + " clashed");
  /* THE HONEST FORM OF "BYTE FOR BYTE". Every path the patch touched is identical again.
     Three keys are NOT, and none of them is the patch's doing: savedAt is a timestamp,
     planLog has gained the patch's own rows and the undo's (recording an undo is the
     point), and S.stalls is a derived table that a plain rebuildStalls() moves on this
     fixture with no patch involved at all - asserted below rather than asserted away. */
  const diff = await p.evaluate(b2=>{
    const was = JSON.parse(b2), now = S;
    return Object.keys(Object.assign({}, was, now)).filter(k=>
      JSON.stringify(was[k]) !== JSON.stringify(now[k]));
  }, APPLIED.before);
  console.log("    keys still differing: " + diff.join(", "));
  ck("every path the patch touched is byte-identical again",
     ["lmFloor", "program"].every(k=> diff.indexOf(k) < 0), diff.join(", "));
  /* patchLog is in the list because the list of patches you have applied IS state, and an
     undo marks its row undone. Both histories exist to record the patch and its undo, which
     is the point of them. Nothing else differs - stalls left this list at .32, when the
     counters stopped going stale across a key change. */
  ck("and the only keys left differing are the save stamp and the two histories",
     diff.length === 3 && diff.every(k=> ["savedAt", "planLog", "patchLog"].indexOf(k) > -1),
     diff.join(", "));
  ck("the counters are among the things undo put back exactly",
     STALLS_STABLE && diff.indexOf("stalls") < 0, diff.join(", "));
  const redo = await p.evaluate(id=>{
    const out = patchUndoRun(id);
    return {out: out, floor: (S.lmFloor || {}).delts_side,
            pushA: (S.program.pushA || []).map(e=> e.name).indexOf("Cable Lateral Raise")};
  }, APPLIED.id);
  ck("an undo can itself be undone", redo.out.dir === "redo" && redo.floor === 10 && redo.pushA === 4,
     JSON.stringify({dir: redo.out.dir, floor: redo.floor, at: redo.pushA}));
}

console.log("\n13 - A SESSION LOGGED AFTER THE PATCH SURVIVES THE UNDO");
{
  const r = await p.evaluate(id=>{
    S.sessions.push({id: "after1", workoutId: "legsA", date: "2026-11-18",
      startedAt: Date.now(), finishedAt: Date.now() + 3600e3, feel: 4,
      entries: [{name: "Smith Machine Squat", reps: "9-13",
                 sets: [{weight: "75", reps: "10", rpe: "8", done: true}]}]});
    const n = S.sessions.length;
    const chk = patchUndoCheck(id);
    const out = patchUndoRun(id);
    return {clash: chk.clash.length, reversed: out.reversed,
            kept: !!(S.sessions || []).find(s=> s && s.id === "after1"),
            n: S.sessions.length, was: n,
            floor: (S.lmFloor || {}).delts_side};
  }, APPLIED.id);
  ck("the new session is not a conflict, because the patch never touched it", r.clash === 0,
     r.clash + " clashes");
  ck("the plan reverses", r.floor === 5, "floor " + r.floor);
  ck("and the session is still there", r.kept && r.n === r.was, r.n + " sessions");
}

console.log("\n14 - AND WHAT IT DOES WHEN SOMETHING IT CHANGED HAS MOVED SINCE");
{
  const r = await p.evaluate(async j=>{
    const ap = await patchApply(j);
    /* A hand edit to one of the days the patch touched, and a session logged, both AFTER
       the patch - which is what makes them the things a roll-back would destroy. */
    S.program.pushA[0].sets = 9;
    S.sessions.push({id: "after2", workoutId: "pullA", date: "2026-11-19",
      startedAt: Date.now(), finishedAt: Date.now(), feel: 4,
      entries: [{name: "Lat Pulldown", reps: "8-12",
                 sets: [{weight: "150", reps: "9", rpe: "8", done: true}]}]});
    const chk = patchUndoCheck(ap.id);
    const out = patchUndoRun(ap.id);
    return {id: ap.id, clean: chk.clean.length, clash: chk.clash.map(c=> c.label),
            reversed: out.reversed, left: out.left,
            pushAStillPatched: (S.program.pushA || []).map(e=> e.name).indexOf("Cable Lateral Raise"),
            handEditKept: S.program.pushA[0].sets,
            floorReversed: (S.lmFloor || {}).delts_side === 5,
            pushBReversed: (S.program.pushB || []).some(e=> /Cable Lateral Raise/.test(e.name))};
  }, JSON.stringify(GOOD));
  ck("the day that moved is named, and only that one", r.clash.length === 1 && r.clash[0] === "Push A",
     r.clash.join(", "));
  ck("the ones that did not are reversed", r.reversed === 3 && r.floorReversed && r.pushBReversed,
     r.reversed + " reversed");
  ck("the day that moved is left exactly as it is", r.left === 1
     && r.handEditKept === 9 && r.pushAStillPatched === 4,
     JSON.stringify({sets: r.handEditKept, raiseAt: r.pushAStillPatched}));
  /* THE OTHER DOOR. The photograph goes back to before the patch, which loses what came
     after - so the cost is computed and shown first rather than discovered. */
  const cost = await p.evaluate(async id=> await patchRestoreCost(id), r.id);
  /* Read out of the snapshot by session id, not guessed from timestamps: the first version
     compared finishedAt against the patch's time and counted a session logged BEFORE it,
     because that session's finishedAt was an hour in the future. */
  ck("a roll-back says exactly what it would cost, read from the snapshot",
     cost.exact && cost.sessions.length === 1 && /2026-11-19/.test(cost.sessions[0]),
     JSON.stringify(cost.sessions));
  const rest = await p.evaluate(async id=>{
    const out = await patchRestore(id);
    return {out: out, sessions: (S.sessions || []).length,
            after1: !!(S.sessions || []).find(s=> s && s.id === "after2"),
            pushA: (S.program.pushA || [])[0].sets,
            raiseOnPushB: (S.program.pushB || []).some(e=> /Cable Lateral Raise/.test(e.name))};
  }, r.id);
  ck("and rolling back puts everything back to before the patch",
     rest.out.ok && rest.raiseOnPushB && rest.pushA !== 9, JSON.stringify({pushASets: rest.pushA}));
  ck("including dropping the session logged after it, as it warned", !rest.after1,
     rest.sessions + " sessions, after2 present: " + rest.after1);
}

console.log("\n15 - THE SNAPSHOT BUDGET, AND A ROW THAT CAN NO LONGER PROMISE ONE");
{
  const r = await p.evaluate(async j=>{
    S.patchLog = []; 
    const ids = [];
    for(let i = 0; i < 3; i++){
      const ap = await patchApply(JSON.stringify({e26patch: 1, note: "n" + i,
        ops: [{op: "volume.floor", muscle: "quads", to: 6 + i}]}));
      ids.push(ap.id);
    }
    let stored = 0;
    ids.forEach(id=>{ const b2 = localStorage.getItem(PATCH_SNAP_PREFIX + id); stored += b2 ? b2.length : 0; });
    return {ids, stored, snaps: S.patchLog.map(x=> x.snap), budget: PATCH_SNAP_BUDGET};
  }, null);
  console.log("    3 snapshots held " + r.stored + " chars against a budget of " + r.budget);
  ck("they all fit inside the budget", r.stored < r.budget && r.snaps.every(Boolean),
     r.stored + " / " + r.budget);
  const pruned = await p.evaluate(()=>{
    const was = S.patchLog.map(x=> x.snap);
    /* Drop the budget to nothing and prune: the oldest snapshots go, newest kept, and the
       rows they belonged to stop claiming a guarantee they no longer have. */
    const keep = PATCH_SNAP_BUDGET;
    window.__b = keep;
    const n = S.patchLog.length;
    /* prune is driven by the constant, so this exercises it by removing the files instead,
       which is what a cleared or full device looks like from the app's side */
    localStorage.removeItem(PATCH_SNAP_PREFIX + S.patchLog[0].id);
    patchSnapPrune();
    return {was, now: S.patchLog.map(x=> x.snap), n};
  });
  ck("a snapshot that is gone marks its row reverse-only",
     pruned.was[0] === true && pruned.now[0] === false && pruned.now[1] === true,
     JSON.stringify(pruned.now));
  const txt = await p.evaluate(()=>{
    const id = S.patchLog[0].id;
    return {card: patchCardHTML(), msg: null, id};
  });
  ck("and the screen says so rather than claiming byte for byte",
     /reverse only/.test(txt.card) && /full snapshot/.test(txt.card),
     (txt.card.match(/reverse only[^<]*/) || ["missing"])[0]);
  const refuse = await p.evaluate(async ()=>{
    const id = S.patchLog[0].id;
    const out = await patchRestore(id);
    return out.err || "no error";
  });
  ck("CONTROL: and rolling that one back is refused rather than half done",
     /no longer has a full snapshot/.test(refuse), refuse.slice(0, 80));
}

console.log("\n16 - THE SCREEN");
{
  const r = await p.evaluate(()=>{
    S.patchLog = [];
    PATCH_TEXT = ""; PATCH_PV = null;
    const empty = patchCardHTML();
    PATCH_TEXT = '{"e26patch":1,"ops":[{"op":"volume.floor","muscle":"quads","to":7}]}';
    PATCH_PV = patchPreview(PATCH_TEXT);
    const clean = patchCardHTML();
    PATCH_PV = patchPreview('{"e26patch":1,"ops":[{"op":"nope"}]}');
    const broken = patchCardHTML();
    PATCH_TEXT = ""; PATCH_PV = null;
    return {empty, clean, broken};
  });
  ck("with nothing pasted there is no Apply button", r.empty.indexOf("ptApply") < 0
     && r.empty.indexOf("ptCheck") > -1, "preview button only");
  ck("a clean preview offers Apply", r.clean.indexOf("ptApply") > -1
     && /Apply this patch/.test(r.clean), "offered");
  ck("a refused one does not", r.broken.indexOf("ptApply") < 0
     && /was refused, and nothing was changed/.test(r.broken), "withheld");
  ck("and it warns that a pasted patch is a pasted patch",
     /Only apply patches you trust/.test(r.empty), "warned");
}

console.log("\n17 - AND THE WHOLE THING THROUGH THE REAL SCREEN");
/* Everything above calls the functions. This taps the tile, types into the box, presses
   the buttons and reads what a person would see - which is the only test that could have
   caught what it did catch: patchWire() was never called from the settings wiring, so the
   screen rendered perfectly and Preview did nothing at all. No function-level test can
   find a missing binding, because every function was fine. */
{
  await p.evaluate(fx=>{
    Object.keys(fx).forEach(k=>{ S[k] = fx[k]; });
    S.patchLog = []; S.tourDone = true;
    migrate(); try{ applySplit(); }catch(e){}
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    ['preflight','aiFull'].forEach(id=>{ const el = document.getElementById(id); if(el) el.remove(); });
    try{ PF = null; }catch(e){}
    PATCH_TEXT = ""; PATCH_PV = null;
    TAB = "sync"; SET_PAGE = null; render();
  }, FX);
  await p.waitForTimeout(150);
  const tile = await p.$('[data-setopen="patch"]');
  ck("Plan patches is a tile in Settings", !!tile, tile ? "present" : "missing");
  await p.click('[data-setopen="patch"]');
  await p.waitForTimeout(150);
  ck("tapping it opens a box to paste into",
     await p.evaluate(()=> !!document.querySelector('#ptIn') && !!document.querySelector('#ptCheck')),
     "box and preview button");
  await p.evaluate(j=>{
    const ta = document.querySelector('#ptIn');
    ta.value = j; ta.dispatchEvent(new Event('input'));
  }, JSON.stringify({e26patch: 1, note: "the cable raise moves to Push A", ops: GOOD.ops}));
  await p.click('#ptCheck');
  await p.waitForTimeout(200);
  const shown = await p.evaluate(()=> ({apply: !!document.querySelector('#ptApply'),
                                        text: document.body.innerText.replace(/\s+/g, " ")}));
  ck("Preview draws the changes and offers Apply", shown.apply && /What this would change/.test(shown.text),
     shown.apply ? "offered" : "NOT offered");
  ck("with the before and after of each one", /3 x 8-21 . removed/.test(shown.text)
     && /Side Delts weekly floor 5 . 10/.test(shown.text),
     (shown.text.match(/Side Delts weekly floor[^A-Z]*/) || ["missing"])[0].slice(0, 50));
  await p.click('#ptApply');
  await p.waitForTimeout(500);
  const after = await p.evaluate(()=> ({text: document.body.innerText.replace(/\s+/g, " "),
                                        undo: !!document.querySelector('[data-ptundo]'),
                                        roll: !!document.querySelector('[data-ptrestore]'),
                                        box: (document.querySelector('#ptIn') || {}).value,
                                        log: (S.patchLog || []).length,
                                        onPushA: (S.program.pushA || []).map(e=> e.name).indexOf("Cable Lateral Raise")}));
  ck("Apply applies it", after.log === 1 && after.onPushA === 4, "log " + after.log + ", at " + after.onPushA);
  ck("the box is cleared and the patch is in the history", !after.box && /Patch history/.test(after.text),
     after.box ? "box still full" : "cleared");
  ck("the history row offers Undo and a whole roll-back", after.undo && after.roll,
     JSON.stringify({undo: after.undo, roll: after.roll}));
  ck("and says which guarantee is behind it", /full snapshot/.test(after.text),
     (after.text.match(/full snapshot[^A-Z]*/) || ["missing"])[0].slice(0, 46));
  await p.click('[data-ptundo]');
  await p.waitForTimeout(300);
  const undone = await p.evaluate(()=> ({onPushA: (S.program.pushA || []).map(e=> e.name).indexOf("Cable Lateral Raise"),
                                         onPushB: (S.program.pushB || []).map(e=> e.name).indexOf("Cable Lateral Raise"),
                                         text: document.body.innerText.replace(/\s+/g, " ")}));
  ck("Undo puts it back", undone.onPushA < 0 && undone.onPushB === 4,
     JSON.stringify({pushA: undone.onPushA, pushB: undone.onPushB}));
  /* Case-insensitively: .btn uppercases its text and innerText reflects text-transform,
     which is how a CSS rule broke a case-sensitive assertion in this suite once before. */
  ck("and the row says so, with a way to redo it", /undone/i.test(undone.text)
     && /\bredo\b/i.test(undone.text), (undone.text.match(/\d+ changes . undone/i) || ["missing"])[0]);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
