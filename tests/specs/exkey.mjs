import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* WHEN AN EXERCISE'S KEY CHANGES, EVERYTHING KEYED BY IT HAS TO MOVE WITH IT.

   `nrm()` is `canonEx()`, which reads the alias table. So anything that edits an alias
   changes what every exercise name in the app canonicalises to — and every piece of stored
   state keyed by that answer is, from that instant, keyed to a name that no longer exists.
   State that is COMPUTED is fine; state that is STORED is not.

   S.stalls is the one that exists today. The bug this spec was written for: Rule A's
   attachment split relabels the log and rebuilds nothing, so on the real export the Push A
   triceps counter stayed filed under the V-bar name it had been merged with, and the slot
   that actually exists had no counter at all. The value was n:0 there, so nothing was
   visible; a slot sitting at n:2 would have silently started again from zero and the stall
   protocol would not have fired when it should.

   THE INVARIANT, AND WHY IT IS AN INVARIANT RATHER THAN A TEST OF ONE PATH: stored
   S.stalls must equal a fresh rebuildStalls(), after every path that can change a key.
   There are six of them now and there will be more — the plan-patch rename op would have
   reintroduced this exact bug the day it shipped — so they all go through one hook and
   this spec checks the invariant rather than the hook. */
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

/* The whole check, in one function in the page: does the stored map equal a rebuild? */
await p.evaluate(()=>{
  window.stallsHonest = ()=>{
    const stored = JSON.stringify(S.stalls || {});
    const keep = JSON.parse(stored);
    rebuildStalls();
    const fresh = JSON.stringify(S.stalls || {});
    S.stalls = keep;                              // the check must not be the repair
    const a = JSON.parse(stored), c = JSON.parse(fresh);
    const keys = Object.keys(Object.assign({}, a, c)).sort();
    return {ok: stored === fresh,
            diff: keys.filter(k=> JSON.stringify(a[k]) !== JSON.stringify(c[k]))
                      .map(k=> k + ": " + JSON.stringify(a[k]) + " -> " + JSON.stringify(c[k]))};
  };
  window.boot = (fx)=>{
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
});

console.log("1 - THE INVARIANT ON THE REAL EXPORT, THROUGH A REAL BOOT");
{
  const r = await p.evaluate(fx=>{ boot(fx); return {h: stallsHonest(), split: !!S.attachSplitV1}; }, FX);
  ck("the attachment split ran on this load", r.split, String(r.split));
  r.h.diff.forEach(d=> console.log("    " + d));
  /* THE REGRESSION. Before the fix this printed two lines: the Push A counter filed under
     the V-bar name, and nothing under the name Push A actually prescribes. */
  ck("stored stalls equal a fresh rebuild after boot", r.h.ok, r.h.diff.join(" | ") || "identical");
}

console.log("\n2 - AND AFTER EVERY PATH THAT CHANGES A KEY");
{
  /* The program editor's rename, as the editor itself performs it. */
  const rename = await p.evaluate(fx=>{
    boot(fx);
    const was = "Seated Leg Curl", to = "Seated Leg Curl Machine";
    let moved = 0;
    (S.sessions || []).forEach(s=> (s.entries || []).forEach(en=>{
      if(nrmRaw(en.name) === nrmRaw(was)){ en.name = to; moved++; }
    }));
    (S.program.legsA || []).forEach(e=>{ if(e.name === was) e.name = to; });
    (S.program.legsB || []).forEach(e=>{ if(e.name === was) e.name = to; });
    S.exAliases = S.exAliases || {};
    S.exAliases[nrmRaw(was)] = to;
    exerciseKeysChanged("rename");
    return {moved: moved, h: stallsHonest()};
  }, FX);
  ck("a rename moves the log and leaves the counters honest",
     rename.moved > 0 && rename.h.ok, rename.h.diff.join(" | ") || rename.moved + " entries moved");

  const undoSplit = await p.evaluate(fx=>{
    boot(fx);
    undoAttachmentSplit();
    return stallsHonest();
  }, FX);
  ck("undoing the attachment split leaves them honest", undoSplit.ok,
     undoSplit.diff.join(" | ") || "identical");

  const patchRename = await p.evaluate(async fx=>{
    boot(fx);
    const r = await patchApply(JSON.stringify({e26patch: 1, note: "rename it",
      ops: [{op: "slot.rename", day: "Legs B", exercise: "Dumbbell RDL", to: "Dumbbell Hip Hinge"}]}));
    return {ok: r.ok, h: stallsHonest(),
            named: (S.program.legsB || [])[0].name};
  }, FX);
  ck("a patch's rename op leaves them honest", patchRename.ok && patchRename.h.ok,
     patchRename.h.diff.join(" | ") || patchRename.named);

  const patchSwap = await p.evaluate(async fx=>{
    boot(fx);
    const r = await patchApply(JSON.stringify({e26patch: 1, note: "same movement, other spelling",
      ops: [{op: "slot.replace", day: "Legs B", exercise: "Dumbbell RDL",
             to: "Dumbbell Romanian Deadlift", keepHistory: true}]}));
    return {ok: r.ok, h: stallsHonest()};
  }, FX);
  ck("so does a patch's history-keeping swap", patchSwap.ok && patchSwap.h.ok,
     patchSwap.h.diff.join(" | ") || "identical");

  const patchUndone = await p.evaluate(async fx=>{
    boot(fx);
    const r = await patchApply(JSON.stringify({e26patch: 1, note: "rename it",
      ops: [{op: "slot.rename", day: "Legs B", exercise: "Dumbbell RDL", to: "Dumbbell Hip Hinge"}]}));
    patchUndoRun(r.id);
    return {h: stallsHonest(), named: (S.program.legsB || [])[0].name};
  }, FX);
  ck("and undoing that patch puts both the name and the counters back",
     patchUndone.h.ok && patchUndone.named === "Dumbbell RDL",
     patchUndone.h.diff.join(" | ") || patchUndone.named);
}

console.log("\n3 - THE COUNT ITSELF SURVIVES THE RENAME, WHICH IS THE POINT");
{
  const r = await p.evaluate(fx=>{
    boot(fx);
    rebuildStalls();
    /* The slot with the most stalls on it IN THE CURRENT PROGRAMME, whatever that happens
       to be - a control written against what the real export contains rather than a number
       typed in. Scoped to the current days because the export also carries counters from a
       retired split, and renaming a slot that is not prescribed any more would prove
       nothing about a rename: the first draft of this picked the global maximum and
       skipped itself. n:2 is required, so this really is the case asked for - a slot that
       is two thirds of the way to a stall protocol and must not lose its place. */
    let key = null, best = -1;
    Object.keys(S.stalls || {}).forEach(k=>{
      const wid2 = k.slice(0, k.indexOf("|"));
      if(DAYS.indexOf(wid2) < 0) return;
      const n = (S.stalls[k] || {}).n || 0;
      if(n > best){ best = n; key = k; }
    });
    if(!key || best < 2) return {skip: true, best: best};
    const wid = key.slice(0, key.indexOf("|"));
    /* the name as the plan spells it, for that slot */
    const slot = (S.program[wid] || []).find(e=> e && nrm(e.name) === key.slice(key.indexOf("|") + 1));
    const was = slot ? slot.name : null;
    if(!was) return {skip: true, why: "that counter's slot is not in the current programme",
                     key: key, best: best};
    const to = was + " (renamed)";
    const before = JSON.parse(JSON.stringify(S.stalls[key]));
    (S.sessions || []).forEach(s=> (s.entries || []).forEach(en=>{
      if(nrmRaw(en.name) === nrmRaw(was)) en.name = to;
    }));
    Object.keys(S.program).forEach(w=> (S.program[w] || []).forEach(e=>{
      if(e && e.name === was) e.name = to;
    }));
    S.exAliases = S.exAliases || {};
    S.exAliases[nrmRaw(was)] = to;
    exerciseKeysChanged("rename");
    const newKey = wid + "|" + nrm(to);
    return {was: was, to: to, n: before.n, key: key, newKey: newKey,
            under: S.stalls[newKey] || null, old: S.stalls[key] || null,
            h: stallsHonest()};
  }, FX);
  if(r.skip){
    ck("a slot with a real stall count was found to rename", false,
       "skipped: " + (r.why || "nothing above n:0") + " (best " + r.best + ")");
  } else {
    console.log("    " + r.was + "  n:" + r.n + "   " + r.key + "  ->  " + r.newKey);
    ck("the counter is under the new key", !!r.under && r.under.n === r.n,
       JSON.stringify(r.under));
    ck("CONTROL: with the same count it had, not reset to zero", r.n >= 1 && r.under.n === r.n,
       "n:" + r.n + " -> n:" + (r.under || {}).n);
    ck("and nothing is left under the old one", !r.old, JSON.stringify(r.old));
    ck("the invariant holds after it", r.h.ok, r.h.diff.join(" | ") || "identical");
  }
}

console.log("\n4 - THE CONTROL THAT MUST FIRE");
{
  /* A rename performed WITHOUT the hook. If the invariant cannot see that, it is not
     checking anything, and every ok above is worthless. */
  const r = await p.evaluate(fx=>{
    boot(fx);
    const was = "Lat Pulldown", to = "Lat Pulldown Wide";
    (S.sessions || []).forEach(s=> (s.entries || []).forEach(en=>{
      if(nrmRaw(en.name) === nrmRaw(was)) en.name = to;
    }));
    S.exAliases = S.exAliases || {};
    S.exAliases[nrmRaw(was)] = to;
    USER_ALIASES = S.exAliases; invalidateCanon();      // the alias lands, the counters do not move
    return stallsHonest();
  }, FX);
  ck("CONTROL: a key change with no rebuild is caught", !r.ok,
     r.diff.slice(0, 2).join(" | ") || "NOT CAUGHT");
  const fixed = await p.evaluate(()=>{ exerciseKeysChanged("control"); return stallsHonest(); });
  ck("CONTROL: and the hook repairs exactly that", fixed.ok,
     fixed.diff.join(" | ") || "identical");
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
