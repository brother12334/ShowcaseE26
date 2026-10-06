/* AFTER — BODY, with the figure as the page.

   The anatomy map is the most distinctive thing Element 26 owns and today it sits 55%
   of the way down the screen, 179px wide, drawn near-black on near-black. This takes the
   REAL svg out of the page, puts it at the top at twice the size, gives an untrained
   muscle a visible steel fill, and turns the four metric cards into one control that
   recolours the figure in place. */
import { mockPage, OUT } from './_mock.mjs';
const {b, p, shot, errs} = await mockPage();

/* BEFORE: where the figure actually is. */
await p.evaluate(()=>{ TAB = "body"; render(); window.scrollTo(0, 0); });
await p.waitForTimeout(300);
await shot("C-body-BEFORE-top");
await p.evaluate(()=>{
  const svg = document.querySelector("#app svg .bm-m");
  if(svg) svg.closest("svg").scrollIntoView({block:"center"});
});
await p.waitForTimeout(300);
await shot("C-body-BEFORE-figure");

/* AFTER */
await p.evaluate(()=>{
  const app = document.getElementById("app");
  const figs = Array.from(app.querySelectorAll("svg")).filter(s=> s.querySelector(".bm-m"));
  const front = figs[0], back = figs[1];
  const css = document.createElement("style");
  css.textContent = `
  .mk-b-hdr{display:flex;align-items:baseline;justify-content:space-between;margin:2px 0 14px}
  .mk-b-hdr h1{font-size:var(--fs-9);letter-spacing:.04em}
  .mk-b-when{font:var(--fs-2) var(--mono);color:var(--faint);letter-spacing:.1em;text-transform:uppercase}
  /* ONE CONTROL INSTEAD OF FOUR CARDS. The same figure, recoloured — which the code
     already supports: bmPaint() repaints in place. */
  .mk-seg{display:flex;gap:2px;background:rgba(255,255,255,.035);border-radius:var(--r-sm);
    padding:3px;margin-bottom:16px}
  .mk-seg button{flex:1;height:34px;border:0;border-radius:var(--r-xs);background:none;
    color:var(--faint);font:var(--fs-2) var(--mono);letter-spacing:.09em;text-transform:uppercase}
  .mk-seg button.on{background:var(--card2);color:var(--text);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
  .mk-figs{display:flex;gap:4px;justify-content:center;align-items:flex-start;margin:0 -6px}
  .mk-figs svg{width:100%;height:auto;max-height:none}
  .mk-fig{flex:1;position:relative}
  .mk-fig-l{position:absolute;left:0;right:0;bottom:-2px;text-align:center;
    font:var(--fs-1) var(--mono);letter-spacing:.2em;color:var(--faint)}
  /* A MUSCLE WITH NOTHING ON IT IS STILL A MUSCLE. Steel, with an edge — never the
     background colour, which is what made the figure read as an empty silhouette. */
  .mk-figs .bm-m{fill:#2b2926 !important;stroke:rgba(255,255,255,.10);stroke-width:.6}
  .mk-figs .bm-m[data-g="chest"],.mk-figs .bm-m[data-g="quads"],
  .mk-figs .bm-m[data-g="glutes"]{fill:#c9a24a !important;filter:drop-shadow(0 0 7px rgba(201,162,74,.5))}
  .mk-figs .bm-m[data-g="lats"],.mk-figs .bm-m[data-g="upper_back"]{fill:#7fae6a !important;
    filter:drop-shadow(0 0 6px rgba(127,174,106,.4))}
  .mk-figs .bm-m[data-g="side_delts"]{fill:#d1584f !important;
    filter:drop-shadow(0 0 8px rgba(209,88,79,.55))}
  .mk-key{display:flex;gap:14px;justify-content:center;margin:14px 0 20px;
    font:var(--fs-2) var(--mono);color:var(--faint)}
  .mk-key i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;
    vertical-align:-1px}
  /* THE LIST UNDER IT IS THE SAME DATA, RANKED. */
  .mk-rank-k{font:var(--fs-1) var(--mono);letter-spacing:.16em;text-transform:uppercase;
    color:var(--faint);margin:0 0 10px}
  .mk-row{display:grid;grid-template-columns:34px 1fr 74px;gap:11px;align-items:center;
    padding:10px 0;border-bottom:1px solid rgba(255,255,255,.045);width:100%;
    background:none;border-left:0;border-right:0;border-top:0;border-radius:0;text-align:left}
  .mk-sq{width:34px;height:34px;border-radius:var(--r-sm);display:flex;align-items:center;
    justify-content:center;font:var(--fs-4) var(--disp);font-weight:600;border:1px solid var(--line)}
  .mk-row-n{font:var(--fs-2) var(--mono);letter-spacing:.09em;text-transform:uppercase;color:var(--dim)}
  .mk-row-b{display:block;height:5px;border-radius:var(--r-xs);background:rgba(255,255,255,.055);
    margin-top:6px;position:relative;overflow:hidden}
  .mk-row-b i{position:absolute;left:0;top:0;bottom:0;border-radius:var(--r-xs)}
  .mk-row-v{text-align:right;font:var(--fs-4) var(--mono);color:var(--text)}
  .mk-row-v span{color:var(--faint);font-size:var(--fs-2)}
  `;
  document.head.appendChild(css);

  const sq = (s, n, pct, col, val, floor)=> `
    <button class="mk-row">
      <span class="mk-sq" style="color:${col};border-color:${col}66;background:${col}1f">${s}</span>
      <span><span class="mk-row-n">${n}</span>
        <span class="mk-row-b"><i style="width:${pct}%;background:${col}"></i></span></span>
      <span class="mk-row-v">${val}<span>/${floor}</span></span>
    </button>`;

  const h = `
    <div class="mk-b-hdr"><h1>BODY</h1><span class="mk-b-when">last 7 days</span></div>
    <div class="mk-seg">
      <button class="on">Fatigue</button><button>Volume</button>
      <button>Recovery</button><button>Growth</button>
    </div>
    <div class="mk-figs">
      <div class="mk-fig" id="mkF"></div>
      <div class="mk-fig" id="mkB"></div>
    </div>
    <div class="mk-key"><span><i style="background:#7fae6a"></i>fresh</span>
      <span><i style="background:#c9a24a"></i>working</span>
      <span><i style="background:#d1584f"></i>needs a break</span>
      <span><i style="background:#2b2926;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)"></i>untrained</span></div>
    <div class="mk-rank-k">furthest behind</div>
    ${sq("SD","Side delts",58,"#d1584f","5.2",9)}
    ${sq("RD","Rear delts",64,"#c9a24a","4.2",6.5)}
    ${sq("Ha","Hamstrings",71,"#c9a24a","7.1",10)}
    ${sq("Ca","Calves",88,"#7fae6a","8.0",9)}
    ${sq("Ch","Chest",100,"#7fae6a","10",7)}`;
  app.innerHTML = h;
  if(front) document.getElementById("mkF").appendChild(front);
  if(back) document.getElementById("mkB").appendChild(back);
  [["mkF","FRONT"],["mkB","BACK"]].forEach(([id, t])=>{
    const w = document.getElementById(id);
    if(w){ const l = document.createElement("span"); l.className = "mk-fig-l"; l.textContent = t;
           w.appendChild(l); }
  });
  window.scrollTo(0, 0);
});
await p.waitForTimeout(400);
await shot("C-body-AFTER");
console.log("errors:", errs.length ? errs.slice(0,3).join(" | ") : "none");
await b.close();
