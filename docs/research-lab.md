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

## 11. Tests

| spec | what it holds |
|---|---|
| `tests/specs/navresearch.mjs` (38) | five tabs in order; the four survivors untouched; Settings one tap from Today with a 44px target and a way back; every Settings sub-page renders; Workout tab mid-session; tour and release note updated |
| `tests/specs/researchworker.mjs` (83) | title disagreement, retractions, missing source link, invented numbers, causal verbs by design, mandatory limitations, label demotion, clinical-population exclusion, post-surgical exclusion, approval gating, model resolution and scoring, JSON recovery and diagnostics, the second-pass retry, the subrequest budget |
| `tests/specs/research.mjs` (42) | feed/filter/search/detail from fixtures; a summary-less paper says so and still links out; save/read survive reload; offline cache and its date line; **no request carries training data**; **Apply never touches `S.program`** |

`tests/fixtures/research-feed.json` is synthetic. A fixture that hard-codes a real DOI goes
stale and starts lying.

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
