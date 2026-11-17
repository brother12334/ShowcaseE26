import { chromium, APP_URL } from './_e26.mjs';
/* A PAIR IS ONE SET, AND IT READS LIKE ONE.

   Reported: a one-limb movement took twice the height of an ordinary one, because every
   side got a full set row. Four sets became eight tall rows and the card scrolled
   forever.

   A pair is now one thing on the screen. Closed, it is a line of text - set number, load,
   both sides, a tick - with nothing to type into. Open, it is the set you are on: the
   pair's own line carrying the number, the load, the warm-up mark and ONE tick, and under
   it two short lines carrying only what a side has of its own.

   WHAT THIS SPEC IS FOR, BEYOND THE PICTURE. Three things could go wrong that a
   screenshot would not show:

     the saving could be fake - fewer rows but the same height, or a card that only looks
     shorter because something stopped rendering;
     the closed line could lose information - a warm-up mark, a load that differs between
     sides, reps that were never logged;
     the single tick could bank a half-logged pair, which is the one that corrupts data.
       The gate is reps AND effort on both sides, and the effort is not politeness: a pair
       logged without RPE drops out of the side comparison entirely, because matching the
       weaker side makes the rep counts equal by construction and the reserve is the only
       thing left that says anything about the gap.

   The two-handed movement in the same session is the control throughout: it must be
   untouched by all of this. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2600}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

const boot = (opts)=> p.evaluate(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{AI_IMP=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId="ppl6"; applySplit();
  const wid = ROTATION[0];
  S.program[wid] = [{name:"Cable Lateral Raise", sets:"4", reps:"8-21", weight:25, uni:true},
                    {name:"Barbell Bench Press", sets:"3", reps:"8", rpe:"8", weight:135}];
  S.active = null; save(); startWorkout(wid); PF = null; TAB = "workout"; PAIR_OPEN = null;
  const en = S.active.entries[0];
  en.startSide = "L";
  (a.fill || []).forEach((row, si)=>{
    ["L","R"].forEach(sd=>{
      if(!row[sd]) return;
      const t = sideTarget(en, si, sd);
      t.weight = row[sd].w; t.reps = row[sd].r; if(row[sd].e) t.rpe = row[sd].e;
      if(row[sd].done) t.done = true;
    });
  });
  if(a.warm != null) en.sets[a.warm].warmup = true;
  save(); render();
  const card = document.querySelector("#app .card");
  return {
    sums: document.querySelectorAll("#app .pair-sum").length,
    opens: document.querySelectorAll("#app .pair-open").length,
    pairRows: document.querySelectorAll("#app .set.is-pairline").length,
    plainRows: Array.from(document.querySelectorAll("#app .set")).filter(r=> !r.classList.contains("is-pairline")).length,
    cardH: card ? Math.round(card.getBoundingClientRect().height) : 0,
    sumText: Array.from(document.querySelectorAll("#app .pair-sum")).map(n=> n.textContent.replace(/\s+/g," ").trim()),
    ticks: document.querySelectorAll("#app .pair-chk").length,
    perSideTicks: document.querySelectorAll("#app .set.is-pairline .chk").length,
    scrollW: document.documentElement.scrollWidth,
    small: Array.from(document.querySelectorAll("#app .pair-sum, #app .pair-chk, #app .pr-tick, #app [data-pairopen]"))
      .map(el=> Math.round(el.getBoundingClientRect().height)).filter(h=> h > 0 && h < 44)
  };
}, opts || {});

console.log("\n1. a fresh exercise: one pair open, the rest one line each");
const d1 = await boot({});
ck("four pairs, one of them open", d1.opens === 1 && d1.sums === 3, d1.opens + "/" + d1.sums);
ck("the open one has two short lines", d1.pairRows === 2, d1.pairRows);
ck("and exactly one tick, for the pair", d1.ticks === 1, d1.ticks);
ck("no per-side ticks remain", d1.perSideTicks === 0, d1.perSideTicks);
ck("nothing under 44px tall", d1.small.length === 0, d1.small.join(","));
ck("and no horizontal scroll at 390", d1.scrollW === 390, d1.scrollW);

console.log("\n2. the saving is real, measured against the old layout");
/* The old layout is still reachable: two setRowHTML calls per pair is what the callers
   used to do. Rendering both and comparing is the only honest way to claim a saving. */
const d2 = await p.evaluate(()=>{
  const en = S.active.entries[0];
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:-9999px;top:0;width:358px";
  document.body.appendChild(host);
  const oldWay = setLabelsHTML() + en.sets.map((st, si)=>
    pairSidesOf(en, si).map((sd, k)=> setRowHTML(en, 0, si, null, k ? "" : (si+1), sd)).join("")).join("");
  host.innerHTML = `<div class="card">${oldWay}</div>`;
  const oldH = Math.round(host.querySelector(".card").getBoundingClientRect().height);
  const newWay = en.sets.map((st, si)=> pairBlockHTML(en, 0, si, null)).join("");
  host.innerHTML = `<div class="card">${newWay}</div>`;
  const newH = Math.round(host.querySelector(".card").getBoundingClientRect().height);
  host.remove();
  return {oldH, newH};
});
console.log("    old layout " + d2.oldH + "px, new " + d2.newH + "px");
ck("the new layout is genuinely shorter", d2.newH < d2.oldH * 0.75, d2.newH + " vs " + d2.oldH);
ck("and has not collapsed to nothing", d2.newH > 120, d2.newH);

console.log("\n3. a closed line keeps everything the rows said");
const d3 = await boot({fill:[
  {L:{w:"25",r:"15",e:"8",done:true}, R:{w:"25",r:"14",e:"9",done:true}},
  {L:{w:"30",r:"8", e:"10",done:true}, R:{w:"25",r:"9",e:"10",done:true}}
], warm:0});
console.log("    " + d3.sumText.join("\n    "));
ck("the finished pairs are lines", d3.sums >= 2, d3.sums);
ck("a shared load is printed once", /25\s*lb/i.test(d3.sumText[0]) && !/25.*25/.test(d3.sumText[0]),
   d3.sumText[0]);
ck("both sides and both efforts are on the line",
   /15/.test(d3.sumText[0]) && /@8/.test(d3.sumText[0]) && /14/.test(d3.sumText[0]) && /@9/.test(d3.sumText[0]),
   d3.sumText[0]);
ck("a warm-up still says so", /warm/i.test(d3.sumText[0]), d3.sumText[0]);
ck("and a load that differs between sides is shown as both",
   /30\s*\/\s*25/.test(d3.sumText[1]), d3.sumText[1]);

console.log("\n4. the single tick will not bank a half-logged pair");
const gate = (fill)=> p.evaluate(a=>{
  const en = S.active.entries[0];
  en.sets[0] = {};
  ["L","R"].forEach(sd=>{
    if(!a[sd]) return;
    const t = sideTarget(en, 0, sd);
    if(a[sd].r) t.reps = a[sd].r;
    if(a[sd].e) t.rpe = a[sd].e;
    t.weight = "25";
  });
  PAIR_OPEN = null; save(); render();
  const f = pairFacts(en, 0);
  const btn = document.querySelector('[data-pairdone="0:0"]');
  if(btn) btn.click();
  const after = pairFacts(en, 0);
  return {ready: f.ready, missing: f.missing, done: after.allDone,
          needLine: (document.querySelector(".pair-need") || {}).textContent || null};
}, fill);
const g1 = await gate({L:{r:"15",e:"8"}});
ck("left only: refused", !g1.ready && !g1.done, g1.missing.join(", "));
const g2 = await gate({L:{r:"15",e:"8"}, R:{r:"14"}});
ck("both sides but one effort missing: refused", !g2.ready && !g2.done, g2.missing.join(", "));
ck("and the screen says what is missing", /effort/i.test(g2.needLine || ""), g2.needLine);
const g3 = await gate({L:{r:"15",e:"8"}, R:{r:"14",e:"9"}});
ck("both sides complete: it banks, both sides at once", g3.ready && g3.done, g3.missing.join(","));

console.log("\n5. tapping a line opens it, and only one is ever open");
const d5 = await p.evaluate(()=>{
  PAIR_OPEN = null; render();
  const first = document.querySelectorAll(".pair-open").length;
  const line = document.querySelectorAll("[data-pairopen]");
  const target = Array.from(line).find(n=> n.classList.contains("pair-sum"));
  target.click();
  const afterOpen = document.querySelectorAll(".pair-open").length;
  const which = (document.querySelector(".pair-open .pr-n") || {}).textContent;
  const second = Array.from(document.querySelectorAll(".pair-sum")).pop();
  second.click();
  return {first, afterOpen, which, stillOne: document.querySelectorAll(".pair-open").length,
          nowWhich: (document.querySelector(".pair-open .pr-n") || {}).textContent,
          saved: JSON.stringify(S).indexOf("PAIR_OPEN") < 0};
});
ck("one was open to begin with", d5.first === 1, d5.first);
ck("tapping another still leaves exactly one open", d5.afterOpen === 1 && d5.stillOne === 1,
   d5.afterOpen + "/" + d5.stillOne);
ck("and it is the one tapped", d5.which !== d5.nowWhich, d5.which + " -> " + d5.nowWhich);
ck("which pair is open is not written into the saved state", d5.saved);

console.log("\n6. the two-handed movement is untouched (control)");
const d6 = await p.evaluate(()=>{
  const bench = S.active.entries[1];
  return {paired: entryPerSide(bench),
          rows: Array.from(document.querySelectorAll("#app .set"))
            .filter(r=> !r.classList.contains("is-pairline")
                     && r.querySelector('[data-e="1"]')).length,
          ticks: document.querySelectorAll('#app .set .chk[data-e="1"]').length,
          sums: document.querySelectorAll("#app .pair-sum [data-e='1']").length};
});
ck("it is not a paired entry", !d6.paired);
ck("it still draws one full row per set", d6.rows === 3, d6.rows);
ck("each with its own tick", d6.ticks === 3, d6.ticks);
ck("and none of it became a summary line", d6.sums === 0, d6.sums);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
