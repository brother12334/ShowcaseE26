import { chromium, APP_URL } from './_e26.mjs';
/* ITEM 10 — THE SESSION'S GYM, AND WHAT IS JUDGED AGAINST IT.

   Every gym fact in the app was global and forward-looking: the kit settings described
   the room you are standing in now, and every session ever logged was judged against
   them. So one afternoon at a hotel with 2.5 lb dumbbells and a 7 kg heavier carriage
   re-judged the whole log, and the sessions either side of it read as a plateau and a
   jump that never happened.

   Four things are checked here, and each has a CONTROL THAT MUST FIRE: the same number
   at the other gym, or the same reader with the gym taken away. A reader that returns
   null because the fixture is thin looks exactly like one that correctly found nothing,
   and that mistake has been made in this repo before.

   The untagged case is the one that matters most, because it is most of the log: a
   session with no gym on it is read as the HOME GYM and says "(assumed)" everywhere it
   is shown. The guess is acted on and visible, which is the whole of the bargain. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2400}});
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
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off',
    barMode:"total", barWeight:45, dbStep:5, dbMax:50, plateStep:2.5, stackStep:5, plates:null});
  S.splitId="ppl6"; applySplit();
  /* Palma Vista: 5 lb stack steps, rack to 50. The hotel: 2.5 lb add-ons, rack to 100. */
  S.gyms=[{id:"g1", name:"Palma Vista", spots:[{lat:1,lon:1}], stackStep:5,  dbMax:50},
          {id:"g2", name:"Hotel gym",   spots:[{lat:2,lon:2}], stackStep:2.5, dbMax:100}];
  S.homeGym="g1";
  const day = ROTATION[0];
  const mk = (id, date, at, gym, w)=> ({id, workoutId:day, date, startedAt:at, finishedAt:at+3600e3,
    gymId: gym || undefined, gymName: gym ? (gymById(gym).name) : undefined,
    entries:[{name:"Cable Row", sets:[{reps:"10", weight:String(w), rpe:"8", done:true}]}]});
  S.sessions=[
    mk("sU", "2026-11-01", Date.now()-9*864e5, null, 100),   // untagged, before gyms existed
    mk("sH", "2026-11-08", Date.now()-5*864e5, "g2", 140),   // the hotel
    mk("sP", "2026-11-12", Date.now()-2*864e5, "g1", 110)];  // Palma Vista
  save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

console.log("\n1. AN UNTAGGED SESSION IS HOME, AND SAYS SO");
const lab = await p.evaluate(()=>{
  const g = id => S.sessions.find(s=> s.id === id);
  const read = id => ({info: sessionGym(g(id)), label: sessionGymLabel(g(id))});
  const withHome = {u: read("sU"), h: read("sH"), p: read("sP")};
  S.homeGym = null;
  const noHome = {u: read("sU"), h: read("sH")};
  S.homeGym = "g1";
  return {withHome, noHome};
});
console.log("   ", JSON.stringify(lab.withHome.u.label), JSON.stringify(lab.withHome.h.label));
ck("the untagged one reads as the home gym", lab.withHome.u.info.id === "g1", lab.withHome.u.info.id);
ck("and is labelled as a guess", lab.withHome.u.label === "Palma Vista (assumed)", lab.withHome.u.label);
ck("a tagged session is not a guess", lab.withHome.h.info.assumed === false, String(lab.withHome.h.info.assumed));
ck("and is labelled plainly", lab.withHome.h.label === "Hotel gym", lab.withHome.h.label);
ck("the home gym's own sessions are not assumed either",
   lab.withHome.p.assumed !== true && lab.withHome.p.label === "Palma Vista", lab.withHome.p.label);
/* THE CONTROL: with no home gym set, the same untagged session has no gym at all. If
   section 1 passed with this unchanged, the labels would be coming from somewhere else. */
ck("CONTROL: no home gym, and the guess stops", lab.noHome.u.label === "" && lab.noHome.u.info.id === null,
   JSON.stringify(lab.noHome.u));
ck("CONTROL: the tagged one is unaffected by that", lab.noHome.h.label === "Hotel gym", lab.noHome.h.label);

console.log("\n2. THE KIT THAT WAS IN THE ROOM");
const kit = await p.evaluate(()=>{
  const g = id => S.sessions.find(s=> s.id === id);
  const take = s =>{ const k = kitFor(s); return {stackStep:k.stackStep, dbMax:k.dbMax, assumed:k.assumed}; };
  trainPrefs().stackStep = 10;   // a global value neither gym matches, so a fallback shows up
  const bare = kitFor(null);
  trainPrefs().stackStep = 5;
  return {hotel: take(g("sH")), home: take(g("sP")), untagged: take(g("sU")), bareStack: bare.stackStep};
});
console.log("   ", JSON.stringify(kit));
ck("the hotel session is read with the hotel's stack", kit.hotel.stackStep === 2.5, String(kit.hotel.stackStep));
ck("and the hotel's rack", kit.hotel.dbMax === 100, String(kit.hotel.dbMax));
ck("the home session with Palma Vista's", kit.home.stackStep === 5, String(kit.home.stackStep));
ck("the untagged one borrows home's kit, flagged as assumed",
   kit.untagged.stackStep === 5 && kit.untagged.assumed === true, JSON.stringify(kit.untagged));
ck("CONTROL: with no session at all it is just your settings", kit.bareStack === 10, String(kit.bareStack));

console.log("\n3. AN IMPOSSIBLE LOAD IS IMPOSSIBLE SOMEWHERE");
const imp = await p.evaluate(()=>{
  const g = id => S.sessions.find(s=> s.id === id);
  return {
    /* 52.5 on a cable: no pin sets it at Palma Vista, and it is an ordinary pin at the hotel. */
    homeOdd: loadImpossible("Cable Row", 52.5, g("sP")),
    hotelOdd: loadImpossible("Cable Row", 52.5, g("sH")),
    untaggedOdd: loadImpossible("Cable Row", 52.5, g("sU")),
    /* 55 lb in one hand: past Palma Vista's rack, nothing at the hotel's. */
    homeHeavy: loadImpossible("Single-Arm DB Row", 55, g("sP")),
    hotelHeavy: loadImpossible("Single-Arm DB Row", 55, g("sH")),
    /* With no session, the current settings answer, exactly as before item 10. */
    nowOdd: loadImpossible("Cable Row", 52.5)
  };
});
console.log("   ", JSON.stringify(imp));
ck("52.5 is flagged at Palma Vista", !!imp.homeOdd && imp.homeOdd.kind === "stack", JSON.stringify(imp.homeOdd));
ck("CONTROL: the same number at the hotel is not", imp.hotelOdd == null, JSON.stringify(imp.hotelOdd));
ck("the untagged session is judged as home", !!imp.untaggedOdd, JSON.stringify(imp.untaggedOdd));
ck("55 in one hand is past the rack at home", !!imp.homeHeavy && imp.homeHeavy.kind === "rack",
   JSON.stringify(imp.homeHeavy));
ck("CONTROL: and well inside the hotel's", imp.hotelHeavy == null, JSON.stringify(imp.hotelHeavy));
ck("with no session given, nothing changed", !!imp.nowOdd && imp.nowOdd.kind === "stack",
   JSON.stringify(imp.nowOdd));

console.log("\n4. THE LAST LOAD COMES FROM THE SAME ROOM WHERE IT CAN");
const last = await p.evaluate(()=>{
  const g = id => S.sessions.find(s=> s.id === id);
  const wid = ROTATION[0];
  const out = {
    /* Palma Vista has logged 110 and 100 (the untagged one counts as home); the hotel's
       140 is the heaviest in the log and must not be the answer here. */
    atHome: lastLoggedLoad("Cable Row", wid, {gym: g("sP")}),
    atHotel: lastLoggedLoad("Cable Row", wid, {gym: g("sH")}),
    detailHome: lastLoggedLoad("Cable Row", wid, {gym: g("sP"), detail:true}),
    plain: lastLoggedLoad("Cable Row", wid)
  };
  /* A movement with history at the hotel ONLY. Asked about a session at home, the
     answer has to come back marked, so a caller can estimate from it and refuse to
     prescribe from it. */
  g("sH").entries.push({name:"Pec Deck", sets:[{reps:"12", weight:"90", rpe:"8", done:true}]});
  save();
  out.crossOnly = lastLoggedLoad("Pec Deck", wid, {gym: g("sP"), detail:true});
  out.crossBare = lastLoggedLoad("Pec Deck", wid, {gym: g("sP")});
  out.sameGymDetail = lastLoggedLoad("Pec Deck", wid, {gym: g("sH"), detail:true});
  out.missing = lastLoggedLoad("Nothing Logged Here", wid, {gym: g("sP"), detail:true});
  return out;
});
console.log("   ", JSON.stringify(last));
ck("asked about a home session, the home load answers", last.atHome === 110, String(last.atHome));
ck("CONTROL: asked about the hotel, the hotel load does", last.atHotel === 140, String(last.atHotel));
ck("without a gym it is the newest in the log, as it always was", last.plain === 110, String(last.plain));
ck("the detailed answer is not marked cross-gym when it isn't",
   last.detailHome && last.detailHome.crossGym === false, JSON.stringify(last.detailHome));
ck("and names where it came from", last.detailHome && last.detailHome.gym === "Palma Vista",
   last.detailHome && last.detailHome.gym);
ck("a load only ever logged elsewhere still comes back", last.crossOnly && last.crossOnly.w === 90,
   JSON.stringify(last.crossOnly));
ck("marked as being from another gym", last.crossOnly && last.crossOnly.crossGym === true,
   JSON.stringify(last.crossOnly && last.crossOnly.crossGym));
ck("and it names which", last.crossOnly && last.crossOnly.gym === "Hotel gym",
   last.crossOnly && last.crossOnly.gym);
ck("a bare caller still gets a number", last.crossBare === 90, String(last.crossBare));
ck("CONTROL: asked from the hotel itself, it is not cross-gym",
   last.sameGymDetail && last.sameGymDetail.crossGym === false, JSON.stringify(last.sameGymDetail));
ck("CONTROL: a movement never logged returns nothing", last.missing == null, JSON.stringify(last.missing));

console.log("\n5. RETAGGING IT, IN THE SESSION EDITOR");
await p.evaluate(()=>{ renderSessEditor(S.sessions.find(s=> s.id === "sU")); });
const ed = await p.evaluate(()=>{
  const sel = document.querySelector('#modal #sessGymEdit');
  const says = sel && sel.parentNode.querySelector('.set-says');
  return {there: !!sel,
          opts: sel ? [...sel.options].map(o=> o.textContent.trim()).join(" | ") : "",
          picked: sel ? sel.value : "(none)",
          says: says ? says.innerText.replace(/\s+/g," ").trim() : ""};
});
console.log("   ", ed.opts, "\n   ", ed.says);
ck("the control is on the editor", ed.there, String(ed.there));
ck("nothing is recorded for this one", ed.picked === "", JSON.stringify(ed.picked));
ck("both gyms are offered, and the home one is marked", /Palma Vista \(home\)/.test(ed.opts), ed.opts);
ck("and it says the gym is being guessed", /Palma Vista/.test(ed.says) && /guess/i.test(ed.says), ed.says);
const retag = await p.evaluate(()=>{
  const sel = document.querySelector('#modal #sessGymEdit');
  sel.value = "g2";
  sel.onchange();
  const s = S.sessions.find(x=> x.id === "sU");
  const after = {gymId: s.gymId, gymName: s.gymName, label: sessionGymLabel(s),
                 assumed: sessionGym(s).assumed, edited: !!s.edited,
                 /* The kit the session is judged against has to have moved with it. */
                 stack: kitFor(s).stackStep,
                 odd: loadImpossible("Cable Row", 52.5, s)};
  /* And back to nothing, which has to restore the guess rather than leave a stale tag. */
  const sel2 = document.querySelector('#modal #sessGymEdit');
  sel2.value = ""; sel2.onchange();
  const s2 = S.sessions.find(x=> x.id === "sU");
  return {after, cleared: {gymId: s2.gymId === undefined, label: sessionGymLabel(s2),
                           assumed: sessionGym(s2).assumed}};
});
console.log("   ", JSON.stringify(retag));
ck("picking a gym files the session there", retag.after.gymId === "g2", String(retag.after.gymId));
ck("and copies its name onto the session", retag.after.gymName === "Hotel gym", retag.after.gymName);
ck("it stops being a guess", retag.after.assumed === false && retag.after.label === "Hotel gym",
   JSON.stringify(retag.after.label));
ck("the save is stamped as an edit", retag.after.edited, String(retag.after.edited));
ck("and the session is now judged against that room's kit",
   retag.after.stack === 2.5 && retag.after.odd == null, JSON.stringify(retag.after));
ck("clearing it removes the tag", retag.cleared.gymId, String(retag.cleared.gymId));
ck("and the guess comes back, still labelled as one",
   retag.cleared.assumed === true && retag.cleared.label === "Palma Vista (assumed)",
   retag.cleared.label);

console.log("\n6. IT IS IN THE REPORT AND IN THE EXPORT");
const out = await p.evaluate(()=>{
  hideModal();
  const html = buildReportInner();
  const csv = buildCSV();
  /* A REAL PARSE, because the session's own row begins "2026-11-01, PUSH" and splitting
     on commas turns one quoted cell into two. An earlier version of this spec did that
     and reported the export as malformed when it was the test that was. */
  const rows = (()=>{
    const out = [[""]]; let q = false;
    for(let i = 0; i < csv.length; i++){
      const c = csv[i], row = out[out.length - 1];
      if(q){
        if(c === '"' && csv[i+1] === '"'){ row[row.length-1] += '"'; i++; }
        else if(c === '"') q = false;
        else row[row.length-1] += c;
      }
      else if(c === '"') q = true;
      else if(c === ",") row.push("");
      else if(c === "\n") out.push([""]);
      else row[row.length-1] += c;
    }
    return out;
  })();
  const head = rows[0];
  const find = d => rows.find(r=> r[0] && r[0].indexOf(d) === 0) || [];
  return {gymCol: head.indexOf("Gym"), flagCol: head.indexOf("Gym assumed"),
          widths: [...new Set(rows.map(r=> r.length))].join("/"),
          untagged: find("2026-11-01"), hotel: find("2026-11-08"),
          reportAssumed: /Gym: Palma Vista \(assumed\)/.test(html),
          reportHotel: /Gym: Hotel gym/.test(html)};
});
console.log("   ", JSON.stringify(out));
ck("the export has a gym column", out.gymCol > 0, String(out.gymCol));
ck("and a separate flag for the guess", out.flagCol === out.gymCol + 1, String(out.flagCol));
ck("every row is still the same width", out.widths.indexOf("/") === -1, out.widths);
ck("the untagged session carries the label", out.untagged[out.gymCol] === "Palma Vista (assumed)",
   out.untagged[out.gymCol]);
ck("and the flag", out.untagged[out.flagCol] === "assumed", out.untagged[out.flagCol]);
ck("CONTROL: the tagged one carries the name and no flag",
   out.hotel[out.gymCol] === "Hotel gym" && out.hotel[out.flagCol] === "", out.hotel.join("|"));
ck("the report says where the untagged session was, and that it is a guess", out.reportAssumed,
   String(out.reportAssumed));
ck("CONTROL: and names the hotel plainly", out.reportHotel, String(out.reportHotel));

console.log("\n7. THE HOME GYM IS SAID, NOT COUNTED");
const seed = await p.evaluate(()=>{
  /* Four sessions at the hotel against one at home must not move it. Only seedHomeGym()
     may ever look at the log, and only while the setting has never been answered. */
  const before = S.homeGym;
  for(let i=0;i<4;i++) S.sessions.push({id:"x"+i, workoutId:ROTATION[0], date:"2026-11-2"+i,
    startedAt:Date.now()-i*36e5, gymId:"g2", gymName:"Hotel gym", entries:[]});
  const afterSessions = S.homeGym;
  const reseeded = seedHomeGym();            // already answered, so this must do nothing
  const stillSet = S.homeGym;
  /* Cleared deliberately is an answer too, and the seed may not overrule it. */
  setHomeGym(null);
  const clearedSeed = seedHomeGym();
  const cleared = S.homeGym;
  /* Never asked at all: the one time it is allowed to guess, and it picks the room with
     the most sessions in it. */
  delete S.homeGym;
  const fresh = seedHomeGym();
  const guessed = S.homeGym;
  S.homeGym = before; save();
  return {afterSessions, reseeded, stillSet, clearedSeed, cleared, fresh, guessed};
});
console.log("   ", JSON.stringify(seed));
ck("training elsewhere does not move the home gym", seed.afterSessions === "g1", seed.afterSessions);
ck("and the seed never runs twice", seed.reseeded === false && seed.stillSet === "g1",
   JSON.stringify(seed));
ck("clearing it on purpose stays cleared", seed.clearedSeed === false && seed.cleared === null,
   JSON.stringify(seed.cleared));
ck("asked for the first time, it guesses from the log", seed.fresh === true && seed.guessed === "g2",
   String(seed.guessed));

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
