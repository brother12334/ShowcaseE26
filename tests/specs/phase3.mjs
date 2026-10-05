/* Phase 3 of the Plan Builder brief: progression. H1 at-load sets, H2 the bodyweight
   rule, H3 the jump cap and the rep stretch, H4 the cut from an e1RM, H6 the uncapped
   self-comparison index, H8 auto-apply and one load for the boxes and the warm-up, L3
   messages about the sets they were read off, L4 bodyweight ladders, M7 compound rest. */
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
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off';
  /* An experienced profile. Phase 4 holds a beginner's compounds to RPE 8 for six weeks
     and any movement's first session to RPE 7; both are tested in phase4.mjs, and here
     they would simply stop every fixture from earning anything. */
  S.expManual = "intermediate"; S.priorTrainingWeeks = 200; save();
  window.WID = Object.keys(S.program)[0];
  /* H7's first-exposure ceiling means a movement has to have been performed once before
     a session on it can earn a raise, so every fixture gets one session behind it. */
  window.seen = (name, w)=> ({id:"seen-"+name, date: todayStr(), startedAt: Date.now()-7*864e5,
    entries:[{name, sets:[Object.assign({reps:"8", rpe:"8", done:true},
              w == null ? {} : {weight:String(w)})]}]});
  window.plan = (e)=>{ S.program[WID] = [e]; save(); return e; };
  window.sess = ()=> ({id:"x", date: todayStr(), startedAt: Date.now(), entries:[]});
});
const ev = (fn, arg) => p.evaluate(fn, arg);

console.log("1 - H1: THE SETS AT THE TOP LOAD ARE WHAT EARNS THE WEIGHT");
{
  const r = await ev(()=>{
    /* A SESSION ALREADY IN THE BOOK. H7 holds the first exposure to any movement to
       RPE 7, so a fixture with no history would be judged under that ceiling and never
       earn anything — which is H7 working, not H1. */
    S.sessions=[{id:"s0", date: todayStr(), startedAt: Date.now()-7*864e5,
      entries:[{name:"Barbell Bench Press", sets:[{weight:"180", reps:"8", rpe:"9", done:true}]}]}];
    plan({name:"Barbell Bench Press", reps:"6-10", sets:4, rpes:[9,9,9,9]});
    const mk = sets=> ({name:"Barbell Bench Press", reps:"6-10", rpes:[9,9,9,9], sets});
    const v = e=> { const x = progressionFor(sess(), e); return {k:x.kind, m:x.msg, s:x.sub}; };
    return {
      backoff: v(mk([{weight:"185",reps:"6",rpe:"9",done:true},
                     {weight:"185",reps:"6",rpe:"9.5",done:true},
                     {weight:"185",reps:"6",rpe:"10",done:true},
                     {weight:"150",reps:"10",rpe:"9",done:true}])),
      earned:  v(mk([{weight:"185",reps:"9",rpe:"9",done:true},
                     {weight:"185",reps:"9",rpe:"9",done:true},
                     {weight:"185",reps:"10",rpe:"9",done:true}])),
      ragged:  v(mk([{weight:"185",reps:"7",rpe:"9",done:true},
                     {weight:"185",reps:"10",rpe:"9",done:true}])),
      hot:     v(mk([{weight:"185",reps:"9",rpe:"10",done:true},
                     {weight:"185",reps:"10",rpe:"9",done:true}])),
      warm:    v(mk([{weight:"95", reps:"10",rpe:"5",done:true,warmup:true},
                     {weight:"185",reps:"10",rpe:"9",done:true}]))
    };
  });
  ck("6@9, 6@9.5, 6@10 then a lighter 10@9 is not a raise", r.backoff.k === "hold",
     r.backoff.k + " / " + r.backoff.m);
  ck("and the message is about the sets at the load, not the back-off",
     /185/.test(r.backoff.s) && /6, 6, 6/.test(r.backoff.s), r.backoff.s);
  ck("every set within a rep, last one at the top, is a raise", r.earned.k === "up", r.earned.k);
  ck("one set two reps short of the top is not", r.ragged.k === "hold", r.ragged.k + " / " + r.ragged.m);
  ck("a set at the load past its RPE target is not", r.hot.k === "hold", r.hot.k + " / " + r.hot.m);
  ck("a warm-up is not one of the sets at the load", r.warm.k === "up", r.warm.k);
}

console.log("2 - H2: A BLANK LOAD IN THE PLAN IS NOT A BODYWEIGHT MOVEMENT");
{
  const r = await ev(()=>{
    S.sessions=[];
    const pl = plan({name:"Dumbbell Reverse Fly", reps:"12-15", sets:3, rpes:[9,9,9]});
    const entry = {name:"Dumbbell Reverse Fly", reps:"12-15", rpes:[9,9,9], sets:[0,1,2].map(()=>
      ({weight:"10", reps:"15", rpe:"9", done:true}))};
    S.sessions.push({id:"s0", date: todayStr(), startedAt: Date.now()-1000, entries:[entry]});
    save();
    const up = progressionFor(sess(), entry);
    const bw = progressionStep({name:"Pull-Up", reps:"6-10"});
    return {msg: up.msg, to: up.to, step: progressionStep(pl).amount,
            bwStep: bw.amount, bwFlag: !!bw.bodyweight};
  });
  ck("a 10 lb dumbbell raise steps by 2.5, not 5", r.step === 2.5, String(r.step));
  ck("so the next load is 12.5", r.to === 12.5, r.msg);
  ck("a real bodyweight movement still takes external load", r.bwFlag && r.bwStep === 5,
     r.bwStep + " / " + r.bwFlag);
}

console.log("3 - H3: A JUMP OVER THE CAP BECOMES REPS INSTEAD");
{
  const r = await ev(()=>{
    S.sessions=[{id:"s0", date: todayStr(), startedAt: Date.now()-7*864e5,
      entries:[{name:"Dumbbell Lateral Raise", sets:[{weight:"10", reps:"12", rpe:"9", done:true}]}]}];
    S.prefs = Object.assign({}, S.prefs, {dbStep:5});
    const pl = plan({name:"Dumbbell Lateral Raise", reps:"12-15", sets:3, rpes:[9,9,9], weight:10});
    const mk = (w, reps, rr)=> ({name:"Dumbbell Lateral Raise", reps: rr || pl.reps, rpes:[9,9,9],
      sets:[0,1,2].map(()=>({weight:String(w), reps:String(reps), rpe:"9", done:true}))});
    const a = progressionFor(sess(), mk(10, 15));
    const applied = applyRepStretch("Dumbbell Lateral Raise", a.newReps, "spec");
    const mid = {reps: pl.reps, weight: pl.weight, ext: pl.repExt && pl.repExt.base};
    const bRes = progressionFor(sess(), mk(10, 20, pl.reps));
    const raised = applyProgression("Dumbbell Lateral Raise", bRes.to, null, "spec");
    return {first:{k:a.kind, m:a.msg, reps:a.newReps}, applied, mid,
            second:{k:bRes.kind, to:bRes.to}, raised,
            after:{reps: pl.reps, weight: pl.weight, ext: pl.repExt || null}};
  });
  ck("a 5 lb step on a 10 lb raise is 50%, so the range stretches to 12-20",
     r.first.k === "stretch" && r.first.reps === "12-20", r.first.k + " / " + r.first.m);
  ck("and the load does not move", r.applied && r.mid.weight === 10 && r.mid.reps === "12-20",
     JSON.stringify(r.mid));
  ck("clearing 20 then earns the load", r.second.k === "up" && r.second.to === 15,
     JSON.stringify(r.second));
  ck("and the range goes back to what the plan asked for",
     r.raised && r.after.reps === "12-15" && r.after.weight === 15 && !r.after.ext,
     JSON.stringify(r.after));
}

console.log("4 - H4: THE CUT IS WORKED BACK FROM AN ESTIMATED 1RM");
{
  const r = await ev(()=>{
    S.sessions=[];
    plan({name:"Barbell Bench Press", reps:"6-10", sets:3, rpes:[9,9,9], weight:185});
    const entry = {name:"Barbell Bench Press", reps:"6-10", rpes:[9,9,9],
      sets:[{weight:"185", reps:"3", rpe:"10", done:true}]};
    const pr = progressionFor(sess(), entry);
    return {k: pr.kind, to: pr.detail && pr.detail.to, fix: pr.detail && pr.detail.fix,
            mirror: toohardTarget(pr)};
  });
  ck("185x3 at RPE 10 against 6-10 reps cuts to about 150",
     r.k === "toohard" && r.to >= 145 && r.to <= 155, r.k + " / " + r.to);
  ck("and the button agrees with the sentence", r.mirror === r.to, r.mirror + " vs " + r.to);
}

console.log("5 - H6: THE SELF-COMPARISON INDEX IS NOT CAPPED");
{
  const r = await ev(()=>({
    a: topE1RM([{weight:"20", reps:"12", rpe:"9", done:true}], 0),
    b: topE1RM([{weight:"20", reps:"15", rpe:"9", done:true}], 0),
    bwA: topE1RM([{reps:"12", rpe:"9", done:true}], 0),
    bwB: topE1RM([{reps:"15", rpe:"9", done:true}], 0),
    wide: setE1RM({weight:"20", reps:"25", rpe:"9"}, 0, false),
    narrow: setE1RM({weight:"20", reps:"2", rpe:"9"}, 0, false),
    estCapped: est1RM(20, 25) === 20 * (1 + 15/30)
  }));
  ck("20x12 to 20x15 reads as a gain", (r.b - r.a) / r.a > 0.004, r.a + " -> " + r.b);
  ck("a bodyweight movement still compares on reps", r.bwB > r.bwA, r.bwA + " -> " + r.bwB);
  ck("the trend window reaches 30 reps", !!r.wide, JSON.stringify(r.wide));
  ck("and still stops under 3", r.narrow === null, JSON.stringify(r.narrow));
  ck("while the estimated 1RM itself stays capped", r.estCapped, "");
}

console.log("6 - L4: BODYWEIGHT MOVEMENTS GO UP A LADDER, NOT UP IN WEIGHT");
{
  const r = await ev(()=>{
    S.sessions=[];
    const run = (name, reps, top)=>{
      S.sessions = [seen(name, null)];
      plan({name, reps, sets:3, rpes:[9,9,9]});
      const e = {name, reps, rpes:[9,9,9], sets:[0,1,2].map(()=>({reps:String(top), rpe:"9", done:true}))};
      const x = progressionFor(sess(), e);
      return {k:x.kind, m:x.msg, to:x.to, reps:x.newReps};
    };
    const out = {push: run("Push-Up","6-10",10), top: run("Ring Push-Up","6-10",10),
                 plank: run("Plank","10-15",15), pull: run("Pull-Up","6-10",10),
                 dip: run("Chest Dip","6-10",10)};
    plan({name:"Push-Up", reps:"6-10", sets:3, rpes:[9,9,9]});
    out.applied = applyHarderVariation("Push-Up", "Deficit Push-Up", "spec");
    out.now = S.program[WID][0].name;
    out.gone = S.program[WID][0].weight === undefined;
    return out;
  });
  ck("a push-up becomes a deficit push-up", r.push.k === "harder" && r.push.to === "Deficit Push-Up",
     r.push.k + " / " + r.push.m);
  ck("a plank becomes a hollow body hold", r.plank.to === "Hollow Body Hold", r.plank.m);
  ck("at the top of the ladder the reps carry it", r.top.k === "stretch" && r.top.reps === "6-15",
     r.top.k + " / " + r.top.m);
  ck("a pull-up takes added weight", r.pull.k === "up", r.pull.k + " / " + r.pull.m);
  ck("and so does a dip", r.dip.k === "up", r.dip.k + " / " + r.dip.m);
  ck("applying a rung swaps the movement and drops the old load",
     r.applied && r.now === "Deficit Push-Up" && r.gone, r.now);
}

console.log("7 - M7: A COMPOUND RESTS AT LEAST TWO MINUTES IN THE FALLBACK");
{
  const r = await ev(()=>{
    S.prefs = Object.assign({}, S.prefs, {restDefault:null});
    const of = (name, reps)=> restTargetFor({name, reps}, {reps:String(reps), rpe:"8"});
    return {squat12: of("Barbell Back Squat", 12), press15: of("Leg Press", 15),
            curl12: of("Incline Dumbbell Curl", 12), raise15: of("Dumbbell Lateral Raise", 15),
            squat5: of("Barbell Back Squat", 5)};
  });
  ck("a squat for 12 asks for two minutes", r.squat12.ideal[0] >= 120, JSON.stringify(r.squat12.ideal));
  ck("a leg press for 15 does too", r.press15.ideal[0] >= 120, JSON.stringify(r.press15.ideal));
  ck("a curl for 12 is unchanged at 90", r.curl12.ideal[0] === 90, JSON.stringify(r.curl12.ideal));
  ck("a lateral raise for 15 is unchanged at 45", r.raise15.ideal[0] === 45, JSON.stringify(r.raise15.ideal));
  ck("heavy work still asks for three minutes", r.squat5.ideal[0] >= 180, JSON.stringify(r.squat5.ideal));
}

console.log("8 - H8: THE BOXES AND THE WARM-UP READ THE SAME LOAD");
{
  const r = await ev(()=>{
    S.prefs = Object.assign({}, S.prefs, {progression:"ask", plateStep:5});
    const pl = plan({name:"Barbell Bench Press", reps:"6-10", sets:3, rpes:[9,9,9], weight:185});
    const entry = {name:"Barbell Bench Press", reps:"6-10", rpes:[9,9,9],
      sets:[0,1,2].map((_,i)=>({weight:"185", reps: i===2?"10":"9", rpe:"9", done:true}))};
    const s0 = {id:"s9", date: todayStr(), workoutId: WID, startedAt: Date.now()-86400e3,
                finishedAt: Date.now()-86400e3+3e6, entries:[entry]};
    /* the exposure before it, so the session being judged is not a first one */
    S.sessions = [seen("Barbell Bench Press", 185)];
    s0.progression = buildProgression(s0);
    S.sessions = [seen("Barbell Bench Press", 185), s0]; save();
    const earned = earnedLoadPending("Barbell Bench Press", 0);
    const box = planLoadPh({name:"Barbell Bench Press"}, entry.sets, 0);
    const warm = warmWorkingLoad({name:"Barbell Bench Press", weight:185},
                                 {workoutId: WID, anyDay:false, occ:0});
    return {earned, box, warm: warm && warm.w, src: warm && warm.src, plan: pl.weight};
  });
  ck("the raise the last session earned is found", r.earned === 200, String(r.earned));
  ck("the set box shows it", parseFloat(r.box) === 200, String(r.box));
  ck("and the warm-up ramps to the same number", r.warm === 200 && r.src === "next",
     r.warm + " / " + r.src);
  ck("while the plan still says what it said", r.plan === 185, String(r.plan));
}

console.log("9 - H8: AUTO IS THE DEFAULT, AND NOBODY IS SWITCHED OVER SILENTLY");
{
  const r = await ev(()=> ({ def: PREF_DEFAULTS.progression }));
  ck("a new profile gets auto", r.def === "auto", String(r.def));
}
{
  /* An existing profile, as it would come off disk: a setup, a history, and prefs that
     have never carried a progression key. Seeded in a page of its own, because a page
     that is already running will persist its own state over anything written underneath
     it. */
  const p2 = await (await b.newContext()).newPage();
  const errs2 = []; p2.on('pageerror', e=> errs2.push(e.message));
  await p2.route(/^https?:/, r=> r.abort());
  await p2.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X');
    localStorage.setItem('ironlog.v1', JSON.stringify({
      savedAt: Date.now() - 9e8,
      setup: {name:"Fer", goal:"muscle", level:"intermediate", gear:"full", at: Date.now()-9e8},
      prefs: {rpe:true, warmups:"auto"},          // no progression key: never chosen
      sessions: [], program: {}, tourDone: true
    }));
  });
  await p2.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await p2.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  const after = await p2.evaluate(()=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    return {pref: trainPrefs().progression, offer: S.autoProgOffer,
            card: /Weights can go up on their own/.test(autoProgCardHTML()),
            had: !!S.setup};
  });
  ck("the fixture is an existing profile", after.had, JSON.stringify(after));
  ck("somebody already training keeps being asked", after.pref === "ask", String(after.pref));
  ck("and is offered the change once, on a card", after.offer === "due" && after.card,
     after.offer + " / " + after.card);
  const took = await p2.evaluate(()=>{
    S.prefs.progression = "auto"; S.autoProgOffer = "took"; save();
    return {pref: trainPrefs().progression, card: autoProgCardHTML() === ""};
  });
  ck("taking it switches the preference and retires the card", took.pref === "auto" && took.card, "");
  /* and a profile that has already chosen "ask" is not offered anything */
  const p3 = await (await b.newContext()).newPage();
  await p3.route(/^https?:/, r=> r.abort());
  await p3.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X');
    localStorage.setItem('ironlog.v1', JSON.stringify({
      savedAt: Date.now() - 9e8,
      setup: {name:"Fer", goal:"muscle", level:"intermediate", gear:"full", at: Date.now()-9e8},
      prefs: {progression:"hold"}, sessions: [], program: {}, tourDone: true
    }));
  });
  await p3.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await p3.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  const kept = await p3.evaluate(()=> ({pref: trainPrefs().progression, offer: S.autoProgOffer || null}));
  ck("a profile that had already chosen is left alone and not asked",
     kept.pref === "hold" && kept.offer === null, JSON.stringify(kept));
  if(errs2.length){ console.log("PAGE ERRORS (migration): " + errs2.join(" | ")); bad++; }
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
