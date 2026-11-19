import { chromium, APP_URL, appFile } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* "THE RESEARCH SAID 429" — AND THE APP SAID THE SERVICE COULD NOT BE REACHED.

   Two separate defects behind one report, and this spec is about both.

   The message was wrong. 429 is the service answering, on time and clearly, to say it is
   being asked too often; "Couldn't reach the research service" sends somebody to look for
   an outage that is not there. Section 2 requires the honest headline and requires the
   dishonest one to be absent.

   And the asking was real. The ONLY thing that stopped the app fetching again was a
   successfully saved copy of the feed — and that copy is deliberately disposable, so on a
   device short of room it kept being cleared. bindResearch() runs after every render, so
   every redraw of the tab, including every keystroke in the search box, fetched the whole
   752 KB library again. Sections 3 and 4 are the fix: a brake kept somewhere the pruner
   cannot reach, which still holds when the cache it protects is gone.

   Section 3's control is the one that matters. "No more fetches happened" is worthless on
   its own — a typo in the selector, a render that silently did nothing, a stub that was
   never called would all produce it. So the brake is cleared and the same renders are run
   again, and a fetch MUST appear. If it does not, this spec is measuring nothing. */
const FX = JSON.parse(readFileSync(appFile('tests/fixtures/state-2026-11-17.json'), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };

await p.evaluate(fx=>{
  window.boot = ()=>{
    const sp=document.getElementById('splash'); if(sp) sp.remove();
    try{OB=null}catch(e){} hideModal();
    document.body.classList.remove('ai-open','onboarding','pfl-open');
    ['preflight','aiFull'].forEach(id=>{ const el=document.getElementById(id); if(el) el.remove(); });
    try{PF=null}catch(e){}
    Object.keys(S).forEach(k=>{ delete S[k]; });
    Object.keys(fx).forEach(k=>{ S[k] = JSON.parse(JSON.stringify(fx[k])); });
    S.tourDone = true;
    migrate(); try{ applySplit(); }catch(e){}
    try{ SEEDS_RUN = false; }catch(e){}
    render(); save();
  };
  /* THE SERVICE, UNDER THIS TEST'S CONTROL. Every call is recorded with its URL, because
     what the app asks for is half of what is being fixed here. */
  window.NET = {calls: [], mode: "ok", papers: []};
  window.fetch = async (url, opts)=>{
    NET.calls.push(String(url));
    if(NET.mode === "429") return new Response(JSON.stringify({error:"rate limit"}),
      {status:429, headers:{"content-type":"application/json","retry-after":"45"}});
    if(NET.mode === "500") return new Response("boom", {status:500});
    if(NET.mode === "throw") throw new Error("Failed to fetch");
    return new Response(JSON.stringify({papers: NET.papers}),
      {status:200, headers:{"content-type":"application/json"}});
  };
  window.renderResearch = (n)=>{ TAB = "research"; for(let i=0;i<n;i++) render(); };
}, FX);
await p.evaluate(()=> window.boot());

const ev = f=> p.evaluate(f);
const sleep = ms=> new Promise(r=> setTimeout(r, ms));

console.log("\n1. AN EMPTY CACHE ASKS FOR EVERYTHING, ONCE");
let r = await ev(async ()=>{
  localStorage.removeItem(RESEARCH_CACHE_KEY); localStorage.removeItem(RESEARCH_TRY_KEY);
  NET.calls = []; NET.mode = "ok"; NET.papers = [{id:"p1", title:"One", approved:true, addedAt: Date.now()}];
  renderResearch(1);
  await new Promise(r=> setTimeout(r, 300));
  return {calls: NET.calls.slice(), kind: RESEARCH_ERROR_KIND,
          cached: (researchCacheRead()||{papers:[]}).papers.length};
});
ck("configured, so the empty tab asks the service", r.calls.length === 1, r.calls.length + " call(s)");
ck("and asks for the whole library, no since", r.calls.length === 1 && !/since=/.test(r.calls[0]),
   (r.calls[0]||"").replace(/^https?:\/\/[^/]+/, ""));
ck("the answer is stored", r.cached === 1, r.cached + " paper(s)");

console.log("\n2. A 429 IS AN ANSWER, AND THE SCREEN SAYS WHAT IT SAID");
r = await ev(async ()=>{
  localStorage.removeItem(RESEARCH_CACHE_KEY); localStorage.removeItem(RESEARCH_TRY_KEY);
  RESEARCH_ERROR = ""; RESEARCH_ERROR_KIND = "";
  NET.calls = []; NET.mode = "429";
  renderResearch(1);
  await new Promise(r=> setTimeout(r, 300));
  TAB = "research"; render();
  const html = document.getElementById("app").innerHTML;
  return {kind: RESEARCH_ERROR_KIND, html, rec: researchTryRead(), held: researchHeldUntil()};
});
ck("the failure is classified as busy, not as unreachable", r.kind === "busy", r.kind);
ck("the headline says the service is busy", /The research service is busy/.test(r.html));
ck("CONTROL: it does NOT claim the service was unreachable",
   !/Couldn.t reach the research service/.test(r.html));
ck("it says when the next check is", /next check is in /.test(r.html));
/* max(our floor, what it asked for) — never less than the service's own number, and never
   so eager that five failures running are five retries a minute apart. */
ck("the wait is never shorter than the service asked for",
   r.rec.until - r.rec.at >= 45000, Math.round((r.rec.until - r.rec.at)/1000) + "s");
ck("the brake is on", r.held > Date.now() - 1000, r.held ? "held" : "not held");
const onDisk = await ev(()=> !!localStorage.getItem(RESEARCH_TRY_KEY));
ck("the brake is written to disk, so a reload cannot clear it", onDisk === true,
   onDisk ? "on disk" : "NOT on disk");

console.log("\n3. HELD BACK MEANS HELD BACK, HOWEVER MANY TIMES THE TAB REDRAWS");
r = await ev(async ()=>{
  NET.calls = [];
  renderResearch(40);                     // forty redraws: what typing in the search box does
  await new Promise(r=> setTimeout(r, 300));
  const whileHeld = NET.calls.length;
  /* THE CONTROL. Take the brake off and run exactly the same renders. A fetch must appear,
     or the zero above proves nothing about the brake. */
  localStorage.removeItem(RESEARCH_TRY_KEY);
  RESEARCH_ERROR = ""; RESEARCH_ERROR_KIND = "";
  NET.calls = [];
  renderResearch(40);
  await new Promise(r=> setTimeout(r, 300));
  return {whileHeld, released: NET.calls.length};
});
ck("forty redraws under the brake make no requests", r.whileHeld === 0, r.whileHeld + " call(s)");
ck("CONTROL: with the brake off the same renders DO fetch", r.released >= 1, r.released + " call(s)");
ck("and even released, forty renders are not forty requests", r.released <= 2, r.released + " call(s)");

console.log("\n4. THE BRAKE OUTLIVES THE CACHE IT PROTECTS");
r = await ev(async ()=>{
  NET.mode = "429"; localStorage.removeItem(RESEARCH_TRY_KEY);
  RESEARCH_ERROR = ""; RESEARCH_ERROR_KIND = "";
  renderResearch(1); await new Promise(r=> setTimeout(r, 300));
  /* The exact condition that caused the flood: the pruner takes the feed cache. */
  localStorage.removeItem(RESEARCH_CACHE_KEY);
  const cat = storageCategoryOf(RESEARCH_TRY_KEY);
  NET.calls = [];
  renderResearch(20); await new Promise(r=> setTimeout(r, 300));
  return {calls: NET.calls.length, drop: cat.drop, id: cat.id,
          dropCache: storageCategoryOf(RESEARCH_CACHE_KEY).drop};
});
ck("CONTROL: the feed cache really is disposable", r.dropCache === true);
ck("but the brake is not", r.drop === false, r.id);
ck("so losing the cache does not restart the flood", r.calls === 0, r.calls + " call(s)");

console.log("\n5. IT ASKS FOR WHAT CHANGED, NOT FOR ALL OF IT");
r = await ev(async ()=>{
  localStorage.removeItem(RESEARCH_TRY_KEY);
  RESEARCH_ERROR = ""; RESEARCH_ERROR_KIND = "";
  const twoDays = Date.now() - 2 * 24 * 60 * 60 * 1000;
  researchCacheWrite([{id:"old1", title:"Kept", approved:true, addedAt: twoDays}], twoDays);
  NET.mode = "ok"; NET.papers = [{id:"new1", title:"New", approved:true, addedAt: Date.now()}];
  NET.calls = [];
  renderResearch(1); await new Promise(r=> setTimeout(r, 400));
  const ids = (researchCacheRead()||{papers:[]}).papers.map(x=> x.id).sort();
  /* Past the stale window there is nothing left to be incremental about. */
  const old = Date.now() - 9 * 24 * 60 * 60 * 1000;
  researchCacheWrite([{id:"old1", title:"Kept", approved:true, addedAt: old}], old);
  localStorage.removeItem(RESEARCH_TRY_KEY);
  const second = [];
  NET.calls = [];
  renderResearch(1); await new Promise(r=> setTimeout(r, 400));
  return {first: NET.calls.length, ids, firstUrl: (await 0, null)};
}).then(async x=> Object.assign(x, await ev(()=> ({last: NET.calls.slice(-1)[0] || ""}))));
ck("a paper already held is never dropped by an incremental answer",
   r.ids.join(",") === "new1,old1", r.ids.join(","));
ck("a cache older than the stale window asks for the lot again",
   !/since=/.test(r.last), r.last.replace(/^https?:\/\/[^/]+/, ""));

r = await ev(async ()=>{
  localStorage.removeItem(RESEARCH_TRY_KEY);
  const twoDays = Date.now() - 2 * 24 * 60 * 60 * 1000;
  researchCacheWrite([{id:"old1", approved:true, addedAt: twoDays}], twoDays);
  NET.calls = [];
  renderResearch(1); await new Promise(r=> setTimeout(r, 400));
  return {url: NET.calls[0] || "", at: twoDays};
});
ck("a cache inside the stale window asks only for what is new", /since=\d+/.test(r.url),
   r.url.replace(/^https?:\/\/[^/]+/, ""));
ck("and it overlaps rather than starting exactly where it left off",
   (()=>{ const m = r.url.match(/since=(\d+)/); return m && Number(m[1]) < r.at; })());

console.log("\n6. A TAP IS A PERSON DECIDING, AND GOES THROUGH");
r = await ev(async ()=>{
  NET.mode = "429"; localStorage.removeItem(RESEARCH_TRY_KEY);
  RESEARCH_ERROR = ""; RESEARCH_ERROR_KIND = ""; localStorage.removeItem(RESEARCH_CACHE_KEY);
  renderResearch(1); await new Promise(r=> setTimeout(r, 300));
  TAB = "research"; render();
  const btn = document.getElementById("rsRetry");
  NET.calls = [];
  if(btn) btn.click();
  await new Promise(r=> setTimeout(r, 300));
  return {had: !!btn, calls: NET.calls.length};
});
ck("CONTROL: the busy screen offers a way out", r.had === true);
ck("and tapping it asks, brake or no brake", r.calls === 1, r.calls + " call(s)");

console.log("\n7. A SERVER ERROR IS NOT A NETWORK FAILURE EITHER");
r = await ev(async ()=>{
  NET.mode = "500"; localStorage.removeItem(RESEARCH_TRY_KEY);
  RESEARCH_ERROR = ""; RESEARCH_ERROR_KIND = ""; localStorage.removeItem(RESEARCH_CACHE_KEY);
  renderResearch(1); await new Promise(r=> setTimeout(r, 300));
  TAB = "research"; render();
  const a = {kind: RESEARCH_ERROR_KIND, html: document.getElementById("app").innerHTML};
  NET.mode = "throw"; localStorage.removeItem(RESEARCH_TRY_KEY);
  RESEARCH_ERROR = ""; RESEARCH_ERROR_KIND = "";
  renderResearch(1); await new Promise(r=> setTimeout(r, 300));
  TAB = "research"; render();
  return Object.assign(a, {kind2: RESEARCH_ERROR_KIND,
                           html2: document.getElementById("app").innerHTML});
});
ck("a 500 is reported as the service's problem", r.kind === "server", r.kind);
ck("and says so on the screen", /The research service had a problem/.test(r.html));
ck("CONTROL: a genuine network failure still says unreachable",
   r.kind2 === "net" && /Couldn.t reach the research service/.test(r.html2), r.kind2);

console.log("\n8. EXPORT RAW DATA IS IN SETTINGS, AND NOWHERE ELSE ON A PAGE");
r = await ev(()=>{
  const out = {};
  localStorage.removeItem(RESEARCH_TRY_KEY);
  ["program","research","today","history","body","workout"].forEach(t=>{
    TAB = t; try{ render(); }catch(e){}
    out[t] = document.getElementById("app").innerHTML.indexOf('id="rescueRaw"') > -1;
  });
  out.settings = /id="stoExport"/.test(storageCardHTML());
  out.crashPanel = /id="rescueRaw"/.test(RESCUE_BTNS);
  out.bare = /id="rescueRaw"/.test(rescueBareHTML(new Error("x")));
  /* BOTH BRANCHES, not whichever one this fixture happens to render. The set-aside
     records card had a raw export in each, and an empty fixture would pass a rendered
     check without ever drawing either. */
  out.badrecSrc = /id="rescueRaw"/.test(dataIssueCardHTML.toString());
  out.badrecHas = /id="badRecFile"/.test(dataIssueCardHTML.toString());
  return out;
});
["program","research","today","history","body","workout"].forEach(t=>
  ck("no raw export on the " + t + " tab", r[t] === false));
ck("CONTROL: it IS in Settings › Storage", r.settings === true);
ck("the crashed-tab panel keeps its own, where Settings may be what broke",
   r.crashPanel === true);
ck("so does the screen that could not be drawn at all", r.bare === true);
ck("neither branch of the set-aside records card offers it any more", r.badrecSrc === false);
ck("CONTROL: that card kept its own purpose-built buttons", r.badrecHas === true);

ck("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
console.log(bad ? "\nFAILED: " + bad : "\nAll good");
process.exit(bad ? 1 : 0);
