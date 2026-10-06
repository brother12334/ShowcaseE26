/* PASS 4 — NUMBERS, so the audit is measured rather than asserted. */
import { boot, calm } from './_boot.mjs';
import { SEED } from './_seed.mjs';

const {b, p} = await boot();
await calm(p);
await p.evaluate(SEED);
await calm(p);
const ev = (fn, a)=> p.evaluate(fn, a);

const tabStats = async tab=>{
  await ev(t=>{ TAB = t; SET_PAGE = null; render(); window.scrollTo(0,0); }, tab);
  await calm(p);
  await p.waitForTimeout(220);
  return await ev(()=>{
    const app = document.getElementById("app");
    const vh = window.innerHeight;
    const boxes = app.querySelectorAll(".card, .set-tile, .nb-card, .sx, .pv-r");
    const txt = [];
    app.querySelectorAll("*").forEach(el=>{
      if(!el.children.length && (el.textContent||"").trim()){
        const cs = getComputedStyle(el);
        txt.push(cs.fontSize + "/" + cs.fontWeight + "/" + cs.fontFamily.split(",")[0]);
      }
    });
    const words = (app.innerText || "").trim().split(/\s+/).length;
    const tapable = app.querySelectorAll("button, a, input, select, [role=button]");
    return {
      height: Math.round(app.scrollHeight),
      screens: +(app.scrollHeight / vh).toFixed(1),
      boxes: boxes.length,
      typeStyles: new Set(txt).size,
      words,
      controls: tapable.length,
      aboveFold: Array.from(tapable).filter(e=>{
        const r = e.getBoundingClientRect(); return r.top < vh && r.height > 0;
      }).length
    };
  });
};

console.log("tab        height  screens  boxes  typeStyles  words  controls  aboveFold");
for(const t of ["today","history","body","program","sync"]){
  const s = await tabStats(t);
  console.log(t.padEnd(10) + String(s.height).padStart(7) + String(s.screens).padStart(9)
    + String(s.boxes).padStart(7) + String(s.typeStyles).padStart(12)
    + String(s.words).padStart(7) + String(s.controls).padStart(10)
    + String(s.aboveFold).padStart(11));
}

/* The logger, which is the screen that matters most. */
await ev(()=>{ startWorkout(DAYS[0]);
  const pf = document.getElementById("preflight"); if(pf) pf.remove(); try{PF=null}catch(e){}
  TAB = "workout"; render(); window.scrollTo(0,0); });
await calm(p);
const log = await ev(()=>{
  const app = document.getElementById("app");
  const vh = window.innerHeight;
  const firstRow = app.querySelector(".set");
  const rows = app.querySelectorAll(".set");
  const inputs = app.querySelectorAll(".set input, .set select");
  return {height: Math.round(app.scrollHeight),
    screens: +(app.scrollHeight/vh).toFixed(1),
    cards: app.querySelectorAll(".card.ex, .ss-card").length,
    rows: rows.length,
    inputsPerRow: +(inputs.length / Math.max(1, rows.length)).toFixed(1),
    firstRowTop: firstRow ? Math.round(firstRow.getBoundingClientRect().top) : null,
    rowHeight: firstRow ? Math.round(firstRow.getBoundingClientRect().height) : null,
    screensToLastSet: +(app.scrollHeight/vh).toFixed(1)};
});
console.log("\nLOGGER: " + JSON.stringify(log));

/* How far down the Body tab the figure lives. */
await ev(()=>{ S.active=null; save(); TAB="body"; render(); window.scrollTo(0,0); });
await calm(p);
const body = await ev(()=>{
  const fig = document.querySelector("#app svg .bm-m");
  const svg = fig ? fig.closest("svg") : null;
  const app = document.getElementById("app");
  return {figureTop: svg ? Math.round(svg.getBoundingClientRect().top + window.scrollY) : null,
    figureW: svg ? Math.round(svg.getBoundingClientRect().width) : null,
    total: Math.round(app.scrollHeight),
    pct: svg ? Math.round(100 * (svg.getBoundingClientRect().top + window.scrollY) / app.scrollHeight) : null};
});
console.log("BODY FIGURE: " + JSON.stringify(body));

/* History: how many sessions before you can compare two of the same day. */
await ev(()=>{ TAB="history"; render(); window.scrollTo(0,0); });
await calm(p);
const hist = await ev(()=>{
  const cards = document.querySelectorAll("#app .sx, #app [data-sess]");
  const app = document.getElementById("app");
  const first = cards[0] ? cards[0].getBoundingClientRect() : null;
  return {cards: cards.length, cardH: first ? Math.round(first.height) : null,
    total: Math.round(app.scrollHeight),
    perScreen: first ? +(window.innerHeight / first.height).toFixed(1) : null};
});
console.log("HISTORY: " + JSON.stringify(hist));
await b.close();
