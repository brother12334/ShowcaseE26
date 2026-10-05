import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

const setup = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.prefs = Object.assign({}, S.prefs, {sides:"matchWeaker"});
  S.asymRetired={}; S.asymRetest=null;
  /* The rule runs for four weeks from the start of the plan, so the plan has to be
     young for the hint to exist at all. */
  S.planStart = Date.now() - 7*86400e3;
  const wid=ROTATION[0];
  S.program[wid]=[{name:"Cable Lateral Raise", sets:2, reps:"12-20", uni:true,
    note:"single arm, alternate L/R each set"}];
  const t=Date.now()-9*86400e3;
  S.sessions=[{id:"s1", workoutId:wid, date:new Date(t).toLocaleDateString("en-CA"),
    startedAt:t, finishedAt:t+3600e3, feel:4,
    entries:[{name:"Cable Lateral Raise", startSide:"R", sets:[
      {weight:"20", reps:"15", rpe:"8", done:true},
      {weight:"20", reps:"21", rpe:"7.5", done:true}]}]}];
  S.active={date:todayStr(), workoutId:wid, startedAt:Date.now(),
    entries:[{name:"Cable Lateral Raise", reps:"12-20", startSide:"L", uni:true,
              sets:[{weight:"", reps:"", rpe:"", done:false},
                    {weight:"", reps:"", rpe:"", done:false}]}]};
  save(); TAB="workout"; render();
  const e = S.active.entries[0];
  return {mode: sideModeFor(e), active: asymActiveFor(e),
          hint: !!document.querySelector(".asym-hint"),
          off: !!document.querySelector("[data-asymoff]")};
});

console.log("1 - THE RULE IS ON, AND THE HINT OFFERS A WAY OUT");
{
  const r = await setup();
  ck("the movement is under the rule", r.mode==="matchWeaker" && r.active, JSON.stringify(r));
  ck("the hint is drawn", r.hint, String(r.hint));
  ck("and it carries 'not on this one'", r.off, String(r.off));
}

console.log("2 - TAPPING IT TURNS THE RULE OFF FOR THAT MOVEMENT ONLY");
{
  const r = await p.evaluate(()=>{
    document.querySelector("[data-asymoff]").click();
    const e = S.active.entries[0];
    const prog = (S.program[ROTATION[0]]||[])[0];
    return {entry: e.sideMode, prog: prog.sideMode,
            active: asymActiveFor(e), hint: !!document.querySelector(".asym-hint"),
            global: trainPrefs().sides,
            stillSided: altStyle(e)};
  });
  ck("the live entry is switched", r.entry==="separate", String(r.entry));
  ck("and so is the programme, so it sticks", r.prog==="separate", String(r.prog));
  ck("the rule stops running on it", !r.active, String(r.active));
  ck("the hint is gone", !r.hint, String(r.hint));
  ck("the global setting is untouched", r.global==="matchWeaker", r.global);
  ck("and it is still logged as a one-side movement", r.stillSided==="side", String(r.stillSided));
}

console.log("3 - OTHER MOVEMENTS ARE UNAFFECTED");
{
  const r = await p.evaluate(()=>{
    const other = {name:"Dumbbell Lateral Raise", reps:"12-20", uni:true, sets:[]};
    return {mode: sideModeFor(other)};
  });
  ck("another unilateral movement still matches the weaker side", r.mode==="matchWeaker", r.mode);
}

console.log("4 - THE PLATE CARD USES THE LOAD THE BOXES SUGGEST");
{
  const r = await p.evaluate(()=>{
    const wid=ROTATION[0];
    S.program[wid]=[{name:"Smith Machine Shoulder Press", sets:2, reps:"6-10", weight:95}];
    const t=Date.now()-9*86400e3;
    S.sessions=[{id:"s2", workoutId:wid, date:new Date(t).toLocaleDateString("en-CA"),
      startedAt:t, finishedAt:t+3600e3, feel:4,
      entries:[{name:"Smith Machine Shoulder Press", barAdd:0, sets:[
        {weight:"75", reps:"8", rpe:"7.5", done:true},
        {weight:"75", reps:"8", rpe:"8", done:true}]}]}];
    S.active={date:todayStr(), workoutId:wid, startedAt:Date.now(),
      entries:[{name:"Smith Machine Shoulder Press", reps:"6-10", planWeight:95,
                sets:[{weight:"", reps:"", rpe:"", done:false},
                      {weight:"", reps:"", rpe:"", done:false}]}]};
    S.prefs = Object.assign({}, S.prefs, {plateStep:5, barMode:"total", smithWeight:25});
    save(); TAB="workout"; render();
    const card = document.querySelector(".plate-line");
    const row = document.querySelector('[data-w="0:0"], .set input');
    const en = S.active.entries[0];
    const last = lastSetsFor(S.active.workoutId, en.name, false, 0, en.startSide);
    return {card: card ? card.textContent.replace(/\s+/g," ").trim() : "(none)",
            box: planLoadPh(en, last, 0), plan: planLoadFor(en)};
  });
  console.log("     card: " + r.card);
  console.log("     boxes suggest " + r.box + ", the plan says " + r.plan);
  ck("the plan and the suggestion differ here", r.box !== r.plan, r.box+" vs "+r.plan);
  ck("and the plate card describes the suggestion",
     r.card.indexOf(String(r.box)) > -1, r.card);
  ck("not the prescription", r.card.indexOf(String(r.plan) + " lb =") !== 0, r.card);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
