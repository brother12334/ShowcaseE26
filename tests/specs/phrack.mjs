import { chromium, APP_URL } from './_e26.mjs';
/* "I DON'T EVEN HAVE 55 LB DUMBBELL BUT IT KEEPS SAYING THIS."

   Photographed: the set boxes on a single-arm row offering 55, on a rack that ends at 50,
   with the app's own ceiling set to 50.

   capToRack() has enforced that ceiling since it was written and roundLoadable() calls
   it, so every load the app PROPOSES through the ordinary path respects it. The
   placeholder did not go through that path: it returns whichever is the better answer of
   the plan, the raise the last session earned, and what you lifted last time, and none of
   the three was ever put against the rack. One tap on an empty row copies the placeholder
   into the set, so the number most likely to be lifted was the one nobody checked. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const ev=(fn,a)=>p.evaluate(fn,a);

/* name, plan weight, last session's set loads, and whether a ceiling is known */
const boot = (o)=> ev(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off',
                                      dbStep:5, plateStep:2.5, dbMax: a.o.dbMax});
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], d=86400000;
  S.program[wid]=[{name:a.o.name, sets:3, reps:"8-12", weight:a.o.plan, rpe:"7-9"}];
  S.sessions=[{id:"s1", workoutId:wid, date:dayStr(Date.now()-7*d),
    startedAt:Date.now()-7*d, finishedAt:Date.now()-7*d+3600e3,
    entries:[{name:a.o.name, reps:"8-12", rpe:"7-9",
      sets:a.o.did.map(w=>({weight:String(w), reps:"9", rpe:"8", done:true}))}]}];
  save(); S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
  return {boxes: [...document.querySelectorAll('.set input[data-f="weight"]')].map(x=> x.placeholder),
          rack: rackMaxNow()};
}, {o});

console.log("1 - THE REPORTED CARD: A RACK THAT ENDS AT 50");
{
  const r = await boot({name:"Single-Arm Dumbbell Row", plan:50, did:[50,55,55], dbMax:50});
  console.log("   ", JSON.stringify(r));
  ck("the ceiling is known", r.rack === 50, String(r.rack));
  ck("NO BOX OFFERS A DUMBBELL THAT IS NOT THERE",
     r.boxes.every(x=> parseFloat(x) <= 50), JSON.stringify(r.boxes));
  ck("and it offers the heaviest that is", r.boxes.some(x=> parseFloat(x) === 50),
     JSON.stringify(r.boxes));
}

console.log("2 - A PLAN WRITTEN ABOVE THE RACK IS CAPPED TOO");
{
  const r = await boot({name:"Single-Arm Dumbbell Row", plan:70, did:[45,45,45], dbMax:50});
  console.log("   ", JSON.stringify(r));
  ck("nothing over the top of the rack", r.boxes.every(x=> parseFloat(x) <= 50),
     JSON.stringify(r.boxes));
}

console.log("3 - WITH NO CEILING SAID, NOTHING IS INVENTED");
/* The app cannot know what it has not been told, and guessing a ceiling would cap
   somebody's real progression. */
{
  const r = await boot({name:"Single-Arm Dumbbell Row", plan:50, did:[50,55,55], dbMax:null});
  console.log("   ", JSON.stringify(r));
  ck("no ceiling", !(r.rack > 0), String(r.rack));
  ck("so the heavier number is still offered", r.boxes.some(x=> parseFloat(x) === 55),
     JSON.stringify(r.boxes));
}

console.log("4 - AND A BARBELL IS NOT A DUMBBELL RACK");
/* capToRack is for the gear that comes in fixed sizes. A bar takes whatever you load. */
{
  const r = await boot({name:"Barbell Bench Press", plan:185, did:[185,185,185], dbMax:50});
  console.log("   ", JSON.stringify(r));
  ck("the bar is untouched by the dumbbell ceiling",
     r.boxes.every(x=> parseFloat(x) === 185), JSON.stringify(r.boxes));
}

console.log("5 - TICKING AN EMPTY ROW CANNOT LOG A WEIGHT THAT DOES NOT EXIST");
/* Which is why this matters: the placeholder is what the tick copies in. */
{
  const r = await ev(()=>{
    const wid=ROTATION[0], d=86400000;
    S.prefs.dbMax = 50; S.prefs.dbStep = 5;
    S.program[wid]=[{name:"Single-Arm Dumbbell Row", sets:3, reps:"8-12", weight:50, rpe:"7-9"}];
    S.sessions=[{id:"s2", workoutId:wid, date:dayStr(Date.now()-7*d),
      startedAt:Date.now()-7*d, finishedAt:Date.now()-7*d+3600e3,
      entries:[{name:"Single-Arm Dumbbell Row", reps:"8-12", rpe:"7-9",
        sets:[55,55,55].map(w=>({weight:String(w), reps:"9", rpe:"8", done:true}))}]}];
    save(); S.active=null; startWorkout(wid); PF=null;
    const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
    render();
    const en = S.active.entries[0];
    const st = en.sets[0];
    st.reps = "9";                      // a rep count, no weight: the tick takes the box
    save(); render();
    const box = document.querySelector('.set input[data-f="weight"]');
    return {ph: box.placeholder};
  });
  console.log("   ", JSON.stringify(r));
  ck("the number waiting to be copied in is one you own", parseFloat(r.ph) <= 50, r.ph);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
