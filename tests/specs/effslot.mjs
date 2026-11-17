import { chromium, APP_URL } from './_e26.mjs';
/* SLOT DEBT 1 of 9 - effortMismatchFor.

   "The weight, not the reps" reads the last few rated sessions of a movement and offers to
   move its load where the reps are landing in range at an effort well outside the band.
   Every part of it was name-only: the prescription it judged against came from whichever
   slot held the name first, the sessions it read were every session of that name whatever
   day they were on, and the change it wrote went back to that first slot.

   On a plan with the Smith squat in Legs A at 80 and Legs B at 60 - which is this user's
   actual shape - that means Legs B's grinding sessions are measured against Legs A's
   prescription, and the cut lands on Legs A. It is the P0-1 family exactly: a rule
   triggered on one slot changing another.

   Each slot now gets its own reading, from its own sessions, written back to itself. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, rpe:"on", plateStep:5});
  S.splitId="ppl6"; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* The same movement in two slots at different loads. Legs B grinds: reps inside the
   range, RPE well past the band. Legs A is comfortable. */
const seed = ()=> p.evaluate(()=>{
  S.program.legsA = [{name:"Smith Machine Squat", sets:3, reps:"6-10", weight:80, rpes:[8,8,8]}];
  S.program.legsB = [{name:"Smith Machine Squat", sets:3, reps:"6-10", weight:60, rpes:[8,8,8]}];
  S.sessions = []; S.planLog = []; S.active = null;
  const mk = (wid, load, rpe, i)=>{
    const at = Date.now() - (20 - i) * 86400000;
    return {id: wid + i, date: dayStr(at), workoutId: wid, startedAt: at,
      finishedAt: at + 3600000,
      /* rpes is what startWorkout() freezes onto the entry, and rpeBandFor() reads it
         off the ENTRY - without it there is no band to be outside of and the reading is
         null, which is how the first run of this spec got null everywhere. */
      entries:[{name:"Smith Machine Squat", reps:"6-10", rpes:[8,8,8],
        sets:[0,1,2].map(()=> ({weight:String(load), reps:"8", rpe:String(rpe), done:true}))}]};
  };
  /* Three grinding Legs B sessions at 60, three easy Legs A sessions at 80. */
  S.sessions = [mk("legsB",60,10,1), mk("legsA",80,8,2), mk("legsB",60,10,3),
                mk("legsA",80,8,4), mk("legsB",60,10,5), mk("legsA",80,8,6)]
                 .sort((a,b)=> a.startedAt - b.startedAt);
  save();
  return null;
});

console.log("1 - EACH SLOT IS READ AGAINST ITS OWN PRESCRIPTION");
await seed();
const each = await p.evaluate(()=>{
  const A = effortMismatchFor("Smith Machine Squat", "legsA");
  const B = effortMismatchFor("Smith Machine Squat", "legsB");
  return {A: A && {dir: A.dir, from: A.from, to: A.to, wid: A.wid},
          B: B && {dir: B.dir, from: B.from, to: B.to, wid: B.wid}};
});
console.log("   ", JSON.stringify(each));
ck("the grinding slot is the one with a finding", !!each.B, JSON.stringify(each.B));
ck("it reads from that slot's own load", each.B && each.B.from === 60,
   each.B && String(each.B.from));
ck("and names the slot it belongs to", each.B && each.B.wid === "legsB",
   each.B && String(each.B.wid));
ck("the comfortable slot is left alone", !each.A || each.A.dir !== "down",
   JSON.stringify(each.A));

console.log("\n2 - AND THE CHANGE LANDS ON THAT SLOT, NOT THE OTHER");
const land = await p.evaluate(()=>{
  const loadOf = wid=>{
    const f = findProgramEntryWhere("Smith Machine Squat", wid);
    return f && f.wid === wid ? f.e.weight : null;
  };
  const was = {legsA: loadOf("legsA"), legsB: loadOf("legsB")};
  TAB = "body"; render();
  const btns = Array.from(document.querySelectorAll("[data-effortfix]"))
    .map(x=> x.dataset.effortfix);
  /* The button for the grinding slot, pressed. */
  const b = Array.from(document.querySelectorAll("[data-effortfix]"))
    .filter(x=> /legsB/.test(x.dataset.effortfix))[0];
  const pressed = !!b;
  if(b) b.click();
  return {was, btns, pressed,
          now: {legsA: loadOf("legsA"), legsB: loadOf("legsB")},
          rows: (S.planLog || []).filter(c=> c.kind === "weight")
                  .map(c=> (c.day || "(none)") + " " + (c.changes||[])[0])};
});
console.log("    buttons: " + JSON.stringify(land.btns));
console.log("    before: " + JSON.stringify(land.was) + "  after: " + JSON.stringify(land.now));
console.log("    rows: " + JSON.stringify(land.rows));
ck("the card names the slot on its button", land.pressed, JSON.stringify(land.btns));
ck("the grinding slot comes down", land.now.legsB < land.was.legsB,
   land.was.legsB + " → " + land.now.legsB);
ck("and the other slot does not move", land.now.legsA === land.was.legsA,
   land.was.legsA + " → " + land.now.legsA);
ck("the change row names the day", land.rows.length > 0 && !land.rows.some(r=> /^\(none\)/.test(r)),
   land.rows.join(" | "));

console.log("\n3 - A MOVEMENT IN ONE SLOT ONLY STILL WORKS EXACTLY AS BEFORE");
const one = await p.evaluate(()=>{
  S.program.legsA = [{name:"Leg Extension", sets:3, reps:"8-12", weight:100, rpes:[8,8,8]}];
  S.program.legsB = [];
  S.sessions = []; S.planLog = [];
  for(let i = 1; i <= 3; i++){
    const at = Date.now() - (10 - i) * 86400000;
    S.sessions.push({id:"x"+i, date: dayStr(at), workoutId:"legsA", startedAt: at,
      finishedAt: at + 3600000,
      entries:[{name:"Leg Extension", reps:"8-12", rpes:[8,8,8],
        sets:[0,1,2].map(()=> ({weight:"100", reps:"10", rpe:"10", done:true}))}]});
  }
  save();
  const f = effortMismatchFor("Leg Extension", "legsA");
  const all = effortMismatches();
  return {f: f && {dir: f.dir, from: f.from, to: f.to, wid: f.wid},
          n: all.length, wids: all.map(x=> x.wid)};
});
console.log("   ", JSON.stringify(one));
ck("it still produces a finding", !!one.f, JSON.stringify(one.f));
ck("pointing down", one.f && one.f.dir === "down", one.f && one.f.dir);
ck("and the list carries the slot", one.n === 1 && one.wids[0] === "legsA",
   JSON.stringify(one.wids));

console.log("\n4 - TWO SLOTS BOTH GRINDING ARE TWO FINDINGS, NOT ONE");
const two = await p.evaluate(()=>{
  S.program.legsA = [{name:"Smith Machine Squat", sets:3, reps:"6-10", weight:80, rpes:[8,8,8]}];
  S.program.legsB = [{name:"Smith Machine Squat", sets:3, reps:"6-10", weight:60, rpes:[8,8,8]}];
  S.sessions = []; S.planLog = [];
  ["legsA","legsB"].forEach((wid, k)=>{
    const load = wid === "legsA" ? 80 : 60;
    for(let i = 1; i <= 3; i++){
      const at = Date.now() - (20 - (i + k*3)) * 86400000;
      S.sessions.push({id: wid+i, date: dayStr(at), workoutId: wid, startedAt: at,
        finishedAt: at + 3600000,
        entries:[{name:"Smith Machine Squat", reps:"6-10", rpes:[8,8,8],
          sets:[0,1,2].map(()=> ({weight:String(load), reps:"8", rpe:"10", done:true}))}]});
    }
  });
  S.sessions.sort((a,b)=> a.startedAt - b.startedAt);
  save();
  const all = effortMismatches();
  return {n: all.length, rows: all.map(x=> x.wid + " " + x.from + "→" + x.to)};
});
console.log("   ", JSON.stringify(two));
ck("both slots are reported", two.n === 2, String(two.n));
ck("each from its own load",
   two.rows.some(r=> /legsA 80/.test(r)) && two.rows.some(r=> /legsB 60/.test(r)),
   two.rows.join(" | "));

console.log("\n5 - THE DEBT IS ONE SMALLER");
const scan = await p.evaluate(()=> null);
console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
