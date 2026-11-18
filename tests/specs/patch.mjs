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

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
