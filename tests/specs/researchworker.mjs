/* THE VERIFICATION AND FAITHFULNESS RULES, RUN ON FIXTURES.

   These are the rules that decide whether a paper a reader sees is real and whether the
   sentence under it is true of that paper. They are pure functions in
   proxy/research-worker.js for exactly this reason: they can be run with no network, no
   key and no KV, so there is no excuse for them being untested.

   Every fixture below is synthetic. No real paper's metadata is asserted here, because a
   test that hard-codes a DOI is a test that goes stale and starts lying. */
import { __test } from '../../proxy/research-worker.js';
const {titleAgrees, evidenceType, screen, checkFaithful, numbersIn, monthNum,
       verify, needsApproval, launchApproved, servable, scoreModel, cardOf,
       parseModelJson, summarise, SUBREQ_MAX, PER_PAPER_SUBREQ, subreqLeft,
       resetSubreq, K_REJECT} = __test;
import { readFileSync } from 'node:fs';

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

console.log("8B - THE FIRST LIVE RUN'S OWN TITLES, WHICH IS WHERE THREE BUGS CAME FROM");
{
  /* These are the real titles the first deployed run surfaced. They are kept verbatim as
     a regression set because every one of them exposed something the fixtures did not:
     the whole point of a fixture is that it is what I imagined, and these are what PubMed
     actually sent. Only titles and the fact of their journals are used — no summary, no
     finding, nothing that could become a claim about a paper. */
  const mk = (title, abstract)=> ({title, abstract: abstract || title, mesh: []});
  const sc = (title, abstract)=> screen(mk(title, abstract), "hypertrophy");

  /* 1. applyTo matched the bare word "load" anywhere in the abstract, so all fourteen
        papers came back actionable with nonsense reasons. */
  const noise = [
    "Analytical approaches to account for muscle size when evaluating strength.",
    "Adjunctive Ashwagandha (Withania somnifera) Supplementation and Resistance-Training Adaptations in Healthy Adults: A Systematic Review and Random-Effects Meta-Analysis of Muscular Strength, Chest Circumference, and Body Composition.",
    "Cool in theory, not in practice: Effects of interset palm cooling on resistance exercise performance and psychophysiology responses.",
    "Acute Performance, Mechanical and Thermal Effects of Isometric Conditioning Versus Standardized Volleyball Pre-Training Activation in Highly Trained Male Players.",
    "Ribosome Biogenesis as a Putative Bottleneck to Skeletal Muscle Hypertrophy: Mechanisms, Human Evidence, and Practical Modulators."
  ];
  const stillActionable = noise
    .map(t=> ({t, r: sc(t, t + " Participants performed resistance training at a given load to failure.")}))
    .filter(x=> x.r.ok && x.r.applyTo);
  ck("NONE OF THE FIVE MISMATCHED PAPERS IS ACTIONABLE ANY MORE",
     stillActionable.length === 0,
     stillActionable.map(x=> x.r.applyTo + " <- " + x.t.slice(0, 50)).join(" | "));

  /* And a paper that genuinely IS about an actionable variable still is. */
  const real = [
    ["How Slow Should You Go? A Systematic Review With Meta-Analysis of the Effect of Resistance Training Repetition Tempo on Muscle Hypertrophy.", "reps"],
    ["Effect of Intra-Workout Protein-Carbohydrate Co-Ingestion Versus Isocaloric Carbohydrate During Resistance Training on Muscle Fibre Hypertrophy.", "protein"],
    ["Responsiveness of muscle mass gain to different load intensities of resistance training in older women: A randomized crossover study.", "reps"],
    ["Effects of high-intensity and blood-flow-restricted resistance training on tendon adaptations in older men.", null]
  ];
  const wrong = real.filter(([t, want])=> (sc(t).applyTo || null) !== want);
  ck("and the ones that really are about a variable still say so",
     wrong.length === 0,
     wrong.map(([t, w])=> "wanted " + w + " got " + sc(t).applyTo + " <- " + t.slice(0, 40)).join(" | "));

  /* 2. A progressive neuromuscular disease reached the feed. */
  const fshd = sc("High-load resistance training and FSHD: harmful mixture or a silver bullet combination?",
    "Facioscapulohumeral dystrophy patients undertook high-load resistance training.");
  ck("A MUSCULAR DYSTROPHY PAPER IS EXCLUDED", fshd.ok === false, fshd.why);
  ck("and so is a myopathy", sc("Resistance training in inflammatory myopathy",
     "Patients with myopathy performed resistance training.").ok === false, "");

  /* 3. Twelve of fourteen had no population at all, four of them explicitly about older
        men or women. Older adults are not excluded — they are LABELLED. */
  const older = sc("Responsiveness of muscle mass gain to different load intensities of resistance training in older women.",
    "Older women performed resistance training for 12 weeks.");
  ck("AN OLDER-ADULT STUDY IS KEPT, NOT DROPPED", older.ok === true, older.why || "");
  ck("and it is labelled as such rather than left blank", older.population === "older",
     String(older.population));
  ck("trained is still detected",
     sc("Carbohydrate supplementation in trained men",
        "Resistance-trained men completed a crossover trial.").population === "trained", "");
  ck("so is untrained",
     sc("Activating additional muscle mass in novices",
        "Untrained participants performed resistance training.").population === "untrained", "");
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
  const rows = [{id:"a", approved:true}, {id:"b", approved:false}, {id:"c"},
                {id:"d", approved:undefined}, {id:"e", approved:null},
                {id:"f", approved:"true"}, {id:"g", approved:1}];
  const out = servable(rows).map(r=> r.id).join(",");
  ck("AN APPROVED PAPER IS SERVED", out.indexOf("a") > -1, out);
  ck("an explicitly rejected one is not", out.indexOf("b") < 0, out);
  /* THE GATE FAILS CLOSED. It used to read `approved !== false`, which sounds equivalent
     and is the opposite: a row that never had the field sailed through. Paired with
     cardOf() not copying the flag, that served every unapproved paper in the feed. */
  ck("AND A ROW WITH NO FLAG AT ALL IS NOT SERVED", out.indexOf("c") < 0, out);
  ck("nor undefined, nor null", out.indexOf("d") < 0 && out.indexOf("e") < 0, out);
  ck("nor a truthy value that is not actually true",
     out.indexOf("f") < 0 && out.indexOf("g") < 0, out);
  ck("so only the one approved row survives", out === "a", out);
  /* And the card the index stores must carry the flag, or the gate above has nothing to
     read. This is the half that was missing. */
  ck("THE INDEX CARD CARRIES THE APPROVAL FLAG",
     cardOf({id:"x", approved:true}).approved === true, "");
  ck("and a paper with no flag becomes an explicit false, not a gap",
     cardOf({id:"x"}).approved === false, String(cardOf({id:"x"}).approved));
  ck("an unapproved paper's card is false", cardOf({id:"x", approved:false}).approved === false, "");
  ck("AND A CARD STRAIGHT FROM INGEST IS NOT SERVABLE",
     servable([cardOf({id:"x", approved:false})]).length === 0, "");
}

console.log("9C - THE MODEL IS ASKED FOR, NOT ASSUMED");
{
  /* This shipped with gemini-2.0-flash hardcoded and failed 7 live papers out of 7 with
     "gemini 404" — that name is retired for this key, which proxy/gemini-worker.js
     already said in a comment. The scoring is now shared with that Worker so the next
     retirement is one fix rather than two, and these checks pin the preferences it
     encodes. */
  const better = (a, b)=> scoreModel(a) > scoreModel(b);
  ck("flash beats pro, because fast and cheap is the whole job",
     better("gemini-3.6-flash", "gemini-3.6-pro"), "");
  ck("AN ALIAS BEATS A PINNED NAME, because it survives the next retirement",
     better("gemini-flash-latest", "gemini-3.6-flash"), "");
  ck("a preview is never preferred", better("gemini-3.6-flash", "gemini-3.6-flash-preview"), "");
  ck("nor is an experimental build", better("gemini-3.6-flash", "gemini-3.6-flash-exp"), "");
  ck("capable beats cheapest", better("gemini-3.6-flash", "gemini-3.6-flash-lite"), "");
  ck("and a newer generation wins a tie", better("gemini-3.6-flash", "gemini-2.5-flash"), "");
  /* The dead name must not be something the scorer would choose over a live one. */
  ck("THE RETIRED NAME DOES NOT OUTSCORE A LIVE ONE",
     better("gemini-flash-latest", "gemini-2.0-flash"), "");
}

console.log("9D - THE MODEL'S JSON, PARSED THE WAY IT ACTUALLY ARRIVES");
{
  /* Three papers in the first working run failed on "summary was not valid JSON", a
     message that told whoever read it nothing about why. That opacity was the real bug. */
  const good = parseModelJson('{"quickTakeaway":"x"}');
  ck("clean JSON parses", good.ok === true && good.value.quickTakeaway === "x", "");
  const fenced = parseModelJson('```json\n{"a":1}\n```');
  ck("A FENCED CODE BLOCK IS STRIPPED", fenced.ok === true && fenced.value.a === 1,
     JSON.stringify(fenced));
  const bare = parseModelJson('```\n{"a":1}\n```');
  ck("including an unlabelled fence", bare.ok === true && bare.value.a === 1, "");
  const wrapped = parseModelJson('Here is the summary: {"a":1} Hope that helps.');
  ck("and an answer wrapped in a sentence is recovered",
     wrapped.ok === true && wrapped.value.a === 1, JSON.stringify(wrapped));

  /* THE FAILURE HAS TO SAY WHAT IT SAW. Truncation, a refusal and an empty response are
     three different problems and used to produce one identical message. */
  const cut = parseModelJson('{"quickTakeaway":"the study found that parti');
  ck("TRUNCATION IS NAMED AS TRUNCATION", cut.ok === false && /cut off/.test(cut.why), cut.why);
  ck("and the reason carries the length and the opening text",
     /chars, began:/.test(cut.why), cut.why);
  const empty = parseModelJson("");
  ck("an empty answer says so rather than blaming the parser",
     empty.ok === false && /nothing at all/.test(empty.why), empty.why);
  ck("and whitespace counts as empty", parseModelJson("   \n ").ok === false, "");
  const prose = parseModelJson("I cannot summarise this paper.");
  ck("a refusal is reported with its own words", prose.ok === false
     && /not valid JSON/.test(prose.why) && /cannot summarise/.test(prose.why), prose.why);
}

console.log("10 - DATES");
{
  ck("a month name parses", monthNum("Oct") === 10, String(monthNum("Oct")));
  ck("a month number parses", monthNum("3") === 3, String(monthNum("3")));
  ck("nonsense is null rather than a guess", monthNum("Smarch") === null, String(monthNum("Smarch")));
  ck("and a missing month is null", monthNum(null) === null, String(monthNum(null)));
}

console.log("10B - NAMING THE POPULATION, IN ACTUAL ENGLISH");
{
  /* Two papers in the fifth live run failed "forLifters does not name the population" with
     the population plainly named. The check was right in substance and wrong about English:
     its word list held nine nouns and none of the generic ones a careful writer reaches for. */
  const rec = {title: "Resistance training and hypertrophy.",
    abstract: "Twenty people trained for 8 weeks and muscle thickness increased 0.14 cm."};
  const base = {
    quickTakeaway: "In this study, training was associated with more growth.",
    whatTheyStudied: "The study looked at muscle thickness after training.",
    participants: "Twenty people took part over 8 weeks.",
    whatTheyFound: "Muscle thickness increased 0.14 cm.",
    limitations: ["Only one measure of size was used.", "The group was small at twenty."]
  };
  const popProblems = (line, type) => checkFaithful(Object.assign({}, base, {forLifters: line}),
    rec, type || "rct").filter(x => /name the population/.test(x));
  ck("'in these individuals' names the population", popProblems("In these individuals, the gain was small.").length === 0, "");
  ck("so does 'in these people'", popProblems("In these people, the gain was small.").length === 0, "");
  ck("so does naming the sport", popProblems("In these cyclists, the gain was small.").length === 0, "");
  ck("and the old vocabulary still passes", popProblems("In these trained men, the gain was small.").length === 0, "");
  ck("A LINE THAT NAMES NOBODY STILL FAILS",
     popProblems("The gain was small and may not be worth the time.").length === 1, "");

  /* A review has no participants of its own; its population is the studies it pooled. */
  ck("a review may name the studies it pooled",
     popProblems("Across these studies, the gain was small.", "review").length === 0, "");
  ck("BUT AN RCT MAY NOT HIDE BEHIND 'studies'",
     popProblems("Across these studies, the gain was small.", "rct").length === 1, "");
}

console.log("11 - AN OPERATION IS NOT A TRAINING STUDY");
{
  /* The third live run put "The effectiveness of resistance training for patients with
     degenerative arthritis after total joint arthroplasty" all the way through to the
     summary stage. The exclusion list covered diseases and not operations. */
  const surg = {pmid: "1", title: "The effectiveness of resistance training for patients with "
    + "degenerative arthritis after total joint arthroplasty: a pilot randomized controlled study.",
    abstract: "Patients underwent resistance training after total joint arthroplasty.",
    types: ["Randomized Controlled Trial"], journal: "J", authors: ["A"], year: "2026"};
  const sc = screen(surg, "hypertrophy");
  ck("A POST-SURGICAL REHABILITATION STUDY IS EXCLUDED", sc.ok === false, JSON.stringify(sc));
  ck("and the reason names the excluded context", /arthroplasty|arthritis/.test(sc.why || ""), sc.why);
  const oa = Object.assign({}, surg, {title: "Resistance training in knee osteoarthritis.",
    abstract: "Adults with knee osteoarthritis performed resistance training."});
  ck("osteoarthritis too", screen(oa, "hypertrophy").ok === false, "");
  /* AND THE LIST MUST NOT HAVE BECOME SO WIDE IT EATS ORDINARY TRAINING RESEARCH. */
  const fine = {pmid: "2", title: "Effects of resistance training volume on hypertrophy in trained men.",
    abstract: "Trained men performed resistance training at 12 or 24 sets per week for 8 weeks.",
    types: ["Randomized Controlled Trial"], journal: "J", authors: ["A"], year: "2026"};
  ck("a normal training study is still kept", screen(fine, "hypertrophy").ok === true,
     JSON.stringify(screen(fine, "hypertrophy")));
}

console.log("12 - THE SUBREQUEST BUDGET");
{
  /* The third live run ended on "Too many subrequests by single Worker invocation" with
     papers still queued and no record of why. */
  ck("the ceiling leaves headroom under the platform limit of 50",
     SUBREQ_MAX > 0 && SUBREQ_MAX <= 48, String(SUBREQ_MAX));
  ck("and a whole paper's worth is reserved before one is started",
     PER_PAPER_SUBREQ >= 4 && PER_PAPER_SUBREQ < SUBREQ_MAX, String(PER_PAPER_SUBREQ));
  resetSubreq();
  ck("a reset run starts with its full allowance", subreqLeft() === SUBREQ_MAX, String(subreqLeft()));
}

console.log("12B - A REJECTION IS A RESULT AND IS REMEMBERED");
{
  /* The fourth and fifth live runs reported an identical "found 12, dropped 6" with
     identical reasons, because only accepted papers went into the index: the same six
     excluded papers were re-fetched and re-screened every run, out of a bounded budget,
     every day. Screening and verification are deterministic, so the verdict keeps. */
  ck("the rejection list has its own key", typeof K_REJECT === "string" && K_REJECT.length > 0,
     String(K_REJECT));
  ck("and it is not the index or the queue", K_REJECT !== "index:v1" && K_REJECT !== "queue:v1", "");
  const src = readFileSync(new URL('../../proxy/research-worker.js', import.meta.url), 'utf8');
  ck("a screening rejection is recorded", /drop\(sc\.why\); newRejects\.push/.test(src), "");
  ck("and so is a verification failure",
     /drop\(v\.fail\[0\] \|\| "verification"\); newRejects\.push/.test(src), "");
  ck("REJECTED IDS ARE SKIPPED BEFORE ANY FETCH, which is the whole saving",
     /new Set\(seen\.map\(x => x\.id\)\.concat\(rejected\)\)/.test(src), "");
  ck("and a reset forgets them, so a screening fix can be applied",
     /RESEARCH\.delete\(K_REJECT\)/.test(src) && /rejectionsForgotten/.test(src), "");
  ck("the list is bounded", /REJECT_MAX/.test(src) && /slice\(-REJECT_MAX\)/.test(src), "");
}

console.log("13 - ONE DRIFTING SENTENCE DOES NOT COST A PAPER ITS SUMMARY");
{
  /* Five papers in the third live run were rejected on "second pass rejected 1 of 8
     sentences". The comment above summarise() said a single unsupported sentence was sent
     back once. It was not: the code rejected on the first verdict. These tests drive
     summarise() with a stubbed fetch so the retry is exercised rather than described. */
  const rec = {pmid: "3", title: "Resistance training volume and hypertrophy in trained men.",
    abstract: "Twenty trained men performed 12 or 24 sets per week for 8 weeks. "
      + "Muscle thickness increased 0.14 cm in the higher volume group.",
    journal: "J", authors: ["A"], year: "2026"};
  const sum = ok => ({
    quickTakeaway: "In this study, higher weekly set counts were associated with more growth.",
    whatTheyStudied: "The study compared two weekly set counts for muscle thickness.",
    participants: "Twenty trained men took part over 8 weeks.",
    whatTheyFound: "Muscle thickness increased 0.14 cm in the higher volume group.",
    forLifters: "In these trained men, a higher weekly set count went with slightly more growth.",
    limitations: ["Only trained men were studied.", "Muscle thickness is one measure of size."]
  });
  const reply = text => ({ok: true, status: 200, json: async ()=> ({
    candidates: [{content: {parts: [{text}]}}]})});
  const models = {ok: true, status: 200, json: async ()=> ({models: [
    {name: "models/gemini-flash-latest", supportedGenerationMethods: ["generateContent"]}]})};
  const realFetch = globalThis.fetch;
  const run = async (replies, type) => {
    const calls = [];
    globalThis.fetch = async (u, init) => {
      const url = String(u);
      if (url.indexOf("generateContent") < 0) return models;
      calls.push(JSON.parse(init.body).contents[0].parts[0].text);
      return reply(replies.shift());
    };
    resetSubreq();
    const out = await summarise(rec, type || "rct", "trained", {GEMINI_API_KEY: "k"});
    return {out, calls};
  };
  const allGood = n => JSON.stringify(Array.from({length: n}, (_, i)=> ({i: i+1, verdict: "supported"})));
  const oneBad = n => JSON.stringify(Array.from({length: n},
    (_, i)=> ({i: i+1, verdict: i === 0 ? "unsupported" : "supported"})));

  const a = await run([JSON.stringify(sum()), allGood(5)]);
  ck("a summary every sentence of which is supported passes", a.out.ok === true,
     JSON.stringify(a.out.why || ""));

  const b = await run([JSON.stringify(sum()), oneBad(5), JSON.stringify(sum()), allGood(5)]);
  ck("ONE UNSUPPORTED SENTENCE IS SENT BACK, NOT REJECTED", b.out.ok === true,
     JSON.stringify(b.out.why || ""));
  ck("and the retry quotes the rejected sentence to the model",
     b.calls.length === 4 && /not supported by it/.test(b.calls[2])
     && b.calls[2].indexOf("higher weekly set counts were associated") > -1,
     String(b.calls.length) + " :: " + String(b.calls[2] || "").slice(-400));
  ck("the retry is a fresh summary call, so temperature zero cannot repeat itself",
     b.calls[2] !== b.calls[0], "");

  /* THE SAME DEFECT LIVED IN THE CHECK LOOP. It re-sent the identical prompt, which at
     temperature 0 returns the identical summary — the retry was spent for nothing, and the
     fourth live run lost a narrative review to "causal wording in forLifters on a review
     design" that way. */
  const causal = Object.assign(sum(), {forLifters:
    "In these trained men, a higher weekly set count causes slightly more growth."});
  const d = await run([JSON.stringify(causal), JSON.stringify(sum()), allGood(5)], "review");
  ck("A FAILED CHECK IS ALSO SENT BACK WITH ITS REASON", d.out.ok === true,
     JSON.stringify(d.out.why || ""));
  ck("and the second prompt quotes the check's own words",
     /rejected by an automated check/.test(d.calls[1] || "")
     && /causal wording in forLifters/.test(d.calls[1] || ""),
     String(d.calls[1] || "").slice(-400));
  ck("so the retry cannot be a verbatim repeat of the first prompt",
     d.calls[1] !== d.calls[0], "");
  const e = await run([JSON.stringify(causal), JSON.stringify(causal)], "review");
  ck("causal wording is allowed on an RCT and rejected on a review",
     (await run([JSON.stringify(causal), allGood(5)], "rct")).out.ok === true, "");
  ck("two failed checks still reject", e.out.ok === false && /failed the checks/.test(e.out.why),
     JSON.stringify(e.out.why || ""));

  const c = await run([JSON.stringify(sum()), oneBad(5), JSON.stringify(sum()), oneBad(5)]);
  ck("A SECOND FAILURE STILL REJECTS, so the loop cannot run for ever", c.out.ok === false,
     JSON.stringify(c.out));
  ck("and the reason says how many passes were spent", /after 2 passes/.test(c.out.why || ""),
     c.out.why);
  ck("the paper keeps its metadata either way", c.out.sum && !!c.out.sum.forLifters, "");
  ck("every call was counted against the budget", subreqLeft() < SUBREQ_MAX, String(subreqLeft()));
  globalThis.fetch = realFetch;
}

console.log(bad ? "BROKEN: " + bad : "all good");
process.exit(bad ? 1 : 0);
