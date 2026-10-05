import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - WHAT COUNTS AS A REST TIME IN A NOTE");
{
  const r = await p.evaluate(()=>{
    const f = t => { const x = restFromNote(t); return x ? x.lo + "/" + x.hi : null; };
    return {
      mins:   f("Elbows tucked. Rest 3 min"),
      range:  f("rest 2-3 min between sets"),
      secs:   f("rest 90s"),
      secs2:  f("90 seconds rest"),
      colon:  f("Rest: 2 min"),
      noWord: f("45 a side, 30 degrees"),
      bare:   f("3 sets of 12"),
      silly:  f("rest 40 min")
    };
  });
  Object.keys(r).forEach(k=> console.log("     " + k.padEnd(7) + " → " + (r[k] || "(nothing)")));
  ck("minutes are read", r.mins==="180/210", r.mins);
  ck("a range is read", r.range==="120/180", r.range);
  ck("seconds are read", r.secs==="90/120", r.secs);
  ck("either word order", r.secs2==="90/120", r.secs2);
  ck("and a colon", r.colon==="120/150", r.colon);
  ck("a note with no rest word is left alone", r.noWord===null, String(r.noWord));
  ck("and neither is a set count", r.bare===null, String(r.bare));
  ck("an absurd figure is ignored", r.silly===null, String(r.silly));
}

console.log("2 - A NOTE THAT DISAGREES WITH THE CLOCK SAYS SO");
{
  const r = await p.evaluate(()=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} hideModal();
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    const el=document.getElementById('preflight'); if(el) el.remove();
    try{PF=null}catch(e){}
    S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
    S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit();
    const wid = ROTATION[0];
    S.program[wid]=[{name:"Barbell Bench Press", sets:3, reps:"8-12", weight:185,
                     note:"Elbows tucked. Rest 3 min between sets"}];
    S.active={date:todayStr(), workoutId:wid, startedAt:Date.now(),
      entries:[{name:"Barbell Bench Press", reps:"8-12", note:"Elbows tucked. Rest 3 min between sets",
                sets:[{weight:"185", reps:"", rpe:"", done:false}]}]};
    save(); TAB="workout"; render();
    const en = S.active.entries[0];
    const c = restNoteConflict(en);
    const line = [...document.querySelectorAll(".ex-insight")]
      .find(x=> /Your note says/.test(x.textContent));
    return {clock: restClockLoFor(en), said: c && c.said.lo,
            txt: line ? line.textContent.replace(/\s+/g," ").trim() : "",
            btn: !!(line && line.querySelector("[data-restnote]"))};
  });
  console.log("     " + r.txt);
  /* M7 gives a multi-joint lift two minutes in the fallback, whatever the rep count, so
     the clock's own number for a bench at 8-12 is 120 rather than 90. */
  ck("the clock was running its own number", r.clock===120, String(r.clock));
  ck("the note says something else", r.said===180, String(r.said));
  ck("and the card shows both", /3:00/.test(r.txt) && /2:00/.test(r.txt), r.txt);
  ck("with one tap to settle it", r.btn, String(r.btn));
}

console.log("3 - ONE TAP MAKES THE CLOCK MATCH, AND IT STICKS");
{
  const r = await p.evaluate(()=>{
    document.querySelector("[data-restnote]").click();
    const en = S.active.entries[0];
    const prog = (S.program[ROTATION[0]]||[])[0];
    return {live: en.rest, prog: prog.rest, clock: restClockLoFor(en),
            gone: !document.querySelector("[data-restnote]")};
  });
  ck("the live entry carries the window", JSON.stringify(r.live)==="[180,210]", JSON.stringify(r.live));
  ck("and so does the programme", JSON.stringify(r.prog)==="[180,210]", JSON.stringify(r.prog));
  ck("the clock now agrees with the note", r.clock===180, String(r.clock));
  ck("and the line is gone", r.gone, String(r.gone));
}

console.log("4 - A NOTE THAT AGREES WITH THE CLOCK SAYS NOTHING");
{
  const r = await p.evaluate(()=>{
    const en = S.active.entries[0];
    en.note = "Elbows tucked. Rest 3 min";     // matches the window just written
    save(); render();
    return {conflict: !!restNoteConflict(en), line: !!document.querySelector("[data-restnote]")};
  });
  ck("no conflict", !r.conflict, String(r.conflict));
  ck("and nothing on the card", !r.line, String(r.line));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
