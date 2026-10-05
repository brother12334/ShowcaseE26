import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}, deviceScaleFactor:2});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} document.body.classList.remove('ai-open','onboarding'); hideModal();
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr();
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});

// when: "today" logs a finished session today, "old" logs one a week back.
const probe = (when, level)=> p.evaluate(([w, lv])=>{
  const wid=ROTATION[0], ex="Barbell Row";
  const day = w==="today" ? todayStr()
            : new Date(Date.now()-7*86400e3).toLocaleDateString("en-CA");
  const ago = w==="today" ? 0 : 7*86400e3;
  S.sessions=[{id:"s1", workoutId:wid, date:day,
    startedAt:Date.now()-ago-3600e3, finishedAt:Date.now()-ago, feel:4,
    entries:[{name:ex, reps:"8-12", sets:[
      {weight:"100", reps:"10", rpe:"8", done:true},
      {weight:"100", reps:"9", rpe:"9", done:true}]}]}];
  S.active=null; save();
  // A hand-built analysis, so each of the three states can be exercised directly.
  const A = {totals:{rec:90, fat:10, inj:0, acwr:1.0, setsWk:2, setsPrev:0},
             weak:[], modInfo:{why:[]}};
  if(lv==="caution") A.totals.fat=70;
  if(lv==="ok")      A.totals.fat=45;
  const raw = bodyStatus(A), now = bodyStatusNow(A);
  return {level:raw.level, rawAdvice:raw.advice, advice:now.advice,
          title:now.title, line:now.line, trained:!!now.trained};
}, [when, level]);

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - NOT TRAINED YET: THE ADVICE IS UNCHANGED");
for(const lv of ["good","ok","caution"]){
  const r = await probe("old", lv);
  ck(lv+" still speaks to today", r.advice===r.rawAdvice && !r.trained, r.advice);
}

console.log("2 - ALREADY TRAINED: THE TENSE IS FIXED");
for(const lv of ["good","ok","caution"]){
  const r = await probe("today", lv);
  ck(lv+" is marked as trained", r.trained && r.level===lv, JSON.stringify(r));
  ck(lv+" says the session is done", /already trained today/.test(r.advice), r.advice);
  ck(lv+" stops instructing a session", !/^(Train|Good day|A normal session)/.test(r.advice), r.advice);
}

console.log("3 - THE STATE ITSELF IS UNTOUCHED");
{
  const a = await probe("old","ok"), t = await probe("today","ok");
  ck("same title", a.title===t.title, a.title+" vs "+t.title);
  ck("same reading", a.line===t.line, a.line+" vs "+t.line);
  ck("only the advice moved", a.advice!==t.advice, t.advice);
}

console.log("4 - A SESSION IN PROGRESS PUTS THE DECISION BACK");
{
  const r = await p.evaluate(()=>{
    S.active={workoutId:ROTATION[0], entries:[], startedAt:Date.now()};
    const A = {totals:{rec:90, fat:10, inj:0, acwr:1.0, setsWk:2, setsPrev:0}, weak:[], modInfo:{why:[]}};
    const out = bodyStatusNow(A); S.active=null; return out;
  });
  ck("mid-workout still advises today", !r.trained && /today is the day/.test(r.advice), r.advice);
}

console.log("5 - IT REACHES THE ACTUAL CARD");
{
  const txt = await p.evaluate(()=>{
    S.sessions=[{id:"s1", workoutId:ROTATION[0], date:todayStr(),
      startedAt:Date.now()-3600e3, finishedAt:Date.now(), feel:4,
      entries:[{name:"Barbell Row", reps:"8-12", sets:[{weight:"100", reps:"10", rpe:"8", done:true}]}]}];
    S.active=null; save(); TAB="body"; render();
    const el=document.querySelector(".nb-says"); return el? el.innerText : "";
  });
  ck("the Body tab card says it", /already trained today/.test(txt), txt.slice(0,220));
  ck("and no longer chases a PB", !/chasing a personal best/.test(txt), txt.slice(0,220));
}

console.log("6 - A REST DAY IS NOT A DAY TO TRAIN HARD");
{
  const rest = (lv)=> p.evaluate((l)=>{
    // a clean cycle with a scheduled rest due today and nothing logged today
    S.splitId=DEFAULT_SPLIT; applySplit();
    S.prefs=Object.assign({}, S.prefs, {restMode:"fixed"});
    S.cycleStart=Date.now()-7*86400e3;
    S.restDays=[todayStr()]; S.restDeleted=[]; S.sessions=[];
    const wid=ROTATION[0];
    for(let i=1;i<=3;i++) S.sessions.push({id:"s"+i, workoutId:wid,
      date:new Date(Date.now()-i*86400e3).toLocaleDateString("en-CA"),
      startedAt:Date.now()-i*86400e3-3600e3, finishedAt:Date.now()-i*86400e3, feel:4,
      entries:[{name:"Barbell Row", reps:"8-12", sets:[{weight:"100",reps:"10",rpe:"8",done:true}]}]});
    S.active=null; save();
    const A={totals:{rec:90,fat:10,inj:0,acwr:1.0,setsWk:3,setsPrev:0},weak:[],modInfo:{why:[]}};
    if(l==="caution") A.totals.fat=70;
    if(l==="ok")      A.totals.fat=45;
    const raw=bodyStatus(A), now=bodyStatusNow(A);
    return {restToday:isRestToday(), level:raw.level, raw:raw.advice, advice:now.advice,
            resting:!!now.resting, title:now.title, line:now.line};
  }, lv);
  let r = await rest("good");
  ck("the app agrees it is a rest day", r.restToday, JSON.stringify(r));
  ck("marked as resting", r.resting, JSON.stringify(r));
  ck("it no longer says train hard", !/train hard/i.test(r.advice), r.advice);
  ck("it says it is a rest day", /rest day/i.test(r.advice), r.advice);
  ck("and the state itself is unchanged", r.title==="Doing well" && /recovered/.test(r.line),
     r.title+" / "+r.line);
  console.log("     " + r.advice);
  for(const lv of ["ok","caution"]){
    r = await rest(lv);
    ck(lv+" gets its own wording", r.resting && /rest day/i.test(r.advice) && r.advice!==r.raw, r.advice);
  }
}

console.log("7 - TRAINING ON A REST DAY OUTRANKS THE SCHEDULE");
{
  const r = await p.evaluate(()=>{
    S.restDays=[todayStr()];                       // recorded as rest
    S.sessions=(S.sessions||[]).concat([{id:"t", workoutId:ROTATION[0], date:todayStr(),
      startedAt:Date.now()-3600e3, finishedAt:Date.now(), feel:4,
      entries:[{name:"Barbell Row", reps:"8-12", sets:[{weight:"100",reps:"10",rpe:"8",done:true}]}]}]);
    S.active=null; save();
    const A={totals:{rec:90,fat:10,inj:0,acwr:1.0,setsWk:3,setsPrev:0},weak:[],modInfo:{why:[]}};
    const now=bodyStatusNow(A);
    return {trained:!!now.trained, resting:!!now.resting, advice:now.advice};
  });
  ck("what you did wins", r.trained && !r.resting, JSON.stringify(r));
  ck("and it says so", /already trained today/.test(r.advice), r.advice);
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
