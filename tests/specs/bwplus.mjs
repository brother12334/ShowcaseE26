import { chromium, APP_URL } from './_e26.mjs';
/* "INSTEAD OF IN BODYWEIGHT EXERCISES IT SAYING FULL WEIGHT IN POUNDS JUST SAY bw+(weight)."

   The log stores the whole load — you plus what is in your hands — and that is right: it
   is the load the leg is under and every calculation depends on it. It is a poor thing to
   READ. "159.6 lb" changes the day you weigh yourself and buries the only part you chose.
   So the number is unchanged and the way it is spoken is not. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, dbStep:2.5, plateStep:2.5});
  S.bodyLog = {[todayStr()]: {w:139.6}};
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const ev = (fn,a)=> p.evaluate(fn,a);

console.log("1 - THE NOTATION ITSELF");
{
  const r = await ev(()=>({
    plus: bwLoadText(139.6, 159.6),
    unit: bwLoadText(139.6, 159.6, true),
    none: bwLoadText(139.6, 139.6),
    tiny: bwLoadText(139.6, 139.62),
    minus: bwLoadText(139.6, 134.6),
    tenth: bwLoadText(139.6, 159.65)
  }));
  console.log("   ", JSON.stringify(r));
  ck("added load reads as bw+", r.plus === "bw+20", r.plus);
  ck("with the unit when the sentence needs one", r.unit === "bw+20 lb", r.unit);
  ck("nothing added is just bw", r.none === "bw", r.none);
  ck("and a rounding crumb is still just bw", r.tiny === "bw", r.tiny);
  ck("an assisted load reads as bw minus", /^bw−5$/.test(r.minus), r.minus);
  ck("tenths survive", r.tenth === "bw+20.1" || r.tenth === "bw+20.05", r.tenth);
}

console.log("\n2 - A SET IS SPOKEN THAT WAY WHEREVER THE ENTRY IS KNOWN");
{
  const r = await ev(()=>{
    const e = {name:"Dumbbell Bulgarian Split Squat", bwOn:139.6,
               sets:[{weight:"159.6", reps:"10", rpe:"8", done:true}]};
    const plain = {name:"Barbell Bench Press",
                   sets:[{weight:"185", reps:"8", rpe:"8", done:true}]};
    return {bwLong: fmtSet(e.sets[0], e), bwShort: fmtSetShort(e.sets[0], e),
            plainLong: fmtSet(plain.sets[0], plain), plainShort: fmtSetShort(plain.sets[0], plain),
            noEntry: fmtSet(e.sets[0]), list: setListHTML(e).replace(/<[^>]*>/g,"")};
  });
  console.log("   ", JSON.stringify(r));
  ck("the long form says bw+20", /^bw\+20×10/.test(r.bwLong), r.bwLong);
  ck("and the short form too", /^bw\+20×10/.test(r.bwShort), r.bwShort);
  ck("an ordinary lift is untouched", /^185×8/.test(r.plainLong) && /^185×8/.test(r.plainShort),
     r.plainLong + " / " + r.plainShort);
  ck("with no entry to ask, it falls back to the number rather than guessing",
     /^159.6×10/.test(r.noEntry), r.noEntry);
  ck("and a session's set list carries it", /bw\+20/.test(r.list), r.list.slice(0, 40));
}

console.log("\n3 - THE RAISE MESSAGE PUTS THE CHANGE WHERE IT HAPPENED");
{
  const r = await ev(()=>{
    const e = {name:"Dumbbell Bulgarian Split Squat", bwOn:139.6};
    return {from: bwSay(e, 179.6, true), to: bwSay(e, 189.6, true),
            plain: bwSay({name:"Barbell Bench Press"}, 185, true)};
  });
  console.log("   ", JSON.stringify(r));
  ck("40 in the hands, not 179.6 of mostly you", r.from === "bw+40 lb", r.from);
  ck("going to 50", r.to === "bw+50 lb", r.to);
  ck("AND A BARBELL IS STILL A BARBELL", r.plain === null, String(r.plain));
}

console.log("\n4 - THE NUMBER THE APP STORES AND WORKS FROM IS UNCHANGED");
{
  const r = await ev(()=>{
    const wid = ROTATION[0];
    S.program[wid] = [{name:"Dumbbell Bulgarian Split Squat", sets:2, reps:"8-12", weight:159.6}];
    S.sessions = [{id:"s1", workoutId:wid, date:todayStr(), startedAt:Date.now()-3600e3,
      finishedAt:Date.now(), entries:[{name:"Dumbbell Bulgarian Split Squat", bwOn:139.6,
        sets:[{weight:"159.6", reps:"10", rpe:"8", done:true}]}]}];
    save();
    const s = S.sessions[0], st = s.entries[0].sets[0];
    const vol = s.entries[0].sets.reduce((t,x)=> t + parseFloat(x.weight)*parseFloat(x.reps), 0);
    return {stored: st.weight, volume: vol, exported: workoutExport(s).exercises[0].sets[0].weight};
  });
  console.log("   ", JSON.stringify(r));
  ck("the set still holds the whole load", r.stored === "159.6", String(r.stored));
  ck("the volume is still worked out from it", r.volume === 1596, String(r.volume));
  ck("AND THE EXPORT STILL CARRIES THE NUMBER, not the notation",
     r.exported === 159.6, String(r.exported));
}

console.log("\n5 - AND THE BOX YOU TYPE IN IS STILL A BOX YOU CAN TYPE IN");
{
  const r = await ev(()=>{
    const wid = ROTATION[0];
    S.active = null; startWorkout(wid); PF=null; TAB="workout";
    const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
    S.active.entries[0].bwOn = 139.6; save(); render();
    const box = document.querySelector('.set input[data-f="weight"]');
    const line = (document.querySelector('.plate-line')||{}).innerText || "";
    return {ph: box ? box.placeholder : "(none)", val: box ? box.value : "(none)",
            line: line.replace(/\s+/g," ").trim()};
  });
  console.log("   ", JSON.stringify(r));
  ck("the weight box offers a number, never bw+20", !/bw/i.test(r.ph), r.ph);
  ck("and the plate line leads with what you can change",
     /^bw\+/.test(r.line) || r.line === "", r.line.slice(0, 60));
  ck("while still showing the total the box holds",
     r.line === "" || /159.6|139.6/.test(r.line), r.line.slice(0, 60));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
