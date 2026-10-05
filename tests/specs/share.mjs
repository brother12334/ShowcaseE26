/* Phase 8, part 2: the coach view (brief build item 5), app side.

   The worker's own routes are tested in tests/share-worker.mjs against a mocked KV. This
   is the half that lives in the app: what goes in a snapshot, what must never go in one,
   and whether the viewer renders a link for somebody who has never used Element 26. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let bad=0;
const ck=(n,c,extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };
/* Every http request is aborted, so nothing in this spec can reach the real service. */
await p.route(/^https?:/, r=> r.abort());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-AB12-CD34',key:'a1b2c3d4e5f60718293a4b5c6d7e8f90',name:'Fer',createdAt:1,cloud:true,ns:''}));
  localStorage.setItem('e26.ns0','E26-AB12-CD34'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal();
  document.body.classList.remove('ai-open','onboarding','pfl-open','spec-open','build-open');
  const el=document.getElementById('preflight'); if(el) el.remove();
  try{PF=null}catch(e){}
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off';
  S.splitId=DEFAULT_SPLIT; applySplit();
  DAYS.forEach(wid=>{ S.program[wid] = [
    {name:"Barbell Bench Press", sets:4, reps:"6-10", rpes:[7,8,8,9], weight:185, note:"elbows in"},
    {name:"Lat Pulldown", sets:3, reps:"8-12", rpes:[8,8,9]}]; });
  /* A log with something in every corner the snapshot can reach. */
  const d = 86400000;
  S.sessions = [];
  for(let i = 8; i >= 1; i--){
    const at = Date.now() - i * 3 * d;
    S.sessions.push({id:"s"+i, workoutId: ROTATION[i % ROTATION.length], date: dayStr(at),
      startedAt: at, finishedAt: at + 55*60000, feel: 4, note: "felt strong",
      quality: {total: 80 + (i % 5), grade: "B+"},
      entries:[{name:"Barbell Bench Press", sets:[
        {weight:"185", reps:"8", rpe:"8", rest:150, done:true},
        {weight:"185", reps:"8", rpe:"9", rest:150, done:true}]}]});
  }
  bodyLog()[todayStr()] = {w: 181.4};
  S.checkins = {}; S.checkins[todayStr()] = {sleep:"7.5", energy:"4"};
  S.hurts = [{id:"h1", ex:"Barbell Bench Press", area:"shoulder", at: Date.now()-5*d, sev:1}];
  S.exNotes = [{at: Date.now()-d, ex:"Lat Pulldown", text:"felt it in the biceps"}];
  save();
});
const ev = (fn, arg) => p.evaluate(fn, arg);

console.log("1 - THE SNAPSHOT IS BUILT FROM A NAMED LIST");
{
  const r = await ev(()=>{
    const snap = shareSnapshot({body:false, sleep:false, injuries:false, notes:false});
    return {keys: Object.keys(snap).sort(), who: snap.who, days: (snap.plan.days||[]).length,
            ex: ((snap.plan.days[0]||{}).exercises||[]).length,
            vol: snap.volume && Object.keys(snap.volume.weekly || {}).length,
            lifts: (snap.lifts||[]).length, grades: (snap.grades||[]).length,
            streak: !!snap.streak, of: snap.of,
            hasBody: "body" in snap, hasSleep: "sleep" in snap,
            hasInj: "injuries" in snap, hasNotes: "notes" in snap};
  });
  ck("it carries the plan, the volume, the lifts, the grades and the streak",
     r.days > 0 && r.ex === 2 && r.vol > 0 && r.grades > 0 && r.streak,
     JSON.stringify(r.keys));
  ck("a name but no account id", r.who.name === "Fer" && !/E26-/.test(JSON.stringify(r.who)),
     JSON.stringify(r.who));
  ck("and the four optional parts are absent, not empty",
     !r.hasBody && !r.hasSleep && !r.hasInj && !r.hasNotes,
     [r.hasBody, r.hasSleep, r.hasInj, r.hasNotes].join(","));
  ck("with a record of what was left out", r.of && r.of.body === false && r.of.notes === false,
     JSON.stringify(r.of));
}

console.log("2 - THE OPTIONAL PARTS GO ONLY WHEN THEY ARE ASKED FOR");
{
  const r = await ev(()=>{
    const snap = shareSnapshot({body:true, sleep:true, injuries:true, notes:true});
    return {body: (snap.body||[]).length, sleep: (snap.sleep||[]).length,
            inj: (snap.injuries||[]).length, notes: (snap.notes||[]).length,
            of: snap.of, exNote: ((snap.plan.days[0]||{}).exercises||[])[0].note,
            sessNote: (snap.grades||[])[0] && (snap.grades||[])[0].note};
  });
  ck("the weigh-ins travel", r.body >= 1, String(r.body));
  ck("the check-ins travel", r.sleep >= 1, String(r.sleep));
  ck("the niggles travel", r.inj >= 1, String(r.inj));
  ck("the notes travel", r.notes >= 1, String(r.notes));
  ck("and the notes reach the plan and the sessions too",
     r.exNote === "elbows in" && /felt strong/.test(r.sessNote || ""),
     r.exNote + " / " + r.sessNote);
  const off = await ev(()=>{
    const snap = shareSnapshot({notes:false});
    return {exNote: ((snap.plan.days[0]||{}).exercises||[])[0].note,
            sessNote: (snap.grades||[])[0] && (snap.grades||[])[0].note};
  });
  ck("with notes off, none of them do", off.exNote === "" && off.sessNote === "",
     JSON.stringify(off));
  const def = await ev(()=> shareOpts());
  ck("all four are off by default",
     !def.body && !def.sleep && !def.injuries && !def.notes, JSON.stringify(def));
  ck("and the default term is thirty days", def.days === 30, String(def.days));
}

console.log("3 - NOTHING THAT COULD SIGN IN AS YOU EVER LEAVES");
{
  const r = await ev(()=>{
    const built = shareSnapshotSafe({body:true, sleep:true, injuries:true, notes:true});
    const text = built.text || "";
    return {err: built.err, len: text.length,
            id: text.indexOf("E26-AB12-CD34") > -1,
            key: text.indexOf("a1b2c3d4e5f60718293a4b5c6d7e8f90") > -1,
            bearer: /bearer/i.test(text), token: /"token"/.test(text)};
  });
  ck("the snapshot is allowed through", r.err == null, String(r.err));
  ck("the account id is not in it", !r.id, String(r.id));
  ck("the recovery key is not in it", !r.key, String(r.key));
  ck("no credential header is in it", !r.bearer && !r.token, r.bearer + "/" + r.token);
  /* And the guard itself: plant something that looks like a key and it must refuse. */
  const caught = await ev(()=>{
    const real = window.shareSnapshot;
    window.shareSnapshot = ()=> ({v:1, who:{name:"Fer"}, oops:{key:"a".repeat(40)}});
    const out = shareSnapshotSafe({});
    window.shareSnapshot = real;
    return out;
  });
  ck("a planted key refuses the whole share", caught.err != null && caught.snap == null,
     String(caught.err));
  const planted = await ev(()=>{
    const real = window.shareSnapshot;
    window.shareSnapshot = ()=> ({v:1, who:{name:"E26-AB12-CD34"}});
    const out = shareSnapshotSafe({});
    window.shareSnapshot = real;
    return out.err;
  });
  ck("and so does a planted account id", planted != null, String(planted));
  const huge = await ev(()=>{
    const real = window.shareSnapshot;
    window.shareSnapshot = ()=> ({v:1, pad:"x".repeat(1100000)});
    const out = shareSnapshotSafe({});
    window.shareSnapshot = real;
    return out.err;
  });
  ck("over a megabyte is refused before it is sent", /megabyte/.test(huge || ""), String(huge));
}

console.log("4 - THE LINK, AND WHAT IT NEEDS");
{
  const r = await ev(()=> ({url: shareUrlFor("f".repeat(32)),
                            max: SHARE_DAYS_MAX, def: SHARE_DAYS_DEFAULT}));
  ck("the link is this page plus the token", /#share=f{32}$/.test(r.url), r.url);
  ck("ninety days is the longest term", r.max === 90, String(r.max));
  const noAcct = await ev(async ()=>{
    const real = ACCT;
    ACCT = null;
    const out = await shareCreate();
    ACCT = real;
    return out;
  });
  ck("with no account it says so rather than failing silently",
     /account/i.test((noAcct && noAcct.err) || ""), JSON.stringify(noAcct));
}

console.log("5 - THE VIEWER RENDERS FROM THE SNAPSHOT AND NOTHING ELSE");
{
  const r = await ev(()=>{
    const snap = shareSnapshot({body:true, sleep:true, injuries:true, notes:true});
    const html = shareViewHTML({snap, at: snap.at, expiresAt: Date.now() + 30*86400000, label:""});
    return {html, len: html.length,
            hasPlan: html.indexOf("Barbell Bench Press") > -1,
            hasVol: /Weekly sets per muscle/.test(html),
            hasStreak: /Weeks on target/.test(html),
            hasGrades: /Recent sessions/.test(html),
            hasBody: /Bodyweight/.test(html),
            explains: /MEV/.test(html) && /least that maintains/.test(html),
            id: html.indexOf("E26-AB12-CD34") > -1,
            key: html.indexOf("a1b2c3d4e5f60718293a4b5c6d7e8f90") > -1};
  });
  ck("the plan is on the page", r.hasPlan, String(r.hasPlan));
  ck("so is the volume table", r.hasVol, String(r.hasVol));
  ck("the streak and the session grades too", r.hasStreak && r.hasGrades,
     r.hasStreak + "/" + r.hasGrades);
  ck("the shared extras appear", r.hasBody, String(r.hasBody));
  ck("every term a stranger would not know is explained", r.explains, String(r.explains));
  ck("and no credential reaches the page", !r.id && !r.key, r.id + "/" + r.key);
  const off = await ev(()=>{
    const snap = shareSnapshot({body:false, sleep:false, injuries:false, notes:false});
    const html = shareViewHTML({snap, at: snap.at, expiresAt: Date.now() + 30*86400000});
    return {html, saysWhat: /Not included in this link/.test(html),
            noBody: !/Bodyweight<\/h3>/.test(html)};
  });
  ck("a link with nothing optional says what is missing", off.saysWhat, String(off.saysWhat));
  ck("rather than leaving a reader to assume", off.noBody, String(off.noBody));
}

console.log("6 - A SHARE PAGE IS NOT THE APP");
{
  const r = await ev(()=>{
    document.body.classList.add("share-view");
    const before = document.getElementById("app").innerHTML;
    render();                                    // every timer in the app calls this
    const after = document.getElementById("app").innerHTML;
    document.body.classList.remove("share-view");
    return {same: before === after};
  });
  ck("render() refuses to draw over a shared page", r.same, String(r.same));
  const guard = await ev(()=>{
    const re = /(^|#|&)share=([a-f0-9]{32})\b/;
    return {good: re.test("#share=" + "a".repeat(32)),
            short: re.test("#share=abc"),
            upper: re.test("#share=" + "A".repeat(32))};
  });
  ck("only a 32-character hex token is read as one",
     guard.good && !guard.short && !guard.upper, JSON.stringify(guard));
}

console.log("7 - THE SETTINGS SCREEN OFFERS THE FOUR CHOICES AND THE TERMS");
{
  const r = await ev(()=>{
    const h = settingsShareHTML();
    return {h, opts: SHARE_EXTRAS.map(x=> h.indexOf("data-shopt-" + x.k) > -1),
            days: [7,30,90].map(d=> h.indexOf('data-shdays="' + d + '"') > -1),
            make: h.indexOf('id="shMake"') > -1,
            never: /Never shared/.test(h)};
  });
  ck("each optional content has its own control", r.opts.every(Boolean), JSON.stringify(r.opts));
  ck("the three terms are offered", r.days.every(Boolean), JSON.stringify(r.days));
  ck("there is a way to make one", r.make, String(r.make));
  ck("and the screen says what is never shared", r.never, String(r.never));
}

/* THE ACCOUNT SERVICE IS DEPLOYED BY HAND AND THE APP IS NOT, so the two halves can be
   different versions. A Worker that predates sharing answers every /share route with its
   catch-all {error:"not found"}, and that string used to reach the toast verbatim —
   somebody pressing "Make a link" was told "not found" and had nothing to do about it.
   Each route is answered here with a real 404 to prove the app now says which half is
   behind, and that it is honest about nothing having been sent. */
console.log("8 - AN ACCOUNT SERVICE THAT DOES NOT KNOW ABOUT SHARING YET");
{
  const r = await p.evaluate(async ()=>{
    ACCT = Object.assign({}, ACCT, {cloud:true, id:"E26-X", key:"k".repeat(32)});
    const real = window.fetch;
    const hits = [];
    window.fetch = async (u, o)=>{
      hits.push(String(u).replace(/^https?:\/\/[^/]+/, "") + " " + ((o && o.method) || "GET"));
      return new Response(JSON.stringify({error:"not found"}),
        {status:404, headers:{"Content-Type":"application/json"}});
    };
    let made, listed;
    try{
      made = await shareCreate();
      listed = await shareList();
    } finally { window.fetch = real; }
    return {made, listed, hits, msg: SHARE_NO_ROUTE};
  });
  ck("making a link asks the right route", /^\/share POST$/.test(r.hits[0] || ""), JSON.stringify(r.hits));
  ck("it fails rather than returning a dead link", !r.made.token && !!r.made.err, JSON.stringify(r.made));
  ck("it does not repeat the worker's \"not found\"",
     !/not found/i.test(r.made.err), r.made.err);
  ck("it says the service needs updating",
     /needs updating/i.test(r.made.err), r.made.err);
  ck("and that nothing left the device",
     /nothing has left your device/i.test(r.made.err), r.made.err);
  ck("the failure is marked as the service being behind", r.made.stale === true, JSON.stringify(r.made));
  ck("listing says the same rather than showing no links as though it worked",
     r.listed.err === r.msg && r.listed.stale === true, JSON.stringify(r.listed));
  ck("and lists nothing", Array.isArray(r.listed.shares) && r.listed.shares.length === 0,
     JSON.stringify(r.listed));
}

/* The one place a 404 still means what it says. */
console.log("9 - A LINK THAT REALLY IS GONE STILL READS AS GONE");
{
  const r = await p.evaluate(async ()=>{
    const real = window.fetch;
    window.fetch = async ()=> new Response(JSON.stringify({error:"not found"}),
      {status:404, headers:{"Content-Type":"application/json"}});
    let got;
    try{ got = await shareFetch("a".repeat(32)); } finally { window.fetch = real; }
    return got;
  });
  ck("the viewer says expired or revoked", /expired or been revoked/i.test(r.err || ""), JSON.stringify(r));
}

console.log("10 - NOTHING THREW");
ck("no page errors", errs.length === 0, errs.join(" | "));
console.log(bad ? "BROKEN: " + bad : "all good");
await b.close();
process.exit(bad ? 1 : 0);
