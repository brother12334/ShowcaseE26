/* PASS 1 — EVERY DESTINATION, with a real history behind it. */
import { boot, calm, OUT, PHONE } from './_boot.mjs';
import { SEED } from './_seed.mjs';
import path from 'node:path';

const {b, p, errs} = await boot();
await calm(p);
const seeded = await p.evaluate(SEED);
console.log("seeded:", JSON.stringify(seeded));
await calm(p);

const shot = async (name, full)=>{
  await p.waitForTimeout(260);
  await p.screenshot({path: path.join(OUT, name + ".png"), fullPage: !!full});
  const h = await p.evaluate(()=> document.getElementById("app")
    ? document.getElementById("app").scrollHeight : 0);
  console.log("  " + name + (full ? "  (full, " + h + "px)" : ""));
};

const go = async (tab, page)=>{
  await p.evaluate(([t, s])=>{
    TAB = t; SET_PAGE = s || null; render(); window.scrollTo(0,0);
  }, [tab, page || null]);
  await calm(p);
};

console.log("TABS");
for(const t of ["today", "history", "body", "program", "sync"]){
  await go(t);
  await shot("tab-" + t);
  await shot("tab-" + t + "-full", true);
}

console.log("SETTINGS SUB-PAGES");
const groups = await p.evaluate(()=> setGroups().map(g=> ({k:g.k, t:g.title})));
for(const g of groups){
  await go("sync", g.k);
  await shot("set-" + g.k + "-full", true);
}

console.log("errors:", errs.length ? errs.join(" | ") : "none");
await b.close();
