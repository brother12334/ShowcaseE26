/* The "what changed" full page: who sees it, how often, and what it says.

   The page is a one-off announcement, so the two things worth pinning hardest are the
   ones a bug would make invisible: that a brand-new profile is never shown a changelog
   about an app it has never used, and that an existing user is shown it exactly once. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
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
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off';
  S.splitId=DEFAULT_SPLIT; applySplit();
  save();
});
const ev = (fn, arg) => p.evaluate(fn, arg);

/* A profile with nothing in it at all: no sessions, no plan log, no built or imported
   plan, and an account made a minute ago. */
await ev(()=>{
  window.__fresh = ()=>{
    S.sessions = []; S.planLog = []; S.dayFlags = {};
    delete S.importMeta; delete S.builtPlan; delete S.seenNews;
    ACCT.createdAt = Date.now() - 60e3;
    saveQuiet();
  };
  /* Somebody who has been using the app: one logged session is enough. */
  window.__existing = ()=>{
    window.__fresh();
    const at = Date.now() - 2 * DAY_MS;
    S.sessions = [{id:"s1", workoutId: ROTATION[0], date: dayStr(at), startedAt: at,
      finishedAt: at + 3600e3, feel: 4,
      entries:[{name:"Barbell Bench Press",
        sets:[{weight:"150", reps:"8", rpe:"8", done:true}]}]}];
    delete S.seenNews;
    saveQuiet();
  };
  window.__open = ()=> !document.getElementById("newsFull").hidden;
});

console.log("1 - A NEW PROFILE IS TOLD NOTHING");
{
  const r = await ev(()=>{
    window.__fresh();
    const aud = newsAudience();
    const due = whatsNewDue();
    return {aud, due, stamp: S.seenNews, forV: NEWS_FOR};
  });
  ck("it is not in the audience", r.aud === false, JSON.stringify(r));
  ck("the page is not due", r.due === false, JSON.stringify(r));
  ck("and the version is stamped silently, so it never arrives later",
     r.stamp === r.forV, JSON.stringify(r));
}

console.log("2 - FOUR WAYS TO BE AN EXISTING USER");
{
  const r = await ev(()=>{
    const out = {};
    window.__existing(); out.session = newsAudience();
    window.__fresh(); S.planLog = [{at: Date.now(), kind:"x"}]; out.planLog = newsAudience();
    window.__fresh(); S.importMeta = {at: Date.now()}; out.imported = newsAudience();
    window.__fresh(); ACCT.createdAt = Date.now() - 3 * DAY_MS; out.oldAcct = newsAudience();
    return out;
  });
  ck("a logged session counts", r.session === true, JSON.stringify(r));
  ck("an edited plan counts", r.planLog === true, JSON.stringify(r));
  ck("an imported plan counts", r.imported === true, JSON.stringify(r));
  ck("an account older than a day counts", r.oldAcct === true, JSON.stringify(r));
}

console.log("3 - AN EXISTING USER SEES IT, ONCE");
{
  const r = await ev(()=>{
    window.__existing();
    const due1 = whatsNewDue();
    openWhatsNew();
    const open = window.__open();
    const locked = document.body.classList.contains("news-open");
    closeWhatsNew();
    return {due1, open, locked, shut: !window.__open(),
      stamp: S.seenNews, forV: NEWS_FOR, due2: whatsNewDue()};
  });
  ck("the page is due", r.due1 === true, JSON.stringify(r));
  ck("it opens full page", r.open === true, JSON.stringify(r));
  ck("and locks the page behind it", r.locked === true, JSON.stringify(r));
  ck("closing it hides it", r.shut === true, JSON.stringify(r));
  ck("closing stamps the version", r.stamp === r.forV, JSON.stringify(r));
  ck("so it is never due again", r.due2 === false, JSON.stringify(r));
}

console.log("4 - IT IS REACHED FROM THE OPENING PROMPTS, AHEAD OF THEM");
{
  const r = await ev(()=>{
    window.__existing();
    delete S.active;
    openingPrompts();
    const open = window.__open();
    closeWhatsNew();
    return {open};
  });
  ck("openingPrompts opens it", r.open === true, JSON.stringify(r));
}
{
  /* Mid-workout is the one time it must not interrupt. */
  const r = await ev(()=>{
    window.__existing();
    S.active = {workoutId: ROTATION[0], startedAt: Date.now(), entries:[]};
    openingPrompts();
    const open = window.__open();
    delete S.active;
    return {open};
  });
  ck("but not in the middle of a workout", r.open === false, JSON.stringify(r));
}

console.log("5 - WHAT THE PAGE ACTUALLY SAYS");
{
  const r = await ev(()=>{
    window.__existing();
    const html = whatsNewHTML();
    const tmp = document.createElement("div"); tmp.innerHTML = html;
    return {
      secs: tmp.querySelectorAll("section.news-sec").length,
      news: NEWS.length,
      heads: Array.from(tmp.querySelectorAll(".news-h")).map(x=> x.textContent),
      safe: (tmp.querySelector(".news-safe") || {}).textContent || "",
      closers: tmp.querySelectorAll("[data-newsclose]").length,
      build: tmp.querySelectorAll("[data-newsbuild]").length,
      ver: (tmp.querySelector(".spec-steps") || {}).textContent || "",
      h2: (tmp.querySelector("h2") || {}).textContent || "",
      again: (tmp.querySelector(".news-again") || {}).textContent || "",
      forV: NEWS_FOR
    };
  });
  ck("every section in NEWS is rendered", r.secs === r.news && r.secs >= 9,
     r.secs + " of " + r.news);
  ck("each one has a heading", r.heads.length === r.secs && r.heads.every(x=> x && x.length > 4),
     JSON.stringify(r.heads));
  ck("it says nothing logged has changed, before anything else",
     /Nothing you logged has changed/.test(r.safe), r.safe.slice(0,160));
  ck("the version it describes is on the page",
     r.ver.indexOf(r.forV) >= 0, r.ver);
  ck("the title says what it is", /What changed/.test(r.h2), r.h2);
  ck("there is more than one way out", r.closers >= 3, String(r.closers));
  ck("and one way into the builder", r.build === 1, String(r.build));
  ck("it says where to find it again", /Settings/.test(r.again), r.again);
}

console.log("6 - IT CAN BE READ AGAIN FROM SETTINGS");
{
  const r = await ev(async ()=>{
    window.__existing();
    S.seenNews = NEWS_FOR;                      // already read
    TAB = "sync"; SET_PAGE = "help"; render();
    await new Promise(r=> setTimeout(r, 60));
    const btn = document.getElementById("newsOpen");
    if(!btn) return {btn:false};
    btn.click();
    const open = window.__open();
    closeWhatsNew();
    return {btn:true, open, label: btn.textContent};
  });
  ck("Settings → Help has the button", r.btn === true, JSON.stringify(r));
  ck("and it opens the page", r.open === true, JSON.stringify(r));
}

console.log("7 - THE STAMP TRAVELS IN A BACKUP");
{
  const r = await ev(()=>{
    window.__existing(); S.seenNews = NEWS_FOR;
    const o = backupObject();
    return {has: BACKUP_FIELDS.indexOf("seenNews") >= 0, val: o.seenNews, forV: NEWS_FOR};
  });
  ck("seenNews is a backup field", r.has === true, JSON.stringify(r));
  ck("and is written into the backup", r.val === r.forV, JSON.stringify(r));
}

console.log("8 - NO DATA IS TOUCHED BY OPENING OR CLOSING IT");
{
  const r = await ev(()=>{
    window.__existing();
    const before = JSON.stringify({p: S.program, s: S.sessions, pointer: S.pointer});
    openWhatsNew(); closeWhatsNew();
    const after = JSON.stringify({p: S.program, s: S.sessions, pointer: S.pointer});
    return {same: before === after};
  });
  ck("the plan and the log are identical afterwards", r.same === true, JSON.stringify(r));
}

console.log("9 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
