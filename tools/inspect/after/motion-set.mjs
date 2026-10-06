/* MOTION — WHAT HAPPENS WHEN A SET IS BANKED.

   Five frames, 0ms to 520ms. The point of the sequence is that NOTHING appears from
   nowhere and nothing is replaced: the row you were typing into becomes the record of
   what you did, and the tick you pressed becomes the clock you are now waiting on. */
import { mockPage, LIVE, OUT } from './_mock.mjs';
import { strip } from './_strip.mjs';
import path from 'node:path';
const {b, p, shot, errs} = await mockPage();
await p.evaluate(LIVE, 4);

const BUILD = ()=>{
  const css = document.createElement("style");
  css.id = "mkm";
  css.textContent = `
  #mkm-wrap{padding:0 2px}
  .m-k{font:var(--fs-1) var(--mono);letter-spacing:.16em;text-transform:uppercase;
    color:var(--faint);margin:0 0 12px}
  .m-ex{font-size:var(--fs-7);font-weight:600;margin-bottom:3px}
  .m-cue{font:var(--fs-3) var(--mono);color:var(--faint);margin-bottom:16px}
  .m-cue b{font-size:var(--fs-6);color:var(--text)}
  .m-rec{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:10px;
    padding:9px 2px;border-bottom:1px solid rgba(255,255,255,.05)}
  .m-rec-i{font:var(--fs-2) var(--mono);color:var(--ok)}
  .m-rec-v{font:var(--fs-4) var(--mono);color:var(--dim)}
  .m-rec-v b{color:var(--text);font-weight:500}
  .m-rec-r{font:var(--fs-2) var(--mono);color:var(--faint)}
  .m-live{display:grid;grid-template-columns:22px 1fr 1fr auto 52px;gap:8px;align-items:center;
    padding:10px 0 12px;position:relative;transition:all .22s cubic-bezier(.2,.8,.3,1)}
  .m-live::before{content:"";position:absolute;left:-10px;top:4px;bottom:4px;width:2px;
    background:var(--acc);transition:opacity .2s}
  .m-i{font:var(--fs-4) var(--mono);color:var(--acc)}
  .m-f{position:relative}
  .m-f input{width:100%;height:58px;border-radius:var(--r);border:1px solid var(--line);
    background:var(--card2);color:var(--text);font-family:var(--mono);font-size:var(--fs-8);
    text-align:center;padding:4px 4px 18px;transition:height .22s cubic-bezier(.2,.8,.3,1),
      font-size .22s, background .2s, border-color .2s}
  .m-f i{position:absolute;left:0;right:0;bottom:8px;text-align:center;font-style:normal;
    font:var(--fs-1) var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--faint);
    transition:opacity .14s}
  .m-rpe{height:58px;min-width:62px;border-radius:var(--r);border:1px solid var(--line);
    background:var(--card2);color:var(--text);font:var(--fs-5) var(--mono);display:flex;
    flex-direction:column;align-items:center;justify-content:center;transition:all .22s}
  .m-rpe span{font:var(--fs-1) var(--mono);letter-spacing:.12em;color:var(--faint)}
  .m-ok{height:58px;width:52px;border-radius:var(--r);border:1px solid var(--acc);
    background:var(--acc-soft);color:var(--acc);font-size:var(--fs-7);display:flex;
    align-items:center;justify-content:center;transition:all .26s cubic-bezier(.2,.8,.3,1)}
  /* the sweep that says "banked" */
  .m-sweep{position:absolute;left:-10px;right:0;bottom:0;height:1px;background:var(--acc);
    transform-origin:0 50%;transform:scaleX(0);transition:transform .14s linear}
  .m-next{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:10px;
    padding:9px 2px;opacity:.45;transition:opacity .24s}
  .m-next-i{font:var(--fs-2) var(--mono);color:var(--faint)}
  .m-next-v{font:var(--fs-3) var(--mono);color:var(--faint)}
  /* the tick becoming the clock */
  .m-dial{position:absolute;right:0;width:52px;height:58px;display:flex;align-items:center;
    justify-content:center}
  .m-disc{width:52px;height:52px;border-radius:50%;border:2px solid var(--acc);
    display:flex;align-items:center;justify-content:center;font:var(--fs-2) var(--mono);
    color:var(--acc);transition:all .3s cubic-bezier(.2,.8,.3,1)}
  .m-disc.big{width:200px;height:200px;font-size:38px;border-width:3px}
  `;
  document.head.appendChild(css);
  const app = document.getElementById("app");
  app.innerHTML = `<div id="mkm-wrap">
    <div class="m-k">frame</div>
    <div class="m-ex">Barbell Bench Press</div>
    <div class="m-cue"><b>185</b> lb / set 2 of 4 / 5-8 reps / RPE 8</div>
    <div class="m-rec"><span class="m-rec-i">✓</span>
      <span class="m-rec-v"><b>185</b> × <b>8</b></span><span class="m-rec-r">@7</span></div>
    <div class="m-live" id="mkLive">
      <span class="m-i">2</span>
      <span class="m-f"><input value="185"><i>lb</i></span>
      <span class="m-f"><input value="8"><i>reps</i></span>
      <span class="m-rpe">8<span>RPE</span></span>
      <span class="m-ok" id="mkOk">✓</span>
      <span class="m-sweep" id="mkSweep"></span>
    </div>
    <div class="m-next" id="mkNext"><span class="m-next-i">3</span>
      <span class="m-next-v">185 × 5-8</span><span class="m-next-i">@8</span></div>
    <div class="m-next"><span class="m-next-i">4</span>
      <span class="m-next-v">185 × 5-8</span><span class="m-next-i">@9</span></div>
  </div>`;
  window.scrollTo(0,0);
};

await p.evaluate(BUILD);
await p.waitForTimeout(260);
const frames = [];
const f = async n=>{ const fp = path.join(OUT, "M1-" + n + ".png");
  await p.screenshot({path: fp, clip:{x:0, y:0, width:390, height:560}}); frames.push(fp); };

/* 1 — before: the set you are on is the only form on the screen. */
await f("1");
/* 2 — 0-120ms: the press. The tick takes the colour and the row holds still. */
await p.evaluate(()=>{ const ok = document.getElementById("mkOk");
  ok.style.background = "var(--acc)"; ok.style.color = "#1b1206";
  ok.style.transform = "scale(.97)"; });
await p.waitForTimeout(160);
await f("2");
/* 3 — 120-260ms: the sweep draws under the row, left to right: banked. */
await p.evaluate(()=>{ document.getElementById("mkSweep").style.transform = "scaleX(1)";
  const ok = document.getElementById("mkOk"); ok.style.transform = "none"; });
await p.waitForTimeout(200);
await f("3");
/* 4 — 260-480ms: the row COLLAPSES into its own record. The numbers do not fade and
   reappear — the boxes shrink to the line height and the values stay where they are. */
await p.evaluate(()=>{
  const live = document.getElementById("mkLive");
  live.querySelectorAll(".m-f input").forEach(i=>{ i.style.height = "26px";
    i.style.fontSize = "15px"; i.style.padding = "0"; i.style.background = "transparent";
    i.style.borderColor = "transparent"; });
  live.querySelectorAll(".m-f i").forEach(i=> i.style.opacity = "0");
  const r = live.querySelector(".m-rpe"); r.style.height = "26px"; r.style.minWidth = "40px";
  r.style.background = "transparent"; r.style.borderColor = "transparent";
  r.style.fontSize = "13px";
  live.querySelector(".m-i").style.color = "var(--ok)";
  live.querySelector(".m-i").textContent = "✓";
  live.style.setProperty("--x", "0");
  live.querySelector("::before");
  const nx = document.getElementById("mkNext");
  nx.style.opacity = "1";
  nx.querySelector(".m-next-i").style.color = "var(--acc)";
});
await p.waitForTimeout(300);
await f("4");
/* 5 — 300-600ms, overlapping: the tick you pressed grows into the rest clock, in place.
   Nothing new slides in from an edge; the control you touched becomes the thing you are
   now waiting on. */
await p.evaluate(()=>{
  const ok = document.getElementById("mkOk");
  ok.outerHTML = `<span class="m-dial"><span class="m-disc" id="mkD">✓</span></span>`;
  requestAnimationFrame(()=>{
    const d = document.getElementById("mkD");
    d.classList.add("big"); d.textContent = "1:16";
    d.style.position = "fixed"; d.style.left = "50%"; d.style.top = "54%";
    d.style.marginLeft = "-100px"; d.style.marginTop = "-100px";
    d.style.background = "radial-gradient(circle at 50% 42%,#2a2724 0%,#15140f 100%)";
  });
});
await p.waitForTimeout(600);
await p.screenshot({path: path.join(OUT, "M1-5.png"), clip:{x:0,y:0,width:390,height:560}});
frames.push(path.join(OUT, "M1-5.png"));

await strip(frames,
 ["0ms\nthe only form\non the screen",
  "0-120ms\npress: the tick\ntakes the colour",
  "120-260ms\na rule sweeps\nunder it: banked",
  "260-480ms\nthe row collapses\ninto its record",
  "300-600ms\nthe tick becomes\nthe rest clock"],
 path.join(OUT, "M1-set-completion.png"),
 "MOTION / banking a set  —  nothing appears from nowhere");
console.log("errors:", errs.length ? errs.slice(0,3).join(" | ") : "none");
await b.close();
