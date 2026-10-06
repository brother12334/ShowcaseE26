/* PASS 5 — what each screen COSTS. A premium feel is mostly a fast feel. */
import { boot, calm } from './_boot.mjs';
import { SEED } from './_seed.mjs';
const {b, p} = await boot();
await calm(p);
await p.evaluate(SEED);
await calm(p);
const r = await p.evaluate(()=>{
  const out = {};
  const time = (k, fn)=>{
    fn(); fn();                                   // warm
    const t0 = performance.now();
    for(let i = 0; i < 5; i++) fn();
    out[k] = +((performance.now() - t0) / 5).toFixed(1);
  };
  ["today","history","body","program","sync"].forEach(t=>{
    time(t, ()=>{ TAB = t; render(); });
  });
  startWorkout(DAYS[0]);
  const pf = document.getElementById("preflight"); if(pf) pf.remove(); try{PF=null}catch(e){}
  time("workout", ()=>{ TAB = "workout"; render(); });
  out.domNodes = document.querySelectorAll("*").length;
  return out;
});
console.log("render ms (mean of 5):", JSON.stringify(r, null, 1));
await b.close();
