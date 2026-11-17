import { chromium, APP_URL } from './_e26.mjs';
/* P1-7 FOLLOW-UP - THE SIDE ON THE ROW IS THE ROW'S SIDE.

   Reported from a live session on Cable Lateral Raise, build 2026.11.17.6: the rows read

       set 1: L, L    set 2: R, R    set 3: L, L    set 4: R, R

   when a paired set is one L row and one R row under each number.

   setRowHTML() is handed the side it is rendering and uses it correctly for the inputs -
   each field carries data-sd with the right side, so the typed values went into the right
   place and the logged data was never wrong. But the L/R chip beside the set number is
   drawn by sideChip(en, si), which takes no side and recomputes one from the SET INDEX
   with setSide(). On a legacy entry - one side per set, alternating - that is exactly
   right. On a paired entry it labels both rows of the pair with the same letter and
   alternates it per set.

   sideall.mjs did not catch it because the line carries a `// sides:display` marker, and
   a chip IS display. The marker was accurate and the reasoning behind it was not: a side
   LABEL on a row is an assertion about which limb that row is for, and the only honest
   source for it is the row. A static scan cannot tell a label that agrees with the
   adapter from one that contradicts it, so this is a RENDER test instead. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2200}});
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId="ppl6"; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* Each rendered set row, in document order, as {num, chip, sd} - the number in its index
   cell, the letter on its chip, and the side its INPUTS write to. All three have to agree,
   which is the whole point: the first two are what you read and the third is where the
   reps go. */
/* THE LAYOUT CHANGED UNDER THIS SPEC, AND THE CLAIM DID NOT.

   A pair used to be two full set rows, so this counted rows. A pair is now ONE thing on
   the screen: a slim summary line when it is finished or waiting, and an open block with
   two short lines when it is the set you are on. Counting .set rows would now count only
   the open pair and report that seven of the eight sides had vanished.

   What the reported bug was about is untouched: every set number must show exactly one
   left and one right, in that order, and the label must agree with where the reps go. So
   the sides are collected per PAIR, from whichever form that pair is currently in, and
   the same assertions are made about them. */
const rowsOf = (name, sets, startSide)=> p.evaluate(a=>{
  const wid = "pushA";
  S.program[wid] = [{name: a.name, sets: a.sets, reps:"8-21", weight:25, uni:true}];
  S.active = null; save(); startWorkout(wid); PF = null; TAB = "workout";
  PAIR_OPEN = null; save();
  const en = S.active.entries[0];
  if(a.startSide) en.startSide = a.startSide;
  save(); render();
  const out = [];
  /* Closed pairs first, in document order, then the open one - collected together below
     by walking the card rather than by querying each kind separately, so the ORDER on the
     screen is what is reported. */
  document.querySelectorAll("#app .pair-sum, #app .pair-open").forEach(node=>{
    const open = node.classList.contains("pair-open");
    const num = ((node.querySelector(".pr-n") || {}).textContent || "").replace(/[^0-9]/g, "");
    if(open){
      node.querySelectorAll(".set.is-pairline").forEach(row=>{
        const chipEl = row.querySelector(".side-chip");
        const sd = Array.from(row.querySelectorAll("[data-sd]"))
          .map(x=> x.dataset.sd).filter(v=> v === "L" || v === "R");
        out.push({num, open: true, chip: chipEl ? chipEl.textContent.trim() : null,
                  sd: sd.length ? sd[0] : null, sdAllSame: sd.every(v=> v === sd[0])});
      });
    } else {
      /* A closed pair has no inputs, so there is no data-sd to agree with - the chip and
         the number beside it are the whole statement, and they are what is checked. */
      node.querySelectorAll(".pr-side").forEach(sideEl=>{
        const chipEl = sideEl.querySelector(".side-chip");
        out.push({num, open: false, chip: chipEl ? chipEl.textContent.trim() : null,
                  sd: null, sdAllSame: true});
      });
    }
  });
  return {rows: out, perSide: entryPerSide(en), startSide: en.startSide,
          openPairs: document.querySelectorAll("#app .pair-open").length,
          closedPairs: document.querySelectorAll("#app .pair-sum").length,
          adapter: sideSets(en).map(x=> (x.si + 1) + x.side)};
}, {name, sets, startSide});

console.log("1 - THE REPORTED CASE: CABLE LATERAL RAISE, 4 SETS");
const r = await rowsOf("Cable Lateral Raise", 4, "L");
console.log("    adapter says:", r.adapter.join(" "));
console.log("    rows render :", r.rows.map(x=> x.num + (x.chip || "-")).join(" "));
ck("the entry is paired", r.perSide === true, String(r.perSide));
ck("eight sides across four pairs", r.rows.length === 8, String(r.rows.length));
/* Exactly one pair is open - the set you are on - and the rest are one line each. That
   is the whole point of the layout, so it is pinned here rather than assumed. */
ck("one pair is open, three are closed",
   r.openPairs === 1 && r.closedPairs === 3, r.openPairs + " open, " + r.closedPairs + " closed");
/* The claim, stated as the user stated it. */
const bySet = {};
r.rows.forEach(x=>{ (bySet[x.num] = bySet[x.num] || []).push(x.chip); });
console.log("    by set     :", JSON.stringify(bySet));
ck("every set number has exactly two rows",
   Object.keys(bySet).every(k=> bySet[k].length === 2),
   JSON.stringify(Object.keys(bySet).map(k=> k + ":" + bySet[k].length)));
ck("one L and one R under each",
   Object.keys(bySet).every(k=> bySet[k].slice().sort().join("") === "LR"),
   JSON.stringify(bySet));
ck("left first, every time",
   Object.keys(bySet).every(k=> bySet[k][0] === "L"),
   JSON.stringify(Object.keys(bySet).map(k=> k + ":" + bySet[k][0])));

console.log("\n2 - AND THE LABEL AGREES WITH WHERE THE REPS GO");
/* The inputs were always right; this is what makes the chip the same answer. */
ck("every row's inputs write to one side only",
   r.rows.every(x=> x.sdAllSame), JSON.stringify(r.rows.map(x=> x.sd)));
/* Only the open pair has inputs to agree with; a closed one is a label and a number. */
ck("and in the open pair the chip names the side the inputs write to",
   r.rows.filter(x=> x.open).length === 2
   && r.rows.filter(x=> x.open).every(x=> x.chip === x.sd),
   r.rows.filter(x=> x.open).map(x=> (x.chip || "-") + "/" + (x.sd || "-")).join(" "));
ck("which is what the adapter says too, pair by pair and in order",
   r.rows.map(x=> x.num + x.chip).join(" ") === r.adapter.join(" "),
   r.rows.map(x=> x.num + x.chip).join(" ") + "  vs  " + r.adapter.join(" "));

console.log("\n3 - RIGHT-FIRST IS HONOURED, NOT HARDCODED");
const rr = await rowsOf("Cable Lateral Raise", 3, "R");
const bySetR = {};
rr.rows.forEach(x=>{ (bySetR[x.num] = bySetR[x.num] || []).push(x.chip); });
console.log("    by set     :", JSON.stringify(bySetR));
ck("still one of each under every number",
   Object.keys(bySetR).every(k=> bySetR[k].slice().sort().join("") === "LR"),
   JSON.stringify(bySetR));
ck("and the right leads where that is the setting",
   Object.keys(bySetR).every(k=> bySetR[k][0] === "R"),
   JSON.stringify(Object.keys(bySetR).map(k=> k + ":" + bySetR[k][0])));
ck("the chip still agrees with the inputs in the open pair",
   rr.rows.filter(x=> x.open).every(x=> x.chip === x.sd),
   rr.rows.filter(x=> x.open).map(x=> (x.chip || "-") + "/" + (x.sd || "-")).join(" "));

console.log("\n4 - A TWO-HANDED MOVEMENT HAS NO SIDES AT ALL");
const both = await p.evaluate(()=>{
  const wid = "pushA";
  S.program[wid] = [{name:"Barbell Bench Press", sets:3, reps:"6-10", weight:135}];
  S.active = null; save(); startWorkout(wid); PF = null; TAB = "workout"; save();
  render();
  const chips = document.querySelectorAll("#app .idx .side-chip").length;
  const rows = document.querySelectorAll("#app .set").length;
  return {chips, rows, perSide: entryPerSide(S.active.entries[0])};
});
console.log("   ", JSON.stringify(both));
ck("three rows for three sets", both.rows === 3, String(both.rows));
ck("and not a chip in sight", both.chips === 0, String(both.chips));

console.log("\n5 - THE LEGACY SHAPE STILL ALTERNATES BY SET");
/* One side per set is what the old log recorded and what the app still has to read. Here
   the per-set flip IS the right answer, and it must not be broken by the fix. */
const legacy = await p.evaluate(()=>{
  const wid = "pushA";
  S.program[wid] = [{name:"Cable Lateral Raise", sets:4, reps:"8-21", weight:25, uni:true}];
  S.active = null; save(); startWorkout(wid); PF = null; TAB = "workout"; save();
  const en = S.active.entries[0];
  /* Stripped back to the legacy shape: no `sides`, one side per set. */
  en.perSide = false;
  en.sets.forEach(st=>{ delete st.sides; });
  en.startSide = "L";
  save(); render();
  const out = [];
  document.querySelectorAll("#app .set").forEach(row=>{
    const ix = row.querySelector(".idx");
    if(!ix) return;
    const chip = ix.querySelector(".side-chip");
    out.push({num: (ix.textContent||"").replace(/[^0-9]/g,""),
              chip: chip ? chip.textContent.trim() : null});
  });
  /* Every set prints its own number in the legacy shape, one row apiece. */
  return {perSide: entryPerSide(en), rows: out};
});
console.log("   ", JSON.stringify(legacy));
ck("it is not a paired entry", legacy.perSide === false, String(legacy.perSide));
ck("four rows for four sets", legacy.rows.length === 4, String(legacy.rows.length));
ck("and the side alternates L R L R by set",
   legacy.rows.map(x=> x.chip).join("") === "LRLR",
   legacy.rows.map(x=> x.chip).join(""));

console.log("\n6 - THE LOGGED DATA WAS NEVER WRONG, AND THE RESIDUE IS CLEARED");
/* The reason nothing needs relabelling. The inputs always carried the right data-sd, so
   typed values went into the right side's object; and the adapter reads st.sides.L / .R
   and never consults st.side, the legacy per-set override. A chip tapped to "correct" a
   label wrote st.side onto a paired set, where it is inert - dead weight rather than
   corruption. It is stripped on load all the same, because a legacy-shape reader meeting
   it later would believe it. */
const integrity = await p.evaluate(()=>{
  const wid = "pushA";
  S.program[wid] = [{name:"Cable Lateral Raise", sets:2, reps:"8-21", weight:25, uni:true}];
  S.active = null; save(); startWorkout(wid); PF = null; TAB = "workout"; save();
  const en = S.active.entries[0];
  /* Logged the way the session was: L then R, both sides of each pair. */
  const put = (si, sd, reps)=>{ const t = sideTarget(en, si, sd);
    t.weight = "25"; t.reps = String(reps); t.rpe = "8"; t.done = true; };
  put(0, "L", 14); put(0, "R", 16);
  put(1, "L", 12); put(1, "R", 15);
  /* And a chip tapped twice, which is what writes the legacy override. */
  en.sets[0].side = "R";
  en.sets[1].side = "L";
  save();
  const before = sideSets(en).map(x=> (x.si+1) + x.side + ":" + x.reps);
  const strays = (en.sets || []).filter(st=> st && st.side).length;
  const cleaned = clearStraySides();
  const after = sideSets(en).map(x=> (x.si+1) + x.side + ":" + x.reps);
  return {before, after, strays, cleaned,
          straysNow: (en.sets || []).filter(st=> st && st.side).length};
});
console.log("    with the stray overrides:", integrity.before.join(" "));
console.log("    after clearing them     :", integrity.after.join(" "));
ck("the stray legacy overrides were there", integrity.strays === 2, String(integrity.strays));
ck("and the adapter ignored them throughout",
   integrity.before.join(" ") === "1L:14 1R:16 2L:12 2R:15",
   integrity.before.join(" "));
ck("every rep is still on the side it was performed on",
   integrity.after.join(" ") === "1L:14 1R:16 2L:12 2R:15",
   integrity.after.join(" "));
ck("the residue is cleared", integrity.straysNow === 0, String(integrity.straysNow));
ck("and the clear reports what it did", integrity.cleaned === 2, String(integrity.cleaned));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
