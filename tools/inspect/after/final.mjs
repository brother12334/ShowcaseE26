/* The five screens the phase rebuilt, as they now are. */
import { mockPage, LIVE, OUT } from './_mock.mjs';
import path from 'node:path';
const {b, p, shot, errs} = await mockPage();

await p.evaluate(()=>{ TAB="today"; render(); window.scrollTo(0,0); });
await p.waitForTimeout(260); await shot("Z-today");
await p.evaluate(()=>{ TAB="history"; HIST_VIEW="lifts"; render(); window.scrollTo(0,0); });
await p.waitForTimeout(400); await shot("Z-history");
await p.evaluate(()=>{ TAB="body"; render(); window.scrollTo(0,0); });
await p.waitForTimeout(400); await shot("Z-body");
await p.evaluate(LIVE, 6);
await p.waitForTimeout(300); await shot("Z-session");
await p.evaluate(()=>{
  startRest(1, 2);
  S.active.restTimer.start = Date.now() - 68000;
  showRestUI(false);
});
await p.waitForTimeout(500); await shot("Z-rest");
console.log("errors:", errs.length ? errs.join(" | ") : "none");
await b.close();
