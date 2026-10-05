import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
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
  S.tourDone=true; S.geo='off'; S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
const ev = (fn, arg) => p.evaluate(fn, arg);

console.log("1 - WHAT ONE SET IS WORTH, BY WHAT KIND IT WAS");
{
  const r = await ev(()=>{
    /* the app's own shape: a technique is declared on the ENTRY, its sub-parts are rows
       under the set */
    const subs = n=> Array.from({length:n||0}, ()=> ({weight:"80", reps:"5"}));
    const mk = (tech, parts)=> ({name:"Leg Extension", reps:"10",
      tech: tech ? [{k:tech, all:true}] : [],
      sets:[Object.assign({weight:"100", reps:"10", rpe:"9", done:true},
                          parts ? {sub: subs(parts)} : {})]});
    const v = e=> setTypeValue(e, 0);
    return {
      straight: v(mk(null)),
      drop1: v(mk("dropset", 1)), drop3: v(mk("dropset", 3)),
      myo0: v(mk("myoreps", 0)), myo1: v(mk("myoreps", 1)),
      myo2: v(mk("myoreps", 2)), myo4: v(mk("myoreps", 4)), myo9: v(mk("myoreps", 9)),
      rp2: v(mk("restpause", 2)), rp9: v(mk("restpause", 9)),
      cluster: v(mk("cluster", 4)),
      partials: v(mk("lengthened")),
      amrap: v(mk("amrap")), failure: v(mk("failure"))
    };
  });
  ck("a straight set is one set", r.straight === 1, String(r.straight));
  ck("a drop set is one set however many drops", r.drop1 === 1 && r.drop3 === 1,
     r.drop1+"/"+r.drop3);
  ck("a myo-rep sequence is 1 + 0.25 a mini-set", r.myo2 === 1.5, "myo2="+r.myo2);
  /* 1 + 0.25 x 3 is already the cap, so four and nine mini-sets are worth the same:
     the evidence does not support counting a longer sequence as more volume. */
  ck("capped at 1.75", r.myo4 === 1.75 && r.myo9 === 1.75, r.myo4+"/"+r.myo9);
  ck("fewer than two mini-sets is just a set", r.myo0 === 1 && r.myo1 === 1, r.myo0+"/"+r.myo1);
  ck("rest-pause counts the same way, capped", r.rp2 === 1.5 && r.rp9 === 1.75, r.rp2+"/"+r.rp9);
  ck("a cluster set replaces one set", r.cluster === 1, String(r.cluster));
  ck("partials are one set", r.partials === 1, String(r.partials));
  ck("so are AMRAP and to-failure", r.amrap === 1 && r.failure === 1, r.amrap+"/"+r.failure);
}

console.log("2 - AND EFFORT CREDIT STILL APPLIES ON TOP");
{
  const r = await ev(()=>{
    const subs = n=> Array.from({length:n||0}, ()=> ({weight:"80", reps:"5"}));
    const mk = (rpe, tech, parts)=> ({name:"Leg Extension", reps:"10",
      tech: tech ? [{k:tech, all:true}] : [],
      sets:[Object.assign({weight:"100", reps:"10", rpe:String(rpe), done:true},
                          parts?{sub: subs(parts)}:{})]});
    const v = e=> setEffective(e, 0, entryWarmups(e)).v;
    return {hard: v(mk(9)), four: v(mk(6)), five: v(mk(5)), easy: v(mk(3)),
            myoHard: v(mk(9, "myoreps", 2)), myoEasy: v(mk(6, "myoreps", 2)),
            warm: (()=>{ const e = mk(9); e.sets[0].warmup = true;
                         return setEffective(e, 0, entryWarmups(e)).v; })()};
  });
  ck("RIR 1 is full credit", r.hard === 1, String(r.hard));
  ck("RIR 4 is half", r.four === 0.5, String(r.four));
  ck("RIR 5 is a quarter", r.five === 0.25, String(r.five));
  ck("RIR 7 is nothing", r.easy === 0, String(r.easy));
  ck("a myo-rep sequence gets the same discount", r.myoHard === 1.5 && r.myoEasy === 0.75,
     r.myoHard+"/"+r.myoEasy);
  ck("and a warm-up is never counted", r.warm === 0, String(r.warm));
}

console.log("3 - A CIRCUIT WITHOUT AN EFFORT RATING IS HALF CREDITED");
{
  const r = await ev(()=>{
    const mk = (rpe)=> ({name:"Leg Extension", reps:"10", circuit:true,
      sets:[{weight:"100", reps:"10", rpe: rpe == null ? "" : String(rpe), done:true}]});
    const plain = {name:"Leg Extension", reps:"10",
      sets:[{weight:"100", reps:"10", rpe:"", done:true}]};
    return {noRpe: setEffective(mk(null), 0, []).v,
            rated: setEffective(mk(9), 0, []).v,
            notCircuit: setEffective(plain, 0, []).v};
  });
  ck("no rating in a circuit: half a set", r.noRpe === 0.5, String(r.noRpe));
  ck("rated: counts like anything else", r.rated === 1, String(r.rated));
  ck("and outside a circuit an unrated set is still assumed hard", r.notCircuit === 1,
     String(r.notCircuit));
}

console.log("4 - TECHNIQUE WORK IS READ AS MAXIMUM EFFORT, AND TRIMS THE CEILING");
{
  const r = await ev(()=>{
    const mk = (tech, rpe)=> ({name:"Leg Extension", reps:"10",
      tech: tech ? [{k:tech, all:true}] : [],
      sets:[{weight:"100", reps:"10", rpe:String(rpe||8), done:true}]});
    return {
      drop: setEffortRpe(mk("dropset", 8), 0),
      myo: setEffortRpe(mk("myoreps", 8), 0),
      rp: setEffortRpe(mk("restpause", 8), 0),
      cluster: setEffortRpe(mk("cluster", 8), 0),
      partials: setEffortRpe(mk("lengthened", 8), 0),
      straight: setEffortRpe(mk(null, 8), 0),
      threshold: TECHNIQUE_FATIGUE_THRESHOLD, mult: TECHNIQUE_MRV_MULTIPLIER
    };
  });
  ck("a drop set logged at 8 is read as 10", r.drop === 10, String(r.drop));
  ck("so are myo-reps and rest-pause", r.myo === 10 && r.rp === 10, r.myo+"/"+r.rp);
  ck("a cluster is not: it is a straight set with pauses", r.cluster === 8, String(r.cluster));
  ck("nor are partials", r.partials === 8, String(r.partials));
  ck("and a straight set is what it says", r.straight === 8, String(r.straight));
  ck("the ceiling trim is a nudge, not a verdict", r.mult === 0.92 && r.threshold === 0.3,
     r.mult+"/"+r.threshold);
}

console.log("5 - AND THE SHARE IS MEASURED FROM THE LOG");
{
  const r = await ev(()=>{
    const now = Date.now(), day = 86400000;
    const sess = (tech, n)=> ({id:"x"+n, startedAt: now-day, finishedAt: now-day,
      date: new Date(now-day).toLocaleDateString("en-CA"),
      entries:[{name:"Leg Extension", reps:"10",
        tech: tech ? [{k:tech, all:true}] : [],
        sets: Array.from({length:n}, ()=> ({weight:"100", reps:"10", rpe:"9", done:true}))}]});
    const mixed = {id:"m", startedAt: now-day, finishedAt: now-day,
      date: new Date(now-day).toLocaleDateString("en-CA"),
      entries:[{name:"Leg Extension", reps:"10", tech:[{k:"dropset"}], sets:[
        {weight:"100",reps:"10",rpe:"9",done:true},
        {weight:"100",reps:"10",rpe:"9",done:true},
        {weight:"100",reps:"10",rpe:"9",done:true}]}]};
    const quarter = {id:"q", startedAt: now-day, finishedAt: now-day,
      date: new Date(now-day).toLocaleDateString("en-CA"),
      entries:[{name:"Leg Extension", reps:"10", tech:[{k:"dropset"}], sets:[
        {weight:"100",reps:"10",rpe:"9",done:true},
        {weight:"100",reps:"10",rpe:"9",done:true},
        {weight:"100",reps:"10",rpe:"9",done:true},
        {weight:"100",reps:"10",rpe:"9",done:true}]}]};
    const win = [now - 7*day, now + 1];
    return {
      none: techniqueShareOver("quads", win[0], win[1], [sess(null, 4)]).share,
      all:  techniqueShareOver("quads", win[0], win[1], [sess("dropset", 4)]).share,
      mix:  Math.round(techniqueShareOver("quads", win[0], win[1], [mixed]).share * 100) / 100,
      quarter: Math.round(techniqueShareOver("quads", win[0], win[1], [quarter]).share * 100) / 100,
      factorQuarter: techniqueMrvFactor("quads", win[0], win[1], [quarter]),
      factorLow:  techniqueMrvFactor("quads", win[0], win[1], [mixed]),
      factorHigh: techniqueMrvFactor("quads", win[0], win[1], [sess("dropset", 4)])
    };
  });
  ck("no technique work: a share of nothing", r.none === 0, String(r.none));
  ck("all of it: a share of one", r.all === 1, String(r.all));
  ck("one of three: a third", r.mix === 0.33, String(r.mix));
  ck("a quarter is below the line and changes nothing",
     r.quarter === 0.25 && r.factorQuarter === 1, r.quarter+"/"+r.factorQuarter);
  ck("a third is over it", r.factorLow === 0.92, String(r.factorLow));
  ck("but mostly technique work does", r.factorHigh === 0.92, String(r.factorHigh));
}

console.log("6 - THE STRENGTH READ COMES FROM A STRAIGHT SET, AND THE FIRST ONE");
{
  const r = await ev(()=>{
    const e = (sets)=> ({name:"Barbell Bench Press", reps:"5", sets});
    const S1 = {weight:"200", reps:"5", rpe:"8", done:true};
    const S2 = {weight:"205", reps:"5", rpe:"8", done:true};
    const S3 = {weight:"210", reps:"5", rpe:"8", done:true};
    const sub2 = [{weight:"150",reps:"4"},{weight:"120",reps:"4"}];
    const drop = {weight:"250", reps:"5", rpe:"9", done:true, sub: sub2};
    const myo  = {weight:"260", reps:"5", rpe:"9", done:true, sub: sub2};
    const asDrop = sets=> ({name:"Barbell Bench Press", reps:"5", tech:[{k:"dropset"}], sets});
    const asMyo  = sets=> ({name:"Barbell Bench Press", reps:"5", tech:[{k:"myoreps"}], sets});
    return {
      first: Math.round(entryE1RM(e([S1, S2, S3]))),
      /* the best of the first two is allowed, the third is not */
      second: Math.round(entryE1RM(e([S1, S3, {weight:"215", reps:"5", rpe:"8", done:true}]))),
      firstTwoOnly: Math.round(entryE1RM(e([S1, S3]))),
      straightOnly: Math.round(entryE1RM(e([S1]))),
      notDrop: Math.round(entryE1RM(asDrop([S1, drop]))),
      notMyo: Math.round(entryE1RM(asMyo([S1, myo]))),
      onlyTech: entryE1RM({name:"Barbell Bench Press", reps:"5",
        tech:[{k:"dropset", all:true}], sets:[drop, drop]}),
      hasStraight: entryHasStraightSet(asDrop([S1, drop])),
      noStraight: entryHasStraightSet({name:"Barbell Bench Press", reps:"5",
        tech:[{k:"dropset", all:true}], sets:[drop, drop]})
    };
  });
  ck("the first straight set is the read", r.first > 0, "first="+r.first);
  ck("the second set is allowed to win, for a misjudged opener",
     r.second === r.firstTwoOnly, "second="+r.second+" firstTwo="+r.firstTwoOnly);
  ck("but the third never is, however good it was", r.second < 265,
     "second="+r.second+" (215 would give ~265)");
  ck("a drop set is never the read", r.notDrop === r.straightOnly,
     r.notDrop+" vs straight-only "+r.straightOnly);
  ck("nor are myo-reps", r.notMyo === r.straightOnly, r.notMyo+" vs "+r.straightOnly);
  ck("an exercise done only as technique sets has no read", r.onlyTech === null,
     String(r.onlyTech));
  ck("and it can be asked whether there is one", r.hasStraight && !r.noStraight,
     r.hasStraight+"/"+r.noStraight);
}

console.log("7 - THE TIMER KNOWS WHICH RULE IT IS USING");
{
  const r = await ev(()=>{
    const mk = tech=> ({name:"Leg Extension", reps:"10",
      tech: tech ? [{k:tech, all:true}] : [],
      sets:[{weight:"100",reps:"10",rpe:"9",done:true}]});
    const mid = {mid:true}, end = {mid:false};
    const warm = mk(null); warm.sets[0].warmup = true;
    return {
      drop: techniqueRest(mk("dropset"), 0, mid),
      myo: techniqueRest(mk("myoreps"), 0, mid),
      rp: techniqueRest(mk("restpause"), 0, mid),
      cluster: techniqueRest(mk("cluster"), 0, mid),
      afterDrop: techniqueRest(mk("dropset"), 0, end),
      straight: techniqueRest(mk(null), 0, mid),
      warm: techniqueRest(warm, 0, end)
    };
  });
  ck("no rest between drops, and it says so",
     r.drop && r.drop.sec === 0 && /drop the weight/.test(r.drop.why), JSON.stringify(r.drop));
  ck("15 s between myo-rep mini-sets", r.myo && r.myo.sec === 15 && /myo-rep/.test(r.myo.why),
     JSON.stringify(r.myo));
  ck("15 s between rest-pause bursts", r.rp && r.rp.sec === 15, JSON.stringify(r.rp));
  ck("20 s between clusters", r.cluster && r.cluster.sec === 20, JSON.stringify(r.cluster));
  ck("a minute after a warm-up", r.warm && r.warm.sec === 60, JSON.stringify(r.warm));
  ck("and once the sequence is over, the ordinary target takes it", r.afterDrop === null,
     JSON.stringify(r.afterDrop));
  ck("a straight set never gets a technique pause", r.straight === null, JSON.stringify(r.straight));
}

console.log("8 - AND A GROUPING HAS ITS OWN CLOCK");
{
  const r = await ev(()=>{
    const pair = [{name:"Leg Extension", reps:"10", superset:true,
                   sets:[{weight:"100",reps:"10",rpe:"9",done:true}]},
                  {name:"Mid Cable Fly (on bench)", reps:"10",
                   sets:[{weight:"40",reps:"10",rpe:"9",done:true}]}];
    const same = [{name:"Mid Cable Fly (on bench)", reps:"10", superset:true,
                   sets:[{weight:"40",reps:"10",rpe:"9",done:true}]},
                  {name:"Barbell Bench Press", reps:"8",
                   sets:[{weight:"185",reps:"8",rpe:"9",done:true}]}];
    const circ = [{name:"Leg Extension", reps:"10", circuit:true,
                   sets:[{weight:"100",reps:"10",rpe:"9",done:true}]}];
    return {
      into: groupingRest(pair, 0, {}),
      round: groupingRest(pair, 1, {}),
      sameFirst: groupingRest(same, 0, {}),
      sameSecond: groupingRest(same, 1, {}),
      station: groupingRest(circ, 0, {}),
      roundEnd: groupingRest(circ, 0, {roundEnd:true}),
      preFat: entryPreFatigued(same, 1),
      notPreFat: entryPreFatigued(pair, 1)
    };
  });
  ck("straight into the second exercise", r.into && r.into.sec === 15, JSON.stringify(r.into));
  ck("then a real rest between rounds", r.round && r.round.sec === 90, JSON.stringify(r.round));
  ck("a pair sharing a muscle is recognised", r.preFat && !r.notPreFat,
     r.preFat+"/"+r.notPreFat);
  ck("and it rests like the exercise, not like a superset", r.sameSecond === null,
     JSON.stringify(r.sameSecond));
  ck("a circuit moves to the next station", r.station && r.station.sec === 15, JSON.stringify(r.station));
  ck("and rests two minutes between rounds", r.roundEnd && r.roundEnd.sec === 120,
     JSON.stringify(r.roundEnd));
}

console.log("9 - REGRESSION: A LOG OF STRAIGHT SETS COUNTS EXACTLY AS BEFORE");
{
  const r = await ev(()=>{
    const e = {name:"Leg Extension", reps:"10", sets:[
      {weight:"100",reps:"10",rpe:"9",done:true},
      {weight:"100",reps:"10",rpe:"8",done:true},
      {weight:"100",reps:"10",rpe:"6",done:true},
      {weight:"40", reps:"12",rpe:"5",done:true, warmup:true}]};
    return {total: entryEffectiveSets(e),
            each: e.sets.map((_,i)=> setEffective(e, i, entryWarmups(e)).v)};
  });
  ck("two hard sets and a half", r.total === 2.5, String(r.total));
  ck("set by set, unchanged", r.each.join(",") === "1,1,0.5,0", r.each.join(","));
}

console.log(errs.length?("PAGE ERRORS: "+errs.join(" | ")):"no page errors");
if(errs.length) bad++;
console.log(bad?("BROKEN: "+bad):"all good");
await b.close();
