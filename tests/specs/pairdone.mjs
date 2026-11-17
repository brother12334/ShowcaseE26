import { chromium, APP_URL } from './_e26.mjs';
/* P1-7 FOLLOW-UP - "WAS THIS EXERCISE DONE" HAS TO READ PAIRED SETS.

   Reported from a live session: a fully logged Cable Lateral Raise did not appear in the
   finished session and the grade said it had not been completed.

   The cause is one sentence with several victims. A paired set keeps nothing at the top
   level - no reps, no weight, no done - because those belong to st.sides.L and
   st.sides.R. Every check written as `st.done || st.reps` or `isWorkingSet(st)` over
   `en.sets` therefore sees an empty set, and a paired entry reads as untouched.

   The worst of them is not a display fault. finishWorkout() filters each entry's sets to
   the ones with something in them and then drops entries with none left:

       a.entries.forEach(e=>{ e.sets = e.sets.filter(st=> st.done || st.reps || st.weight); });
       a.entries = a.entries.filter(e=> e.sets.length);

   so the exercise was DELETED from the session at finish, and its reps with it. That is
   why it was not in the finished session: it was not in the session at all.

   The others are counting: the grade's completion score and every section that walks the
   session's sets, the done/total bar on Today, the set count on the history row, and the
   "this exercise is finished" marks. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2200}});
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
  S.splitId="ppl6"; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* ONE paired movement, fully logged, and nothing else - which is the case the user hit
   and the hardest one, because there is no ordinary entry to carry the session. */
const build = (withBench)=> p.evaluate(a=>{
  const plan = [{name:"Cable Lateral Raise", sets:3, reps:"8-21", weight:25, uni:true}];
  if(a.withBench) plan.push({name:"Barbell Bench Press", sets:3, reps:"6-10", weight:135});
  S.program.pushA = plan;
  S.sessions = []; S.active = null; save();
  startWorkout("pushA"); PF = null; TAB = "workout"; save();
  const s = S.active;
  const lat = s.entries[0];
  [0,1,2].forEach(si=> ["L","R"].forEach(sd=>{
    const t = sideTarget(lat, si, sd);
    t.weight = "25"; t.reps = "15"; t.rpe = "8"; t.done = true;
  }));
  s.entries.forEach((e, i)=>{
    if(i === 0) return;
    e.sets.forEach(st=>{ st.weight = "135"; st.reps = "8"; st.rpe = "8"; st.done = true; });
  });
  s.startedAt = Date.now() - 3.6e6;
  save();
  return null;
}, {withBench: withBench});

console.log("1 - CONTROL: THE SIX SIDE-SETS ARE THERE, BOTH SIDES, FULLY LOGGED");
await build(false);
const seeded = await p.evaluate(()=>{
  const lat = S.active.entries[0];
  return {perSide: entryPerSide(lat),
          adapter: sideSets(lat).map(x=> (x.si+1)+x.side+":"+x.reps+(x.done?"*":"")),
          working: sideSetsWorking(lat).length,
          topLevel: lat.sets.filter(st=> st.done || st.reps).length};
});
console.log("   ", JSON.stringify(seeded));
ck("it is a paired entry", seeded.perSide === true, String(seeded.perSide));
ck("six side-sets, all logged and done", seeded.working === 6
   && seeded.adapter.every(x=> /\*$/.test(x)), seeded.adapter.join(" "));
ck("and nothing at the top level, which is the whole trap",
   seeded.topLevel === 0, String(seeded.topLevel));

console.log("\n2 - FINISHING THE SESSION KEEPS THE EXERCISE");
const finished = await p.evaluate(()=>{
  finishWorkout();
  const s = (S.sessions || [])[0];
  if(!s) return {missing: true, nSessions: (S.sessions||[]).length};
  return {names: s.entries.map(e=> e.name),
          sets: s.entries.map(e=> e.name + ":" + e.sets.length),
          adapter: s.entries.map(e=> sideSetsWorking(e).length),
          id: s.id};
});
console.log("   ", JSON.stringify(finished));
ck("a session was filed", !finished.missing, JSON.stringify(finished));
ck("the lateral raise is in it",
   (finished.names || []).indexOf("Cable Lateral Raise") > -1,
   JSON.stringify(finished.names));
ck("with its three sets", (finished.sets || []).join() === "Cable Lateral Raise:3",
   JSON.stringify(finished.sets));
ck("and six working side-sets still readable",
   (finished.adapter || [])[0] === 6, JSON.stringify(finished.adapter));

console.log("\n3 - AND IT IS GRADED AS COMPLETE");
const graded = await p.evaluate(()=>{
  const s = S.sessions[0];
  s.quality = scoreWorkout(s);
  const c = (s.quality.sections || []).filter(x=> x.key === "completion")[0];
  return {pct: c && c.pct, pts: c && c.pts, max: c && c.max, why: c && c.why,
          grade: s.quality.grade, total: s.quality.total};
});
console.log("   ", JSON.stringify(graded));
ck("completion is full marks", graded.pct === 1, String(graded.pct));
ck("and says so in the right numbers",
   /6 working sets logged against 6 planned|6 of 6/.test((graded.why||[]).join(" ")),
   (graded.why||[]).join(" "));

console.log("\n4 - IT SHOWS IN THE FINISHED SESSION AND COUNTS TOWARD VOLUME");
const shown = await p.evaluate(()=>{
  TAB = "history"; render();
  const txt = document.body.innerText;
  const s = S.sessions[0];
  const vol = s.entries.reduce((t,e)=> t + sideSetsWorking(e)
    .reduce((u,x)=> u + ((parseFloat(x.weight)||0) * (parseFloat(x.reps)||0) * (x.count||1)), 0), 0);
  return {listed: /Cable Lateral Raise/.test(document.getElementById("app").innerHTML),
          setCount: typeof sessSets === "function" ? sessSets(s) : null,
          setList: setListHTML(s.entries[0]).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),
          chips: (setListHTML(s.entries[0]).match(/class="side-chip[^"]*"[^>]*>([LR])</g) || [])
                   .map(x=> x.slice(-2, -1)),
          vol: Math.round(vol)};
});
console.log("   ", JSON.stringify(shown));
ck("the exercise is on the history row", shown.listed, String(shown.listed));
ck("the row counts its side-sets", shown.setCount === 6, String(shown.setCount));
/* Counted off the CHIPS rather than the text: "RPE" contains an R, which the first
   version of this assertion happily counted as a right-side label. */
ck("the set list shows both sides of every set",
   shown.chips.join("") === "LRLRLR", shown.chips.join(""));
ck("and it carries volume", shown.vol > 0, String(shown.vol));

console.log("\n5 - THE DONE / TOTAL BAR COUNTS SIDE-SETS");
await build(true);
const bar = await p.evaluate(()=>{
  const a = S.active;
  /* Half the lateral raise undone, so the bar has something to be wrong about. */
  const lat = a.entries[0];
  const t = sideTarget(lat, 2, "R"); t.done = false; t.reps = ""; t.weight = "";
  save();
  TAB = "today"; render();
  const txt = document.getElementById("app").innerText;
  /* The card says "8 of 9 sets logged", not "8 / 9". */
  const m = txt.match(/(\d+) of (\d+) sets logged/);
  return {done: typeof entrySets === "function"
            ? a.entries.reduce((n,e)=> n + entrySets(e).filter(x=> x && x.done).length, 0) : null,
          total: typeof entrySets === "function"
            ? a.entries.reduce((n,e)=> n + entrySets(e).length, 0) : null,
          onScreen: m ? m[0] : null};
});
console.log("   ", JSON.stringify(bar));
ck("eight of nine are done", bar.done === 8 && bar.total === 9,
   bar.done + "/" + bar.total);
ck("and that is what the screen says", bar.onScreen === "8 of 9 sets logged",
   String(bar.onScreen));

console.log("\n6 - AND 'THIS EXERCISE IS FINISHED' AGREES");
const marks = await p.evaluate(()=>{
  const a = S.active, lat = a.entries[0];
  const partly = typeof entryIsDone === "function" ? entryIsDone(lat) : null;
  const t = sideTarget(lat, 2, "R"); t.weight = "25"; t.reps = "15"; t.rpe = "8"; t.done = true;
  save();
  const fully = typeof entryIsDone === "function" ? entryIsDone(lat) : null;
  return {partly, fully, legacyTest: lat.sets.length && lat.sets.every(x=> x.done)};
});
console.log("   ", JSON.stringify(marks));
ck("not finished while a side is missing", marks.partly === false, String(marks.partly));
ck("finished once both sides of every set are in", marks.fully === true, String(marks.fully));

console.log("\n7 - AND NO COUNTING SITE READS en.sets RAW AGAIN");
/* A static scan, like sideall.mjs, aimed at the specific shape that caused this: a
   done-ness or working-set test over `en.sets` rather than through the adapter. The
   sites that legitimately walk the raw sets - the ones that WRITE to them, migrate them,
   or count the rows of the plan rather than the work - declare themselves with a marker.
   Pinned, so a new one has to be argued for in a commit rather than slipped in. */
const scan = await p.evaluate(()=>{
  const src = (typeof APP_SRC === "string") ? APP_SRC : null;
  return src ? src.length : null;
});
const { readFileSync } = await import('node:fs');
const { appFile } = await import('./_e26.mjs');
const src = readFileSync(appFile('index.html'), 'utf8');
/* comments out, so prose about the bug is not mistaken for the bug */
let code = "", i = 0;
while(i < src.length){
  if(src.startsWith("/*", i)){ const j = src.indexOf("*/", i + 2); if(j < 0) break;
    code += src.slice(i, j + 2).replace(/[^\n]/g, " "); i = j + 2; }
  else { code += src[i]; i++; }
}
const lines = code.split("\n");
const RISKY = [
  /\.sets\s*\.every\(\s*\w+\s*=>\s*\w+\.done/,
  /\.sets\s*\|\|\s*\[\]\)\.filter\(\s*isWorkingSet/,
  /\.sets\.filter\(\s*isWorkingSet/,
  /\.sets\s*\|\|\s*\[\]\)\.filter\(\s*\w+\s*=>\s*\w+\.done\s*\|\|\s*\w+\.reps/,
  /\.sets\.filter\(\s*\w+\s*=>\s*\w+\.done\s*\|\|\s*\w+\.reps/
];
const hits = [];
lines.forEach((ln, n)=>{
  if(!RISKY.some(rx=> rx.test(ln))) return;
  if(/pairs?:(raw|write|plan)/.test(ln)) return;      // declared
  hits.push((n + 1) + "  " + ln.trim().slice(0, 96));
});
console.log("    " + hits.length + " undeclared raw done/working-set tests");
hits.slice(0, 12).forEach(x=> console.log("       " + x));
ck("none of them is undeclared", hits.length === 0, hits.join(" | ") || "none");

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
