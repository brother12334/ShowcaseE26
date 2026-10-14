# The workout export format

What the **Export** button writes, from the finish card and from every session in History.
It is JSON, one file per workout.

Everything below is real output, generated from the app rather than written by hand. Any
time this document and `workoutExport()` disagree, the code is right and this is stale.

## Why JSON and not the CSV

The CSV at the foot of History is a spreadsheet of rows, and a session is not a rectangle.
A set carries a side, a technique, a rest, a personal-record mark and its own note; a
rectangle either loses them or grows forty mostly-empty columns. This is the session's own
shape, nested the way it actually is.

## The fields

| field | meaning |
|---|---|
| `format`, `formatVersion` | What this is, and which version wrote it. `formatVersion` goes up only when a reader would break. |
| `app.version` | The release that produced the file. |
| `exportedAt` | When the file was written, not when the workout happened. |
| `setTimes` | **Which kind of record this is** — see below. |
| `units` | `lb` or `kg`, as the app was set when it exported. |
| `workout.*` | The session: day, date, start, finish, duration, gym, feel, your note, the grade, total volume and working sets. |
| `exercises[].prescribed` | What the plan asked for, which is not always what happened. |
| `exercises[].supersetWith` | Present only on the first movement of a pair. |
| `exercises[].totalVolume` | Sum of load x reps over working sets. **Warm-ups are excluded**, as they are everywhere else in the app. |
| `sets[].weight`, `sets[].reps`, `sets[].rpe` | Numbers, not strings. `null` where the box was left empty. |
| `sets[].warmup` | Present and `true` only on warm-up sets. |
| `sets[].side` | `R` or `L` on a one-side-at-a-time movement. |
| `sets[].technique` | Myo-reps, a drop set, lengthened partials — present only when one was used. |
| `sets[].restSeconds` | The rest actually taken after that set. `0` inside a superset, where there is none by design. |
| `sets[].personalRecord` | Present and `true` only on a set that set one. |
| `sets[].at`, `sets[].atEpochMs` | When the tick was pressed: ISO 8601, and the same moment in raw milliseconds. |

A field that would be empty is left out rather than written as `null`, except in `workout`
and `prescribed`, where a `null` means "this session genuinely had none" and is worth
saying out loud.

## The timestamps, and when they do not exist

The log has always known the ORDER of your sets and the rest between them. It did not know
the clock time of any of them until 58.5, where a set began stamping `at` the moment its
tick is pressed — and losing it if the tick is taken back, because a set that did not
happen did not happen at a time.

So `setTimes` says which case a reader is holding:

- `every logged set carries the time it was logged`
- `some sets predate per-set timestamps and carry none`
- `this session predates per-set timestamps; rest lengths are still recorded`

Nothing is back-filled. A plausible invented timestamp would be indistinguishable from a
real one, which is the one thing an export of your own training must never do.

## A complete file

```json
{
  "format": "element26.workout",
  "formatVersion": 1,
  "app": {
    "name": "Element 26",
    "version": "58.5"
  },
  "exportedAt": "2026-10-14T21:30:38.155Z",
  "setTimes": "every logged set carries the time it was logged",
  "units": "lb",
  "workout": {
    "id": "s-demo",
    "day": "Upper A",
    "date": "2026-10-14",
    "startedAt": "2026-10-14T17:02:11.000Z",
    "finishedAt": "2026-10-14T18:00:11.000Z",
    "durationMinutes": 58,
    "gym": "Palma Vista",
    "feel": 4,
    "note": "Felt strong, bench moved well.",
    "quality": {
      "grade": "A-",
      "percent": 88
    },
    "totalVolume": 8807,
    "workingSets": 6
  },
  "exercises": [
    {
      "order": 1,
      "exercise": "Barbell Bench Press",
      "prescribed": {
        "sets": 3,
        "reps": "6-10",
        "rpe": "7-9"
      },
      "supersetWith": "Cable Row",
      "note": "pause on the chest",
      "totalVolume": 2775,
      "workingSets": 2,
      "sets": [
        {
          "set": 1,
          "done": true,
          "weight": 135,
          "reps": 8,
          "rpe": 6,
          "warmup": true,
          "restSeconds": 90,
          "at": "2026-10-14T17:06:11.000Z",
          "atEpochMs": 1791997571000
        },
        {
          "set": 2,
          "done": true,
          "weight": 185,
          "reps": 8,
          "rpe": 8,
          "restSeconds": 170,
          "at": "2026-10-14T17:13:11.000Z",
          "atEpochMs": 1791997991000
        },
        {
          "set": 3,
          "done": true,
          "weight": 185,
          "reps": 7,
          "rpe": 9,
          "restSeconds": 185,
          "personalRecord": true,
          "note": "last rep was a grinder",
          "at": "2026-10-14T17:19:11.000Z",
          "atEpochMs": 1791998351000
        }
      ]
    },
    {
      "order": 2,
      "exercise": "Cable Row",
      "prescribed": {
        "sets": 2,
        "reps": "10-15",
        "rpe": "8"
      },
      "totalVolume": 3000,
      "workingSets": 2,
      "sets": [
        {
          "set": 1,
          "done": true,
          "weight": 120,
          "reps": 13,
          "rpe": 8,
          "restSeconds": 0,
          "at": "2026-10-14T17:15:11.000Z",
          "atEpochMs": 1791998111000
        },
        {
          "set": 2,
          "done": true,
          "weight": 120,
          "reps": 12,
          "rpe": 9,
          "restSeconds": 0,
          "at": "2026-10-14T17:21:11.000Z",
          "atEpochMs": 1791998471000
        }
      ]
    },
    {
      "order": 3,
      "exercise": "Dumbbell Bulgarian Split Squat",
      "prescribed": {
        "sets": 2,
        "reps": "8-12",
        "rpe": null
      },
      "totalVolume": 3032,
      "workingSets": 2,
      "sets": [
        {
          "set": 1,
          "done": true,
          "weight": 159.6,
          "reps": 10,
          "rpe": 8,
          "side": "R",
          "restSeconds": 120,
          "at": "2026-10-14T17:30:11.000Z",
          "atEpochMs": 1791999011000
        },
        {
          "set": 2,
          "done": true,
          "weight": 159.6,
          "reps": 9,
          "rpe": 9,
          "side": "L",
          "technique": "myo",
          "restSeconds": 0,
          "at": "2026-10-14T17:35:11.000Z",
          "atEpochMs": 1791999311000
        }
      ]
    }
  ]
}
```
