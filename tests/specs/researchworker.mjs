/* THE VERIFICATION AND FAITHFULNESS RULES, RUN ON FIXTURES.

   These are the rules that decide whether a paper a reader sees is real and whether the
   sentence under it is true of that paper. They are pure functions in
   proxy/research-worker.js for exactly this reason: they can be run with no network, no
   key and no KV, so there is no excuse for them being untested.

   Every fixture below is synthetic. No real paper's metadata is asserted here, because a
   test that hard-codes a DOI is a test that goes stale and starts lying. */
import { __test } from '../../proxy/research-worker.js';
const {titleAgrees, evidenceType, screen, checkFaithful, numbersIn, monthNum,
       verify, needsApproval, launchApproved, servable} = __test;

let bad = 0;
const ck = (n, c, extra)=>{ console.log((c?"  ok  ":"  BROKEN  ")+n+(c?"":" :: "+(extra||""))); if(!c) bad++; };

console.log("1 - A TITLE THAT DISAGREES WITH CROSSREF IS A DIFFERENT PAPER");
{
  ck("identical titles agree",
     titleAgrees("Effects of training volume on hypertrophy",
                 "Effects of training volume on hypertrophy") === true, "");
  /* The loose comparison exists because Crossref and PubMed disagree about punctuation on
     a large minority of records; it must not become loose enough to match a different
     paper. */
  ck("punctuation and case differences still agree",
     titleAgrees("Effects of Training Volume on Hypertrophy.",
                 "effects of training volume on hypertrophy") === true, "");
  ck("a truncated title still agrees if it is a clean prefix",
     titleAgrees("Effects of training volume on muscle hypertrophy in trained men",
                 "Effects of training volume on muscle hypertrophy in trained me") === true, "");
  ck("A DIFFERENT PAPER DOES NOT AGREE",
     titleAgrees("Effects of training volume on hypertrophy",
                 "Effects of creatine on sprint performance") === false, "");
  ck("and a title that is merely contained in another does not agree",
     titleAgrees("volume", "Effects of training volume on hypertrophy") === false, "");
  ck("a missing title never agrees", titleAgrees(null, "anything") === false, "");
}

console.log("2 - A RETRACTED PAPER IS NEVER SHOWN");
{
  const base = {pmid:"123", title:"A trial", journal:"J Sport", year:"2026",
                abstract:"x".repeat(400), types:[], doi:null, absParts:[], authors:[], mesh:[]};
  const r1 = await verify(Object.assign({}, base, {types:["Retracted Publication"]}));
  ck("PUBMED'S RETRACTION TYPE DROPS IT", r1.ok === false, JSON.stringify(r1.fail));
  ck("and the reason is recorded", /excluded type/.test(r1.fail.join(" ")), r1.fail.join(" "));
  const r2 = await verify(Object.assign({}, base, {types:["Expression of Concern"]}));
  ck("so does an expression of concern", r2.ok === false, r2.fail.join(" "));
  const r3 = await verify(Object.assign({}, base, {types:["Preprint"]}));
  ck("AND A PREPRINT IS EXCLUDED FROM THE FEED", r3.ok === false, r3.fail.join(" "));
}

console.log("3 - A RECORD WITH NO SOURCE LINK IS NEVER SHOWN");
{
  const r = await verify({pmid:null, doi:null, title:"A trial", journal:"J", year:"2026",
                          abstract:"x".repeat(400), types:[], absParts:[], authors:[], mesh:[]});
  ck("NO PMID AND NO DOI MEANS NO LINK, SO NO PAPER", r.ok === false, r.fail.join(" "));
  ck("and it says so", /no source link|no PMID/.test(r.fail.join(" ")), r.fail.join(" "));
  const ok = await verify({pmid:"456", doi:null, title:"A trial", journal:"J Sport",
                           year:"2026", abstract:"x".repeat(400), types:[], absParts:[],
                           authors:[], mesh:[]});
  ck("a PMID alone is a valid source link", ok.ok === true, ok.fail.join(" "));
  ck("which points at PubMed", /pubmed\.ncbi/.test(ok.url || ""), ok.url);
  const thin = await verify({pmid:"456", title:"A trial", journal:"J", year:"2026",
                             abstract:"too short", types:[], absParts:[], authors:[], mesh:[]});
  ck("and an abstract too thin to summarise from is dropped", thin.ok === false,
     thin.fail.join(" "));
}

console.log("4 - A NUMBER NOT IN THE SOURCE IS REJECTED");
{
  const rec = {title:"Volume and hypertrophy",
    abstract:"Thirty-two resistance-trained men trained for 8 weeks. Muscle thickness "
      + "increased by 12.4% in the high-volume group (p = 0.03)."};
  const good = {quickTakeaway:"Over 8 weeks, muscle thickness rose 12.4% in the higher-volume group.",
    whatTheyStudied:"Two volumes over 8 weeks in trained men.",
    participants:"Resistance-trained men.",
    whatTheyFound:"Thickness increased 12.4% with p = 0.03.",
    forLifters:"In resistance-trained men, more sets may add size.",
    limitations:["Only 8 weeks of training.","One exercise was measured."]};
  ck("a faithful summary passes", checkFaithful(good, rec, "rct").length === 0,
     checkFaithful(good, rec, "rct").join("; "));
  const invented = Object.assign({}, good,
    {whatTheyFound:"Thickness increased 18.7% with p = 0.03."});
  const p1 = checkFaithful(invented, rec, "rct");
  ck("A FIGURE THAT IS NOT IN THE ABSTRACT IS CAUGHT", p1.length > 0, "");
  ck("and it names the number", /18\.7/.test(p1.join(" ")), p1.join("; "));
  /* Years and small whole numbers are exempt on purpose, or ordinary prose trips it. */
  ck("a year does not count as an invented number",
     numbersIn("published in 2026").length === 0, JSON.stringify(numbersIn("published in 2026")));
  ck("nor does a small whole number in prose",
     numbersIn("two of the three groups").length === 0, "");
  ck("but a decimal does", numbersIn("an increase of 2.5%").length === 1, "");
  ck("and so does a figure of ten or more", numbersIn("32 participants").length === 1, "");
}

console.log("5 - CAUSAL WORDING IS BLOCKED ON DESIGNS THAT CANNOT SUPPORT IT");
{
  const rec = {title:"Sleep and strength", abstract:"In 400 adults, self-reported sleep "
    + "duration was associated with grip strength."};
  const assoc = {quickTakeaway:"Shorter sleep was associated with lower grip strength.",
    whatTheyStudied:"A survey of adults.", participants:"400 adults.",
    whatTheyFound:"Sleep duration was associated with grip strength.",
    forLifters:"In these adults, sleep may track with strength.",
    limitations:["Self-reported sleep.","Cross-sectional, so no time order."]};
  ck("association wording passes on an observational paper",
     checkFaithful(assoc, rec, "observational").length === 0,
     checkFaithful(assoc, rec, "observational").join("; "));
  const causal = Object.assign({}, assoc,
    {whatTheyFound:"Poor sleep causes lower grip strength."});
  const p = checkFaithful(causal, rec, "observational");
  ck("\"CAUSES\" IS REJECTED ON AN OBSERVATIONAL DESIGN", p.length > 0, "");
  ck("and the message says which word and which design",
     /causal wording/.test(p.join(" ")) && /observational/.test(p.join(" ")), p.join("; "));
  ck("\"leads to\" is rejected too",
     checkFaithful(Object.assign({}, assoc, {forLifters:"Less sleep leads to weaker adults."}),
                   rec, "observational").length > 0, "");
  /* The same sentence is allowed on a randomised design, hedged. */
  ck("but hedged causal language is allowed on a randomised trial",
     checkFaithful(Object.assign({}, assoc, {whatTheyFound:"Sleep restriction caused a drop in these participants."}),
                   rec, "rct").length === 0, "");
  ck("AND \"YOU SHOULD\" IS BANNED ON EVERY DESIGN, meta-analyses included",
     checkFaithful(Object.assign({}, assoc, {forLifters:"You should sleep more, trained adults."}),
                   rec, "meta").length > 0, "");
}

console.log("6 - LIMITATIONS AND POPULATION ARE MANDATORY");
{
  const rec = {title:"T", abstract:"Twelve trained men trained for 6 weeks."};
  const base = {quickTakeaway:"A short trial in trained men.",
    whatTheyStudied:"Six weeks of training.", participants:"Twelve trained men.",
    whatTheyFound:"Both groups grew.",
    forLifters:"In trained men, both approaches may work.",
    limitations:["Very small sample.","Only six weeks long."]};
  ck("the complete summary passes", checkFaithful(base, rec, "rct").length === 0,
     checkFaithful(base, rec, "rct").join("; "));
  ck("NO LIMITATIONS IS A REJECTION",
     checkFaithful(Object.assign({}, base, {limitations:[]}), rec, "rct").length > 0, "");
  ck("one limitation is not enough either",
     checkFaithful(Object.assign({}, base, {limitations:["Small."]}), rec, "rct").length > 0, "");
  ck("AND forLifters MUST NAME WHO WAS STUDIED",
     checkFaithful(Object.assign({}, base, {forLifters:"Both approaches may work equally well."}),
                   rec, "rct").length > 0, "");
  ck("a missing field is caught",
     checkFaithful(Object.assign({}, base, {whatTheyFound:""}), rec, "rct").length > 0, "");
}

console.log("7 - THE EVIDENCE LABEL IS DEMOTED WHEN THE ABSTRACT DOES NOT SUPPORT IT");
{
  const mk = (types, abstract)=> ({types, abstract});
  ck("a real meta-analysis keeps its label",
     evidenceType(mk(["Meta-Analysis"],
       "We pooled 14 studies using a random-effects model; the standardised mean difference was 0.3.")) === "meta", "");
  ck("A NARRATIVE REVIEW TAGGED META-ANALYSIS IS DEMOTED",
     evidenceType(mk(["Meta-Analysis"], "We discuss the literature on training volume.")) !== "meta",
     evidenceType(mk(["Meta-Analysis"], "We discuss the literature on training volume.")));
  ck("a systematic review without a search strategy is demoted to review",
     evidenceType(mk(["Systematic Review"], "We summarise what is known.")) === "review", "");
  ck("AN RCT WITH NO MENTION OF RANDOMISATION BECOMES A CONTROLLED STUDY",
     evidenceType(mk(["Randomized Controlled Trial"],
       "Participants were assigned to two groups and trained for 8 weeks.")) === "controlled", "");
  ck("a real RCT keeps its label",
     evidenceType(mk(["Randomized Controlled Trial"],
       "Participants were randomly assigned to two groups.")) === "rct", "");
  ck("and an untyped record is a review, the weakest label",
     evidenceType(mk([], "Something.")) === "review", "");
}

console.log("8 - THE RELEVANCE SCREEN KEEPS CLINICAL POPULATIONS OUT");
{
  const mk = (title, abstract, mesh)=> ({title, abstract, mesh: mesh || []});
  const lifting = screen(mk("Training volume and hypertrophy",
    "Resistance-trained men performed squats for 8 weeks; muscle thickness increased."), "hypertrophy");
  ck("a lifting paper is kept", lifting.ok === true, lifting.why || "");
  ck("and it is tagged with its topics", lifting.topics.indexOf("hypertrophy") > -1,
     JSON.stringify(lifting.topics));
  ck("the participant status is extracted", lifting.population === "trained", String(lifting.population));
  const dial = screen(mk("Protein and lean mass in dialysis patients",
    "Patients on haemodialysis received protein supplementation; resistance training was included."), "nutrition");
  ck("A DIALYSIS POPULATION IS EXCLUDED, however good the paper", dial.ok === false, dial.why);
  const kids = screen(mk("Strength training in children",
    "Children performed resistance training for 10 weeks and 1RM improved."), "strength");
  ck("and so are children", kids.ok === false, kids.why);
  const unrelated = screen(mk("Cycling economy and cadence",
    "Cyclists rode at three cadences; economy differed."), "strength");
  ck("something with no resistance-training context is excluded", unrelated.ok === false, unrelated.why);
  const untr = screen(mk("Volume in novices",
    "Untrained young men performed resistance training; hypertrophy was measured."), "hypertrophy");
  ck("untrained is recorded as untrained, not hidden", untr.population === "untrained",
     String(untr.population));
  const app = screen(mk("Proximity to failure and growth",
    "Resistance-trained men trained to failure or with repetitions in reserve."), "hypertrophy");
  ck("AND AN ACTIONABLE PAPER IS FLAGGED WITH WHAT IT IS ACTIONABLE ABOUT",
     app.applyTo === "failure", String(app.applyTo));
}

console.log("9 - BEFORE LAUNCH, EVERYTHING WAITS FOR A HUMAN");
{
  /* The golden set has to cover the kinds of paper the feed will mostly contain, not just
     the kinds that are scary. So while the launch gate is closed, nothing publishes on its
     own — whatever its type. */
  const kinds = ["meta", "systematic", "rct", "controlled", "observational", "review", "mechanistic"];
  const unlaunched = kinds.filter(t=> needsApproval({type:t, applyTo:null}, false) !== true);
  ck("EVERY KIND OF PAPER NEEDS APPROVAL BEFORE LAUNCH", unlaunched.length === 0,
     "these did not: " + unlaunched.join(", "));
  ck("including an ordinary trial, which is most of the feed",
     needsApproval({type:"rct", applyTo:null}, false) === true, "");
  ck("and an observational study", needsApproval({type:"observational"}, false) === true, "");
  /* A missing or malformed setting reads as NOT launched: the cautious reading of an
     absent gate is the closed one. */
  const noKv = {RESEARCH: {get: async ()=> null}};
  ck("AN ABSENT SETTING MEANS NOT LAUNCHED", (await launchApproved(noKv)) === false, "");
  ck("and so does anything other than the exact string true",
     (await launchApproved({RESEARCH: {get: async ()=> "yes"}})) === false, "");
  ck("a KV read that throws fails closed",
     (await launchApproved({RESEARCH: {get: async ()=>{ throw new Error("kv down"); }}})) === false, "");
  ck("the setting does open it", (await launchApproved({RESEARCH: {get: async ()=> "true"}})) === true, "");
  ck("and an env var is honoured too",
     (await launchApproved({LAUNCH_APPROVED: "true", RESEARCH: {get: async ()=> null}})) === true, "");
}

console.log("9B - AFTER LAUNCH, ONLY THE STRONGEST CLAIMS DO");
{
  ck("A META-ANALYSIS NEEDS APPROVAL, because it reads as settled",
     needsApproval({type:"meta"}, true) === true, "");
  ck("so does a systematic review", needsApproval({type:"systematic"}, true) === true, "");
  ck("AND SO DOES ANYTHING THAT POWERS APPLY TO MY TRAINING",
     needsApproval({type:"rct", applyTo:"volume"}, true) === true, "");
  ck("an ordinary trial does not", needsApproval({type:"rct", applyTo:null}, true) === false, "");
  /* And the gate is on the way out, in one place, so no query path can forget it. */
  const rows = [{id:"a", approved:true}, {id:"b", approved:false}, {id:"c"}];
  ck("unapproved papers are filtered out when served",
     servable(rows).map(r=> r.id).join(",") === "a,c", servable(rows).map(r=> r.id).join(","));
}

console.log("10 - DATES");
{
  ck("a month name parses", monthNum("Oct") === 10, String(monthNum("Oct")));
  ck("a month number parses", monthNum("3") === 3, String(monthNum("3")));
  ck("nonsense is null rather than a guess", monthNum("Smarch") === null, String(monthNum("Smarch")));
  ck("and a missing month is null", monthNum(null) === null, String(monthNum(null)));
}

console.log(bad ? "BROKEN: " + bad : "all good");
process.exit(bad ? 1 : 0);
