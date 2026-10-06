/* PASS 6 — THE STATES NOBODY PHOTOGRAPHS. First run, empty, partial, interrupted,
   rest day, a session with nothing in it. */
import { boot, calm, OUT } from './_boot.mjs';
import { SEED } from './_seed.mjs';
import path from 'node:path';
const {b, p, errs} = await boot();
const shot = async (n, full)=>{ await p.waitForTimeout(260);
  await p.screenshot({path: path.join(OUT, "e-" + n + ".png"), fullPage: !!full});
  console.log("  e-" + n); };

/* 1. FIRST RUN — nothing cleared, exactly what a new person sees. */
await p.waitForTimeout(700);
await shot("01-first-open");
await p.evaluate(()=>{ const sp = document.getElementById('splash'); if(sp) sp.remove(); });
await p.waitForTimeout(500);
await shot("02-onboarding");

/* 2. SET UP, BUT NOTHING LOGGED — the true empty state of each tab. */
await calm(p);
await p.evaluate(()=>{
  S.setup = {name:"Fer", goal:"muscle", level:"beginner", gear:"full", at: Date.now()};
  S.tourDone = true; S.seenNews = "x"; S.sessions = []; S.bodyLog = {}; S.hurts = [];
  S.splitId = DEFAULT_SPLIT; applySplit(); save();
});
for(const t of ["today","history","body","program"]){
  await p.evaluate(x=>{ TAB = x; render(); window.scrollTo(0,0); }, t);
  await calm(p);
  await shot("03-empty-" + t);
  await shot("03-empty-" + t + "-full", true);
}

/* 3. A SESSION INTERRUPTED — started, two sets in, app reopened. */
await p.evaluate(()=>{
  startWorkout(DAYS[0]);
  const pf = document.getElementById("preflight"); if(pf) pf.remove(); try{PF=null}catch(e){}
  const e = S.active.entries[0];
  e.sets[0].weight = "135"; e.sets[0].reps = "8"; e.sets[0].done = true;
  S.active.startedAt = Date.now() - 5*3600e3;        // five hours ago
  save(); TAB = "today"; render(); window.scrollTo(0,0);
});
await calm(p);
await shot("04-interrupted-today");
await p.evaluate(()=>{ TAB = "workout"; render(); window.scrollTo(0,0); });
await calm(p);
await shot("04-interrupted-session");

/* 4. A REST DAY. */
await p.evaluate(()=>{
  S.active = null;
  const i = (CYCLE_LAYOUT || []).findIndex(x=> x === "rest" || x == null);
  if(i > -1) S.pointer = i;
  save(); TAB = "today"; render(); window.scrollTo(0,0);
});
await calm(p);
await shot("05-rest-day");

/* 5. A SESSION WITH NOTHING IN IT — finished with no sets. */
await p.evaluate(()=>{
  S.pointer = 0; startWorkout(DAYS[0]);
  const pf = document.getElementById("preflight"); if(pf) pf.remove(); try{PF=null}catch(e){}
  TAB = "workout"; render();
});
await calm(p);
await p.evaluate(()=>{ const f = document.getElementById("sessBarFinish"); if(f) f.click(); });
await p.waitForTimeout(600);
await shot("06-finish-with-nothing");

console.log("errors:", errs.length ? errs.slice(0,3).join(" | ") : "none");
await b.close();
