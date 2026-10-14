import { chromium, APP_URL } from './_e26.mjs';
/* "SHOULDN'T THE RETEST EACH SIDE THING FOR THE SIDE BALANCE IN THE BODY TAB HAPPEN
   AUTOMATICALLY?"

   It should. applyAsymRetest() asks nothing of you — it reads each movement's gap off
   balanced windows and retires the rule where the gap is inside two reps — so making you
   the trigger only kept the rule on past the day the data said it should come off. The
   measurement runs itself now; the REPORT is what waits to be read. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* A plan past its four weeks, one movement whose sides have closed and one whose have
   not, each logged on both opening sides so the window is balanced. */
const seed = (opts)=> p.evaluate(o=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.priorTrainingWeeks=100; S.priorAsked=1;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, sides:"matchWeaker"});
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.asymRetired={}; S.asymRetest=null; S.active=null;
  S.planStart = Date.now() - 70*86400e3;              // well past the four weeks
  const wid=ROTATION[0];
  S.program[wid]=[
    {name:"Cable Lateral Raise", sets:2, reps:"12-20", uni:true, note:"single arm, alternate L/R each set"},
    {name:"Preacher Curl",       sets:2, reps:"8-12",  uni:true, note:"single arm, alternate L/R each set"}];
  S.sessions=[];
  if(!o.noData){
    /* Four sessions each, opening side flipped, so balancedWindow() has something to read.
       Lateral raise: both arms level. Preacher curl: the right is miles ahead. */
    const mk=(n, side, ex, r1, r2)=>{
      const t=Date.now()-n*86400e3;
      S.sessions.push({id:ex+n, workoutId:wid, date:new Date(t).toLocaleDateString("en-CA"),
        startedAt:t, finishedAt:t+3600e3, feel:4,
        entries:[{name:ex, startSide:side, uni:true, sets:[
          {weight:"20", reps:String(r1), rpe:"8", done:true},
          {weight:"20", reps:String(r2), rpe:"8", done:true}]}]});
    };
    mk(12,"R","Cable Lateral Raise",15,15); mk(10,"L","Cable Lateral Raise",15,15);
    mk(8, "R","Cable Lateral Raise",14,15); mk(6, "L","Cable Lateral Raise",15,14);
    mk(11,"R","Preacher Curl",14,6);  mk(9, "L","Preacher Curl",6,14);
    mk(7, "R","Preacher Curl",15,5);  mk(5, "L","Preacher Curl",5,15);
  }
  save();
  return {due: asymRetestDue(), stamped: !!(S.asymRetest && S.asymRetest.at)};
}, opts);

console.log("1 - IT RUNS WITHOUT BEING ASKED");
{
  const before = await seed({});
  ck("the re-test is due", before.due, String(before.due));
  ck("and nothing has run yet", !before.stamped, String(before.stamped));
  const r = await p.evaluate(()=>{
    const res = autoAsymRetest();
    return {res, stamped: !!(S.asymRetest && S.asymRetest.at),
            retiredLat: !!asymRetiredFor("Cable Lateral Raise"),
            retiredCurl: !!asymRetiredFor("Preacher Curl"),
            unseen: asymRetestUnseen(), due: asymRetestDue()};
  });
  console.log("   ", JSON.stringify(r));
  ck("it ran on its own", r.stamped, String(r.stamped));
  ck("the movement whose sides have closed is retired", r.retiredLat, String(r.retiredLat));
  ck("the one still nine reps apart keeps the rule", !r.retiredCurl, String(r.retiredCurl));
  ck("and it is not due all over again", !r.due, String(r.due));
}

console.log("\n1b - AND IT RUNS OFF AN ORDINARY ACTION, NOT A CALL TO ITSELF");
{
  /* Section 1 calls the runner directly, which proves it works and would not have caught
     the old behaviour at all \u2014 the old build has no such function to call. This asserts
     the thing a user actually does: start a session, and the rule has already moved. */
  await seed({});
  const r = await p.evaluate(()=>{
    const before = asymRetestDue();
    startWorkout(ROTATION[0]);
    const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
    const out = {before, after: asymRetestDue(),
            ran: !!(S.asymRetest && S.asymRetest.at),
            retiredLat: !!asymRetiredFor("Cable Lateral Raise")};
    S.active = null; save();      // the sections below read the Today card, not a session
    return out;
  });
  console.log("   ", JSON.stringify(r));
  ck("it was due before the session started", r.before, String(r.before));
  ck("starting one ran it, with nothing pressed", r.ran, String(r.ran));
  ck("the closed movement is already retired", r.retiredLat, String(r.retiredLat));
  ck("and it is no longer waiting on you", !r.after, String(r.after));
}

console.log("\n2 - THE NUMBERS STILL WAIT TO BE READ");
{
  const r = await p.evaluate(()=>{
    TAB="today"; render();
    const t=document.body.innerText;
    return {unseen: asymRetestUnseen(),
            card: /asymmetry re-test/i.test(t),
            says: /Done on its own/i.test(t),
            names: /Preacher Curl/.test(t),
            btn: !!document.getElementById("asymRetestBtn")};
  });
  console.log("   ", JSON.stringify(r));
  ck("the card is up", r.card, String(r.card));
  ck("saying it ran itself", r.says, String(r.says));
  ck("naming what still has the rule on it", r.names, String(r.names));
  ck("with something to acknowledge it", r.btn, String(r.btn));
}

console.log("\n3 - ACKNOWLEDGING IT PUTS IT AWAY, AND DOES NOT RE-RUN IT");
{
  const r = await p.evaluate(()=>{
    const at = S.asymRetest.at;
    document.getElementById("asymRetestBtn").click();
    const t=document.body.innerText;
    return {unseen: asymRetestUnseen(), sameRun: S.asymRetest.at === at,
            gone: !/asymmetry re-test/i.test(t),
            logs: (S.planLog||[]).filter(x=> /re-test/i.test(x.name||x.what||"")).length};
  });
  console.log("   ", JSON.stringify(r));
  ck("it is marked read", !r.unseen, String(r.unseen));
  ck("the card goes", r.gone, String(r.gone));
  ck("and it is still the same single run", r.sameRun, String(r.sameRun));
}

console.log("\n4 - THE BODY TAB KEEPS THE RECORD");
{
  const r = await p.evaluate(()=>{
    TAB="body"; BODY_FOCUS=null; render();
    const t=document.body.innerText;
    return {record: /Last re-test/i.test(t),
            what: /came off|Nothing was retired/i.test(t),
            noBtn: !document.getElementById("nbSideRetest")};
  });
  console.log("   ", JSON.stringify(r));
  ck("it says when the rule last moved", r.record, String(r.record));
  ck("and what it decided", r.what, String(r.what));
  ck("with nothing left to press", r.noBtn, String(r.noBtn));
}

console.log("\n5 - AND IT CANNOT STAMP ITSELF DONE ON NO DATA");
{
  const before = await seed({noData: true});
  const r = await p.evaluate(()=>{
    const res = autoAsymRetest();
    return {res, stamped: !!(S.asymRetest && S.asymRetest.at)};
  });
  console.log("   ", JSON.stringify([before, r]));
  ck("nothing is due without a reading", !before.due, String(before.due));
  ck("so nothing runs", r.res === null, JSON.stringify(r.res));
  ck("and nothing is written down", !r.stamped, String(r.stamped));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
