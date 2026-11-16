import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE REGRESSION SUITE THE FIX SPEC ASKS FOR.

   Every other spec in this directory proves one rule on a fixture built to exercise it.
   This one replays the user's WHOLE export — 72 sessions, 1,231 sets, 52 movements, 221
   recorded plan changes, July 12 to November 14 — and asserts the six outcomes the fix
   spec names, together, on the real history:

     * none of the five floor cuts of P0-3
     * no Nov 5 straight-bar triceps cut and no Nov 13 Legs A squat cut (P0-1)
     * no rest window above its ceiling (P1-4)
     * no Nov 14 rear delt increase (P1-6)
     * the Preacher Curl and Hip Abduction asymmetry checks active (P1-8)
     * zero no-op, duplicate or mislabelled change rows (P1-6, P2-9)

   It is a safety net rather than a diagnosis: a single rule can be made to pass its own
   spec by a change that breaks a different one two months earlier in the log, and no
   purpose-built fixture would notice. This would.

   The fixture is tests/fixtures/replay-2026-11-15.json, built by tools/replay_fixture.py
   from the Training History Report and the plan-change CSV. The split changes inside the
   period — a five-day body-part split until late August, then the six-day PPL the user
   trains now — which the replay keeps, because a history that changed shape is part of
   what the rules have to cope with. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/replay-2026-11-15.json'), 'utf8'));
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

/* ---- the load ----------------------------------------------------------------
   The export is a REPORT, so it has to be turned back into state. Nothing is invented:
   the day name becomes a workout id (the six PPL ids are the ones the user's split
   actually uses, so those sessions land on real slots and the earlier body-part days
   become legacy ids, which applySplit() already names); each exercise becomes an entry;
   each row becomes a set. A row carrying L or R is written as the legacy one-side-per-set
   shape, which is what it is — st.side as the override and the entry's opening side
   taken from its first row, exactly as setSide() reads them. */
const loaded = await p.evaluate(fx=>{
  const sp = document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.parse("2026-07-01")};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, progression:"suggest"});
  S.splitId="ppl6"; applySplit();

  /* THE REP RANGES ARE IN THE CHANGE LOG, so they are not invented. Three shapes appear
     in the user's export and all three are read, newest wins:

         reps 8-10 \u2192 6-10                        (an edit, filed under the movement)
         8-16 \u2192 8-21                             (a reps row, filed under the movement)
         Dumbbell Lateral Raise: 12-20 \u2192 8-16 reps   (a volume spread, filed under a muscle)

     This matters more than it looks: the rep range is the thing double progression is
     judged against, so a fabricated one would decide the Nov 14 rear delt outcome by
     itself. The audited fly really is 12-20 by August, which the log says here. */
  const RANGE = {};
  fx.changes.slice().sort((a,b)=> (a.date < b.date ? -1 : 1)).forEach(r=>{
    const txt = String(r.change || "");
    let m = txt.match(/^(?:reps\s+)?(\d+-\d+)\s*\u2192\s*(\d+-\d+)(?:\s*reps)?/);
    if(m){ RANGE[nrm(r.name)] = m[2]; return; }
    const re = /([A-Za-z][^:\u00b7]*?):\s*\d+-\d+\s*\u2192\s*(\d+-\d+)\s*reps/g;
    let g;
    while((g = re.exec(txt))) RANGE[nrm(g[1].trim())] = g[2];
  });

  const widOf = name=>{
    const t = String(name).replace(/\s*Day$/, "").trim();
    const m = {"Push A":"pushA","Pull A":"pullA","Legs A":"legsA",
               "Push B":"pushB","Pull B":"pullB","Legs B":"legsB"}[t];
    return m || t.toLowerCase().replace(/[^a-z0-9]+/g, "");
  };
  S.sessions = fx.sessions.map((s, i)=>{
    const at = s.startedAt || Date.parse(s.date + "T18:00:00");
    return {
      id: "rp" + i, date: s.date, workoutId: widOf(s.day),
      startedAt: at, finishedAt: s.finishedAt || (at + 3600000),
      entries: s.ex.map(e=>{
        const sided = e.sets.filter(x=> x.side);
        /* THE RANGE THE SESSION WAS STARTED WITH. startWorkout() freezes the slot's rep
           range onto the entry, and progressionFor() reads it off the ENTRY \u2014 so a
           replay that leaves it empty makes every verdict return null at `if(!range)`
           and every "nothing was increased" assertion below vacuous. Found by giving the
           rear delt fly a session that plainly clears its range and getting null back. */
        const en = {name: e.name, reps: RANGE[nrm(e.name)] || "8-12", sets: e.sets.map(x=> ({
          weight: x.w == null ? "" : String(x.w),
          reps: x.reps == null ? "" : String(x.reps),
          rpe: x.rpe == null ? "" : String(x.rpe),
          done: true,
          side: x.side || undefined,
          rest: x.rest == null ? undefined : x.rest
        }))};
        if(sided.length) en.startSide = sided[0].side;
        if(e.superset) en.supersetTag = e.superset;
        return en;
      })
    };
  }).sort((a,b)=> a.startedAt - b.startedAt);

  /* The recorded change log, as recorded. `why` is the sentence that was written down at
     the time, which is exactly what P2-9 is about: it goes in as the note and the derived
     reason is what the readers are then asked for. */
  S.planLog = fx.changes.map(r=>{
    const at = Date.parse(r.date + "T" + (/^\d{2}:\d{2}$/.test(r.time) ? r.time : "12:00") + ":00");
    return {at: isFinite(at) ? at : Date.parse(r.date + "T12:00:00"),
            date: r.date, day: r.day === "Workout" ? null : r.day,
            kind: r.kind, name: r.name, changes: [r.change],
            note: r.why || "", source: r.source};
  }).sort((a,b)=> a.at - b.at);
  /* AND THE PROGRAMME, WITHOUT WHICH MOST OF THIS IS VACUOUS.

     The export is a record of what was PERFORMED; nearly every rule being checked here
     compares that against what was PRESCRIBED, and asks for it by slot. With S.program
     left as the ppl6 template, stallVerdict() and the floor detectors find no entry for
     the user's movements and return nothing \u2014 and a suite where the reader never ran
     would pass every "nothing was cut" assertion while testing nothing at all.

     So the plan is reconstructed from the last session of each of the six current days:
     the movements that day carries, how many sets of each, the rep range the change log
     records where it records one, and the load last used. It is a reconstruction and is
     labelled as one; what matters is that it is the user's movements in the user's slots,
     so the slot-scoped readers have something real to answer about. */
  const PPL = ["pushA","pullA","legsA","pushB","pullB","legsB"];
  const lastOf = {};
  S.sessions.forEach(s=>{ if(PPL.indexOf(s.workoutId) > -1) lastOf[s.workoutId] = s; });
  PPL.forEach(wid=>{
    const s = lastOf[wid];
    if(!s) return;
    S.program[wid] = s.entries.map(en=>{
      const ws = en.sets.filter(x=> (parseFloat(x.reps) || 0) > 0);
      const pairs = en.startSide ? Math.max(1, Math.round(ws.length / 2)) : ws.length;
      const load = ws.map(x=> parseFloat(x.weight)).filter(v=> v > 0);
      const row = {name: en.name, sets: Math.max(1, pairs),
                   reps: RANGE[nrm(en.name)] || "8-12"};
      if(load.length) row.weight = Math.max.apply(null, load);
      return row;
    });
  });
  S.planLogRecorded = S.planLog.length;      // where the recorded log ends and the replay begins
  save();
  const named = PPL.reduce((t,w)=> t + (S.program[w]||[]).filter(e=> RANGE[nrm(e.name)]).length, 0);
  return {sessions: S.sessions.length,
          program: PPL.map(w=> w + ":" + ((S.program[w]||[]).length)).join(" "),
          ranges: Object.keys(RANGE).length, rangedRows: named,
          fly: RANGE[nrm("Cable Reverse Rear Delt Fly")] || null,
          sets: S.sessions.reduce((t,s)=> t + s.entries.reduce((u,e)=> u + e.sets.length, 0), 0),
          changes: S.planLog.length,
          wids: [...new Set(S.sessions.map(s=> s.workoutId))],
          last: S.sessions[S.sessions.length-1].date};
}, FX);
console.log("LOADED " + loaded.sessions + " sessions, " + loaded.sets + " sets, "
  + loaded.changes + " change rows, last " + loaded.last);
console.log("        days: " + loaded.wids.join(" "));
ck("the whole export is in", loaded.sessions === FX.sessions.length
   && loaded.changes === FX.changes.length, loaded.sessions + "/" + loaded.changes);
ck("and it reads as one history, not a pile of rows", loaded.sets > 1200, String(loaded.sets));
console.log("        plan:  " + loaded.program);
ck("every current day has a reconstructed plan to be judged against",
   !/:0\b/.test(loaded.program), loaded.program);
console.log("        rep ranges recovered from the change log: " + loaded.ranges
  + " movements, " + loaded.rangedRows + " of the planned rows; the rear delt fly is "
  + loaded.fly);
ck("the rep ranges come from the log, not from a default",
   loaded.ranges >= 10 && loaded.rangedRows > 0,
   loaded.ranges + "/" + loaded.rangedRows);
ck("including the audited rear delt fly", loaded.fly === "12-20", String(loaded.fly));

/* ---- the replay proper -------------------------------------------------------
   Injecting sessions into S.sessions is not a replay, it is a fixture. The rules that
   matter here are evaluated AT FINISH and stored: updateStalls() walks the history in
   order mutating a running counter, buildProgression() grades against the history as it
   stood then, recordFlags() stamps what the grade concluded, and on "auto" the increases
   are written into the programme at the moment they were earned.

   So each session goes through the same pipeline, oldest first, exactly as finishing it
   would. The first version of this spec skipped that and S.stalls stayed empty, which
   meant stallVerdict() answered null for all 1,231 sets and every "nothing was cut"
   assertion below passed without the rule ever being consulted. That is what the vacuity
   checks in each section are there to stop happening again.

   On "auto", so the app ACTS rather than merely offering: what a safety net has to catch
   is a bad change being written, not a bad change being available. */
const ran = await p.evaluate(()=>{
  trainPrefs().progression = "auto";
  const errs = [];
  let graded = 0;
  S.sessions.slice().sort((a,b)=> a.startedAt - b.startedAt).forEach(sess=>{
    try{
      (sess.entries || []).forEach(en=>{
        if(!en || !en.name) return;
        const add = barAddendFor(en.name);
        if(add > 0) en.barAdd = add; else delete en.barAdd;
      });
      sweepSessionPRs(sess);
      updateStalls(sess);
      sess.progression = buildProgression(sess);
      if(!sessionNotEvidence(sess)){
        (sess.progression || []).filter(x=> x.kind === "up" && x.to != null).forEach(x=>{
          if(applyProgression(x.name, x.to, null, progReason(x), {wid: sess.workoutId})) x.auto = true;
        });
        (sess.progression || []).filter(x=> x.kind === "stretch" && x.newReps).forEach(x=>{
          if(applyRepStretch(x.name, x.newReps, progReason(x), sess.workoutId)) x.auto = true;
        });
      }
      clearRebuiltEntries(sess);
      recordFlags(sess, (sess.progression || []).concat(fadeFindings(sess)));
      sess.quality = scoreWorkout(sess);
      graded++;
    }catch(e){ errs.push(sess.date + ": " + e.message); }
  });
  save();
  const stalls = Object.keys(S.stalls || {}).length;
  const kinds = {};
  S.sessions.forEach(s=> (s.progression || []).forEach(x=> kinds[x.kind] = (kinds[x.kind]||0)+1));
  return {graded, errs: errs.slice(0, 6), nErr: errs.length, stalls, kinds,
          written: (S.planLog || []).length - S.planLogRecorded,
          flags: (flagLog() || []).length};
});
console.log("REPLAYED " + ran.graded + " sessions through the finish pipeline, "
  + ran.nErr + " errors");
console.log("         stall counters: " + ran.stalls + ", verdicts " + JSON.stringify(ran.kinds));
console.log("         plan rows the app wrote during the replay: " + ran.written
  + ", flags recorded: " + ran.flags);
if(ran.errs.length) ran.errs.forEach(e=> console.log("         ERR " + e));
ck("every session graded without throwing", ran.nErr === 0, ran.errs.join(" | ") || "none");
ck("the stall counter actually ran", ran.stalls > 0, String(ran.stalls));
ck("and the grade produced verdicts to act on",
   Object.keys(ran.kinds).length > 0, JSON.stringify(ran.kinds));

console.log("\n1 - NONE OF THE FIVE FLOOR CUTS  (P0-3)");
/* The audited cuts were proposed on a model whose own window straddled a counting
   change, on movements with too little history to say anything, and against evidence the
   card never showed. The rule now needs real evidence; the test is that on this history
   it finds none for a CUT. */
const floors = await p.evaluate(()=>{
  const A = bodyAnalysis();
  /* tgEvidence() is the per-group detector; tgSuggestion() is the one of them the Body
     tab offers. Both are asked, because "nothing was offered" and "nothing was found"
     are different facts and only the second one means the rule declined. */
  const ev = [];
  GKEYS.forEach(g=>{
    let e = null;
    try{ e = tgEvidence(A, g); }catch(err){ ev.push({g, err: String(err)}); return; }
    if(e) ev.push({g, dir: e.dir, from: e.mev, to: e.to, why: (e.why||"").slice(0,80)});
  });
  let offered = null;
  try{ offered = tgSuggestion(A); }catch(e){ offered = {err: String(e)}; }
  /* AND THE PROOF THAT THE DETECTOR RAN AT ALL. It refuses outright under ten sessions
     and when a group has no volume to speak of, so the window figures it works from are
     reported: a replay where these came back empty would be a replay where every
     assertion below is about a function that returned early. */
  const now = Date.now();
  const win = windowStats(now - 7*86400000*TGS_WEEKS, now + 1);
  const seen = GKEYS.filter(g=> (win[g] && win[g].sets) > 0);
  return {ev, offered, sessions: (S.sessions||[]).length, groupsWithVolume: seen.length};
});
console.log("    " + floors.sessions + " sessions in, " + floors.groupsWithVolume
  + " muscle groups carrying volume in the window");
floors.ev.forEach(x=> console.log("    " + x.g + " " + (x.err ? "ERR " + x.err
  : x.dir + " " + x.from + " \u2192 " + x.to + "   " + x.why)));
console.log("    offered: " + JSON.stringify(floors.offered));
/* Vacuity first: the rule has to have had something to look at. */
ck("the detector had enough history to run", floors.sessions >= 10, String(floors.sessions));
ck("and real volume to look at", floors.groupsWithVolume >= 8, String(floors.groupsWithVolume));
ck("nothing errored on the way", !floors.ev.some(x=> x.err),
   floors.ev.filter(x=> x.err).map(x=> x.g).join(", ") || "none");
const cuts = floors.ev.filter(x=> x.dir === "down");
ck("no floor cut is found on this history", cuts.length === 0,
   cuts.map(x=> x.g + " " + x.from + "\u2192" + x.to).join(", ") || "none");
ck("and none is offered", !floors.offered || floors.offered.dir !== "down",
   JSON.stringify(floors.offered));

console.log("\n2 - NO NOV 5 STRAIGHT-BAR TRICEPS CUT, NO NOV 13 LEGS A SQUAT CUT  (P0-1)");
/* BOTH AUDITED CASES ARE LOAD CUTS FROM THE COLLAPSE PATH, not stall set cuts \u2014 which
   the first draft of this section got wrong and tested stallVerdict() for. The change log
   says exactly what happened:

     Nov 5 21:33  Push A  Overhead Cable Triceps Extension  90 \u2192 85  "Applied from the
                  Body tab: reps collapsed across the sets" \u2014 while the collapse was the
                  Push B V-BAR, 90 x 8, 9, 5.
     Nov 13 12:24 Legs A  Smith Machine Squat  80 \u2192 70  same reason \u2014 while the collapse
                  was the Legs B session of Nov 9, where squat is the third exercise.

   Both slots are in this fixture: the straight bar is a Push A movement and the V-bar is
   on both Push A and Push B, and the Smith squat appears in Legs A and as slot 3 of Legs
   B. So the question can be put the way the spec puts it. */
const fade = await p.evaluate(()=>{
  const out = {};
  /* findProgramEntryWhere returns {e, wid}; reading .ref or the result itself gives null
     for every slot, which made the first run of this section compare null with null and
     pass. f.wid !== wid guards against the fallback: the question is what THIS slot
     carries, not what the first slot holding the name carries. */
  const loadOf = (nm, wid)=>{
    const f = findProgramEntryWhere(nm, wid);
    if(!f || !f.e || f.wid !== wid) return null;
    return f.e.weight == null ? null : f.e.weight;
  };
  const nov5 = S.sessions.filter(s=> s.date === "2026-11-05")[0];
  const nov9 = S.sessions.filter(s=> s.date === "2026-11-09")[0];
  out.nov5day = nov5 && nov5.workoutId;
  out.nov9day = nov9 && nov9.workoutId;
  out.vbarSets = nov5 && (nov5.entries||[]).filter(e=> /V-bar/i.test(e.name))
    .map(e=> e.sets.map(x=> x.weight + "x" + x.reps).join(" "))[0];
  out.sqSets = nov9 && (nov9.entries||[]).filter(e=> /Smith Machine Squat/i.test(e.name))
    .map(e=> e.sets.map(x=> x.weight + "x" + x.reps).join(" "))[0];
  out.sqSlot = nov9 && (nov9.entries||[]).findIndex(e=> /Smith Machine Squat/i.test(e.name)) + 1;

  /* THROUGH THE REAL PATH, which is the whole point of the exercise.

     The first version of this read fadeFindings() and called applyProgression() with the
     FINDING's wid - and a finding carries none, because it does not need to: recordFlags()
     stamps the session's workoutId onto every flag it creates, and applyFlag() passes
     that to applyProgression(). So the harness was reaching around the one mechanism that
     scopes the change, and the "Legs B collapse cuts the Legs A squat" failure it
     produced was mine, not the app's. The flags are already in the log - the replay
     pipeline recorded them - so this taps them the way the Body tab does. */
  const fades = (flagLog() || []).filter(f=> f && f.kind === "fade");
  out.flags = fades.map(f=> ({ex: f.ex, date: f.date, wid: f.workoutId || "(none)",
                              to: f.to, applied: !!f.applied}));
  out.nameless = out.flags.filter(f=> f.wid === "(none)").map(f=> f.ex);

  const before = {triStraightA: loadOf("Overhead Cable Triceps Extension", "pushA"),
                  triVbarB: loadOf("Overhead Cable Triceps Extension (V-bar)", "pushB"),
                  sqLegsA: loadOf("Smith Machine Squat", "legsA"),
                  sqLegsB: loadOf("Smith Machine Squat", "legsB")};
  out.before = before;
  /* The two audited taps: the collapse recorded on Nov 5's Push B V-bar, and the one on
     Nov 9's Legs B squat. Each is applied exactly as pressing the button would. */
  const tap = (exRe, date)=>{
    const f = fades.filter(x=> exRe.test(x.ex) && x.date === date && x.to != null)[0];
    if(!f) return "no such flag";
    f.applied = false; if(f.did) delete f.did;
    const ok = applyFlag(f.id, "load");
    return (ok ? "applied" : "refused") + " " + f.ex + " [" + (f.workoutId || "none")
         + "] \u2192 " + f.to;
  };
  out.tapped = [tap(/V-bar/i, "2026-11-05"), tap(/Smith Machine Squat/i, "2026-11-09")];
  out.after = {triStraightA: loadOf("Overhead Cable Triceps Extension", "pushA"),
               triVbarB: loadOf("Overhead Cable Triceps Extension (V-bar)", "pushB"),
               sqLegsA: loadOf("Smith Machine Squat", "legsA"),
               sqLegsB: loadOf("Smith Machine Squat", "legsB")};
  return out;
});
console.log("    Nov 5 is " + fade.nov5day + ", V-bar logged " + fade.vbarSets);
console.log("    Nov 9 is " + fade.nov9day + ", squat is exercise " + fade.sqSlot
  + ", logged " + fade.sqSets);
console.log("    collapse flags recorded: " + fade.flags.length);
fade.flags.forEach(f=> console.log("       " + f.date + " " + f.ex + " [" + f.wid + "] \u2192 " + f.to));
console.log("    tapped: " + fade.tapped.join("  |  "));
console.log("    loads before: " + JSON.stringify(fade.before));
console.log("    loads after : " + JSON.stringify(fade.after));
/* Vacuity: both audited slots have to be in the plan, and the collapses have to have
   been recorded, or the two assertions below are about nothing. */
ck("the Push B V-bar collapse is in the replay",
   fade.nov5day === "pushB" && !!fade.vbarSets, fade.nov5day + " " + fade.vbarSets);
ck("and the Legs B squat, third exercise, on Nov 9",
   fade.nov9day === "legsB" && fade.sqSlot === 3, fade.nov9day + " slot " + fade.sqSlot);
ck("both triceps slots exist to be confused",
   fade.before.triStraightA != null && fade.before.triVbarB != null,
   JSON.stringify(fade.before));
ck("and both squat slots", fade.before.sqLegsA != null && fade.before.sqLegsB != null,
   JSON.stringify(fade.before));
ck("both collapses were actually applied", fade.tapped.every(x=> /^applied/.test(x)),
   fade.tapped.join(" | "));
/* The acceptance tests. */
ck("a collapse on the Push B V-bar changes nothing on the Push A straight bar",
   fade.after.triStraightA === fade.before.triStraightA,
   fade.before.triStraightA + " \u2192 " + fade.after.triStraightA);
ck("a collapse on the Legs B squat does not change the Legs A squat",
   fade.after.sqLegsA === fade.before.sqLegsA,
   fade.before.sqLegsA + " \u2192 " + fade.after.sqLegsA);
ck("it changes the slot it came from instead",
   fade.after.sqLegsB !== fade.before.sqLegsB,
   fade.before.sqLegsB + " \u2192 " + fade.after.sqLegsB);
ck("and every collapse flag names the slot it came from", fade.nameless.length === 0,
   fade.nameless.join(", ") || "all of them");

console.log("\n2b - AND NO CHANGE ROW IS FILED UNDER \u201cWORKOUT\u201d  (P0-1, third acceptance test)");
/* "Every weight, rest and stall row in the change log names a specific day, never
   Workout." The historic log is full of them - that IS the bug - so the test is about
   the rows the app writes NOW, during the replay. */
const filed = await p.evaluate(()=>{
  const log = S.planLog || [];
  const fresh = log.slice(S.planLogRecorded);
  const want = c=> ["weight","rest","stall","programme","rule"].indexOf(c.kind) > -1;
  const nameless = fresh.filter(c=> want(c) && !c.day);
  const histNameless = log.slice(0, S.planLogRecorded).filter(c=> want(c) && !c.day);
  return {fresh: fresh.length, kinds: fresh.map(c=> c.kind + (c.day ? "@" + c.day : "@NONE")),
          nameless: nameless.map(c=> c.kind + " " + c.name + " " + (c.changes||[])[0]),
          hist: histNameless.length, histOf: log.slice(0, S.planLogRecorded).filter(want).length};
});
console.log("    " + filed.fresh + " rows written during the replay: "
  + filed.kinds.slice(0, 12).join(", ") + (filed.kinds.length > 12 ? " \u2026" : ""));
console.log("    (the recorded log has " + filed.hist + " of " + filed.histOf
  + " such rows filed under no day \u2014 that is the audited bug)");
ck("the replay wrote rows at all", filed.fresh > 0, String(filed.fresh));
ck("and not one of them is filed under no day", filed.nameless.length === 0,
   filed.nameless.join(" | ") || "none");
ck("the audited log really did have nameless rows to fix", filed.hist > 0, String(filed.hist));

console.log("\n3 - NO REST WINDOW ABOVE ITS CEILING  (P1-4)");
/* The first draft of this called restWindowFor(), which does not exist, inside a
   try/catch - so it measured nothing and reported zero violations out of zero windows.
   A rest window lives on the programme entry as e.rest = [lo, hi], and the ceiling is
   restCeilingFor(entry): 4:00 for a compound, 3:00 for an isolation lift.

   The audited windows are in the change log and several are plainly over: the squat
   reached 3:30-5:30 (330s against a 240s ceiling), the overhead triceps extension
   3:30-4:30 (270s against 180s), the rear delt fly 2:30-3:30 (210s against 180s). So the
   recorded state is loaded, the violations are counted to prove the fixture carries them,
   and then the app is asked to deal with it. */
const rest = await p.evaluate(fx=>{
  const SEP = /^(\d+):(\d{2})[\u2013\u2014-](\d+):(\d{2})\s*\u2192\s*(\d+):(\d{2})[\u2013\u2014-](\d+):(\d{2})$/;
  const secs = (m,i)=> parseInt(m[i],10) * 60 + parseInt(m[i+1],10);
  /* The last recorded window per movement, oldest first so the newest wins. */
  const want = {};
  fx.changes.filter(r=> r.kind === "rest").slice()
    .sort((a,b)=> (a.date < b.date ? -1 : 1)).forEach(r=>{
      const m = SEP.exec(String(r.change).trim());
      if(m) want[nrm(r.name)] = [secs(m,5), secs(m,7)];
    });
  const slots = DAYS.concat(["finisher"]);
  let placed = 0;
  slots.forEach(wid=> (S.program[wid] || []).forEach(e=>{
    const w = want[nrm(e.name)];
    if(w){ e.rest = w.slice(); placed++; }
  }));
  const scan = ()=>{
    const over = [], all = [];
    slots.forEach(wid=> (S.program[wid] || []).forEach(e=>{
      if(!Array.isArray(e.rest) || e.rest.length !== 2) return;
      const cap = restCeilingFor(e);
      all.push({wid, name: e.name, hi: e.rest[1], cap});
      if(e.rest[1] > cap + 0.5) over.push({wid, name: e.name, hi: e.rest[1], cap});
    }));
    return {over, nWindows: all.length};
  };
  const loaded = scan();
  /* The migration exists precisely to bring windows the old rule already pushed over the
     line back under it. S.restCeilV1 is its once-only latch, cleared so it runs here. */
  delete S.restCeilV1;
  const migrated = migrateRestCeilings();
  const afterMigrate = scan();
  /* AND THE RULE RUN AGAIN, hard. Every collapse the history recorded, asking for the
     rest half - which is the rule that produced the audited windows in the first place.
     None of them may push a window over the ceiling, and one already at it has to say so
     rather than silently not moving. */
  let grew = 0, refused = 0;
  (flagLog() || []).filter(f=> f && f.kind === "fade").forEach(f=>{
    if(f.did && f.did.rest) delete f.did.rest;
    f.applied = false;
    let ok = false;
    try{ ok = addRestToExercise(f.ex, f.restAdd == null ? FADE_REST_ADD : f.restAdd, f.workoutId); }
    catch(e){}
    if(ok) grew++; else refused++;
  });
  const afterGrowth = scan();
  return {want: Object.keys(want).length, placed, loaded, migrated,
          afterMigrate, grew, refused, afterGrowth};
}, FX);
console.log("    " + rest.want + " recorded windows, " + rest.placed
  + " placed on the plan, " + rest.loaded.nWindows + " windows in all");
console.log("    as recorded: " + rest.loaded.over.length + " over the ceiling "
  + rest.loaded.over.map(x=> x.name + " " + x.hi + ">" + x.cap).slice(0,4).join(", "));
console.log("    migration brought " + rest.migrated + " down; now over: "
  + rest.afterMigrate.over.length);
console.log("    then " + rest.grew + " collapses lengthened a window and " + rest.refused
  + " were refused; now over: " + rest.afterGrowth.over.length);
/* Vacuity, both ways: there have to be windows, and the recorded ones have to include
   the audited violations, or "none over the ceiling" is a statement about an empty set. */
ck("the plan really carries rest windows", rest.loaded.nWindows >= 8,
   String(rest.loaded.nWindows));
ck("and the audited export really had windows over the ceiling",
   rest.loaded.over.length > 0,
   rest.loaded.over.map(x=> x.name + " " + x.hi + ">" + x.cap).join(", ") || "none");
ck("the migration brings every one of them down", rest.afterMigrate.over.length === 0,
   rest.afterMigrate.over.map(x=> x.name + " " + x.hi + ">" + x.cap).join(", ") || "none");
ck("the lengthening rule still fires somewhere", rest.grew > 0,
   rest.grew + " grew, " + rest.refused + " refused");
ck("and no window ends up above its ceiling", rest.afterGrowth.over.length === 0,
   rest.afterGrowth.over.map(x=> x.name + " " + x.hi + ">" + x.cap).join(", ") || "none");

console.log("\n4 - NO NOV 14 REAR DELT INCREASE  (P1-6)");
/* The audited row: the fly was planned at 30 while every logged session used 32.5, and
   the plan went 30 → 35 reasoned "the last set cleared the top of the range" against a
   last set of 12 reps into a range topping out at 15. */
const delt = await p.evaluate(()=>{
  const s = S.sessions.filter(x=> x.date === "2026-11-14")[0];
  if(!s) return {missing: true};
  const out = [];
  (s.entries || []).forEach(en=>{
    if(!/rear delt|reverse.*fly|face pull/i.test(en.name)) return;
    const planned = {name: en.name, sets: 3, reps: "10-15", weight: 30};
    let v = null;
    try{ v = progressionFor(s, Object.assign({}, en, {reps: "10-15"})); }catch(e){ v = {err: String(e)}; }
    out.push({name: en.name, kind: v && v.kind, to: v && v.to,
              logged: en.sets.map(x=> x.weight + "x" + x.reps + "@" + x.rpe).join(" ")});
  });
  /* The control: the audited movement, its own slot, a session that clears 20 reps at
     RPE 8 against a 12-20 range. */
  const fly = (s.entries || []).filter(e=> /Rear Delt Fly/i.test(e.name))[0];
  let control = null;
  if(fly){
    const win = JSON.parse(JSON.stringify(fly));
    const load = (findProgramEntryWhere(fly.name, s.workoutId) || {e:{}}).e.weight || 30;
    win.sets = [1,2,3].map(()=> ({weight: String(load), reps: "21", rpe: "8", done: true}));
    try{ control = progressionFor(Object.assign({}, s, {entries: [win]}), win); }
    catch(e){ control = {err: String(e)}; }
  }
  const planned = fly ? findProgramEntryWhere(fly.name, s.workoutId) : null;
  return {out, date: s.date, control,
          range: planned && planned.e ? planned.e.reps : null};
});
(delt.out || []).forEach(x=> console.log("    " + x.name + " → " + x.kind
  + (x.to != null ? " to " + x.to : "") + "   logged " + x.logged));
ck("the Nov 14 session is in the replay", !delt.missing, String(!delt.missing));
ck("the fly is planned at the range the log records", delt.range === "12-20", String(delt.range));
ck("no rear delt load increase is earned there",
   (delt.out || []).every(x=> x.kind !== "up"),
   (delt.out || []).map(x=> x.name + ":" + x.kind).join(", ") || "nothing there");
ck("and it is a verdict, not a shrug", (delt.out || []).every(x=> !!x.kind),
   (delt.out || []).map(x=> String(x.kind)).join(", "));
/* THE POSITIVE CONTROL, without which "no increase" proves nothing. The same movement,
   the same slot, the same rule \u2014 with a session that plainly clears the top of the
   range at target RPE. If that does not earn an increase, the rule is switched off and
   this section is measuring silence. */
console.log("    control: " + JSON.stringify(delt.control));
ck("a session that DOES clear the top of the range earns one",
   delt.control && delt.control.kind === "up", JSON.stringify(delt.control));
ck("so the refusal above is the rule working, not the rule absent",
   delt.control && delt.control.kind === "up"
   && (delt.out || []).every(x=> x.kind !== "up"), "");
console.log("    (" + ran.kinds.up + " load increases were earned elsewhere in the replay)");
ck("and increases do happen on this history", ran.kinds.up > 0, String(ran.kinds.up));

console.log("\n5 - PREACHER CURL AND HIP ABDUCTION STAY ACTIVE  (P1-8)");
const asym = await p.evaluate(()=>{
  const want = ["Preacher Curl", "Standing Cable Hip Abduction",
                "Single-Arm Cable Pulldown", "Single-Arm Dumbbell Row",
                "Dumbbell Bulgarian Split Squat", "Single-Arm Cable Hammer Curl"];
  return want.map(n=>{
    let st = null;
    try{ st = sideStats(n); }catch(e){ return {n, err: String(e)}; }
    /* `weaker`/`stronger`, not `dir`: dir is a local inside sideStats and reading it
       off the result printed undefined for all six while the assertions still passed. */
    return {n, ok: !!(st && st.ok), closed: st && st.closed, weaker: st && st.weaker,
            exposures: st && st.exposures, sessions: st && st.sessions,
            signed: st && st.signedPct != null ? Math.round(st.signedPct * 100) : null,
            behindL: st && st.behindL, behindR: st && st.behindR,
            reason: st && st.reason};
  });
});
asym.forEach(x=> console.log("    " + (x.n + "                                ").slice(0,34)
  + (x.err ? "ERR " + x.err
     : (x.ok ? "exp " + x.exposures + "/" + x.sessions + "  L behind " + x.behindL
               + " R behind " + x.behindR + "  signed " + x.signed + "%  weaker "
               + (x.weaker || "\u2014")
               + "  " + (x.closed ? "retired" : "ACTIVE")
        : "NOT DECIDED \u2014 " + x.reason))));
/* Vacuity: every one of the six has to have been actually decided. closed === false is
   also what an undecided movement looks like from the outside, so "active" means nothing
   unless the comparison happened. */
ck("all six were decided on real exposures", asym.every(x=> x.ok),
   asym.filter(x=> !x.ok).map(x=> x.n).join(", ") || "all");
const act = n=> (asym.find(x=> x.n === n) || {});
ck("Preacher Curl stays active", act("Preacher Curl").closed === false,
   JSON.stringify(act("Preacher Curl")));
ck("  with the left named as the weaker side", act("Preacher Curl").weaker === "L",
   String(act("Preacher Curl").weaker));
ck("Hip Abduction stays active", act("Standing Cable Hip Abduction").closed === false,
   JSON.stringify(act("Standing Cable Hip Abduction")));
ck("  and the left there too", act("Standing Cable Hip Abduction").weaker === "L",
   String(act("Standing Cable Hip Abduction").weaker));
["Single-Arm Cable Pulldown","Single-Arm Dumbbell Row",
 "Dumbbell Bulgarian Split Squat","Single-Arm Cable Hammer Curl"].forEach(n=>
  ck("  and " + n + " retires", act(n).closed === true, JSON.stringify(act(n))));

console.log("\n6 - ZERO NO-OP, DUPLICATE OR MISLABELLED CHANGE ROWS  (P1-6, P2-9)");
const rows = await p.evaluate(()=>{
  const log = S.planLog || [];
  const noop = log.filter(c=> planChangeIsNoOp(c.changes));
  const seen = new Map(), dupe = [];
  log.forEach(c=>{
    const k = c.kind + "|" + (c.day||"") + "|" + c.name + "|" + JSON.stringify(c.changes);
    const prev = seen.get(k);
    if(prev != null && Math.abs((c.at||0) - prev) <= PLAN_DUPE_MS) dupe.push(c);
    seen.set(k, c.at || 0);
  });
  /* Mislabelled: the reason a reader is SHOWN asserting the opposite of the row. */
  const mis = log.filter(c=>{
    const why = planChangeWhy(c);
    const d = planChangeDir(c);
    return (d < 0 && /cleared the top|double progression/i.test(why))
        || (d > 0 && /reduced|cut to/i.test(why));
  });
  /* And how many of the recorded ones WERE wrong, which is the thing being corrected. */
  const wasMis = log.filter(c=> c.note && planChangeDir(c) < 0
    && /cleared the top|double progression/i.test(c.note));
  /* THE ROWS THE APP WROTE, which is the direct reading of the outcome. The recorded log
     predates the guards and still holds the rows that prompted them - 19 no-ops and 7
     duplicates, which is the evidence, not a failure. What has to be zero is everything
     written since. */
  const fresh = log.slice(S.planLogRecorded);
  const fseen = new Map(), fdupe = [];
  fresh.forEach(c=>{
    const k = c.kind + "|" + (c.day||"") + "|" + c.name + "|" + JSON.stringify(c.changes);
    const prev = fseen.get(k);
    if(prev != null && Math.abs((c.at||0) - prev) <= PLAN_DUPE_MS) fdupe.push(c);
    fseen.set(k, c.at || 0);
  });
  const fresher = {
    n: fresh.length,
    noop: fresh.filter(c=> planChangeIsNoOp(c.changes)).map(c=> (c.changes||[])[0]),
    dupe: fdupe.map(c=> c.date + " " + c.name + " " + (c.changes||[])[0]),
    mis: fresh.filter(c=>{
      const why = planChangeWhy(c), d = planChangeDir(c);
      return (d < 0 && /cleared the top|double progression/i.test(why))
          || (d > 0 && /reduced|cut to/i.test(why));
    }).map(c=> c.date + " " + c.name + " " + (c.changes||[])[0] + " :: " + planChangeWhy(c)),
    noRule: fresh.filter(c=> !planChangeRule(c)).length
  };
  return {fresher, n: log.length, noop: noop.map(c=> (c.changes||[])[0]),
          dupe: dupe.map(c=> c.date + " " + c.name + " " + (c.changes||[])[0]),
          mis: mis.map(c=> c.date + " " + c.name + " " + (c.changes||[])[0] + " :: " + planChangeWhy(c)),
          wasMis: wasMis.map(c=> c.date + " " + c.name + " " + (c.changes||[])[0]),
          noRule: log.filter(c=> !planChangeRule(c)).length};
});
console.log("    " + rows.n + " rows: " + rows.noop.length + " no-op, " + rows.dupe.length
  + " duplicate, " + rows.mis.length + " mislabelled as shown");
console.log("    (" + rows.wasMis.length + " were mislabelled as recorded, which is what the"
  + " derived reason corrects)");
rows.wasMis.slice(0, 8).forEach(x=> console.log("       was: " + x));
rows.noop.slice(0, 8).forEach(x=> console.log("       no-op: " + x));
rows.dupe.slice(0, 8).forEach(x=> console.log("       dupe: " + x));
rows.mis.slice(0, 8).forEach(x=> console.log("       MIS: " + x));
ck("no row is shown with a reason that contradicts it", rows.mis.length === 0,
   String(rows.mis.length));
ck("every row can name the rule behind it", rows.noRule === 0, String(rows.noRule));
ck("the audited mislabelled rows are in the fixture at all", rows.wasMis.length > 0,
   String(rows.wasMis.length));
console.log("    of the " + rows.fresher.n + " rows the app wrote during the replay: "
  + rows.fresher.noop.length + " no-op, " + rows.fresher.dupe.length + " duplicate, "
  + rows.fresher.mis.length + " mislabelled, " + rows.fresher.noRule + " without a rule");
rows.fresher.noop.concat(rows.fresher.dupe, rows.fresher.mis).slice(0, 6)
  .forEach(x=> console.log("       " + x));
ck("the replay wrote enough rows for that to mean something", rows.fresher.n >= 10,
   String(rows.fresher.n));
ck("not one of them is a no-op", rows.fresher.noop.length === 0,
   rows.fresher.noop.join(" | ") || "none");
ck("not one is a duplicate", rows.fresher.dupe.length === 0,
   rows.fresher.dupe.join(" | ") || "none");
ck("not one is mislabelled", rows.fresher.mis.length === 0,
   rows.fresher.mis.join(" | ") || "none");
ck("and every one names its rule", rows.fresher.noRule === 0, String(rows.fresher.noRule));
/* The no-op and duplicate guards are refusals at the door, so the historic rows that
   predate them are still in the file — what has to hold is that writing them again now
   is refused. */
const guard = await p.evaluate(()=>{
  const before = S.planLog.length;
  logPlanChange("weight", "pullA", "Cable Reverse Rear Delt Fly", ["145 lb → 145 lb"], {});
  const afterNoop = S.planLog.length;
  logPlanChange("weight", "pullA", "Cable Reverse Rear Delt Fly", ["145 lb → 150 lb"], {});
  const afterOne = S.planLog.length;
  logPlanChange("weight", "pullA", "Cable Reverse Rear Delt Fly", ["145 lb → 150 lb"], {});
  const afterDupe = S.planLog.length;
  return {before, afterNoop, afterOne, afterDupe};
});
ck("a no-op written today is refused", guard.afterNoop === guard.before,
   guard.before + " → " + guard.afterNoop);
ck("a real change is kept", guard.afterOne === guard.before + 1,
   guard.before + " → " + guard.afterOne);
ck("and the same row again is refused", guard.afterDupe === guard.afterOne,
   guard.afterOne + " → " + guard.afterDupe);

console.log("\n7 - AND THE APP STILL DRAWS THE WHOLE THING");
/* A replay that leaves the app unable to render it is not a passing replay. */
const drew = await p.evaluate(()=>{
  const out = {};
  ["today","workout","history","body","program","research"].forEach(t=>{
    try{ TAB = t; render(); out[t] = (document.getElementById("app").innerText || "").length; }
    catch(e){ out[t] = "ERR " + e.message; }
  });
  try{ out.report = buildReportInner().length; }catch(e){ out.report = "ERR " + e.message; }
  try{ out.csv = planHistoryCSV(true).split("\n").length; }catch(e){ out.csv = "ERR " + e.message; }
  return out;
});
console.log("    " + JSON.stringify(drew));
Object.keys(drew).forEach(k=> ck("  " + k + " renders",
  typeof drew[k] === "number" && drew[k] > 20, String(drew[k])));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
