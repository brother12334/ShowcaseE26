# Research Lab

*Element 26 doesn't just track what you lift. It helps you understand the science behind
why you lift it.*

**The rule this whole feature is built around: one fabricated or misrepresented paper does
more damage to the app's credibility than fifty missing ones.** Every design decision below
chooses "show less" over "show something doubtful", and where the two conflict the honest
gap wins.

---

## 1. What shipped, and what did not

| | |
|---|---|
| Navigation: five tabs, Settings behind an icon on Today | **done** |
| `proxy/research-worker.js`: discover → verify → screen → summarise, on a daily cron | **done** |
| Read routes: feed, paper, search, plus an admin review queue | **done** |
| Faithfulness: deterministic checks + an independent second AI pass | **done** |
| Client: feed, filters, search, detail, Saved, offline cache, all states | **done** |
| On-device personalisation with an off switch | **done** |
| Apply to My Training (informs, never changes) | **done** |
| Europe PMC and Unpaywall as additional sources | **not built** — see §9 |
| Live PubMed fallback for thin searches | **deliberately not built** — see §9 |
| The 20-paper golden-set check | **not run** — see §9. **This gates the first real deploy.** |

The Worker is written and tested but **has not been deployed**, so the app currently shows
its "No papers yet" state. That is the honest state for a feed with no verified papers in
it, and it is what the specs assert against.

**Two independent gates hold it there, and neither can be opened by deploying.**

| gate | while closed | opened by |
|---|---|---|
| `RESEARCH_API` in `index.html` is `""` | the app never calls the service at all | editing and shipping the app |
| `setting:launchApproved` is absent from KV | **every** paper needs approval, whatever its type | `/research/launch?token=…&approved=true` |

Deploying the Worker and putting summaries in front of readers are deliberately two
separate decisions, and the second requires having read them. §10 has the order; §12 has
the checklist for judging each sentence.

---

## 2. Why a separate Worker

`accountworker.js` holds recovery keys, synced training data and push subscriptions. The
research store holds public bibliographic records and serves them read-only, anonymously,
to everybody, from the edge cache. Those are opposite security postures:

- a bug in a research route cannot reach account KV, because it is not bound to it;
- these responses are `cache-control: public` and shared between readers, which is
  forbidden for anything account-shaped and is the main reason the feed is cheap to serve;
- **Part 7's promise that no training data leaves the device stops being a claim and
  becomes something a network log proves**, because the only origin this feature talks to
  has no user records in it;
- the cron is daily and heavy; the account Worker's work is per-request and light.

---

## 3. Sources and queries

**PubMed E-utilities** (`esearch` + `efetch`) is the discovery source. `tool` and `email`
go on every request, the API key is a Worker secret, and calls are paced at one every
350 ms — well inside NCBI's published limit, because nothing here is urgent.

**Crossref** is the cross-check, not a source: a DOI must resolve there and its title,
journal and year must agree with PubMed's.

15 saved queries, one per topic group, stored in the Worker rather than built at runtime —
*a query assembled from user input is a query nobody reviewed.* Every one is filtered to
`humans[mh]`, `english[la]`, the last 365 days, and only the publication types the app has
labels for, so nothing can arrive that the UI cannot describe.

A paper's topics come from **the query that found it plus its MeSH terms**. Never from a
guess about its title — that guess is exactly how a creatine paper becomes a hypertrophy
claim.

---

## 4. Verification: every check is a reason to drop

A record is dropped, with the reason recorded, if any of these fails:

- no PMID, title, journal, date, or an abstract under 200 characters;
- publication type is **Retracted Publication, Retraction of Publication, Expression of
  Concern or Preprint**;
- Crossref records a retraction;
- the DOI does not resolve at Crossref;
- the title disagrees with Crossref;
- the year disagrees by more than one (one year apart is online-first vs print, which is
  the same paper);
- **no source link** — no DOI and no PMID means nothing for the reader to open, and a
  summary nobody can check against its source is the thing this feature exists not to
  publish.

**Titles are compared loosely on purpose.** Crossref and PubMed disagree about trailing
full stops, Greek letters and non-breaking hyphens on a large minority of records.
Character-for-character comparison would reject real papers for typography — and worse,
would silently bias the feed toward whichever publishers happen to punctuate like NCBI. The
comparison is on letters and digits with a 90% prefix bar.

---

## 5. Screening for relevance

Required-term check, not a score, because *a score lets a 0.49 through on a good day.*

- Must mention at least one of: resistance training, strength training, weightlifting,
  hypertrophy, 1RM, squat, bench press, deadlift, and so on.
- **Never shown, however good the paper:** bariatric, dialysis, cancer cachexia, COPD,
  heart failure, stroke rehab, spinal cord injury, MS, Parkinson's, dementia, ICU, bed
  rest, pregnancy, paediatric, children, adolescents. Each is a clinical population whose
  findings do not transfer to a healthy lifter, and presenting them as if they did would be
  the most misleading thing this feature could do.
- **Actionable** is flagged only when the paper studied a variable the app can measure for
  somebody (volume, proximity to failure, frequency, rest, reps/load, exercise selection,
  range of motion, protein, deload). Mechanistic signalling work is real science and is not
  actionable; saying so is more useful than pretending.
- **Trained / untrained is extracted explicitly**, because it is the single most
  decision-relevant fact about a participant group for this audience. Unknown stays
  unknown.

---

## 6. The evidence label, and demotion

`META-ANALYSIS · SYSTEMATIC REVIEW · RANDOMIZED TRIAL · CONTROLLED STUDY · OBSERVATIONAL ·
MECHANISTIC · REVIEW`

PubMed's publication types are indexed by humans and applied generously: a narrative review
that mentions pooling gets "Meta-Analysis"; a trial that randomised condition order within
one group gets "Randomized Controlled Trial". **So every strong label must be corroborated
by the abstract's own methods, and where it is not, the weaker label is used:**

- `meta` → demoted unless the abstract mentions pooling, random-effects, effect sizes,
  a forest plot or an SMD;
- `systematic` → demoted unless it mentions a search strategy, databases searched, PRISMA
  or inclusion criteria;
- `rct` → demoted to `controlled` unless the abstract mentions randomisation;
- no type at all → `review`, the weakest label.

**There is no numeric score anywhere in this feature.** "94/100" invents a precision no
study design carries and invites people to compare two numbers instead of reading two
words. The feed order *is* the ranking: decision value, then design strength, then
recency, then population match.

---

## 7. Faithful summaries

### The prompt
Generated from the retrieved source text only — the structured abstract where there is one,
because the authors' own METHODS/RESULTS split is exactly what "What they studied" and
"What they found" need, and beats any later guess at one. Temperature 0: nothing here
benefits from variety, and a summary that changes between runs is one nobody can review.

Seven absolute rules, in the prompt verbatim: source text only; "Not reported in the
abstract" rather than a guess; numbers copied exactly; association wording on
non-randomised designs; the population named in `forLifters`; no medical or dosing advice;
specific non-empty limitations.

### Then the checks, which do not trust the prompt
"No outside knowledge" is not a property you can request — it has to be verified.

**Deterministic** (`checkFaithful`):
- **every number in the summary must appear in the source.** Years and small whole numbers
  are exempt, or ordinary prose trips it constantly;
- **causal verbs are blocked on observational, review and mechanistic designs** — cause,
  causing, leads to, results in, proves, makes you, will increase. This is deterministic
  rather than delegated because association-becoming-causation is the single most common
  way science reporting goes wrong, and it is too important to leave to a probabilistic
  system;
- **"you should" is banned on every design, meta-analyses included.** A meta-analysis is
  still not an instruction to one person;
- at least two specific limitations;
- `forLifters` must name the population.

**Independent second pass:** a fresh call sees only the source and the summary and returns
supported/unsupported per sentence. One unsupported sentence → regenerate once. Still
unsupported → **the summary is rejected and the paper is published with metadata and link
only.** The verification record is stored with the paper.

### Human review
**Before launch, every paper needs approval, whatever its type.** While
`setting:launchApproved` is absent or not `"true"`, `needsApproval()` returns true for
everything — so the 20-paper check in §10 covers trials, observational studies and reviews
as well as meta-analyses. A golden set that only ever saw meta-analyses would say nothing
about how the pipeline handles the small trial that most of the feed will actually be.

**After launch, meta-analyses, systematic reviews and anything that powers "Apply to My
Training" are stored `approved: false` and are not served until the owner approves them**
via `/research/approve?token=…`. Those are the two cases where a wrong summary does most
damage: a meta-analysis reads as settled, and an apply-able paper is one step from somebody
changing their training. The approval gate is applied in one place on the way out
(`servable()`), not scattered through the query paths where a branch could forget it.

### Disclaimer
> *Summaries are written by AI from the paper and checked against it. Always see the
> original for the full picture. Not medical advice.*

---

## 8. Copyright, cost, offline

**Copyright.** Abstracts are **not** reproduced in the store or in the app. What is kept is
the source *basis* ("abstract") and a SHA-256 prefix of the text, so a later run can tell
whether the text a summary was written from has changed. The app shows metadata, Element
26's own summary, and a link.

**The model is resolved at run time, never hardcoded.** Google retires model names on its
own schedule and does it per key, so a pinned name is a scheduled outage. The Worker asks
the key which models it can actually call, scores them (flash over pro, an alias over a
pinned name, never a preview, newer wins ties) and retries once on a different model if it
gets a 404 or a 429. The scoring is shared with `proxy/gemini-worker.js` so the next
retirement is one fix rather than two.

*This was learned the expensive way: the first deploy hardcoded `gemini-2.0-flash` and
failed 7 live papers out of 7 with `gemini 404` — a name `gemini-worker.js` already
documented in a comment as retired for this very key.*

**Transient failures are retried, and the list of what counts is wider than it looks.**
404 (name gone), 429 (allowance spent) and 5xx (far end briefly unwell) all get a
different model, up to three attempts, with a 1.2s pause on a 5xx. The second live run
lost five papers to `503` — *"the model is overloaded"*, the commonest transient error this
API returns — because the retry covered only 404 and 429. A momentary overload should
never permanently cost a paper its summary.

**The output budget is 8192 tokens, not because the text is long but because the models
think first.** Reasoning is billed against the same output budget, so the original 1400
was being spent on thinking and the JSON arrived cut off mid-object. Only what is
generated is charged, so a high ceiling costs nothing when the answer is short.

**And a parse failure says what it saw.** Fenced blocks are stripped and an answer wrapped
in prose is recovered; when it still will not parse, the reason carries the length and the
first 180 characters, so truncation, a refusal and an empty response are distinguishable.
"Summary was not valid JSON" on its own sent me looking at the parser instead of at the
call.

**Cost.** Two Gemini calls per accepted paper, once ever, on the server — never per user,
never per request. At 20 candidates a day with roughly half surviving the screen, that is
**~20 calls/day**, comfortably inside the free tier. KV: one index read per feed request,
edge-cached for 30 minutes, so a day's readers cost on the order of tens of reads.

**Offline.** The feed, every opened paper and everything saved are cached in
`localStorage` (not in `S` — public data the app did not author has no business in every
backup file and sync payload). Nothing is ever deleted for being old: a stale feed read on
a plane is worth incomparably more than an empty one. Past a day the screen says *"Showing
papers from \<date\>"*; past a week it adds *"pull down to refresh"*.

---

## 9. What is not built, and why

**Live PubMed fallback for thin searches — deliberately not built.** A live result cannot
be verified, screened and summarised inside one request. It would have to be shown either
unchecked or as an unreadable stub. The honest empty state is better than both, and the
fix is to widen the saved queries instead.

**Europe PMC and Unpaywall — not built.** PubMed plus Crossref already satisfies "verifiable
with a working source link". These would add open-access full text, which would improve
summary quality; worth doing, not required for correctness.

**The 20-paper golden set — not run, and it gates the first deploy.** The brief requires
100% supported sentences across ~20 real papers before shipping. That needs the Worker
deployed with live keys and a human reading each summary against each paper. **Until it is
run and passes, the Worker should not be pointed at the production app.** The deploy steps
are below; the gate is not optional.

---

## 10. Deploying

Three Workers now, three configs. **Every command below passes
`--config wrangler.research.toml`** — without it wrangler picks up `wrangler.toml`, which
is the Gemini plan-reader proxy, and you would deploy this file over that Worker.

### Once

```bash
wrangler kv namespace create RESEARCH --config wrangler.research.toml
# paste the printed id into wrangler.research.toml, replacing REPLACE_WITH_KV_NAMESPACE_ID

wrangler secret put NCBI_API_KEY   --config wrangler.research.toml   # ncbi.nlm.nih.gov/account
wrangler secret put GEMINI_API_KEY --config wrangler.research.toml
wrangler secret put ADMIN_TOKEN    --config wrangler.research.toml   # long random string

wrangler deploy --config wrangler.research.toml
```

### Two gates, both closed by default

| gate | state while closed | closed by |
|---|---|---|
| `RESEARCH_API` in `index.html` | `""` — the app never calls the service and shows "No papers yet" | being empty |
| `setting:launchApproved` in KV | **every** paper needs approval, whatever its type | being absent |

Neither can be opened by a deploy. That is the point: deploying the Worker and putting
summaries in front of readers are two separate decisions, and the second one requires
having read them.

### Then, in this order

1. **One small batch by hand.**
   `GET /research/run?token=…&n=6`
   The response includes `launched: false`. If it says `true` before you have run the
   check, stop and fix that first.

2. **Read the drop reasons.**
   `GET /research/stats?token=…`
   A high drop rate is the screen working, not failing. `reasons` tells you which check
   did it.

3. **The 20-paper check.** `GET /research/queue?token=…`
   While the launch gate is closed this queue contains **everything** — trials,
   observational studies and reviews as well as meta-analyses — which is the point: a
   golden set that only saw meta-analyses would say nothing about how the pipeline handles
   the small trial that most of the feed will actually be.
   Read every summary **against its paper**, using the checklist in §12. Approve or reject:
   `GET /research/approve?token=…&id=pm12345678`
   `GET /research/approve?token=…&id=pm12345678&reject=1`
   Repeat steps 1–3 until **20 papers have passed with 100% supported sentences**. One
   unsupported sentence means the batch has not passed; fix the prompt or the checks and
   start the count again.

4. **Open the launch gate.**
   `GET /research/launch?token=…&approved=true`
   From here the steady-state rule applies: meta-analyses, systematic reviews and
   Apply-linked papers still queue for approval; ordinary trials and observational studies
   publish once they pass both automated checks.

5. **Let the cron run** — it is already scheduled by the config, nothing to enable.

6. **Point the app at it.** Set `RESEARCH_API` in `index.html` to the deployed URL, bump
   `APP_VERSION` and `sw.js` `VERSION`, and ship.

### Rolling back

`GET /research/launch?token=…&approved=false` stops anything new publishing without
approval. It does **not** retract papers already approved — use
`/research/approve?…&reject=1` per paper for that. Setting `RESEARCH_API` back to `""` and
shipping takes the whole feature off the app without touching the store.

Admin routes are `GET` with `?token=`, which is fine for a hand-run review from one
owner's browser and would not be fine for anything multi-user.

### Clearing records a fixed bug broke

A paper is summarised once and never revisited, which means a paper whose summary failed
under a bug has no route back: its id is in the index, so no later run will look at it
again. `GET /research/reset?token=…` lists the records that have **no summary and are not
approved**; adding `&confirm=yes` drops exactly those from the store, the index and the
queue so the next run re-fetches them and puts them through the current code.

A paper that *has* a summary is never touched, whatever its approval state, so nothing a
human has already judged can be lost this way.

### What the first four live runs found

Each of these was invisible to the fixtures and only appeared against the real API:

| symptom | cause | fix |
|---|---|---|
| `gemini 404` on every paper | a hardcoded model name, retired for this key | the resolver ported from `gemini-worker.js` |
| 14 unapproved papers served | `cardOf()` dropped `approved`; `servable()` tested `!== false` | both now require `=== true` |
| every paper "actionable" with a nonsense target | `applyTo` matched bare words in the abstract | title-only matching |
| a muscular dystrophy paper in the feed | the exclusion list had no dystrophies | `dystroph`, `myopath`, and the rest |
| `population: null` on 12 of 14 | `"untrained"` contains `"trained"` | untrained tested first, plus a lookbehind |
| `gemini 503` on five papers | retry covered only 404 and 429 | `RETRYABLE = [404,429,500,502,503,504]` |
| "summary was not valid JSON" ×3 | a 1400-token ceiling spent on reasoning | 8192, and `parseModelJson()` naming what it saw |
| a post-arthroplasty rehab study summarised | the list covered diseases, not operations | `arthroplasty`, `osteoarthritis`, `postoperative`, … |
| "second pass rejected 1 of 8 sentences" ×5 | the documented send-back was never written | one retry quoting the rejected sentences back |
| `Too many subrequests by single Worker invocation` | no budget; the run stopped mid-paper | `SUBREQ_MAX`, and a run only starts a paper it can finish |
| `causal wording in forLifters on a review design` | the check loop's retry re-sent an identical prompt, so at temperature 0 it failed identically | the check's own reasons are quoted back into the rewrite |
| `forLifters does not name the population` on lines that named it | the check's word list held nine nouns and none of the generic ones; a review has no participants of its own | the generic nouns are accepted, and a pooled design may name the studies |
| an identical `found 12, dropped 6` every run | only accepted papers entered the index, so excluded ones were re-fetched and re-screened daily | `reject:v1`, cleared by a reset |
| every review rejected, 4 of 4, while 14 experiments passed | the prompt assumed the paper had participants, so a narrative review had to invent a population or name none | the participant rules are written twice, once for a design that ran an experiment and once for one that pooled others |
| every admin route served `public, max-age=300, s-maxage=1800` | `ttl \|\| EDGE_TTL` read the `0` that meant "never cache" as absent | `ttl === 0` tested for identity, answering `private, no-store` |
| `gemini 524` on two papers | 524 is Cloudflare's own gateway timeout and was not in the retry set | `408` and `524` added beside `503` |
| no way to tell whether the rejection memory worked | neither the run nor the store reported a count, so a claim about it could not be checked | `rejectsKnown` and `rejectsAdded` per run, `rejectsRemembered` in `/research/stats` |
| every run ending on `stoppedOnBudget` after four or five papers | the free-plan subrequest ceiling was hardcoded, and the paid limit is twenty times higher | `SUBREQ_MAX` is a var; the cautious value stays the default |
| limitations reading `Small sample / Short duration / Untrained participants` | rule 7 listed those exact phrases as things to "draw on", and the check only counted length | the menu is gone, each limitation must carry the paper's own value, and generic phrases no longer count towards the two |

The counters settled the rejection question: a run reported `rejectsKnown: 5` with
`rejectsAdded: 9`, and the store then reported `rejectsRemembered: 14`. The list persists
across runs and accumulates.

One anomaly is unexplained and worth knowing about: a reset run minutes after a run that
dropped eight papers reported `rejectionsForgotten: 0`. The most likely cause is KV
read-after-write staleness rather than a lost write, since the same mechanism demonstrably
persisted five ids across the next two runs — but it has not been reproduced or confirmed,
so treat a zero there as "possibly stale" rather than "nothing was stored".

### Raising the subrequest ceiling

Every run ends on `stoppedOnBudget` with the default of 45, which is the free plan's limit.
On a paid Workers plan the limit is 1000, so the ceiling can be raised without a code change:

```
wrangler secret put SUBREQ_MAX --config wrangler.research.toml      # then enter e.g. 400
```

A value below 10, above 900, or unparseable is ignored in favour of the safe default. Each
run reports the ceiling it used as `subreqCeiling`.

### What a strict check costs, and why it stays strict

Two rejections are the checks working rather than failing, and both leave the paper
published with its metadata and link:

- **`causal wording in quickTakeaway on a review design: causing`.** The source abstract of
  that paper contains no causal wording anywhere — the model introduced it. This is the
  single most common way science reporting goes wrong and the check caught it.
- **`second pass rejected N of M sentences after 2 passes`, concentrated on reviews.** A
  narrative review's abstract is itself a summary of other work, so sentence-level support
  is a genuinely harder bar to clear there than for a trial reporting its own numbers. Those
  papers are being correctly held back.

Note also that abstracts sometimes use `proven` and similar in their own voice. A summary
that quotes it faithfully is still rejected, and that is deliberate: the app does not relay
"proven" from a narrative review, even accurately.

## 11. Tests

| spec | what it holds |
|---|---|
| `tests/specs/navresearch.mjs` (38) | five tabs in order; the four survivors untouched; Settings one tap from Today with a 44px target and a way back; every Settings sub-page renders; Workout tab mid-session; tour and release note updated |
| `tests/specs/researchworker.mjs` (280) | title disagreement, retractions, missing source link, invented numbers, causal verbs by design, mandatory limitations, label demotion, clinical-population exclusion, post-surgical exclusion, approval gating, model resolution and scoring, JSON recovery and diagnostics, the second-pass retry, the subrequest budget |
| `tests/specs/research.mjs` (86) | feed/filter/search/detail from fixtures; a summary-less paper says so and still links out; save/read survive reload; offline cache and its date line; **no request carries training data**; **Apply never touches `S.program`** |

`tests/fixtures/research-feed.json` is synthetic. A fixture that hard-codes a real DOI goes
stale and starts lying.

### Read the limitations as closely as the findings

The first eighteen live summaries were checked by hand, and the limitations were the
weakest field by a distance — four of sixteen had nothing but generic phrases, and a
meta-analysis of fourteen studies was given "Untrained participants" and "Small sample",
which is not true of it. The cause was in the prompt rather than the model: rule 7 asked
for limitations specific to the paper and then offered a list of generic ones to draw on.

A menu in a prompt is a menu the model will order from. Rule 7 now demands the feature *and
its value from the source* — not "small sample" but "only 17 participants completed the
trial" — and `BOILERPLATE` in the Worker rejects the bare phrases, naming them in the
failure so the retry has something to act on. "One study is not a body of evidence" is true
and may still appear; it just does not count towards the two a summary must have.

Any summary already stored was written under the old rule, and a plain reset does **not**
re-run those — it only drops records with no summary at all. That is what
`&stale=yes` is for:

```
GET /research/reset?token=…&stale=yes                 # dry run, lists each one and why
GET /research/reset?token=…&stale=yes&confirm=yes
```

It re-applies the two checks that read the summary alone — the limitations rule and the
population rule — and drops what fails. It cannot re-apply the rest of `checkFaithful`,
because the abstract is deliberately not stored, so a number or a causal verb cannot be
re-judged without re-fetching. An approved paper is never dropped as stale: that one is a
human's call, not a rule's.

### A deploy does not take effect instantly

A `stale=yes` dry run called seconds after `wrangler deploy` answered from the *previous*
version: it returned the old reset's fields and found only the records with no summary at
all. The same call a few minutes later returned `staleSummaries` with the expected five.

Nothing was wrong with either the code or the store. The signal to watch for is a field you
expect being **absent** from the response — not zero, absent. If that happens, wait and call
again rather than debugging the Worker.

### SUBREQ_MAX set too high is worse than not setting it

Raising the ceiling to 400 on a free-plan account produced
`Too many subrequests by single Worker invocation` at the real limit of 50 while the guard
still reported plenty of headroom — a budget the run believes is safe but is not. The run
now treats the platform's own error as the end of the run, reports `budgetWasWrong` naming
the counted spend and the configured ceiling, and says to lower the setting. If you see
that, either delete the secret or set it to 45.

## 11B. Launched

Shipped in **57.5** (`sw.js` 50.5). The order it happened in, which is the order it should
happen in again if the store is ever rebuilt:

1. Worker deployed with the launch gate shut, so nothing was servable whatever it contained.
2. Runs until the store had enough papers to judge, fixing what each run exposed.
3. `reset?stale=yes` to clear every summary written under a rule that had since changed —
   verified afterwards by re-running the stale check over all of them and getting zero.
4. Each remaining paper read against its own abstract, then approved individually.
5. `launch?approved=true`.
6. `RESEARCH_API` set in `index.html`, versions bumped, specs re-run.

The feed went live with 18 approved papers: 13 RCTs, 3 meta-analyses, 1 controlled trial,
1 review, 6 of them carrying an apply-to target. Two narrative reviews remain unpublished
because the second pass rejected a sentence in each; they are in the store with their
metadata and links and no summary, which is the designed outcome rather than a gap to fill.

From here the gate's own rule governs: a plain trial publishes without review, a
meta-analysis, a systematic review or anything actionable still waits for a human. The
rollback is `RESEARCH_API = ""`, which removes the feature from the app without touching
the store.

## 11C. Filling the feed, and ordering it

### Two passes, because they cost different amounts

Verifying and screening a paper costs one Crossref lookup. Writing its summary costs four
model calls. Running both in one pass meant the cheap work was rationed by the price of the
expensive work, which is why the store sat at about twenty papers.

- **`/research/ingest?n=40`** — verify, screen, label, link, store with `summary: null`.
  Roughly 30-40 papers per invocation. Call it repeatedly; it resumes where it stopped.
- **`/research/summarise?n=6`** — writes summaries for stored papers that have none,
  oldest-waiting first. Unchanged in how it writes or checks them.
- The cron does summaries first, then ingest with what budget is left.

A card with no summary already said so and showed the paper. That path now carries most of
the feed at first, and it is the one state where there is nothing to be unfaithful about:
there is no AI text on it at all. The ranking puts such a paper just below an identical one
that has its summary — by less than a design grade, so a meta-analysis awaiting its summary
still outranks a trial that has one.

### Reaching back five years

`BACKFILL_DAYS = 1826` against 54 queries. PubMed sorts by date, not relevance, so a query
asked once returns its newest page for ever; `K_CURSOR` remembers the `retstart` per query
so later runs go deeper, wrapping to the start when a query is exhausted. Queries are taken
round-robin so breadth arrives before depth.

`INDEX_MAX` is 500, which is a product decision rather than a storage one: the whole index
goes to the phone, a card is about a kilobyte, so that is ~130 KB gzipped once a day and
~500 KB in localStorage. Past that, the card has to be slimmed and the rest fetched on open
via `/research/paper/:id`, which exists and is unused because `researchById()` reads the
cached feed.

**The trim rule changed with it.** The index was cut newest-added first, which is harmless at
four papers a day and ruinous when a backfill adds four hundred: the approved papers are the
*oldest* arrivals. `keepRank()` now cuts by worth — approved-with-summary, approved, has a
summary, bare — with arrival time only breaking ties. A row dropped from the index still
exists under its own key.

### Approval gates the summary, not the record

`needsApproval()` holds back meta-analyses, systematic reviews and anything actionable.
That is right for a **summary** and perverse for a **bare record**. The backfill proved it:
140 of 442 papers queued, only 3 meta-analyses visible, so a reader browsing hundreds was
shown the single trials and denied the pooled analyses — and the 140 waiting were bare
records with no sentence on them for anybody to judge. That review would have been 140
clicks that read nothing.

So:

- **Ingest** publishes a bare record whenever the gate is open, whatever its design. Title,
  journal, date, type label and link, each verified against Crossref, and no AI text at all.
- **Summarise** re-applies the full rule from scratch when a summary lands, and sends the
  paper back to the queue if it needs a human.
- Only a *human* approval survives that re-check. `approvedAt` is set by the approve route
  and by nothing else, so an automatic approval cannot masquerade as somebody's judgement.

The first version of the re-check was `approved === true || !needsApproval(...)` under a
comment claiming it only ever tightened. It did the opposite — once true, always true — so a
bare meta-analysis would have kept its automatic approval the instant a summary was attached
and skipped the review that exists for exactly that case. That is the approval gate failing
open a second time, in a new place, written by the same hand that fixed it the first time.

### Re-judging what is already stored

A record's approval is written once, when the record is. So changing the rule leaves every
existing record judged by the old one — the 140 bare records queued under the previous rule
would have stayed queued for ever.

```
GET /research/reapprove?token=…                 # dry run: looked / published / queued
GET /research/reapprove?token=…&confirm=yes
```

A bare record is judged on the gate, a summarised one on the full rule. **A human's decision
is never overwritten in either direction** — `approvedAt` marks a judgement somebody made,
including a rejection, and those records are skipped and counted as `humanLeftAlone`.

### A quota is not a verdict on the paper

`summaryFailed` is permanent — the summarise pass skips any paper carrying one. That is right
for a judgement about the content and catastrophic for a transient, and pushing hundreds of
summaries through found the hole in three passes: 6 written of 6, then 1 of 6, then 0 of 6,
the failures all `gemini kept refusing (last 429)`. Had those been recorded, a few minutes of
exhausted quota would have permanently denied a summary to every paper that happened to be
next in the queue, and nothing would ever have revisited them.

So the two kinds of failure are now treated differently:

| failure | recorded? | why |
|---|---|---|
| `summary call failed: …` (429, 503, 524, subrequests) | **no** — stays pending, and the pass stops | nothing was ever read, so there is nothing to judge; and if the far end is refusing, the next six will be refused too |
| `failed the checks: …` / `second pass rejected …` | yes, final | the checks read this summary and rejected it; the paper publishes with metadata and link |

`GET /research/unfail?token=…&confirm=yes` returns records already marked on a transient to
the pending queue, and leaves every rejection-by-checks exactly as it is.

**A caution on measuring the yield.** The failure rate looked like one in two until the
pattern was separated out, and most of it was quota rather than the verifier. Any judgement
about how strict the checks are has to be made from runs that did not hit a 429, or it is
measuring the wrong thing.

### What is in scope, and what the 54 queries got wrong

Expanding from 15 queries to 54 filled the feed and filled it with the wrong papers. Measured
on the 480 it produced: **92 labelled older adults, 64 about patients or rehabilitation, 52
about athletes (30 in a named sport), 43 acute single-session laboratory studies — and only
70 of 480 carrying anything a lifter could act on.**

Six queries are gone and will not be coming back: older adults and sarcopenia; low back,
shoulder and knee pain; rate of force development, power output and jump performance;
warm-ups and potentiation; stretching, foam rolling, massage and cold water immersion;
delayed onset soreness, creatine kinase and the repeated bout effect. There is a note in
`QUERIES` saying so.

Sex differences stays, because half the readers are that population. Powerlifting and
bodybuilding stay, because those *are* lifters. Blood flow restriction stays, because it is a
method somebody may choose.

**`OFF_TOPIC` is a separate list from `NEVER`, deliberately.** `NEVER` is about safety:
populations for whom "is heavy lifting good for this" must not be read off a feed built for
lifters. `OFF_TOPIC` is about relevance — a sarcopenia meta-analysis is real science,
honestly reported, and simply not what this tab is for. They have different drop reasons so
they can never be confused in a log, and the relevance rule reads **the title and the MeSH
terms only**, so a trial of trained men that merely mentions older adults in its discussion
is still kept.

`GET /research/purge?token=…&confirm=yes` re-screens stored records against the current rules
and drops what would no longer be admitted, reporting the reasons first. It applies the scope
rule to the title alone, since MeSH is not kept on the record — the stricter half, so it
cannot drop anything `screen()` would have kept. A paper a human approved by hand is never
purged.

### Summaries are written in feed order, not arrival order

Oldest-first is the fair queue and it was the wrong one. The backfill put 440 bare records in
the store in an afternoon, so at six summaries a day the meta-analysis at the *top* of the
feed could wait ten weeks behind four hundred papers it outranks.

`summaryPriority()` weights design strength (×10), then whether a lifter could act on it
(+25), then recency. Arrival time breaks ties, so nothing is starved within a priority.
Across priorities it is not guaranteed — a plain review with no apply target always loses to
a meta-analysis — and that is an accepted trade: strong designs arrive at a few a week and
the queue drains at six a day.

It deliberately does not know who the reader is. `researchRank()` in the app does, and should;
a summary is written once and served to everybody.

### I took the live feed down, and how

Driving the summary backlog with a paced loop exhausted the free plan's **daily KV write
allowance**, and the Worker then answered `error code: 1101` on every GET — including
`/research/feed`, which does not need storage writes at all. The app showed "Couldn't reach
the research service".

The cause was `rateOk()`. Both its KV calls were unguarded, so a storage failure threw out
of it and out of `fetch()`. **A rate limiter that cannot write a counter was able to refuse
every request to the whole service.** It also wrote on *every* request, which is a large part
of why the allowance went: a public feed served to a phone should not cost a storage write.

Isolating it took three requests, which is worth remembering:

| request | result | why |
|---|---|---|
| `OPTIONS /research/feed` | 204 | returns before the limiter |
| `POST /research/feed` | 405 | returns before the limiter |
| `GET /nope` | **500** | goes through the limiter, then would 404 |

Three fixes:

1. **The limiter fails open.** Any storage error allows the request. A limiter exists to
   protect the service from abuse; a broken one that refuses everybody has become the abuse.
2. **It samples rather than counting everything** — one request in `RATE_SAMPLE`, with the
   threshold divided to match, so the response to a flood is unchanged and the write cost of
   ordinary reading is a tenth. Admin routes are always counted; there are only ever a few.
3. **The whole dispatch is wrapped.** A throw anywhere now returns a 500 with a JSON body,
   the message, and the CORS headers the app needs to read it — so the next failure is
   diagnosable from outside in one request instead of by elimination.

**The operational lesson is separate from the code one.** The backfill and the drain loop
write a paper record plus an index rewrite per paper, and the free plan allows 1,000 KV
writes a day. Clearing a 340-paper backlog cannot be done in an afternoon on that plan at
any pace, and pacing the model calls does nothing about the storage writes — which is the
limit I had not counted.

### Draining the backlog: `tools/research-drain.sh`

```
./tools/research-drain.sh <admin-token> [write-budget]      # default budget 600 writes
```

It checks the feed answers 200 before starting, runs `/research/summarise?n=6` in a loop,
adds up the `kvWrites` each run reports, and stops on the budget, on an empty queue, or on
**any** response it cannot read. A sick service is a reason to stop, not to retry harder —
which is the opposite of what the first version of this did. It waits 90 seconds instead of
10 whenever a run reports a `deferred` paper, because that is Gemini rate-limiting.

**Budget arithmetic.** A run of six costs about nine writes — six paper records, one index,
one queue, one stats — so roughly 1.5 per paper. On the free plan's 1,000 writes a day, a
600-write budget is about 400 papers and leaves 400 writes for the cron, the approve route
and the app. The allowance resets at 00:00 UTC.

When it is exhausted the Worker says so exactly:
`{"error":"worker threw","detail":"KV put() limit exceeded for the day."}` — which is the
wrapped dispatch doing its job. Before that wrapper the same condition was a bare `1101`.

### The stall, and why a run could not tell "finished" from "stuck"

The first real drain wrote 105 summaries and then spent **32 consecutive runs writing
nothing**, with the pending count frozen at 167 and the output identical to "nothing left to
do". Two causes, compounding:

1. **One `efetch` per paper.** Draining hundreds of papers asked PubMed once per paper
   rather than once per six, without an API key, until NCBI stopped answering.
2. **A fetch that returned nothing was skipped silently** — no mark, no counter. So the run
   spent its whole subrequest budget on the same few ids at the head of the queue and
   reported `0 written, 0 failed`.

Now the run fetches its abstracts in one batched call (6 ids per subrequest, stopping if the
budget runs low) and counts what the batch did not return as `unfetchable`. The paper is
still **not** marked: a fetch failure is a fact about the network, not about the paper. But
it is visible, and one bad id costs a slice of one call instead of the whole run.

`tools/research-drain.sh` stops after three runs with no progress *and* an unchanged pending
count, because a loop that cannot tell finished from stuck will always choose to keep going.

### What the order means

`researchRank()` combines evidence grade, whether a lifter could act on it, recency,
population match, whether the summary is written, and `researchRelevance()` — how close the
paper sits to what this person actually does.

`researchRelevance()` is a table of rules, each with a sentence attached, for the same reason
`researchPicks()` is: a reader should recognise the reason as true of them. Signals taken
from logged sessions outweigh ones taken from settings, because a goal can be set and never
trained — a muscle under its weekly minimum or a habit of training to failure scores above a
stated goal. Muscles trained in the last month are matched against the paper's own title.

**The number is never shown.** The brief rules out invented figures like "Science Score:
94/100", and a relevance score is that with a different name. What appears is the single
strongest reason, on the first few cards, and only where a rule about this person's own
training fired rather than a broad one about their goal. The section heading says "Most
relevant to you" when there are signals to go on and "Recent research" when there are not,
because a heading that does not match the order is a small lie told every time the tab opens.

Signals are read once per render and memoised per paper: `researchRank()` is the sort
comparator, and `researchSignals()` walks a month of sessions and calls `bodyAnalysis()`.
At twenty papers that was wasteful; at five hundred it would have made the tab feel broken.

## 12. Judging a summary sentence

Read the summary **next to the abstract**, one sentence at a time. For each sentence, one
of four verdicts. **Anything that is not the first verdict fails the paper.**

| verdict | what it means | what to do |
|---|---|---|
| **Supported by the abstract** | Everything the sentence asserts is stated in the abstract, or follows directly from it with no added step. | Keep. |
| **Not supported** | It adds something the abstract does not contain: a mechanism, a population, a comparison, a recommendation. True-in-general still counts as not supported — the rule is "from this source", not "correct". | Reject. |
| **Number wrong** | A figure does not match the abstract: a sample size, a duration, a percentage, an effect size, a p-value, a confidence interval. Includes a number that is *right* but attached to the wrong thing. | Reject. |
| **Overstated** | The claim is bigger than the design carries. An association written as a cause. One trial written as settled. A hedge dropped — "may" become "does", "in these participants" become "in lifters". A recommendation where the paper reports a finding. | Reject. |

Four things worth checking explicitly, because they are the ones the automated passes are
least able to catch:

- **Does `forLifters` name who was studied?** A line that reads as advice to anybody, when
  the participants were untrained 20-year-olds, is overstated even if every word is in the
  abstract.
- **Are the limitations this paper's, or generic?** "More research is needed" is not a
  limitation. "Thickness was measured at one site by ultrasound" is.
- **Does the evidence label match the methods you just read?** If the abstract describes a
  narrative discussion and the label says META-ANALYSIS, the demotion rule in §6 has
  missed one — that is a bug to fix, not a paper to approve.
- **Is anything medical?** Dosing beyond what the paper used, or anything that reads as
  health advice, is a reject regardless of faithfulness.

Keep a tally while you work: *papers read / papers with every sentence supported*. The
launch gate opens at 20/20, not at 20 read.
