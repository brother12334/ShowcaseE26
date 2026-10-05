/* THE EATING PHASE, AND THE TREND THAT SAYS WHETHER IT IS WORKING.

   The app charted bodyweight for years and never said a word about it, because it could
   not: a weight chart with no stated intention is a line, and a line is not feedback.
   GAIN_RATE_PCT_WK sat in the verification doc as an open question for exactly this
   reason — guidance with no screen to live on. This is the screen. */
import { chromium, APP_URL } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open','news-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.seenNews='x'; S.tourDone=true; S.geo='off';
  S.setup={name:"F",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.splitId=DEFAULT_SPLIT; applySplit(); S.priorTrainingWeeks=104; save();
  /* A fortnight of daily weigh-ins drifting at a chosen percent a week. */
  window.__weigh = (startLb, pctPerWeek, days)=>{
    S.bodyLog = {};
    const n = days == null ? 17 : days;
    for(let i = n - 1; i >= 0; i--){
      const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate() - i);
      const weeks = (n - 1 - i) / 7;
      S.bodyLog[dayStr(d.getTime())] = {w: startLb * Math.pow(1 + pctPerWeek/100, weeks)};
    }
    saveQuiet();
  };
  window.__card = ()=>{
    const d = document.createElement("div"); d.innerHTML = trendCardHTML();
    return d.textContent.replace(/\s+/g," ").trim();
  };
});
const ev = (fn,a)=> p.evaluate(fn,a);

console.log("1 - THE RATES ARE THE REFERENCE'S");
{
  const r = await ev(()=> ({g: GAIN_RATE_PCT_WK, l: LOSS_RATE_PCT_WK,
    m: MAINTAIN_BAND_PCT_WK, win: TREND_WINDOW_DAYS, min: TREND_MIN_READINGS,
    phases: Object.keys(EAT_PHASES)}));
  ck("a beginner may gain 0.25-0.5% a week",
     r.g.beginner[0] === 0.25 && r.g.beginner[1] === 0.5, JSON.stringify(r.g.beginner));
  ck("an intermediate less", r.g.intermediate[1] <= r.g.beginner[0] + 0.001,
     JSON.stringify(r.g.intermediate));
  ck("and an advanced lifter least", r.g.advanced[1] <= r.g.intermediate[1],
     JSON.stringify(r.g.advanced));
  ck("the bands never overlap, so a rate means one thing",
     r.g.advanced[1] <= r.g.intermediate[0] + 0.001
       && r.g.intermediate[1] <= r.g.beginner[0] + 0.001, JSON.stringify(r.g));
  ck("losing is a single band", r.l.length === 2 && r.l[0] < r.l[1], JSON.stringify(r.l));
  ck("the window is seven days", r.win === 7, String(r.win));
  ck("and three readings an end, or it is not an average", r.min === 3, String(r.min));
  ck("three phases, no more", r.phases.length === 3
     && r.phases.indexOf("gain") > -1 && r.phases.indexOf("lose") > -1, JSON.stringify(r.phases));
}

console.log("2 - THE TREND IS TWO SEVEN-DAY AVERAGES, NOT TWO READINGS");
{
  const r = await ev(()=>{
    /* A single wild reading in the middle must not move the verdict much: that is the
       entire reason for averaging. Bodyweight swings more in a day than in a fortnight. */
    window.__weigh(180, 0.2);
    const clean = weightTrend().pct;
    const keys = Object.keys(S.bodyLog).sort();
    S.bodyLog[keys[Math.floor(keys.length/2)]] = {w: 188};   // a heavy Friday
    saveQuiet();
    const noisy = weightTrend().pct;
    return {clean, noisy, gap: Math.abs(clean - noisy)};
  });
  ck("one bad weigh-in barely moves the trend", r.gap < 0.45,
     r.clean.toFixed(2) + " -> " + r.noisy.toFixed(2));
}
{
  const r = await ev(()=>{
    window.__weigh(180, 0.2, 4);           // too few at the far end to average
    const t = weightTrend();
    const txt = window.__card();
    return {t, txt};
  });
  ck("too few weigh-ins reports nothing rather than guessing", r.t === null, JSON.stringify(r.t));
  ck("and the card says so plainly", /Not enough weigh-ins|Weigh in a few more/.test(r.txt),
     r.txt.slice(0,120));
  ck("while still offering the phase picker", /Gaining/.test(r.txt) && /Losing/.test(r.txt),
     r.txt.slice(0,120));
}

console.log("3 - THE VERDICT READS THE PHASE AND THE TRAINING AGE");
{
  const r = await ev(()=>{
    const out = {};
    S.eatPhase = "gain";
    S.priorTrainingWeeks = 104;            // intermediate: 0.125-0.25
    window.__weigh(180, 0.19); out.interOk = trendVerdict().k;
    window.__weigh(180, 0.45); out.interFast = trendVerdict().k;
    window.__weigh(180, 0.02); out.interSlow = trendVerdict().k;
    /* The SAME 0.45% a week is correct for a beginner and too fast for an intermediate.
       That is the whole point of keeping the band per training age. */
    S.priorTrainingWeeks = 26;             // beginner: 0.25-0.5
    window.__weigh(180, 0.45); out.beginnerSame = trendVerdict().k;
    S.priorTrainingWeeks = 260;            // advanced: 0.05-0.125
    window.__weigh(180, 0.45); out.advancedSame = trendVerdict().k;
    return out;
  });
  ck("0.19% a week is in range for an intermediate", r.interOk === "ok", r.interOk);
  ck("0.45% is too fast for one", r.interFast === "fast", r.interFast);
  ck("0.02% is too slow", r.interSlow === "slow", r.interSlow);
  ck("THE SAME RATE IS FINE FOR A BEGINNER", r.beginnerSame === "ok", r.beginnerSame);
  ck("and too fast for an advanced lifter", r.advancedSame === "fast", r.advancedSame);
}
{
  const r = await ev(()=>{
    const out = {};
    S.eatPhase = "lose";
    window.__weigh(180, -0.7); out.ok = trendVerdict().k;
    window.__weigh(180, -1.6); out.fast = trendVerdict().k;
    window.__weigh(180, -0.1); out.slow = trendVerdict().k;
    S.eatPhase = "maintain";
    window.__weigh(180, 0.0);  out.flat = trendVerdict().k;
    window.__weigh(180, 0.6);  out.drift = trendVerdict().k;
    return out;
  });
  ck("losing at 0.7% a week is sustainable", r.ok === "ok", r.ok);
  ck("1.6% is too fast to hold muscle through", r.fast === "fast", r.fast);
  ck("0.1% is slower than the band", r.slow === "slow", r.slow);
  ck("flat is holding", r.flat === "ok", r.flat);
  ck("and drifting up is not", r.drift === "fast", r.drift);
}

console.log("4 - WHAT THE CARD ACTUALLY SAYS");
{
  const r = await ev(()=>{
    S.eatPhase = "gain"; S.priorTrainingWeeks = 104;
    window.__weigh(180, 0.45);
    return window.__card();
  });
  ck("it gives the rate as a percent a week", /%\s*a week/.test(r), r.slice(0,160));
  ck("it shows both seven-day averages", /seven-day averages/.test(r), r.slice(0,200));
  ck("it names the range for this training age", /0\.125.*0\.25/.test(r), r.slice(0,260));
  ck("it says what to do about it", /faster than the range/.test(r), r.slice(0,260));
  ck("and the protein range is beside it", /Protein/.test(r) && /g a day/.test(r),
     r.slice(-120));
}

console.log("5 - THE PHASE IS A SETTING, AND IT TRAVELS");
{
  const r = await ev(async ()=>{
    const ok = setEatPhase("lose");
    const bad = setEatPhase("nonsense");
    TAB = "sync"; SET_PAGE = "plan"; render();
    await new Promise(r=> setTimeout(r, 60));
    const btns = document.querySelectorAll("[data-eat]");
    const onNow = Array.from(btns).find(b=> b.classList.contains("on"));
    return {ok, bad, stored: S.eatPhase, read: eatPhase(),
            inSettings: btns.length === 3,
            on: onNow ? onNow.dataset.eat : null,
            backed: BACKUP_FIELDS.indexOf("eatPhase") > -1,
            inBackup: backupObject().eatPhase};
  });
  ck("a real phase is accepted", r.ok === true && r.stored === "lose", JSON.stringify(r));
  ck("nonsense is refused", r.bad === false && r.read === "lose", JSON.stringify(r));
  ck("Settings offers all three", r.inSettings === true, String(r.inSettings));
  ck("with the current one marked", r.on === "lose", String(r.on));
  ck("it is a backup field", r.backed === true, String(r.backed));
  ck("and travels in a backup", r.inBackup === "lose", String(r.inBackup));
}

console.log("6 - THE BUILDER ASKS, AND A SKIP IS NOT AN ANSWER");
{
  const r = await ev(()=>{
    const asked = BUILD_QUESTIONS.indexOf("eat") > -1;
    const d = document.createElement("div");
    BUILD_UI = {step: BUILD_QUESTIONS.indexOf("eat"), answers: Object.assign({}, BUILD_DEFAULTS),
                built: null, choice:"keep", choiceOf:null};
    d.innerHTML = buildStepHTML("eat");
    const skipped = buildAnswers({goal:"muscle"}).eat;
    const kept = buildAnswers({goal:"muscle", eat:"gain"}).eat;
    const junk = buildAnswers({goal:"muscle", eat:"zzz"}).eat;
    return {asked, opts: d.querySelectorAll("[data-buildset='eat']").length,
            text: d.textContent.replace(/\s+/g," ").trim().slice(0,200),
            skipped, kept, junk};
  });
  ck("the builder asks it", r.asked === true, String(r.asked));
  ck("with all three answers", r.opts === 3, String(r.opts));
  ck("and says it is not a calorie tracker", /does not count calories/i.test(r.text),
     r.text.slice(0,160));
  ck("a skipped answer stays null", r.skipped === null, JSON.stringify(r.skipped));
  ck("junk is refused", r.junk === null, JSON.stringify(r.junk));
  ck("an answer is kept", r.kept === "gain", JSON.stringify(r.kept));
}
{
  /* A skipped question must not silently declare that somebody is maintaining. */
  const r = await ev(()=>{
    delete S.eatPhase;
    const before = S.eatPhase;
    const built = buildPlan({goal:"muscle", days:3, minutes:60, gear:"full", trainingWeeks:104});
    /* Mirror what applying a built plan does with the answers. */
    if(EAT_PHASES[built.report.answers.eat]) S.eatPhase = built.report.answers.eat;
    return {before: before === undefined ? null : before,
            after: S.eatPhase === undefined ? null : S.eatPhase,
            reads: eatPhase()};
  });
  ck("building without answering writes nothing", r.after === null, JSON.stringify(r));
  ck("and the app falls back to maintaining rather than inventing a phase",
     r.reads === "maintain", r.reads);
}

console.log("7 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
