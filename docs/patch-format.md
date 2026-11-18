# The Element 26 patch format

A patch is a **JSON document you paste in**. Element 26 reads it as data, shows you every
change it would make, and does nothing until you press Apply. It is never executed: there
is no expression to evaluate, no field that names a function, and no op that can reach
your account keys, tokens or sync settings.

```json
{
  "e26patch": 1,
  "note": "Legs B is too long and quads are under the floor",
  "ops": [
    {"op": "slot.set", "day": "Legs B", "exercise": "Smith Machine Squat", "sets": 4},
    {"op": "volume.floor", "muscle": "quads", "to": 8}
  ]
}
```

- `e26patch` — format version. Must be `1`. Anything else is refused by name.
- `note` — why you are doing this, in your own words. It is stored on every change this
  patch writes to your plan history, and it is what the patch appears as in Patch history.
  Optional, and worth writing: in three months it is the only thing that will tell you.
- `ops` — the operations, applied **in the order given**. An empty list is legal and
  changes nothing, which is the cheapest possible test that a patch round-trips.

## The rules that apply to every op

**Unknown is refused, never ignored.** An unknown `op`, an unknown field inside an op, a
field of the wrong type, a day that does not exist, an exercise that is not on the day you
named — each stops the whole patch. The error names the op's position in the list (`ops[2]`)
and the exact problem. A patch that is 90% valid applies 0% of itself: there is no partial
apply, because a plan half-changed is worse than a plan unchanged and you cannot tell by
looking which half happened.

**Addressing.** Days are named the way they appear in your programme — `"Push A"`,
`"Legs B"` — not by internal id. Exercises are named the way they appear on that day. If
the same name appears twice on one day, the name alone is ambiguous and is refused; use
`"slotId"` with the id shown in the Export patch template instead, and the error tells you
that is what to do.

**Numbers are numbers.** `"sets": "4"` is refused. Rep ranges and RPE ranges are strings,
because that is what they are (`"8-12"`, `"7-9"`), and a single value is a legal range
(`"10"`, `"8"`). Loads are in **your** units, and on a movement held in both hands they are
what the app stores: one hand.

**What a patch can never touch**, whatever it says: the account id and key, any sync or
cloud setting, share links, the research admin token, and anything under `BACKUP_FIELDS`
that is not in the op list below. These are not "refused if you try"; there is no op that
addresses them.

---

## Volume

### `volume.floor`, `volume.target`, `volume.ceiling`
Set or clear a muscle's weekly set landmark. `volume.floor` is MEV, `volume.target` is MAV,
`volume.ceiling` is MRV. These are the manual landmarks the volume planner respects over
its own model.

| field | type | notes |
|---|---|---|
| `muscle` | string | a muscle group key, e.g. `"quads"`, `"hams"`, `"delts_side"` |
| `to` | number or `null` | sets per week; `null` clears it and hands the muscle back to the model |

```json
{"op": "volume.floor", "muscle": "quads", "to": 8}
{"op": "volume.ceiling", "muscle": "delts_side", "to": null}
```

The preview warns, and does not block, when a floor you are setting is above the ceiling
for the same muscle, or when your current programme already sits below a floor you are
raising — that second one is usually the reason you are raising it.

---

## Exercises on a day

### `slot.add`
| field | type | notes |
|---|---|---|
| `day` | string | the day's name |
| `exercise` | string | the movement's name |
| `at` | number | optional; 1-based position, default last |
| `sets`, `reps`, `rpe`, `rest`, `load`, `note` | see `slot.set` | optional, applied as part of the add |

### `slot.remove`
| field | type | notes |
|---|---|---|
| `day`, `exercise` or `slotId` | string | |

The preview always says how many logged sessions that slot has. Removing an exercise never
removes its history: the sessions stay, and so does everything the Body tab reads off them.

### `slot.move`
| field | type | notes |
|---|---|---|
| `day`, `exercise` or `slotId` | string | |
| `at` | number | 1-based position within the day |

### `slot.replace`
| field | type | notes |
|---|---|---|
| `day`, `exercise` or `slotId` | string | what is there now |
| `to` | string | what goes in its place |
| `keepHistory` | boolean | default `false` |

`keepHistory: false` is two movements: the old one keeps its sessions, the new one starts
empty. `keepHistory: true` registers an alias, which is the right answer only when the two
names are **the same movement** — a spelling change, or the long and short form of one
implement. It is the wrong answer for two implements, and the preview says so when the
names differ by an implement word, because that exact mistake is what Rule A had to repair.

### `slot.rename`
| field | type | notes |
|---|---|---|
| `day`, `exercise` or `slotId` | string | |
| `to` | string | the new name |

A rename is the same movement under a different name, so it carries its history with it.

---

## The prescription on one slot

### `slot.set`
Every field is optional; the ones you give are the ones that change. Omitting a field
leaves it alone — there is no "reset to default" by omission.

| field | type | notes |
|---|---|---|
| `sets` | number | 1 to 20 |
| `reps` | string | `"8-12"` or `"10"` |
| `rpe` | string | `"7-9"` or `"8"`, or `""` to clear the target |
| `rest` | `[number, number]` | seconds, low and high; `[180, 240]` |
| `load` | number or `null` | your units, one hand on a both-hands movement; `null` clears it |
| `setType` | string | `"straight"`, `"myorep"`, `"drop"`, `"amrap"` |
| `perSide` | boolean | log one limb at a time; the slot's set count is then per side |
| `note` | string | the cue you see on the set row |

**There is deliberately no `openingSide` and no `weakerExtraSet`.** Both shipped in the
first version of this format and wrote properties nothing in the app reads — the checker
accepted them, the preview drew a before-and-after row, and applying one changed nothing.
Neither is a property of a plan line: the opening side comes from the global *opening side*
setting and is stamped on the session when it starts, and the extra set for the weaker side
is added by a balance check that turns itself on and retires when the sides come level.

**A load on a movement that counts your bodyweight is the WHOLE load** — you plus whatever
is added. The plan summary marks those lines `154.8 lb (incl. 139.6 bodyweight)`. A patch
writes the whole number, so adding 5 lb to that is `159.8`, not `5`, and the part that is
you cannot be rounded to a plate, which is why those figures are not round.

```json
{"op": "slot.set", "day": "Legs B", "exercise": "Dumbbell RDL",
 "sets": 4, "reps": "8-12", "rpe": "7-9", "rest": [180, 240], "load": 50}
```

The preview checks each one against the gear you have told the app about: a load that no
pair of dumbbells or plate combination in that gym can make is a **warning with the nearest
loadable weight**, not a block, because the patch may be right and the equipment profile
out of date. A `sets` change that takes a muscle over its ceiling or under its floor is
reported with the figure before and after.

---

## The plan itself

### `day.rename`
| field | type | notes |
|---|---|---|
| `day` | string | the day's current name |
| `to` | string | the new name |

### `day.add`
| field | type | notes |
|---|---|---|
| `name` | string | |
| `at` | number | optional; 1-based position in the rotation, default last |
| `short` | string | optional; the two or three characters on the cycle strip |

### `day.remove`
| field | type | notes |
|---|---|---|
| `day` | string | |

Refused while the day still has exercises on it, because "remove the day" and "throw away
six slots" are different intentions and only one of them is written down. Remove the slots
first, in the same patch, and the preview will show you both halves.

### `rotation.order`
| field | type | notes |
|---|---|---|
| `days` | array of strings | every training day exactly once |

A list that is missing a day or names one twice is refused, with the difference named.

---

## Settings

### `settings.set`
| field | type | notes |
|---|---|---|
| `progression` | string | `"auto"`, `"ask"`, `"off"` |
| `deloads` | string | `"auto"`, `"off"` |
| `volClimb` | string | `"peak"`, `"steady"`, `"hold"` |
| `units` | string | `"lb"`, `"kg"` |
| `barMode` | string | `"total"`, `"added"` |

Only these. A `settings.set` naming anything else is refused by field name — this is the op
most likely to be handed a plausible-sounding name that is not a setting at all.

### `gym.set`
| field | type | notes |
|---|---|---|
| `gym` | string | the gym's name as you called it |
| `dbMax` | number or `null` | the heaviest dumbbell, one hand |
| `dbStep` | number or `null` | the gap between dumbbells, one hand |
| `plates` | array of numbers or `null` | the plate sizes on the floor |
| `smith` | number or `null` | what the Smith carriage weighs empty |
| `stackStep` | number or `null` | the pin spacing on a stack |
| `bar` | number or `null` | the bar, when it is not a standard one |

### `gym.home`
| field | type | notes |
|---|---|---|
| `gym` | string | the gym that becomes the one assumed when nothing else is known |

---

## Logged sessions

**Every session op shows an extra warning in the preview**, in its own block, separate from
the plan changes. A plan is a statement about the future and can be rewritten freely; a
logged session is a record of something that happened, and changing one changes what every
rule downstream believes about you.

### `session.set`
| field | type | notes |
|---|---|---|
| `date` | string | `YYYY-MM-DD` |
| `day` | string | optional, when two sessions share a date |
| `exercise` | string | the movement within the session |
| `sets` | array | each `{weight, reps, rpe}`, replacing that entry's sets |

### `session.gym`
| field | type | notes |
|---|---|---|
| `date` | string | `YYYY-MM-DD` |
| `gym` | string | the gym it was actually performed in |

Retagging a session's gym moves what the load rules believe about the kit it was logged
with, which can change a verdict. The preview says which verdicts move.

### `session.flag`
| field | type | notes |
|---|---|---|
| `date` | string | `YYYY-MM-DD` |
| `flag` | string | `"injury"`, `"illness"`, `"unusual"`, or `null` to clear |

This is the same mark Rule E's injury question writes, and it excludes the session from
load cuts. Setting it by patch is the same as answering that question.

---

## Preview, apply, undo

**Preview** shows every change as before → after, grouped by day, with warnings separated
from errors. Errors block; warnings do not. Apply is only offered after a clean preview.

**Apply** is atomic. Every change is written to your plan history under its own day with
the reason "Plan patch" and your note, and a rule id of `patch`, so a change made this way
is indistinguishable in its traceability from one the app made itself. Afterwards the app
reruns what depends on the plan: the stall rebuild, regrading if sessions changed, and the
volume recalculation.

**Undo** keeps two records per patch, because two different guarantees are wanted:

- a **full snapshot** of your state as raw bytes, which is what makes "restores exactly
  what was there" true whatever the ops were; and
- an **inverse op list** written at apply time — each op records what it overwrote, so the
  reverse is exact rather than inferred — which is what makes "undo only this patch"
  possible.

Which one undo uses depends on what has happened since. Nothing touched → the snapshot,
restored whole. Sessions logged since, none of them to anything the patch changed → the
inverse ops only, and your new sessions are never read. Something changed since that the
patch also changed → neither, silently: the slot is named, with the patch's value, the
value now, and what undo would write, and you choose.

Snapshots are gzipped and kept under a byte budget rather than a fixed count, because a
full state is several hundred kilobytes and browser storage is about five megabytes. Patch
history says per row which guarantee is still behind it. A row that has aged out of its
snapshot says "reverse only" rather than claiming something it cannot do.

---

## Writing one against your own plan

Settings → **Copy the format and my plan** puts two things on the clipboard: a compact
reference generated from the checker's own table — so it cannot describe an op the app
would reject — and a summary of your current plan. The days, the slots with their ids,
every prescription, which lines are per side, which loads include your bodyweight, your
volume floors, and the kit of each gym. That is everything needed to write a valid patch
without guessing at a name.

This is a developer-facing format. It is JSON, it is strict, and it tells you exactly which
op and which field it refused and why.

A patch you were handed rather than wrote is still a patch: **only apply ones you trust.**
It can change your whole plan in one press. It cannot touch your account, your keys or your
sync — that is the one promise this format makes about patches it has never seen.
