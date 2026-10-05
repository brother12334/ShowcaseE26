/* Phase 8, part 1: weekly-target streaks (brief build item 4). */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
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
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off';
  S.splitId=DEFAULT_SPLIT; applySplit();
  /* Three training days, four sets each, so the week asks for a known number. */
  DAYS.forEach(wid=>{ S.program[wid] = [
    {name:"Barbell Bench Press", sets:4, reps:"6-10", rpes:[7,8,8,9]},
    {name:"Lat Pulldown", sets:4, reps:"8-12", rpes:[7,8,8,9]}]; });
  save();
});
const ev = (fn, arg) => p.evaluate(fn, arg);

/* ONE SEEDING HELPER, INSTALLED IN THE PAGE, so every block below describes weeks in
   the plan's own terms: "a full week" is however many sessions and sets this plan asks
   for, read from plannedSessionsPerWeek() rather than hard-coded, because the default
   split's day count is not this spec's business. */
await ev(()=>{
  window.__mon = k=>{
    const d = new Date(); d.setHours(12,0,0,0);
    const back = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - back - k * 7);
    return d;
  };
  /* weeks: [[weeksAgo, shareOfSessions, shareOfSets], ...] — 1 means "all of them". */
  window.__seed = weeks=>{
    S.sessions = []; S.dayFlags = {}; S.streakMarks = {};
    delete S.deload; delete S.streak;
    const P = plannedSessionsPerWeek();
    const per = Math.ceil(plannedSetsPerWeek() / Math.max(1, P));
    weeks.forEach(([w, sShare, setShare])=>{
      const n = Math.round(P * sShare);
      const sets = Math.max(0, Math.round(per * (setShare == null ? 1 : setShare)));
      for(let i = 0; i < n; i++){
        const d = window.__mon(w); d.setDate(d.getDate() + i);
        const at = d.getTime();
        S.sessions.push({id:"s"+w+"_"+i, workoutId: ROTATION[i % ROTATION.length],
          date: dayStr(at), startedAt: at, finishedAt: at + 3600e3, feel: 4,
          entries:[{name:"Barbell Bench Press",
            sets: Array.from({length: sets}, ()=> ({weight:"150", reps:"8", rpe:"8", done:true}))}]});
      }
    });
    S.sessions.sort((a,b)=> a.startedAt - b.startedAt);
    delete S.streak;
    save();
    return {P, per, plannedSets: plannedSetsPerWeek()};
  };
  window.__read = w=> streakWeekRead(streakWeekKeyAt(Date.now() - w*7*86400000),
                                     plannedSessionsPerWeek(), plannedSetsPerWeek());
  return true;
});

console.log("1 - WHAT THE WEEK ASKS FOR COMES FROM THE PLAN");
{
  const r = await ev(()=> ({per: plannedSessionsPerWeek(), sets: plannedSetsPerWeek(),
                            days: DAYS.length, share: STREAK_SET_SHARE}));
  ck("the session target is the plan's training days", r.per === r.days, r.per + " vs " + r.days);
  ck("the set target is those sessions' sets", r.sets === r.per * 8, r.sets + " for " + r.per);
  ck("and a week needs 75% of them", r.share === 0.75, String(r.share));
}

console.log("2 - A WEEK IS HIT ON SESSIONS AND SETS TOGETHER");
{
  const full = await ev(()=>{ __seed([[1, 1, 1]]); return __read(1); });
  ck("every session and every set is a hit", full.hit === true, JSON.stringify(full));
  const short = await ev(()=>{
    const P = plannedSessionsPerWeek();
    __seed([[1, (P - 1) / P, 1]]);
    return __read(1);
  });
  ck("one session short is not", short.hit === false && /sessions/.test(short.why),
     JSON.stringify(short));
  const thin = await ev(()=>{ __seed([[1, 1, 0.625]]); return __read(1); });
  ck("all the sessions at 62% of the sets is not", thin.hit === false, JSON.stringify(thin));
  const just = await ev(()=>{ __seed([[1, 1, 0.75]]); return __read(1); });
  ck("at 75% it is", just.hit === true, JSON.stringify(just));
}

console.log("3 - A DELOAD WEEK COUNTS AS HIT, AND AN ILL WEEK FREEZES");
{
  const dl = await ev(()=>{
    __seed([[1, 0.25, 0.5]]);
    const key = streakWeekKeyAt(Date.now() - 7*86400000);
    S.deload = {startedAt: Date.parse(key + "T12:00:00"), endedAt: null, reason:"plan"};
    delete S.streak;
    return __read(1);
  });
  ck("a quarter of the sessions in a deload week is still on target",
     dl.hit === true && dl.deload === true, JSON.stringify(dl));
  const ill = await ev(()=>{
    delete S.deload;
    const key = streakWeekKeyAt(Date.now() - 7*86400000);
    S.dayFlags = {}; S.dayFlags[dayStr(Date.parse(key + "T12:00:00"))] = {ill: true};
    delete S.streak;
    return __read(1);
  });
  ck("a week with an illness flag is paused, not missed",
     ill.frozen === true && ill.hit === false && ill.why === "ill", JSON.stringify(ill));
  const away = await ev(()=>{
    S.dayFlags = {};
    markStreakWeek(streakWeekKeyAt(Date.now() - 7*86400000), "away");
    return __read(1);
  });
  ck("and so is one you say you were away for",
     away.frozen === true && away.why === "away", JSON.stringify(away));
  const undo = await ev(()=>{
    markStreakWeek(streakWeekKeyAt(Date.now() - 7*86400000), null);
    return __read(1).frozen;
  });
  ck("which can be taken back", undo === false, String(undo));
}

console.log("4 - THE RUN CARRIES ACROSS A FROZEN WEEK");
{
  const r = await ev(()=>{
    /* hit, hit, nothing (away), hit, hit */
    __seed([[5,1,1],[4,1,1],[2,1,1],[1,1,1]]);
    markStreakWeek(streakWeekKeyAt(Date.now() - 3*7*86400000), "away");
    const st = streakNow();
    return {current: st.current, best: st.best, states: st.weeks.map(w=> [w.key, w.state])};
  });
  ck("four hit weeks with a paused one in the middle is a run of four",
     r.current === 4, r.current + " " + JSON.stringify(r.states));
  ck("and the paused week is marked as paused",
     r.states.filter(x=> x[1] === "frozen").length === 1, JSON.stringify(r.states));
}

console.log("5 - A MISSED WEEK BREAKS IT, UNLESS A GRACE WEEK COVERS IT");
{
  const r = await ev(()=>{
    const run = weeks=>{
      __seed(weeks);
      const st = streakNow();
      return {current: st.current, best: st.best, grace: st.grace, earned: st.earned,
              spent: st.spent, hits: st.hits, states: st.weeks.map(w=> w.state)};
    };
    const early = run([[5,1,1],[4,1,1],[3,1,1],[2,0,0],[1,1,1]]);
    const later = run([[12,1,1],[11,1,1],[10,1,1],[9,1,1],[8,1,1],[7,1,1],[6,1,1],
                       [5,1,1],[4,1,1],[3,0,0],[2,1,1],[1,1,1]]);
    return {early, later, every: STREAK_GRACE_EVERY, max: STREAK_GRACE_MAX};
  });
  ck("a grace week is earned every eight", r.every === 8 && r.max === 2, r.every + "/" + r.max);
  ck("with none banked, a missed week starts the count again",
     r.early.current === 1 && r.early.states.indexOf("miss") > -1,
     r.early.current + " " + JSON.stringify(r.early.states));
  ck("eight hit weeks earn one", r.later.earned >= 1, JSON.stringify(r.later));
  ck("and it is spent on the week that came up short",
     r.later.spent === 1 && r.later.states.indexOf("graced") > -1,
     JSON.stringify(r.later.states));
  ck("so the run carries through it", r.later.current >= 10,
     r.later.current + " of " + r.later.states.length);
  const cap = await ev(()=>{
    const weeks = [];
    for(let w = 30; w >= 1; w--) weeks.push([w, 1, 1]);
    __seed(weeks);
    const st = streakNow();
    return {grace: st.grace, earned: st.earned, hits: st.hits, next: st.nextGraceIn};
  });
  ck("never more than two are banked", cap.grace === 2, JSON.stringify(cap));
  ck("and with a full bank nothing more is counted down", cap.next == null, String(cap.next));
}

console.log("6 - THE WEEK IN PROGRESS NEVER BREAKS ANYTHING");
{
  const r = await ev(()=>{
    /* Last week and the one before it, both hit, and this week still going. A week with
       nothing in it is a miss, so the run has to be seeded right up to last week. */
    __seed([[2,1,1],[1,1,1]]);
    const st = streakNow();
    const live = st.weeks[st.weeks.length - 1];
    return {current: st.current, liveState: live.state, key: live.key,
            thisWeek: streakWeekKey(todayStr())};
  });
  ck("this week is the last block on the strip", r.key === r.thisWeek, r.key + " / " + r.thisWeek);
  ck("it is marked as live rather than missed", r.liveState === "live", String(r.liveState));
  ck("and the run is intact", r.current === 2, String(r.current));
}

console.log("7 - THE UI SAYS NOTHING SHAMING, AND NOTHING AT ZERO");
{
  const r = await ev(()=>{
    S.sessions = []; delete S.streak;
    const empty = streakChipHTML();
    __seed([[3,1,1],[2,1,1],[1,1,1]]);
    const chip = streakChipHTML();
    const strip = streakStripHTML();
    return {empty, chip, strip, blocks: (strip.match(/data-streakweek=/g) || []).length};
  });
  ck("no sessions means no chip at all", r.empty === "", r.empty);
  ck("a run of three says so", /3<\/span>/.test(r.chip) && /weeks on target/.test(r.chip),
     r.chip.slice(0,160));
  ck("the strip shows one block a week", r.blocks >= 3 && r.blocks <= 12, String(r.blocks));
  ck("nothing on it is a flame, a zero or a telling-off",
     !/flame|\u{1F525}|don't break|broke your|failed|0 weeks/iu.test(r.chip + r.strip),
     (r.chip + r.strip).slice(0,200));
  ck("and it explains what a week needs", /75% of the sets/.test(r.strip), r.strip.slice(0,300));
  const lim = await ev(()=> STREAK_WEEKS_SHOWN);
  ck("twelve weeks are shown", lim === 12, String(lim));
}

console.log("8 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
