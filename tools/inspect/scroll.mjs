/* PASS 1b — the long screens, read the way somebody scrolls them. A full-page PNG of a
   17,000px tab is not something a human can look at; a sequence of viewport-sized
   frames is exactly what the user sees. */
import { boot, calm, OUT } from './_boot.mjs';
import { SEED } from './_seed.mjs';
import path from 'node:path';

const {b, p, errs} = await boot();
await calm(p);
await p.evaluate(SEED);
await calm(p);

const walk = async (tab, maxFrames)=>{
  await p.evaluate(t=>{ TAB = t; SET_PAGE = null; render(); window.scrollTo(0,0); }, tab);
  await calm(p);
  await p.waitForTimeout(300);
  const h = await p.evaluate(()=> document.documentElement.scrollHeight);
  const step = 760;
  const n = Math.min(maxFrames || 8, Math.ceil(h / step));
  for(let i = 0; i < n; i++){
    await p.evaluate(y=> window.scrollTo(0, y), i * step);
    await p.waitForTimeout(220);
    await p.screenshot({path: path.join(OUT, "walk-" + tab + "-" + String(i).padStart(2,"0") + ".png")});
  }
  console.log(tab + ": " + h + "px, " + n + " frames");
};

await walk("today", 5);
await walk("body", 7);
await walk("program", 7);
await walk("history", 6);
await walk("sync", 3);
console.log("errors:", errs.length ? errs.join(" | ") : "none");
await b.close();
