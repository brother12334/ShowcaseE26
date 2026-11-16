import { chromium, APP_URL } from './_e26.mjs';
/* P2-9 — THE CHANGE LOG SAID WHY, AND IT WAS THE WRONG WHY.

   From the Nov 15 2026 audit, six rows in the exported plan-change history:

     Squat            75  -> 27.5   "Double progression: last set cleared the top..."
     Single-Arm DB Row 50 -> 40     same reason
     RDL              50  -> 45     same reason
     Smith Hip Thrust 115 -> 35     same reason
     Face Pull        20  -> 95     same reason
     Lying Leg Curl   100 -> 160    same reason

   Four of those are load CUTS filed as progression increases. The other two are jumps
   no progression rule would ever prescribe. The history is the one place anybody looks
   to find out why a weight moved; rows that assert the opposite of what the numbers
   show do not merely mislead, they teach people the record is not worth reading.

   The reason has to be DERIVED from the row — which way the load moved, and where the
   row came from — rather than quoted from whatever the writing code believed at the
   time. And every row carries a rule_id, so a reason can be traced to the rule that
   produced it instead of being matched by its prose. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false});
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const CLEARED = /cleared the top|double progression/i;

console.log("1 - THE AUDITED SIX ROWS, READ BACK");
/* The real export, replayed as the rows it actually holds: the numbers that moved and
   the sentence that was filed against them. Nothing here is synthetic except the names
   having been shortened. */
const AUDIT = [
  ["Squat", 75, 27.5], ["Single-Arm DB Row", 50, 40], ["RDL", 50, 45],
  ["Smith Hip Thrust", 115, 35], ["Face Pull", 20, 95], ["Lying Leg Curl", 100, 160],
];
const seeded = await p.evaluate(rows=>{
  S.planLog = rows.map((r,i)=> ({
    at: Date.now() - (rows.length - i) * 86400000,
    date: todayStr(), day: ROTATION[0], kind: "weight", name: r[0],
    changes: [fmtLoad(r[1]) + " → " + fmtLoad(r[2])],
    note: "Double progression: last set cleared the top of the rep range at target RPE."
  }));
  save();
  const csv = planHistoryCSV(true);
  const head = csv.split("\n")[0].split(",");
  const body = csv.split("\n").slice(1).filter(Boolean);
  return {
    head,
    rows: body.map(l=> l),
    whyIdx: head.indexOf("why"),
    ruleIdx: head.indexOf("rule_id"),
    screen: planHistoryHTML()
  };
}, AUDIT);
console.log("    header:", seeded.head.join(","));
/* Four went down. None of them may claim the top of the range was cleared. */
const downRows = seeded.rows.filter(l=>{
  const m = l.match(/(\d+(?:\.\d+)?) lb ·? ?→ (\d+(?:\.\d+)?) lb/) ||
            l.match(/(\d+(?:\.\d+)?) lb → (\d+(?:\.\d+)?) lb/);
  return m && parseFloat(m[2]) < parseFloat(m[1]);
});
ck("the export still holds the four cuts", downRows.length === 4, String(downRows.length));
ck("no row whose load went down claims the top of the range was cleared",
   !downRows.some(l=> CLEARED.test(l)), downRows.filter(l=> CLEARED.test(l)).length + " do");
ck("and the screen does not either",
   !/went down[\s\S]*cleared the top/.test(seeded.screen) &&
   (seeded.screen.match(/cleared the top/g) || []).length === 2,
   (seeded.screen.match(/cleared the top/g) || []).length + " mentions");
ck("a cut reads as a reduction instead",
   downRows.every(l=> /reduc|lighter|cut/i.test(l)), downRows[0]);
ck("every row carries a rule_id", seeded.ruleIdx > -1, String(seeded.ruleIdx));
if(seeded.ruleIdx > -1){
  const ids = seeded.rows.map(l=> (l.split(",")[seeded.ruleIdx] || "").trim());
  ck("and none of them is empty", ids.every(x=> x.length > 0), ids.join(" "));
  ck("the cuts and the raises do not share one", new Set(ids).size >= 2, ids.join(" "));
}

console.log("\n2 - A REAL CUT, WRITTEN TODAY");
const cut = await p.evaluate(()=>{
  S.planLog = [];
  const wid = ROTATION[0];
  S.program[wid] = [{name:"Cable Fly", sets:3, reps:"8-12", weight:60}];
  save();
  applyProgression("Cable Fly", 45, null, "unreachable for the range", {wid});
  const c = (S.planLog || []).filter(x=> x.kind === "weight")[0] || {};
  return {note: c.note || "", rule: c.rule || "", line: (c.changes||[])[0] || ""};
});
console.log("   ", JSON.stringify(cut));
ck("it says what it is", !CLEARED.test(cut.note), cut.note);
ck("and carries a rule id", !!cut.rule, cut.rule);

console.log("\n3 - AND A REAL RAISE IS STILL A RAISE");
const up = await p.evaluate(()=>{
  S.planLog = [];
  const wid = ROTATION[0];
  S.program[wid] = [{name:"Cable Fly", sets:3, reps:"8-12", weight:60}];
  save();
  applyProgression("Cable Fly", 65, null, null, {wid});
  const c = (S.planLog || []).filter(x=> x.kind === "weight")[0] || {};
  return {note: c.note || "", rule: c.rule || ""};
});
console.log("   ", JSON.stringify(up));
ck("the progression reason survives", CLEARED.test(up.note), up.note);
ck("under its own rule id", !!up.rule && up.rule !== cut.rule, up.rule + " vs " + cut.rule);

console.log("\n4 - A COUNTING CHANGE IS NOT A PROGRESSION");
/* The two rows that went UP by amounts no rule would prescribe. Where a marker says the
   convention moved at that moment, the row says so rather than claiming a raise. */
const units = await p.evaluate(()=>{
  const at = Date.now() - 3600000;
  S.marks = [{kind:"units", what:"bw:face pull", from:"off", to:"on", at, date: todayStr()}];
  S.planLog = [{at: at + 1000, date: todayStr(), day: ROTATION[0], kind:"weight",
    name:"Face Pull", changes:[fmtLoad(20) + " → " + fmtLoad(95)],
    note:"Double progression: last set cleared the top of the rep range at target RPE."}];
  save();
  const csv = planHistoryCSV(true).split("\n")[1] || "";
  return {csv, why: planChangeWhy(S.planLog[0]), rule: planChangeRule(S.planLog[0])};
});
console.log("   ", JSON.stringify(units));
ck("it does not read as double progression", !CLEARED.test(units.why), units.why);
ck("it names the convention", /count|convention|unit/i.test(units.why), units.why);
ck("under the units rule", /unit/i.test(units.rule), units.rule);

console.log("\n5 - A ROW READ BACK FROM THE SESSIONS SAYS SO");
const der = await p.evaluate(()=>{
  const c = {at: Date.now(), date: todayStr(), day: ROTATION[0], kind:"weight",
             name:"RDL", derived:true, changes:["top set 50 lb → 45 lb"]};
  return {why: planChangeWhy(c), rule: planChangeRule(c)};
});
console.log("   ", JSON.stringify(der));
ck("no reason is invented for it", !CLEARED.test(der.why), der.why);
ck("it says where it came from", /from your log|read back|your sessions/i.test(der.why), der.why);
ck("under its own rule", /log|derive/i.test(der.rule), der.rule);

console.log("\n6 - THE BARBELL CONVENTION ROW KEEPS ITS OWN WORDS");
const bar = await p.evaluate(()=>{
  const c = {at: Date.now(), date: todayStr(), day: null, kind:"weight",
             name:"Barbell loads", barFrom:"plates", barTo:"total",
             changes:["112 logged sets and 9 prescribed loads rewritten"],
             note:"Switched to bar + plates. The loads themselves are unchanged."};
  return {why: planChangeWhy(c), rule: planChangeRule(c)};
});
console.log("   ", JSON.stringify(bar));
ck("the sentence it was written with is kept", /bar \+ plates/.test(bar.why), bar.why);
ck("and it is filed as a counting change", /unit/i.test(bar.rule), bar.rule);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
