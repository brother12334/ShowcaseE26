/* THE SCORE COUNTS ITSELF UP.

   The finish card's grade used to climb to its number while you watched:
   `<span data-countup>${q.total}</span>/${q.max}`. 23.1 replaced that single total with
   a four-tile row and the helper that draws the tiles did not carry the attribute over,
   so the one number on the card worth waiting for started arriving already finished.
   Nothing decided that -- it was lost in a refactor, which is exactly the kind of loss
   nothing in the suite would have noticed.

   Only the score climbs. Four tiles counting at once is a slot machine. */
import { chromium, APP_URL } from './_e26.mjs';
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
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.priorTrainingWeeks=104; S.seenNews='x';
  S.splitId=DEFAULT_SPLIT; applySplit();
  const wid=ROTATION[0], prog=(S.program[wid]||[]).slice(0,5);
  const sess={id:"live",workoutId:wid,date:todayStr(),startedAt:Date.now()-3300e3,
    finishedAt:Date.now(),feel:4,
    entries:prog.map((e,k)=>({name:e.name,reps:e.reps,sets:[0,1,2].map((_,j)=>
      ({weight:String(95+k*10),reps:String(11-j),rpe:String(8+j*0.5),done:true,rest:110}))}))};
  S.sessions.push(sess);
  sess.quality = scoreWorkout(sess); save();
  window.__s = sess;
});

console.log("1 - THE SCORE TILE ASKS FOR THE SLOW COUNT, AND ONLY IT");
{
  const r = await p.evaluate(()=>{
    const html = scoreCardHTML(window.__s.quality, window.__s);
    const d = document.createElement("div"); d.innerHTML = html;
    const tiles = [...d.querySelectorAll(".sc-tile")];
    return {tiles: tiles.length,
            counted: tiles.filter(t=> t.querySelector("[data-countup]")).length,
            first: !!tiles[0] && !!tiles[0].querySelector('[data-countup="slow"]'),
            total: window.__s.quality.total};
  });
  ck("the card still has its tile row", r.tiles >= 4, String(r.tiles));
  ck("the score tile counts up", r.first === true, "");
  ck("and it is the only one that does", r.counted === 1, String(r.counted));
  ck("there is a score to count to", r.total > 0, String(r.total));
}

console.log("2 - AND IT ACTUALLY CLIMBS, FROM ZERO TO THE GRADE");
{
  await p.evaluate(()=> openScoreCard(window.__s, ()=>{}));
  /* The hold is 260ms and the climb up to 1.9s, so this is early in the climb. */
  await p.waitForTimeout(340);
  const mid = await p.evaluate(()=>{
    const el = document.querySelector("#modal .sc-tile b[data-countup]");
    return el ? el.textContent.trim() : "(none)";
  });
  await p.waitForTimeout(2600);
  const end = await p.evaluate(()=>{
    const el = document.querySelector("#modal .sc-tile b[data-countup]");
    return {txt: el ? el.textContent.trim() : "(none)", want: String(window.__s.quality.total)};
  });
  const midN = parseFloat(mid), endN = parseFloat(end.want);
  ck("it is still below the grade partway through", isFinite(midN) && midN < endN, mid + " of " + end.want);
  ck("and it lands exactly on the grade", end.txt === end.want, end.txt + " / " + end.want);
}

console.log("3 - WITH MOTION OFF IT IS SIMPLY THE NUMBER");
{
  const r = await p.evaluate(()=>{
    const el = document.createElement("b");
    el.setAttribute("data-countup", "slow");
    el.textContent = "37";
    document.body.appendChild(el);
    const real = window.reducedMotion;
    window.reducedMotion = ()=> true;
    countUpAll(document.body);
    const txt = el.textContent;
    window.reducedMotion = real; el.remove();
    return txt;
  });
  ck("no climb, no hold on zero", r === "37", r);
}

console.log("4 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
