import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* P0-1 / P1-6 — EVERY PLAN LOOKUP EITHER NAMES ITS DAY OR SAYS WHY NOT.

   findProgramEntryWhere(name) walked DAYS in order and returned the FIRST day carrying
   the name. That is the right answer to "where is this exercise" and the wrong answer to
   "where is THIS one", and it is how a collapse logged on Push B cut Push A's load and a
   cut earned by the Legs B squat came off the Legs A squat. P0-1 threaded the day through
   the write paths and P1-6 through the progression reads, but the file holds about thirty
   call sites and the rest were converted by memory rather than by rule.

   The standing rule, from the user: a site that only DISPLAYS something can wait; a site
   that WRITES or PRESCRIBES a value must be day-scoped. This spec makes that enforceable.
   Every call must pass a day, or carry a marker:

     slot:display   it draws or narrates, and the first matching day is good enough
     slot:todo      it writes or prescribes and is NOT scoped yet, and is therefore a
                    tracked debt with a number attached

   The todo count is pinned. It can only go down by converting a site, and any new
   unmarked call fails the spec outright. That is the difference between a remaining
   problem and a forgotten one. */
const SRC = readFileSync(appFile('index.html'), 'utf8');
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok   ":"  BROKEN ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* Comments stripped, newlines kept, so prose that names the function is not an offender. */
const bare = (()=>{
  let out = "", i = 0, mode = 0;
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
const code = bare.split("\n");
const raw = SRC.split("\n");

/* Which enclosing function a line sits in, for a report somebody can act on. */
const fnAt = i => {
  for(let k = i; k >= 0; k--){
    const m = raw[k].match(/^function ([A-Za-z_$][\w$]*)/);
    if(m) return m[1];
  }
  return "(top level)";
};

console.log("1 - EVERY LOOKUP IS SCOPED, DECLARED DISPLAY, OR A TRACKED DEBT");
{
  const scoped = [], display = [], todo = [], undeclared = [];
  code.forEach((l, i)=>{
    const calls = l.match(/findProgramEntry(?:Where)?\s*\(/g);
    if(!calls) return;
    if(/^function findProgramEntry/.test(l)) return;        // their own definitions
    const marker = (raw[i].match(/\/\/\s*slot:(display|todo)\b/) || [])[1];
    /* A call that passes a second argument is scoped. Written loosely on purpose: the
       argument may be `wid`, `sess && sess.workoutId`, `f.workoutId` or `opts && opts.wid`,
       and what matters is that one is there at all. */
    const hasArg = /findProgramEntry(?:Where)?\s*\([^)]*,/.test(l)
                || /findProgramEntry(?:Where)?\s*\([^)]*&&[^)]*\)/.test(l);
    const row = (i + 1) + "  " + fnAt(i) + "  " + l.trim().slice(0, 74);
    if(hasArg) scoped.push(row);
    else if(marker === "display") display.push(row);
    else if(marker === "todo") todo.push(row);
    else undeclared.push(row);
  });
  const total = scoped.length + display.length + todo.length + undeclared.length;
  console.log("    " + total + " call sites: " + scoped.length + " scoped, "
    + display.length + " display, " + todo.length + " tracked debt, "
    + undeclared.length + " undeclared");
  if(undeclared.length) undeclared.forEach(o=> console.log("    UNDECLARED  " + o));
  ck("there are call sites to check", total >= 25, String(total));
  ck("none is undeclared", undeclared.length === 0,
     undeclared.length + " undeclared");
  /* THE DEBT, PINNED. Lower this number when a site is converted; raising it needs a
     reason in the commit message. */
  ck("the tracked debt is no larger than it was", todo.length <= 6,
     todo.length + " > 6");
  console.log("\n    tracked debt, in the order it should be paid:");
  todo.forEach(o=> console.log("      " + o));
  console.log("\n    declared display-only:");
  display.forEach(o=> console.log("      " + o));
}

console.log("\n2 - AND THE LOOKUP ITSELF STILL HONOURS A DAY WHEN GIVEN ONE");
{
  const b = await chromium.launch();
  const p = await b.newPage({viewport:{width:390,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{ localStorage.clear();
    localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
    localStorage.setItem('e26.ns0','E26-X'); });
  await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
  const r = await p.evaluate(()=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} hideModal();
    S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
    S.tourDone=true; S.splitId=DEFAULT_SPLIT; applySplit();
    const A = DAYS[0], B = DAYS[2], EX = "Preacher Curl";
    S.program[A] = [{name: EX, sets:3, reps:"8-12", weight:25}];
    S.program[B] = [{name: EX, sets:3, reps:"8-12", weight:40}];
    save();
    return {unscoped: (findProgramEntry(EX) || {}).weight,
            onA: (findProgramEntry(EX, A) || {}).weight,
            onB: (findProgramEntry(EX, B) || {}).weight,
            missing: findProgramEntry(EX, DAYS[1])};
  });
  console.log("    " + JSON.stringify(r));
  ck("unscoped still answers with the first day", r.unscoped === 25, String(r.unscoped));
  ck("scoped to the first day, 25", r.onA === 25, String(r.onA));
  ck("scoped to the third day, 40", r.onB === 40, String(r.onB));
  ck("and a day without it answers nothing rather than another day's slot",
     r.missing === null, JSON.stringify(r.missing));
  if(errs.length){ console.log("PAGE ERRORS: " + errs.join(" | ")); bad++; }
  await b.close();
}

console.log(bad ? ("BROKEN: "+bad) : "all good");
process.exit(bad ? 1 : 0);
