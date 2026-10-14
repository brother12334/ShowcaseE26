/* A load that counts your bodyweight says what is in your hands, and only the part you
   can actually load gets rounded. */
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
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.expManual="intermediate"; S.priorTrainingWeeks=200;
  S.bodyLog=[{date:todayStr(), w:132.6, at:Date.now()}];
  /* real gear, so rounding has a grid to round to */
  S.prefs = Object.assign({}, S.prefs, {dbStep:5, plateStep:5});
  save();
  window.WID = Object.keys(S.program)[0];
  window.NAME = "Dumbbell Bulgarian Split Squat";
  window.mk = ()=> ({name:NAME, reps:"4-8", rpes:[9,9,9], bwOn:132.6, sets:[0,1,2].map(()=>
    ({weight:"152.6", reps:"8", rpe:"8", done:true}))});
  window.sess = ()=> ({id:"x", date: todayStr(), startedAt: Date.now(), entries:[]});
});
const ev = (fn, arg) => p.evaluate(fn, arg);

console.log("1 - ONLY THE PART YOU CAN LOAD GETS ROUNDED");
{
  const r = await ev(()=>{
    const e = mk();
    return {
      /* 152.6 is you at 132.6 plus 20 in the hands, and this spec used to say a 5 lb step
         lands on 25. It does not: 25 in BOTH hands is 12.5 a hand, and this lifter's
         dumbbells go 10, 15, 20, 25 — there is no pair that makes 25. The original point
         stands and is now made properly, because the assertion below is strictly stronger
         than the one it replaces: the bodyweight is still kept exactly, and the loaded
         part now lands on a pair that exists (30, which is 15 a hand). */
      stepped: roundLoadableOn(e, 157.6, NAME),
      plain:   roundLoadable(157.6, NAME),
      added:   addedLoadOf(e, 157.6),
      none:    addedLoadOf(e, 132.6),
      noBw:    roundLoadableOn({name:"Barbell Bench Press"}, 187.5, "Barbell Bench Press")
    };
  });
  ck("the total keeps your bodyweight exactly", Math.abs(r.stepped - 132.6 - 30) < 0.05,
     String(r.stepped));
  ck("to a pair of dumbbells that exists", Math.abs((r.stepped - 132.6) % 10) < 0.001,
     String(r.stepped - 132.6));
  ck("which the old rounding did not", Math.abs(r.plain - 157.6) > 0.5, String(r.plain));
  ck("and the added part is what moved", r.added === 25, String(r.added));  // unrounded arithmetic, unchanged
  ck("a set with nothing added reads as nothing added", r.none === 0, String(r.none));
  ck("a movement that does not count you is rounded as before",
     r.noBw === 190 || r.noBw === 185, String(r.noBw));
}

console.log("2 - THE RAISE SAYS WHAT TO PICK UP");
{
  const r = await ev(()=>{
    S.program[WID] = [{name:NAME, reps:"4-8", sets:3, rpes:[9,9,9], weight:152.6}];
    S.sessions = [{id:"s0", date: todayStr(), startedAt: Date.now()-7*864e5,
      entries:[{name:NAME, bwOn:132.6, sets:[{weight:"152.6", reps:"6", rpe:"8", done:true}]}]}];
    save();
    const x = progressionFor(sess(), mk());
    return {kind:x.kind, msg:x.msg, to:x.to};
  });
  /* Same two assertions, aimed at the pair that exists rather than the one that does not:
     one step up from 20 in the hands is 30 (15 a hand), not 25. */
  ck("the weight goes up by the step, on the loaded part",
     r.kind === "up" && Math.abs(r.to - 162.6) < 0.05, r.kind + " / " + r.to);
  ck("and the message names what is in your hands",
     /in your hands/.test(r.msg) && /30/.test(r.msg), r.msg);
  ck("it does not say 160", !/160/.test(r.msg), r.msg);
}

console.log("3 - A PLAIN DUMBBELL MOVEMENT SAYS 'A HAND'");
{
  const r = await ev(()=>({
    db:  loadMakeupNote({name:"Dumbbell Bench Press"}, 60),
    kb:  loadMakeupNote({name:"Kettlebell Swing"}, 50),
    bar: loadMakeupNote({name:"Barbell Bench Press"}, 185),
    mach:loadMakeupNote({name:"Leg Press"}, 300),
    bw:  loadMakeupNote({name:"Dumbbell Bulgarian Split Squat", bwOn:132.6}, 157.6)
  }));
  ck("a dumbbell press is per hand", r.db === " a hand", JSON.stringify(r.db));
  ck("so is a kettlebell", r.kb === " a hand", JSON.stringify(r.kb));
  ck("a barbell says nothing — it has a plate line", r.bar === "", JSON.stringify(r.bar));
  ck("and so does a machine", r.mach === "", JSON.stringify(r.mach));
  ck("one that counts you spells it out", /you 132.6 \+ 25 in your hands/.test(r.bw), r.bw);
}

console.log("4 - THE WORKOUT CARD SHOWS THE BREAKDOWN TOO");
{
  const r = await ev(()=>{
    const e = mk();
    const html = plateLineHTML(e);
    const empty = plateLineHTML({name:NAME, bwOn:132.6, sets:[{weight:"132.6", reps:"", rpe:""}]});
    return {txt: html.replace(/<[^>]*>/g, "").trim(),
            none: empty.replace(/<[^>]*>/g, "").trim()};
  });
  ck("it names the total, you, and the dumbbells",
     /152\.6/.test(r.txt) && /you 132\.6/.test(r.txt) && /20 lb in your hands/.test(r.txt), r.txt);
  ck("and says so plainly when there is nothing in your hands",
     /nothing added/.test(r.none), r.none);
}

console.log("5 - A CUT SAYS IT TOO, AND CUTS THE PART YOU CAN TAKE OFF");
{
  const r = await ev(()=>{
    S.program[WID] = [{name:NAME, reps:"8-12", sets:3, rpes:[9,9,9], weight:182.6}];
    S.sessions = [{id:"s0", date: todayStr(), startedAt: Date.now()-7*864e5,
      entries:[{name:NAME, bwOn:132.6, sets:[{weight:"182.6", reps:"9", rpe:"8", done:true}]}]}];
    save();
    const entry = {name:NAME, reps:"8-12", rpes:[9,9,9], bwOn:132.6,
      sets:[{weight:"182.6", reps:"4", rpe:"10", done:true}]};
    const x = progressionFor(sess(), entry);
    return {kind:x.kind, fix: x.detail && x.detail.fix, to: x.detail && x.detail.to};
  });
  ck("the cut is a real one", r.kind === "toohard" && r.to > 132.6 && r.to < 182.6,
     r.kind + " / " + r.to);
  ck("it leaves your bodyweight alone", Math.abs((r.to - 132.6) - Math.round(r.to - 132.6)) < 0.35,
     String(r.to));
  ck("and it says what to hold", /in your hands/.test(r.fix || ""), String(r.fix));
}

console.log("9 - AND THE CARD SAYS WHICH DUMBBELLS TO PICK UP");
{
  /* Reported from the screen: "it doesn't show the dumbbell weight added \u2014 I need to know
     which dumbbells to hold, it just says 160, which is not even possible with my weight
     and the dumbbells I have." The total is you plus BOTH dumbbells, so the only figure
     anybody at the rack can act on is the one written on each of them. */
  const r = await ev(()=>{
    S.program[WID] = [{name:NAME, reps:"4-8", sets:3, rpes:[9,9,9], weight:160}];
    S.sessions = [{id:"s9", date: todayStr(), startedAt: Date.now()-7*864e5,
      entries:[{name:NAME, bwOn:132.6, sets:[{weight:"152.6", reps:"6", rpe:"8", done:true}]}]}];
    save(); if(S.active) S.active=null; startWorkout(WID); PF=null; TAB="workout"; save();
    S.active.entries[0].bwOn = 132.6; render();
    return {say: handLoadSay(NAME, 27.4), pair: handLoadSay(NAME, 30),
            one: handLoadSay("Goblet Squat", 30),
            line: ((document.querySelector('.plate-line')||{}).innerText||"").replace(/\s+/g," ").trim()};
  });
  console.log("   ", JSON.stringify(r));
  ck("an even pair is named per hand", /^15 lb a hand$/.test(r.pair), r.pair);
  ck("an impossible total names the nearest pair you own",
     /a hand/.test(r.say) && /nearest pair/.test(r.say), r.say);
  ck("one dumbbell is not halved", r.one === "", "["+r.one+"]");
  ck("and the card carries it", /a hand/.test(r.line), r.line);
}

console.log("10 - AND THE RAISE MESSAGE SAYS THE PAIR, NOT JUST THE TOTAL");
{
  /* Reported, in these words: "if I had 50s in my hands wouldn't it be a 100 pounds plus
     bodyweight? Or am I logging it wrong?" \u2014 against "you 139.6 + 50 in your hands",
     which meant 25 a hand. They were logging it right; the sentence was vague. */
  const r = await ev(()=>({
    bw:    loadMakeupOf({name:"Dumbbell Bulgarian Split Squat", bwOn:132.6}, 182.6),
    note:  loadMakeupNote({name:"Dumbbell Bulgarian Split Squat", bwOn:132.6}, 182.6),
    belt:  loadMakeupOf({name:"Weighted Dip", bwOn:132.6}, 162.6),
    db:    loadMakeupOf({name:"Dumbbell Curl"}, 30),
    none:  loadMakeupOf({name:"Dumbbell Bulgarian Split Squat", bwOn:132.6}, 132.6)
  }));
  console.log("   ", JSON.stringify(r));
  ck("the total you added is still named", /\+ 50 in your hands/.test(r.bw), r.bw);
  ck("and so is what goes in each hand", /25 lb a hand/.test(r.bw), r.bw);
  ck("the parenthetical carries it too", /a hand\)$/.test(r.note), r.note);
  ck("a belt is not halved", /on the belt/.test(r.belt) && !/a hand/.test(r.belt), r.belt);
  ck("an ordinary dumbbell movement is unchanged", r.db === "a hand", r.db);
  ck("and nothing added still reads as just you", /^just you/.test(r.none), r.none);
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
