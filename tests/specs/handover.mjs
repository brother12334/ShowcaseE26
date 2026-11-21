import { chromium, APP_URL } from './_e26.mjs';
/* HANDING A SET-ASIDE RECORD TO SOMEBODY WHO CAN READ IT.

   A record moved out of the readers' way is only half useful if the only route to it is
   a whole backup file. This is the small file that holds nothing but those records and
   the sessions they came from, so it can be pasted into a message without having to
   think about what else is in it.

   THE TWO THINGS THAT MATTER PULL IN OPPOSITE DIRECTIONS, so both are asserted on the
   same fixture: the broken record has to be in there COMPLETE - reps, weight, the lot,
   or it does not answer the question it exists to answer - and nothing private may be,
   even though the state it is built from is full of private things. A test for either
   one alone passes happily while the other is broken.

   THE CONTROL is a session that was fine. It must NOT appear, or the file is just a
   backup with extra steps and the redaction claim is untested on real data. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:2400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
const ACCT_KEY_VALUE = "k".repeat(32);
await p.addInitScript(k=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:k,name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); }, ACCT_KEY_VALUE);
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* Two sessions. The older one is entirely sound - the control. The newer one holds the
   shape that was actually reported: an entry with no name, added through the session
   editor, plus an entry carrying a set that cannot be read. */
const built = await p.evaluate(k=>{
  const base = {
    setup:{name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()},
    tourDone:true, geo:'off', sleepAsked:todayStr(), seenNews:NEWS_FOR, splitId:"ppl6",
    prefs:{sleepPrompt:false, warmups:'off'}, savedAt: Date.now(),
    sync:{token:"ghp_MUST_NOT_TRAVEL_000000000000000", gistId:"g1", repo:"me/private-repo", branch:"main"},
    exNotes:{"Barbell Bench Press":"my shoulder clicks on this one"},
    bodyLog:{"2026-11-01":{w:181.5}},
    sessions:[
      {id:"ok1", workoutId:"pullA", date:"2026-11-10", startedAt:1, finishedAt:2, note:"felt strong",
       entries:[{name:"Barbell Row", sets:[{reps:"8",weight:"155",done:true}]}]},
      {id:"s1", workoutId:"pushA", date:todayStr(), startedAt:Date.now()-5e6, finishedAt:Date.now()-4e6,
       note:"toe still sore",
       entries:[
         {name:"Barbell Bench Press", sets:[{reps:"8",weight:"135",done:true}]},
         /* the reported shape: no name, two sets of real numbers */
         {perSide:true, startSide:"L", sets:[{reps:"15",weight:"27.5",done:true},{reps:"13",weight:"27.5",done:true}]},
         {name:"Cable Lateral Raise", sets:[null,{reps:"12",weight:"25",done:true}]}
       ]}
    ]
  };
  localStorage.setItem("ironlog.v1", JSON.stringify(base));
  S = load(); migrate(); applySplit();
  return {sessions:(S.sessions||[]).length, acct:k};
}, ACCT_KEY_VALUE);
ck("the fixture loaded", built.sessions === 2, built.sessions);
/* The usual de-onboarding, AFTER the fixture is loaded: load() replaces S wholesale, so
   anything set before it is thrown away, and render() takes the onboarding branch and
   returns without drawing a tab at all. Doing this first is why section 4 found no
   buttons anywhere - including the control. */
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} try{ACCT_UI=null}catch(e){}
  hideModal(); document.body.classList.remove('ai-open','onboarding');
});

console.log("\n1. the repair put the nameless entry aside");
const d1 = await p.evaluate(()=>{
  const s = S.sessions.find(x=> x.id === "s1") || {};
  return {walkable: (s.entries||[]).map(e=> e && e.name),
          setAside: (s.badEntries||[]).length,
          badSets: ((s.entries||[]).find(e=> e.badSets)||{}).badSets};
});
ck("it is out of the readers' way", d1.walkable.length === 2 && d1.walkable.indexOf(undefined) < 0, d1.walkable.join(","));
ck("and it is on the set-aside list", d1.setAside === 1, d1.setAside);
ck("the unreadable set is set aside on its own entry", Array.isArray(d1.badSets) && d1.badSets.length === 1);

console.log("\n2. the handover file holds the record, complete");
const d2 = await p.evaluate(()=> ({text: badRecordsText(), have: haveBadRecords()}));
const txt = d2.text;
let rep = null;
try{ rep = JSON.parse(txt); }catch(e){}
ck("haveBadRecords() says there is something to hand over", d2.have);
ck("it is valid JSON", !!rep);
ck("one session is in it", rep && rep.sessions.length === 1, rep && rep.sessions.length);
ck("and it is the right one", rep && rep.sessions[0].id === "s1", rep && rep.sessions[0].id);
ck("the nameless entry is there", txt.indexOf('"27.5"') >= 0);
ck("with BOTH of its sets", (txt.match(/27\.5/g) || []).length >= 2, (txt.match(/27\.5/g) || []).length);
ck("and the flags that made it per-side", txt.indexOf('"perSide": true') >= 0 || txt.indexOf('"perSide":true') >= 0);
ck("the unreadable set is there too", rep && rep.sessions[0].entriesWithBadSets.length === 1);
ck("the readable names are listed for context", rep
   && rep.sessions[0].readableEntries.indexOf("Barbell Bench Press") >= 0,
   rep && rep.sessions[0].readableEntries.join(","));
ck("so is what the repair recorded", rep && rep.repairs.length >= 1, rep && rep.repairs.length);
ck("naming the backup key", rep && !!(rep.repairs.find(x=> x.backup) || {}).backup,
   rep && (rep.repairs.find(x=> x.backup) || {}).backup);

console.log("\n3. and nothing else at all");
ck("the account key is NOT in it", txt.indexOf("k".repeat(32)) < 0,
   txt.indexOf("k".repeat(32)) < 0 ? "absent" : "LEAKED");
ck("the account id is not in it", txt.indexOf("E26-X") < 0);
ck("the GitHub token is not in it", txt.indexOf("ghp_") < 0,
   txt.indexOf("ghp_") < 0 ? "absent" : "LEAKED");
ck("nor the private repo name", txt.indexOf("private-repo") < 0);
/* The control: a session that was fine must leave no trace, and neither must anything
   outside sessions. */
ck("the sound session is not in it", txt.indexOf("Barbell Row") < 0 && txt.indexOf("ok1") < 0);
ck("nor its note", txt.indexOf("felt strong") < 0);
ck("nor the exercise notes", txt.indexOf("shoulder clicks") < 0);
ck("nor the body log", txt.indexOf("181.5") < 0);
/* The session's own note is the judgement call, and the answer is no: it is free text in
   the person's own words, and the one thing this file promises is that it can be sent
   without reading it first. It says that a note EXISTS, so nobody wonders whether it was
   lost. Pinned so the decision stays visible rather than becoming an accident. */
ck("the session note does not travel", txt.indexOf("toe still sore") < 0);
ck("but the file says a note exists", rep && rep.sessions[0].noteOmitted === true);
ck("it is small enough to paste", txt.length < 20000, txt.length + " bytes");

console.log("\n4. the buttons are reachable after the notice is dismissed");
/* STILL THE POINT, DIFFERENT SCREEN. The Today card is dismissible and the records it
   announces are not, so the buttons have to live somewhere permanent. That was Program;
   it is Settings > Your data now, because handing over a diagnostic bundle is that
   screen's subject and running a programme is not. What this section is for -- that
   dismissing the notice does not strand the records -- is unchanged. */
const d4 = await p.evaluate(()=>{
  (S.dataIssues || []).forEach(x=>{ if(x) x.seen = true; });
  TAB = "today"; render();
  const onToday = !!document.getElementById("badRecCopy");
  TAB = "program"; SET_PAGE = null; render();
  const onProgram = !!document.getElementById("badRecCopy");
  TAB = "sync"; SET_PAGE = "data"; render();
  document.querySelectorAll("#app details").forEach(d=> d.open = true);
  const b = document.getElementById("badRecCopy"), f = document.getElementById("badRecFile");
  return {onToday, onProgram, onSettings: !!b,
          wired: !!(b && b.onclick), file: !!(f && f.onclick)};
});
ck("the Today card has gone, as asked", !d4.onToday);
ck("CONTROL: and Program does not carry them either any more", !d4.onProgram);
ck("but Settings > Your data does", d4.onSettings);
ck("and both are wired", d4.wired && d4.file);

console.log("\n5. they vanish once there is nothing to hand over");
const d5 = await p.evaluate(()=>{
  S.sessions.forEach(s=>{ delete s.badEntries; (s.entries||[]).forEach(e=>{ delete e.badSets; }); });
  if(S.active){ delete S.active.badEntries; }
  TAB = "sync"; SET_PAGE = "data"; render();
  document.querySelectorAll("#app details").forEach(d=> d.open = true);
  /* THE CONTROL IS A BUTTON THAT IS ALWAYS ON THIS SCREEN, proving the two gone ones
     above went because there was nothing to hand over and not because the screen
     rendered empty. It used to be Program's "Normal export", which has since gone: it
     called the same function as this very button, so it was one action drawn twice. */
  return {have: haveBadRecords(), btn: !!document.getElementById("badRecCopy"),
          raw: !!document.getElementById("exportBtn")};
});
ck("haveBadRecords() says no", !d5.have);
ck("the buttons are gone", !d5.btn);
ck("and the screen still drew, export and all (control)", d5.raw);

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
