import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* A SAVE THAT FAILS ON A FULL BOX IS DATA LOSS.

   Reported from a device: "storage is full". That message was this app's own, and it was
   the end of the story — persist() caught the quota error, said so once in a toast, and
   returned false. Nothing was freed, nothing was retried, and the next write tried the
   same thing against the same full box. A session finished in that state is a session
   somebody performed and the app lost.

   So the one thing this spec exists to prove is the last one in section 3: fill the box
   until nothing more fits, then finish a session, and require that it is on disk
   afterwards. Everything above it is the machinery that has to be right for that to work:
   what counts as disposable, what is protected, and that freeing happens oldest-first. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
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

await p.evaluate(fx=>{
  window.boot = ()=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} hideModal();
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    ['preflight','aiFull'].forEach(id=>{ const el=document.getElementById(id); if(el) el.remove(); });
    try{PF=null}catch(e){}
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true;
    migrate(); try{ applySplit(); }catch(e){}
    try{ SEEDS_RUN = false; }catch(e){}
    render(); save();
  };
  /* A STUBBED QUOTA, because the real one is 5 MB and filling it for real takes seconds
     per run and is not reproducible across browsers. The stub is the honest part of the
     test: setItem throws QuotaExceededError exactly when the total would exceed a cap,
     which is what a real box does, and every other localStorage behaviour is untouched. */
  window.capStorage = (cap)=>{
    if(window.__realSet) return;
    window.__realSet = Storage.prototype.setItem;
    const total = ()=>{ let n = 0;
      for(let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i);
        n += (localStorage.getItem(k) || "").length + k.length; }
      return n; };
    Storage.prototype.setItem = function(k, v){
      const had = (localStorage.getItem(k) || "").length;
      if(total() - had + String(v).length + String(k).length > cap){
        const e = new Error("QuotaExceededError"); e.name = "QuotaExceededError"; throw e;
      }
      return window.__realSet.call(this, k, v);
    };
  };
  window.uncapStorage = ()=>{
    if(window.__realSet){ Storage.prototype.setItem = window.__realSet; window.__realSet = null; }
  };
}, FX);

console.log("1 - WHAT IS IN THE BOX, AND WHICH OF IT MAY BE DROPPED");
{
  const r = await p.evaluate(()=>{
    boot();
    const cats = {};
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i), c = storageCategoryOf(k);
      cats[c.id] = cats[c.id] || {label: c.label, drop: c.drop, bytes: 0, keys: 0};
      cats[c.id].bytes += storageSizeOf(k); cats[c.id].keys++;
    }
    return {cats, used: storageUsed(), budget: storageBudget(), quota: STORAGE_QUOTA};
  });
  Object.keys(r.cats).forEach(k=> console.log("    " + k.padEnd(10)
    + String(r.cats[k].bytes).padStart(8) + "  " + (r.cats[k].drop ? "disposable" : "PROTECTED")
    + "  " + r.cats[k].label));
  console.log("    used " + r.used + " of " + r.quota + ", disposable budget " + r.budget);
  ck("the live training data is protected", r.cats.live && !r.cats.live.drop, "live");
  ck("so is the account", !r.cats.account || !r.cats.account.drop, "account");
  ck("the disposable budget leaves room for the data to grow",
     r.budget < r.quota / 2 && r.budget > 0, r.budget + " of " + r.quota);
}

console.log("\n2 - A RESCUE BACKUP IS COMPRESSED NOW, NOT A SECOND COPY OF EVERYTHING");
{
  const r = await p.evaluate(async ()=>{
    boot();
    const live = (localStorage.getItem(dataKey()) || "").length;
    rescueBackupOnce("a test");
    await new Promise(res=> setTimeout(res, 400));
    const keys = [];
    for(let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i);
      if(k.indexOf(RESCUE_BACKUP_PREFIX) === 0 && !/\.why$/.test(k)) keys.push(k); }
    const body = keys.length ? localStorage.getItem(keys[0]) : "";
    const back = keys.length ? await rescueBackupRead(keys[0]) : null;
    return {live, n: keys.length, stored: body.length, how: body.slice(0, 3),
            readsBack: back != null && back.length === live};
  });
  console.log("    live " + r.live + " chars, backup " + r.stored + " (" + r.how + ")");
  ck("one backup was written", r.n === 1, String(r.n));
  ck("gzipped, not raw", r.how === "gz:" && r.stored < r.live / 3,
     r.how + " " + r.stored + " vs " + r.live);
  ck("and it reads back as exactly what was copied", r.readsBack, String(r.readsBack));
}

console.log("\n3 - A FULL BOX, AND A SESSION THAT STILL SAVES");
{
  const r = await p.evaluate(async ()=>{
    boot();
    /* Three backups and a patch snapshot, which is the shape the reporting device was in. */
    for(let i = 0; i < 3; i++){ rescueBackupOnce("filler " + i); await new Promise(s2=> setTimeout(s2, 120)); }
    await patchApply(JSON.stringify({e26patch: 1, note: "something to snapshot",
      ops: [{op: "volume.floor", muscle: "quads", to: 7}]}));
    const before = {used: storageUsed(), disposable: storageDisposable().length,
                    snaps: (S.patchLog || []).filter(x=> x.snap).length};
    /* Now cap the box at what is already in it: nothing more fits, at all. */
    capStorage(storageUsed());
    const wrote = save();
    const after = {used: storageUsed(), disposable: storageDisposable().length,
                   snaps: (S.patchLog || []).filter(x=> x.snap).length};
    /* And the thing that matters: a finished session, on a box that was full. */
    S.sessions.push({id: "fullbox", workoutId: "legsA", date: "2026-11-19",
      startedAt: Date.now(), finishedAt: Date.now(), feel: 4,
      entries: [{name: "Smith Machine Squat", reps: "9-13",
                 sets: [{weight: "75", reps: "10", rpe: "8", done: true}]}]});
    const saved = save();
    let onDisk = null;
    try{ onDisk = (JSON.parse(localStorage.getItem(dataKey()) || "{}").sessions || [])
                    .some(s2=> s2 && s2.id === "fullbox"); }catch(e){ onDisk = "unreadable"; }
    uncapStorage();
    return {before, after, wrote, saved, onDisk,
            modal: !!document.getElementById("modal") && /out of storage|Save your data/i
                     .test(document.body.innerText)};
  });
  console.log("    before: " + r.before.used + " used, " + r.before.disposable
            + " disposable, " + r.before.snaps + " snapshots");
  console.log("    after:  " + r.after.used + " used, " + r.after.disposable
            + " disposable, " + r.after.snaps + " snapshots");
  ck("the write that did not fit made room for itself", r.wrote, String(r.wrote));
  ck("by dropping disposable copies, oldest first",
     r.after.disposable < r.before.disposable, r.before.disposable + " -> " + r.after.disposable);
  /* THE ONE THIS SPEC EXISTS FOR. */
  ck("A SESSION FINISHED ON A FULL BOX IS STILL SAVED", r.saved === true && r.onDisk === true,
     "save() " + r.saved + ", on disk " + r.onDisk);
  /* CORRECTED: this asserted that the snapshot count fell, which assumed the snapshot
     would be the thing dropped. Oldest-first took a rescue backup instead, which is the
     behaviour asked for - a snapshot is newer and more useful than a backup of a repair
     that already went fine. The invariant worth asserting is the one about honesty, so it
     is asserted directly: drop the snapshot, and the history row must stop claiming it. */
  const honest = await p.evaluate(()=>{
    const row = (S.patchLog || []).find(x=> x && x.snap);
    if(!row) return {skip: true};
    const before = row.snap;
    storageDropItem(PATCH_SNAP_PREFIX + row.id);
    return {before, after: row.snap, card: patchCardHTML()};
  });
  ck("CONTROL: dropping a snapshot makes its history row stop claiming one",
     honest.skip ? false : (honest.before === true && honest.after === false),
     honest.skip ? "no snapshot to drop" : honest.before + " -> " + honest.after);
  ck("and the screen says reverse-only for it", !honest.skip && /reverse only/.test(honest.card),
     honest.skip ? "skipped" : (honest.card.match(/reverse only[^<]*/) || ["missing"])[0]);
}

console.log("\n4 - AND WHEN ONLY PROTECTED DATA IS LEFT, IT SAYS SO RATHER THAN LYING");
{
  const r = await p.evaluate(()=>{
    boot();
    /* Everything disposable gone, then a box with no room at all. */
    storageDisposable().forEach(x=> storageDropItem(x.key));
    STORAGE_FULL_SHOWN = false;
    capStorage(storageUsed());
    S.sessions.push({id: "nowhere", workoutId: "legsA", date: "2026-11-20",
      startedAt: Date.now(), finishedAt: Date.now(), feel: 4, entries: []});
    const saved = save();
    const text = document.body.innerText;
    const stillThere = (S.sessions || []).some(s2=> s2 && s2.id === "nowhere");
    uncapStorage();
    const onDisk = (()=>{ try{ return (JSON.parse(localStorage.getItem(dataKey()) || "{}")
      .sessions || []).some(s2=> s2 && s2.id === "nowhere"); }catch(e){ return false; } })();
    hideModal();
    return {saved, stillThere, onDisk, sticky: MODAL_STICKY,
            says: /Save your data to a file/i.test(text), export: /Export everything/i.test(text)};
  });
  ck("the save reports failure rather than success", r.saved === false, String(r.saved));
  ck("the data is still in memory", r.stillThere, String(r.stillThere));
  ck("and it is honestly not on disk", !r.onDisk, String(r.onDisk));
  ck("a dialogue says so, and offers the export", r.says && r.export,
     JSON.stringify({says: r.says, export: r.export}));
  ck("CONTROL: and it cannot be dismissed into silence", r.sticky, String(r.sticky));
}

console.log("\n5 - THE BUDGET KEEPS THE PILE DOWN WITHOUT ANYTHING FAILING FIRST");
{
  const r = await p.evaluate(async ()=>{
    boot();
    for(let i = 0; i < 6; i++){ rescueBackupOnce("f" + i); await new Promise(s2=> setTimeout(s2, 90)); }
    const before = storageDisposable().reduce((n, x)=> n + x.bytes, 0);
    storagePrune();
    const after = storageDisposable().reduce((n, x)=> n + x.bytes, 0);
    return {before, after, budget: storageBudget(), kept: storageDisposable().length};
  });
  console.log("    disposable " + r.before + " -> " + r.after + " against a budget of " + r.budget);
  ck("the pile is held under the shared budget", r.after <= r.budget, r.after + " / " + r.budget);
  ck("CONTROL: and something is still kept, rather than everything thrown away",
     r.kept > 0, r.kept + " kept");
}

console.log("\n6 - WHAT GOES FIRST, AND WHAT GOES LAST");
{
  /* THE REGRESSION THIS SECTION EXISTS FOR. Disposable items were ordered by age alone,
     and a cache carries no timestamp, so it read as age 0 - always the oldest thing on the
     device. The research feed is the better part of a megabyte of it, so writing a single
     rescue backup evicted the whole thing, every time, and the Research tab lost the only
     offline copy of what the reader had saved. Reported as "research is no longer
     working", found by probing rather than by reading. */
  const r = await p.evaluate(async ()=>{
    boot();
    /* A feed in the cache, big enough to be the obvious thing to sacrifice. */
    const papers = [];
    for(let i = 0; i < 300; i++) papers.push({id: "p" + i, title: "x".repeat(600),
      journal: "j", published: "2025-11", publishedAt: Date.now(), type: "rct"});
    researchCacheWrite(papers, Date.now());
    const had = (researchCacheRead() || {papers: []}).papers.length;
    for(let i = 0; i < 2; i++){ rescueBackupOnce("f" + i); await new Promise(s2=> setTimeout(s2, 110)); }
    await patchApply(JSON.stringify({e26patch: 1, note: "snap",
      ops: [{op: "volume.floor", muscle: "quads", to: 7}]}));
    const order = storageDisposable().map(x=> x.cat.id);
    const kept = (researchCacheRead() || {papers: []}).papers.length;
    /* And when room really is needed, it is still the LAST to go, not the first. */
    const dropped = [];
    for(let i = 0; i < 9; i++){ const d = storageFreeOne(); if(!d) break; dropped.push(d.cat.id); }
    return {had, kept, order, dropped,
            cacheGone: !localStorage.getItem(RESEARCH_CACHE_KEY)};
  });
  console.log("    order of sacrifice: " + r.order.join(" -> "));
  console.log("    freed in turn:      " + r.dropped.join(" -> "));
  ck("a feed went into the cache", r.had === 300, String(r.had));
  ck("writing backups and a snapshot does not touch it", r.kept === 300,
     r.had + " -> " + r.kept);
  ck("the research cache sorts last among disposable things",
     r.order[r.order.length - 1] === "research", r.order.join(","));
  ck("CONTROL: and when space is genuinely needed it is the last one freed",
     r.dropped.length > 1 && r.dropped[r.dropped.length - 1] === "research"
       && r.dropped.indexOf("research") === r.dropped.length - 1,
     r.dropped.join(" -> "));
  ck("CONTROL: which does eventually free it, rather than protecting it for ever",
     r.cacheGone, String(r.cacheGone));
}

console.log("\n7 - THE STORAGE SCREEN");
{
  const r = await p.evaluate(async ()=>{
    boot();
    S.patchLog = [];
    await patchApply(JSON.stringify({e26patch: 1, note: "a patch to snapshot",
      ops: [{op: "volume.floor", muscle: "quads", to: 7}]}));
    rescueBackupOnce("a repair");
    await new Promise(s2=> setTimeout(s2, 160));
    const papers = [];
    for(let i = 0; i < 150; i++) papers.push({id: "p" + i, title: "x".repeat(400),
      journal: "j", published: "2025-11", publishedAt: Date.now(), type: "rct"});
    researchCacheWrite(papers, Date.now());
    STORAGE_OPEN = {};
    const rows = storageBreakdown();
    const card = storageCardHTML();
    return {cats: rows.map(x=> ({id: x.cat.id, bytes: x.bytes,
                                 items: x.items.length,
                                 droppable: x.items.filter(i=> i.drop).length})),
            used: storageUsed(),
            sumOfCats: rows.reduce((n, x)=> n + x.bytes, 0),
            card: card};
  });
  r.cats.forEach(c=> console.log("    " + c.id.padEnd(10) + String(c.bytes).padStart(8)
    + "  " + c.droppable + " of " + c.items + " deletable"));

  /* 3. THE TOTAL SHOWN MATCHES WHAT IS ACTUALLY STORED. Not "close to": the breakdown is
     a partition of the same keys the total is summed from, so the two are equal or the
     screen is lying about one of them. */
  ck("the breakdown adds up to the total", r.sumOfCats === r.used,
     r.sumOfCats + " vs " + r.used);
  /* THE FIGURE MOVED INTO THE HERO, so it is read from where it now is rather than from
     the one string "824 KB of about 5120 KB" it used to be printed as. The number is the
     hero's readout and the quota is the sentence under it; both are still on the screen,
     and the assertion is still that the screen's number equals the one actually stored. */
  const shownKB = (html)=>{
    const m = String(html).match(/sd-hero-v">([\d.]+)<i>/);
    return m ? parseFloat(m[1]) : NaN;
  };
  const wantKB = Math.round(r.used / 1024 * 10) / 10 >= 100
    ? Math.round(r.used / 1024) : Math.round(r.used / 1024 * 10) / 10;
  ck("and the total is what the screen prints",
     shownKB(r.card) === wantKB && /of about [\d.]+ KB/.test(r.card),
     shownKB(r.card) + " KB shown, " + wantKB + " KB stored");

  /* 1. PROTECTED DATA HAS NO BUTTON - not a disabled one, not a confirmation, none. */
  const live = r.cats.find(c=> c.id === "live");
  const acct = r.cats.find(c=> c.id === "account");
  ck("your training data is listed", !!live && live.bytes > 100000, live && live.bytes);
  ck("CONTROL: and nothing in it is deletable", live && live.droppable === 0,
     live && live.droppable + " deletable");
  ck("nor anything in the account", !acct || acct.droppable === 0,
     acct ? acct.droppable + " deletable" : "no account keys");
  const liveKeys = await p.evaluate(()=> storageBreakdown()
    .filter(r2=> r2.cat.id === "live" || r2.cat.id === "account" || r2.cat.id === "other")
    .reduce((a, r2)=> a.concat(r2.items.map(i=> i.key)), []));
  ck("CONTROL: and no delete button anywhere on the screen names one of their keys",
     liveKeys.every(k=> r.card.indexOf('data-stoone="' + k + '"') < 0),
     liveKeys.join(", ").slice(0, 80));
  ck("the screen says so in words too", /nothing here can be deleted/i.test(r.card),
     "said");

  /* 2. FREEING A SNAPSHOT HERE LEAVES THE PATCH UNDO WORKING - the same behaviour as the
     patch screen's own button, because it is the same function behind both doors. */
  const snap = await p.evaluate(()=>{
    const row = (S.patchLog || [])[0];
    const key = PATCH_SNAP_PREFIX + row.id;
    const before = {snap: row.snap, floor: (S.lmFloor || {}).quads, used: storageUsed()};
    const freed = storageFreeKey(key);
    const after = {snap: patchEntry(row.id).snap, row: !!patchEntry(row.id),
                   journal: patchEntry(row.id).journal.length, used: storageUsed()};
    const out = patchUndoRun(row.id);
    return {freed, before, after, reversed: out.reversed,
            floorNow: (S.lmFloor || {}).quads};
  });
  ck("freeing a snapshot from here frees the bytes",
     snap.freed > 100000 && snap.after.used < snap.before.used,
     snap.freed + " chars");
  ck("the patch row survives with its journal",
     snap.after.row && snap.after.journal > 0 && snap.after.snap === false,
     "snap " + snap.before.snap + " -> " + snap.after.snap);
  ck("CONTROL: and the patch can still be undone afterwards",
     snap.reversed > 0 && snap.floorNow !== snap.before.floor,
     snap.reversed + " reversed, quads floor " + snap.before.floor + " -> " + snap.floorNow);

  /* 5. THE FIGURE AT THE TOP IS READ FRESH, so a delete updates it. */
  const fresh = await p.evaluate(()=>{
    const read = ()=>{ const m = storageCardHTML().match(/sd-hero-v">([\d.]+)<i>/);
      return m ? parseFloat(m[1]) : NaN; };
    const before = read();
    const item = storageDisposable()[0];
    if(item) storageFreeKey(item.key);
    return {before, after: read(), dropped: !!item};
  });
  ck("the usage figure moves as soon as something is freed",
     fresh.dropped && fresh.after < fresh.before,
     fresh.before + " KB -> " + fresh.after + " KB");

  /* 1 again, from the other end: the export is offered before any of it. */
  ck("the export is offered above everything else",
     r.card.indexOf("stoExport") > -1
     && r.card.indexOf("stoExport") < r.card.indexOf("data-stoall"),
     "export at " + r.card.indexOf("stoExport") + ", first delete at " + r.card.indexOf("data-stoall"));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
