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
            addSet: !!(m && m.querySelector("#vfSet")),
            addEx: !!(m && m.querySelector("#vfEx")),
            setLabel: m && m.querySelector("#vfSet") ? m.querySelector("#vfSet").textContent.trim() : ""};
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
    document.getElementById("vfSet").click();
    await new Promise(r=> setTimeout(r, 120));
    /* The one that grew is the one the sheet named; find it by its set count. */
    let grown = null;
    DAYS.forEach(wid=> (S.program[wid]||[]).forEach(e=>{
      if(e.name === "Lat Pulldown" && (parseInt(e.sets,10)||0) === 4) grown = e; }));
    return {was, now: total(), rpes: grown ? (grown.rpes||[]).length : 0,
            sets: grown ? parseInt(grown.sets,10) : 0,
            logged: (S.planLog||[]).length - logWas,
            shut: !document.getElementById("modalBg").classList.contains("show")};
  });
  ck("pressing it adds exactly one set", r.now === r.was + 1, JSON.stringify(r));
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
    return {addSet: !!(m && m.querySelector("#vfSet")),
            addEx: !!(m && m.querySelector("#vfEx")),
            label: m && m.querySelector("#vfEx") ? m.querySelector("#vfEx").textContent.trim() : ""};
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
    return {state: ch && ch.state, addSet: !!(m && m.querySelector("#vfSet")),
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
            cut: !!(m && m.querySelector("#vfCut")),
            label: m && m.querySelector("#vfCut") ? m.querySelector("#vfCut").textContent.trim() : "",
            over: !!(m && m.querySelector(".pf-over")),
            aim: !!(m && m.querySelector(".vf-sci"))};
  });
  ck("the chest really is over its ceiling", r.state === "over", JSON.stringify(r.state));
  ck("the sheet names a number of sets to cut", /Cut \d+ set/.test(r.text), r.text.slice(0,180));
  ck("and what that would leave", /down to about \d/.test(r.text), r.text.slice(0,200));
  ck("there is a button that does it", r.cut === true, r.text.slice(0,240));
  ck("and it names the movement and the count",
     /^Take \d+ sets? off \S/.test(r.label), r.label);
  ck("the bar shows the overshoot rather than just filling up", r.over === true, String(r.over));
  ck("and the reading past the ceiling is on the scale", /NOW/.test(r.text), r.text.slice(0,120));
}
{
  const r = await ev(async ()=>{
    const m = document.getElementById("modal");
    const btn = m.querySelector("#vfCut");
    const want = parseInt(btn.textContent.replace(/[^0-9]/g, ""), 10);
    const name = btn.textContent.replace(/^Take \d+ sets? off /, "").trim();
    const total = ()=> DAYS.reduce((t,wid)=> t + (S.program[wid]||[])
      .filter(e=> e.name === name).reduce((u,e)=> u + (parseInt(e.sets,10)||0), 0), 0);
    const was = total(), logWas = (S.planLog||[]).length;
    btn.click();
    await new Promise(r=> setTimeout(r, 120));
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
    const btn = m && m.querySelector("#vfCut");
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
       /already at its own minimum/.test(r.text), r.text.slice(0,200));
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
  ck("it gives a weekly set range", r.rows.some(x=> /Sets a week/.test(x)), JSON.stringify(r.rows));
  ck("in whole sets, because that is what you count out",
     !r.rows.some(x=> /Sets a week.*\d\.\d/.test(x)), JSON.stringify(r.rows));
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

console.log("9 - NOTHING THREW");
await ev(()=> hideModal());
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
