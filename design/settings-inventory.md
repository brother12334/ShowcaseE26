# Settings detail screens — inventory

Step one of the redesign: what exists, screen by screen, before anything is drawn.

All 15 screens are reached the same way — `TAB = "sync"` with `SET_PAGE = "<key>"`, rendered
by `viewSync()` (index.html ~46553) as a header, a back chevron, the group's one-line `sub`,
and `open.body()` inside a single `.card`. The main tile grid is out of scope, as asked.

## The 15 screens

| key | Title | Body function | Lines | Controls |
|---|---|---|---|---|
| `sess` | How training is run | `prefsSessionHTML` | 117 | **9 option lists**, 1 day-order list, 1 time input |
| `targets` | Volume targets | `targetsScreenHTML` | 128 | 1 dial, 1 option list, 21 muscle accordions × 3 steppers |
| `where` | Where you train | `gymsCardHTML` + `gymGearHTML` | 88 | gym list, geo on/off, add-here, 2 step-chip rows |
| `screen` | The workout screen | `prefsScreenHTML` | 52 | **6 option lists** |
| `gym` | In the gym | `prefsGymHTML` + `barWeightPickHTML` | 44 | 4 option lists, 1 chip row, 1 typed fallback |
| `plan` | Your plan | `settingsPlanHTML` | 73 | 2 option lists (different component), deload button |
| `day` | Sleep and mornings | `settingsDayHTML` | 32 | 1 option list, 2 time inputs |
| `patch` | Plan patches | `patchCardHTML` | 88 | textarea, 6 buttons, history rows |
| `storage` | Storage | `storageCardHTML` | 50 | export, usage bar, category accordions |
| `remind` | Reminders | `pushCardHTML` | 81 | on/off, time input, diagnostics |
| `data` | Your data | `settingsDataHTML` | 67 | 4 fix/undo pairs, export, import, reset, delete |
| `share` | Share with a coach | `settingsShareHTML` | 53 | make, refresh, duration, live links |
| `acct` | Your account | `settingsAccountHTML` | 34 | 4 buttons + sync card |
| `help` | Help | `settingsHelpHTML` | 23 | 3 buttons |
| `legal` | Licensing | `settingsLicensingHTML` | 30 | static text only |

## Every setting and what it writes

**How training is run** (`sess`) — the crowding complaint in one screen. Nine stacked option
lists, each with a title, 2–3 options, and a subtitle on every option:

| Setting | Options | Writes |
|---|---|---|
| Which day you train | 2 | `data-setdayorder` → `dayOrder` |
| Rest-day soreness check | time | `#domsTimeIn` → `domsCheckTime` |
| Warm-up sets | 3 | `data-prefwarm` → `warmups` |
| Rating your sets | 2 | `data-prefrpe` → `rpe` |
| Progressive overload tips | 2 | `data-prefpo` → `overloadTips` |
| When a weight is ready to go up | 3 | `data-prefprog` → `progression` |
| How fast the number of sets climbs | 2 | `data-prefclimb` → `volClimb` |
| Relevant research picks | 2 | `data-prefrpicks` → `researchPicks` |
| Deload weeks | 2 | `data-prefdeload` → `deloads` |
| One-arm and one-leg exercises | 3 | `data-prefsides` → `sides` *(conditional)* |
| Which side goes first | 2 | `data-prefstart` → `startSideFlip` *(conditional)* |

**The workout screen** (`screen`): view mode, rest clock direction, rest-up alert (3),
sound, buzz, ask-why-on-short-set. Six option lists, nothing else.

**In the gym** (`gym`): units (lb/kg), bodyweight tracking, tape units, what a barbell number
means, bar weight chips (4 + "something else" + "rather not say").

**Where you train** (`where`): the gym list, geolocation on/off, "add this place", and gym
kit — smallest plate per side, dumbbell rack gap, both as chip rows of loadable steps.

**Volume targets** (`targets`): the global scale dial (`TG_MIN`–`TG_MAX`), where the figures
come from (published / learned), then 21 muscles grouped by area, each expanding to three
steppers for MEV / MAV / MRV.

**Your plan** (`plan`): training goal, eating phase, start/end a deload.

**Sleep and mornings** (`day`): morning check on/off, hours of sleep wanted, wake time.

## What already exists, and what does not

This matters for the shared library, because some of these components are already here and
only used on one screen each.

**Already built:**
- **A dial.** `.tg-dial` / `tgDialHTML()` — `role="slider"`, `tabindex`, `aria-valuenow`,
  arrow keys, and a live repaint that avoids re-rendering 21 rows per frame. Used on Volume
  targets only. This is the precedent the redesign's dial should extend, not replace.
- **A stepper.** `.fx-step` with ± buttons, used only inside the landmark rows.
- **Chip rows.** `.bw-chip` for bar weight and `stepChoiceHTML()` for plate / dumbbell steps.
  The plate-picker idea is already half-built here.
- **The "what this means" line.** `.set-says`, already used across most screens. The live
  explanatory line you want has a home and a name already.

**Not built:** no slider anywhere in Settings (`type="range"` appears zero times), no
dual-thumb range control, no segmented pill control, no toggle switch — every on/off in
Settings is a two-option list, not a toggle.

**Two components doing one job.** `setChoice()` renders `.ch` rows; `settingsPlanHTML` and
the day-order block render `.ob-opt` rows borrowed from onboarding. They look different and
mean the same thing. This is exactly the drift the shared library should end.

## Two things I need to settle before drawing

**1. Saving: instant save with an Undo toast, not a Save button.** Picking this now because
it constrains every layout. Today every control writes the moment it is tapped, and your
rule 6 asks for byte-identical stored values — a Save button would change *when* writes
happen, which is a behaviour change in the one place you said not to make one. It would also
need dirty-state and discard handling on 15 screens. So: instant save, and an Undo toast for
anything destructive or easy to mis-tap. `toast()` already takes an `opts.go` callback, which
is the hook. I will use this on every screen unless you say otherwise.

**2. Three variations of Licensing is not worth your time.** `legal` is static licence text
and `help` is three buttons; `acct`, `data`, `patch`, `storage` and `share` are action
screens rather than settings, and `storage` you have just signed off. Three genuinely
different layouts of a licence notice would be three typographic treatments pretending to be
design work. My proposal: full A/B/C on the nine screens that actually hold settings, and for
the six action screens a single pass that applies whatever control language you pick. Say the
word if you want A/B/C on all 15 and I will do it.

## Proposed batches

1. **How training is run**, **The workout screen**, **In the gym** — the three worst offenders
   and the ones that will set the control language.
2. **Volume targets**, **Where you train** / gym kit, **Your plan**.
3. **Sleep and mornings**, **Reminders**, **Share with a coach**.
4. The action screens — `acct`, `data`, `patch`, `storage`, `help`, `legal`.

Batch 1 is where the dial, the segmented pill, the toggle-with-subtitle and the spacing scale
get decided, so it is worth the most argument.
