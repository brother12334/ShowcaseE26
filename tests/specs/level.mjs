/* A STATED TRAINING LEVEL HAS TO SURVIVE THE FIRST SESSION.

   The importer asked how long you had been training, wrote the answer to S.setup.level
   and S.experience, and never wrote it in weeks. inferExperience() reads weeks. So the
   label held right up until there was a log to measure, and then trainingAgeWeeks()
   returned "three days" and an advanced lifter was handed a beginner's volume targets,
   set counts and starting loads. */
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
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open','news-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.seenNews='x'; S.tourDone=true; S.geo='off';
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
  /* Wipe back to a profile that has answered nothing. */
  window.__blank = ()=>{
    delete S.priorTrainingWeeks; delete S.priorAsked; delete S.expManual;
    delete S.experience; delete S.lmCalSeeded;
    S.sessions = []; saveQuiet();
  };
  /* One session, logged today — the event that used to lose the answer. */
  window.__logOne = ()=>{
    const at = Date.now() - 2 * 3600e3;
    S.sessions = [{id:"s1", workoutId: ROTATION[0], date: dayStr(at), startedAt: at,
      finishedAt: at + 3600e3, feel: 4,
      entries:[{name:"Barbell Bench Press",
        sets:[{weight:"150", reps:"8", rpe:"8", done:true}]}]}];
    saveQuiet();
  };
});
const ev = (fn,a)=> p.evaluate(fn,a);

console.log("1 - THE MAP ITSELF");
{
  const r = await ev(()=> ({w: LEVEL_WEEKS, d: DEFAULT_PRIOR_WEEKS,
    lvl: ["beginner","intermediate","advanced"].map(l=> [l, levelToWeeks(l)]),
    junk: levelToWeeks("not a level"), none: levelToWeeks(null)}));
  ck("beginner is 26 weeks", r.w.beginner === 26, JSON.stringify(r.w));
  ck("intermediate is 104", r.w.intermediate === 104, JSON.stringify(r.w));
  ck("advanced is 260", r.w.advanced === 260, JSON.stringify(r.w));
  ck("an unknown level falls to 104", r.junk === 104 && r.none === 104, JSON.stringify(r));
  ck("and that is the stated default", r.d === 104, String(r.d));
}
{
  /* The weeks have to land inside the band the word means, or the two halves of the app
     disagree about who somebody is. */
  const r = await ev(()=> ["beginner","intermediate","advanced"].map(l=>{
    window.__blank();
    S.priorTrainingWeeks = levelToWeeks(l);
    return [l, inferExperience()];
  }));
  ck("each level's weeks read back as that level",
     r.every(([want, got])=> want === got), JSON.stringify(r));
}

console.log("2 - THE IMPORTER'S ANSWER SURVIVES A LOGGED SESSION");
{
  const r = await ev(()=>{
    window.__blank();
    /* Exactly what aiApply does with the starting-load answers. */
    const sAns = {level:"advanced"};
    S.setup = Object.assign({}, S.setup, {level: sAns.level});
    S.experience = sAns.level;
    notePriorWeeks(levelToWeeks(sAns.level));
    const before = inferExperience();
    const weeks = S.priorTrainingWeeks;
    window.__logOne();
    return {before, weeks, after: inferExperience(), age: Math.round(trainingAgeWeeks())};
  });
  ck("advanced before any session", r.before === "advanced", r.before);
  ck("the answer is stored in weeks, not just as a word", r.weeks === 260, String(r.weeks));
  ck("STILL ADVANCED AFTER LOGGING A SESSION", r.after === "advanced", r.after);
  ck("because the training age counts the years before the app", r.age >= 260, String(r.age));
}
{
  const r = await ev(()=>{
    window.__blank();
    S.setup = Object.assign({}, S.setup, {level:"beginner"});
    notePriorWeeks(levelToWeeks("beginner"));
    window.__logOne();
    return {lvl: inferExperience(), weeks: S.priorTrainingWeeks};
  });
  ck("a beginner is not promoted either", r.lvl === "beginner", r.lvl);
  ck("and is stored as half a year", r.weeks === 26, String(r.weeks));
}

console.log("3 - A SKIPPED BUILDER QUESTION IS WORTH 104, NOT 0");
{
  const r = await ev(()=>{
    window.__blank();
    /* buildAnswers derives a level when the training age is skipped. */
    const a = buildAnswers({goal:"muscle", gear:"full", days:4, minutes:60});
    const derived = a.level, weeks = a.trainingWeeks;
    notePriorWeeks(levelToWeeks(a.level));
    window.__logOne();
    return {derived, weeks, stored: S.priorTrainingWeeks, lvl: inferExperience()};
  });
  ck("a skipped training age still has no number of its own", r.weeks === null, String(r.weeks));
  ck("the level it derives is intermediate", r.derived === "intermediate", r.derived);
  ck("104 weeks is stored", r.stored === 104, String(r.stored));
  ck("and the level holds after a session", r.lvl === "intermediate", r.lvl);
}

console.log("4 - \"RATHER NOT SAY\" IS AN ANSWER");
{
  const r = await ev(async ()=>{
    window.__blank();
    window.__logOne();                       // the question is only asked once there is a log
    const due = priorTrainingAskDue();
    openPriorTrainingAsk();
    await new Promise(r=> setTimeout(r, 60));
    const btn = document.getElementById("priorSkip");
    if(!btn) return {due, no:true};
    btn.click();
    await new Promise(r=> setTimeout(r, 80));
    return {due, stored: S.priorTrainingWeeks, asked: !!S.priorAsked,
            lvl: inferExperience(), again: priorTrainingAskDue()};
  });
  ck("the question is put to somebody with a log", r.due === true, JSON.stringify(r));
  ck("declining stores 104 rather than nothing", r.stored === 104, String(r.stored));
  ck("it is recorded as asked", r.asked === true, String(r.asked));
  ck("so it is never asked twice", r.again === false, String(r.again));
  ck("and they read as intermediate, not beginner", r.lvl === "intermediate", r.lvl);
}

console.log("5 - A FINER ANSWER IS NEVER COARSENED BY A LATER ONE");
{
  const r = await ev(()=>{
    window.__blank();
    S.priorTrainingWeeks = 310;              // answered the real question, in weeks
    const wrote = notePriorWeeks(levelToWeeks("beginner"));
    return {wrote, kept: S.priorTrainingWeeks};
  });
  ck("an import does not overwrite a stored training age", r.wrote === false, JSON.stringify(r));
  ck("the finer number is kept", r.kept === 310, String(r.kept));
}

console.log("6 - A HAND-SET LEVEL STILL WINS OVER EVERYTHING");
{
  const r = await ev(()=>{
    window.__blank();
    notePriorWeeks(levelToWeeks("advanced"));
    S.expManual = "beginner";
    window.__logOne();
    return inferExperience();
  });
  ck("expManual is the last word", r === "beginner", r);
}

console.log("7 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
