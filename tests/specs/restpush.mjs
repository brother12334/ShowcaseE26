import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:1000}});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:true,ns:''}));
  localStorage.setItem('e26.ns0','E26-X');
  window.__buzz=[]; window.__notes=[];
  navigator.vibrate = x=>{ window.__buzz.push(x); return true; };
  window.Notification = function(t,o){ window.__notes.push({t,o}); };
  window.Notification.permission = "granted";
  window.Notification.requestPermission = async ()=> "granted";
});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* Every /push/schedule post this session makes, captured where it leaves the app. */
const setup = (mode, pushOn)=> p.evaluate(({m, on})=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorAsked=true; S.sleepAsked=todayStr();
  S.flags=[]; S.deload=null; S.viewMode="list";
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:"off"});
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.remindAt=null; S.remindBed=false; S.remindWake=false;
  S.pushOn = !!on;
  trainPrefs().restAlert = m;
  window.__posts = [];
  if(!window.__apiPatched){
    window.__apiPatched = true;
    const real = window.apiFetch;
    window.apiFetch = async (path, opts)=>{
      if(path === "/push/schedule"){
        let body = {}; try{ body = JSON.parse((opts||{}).body || "{}"); }catch(e){}
        window.__posts.push(body.items || []);
        return {ok:true, status:200, json: async ()=>({ok:true})};
      }
      return real ? real(path, opts) : {ok:false, status:0, json: async ()=>null};
    };
  }
  PUSH_SCHED_LAST = "";
  S.active={date:todayStr(), workoutId:ROTATION[0], startedAt:Date.now(),
    entries:[{name:"Barbell Bench Press", reps:"5", rest:[120,240],
              sets:[{weight:"185",reps:"5",rpe:"8",done:true},
                    {weight:"",reps:"",rpe:"",done:false},
                    {weight:"",reps:"",rpe:"",done:false}]}]};
  save();
  return {target: restTargetSec()};
}, {m:mode, on:pushOn});

const last = ()=> p.evaluate(()=>{
  const ps = window.__posts;
  return {n: ps.length, items: (ps[ps.length-1] || []).map(x=> x.kind),
          rest: (ps[ps.length-1] || []).find(x=> x.kind === "rest") || null};
});

console.log("1 - STARTING A REST PUTS ITS DEADLINE ON THE PHONE'S SCHEDULE");
{
  await setup("notify", true);
  const r = await p.evaluate(async ()=>{
    startRest(0, 0);
    await new Promise(r2=> setTimeout(r2, 60));
    const rt = S.active.restTimer;
    const post = (window.__posts[window.__posts.length-1] || []);
    const it = post.find(x=> x.kind === "rest");
    return {posts: window.__posts.length, kinds: post.map(x=>x.kind),
            at: it ? it.at : null, want: rt.start + restTargetSec()*1000,
            title: it ? it.title : "", body: it ? it.body : ""};
  });
  ck("the schedule was posted", r.posts === 1, String(r.posts));
  ck("with a rest item on it", r.kinds.join(",") === "rest", r.kinds.join(","));
  ck("timed at the end of the rest, to the millisecond", r.at === r.want, r.at+" vs "+r.want);
  ck("titled for what it is", r.title === "Rest is up", r.title);
  ck("and it names the next exercise", /Barbell Bench Press/.test(r.body), r.body);
}

console.log("2 - LOGGING THE NEXT SET TAKES IT BACK OFF");
{
  const r = await p.evaluate(async ()=>{
    recordRestIfRunning();
    await new Promise(r2=> setTimeout(r2, 60));
    return {posts: window.__posts.length, kinds: (window.__posts[window.__posts.length-1]||[]).map(x=>x.kind)};
  });
  ck("a second post went out", r.posts === 2, String(r.posts));
  ck("with nothing on it", r.kinds.length === 0, r.kinds.join(","));
}

console.log("3 - IT FIRING HERE CANCELS THE ONE ON THE PHONE");
{
  await setup("notify", true);
  const r = await p.evaluate(async ()=>{
    startRest(0, 0);
    await new Promise(r2=> setTimeout(r2, 60));
    const armed = (window.__posts[window.__posts.length-1]||[]).some(x=>x.kind==="rest");
    fireRestAlert();
    await new Promise(r2=> setTimeout(r2, 60));
    return {armed, posts: window.__posts.length,
            kinds: (window.__posts[window.__posts.length-1]||[]).map(x=>x.kind),
            buzzed: window.__buzz.length};
  });
  ck("it was armed", r.armed, String(r.armed));
  ck("it buzzed here", r.buzzed === 1, String(r.buzzed));
  ck("and the phone one was withdrawn", r.kinds.length === 0, r.kinds.join(","));
}

console.log("4 - BUZZ AND OFF SCHEDULE NOTHING, BECAUSE THERE IS NOTHING TO SEND");
for(const mode of ["buzz", "off"]){
  await setup(mode, true);
  const r = await p.evaluate(async ()=>{
    startRest(0, 0);
    await new Promise(r2=> setTimeout(r2, 60));
    return {items: (window.__posts[window.__posts.length-1]||[]).map(x=>x.kind), posts: window.__posts.length};
  });
  ck(mode + ": no rest item", !r.items.includes("rest"), r.items.join(","));
}

console.log("5 - AND NOTHING IS POSTED AT ALL WITHOUT REMINDERS TURNED ON");
{
  await setup("notify", false);
  const r = await p.evaluate(async ()=>{
    startRest(0, 0);
    await new Promise(r2=> setTimeout(r2, 60));
    return window.__posts.length;
  });
  ck("no request is made", r === 0, String(r));
}

console.log("6 - AN IDENTICAL SCHEDULE IS NOT POSTED TWICE");
{
  await setup("notify", true);
  const r = await p.evaluate(async ()=>{
    S.remindAt = "18:00";
    for(let i=0;i<6;i++){ pushSyncSchedule(); await new Promise(r2=> setTimeout(r2, 25)); }
    return {posts: window.__posts.length, kinds: (window.__posts[0]||[]).map(x=>x.kind)};
  });
  ck("six calls, one request", r.posts === 1, String(r.posts));
  ck("carrying the training reminder", r.kinds.join(",") === "train", r.kinds.join(","));
}

console.log("7 - A CALL THAT ARRIVES MID-FLIGHT IS NOT THROWN AWAY");
{
  await setup("notify", true);
  const r = await p.evaluate(async ()=>{
    /* hold the request open, call again underneath it, then let it finish: the old guard
       dropped the second call, which for a rest starting at the rack is a lost alert */
    let release;
    const real = window.apiFetch;
    window.apiFetch = async (path, opts)=>{
      if(path === "/push/schedule"){
        let body={}; try{ body = JSON.parse((opts||{}).body||"{}"); }catch(e){}
        window.__posts.push(body.items||[]);
        if(window.__posts.length === 1) await new Promise(r2=> release = r2);
        return {ok:true, status:200, json: async ()=>({ok:true})};
      }
      return real(path, opts);
    };
    S.remindAt = "18:00";
    pushSyncSchedule();                       // in flight, holding
    await new Promise(r2=> setTimeout(r2, 40));
    startRest(0, 0);                          // and a rest starts underneath it
    await new Promise(r2=> setTimeout(r2, 40));
    if(release) release();
    await new Promise(r2=> setTimeout(r2, 80));
    window.apiFetch = real;
    return {posts: window.__posts.length,
            kinds: (window.__posts[window.__posts.length-1]||[]).map(x=>x.kind).sort().join(",")};
  });
  ck("it went out after the first finished", r.posts === 2, String(r.posts));
  ck("with both reminders on it", r.kinds === "rest,train", r.kinds);
}

console.log("8 - THE SETTING SAYS WHERE THE ALERT IS ACTUALLY KEPT");
{
  await setup("notify", false);
  let t = await p.evaluate(()=>{ TAB="sync"; SET_PAGE="screen"; render(); return document.body.innerText; });
  ck("without reminders it does not claim a locked phone",
     /fires on the dot while the app is open/i.test(t), t.slice(0,0)||"missing");
  ck("and it offers to turn them on",
     await p.evaluate(()=> !!document.querySelector("[data-restalertpush]")), "");
  await p.evaluate(()=>{ S.pushOn = true; render(); });
  t = await p.evaluate(()=> document.body.innerText);
  ck("with reminders on it says the app can be shut",
     /with the screen off and with the app shut/i.test(t), "missing");
  ck("and the offer is gone",
     await p.evaluate(()=> !document.querySelector("[data-restalertpush]")), "");
}

console.log("9 - THE REMINDERS CARD OWNS UP TO CARRYING IT");
{
  const r = await p.evaluate(()=>{
    trainPrefs().restAlert = "notify"; S.pushOn = true;
    TAB="sync"; SET_PAGE="remind"; render();
    const on = /rest alert/i.test(document.body.innerText);
    trainPrefs().restAlert = "off"; render();
    const off = /rest alert/i.test(document.body.innerText);
    return {on, off};
  });
  ck("listed while it is on", r.on, String(r.on));
  ck("and not while it is off", !r.off, String(r.off));
}

console.log("10 - THE SERVICE WORKER'S NOTIFICATION CAN BE FELT");
{
  const sw = await (await import('node:fs/promises')).readFile(appFile('sw.js'),'utf8');
  ck("it vibrates", /vibrate:\s*\[120, 80, 120\]/.test(sw), "no vibrate");
  ck("and a replacement still announces itself", /renotify:\s*true/.test(sw), "no renotify");
}

console.log("11 - THE WORKER TAKES REST AS A KIND, AND WAITS OUT THE SECONDS");
{
  const w = await (await import('node:fs/promises')).readFile(appFile('proxy/accountworker.js'),'utf8');
  ck("rest is a schedulable kind", /SCHED_KINDS = \[[^\]]*"rest"/.test(w), "no kind");
  ck("it looks ahead for them", /REST_AHEAD/.test(w), "no horizon");
  ck("sleeps until the deadline", /setTimeout\(r\), *Math|Math\.min\(wait, REST_AHEAD\)/.test(w), "no sleep");
  ck("and only rest is waited for", /kind === "rest" && at <= now \+ REST_AHEAD/.test(w), "not gated");
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
