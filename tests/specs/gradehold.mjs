import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.splitId=DEFAULT_SPLIT; applySplit(); save();
});

// deloadDay null = no deload. list = the progression rows the grade produced.
const build = (deloadDay, list)=> p.evaluate(([dd, rows])=>{
  S.deload = dd==null ? null : {startedAt: Date.now()-(dd-1)*86400e3, endedAt:null, reason:"manual"};
  S.program[ROTATION[0]]=[
    {name:"Cable Ab Crunch", sets:3, reps:"10-15", weight:152.5},
    {name:"Barbell Row",     sets:3, reps:"8-12",  weight:135},
    {name:"Leg Extension",   sets:3, reps:"10-15", weight:90}];
  save();
  return progressionHTML(rows);
}, [deloadDay, list]);

const UP  = {kind:"up", name:"Cable Ab Crunch", to:157.5,
             msg:"Add weight next time: 152.5 lb → 157.5 lb",
             sub:"Last set hit 15 reps, the top of 10-15, at RPE 6.5 against a target of 7."};
const UP2 = {kind:"up", name:"Barbell Row", to:140,
             msg:"Add weight next time: 135 lb → 140 lb", sub:"Last set hit the top of the range."};
const CATCH = {kind:"catchup", name:"Leg Extension", to:100, from:90,
               msg:"Put your plan on 100 lb: 90 lb → 100 lb", sub:"You worked at 100 lb for 12 reps."};

let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - NO DELOAD: THE APPLY BUTTONS ARE THERE AS BEFORE");
let h = await build(null, [UP, UP2, CATCH]);
ck("three apply buttons", (h.match(/data-progapply/g)||[]).length===3, String((h.match(/data-progapply/g)||[]).length));
ck("apply-all counts both raises", /Apply all 2 to the programme/.test(h), h.slice(0,80));
ck("nothing held", !/pg-held/.test(h), "");

console.log("2 - DELOAD: THE RAISES ARE SHOWN BUT HELD");
h = await build(3, [UP, UP2, CATCH]);
ck("no apply buttons at all", !/data-progapply/.test(h), "");
ck("no apply-all button", !/progApplyAll/.test(h), "");
ck("three rows greyed", (h.match(/pg-held/g)||[]).length===3, String((h.match(/pg-held/g)||[]).length));
ck("the finding survives", /152\.5 lb/.test(h) && /157\.5 lb/.test(h) && /RPE 6\.5/.test(h), "");
ck("it says when", /Apply this after your deload week/.test(h) && /in 4 days/.test(h), "");
ck("the heading still counts them", /Add weight next time, 2/.test(h), "");

console.log("3 - A CATCH-UP IS HELD TOO, SINCE IT ALSO RAISES THE PLAN");
ck("catch-up greyed", /Your plan is behind, 1/.test(h) && (h.match(/pg-held/g)||[]).length===3, "");

console.log("4 - A CUT IS NOT HELD");
{
  const hard = {kind:"toohard", name:"Cable Ab Crunch",
    detail:{msg:"152.5 lb for 10-15 reps is not reachable", fix:"Drop to about 140 lb.",
            from:152.5, to:140}};
  const out = await build(3, [hard]);
  ck("the drop keeps its button", /data-progapply/.test(out), out.slice(0,200));
  ck("and is not greyed", !/pg-held/.test(out), "");
}

console.log("5 - MIXED: THE BUTTON COUNTS ONLY WHAT IT CAN DO");
{
  // a raise on a deload, plus a raise that is really a cut (allowed through)
  const cutDisguised = {kind:"up", name:"Barbell Row", to:130,
    msg:"130 lb", sub:"under the plan, so it is a decrease"};
  const out = await build(3, [UP, cutDisguised]);
  ck("one held, one open", (out.match(/pg-held/g)||[]).length===1
     && (out.match(/data-progapply/g)||[]).length===1, out.slice(0,120));
  ck("apply-all says 1", /Apply all 1 to the programme/.test(out), "");
}

console.log("6 - AND THE SAME RULE DRIVES BOTH SCREENS");
{
  const same = await p.evaluate(()=>{
    S.deload={startedAt:Date.now()-2*86400e3, endedAt:null, reason:"manual"};
    const a = deloadHoldNote("Cable Ab Crunch", 157.5);
    const bq = flagDeloadHeld({ex:"Cable Ab Crunch", kind:"up", to:157.5});
    return {a, bq};
  });
  ck("grade card and flag agree", JSON.stringify(same.a)===JSON.stringify(same.bq), JSON.stringify(same));
}

console.log(errs.length? "  BROKEN page errors :: "+errs.join(" | ") : "  ok  no page errors");
if(errs.length) bad++;
console.log(bad? ("  "+bad+" broken") : "  all good");
await b.close();
