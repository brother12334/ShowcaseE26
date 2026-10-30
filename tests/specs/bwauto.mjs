import { chromium, APP_URL } from './_e26.mjs';
/* "FOR ANY BODYWEIGHT EXERCISE THE BODYWEIGHT LOOK SHOULD AUTOMATICALLY BE APPLIED, YOU
   SHOULDN'T HAVE TO ADD YOU, AND ALSO REMOVE THAT BUTTON THAT SAYS +YOU."

   Counting yourself was opt-in, behind a button at the foot of the card. A dip is a dip
   whether or not anybody found that button, and what you got for not finding it was
   "149.6 lb" — the reading nobody wants, on the one movement where the number is mostly
   a person.

   What the opt-in was protecting is still protected: only the lifter knows whether a set
   was a full dip or half of one off a band, so turning it OFF is one tap and sticks. */
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1300}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const BW = 139.8;
const boot = (name, weight, opts)=> p.evaluate(a=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.bodyLog = (a.opts && a.opts.noWeighIn) ? {} : {[todayStr()]:{w:a.BW}};
  S.bwEx = (a.opts && a.opts.said !== undefined) ? {[nrm(a.name)]: a.opts.said} : {};
  S.sessions = [];
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0];
  S.program[wid]=[{name:a.name, sets:3, reps:"4-8", weight:a.weight}];
  save(); S.active=null; startWorkout(wid); PF=null; TAB="workout"; save();
  const el=document.getElementById('preflight'); if(el) el.remove(); try{PF=null}catch(e){}
  render();
  const en=S.active.entries[0];
  const inp=document.querySelector('.set input[data-f="weight"]');
  return {on: entryBwOn(en), said: S.bwEx[nrm(a.name)],
          foot: document.querySelectorAll('.card.ex .btn[data-bw]').length,
          need: document.querySelectorAll('[data-bwneed]').length,
          pre: !!document.querySelector('.wx-pre'),
          ph: inp ? inp.placeholder : null,
          line: (document.querySelector('.plate-line')||{}).innerText || null};
}, {name, weight, opts: opts||null, BW});

console.log("1 - A DIPS CARD COUNTS YOU WITHOUT BEING ASKED");
{
  const r = await boot("Weighted Chest Dips", 149.6);
  console.log("   ", JSON.stringify(r));
  ck("it is on from the first session", r.on === BW, String(r.on));
  ck("with nothing recorded as a choice", r.said === undefined, String(r.said));
  ck("THE +YOU BUTTON IS GONE", r.foot === 0, String(r.foot));
  ck("the box asks for what you add", r.pre && r.ph === "9.8",
     JSON.stringify({pre: r.pre, ph: r.ph}));
  ck("and the line leads with bw+9.8", /bw\+9\.8/.test(r.line || ""), r.line);
}

console.log("2 - SO DOES A PLAIN PULL-UP, WHERE YOU ARE THE WHOLE LOAD");
{
  const r = await boot("Pull-Ups", 0);
  console.log("   ", JSON.stringify(r));
  ck("it counts you", r.on === BW, String(r.on));
  ck("the line says so rather than going blank", /^bw\b/.test((r.line||"").trim()), r.line);
  ck("and still no button", r.foot === 0, String(r.foot));
}

console.log("3 - AN OLD BELT-ONLY NUMBER IS READ AS THE BELT");
/* Plenty of dips were written down as "25" before any of this existed. Read as a total,
   25 is a dip done by somebody a fifth of your size. */
{
  const r = await boot("Weighted Chest Dips", 25);
  console.log("   ", JSON.stringify(r));
  ck("the box offers the 25 as what you add", r.ph === "25", String(r.ph));
  ck("the line reads bw+25, not bw−114.8", /bw\+25/.test(r.line || ""), r.line);
  ck("and never shows a minus", !/bw−|bw-/.test(r.line || ""), r.line);
}

console.log("4 - TURNING IT OFF IS AN ANSWER, AND IT STICKS");
{
  const r = await p.evaluate(()=>{
    const sw = document.querySelector('.bw-led [data-bw]');
    if(sw) sw.click();
    const en = S.active.entries[0];
    return {clicked: !!sw, on: entryBwOn(en), said: S.bwEx[nrm("Weighted Chest Dips")],
            remembered: bwRemembered("Weighted Chest Dips"),
            /* Guarded, so a build without the helper reports the BEHAVIOUR as broken
               rather than dying on a missing name. */
            auto: (typeof bwAutoCount === "function") ? bwAutoCount("Weighted Chest Dips") : null};
  });
  console.log("   ", JSON.stringify(r));
  ck("the switch is on the load line", r.clicked, String(r.clicked));
  ck("it turns the counting off", r.on === 0, String(r.on));
  ck("recorded as an answer", r.said === 0, String(r.said));
  ck("the movement would otherwise be counted", r.auto === true, String(r.auto));
  ck("but the answer wins", r.remembered === false, String(r.remembered));
}

console.log("5 - AND THE NEXT SESSION HONOURS IT");
{
  const r = await boot("Weighted Chest Dips", 149.6, {said: 0});
  console.log("   ", JSON.stringify(r));
  ck("still off", r.on === 0, String(r.on));
  ck("no bw+ on the box", !r.pre, String(r.pre));
  ck("and no button in the set controls", r.foot === 0, String(r.foot));
  /* With the button gone, off has to stay reversible, so the off state says what it is
     and offers the way back in the place the bw+ line would be. */
  const back = await p.evaluate(()=>{
    const l = document.querySelector('.bw-off'), a = document.querySelector('.bw-off [data-bw]');
    if(a) a.click();
    return {said: l ? l.innerText.replace(/\s+/g," ").trim() : null,
            on: entryBwOn(S.active.entries[0]), rec: S.bwEx[nrm("Weighted Chest Dips")]};
  });
  console.log("   ", JSON.stringify(back));
  ck("the card says it is not counting you", /not counting your bodyweight/i.test(back.said || ""),
     back.said);
  ck("and one tap puts it back", back.on === 139.8 && back.rec === 1,
     JSON.stringify({on: back.on, rec: back.rec}));
}

console.log("6 - WITH NO WEIGH-IN IT SAYS WHY, WHERE THE BW+ LINE WOULD BE");
{
  const r = await boot("Weighted Chest Dips", 149.6, {noWeighIn: true});
  console.log("   ", JSON.stringify(r));
  ck("nothing is counted, because there is nothing to count", r.on === 0, String(r.on));
  ck("the card says so", /weigh-in/i.test(r.line || ""), r.line);
  ck("with one tap to the answer", r.need === 1, String(r.need));
  ck("and still no +you button", r.foot === 0, String(r.foot));
}

console.log("7 - AND NOTHING THAT IS NOT YOU IS SWEPT IN");
{
  const r = await boot("Barbell Bench Press", 185);
  console.log("   ", JSON.stringify(r));
  ck("a barbell lift is untouched", r.on === 0 && !r.pre, JSON.stringify({on: r.on, pre: r.pre}));
  ck("and its box is the plain load", r.ph === "185", String(r.ph));
  const a = await boot("Assisted Pull Up", 100);
  console.log("   ", JSON.stringify(a));
  ck("so is assisted work, whose machine takes weight off",
     a.on === 0 && !a.pre, JSON.stringify({on: a.on, pre: a.pre}));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
