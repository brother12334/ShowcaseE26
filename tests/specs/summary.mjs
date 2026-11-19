import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE COPIED SUMMARY MUST AGREE WITH THE WORKOUT SCREEN, SLOT BY SLOT.

   The summary is what somebody writes a patch against. If it says a slot is 3 sets and the
   session prescribes 4, a patch written from it is written against a plan that does not
   exist, and the preview will cheerfully confirm a change to the wrong number.

   This was not hypothetical. Three slots on the fixture prescribe one more set than the
   line says - the extra set a live balance check gives the side that is behind - and the
   summary said 3 and stopped: right about the plan, silent about the workout. The summary
   now states the session's own figure, and this spec is what keeps the two together.

   Every slot on every day, through startWorkout() rather than through a second reading of
   the plan: the question is not "does the summary match the plan", which is trivially
   true because it is printed from it, but "does it match what you will be asked to do". */
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

const read = await p.evaluate(fx=>{
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
  const text = patchPlanSummary();
  /* One line per slot, parsed back out of the text the person actually pastes - not out
     of the structure that built it. A summary that is right in memory and wrong on the
     clipboard is wrong. */
  const lines = {};
  text.split("\n").forEach(l=>{
    const m = l.match(/^\s{4}(\w+#\d+)\s{2}(.+?)\s{3}(.+)$/);
    if(m) lines[m[1]] = {name: m[2], rest: m[3], raw: l.trim()};
  });
  const rows = [];
  DAYS.forEach(w=>{
    S.active = null;
    try{ startWorkout(w); }catch(e){ return; }
    (S.program[w] || []).forEach((e, i)=>{
      if(!e || !e.name) return;
      const id = w + "#" + (i + 1);
      const en = (S.active.entries || []).find(x=> x && nrm(x.name) === nrm(e.name));
      const line = lines[id];
      if(!en || !line){ rows.push({id, name: e.name, missing: !en ? "session" : "line"}); return; }
      /* What the SESSION asks for. */
      const sessSets = (en.sets || []).length;
      const sessLoad = (function(){ try{ const v = prescribedLoadFor(en); return v == null ? null : v; }
                                    catch(err){ return "err"; } })();
      /* What the LINE says, read back out of its own words. */
      /* Stopping at the comma, not at whitespace: the rep range is followed by ", RPE 7-9"
         and a greedy \S+ swallowed the comma, so every slot read as a mismatch of "8-12,"
         against "8-12". The spec's own bug, and it found it by failing on all 38 slots at
         once, which is what a parse bug looks like next to a real one. */
      const mSets = line.rest.match(/^(\d+) x ([^,\s]+)/);
      const said = mSets ? parseInt(mSets[1], 10) : null;
      const saidReps = mSets ? mSets[2] : null;
      const mIn = line.rest.match(/so (\d+) in the session/);
      const saysSession = mIn ? parseInt(mIn[1], 10) : said;
      const mLoad = line.rest.match(/(?:^|, )(-?[\d.]+) lb/);
      const saidLoad = mLoad ? parseFloat(mLoad[1]) : (/no load set/.test(line.rest) ? null : "none");
      rows.push({id, name: e.name, said, saidReps, saysSession, saidLoad,
                 sessSets, sessReps: String(en.reps), sessLoad,
                 setsOk: saysSession === sessSets,
                 repsOk: saidReps === String(en.reps),
                 loadOk: (saidLoad == null && sessLoad == null)
                      || (typeof saidLoad === "number" && typeof sessLoad === "number"
                          && Math.abs(saidLoad - sessLoad) < 0.01)});
    });
    S.active = null;
  });
  return {rows, days: DAYS.length, text};
}, FX);

console.log("1 - EVERY SLOT, AGAINST THE SESSION IT BUILDS");
{
  const miss = read.rows.filter(r=> r.missing);
  miss.forEach(r=> console.log("    MISSING " + r.id + " " + r.name + " (" + r.missing + ")"));
  ck("every slot in the plan has a line in the summary and a row in the session",
     miss.length === 0, miss.map(r=> r.id).join(", ") || read.rows.length + " slots across " + read.days + " days");
  const setsBad = read.rows.filter(r=> !r.missing && !r.setsOk);
  setsBad.forEach(r=> console.log("    SETS  " + r.id + " " + r.name
    + ": summary says " + r.saysSession + ", session builds " + r.sessSets));
  ck("the sets the summary states are the sets the session builds",
     setsBad.length === 0, setsBad.map(r=> r.id).join(", ") || "all match");
  const repsBad = read.rows.filter(r=> !r.missing && !r.repsOk);
  repsBad.forEach(r=> console.log("    REPS  " + r.id + " " + r.name
    + ": summary " + r.saidReps + ", session " + r.sessReps));
  ck("so are the rep ranges", repsBad.length === 0,
     repsBad.map(r=> r.id).join(", ") || "all match");
  const loadBad = read.rows.filter(r=> !r.missing && !r.loadOk);
  loadBad.forEach(r=> console.log("    LOAD  " + r.id + " " + r.name
    + ": summary " + r.saidLoad + ", session " + r.sessLoad));
  ck("and the loads", loadBad.length === 0,
     loadBad.map(r=> r.id).join(", ") || "all match");
}

console.log("\n2 - THE SLOTS WHERE THE TWO LEGITIMATELY DIFFER SAY SO");
{
  const extra = read.rows.filter(r=> !r.missing && r.said !== r.sessSets);
  extra.forEach(r=> console.log("    " + r.id + " " + r.name + ": line " + r.said
    + ", session " + r.sessSets));
  ck("a slot whose session differs from its line is explained in the line",
     extra.every(r=> /\+1 set for the weaker side/.test(
       (read.text.split("\n").find(l=> l.indexOf(r.id) > -1) || ""))),
     extra.length + " such slots");
  /* THE CONTROL THAT MUST FIRE: the difference is real on this fixture, so a spec that
     found none would be asserting nothing. */
  ck("CONTROL: and there is at least one, so this is not vacuous",
     extra.length > 0, extra.map(r=> r.id).join(", "));
}

console.log("\n3 - THE OPENING SIDE THE SUMMARY STATES IS THE ONE THE SESSION USES");
{
  const r = await p.evaluate(()=>{
    const out = [];
    DAYS.forEach(w=>{
      S.active = null;
      try{ startWorkout(w); }catch(e){ return; }
      (S.program[w] || []).forEach((e, i)=>{
        if(!e || !e.name || !entryPerSideWanted(e)) return;
        const en = (S.active.entries || []).find(x=> x && nrm(x.name) === nrm(e.name));
        if(!en) return;
        const ss = sideSets(en);
        out.push({id: w + "#" + (i + 1), name: e.name, said: openingSideFor(e),
                  built: en.startSide || "L", first: (ss[0] || {}).side || null});
      });
      S.active = null;
    });
    return out;
  });
  r.forEach(x=> console.log("    " + x.id.padEnd(9) + x.name.padEnd(32)
    + " says " + x.said + ", builds " + x.built + ", first side " + x.first));
  ck("every per-side slot opens on the side the rule names",
     r.every(x=> x.said === x.built && x.said === x.first),
     r.filter(x=> !(x.said === x.built && x.said === x.first)).map(x=> x.id).join(", ") || r.length + " slots");
  /* The rule itself, exercised where the fixture cannot: on this export the weaker side
     happens to BE the left on every live check, so the default and the rule agree and a
     passing test would prove nothing about the rule. */
  const forced = await p.evaluate(()=>{
    const e = (S.program.pullB || []).find(x=> /Preacher/i.test(x.name));
    const real = window.sideStats;
    window.sideStats = ()=> ({ok: true, closed: false, weaker: "R", L: 10, R: 8});
    const weakWins = openingSideFor(e);
    S.active = null; startWorkout("pullB");
    const en = (S.active.entries || []).find(x=> /Preacher/i.test(x.name));
    const order = sideSets(en).map(x=> x.side).join(",");
    S.active = null;
    e.startSide = "L";
    const overrideWins = openingSideFor(e);
    delete e.startSide;
    window.sideStats = real;
    return {weakWins, order, overrideWins, dflt: openingSideFor(e)};
  });
  ck("CONTROL: with the weaker side on the right, the pair opens on the right",
     forced.weakWins === "R" && /^R,L/.test(forced.order), forced.weakWins + " " + forced.order);
  ck("CONTROL: and the slot's own choice still beats the weaker side",
     forced.overrideWins === "L", forced.overrideWins);
  ck("CONTROL: with neither, it is the left", forced.dflt === "L", forced.dflt);
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
