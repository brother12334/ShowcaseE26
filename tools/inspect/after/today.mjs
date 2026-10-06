/* AFTER — TODAY: one screen, one decision.

   Today currently spends its first 480px on three stacked status containers before it
   says what you are doing. The day IS the screen here; the status compresses into one
   line; the coaching keeps its intelligence but loses its paragraph. */
import { mockPage, OUT } from './_mock.mjs';
const {b, p, shot, errs} = await mockPage();

await p.evaluate(()=>{ TAB = "today"; render(); window.scrollTo(0,0); });
await p.waitForTimeout(300);
await shot("D-today-BEFORE");

await p.evaluate(()=>{
  const wid = todaysWorkoutId() || ROTATION[S.pointer] || DAYS[0];
  const meta = dayMeta(wid);
  const prog = S.program[wid] || [];
  const sets = prog.reduce((t,e)=> t + (parseInt(e.sets,10)||0), 0);
  const css = document.createElement("style");
  css.textContent = `
  body{padding-bottom:0}
  .mk-t-bar{display:flex;align-items:center;gap:10px;padding:14px 0 12px}
  .mk-t-mark{width:19px;height:19px;flex:0 0 auto;opacity:.9}
  .mk-t-name{font:var(--fs-2) var(--mono);letter-spacing:.22em;color:var(--dim)}
  .mk-t-name b{color:var(--acc);font-weight:400}
  .mk-t-date{margin-left:auto;font:var(--fs-2) var(--mono);color:var(--faint);letter-spacing:.08em}
  /* ONE STATUS LINE, not two containers. The cycle keeps its tiles — they are the
     most Element 26 thing on the screen — at the size of a status row. */
  .mk-t-cyc{display:flex;align-items:center;gap:7px;padding:9px 0 16px}
  .mk-t-tiles{display:flex;gap:3px}
  .mk-t-tile{width:20px;height:24px;border-radius:var(--r-xs);border:1px solid rgba(255,255,255,.08);
    display:flex;align-items:center;justify-content:center;font:8px var(--disp);font-weight:700;
    color:rgba(255,255,255,.35)}
  .mk-t-tile.cur{border-color:var(--text);color:var(--text);box-shadow:0 0 0 1px var(--text)}
  .mk-t-tile.rest{background:repeating-linear-gradient(135deg,transparent 0 3px,rgba(255,255,255,.05) 3px 6px)}
  .mk-t-wk{margin-left:auto;font:var(--fs-2) var(--mono);color:var(--faint);letter-spacing:.06em}
  .mk-t-wk b{color:var(--acc);font-weight:400}
  /* THE DAY IS THE SCREEN. */
  .mk-hero{position:relative;border-radius:var(--r-lg);overflow:hidden;padding:26px 20px 22px;
    border:1px solid rgba(255,255,255,.07)}
  .mk-hero::before{content:"";position:absolute;inset:0;opacity:.17;
    background:radial-gradient(120% 90% at 18% 0%,var(--dc) 0%,transparent 62%)}
  .mk-hero-k{position:relative;font:var(--fs-2) var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--faint)}
  .mk-hero-n{position:relative;font-size:38px;line-height:1.02;letter-spacing:.02em;
    font-family:var(--disp);font-weight:700;margin:9px 0 16px}
  .mk-hero-s{position:relative;display:flex;gap:26px}
  .mk-hero-s span{display:block}
  .mk-hero-s b{display:block;font:var(--fs-7) var(--mono);color:var(--text)}
  .mk-hero-s i{display:block;font-style:normal;font:var(--fs-1) var(--mono);
    letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-top:2px}
  .mk-hero-dot{position:absolute;right:18px;top:22px;width:13px;height:13px;border-radius:50%;
    background:var(--dc)}
  /* THE COACH SAYS ONE LINE. The paragraph is still there, one tap down. */
  .mk-note{display:flex;align-items:center;gap:10px;padding:14px 2px;margin-top:4px;
    border-bottom:1px solid rgba(255,255,255,.055);width:100%;background:none;
    border-left:0;border-right:0;border-top:0;border-radius:0;text-align:left}
  .mk-note-t{font:var(--fs-1) var(--mono);letter-spacing:.14em;text-transform:uppercase;
    color:var(--warn);flex:0 0 auto}
  .mk-note-b{flex:1;font-size:var(--fs-4);color:var(--dim)}
  .mk-note-b b{color:var(--text);font-weight:500}
  .mk-note-g{color:var(--faint)}
  .mk-list-k{font:var(--fs-1) var(--mono);letter-spacing:.16em;text-transform:uppercase;
    color:var(--faint);margin:18px 0 4px}
  .mk-ex{display:flex;align-items:baseline;gap:10px;padding:11px 2px;
    border-bottom:1px solid rgba(255,255,255,.04)}
  .mk-ex-i{font:var(--fs-2) var(--mono);color:var(--faint);width:15px}
  .mk-ex-n{flex:1;font-size:var(--fs-4);color:var(--dim)}
  .mk-ex-v{font:var(--fs-3) var(--mono);color:var(--faint)}
  /* THE ACTION NEVER SCROLLS AWAY. */
  .mk-start{position:fixed;left:16px;right:16px;bottom:16px;height:58px;border-radius:var(--r);
    border:0;background:var(--acc);color:#1b1206;font:var(--fs-5) var(--mono);
    letter-spacing:.14em;text-transform:uppercase;z-index:60;
    box-shadow:0 10px 30px rgba(0,0,0,.5)}
  .mk-pad{height:92px}
  nav.tabbar{display:none}
  `;
  document.head.appendChild(css);
  const tiles = (CYCLE_LAYOUT || []).slice(0, 7).map((slot, i)=>{
    const rest = slot === "rest" || slot == null;
    if(rest) return `<span class="mk-t-tile rest"></span>`;
    const dm = dayMeta(slot);
    const hex = (typeof DAY_HEX === "object" && DAY_HEX[slot]) || dm.color || "#888";
    return `<span class="mk-t-tile${slot === wid ? " cur" : ""}"
      style="color:${hex};border-color:${hex}55;${slot === wid
        ? "box-shadow:0 0 0 1px " + hex + ";background:" + hex + "1a" : ""}">${
      esc(dm.short || "")}</span>`;
  }).join("");
  document.getElementById("app").innerHTML = `
    <div class="mk-t-bar">
      <svg class="mk-t-mark" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="var(--acc)"/>
        <circle cx="12" cy="12" r="10.4" fill="none" stroke="var(--acc)" stroke-opacity=".4"/></svg>
      <span class="mk-t-name">ELEMENT <b>26</b></span>
      <span class="mk-t-date">TUE, OCT 6</span>
    </div>
    <div class="mk-t-cyc"><span class="mk-t-tiles">${tiles}</span>
      <span class="mk-t-wk"><b>9</b> weeks on target</span></div>
    <div class="mk-hero" style="--dc:${meta.color}">
      <span class="mk-hero-dot"></span>
      <div class="mk-hero-k">next up</div>
      <div class="mk-hero-n">${esc(meta.name.toUpperCase())}</div>
      <div class="mk-hero-s">
        <span><b>${prog.length}</b><i>exercises</i></span>
        <span><b>${sets}</b><i>sets</i></span>
        <span><b>81</b><i>min</i></span>
      </div>
    </div>
    <button class="mk-note"><span class="mk-note-t">heads up</span>
      <span class="mk-note-b"><b>Lats</b> get one set fewer today — 6 h since you trained them.
        <span class="mk-note-g">Why</span></span></button>
    <div class="mk-list-k">what's in it</div>
    ${prog.map((e, i)=> `<div class="mk-ex"><span class="mk-ex-i">${i+1}</span>
      <span class="mk-ex-n">${esc(e.name)}</span>
      <span class="mk-ex-v">${e.sets} × ${esc(e.reps||"")}</span></div>`).join("")}
    <div class="mk-pad"></div>
    <button class="mk-start">Start ${esc(meta.name)}</button>`;
  window.scrollTo(0,0);
});
await p.waitForTimeout(400);
await shot("D-today-AFTER");
console.log("errors:", errs.length ? errs.slice(0,3).join(" | ") : "none");
await b.close();
