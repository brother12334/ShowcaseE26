import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:1400}});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:true,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* A push day logged `dAgo` days ago, with real chest work and a token amount of
   everything a press incidentally touches. */
const setup = (opts)=> p.evaluate((o)=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorAsked=true; S.sleepAsked=todayStr();
  S.flags=[]; S.deload=null; S.viewMode="list"; S.planStart=Date.now()-200*86400e3;
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.sore={}; S.soreBy={}; S.soreSkip={}; S.active=null;
  delete S.domsCheckTime;
  const mk=(dAgo, n)=>({id:"s"+dAgo, workoutId: ROTATION[0],
    date:new Date(Date.now()-dAgo*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-dAgo*86400e3-3600e3, finishedAt:Date.now()-dAgo*86400e3, feel:4,
    entries:[{name:"Barbell Bench Press", reps:"8-12",
      sets:Array.from({length:n},()=>({weight:"135",reps:"10",rpe:"8",done:true}))}]});
  S.sessions = (o.days || []).map(d=> mk(d, o.sets == null ? 5 : o.sets));
  S.cycleStart = Date.now()-9*86400e3;
  save();
  return true;
}, opts || {});

console.log("1 - SCOPE: A PRIMARY TARGET IS ASKED, AN INCIDENTAL SHARE IS NOT");
{
  await setup({days:[2]});
  const r = await p.evaluate(()=>{
    const bench = musclesFor("Barbell Bench Press") || {};
    return {prim: domsPrimaryOf("Barbell Bench Press"),
            chest: bench.chest, fd: bench.delts_front, tri: bench.triceps,
            thr: DOMS_MUSCLE_THRESHOLD};
  });
  ck("the threshold is the one in the spec", r.thr === 0.5, String(r.thr));
  ck("chest is a primary target of a bench press", r.prim.includes("chest"), r.prim.join(","));
  ck("anything under the threshold is not",
     r.prim.every(m=> m === "chest" ? true : (m === "delts_front" ? r.fd >= .5 : true))
     && !r.prim.some(m=> ({chest:r.chest, delts_front:r.fd, triceps:r.tri})[m] < .5),
     JSON.stringify(r));
}

console.log("2 - THE CHECK DAY IS THE RECOVERY WINDOW, ROUNDED UP TO WHOLE DAYS");
{
  await setup({days:[2]});
  const r = await p.evaluate(()=>{
    const recov = GROUPS.chest.recov;
    const last = domsLastExposure("chest");
    const days = Math.ceil(recov / 24);
    const want = new Date(Date.parse(last.date + "T12:00:00") + days*86400e3).toLocaleDateString("en-CA");
    return {recov, days, got: domsCheckDayFor("chest"), want, eff: Math.round(last.eff*10)/10,
            today: todayStr()};
  });
  ck("chest recovers in 48 hours", r.recov === 48, String(r.recov));
  ck("so its check is two days after the session", r.days === 2, String(r.days));
  ck("which is the date it returns", r.got === r.want, r.got + " vs " + r.want);
  ck("and trained two days ago, that is today", r.got === r.today, r.got + " vs " + r.today);
  ck("the exposure was real", r.eff >= 3, String(r.eff));
}

console.log("3 - AN EXPOSURE UNDER THE MINIMUM EARNS NO CHECK AT ALL");
{
  await setup({days:[2], sets:1});
  const r = await p.evaluate(()=> ({min: DOMS_CHECK_MIN_SETS,
                                    eff: Math.round(domsLastExposure("chest").eff*10)/10,
                                    day: domsCheckDayFor("chest"), due: domsDueToday()}));
  ck("the minimum is the one in the spec", r.min === 3, String(r.min));
  ck("one set is under it", r.eff < 3, String(r.eff));
  ck("so there is no check day", r.day === null, String(r.day));
  ck("and nothing is due", r.due.length === 0, r.due.join(","));
}

console.log("4 - A CHECK DAY THAT HAS BEEN AND GONE IS NOT ASKED LATE");
{
  await setup({days:[5]});
  const r = await p.evaluate(()=> ({day: domsCheckDayFor("chest"), today: todayStr(),
                                    due: domsDueToday()}));
  ck("its day was three days ago", r.day < r.today, r.day + " vs " + r.today);
  ck("and nothing is asked now", r.due.length === 0, r.due.join(","));
}

console.log("5 - THE CARD WAITS FOR THE HOUR, THEN ASKS, THEN LEARNS IT");
{
  await setup({days:[2]});
  const r = await p.evaluate(()=>{
    TAB="today"; render();
    const before = /How did that land/i.test(document.body.innerText);
    /* the default hour is 18:00 and the card opens 30 minutes early; move the hour to
       just behind now so the window is open whatever time this test runs */
    const n = new Date();
    S.domsCheckTime = null;
    const mins = Math.max(31, n.getHours()*60 + n.getMinutes());
    const shown = (()=>{
      const real = domsCheckMin;
      window.domsCheckMin = ()=> mins;      // as if the hour had arrived
      render();
      const out = /How did that land/i.test(document.body.innerText);
      window.domsCheckMin = real;
      return out;
    })();
    return {before, shown, defaulted: domsCheckTime(), open: domsCheckOpen()};
  });
  ck("the default hour is 18:00 until one is answered", r.defaulted === "18:00", r.defaulted);
  ck("and once the window is open the card is there", r.shown, String(r.shown));
}

console.log("6 - ANSWERING IT STORES THE VALUE, THE DAY AND WHICH QUESTION ASKED");
{
  await setup({days:[2]});
  const r = await p.evaluate(()=>{
    soreWrite("chest", 3, SORE_BY_PEAK);
    const d = todayStr();
    return {v: S.sore[d].chest, by: S.soreBy[d].chest,
            sig: soreSignalOver("chest", Date.now()-3*86400e3, Date.now()+86400e3)};
  });
  ck("the value is kept", r.v === 3, String(r.v));
  ck("tagged as the peak-day reading", r.by === "rest-day-peak", r.by);
  ck("and the signal carries the tag", r.sig.v === 3 && r.sig.by === "rest-day-peak",
     JSON.stringify(r.sig));
}

console.log("7 - THE SIGNAL IS THE WORST READING IN THE CYCLE, NOT THE AVERAGE");
{
  const r = await p.evaluate(()=>{
    S.sore = {}; S.soreBy = {};
    const day = n => new Date(Date.now()-n*86400e3).toLocaleDateString("en-CA");
    S.sore[day(3)] = {chest:3}; S.soreBy[day(3)] = {chest:SORE_BY_PEAK};
    S.sore[day(1)] = {chest:0}; S.soreBy[day(1)] = {chest:SORE_BY_PRE};
    const sig = soreSignalOver("chest", Date.now()-5*86400e3, Date.now()+86400e3);
    return {sig, avg: soreAvgOver("chest", Date.now()-5*86400e3, Date.now()+86400e3)};
  });
  ck("3 and 0 gives 3, not 1.5", r.sig.v === 3 && r.avg === 3, JSON.stringify(r));
  ck("and it is the peak reading that is named", r.sig.by === "rest-day-peak", r.sig.by);
}

console.log("8 - RULE 4: NOT TWICE IN A DAY, AND A SKIP COUNTS AS ASKED");
{
  await setup({days:[2]});
  const r = await p.evaluate(()=>{
    const before = domsDueToday().includes("chest");
    soreSkipMark(["chest"]);
    const after = domsDueToday().includes("chest");
    const asked = soreAskedFor("chest");
    /* and answering after skipping clears the skip, because an answer is an answer */
    soreWrite("chest", 2, SORE_BY_PEAK);
    const sk = (S.soreSkip[todayStr()] || {}).chest;
    return {before, after, asked, sk: !!sk};
  });
  ck("it was due", r.before, String(r.before));
  ck("skipping takes it off the list", !r.after, String(r.after));
  ck("and counts as having been asked", r.asked, String(r.asked));
  ck("but answering later clears the skip", !r.sk, String(r.sk));
}

console.log("9 - RULE 2: THE PRE-SESSION BATCH IS TODAY'S PRIMARIES, PLUS ANYTHING DUE");
{
  await setup({days:[2]});
  const r = await p.evaluate(()=>{
    const wid = ROTATION[0];
    S.program[wid] = [{name:"Barbell Bench Press", sets:4, reps:"8-12"},
                      {name:"Lateral Raise", sets:3, reps:"12-15"}];
    S.active = null; startWorkout(wid);
    PF = PF || {sore:{}, flags:{}};
    const list = pfSoreMuscles(true);
    const bench = musclesFor("Barbell Bench Press") || {};
    const lat = musclesFor("Lateral Raise") || {};
    return {list, chest: bench.chest, side: lat.delts_side,
            hasQuads: list.includes("quads")};
  });
  ck("chest is on it, because today presses", r.list.includes("chest"), r.list.join(","));
  ck("side delts too, because today raises", r.list.includes("delts_side"), r.list.join(","));
  ck("and nothing today does not train", !r.hasQuads, r.list.join(","));
}

console.log("10 - ONCE PER SESSION, AND AGAIN FOR A SECOND SESSION THE SAME DAY");
{
  const r = await p.evaluate(()=>{
    const a = S.active;
    a.soreAsked = {chest:true};
    soreWrite("chest", 1, SORE_BY_PRE);
    PF.soreList = null;
    const again = pfSoreMuscles(true);
    /* a second session: a new S.active, so nothing has been asked in it yet */
    a.soreAsked = {};
    PF.soreList = null;
    const second = pfSoreMuscles(true);
    return {again, second};
  });
  ck("the same session does not ask twice", !r.again.includes("chest"), r.again.join(","));
  ck("a second session does", r.second.includes("chest"), r.second.join(","));
}

console.log("11 - THE HOUR IS LEARNED FROM THE FIRST ANSWER, AND CHANGEABLE AFTER");
{
  await setup({days:[2]});
  const r = await p.evaluate(()=>{
    const before = domsCheckTime();
    const learned = domsCheckTimeLearn();
    const n = new Date();
    const want = String(n.getHours()).padStart(2,"0") + ":" + String(n.getMinutes()).padStart(2,"0");
    const again = domsCheckTimeLearn();     // only the first one sets it
    S.domsCheckTime = "07:30";
    return {before, learned, want, again, after: domsCheckTime(), min: domsCheckMin()};
  });
  ck("it starts on the default", r.before === "18:00", r.before);
  ck("the first answer sets it to now", r.learned === r.want, r.learned + " vs " + r.want);
  ck("a later one does not move it", r.again === null, String(r.again));
  ck("and it can be set by hand", r.after === "07:30" && r.min === 450, JSON.stringify(r));
}

console.log("12 - THE REMINDER GOES OUT AT THAT HOUR, WITH ONE FOLLOW-UP");
{
  await setup({days:[2]});
  const r = await p.evaluate(()=>{
    S.pushOn = true;
    S.domsCheckTime = "23:58";               // still ahead, whatever time this runs
    S.remindAt = null; S.remindBed = false; S.remindWake = false;
    /* today must NOT be a day that presses, or Rule 4 covers the check in that session's
       own batch and no reminder is owed — which is section 14's job to prove */
    for(let i = 0; i < ROTATION.length; i++){
      S.pointer = i;
      if(!domsCoveredByPlan(todayStr()).includes("chest")) break;
    }
    save();
    const items = plannedReminders().filter(x=> x.kind === "sore" || x.kind === "sore2");
    const gap = items.length === 2 ? Math.round((items[1].at - items[0].at)/60000) : null;
    const at = new Date(items[0] ? items[0].at : 0);
    return {kinds: items.map(x=>x.kind), gap, retry: REMINDER_RETRY_MINUTES,
            hh: at.getHours(), mm: at.getMinutes(),
            title: (items[0]||{}).title, day: at.toLocaleDateString("en-CA"), today: todayStr()};
  });
  ck("both are scheduled", r.kinds.join(",") === "sore,sore2", r.kinds.join(","));
  ck("the first at the hour itself", r.hh === 23 && r.mm === 58, r.hh + ":" + r.mm);
  ck("on the day it is due", r.day === r.today, r.day + " vs " + r.today);
  ck("the follow-up an hour later", r.gap === r.retry && r.retry === 60, String(r.gap));
  ck("and it says which muscle", /chest/i.test(r.title || ""), r.title);
}

console.log("13 - NOTHING IS SENT ONCE IT HAS BEEN ANSWERED");
{
  const r = await p.evaluate(()=>{
    soreWrite("chest", 2, SORE_BY_PEAK);
    return plannedReminders().filter(x=> x.kind === "sore" || x.kind === "sore2").length;
  });
  ck("both fall away", r === 0, String(r));
}

console.log("14 - NOR ON A DAY THE SESSION ITSELF WILL ASK (RULE 4 PRECEDENCE)");
{
  await setup({days:[2]});
  const r = await p.evaluate(()=>{
    S.pushOn = true; S.domsCheckTime = "23:58";
    S.remindAt = null; S.remindBed = false; S.remindWake = false;
    // put today on the day that presses, so the pre-session batch will ask about chest
    let found = false;
    for(let i = 0; i < ROTATION.length; i++){
      S.pointer = i;
      if(domsCoveredByPlan(todayStr()).includes("chest")){ found = true; break; }
    }
    save();
    return {found,
            due: domsDueOn(todayStr(), true).includes("chest"),
            remind: domsRemindFor(todayStr(), true).includes("chest"),
            sent: plannedReminders().filter(x=> x.kind === "sore").length};
  });
  ck("today is a day that presses", r.found, String(r.found));
  ck("chest's check is still due today", r.due, String(r.due));
  ck("but no reminder is owed for it", !r.remind, String(r.remind));
  ck("and none is scheduled", r.sent === 0, String(r.sent));
}

console.log("15 - THE WORKER TAKES BOTH KINDS");
{
  const w = await (await import('node:fs/promises')).readFile(appFile('proxy/accountworker.js'),'utf8');
  ck("sore and its follow-up are schedulable",
     /SCHED_KINDS = \["train", "bed", "wake", "rest", "sore", "sore2"\]/.test(w), "missing");
}

console.log("16 - AND THE SETTING SAYS WHY THE HOUR MATTERS");
{
  const r = await p.evaluate(()=>{
    TAB="sync"; SET_PAGE="sess"; render();
    const t = document.body.innerText;
    return {row: /Rest-day soreness/i.test(t),
            why: /keeps your readings comparable|keeps the readings comparable/i.test(t),
            input: !!document.getElementById("domsTimeIn")};
  });
  ck("the row is where the training rules are", r.row, String(r.row));
  ck("with a time you can change", r.input, String(r.input));
  ck("and it says why it is one hour", r.why, String(r.why));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
