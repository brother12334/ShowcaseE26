import { chromium, APP_URL } from './_e26.mjs';
/* P2-11 — A DEFAULT IS NOT AN ANSWER.

   From the Nov 15 2026 audit: Energy reads 6/10 in 26 of 39 sessions. Six is the middle
   option, "OK", and a rating that is pre-selected and then saved untouched is not a
   rating — it is the app's own guess being read back to it as evidence. It matters
   because recoveryMod() lowers what you can recover from when energy averages 4 or less
   and raises it at 8 or more: a column of untouched sixes quietly anchors the average.

   The current build does not pre-fill any of them: energy is tap-only and cannot be
   walked past, feel toggles back to nothing, soreness is per-muscle and recorded only
   where it was asked. That is the behaviour this spec exists to KEEP. A pre-selected
   middle option is a one-line change to make and nobody would notice it had happened,
   so it is checked rather than remembered. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false});
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("1 - NO RATING STARTS WITH AN ANSWER IN IT");
const fresh = await p.evaluate(()=>{
  S.checkins = {}; S.sore = {}; S.dayFlags = {}; S.active = null; save();
  const wid = ROTATION[0];
  startWorkout(wid);
  openPreflight(wid);
  const r = {energy: PF.energy, sore: Object.keys(PF.sore).length,
             steps: PF.steps.slice(), mins: PF.mins};
  pfClose(); PF = null;
  return r;
});
console.log("   ", JSON.stringify(fresh));
ck("energy opens with nothing chosen", fresh.energy === null, String(fresh.energy));
ck("so does soreness", fresh.sore === 0, String(fresh.sore));
ck("and the energy question is actually asked", fresh.steps.indexOf("energy") > -1,
   fresh.steps.join(","));

console.log("\n2 - AND THE ONE WITH NO DEFAULT CANNOT BE WALKED PAST");
const gate = await p.evaluate(async ()=>{
  const wid = ROTATION[0];
  S.checkins = {}; S.active = null; save();
  startWorkout(wid);
  openPreflight(wid);
  PF.step = "energy"; pfDraw();
  const btn = document.getElementById("pfGo");
  const shut = !!(btn && btn.disabled);
  /* Answer it. The redraw that opens the way on is deferred a tick, so this waits for
     it rather than reading the markup the tap was made against. */
  const opt = document.querySelector('[data-pfen="6"]');
  if(opt) opt.click();
  await new Promise(r=> setTimeout(r, 30));
  const after = document.getElementById("pfGo");
  const stored = ((S.checkins[todayStr()] || {}).energy);
  const r = {shut, open: !!(after && !after.disabled), chosen: PF.energy, stored};
  pfClose(); PF = null;
  return r;
});
console.log("   ", JSON.stringify(gate));
ck("the way on is shut until it is answered", gate.shut, String(gate.shut));
ck("a tap opens it", gate.open, String(gate.open));
ck("and the tap is what writes the record", gate.stored === "6", String(gate.stored));

console.log("\n3 - NOTHING IS WRITTEN BY WALKING THROUGH THE FLOW");
const walked = await p.evaluate(()=>{
  const wid = ROTATION[0];
  S.checkins = {}; S.sore = {}; S.dayFlags = {}; S.active = null; save();
  startWorkout(wid);
  openPreflight(wid);
  /* Every step drawn, nothing tapped, and the flow finished. */
  PF.steps.forEach(s=>{ PF.step = s; try{ pfDraw(); }catch(e){} });
  PF.step = "ready"; pfFinish();
  return {ci: JSON.stringify(S.checkins), sore: JSON.stringify(S.sore),
          flags: JSON.stringify(S.dayFlags)};
});
console.log("   ", JSON.stringify(walked));
ck("no energy on the record", !/energy/.test(walked.ci), walked.ci);
ck("no soreness either", walked.sore === "{}", walked.sore);
ck("and no day flags", walked.flags === "{}" || !/true/.test(walked.flags), walked.flags);

console.log("\n4 - THE SESSION RATING IS NOTHING UNTIL IT IS SOMETHING, AND NOTHING AGAIN");
const feel = await p.evaluate(()=>{
  const wid = ROTATION[0];
  S.active = null; save(); startWorkout(wid); PF = null; TAB = "workout"; save();
  const before = S.active.feel === undefined ? "undefined" : String(S.active.feel);
  render();
  const b3 = document.querySelector('[data-feel="3"]');
  if(b3) b3.click();
  const after = S.active.feel;
  render();
  const again = document.querySelector('[data-feel="3"]');
  if(again) again.click();                       // the same face again means "never mind"
  const off = S.active.feel;
  /* And what a finished session carries when it was never rated. */
  S.active.feel = null;
  const saved = {feel: (S.active.feel || null)};
  return {before, after, off, saved};
});
console.log("   ", JSON.stringify(feel));
ck("a fresh session has no rating", feel.before === "undefined" || feel.before === "null",
   feel.before);
ck("a tap sets it", feel.after === 3, String(feel.after));
ck("the same tap clears it rather than leaving a number behind",
   feel.off === null, String(feel.off));

console.log("\n5 - AND A SORENESS ANSWER IS ONLY RECORDED WHERE IT WAS ASKED");
const sore = await p.evaluate(()=>{
  const wid = ROTATION[0];
  S.sore = {}; S.active = null; save();
  startWorkout(wid);
  openPreflight(wid);
  const list = PF.soreList.slice();
  if(!list.length){ pfClose(); PF = null; return {skip: true}; }
  PF.step = "sore"; pfDraw();
  const g = list[0];
  const btn = document.querySelector('[data-pfsore="' + g + ':2"]');
  if(btn) btn.click();
  const d = todayStr();
  const rec = (S.sore || {})[d] || {};
  const r = {asked: g, recorded: Object.keys(rec), value: rec[g],
             others: list.slice(1).filter(x=> rec[x] != null)};
  pfClose(); PF = null;
  return r;
});
console.log("   ", JSON.stringify(sore));
if(sore.skip){ console.log("     (no muscles due a soreness question on a fresh log)"); }
else {
  ck("the muscle you answered is recorded", sore.value === 2, String(sore.value));
  ck("and none of the others are", sore.others.length === 0, sore.others.join(","));
}

console.log("\n6 - THE MIDDLE OPTION IS NOT MARKED AS CHOSEN BEFORE YOU CHOOSE IT");
/* The one-line regression this spec exists to catch: `on` painted onto a rating option
   with nothing behind it reads as an answer and is one tap from becoming one. */
const paint = await p.evaluate(()=>{
  const wid = ROTATION[0];
  S.checkins = {}; S.active = null; save();
  startWorkout(wid);
  openPreflight(wid);
  PF.step = "energy"; pfDraw();
  const opts = Array.from(document.querySelectorAll(".pfl-opt"));
  const r = {n: opts.length, on: opts.filter(x=> x.classList.contains("on")).length};
  pfClose(); PF = null;
  return r;
});
console.log("   ", JSON.stringify(paint));
ck("all five options are offered", paint.n === 5, String(paint.n));
ck("and none of them is lit", paint.on === 0, String(paint.on));

console.log("\n7 - WHAT THE 26 SIXES ALREADY ON FILE ACTUALLY DO");
/* Measured rather than assumed, because "they are harmless" is the kind of claim that is
   true in one arrangement and false in another, and the difference decides whether there
   is anything left to fix for data already logged. */
const reach = await p.evaluate(()=>{
  const mk = vals=>{
    S.checkins = {};
    vals.forEach((v, i)=>{
      const d = dayStr(Date.now() - i * 86400000);
      S.checkins[d] = {energy: String(v)};
    });
    save();
    const r = recoveryModifier();
    return r ? {mod: r.mod, why: r.why.filter(x=> /energy/.test(x))} : null;
  };
  /* recoveryModifier() reads the last 14 days, so the audited ratio is kept rather than
     its raw count: two thirds untouched sixes to one third genuine lows. */
  const sixes = [6,6,6,6,6,6,6,6,6];
  const lows = [2,2,4,2,4];
  return {only: mk(sixes), lowsOnly: mk(lows), mixed: mk(lows.concat(sixes))};
});
console.log("     26 sixes alone        :", JSON.stringify(reach.only));
console.log("     13 genuine lows alone :", JSON.stringify(reach.lowsOnly));
console.log("     the two together      :", JSON.stringify(reach.mixed));
ck("a column of sixes on its own moves nothing",
   reach.only && !reach.only.why.length, JSON.stringify(reach.only));
ck("genuine lows on their own are heard",
   reach.lowsOnly && reach.lowsOnly.why.length === 1, JSON.stringify(reach.lowsOnly));
/* NOT asserted as correct: this is the exposure being written down. Sixes padding an
   otherwise-low average lift it over the threshold and the low goes unheard. Nothing new
   can be an untouched six after the checks above, and nothing can tell which of the
   historic ones were real, so this is recorded rather than repaired. */
console.log("     \u2192 sixes mixed with real lows " +
  ((reach.mixed && reach.mixed.why.length) ? "still leave the low audible"
                                           : "lift the average over the threshold and the low goes unheard"));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
