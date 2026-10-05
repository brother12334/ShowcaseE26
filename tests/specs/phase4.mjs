/* Phase 4 of the Plan Builder brief: safety. H7 starting loads, per-hand flags, the
   first session's effort ceiling and feeler sets; M1 the RPE caps; M2 the beginner
   compound ceiling and its note. */
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
  S.tourDone=true; S.geo='off'; save();
  window.WID = Object.keys(S.program)[0];
});
const ev = (fn, arg) => p.evaluate(fn, arg);

console.log("1 - H7: A STARTING LOAD YOU COULD ACTUALLY LIFT, AND IN THE RIGHT UNITS");
{
  const r = await ev(()=>{
    const o = {bodyweight:180, sex:"m", level:"intermediate"};
    const g = n=> ({w: startingLoadFor(n, o), hand: startingLoadPerHand(n)});
    return {goblet: g("Goblet Squat"), lunge: g("Walking Lunge"), fly: g("Dumbbell Fly"),
            squat: g("Barbell Back Squat"), deck: g("Pec Deck"),
            raise: g("Dumbbell Lateral Raise"), bw: startingLoadFor("Push-Up", o),
            noBw: startingLoadFor("Barbell Back Squat", {sex:"m", level:"intermediate"}),
            fem: startingLoadFor("Barbell Back Squat", {bodyweight:180, level:"intermediate"}),
            beg: startingLoadFor("Barbell Back Squat", {bodyweight:180, sex:"m", level:"beginner"})};
  });
  ck("a 180 lb man starts a goblet squat at 60 or under",
     r.goblet.w <= 60 && r.goblet.w > 0 && !r.goblet.hand, JSON.stringify(r.goblet));
  ck("a walking lunge at 35 a hand or under",
     r.lunge.w <= 35 && r.lunge.w > 0 && r.lunge.hand, JSON.stringify(r.lunge));
  ck("a dumbbell fly at 25 a hand or under",
     r.fly.w <= 25 && r.fly.w > 0 && r.fly.hand, JSON.stringify(r.fly));
  ck("a pec deck is one stack, not one hand", !r.deck.hand, JSON.stringify(r.deck));
  ck("a barbell squat is still a barbell figure", r.squat.w >= 150 && !r.squat.hand,
     JSON.stringify(r.squat));
  ck("a movement with no external load has no number", r.bw === null, String(r.bw));
  ck("and neither does one with no bodyweight to scale from", r.noBw === null, String(r.noBw));
  ck("an unanswered sex takes the lower figure", r.fem < r.squat.w, r.fem + " vs " + r.squat.w);
  ck("a beginner starts lighter", r.beg < r.squat.w, r.beg + " vs " + r.squat.w);
}

console.log("2 - H7: THE FIRST SESSION ON A MOVEMENT IS HELD TO RPE 7");
{
  const r = await ev(()=>{
    S.sessions = []; S.expManual = "intermediate"; save();
    const e = {name:"Barbell Bench Press", reps:"6-10", rpes:[7,8,8,9],
               sets:[{},{},{},{}].map(()=>({weight:"135", reps:"", rpe:"", done:false}))};
    const fresh = [0,1,2,3].map(i=> rpeTargetFor(e, i));
    const line = effortCeilingLineHTML(e);
    S.sessions = [{id:"s1", date: todayStr(), startedAt: Date.now()-86400e3,
      entries:[{name:"Barbell Bench Press", sets:[{weight:"135", reps:"8", rpe:"8", done:true}]}]}];
    save();
    const known = [0,1,2,3].map(i=> rpeTargetFor(e, i));
    return {fresh, known, line: /first time|First time/i.test(line), cap: effortCeiling(e, 3)};
  });
  ck("every set of a brand-new movement asks for 7",
     r.fresh.join(",") === "7,7,7,7", r.fresh.join(","));
  ck("and the exercise says why", r.line, "");
  ck("once it has been performed the plan's own ramp is back",
     r.known.join(",") === "7,8,8,9", r.known.join(","));
}

console.log("3 - M1: COMPOUNDS STOP AT 9, AND 10 IS FOR THE LAST ISOLATION SET");
{
  const r = await ev(()=>{
    S.sessions = [{id:"s1", date: todayStr(), startedAt: Date.now()-86400e3, entries:[
      {name:"Barbell Back Squat", sets:[{weight:"100", reps:"5", rpe:"8", done:true}]},
      {name:"Leg Extension",      sets:[{weight:"100", reps:"12", rpe:"8", done:true}]}]}];
    S.expManual = "advanced"; save();
    const sq = {name:"Barbell Back Squat", reps:"5", rpes:[10,10,10], sets:[{},{},{}]};
    const le = {name:"Leg Extension", reps:"12-15", rpes:[10,10,10], sets:[{},{},{}]};
    const drop = {name:"Leg Extension", reps:"12-15", rpes:[10,10,10], sets:[{},{},{}],
                  tech:[{k:"dropset", all:true}]};
    return {squat: [0,1,2].map(i=> rpeTargetFor(sq, i)),
            iso:   [0,1,2].map(i=> rpeTargetFor(le, i)),
            tech:  [0,1,2].map(i=> rpeTargetFor(drop, i)),
            table: {abs: SLOT_RPES.abs.join(","), heavy: SLOT_RPES.heavy.join(",")},
            capped: capRpeRamp("Barbell Back Squat", [10,10,10]),
            capIso: capRpeRamp("Leg Extension", [10,10,10])};
  });
  ck("a squat written at RPE 10 is read as 9", r.squat.join(",") === "9,9,9", r.squat.join(","));
  ck("an isolation keeps its 10 on the last set only", r.iso.join(",") === "9,9,10",
     r.iso.join(","));
  ck("a drop set is left alone — it ends past failure by design",
     r.tech.join(",") === "10,10,10", r.tech.join(","));
  ck("the app's own ab ramp no longer asks for three sets after failure",
     r.table.abs === "9,9,9,10", r.table.abs);
  ck("\"3x5 to failure\" on a squat becomes [9,9,9]",
     r.capped.list.join(",") === "9,9,9" && r.capped.changed && r.capped.why === "compound",
     JSON.stringify(r.capped));
  ck("and on an isolation it becomes [9,9,10]",
     r.capIso.list.join(",") === "9,9,10" && r.capIso.why === "notLast", JSON.stringify(r.capIso));
}

console.log("4 - M2: A BEGINNER'S COMPOUNDS ARE HELD TO 8 FOR SIX WEEKS");
{
  const r = await ev(()=>{
    const sq = {name:"Barbell Back Squat", reps:"5", rpes:[9,9,9], sets:[{},{},{}]};
    const curl = {name:"Incline Dumbbell Curl", reps:"8-12", rpes:[9,9,9], sets:[{},{},{}]};
    const hist = (weeksAgo)=> [{id:"s1", date: todayStr(), startedAt: Date.now() - weeksAgo*7*864e5,
      entries:[{name:"Barbell Back Squat", sets:[{weight:"100", reps:"5", rpe:"8", done:true}]},
               {name:"Incline Dumbbell Curl", sets:[{weight:"20", reps:"10", rpe:"8", done:true}]}]}];
    const out = {};
    delete S.expManual; S.priorTrainingWeeks = 0;
    S.sessions = hist(2); save();
    out.newSquat = [0,1,2].map(i=> rpeTargetFor(sq, i));
    out.newCurl  = [0,1,2].map(i=> rpeTargetFor(curl, i));
    out.level    = inferExperience();
    out.note     = /learning|Still learning/i.test(effortCeilingLineHTML(sq));
    S.sessions = hist(9); save();
    out.laterSquat = [0,1,2].map(i=> rpeTargetFor(sq, i));
    out.laterLevel = inferExperience();
    S.priorTrainingWeeks = 200; S.sessions = hist(2); save();
    out.experienced = [0,1,2].map(i=> rpeTargetFor(sq, i));
    out.expLevel = inferExperience();
    return out;
  });
  ck("two weeks in, a beginner's squat asks for 8",
     r.level === "beginner" && r.newSquat.join(",") === "8,8,8", r.level + " / " + r.newSquat.join(","));
  ck("and the exercise says what the ceiling is for", r.note, "");
  ck("an isolation is not held back", r.newCurl.join(",") === "9,9,9", r.newCurl.join(","));
  ck("nine weeks in the ceiling has gone", r.laterSquat.join(",") === "9,9,9",
     r.laterLevel + " / " + r.laterSquat.join(","));
  ck("somebody who trained for years before the app is never a beginner here",
     r.expLevel !== "beginner" && r.experienced.join(",") === "9,9,9",
     r.expLevel + " / " + r.experienced.join(","));
}

console.log("5 - H7: A FEELER SET ON THE FIRST EXPOSURE TO ANYTHING LOADED");
{
  const r = await ev(()=>{
    S.sessions = []; S.weights = S.weights || []; S.sex = "m";
    S.weights = [{date: todayStr(), kg: null, lb: 180, at: Date.now()}];
    delete S.expManual; S.priorTrainingWeeks = 100; save();
    const loaded = {name:"Barbell Bench Press", reps:"6-10", weight:135, rpes:[7,8,8,9], sets:[{}]};
    const body   = {name:"Push-Up", reps:"6-10", rpes:[8,8,9], sets:[{}]};
    const out = {loaded: needsCalibration(loaded), body: needsCalibration(body),
                 html: calibrateHTML(loaded), feeler: feelerLoadFor(loaded)};
    S.sessions = [{id:"s1", date: todayStr(), startedAt: Date.now()-86400e3,
      entries:[{name:"Barbell Bench Press", sets:[{weight:"135", reps:"8", rpe:"8", done:true}]}]}];
    save();
    out.after = needsCalibration(loaded);
    return out;
  });
  ck("a loaded movement never performed asks for a feeler set", r.loaded, "");
  ck("a bodyweight movement does not", !r.body, "");
  ck("the note names the load and the effort",
     /135/.test(r.html) && /three reps in reserve/.test(r.html), r.html.replace(/\s+/g," ").slice(0,160));
  ck("and it stops asking once the movement has been done", !r.after, "");
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
