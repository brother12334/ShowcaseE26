import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* P1-7 — "EVERYTHING READS THROUGH THE ADAPTER" IS A TEST, NOT A CONVENTION.

   sideSets() exists so that a paired set and a legacy one-side-per-set log are the same
   thing to every rule. That only holds while nothing reads around it, and the cost of a
   reader that does is not a wrong number — it is a BLIND one. A paired set carries no
   `reps` of its own; the sides do. So a reader that filters raw sets on isWorkingSet
   sees an entry with nothing in it and says so confidently.

   That was not hypothetical. Before this spec: bestOf() returned {w:0, reps:0} for a
   paired entry, so updateStalls() compared nothing against nothing, found no
   improvement, and advanced a stall count on a session that had gone perfectly well.
   Three of those and the stall protocol would have cut a set. atTopLoadSets() returned
   null and threw in its callers; progressionFor() produced no verdict at all, so a
   paired movement could never earn a load increase; bestEverFor() reported no records.

   Section 1 is a runtime check that each reader can see a pair. Section 2 is a static
   one: every direct use of setSide(), sideForSet() or `st.sides` outside the adapter has
   to carry a marker saying why, so that adding a new one is a visible decision rather
   than an accident. */
const SRC = readFileSync(appFile('index.html'), 'utf8');
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok   ":"  BROKEN ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
const ev=(fn,a)=>p.evaluate(fn,a);

console.log("1 - EVERY READER SEES A PAIRED SET");
{
  const r = await ev(()=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} hideModal();
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
    S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
    S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:true});
    S.splitId=DEFAULT_SPLIT; applySplit(); S.active=null;
    const DAY=86400e3, now=Date.now(), wid=DAYS[0];
    /* Three pairs a session. The first is 10 reps a side, the second 12 at the same
       load: the top of an 8-12 range at RPE 8 on both sides, which has plainly earned
       more weight, and an improvement on the session before it. */
    const mk=(id,at,reps)=>({id, workoutId:wid, date:dayStr(at), startedAt:at,
      finishedAt:at+3600e3, feel:4,
      entries:[{name:"Preacher Curl", reps:"8-12", rpe:"7-9", perSide:true, startSide:"L",
        sets:[0,1,2].map(()=>({sides:{
          L:{weight:"25",reps:String(reps),rpe:"8",done:true},
          R:{weight:"25",reps:String(reps),rpe:"8",done:true}}, rest:150}))}]});
    S.sessions=[mk("p0",now-5*DAY,10), mk("p1",now-DAY,12)];
    S.program[wid]=[{name:"Preacher Curl", sets:3, reps:"8-12", weight:25, rpe:"7-9",
                     rest:[150,210], perSide:true}];
    S.stalls={}; S.flags=[]; S.planLog=[]; S.deload=null; S.dayFlags={}; S.joint={};
    save();
    const sess=S.sessions[1], en=sess.entries[0];
    const out={};
    const best = bestOf(en, sess.date);
    out.bestOf = {w: best.w, reps: best.reps};
    const t = atTopLoadSets(en);
    out.atTop = t ? {all: t.all.length, at: t.at.length, top: t.top && t.top.w} : null;
    out.prog = (progressionFor(sess, en) || {}).kind || null;
    updateStalls(sess);
    out.stall = ((S.stalls || {})["preacher curl"] || {}).n;
    const be = bestEverFor("Preacher Curl");
    out.bestEver = {maxW: be.maxW, reps: be.repsAtMaxW};
    const mm = musclesFor("Preacher Curl") || {};
    const g = Object.keys(mm).find(k=> mm[k] >= 1);
    out.volume = Math.round((windowStats(now-7*DAY, now+DAY)[g] || {}).sets * 100) / 100;
    out.volumeOneSession = Math.round((windowStats(now-2*DAY, now+DAY)[g] || {}).sets * 100) / 100;
    out.sideSetsPerSession = sideSetsWorking(en).length;
    return out;
  });
  console.log("    " + JSON.stringify(r));
  ck("bestOf reads the pair's loads", r.bestOf.w === 25 && r.bestOf.reps === 12,
     JSON.stringify(r.bestOf));
  ck("atTopLoadSets finds the working sets", !!(r.atTop && r.atTop.all === 6),
     JSON.stringify(r.atTop));
  ck("progressionFor reaches a verdict", r.prog != null, String(r.prog));
  ck("and it is a raise, since both sides cleared the range at target RPE",
     r.prog === "up", String(r.prog));
  ck("a session that improved does NOT advance the stall count", !r.stall, String(r.stall));
  ck("bestEverFor records the lift", r.bestEver.maxW === 25, JSON.stringify(r.bestEver));
  /* THE ARITHMETIC, STATED IN FULL, because "half-sets" is easy to say and easy to
     misread. Three pairs a session is SIX side-sets a session, each worth half: three
     whole sets per session, six across the two sessions in this fixture. Counting each
     side as a whole set — which is what the app did — gives twelve. */
  ck("a session is six side-sets", r.sideSetsPerSession === 6, String(r.sideSetsPerSession));
  ck("which is three whole sets for the muscle", r.volumeOneSession === 3,
     String(r.volumeOneSession));
  ck("and six across both sessions, not the twelve it used to be", r.volume === 6,
     String(r.volume));
}

console.log("\n2 - NOTHING READS AROUND THE ADAPTER WITHOUT SAYING SO");
{
  /* The adapter itself lives between these two markers. Everything else that touches a
     side directly must end its line with a `sides:` marker naming why — "display" for
     something that only draws a label, "write" for the one handler that edits a side by
     hand. A rule may not carry a marker at all: it goes through sideSets(). */
  /* Comments are stripped first, with newlines kept so line numbers still line up. A
     scan that reads prose finds every sentence that mentions setSide() and nothing
     useful. */
  const bare = (()=>{
    let out = "", i = 0, mode = 0;        // 0 code, 1 line comment, 2 block comment
    while(i < SRC.length){
      const two = SRC.substr(i, 2);
      if(mode === 0 && two === "//"){ mode = 1; out += "  "; i += 2; continue; }
      if(mode === 0 && two === "/*"){ mode = 2; out += "  "; i += 2; continue; }
      if(mode === 1 && SRC[i] === "\n"){ mode = 0; out += "\n"; i++; continue; }
      if(mode === 2 && two === "*/"){ mode = 0; out += "  "; i += 2; continue; }
      out += mode === 0 ? SRC[i] : (SRC[i] === "\n" ? "\n" : " ");
      i++;
    }
    return out;
  })();
  const lines = bare.split("\n");                 // code only, line numbers preserved
  const raw = SRC.split("\n");                   // for the markers, which are comments
  const open = raw.findIndex(l=> l.includes("SIDE-ADAPTER-BEGIN"));
  const close = raw.findIndex(l=> l.includes("SIDE-ADAPTER-END"));
  ck("the adapter region is marked", open > 0 && close > open, open + ".." + close);
  const offenders = [];
  lines.forEach((l, i)=>{
    if(i >= open && i <= close) return;                  // inside the adapter
    if(!/setSide\(|sideForSet\(|\.sides\b/.test(l)) return;
    if(/function (setSide|sideForSet)\(/.test(l)) return;  // their own definitions
    if(/trainPrefs\(\)\.sides|prefs\.sides|p\.sides|a\.sides|ans\.sides|rec\.sides|d\.prefs/.test(l)) return;
    if(/\/\/\s*sides:(adapter|display|write|todo)\b/.test(raw[i] || "")) return;  // declared
    offenders.push((i + 1) + ": " + l.trim().slice(0, 96));
  });
  if(offenders.length) offenders.forEach(o=> console.log("    " + o));
  ck("every direct side read is inside the adapter or declares itself",
     offenders.length === 0, offenders.length + " undeclared");
}

console.log("\n3 - AND THE DECLARED EXCEPTIONS ARE WHAT THEY CLAIM TO BE");
{
  const raw = SRC.split("\n");
  const kinds = {};
  raw.forEach((l, i)=>{
    /* Only a trailing marker counts, so prose that happens to name one does not. */
    const m = l.match(/\/\/\s*sides:(adapter|display|write|todo)\b/);
    if(!m) return;
    (kinds[m[1]] = kinds[m[1]] || []).push((i + 1) + ": " + l.trim().slice(0, 78));
  });
  Object.keys(kinds).sort().forEach(k=>{
    console.log("    " + k + " \u00d7" + kinds[k].length);
    kinds[k].forEach(x=> console.log("      " + x));
  });
  ck("the two primitives are the only adapter-level reads",
     (kinds.adapter || []).length === 1, String((kinds.adapter || []).length));
  ck("display exceptions exist and are few",
     (kinds.display || []).length > 0 && (kinds.display || []).length <= 8,
     String((kinds.display || []).length));
  ck("the side-flip handler is the only hand-written side",
     (kinds.write || []).length === 3, String((kinds.write || []).length));
  /* The one reader still outside the adapter, named so it cannot be forgotten. When the
     report half of P1-7 restructures that table this drops to zero and so does the
     allowance. */
  ck("exactly one tracked gap remains: the report and CSV row numbering",
     (kinds.todo || []).length === 1
       && /setSide\(e, i\)/.test((kinds.todo || [])[0] || ""),
     JSON.stringify(kinds.todo || []));
}

console.log(errs.length ? ("\nPAGE ERRORS: "+errs.join(" | ")) : "\nno page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
