import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1;
  S.splitId=DEFAULT_SPLIT; applySplit(); S.cycleStart=Date.now()-3*86400e3;
  S.flags=[]; S.deload=null; save();
});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

const findings = ()=>([
  {kind:"up", name:"Barbell Bench Press", to:190, msg:"Every set at RPE 7.", sub:"Take it up."},
  {kind:"fade", name:"Cable Fly", msg:"Reps went 12 → 7 at the same load.", sub:"Rest longer.", to:25, restAdd:30},
  {kind:"toohard", name:"Barbell Squat", detail:{msg:"You could not reach the prescribed load.", fix:"Drop it."}, to:225},
  {stall:{kind:"recovery", msg:"Nothing moved for three sessions.", sub:"Take a lighter week."}, name:"Barbell Row"}
]);

console.log("1 - OFF A DELOAD, EVERY KIND IS RAISED");
{
  const r = await p.evaluate((f)=>{
    S.flags=[]; S.deload=null; save();
    const sess={id:"s1", date:todayStr(), finishedAt:Date.now(), workoutId:ROTATION[0]};
    recordFlags(sess, f);
    return {kinds: flagLog().map(x=> x.kind), stamped: flagLog().some(x=> x.deload)};
  }, findings());
  ck("ready-for-more is raised", r.kinds.includes("up"), r.kinds.join(","));
  ck("the stall is raised", r.kinds.includes("stall"), r.kinds.join(","));
  ck("and nothing is stamped as a deload", !r.stamped, String(r.stamped));
}

console.log("2 - INSIDE A DELOAD, THE TWO THAT WOULD BE WRONG ARE NOT RAISED");
{
  const r = await p.evaluate((f)=>{
    S.flags=[];
    S.deload={startedAt:Date.now()-2*86400e3, endedAt:null, reason:"manual"};
    save();
    const sess={id:"s2", date:todayStr(), finishedAt:Date.now(), workoutId:ROTATION[0]};
    recordFlags(sess, f);
    return {kinds: flagLog().map(x=> x.kind), all: flagLog().every(x=> x.deload===true),
            covers: deloadCovers(todayStr())};
  }, findings());
  console.log("     raised: " + (r.kinds.join(", ") || "(nothing)"));
  ck("the week is recognised", r.covers, String(r.covers));
  ck("no ready-for-more weight", !r.kinds.includes("up"), r.kinds.join(","));
  ck("no stall", !r.kinds.includes("stall"), r.kinds.join(","));
  ck("but what happened in the session is still kept", r.kinds.includes("fade") && r.kinds.includes("load"),
     r.kinds.join(","));
  ck("and each one knows which week it came from", r.all, String(r.all));
}

console.log("3 - THE CARD SAYS WHICH WEEK IT CAME FROM");
{
  const r = await p.evaluate(()=>{
    S.sessions=[{id:"x1", workoutId:ROTATION[0], date:new Date(Date.now()-86400e3).toLocaleDateString("en-CA"),
      startedAt:Date.now()-86400e3, finishedAt:Date.now()-86400e3+3600e3, feel:4,
      entries:[{name:"Barbell Bench Press", sets:[{weight:185,reps:8,rpe:8,done:true}]}]}];
    save();
    TAB="body"; BODY_OPEN.nbflags=true; render();
    const t = document.body.innerText;
    return {said: /Logged in a deload week/.test(t),
            banner: !!document.querySelector(".nb-deload"),
            bannerTxt: (document.querySelector(".nb-deload")||{}).innerText||""};
  });
  ck("the flag says it was logged in a deload", r.said, String(r.said));
  ck("and the section carries one line over all of it", r.banner, String(r.banner));
  console.log("     " + r.bannerTxt.replace(/\s+/g," ").trim().slice(0,150));
}

console.log("4 - A FLAG FROM BEFORE THE WEEK SAYS THE WEEK IS A DELOAD");
{
  const r = await p.evaluate(()=>{
    S.flags=[]; S.deload=null; save();
    const old = new Date(Date.now()-9*86400e3);
    recordFlags({id:"s3", date:old.toLocaleDateString("en-CA"), finishedAt:old.getTime(),
                 workoutId:ROTATION[0]},
                [{kind:"fade", name:"Cable Fly", msg:"Reps fell away.", sub:"Rest longer.", restAdd:30}]);
    S.deload={startedAt:Date.now()-2*86400e3, endedAt:null, reason:"manual"};
    S.sessions=[{id:"x2", workoutId:ROTATION[0], date:new Date(Date.now()-86400e3).toLocaleDateString("en-CA"),
      startedAt:Date.now()-86400e3, finishedAt:Date.now()-86400e3+3600e3, feel:4,
      entries:[{name:"Barbell Bench Press", sets:[{weight:185,reps:8,rpe:8,done:true}]}]}];
    save(); TAB="body"; BODY_OPEN.nbflags=true; render();
    const t = document.body.innerText;
    return {stamped: flagLog()[0].deload, now: /You are deloading this week/.test(t)};
  });
  ck("it is not stamped as a deload flag", !r.stamped, String(r.stamped));
  ck("but the card says the week you are reading it in is one", r.now, String(r.now));
}

console.log("5 - A LIGHT WEEK IS NOT A STALL, AND THE CEILING FINDING KNOWS WHY");
{
  const r = await p.evaluate(()=>{
    /* Three weeks of hard training, then a deload week logged light, so the strength
       trend is down purely because of the prescription. */
    S.flags=[]; S.sessions=[]; S.cycleDone=ROTATION.map((_,i)=>i);
    const DAY=86400e3, now=Date.now();
    /* A long window, so the block's own volume is what the rules are reading. */
    S.cycleStart = now - 21*DAY;
    for(let k=42;k>=9;k-=3){
      const t=now-k*DAY;
      S.sessions.push({id:"h"+k, workoutId:ROTATION[0], date:new Date(t).toLocaleDateString("en-CA"),
        startedAt:t, finishedAt:t+3600e3, feel:4,
        /* Loads sliding backwards over the block at full volume: a stall by any reading. */
        entries:[{name:"Barbell Bench Press", sets:Array.from({length:5},()=>
          ({weight:225-Math.round((42-k)/4), reps:8, rpe:9.5, done:true}))}]});
    }
    [6,3].forEach(k=>{
      const t=now-k*DAY;
      S.sessions.push({id:"d"+k, workoutId:ROTATION[0], date:new Date(t).toLocaleDateString("en-CA"),
        startedAt:t, finishedAt:t+3600e3, feel:3,
        entries:[{name:"Barbell Bench Press", sets:[{weight:135,reps:6,rpe:6,done:true},
                                                    {weight:135,reps:6,rpe:6,done:true}]}]});
    });
    S.deload={startedAt:now-6*DAY, endedAt:null, reason:"manual"}; save();
    const on = bodyAnalysis();
    const stallsOn = (on.weak||[]).filter(x=> x.kind==="stall").length;
    const over = (on.weak||[]).find(x=> x.kind==="over");
    S.deload=null; save();
    const off = bodyAnalysis();
    const stallsOff = (off.weak||[]).filter(x=> x.kind==="stall").length;
    return {stallsOn, stallsOff, act: over ? over.act : null, why: over ? over.detail : null,
            kinds: (on.weak||[]).map(x=> x.muscle+":"+x.kind).join(", ")};
  });
  ck("no stall findings while deloading", r.stallsOn===0, String(r.stallsOn));
  ck("while the very same log off a deload does report one", r.stallsOff>=1, String(r.stallsOff));
  if(r.act){
    ck("the recovery finding does not tell you to cut what you are already cutting",
       /already deloading/.test(r.act), r.act);
    ck("and says the deload is the answer", /what the deload is for/.test(r.why||""), (r.why||"").slice(0,90));
  } else {
    /* The "past what you recover from" finding needs a fatigue reading this log does not
       produce. Its deload wording is exercised by hand; what is asserted here is the part
       that can be driven end to end. */
    console.log("     findings while deloading: " + r.kinds);
  }
}

console.log("6 - THE READINESS NOTE KNOWS TOO");
{
  const r = await p.evaluate(()=>{
    const now=Date.now();
    S.deload={startedAt:now-2*86400e3, endedAt:null, reason:"manual"};
    S.sore={}; S.sore[todayStr()]={chest:3};
    S.sessions=[{id:"t1", workoutId:ROTATION[0], date:todayStr(),
      startedAt:now-5*3600e3, finishedAt:now-4*3600e3, feel:3,
      entries:[{name:"Barbell Bench Press", sets:[{weight:185,reps:8,rpe:9,done:true},
                                                  {weight:185,reps:8,rpe:9,done:true}]}]}];
    S.pointer=0; S.cycleDone=[]; S.active=null; save(); TAB="today"; render();
    const el=document.querySelector(".ready-note");
    return {note: !!el, txt: el ? el.innerText.replace(/\s+/g," ") : ""};
  });
  if(r.note){
    ck("it says the plan is already cut", /already cut this week/.test(r.txt), r.txt.slice(-160));
  } else console.log("     (no readiness note in this state — nothing to check)");
}

console.log("7 - THE RECOVERY FINDING, DRIVEN DIRECTLY");
{
  /* weakPoints() takes the analysis, so the one branch the logs above cannot reach is
     checked by handing it a muscle whose fatigue reading is already past the line. */
  const r = await p.evaluate(()=>{
    const mk = (deload)=>{
      S.deload = deload ? {startedAt:Date.now()-2*86400e3, endedAt:null, reason:"manual"} : null;
      const A = bodyAnalysis();
      A.inj.chest = {score:80, flags:[{t:"volume this cycle is past what this muscle recovers from"},
                                      {t:"carrying 88% fatigue with only 20% recovery banked"}]};
      return (weakPoints(A) || []).find(x=> x.muscle==="chest" && x.kind==="over") || null;
    };
    const on = mk(true), off = mk(false);
    S.deload = null; save();
    return {on: on && {act:on.act, detail:on.detail}, off: off && {act:off.act}};
  });
  ck("off a deload it says to cut the sets", /Cut chest sets/i.test((r.off||{}).act||""), (r.off||{}).act);
  ck("on one it does not ask you to cut what you are already cutting",
     /already deloading/.test((r.on||{}).act||""), (r.on||{}).act);
  ck("and says the week is the answer", /what the deload is for/.test((r.on||{}).detail||""),
     ((r.on||{}).detail||"").slice(0,90));
  console.log("     " + ((r.on||{}).act||""));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
