/* AFTER — REST AS A PHASE OF THE SESSION, not a modal over it.

   Keeps the plate, which is the identity. Changes what the plate is made of (steel, not
   paper), what it shows (the rim IS the clock), and what surrounds it (the next set,
   which is the reason you are resting). */
import { mockPage, LIVE, OUT } from './_mock.mjs';
const {b, p, shot, errs} = await mockPage();
await p.evaluate(LIVE, 1);

/* BEFORE */
await p.evaluate(()=>{ startRest(0, 0);
  const rt = S.active.restTimer; rt.at = Date.now() - 74000;    // 74s into a 150s rest
  showRestUI(false); });
await p.waitForTimeout(500);
await shot("B-rest-BEFORE");
await p.evaluate(()=>{ showRestUI(true); });
await p.waitForTimeout(400);
await shot("B-rest-BEFORE-mini");

/* AFTER */
await p.evaluate(()=>{
  try{ hideRestUI(); }catch(e){}
  const css = document.createElement("style");
  css.textContent = `
  #mk-rest{position:fixed;left:0;right:0;bottom:0;top:0;z-index:150;display:flex;
    flex-direction:column;background:linear-gradient(180deg,rgba(10,10,10,.97) 0%,
      var(--bg) 18%)}
  /* THE SESSION IS STILL THERE. Rest is a phase of it, so the card you are resting
     from stays legible at the top rather than being blurred out. */
  .mk-r-top{flex:0 0 auto;padding:18px 16px 0}
  .mk-r-from{font:var(--fs-2) var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
  .mk-r-set{font:var(--fs-4) var(--mono);color:var(--dim);margin-top:5px;white-space:nowrap;
    overflow:hidden;text-overflow:ellipsis}
  .mk-r-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0}
  /* THE PLATE: steel, with the rim doing the counting. */
  .mk-plate{position:relative;width:212px;height:212px;border-radius:50%;
    background:radial-gradient(circle at 50% 42%,#2a2724 0%,#1b1917 62%,#131211 100%);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.07), 0 22px 60px rgba(0,0,0,.55);
    display:flex;align-items:center;justify-content:center}
  .mk-plate svg{position:absolute;inset:-9px;width:calc(100% + 18px);height:calc(100% + 18px);
    transform:rotate(-90deg)}
  .mk-plate .trk{fill:none;stroke:rgba(255,255,255,.07);stroke-width:5}
  .mk-plate .fil{fill:none;stroke:var(--acc);stroke-width:5;stroke-linecap:round}
  .mk-spokes{position:absolute;inset:26px;border-radius:50%;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.045)}
  .mk-spokes i{position:absolute;left:50%;top:50%;width:2px;height:44%;margin-left:-1px;
    background:linear-gradient(180deg,rgba(255,255,255,.05),transparent);
    transform-origin:50% 0}
  .mk-hub{position:relative;text-align:center;z-index:2}
  .mk-hub b{display:block;font:var(--fs-9) var(--mono);font-size:42px;letter-spacing:-.02em;color:var(--text)}
  .mk-hub span{display:block;font:var(--fs-1) var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--faint);margin-bottom:3px}
  .mk-adj{display:flex;gap:8px;margin-top:20px}
  .mk-adj button{min-width:66px;height:38px;border-radius:var(--r-pill);border:1px solid var(--line);
    background:none;color:var(--dim);font:var(--fs-3) var(--mono);letter-spacing:.06em}
  /* WHAT YOU ARE RESTING FOR. */
  .mk-next-wrap{width:100%;max-width:390px;margin-top:26px;padding:0 16px}
  .mk-nx-k{font:var(--fs-1) var(--mono);letter-spacing:.18em;text-transform:uppercase;
    color:var(--faint);margin-bottom:9px}
  .mk-nx{border:1px solid var(--line);border-radius:var(--r-lg);background:var(--card);
    padding:14px 15px}
  .mk-nx-n{font-size:var(--fs-6);font-weight:600;margin-bottom:9px}
  .mk-nx-row{display:flex;gap:16px;align-items:baseline;flex-wrap:nowrap}
  .mk-nx-v{font:var(--fs-8) var(--mono);color:var(--text);white-space:nowrap}
  .mk-nx-v i{font-style:normal;font-size:var(--fs-3);color:var(--faint);margin-left:3px}
  .mk-nx-l{margin-left:auto;text-align:right;font:var(--fs-1) var(--mono);color:var(--faint);
    line-height:1.6;white-space:nowrap}
  .mk-nx-l b{color:var(--dim);font-weight:400}
  .mk-go{width:100%;max-width:360px;margin:16px 16px 26px;height:52px;border-radius:var(--r);
    border:1px solid var(--line);background:none;color:var(--dim);
    font:var(--fs-4) var(--mono);letter-spacing:.1em;text-transform:uppercase}
  `;
  document.head.appendChild(css);
  const total = 150, left = 76;
  const frac = (total - left) / total;
  const C = 2 * Math.PI * 126;
  const el = document.createElement("div");
  el.id = "mk-rest";
  el.innerHTML = `
    <div class="mk-r-top">
      <div class="mk-r-from">resting from</div>
      <div class="mk-r-set">Barbell Bench Press · set 1 · 185 × 8 @8</div>
    </div>
    <div class="mk-r-body">
      <div class="mk-plate">
        <svg viewBox="0 0 260 260"><circle class="trk" cx="130" cy="130" r="126"></circle>
          <circle class="fil" cx="130" cy="130" r="126"
            stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"></circle></svg>
        <div class="mk-spokes">${Array.from({length:8}, (_, i)=>
          `<i style="transform:rotate(${i * 45}deg)"></i>`).join("")}</div>
        <div class="mk-hub"><span>rest left</span><b>1:16</b></div>
      </div>
      <div class="mk-adj"><button>− 30s</button><button>+ 30s</button><button>skip</button></div>
      <div class="mk-next-wrap">
        <div class="mk-nx-k">up next</div>
        <div class="mk-nx">
          <div class="mk-nx-n">Barbell Bench Press · set 2 of 4</div>
          <div class="mk-nx-row">
            <span class="mk-nx-v">185<i>lb</i></span>
            <span class="mk-nx-v">5–8<i>reps</i></span>
            <span class="mk-nx-l">last time <b>185 × 8 @8</b><br>bar: 45 + 45 + 25 a side</span>
          </div>
        </div>
      </div>
    </div>
    <button class="mk-go">I'm ready</button>`;
  document.body.appendChild(el);
});
await p.waitForTimeout(400);
await shot("B-rest-AFTER");
console.log("errors:", errs.length ? errs.slice(0,3).join(" | ") : "none");
await b.close();
