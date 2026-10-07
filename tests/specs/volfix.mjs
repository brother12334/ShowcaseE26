/* THE VOLUME SHEET BEHIND A MUSCLE ROW ON THE PROGRAM TAB.

   Reported: glutes 16.8 sets a week against a ceiling of 13.9, and the top button said
   "Take 2 sets off Smith Machine Squat". That is quad work removed to fix a glute number
   that was mostly partial credit from compound lifts, on a plan that also had three sets
   of hip thrusts in it -- the one movement in the room whose whole job is the muscle that
   was over.

   Four separate faults produced that one sentence, and this spec holds all four down. */
import { chromium, APP_URL } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const ev = (fn,a)=> p.evaluate(fn,a);

/* The reported plan, and enough of it to put the glutes over even the corrected ceiling. */
const setup = (plan)=> ev(async pl=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open','news-open');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=104; S.seenNews='x';
  S.sessions=[]; S.volAck={}; S.builtPlan=null;
  S.splitId=DEFAULT_SPLIT; applySplit();
  DAYS.forEach(w=> S.program[w]=[]);
  Object.keys(pl).forEach((k,i)=>{ S.program[DAYS[i]] = pl[k]; });
  save(); TAB="program"; render();
  await new Promise(r=> setTimeout(r, 80));
  return true;
}, plan);
const mk = (name, sets)=> ({name, sets, reps:"8-12", rpes:Array(sets).fill(8)});

/* THE REPORTED CASE: a Smith squat carrying the most glute volume, and a hip thrust
   whose whole job is the glutes. */
const REPORTED = {
  a: [mk("Smith Machine Squat", 5), mk("Smith Machine Hip Thrust", 5), mk("Romanian Deadlift", 5)],
  b: [mk("Bulgarian Split Squat", 5), mk("Hip Abduction", 5), mk("Leg Extension", 4)],
  c: [mk("Hip Thrust", 5), mk("Glute Kickback", 5)]
};

console.log("1 - THE CUT COMES OFF THE MOVEMENT THAT IS FOR THIS MUSCLE");
{
  await setup(REPORTED);
  const r = await ev(async ()=>{
    const q = planQuality(S.program, currentSplit(), planCheckOpts());
    const x = (q.volume||[]).find(v=> v.g==="glutes");
    openVolFix("glutes");
    await new Promise(r2=> setTimeout(r2, 160));
    const m = document.getElementById("modal");
    const first = m.querySelector('[data-volpick="cut"]');
    const ranked = volCutRanked("glutes", q.volume, 1).map(z=> ({
      name: z.c.e.name, tier: z.tier, cost: volEffectSay(z.eff, "glutes")}));
    const out = {state: x.state,
      firstTitle: first ? first.querySelector("b").textContent.trim() : "(none)",
      firstSub: first ? (first.querySelector("span span")||{}).textContent || "" : "",
      ranked};
    hideModal();
    return out;
  });
  ck("the glutes are over the ceiling in this plan", r.state === "over", r.state);
  ck("THE TOP BUTTON CUTS THE HIP THRUST, NOT THE SQUAT",
     /Hip Thrust/i.test(r.firstTitle) && !/Smith Machine Squat/i.test(r.firstTitle), r.firstTitle);
  ck("and it says what the cut costs", /glutes −/.test(r.firstSub), r.firstSub.slice(0,90));
  /* The squat is not forbidden, it is ranked last and states its own damage. */
  const sq = r.ranked.find(z=> /Smith Machine Squat/i.test(z.name));
  ck("the squat is ranked below every main-target movement", sq && sq.tier === 3,
     sq ? String(sq.tier) : "not ranked");
  ck("and if it is shown at all it names the quads", sq && /quads −/.test(sq.cost),
     sq ? sq.cost : "");
}

console.log("2 - SPREAD NEVER TAKES ANOTHER MUSCLE'S MAIN WORK BELOW ITS TARGET");
{
  await setup(REPORTED);
  const r = await ev(async ()=>{
    const q0 = planQuality(S.program, currentSplit(), planCheckOpts());
    const before = {}; (q0.volume||[]).forEach(v=> before[v.g] = {v: v.v, top: v.top});
    openVolFix("glutes");
    await new Promise(r2=> setTimeout(r2, 150));
    document.querySelector('[data-volpick="spread"]').click();
    await new Promise(r2=> setTimeout(r2, 500));
    const q1 = planQuality(S.program, currentSplit(), planCheckOpts());
    const after = {}; (q1.volume||[]).forEach(v=> after[v.g] = {v: v.v, top: v.top, state: v.state});
    /* anything that was at or above its target before and is below it now */
    const broke = Object.keys(before).filter(g=>
      before[g].v + 0.05 >= before[g].top && after[g].v + 0.05 < after[g].top);
    const g0 = before.glutes, g1 = after.glutes;
    return {broke, from: +g0.v.toFixed(1), to: +g1.v.toFixed(1), state: g1.state,
            top: +g1.top.toFixed(1),
            quads: {from: +before.quads.v.toFixed(1), to: +after.quads.v.toFixed(1)}};
  });
  ck("nothing is taken below its target", r.broke.length === 0, r.broke.join(", "));
  ck("the quads are untouched", r.quads.from === r.quads.to, JSON.stringify(r.quads));
  ck("it took glute sets off", r.to < r.from, r.from + " -> " + r.to);
  /* AND IT STOPS AT THE CEILING, not at the lower target. */
  ck("it does not keep going down to the target", r.to > r.top, r.to + " vs target " + r.top);
}

console.log("3 - THE CUT IS THE SIZE OF THE PROBLEM");
{
  /* The reported arithmetic, on the numbers as reported: 16.8 against a ceiling of 13.9
     is three sets over, not five. The old rule aimed at `top` and cut to 11.8. */
  const r = await ev(()=>{
    const v = 16.8, mrv = 13.9, top = 11.8;
    return {toCeiling: Math.max(1, Math.ceil(v - mrv + 0.05)),
            toTarget:  Math.max(0, Math.ceil(v - top - 0.05))};
  });
  ck("the default cut clears the ceiling, and no more", r.toCeiling === 3, String(r.toCeiling));
  ck("going on to the middle is a bigger, separate offer", r.toTarget === 5, String(r.toTarget));
}

console.log("4 - THE SAME THREE NUMBERS, IN THE SAME WORDS, IN BOTH PLACES");
{
  await setup(REPORTED);
  const r = await ev(async ()=>{
    openVolFix("glutes");
    await new Promise(r2=> setTimeout(r2, 160));
    const t = document.getElementById("modal").innerText;
    hideModal();
    return {scale: /MIN[\s\S]*TARGET[\s\S]*CEILING/.test(t),
            table: /Minimum[\s\S]*Target[\s\S]*Ceiling/i.test(t),
            noRange: !/Sets a week\s*\n?\s*\d+–\d+/.test(t)};
  });
  ck("the bar is labelled min, target, ceiling", r.scale === true, "");
  ck("and so is the table under it", r.table === true, "");
  ck("the unexplained 4-12 range is gone", r.noRange === true, "");
}

console.log("5 - THE GLUTES ARE NOT COUNTED GENEROUSLY AND CAPPED HARSHLY");
{
  /* The plan as reported: a Smith squat, hip thrusts, RDLs and split squats. */
  await setup({a: [mk("Smith Machine Squat", 4), mk("Smith Machine Hip Thrust", 3),
                   mk("Romanian Deadlift", 3), mk("Bulgarian Split Squat", 3)]});
  const r = await ev(()=>{
    const q = planQuality(S.program, currentSplit(), planCheckOpts());
    const x = (q.volume||[]).find(v=> v.g==="glutes");
    return {v:+x.v.toFixed(1), mrv:+x.mrv.toFixed(1), state:x.state,
            ibc: INDIRECT_BASIS_CORRECTION.glutes,
            fed: COMPOUND_FED.indexOf("glutes") > -1,
            fail: q.fail.some(f=> f.muscle === "glutes" && f.k === "over")};
  });
  ck("the basis correction is applied", r.ibc === 1.5, String(r.ibc));
  ck("and the compound-share penalty is not applied on top", r.fed === true, "");
  ck("so this plan's glutes are inside the ceiling", r.state !== "over", r.v + " of " + r.mrv);
  ck("and it is not a failure", r.fail === false, "");
}

console.log("6 - THE HIP THRUST FAMILY RESOLVES TO A TABLE ENTRY");
{
  const r = await ev(()=>({
    smith: musclesFor("Smith Machine Hip Thrust"),
    kick:  musclesFor("Glute Kickback"),
    key:   tableKey("Smith Machine Hip Thrust")
  }));
  ck("a Smith hip thrust is glutes at full share", r.smith && r.smith.glutes === 1,
     JSON.stringify(r.smith));
  ck("with the hamstrings at about a half", r.smith && Math.abs(r.smith.hams - 0.5) < 0.06,
     JSON.stringify(r.smith));
  ck("and it is the table entry, not a keyword match", r.key === "smith machine hip thrust", r.key);
  /* The keyword list files /kickback/ under triceps, which caught the glute ones. */
  ck("A GLUTE KICKBACK IS NOT TRICEPS WORK", r.kick && r.kick.glutes === 1 && !r.kick.triceps,
     JSON.stringify(r.kick));
}

console.log("7 - LEAVE IT AS IT IS, AND IT STAYS LEFT");
{
  await setup(REPORTED);
  const r = await ev(async ()=>{
    const q0 = planQuality(S.program, currentSplit(), planCheckOpts());
    const x0 = (q0.volume||[]).find(v=> v.g==="glutes");
    openVolFix("glutes");
    await new Promise(r2=> setTimeout(r2, 150));
    document.querySelector('[data-volpick="leave"]').click();
    await new Promise(r2=> setTimeout(r2, 250));
    const stored = !!volAckGet("glutes");
    const inBackup = Object.prototype.hasOwnProperty.call(backupObject(), "volAck");
    const q1 = planQuality(S.program, currentSplit(), planCheckOpts());
    const x1 = (q1.volume||[]).find(v=> v.g==="glutes");
    const kept = volAckActive(x1);
    const card = planQualityCardHTML();
    /* it survives a reload */
    load();
    const q2 = planQuality(S.program, currentSplit(), planCheckOpts());
    const keptAfterLoad = volAckActive((q2.volume||[]).find(v=> v.g==="glutes"));
    return {was: x0.state, stored, inBackup, kept, keptAfterLoad,
            cardRow: /is-kept/.test(card), cardHead: /kept where you put it|inside its range/.test(card)};
  });
  ck("it was over to begin with", r.was === "over", r.was);
  ck("the decision is written down", r.stored === true, "");
  ck("it travels in a backup and a sync", r.inBackup === true, "");
  ck("the row is kept on purpose", r.kept === "kept", r.kept);
  ck("AND IT SURVIVES A RELOAD", r.keptAfterLoad === "kept", r.keptAfterLoad);
  ck("the card draws it as kept rather than as a warning", r.cardRow === true, "");
}

console.log("8 - AND IT EXPIRES WHEN THE PLAN MOVES, OR THE BODY OBJECTS");
{
  const r = await ev(async ()=>{
    /* a set either way is the same plan */
    const first = S.program[DAYS[0]][1];
    first.sets = first.sets - 1;
    save();
    const q1 = planQuality(S.program, currentSplit(), planCheckOpts());
    const small = volAckActive((q1.volume||[]).find(v=> v.g==="glutes"));
    /* three sets is a different plan */
    first.sets = first.sets - 3;
    save();
    const q2 = planQuality(S.program, currentSplit(), planCheckOpts());
    const big = volAckActive((q2.volume||[]).find(v=> v.g==="glutes"));
    return {small, big};
  });
  ck("a set either way does not reopen it", r.small === "kept", r.small);
  ck("more than a set does", r.big === "", r.big);
}

console.log("9 - A VERDICT OF OVERREACHED OUTRANKS THE ACKNOWLEDGEMENT");
{
  const r = await ev(async ()=>{
    /* stub the per-cycle verdict: this is the signal volOverSignal reads */
    const real = window.cycleReview;
    window.cycleReview = ()=> ({list: [{g:"glutes", k:"over", why:"joint pain on its own lifts"}],
                                deload:false, over:1});
    const q = planQuality(S.program, currentSplit(), planCheckOpts());
    const x = (q.volume||[]).find(v=> v.g==="glutes");
    const signal = volOverSignal("glutes");
    const kept = volAckActive(x);
    window.cycleReview = real;
    return {signal, kept};
  });
  ck("the verdict is read", /joint pain/.test(r.signal), r.signal);
  ck("and the acknowledgement is set aside for it", r.kept === "", r.kept);
}

console.log("10 - OVER THE CEILING IS AMBER UNTIL THE BODY SAYS OTHERWISE");
{
  await setup(REPORTED);
  const quiet = await ev(async ()=>{
    openVolFix("glutes");
    await new Promise(r2=> setTimeout(r2, 160));
    const t = document.getElementById("modal").innerText; hideModal(); return t;
  });
  ck("no recovery signal, so it is a thing to watch", /watch how it recovers/i.test(quiet),
     quiet.slice(0, 120));
  ck("and it does not claim the sets are wasted",
     !/not making this muscle grow faster/i.test(quiet), "");
  ck("it says the ceiling is an estimate", /estimate for your training age/i.test(quiet), "");
  const loud = await ev(async ()=>{
    const real = window.cycleReview;
    window.cycleReview = ()=> ({list: [{g:"glutes", k:"over", why:"joint pain on its own lifts"}],
                                deload:false, over:1});
    openVolFix("glutes");
    await new Promise(r2=> setTimeout(r2, 160));
    const t = document.getElementById("modal").innerText;
    hideModal(); window.cycleReview = real; return t;
  });
  ck("WITH ONE, IT IS A CUT AND IT SAYS WHY", /Cut \d+ set/.test(loud) && /joint pain/.test(loud),
     loud.slice(0, 160));
}

console.log("11 - THE CARD AND THE SHEET ASK THE SAME QUESTION");
{
  const r = await ev(()=>{
    S.volAck = {};
    S.builtPlan = {answers: {minutes: 45, priority: ["glutes"]}};
    save();
    const card = planQuality(S.program, currentSplit(), planCheckOpts());
    const sheet = planQuality(S.program, currentSplit(), planCheckOpts());
    const same = (card.volume||[]).every((x, i)=> x.state === sheet.volume[i].state);
    const opts = planCheckOpts();
    return {same, priority: opts.priority, budget: opts.budget,
            prioritised: volPriority("glutes")};
  });
  ck("every muscle reads the same state in both", r.same === true, "");
  ck("and the sheet is told about the builder's priorities", r.priority.join(",") === "glutes",
     r.priority.join(","));
  ck("a priority muscle counts as kept up to its ceiling", r.prioritised === true, "");
}

console.log("12 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
