# What a high-volume lifter will notice — now switched on

*Element 26. The measurements are in `docs/volume-science.md` §5F and §5G. This is the
version for deciding whether to turn it on.*

## The problem

If your own best volume for a muscle is high — say you genuinely grow best on about 30 sets
a week — the app took **a year and a half** to work that out. It added one set per
four-week cycle, starting from a population target of about 14. Only **54%** of lifters like
you got within 10% of their own best inside two years, and they ended the two years at 96%
of what they could have grown.

That is the app being timid with somebody who had already told it, by logging, that they
could take more.

## What was built

Three things, all implemented and tested:

1. **A climb that speeds up.** The first block where your lift is still progressing adds 1
   set. A second in a row adds 2. A third adds 3. Any flat block puts it straight back to 1.
   No step ever exceeds 3 sets or a fifth of what that muscle is already doing — whichever
   is smaller. The one-fifth figure is the one with a trial behind it: Scarpelli 2022 raised
   each leg to 20% above that person's *own* previous volume and beat moving everyone onto a
   fixed "optimal" number.
2. **A pull-back that aims instead of retreating.** Today an overreach removes a flat 2 or 3
   sets. Instead it returns you to halfway between the last volume that *was* working and
   where you are now — because those two numbers bracket the answer — then climbs again in
   single sets. With nothing on record it steps down a fifth.
3. **A start point taken from your own history.** If you have been training, the app starts
   from what you have actually been doing plus up to 20%, rather than from a population
   target. The population target is for people with no history.

## It is on by default — and what that decision cost

1,000 synthetic lifters per population, two years each, each with a true best volume and a
true recovery limit the app cannot see. Same lifters, same luck, different policies.

**The accelerating ladder is worse than what ships today for four of five populations.**
Typical lifters got 62% of the growth available to them, against 82.7% now. Careful,
low-noise lifters got 51% against 79%.

**The reason is not the step size.** Every "climb until something tells you to stop" policy
parks you **25–50% above your own best**, because the thing it climbs until is *breakdown* —
and breakdown sits a long way above the point where extra sets stop buying anything. Going
faster just arrives at the wrong place sooner. The objective was wrong, not the speed.

**The own-history start also failed on its own**, which was a genuine surprise: at a smaller
sample it looked like a clean win. It gets you to a high volume quickly, and then the same
wrong stop signal keeps you there.

## The version that does work, and the choice it forces

Same ladder, same start, one change: **stop climbing when adding sets stops *improving*
your response**, rather than when you start falling apart. That is a different question, and
it is the actual definition of your best volume.

| | now | with it |
|---|---|---|
| **Lifters who can take a lot** | 76% of available growth, 54% ever reach their best | **92%**, and **88%** reach it — in 5 cycles rather than 17 |
| **Lifters who can't take much** | 32% of available growth, 75% of blocks past their limit | **71%**, and **48%** of blocks |
| Typical | 83% | **85%**, with *fewer* blocks past the limit |
| Noisy readings | 85% | **88%**, blocks past the limit nearly halved |
| **Careful, steady lifters** | **79%** | **74%** — worse |

**This is a trade, not a free upgrade, and it has been taken deliberately.** Steady lifters
give up about 5 points of growth so that low-ceiling lifters gain 38 and high-ceiling
lifters gain 15. The low-ceiling group is also the recovery-safety case — three-quarters of
their blocks were past what they could recover from — which is what settles it.

**Anyone paying that price can opt out.** Settings → *How fast the number of sets climbs* →
"One set at a time" restores the old behaviour exactly, and the setting says what the trade
is rather than hiding it.

**Existing users switch at their next block boundary**, not mid-block, so a block already
under way finishes on the rules it was planned against. One line on the "What changed" card
on the Program tab says sets are now added faster and eased off sooner, and points at the
off switch.

Two smaller honesty notes on the same table: the "blocks past the limit" figure for
high-ceiling lifters goes from 0.3% to 8.9%, and that gate cannot be met — 0.3% is what
*never getting there* looks like. And the steady-lifter regression has a known cause (an
early wrong guess at their best never gets revised) whose two obvious fixes were both
measured and both made things worse elsewhere.

## What you would notice day to day, if it were on

- **Faster increases while you are progressing.** Three good blocks in a row and the app
  adds 3 sets, not 1 — and it tells you why: *"still progressing at 18 sets — adding 2 (2
  responding cycles in a row)"*.
- **A quicker, more targeted pull-back when you are not.** *"over the limit at 30 sets —
  back to 25, halfway to the 20 that was still working"*, instead of a flat "cut 2".
- **One flat block and the acceleration is gone.** Back to single sets until you earn it again.
- **Nothing is ever stacked into one session.** Extra volume goes on another day. Ten sets
  for one muscle in one session is a hard stop; six is where the evidence thins and stays
  advice.
- **Under the "ask" setting it is offered, not applied.** Every step-up is written to the
  plan history with its reason either way.

## The attempt to fix the steady-lifter cost, which did not work

The plan was a **periodic re-check**: after four blocks sitting on the learned best, spend
one block deliberately above it, and move the estimate only if the response beats your own
measurement noise.

**It fixed the thing it was built for and broke two others.** Steady lifters recovered from
74% to **84%** of available growth — past the 79% target. But lifters who can take a lot fell
from 92% to **68%**, with only 14.5% ever reaching their best, and lifters who can take
little fell from 71% to **40%**. So it is not shipped.

The reason is worth knowing, because it rules out a whole family of fixes: **a re-check is
something you do when you are settled, and the people who most need the climb are never
settled inside two years.** Every block spent re-checking is a block not spent climbing. And
a failed re-check puts you back exactly where you were, which removes the slow upward drift
that was quietly helping. The machinery meant to raise a stuck estimate is what pins it.

It did expose one real defect that is now fixed: a flat "+2 sets" probe is 50% of a muscle
doing four sets, and it broke the 20% cap on 8.5% of low-ceiling increases. The relative cap
now wins.

## What is still open

The steady-lifter cost is the one known price of what now ships. Three fixes have been
measured and rejected, and they fail for the same reason: each tries to *loosen* the learned
estimate, and loosening it costs the people the estimate is protecting. The next attempt
should make the estimate **better conditioned when it is first set** — most likely by
refusing to set it at all until a muscle has enough readings for your own noise figure to
mean anything, which is exactly the condition steady lifters fail. That is `§6` item 1.

## One thing the audit found that is already worth knowing

The reason all of this took so long to see is that the old simulation measured the wrong
quantity. It reported that typical lifters spend 50% of blocks "overreached" and low-ceiling
lifters 75% — but those were measured against the point where *growth flattens*, not the
point where *recovery fails*, because the model used one number for both. Corrected, the
real figures are 14.5% and 41.2%.

It also exposed a genuine bug the old figure had been hiding: the penalty for being over
was so mild that **a lifter could sit above their limit for all 24 blocks and nothing ever
pulled them back.** A limit the app cannot feel is a limit it can never learn. That is
fixed in the model, and it is why today's policy now scores much worse for low-ceiling
lifters than it appeared to — 32% rather than 77%. The old number was flattering what ships.
