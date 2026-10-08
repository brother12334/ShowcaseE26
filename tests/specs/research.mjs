/* RESEARCH LAB IN THE APP, DRIVEN FROM A FIXTURE.

   The network is stubbed, so nothing here depends on the Worker being up or on what the
   literature happens to contain this week. The fixture is synthetic on purpose — see the
   note at the top of it.

   WHAT THIS IS REALLY FOR. Three of these checks are the ones that matter more than the
   rest of the feature put together: that a paper with no summary is SAID to have no
   summary rather than being dressed up or dropped, that nothing about the reader's
   training leaves the device, and that "Apply to my training" cannot touch the plan. */
import { chromium, APP_URL } from './_e26.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = JSON.parse(readFileSync(path.join(here, '..', 'fixtures', 'research-feed.json'), 'utf8'));

const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* EVERY REQUEST THE PAGE MAKES IS RECORDED, so section 7 can assert on the whole set
   rather than on the one call it expected. */
const seen = [];
await p.route(/^https?:/, r=>{
  const u = r.request().url();
  seen.push({url: u, method: r.request().method(), body: r.request().postData() || ""});
  if(/\/research\/feed/.test(u))
    return r.fulfill({status:200, contentType:"application/json", body: JSON.stringify(FIX)});
  return r.abort();
});
/* NOTHING DESTRUCTIVE RUNS IN AN INIT SCRIPT, AND THAT IS THE WHOLE POINT.

   This spec reloads the page in section 4 to prove a bookmark survives. An init script
   runs again on every navigation, so a clear-and-seed in one would wipe the very thing the
   reload is checking. Guarding it with a marker key looked like the fix and was not: the
   guard reads the same storage it is protecting, and on roughly one run in ten that read
   came back empty before the origin's storage was attached — the guard passed, clear()
   ran, and the saved paper and the cached feed both vanished. It presented as "the app
   lost a bookmark across a reload", which is a frightening and completely false reading.

   So the seed is written ONCE, from the page, after the first load, and the reload that
   follows boots the app against it. There is no init script left to fire a second time. */
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.evaluate(()=>{
  localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X');
  localStorage.setItem('ironlog.v1', JSON.stringify({
    setup:{name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()-400*86400e3},
    tourDone:true, geo:'off', splitId:'ppl6', sessions:[] }));
});
await p.reload({waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{ S.seenNews = NEWS_FOR; saveQuiet(); });
const ev = (fn,a)=> p.evaluate(fn,a);

console.log("0 - AN UNCONFIGURED SERVICE IS NEVER CALLED");
{
  /* RESEARCH_API SHIPS EMPTY AND THAT IS A SAFETY CATCH, not an oversight: while it is
     blank the app must not reach for the network at all, so a deploy of the Worker cannot
     put unreviewed summaries in front of anybody. The rest of this spec then overrides it
     to exercise the feed, which is why this check comes first. */
  const r = await ev(async ()=>{
    const before = (window.__fetchCount || 0);
    const conf = researchConfigured();
    const api = RESEARCH_API;
    await researchFetchFeed();
    return {conf, api, err: RESEARCH_ERROR, loading: RESEARCH_LOADING};
  });
  ck("RESEARCH_API SHIPS EMPTY", r.api === "", JSON.stringify(r.api));
  ck("so the app reports itself unconfigured", r.conf === false, String(r.conf));
  ck("A FETCH WITH NO SERVICE DOES NOTHING AND IS NOT AN ERROR",
     r.err === "" && r.loading === false, JSON.stringify(r));
  const reqs = seen.filter(x=> /\/research\//.test(x.url)).length;
  ck("and no research request was made at all", reqs === 0, String(reqs));
  /* The screen says the honest thing rather than showing an error. */
  const note = await ev(()=>{
    goTab("research");
    return (document.querySelector('.rs-note h3')||{}).textContent;
  });
  ck("the tab shows \"No papers yet\"", /No papers yet/.test(note || ""), note);
}

/* FROM HERE ON the service is pointed at a stub, so the feed itself can be exercised.
   Done by overriding the constant rather than by editing the file, so the shipped value
   stays the empty one section 0 just asserted. */
await p.evaluate(()=>{
  researchBase = ()=> "https://element26-research.test.workers.dev";
});
await ev(async ()=>{ await researchFetchFeed(); goTab("research"); });

console.log("1 - THE FEED RENDERS FROM WHAT THE WORKER SENT");
{
  const r = await ev(()=> ({
    cards: document.querySelectorAll('.rs-card').length,
    secs: Array.from(document.querySelectorAll('.rs-sec')).map(x=> x.textContent),
    firstTitle: (document.querySelector('.rs-t')||{}).textContent,
    kick: (document.querySelector('.rs-kick')||{}).textContent
  }));
  ck("every fixture paper is on screen", r.cards === 4, String(r.cards));
  ck("the meta line reads type, topic and date",
     /RANDOMIZED TRIAL|META-ANALYSIS|OBSERVATIONAL|CONTROLLED STUDY/.test(r.kick)
     && /2026/.test(r.kick), r.kick);
  /* NO NUMERIC SCIENCE SCORE, ANYWHERE. Checked against the rendered app region rather
     than the whole body: the body's textContent also picks up inline <style> and <script>
     text, which contains ratios like line-height and 1/100 that are not scores and would
     make this assertion meaningless. */
  {
    const hit = await ev(()=>{
      const t = (document.getElementById('app')||document.body).textContent || "";
      const m = t.match(/\b\d{1,3}\s*\/\s*100\b|score\s*[:=]\s*\d/i);
      return m ? m[0] : null;
    });
    ck("AND THERE IS NO NUMERIC SCIENCE SCORE ANYWHERE", hit === null, String(hit));
  }
}

console.log("2 - A PAPER WITH NO SUMMARY SAYS SO, AND STILL LINKS OUT");
{
  const r = await ev(()=>{
    const card = Array.from(document.querySelectorAll('.rs-card'))
      .find(c=> c.dataset.rspaper === "fx4");
    return {found: !!card, pending: !!(card && card.querySelector('.rs-pending')),
            text: card ? card.textContent : "",
            invented: card ? /\bstudied\b.*\bfound\b/.test(card.textContent) : false};
  });
  ck("it is listed rather than hidden", r.found === true, "");
  ck("IT SAYS THE SUMMARY IS NOT READY", r.pending === true, "");
  ck("and it does not invent one", r.invented === false, r.text.slice(0, 120));
  /* The detail page has to do the same thing. */
  await ev(()=>{ RESEARCH_PAPER = "fx4"; render(); });
  const d = await ev(()=> ({
    note: (document.querySelector('.rs-note h3')||{}).textContent,
    link: (document.querySelector('#rsOrig')||{}).getAttribute('href'),
    disc: !!document.querySelector('.rs-disc')
  }));
  ck("the detail page says it too", /No summary yet/.test(d.note || ""), d.note);
  ck("AND THE ORIGINAL IS STILL ONE TAP AWAY", /pubmed\.ncbi/.test(d.link || ""), d.link);
  ck("with the disclaimer present", d.disc === true, "");
}

console.log("3 - THE DETAIL PAGE IS IN THE BRIEF'S ORDER");
{
  await ev(()=>{ RESEARCH_PAPER = "fx1"; render(); });
  const r = await ev(()=>{
    const ks = Array.from(document.querySelectorAll('.rs-dk')).map(x=> x.textContent.trim());
    return {ks, title: (document.querySelector('.rs-dt')||{}).textContent,
            meta: (document.querySelector('.rs-dmeta')||{}).textContent,
            by: (document.querySelector('.rs-dby')||{}).textContent || "",
            lims: document.querySelectorAll('.rs-lim li').length,
            doi: (document.querySelector('.rs-doi')||{}).textContent || "",
            apply: !!document.querySelector('#rsApply')};
  });
  ck("the title is the paper's", /Weekly set volume/.test(r.title), r.title);
  ck("journal, date and evidence type are together",
     /Journal of Test Science/.test(r.meta) && /RANDOMIZED TRIAL/.test(r.meta), r.meta);
  ck("THE SECTIONS RUN TAKEAWAY, STUDIED, PARTICIPANTS, FOUND, LIFTERS, LIMITATIONS",
     r.ks.join("|").toLowerCase() ===
     "quick takeaway|what they studied|participants|what they found|what this means for lifters|limitations",
     r.ks.join(" | "));
  ck("every limitation is listed", r.lims === 3, String(r.lims));
  ck("the DOI is shown", /10\.0000/.test(r.doi), r.doi);
  ck("and an actionable paper offers Apply to my training", r.apply === true, "");
}

console.log("4 - SAVE, READ AND SHARE PERSIST THROUGH A RELOAD");
{
  await ev(()=>{
    researchToggleSave("fx1");
    researchMarkRead("fx3");
    RESEARCH_PAPER = null; render();
  });
  const before = await ev(()=> ({saved: Object.keys(S.research.saved),
                                 read: Object.keys(S.research.read),
                                 inBackup: BACKUP_FIELDS.indexOf("research") > -1}));
  ck("a save is recorded", before.saved.join(",") === "fx1", before.saved.join(","));
  ck("so is a read", before.read.join(",") === "fx3", before.read.join(","));
  ck("AND IT TRAVELS IN A BACKUP AND THEREFORE IN SYNC", before.inBackup === true, "");
  /* THE WRITE IS CONFIRMED BEFORE THE RELOAD, so a failure here says which half broke.
     A full-quota localStorage makes persist() return false and swallow the write, and the
     first version of this check reported that as "the save did not survive the reload" —
     the same message a genuine load bug would produce, which is the least useful thing a
     test can say. */
  const onDisk = await ev(()=>{
    try{
      const d = JSON.parse(localStorage.getItem(dataKey()) || "{}");
      return {ok: true, saved: Object.keys((d.research || {}).saved || {})};
    }catch(e){ return {ok: false, why: String(e.message)}; }
  });
  ck("the save reached the disk copy", onDisk.ok && onDisk.saved.join(",") === "fx1",
     JSON.stringify(onDisk));
  await p.reload({waitUntil:"domcontentloaded"});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  const after = await ev(()=> ({saved: Object.keys((S.research||{}).saved||{}),
                                read: Object.keys((S.research||{}).read||{})}));
  ck("the save survived the reload", after.saved.join(",") === "fx1", after.saved.join(","));
  ck("and so did the read", after.read.join(",") === "fx3", after.read.join(","));
}

console.log("4B - TWO DEVICES' BOOKMARKS UNION RATHER THAN CLOBBER");
{
  /* S.research goes into BACKUP_FIELDS and into the merge, which the brief asked for in
     one breath and which is easy to half-do. Without a merge rule, saving a paper on a
     phone and another on a laptop leaves whichever synced last holding one of them. */
  const r = await ev(()=>{
    /* PUT BACK WHAT THIS CHECK BORROWS. Section 9 reads the real saved and read lists, and
       the first version of this left its synthetic ids in place and broke it. */
    const keep = JSON.stringify(S.research);
    S.research.saved = {phoneOnly: 1000, both: 5000};
    S.research.read = {};
    const keepAt = S.savedAt;
    S.savedAt = 2000;
    const disk = {savedAt: 1000, research: {saved: {laptopOnly: 2000, both: 3000}, read: {r1: 7}}};
    mergeDiskInto(disk);
    const out = {saved: S.research.saved, read: Object.keys(S.research.read)};
    S.research = JSON.parse(keep);
    S.savedAt = keepAt;
    saveQuiet();
    return out;
  });
  ck("the phone's save is kept", r.saved.phoneOnly === 1000, JSON.stringify(r.saved));
  ck("AND SO IS THE LAPTOP'S", r.saved.laptopOnly === 2000, JSON.stringify(r.saved));
  ck("one saved on both keeps the earlier moment", r.saved.both === 3000, String(r.saved.both));
  ck("and the read list unions too", r.read.join(",") === "r1", r.read.join(","));
}

console.log("5 - THE CACHED FEED IS READABLE OFFLINE");
{
  const r = await ev(()=>{
    goTab("research");
    const cached = researchCacheRead();
    return {n: cached ? cached.papers.length : 0,
            cards: document.querySelectorAll('.rs-card').length};
  });
  ck("THE FEED IS STILL THERE AFTER A RELOAD WITH NO FETCH", r.n === 4, String(r.n));
  ck("and it renders", r.cards === 4, String(r.cards));
  /* And it is honest about being a cache once it ages. */
  const asof = await ev(()=>{
    const c = researchCacheRead();
    researchCacheWrite(c.papers, Date.now() - 9 * 86400000);
    RESEARCH_ERROR = "offline"; render();
    const t = (document.querySelector('.rs-asof')||{}).textContent || "";
    RESEARCH_ERROR = "";
    return t;
  });
  ck("A WEEK-OLD CACHE SAYS SO RATHER THAN PASSING ITSELF OFF AS NEW",
     /Showing papers from/.test(asof) && /offline/i.test(asof), asof);
}

console.log("6 - FILTERS AND SEARCH");
{
  const r = await ev(()=>{
    const c = researchCacheRead();
    researchCacheWrite(c.papers, Date.now());
    const f = researchState().filters;
    f.topics = ["sleep"]; f.types = []; f.recency = "all";
    render();
    const sleepOnly = Array.from(document.querySelectorAll('.rs-card')).map(x=> x.dataset.rspaper);
    f.topics = []; f.types = ["meta"];
    render();
    const metaOnly = Array.from(document.querySelectorAll('.rs-card')).map(x=> x.dataset.rspaper);
    f.types = [];
    RESEARCH_Q = "failure";
    render();
    const searched = Array.from(document.querySelectorAll('.rs-card')).map(x=> x.dataset.rspaper);
    RESEARCH_Q = "zzzznothing";
    render();
    const empty = (document.querySelector('.rs-note h3')||{}).textContent;
    RESEARCH_Q = "";
    f.recency = "latest";
    render();
    return {sleepOnly, metaOnly, searched, empty};
  });
  ck("a topic filter narrows the list", r.sleepOnly.join(",") === "fx2", r.sleepOnly.join(","));
  ck("so does a research-type filter", r.metaOnly.join(",") === "fx3", r.metaOnly.join(","));
  ck("search finds the paper by its subject", r.searched.indexOf("fx3") > -1, r.searched.join(","));
  ck("AND AN EMPTY SEARCH SAYS NOTHING IS VERIFIED YET, not that nothing exists",
     /No verified papers on that yet/.test(r.empty || ""), r.empty);
}

console.log("7 - NOTHING ABOUT THE READER'S TRAINING LEAVES THE DEVICE");
{
  /* The strongest version of this check: look at every request the page made, not just the
     research one, and assert that none of them carried a field of S. */
  const r = await ev(()=>{
    /* Give the picker something to work with first, so it has run for real. */
    S.sessions = [{id:"s1", startedAt: Date.now() - 86400000, entries:[
      {name:"Barbell Bench Press", sets: Array.from({length:30},()=>({weight:"100",reps:"8",rpe:"9",done:true}))}]}];
    saveQuiet();
    goTab("research");
    const picks = researchPicks(researchCacheRead().papers);
    return {n: picks.length, whys: picks.map(x=> x.why)};
  });
  ck("the picker runs and has something to say", r.n > 0, JSON.stringify(r.whys));
  ck("and its reason is about the training, not the person",
     r.whys.every(w=> /research|training|plan|muscles|size|strength|deficit/i.test(w)), JSON.stringify(r.whys));
  const leaked = seen.filter(x=>{
    const blob = (x.url + " " + x.body).toLowerCase();
    return /sessions|rpe|lmcal|volclimb|bodylog|priortrainingweeks|ironlog/.test(blob);
  });
  ck("NO REQUEST ANYWHERE CARRIED TRAINING DATA", leaked.length === 0,
     leaked.map(x=> x.method + " " + x.url).join(" | "));
  const toResearch = seen.filter(x=> /element26-research/.test(x.url));
  ck("the research calls were plain GETs with no body",
     toResearch.every(x=> x.method === "GET" && !x.body),
     JSON.stringify(toResearch.map(x=> x.method + ":" + (x.body||"").length)));
  /* And the switch really switches it off. */
  const off = await ev(()=>{
    if(!S.prefs) S.prefs = {};
    S.prefs.researchPicks = false;
    const n = researchPicks(researchCacheRead().papers).length;
    S.prefs.researchPicks = true;
    return n;
  });
  ck("and turning picks off turns them off", off === 0, String(off));
}

console.log("8 - APPLY TO MY TRAINING NEVER TOUCHES THE PLAN");
{
  const r = await ev(()=>{
    const r0 = buildPlan({days:4, gear:"full", goal:"muscle", minutes:60,
                          trainingWeeks:60, priority:[]});
    S.program = r0.program; S.splitId = r0.split.id;
    if(r0.split.layout) S.splitLayout = r0.split.layout;
    applySplit(); save();
    const before = JSON.stringify(S.program);
    const logBefore = (S.planLog || []).length;
    RESEARCH_PAPER = "fx1"; render();
    openResearchApply("fx1");
    const sheet = (document.querySelector('.modal, .sheet, #modal') || document.body).textContent;
    const after = JSON.stringify(S.program);
    try{ hideModal(); }catch(e){}
    return {same: before === after, logSame: (S.planLog || []).length === logBefore,
            sheet: sheet.slice(0, 900)};
  });
  ck("THE PROGRAM IS BYTE-FOR-BYTE UNCHANGED", r.same === true, "");
  ck("and nothing was written to the plan history either", r.logSame === true, "");
  ck("the sheet says it changes nothing", /changes your plan/.test(r.sheet), r.sheet.slice(0,160));
  ck("it states what the paper suggests", /What this paper suggests/.test(r.sheet), "");
  ck("it shows the reader's own numbers", /Your current training on this/.test(r.sheet), "");
  ck("AND IT NAMES THE POPULATION CAVEAT", /resistance-trained|untrained/.test(r.sheet), "");
  ck("with a way out that changes nothing", /Not now/.test(r.sheet), "");
}

console.log("9 - SAVED RESEARCH");
{
  const r = await ev(()=>{
    RESEARCH_PAPER = null; RESEARCH_VIEW = "saved"; RESEARCH_SAVED_TAB = "saved";
    render();
    const saved = Array.from(document.querySelectorAll('.rs-card')).map(x=> x.dataset.rspaper);
    RESEARCH_SAVED_TAB = "read"; render();
    const read = Array.from(document.querySelectorAll('.rs-card')).map(x=> x.dataset.rspaper);
    RESEARCH_VIEW = "feed"; render();
    return {saved, read};
  });
  ck("the saved tab lists what was saved", r.saved.join(",") === "fx1", r.saved.join(","));
  ck("and the read tab lists what was read", r.read.join(",") === "fx3", r.read.join(","));
}

console.log("10 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
