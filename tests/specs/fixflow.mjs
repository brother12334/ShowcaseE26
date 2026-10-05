import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1000}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

/* A programme with a real side-delt hole: plenty of pressing and pulling, one small
   lateral raise. The Body tab should flag it, and the sheet should have a plan. */
const setup = ()=> p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=100; S.priorAsked=1; S.deload=null;
  S.splitId=DEFAULT_SPLIT; applySplit();
  S.cycleStart=Date.now()-3*86400e3; S.cycleDone=[]; S.afterDeload=[]; FIX=null;
  /* The stock split, with the side-delt work stripped back to two sets, so side delts are
     the one muscle with a hole and nothing else crowds the list. */
  if(!window.__P0) window.__P0 = JSON.parse(JSON.stringify(S.program));
  S.program = JSON.parse(JSON.stringify(window.__P0));
  let kept = false;
  Object.keys(S.program).forEach(wid=>{
    S.program[wid] = (S.program[wid]||[]).filter(e=>{
      const f = muscleFrac(e.name, "delts_side");
      if(f >= 0.5){ if(kept) return false; kept = true; e.sets = 2; }
      return true;
    });
  });
  /* A logged cycle where the lateral raise happened and little else did for side delts,
     and the cycle is complete, so nothing is still pending to net the shortfall off. */
  S.cycleDone = ROTATION.map((_,i)=>i);
  S.sessions = [0,1,2].map(k=>({id:"s"+k, workoutId:ROTATION[k % ROTATION.length],
    date:new Date(Date.now()-(3-k)*86400e3).toLocaleDateString("en-CA"),
    startedAt:Date.now()-(3-k)*86400e3, finishedAt:Date.now()-(3-k)*86400e3+3600e3, feel:4,
    entries:[{name:"Barbell Bench Press", sets:[{weight:185,reps:8,rpe:9,done:true},
                                                {weight:185,reps:8,rpe:9,done:true}]},
             {name:"Dumbbell Lateral Raise", sets:[{weight:20,reps:14,rpe:9,done:true}]}]}));
  save(); TAB="body"; render();
  const A=bodyAnalysis();
  const i=(A.weak||[]).findIndex(x=> x.muscle==="delts_side");
  const plan={}; [...new Set(ROTATION)].forEach(w=>{ if((S.program[w]||[]).length) plan[w]=S.program[w].map(e=>e.name); });
  return {i, plan, kinds:(A.weak||[]).map(x=>x.muscle+":"+x.kind).join(", ")};
});

console.log("1 - PAGE ONE IS A NUMBER, A SENTENCE AND A BUTTON");
const s0 = await setup();
console.log("     findings: " + s0.kinds);
{
  const r = await p.evaluate((i)=>{
    openOwnFix(i);
    const m = document.getElementById("modal");
    return {big: (m.querySelector(".fx-n b")||{}).textContent,
            cap: (m.querySelector(".fx-n span")||{}).textContent,
            move: (m.querySelector(".fx-move h4")||{}).textContent,
            after: (m.querySelector(".fx-move p")||{}).textContent,
            btn: !!m.querySelector("#fxSee"),
            alts: [...m.querySelectorAll("[data-fxalt]")].map(x=>x.dataset.fxalt),
            modes: m.querySelectorAll("[data-fxm]").length,
            txt: m.innerText.replace(/\s+/g," ").slice(0,90)};
  }, s0.i);
  ck("it opens on the number", /^\d/.test(r.big||""), r.big);
  ck("with what it is against", /sets a cycle/.test(r.cap||""), r.cap);
  ck("one recommendation, as a sentence", /^(Add|Dumbbell|Cable|[A-Z])/.test(r.move||""), r.move);
  ck("and what it lands you at", /Takes you to/.test(r.after||""), r.after);
  ck("one primary button", r.btn, String(r.btn));
  ck("the other routes are rows", r.alts.length>=2 && r.alts.includes("custom"), r.alts.join(","));
  ck("and no mode switcher on page one", r.modes===0, String(r.modes));
  console.log("     " + r.move + " — " + r.after);
}

console.log("2 - PAGE TWO IS THE DAY, WITH THE NEW WORK IN PLACE");
{
  const r = await p.evaluate(()=>{
    document.getElementById("fxSee").click();
    const m = document.getElementById("modal");
    /* The new row is the one carrying the stepper, whatever movement the app picked. */
    const day = [...m.querySelectorAll(".fx-day")].find(d=> d.querySelector(".fx-ex.is-new"))
             || m.querySelector(".fx-day");
    const rows = [...day.querySelectorAll(".fx-ex")].map(x=> x.textContent.replace(/\s+/g," ").trim());
    const newAt = [...day.querySelectorAll(".fx-ex")].findIndex(x=> x.classList.contains("is-new"));
    return {rows, newAt, head:(m.querySelector(".fx-head b")||{}).textContent,
            why:(m.querySelector(".fx-why")||{}).textContent.replace(/\s+/g," ").trim(),
            add: !!m.querySelector("#fxDo"), place: !!m.querySelector("#fxPlace"),
            step: m.querySelectorAll("[data-fxstep]").length};
  });
  console.log("     " + r.head + ": " + r.rows.join(" | "));
  ck("it is headed as the change", r.head==="THE CHANGE", r.head);
  ck("the day is drawn as a running order", r.rows.length>=4, String(r.rows.length));
  ck("the new movement is placed, not appended", r.newAt>-1 && r.newAt !== r.rows.length-1,
     "at "+r.newAt+" of "+r.rows.length);
  ck("it says why it went there", /after|Straight|end of/i.test(r.why), r.why);
  ck("there is a sets stepper on it", r.step>0, String(r.step));
  ck("one button to do it", r.add, String(r.add));
  ck("and a way to move it", r.place, String(r.place));
}

console.log("3 - PAGE THREE IS THE GAPS, WITH THE BEST ONE MARKED");
{
  const r = await p.evaluate(()=>{
    document.getElementById("fxPlace").click();
    const m = document.getElementById("modal");
    const slots = [...m.querySelectorAll("[data-fxslot]")];
    return {head:(m.querySelector(".fx-head b")||{}).textContent,
            n: slots.length,
            best: slots.findIndex(x=> x.classList.contains("best")),
            picked: slots.findIndex(x=> x.classList.contains("picked")),
            why:(m.querySelector(".fx-why")||{}).textContent.replace(/\s+/g," ").trim(),
            done: !!m.querySelector("#fxPlaceDone")};
  });
  ck("it is its own page", r.head==="WHERE IT GOES", r.head);
  ck("every gap is tappable", r.n>=3, String(r.n));
  ck("the app's pick is marked", r.best>-1, String(r.best));
  ck("and is what is selected", r.picked===r.best, r.picked+" vs "+r.best);
  ck("with the reason spelled out", r.why.length>20, r.why.slice(0,80));
  ck("and a way back", r.done, String(r.done));
  console.log("     " + r.why.slice(0,120));
}

console.log("4 - MOVING IT MOVES IT, AND THE CHANGE PAGE AGREES");
{
  const r = await p.evaluate(()=>{
    const slots = [...document.querySelectorAll("[data-fxslot]")];
    slots[0].click();                                    // put it first instead
    const picked = [...document.querySelectorAll("[data-fxslot]")]
      .findIndex(x=> x.classList.contains("picked"));
    document.getElementById("fxPlaceDone").click();
    const m = document.getElementById("modal");
    /* The day the placement page was acting on is the one carrying the new row. */
    const day = [...m.querySelectorAll(".fx-day")].find(d=> d.querySelector(".fx-ex.is-new"));
    const first = day.querySelector(".fx-ex");
    return {picked, firstIsNew: first.classList.contains("is-new"),
            first: first.textContent.replace(/\s+/g," ").trim(),
            why:(m.querySelector(".fx-why")||{}).textContent.trim()};
  });
  ck("the first gap takes the pick", r.picked===0, String(r.picked));
  ck("and the preview shows it first", r.firstIsNew, r.first);
  ck("and says it was your choice", /you put it|Where you put it/i.test(r.why), r.why);
}

console.log("5 - DOING IT WRITES THE PROGRAMME IN THAT ORDER");
{
  const r = await p.evaluate(()=>{
    document.getElementById("fxDo").click();
    const out = {};
    [...new Set(ROTATION)].forEach(w=>{ if((S.program[w]||[]).length) out[w] = S.program[w].map(e=> e.name); });
    return {out, added: window.__added, open: !!document.querySelector("#modalBg.show")};
  });
  const before = s0.plan;
  const grew = Object.keys(r.out).filter(w=> r.out[w].length > (before[w]||[]).length);
  console.log("     " + grew.map(w=> w+": "+r.out[w].join(" | ")).join("   //   "));
  ck("something was added", grew.length>0, JSON.stringify(Object.keys(r.out)));
  ck("in the slot that was chosen",
     grew.some(w=> !(before[w]||[]).includes(r.out[w][0])), grew.map(w=>r.out[w][0]).join(","));
  ck("and the sheet closed", !r.open, String(r.open));
}

console.log("6 - THE OTHER ROUTES GO STRAIGHT TO A PREVIEW TOO");
{
  const s1 = await setup();
  const r = await p.evaluate((i)=>{
    openOwnFix(i);
    const m = document.getElementById("modal");
    const one = m.querySelector('[data-fxalt="one"]');
    if(!one) return {none:true};
    const label = one.textContent.replace(/\s+/g," ").trim();
    one.click();
    const m2 = document.getElementById("modal");
    return {label, head:(m2.querySelector(".fx-head b")||{}).textContent,
            up: !!m2.querySelector(".fx-ex.is-up"),
            rows:[...m2.querySelectorAll(".fx-ex")].map(x=>x.textContent.replace(/\s+/g," ").trim())};
  }, s1.i);
  ck("the row says what it would do", /→|→/.test(r.label||""), r.label);
  ck("and lands on the change page", r.head==="THE CHANGE", r.head);
  ck("with the raised movement marked", r.up, r.rows.join(" | "));
}

console.log("7 - CHOOSE IT ALL MYSELF STILL OPENS THE FULL PANEL");
{
  const s2 = await setup();
  const r = await p.evaluate((i)=>{
    openOwnFix(i);
    document.querySelector('[data-fxalt="custom"]').click();
    const m = document.getElementById("modal");
    return {modes: m.querySelectorAll("[data-fxm]").length,
            back: !!m.querySelector("#fxCustomBack"),
            apply: !!m.querySelector("#fxApply")};
  }, s2.i);
  ck("every mode is still there", r.modes===4, String(r.modes));
  ck("with a way back", r.back, String(r.back));
  ck("and it still applies", r.apply, String(r.apply));
}

console.log("8 - A DELOAD STILL PARKS IT INSTEAD");
{
  const s3 = await setup();
  const r = await p.evaluate((i)=>{
    S.deload={startedAt:Date.now()-2*86400e3, endedAt:null, reason:"manual"}; save();
    openOwnFix(i);
    document.getElementById("fxSee").click();
    const m = document.getElementById("modal");
    const label = (m.querySelector("#fxDo")||{}).textContent;
    const before = JSON.stringify(S.program);
    m.querySelector("#fxDo").click();
    return {label, held: (S.afterDeload||[]).length, untouched: JSON.stringify(S.program)===before,
            note: !!m.querySelector(".fx-held")};
  }, s3.i);
  ck("the button says when", /after the deload/i.test(r.label||""), r.label);
  ck("the deload notice is shown", r.note, String(r.note));
  ck("the plan is parked", r.held===1, String(r.held));
  ck("and the programme is untouched", r.untouched, String(r.untouched));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
