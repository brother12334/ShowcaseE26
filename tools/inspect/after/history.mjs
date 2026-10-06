/* AFTER — HISTORY AS THE STORY OF YOUR LIFTS, not a list of sessions.

   115 sessions, 20.1 screens, 1,572 focusable controls, 106ms to draw. Every card is the
   same shape, and nowhere on the screen can you see a lift getting heavier — which is
   the only question anybody opens this tab to answer. */
import { mockPage, OUT } from './_mock.mjs';
const {b, p, shot, errs} = await mockPage();

await p.evaluate(()=>{ TAB = "history"; render(); window.scrollTo(0,0); });
await p.waitForTimeout(400);
await shot("E-history-BEFORE");
await p.evaluate(()=> window.scrollTo(0, 1500));
await p.waitForTimeout(300);
await shot("E-history-BEFORE-list");

await p.evaluate(()=>{
  const css = document.createElement("style");
  css.textContent = `
  .mk-h-hdr{display:flex;align-items:baseline;justify-content:space-between;margin:2px 0 16px}
  .mk-h-hdr h1{font-size:var(--fs-9);letter-spacing:.04em}
  .mk-h-n{font:var(--fs-2) var(--mono);color:var(--faint);letter-spacing:.08em}
  .mk-seg{display:flex;gap:2px;background:rgba(255,255,255,.035);border-radius:var(--r-sm);
    padding:3px;margin-bottom:18px}
  .mk-seg button{flex:1;height:34px;border:0;border-radius:var(--r-xs);background:none;
    color:var(--faint);font:var(--fs-2) var(--mono);letter-spacing:.1em;text-transform:uppercase}
  .mk-seg button.on{background:var(--card2);color:var(--text);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
  /* ONE ROW PER LIFT: the number, where it came from, and the shape of the climb. */
  .mk-lift{display:grid;grid-template-columns:1fr 104px;gap:14px;align-items:center;
    padding:15px 2px;border-bottom:1px solid rgba(255,255,255,.05);width:100%;
    background:none;border-left:0;border-right:0;border-top:0;border-radius:0;text-align:left}
  .mk-lift-n{display:block;font-size:var(--fs-5);font-weight:500;color:var(--text);margin-bottom:5px}
  .mk-lift-m{display:block;font:var(--fs-2) var(--mono);color:var(--faint);letter-spacing:.04em}
  .mk-lift-m b{color:var(--ok);font-weight:400}
  .mk-lift-m .flat{color:var(--faint)}
  .mk-spark{height:38px;position:relative}
  .mk-spark svg{width:100%;height:100%;overflow:visible}
  .mk-spark .ln{fill:none;stroke:var(--acc);stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
  .mk-spark .dot{fill:var(--acc)}
  .mk-spark .ar{fill:url(#mkg)}
  .mk-now{position:absolute;right:0;top:-3px;font:var(--fs-4) var(--mono);color:var(--text)}
  .mk-k{font:var(--fs-1) var(--mono);letter-spacing:.16em;text-transform:uppercase;
    color:var(--faint);margin:22px 0 2px}
  .mk-wk{display:flex;gap:3px;margin:10px 0 4px}
  .mk-wk i{flex:1;height:26px;border-radius:var(--r-xs);background:rgba(255,255,255,.055)}
  `;
  document.head.appendChild(css);

  /* The real numbers: the top set of each movement, session by session. */
  const byEx = {};
  (S.sessions || []).forEach(s=>{
    (s.entries || []).forEach(e=>{
      let best = 0;
      (e.sets || []).forEach(st=>{ const w = parseFloat(st.weight)||0; if(w > best) best = w; });
      if(!best) return;
      (byEx[e.name] = byEx[e.name] || []).push(best);
    });
  });
  const lifts = Object.keys(byEx).map(n=>{
    const v = byEx[n].slice(-16);
    return {n, v, now: v[v.length-1], first: v[0]};
  }).filter(x=> x.v.length > 4).sort((a,b)=> b.now - a.now).slice(0, 7);

  const spark = v=>{
    const lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    const rng = (hi - lo) || 1;
    const pts = v.map((y, i)=> [ (i/(v.length-1))*100, 32 - ((y-lo)/rng)*26 ]);
    const d = pts.map((p,i)=> (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = d + " L100 38 L0 38 Z";
    return `<svg viewBox="0 0 100 38" preserveAspectRatio="none">
      <defs><linearGradient id="mkg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--acc)" stop-opacity=".16"/>
        <stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>
      <path class="ar" d="${area}"/><path class="ln" d="${d}"/>
      <circle class="dot" cx="100" cy="${pts[pts.length-1][1].toFixed(1)}" r="2.1"/></svg>`;
  };

  document.getElementById("app").innerHTML = `
    <div class="mk-h-hdr"><h1>HISTORY</h1><span class="mk-h-n">115 sessions · 30 weeks</span></div>
    <div class="mk-seg"><button class="on">Lifts</button><button>Sessions</button>
      <button>Records</button></div>
    <div class="mk-k">this week</div>
    <div class="mk-wk">${Array.from({length:7}, (_, i)=>
      `<i style="background:${[0,2,4].indexOf(i) > -1 ? "var(--acc)" : "rgba(255,255,255,.055)"}"></i>`).join("")}</div>
    <div class="mk-lift-m" style="margin-bottom:6px">3 of 4 done · 37,480 lb moved</div>
    <div class="mk-k">your lifts</div>
    ${lifts.map(l=>{
      const up = l.now - l.first;
      return `<button class="mk-lift">
        <span><span class="mk-lift-n">${esc(l.n)}</span>
          <span class="mk-lift-m">${up > 0
            ? `<b>+${Math.round(up)} lb</b> over ${l.v.length} sessions`
            : `<span class="flat">level over ${l.v.length} sessions</span>`}</span></span>
        <span class="mk-spark"><span class="mk-now">${Math.round(l.now)}</span>${spark(l.v)}</span>
      </button>`;
    }).join("")}`;
  window.scrollTo(0,0);
});
await p.waitForTimeout(400);
await shot("E-history-AFTER");
console.log("errors:", errs.length ? errs.slice(0,3).join(" | ") : "none");
await b.close();
