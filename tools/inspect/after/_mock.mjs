/* THE MOCKUP HARNESS.

   An "after" built by hand in a separate HTML file is a drawing of a redesign. This
   loads the REAL index.html, with the real type, the real colours and the real
   components, and rearranges it in the page — so what you are looking at is Element 26,
   not an impression of it, and anything shown here is known to be buildable.

   NOTHING HERE TOUCHES index.html. These scripts run against a loaded copy in a
   browser and produce images. */
import { boot, calm, OUT } from '../_boot.mjs';
import { SEED } from '../_seed.mjs';
import path from 'node:path';
export { OUT };

export async function mockPage(opts){
  const {b, p, errs} = await boot(opts);
  await calm(p);
  await p.evaluate(SEED);
  await calm(p);
  return {b, p, errs,
    shot: async (name, full)=>{
      await p.waitForTimeout(260);
      await p.screenshot({path: path.join(OUT, name + ".png"), fullPage: !!full});
      console.log("  " + name);
    }};
}

/* A live session, with the preflight cleared and some of it already done. */
export const LIVE = function(doneSets){
  startWorkout(DAYS[0]);
  const pf = document.getElementById("preflight"); if(pf) pf.remove();
  try{ PF = null; }catch(e){}
  const n = doneSets == null ? 5 : doneSets;
  let left = n;
  (S.active.entries || []).forEach(e=>{
    (e.sets || []).forEach(st=>{
      if(left <= 0) return;
      st.weight = String(e.name === "Barbell Bench Press" ? 185 : 95);
      st.reps = "8"; st.rpe = "8"; st.done = true;
      left--;
    });
  });
  S.active.restTimer = null;
  save();
  TAB = "workout"; render(); window.scrollTo(0, 0);
};
