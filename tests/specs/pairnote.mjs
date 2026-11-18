import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* ITEM 14 — THE NOTE THAT DESCRIBED THE APP AS IT WAS BEFORE P1-7.

   "alternate L/R each set" is the pre-pair instruction: set 1 left, set 2 right. Since
   P1-7 a set of a one-limb movement IS a pair, so the sentence has been untrue for every
   one-limb line in every plan since. A person reading their own plan was out by a factor
   of two on exactly the movements where the app changed what a set means.

   Only the sentence changes. The set counts are a training decision and belong to the
   person: 4 sets of a split squat is 4 PER LEG before and after. And only THIS APP'S OWN
   EXACT SENTENCE is rewritten — a note somebody typed and a note an imported document
   supplied are text the app did not write, and are left exactly as they are. */
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
await p.evaluate(()=>{
  window.boot = (fx, tweak)=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} hideModal();
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    ['preflight','aiFull'].forEach(id=>{ const el=document.getElementById(id); if(el) el.remove(); });
    try{PF=null}catch(e){}
    /* Every key deleted first. Merging a fixture into an S that has already migrated
       leaves the one-time flags set, and the migration under test never runs - which is
       exactly how the first probe of this change reported that nothing had happened. */
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true;
    if(tweak) tweak(S);
    migrate(); try{ applySplit(); }catch(e){}
    try{ SEEDS_RUN = false; }catch(e){}
    render(); save();
  };
  window.oneLimbLines = ()=>{
    const out = [];
    Object.keys(S.program).forEach(w=>{
      (S.program[w] || []).forEach(e=>{
        if(!e || !e.name || !entryPerSideWanted(e)) return;
        out.push({day: dayName(w), name: e.name, sets: e.sets, note: String(e.note || ""),
                  sideMode: e.sideMode || null});
      });
    });
    return out;
  };
});

console.log("1 - A SET OF A ONE-LIMB MOVEMENT REALLY IS A PAIR, WHICH IS WHY THE NOTE WAS WRONG");
{
  const r = await p.evaluate(fx=>{
    boot(fx);
    const wid = Object.keys(S.program).find(w=>
      (S.program[w] || []).some(e=> e && entryPerSideWanted(e)));
    const planned = (S.program[wid] || []).find(e=> e && entryPerSideWanted(e));
    S.active = null;
    startWorkout(wid);
    const en = (S.active.entries || []).find(e=> e && e.name === planned.name);
    const out = {name: planned.name, plannedSets: planned.sets,
                 built: (en.sets || []).length, sides: sideSets(en).length,
                 labels: (en.sets || []).map(s=> s.side || "-").join(",")};
    S.active = null;
    return out;
  }, FX);
  console.log("    " + r.name + ": " + r.plannedSets + " planned -> " + r.built
            + " sets -> " + r.sides + " side-sets  [" + r.labels + "]");
  ck("the planned sets are built one for one", r.built === r.plannedSets, r.built + " of " + r.plannedSets);
  ck("and each one carries both sides", r.sides === r.plannedSets * 2, r.sides + " side-sets");
  ck("CONTROL: no set is stamped L or R, which is what the old note promised",
     !/[LR]/.test(r.labels), r.labels);
}

console.log("\n2 - SO THE APP'S OWN SENTENCE IS REWRITTEN, AND ONLY THAT");
{
  const r = await p.evaluate(fx=> { boot(fx); return {lines: oneLimbLines(), flag: !!S.fixPairNoteV1}; }, FX);
  r.lines.forEach(l=> console.log("    " + l.day.padEnd(7) + l.name.padEnd(32) + " sets " + l.sets + " | " + l.note));
  ck("the one-time rewrite ran", r.flag, String(r.flag));
  ck("no line still says alternate L/R",
     !r.lines.some(l=> /alternate\s+l\s*\/\s*r/i.test(l.note)),
     r.lines.filter(l=> /alternate/i.test(l.note)).map(l=> l.name).join(", ") || "none");
  ck("every one-limb line carries the new sentence",
     r.lines.every(l=> /both (arms|legs|sides) in each set/.test(l.note)),
     r.lines.filter(l=> !/both (arms|legs|sides) in each set/.test(l.note)).map(l=> l.name).join(", ") || "all of them");
  ck("a leg movement is told it is a leg", r.lines.some(l=> /Split Squat/.test(l.name)
     && /single leg, both legs in each set/.test(l.note)),
     (r.lines.find(l=> /Split Squat/.test(l.name)) || {}).note);
  /* THE WHOLE POINT OF THE SUBSTRING SWAP. */
  ck("CONTROL: the user's own words are still in front of it",
     r.lines.some(l=> /^No preacher bench here: set the adjustable bench to about 75 degrees, stand behind it, drape the upper arm over the top pad · /.test(l.note)),
     (r.lines.find(l=> /preacher bench/i.test(l.note)) || {}).note);
  ck("and the set counts are untouched",
     (r.lines.find(l=> /Split Squat/.test(l.name)) || {}).sets === 4,
     r.lines.map(l=> l.name.split(" ").pop() + ":" + l.sets).join(" "));
}

console.log("\n3 - WHAT IT MUST NOT TOUCH");
{
  const r = await p.evaluate(fx=>{
    boot(fx, st=>{
      /* A note the person typed with those words in it, and a note an imported document
         supplied. Neither is this app's sentence; neither may be rewritten. */
      st.program.pullB.push({name: "Single-Arm Landmine Press", sets: 3, reps: "8-12",
        note: "coach says alternate L/R each set, no rest between"});
      st.program.pullB.push({name: "Single-Arm Cable Row", sets: 3, reps: "8-12",
        sideMode: "perSet", note: "alternate arms every rep, rest after both arms"});
    });
    const find = n=> (S.program.pullB || []).find(e=> e && e.name === n) || {};
    return {typed: find("Single-Arm Landmine Press").note,
            imported: find("Single-Arm Cable Row").note};
  }, FX);
  ck("CONTROL: a sentence the person typed is left word for word",
     r.typed === "coach says alternate L/R each set, no rest between", r.typed);
  ck("CONTROL: and a note from an imported document is left alone",
     r.imported === "alternate arms every rep, rest after both arms", r.imported);
}

console.log("\n4 - AND THE NEXT LOAD DOES NOT PUT THE OLD SENTENCE BACK");
{
  /* THE TRAP THIS NEARLY SHIPPED WITH. The stamper skips a line that already carries a
     side note, and it recognised the OLD wording only - so the load after this one would
     have appended "alternate L/R each set" to a line this version had just corrected. */
  const r = await p.evaluate(fx=>{
    boot(fx);
    const first = oneLimbLines();
    /* A second migrate(), as a reload performs it, with the one-time flag already set. */
    migrate(); render(); save();
    const second = oneLimbLines();
    return {first: first.map(l=> l.note), second: second.map(l=> l.note),
            stampGuard: hasSideNote("single arm, both arms in each set"),
            legacyGuard: hasSideNote("single arm, alternate L/R each set"),
            neither: hasSideNote("just my own note")};
  }, FX);
  ck("a second load changes nothing",
     JSON.stringify(r.first) === JSON.stringify(r.second),
     r.second.filter((n,i)=> n !== r.first[i]).join(" | ") || "identical");
  ck("the stamper recognises the new wording as a side note", r.stampGuard, String(r.stampGuard));
  ck("and still recognises the old one", r.legacyGuard, String(r.legacyGuard));
  ck("CONTROL: and does not see one where there is none", !r.neither, String(r.neither));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
