# Reconcile — do the fifteen chosen screens feel like one app?

Your picks: **sess B · screen A · gym B · targets (dial + B's ranges) · where B · plan A ·
day A · remind B · share B**, plus one pass each on the six action screens.

Checked by walking the top-level block sequence each screen emits, rather than by eye.

## The spine

    HERO  >  the control that sets it  >  says  >  (SEC > group)*  >  MORE

All fifteen conform to it now. Three did not when the audit was run, and one of those was a
fault in my own reporting rather than in the design — see the last section.

| screen | sequence |
|---|---|
| sess | HERO > seg > says > SEC×3 > MORE |
| screen | HERO > seg > says > SEC×2 > MORE |
| gym | HERO > seg > says > SEC > MORE |
| targets | HERO(dial) > says > SEC×3 > says > MORE |
| where | HERO > list > says > SEC×2 > MORE |
| plan | HERO > seg > says > SEC > MORE |
| day | HERO > stepper > says > SEC > MORE |
| remind | HERO > button > says > SEC×3 > MORE |
| share | HERO > seg > says > SEC×2 > MORE |
| acct | HERO > SEC > group > says > SEC > MORE |
| data | HERO > button > says > MORE > SEC(danger) |
| patch | HERO > SEC > group > says > MORE |
| storage | HERO > bar > button > says > SEC > MORE |
| help | HERO > SEC×2 |
| legal | HERO > SEC > MORE |

## The three rules that settle the variety

**1. The hero's type follows what the screen is about, not a house style.**

- a **value** hero (mono, the number style) where one figure answers the screen: `LB`,
  `8 h`, `30 days`, `3` gyms, `0 of 3`, `74 sessions`, `1.8 MB`, the version, the dial.
- a **sentence** hero (sans, 600) where no single figure does: *Asks before adding weight,
  tracks RPE, adds its own warm-ups*; *Build muscle*; *Fer*; *Open source*.
- an **illustration** hero exactly once, on the workout screen, because that setting
  changes what you look at. It is drawn as bars and blocks rather than a copy of the real
  session, so it cannot go stale when the session layout changes. **It shows structure,
  never content.**

**2. The control under the hero is the hero's own control.** Where the hero is a fact
rather than a setting — `acct`, `help`, `patch`, `legal` — there is no control under it and
the first group follows directly. Those four are identity and reading screens, not settings.

**3. `targets` is the one screen where the hero *is* the control.** The dial is both the
readout and the thing you drag. That is better than splitting them, and it is allowed
precisely because nothing else on that screen competes for the top.

## What the audit changed

- **where B** had a hero with no control — the same fault sess B had, which you had already
  ruled on. The count's control is the list it counts, so the three gyms now sit under it.
- **remind B** was the only pick with a primary action and no `says` after it.
- **gym B** had no `MORE`, against rule 1. *Measuring yourself* — bodyweight and the tape —
  is not "in the gym", so it collapses.
- **data** is the one deliberate exception to "MORE last": the irreversible group must be
  the final thing on the screen, so `MORE` sits above it.
- **help** has no `MORE` and needs none. It is three buttons; there is nothing advanced to hide.

## Saving, as agreed

Instant, with an Undo toast. Every write goes through one call so nothing drifts:

    toast(<what changed, in words>, "good", {go: () => <restore the previous value>})

`toast()` already takes `opts.go`. The contract for the build: **no setting writes without
producing a toast that can put it back**, and the toast names the value, not the field —
"Warm-ups: plan only", not "Saved".

## Two faults of mine, recorded

**I reported three fixes as applied when only one was.** The patch script aborted on a bad
anchor before reaching the other two, and I read "patched" from the one `print` that did
run. The gym B stepper landed — which is the one I screenshotted, so the screenshot
confirmed the fix that worked and said nothing about the two that had not. sess B's promoted
control and screen A's `says` were missing for three messages. Caught here only because this
audit walks the emitted blocks instead of trusting the earlier report.

**The em-dash trap, again.** The second attempt failed because the anchor used `—`
while the file holds a literal `—`. It is written down in the project notes and I hit it
anyway. Both patch scripts now write after each successful substitution, so a later miss
cannot silently discard an earlier success.


## Built — all nine, 2026.11.17.55

| screen | variation | shipped |
|---|---|---|
| sess | B | .44 |
| screen | A | .45 |
| gym | B | .46 |
| targets | dial + B's ranges | .47–.49 |
| where | B | .51 |
| plan | A | .52 |
| day | A | .54 |
| remind | B | .55 |
| share | B | .55 |

Each one was held against the build it replaced: the same taps leave the same bytes, every
explanatory string survives, and the screenshot was looked at before it was called done.

### What the nine added to the library

`sdStep` and `bindSdSteps`, for day A's hours — one stepper mechanism rather than a second
copy of the landmark steppers' hard-won behaviour (commit on release, a click handler
beside the pointer handlers, a readout that is a real spinbutton). `sdMore` gained an
`open` flag, for a fold that is usually empty and occasionally holds the most urgent thing
on the screen; live share links are the case it was written for.

### What the conversions cost, and what caught it

- **Copy, four times.** Segmented pills described only the option you were standing on;
  switches dropped their off-state sentence; a glossary link vanished; share lost "each one
  is a different thing to tell somebody about yourself". `segsay.mjs` is the standing guard
  and the copy diff is the per-conversion check. Both were wrong before they were right —
  the copy diff under-reported twice and over-reported once, and `segsay`'s toggle control
  asserted `true` and printed the wrong list of pages until it was made to count.
- **One behaviour, on purpose.** Day A's hours moved from a text field to a stepper. It is
  the one control in nine screens that changed, and `daypref.mjs` §4 and §5 exist because
  of it.
- **A defect in the specs themselves.** Three conversion specs compared against a
  hand-dropped file in a scratchpad, all three sharing one path. `oldBuild(ref)` in
  `_e26.mjs` takes the old build out of git instead, at a commit each spec names.

### Still to do

The six action screens — `acct`, `data`, `patch`, `storage`, `help`, `legal` — in their
single pass.
