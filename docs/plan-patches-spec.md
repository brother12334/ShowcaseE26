# Plan patches — the queued spec

Asked for on 2026-11-18, to be built **after** load management (rules B, C, E, F and G).
Kept verbatim below so the request cannot drift while the work in front of it finishes.

Nothing here is built yet. When it is, this file is replaced by `docs/patch-format.md`
(the format reference the spec asks for) and the item is written up in
`docs/open-work.md` like every other piece of work.

## What is already here that this should reuse rather than reinvent

Noted while reading the request, so the build does not duplicate machinery that exists:

- **The snapshot and restore path.** `rescueBackupOnce()` writes a full raw state copy to
  localStorage under `RESCUE_BACKUP_PREFIX`, keeping `RESCUE_BACKUP_KEEP`. Point 5's
  auto-backup is that mechanism, as the spec says.
- **Per-change undo.** `planSnapOne()` / `planSnapAdd()` photograph a plan entry before a
  change and travel on the change row as `undo`; `logFixUndoNow()` and
  `undoAttachmentSplit()` are two worked examples of a reversible bulk edit, including
  the "restore the names, put the aliases back" shape point 4 needs.
- **The change log.** `logPlanChange(kind, wid, name, changes, extra)` already takes a day,
  a note and an undo payload, already refuses no-ops and duplicate rows, and already
  derives its reason from what happened (P2-9). Point 3's `rule_id: "patch"` belongs
  here rather than in a parallel log.
- **The constraint check.** `setChangeConflict(wid, ei, toSets)` answers "would this take
  a muscle under its floor or over its ceiling", in the words point 2 wants for its
  warnings. It is the same function the Body tab and the stall protocol ask.
- **The impossible-load check.** `loadImpossible(name, w, sess)` answers point 2's "Load
  not possible with your Palma Vista kit", already per-gym since item 10.
- **Slot addressing.** Days are `DAYS` / `ROTATION` ids with `dayName()` for the plan name
  the spec wants to address them by; `findProgramEntryWhere(name, wid)` resolves a slot.
  There is no stable per-slot ID today — point 1 needs one, and adding it is the first
  real design decision in this feature.
- **What must never be touched.** `BACKUP_FIELDS` is the list of state keys a backup
  carries; the account key, tokens and sync settings are deliberately outside it. Point
  5's prohibition should be expressed as an allowlist built from that, not as a denylist.

## The request, as given

FEATURE: Plan patches (paste a change, preview it, apply it, undo it)

Goal. In Settings, I want a place to paste a block of text in a fixed format that can
change anything in my data in one go: volume targets, exercises on a specific day, swaps,
sets, reps, RPE, rest, loads, notes and so on. I'll often have an AI write these patches
for me, so the format has to be strict, documented and easy to generate. Every patch must
be previewed before it's applied, and it must be reliably undoable.

### 1. Format

- JSON, versioned: `{ "e26patch": 1, "note": "why I'm doing this", "ops": [ ... ] }`.
- A list of operations applied in order, each with an op name and explicit targets. Days
  are addressed by their plan name (e.g. "Push A"), and exercises by day + name, or by
  slot ID when a name appears twice.
- Data only. Never eval or execute anything. Reject unknown ops, unknown fields, and
  wrong types.
- Cover at least these ops:
  - Volume: set or clear a muscle's floor, ceiling or target.
  - Exercises on a day: add, remove, move (position), swap/replace (with or without
    keeping history), rename.
  - Prescription per slot: sets, rep range, RPE target, rest window, load, set type,
    per-side on/off, opening side, weaker-side extra set, notes.
  - Plan level: rename a day, add or remove a day, reorder the rotation.
  - Settings: progression mode, deload settings, gym kit (per gym), home gym.
  - Logged sessions: edit, retag gym, flag (injury/illness/unusual). Every session op
    shows an extra warning in the preview.
- Write `docs/patch-format.md` with every op, its fields and an example. Add an "Export
  patch template" button in Settings that copies the format doc plus a compact summary of
  my current plan (days, slots, slot IDs, current prescriptions, volume floors and
  targets), so I can paste both into an AI and get a valid patch back.

### 2. Preview before anything changes

- After pasting, show a dry run: every change as before → after, grouped by day, plus any
  warnings. For example: "Quads would drop to 5 sets/week, below the floor", "This removes
  an exercise that has 14 logged sessions", "Load not possible with your Palma Vista kit".
- Errors block the whole patch and name the op number and the exact problem. No partial
  apply.
- One Apply button, available only after a clean preview.

### 3. Apply

- Atomic: all ops succeed or nothing changes.
- Every change is written to the plan-change log under its own day, with reason "Plan
  patch" + my note, and a rule_id of `patch`.
- After applying, rerun what depends on the plan: the stall rebuild (`rebuildStalls`),
  regrading if sessions changed, and volume recalculation.

### 4. Undo (it must be reliable)

- Before every apply, save a full snapshot of my state (in localStorage, alongside the
  rescue backups), labelled with the time and the patch note.
- Settings → Patch history: every applied patch with its note, time and change count,
  each with Undo.
- Undo restores the exact previous state, byte for byte, and keeps working after
  reloading the app.
- If I've logged or edited things since that patch, the undo must not wipe them. Either
  reverse only the patch's own changes, or warn me plainly and show what would be lost
  before I confirm.
- Keep at least the last 10 patches undoable. Undo itself can be undone (redo).

### 5. Safety

- An auto-backup is taken before every apply (same mechanism as the rescue backup).
- A warning if a patch was pasted rather than written in-app: "Only apply patches you
  trust; this can change your whole plan."
- A patch can never touch account keys, tokens or sync settings.

### 6. Tests

- Every op: preview matches the result, and applying then undoing restores identical
  state.
- An invalid op anywhere makes the whole patch fail with nothing changed.
- Undo still works after a reload.
- Undo with sessions logged after the patch keeps those sessions.
- A patch can't touch tokens or account fields.
- Replay: applying an empty patch to my real export changes nothing.

Build it after load management (B, C, E, F, G) is finished, unless a part of it is trivial
to share with that work.

---

## Addendum: how undo will actually work (decided 2026-11-18, before any code)

The spec's own §4 asks for a full pre-apply snapshot, and that is what it will get. An
earlier note in this document implying `planSnapOne()` would carry the undo was wrong, and
it was wrong for a reason worth writing down: `planSnapOne()` photographs ONE PLAN ENTRY.
A patch can move volume floors, gym kit, the home gym, progression and deload settings, the
rotation, day names, and logged sessions. Per-row snapshots cannot reverse any of those, so
for most op types they would silently undo nothing and report success.

**Two records are kept per patch, because the spec asks for two different guarantees.**

1. **A full state snapshot**, taken from the raw localStorage bytes the way
   `rescueBackupOnce()` does — same mechanism, its own key prefix, its own keep count. This
   is what makes "restores the exact previous state, byte for byte" true, and it is true
   whatever the op list contained, including an op added years from now.
2. **An inverse op list**, recorded at apply time rather than inferred at undo time. Each
   op writes down what it is about to overwrite, so the reverse is exact rather than a
   guess from a diff. This is what makes "reverse only the patch's own changes" possible.

**Which one undo uses is decided by what has happened since.**

- Nothing touched since the patch → restore the snapshot wholesale. Byte for byte, as asked.
- Sessions logged or other edits since, none of them to anything the patch touched → apply
  the inverse ops only. The new sessions survive untouched, because they are never read.
- Something changed since, to something the patch also changed → neither answer is safe, so
  neither is taken silently. The preview names the slot, shows the patch's value, the
  value now, and the value undo would write, and asks. The wholesale restore stays on offer
  as an explicit "go back to before this patch, and lose what came after", with the list of
  what would be lost shown first.

**Storage, measured rather than assumed.** The user's real export is **848,557 bytes**.
Ten full snapshots is 8.5 MB and `localStorage` is about 5 MB, so ten full snapshots is not
a thing that can be done — a naive implementation would throw `QuotaExceededError` on the
third patch, or worse, succeed until the device could no longer save a session.

`CompressionStream('gzip')` is available and takes that state to **114,453 bytes**, or
**152,604** once base64'd into a string key. So:

- Inverse op lists for all 10 patches. They are kilobytes; they always fit.
- Full snapshots, gzipped and base64'd, newest first, under an explicit byte budget rather
  than a fixed count — about 1.5 MB buys all ten on this state, and the budget is what
  protects a bigger one.
- Patch history says per row which guarantee is still behind it: "full snapshot" or
  "reverse only". A row that has aged out of its snapshot must not claim byte-for-byte.
- `CompressionStream` missing (an old browser) → fewer snapshots fit, the budget handles it,
  and the row still says which kind it is.

**Tests this adds to §6**, beyond those already listed: a patch of every op type applied and
undone with a byte-for-byte comparison of the raw state; an undo after a reload with the
page's own storage round trip, not an in-memory copy, because Chromium commits
`localStorage` asynchronously and this suite has been bitten by that; an undo with two
sessions logged afterwards, asserting both survive and the slot still reverses; a
since-change collision asserting the warning names the slot and nothing is written until
confirmed; and a storage-budget test that fills the budget and asserts the oldest snapshot
is dropped, its history row reclassified, and no write ever throws.
