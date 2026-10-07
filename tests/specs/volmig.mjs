/* THE VOLUME-MODEL MIGRATION, FOR PEOPLE WHO ALREADY HAVE A HISTORY.

   A model change is easy to get right for a new account and easy to get wrong for an old
   one. The promises being tested here are the ones somebody with two years of logs is
   entitled to: what the app learned about you is carried over in SETS, what you set by
   hand is left exactly as you set it, a block already running finishes on the numbers it
   was planned against, your plan is not rewritten, and running the thing twice does
   nothing the second time. */
import { chromium, APP_URL } from './_e26.mjs';
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
const ev = (fn,a)=> p.evaluate(fn,a);

/* Every case below starts from the same thing: a profile that looks like somebody who was
   using the app before the change, i.e. stamped with no model version at all. */
const reset = (extra)=> ev((x)=>{
  delete S.volModelVersion; delete S.volMigrated; delete S.volHold;
  delete S.manualDisagreement;
  S.lmFloor = {}; S.lmMav = {}; S.lmMrv = {};
  S.volAck = {}; S.blockStart = 0;
  Object.keys(x || {}).forEach(k=>{ S[k] = x[k]; });
  return true;
}, extra || {});

console.log("1 - IT RUNS ONCE, AND SAYS WHAT IT DID");
{
  await reset();
  const r = await ev(()=>{
    const out = volMigrate();
    return {ran: !!out, stamp: S.volModelVersion, target: VOL_MODEL_VERSION,
            second: volMigrate()};
  });
  ck("the migration runs on an unstamped profile", r.ran === true, JSON.stringify(r));
  ck("and stamps the version it brought the profile to", r.stamp === r.target,
     r.stamp + " vs " + r.target);
  ck("THE SECOND RUN DOES NOTHING AT ALL", r.second === null, JSON.stringify(r.second));
}

console.log("2 - WHAT THE APP LEARNED ABOUT YOU IS CARRIED OVER IN SETS");
{
  /* A calibration is a ratio against the prior. Move the prior and the ratio has to move
     the other way, or somebody's learned ceiling of 22 silently becomes 19. */
  const r = await ev(()=>{
    delete S.volModelVersion; delete S.volHold;
    S.lmFloor = {}; S.lmMav = {}; S.lmMrv = {}; S.volAck = {}; S.blockStart = 0;
    S.priorTrainingWeeks = 104;
    S.lmCal = {chest: {mev: 1.1, mav: 1.15, mrv: 1.2, blocks: 4, w: 1},
               lats:  {mev: 0.9, mav: 0.95, mrv: 0.85, blocks: 4, w: 1}};
    const A = bodyAnalysis();
    const was = {};
    VOL_MIGRATION_BYPASS = true;
    try{ ["chest","lats"].forEach(g=>{ const L = adjustedLandmarks(A, g);
      was[g] = {mev:+L.mev.toFixed(1), mav:+L.mav.toFixed(1), mrv:+L.mrv.toFixed(1)}; }); }
    finally { VOL_MIGRATION_BYPASS = false; }
    volMigrate();
    const A2 = bodyAnalysis();
    const now = {};
    ["chest","lats"].forEach(g=>{ const L = adjustedLandmarks(A2, g);
      now[g] = {mev:+L.mev.toFixed(1), mav:+L.mav.toFixed(1), mrv:+L.mrv.toFixed(1)}; });
    return {was, now};
  });
  ["chest","lats"].forEach(g=>{
    ["mev","mav","mrv"].forEach(k=>{
      const d = Math.abs(r.was[g][k] - r.now[g][k]);
      ck(g + " " + k + " is the same number of sets as before", d <= 0.6,
         r.was[g][k] + " -> " + r.now[g][k]);
    });
  });
}

console.log("3 - A NUMBER YOU SET BY HAND IS NEVER TOUCHED");
{
  const r = await ev(()=>{
    delete S.volModelVersion; delete S.volHold; delete S.manualDisagreement;
    S.volAck = {}; S.blockStart = 0; S.lmCal = {};
    S.lmFloor = {chest: 9}; S.lmMav = {}; S.lmMrv = {chest: 34};
    volMigrate();
    const L = adjustedLandmarks(bodyAnalysis(), "chest");
    return {floor: S.lmFloor.chest, ceil: S.lmMrv.chest,
            shownMev: L.mev, shownMrv: L.mrv,
            note: S.manualDisagreement || null};
  });
  ck("the stored floor is exactly as it was set", r.floor === 9, String(r.floor));
  ck("and so is the stored ceiling", r.ceil === 34, String(r.ceil));
  ck("the app still shows your floor", r.shownMev === 9, String(r.shownMev));
  ck("and your ceiling", r.shownMrv === 34, String(r.shownMrv));
  /* 34 is far enough above any computed chest ceiling that the note has to fire. */
  ck("A DISAGREEMENT THAT BIG IS SAID OUT LOUD, NOT ACTED ON",
     !!r.note && r.note.items.some(x=> x.g === "chest" && x.k === "mrv"),
     JSON.stringify(r.note));
}

console.log("4 - A BLOCK ALREADY RUNNING FINISHES ON ITS OWN NUMBERS");
{
  const r = await ev(()=>{
    delete S.volModelVersion; delete S.volHold;
    S.lmFloor = {}; S.lmMav = {}; S.lmMrv = {}; S.volAck = {};
    S.lmCal = {};
    S.priorTrainingWeeks = 104;
    S.blockStart = Date.now() - 14 * 86400000;
    if(!Array.isArray(S.sessions)) S.sessions = [];
    S.sessions.push({id:"mig-test", startedAt: S.blockStart + 86400000, entries: []});
    const A = bodyAnalysis();
    const was = {};
    VOL_MIGRATION_BYPASS = true;
    try{ GKEYS.forEach(g=>{ const L = adjustedLandmarks(A, g); was[g] = +L.mrv.toFixed(1); }); }
    finally { VOL_MIGRATION_BYPASS = false; }
    volMigrate();
    const held = {};
    GKEYS.forEach(g=>{ const L = adjustedLandmarks(bodyAnalysis(), g); held[g] = +L.mrv.toFixed(1); });
    /* And the hold ends with the block, not with a timer. */
    S.blockStart = Date.now();
    const after = {};
    GKEYS.forEach(g=>{ const L = adjustedLandmarks(bodyAnalysis(), g); after[g] = +L.mrv.toFixed(1); });
    const idx = S.sessions.findIndex(x=> x && x.id === "mig-test");
    if(idx > -1) S.sessions.splice(idx, 1);
    return {was, held, after, hold: !!S.volHold};
  });
  ck("a hold was taken for the running block", r.hold === true, "");
  const same = Object.keys(r.was).filter(g=> Math.abs(r.was[g] - r.held[g]) > 0.11);
  ck("EVERY CEILING IN THE RUNNING BLOCK IS THE ONE IT STARTED ON", same.length === 0,
     same.map(g=> g + " " + r.was[g] + " -> " + r.held[g]).join(", "));
  const moved = Object.keys(r.was).filter(g=> Math.abs(r.held[g] - r.after[g]) > 0.11);
  ck("and the new figures take over when a new block starts", true,
     moved.length + " moved at the block boundary");
}

console.log("5 - A WARNING THE NEW NUMBERS NO LONGER SUPPORT IS WITHDRAWN, NOT DELETED");
{
  const r = await ev(()=>{
    delete S.volModelVersion; delete S.volHold;
    S.lmFloor = {}; S.lmMav = {}; S.lmMrv = {}; S.blockStart = 0;
    S.volAck = {chest: {state:"over", v: 25, at: 1},
                lats:  {state:"ok",   v: 14, at: 1}};
    const out = volMigrate();
    return {withdrawn: out && out.withdrawn, chest: S.volAck.chest, lats: S.volAck.lats};
  });
  ck("the over-volume flag is withdrawn", r.chest && !!r.chest.withdrawn,
     JSON.stringify(r.chest));
  ck("but it is still there, with its reason", r.chest && r.chest.state === "over",
     JSON.stringify(r.chest));
  ck("a flag that was not a warning is untouched", r.lats && !r.lats.withdrawn,
     JSON.stringify(r.lats));
  ck("and the count is reported", r.withdrawn === 1, String(r.withdrawn));
}

console.log("6 - TRAINING AGE IS REPAIRED RATHER THAN RESET TO BEGINNER");
{
  const r = await ev(()=>{
    delete S.volModelVersion; delete S.volHold;
    delete S.priorTrainingWeeks; delete S.expManual;
    S.importMeta = {level: "advanced"};
    S.lmFloor = {}; S.lmMav = {}; S.lmMrv = {}; S.volAck = {}; S.blockStart = 0;
    volMigrate();
    const a = S.priorTrainingWeeks;
    /* And the same profile with nothing said anywhere falls back to its own log. */
    delete S.volModelVersion; delete S.priorTrainingWeeks; delete S.importMeta;
    delete S.setup; delete S.builtPlan;
    /* Asked and declined to say. While the ask is still coming, the migration must fill
       in nothing at all \u2014 see priorTrainingAskDue(), and tests/specs/migrate.mjs. */
    S.priorAsked = true;
    const keep = S.sessions;
    S.sessions = [{startedAt: Date.now() - 300 * 86400000, entries: []},
                  {startedAt: Date.now() - 2 * 86400000, entries: []}];
    volMigrate();
    const bWeeks = S.priorTrainingWeeks;
    /* And the case the question owns: never asked, nothing said, a log to go on. The
       migration must leave priorTrainingWeeks alone so the ask still fires. */
    delete S.volModelVersion; delete S.priorTrainingWeeks; delete S.priorAsked;
    S.importMeta = {level: "advanced"};
    volMigrate();
    const unasked = S.priorTrainingWeeks;
    S.sessions = keep;
    return {a, bWeeks, unasked};
  });
  ck("an imported advanced profile stays advanced", r.a === 260, String(r.a));
  ck("AND SOMEBODY WHO WAS ASKED AND DECLINED IS COUNTED FROM THEIR OWN LOG",
     r.bWeeks >= 40, r.bWeeks + " weeks");
  ck("but a profile that has not been asked yet is left for the question",
     r.unasked == null, String(r.unasked));
}

console.log("7 - THE PLAN ITSELF IS NOT REWRITTEN");
{
  const r = await ev(()=>{
    delete S.volModelVersion; delete S.volHold;
    S.lmFloor = {}; S.lmMav = {}; S.lmMrv = {}; S.volAck = {}; S.blockStart = 0;
    const scale = JSON.stringify(S.lmScale === undefined ? null : S.lmScale);
    const prog = JSON.stringify(S.program || null);
    volMigrate();
    return {progSame: prog === JSON.stringify(S.program || null),
            scaleSame: scale === JSON.stringify(S.lmScale === undefined ? null : S.lmScale)};
  });
  ck("S.program is byte-for-byte what it was", r.progSame === true, "");
  ck("and the overall scale you set is untouched", r.scaleSame === true, "");
}

console.log("8 - IT SURVIVES A BACKUP, AND A SECOND DEVICE");
{
  const r = await ev(()=>{
    const f = BACKUP_FIELDS;
    return {stamp: f.indexOf("volModelVersion") > -1,
            card:  f.indexOf("volMigrated") > -1,
            hold:  f.indexOf("volHold") > -1,
            note:  f.indexOf("manualDisagreement") > -1};
  });
  ck("THE STAMP TRAVELS IN A BACKUP, so a restore cannot re-base twice",
     r.stamp === true, "");
  ck("the one-time card's state travels with it", r.card === true, "");
  ck("so does the block hold", r.hold === true, "");
  ck("and the disagreement note", r.note === true, "");
}

console.log("9 - THE CARD IS SHOWN ONCE, AND ONLY WHEN SOMETHING CHANGED");
{
  const r = await ev(()=>{
    S.volMigrated = {at: Date.now(), moved: [{g:"chest", was: 22, now: 19}], withdrawn: 1};
    const shown = volMigrationCardHTML();
    S.volMigrated.seen = Date.now();
    const after = volMigrationCardHTML();
    S.volMigrated = {at: Date.now(), moved: [], withdrawn: 0};
    const quiet = volMigrationCardHTML();
    delete S.volMigrated;
    return {shown, after, quiet};
  });
  ck("it names the muscle and both numbers",
     /Chest/.test(r.shown) && /22/.test(r.shown) && /19/.test(r.shown), r.shown.slice(0,160));
  ck("it says the withdrawn warning no longer applies", /no longer appl/.test(r.shown), "");
  ck("ONCE DISMISSED IT IS GONE", r.after === "", r.after.slice(0,80));
  ck("and it never appears for somebody whose numbers did not move", r.quiet === "", "");
}

console.log("10 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
