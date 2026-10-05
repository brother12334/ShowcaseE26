import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:1000}});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* A session under way on a three-exercise day. */
const start = ()=> p.evaluate(()=>{
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
  const wid=ROTATION[0];
  S.program[wid]=[
    {name:"Barbell Bench Press", sets:3, reps:"5",   rest:[2,4]},
    {name:"Incline Dumbbell Press", sets:3, reps:"8-12"},
    {name:"Cable Fly", sets:2, reps:"12-15"}
  ];
  S.program.finisher=[];
  S.active=null; S.sessions=[];
  startWorkout(wid);
  PF=null; const el2=document.getElementById('preflight'); if(el2) el2.remove();
  document.body.classList.remove('pfl-open');
  save(); render();
  return {wid, names: S.active.entries.map(e=>e.name), keys: S.active.entries.map(e=>e.planKey)};
});
// change the plan the way every editor in the app does: in place, then re-render
const edit = (fn)=> p.evaluate((src)=>{
  (new Function("wid", src))(S.active.workoutId);
  save(); render();
  const a=S.active;
  return {names: a.entries.map(e=>e.name), sets: a.entries.map(e=>e.sets.length),
          reps: a.entries.map(e=>e.reps||""), rest: a.entries.map(e=> (e.rest||[]).join("-")),
          edits: (a.planEdits||[]).map(x=> x.k+":"+x.name+(x.how?":"+x.how:"")),
          focusIdx: a.focusIdx, rest_e: (a.restTimer||{}).e,
          card: /plan changed while you were training/i.test(document.body.innerText),
          logged: a.entries.map(e=> e.sets.filter(st=>st.done||st.reps).length)};
}, fn);

console.log("1 - AN EXERCISE ADDED TO TODAY SHOWS UP IN THE SESSION YOU ARE IN");
const s0 = await start();
ck("the session opens on the plan", s0.names.join(",")==="Barbell Bench Press,Incline Dumbbell Press,Cable Fly", s0.names.join(","));
ck("every row knows which slot it came from", s0.keys.every(k=>!!k), JSON.stringify(s0.keys));
{
  const r = await edit(`S.program[wid].push({name:"Triceps Pushdown", sets:3, reps:"10-12"});`);
  ck("it is in the session", r.names.includes("Triceps Pushdown"), r.names.join(","));
  ck("at the end, where the plan put it", r.names[3]==="Triceps Pushdown", r.names.join(","));
  ck("with its own empty rows", r.sets[3]===3, String(r.sets[3]));
  ck("and the session says what changed", r.card && r.edits.join("|")==="added:Triceps Pushdown",
     r.edits.join("|")+" card="+r.card);
}

console.log("2 - AND IT LANDS WHERE THE PLAN PUTS IT, NOT ALWAYS AT THE BOTTOM");
{
  const r = await edit(`S.program[wid].splice(1, 0, {name:"Chest Press Machine", sets:2, reps:"10"});`);
  ck("second, in front of the incline", r.names[1]==="Chest Press Machine", r.names.join(","));
}

console.log("3 - LOG A SET, THEN TAKE THAT EXERCISE OFF THE PLAN");
{
  await start();
  const r = await edit(`
    S.active.entries[0].sets[0] = {weight:"185", reps:"5", rpe:"8", done:true};
    S.program[wid].splice(0, 1);`);
  ck("the work you did stays in the session", r.names[0]==="Barbell Bench Press", r.names.join(","));
  ck("with the set still on it", r.logged[0]===1, String(r.logged[0]));
  ck("and nothing is announced, because nothing moved", r.edits.length===0, r.edits.join("|"));
}

console.log("4 - TAKE AN UNTOUCHED ONE OFF AND IT LEAVES");
{
  await start();
  const r = await edit(`S.program[wid].splice(2, 1);`);
  ck("it is gone from the session", !r.names.includes("Cable Fly"), r.names.join(","));
  ck("the other two are not", r.names.length===2, r.names.join(","));
  ck("and it says so", r.edits.join("|")==="gone:Cable Fly", r.edits.join("|"));
}

console.log("5 - SET COUNT FOLLOWS THE PLAN, BY THE DIFFERENCE");
{
  await start();
  let r = await edit(`S.program[wid][0].sets = 4;`);
  ck("three becomes four", r.sets[0]===4, String(r.sets[0]));
  ck("said plainly", r.edits.join("|")==="edit:Barbell Bench Press:now 4 sets", r.edits.join("|"));
  // a set added at the rack is yours, and a later plan change must not erase it
  r = await edit(`S.active.entries[0].sets.push({weight:"",reps:"",rpe:"",done:false});
                  S.program[wid][0].sets = 5;`);
  ck("the set you added at the rack survives a plan raise", r.sets[0]===6, String(r.sets[0]));
}

console.log("6 - AND IT NEVER DELETES A SET YOU HAVE LOGGED");
{
  await start();
  const r = await edit(`
    S.active.entries[0].sets[0] = {weight:"185", reps:"5", rpe:"8", done:true};
    S.active.entries[0].sets[1] = {weight:"185", reps:"5", rpe:"8", done:true};
    S.active.entries[0].sets[2] = {weight:"185", reps:"4", rpe:"9", done:true};
    S.program[wid][0].sets = 1;`);
  ck("all three logged sets are still there", r.sets[0]===3, String(r.sets[0]));
  ck("and it says why it did not shrink",
     /kept the sets you have already logged/.test(r.edits.join("|")), r.edits.join("|"));
}

console.log("7 - REPS, REST AND THE REST OF THE PRESCRIPTION FOLLOW");
{
  await start();
  const r = await edit(`S.program[wid][0].reps = "3"; S.program[wid][0].rest = [3,5];`);
  ck("the reps change on the card", r.reps[0]==="3", r.reps[0]);
  ck("so does the rest range", r.rest[0]==="3-5", r.rest[0]);
}

console.log("8 - BUT NOT OVER SOMETHING YOU SET YOURSELF AT THE RACK");
{
  await start();
  const r = await edit(`
    S.active.entries[0].rest = [1,2];             // widened on the set row mid-session
    S.program[wid][0].rest = [3,5];`);
  ck("your own rest range is left alone", r.rest[0]==="1-2", r.rest[0]);
}

console.log("9 - SKIPPING AN EXERCISE IS NOT UNDONE BY THE PLAN");
{
  await start();
  const r = await edit(`
    S.active.entries.splice(2, 1);                 // exactly what Skip does
    S.program[wid][0].sets = 4;`);                 // and then an unrelated plan change
  ck("the skipped one stays out", !r.names.includes("Cable Fly"), r.names.join(","));
  ck("the plan change still lands", r.sets[0]===4, String(r.sets[0]));
}

console.log("10 - THE CLOCK AND THE FOCUS CURSOR COME ALONG");
{
  await start();
  const r = await edit(`
    S.active.focusIdx = 2; S.active.restTimer = {start:Date.now(), e:2, s:0, min:true};
    S.program[wid].splice(0, 0, {name:"Chest Press Machine", sets:2, reps:"10"});`);
  ck("the focus is still on the same exercise", r.names[r.focusIdx]==="Cable Fly",
     r.focusIdx+" -> "+r.names[r.focusIdx]);
  ck("and so is the rest clock", r.rest_e===3, String(r.rest_e));
}

console.log("11 - YESTERDAY'S OPEN CARD IS NOT REWRITTEN");
{
  await start();
  const r = await edit(`
    S.active.date = new Date(Date.now()-86400e3).toLocaleDateString("en-CA");
    S.program[wid].push({name:"Triceps Pushdown", sets:3, reps:"10-12"});`);
  ck("it is left exactly as it was", r.names.length===3, r.names.join(","));
  ck("and says nothing", r.edits.length===0, r.edits.join("|"));
}

console.log("12 - THE NOTICE CAN BE PUT AWAY");
{
  await start();
  await edit(`S.program[wid][0].sets = 4;`);
  const r = await p.evaluate(()=>{
    const btn = document.getElementById("planEditsOk");
    if(btn) btn.click();
    return {gone: (S.active.planEdits||[]).length===0,
            card: /plan changed while you were training/i.test(document.body.innerText),
            sets: S.active.entries[0].sets.length};
  });
  ck("the card has a button", r.gone, String(r.gone));
  ck("and it goes away", !r.card, String(r.card));
  ck("without putting the change back", r.sets===4, String(r.sets));
}

console.log("13 - IT SHOWS IN FOCUS MODE TOO");
{
  await start();
  const r = await p.evaluate(()=>{
    S.viewMode="focus"; render();
    S.program[S.active.workoutId][0].sets = 4;
    save(); render();
    return {card: /plan changed while you were training/i.test(document.body.innerText),
            sets: S.active.entries[0].sets.length};
  });
  ck("the card is on the focus screen", r.card, String(r.card));
  ck("and the change landed", r.sets===4, String(r.sets));
}

console.log("14 - A PLAN THAT DOES NOT CHANGE COSTS NOTHING AND SAYS NOTHING");
{
  await start();
  const r = await p.evaluate(()=>{
    const before = JSON.stringify(S.active.entries);
    for(let i=0;i<40;i++) render();
    return {same: JSON.stringify(S.active.entries)===before,
            edits: (S.active.planEdits||[]).length};
  });
  ck("forty renders change nothing", r.same, String(r.same));
  ck("and announce nothing", r.edits===0, String(r.edits));
}

console.log("15 - THROUGH THE ACTUAL DAY EDITOR, NOT JUST THE STATE UNDERNEATH");
{
  const s1 = await start();
  const n = await p.evaluate((wid)=>{
    goTab("program"); dayEditOpen(wid);
    const btns = document.querySelectorAll('[data-dedel]');
    // the row buttons live behind a swipe, so this presses the handler the swipe reveals
    btns[2].click();                          // remove Cable Fly, which nothing is logged into
    return btns.length;
  }, s1.wid);
  ck("the day editor is open on today", n===3, String(n));
  await p.waitForSelector("#askYes", {timeout:5000});
  await p.click("#askYes");                   // "Remove it", the editor's own confirmation
  await p.waitForTimeout(120);
  const r = await p.evaluate(()=>({
    plan: (S.program[S.active.workoutId]||[]).map(e=>e.name),
    live: S.active.entries.map(e=>e.name),
    edits: (S.active.planEdits||[]).map(x=> x.k+":"+x.name)
  }));
  ck("it left the plan", !r.plan.includes("Cable Fly"), r.plan.join(","));
  ck("and the session followed, with no reload", !r.live.includes("Cable Fly"), r.live.join(","));
  ck("and it was announced", r.edits.join("|")==="gone:Cable Fly", r.edits.join("|"));
}

console.log("16 - THE SAME EXERCISE TWICE ON A DAY IS TWO SLOTS, NOT ONE");
{
  const s2 = await start();
  const r = await p.evaluate((wid)=>{
    goTab("program"); dayEditOpen(wid);
    document.querySelectorAll('[data-dedup]')[0].click();   // duplicate the bench press
    const a=S.active;
    return {plan: (S.program[wid]||[]).map(e=>e.name),
            live: a.entries.map(e=>e.name),
            keys: a.entries.map(e=>e.planKey),
            edits: (a.planEdits||[]).map(x=> x.k+":"+x.name)};
  }, s2.wid);
  ck("the plan has it twice", r.plan.filter(n=>n==="Barbell Bench Press").length===2, r.plan.join(","));
  ck("so does the session", r.live.filter(n=>n==="Barbell Bench Press").length===2, r.live.join(","));
  ck("and the two rows are told apart", new Set(r.keys).size===r.keys.length, JSON.stringify(r.keys));
  ck("one add, not four", r.edits.length===1, r.edits.join("|"));
}

console.log("17 - A SUPERSET TOGGLED IN THE EDITOR REACHES THE SESSION");
{
  await start();
  const r = await p.evaluate((w)=>{
    goTab("program"); dayEditOpen(w);
    document.querySelectorAll('[data-deedit]')[0].click();
    document.getElementById("f_ss").checked = true;   // superset with the one after it
    document.getElementById("saveEx").click();
    return {plan: (S.program[w]||[]).map(e=>!!e.superset),
            live: S.active.entries.map(e=>!!e.superset),
            pair: !!(supersetInfo(S.active.entries, 0)||{}).role,
            how: (S.active.planEdits||[]).map(x=> x.how).join("|"),
            edits: (S.active.planEdits||[]).map(x=> x.k+":"+x.name)};
  }, (await p.evaluate(()=> S.active.workoutId)));
  ck("the plan has the pair", r.plan.join(",")==="true,false,false", r.plan.join(","));
  ck("and so does the session you are in", r.live.join(",")==="true,false,false", r.live.join(","));
  ck("the card draws it as a pair", r.pair, String(r.pair));
  ck("and it is named for what it became", r.how==="now a superset", r.how);
  ck("and it says what changed", r.edits.join("|")==="edit:Barbell Bench Press", r.edits.join("|"));
}

console.log("18 - AND UNTICKING IT AGAIN BREAKS THE PAIR, LIVE");
{
  const r = await p.evaluate(()=>{
    const w = S.active.workoutId;
    dayEditOpen(w);
    document.querySelectorAll('[data-deedit]')[0].click();
    document.getElementById("f_ss").checked = false;
    document.getElementById("saveEx").click();
    return {live: S.active.entries.map(e=>!!e.superset),
            pair: !!(supersetInfo(S.active.entries, 0)||{}).role};
  });
  ck("the flag is off in the session", r.live.join(",")==="false,false,false", r.live.join(","));
  ck("and it is no longer drawn as a pair", !r.pair, String(r.pair));
}

console.log("19 - A SESSION THAT WAS ALREADY OPEN WHEN THIS SHIPPED CATCHES UP");
{
  await start();
  const r = await p.evaluate(()=>{
    const a = S.active, w = a.workoutId;
    /* exactly what a workout started by an older build looks like: no snapshot, and no
       slot stamps on its rows */
    delete a.planSnap; delete a.planSig;
    a.entries.forEach(en=> delete en.planKey);
    a.entries[0].note = "shoulder felt off";          // typed at the rack, mid-session
    a.entries[0].rest = [1,2];                        // and a rest range set at the rack
    // and the plan changed while the session had no way to notice
    S.program[w][0].superset = true;
    S.program[w][0].reps = "3";
    S.program[w][0].sets = 6;
    save(); render();
    return {ss: a.entries.map(e=>!!e.superset), reps: a.entries[0].reps,
            note: a.entries[0].note, rest: (a.entries[0].rest||[]).join("-"),
            sets: a.entries[0].sets.length,
            edits: (a.planEdits||[]).map(x=> x.k+":"+x.name),
            snap: Array.isArray(a.planSnap)};
  });
  ck("the superset it missed lands", r.ss.join(",")==="true,false,false", r.ss.join(","));
  ck("so do the reps", r.reps==="3", r.reps);
  ck("your own note is not overwritten", r.note==="shoulder felt off", r.note);
  ck("nor your own rest range", r.rest==="1-2", r.rest);
  ck("and the set count, because nothing here says the 3 was your doing", r.sets===6, String(r.sets));
  ck("it says what it caught up on", r.edits.join("|")==="edit:Barbell Bench Press", r.edits.join("|"));
  ck("and a snapshot is kept from now on", r.snap, String(r.snap));
}

console.log("20 - A SKIP IS RECORDED WHEN YOU MAKE IT, SO IT IS NEVER PUT BACK");
{
  await start();
  const r = await p.evaluate(()=>{
    const a = S.active;
    a.entries[2].sets[0].done = false;
    /* Skip, through the app: it writes the slot down before it removes the row */
    planDrop(a, 2);
    a.entries.splice(2, 1);
    delete a.planSnap; delete a.planSig;      // and the session predates snapshots
    save(); render();
    return {names: a.entries.map(e=>e.name), dropped: (a.planDropped||[]).length,
            edits: (a.planEdits||[]).length};
  });
  ck("it stays out", r.names.length===2, r.names.join(","));
  ck("the skip is on the record", r.dropped===1, String(r.dropped));
  ck("and nothing is announced", r.edits===0, String(r.edits));
  const r2 = await edit(`S.program[wid].push({name:"Triceps Pushdown", sets:3, reps:"10-12"});`);
  ck("a real addition still arrives", r2.names.includes("Triceps Pushdown"), r2.names.join(","));
  ck("without bringing the skip back", !r2.names.includes("Cable Fly"), r2.names.join(","));
}

console.log("20b - AND A ROW MISSING WITH NO RECORD OF WHY IS PUT BACK, SAYING SO");
{
  await start();
  const r = await p.evaluate(()=>{
    const a = S.active;
    // a session from an older build: the row is gone and nothing says who removed it
    a.entries.splice(2, 1);
    delete a.planSnap; delete a.planSig;
    a.entries.forEach(en=> delete en.planKey);
    save(); render();
    return {names: a.entries.map(e=>e.name),
            back: (a.planEdits||[]).map(x=> x.k + ":" + (x.back ? "back" : "new")),
            said: /skip it again if you meant to/i.test(document.body.innerText)};
  });
  ck("the plan's exercise is there again", r.names.includes("Cable Fly"), r.names.join(","));
  ck("marked as a put-back rather than an addition", r.back.join("|")==="added:back", r.back.join("|"));
  ck("and it says how to undo it", r.said, String(r.said));
}

console.log("20c - A SET COUNT YOU SET AT THE RACK IS NOT RESET BY A CATCH-UP");
{
  await start();
  const r = await p.evaluate(()=>{
    const a = S.active, w = a.workoutId;
    a.entries[0].sets.push({weight:"",reps:"",rpe:"",done:false});
    a.entries[0].setsOwn = true;              // what "+ set" writes
    delete a.planSnap; delete a.planSig;
    S.program[w][0].sets = 6;
    save(); render();
    return a.entries[0].sets.length;
  });
  ck("your four stay four", r===4, String(r));
}

console.log("21 - AND IT DOES NOT UNDO A TIME BOX");
{
  await start();
  const r = await p.evaluate(()=>{
    const a = S.active, w = a.workoutId;
    a.timeBox = {min:30, cuts:[{kind:"sets", name:"Barbell Bench Press", from:3, to:1}]};
    a.entries[0].sets = [{weight:"",reps:"",rpe:"",done:false}];    // cut to one set
    delete a.planSnap; delete a.planSig;
    a.entries.forEach(en=> delete en.planKey);
    S.program[w][0].superset = true;
    save(); render();
    return {sets: a.entries[0].sets.length, ss: !!a.entries[0].superset};
  });
  ck("the cut set count is left alone", r.sets===1, String(r.sets));
  ck("while the plan change still lands", r.ss, String(r.ss));
}

/* LEGS B, exactly as the screenshots have it: the plan supersets the calf raise with the
   hip abduction, and the session — built before that was true — has the flag sitting on
   the leg curl, so the workout screen pairs the wrong two exercises with total conviction. */
const legsB = ()=> p.evaluate(()=>{
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
  const w=ROTATION[0];
  S.program[w]=[
    {name:"Dumbbell RDL", sets:4, reps:"8-12"},
    {name:"Smith Machine Hip Thrust", sets:3, reps:"8-12"},
    {name:"Smith Machine Squat", sets:2, reps:"4-8"},
    {name:"Seated Leg Curl", sets:3, reps:"12-20"},
    {name:"Seated Calf Raise (Smith)", sets:4, reps:"10-15", superset:true},
    {name:"Standing Cable Hip Abduction", sets:3, reps:"12-15"},
    {name:"Captain's Chair Leg Raise", sets:3, reps:"10-15"}
  ];
  S.program.finisher=[]; S.active=null; S.sessions=[];
  startWorkout(w);
  PF=null; const e2=document.getElementById('preflight'); if(e2) e2.remove();
  document.body.classList.remove('pfl-open');
  /* now make the session the one in the screenshot: the calf raise sits after the hip
     abduction and the flag is on the leg curl, which is what an older plan left behind */
  const a=S.active, E=a.entries;
  const calf = E.splice(4, 1)[0];
  calf.superset = undefined;
  E.splice(5, 0, calf);
  E[3].superset = true;
  // and the first three are done, exactly as "3 / 7" says
  for(let i=0;i<3;i++) E[i].sets.forEach(st=>{ st.weight="100"; st.reps="10"; st.rpe="8"; st.done=true; });
  save(); render();
  return {w};
});
const shape = ()=> p.evaluate(()=>{
  const E = S.active.entries;
  const pair = (()=>{
    for(let i=0;i<E.length;i++){
      const si = supersetInfo(E, i);
      if(si && si.role === "first") return E[i].name + " + " + (si.partner||"");
    }
    return "";
  })();
  return {names: E.map(e=>e.name), pair, edits: (S.active.planEdits||[]).map(x=> x.k+":"+(x.name||"")+(x.how?":"+x.how:""))};
});

console.log("22 - THE SUPERSET IN THE SCREENSHOT: THE PLAN'S PAIR, NOT THE SESSION'S");
{
  await legsB();
  const b0 = await shape();
  ck("the session starts out pairing the wrong two",
     b0.pair === "Seated Leg Curl + Standing Cable Hip Abduction", b0.pair);
  /* the reconciler has not run on this yet because the session was built from this plan;
     the mismatch is the session's own, so it takes a pass to notice — nudge the plan the
     way the editor does and let render() reconcile */
  const r = await p.evaluate(()=>{ delete S.active.planSig; save(); render(); return null; });
  const b1 = await shape();
  ck("the pair is repaired to what the plan says",
     b1.pair === "Seated Calf Raise (Smith) + Standing Cable Hip Abduction", b1.pair);
  ck("the leg curl is no longer half of it", b1.names[3] === "Seated Leg Curl", b1.names.join(","));
  ck("and the three you have logged did not move",
     b1.names.slice(0,3).join(",") === "Dumbbell RDL,Smith Machine Hip Thrust,Smith Machine Squat",
     b1.names.slice(0,3).join(","));
  ck("it says what it did", b1.edits.some(x=> /paired with Standing Cable Hip Abduction/.test(x)),
     b1.edits.join("|"));
}

console.log("23 - REORDERING THE PLAN REORDERS WHAT YOU HAVE NOT STARTED");
{
  await legsB();
  await p.evaluate(()=>{ delete S.active.planSig; save(); render(); });   // settle
  const r = await p.evaluate((w)=>{
    // move the captain's chair up in front of the superset, the way the editor does
    const L = S.program[S.active.workoutId];
    const [cap] = L.splice(6, 1);
    L.splice(4, 0, cap);
    save(); render();
    return {names: S.active.entries.map(e=>e.name),
            edits: (S.active.planEdits||[]).map(x=>x.k)};
  });
  ck("it moved in the session too", r.names[3+1] === "Captain's Chair Leg Raise", r.names.join(","));
  ck("the logged three stayed put",
     r.names.slice(0,3).join(",") === "Dumbbell RDL,Smith Machine Hip Thrust,Smith Machine Squat",
     r.names.join(","));
  ck("the superset is still a superset",
     r.names[5] === "Seated Calf Raise (Smith)" && r.names[6] === "Standing Cable Hip Abduction",
     r.names.join(","));
  ck("and the reorder was announced", r.edits.includes("order"), r.edits.join("|"));
}

console.log("24 - BUT NOT PAST SOMETHING YOU HAVE ALREADY DONE");
{
  await legsB();
  await p.evaluate(()=>{ delete S.active.planSig; save(); render(); });
  const r = await p.evaluate(()=>{
    // the plan now wants the RDL last; it is already logged, so the session keeps it first
    const L = S.program[S.active.workoutId];
    const [rdl] = L.splice(0, 1);
    L.push(rdl);
    save(); render();
    return S.active.entries.map(e=>e.name);
  });
  ck("the exercise you have done stays where you did it", r[0] === "Dumbbell RDL", r.join(","));
}

console.log("25 - A SWAPPED EXERCISE KEEPS ITS PLACE IN THE FLOW");
{
  await legsB();
  await p.evaluate(()=>{ delete S.active.planSig; save(); render(); });
  const r = await p.evaluate(()=>{
    const E = S.active.entries;
    const i = E.findIndex(e=> e.name === "Seated Leg Curl");
    E[i] = {name:"Lying Leg Curl", reps:"12-20", sets:[{weight:"",reps:"",rpe:"",done:false}]};
    // and then any plan change at all, to make the reconciler run
    S.program[S.active.workoutId][1].reps = "6-10";
    save(); render();
    return S.active.entries.map(e=>e.name);
  });
  ck("the swap is not swept to the end", r[3] === "Lying Leg Curl", r.join(","));
}

console.log("26 - AND WHERE THE TWO SCREENS CANNOT AGREE, THE PROGRAM TAB SAYS SO");
{
  await start();
  let r = await p.evaluate(()=>{
    // a plan well past its ramp-in, with no deload and nothing eased: the two agree
    S.planStart = Date.now() - 200*86400e3;
    TAB="program"; DAY_EDIT=null; render();
    return {said: /lighter today/i.test(document.body.innerText),
            ramp: rampInActive(), del: deloadActive()};
  });
  ck("no projection is running", !r.ramp && !r.del, JSON.stringify(r));
  ck("nothing said when they do agree", !r.said, String(r.said));
  r = await p.evaluate(()=>{
    /* a deload halves the sets on the workout card while the plan still reads what it
       reads, which is exactly the disagreement */
    S.deload = {startedAt: Date.now() - 86400e3, why:"test"};
    TAB="program"; DAY_EDIT=null; render();
    const t = document.body.innerText;
    return {said: /lighter today/i.test(t), why: /deload/i.test(t),
            plan: /4×8-12|4x8-12/i.test(t), live: deloadActive()};
  });
  ck("the deload is running", r.live, String(r.live));
  ck("the page says the card is lighter", r.said, String(r.said));
  ck("and names the reason", r.why, String(r.why));
}

console.log("27 - A PASS THAT THROWS IS RETRIED, NOT BANKED");
{
  await start();
  const r = await p.evaluate(()=>{
    const a = S.active, w = a.workoutId;
    const real = window.planOrderFix;
    let calls = 0;
    window.planOrderFix = ()=>{ calls++; if(calls === 1) throw new Error("boom"); return real.apply(null, arguments); };
    S.program[w][0].sets = 5;
    save(); render();                         // this one throws part way through
    const after = {sig: S.active.planSig, fail: !!S.active.planFail,
                   sets: S.active.entries[0].sets.length};
    window.planOrderFix = real;
    render();                                 // and the next one has another go
    return {after, sets: S.active.entries[0].sets.length, sigNow: S.active.planSig,
            sig2: !!S.active.planSig, fail2: !!S.active.planFail};
  });
  ck("the failed pass did not bank the new plan", r.after.sig !== r.sigNow, "banked it");
  ck("and left the rows exactly as it found them", r.after.sets===3, String(r.after.sets));
  ck("and left a note saying so", r.after.fail, String(r.after.fail));
  ck("the next render applies the change", r.sets===5, String(r.sets));
  ck("banks the snapshot", r.sig2, String(r.sig2));
  ck("and clears the note", !r.fail2, String(r.fail2));
}

console.log("28 - EVERY ROW LEARNS ITS SLOT, SO IDENTITY STOPS DEPENDING ON THE NAME");
{
  await start();
  const r = await p.evaluate(()=>{
    const a = S.active;
    a.entries.forEach(en=> delete en.planKey);
    delete a.planSnap; delete a.planSig;
    save(); render();
    return a.entries.map(e=> e.planKey || "-");
  });
  ck("all stamped", r.every(x=> x !== "-"), r.join(","));
}

console.log("29 - AND WHAT THE SESSION IS HOLDING BACK IS SAID, WITH A WAY OUT");
{
  await start();
  let r = await p.evaluate(()=>{
    TAB="workout"; render();
    return /Keeping your answer/i.test(document.body.innerText);
  });
  ck("nothing said when it holds nothing", !r, String(r));
  r = await p.evaluate(()=>{
    const a = S.active;
    planDrop(a, 2); a.entries.splice(2, 1);     // Skip, recorded
    TAB="workout"; save(); render();
    return {said: /Keeping your answer/i.test(document.body.innerText),
            named: /Cable Fly, which you skipped/i.test(document.body.innerText),
            btn: !!document.getElementById("planMatch")};
  });
  ck("the skip is owned up to", r.said, String(r.said));
  ck("by name", r.named, String(r.named));
  ck("with a way out", r.btn, String(r.btn));
  r = await p.evaluate(()=>{
    document.getElementById("planMatch").click();
    const a = S.active;
    return {names: a.entries.map(e=>e.name), dropped: (a.planDropped||[]).length,
            said: /Keeping your answer/i.test(document.body.innerText)};
  });
  ck("matching puts it back", r.names.includes("Cable Fly"), r.names.join(","));
  ck("the skip is forgotten", r.dropped===0, String(r.dropped));
  ck("and the card goes", !r.said, String(r.said));
}

console.log("30 - AN EXERCISE THIS GYM DOES NOT HAVE STILL BELONGS TO ITS SLOT");
{
  await start();
  const r = await p.evaluate(()=>{
    const a = S.active, w = a.workoutId;
    /* exactly what applyGymPlan() does: the row is rebuilt for what this room has, and
       remembers what it is standing in for */
    const en = a.entries[0];
    en.swapFrom = en.name;
    en.name = "Machine Chest Press";
    en.swapWhy = {code:"nogym", text:null};
    a.gymPlan = {gymId:"g1", gymName:"Palma Vista", at:Date.now(),
                 swaps:[{i:0, from:en.swapFrom, to:en.name}]};
    // and the session is an old one, so identity has to come from the name
    delete a.planSnap; delete a.planSig;
    a.entries.forEach(x=> delete x.planKey);
    // now make that slot half of a superset, and change its sets
    S.program[w][0].superset = true;
    S.program[w][0].sets = 5;
    save(); render();
    const E = S.active.entries;
    const si = supersetInfo(E, 0);
    return {name: E[0].name, ss: !!E[0].superset, sets: E[0].sets.length,
            partner: si ? si.partner : null, key: E[0].planKey || "-",
            edits: (a.planEdits||[]).map(x=> x.k+":"+x.name)};
  });
  ck("the swap keeps the name this gym has", r.name === "Machine Chest Press", r.name);
  ck("but it is stamped with the slot it stands in", /barbell bench press/.test(r.key), r.key);
  ck("the superset reaches it", r.ss, String(r.ss));
  ck("paired with what the plan puts after it", r.partner === "Incline Dumbbell Press", String(r.partner));
  ck("and so does the set count", r.sets === 5, String(r.sets));
}

console.log("31 - AND A SWAP MADE BY HAND AT THE RACK, THE SAME");
{
  await start();
  const r = await p.evaluate(()=>{
    const a = S.active, w = a.workoutId;
    const en = a.entries[2];
    en.swapFrom = en.name; en.name = "Pec Deck";
    delete a.planSnap; delete a.planSig;
    a.entries.forEach(x=> delete x.planKey);
    S.program[w][2].reps = "20-30";
    save(); render();
    return {name: S.active.entries[2].name, reps: S.active.entries[2].reps};
  });
  ck("it keeps what you chose", r.name === "Pec Deck", r.name);
  ck("and takes the slot's new rep range", r.reps === "20-30", r.reps);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
