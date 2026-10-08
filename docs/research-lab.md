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
**Meta-analyses, systematic reviews and anything that powers "Apply to My Training" are
stored `approved: false` and are not served until the owner approves them** via
`/research/approve?token=…`. Those are the two cases where a wrong summary does most
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

```bash
# KV
wrangler kv:namespace create RESEARCH

# wrangler.toml
# [[kv_namespaces]]  binding = "RESEARCH"  id = "<id>"
# [triggers]         crons = ["17 4 * * *"]

wrangler secret put NCBI_API_KEY      # ncbi.nlm.nih.gov/account
wrangler secret put GEMINI_API_KEY
wrangler secret put ADMIN_TOKEN       # long random string
wrangler deploy proxy/research-worker.js
```

Then, **in this order**:

1. `GET /research/run?token=…&n=6` — one small batch by hand.
2. `GET /research/stats?token=…` — read the drop reasons. A high drop rate is the screen
   working, not failing.
3. `GET /research/queue?token=…` — read every queued summary **against its paper**. This is
   the golden-set check. Approve or reject each one.
4. Only once 20 papers have passed at 100% supported sentences: let the cron run, and point
   `RESEARCH_API` in `index.html` at the deployed Worker.

Admin routes are `GET` with `?token=`, which is fine for a hand-run review from one owner's
browser and would not be fine for anything multi-user.

---

## 11. Tests

| spec | what it holds |
|---|---|
| `tests/specs/navresearch.mjs` (38) | five tabs in order; the four survivors untouched; Settings one tap from Today with a 44px target and a way back; every Settings sub-page renders; Workout tab mid-session; tour and release note updated |
| `tests/specs/researchworker.mjs` (52) | title disagreement, retractions, missing source link, invented numbers, causal verbs by design, mandatory limitations, label demotion, clinical-population exclusion, approval gating |
| `tests/specs/research.mjs` (42) | feed/filter/search/detail from fixtures; a summary-less paper says so and still links out; save/read survive reload; offline cache and its date line; **no request carries training data**; **Apply never touches `S.program`** |

`tests/fixtures/research-feed.json` is synthetic. A fixture that hard-codes a real DOI goes
stale and starts lying.
