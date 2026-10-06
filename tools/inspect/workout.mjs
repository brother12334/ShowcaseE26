/* PASS 2 — THE WORKOUT, state by state. The heart of the product, and the only screen
   somebody uses standing up with a bar racked. Every state it can be in gets a frame. */
import { boot, calm, OUT } from './_boot.mjs';
import { SEED } from './_seed.mjs';
import path from 'node:path';

const {b, p, errs} = await boot();
await calm(p);
await p.evaluate(SEED);
await calm(p);

const shot = async (name, full)=>{
  await p.waitForTimeout(240);
  await p.screenshot({path: path.join(OUT, "w-" + name + ".png"), fullPage: !!full});
  console.log("  w-" + name);
};
const ev = (fn, a)=> p.evaluate(fn, a);

/* 1. THE PREFLIGHT — the screen between "start" and the first set. */
await ev(()=>{ TAB = "today"; render(); window.scrollTo(0,0); });
await p.evaluate(()=>{ const btn = document.querySelector("#startBtn, [data-start]"); if(btn) btn.click(); });
await p.waitForTimeout(500);
/* The prior-training ask fires on the very first start and is a state in its own right
   — photographed, then answered, so the preflight behind it can be photographed too. */
await shot("00-prior-training-ask");
await p.evaluate(()=>{
  const o = document.querySelector('[data-priorweeks], [data-prior]');
  if(o) o.click(); else { try{ hideModal(); }catch(e){} }
});
await p.waitForTimeout(400);
await p.evaluate(()=>{ try{ hideModal(); }catch(e){} });
await p.evaluate(()=>{ const btn = document.querySelector("#startBtn, [data-start]"); if(btn) btn.click(); });
await p.waitForTimeout(600);
await shot("01-preflight");
await shot("01-preflight-full", true);

/* 2. THE SESSION, untouched. */
await ev(()=>{ const pf = document.getElementById("preflight"); if(pf) pf.remove(); try{PF=null}catch(e){}
  if(!S.active) startWorkout(DAYS[0]);
  const pf2 = document.getElementById("preflight"); if(pf2) pf2.remove(); try{PF=null}catch(e){}
  TAB = "workout"; render(); window.scrollTo(0,0); });
await calm(p);
await shot("02-session-top");
await shot("02-session-full", true);

/* 3. MID-EXERCISE: first set logged, rest running. */
await ev(async ()=>{
  const row = document.querySelector('.set .chk[data-e="0"][data-s="0"]').parentElement;
  row.querySelector('[data-f="weight"]').value = "185";
  row.querySelector('[data-f="reps"]').value = "8";
  document.querySelector('.set .chk[data-e="0"][data-s="0"]').click();
  await new Promise(r=> setTimeout(r, 400));
});
await shot("03-after-first-set");

/* 4. THE REST UI, in front of you. */
await ev(()=>{ try{ showRestUI(false); }catch(e){} });
await p.waitForTimeout(400);
await shot("04-rest-open");

/* 5. Rest nearly done. */
await ev(()=>{ const rt = S.active && S.active.restTimer;
  if(rt){ rt.at = Date.now() - (rt.target - 6) * 1000; } try{ drawRest(); }catch(e){} });
await p.waitForTimeout(400);
await shot("05-rest-nearly-up");

/* 6. Back to the sheet, three sets in. */
await ev(async ()=>{
  try{ hideRestUI(); }catch(e){}
  S.active.restTimer = null;
  for(let i = 1; i < 3; i++){
    const row = document.querySelector('.set .chk[data-e="0"][data-s="' + i + '"]').parentElement;
    row.querySelector('[data-f="weight"]').value = "185";
    row.querySelector('[data-f="reps"]').value = String(8 - i);
    document.querySelector('.set .chk[data-e="0"][data-s="' + i + '"]').click();
    await new Promise(r=> setTimeout(r, 200));
    S.active.restTimer = null; try{ hideRestUI(); }catch(e){}
  }
  render();
});
await calm(p);
await shot("06-three-sets-in");

/* 7. A finished exercise, and the one after it. */
await ev(async ()=>{
  const row = document.querySelector('.set .chk[data-e="0"][data-s="3"]').parentElement;
  row.querySelector('[data-f="weight"]').value = "185";
  row.querySelector('[data-f="reps"]').value = "5";
  document.querySelector('.set .chk[data-e="0"][data-s="3"]').click();
  await new Promise(r=> setTimeout(r, 300));
  S.active.restTimer = null; try{ hideRestUI(); }catch(e){}
  render();
});
await calm(p);
await shot("07-exercise-done");

/* 8. THE SUPERSET CARD, which is a different shape entirely. */
await ev(()=>{
  const i = (S.active.entries || []).findIndex(e=> e.ss);
  if(i > -1){ const el = document.querySelectorAll(".card.ex, .ss-card")[0]; }
  window.scrollTo(0, 0);
  const ss = document.querySelector(".ss-card");
  if(ss) ss.scrollIntoView({block:"start"});
});
await p.waitForTimeout(300);
await shot("08-superset");

/* 9. A UNILATERAL MOVEMENT. */
await ev(()=>{ TAB = "workout";
  S.active.entries = [{name:"Single-Arm Dumbbell Row", reps:"8-12", uni:true, startSide:"L",
    sets:[0,1,2].map(()=> ({weight:"", reps:"", rpe:"", done:false}))}];
  render(); window.scrollTo(0,0); });
await calm(p);
await shot("09-unilateral");

/* 10. FOCUS MODE, one exercise at a time. */
await ev(()=>{ S.viewMode = "focus"; render(); window.scrollTo(0,0); });
await calm(p);
await shot("10-focus-mode");
await ev(()=>{ S.viewMode = "regular"; render(); });

/* 11. THE FINISH, and the grade card behind it. */
await ev(()=>{
  S.active.entries.forEach(e=> e.sets.forEach(st=>{
    st.weight = "70"; st.reps = "10"; st.rpe = "8"; st.done = true; }));
  save(); render();
});
await p.evaluate(()=>{ const f = document.getElementById("sessBarFinish"); if(f) f.click(); });
await p.waitForTimeout(700);
await shot("11-finish-grade");
await p.waitForTimeout(1600);
await shot("12-finish-settled");
await p.evaluate(()=>{ const c = document.getElementById("celebrate"); if(c) c.click(); });
await p.waitForTimeout(900);
await shot("13-score-card");
await shot("13-score-card-full", true);

console.log("errors:", errs.length ? errs.join(" | ") : "none");
await b.close();
