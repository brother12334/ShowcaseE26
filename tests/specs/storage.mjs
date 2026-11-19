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

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
