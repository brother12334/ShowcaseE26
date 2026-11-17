import { chromium, APP_URL } from './_e26.mjs';
/* A MALFORMED ENTRY IS A RECORD TO SKIP, NEVER A SCREEN TO LOSE.

   Reported live on 2026.11.17.9: a movement added in the session editor left Today,
   History and Body drawing nothing at all, while Program and Research were fine. That
   split is the diagnosis - the state loaded, and it is the readers that walk sessions
   that fall over. There are dozens of them, so this does not test that each one was
   hardened; it tests the invariant they all assume, in the two places it is now made
   true: at the door (repairStoredSessions, from migrate) for data that arrives, and in
   front of the readers (ensureAllSessionShapes / ensureSessionShape) for anything built
   while the app runs.

   THREE THINGS HAVE TO HOLD AT ONCE, and a test for any one of them alone would pass
   while the other two were broken:

     1. no screen goes blank, on any shape;
     2. nothing is deleted - a record that cannot be walked is MOVED, with a note, and is
        still in the state and in every export afterwards;
     3. valid-but-unusual data is left completely alone. This is the one that matters
        most, because an over-eager repair quietly rewrites a real training log. Every
        legitimate per-side shape is driven through the same path and required to come out
        byte-identical.

   THE CONTROL. A shape that is already fine renders identically whether or not any of
   this exists, so for every shape expected to be repaired this spec asserts the repair
   was RECORDED - in S.dataIssues, or in badEntries/badSets. A green run with no recorded
   repairs would mean the fixtures were not malformed and the suite proved nothing. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2400}});
p.on('dialog',d=>d.accept());
/* Not localStorage.clear(): this spec RELOADS, which is the real path through migrate(). */
await p.addInitScript(()=>{
  if(!localStorage.getItem('e26.account')){
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X');
  }});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const NM = "Alternating Cable Lateral Raise";
const L = {reps:"15",weight:"25",done:true}, R = {reps:"14",weight:"25",done:true};
/* repair: true  = the shape breaks the invariant, so it must be repaired AND recorded
   repair: false = legitimate, and must come back untouched */
const SHAPES = [
  ["flagged per-side, no sides",      {name:NM, perSide:true, sets:[{reps:"15",weight:"25",done:true}]},              false],
  ["sides, no perSide, no startSide", {name:NM, sets:[{sides:{L,R}}]},                                                false],
  ["sides + perSide, no startSide",   {name:NM, perSide:true, sets:[{sides:{L,R}}]},                                  false],
  ["startSide only, flat sets",       {name:NM, startSide:"L", sets:[{reps:"15",weight:"25",done:true}]},             false],
  ["perSide + startSide, no sides",   {name:NM, perSide:true, startSide:"L", sets:[{reps:"15",weight:"25",done:true}]},false],
  ["sides as an empty object",        {name:NM, perSide:true, startSide:"L", sets:[{sides:{}}]},                      false],
  ["one side absent",                 {name:NM, perSide:true, startSide:"L", sets:[{sides:{L:null,R}}]},              false],
  ["mixed: one paired, one flat",     {name:NM, perSide:true, startSide:"L", sets:[{sides:{L,R}},{reps:"13",weight:"25",done:true}]}, false],
  ["legacy per-set side",             {name:NM, startSide:"L", sets:[{reps:"15",weight:"25",done:true,side:"L"},{reps:"14",weight:"25",done:true,side:"R"}]}, false],
  ["sides on a bilateral name",       {name:"Barbell Bench Press", sets:[{sides:{L,R}}]},                             false],
  ["flat, name alone says one-limb",  {name:NM, sets:[{reps:"15",weight:"25",done:true},{reps:"13",weight:"25",done:true}]}, false],
  ["a side that is a number",         {name:NM, perSide:true, startSide:"L", sets:[{sides:{L:5,R:7}}]},               true],
  ["sets missing",                    {name:NM, perSide:true},                                                        true],
  ["sets null",                       {name:NM, sets:null},                                                           true],
  ["sets not an array",               {name:NM, sets:{0:{reps:"15",weight:"25",done:true}}},                          true],
  ["a null set among real ones",      {name:NM, sets:[null,{reps:"15",weight:"25",done:true}]},                       true],
  ["no name at all",                  {sets:[{reps:"15",weight:"25",done:true}]},                                     true],
  ["name an empty string",            {name:"", sets:[{reps:"15",weight:"25",done:true}]},                            true],
  ["entry is null",                   null,                                                                           true],
  ["entry is a string",               "Alternating Cable Lateral Raise",                                               true]
];

/* ONE SHAPE, THROUGH THE REAL DOOR. The bytes go into storage and then the app is booted
   over them the way boot itself does it - `S = load(); migrate(); applySplit()` is
   verbatim what line 26362 runs on a profile switch, and line 13727 runs at startup.

   NOT via page.reload(), which is what this spec did first and why its failures moved
   around between runs: the previous iteration leaves live timers behind, and a save()
   landing after the seed - or a storage commit racing the navigation - boots the app on
   the wrong bytes. Reloading proves nothing that load() + migrate() does not, and it
   cannot be made to prove it reliably. Section 2 keeps one real reload, where the
   fixture is written once and nothing follows it. */
const bootOver = (shape)=> p.evaluate(sh=>{
  const base = {
    setup:{name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()},
    tourDone:true, geo:'off', sleepAsked:todayStr(), seenNews:NEWS_FOR, splitId:"ppl6",
    prefs:{sleepPrompt:false, warmups:'off'},
    savedAt: Date.now(),
    sessions:[{id:"s1", workoutId:"pushA", date:todayStr(),
      startedAt:Date.now()-5400e3, finishedAt:Date.now()-1800e3,
      entries:[{name:"Barbell Bench Press", sets:[{reps:8,weight:135,done:true}]}, sh]}]
  };
  const raw = JSON.stringify(base);
  localStorage.setItem("ironlog.v1", raw);
  /* The repair log is cleared so each shape is judged on its own. */
  const kill = [];
  for(let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.indexOf("ironlog.rescue.") === 0) kill.push(k);
  }
  kill.forEach(k=> localStorage.removeItem(k));

  S = load(); migrate(); applySplit();

  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');

  const tabs = {};
  /* The renderers FIRST, before anything grades, because the repair must not depend on a
     grader having run earlier - which is exactly the order the live fault hit. */
  for(const t of ["today","workout","history","body","program","research"]){
    TAB = t;
    try{
      render();
      const html = document.getElementById("app").innerHTML;
      tabs[t] = TAB_ERR ? ("BOUNDARY " + TAB_ERR.where + ": " + String(TAB_ERR.err && TAB_ERR.err.message).slice(0,50))
              : (html.replace(/\s+/g,"").length < 100 ? "EMPTY" : null);
    }catch(e){ tabs[t] = "THREW " + String(e && e.message || e).slice(0,50); }
  }
  const graders = {};
  for(const fn of ["scoreWorkout","sweepSessionPRs","updateStalls","buildProgression","clearStraySides"]){
    try{
      if(fn === "clearStraySides") clearStraySides();
      else if(fn === "scoreWorkout") scoreWorkout(S.sessions[0]);
      else if(fn === "sweepSessionPRs") sweepSessionPRs(S.sessions[0]);
      else if(fn === "updateStalls") updateStalls(S.sessions[0]);
      else buildProgression(S.sessions[0]);
      graders[fn] = null;
    }catch(e){ graders[fn] = String(e && e.message || e).slice(0,50); }
  }
  const sess = S.sessions[0] || {};
  const allKeys = [];
  for(let i = 0; i < localStorage.length; i++) allKeys.push(localStorage.key(i));
  const mine = allKeys.filter(k=> k && k.indexOf("ironlog.rescue.") === 0 && !/\.why$/.test(k)).sort();
  /* The FIRST, which is the oldest by timestamp and so the copy taken before the earliest
     repair - that is the one whose bytes must match what was on the device. */
  const backupKey = mine[0] || null;
  return {
    rawBefore: raw,
    tabs, graders,
    issues: (S.dataIssues || []).length,
    badEntries: (sess.badEntries || []).length,
    badSets: (sess.entries || []).reduce((t, e)=> t + ((e && e.badSets || []).length), 0),
    entryJSON: JSON.stringify((sess.entries || [])[1] || null),
    sessionsLoaded: (S.sessions || []).length,
    backupKey, backupRaw: backupKey ? localStorage.getItem(backupKey) : null,
    rescueKeys: mine
  };
}, shape);

console.log("\n1. every shape, booted over through load() + migrate()");
for(const [label, shape, mustRepair] of SHAPES){
  const r = await bootOver(shape);
  const broke = Object.entries(r.tabs).concat(Object.entries(r.graders)).filter(([k,v])=> v);
  console.log("  " + (broke.length ? "BROKEN " : "ok     ") + label
    + (broke.length ? "\n           " + broke.map(([k,v])=> k + " -> " + v).join("\n           ") : ""));
  if(broke.length) bad++;
  /* The fixture has to have survived the boot, or nothing below means anything. */
  if(r.sessionsLoaded !== 1){ console.log("           BROKEN the fixture did not load (" + r.sessionsLoaded + " sessions)"); bad++; continue; }

  const recorded = r.issues > 0 || r.badEntries > 0 || r.badSets > 0;
  if(mustRepair){
    if(!recorded){ console.log("           BROKEN the repair was not recorded anywhere"); bad++; }
    if(!r.backupKey){ console.log("           BROKEN no backup of the raw state was written"); bad++; }
    else if(r.backupRaw !== r.rawBefore){ console.log("           BROKEN the backup is not the original bytes"); bad++; }
  } else {
    /* The important one: a legitimate shape must come back exactly as it went in. */
    if(recorded){ console.log("           BROKEN good data was 'repaired' (" + r.issues + "/" + r.badEntries + "/" + r.badSets + ")"); bad++; }
    if(r.backupKey){ console.log("           BROKEN a backup was taken for data that was fine"); bad++; }
    const want = JSON.stringify(shape);
    if(r.entryJSON !== want){ console.log("           BROKEN the entry changed: " + r.entryJSON); bad++; }
  }
}

console.log("\n2. nothing is deleted - a set-aside record is still in the file");
/* Three entries, two of them broken in different ways, through the same door. */
const k2 = await p.evaluate(()=>{
  const base = {setup:{name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()},
    tourDone:true, seenNews:NEWS_FOR, splitId:"ppl6", savedAt:Date.now(),
    prefs:{sleepPrompt:false, warmups:'off'},
    sessions:[{id:"s1", workoutId:"pushA", date:todayStr(), startedAt:Date.now()-5e6, finishedAt:Date.now()-4e6,
      entries:[{name:"Barbell Bench Press", sets:[{reps:8,weight:135,done:true}]},
               {sets:[{reps:"15",weight:"25",done:true}]},
               {name:"Alternating Cable Lateral Raise", sets:[null,{reps:"13",weight:"25",done:true}]}]}]};
  localStorage.setItem("ironlog.v1", JSON.stringify(base));
  const kill = [];
  for(let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.indexOf("ironlog.rescue.") === 0) kill.push(k);
  }
  kill.forEach(k=> localStorage.removeItem(k));

  S = load(); migrate(); applySplit();

  const sess = S.sessions[0];
  const file = JSON.parse(payload());
  const fs = (file.sessions||[])[0] || {};
  const keys = [];
  for(let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.indexOf("ironlog.rescue.") === 0 && !/\.why$/.test(k)) keys.push(k);
  }
  keys.sort();
  let backup = null;
  try{ backup = JSON.parse(localStorage.getItem(keys[0])); }catch(e){}
  const bEnts = ((backup && backup.sessions || [])[0] || {}).entries || [];
  return {
    walkable: (sess.entries||[]).map(e=> e.name),
    setAside: (sess.badEntries||[]).length,
    setAsideHasReps: JSON.stringify(sess.badEntries||[]).indexOf('"15"') >= 0,
    badSetKept: ((sess.entries||[]).find(e=> e.badSets)||{}).badSets,
    inExport: (fs.badEntries||[]).length,
    exportBadSets: ((fs.entries||[]).find(e=> e.badSets)||{}).badSets,
    issueNoted: (S.dataIssues||[]).length,
    backupExists: !!backup,
    backupEntries: bEnts.length,
    backupNameless: bEnts.some(e=> e && !e.name),
    backupNullSet: bEnts.some(e=> Array.isArray(e && e.sets) && e.sets.some(x=> x === null)),
    backupUnrepaired: !((backup && backup.sessions || [])[0] || {}).badEntries
  };
});
ck("the nameless entry is out of the readers' way", k2.walkable.length === 2 && k2.walkable.indexOf(undefined) < 0, k2.walkable.join(","));
ck("and set aside rather than deleted", k2.setAside === 1, k2.setAside);
ck("with the reps somebody typed still in it", k2.setAsideHasReps);
ck("the null set is set aside on its entry", Array.isArray(k2.badSetKept) && k2.badSetKept.length === 1,
   JSON.stringify(k2.badSetKept));
ck("both travel in an export", k2.inExport === 1 && Array.isArray(k2.exportBadSets),
   k2.inExport + "/" + JSON.stringify(k2.exportBadSets));
ck("and the repair is on the record", k2.issueNoted >= 1, k2.issueNoted);

console.log("\n3. the backup is taken BEFORE the write, not after");
ck("a backup exists", k2.backupExists);
ck("it holds all three original entries", k2.backupEntries === 3, k2.backupEntries);
ck("including the nameless one, unmoved", k2.backupNameless);
ck("and the null set, unremoved", k2.backupNullSet);
ck("so it predates the repair", k2.backupUnrepaired);

console.log("\n4. an entry built at runtime is caught too, with no reload");
const r4 = await p.evaluate(()=>{
  S.sessions[0].entries.push({name:"Cable Lateral Raise", sets:{0:{reps:"12",weight:"30",done:true}}});
  TAB = "history";
  let threw = null;
  try{ render(); }catch(e){ threw = String(e && e.message || e); }
  const e = S.sessions[0].entries.find(x=> x.name === "Cable Lateral Raise");
  return {threw, boundary: TAB_ERR ? String(TAB_ERR.err && TAB_ERR.err.message) : null,
          nowArray: Array.isArray(e && e.sets), n: (e && e.sets || []).length};
});
ck("history still drew", !r4.threw && !r4.boundary, r4.threw || r4.boundary || "drew");
ck("and the object-keyed sets were read back in order", r4.nowArray && r4.n === 1, r4.nowArray + "/" + r4.n);

console.log("\n5. only three backups are kept, newest");
const r5 = await p.evaluate(()=>{
  for(let i = 0; i < 6; i++) rescueBackupOnce("test " + i);
  const keys = [];
  for(let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.indexOf("ironlog.rescue.") === 0 && !/\.why$/.test(k)) keys.push(k);
  }
  return keys.length;
});
ck("the old copies are pruned", r5 <= 3, r5);

console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
