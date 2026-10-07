/* The plan card as a reading rather than a list of complaints: one row per muscle, the
   two-letter symbol in a square, a bar against the weekly floor, and a sheet behind each
   row that offers the fix instead of only naming the problem. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
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
  S.seenNews='x'; S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
  S.importSrc='built'; delete S.importMeta;
  DAYS.forEach(wid=>{ S.program[wid]=[
    {name:"Barbell Bench Press", sets:4, reps:"6-10", rpes:[7,8,8,9]},
    {name:"Lat Pulldown", sets:3, reps:"8-12", rpes:[7,8,9]}]; });
  save(); TAB='program'; render();
});
const ev = (fn,a)=> p.evaluate(fn,a);

console.log("1 - EVERY MUSCLE GETS A ROW, AND THE ROW IS A READING");
{
  const r = await ev(()=>{
    const d=document.createElement('div'); d.innerHTML=planQualityCardHTML();
    const rows = Array.from(d.querySelectorAll('.pv-r'));
    const q = planQuality(S.program, currentSplit(), {gear:(S.setup||{}).gear});
    return {rows: rows.length, vol: (q.volume||[]).length,
      first: rows[0] ? {sym: rows[0].querySelector('.pv-sq').textContent.trim(),
                        name: rows[0].querySelector('.pv-n').textContent.trim(),
                        val: rows[0].querySelector('.pv-v').textContent.trim(),
                        g: rows[0].dataset.vol,
                        fill: rows[0].querySelector('.pv-f').style.width,
                        mark: !!rows[0].querySelector('.pv-k')} : null,
      states: rows.map(x=> x.className.match(/is-(under|ok|over)/)[1]),
      allButtons: rows.every(x=> x.tagName === "BUTTON")};
  });
  ck("one row per non-optional muscle", r.rows === r.vol && r.rows >= 15, r.rows + " of " + r.vol);
  ck("the row carries the two-letter symbol", /^[A-Z][A-Za-z]$/.test(r.first.sym), r.first.sym);
  ck("and the muscle's full name, so nothing needs decoding",
     r.first.name.length > 3, r.first.name);
  ck("and the reading as sets over the floor", /\d.*\/.*\d/.test(r.first.val), r.first.val);
  ck("the bar has a width", /%$/.test(r.first.fill), r.first.fill);
  ck("and a mark on it for the floor", r.first.mark === true, String(r.first.mark));
  ck("every row is a button", r.allButtons === true, "");
  ck("and states are only the three verdicts",
     r.states.every(x=> ["under","ok","over"].indexOf(x) >= 0), JSON.stringify(r.states.slice(0,5)));
}

console.log("2 - THE STATE MATCHES THE NUMBERS, NOT A SECOND OPINION");
{
  const r = await ev(()=>{
    const q = planQuality(S.program, currentSplit(), {gear:(S.setup||{}).gear});
    return (q.volume||[]).map(x=> ({g:x.g, v:x.v, mev:x.mev, mrv:x.mrv, s:x.state,
      want: x.v + 0.05 < x.mev ? "under" : x.v > x.mrv + 0.05 ? "over" : "ok"}));
  });
  ck("every row's colour follows its own floor and ceiling",
     r.every(x=> x.s === x.want), JSON.stringify(r.filter(x=> x.s !== x.want)));
  ck("the plan under test really does have shortfalls",
     r.filter(x=> x.s === "under").length >= 6, String(r.filter(x=> x.s==="under").length));
}

console.log("3 - THE SYMBOLS ARE DISTINCT");
{
  const r = await ev(()=>{
    const keys = GKEYS.filter(g=> GROUPS[g] && !GROUPS[g].optional);
    const syms = keys.map(groupSym);
    return {syms, uniq: new Set(syms).size, n: keys.length,
      twoChar: syms.every(x=> x.length === 2),
      traps: groupSym("traps"), triceps: groupSym("triceps")};
  });
  ck("no two muscles share a symbol", r.uniq === r.n, JSON.stringify(r.syms));
  ck("each is two characters", r.twoChar === true, JSON.stringify(r.syms));
  ck("traps and triceps do not collide", r.traps !== r.triceps, r.traps + " / " + r.triceps);
}

console.log("4 - TAPPING A SHORT MUSCLE OFFERS THE FIX");
{
  const r = await ev(async ()=>{
    /* Mid back is short (4.8 of 10) AND the pulldown already trains it, so there is a
       movement for the extra set to go on. */
    openVolFix("upper_back");
    await new Promise(r=> setTimeout(r, 60));
    const m = document.getElementById("modal");
    return {open: !!m, text: m ? m.textContent.replace(/\s+/g," ").trim() : "",
            addSet: !!(m && m.querySelector('[data-volpick="add"]')),
            addEx: !!(m && m.querySelector('[data-volpick="ex"]')),
            setLabel: m && m.querySelector('[data-volpick="add"]') ? m.querySelector('[data-volpick="add"] b').textContent.trim() : ""};
  });
  ck("the sheet opens", r.open === true, "");
  ck("it says what the muscle gets", /sets a week/.test(r.text), r.text.slice(0,160));
  ck("it offers one more set", r.addSet === true, r.text.slice(0,200));
  ck("and names the movement it would go on", /Lat Pulldown/.test(r.setLabel), r.setLabel);
  ck("with adding a movement as the other way", r.addEx === true, "");
}
{
  const r = await ev(async ()=>{
    const total = ()=> DAYS.reduce((t,wid)=> t + (S.program[wid]||[])
      .filter(e=> e.name === "Lat Pulldown")
      .reduce((u,e)=> u + (parseInt(e.sets,10)||0), 0), 0);
    const was = total();
    const logWas = (S.planLog||[]).length;
    const opt = document.querySelector(String.raw`[data-volpick="add"]`);
    const offered = parseInt(opt.querySelector("b").textContent.replace(/[^0-9]/g, ""), 10);
    opt.click();
    await new Promise(r=> setTimeout(r, 120));
    /* The one that grew is the one the sheet named; find it by its set count. */
    let grown = null;
    DAYS.forEach(wid=> (S.program[wid]||[]).forEach(e=>{
      if(e.name === "Lat Pulldown" && (parseInt(e.sets,10)||0) === 4) grown = e; }));
    return {was, offered, now: total(), rpes: grown ? (grown.rpes||[]).length : 0,
            sets: grown ? parseInt(grown.sets,10) : 0,
            logged: (S.planLog||[]).length - logWas,
            shut: !document.getElementById("modalBg").classList.contains("show")};
  });
  ck("pressing it adds exactly the sets it offered", r.now === r.was + r.offered,
     JSON.stringify(r));
  ck("the effort ramp grows with it", r.rpes === r.sets, JSON.stringify(r));
  ck("the change goes in the plan history", r.logged === 1, JSON.stringify(r));
  ck("and the sheet closes", r.shut === true, JSON.stringify(r));
}

console.log("5 - A MUSCLE NOTHING TRAINS OFFERS THE ONE THING THAT WOULD HELP");
{
  const r = await ev(async ()=>{
    hideModal();
    openVolFix("calves");          // nothing in this plan touches calves
    await new Promise(r=> setTimeout(r, 60));
    const m = document.getElementById("modal");
    return {addSet: !!(m && m.querySelector('[data-volpick="add"]')),
            addEx: !!(m && m.querySelector('[data-volpick="ex"]')),
            label: m && m.querySelector('[data-volpick="ex"]') ? m.querySelector('[data-volpick="ex"] b').textContent.trim() : ""};
  });
  ck("no set is offered, because there is nothing to add one to", r.addSet === false, "");
  ck("adding a movement is offered", r.addEx === true, "");
  ck("and it does not say \"instead\" of nothing", !/instead/i.test(r.label), r.label);
}

console.log("6 - A MUSCLE IN RANGE IS NOT NAGGED");
{
  const r = await ev(async ()=>{
    hideModal();
    /* Push the chest well inside its range first. */
    S.program[DAYS[0]] = [{name:"Barbell Bench Press", sets:6, reps:"6-10", rpes:[7,8,8,9,9,9]}];
    S.program[DAYS[1]] = [{name:"Barbell Bench Press", sets:6, reps:"6-10", rpes:[7,8,8,9,9,9]}];
    saveQuiet();
    const q = planQuality(S.program, currentSplit(), {gear:(S.setup||{}).gear});
    const ch = (q.volume||[]).find(x=> x.g === "chest");
    openVolFix("chest");
    await new Promise(r=> setTimeout(r, 60));
    const m = document.getElementById("modal");
    return {state: ch && ch.state, addSet: !!(m && m.querySelector('[data-volpick="add"]')),
            text: m ? m.textContent.replace(/\s+/g," ") : ""};
  });
  ck("the chest is in range now", r.state === "ok", JSON.stringify(r.state));
  ck("no fix is pushed at it", r.addSet === false, r.text.slice(0,160));
  ck("and it says so plainly", /[Nn]othing needs doing/.test(r.text), r.text.slice(0,220));
}

/* A SHEET THAT ONLY DIAGNOSES IS A SHEET YOU LEARN TO CLOSE. The over case used to say
   "taking some off will make the rest work better" and offer a single Done button: no
   number, no target, and nothing to press. */
console.log("7 - BEING OVER THE CEILING IS AS ACTIONABLE AS BEING UNDER IT");
{
  const r = await ev(async ()=>{
    hideModal();
    /* Pile the chest well past its ceiling across two days. */
    S.program[DAYS[0]] = [{name:"Barbell Bench Press", sets:5, reps:"6-10", rpes:[7,8,8,9,9]},
                          {name:"Incline Dumbbell Bench Press", sets:4, reps:"8-12", rpes:[7,8,8,9]},
                          {name:"Cable Fly", sets:3, reps:"10-15", rpes:[8,9,9]}];
    S.program[DAYS[1]] = [{name:"Barbell Bench Press", sets:5, reps:"6-10", rpes:[7,8,8,9,9]},
                          {name:"Cable Fly", sets:3, reps:"10-15", rpes:[8,9,9]}];
    saveQuiet();
    const q = planQuality(S.program, currentSplit(), {gear:(S.setup||{}).gear});
    const ch = (q.volume || []).find(v=> v.g === "chest");
    openVolFix("chest");
    await new Promise(r=> setTimeout(r, 60));
    const m = document.getElementById("modal");
    return {state: ch && ch.state, v: ch && ch.v, mrv: ch && ch.mrv,
            text: m ? m.textContent.replace(/\s+/g," ").trim() : "",
            cut: !!(m && m.querySelector('[data-volpick="cut"]')),
            label: m && m.querySelector('[data-volpick="cut"]') ? m.querySelector('[data-volpick="cut"] b').textContent.trim() : "",
            over: !!(m && m.querySelector(".pf-over")),
            aim: !!(m && m.querySelector(".vf-sci"))};
  });
  ck("the chest really is over its ceiling", r.state === "over", JSON.stringify(r.state));
  /* THE VERDICT DEPENDS ON WHETHER THE BODY HAS SAID ANYTHING.

     This used to assert "Cut N sets" unconditionally. Over the ceiling is now amber
     until the per-cycle verdict reports soreness outlasting the recovery window, joint
     pain on the muscle's own lifts, or a lift falling two cycles running \u2014 because the
     ceiling is an estimate scaled off a published table, and calling an estimate a
     failure on a plan somebody may be running perfectly well claims more than it knows.
     The fixture here has no logged cycles at all, so there is no signal and this is the
     amber path. The red path is section 7b below, and volfix.mjs drives both. */
  ck("it says what being over the ceiling costs", /cost more recovery than they return/.test(r.text),
     r.text.slice(0,200));
  ck("and names the cut that would clear it", /Cutting \d+ set/.test(r.text), r.text.slice(0,240));
  ck("without claiming the sets are doing nothing",
     !/not making this muscle grow faster/.test(r.text), "");
  ck("there is a button that does it", r.cut === true, r.text.slice(0,240));
  ck("and it names the movement and the count",
     /^Take \d+ sets? off \S/.test(r.label), r.label);
  ck("the bar shows the overshoot rather than just filling up", r.over === true, String(r.over));
  ck("and the reading past the ceiling is on the scale", /NOW/.test(r.text), r.text.slice(0,120));
}
{
  const r = await ev(async ()=>{
    const m = document.getElementById("modal");
    const btn = m.querySelector('[data-volpick="cut"] b');
    const want = parseInt(btn.textContent.replace(/[^0-9]/g, ""), 10);
    const name = btn.textContent.replace(/^Take \d+ sets? off /, "").trim();
    const row = m.querySelector('[data-volpick="cut"]');
    const total = ()=> DAYS.reduce((t,wid)=> t + (S.program[wid]||[])
      .filter(e=> e.name === name).reduce((u,e)=> u + (parseInt(e.sets,10)||0), 0), 0);
    const was = total(), logWas = (S.planLog||[]).length;
    row.click();
    await new Promise(r=> setTimeout(r, 150));
    const q = planQuality(S.program, currentSplit(), {gear:(S.setup||{}).gear});
    const ch = (q.volume || []).find(v=> v.g === "chest");
    return {want, name, was, now: total(), logged: (S.planLog||[]).length - logWas,
            closer: ch && ch.v};
  });
  ck("pressing it takes exactly the sets it offered", r.now === r.was - r.want,
     JSON.stringify(r));
  ck("the button never promises more than one movement can give",
     r.want > 0 && r.now >= 1, JSON.stringify(r));
  ck("and it goes in the plan history", r.logged === 1, JSON.stringify(r));
}
{
  /* The promise has to hold when the movement is already near its floor: the old label
     was computed from the muscle's weekly total and would have offered five sets off a
     five-set exercise. */
  const r = await ev(async ()=>{
    hideModal();
    DAYS.forEach(w=>{ S.program[w] = []; });
    const two = n=> ({name:n, sets:2, reps:"10-15", rpes:[8,9], slotKind:"iso"});
    S.program[DAYS[0]] = [two("Cable Fly"), two("Pec Deck"), two("Dumbbell Fly"),
                          two("Machine Chest Fly"), two("Incline Dumbbell Fly"),
                          two("Flat Dumbbell Fly")];
    S.program[DAYS[1]] = [two("Cable Crossover"), two("Low-to-High Cable Fly"),
                          two("High-to-Low Cable Fly"), two("Mid Cable Fly (on bench)"),
                          two("Svend Press"), two("Deficit Push-Up")];
    saveQuiet();
    openVolFix("chest");
    await new Promise(r=> setTimeout(r, 60));
    const m = document.getElementById("modal");
    const btn = m && m.querySelector('[data-volpick="cut"] b');
    const offered = btn ? parseInt(btn.textContent.replace(/[^0-9]/g,""), 10) : 0;
    if(btn){
      const name = btn.textContent.replace(/^Take \d+ sets? off /, "").trim();
      const total = ()=> DAYS.reduce((t,wid)=> t + (S.program[wid]||[])
        .filter(e=> e.name === name).reduce((u,e)=> u + (parseInt(e.sets,10)||0), 0), 0);
      const was = total();
      btn.click();
      await new Promise(r=> setTimeout(r, 120));
      return {btn:true, offered, was, now: total()};
    }
    return {btn:false, text: m ? m.textContent.replace(/\s+/g," ") : ""};
  });
  if(r.btn){
    ck("near the floor it offers only what it can take", r.now === r.was - r.offered,
       JSON.stringify(r));
  } else {
    ck("with nothing left to trim it says so instead of offering a button",
       /already at (its own|its) minimum/.test(r.text), r.text.slice(0,200));
  }
}

console.log("8 - THE SHEET SAYS WHAT TO AIM FOR, NOT ONLY WHAT IS WRONG");
{
  const r = await ev(async ()=>{
    hideModal();
    DAYS.forEach(w=>{ S.program[w] = []; });
    S.program[DAYS[0]] = [{name:"Barbell Bench Press", sets:3, reps:"6-10", rpes:[7,8,9]}];
    saveQuiet();
    openVolFix("chest");
    await new Promise(r=> setTimeout(r, 60));
    const m = document.getElementById("modal");
    const rows = Array.from(m.querySelectorAll(".vf-row")).map(x=>
      x.textContent.replace(/\s+/g," ").trim());
    return {rows, text: m.textContent.replace(/\s+/g," ").trim(),
            terms: Array.from(m.querySelectorAll("[data-term]")).map(x=> x.dataset.term)};
  });
  /* THREE NUMBERS, NAMED, INSTEAD OF A RANGE WITH NO EXPLANATION.

     This asked for one "Sets a week 4\u201312" row. The bar above it was labelled 4 MIN and
     13.9 MAX at the same time, so the sheet showed two different pairs of numbers for the
     same muscle and explained neither gap. The table and the bar now use the same three
     figures in the same words: minimum, target, ceiling. */
  ck("it names the minimum", r.rows.some(x=> /Minimum/i.test(x)), JSON.stringify(r.rows));
  ck("the target", r.rows.some(x=> /Target/i.test(x)), JSON.stringify(r.rows));
  ck("and the ceiling", r.rows.some(x=> /Ceiling/i.test(x)), JSON.stringify(r.rows));
  ck("and the bar overhead is labelled with the same three",
     /MIN/.test(r.text) && /TARGET/.test(r.text) && /CEILING/.test(r.text), r.text.slice(0,140));
  ck("it says to spread them over two days or more",
     r.rows.some(x=> /Spread over/.test(x) && /2/.test(x)), JSON.stringify(r.rows));
  ck("it gives a rep range", r.rows.some(x=> /Reps/.test(x) && /6/.test(x)), JSON.stringify(r.rows));
  ck("and how close to failure, matching the block's own ramp",
     r.rows.some(x=> /failure/i.test(x) && /reps left/.test(x)), JSON.stringify(r.rows));
  ck("it explains that more is not simply better",
     /gain per set shrinks/.test(r.text), r.text.slice(-260));
  ck("and links the term rather than assuming it", r.terms.indexOf("mrv") > -1,
     JSON.stringify(r.terms));
}

/* THE APP KNOWS WHICH MOVEMENT CARRIES THE MOST SETS. It does not know that Thursday is
   the day you are rushed, that the cable station is always busy, or that you are pushing
   your chest on purpose this block. So the one-tap answer is the default and not the
   only option. */
console.log("9 - THE SHEET OFFERS A CHOICE, NOT A PRESCRIPTION");
{
  const r = await ev(async ()=>{
    hideModal();
    DAYS.forEach(w=>{ S.program[w] = []; });
    S.program[DAYS[0]] = [{name:"Barbell Bench Press", sets:5, reps:"6-10", rpes:[7,8,8,9,9]},
                          {name:"Incline Dumbbell Bench Press", sets:4, reps:"8-12", rpes:[7,8,8,9]},
                          {name:"Cable Fly", sets:3, reps:"10-15", rpes:[8,9,9]}];
    S.program[DAYS[1]] = [{name:"Barbell Bench Press", sets:5, reps:"6-10", rpes:[7,8,8,9,9]},
                          {name:"Incline Dumbbell Bench Press", sets:4, reps:"8-12", rpes:[7,8,8,9]},
                          {name:"Cable Fly", sets:3, reps:"10-15", rpes:[8,9,9]}];
    saveQuiet();
    openVolFix("chest");
    await new Promise(r=> setTimeout(r, 60));
    const m = document.getElementById("modal");
    const opts = Array.from(m.querySelectorAll("[data-volpick]"));
    return {keys: opts.map(b=> b.dataset.volpick),
            titles: opts.map(b=> b.querySelector("b").textContent.trim()),
            subs: opts.map(b=> (b.querySelector("span span") || {}).textContent || ""),
            primary: opts.filter(b=> b.classList.contains("on")).map(b=> b.dataset.volpick),
            heading: (m.querySelector(".vf-pick-k") || {}).textContent || ""};
  });
  ck("it asks rather than tells", /what would you like to do/i.test(r.heading), r.heading);
  ck("there is more than one way to go", r.keys.length >= 4, JSON.stringify(r.keys));
  ck("the one-tap cut is offered", r.keys.indexOf("cut") > -1, JSON.stringify(r.keys));
  ck("and is the default", r.primary.length === 1 && r.primary[0] === "cut",
     JSON.stringify(r.primary));
  ck("spreading it is offered", r.keys.indexOf("spread") > -1, JSON.stringify(r.keys));
  ck("so is choosing by hand", r.keys.indexOf("pick") > -1, JSON.stringify(r.keys));
  ck("and so is doing nothing", r.keys.indexOf("leave") > -1, JSON.stringify(r.keys));
  ck("every option says what it will do", r.subs.every(x=> x.length > 15),
     JSON.stringify(r.subs));
  ck("and leaving it is not framed as a mistake",
     /on purpose/.test(r.subs[r.keys.indexOf("leave")] || ""), r.subs[r.keys.indexOf("leave")]);
}
{
  /* A muscle nothing trains cannot be spread over, trimmed, or hand-set, so those are
     not offered. An option list that offers impossible options is worse than a button. */
  const r = await ev(async ()=>{
    hideModal();
    DAYS.forEach(w=>{ S.program[w] = [{name:"Lat Pulldown", sets:3, reps:"8-12", rpes:[7,8,9]}]; });
    saveQuiet();
    openVolFix("chest");
    await new Promise(r=> setTimeout(r, 60));
    return Array.from(document.querySelectorAll("[data-volpick]")).map(b=> b.dataset.volpick);
  });
  ck("with nothing training it, only adding a movement is offered",
     r.indexOf("ex") > -1 && r.indexOf("cut") < 0 && r.indexOf("spread") < 0
       && r.indexOf("pick") < 0, JSON.stringify(r));
  ck("and leaving it alone", r.indexOf("leave") > -1, JSON.stringify(r));
}

console.log("10 - SPREADING, LEAVING, AND SETTING IT YOURSELF");
{
  const over = ()=> ev(()=>{
    DAYS.forEach(w=>{ S.program[w] = []; });
    S.program[DAYS[0]] = [{name:"Barbell Bench Press", sets:5, reps:"6-10", rpes:[7,8,8,9,9]},
                          {name:"Incline Dumbbell Bench Press", sets:4, reps:"8-12", rpes:[7,8,8,9]},
                          {name:"Cable Fly", sets:3, reps:"10-15", rpes:[8,9,9]}];
    S.program[DAYS[1]] = [{name:"Barbell Bench Press", sets:5, reps:"6-10", rpes:[7,8,8,9,9]},
                          {name:"Incline Dumbbell Bench Press", sets:4, reps:"8-12", rpes:[7,8,8,9]},
                          {name:"Cable Fly", sets:3, reps:"10-15", rpes:[8,9,9]}];
    saveQuiet();
  });
  const chest = ()=> ev(()=>{
    const q = planQuality(S.program, currentSplit(), {gear:(S.setup||{}).gear});
    const c = (q.volume || []).find(z=> z.g === "chest");
    return {v: c.v, state: c.state, mrv: c.mrv};
  });
  await over();
  const b4 = await chest();
  const r = await ev(async ()=>{
    hideModal(); openVolFix("chest");
    await new Promise(r=> setTimeout(r, 60));
    const logWas = (S.planLog || []).length;
    document.querySelector('[data-volpick="spread"]').click();
    await new Promise(r=> setTimeout(r, 200));
    const sets = DAYS.reduce((t, w)=> t.concat((S.program[w]||[])
      .filter(e=> muscleFrac(e.name,"chest") >= DIRECT_SHARE)
      .map(e=> parseInt(e.sets,10)||0)), []);
    return {logged: (S.planLog||[]).length - logWas, sets};
  });
  const after = await chest();
  ck("spreading brings it back inside the range", after.state === "ok",
     b4.v + " -> " + after.v + " (" + after.state + ")");
  ck("and it came off more than one movement",
     new Set(r.sets).size > 1 || r.sets.length > 1, JSON.stringify(r.sets));
  ck("recorded as one entry in the plan history", r.logged === 1, String(r.logged));
}
{
  await ev(()=>{
    DAYS.forEach(w=>{ S.program[w] = []; });
    [DAYS[0], DAYS[1]].forEach(w=>{ S.program[w] = [
      {name:"Barbell Bench Press", sets:5, reps:"6-10", rpes:[7,8,8,9,9]},
      {name:"Incline Dumbbell Bench Press", sets:4, reps:"8-12", rpes:[7,8,8,9]},
      {name:"Cable Fly", sets:3, reps:"10-15", rpes:[8,9,9]}]; });
    saveQuiet();
  });
  const r = await ev(async ()=>{
    hideModal(); openVolFix("chest");
    await new Promise(r=> setTimeout(r, 60));
    const before = JSON.stringify(S.program);
    const logWas = (S.planLog || []).length;
    document.querySelector('[data-volpick="leave"]').click();
    await new Promise(r=> setTimeout(r, 120));
    return {same: JSON.stringify(S.program) === before,
            logged: (S.planLog||[]).length - logWas,
            shut: !document.getElementById("modalBg").classList.contains("show")};
  });
  ck("LEAVING IT CHANGES NOTHING AT ALL", r.same === true, JSON.stringify(r));
  ck("and is not written into the plan history either", r.logged === 0, String(r.logged));
  ck("the sheet just closes", r.shut === true, String(r.shut));
}
{
  /* The hand-set screen: a live total, nothing written until Apply, and a movement taken
     to zero removed — which is the one thing the one-tap buttons cannot do. */
  const r = await ev(async ()=>{
    hideModal();
    DAYS.forEach(w=>{ S.program[w] = []; });
    S.program[DAYS[0]] = [{name:"Barbell Bench Press", sets:5, reps:"6-10", rpes:[7,8,8,9,9]},
                          {name:"Cable Fly", sets:3, reps:"10-15", rpes:[8,9,9]}];
    S.program[DAYS[1]] = [{name:"Barbell Bench Press", sets:5, reps:"6-10", rpes:[7,8,8,9,9]},
                          {name:"Cable Fly", sets:3, reps:"10-15", rpes:[8,9,9]}];
    saveQuiet();
    const before = JSON.stringify(S.program);
    openVolAdjust("chest");
    await new Promise(r=> setTimeout(r, 60));
    const rows = document.querySelectorAll(".va-row").length;
    const t0 = document.querySelector(".va-tot-v").textContent.trim();
    document.querySelector('[data-vdir="-1"]').click();
    await new Promise(r=> setTimeout(r, 60));
    const t1 = document.querySelector(".va-tot-v").textContent.trim();
    return {rows, t0, t1, untouched: JSON.stringify(S.program) === before,
            moved: !!document.querySelector(".va-v.is-moved")};
  });
  ck("every movement training it gets a row", r.rows === 4, String(r.rows));
  ck("the weekly total is live", r.t0 !== r.t1, r.t0 + " -> " + r.t1);
  ck("the changed row is marked", r.moved === true, String(r.moved));
  ck("AND NOTHING IS WRITTEN UNTIL APPLY", r.untouched === true, String(r.untouched));
}
{
  const r = await ev(async ()=>{
    const back = document.querySelector("#vaBack");
    const before = JSON.stringify(S.program);
    back.click();
    await new Promise(r=> setTimeout(r, 80));
    return {same: JSON.stringify(S.program) === before,
            backOnChoices: !!document.querySelector("[data-volpick]"),
            cleared: VOL_ADJ === null};
  });
  ck("Back discards the sketch", r.same === true, String(r.same));
  ck("and returns to the choices", r.backOnChoices === true, String(r.backOnChoices));
  ck("with nothing left half-edited", r.cleared === true, String(r.cleared));
}
{
  const r = await ev(async ()=>{
    hideModal();
    openVolAdjust("chest");
    await new Promise(r=> setTimeout(r, 60));
    Object.keys(VOL_ADJ.want).forEach(k=>{
      const [wid, ei] = k.split("|");
      const e = (S.program[wid] || [])[parseInt(ei, 10)];
      if(e && e.name === "Cable Fly") VOL_ADJ.want[k] = 0;
    });
    renderVolAdjust();
    await new Promise(r=> setTimeout(r, 60));
    const warned = /removed from the day/.test(document.getElementById("modal").textContent);
    const nBefore = DAYS.reduce((t, w)=> t + (S.program[w]||[]).length, 0);
    const logWas = (S.planLog||[]).length;
    document.querySelector("#vaApply").click();
    await new Promise(r=> setTimeout(r, 200));
    return {warned, nBefore, nAfter: DAYS.reduce((t, w)=> t + (S.program[w]||[]).length, 0),
            flies: DAYS.reduce((t, w)=> t + (S.program[w]||[]).filter(e=> e.name === "Cable Fly").length, 0),
            logged: (S.planLog||[]).length - logWas,
            cleared: VOL_ADJ === null};
  });
  ck("it says a movement at zero will be removed", r.warned === true, String(r.warned));
  ck("and applying removes it", r.flies === 0 && r.nAfter === r.nBefore - 2,
     JSON.stringify(r));
  ck("recorded once in the plan history", r.logged === 1, String(r.logged));
  ck("and the editor is closed down", r.cleared === true, String(r.cleared));
}

console.log("11 - NOTHING THREW");
await ev(()=> hideModal());
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
