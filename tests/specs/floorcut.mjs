import { chromium, APP_URL } from './_e26.mjs';
/* P0-3 — A VOLUME FLOOR IS NOT CUT ON A GAIN THAT DID NOT HAPPEN.

   From the Nov 15 2026 audit. Five floor cuts were accepted, each justified by
   "estimated strength up X%, so you're growing without the volume":

     Sep 15  Calves      5.4 -> 2    +105%   the Smith calf started counting the bar
     Oct 4   Quads       8.1 -> 5.5   +99%   the split squat started counting bodyweight
     Oct 25  Side Delts  7.6 -> 5     +33%   a new exercise and a new rep range, Oct 19
     Sep 17  Back Thighs 5.2 -> 4.5    +9%   slow gain, a newer lifter
     Sep 15  Mid Back    6.7 -> 5.5    +5%   slow gain, a newer lifter

   On Oct 7 the app's own updated model put the minimums at Calves 8, Quads 8.1, Mid Back
   10 and Hamstrings 6 — every one of them above the floor it had just been talked down
   to. Real training was removed on arithmetic about notation and on a beginner's first
   weeks.

   The detector is deliberately willing to raise as well as lower, and that is worth
   keeping, so section 1 proves a real cut is still proposed. Everything after it is a
   reason one must not be. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok   ":"  BROKEN ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
const ev=(fn,a)=>p.evaluate(fn,a);

/* One muscle, trained under its floor, getting stronger on two exercises. `o` bends one
   thing at a time: how far back the history goes, whether a counting switch, an exercise
   swap or a rep-range change falls inside the window, and how big the gain is. */
const build = (o)=> ev(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true,
    smithWeight:25, barWeight:45, barMode:"plates"});
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.active=null; S.flags=[]; S.planLog=[]; S.marks=[]; S.lmFloor={}; S.lmSuggest={};
  S.stalls={}; S.deload=null; S.easeOff=null; S.bodyLog={};
  S.priorTrainingWeeks = a.priorWeeks == null ? 80 : a.priorWeeks;
  const DAY = 86400e3, now = Date.now();
  S.bodyLog[dayStr(now - 200*DAY)] = {w: 139.6, at: now - 200*DAY};
  const exs = a.exs;                       // [name, ...]
  const every = a.everyDays || 7;          // days between sessions
  S.sessions = [];
  let si = 0;
  for(let d = a.weeks * 7; d >= 1; d -= every){
    const t = now - d * DAY;
    const recent = d < 42;                 // the half the proposal compares
    const load = recent ? a.loadNow : a.loadWas;
    S.sessions.push({id:"s"+(si++), workoutId: DAYS[1], date: dayStr(t), startedAt: t,
      finishedAt: t + 3600e3, feel: 4,
      entries: exs.map(nm=> ({name: nm, reps: recent ? a.repsNow : a.repsWas, rpe:"7-9",
        sets: Array.from({length: a.setsPer}, ()=> ({weight: String(load), reps: "9",
                                                     rpe: "8", done: true}))}))});
  }
  /* The programme has to carry the movements, or the muscle is not one being trained. */
  S.program[DAYS[1]] = exs.map(nm=> ({name: nm, sets: a.setsPer, reps: a.repsNow, weight: a.loadNow,
                                      rpe: "7-9", rest: [150, 210]}));
  if(a.mark) markCountChange("barMode", "plates", "total");
  if(a.swap) logPlanChange("swapped", DAYS[1], exs[0], ["Old Thing → " + exs[0]], {});
  if(a.repChange) logPlanChange("reps", DAYS[1], exs[0], ["12-20 → 8-16"], {});
  save();
  const A = bodyAnalysis();
  const mm = musclesFor(exs[0]) || {};
  const g = Object.keys(mm).find(k=> mm[k] >= 1) || Object.keys(mm)[0];
  const L = (A.lm && A.lm[g]) || adjustedLandmarks(A, g) || GROUPS[g];
  const e = tgEvidence(A, g);
  return {g, gName: gName(g), mev: L && L.mev,
          e: e ? {dir: e.dir, to: e.to, strP: Math.round(e.strP*100), perWeek: e.perWeek,
                  why: e.why} : null};
}, o);

/* Two movements, two sets each, once a week: four sets a week against a quads floor of
   about 5.6, and a 25% gain across the window. Under the floor and getting stronger —
   the one shape that genuinely argues the floor is too high. */
const QUADS = {exs: ["Leg Press", "Leg Extension"], setsPer: 2, everyDays: 6,
               weeks: 26, priorWeeks: 80,
               loadWas: 200, loadNow: 250, repsWas: "8-12", repsNow: "8-12"};

console.log("1 - A REAL CUT IS STILL PROPOSED (the detector has to keep working)");
let baseline = null;
{
  const r = await build(QUADS);
  baseline = r;
  console.log("    " + r.gName + " floor " + r.mev + ", " + JSON.stringify(r.e));
  ck("a proposal is made", !!r.e, "none");
  ck("and it is a reduction", r.e && r.e.dir === "down", r.e && r.e.dir);
}

console.log("2 - NOT WHEN THE WINDOW STRADDLES A CHANGE IN HOW LOADS ARE COUNTED");
{
  const r = await build(Object.assign({}, QUADS, {mark: true}));
  console.log("    " + JSON.stringify(r.e));
  ck("no cut proposed across a units marker", !r.e, JSON.stringify(r.e));
}

console.log("3 - NOR ACROSS AN EXERCISE SWAP (Side Delts, Oct 25)");
{
  const r = await build(Object.assign({}, QUADS, {swap: true}));
  console.log("    " + JSON.stringify(r.e));
  ck("no cut proposed across a swap", !r.e, JSON.stringify(r.e));
}

console.log("4 - NOR ACROSS A REP-RANGE CHANGE (12–20 → 8–16)");
{
  const r = await build(Object.assign({}, QUADS, {repChange: true}));
  console.log("    " + JSON.stringify(r.e));
  ck("no cut proposed across a rep-range change", !r.e, JSON.stringify(r.e));
}

console.log("5 - NOR ON A BEGINNER'S FIRST EIGHT WEEKS (Back Thighs, Mid Back)");
{
  /* Enough sessions to be judged, but the movements themselves are only seven weeks
     old, so every bit of the gain is inside the window the spec excludes: early progress
     is mostly skill, not hypertrophy. */
  const r = await build(Object.assign({}, QUADS,
    {weeks: 7, everyDays: 3, setsPer: 1, priorWeeks: 0}));
  console.log("    " + JSON.stringify(r.e));
  ck("no cut proposed off an exercise's first eight weeks", !r.e, JSON.stringify(r.e));
}

console.log("6 - NOR ON ONE EXERCISE ALONE");
{
  /* The same four sets a week and the same gain, carried by one movement instead of
     two. Nothing else differs, so only the two-exercise rule can refuse it. */
  const r = await build(Object.assign({}, QUADS, {exs: ["Leg Press"], setsPer: 4}));
  console.log("    " + JSON.stringify(r.e));
  ck("one movement is not enough evidence about a muscle", !r.e, JSON.stringify(r.e));
}

console.log("7 - AND NEVER BELOW THE HARD BOUND");
{
  const r = await ev(()=>{
    const A = bodyAnalysis();
    const out = {};
    GKEYS.forEach(g=>{
      const L = (A.lm && A.lm[g]) || adjustedLandmarks(A, g) || GROUPS[g];
      out[g] = {mev: L && L.mev, bound: floorCutBound(A, g)};
    });
    return out;
  });
  const bad1 = Object.entries(r).filter(([g,v])=> v.bound < 4);
  const bad2 = Object.entries(r).filter(([g,v])=> v.mev > 0 && v.bound < v.mev * 0.6 - 0.001);
  ck("no muscle's bound is under 4 sets a week", bad1.length === 0, JSON.stringify(bad1.slice(0,4)));
  ck("and none is under 60% of the model minimum", bad2.length === 0, JSON.stringify(bad2.slice(0,4)));
  /* The Calves cut that was actually made went to 2 sets a week. No muscle's bound
     permits that now, which is the single sharpest statement this section can make. */
  ck("and a cut to 2 sets a week is not available for any muscle",
     Object.values(r).every(v=> v.bound > 2), "");
  const q = r[baseline && baseline.g];
  console.log("    " + (baseline && baseline.gName) + " bound " + (q && q.bound)
              + " against a floor of " + (q && q.mev));
  ck("and the proposal in section 1 respects it",
     !!(baseline && baseline.e && q && baseline.e.to >= q.bound - 0.001),
     (baseline && baseline.e && baseline.e.to) + " vs " + (q && q.bound));
}

console.log("8 - THE PROPOSAL SAYS WHICH MOVEMENTS AND WHICH NUMBERS DROVE IT");
{
  const why = (baseline && baseline.e && baseline.e.why) || "";
  console.log("    " + why.slice(0, 220));
  ck("it names the exercises", /leg press/i.test(why) && /leg extension/i.test(why), why.slice(0,120));
}

console.log("9 - A REDUCED FLOOR IS RE-TESTED, NOT LEFT THERE");
{
  await build(QUADS);                       // back to the state that does propose a cut
  const r = await ev(()=>{
    const A = bodyAnalysis();
    const mm = musclesFor("Leg Press") || {};
    const g = Object.keys(mm).find(k=> mm[k] >= 1);
    const e = tgEvidence(A, g);
    if(!e) return {err: "no proposal to accept"};
    acceptFloorProposal(g, e);
    const rec = (S.lmFloorAt || {})[g];
    const before = floorRetests().length;
    /* THE CUT'S OWN PREDICTION, PUT TO THE TEST. It said: you will carry on getting
       stronger on four and a half sets a week. So run seven weeks at the reduced floor
       in which nothing improves \u2014 same load, same reps \u2014 and the prediction has failed.
       The acceptance is dated back by the same seven weeks, because that is where it
       would be by now. */
    const DAY = 86400e3, now = Date.now();
    rec.at = now - 7 * 7 * DAY;
    S.sessions.forEach(sn=>{
      sn.startedAt -= 7 * 7 * DAY; sn.finishedAt -= 7 * 7 * DAY;
      sn.date = dayStr(sn.startedAt);
    });
    const flat = (S.sessions[S.sessions.length - 1].entries || []).map(en=> en.name);
    let i = 0;
    for(let d = 7 * 7; d >= 1; d -= 6){
      const t = now - d * DAY;
      S.sessions.push({id:"f"+(i++), workoutId: DAYS[1], date: dayStr(t), startedAt: t,
        finishedAt: t + 3600e3, feel: 4,
        entries: flat.map(nm=> ({name: nm, reps:"8-12", rpe:"7-9",
          sets: [0,1].map(()=> ({weight:"250", reps:"9", rpe:"8", done:true}))}))});
    }
    save();
    const due = floorRetests();
    return {floor: (S.lmFloor || {})[g], rec: !!rec, before, g,
            due: due.map(x=> ({g: x.g, back: x.back, to: x.to, strP: Math.round((x.strP||0)*100)})),
            card: due.length ? floorRetestEvidence(due[0]).why : null,
            offered: (tgSuggestion(bodyAnalysis()) || {}).retest === true};
  });
  console.log("    " + JSON.stringify(r.due) + "  floor now " + r.floor);
  ck("accepting records when it was accepted and what it was", r.rec === true, JSON.stringify(r));
  ck("nothing is due before six weeks are up", r.before === 0, String(r.before));
  ck("and the re-test fires once they are and the gain did not continue",
     r.due && r.due.length === 1 && r.due[0].g === r.g, JSON.stringify(r.due));
  ck("proposing the old floor back", r.due && r.due[0] && r.due[0].back > r.floor,
     JSON.stringify(r.due));
  ck("and the Body tab actually offers it", r.offered === true, String(r.offered));
  if(r.card) console.log("    " + r.card.slice(0, 200));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
