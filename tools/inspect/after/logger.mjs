/* AFTER — THE SESSION AS A STACK, not a form.

   The redesign in one sentence: only the set you are on is a form. Sets behind you are
   records, sets ahead of you are prescriptions, exercises behind you are one line each.
   Built here out of the app's own classes and tokens. */
import { mockPage, LIVE, OUT } from './_mock.mjs';

const {b, p, shot, errs} = await mockPage();
await p.evaluate(LIVE, 6);

/* BEFORE, for the pair. */
await shot("A-logger-BEFORE");
await p.evaluate(()=> window.scrollTo(0, 700));
await shot("A-logger-BEFORE-scrolled");
await p.evaluate(()=> window.scrollTo(0, 0));

/* AFTER. The markup is generated from the live session so every number on screen is
   real: same entries, same sets, same prescriptions. */
await p.evaluate(()=>{
  const a = S.active;
  const unit = (typeof unitWord === "function") ? unitWord() : "lb";

  const css = document.createElement("style");
  css.id = "mock-css";
  css.textContent = `
  /* ---- the session rail: every set of the session, in order ---- */
  .mk-rail{position:sticky;top:0;z-index:40;background:linear-gradient(180deg,var(--bg) 72%,transparent);
    padding:10px 0 12px;margin:0 0 4px}
  .mk-rail-h{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:9px}
  .mk-rail-d{font:var(--fs-2) var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
  .mk-rail-n{font:var(--fs-2) var(--mono);color:var(--dim);letter-spacing:.08em}
  .mk-rail-n b{color:var(--text)}
  .mk-marks{display:flex;gap:3px;align-items:flex-end}
  .mk-g{display:flex;gap:2px;padding-right:7px;border-right:1px solid rgba(255,255,255,.07)}
  .mk-g:last-child{border-right:0;padding-right:0}
  .mk-m{width:100%;min-width:5px;height:4px;border-radius:1px;background:rgba(255,255,255,.1)}
  .mk-g{flex:1}
  .mk-m.on{background:var(--acc)}
  .mk-m.live{background:var(--acc);height:10px;box-shadow:0 0 0 2px var(--acc-soft)}

  /* ---- an exercise behind you: one line ---- */
  .mk-done{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--r);
    border:1px solid rgba(255,255,255,.055);background:transparent;margin-bottom:7px;
    width:100%;text-align:left}
  .mk-done-t{font:var(--fs-1) var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ok)}
  .mk-done-n{flex:1;min-width:0;font-size:var(--fs-4);color:var(--dim);white-space:nowrap;
    overflow:hidden;text-overflow:ellipsis}
  .mk-done-v{font:var(--fs-3) var(--mono);color:var(--faint)}

  /* ---- the exercise you are on ---- */
  .mk-now{border:1px solid var(--line);border-radius:var(--r-lg);background:var(--card);
    padding:16px 14px 12px;margin:8px 0 10px;position:relative;overflow:hidden}
  .mk-now::before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--acc)}
  .mk-now-h{display:flex;align-items:flex-start;gap:10px;margin-bottom:3px}
  .mk-now-n{flex:1;font-size:var(--fs-7);font-weight:600;line-height:1.15;letter-spacing:-.01em}
  .mk-now-more{width:34px;height:34px;flex:0 0 auto;border:1px solid var(--line);border-radius:var(--r-sm);
    background:none;color:var(--dim);font-size:var(--fs-5)}
  /* THE ONE LINE THAT SAYS WHAT TO DO NOW. */
  .mk-cue{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin:2px 0 14px;
    font:var(--fs-3) var(--mono);color:var(--faint);letter-spacing:.04em}
  .mk-cue b{font-size:var(--fs-6);color:var(--text);letter-spacing:0}
  .mk-cue .mk-sep{color:rgba(255,255,255,.18)}
  .mk-cue .mk-aim{color:var(--acc)}

  /* ---- a set behind you: a record, not a form ---- */
  .mk-rec{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:10px;
    padding:9px 2px;border:0;border-bottom:1px solid rgba(255,255,255,.05);
    width:100%;text-align:left;background:none;border-radius:0}
  .mk-rec-i{font:var(--fs-2) var(--mono);color:var(--ok)}
  .mk-rec-v{font:var(--fs-4) var(--mono);color:var(--dim);letter-spacing:.02em}
  .mk-rec-v b{color:var(--text);font-weight:500}
  .mk-rec-r{font:var(--fs-2) var(--mono);color:var(--faint)}
  .mk-rec.pr .mk-rec-r{color:var(--acc)}

  /* ---- the set you are on: the only form on the screen ---- */
  .mk-live{display:grid;grid-template-columns:22px 1fr 1fr auto 52px;gap:8px;align-items:center;
    padding:10px 0 12px;position:relative}
  .mk-live::before{content:"";position:absolute;left:-14px;top:0;bottom:0;width:2px;background:var(--acc)}
  .mk-live-i{font:var(--fs-4) var(--mono);color:var(--acc)}
  .mk-f{position:relative}
  .mk-f input{width:100%;height:58px;border-radius:var(--r);border:1px solid var(--line);
    background:var(--card2);color:var(--text);font-family:var(--mono);font-size:var(--fs-8);
    text-align:center;padding:4px 4px 18px}
  .mk-f i{position:absolute;left:0;right:0;bottom:8px;text-align:center;font-style:normal;
    font:var(--fs-1) var(--mono);letter-spacing:.14em;text-transform:uppercase;
    color:var(--faint);pointer-events:none}
  .mk-rpe{height:58px;min-width:62px;border-radius:var(--r);border:1px solid var(--line);
    background:var(--card2);color:var(--text);font:var(--fs-5) var(--mono);display:flex;
    flex-direction:column;align-items:center;justify-content:center;gap:1px}
  .mk-rpe span{font:var(--fs-1) var(--mono);letter-spacing:.12em;color:var(--faint);text-transform:uppercase}
  .mk-ok{height:58px;width:52px;border-radius:var(--r);border:1px solid var(--acc);
    background:var(--acc-soft);color:var(--acc);font-size:var(--fs-7);display:flex;
    align-items:center;justify-content:center}

  /* ---- sets ahead: the prescription, not an empty form ---- */
  .mk-next{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:10px;
    padding:9px 2px;width:100%;text-align:left;background:none;border:0;border-radius:0;opacity:.45}
  .mk-next-i{font:var(--fs-2) var(--mono);color:var(--faint)}
  .mk-next-v{font:var(--fs-3) var(--mono);color:var(--faint)}
  .mk-next-r{font:var(--fs-2) var(--mono);color:var(--faint)}

  /* ---- an exercise ahead: one line ---- */
  .mk-up{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:var(--r);
    border:1px solid rgba(255,255,255,.05);margin-bottom:6px;width:100%;text-align:left;background:none}
  .mk-up-n{flex:1;min-width:0;font-size:var(--fs-4);color:var(--dim);white-space:nowrap;
    overflow:hidden;text-overflow:ellipsis}
  .mk-up-v{font:var(--fs-3) var(--mono);color:var(--faint)}
  .mk-sec{font:var(--fs-1) var(--mono);letter-spacing:.14em;text-transform:uppercase;
    color:var(--faint);margin:16px 0 8px}
  `;
  document.head.appendChild(css);

  const esc2 = s=> String(s == null ? "" : s).replace(/[&<>"]/g, c=>
    ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));

  /* which set is live */
  let liveE = -1, liveS = -1;
  (a.entries || []).forEach((e, ei)=>{
    (e.sets || []).forEach((st, si)=>{
      if(liveE < 0 && !st.done){ liveE = ei; liveS = si; }
    });
  });

  const totalSets = (a.entries||[]).reduce((t,e)=> t + e.sets.length, 0);
  const doneSets = (a.entries||[]).reduce((t,e)=> t + e.sets.filter(s=> s.done).length, 0);

  /* the rail */
  let rail = `<div class="mk-rail"><div class="mk-rail-h">
      <span class="mk-rail-d">${esc2(dayMeta(a.workoutId).name)}</span>
      <span class="mk-rail-n"><b>${doneSets}</b> of ${totalSets} sets</span>
    </div><div class="mk-marks">`;
  (a.entries||[]).forEach((e, ei)=>{
    rail += `<span class="mk-g">` + e.sets.map((st, si)=>
      `<i class="mk-m${st.done ? " on" : (ei===liveE && si===liveS ? " live" : "")}"></i>`).join("") + `</span>`;
  });
  rail += `</div></div>`;

  let h = rail;

  (a.entries || []).forEach((e, ei)=>{
    const done = e.sets.every(s=> s.done);
    const n = e.sets.length;
    if(done){
      const reps = e.sets.map(s=> s.reps).join(",");
      const w = e.sets[0].weight;
      h += `<button class="mk-done"><span class="mk-done-t">done</span>
        <span class="mk-done-n">${esc2(e.name)}</span>
        <span class="mk-done-v">${w ? esc2(w) + " × " : ""}${esc2(reps)}</span></button>`;
      return;
    }
    if(ei !== liveE){
      h += `<button class="mk-up"><span class="mk-up-n">${esc2(e.name)}</span>
        <span class="mk-up-v">${n} × ${esc2(e.reps || "")}</span></button>`;
      return;
    }
    /* the live card */
    const rx = (typeof setPrescription === "function") ? setPrescription(e, liveS) : {};
    const aimW = (typeof planLoadFor === "function") ? planLoadFor(e, liveS) : "";
    const prevW = e.sets[liveS - 1] && e.sets[liveS - 1].weight;
    const load = prevW || aimW || "";
    h += `<div class="mk-now">
      <div class="mk-now-h"><div class="mk-now-n">${esc2(e.name)}</div>
        <button class="mk-now-more">⋯</button></div>
      <div class="mk-cue"><b>${esc2(load)}</b> ${esc2(unit)}
        <span class="mk-sep">/</span> set ${liveS + 1} of ${n}
        <span class="mk-sep">/</span> <span class="mk-aim">${esc2(e.reps || "")} reps</span>
        <span class="mk-sep">/</span> RPE ${esc2(String((e.rpes && e.rpes[liveS]) || 8))}</div>`;
    e.sets.forEach((st, si)=>{
      if(st.done){
        h += `<button class="mk-rec"><span class="mk-rec-i">✓</span>
          <span class="mk-rec-v"><b>${esc2(st.weight)}</b> × <b>${esc2(st.reps)}</b></span>
          <span class="mk-rec-r">@${esc2(st.rpe || "")}</span></button>`;
      } else if(si === liveS){
        h += `<div class="mk-live"><span class="mk-live-i">${si + 1}</span>
          <span class="mk-f"><input value="${esc2(load)}"><i>${esc2(unit)}</i></span>
          <span class="mk-f"><input placeholder="${esc2(String(rx.reps || ""))}"><i>reps</i></span>
          <span class="mk-rpe">8<span>rpe</span></span>
          <span class="mk-ok">✓</span></div>`;
      } else {
        h += `<button class="mk-next"><span class="mk-next-i">${si + 1}</span>
          <span class="mk-next-v">${esc2(load)} × ${esc2(e.reps || "")}</span>
          <span class="mk-next-r">@${esc2(String((e.rpes && e.rpes[si]) || 8))}</span></button>`;
      }
    });
    h += `</div>`;
  });

  document.getElementById("app").innerHTML = h;
  window.scrollTo(0, 0);
});
await shot("A-logger-AFTER");
await p.evaluate(()=> window.scrollTo(0, 700));
await shot("A-logger-AFTER-scrolled");
console.log("errors:", errs.length ? errs.slice(0,3).join(" | ") : "none");
await b.close();
