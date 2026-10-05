import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:1000}, permissions:[]});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X');
  /* Record what the page asks the phone to do, so the test can see the alert without a
     real notification or a real motor. */
  window.__buzz = []; window.__notes = [];
  navigator.vibrate = (x)=>{ window.__buzz.push(x); return true; };
  window.Notification = function(t, o){ window.__notes.push({t, o}); };
  window.Notification.permission = "granted";
  window.Notification.requestPermission = async ()=> "granted";
});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

const setup = (mode)=> p.evaluate((m)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  trainPrefs().restAlert = m;
  window.__buzz.length = 0; window.__notes.length = 0;
  S.active={date:todayStr(), workoutId:ROTATION[0], startedAt:Date.now(),
    entries:[{name:"Barbell Bench Press", reps:"8-12", rest:[2,4],
              sets:[{weight:"185",reps:"10",rpe:"8",done:true},
                    {weight:"185",reps:"",rpe:"",done:false}]}]};
  save();
  startRest(0, 0);
  return {mode: restAlertMode(), target: restTargetSec(),
          armed: !!S.active.restTimer};
}, mode);

console.log("1 - OFF: THE CLOCK RUNS AND SAYS NOTHING");
{
  const r = await setup("off");
  await p.waitForTimeout(2600);
  const after = await p.evaluate(()=>({buzz: window.__buzz.length, notes: window.__notes.length,
                                       alerted: !!(S.active.restTimer||{}).alerted}));
  ck("the rest target is short for this test", r.target===2, String(r.target));
  ck("no buzz", after.buzz===0, String(after.buzz));
  ck("no notification", after.notes===0, String(after.notes));
  ck("and nothing is marked", !after.alerted, String(after.alerted));
}

console.log("2 - BUZZ: IT GOES OFF WHEN THE REST IS UP, ON THE PHONE IN YOUR HAND");
{
  await setup("buzz");
  await p.waitForTimeout(2600);
  const r = await p.evaluate(()=>({buzz: window.__buzz.length, notes: window.__notes.length,
                                   alerted: !!(S.active.restTimer||{}).alerted,
                                   said: /Rest is up/.test(document.body.innerText)}));
  ck("it buzzes", r.buzz===1, String(r.buzz));
  ck("it says so on screen", r.said, String(r.said));
  ck("it does not send a notification", r.notes===0, String(r.notes));
  ck("and the rest is marked as having reached its target", r.alerted, String(r.alerted));
}

console.log("3 - IT FIRES ONCE, NOT EVERY TIME YOU LOOK");
{
  const r = await p.evaluate(()=>{ scheduleRestAlert(); fireRestAlert(); fireRestAlert();
                                   return {buzz: window.__buzz.length}; });
  ck("still one buzz", r.buzz===1, String(r.buzz));
}

console.log("4 - NOTIFY: THE PHONE GETS IT TOO");
{
  await setup("notify");
  await p.waitForTimeout(3200);        // the alert, plus the service-worker race
  const r = await p.evaluate(()=>({buzz: window.__buzz.length, n: window.__notes.length,
                                   title: (window.__notes[0]||{}).t,
                                   body: ((window.__notes[0]||{}).o||{}).body}));
  ck("it buzzes as well", r.buzz===1, String(r.buzz));
  ck("a notification is sent", r.n===1, String(r.n));
  ck("titled for what it is", /Rest is up/.test(r.title||""), r.title);
  ck("and it names the next exercise", /Barbell Bench Press/.test(r.body||""), r.body);
}

console.log("5 - STOPPING THE REST CANCELS IT");
{
  const r = await p.evaluate(async ()=>{
    trainPrefs().restAlert = "notify";
    window.__buzz.length = 0; window.__notes.length = 0;
    startRest(0, 0);
    recordRestIfRunning();                 // the next set is logged before the rest is up
    await new Promise(r2=> setTimeout(r2, 2600));
    return {buzz: window.__buzz.length, n: window.__notes.length, timer: !!S.active.restTimer};
  });
  ck("the timer is gone", !r.timer, String(r.timer));
  ck("no buzz", r.buzz===0, String(r.buzz));
  ck("and no notification", r.n===0, String(r.n));
}

console.log("6 - COMING BACK LATE DOES NOT SET IT OFF IN YOUR EAR");
{
  const r = await p.evaluate(async ()=>{
    trainPrefs().restAlert = "notify";
    window.__buzz.length = 0; window.__notes.length = 0;
    /* A rest that started well before the app was reopened. */
    S.active.restTimer = {start: Date.now() - 60000, e:0, s:0, min:true};
    save();
    restAlertCatchUp(); scheduleRestAlert();
    await new Promise(r2=> setTimeout(r2, 300));
    return {buzz: window.__buzz.length, n: window.__notes.length,
            alerted: !!S.active.restTimer.alerted};
  });
  ck("nothing buzzes about a moment that has passed", r.buzz===0, String(r.buzz));
  ck("nothing is sent", r.n===0, String(r.n));
  ck("but the rest knows it reached its target", r.alerted, String(r.alerted));
}

console.log("7 - THE SETTING IS WHERE THE WORKOUT SCREEN IS SET UP");
{
  const r = await p.evaluate(()=>{
    TAB="sync"; SET_PAGE="screen"; render();
    const opts = [...document.querySelectorAll("[data-prefrestalert]")].map(x=> x.dataset.prefrestalert);
    const t = document.body.innerText;
    return {opts, heading: /When the rest is up/.test(t),
            says: /notification you get with the phone locked/.test(t)};
  });
  ck("it is on the workout-screen page", r.heading, String(r.heading));
  ck("with three answers", r.opts.join(",")==="off,buzz,notify", r.opts.join(","));
  ck("and it says what the phone one does", r.says, String(r.says));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
