import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
/* "IT ASKS ME THIS EVERY TIME."

   The report was the plate-count prompt coming back after it had been answered. The merge
   took every preference key from whichever copy was newer, and because PREF_DEFAULTS seeds
   the whole object, an unanswered question is an explicit null rather than a missing key.
   So any newer copy that had never been asked put the answer back to null and the prompt
   returned mid-set. This spec pins the rule: a newer value wins only when it IS a value. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding');
  const af=document.getElementById('aiFull'); if(af) af.hidden=true;
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr();
  S.prefs = Object.assign({}, S.prefs, {sleepPrompt:false});
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

/* A newer copy, as sync or a second device would hand one over: it carries a plan, so the
   newer-wins branch runs, and it has never answered the plate question. */
const newerCopy = (prefs)=> p.evaluate(pr=>{
  const disk = JSON.parse(JSON.stringify(S));
  disk.savedAt = (Number(S.savedAt)||Date.now()) + 60000;
  disk.prefs = Object.assign({}, S.prefs, pr);
  return disk;
}, prefs);

console.log("1 - AN ANSWERED SETTING SURVIVES A NEWER COPY THAT NEVER ANSWERED IT");
{
  const disk = await newerCopy({plateStep:null, smithWeight:null});
  const r = await p.evaluate(d=>{
    trainPrefs().plateStep = 2.5; trainPrefs().smithWeight = 25; save();
    const before = trainPrefs().plateStep;
    mergeDiskInto(d);
    return {before, after: trainPrefs().plateStep, smith: trainPrefs().smithWeight};
  }, disk);
  ck("it was answered before the merge", r.before===2.5, r.before);
  ck("and it is still answered after it", r.after===2.5, String(r.after));
  ck("same for the carriage weight beside it", r.smith===25, String(r.smith));
}

console.log("\n2 - A NEWER COPY WITH A REAL ANSWER STILL WINS");
{
  const disk = await newerCopy({plateStep:1.25});
  const r = await p.evaluate(d=>{ mergeDiskInto(d); return trainPrefs().plateStep; }, disk);
  ck("the newer value replaces the older one", r===1.25, String(r));
}

console.log("\n3 - A FALSE OR ZERO ANSWER IS AN ANSWER, NOT AN ABSENCE");
{
  const disk = await newerCopy({sleepPrompt:false});
  const r = await p.evaluate(d=>{
    trainPrefs().sleepPrompt = true; save();
    mergeDiskInto(d);
    return trainPrefs().sleepPrompt;
  }, disk);
  ck("switching a prompt off propagates", r===false, String(r));
}

console.log("\n4 - A KEY THIS COPY HAS NEVER SEEN STILL ARRIVES, SHAPE AND ALL");
{
  const disk = await p.evaluate(()=>{
    const d = JSON.parse(JSON.stringify(S));
    d.savedAt = (Number(S.savedAt)||Date.now()) + 60000;
    d.prefs = Object.assign({}, S.prefs, {e26SpecOnlyOnDisk:null});
    return d;
  });
  const r = await p.evaluate(d=>{
    delete S.prefs.e26SpecOnlyOnDisk;
    mergeDiskInto(d);
    return {present: ("e26SpecOnlyOnDisk" in S.prefs), value: S.prefs.e26SpecOnlyOnDisk};
  }, disk);
  ck("the key is created", r.present, String(r.present));
  ck("holding the null it came with", r.value===null, String(r.value));
}

console.log("\n5 - AND THE SAVE PATH ITSELF NO LONGER FORGETS IT");
{
  const r = await p.evaluate(()=>{
    trainPrefs().plateStep = 2.5; save();
    /* Somebody else's newer copy lands on disk between our saves, exactly as a sync write
       or a second tab does. The next save merges it before writing. */
    const d = JSON.parse(localStorage.getItem(dataKey()));
    d.savedAt = (Number(d.savedAt)||Date.now()) + 60000;
    d.prefs = Object.assign({}, d.prefs, {plateStep:null});
    localStorage.setItem(dataKey(), JSON.stringify(d));
    save();
    return {live: trainPrefs().plateStep,
            onDisk: (JSON.parse(localStorage.getItem(dataKey())).prefs||{}).plateStep};
  });
  ck("the answer is still in memory after the save", r.live===2.5, String(r.live));
  ck("and it is what got written back to disk", r.onDisk===2.5, String(r.onDisk));
}

console.log("\n6 - SO THE PLATE QUESTION DOES NOT COME BACK");
{
  const r = await p.evaluate(()=>{
    TAB="sync"; SET_PAGE="where"; render();
    return {asks: /smallest plate you can put on each side/i.test(document.body.innerText),
            step: trainPrefs().plateStep};
  });
  ck("the setting reads as answered", r.step===2.5, String(r.step));
  ck("the page offers it to change, not to answer from scratch", r.asks, String(r.asks));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
