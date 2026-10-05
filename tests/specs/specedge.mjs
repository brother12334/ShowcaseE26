import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
const boot = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  S.spec=null; S.specPast=[]; S.deload=null;
  const day=86400000, now=Date.now(); S.sessions=[]; let n=0;
  for(let i=84;i>=1;i--){ if(i%4===0) continue;
    const wid=ROTATION[n%ROTATION.length]; n++;
    const ents=(planSlotList(wid)||[]).slice(0,5); if(!ents.length) continue;
    S.sessions.push({id:"s"+i, date:new Date(now-i*day).toLocaleDateString("en-CA"),
      workoutId:wid, startedAt:now-i*day, finishedAt:now-i*day+36e5, feel:4,
      entries:ents.map(e=>({name:e.name, reps:"8",
        sets:[0,1,2].map(k=>({weight:String(120+k*5), reps:"8", rpe:"8", done:true}))}))}); }
  S.cycleStart = now - 2*day; save();
  const A = bodyAnalysis();
  specStart(specPlan(["chest"], A));
  return !!specActive();
});
await boot();

console.log("1 - WHAT YOU ARE EATING CHANGES THE STEP AT ONCE");
{
  const r = await p.evaluate(()=>{
    const was = S.spec.step;
    const changed = specGoalChanged("lose");
    const now = S.spec.step;
    const logged = (S.spec.log||[]).some(x=> x.k === "step");
    const again = specGoalChanged("lose");
    return {was, now, changed, logged, again, back: (specGoalChanged("gain"), S.spec.step)};
  });
  ck("maintenance was 2 a week", r.was === 2, String(r.was));
  ck("fat loss drops it to 1 immediately", r.changed && r.now === 1, JSON.stringify(r));
  ck("with a line saying why", r.logged, String(r.logged));
  ck("saying it twice changes nothing", r.again === false, String(r.again));
  ck("and going back to a surplus restores it", r.back === 2, String(r.back));
}

console.log("2 - A CYCLE THAT CHANGES LENGTH MOVES NOTHING BUT THE COUNT");
{
  const r = await p.evaluate(()=>{
    const before = {planned: S.spec.cyclesPlanned, target: S.spec.per.chest.target,
                    weeks: S.spec.weeks};
    S.splitId = Object.keys(SPLITS).find(k=> k !== DEFAULT_SPLIT) || DEFAULT_SPLIT;
    applySplit();
    const moved = specRetime();
    return {before, moved, after: {planned: S.spec.cyclesPlanned,
            target: S.spec.per.chest.target, weeks: S.spec.weeks},
            len: specCycleLen(),
            logged: (S.spec.log||[]).some(x=> x.k === "retime")};
  });
  ck("the weekly target is untouched", r.after.target === r.before.target,
     r.before.target + " -> " + r.after.target);
  ck("the block is still the same number of weeks", r.after.weeks === r.before.weeks,
     r.before.weeks + " -> " + r.after.weeks);
  if(r.moved) ck("and the cycle count was refigured", r.logged, String(r.logged));
  else ck("and nothing moved because the length did not", !r.logged, String(r.logged));
}

console.log("3 - A RUN OF MISSED SESSIONS PAUSES IT AND ASKS");
{
  const r = await p.evaluate(()=>{
    const quiet = specMissCheck();
    const day = 86400000;
    S.sessions.forEach(sx=>{ sx.finishedAt -= 40*day; sx.startedAt -= 40*day; });
    const now = specMissCheck();
    return {quiet, now, paused: !!S.spec.pausedAt, why: S.spec.pauseWhy};
  });
  ck("training normally, nothing happens", r.quiet === null, JSON.stringify(r.quiet));
  ck("gone for two cycles, it pauses", r.now && r.now.paused && r.paused, JSON.stringify(r.now));
  ck("and asks rather than deciding for you", /Pick it back up, or finish it/.test((r.now||{}).ask||""),
     (r.now||{}).ask);
}

console.log("4 - PAUSING EXTENDS THE BLOCK BY WHAT IT COST, UP TO A LIMIT");
{
  const r = await p.evaluate(()=>{
    const planned = S.spec.cyclesPlanned;
    S.spec.pausedAt = Date.now() - 10*86400000;     // ten days off
    specResume();
    const after = S.spec.cyclesPlanned;
    S.spec.pausedAt = Date.now() - 90*86400000;     // and then an absurd one
    specResume();
    return {planned, after, capped: S.spec.extendMs / (7*86400000), paused: S.spec.pausedAt};
  });
  ck("it is running again", r.paused === 0, String(r.paused));
  ck("the time off is given back", r.after >= r.planned, r.planned + " -> " + r.after);
  ck("but never more than two weeks of it", r.capped <= 2.001, String(r.capped));
}

console.log("5 - FATIGUE SUGGESTS A STEP DOWN BEFORE IT FREEZES ANYTHING");
{
  const r = await p.evaluate(()=>{
    S.spec.pausedAt = 0;
    S.spec.setting = "BALANCED";
    S.spec.settingLog = [{at: Date.now(), to: "BALANCED", why: "test"}];
    /* claim that half the sessions this cycle came in needing lighter work */
    S.spec.cutSessions = 3; S.spec.cycleSessions = 6;
    const gf = specGlobalFatigue(S.spec);
    S.spec.lastRun = 0;
    const one = specRunCycle(Date.now());
    const pending = S.spec.pendingSetting;
    return {gf, one, pending, frozen: S.spec.freeze, setting: specSetting(S.spec)};
  });
  ck("it counts as whole-body fatigue", r.gf.on, JSON.stringify(r.gf));
  ck("Balanced is asked to drop to Focus rather than frozen",
     r.pending && r.pending.to === "FOCUS", JSON.stringify(r.pending));
  ck("the suggestion says why", (r.one.notes||[]).some(n=> n.k === "suggest" && /lighter work/.test(n.say)),
     JSON.stringify(r.one.notes));
  ck("and nothing is frozen on the first ask", r.frozen === 0, String(r.frozen));
  ck("nor is the setting changed behind your back", r.setting === "BALANCED", r.setting);
}

console.log("5b - IGNORE IT AND IT STOPS ADDING VOLUME, RATHER THAN REARRANGING YOUR TRAINING");
{
  const r = await p.evaluate(()=>{
    S.spec.lastRun = 0;
    const two = specRunCycle(Date.now() + 10*86400000);
    return {two, frozen: S.spec.freeze, setting: specSetting(S.spec),
            declined: S.spec.declined, live: !!specActive()};
  });
  ck("the second cycle freezes progression", r.frozen >= 1, String(r.frozen));
  ck("and says what would un-freeze it",
     (r.two.notes||[]).some(n=> /Progression is frozen until that changes/.test(n.say)),
     JSON.stringify(r.two.notes));
  ck("the setting is still yours", r.setting === "BALANCED", r.setting);
  ck("and the block is still running", r.live, String(r.live));
}

console.log("5c - ON FOCUS THERE IS NOWHERE TO STEP DOWN TO, SO IT FREEZES, THEN ENDS");
{
  const r = await p.evaluate(()=>{
    S.spec.setting = "FOCUS"; S.spec.freeze = 0; S.spec.pendingSetting = null;
    S.spec.cutSessions = 5; S.spec.cycleSessions = 6;
    S.spec.lastRun = 0;
    const one = specRunCycle(Date.now() + 20*86400000);
    S.spec.lastRun = 0;
    const two = specRunCycle(Date.now() + 30*86400000);
    return {one, two, live: !!specActive(), past: (S.specPast||[]).length};
  });
  ck("the first is a frozen cycle with a reason",
     r.one.frozen && (r.one.notes||[]).some(n=> n.k === "global"), JSON.stringify(r.one.notes));
  ck("the second ends the block", r.two.ended === true, JSON.stringify(r.two));
  ck("and it is over", !r.live && r.past === 1, JSON.stringify({live:r.live, past:r.past}));
}

console.log("6 - DURING A BLOCK THE PRIORITY GOES FIRST, AND A PAIR TAKES TURNS");
{
  const r = await p.evaluate(()=>{
    S.spec = null; S.specPast = [];
    const A = bodyAnalysis();
    specStart(specPlan(["chest","biceps"], A));
    const list = [{name:"Barbell Back Squat"}, {name:"Barbell Curl"},
                  {name:"Barbell Bench Press"}, {name:"Cable Tricep Extension"}];
    const a = specOrderFor(list, 0), b2 = specOrderFor(list, 1);
    return {a, b2, names: list.map(x=>x.name),
            firstA: list[a[0]].name, firstB: list[b2[0]].name};
  });
  ck("a specialized muscle is scheduled first", ["Barbell Bench Press","Barbell Curl"].includes(r.firstA),
     r.firstA);
  ck("and the pair alternates which one leads", r.firstA !== r.firstB, r.firstA + " then " + r.firstB);
  ck("everything else follows", r.a.length === 4 && r.b2.length === 4, JSON.stringify(r));
}

console.log("7 - EXERCISES STAY PUT UNLESS A JOINT SAYS OTHERWISE");
{
  const r = await p.evaluate(()=>{
    const plain = specSwapAllowed("chest", "Barbell Bench Press");
    const notSpec = specSwapAllowed("quads", "Barbell Back Squat");
    return {plain, notSpec};
  });
  ck("a specialized lift is not swapped on a whim",
     !r.plain.ok && /makes the trend readable/.test(r.plain.why), JSON.stringify(r.plain));
  ck("a muscle outside the block is unaffected", r.notSpec.ok, JSON.stringify(r.notSpec));
}

console.log("8 - WHAT YOU ACTUALLY DID IS WHAT THE NEXT DECISION READS");
{
  await boot();          // section 3 pushed the whole log 40 days back; start from a live one
  const r = await p.evaluate(()=>{
    const st = S.spec.per.chest;
    st.target = 5;                               // claim a target far under the real log
    const a = specActualVsTarget("chest");
    st.target = 99;
    const z = specActualVsTarget("chest");
    return {a, z};
  });
  ck("doing more than planned is seen and named", r.a && r.a.over, JSON.stringify(r.a));
  ck("so is doing less", r.z && r.z.under, JSON.stringify(r.z));
  ck("and the figure reported is the real one", r.a && r.a.actual === r.z.actual,
     JSON.stringify([r.a, r.z]));
}

console.log("9 - ONE OF TWO OVERREACHING CUTS ONLY THAT ONE");
{
  const r = await p.evaluate(()=>{
    const cfg = {step:1.5, ceiling:30, mrv:26, sessions:3, canAddSession:true};
    const chest = {heldFor:0, lastTrend:-3, lastSore:null, lastRespondV:20, ceiling:0};
    const bis   = {heldFor:0, lastTrend:2, lastSore:null, lastRespondV:14, ceiling:0};
    const dc = specDecide({V:24, trendPct:-3, sore:0, joint:0}, chest, cfg);
    const db = specDecide({V:16, trendPct:2.5, sore:0, joint:0}, bis, cfg);
    return {chest: dc.k, chestTo: dc.to, bis: db.k, bisAdd: db.add};
  });
  ck("the one that overreached is cut", r.chest === "over" && r.chestTo === 18, JSON.stringify(r));
  ck("and the other carries on climbing", r.bis === "up" && r.bisAdd === 1.5, JSON.stringify(r));
}

console.log("10 - A DELOAD YOU ARE NOT IN DOES NOT BLOCK ANYTHING");
{
  await boot();
  const r = await p.evaluate(()=>{
    const day = 86400000;
    const look = ()=>{
      const A = bodyAnalysis();
      const el = specEligibility("chest", A);
      return (el.miss || []).some(x=> x.k === "deload");
    };
    const out = {};
    S.deload = null;                                        out.none    = look();
    S.deload = {startedAt: Date.now()};                     out.live    = look();
    S.deload = {startedAt: Date.now() - 30*day};            out.expired = look();
    S.deload = {startedAt: Date.now() - 2*day, endedAt: Date.now() - day}; out.ended = look();
    S.deload = {why:"left over from something else"};       out.noStamp = look();
    S.deload = null;
    return out;
  });
  ck("no deload at all: nothing said", r.none === false, String(r.none));
  ck("one running right now: it says so", r.live === true, String(r.live));
  ck("one that ran out weeks ago does not", r.expired === false, String(r.expired));
  ck("nor one you ended", r.ended === false, String(r.ended));
  ck("nor a record with no start on it", r.noStamp === false, String(r.noStamp));
}

console.log("10b - AND THE SETUP SCREEN AGREES WITH THE REST OF THE APP");
{
  const r = await p.evaluate(()=>{
    const day = 86400000;
    S.deload = {startedAt: Date.now() - 30*day};             // stale
    const A = bodyAnalysis();
    const says = specEligibility("chest", A).miss.map(x=> x.k);
    const app = deloadActive();
    S.deload = null;
    return {says, app};
  });
  ck("the app says no deload is running", r.app === false, String(r.app));
  ck("and the block screen does not claim one", r.says.indexOf("deload") < 0, r.says.join(","));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
