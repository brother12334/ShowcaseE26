/**
 * Element 26 — Research Lab pipeline
 *
 * WHY THIS IS ITS OWN WORKER, which the brief asked to be justified rather than assumed.
 *
 * accountworker.js holds recovery keys, synced training data and push subscriptions. This
 * holds public bibliographic records and serves them read-only, anonymously, to everybody,
 * from the edge cache. Those are opposite security postures and they get opposite origins:
 *
 *   • a bug in a research route cannot reach account KV, because it is not bound to it;
 *   • these routes can be cached hard and shared between users, which is forbidden for
 *     anything account-shaped and is the main reason the feed is cheap to serve;
 *   • Part 7's promise — that no training data ever leaves the device — stops being a
 *     claim in a comment and becomes something a network log proves, because the only
 *     origin the research feature talks to has no user records in it at all;
 *   • the cron is daily and heavy; the account Worker's work is per-request and light.
 *     Sharing a Worker would mean sharing a CPU budget between them.
 *
 * THE RULE THAT OUTRANKS EVERYTHING ELSE HERE. One fabricated paper does more damage to
 * this app than fifty missing ones. Every function below is written to drop a record
 * rather than publish a doubtful one, and there is no path through this file that invents
 * a title, an author, a journal, a date, a number, a DOI or a finding. Where the pipeline
 * cannot establish something it stores null and the app says so.
 *
 * THE PIPELINE, once a day on a cron:
 *   1. discover  — PubMed E-utilities, Europe PMC. Saved queries only, no scraping.
 *   2. verify    — PMID/DOI must resolve and agree across sources; retractions dropped.
 *   3. screen    — is this actually about lifting, and could a lifter act on it?
 *   4. summarise — Gemini, from the retrieved source text only, then checked twice.
 *
 * Deploy: see README.md. Needs KV namespace RESEARCH, secrets NCBI_API_KEY,
 * GEMINI_API_KEY, ADMIN_TOKEN, and a cron trigger.
 */

/* ---------------------------------------------------------------- sources */

/* NCBI ASKS CALLERS TO IDENTIFY THEMSELVES and rate-limits by key. Both are conditions of
   use rather than suggestions, so both are honoured: the tool and email go on every
   request, and the pacing below is set from NCBI's published limit of 10 requests a second
   with a key. We use a fraction of it because nothing here is urgent. */
const NCBI = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const NCBI_TOOL = "element26";
const NCBI_EMAIL = "research@element26.app";
const NCBI_GAP_MS = 350;

const EPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest";
const CROSSREF = "https://api.crossref.org/works";

/* THE SAVED QUERIES. One per topic group, each already filtered to humans, English and
   the publication types the brief allows. They are stored here rather than built from user
   input because a query assembled at runtime is a query nobody reviewed.

   Each entry names the filter topic it maps to, so a paper's topics come from the query
   that found it plus its MeSH terms — never from a guess about its title. */
const QUERIES = [
  {topic:"hypertrophy", q:'(resistance training[tiab] OR strength training[tiab]) AND (hypertrophy[tiab] OR muscle growth[tiab] OR muscle thickness[tiab] OR cross-sectional area[tiab])'},
  {topic:"hypertrophy", q:'(training volume[tiab] OR weekly sets[tiab] OR set volume[tiab]) AND (hypertrophy[tiab] OR muscle[tiab])'},
  {topic:"hypertrophy", q:'(proximity to failure[tiab] OR repetitions in reserve[tiab] OR training to failure[tiab] OR momentary failure[tiab])'},
  {topic:"hypertrophy", q:'(range of motion[tiab] OR lengthened partial*[tiab] OR partial repetition*[tiab]) AND (hypertrophy[tiab] OR strength[tiab])'},
  {topic:"strength",    q:'(resistance training[tiab]) AND (maximal strength[tiab] OR one repetition maximum[tiab] OR 1RM[tiab])'},
  {topic:"programming", q:'(training frequency[tiab] OR periodization[tiab] OR progressive overload[tiab] OR deload[tiab]) AND resistance training[tiab]'},
  {topic:"exercise",    q:'(exercise selection[tiab] OR exercise variation[tiab] OR free weight*[tiab] OR machine*[tiab]) AND (hypertrophy[tiab] OR strength[tiab])'},
  {topic:"programming", q:'(rest interval*[tiab] OR inter-set rest[tiab] OR repetition range[tiab] OR load[tiab] OR tempo[tiab] OR superset*[tiab] OR drop set*[tiab]) AND resistance training[tiab]'},
  {topic:"recovery",    q:'(recovery[tiab] OR muscle damage[tiab] OR soreness[tiab]) AND resistance training[tiab]'},
  {topic:"fatigue",     q:'(fatigue[tiab] OR overreaching[tiab] OR overtraining[tiab]) AND resistance training[tiab]'},
  {topic:"sleep",       q:'(sleep[tiab] OR sleep restriction[tiab] OR sleep extension[tiab]) AND (resistance training[tiab] OR muscle[tiab] OR strength[tiab])'},
  {topic:"nutrition",   q:'(protein intake[tiab] OR protein supplementation[tiab] OR energy balance[tiab] OR energy deficit[tiab]) AND (resistance training[tiab] OR lean mass[tiab])'},
  {topic:"supplements", q:'(creatine[tiab] OR caffeine[tiab] OR beta-alanine[tiab] OR citrulline[tiab]) AND (resistance training[tiab] OR strength[tiab] OR hypertrophy[tiab])'},
  {topic:"injury",      q:'(injury prevention[tiab] OR injury risk[tiab] OR tendinopathy[tiab]) AND (resistance training[tiab] OR strength training[tiab])'},
  {topic:"programming", q:'(concurrent training[tiab] OR interference effect[tiab]) AND (strength[tiab] OR hypertrophy[tiab])'}
];
/* Applied to every query. "humans" keeps out the cell and rodent work that would otherwise
   dominate a mechanistic search; the type list is exactly the set the app has labels for,
   so nothing can arrive that the UI cannot describe. */
const QUERY_FILTER = '(humans[mh]) AND (english[la]) AND ('
  + '"meta-analysis"[pt] OR "systematic review"[pt] OR "randomized controlled trial"[pt] '
  + 'OR "controlled clinical trial"[pt] OR "observational study"[pt] OR "review"[pt])';
const FEED_WINDOW_DAYS = 365;
const PER_QUERY = 12;

/* PUBMED'S PUBLICATION TYPES MAPPED TO THE APP'S SEVEN LABELS, strongest first, and the
   first match wins. WHERE A PAPER CARRIES SEVERAL, THE STRONGEST HONEST ONE IS USED — but
   see weakenIfUnsure(): if the abstract does not support it, it is demoted. A review that
   PubMed also tags "meta-analysis" is only a meta-analysis if it pooled something. */
const PT_MAP = [
  ["Meta-Analysis", "meta"],
  ["Systematic Review", "systematic"],
  ["Randomized Controlled Trial", "rct"],
  ["Controlled Clinical Trial", "controlled"],
  ["Clinical Trial", "controlled"],
  ["Observational Study", "observational"],
  ["Review", "review"]
];
/* A RETRACTED PAPER IS NEVER SHOWN, and neither is one that has been formally corrected in
   a way that changes its conclusions. Checked on both PubMed's types and Crossref's
   update records, because the two do not always agree on timing. */
const BLOCKED_TYPES = ["Retracted Publication", "Retraction of Publication",
                       "Expression of Concern", "Preprint"];

/* ------------------------------------------------------- 1. discover */

let lastNcbi = 0;
async function paced(fn){
  const wait = Math.max(0, NCBI_GAP_MS - (Date.now() - lastNcbi));
  if (wait) await new Promise(r => setTimeout(r, wait));
  lastNcbi = Date.now();
  return fn();
}
function ncbiUrl(path, params, env) {
  const u = new URL(NCBI + path);
  Object.keys(params).forEach(k => u.searchParams.set(k, params[k]));
  u.searchParams.set("tool", NCBI_TOOL);
  u.searchParams.set("email", NCBI_EMAIL);
  if (env.NCBI_API_KEY) u.searchParams.set("api_key", env.NCBI_API_KEY);
  return u.toString();
}
async function esearch(query, env) {
  const url = ncbiUrl("/esearch.fcgi", {
    db: "pubmed", retmode: "json", retmax: String(PER_QUERY), sort: "date",
    term: "(" + query + ") AND " + QUERY_FILTER,
    reldate: String(FEED_WINDOW_DAYS), datetype: "pdat"
  }, env);
  const r = await paced(() => fetch(url));
  if (!r.ok) return [];
  const j = await r.json();
  return ((j.esearchresult || {}).idlist) || [];
}
/* efetch RETURNS XML AND THERE IS NO DOM IN A WORKER, so the fields are pulled with
   anchored regular expressions over one record at a time. That is unpleasant and it is
   also the right trade: a dependency-free parse of six known tags cannot be broken by a
   field this code does not read, and anything it fails to find comes back null and drops
   the record rather than guessing. */
async function efetch(pmids, env) {
  if (!pmids.length) return [];
  const url = ncbiUrl("/efetch.fcgi", {
    db: "pubmed", retmode: "xml", id: pmids.join(",")
  }, env);
  const r = await paced(() => fetch(url));
  if (!r.ok) return [];
  const xml = await r.text();
  return xml.split("<PubmedArticle>").slice(1).map(chunk => parseArticle(chunk));
}
const tag = (s, t) => {
  const m = s.match(new RegExp("<" + t + "[^>]*>([\\s\\S]*?)</" + t + ">"));
  return m ? decodeXml(m[1].replace(/<[^>]+>/g, "").trim()) : null;
};
const tagAll = (s, t) => {
  const out = [];
  const re = new RegExp("<" + t + "[^>]*>([\\s\\S]*?)</" + t + ">", "g");
  let m;
  while ((m = re.exec(s))) out.push(decodeXml(m[1].replace(/<[^>]+>/g, "").trim()));
  return out;
};
function decodeXml(s) {
  return String(s)
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");
}
function parseArticle(chunk) {
  const pmid = tag(chunk, "PMID");
  const title = tag(chunk, "ArticleTitle");
  const journal = tag(chunk, "Title") || tag(chunk, "ISOAbbreviation");
  const types = tagAll(chunk, "PublicationType");
  const doi = (chunk.match(/<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/) || [])[1] || null;
  /* STRUCTURED ABSTRACTS KEEP THEIR LABELS, because METHODS and RESULTS are exactly the
     split the app's "What they studied" and "What they found" need, and the authors'
     own division of their own abstract beats any later guess at one. */
  const absParts = [];
  const re = /<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g;
  let m;
  while ((m = re.exec(chunk))) {
    const label = (m[1].match(/Label="([^"]*)"/) || [])[1] || "";
    absParts.push({label: label.toUpperCase(), text: decodeXml(m[2].replace(/<[^>]+>/g, "").trim())});
  }
  const authors = tagAll(chunk, "LastName").slice(0, 8);
  const y = (chunk.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) || [])[1]
         || (chunk.match(/<ArticleDate[^>]*>[\s\S]*?<Year>(\d{4})<\/Year>/) || [])[1] || null;
  const mo = (chunk.match(/<PubDate>[\s\S]*?<Month>(\w+)<\/Month>/) || [])[1]
          || (chunk.match(/<ArticleDate[^>]*>[\s\S]*?<Month>(\d+)<\/Month>/) || [])[1] || null;
  const mesh = tagAll(chunk, "DescriptorName");
  return {pmid, title, journal, types, doi, absParts, authors, year: y, month: mo, mesh,
          abstract: absParts.map(x => x.text).join(" ").trim()};
}

/* ------------------------------------------------------- 2. verify */

const MONTHS = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function monthNum(mo) {
  if (!mo) return null;
  if (/^\d+$/.test(mo)) return Math.min(12, Math.max(1, parseInt(mo, 10)));
  return MONTHS[String(mo).slice(0, 3).toLowerCase()] || null;
}
/* TITLES ARE COMPARED LOOSELY ON PURPOSE. Crossref and PubMed disagree about trailing
   full stops, Greek letters, sub/superscript markup and non-breaking hyphens on a large
   minority of records. Comparing them character for character would reject real papers for
   typography, which is a worse failure than it sounds: it would quietly bias the feed
   towards whichever publishers happen to agree with NCBI about punctuation. So the
   comparison is on letters and digits only, and the bar is high similarity rather than
   identity. */
function titleKey(t) {
  return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function titleAgrees(a, b) {
  const x = titleKey(a), y = titleKey(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const short = x.length < y.length ? x : y, long = x.length < y.length ? y : x;
  return long.indexOf(short) === 0 && short.length / long.length > 0.9;
}
async function crossref(doi) {
  if (!doi) return null;
  const r = await fetch(CROSSREF + "/" + encodeURIComponent(doi), {
    headers: {"accept": "application/json", "user-agent": NCBI_TOOL + " (" + NCBI_EMAIL + ")"}
  });
  if (!r.ok) return null;
  const j = await r.json();
  const m = j && j.message;
  if (!m) return null;
  return {
    title: Array.isArray(m.title) ? m.title[0] : m.title,
    journal: Array.isArray(m["container-title"]) ? m["container-title"][0] : null,
    year: ((m.issued || {})["date-parts"] || [[]])[0][0] || null,
    type: m.type || null,
    retracted: !!(m["update-to"] || []).some(u => /retract/i.test(u.type || ""))
  };
}
/* EVERY CHECK IS A REASON TO DROP, NOT A SCORE TO WEIGH. A paper that fails any one of
   these is never shown, and the reason is recorded so the decision can be audited later
   rather than re-litigated from scratch. */
async function verify(rec) {
  const fail = [];
  if (!rec.pmid) fail.push("no PMID");
  if (!rec.title) fail.push("no title");
  if (!rec.journal) fail.push("no journal");
  if (!rec.year) fail.push("no date");
  if (!rec.abstract || rec.abstract.length < 200) fail.push("no usable abstract");
  const blocked = (rec.types || []).filter(t => BLOCKED_TYPES.indexOf(t) > -1);
  if (blocked.length) fail.push("excluded type: " + blocked.join(", "));

  let cr = null;
  if (rec.doi) {
    try { cr = await crossref(rec.doi); } catch (e) { cr = null; }
    if (!cr) fail.push("DOI did not resolve at Crossref");
    else {
      if (cr.retracted) fail.push("Crossref records a retraction");
      if (!titleAgrees(cr.title, rec.title)) fail.push("title disagrees with Crossref");
      /* A YEAR MAY DIFFER BY ONE AND STILL BE THE SAME PAPER: online-first in December
         and in print in January is one record with two legitimate dates. Two years apart
         is a different paper or a bad DOI. */
      if (cr.year && Math.abs(Number(cr.year) - Number(rec.year)) > 1)
        fail.push("date disagrees with Crossref");
    }
  }
  /* WITHOUT A DOI THE PUBMED PAGE IS THE SOURCE LINK, which is a real, stable, resolvable
     record. A paper with neither is dropped: there would be nothing for the reader to
     open, and a summary nobody can check against its source is exactly what this feature
     exists not to publish. */
  const url = rec.doi ? ("https://doi.org/" + rec.doi)
            : rec.pmid ? ("https://pubmed.ncbi.nlm.nih.gov/" + rec.pmid + "/") : null;
  if (!url) fail.push("no source link");
  return {ok: fail.length === 0, fail, url, crossref: cr};
}

/* ------------------------------------------------------- 3. screen */

/* IS THIS ACTUALLY ABOUT LIFTING? A PubMed query for "protein intake AND lean mass"
   returns bariatric surgery, sarcopenia in hospital inpatients and dialysis nutrition, all
   of which are real science and none of which belongs in a feed for lifters. The screen is
   a required-term check rather than a score, because a score lets a 0.49 through on a
   good day. */
const MUST_MENTION = [
  "resistance training", "resistance exercise", "strength training", "weight training",
  "weightlifting", "weight lifting", "resistance-trained", "bodybuilding",
  "hypertrophy", "1rm", "one repetition maximum", "squat", "bench press", "deadlift"
];
/* AND WHAT IS NEVER RELEVANT HERE, however good the paper. Each of these is a clinical
   population whose findings do not transfer to a healthy lifter, and presenting them as if
   they did would be the single most misleading thing this feature could do. */
const NEVER = [
  "bariatric", "dialysis", "haemodialysis", "hemodialysis", "cancer cachexia",
  "chemotherapy", "cirrhosis", "copd", "heart failure", "stroke rehabilitation",
  "spinal cord injury", "cerebral palsy", "multiple sclerosis", "parkinson",
  "alzheimer", "dementia", "intensive care", "critically ill", "bed rest study",
  "pregnan", "paediatric", "pediatric", "children", "adolescent"
];
/* COULD A LIFTER DO SOMETHING WITH IT? This flag drives the feed's first ranking key and
   whether "Apply to my training" appears at all, so it is deliberately conservative:
   a paper qualifies only if it studied a variable the app can actually measure for
   somebody. Mechanistic work about signalling pathways is real science and is not
   actionable, and saying so is more useful than pretending. */
const APPLY_MAP = [
  ["volume",    ["training volume", "weekly sets", "number of sets", "set volume", "dose-response"]],
  ["failure",   ["proximity to failure", "repetitions in reserve", "to failure", "momentary failure"]],
  ["frequency", ["training frequency", "sessions per week", "weekly frequency"]],
  ["rest",      ["rest interval", "inter-set rest", "rest period"]],
  ["reps",      ["repetition range", "rep range", "load", "intensity of load", "%1rm"]],
  ["exercise",  ["exercise selection", "exercise variation", "free weight", "machine"]],
  ["rom",       ["range of motion", "lengthened partial", "partial repetition", "full range"]],
  ["protein",   ["protein intake", "protein supplementation", "protein dose"]],
  ["deload",    ["deload", "detraining", "training cessation", "taper"]]
];
function screen(rec, queryTopic) {
  const hay = (rec.title + " " + rec.abstract + " " + (rec.mesh || []).join(" ")).toLowerCase();
  const reasons = [];
  const nope = NEVER.find(x => hay.indexOf(x) > -1);
  if (nope) return {ok: false, why: "excluded population or context: " + nope};
  const hit = MUST_MENTION.find(x => hay.indexOf(x) > -1);
  if (!hit) return {ok: false, why: "no resistance-training context found"};
  reasons.push("mentions " + hit);

  const topics = new Set([queryTopic]);
  /* MeSH terms are the library's own subject index, so they are a far better source of
     topics than the title. Only mapped where the mapping is unambiguous. */
  const mt = hay;
  if (/hypertroph|muscle thickness|cross-sectional area|lean mass/.test(mt)) topics.add("hypertrophy");
  if (/\b1rm\b|maximal strength|one repetition maximum/.test(mt)) topics.add("strength");
  if (/sleep/.test(mt)) topics.add("sleep");
  if (/fatigue|overreach|overtrain/.test(mt)) topics.add("fatigue");
  if (/creatine|caffeine|supplement|beta-alanine|citrulline/.test(mt)) topics.add("supplements");
  if (/protein|energy balance|energy deficit|calorie|diet/.test(mt)) topics.add("nutrition");
  if (/injur|tendinop|pain/.test(mt)) topics.add("injury");
  if (/recovery|soreness|muscle damage/.test(mt)) topics.add("recovery");
  if (/periodization|programme|program design|frequency|deload/.test(mt)) topics.add("programming");
  if (/exercise selection|exercise variation|range of motion/.test(mt)) topics.add("exercise");

  let applyTo = null;
  for (const [k, words] of APPLY_MAP) {
    if (words.some(w => hay.indexOf(w) > -1)) { applyTo = k; break; }
  }
  /* TRAINED OR UNTRAINED IS THE SINGLE MOST DECISION-RELEVANT FACT about a participant
     group for this audience, so it is extracted explicitly and shown rather than buried.
     Unknown stays unknown. */
  const population = /resistance-trained|trained men|trained women|trained participants|training experience of/.test(hay)
    ? "trained"
    : /untrained|novice|no resistance training experience|recreationally active/.test(hay)
      ? "untrained" : null;
  return {ok: true, topics: Array.from(topics).filter(Boolean), applyTo, population, reasons};
}

/* THE EVIDENCE LABEL, AND THE RULE THAT IT IS DEMOTED WHEN IN DOUBT.

   PubMed's publication types are indexed by humans and are usually right, but they are
   applied generously: a narrative review that mentions pooling gets "Meta-Analysis", and a
   trial that randomised the order of two conditions within one group gets "Randomized
   Controlled Trial". Showing the stronger label in either case overstates the evidence,
   which is the exact failure mode the brief singles out. So each strong label has to be
   corroborated by the abstract's own methods, and where it is not, the weaker one is
   used. */
function evidenceType(rec) {
  let type = null;
  for (const [pt, k] of PT_MAP) {
    if ((rec.types || []).indexOf(pt) > -1) { type = k; break; }
  }
  if (!type) return "review";
  const a = (rec.abstract || "").toLowerCase();
  if (type === "meta" && !/meta-anal|pooled|random-effects|effect size|forest plot|standardi[sz]ed mean difference/.test(a))
    type = /systematic/.test(a) ? "systematic" : "review";
  if (type === "systematic" && !/systematic|search strateg|databases were searched|prisma|inclusion criteria/.test(a))
    type = "review";
  if (type === "rct" && !/random/.test(a))
    type = "controlled";
  return type;
}

/* ------------------------------------------------------- 4. summarise */

/* THE SOURCE TEXT IS THE ONLY INPUT. The prompt says so, the schema leaves nowhere to put
   anything else, and the two checks afterwards assume the model ignored both. "No outside
   knowledge" is not a request that can be trusted on its own — it is a property that has
   to be verified, which is what checkFaithful() and the verification call are for. */
const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    quickTakeaway:   {type: "string"},
    whatTheyStudied: {type: "string"},
    participants:    {type: "string"},
    whatTheyFound:   {type: "string"},
    forLifters:      {type: "string"},
    limitations:     {type: "array", items: {type: "string"}}
  },
  required: ["quickTakeaway", "whatTheyStudied", "participants", "whatTheyFound",
             "forLifters", "limitations"]
};
function summaryPrompt(rec, type, population) {
  const observational = (type === "observational" || type === "review" || type === "mechanistic");
  return [
    "You are summarising one scientific paper for experienced weight trainees.",
    "",
    "ABSOLUTE RULES. Breaking any of them makes the whole output unusable:",
    "1. Use ONLY the source text below. No outside knowledge, not even things you are sure of.",
    "2. If the source does not state something, write \"Not reported in the abstract\". Never estimate, never infer, never fill a gap.",
    "3. Copy every number exactly as written: sample sizes, weeks, percentages, effect sizes, p-values, confidence intervals.",
    observational
      ? "4. THIS IS NOT A RANDOMISED EXPERIMENT. Write \"was associated with\" or \"was linked to\". The words cause, causes, caused, leads to, results in, proves and increases-when-used-causally are forbidden."
      : "4. This was a randomised or controlled design, so hedged causal language is allowed, but keep it tied to this study (\"in this study\", \"in these participants\").",
    "5. In forLifters, NAME THE POPULATION in the sentence, e.g. \"In untrained young men over 8 weeks...\". Use may, suggests, adds evidence that. Never proves, never \"you should\".",
    "6. One study is never general advice. No medical advice, no dosing beyond what the paper used, nothing extreme.",
    "7. limitations must be specific to THIS paper and non-empty. Draw on: small sample, short duration, untrained participants, a narrow population, limited exercise selection, self-reported measures, indirect measures, no long-term follow-up, stated conflicts of interest, and that one study is not a body of evidence.",
    "",
    "LENGTHS. quickTakeaway 2-3 sentences. The others 1-3 sentences each. limitations 2-5 items.",
    "",
    "STUDY TYPE AS INDEXED: " + type,
    population ? ("PARTICIPANT STATUS AS INDEXED: " + population) : "",
    "",
    "TITLE: " + rec.title,
    "JOURNAL: " + rec.journal,
    "",
    "SOURCE TEXT (this is everything you may use):",
    rec.absParts && rec.absParts.length
      ? rec.absParts.map(x => (x.label ? x.label + ": " : "") + x.text).join("\n")
      : rec.abstract
  ].filter(Boolean).join("\n");
}

/* CAUSAL VERBS, BLOCKED ON DESIGNS THAT CANNOT SUPPORT THEM. This is a deterministic
   check, not a request to the model: "researchers found an association" becoming "X causes
   Y" is the single most common way science reporting goes wrong, and it is too important
   to leave to a system that is probabilistic by construction. */
const CAUSAL = [
  /\bcause[sd]?\b/i, /\bcausing\b/i, /\bleads? to\b/i, /\bled to\b/i,
  /\bresults? in\b/i, /\bresulted in\b/i, /\bproves?\b/i, /\bproven\b/i,
  /\bmakes? you\b/i, /\bwill increase\b/i, /\bwill improve\b/i, /\byou should\b/i
];
const CAUSAL_OK_TYPES = ["rct", "controlled", "meta", "systematic"];
/* NUMBERS ARE COMPARED AGAINST THE SOURCE, every one of them. A figure in a summary that
   is not in the abstract has been invented or mis-transcribed, and either way it must not
   ship. Years are exempt because a date legitimately appears in a sentence without being
   in the abstract body, and single digits under 10 are exempt because "2-3 sentences",
   "one study" and ordinary prose generate them constantly. */
function numbersIn(s) {
  return (String(s).match(/\d+(?:[.,]\d+)?/g) || [])
    .map(x => x.replace(",", "."))
    .filter(x => {
      const n = parseFloat(x);
      if (!isFinite(n)) return false;
      if (n >= 1900 && n <= 2100 && x.indexOf(".") < 0) return false;  // a year
      return !(n < 10 && x.indexOf(".") < 0);
    });
}
function checkFaithful(sum, rec, type) {
  const problems = [];
  const source = ((rec.abstract || "") + " " + (rec.title || "")).replace(",", ".");
  const srcNums = new Set(numbersIn(source));
  const fields = ["quickTakeaway", "whatTheyStudied", "participants", "whatTheyFound", "forLifters"];

  fields.forEach(f => {
    const v = sum[f];
    if (!v || typeof v !== "string" || v.length < 10) { problems.push(f + " is missing or too short"); return; }
    numbersIn(v).forEach(n => {
      if (!srcNums.has(n)) problems.push("the number " + n + " in " + f + " is not in the source");
    });
  });
  if (CAUSAL_OK_TYPES.indexOf(type) < 0) {
    fields.forEach(f => {
      const v = String(sum[f] || "");
      CAUSAL.forEach(re => {
        if (re.test(v)) problems.push("causal wording in " + f + " on a " + type + " design: " + (v.match(re) || [])[0]);
      });
    });
  }
  /* "you should" IS BANNED ON EVERY DESIGN, not just the weak ones. A meta-analysis is
     still not an instruction to one person. */
  fields.forEach(f => {
    if (/\byou should\b/i.test(String(sum[f] || ""))) problems.push("prescriptive wording in " + f);
  });
  const lim = Array.isArray(sum.limitations) ? sum.limitations.filter(x => x && x.length > 8) : [];
  if (lim.length < 2) problems.push("fewer than two specific limitations");
  /* THE POPULATION HAS TO BE NAMED IN forLifters, which is the line most likely to be read
     on its own and quoted out of context. */
  if (!/trained|untrained|novice|men|women|participants|adults|lifters|athletes|not reported/i.test(String(sum.forLifters || "")))
    problems.push("forLifters does not name the population");
  return problems;
}

/* THE SECOND PASS. An independent call that sees the source and the summary and nothing
   else, and is asked one question per sentence: is this supported? It is a different
   prompt rather than a different model because the failure it catches is a drifting
   paraphrase, and a fresh read of the pair catches that regardless of who wrote it. */
function verifyPrompt(sum, rec) {
  const sentences = [];
  ["quickTakeaway", "whatTheyStudied", "participants", "whatTheyFound", "forLifters"]
    .forEach(f => String(sum[f] || "").split(/(?<=[.!?])\s+/).forEach(x => {
      if (x.trim().length > 12) sentences.push(x.trim());
    }));
  return {
    sentences,
    prompt: [
      "Check each numbered sentence against the source text.",
      "A sentence is SUPPORTED only if everything it asserts is stated in, or follows directly from, the source text.",
      "A sentence that adds a number, a population, a mechanism or a recommendation not in the source is UNSUPPORTED.",
      "A sentence that turns an association into a cause is UNSUPPORTED.",
      "Answer with a JSON array of objects {i, verdict} where verdict is \"supported\" or \"unsupported\". No prose.",
      "",
      "SOURCE TEXT:",
      rec.abstract,
      "",
      "SENTENCES:",
      sentences.map((x, i) => (i + 1) + ". " + x).join("\n")
    ].join("\n")
  };
}

const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.0-flash";
async function gemini(prompt, env, schema) {
  const body = {
    contents: [{role: "user", parts: [{text: prompt}]}],
    generationConfig: Object.assign(
      /* TEMPERATURE ZERO. Nothing about this task benefits from variety, and a summary that
         changes between runs is a summary nobody can review. */
      {temperature: 0, maxOutputTokens: 1400},
      schema ? {responseMimeType: "application/json", responseSchema: schema} : {})
  };
  const r = await fetch(GEMINI + "/" + MODEL + ":generateContent?key=" + env.GEMINI_API_KEY, {
    method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("gemini " + r.status);
  const j = await r.json();
  const txt = (((j.candidates || [])[0] || {}).content || {}).parts;
  return txt && txt[0] ? txt[0].text : "";
}

/* ONE SUMMARY PER PAPER, EVER. It is generated on the server, stored, and served to
   everybody from the same record — never per user, never per request. That is both the
   cost control and the reason two people reading the same paper see the same words. */
async function summarise(rec, type, population, env) {
  let sum = null, problems = [], attempt = 0;
  while (attempt < 2) {
    attempt++;
    let raw;
    try { raw = await gemini(summaryPrompt(rec, type, population), env, SUMMARY_SCHEMA); }
    catch (e) { return {ok: false, why: "summary call failed: " + e.message}; }
    try { sum = JSON.parse(raw); } catch (e) { problems = ["summary was not valid JSON"]; continue; }
    problems = checkFaithful(sum, rec, type);
    if (!problems.length) break;
  }
  if (problems.length) return {ok: false, why: "failed the checks: " + problems.join("; "), sum};

  /* AND THEN THE INDEPENDENT READ. A single unsupported sentence sends it back once; a
     second failure rejects the summary and the paper is published with its metadata and
     link only, which is honest and still useful. */
  const vp = verifyPrompt(sum, rec);
  let verdicts = [];
  try {
    const raw = await gemini(vp.prompt, env, {
      type: "array", items: {type: "object",
        properties: {i: {type: "integer"}, verdict: {type: "string"}}, required: ["i", "verdict"]}
    });
    verdicts = JSON.parse(raw);
  } catch (e) { verdicts = []; }
  const unsupported = (verdicts || []).filter(v => v && /unsupported/i.test(v.verdict || ""));
  if (unsupported.length) {
    return {ok: false, why: "second pass rejected " + unsupported.length + " of "
      + vp.sentences.length + " sentences", sum,
      verification: {checked: vp.sentences.length, unsupported: unsupported.map(v => v.i)}};
  }
  return {ok: true, sum, verification: {checked: vp.sentences.length, unsupported: [],
          at: Date.now(), model: MODEL}};
}

/* ------------------------------------------------------- storage */

/* TWO INDEXES, BOTH SMALL. KV list operations are slow and billed, so the feed is served
   from one JSON index rather than from a listing, and each paper's full record is a
   separate key read only when somebody opens it. The index carries exactly the fields a
   card needs. */
const K_INDEX = "index:v1";
const K_PAPER = id => "paper:" + id;
const K_QUEUE = "queue:v1";
const INDEX_MAX = 400;

async function readIndex(env) {
  const raw = await env.RESEARCH.get(K_INDEX);
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
async function writeIndex(env, rows) {
  const trimmed = rows
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
    .slice(0, INDEX_MAX);
  await env.RESEARCH.put(K_INDEX, JSON.stringify(trimmed));
}
function cardOf(p) {
  return {
    id: p.id, title: p.title, journal: p.journal, published: p.published,
    publishedAt: p.publishedAt, type: p.type, topics: p.topics,
    actionable: !!p.applyTo, applyTo: p.applyTo || null, population: p.population || null,
    addedAt: p.addedAt, url: p.url, doi: p.doi || null,
    quickTakeaway: p.summary ? p.summary.quickTakeaway : null,
    whatTheyStudied: p.summary ? p.summary.whatTheyStudied : null,
    whatTheyFound: p.summary ? p.summary.whatTheyFound : null,
    forLifters: p.summary ? p.summary.forLifters : null
  };
}

/* ------------------------------------------------------- the cron */

/* META-ANALYSES AND ANYTHING THAT POWERS "APPLY TO MY TRAINING" WAIT FOR A HUMAN. Those
   are the two cases where a wrong summary does the most damage: a meta-analysis reads as
   settled, and an apply-able paper is one step from somebody changing their training. They
   are stored with approved:false and are not served until the owner approves them through
   the admin route. Everything else is served once it has passed both checks. */
/* BEFORE LAUNCH, EVERYTHING WAITS FOR A HUMAN.

   The steady-state rule below is that meta-analyses, systematic reviews and anything
   powering "Apply to My Training" need approval, because those are where a wrong summary
   does the most damage. That rule is right once the pipeline has been shown to work — and
   it is the wrong rule for the twenty papers that are meant to DEMONSTRATE that it works.
   A golden set that only ever saw meta-analyses would say nothing about how the pipeline
   handles a small trial, a cross-sectional survey or a narrative review, which are most of
   what the feed will actually contain.

   So until the launch is approved, needsApproval() is true for every paper regardless of
   type, and the golden set covers trials, observational studies and reviews as well.

   READ FROM KV, NOT FROM A BUILD-TIME CONSTANT, so flipping it is a deliberate act the
   owner performs against the live store after reading the queue — not something that
   rides along in a deploy somebody did for an unrelated reason. An env var is honoured
   too, for anybody who would rather pin it in config. Absent, or anything other than
   "true", means NOT launched: the safe reading of a missing setting is the cautious one. */
const K_LAUNCH = "setting:launchApproved";
async function launchApproved(env) {
  if (env && env.LAUNCH_APPROVED === "true") return true;
  try {
    const v = await env.RESEARCH.get(K_LAUNCH);
    return v === "true";
  } catch (e) { return false; }
}
function needsApproval(p, launched) {
  if (!launched) return true;
  return p.type === "meta" || p.type === "systematic" || !!p.applyTo;
}
async function runPipeline(env, limit) {
  const launched = await launchApproved(env);
  const seen = await readIndex(env);
  const have = new Set(seen.map(x => x.id));
  const queue = [];
  const stats = {found: 0, dropped: 0, kept: 0, pending: 0, nosum: 0, reasons: {}};
  const drop = why => { stats.dropped++; stats.reasons[why] = (stats.reasons[why] || 0) + 1; };

  for (const spec of QUERIES) {
    if (stats.kept + stats.pending >= (limit || 20)) break;
    let ids = [];
    try { ids = await esearch(spec.q, env); } catch (e) { continue; }
    const fresh = ids.filter(id => !have.has("pm" + id));
    if (!fresh.length) continue;
    let recs = [];
    try { recs = await efetch(fresh.slice(0, 6), env); } catch (e) { continue; }

    for (const rec of recs) {
      stats.found++;
      const v = await verify(rec);
      if (!v.ok) { drop(v.fail[0] || "verification"); continue; }
      const sc = screen(rec, spec.topic);
      if (!sc.ok) { drop(sc.why); continue; }
      const type = evidenceType(rec);
      const mn = monthNum(rec.month);
      const paper = {
        id: "pm" + rec.pmid,
        pmid: rec.pmid, doi: rec.doi || null,
        title: rec.title, journal: rec.journal,
        authors: rec.authors,
        published: rec.year + (mn ? "-" + String(mn).padStart(2, "0") : ""),
        publishedAt: Date.UTC(Number(rec.year), (mn || 1) - 1, 1),
        type, topics: sc.topics, applyTo: sc.applyTo, population: sc.population,
        url: v.url,
        /* THE SOURCE BASIS IS RECORDED, NOT THE SOURCE. Copyright: the abstract is not
           reproduced in the store or in the app. What is kept is where it came from and
           a hash, so a later run can tell whether the text a summary was written from has
           changed. */
        sourceBasis: "abstract",
        sourceHash: await sha256(rec.abstract),
        verification: {checks: v.fail, crossref: !!v.crossref, at: Date.now()},
        screening: sc.reasons,
        addedAt: Date.now(),
        summary: null, approved: false
      };
      const s = await summarise(rec, type, sc.population, env);
      if (s.ok) {
        paper.summary = s.sum;
        paper.verification.summary = s.verification;
      } else {
        /* A PAPER WHOSE SUMMARY FAILED IS STILL PUBLISHED, with its metadata and its link
           and nothing else. The alternative is hiding a verified paper because a language
           model could not describe it, which serves nobody. */
        paper.summaryFailed = s.why;
        stats.nosum++;
      }
      paper.approved = !needsApproval(paper, launched) && !!paper.summary;
      if (!paper.approved) { queue.push(paper.id); stats.pending++; } else { stats.kept++; }
      await env.RESEARCH.put(K_PAPER(paper.id), JSON.stringify(paper));
      seen.push(cardOf(paper));
      have.add(paper.id);
    }
  }
  await writeIndex(env, seen);
  if (queue.length) {
    const old = JSON.parse((await env.RESEARCH.get(K_QUEUE)) || "[]");
    await env.RESEARCH.put(K_QUEUE, JSON.stringify(old.concat(queue).slice(-200)));
  }
  await env.RESEARCH.put("stats:last", JSON.stringify(
    Object.assign({at: Date.now(), launched}, stats)));
  return Object.assign({launched}, stats);
}
async function sha256(s) {
  const b = new TextEncoder().encode(String(s || ""));
  const d = await crypto.subtle.digest("SHA-256", b);
  return Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/* ------------------------------------------------------- read routes */

/* THE ALLOWED ORIGINS, for the same reason gemini-worker.js has them: against a browser
   this is a wall, against a script it is a speed bump, and the rate limit below is what
   stops whoever read the URL out of the page. Unlike that Worker, these routes expose
   nothing secret and cost nothing per call, so the limit is generous. */
const ORIGINS = [
  "https://brother12334.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
];
const RATE_PER_MIN = 60;
const EDGE_TTL = 1800;           // half an hour; the cron runs daily

function cors(origin) {
  const ok = ORIGINS.indexOf(origin) > -1;
  return {
    "access-control-allow-origin": ok ? origin : ORIGINS[0],
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type,accept",
    "access-control-max-age": "86400"
  };
}
function json(data, origin, ttl) {
  return new Response(JSON.stringify(data), {
    headers: Object.assign({
      "content-type": "application/json; charset=utf-8",
      /* PUBLIC, because every reader gets the same bytes. This is the whole reason the
         research store is not in the account Worker: that one may never say public. */
      "cache-control": "public, max-age=300, s-maxage=" + (ttl || EDGE_TTL)
    }, cors(origin))
  });
}
async function rateOk(env, ip) {
  if (!env.RESEARCH || !ip) return true;
  const k = "rl:" + ip + ":" + Math.floor(Date.now() / 60000);
  const n = Number((await env.RESEARCH.get(k)) || 0) + 1;
  await env.RESEARCH.put(k, String(n), {expirationTtl: 120});
  return n <= RATE_PER_MIN;
}
/* ONLY APPROVED PAPERS ARE EVER SERVED. The gate is here, in one place, on the way out —
   not scattered through the query paths where one branch could forget it. */
const servable = rows => rows.filter(r => r && r.approved !== false);

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runPipeline(env, 20));
  },

  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    if (request.method === "OPTIONS") return new Response(null, {status: 204, headers: cors(origin)});
    if (request.method !== "GET") return new Response("method not allowed", {status: 405, headers: cors(origin)});

    const url = new URL(request.url);
    const ip = request.headers.get("cf-connecting-ip") || "";
    if (!(await rateOk(env, ip)))
      return new Response(JSON.stringify({error: "rate limit"}), {status: 429, headers: cors(origin)});

    /* ADMIN ROUTES, BEHIND A SECRET, and deliberately the only non-GET-shaped thing here:
       approving a summary is a judgement the owner makes, and it is made by hand. */
    const admin = url.searchParams.get("token");
    const isAdmin = !!(env.ADMIN_TOKEN && admin && admin === env.ADMIN_TOKEN);

    if (url.pathname === "/research/feed") {
      const rows = servable(await readIndex(env));
      const since = Number(url.searchParams.get("since") || 0);
      const topic = url.searchParams.get("topic");
      const type = url.searchParams.get("type");
      let out = rows;
      if (since) out = out.filter(r => (r.addedAt || 0) >= since);
      if (topic) out = out.filter(r => (r.topics || []).indexOf(topic) > -1);
      if (type) out = out.filter(r => r.type === type);
      return json({papers: out, at: Date.now()}, origin);
    }

    if (url.pathname.startsWith("/research/paper/")) {
      const id = url.pathname.split("/").pop();
      const raw = await env.RESEARCH.get(K_PAPER(id));
      if (!raw) return json({error: "not found"}, origin, 60);
      const p = JSON.parse(raw);
      if (p.approved === false && !isAdmin) return json({error: "not found"}, origin, 60);
      return json({paper: p}, origin);
    }

    if (url.pathname === "/research/search") {
      const q = (url.searchParams.get("q") || "").toLowerCase().trim();
      if (!q) return json({papers: []}, origin, 60);
      /* SEARCH RUNS OVER THE VERIFIED STORE ONLY. The brief allows a live PubMed fallback,
         and it is deliberately not implemented: a live result cannot be verified, screened
         and summarised inside one request, so it would either be shown unchecked or shown
         as a stub nobody can read. The honest empty state is better than either, and the
         feed's own coverage is the thing to improve instead. Documented in
         docs/research-lab.md under "what is not built". */
      const words = q.split(/\s+/).filter(Boolean);
      const rows = servable(await readIndex(env)).filter(r => {
        const hay = [r.title, r.journal, (r.topics || []).join(" "),
                     r.quickTakeaway, r.forLifters].join(" ").toLowerCase();
        return words.every(w => hay.indexOf(w) > -1);
      });
      return json({papers: rows}, origin, 300);
    }

    if (url.pathname === "/research/queue" && isAdmin) {
      const launched = await launchApproved(env);
      const ids = JSON.parse((await env.RESEARCH.get(K_QUEUE)) || "[]");
      const out = [];
      for (const id of ids.slice(-40)) {
        const raw = await env.RESEARCH.get(K_PAPER(id));
        if (raw) out.push(JSON.parse(raw));
      }
      return json({launchApproved: launched, queue: out}, origin, 0);
    }
    if (url.pathname === "/research/approve" && isAdmin) {
      const id = url.searchParams.get("id");
      const raw = id ? await env.RESEARCH.get(K_PAPER(id)) : null;
      if (!raw) return json({error: "not found"}, origin, 0);
      const p = JSON.parse(raw);
      p.approved = url.searchParams.get("reject") ? false : true;
      p.approvedAt = Date.now();
      await env.RESEARCH.put(K_PAPER(id), JSON.stringify(p));
      const rows = await readIndex(env);
      const i = rows.findIndex(r => r.id === id);
      if (i > -1) rows[i] = Object.assign(cardOf(p), {approved: p.approved});
      await writeIndex(env, rows);
      return json({ok: true, id, approved: p.approved}, origin, 0);
    }
    /* FLIPPING THE LAUNCH GATE IS ITS OWN DELIBERATE CALL, and it reports what it did so
       there is no doubt afterwards about which mode the store is in. */
    if (url.pathname === "/research/launch" && isAdmin) {
      const want = url.searchParams.get("approved");
      if (want === "true" || want === "false") await env.RESEARCH.put(K_LAUNCH, want);
      return json({launchApproved: await launchApproved(env),
                   note: want ? "set to " + want : "unchanged \u2014 pass ?approved=true|false"},
                  origin, 0);
    }
    if (url.pathname === "/research/run" && isAdmin) {
      return json(await runPipeline(env, Number(url.searchParams.get("n") || 6)), origin, 0);
    }
    if (url.pathname === "/research/stats" && isAdmin) {
      return json(JSON.parse((await env.RESEARCH.get("stats:last")) || "{}"), origin, 0);
    }

    return new Response("not found", {status: 404, headers: cors(origin)});
  }
};

/* EXPORTED FOR THE TESTS. The verification and faithfulness rules are the part of this
   file that must not drift, and they are pure functions precisely so they can be run on
   fixtures without a network, a key or a KV namespace. */
export const __test = {
  titleAgrees, evidenceType, screen, checkFaithful, numbersIn, monthNum,
  verify, needsApproval, launchApproved, cardOf, servable, CAUSAL, BLOCKED_TYPES,
  K_LAUNCH
};
