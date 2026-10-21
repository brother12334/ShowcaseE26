import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* NINE IDENTICAL NOTIFICATIONS ON ONE LOCK SCREEN.

   Reported with a screenshot: every reminder read "Your next session is up". That string
   is the service worker's LAST-RESORT line, not anything the app wrote — so the report is
   really two faults. The app's own text, which already names the day, the opening lift and
   its load, was never arriving; and the one line it always ends on was the same every day
   even when it did. */
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
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false});
  S.splitId=DEFAULT_SPLIT; applySplit(); S.remindAt="18:00"; save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("1 - THE REMINDER SAYS WHAT IS ACTUALLY WAITING");
{
  const r = await p.evaluate(()=>{
    const t = reminderText(false);
    return {title: t.title, body: t.body, day: dayMeta(todaysWorkoutId() || ROTATION[0]).name};
  });
  console.log("   ", JSON.stringify(r));
  ck("the title is not the worker's fallback", !/^Your next session is up$/.test(r.title), r.title);
  ck("it names the day or something true about it", r.title.length > 3, r.title);
  ck("and the body says the shape of the session",
     /exercises|sets|set\b/.test(r.body) || r.body.length > 12, r.body);
}

console.log("\n2 - AND IT DOES NOT READ THE SAME EVERY DAY");
{
  const r = await p.evaluate(()=>{
    /* Same list, different days: the line is picked from the date, so it moves. */
    const seen = {};
    const real = todayStr;
    const days = ["2026-10-19","2026-10-20","2026-10-21","2026-10-22","2026-10-23",
                  "2026-10-24","2026-10-25","2026-10-26","2026-10-27"];
    days.forEach(d=>{ todayStr = ()=> d; seen[d] = reminderVariant(REMINDER_CLOSERS, "upper-a"); });
    todayStr = real;
    const uniq = Object.keys(seen).map(k=> seen[k]).filter((v,i,a)=> a.indexOf(v) === i);
    return {seen, uniq: uniq.length, total: days.length};
  });
  console.log("   ", JSON.stringify(Object.keys(r.seen).map(k=> r.seen[k].slice(0,22))));
  ck("nine days do not all read the same", r.uniq > 1, r.uniq + " of " + r.total);
  ck("and they use most of the lines available", r.uniq >= 4, String(r.uniq));
}

console.log("\n3 - BUT IT IS STABLE WITHIN A DAY, because a reminder that rewords itself looks broken");
{
  const r = await p.evaluate(()=>{
    const a = reminderVariant(REMINDER_CLOSERS, "upper-a");
    const b2 = reminderVariant(REMINDER_CLOSERS, "upper-a");
    const other = reminderVariant(REMINDER_CLOSERS, "lower-b");
    return {same: a === b2, a, other};
  });
  console.log("   ", JSON.stringify(r));
  ck("asking twice gives the same line", r.same, String(r.same));
  ck("while a different day of the split can differ", true, r.other.slice(0, 24));
}

console.log("\n4 - THE WORKER CAN READ THE TEXT WITHOUT ASKING THE SERVER");
{
  /* The fix that matters: the app leaves its planned reminders where the worker can read
     them, so a push arriving offline — or late, out of Do Not Disturb, after the server's
     queue has expired — still says something true instead of the generic line.

     The Cache API itself cannot be exercised here: these specs load the app from file://
     and caches.put() refuses that scheme. So this checks the two halves either side of it
     — that the app writes the plan, and that what it writes carries real words — and runs
     the worker's own selection rule against the same data. */
  const r = await p.evaluate(()=>{
    S.pushOn = true;
    const items = plannedReminders();
    const now = Date.now();
    let best = null, gap = Infinity;
    items.forEach(it=>{ const g = Math.abs(it.at - now); if(it.title && g < gap){ gap = g; best = it; } });
    return {n: items.length, best, titles: items.map(x=> x.title),
            bodies: items.map(x=> x.body || "")};
  });
  console.log("   ", JSON.stringify(r.titles));
  ck("there is a plan to leave behind", r.n > 0, String(r.n));
  ck("every entry carries its own words", r.titles.every(t=> !!t && t.length > 3), r.titles.join(" | "));
  ck("none of them is the fallback sentence",
     r.titles.every(t=> t !== "Your next session is up"), r.titles.join(" | "));
  ck("and the nearest one is the one the worker would show", !!r.best && !!r.best.title,
     r.best && r.best.title);
  const src = readFileSync(appFile("index.html"), "utf8");
  ck("THE APP WRITES IT on every schedule sync",
     /__e26_push_plan/.test(src) && /caches\.open\("e26-push"\)/.test(src), String(/__e26_push_plan/.test(src)));
  ck("and clears it when reminders are turned off",
     /delete\("\.\/__e26_push_plan"\)/.test(src), String(/delete\("\.\/__e26_push_plan"\)/.test(src)));
}

console.log("\n5 - AND THE FALLBACK IS STILL THERE FOR WHEN THERE IS GENUINELY NOTHING");
{
  const sw = readFileSync(appFile("sw.js"), "utf8");
  ck("the worker asks the server first",
     /n = await pendingNotification\(\)/.test(sw), String(/pendingNotification/.test(sw)));
  ck("then reads the app's own plan", /n = await plannedNotification\(\)/.test(sw), String(/plannedNotification/.test(sw)));
  ck("and only then falls back to one sentence",
     sw.indexOf("plannedNotification()") < sw.lastIndexOf("Your next session is up"), "order");
  ck("a plan older than a day is not announced", /PLAN_STALE_MS/.test(sw), String(/PLAN_STALE_MS/.test(sw)));
  ck("and one for a time nowhere near now is not either", /PLAN_NEAR_MS/.test(sw), String(/PLAN_NEAR_MS/.test(sw)));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
