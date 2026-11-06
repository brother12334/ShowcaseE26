# The version

`APP_VERSION` in `index.html`, `VERSION` in `sw.js`, and `NEWS_FOR` in `index.html` are
all the same string: **`YYYY.MM.DD.N`**.

    2026.11.06.1     the first build shipped on the 6th of November 2026
    2026.11.06.2     the second build that day

It used to be a count — 1.0 up to 60.6, a tenth per release — and the service worker kept
a second count that had drifted to 53.6 against the app's 60.6. The count was replaced
because it had stopped meaning anything: the only question anybody asks of a version here
is whether the app on their phone is the build that was just shipped, and a count cannot
answer that without a changelog in the other hand.

## Shipping a release

1. Set `APP_VERSION` to today's date, build 1. Shipping again the same day, build 2.
2. Set `NEWS_FOR` to the same string, and add the entry to `NEWS` describing what changed.
3. Set `sw.js`'s `VERSION` to the same string — it is what busts the cache, so a release
   that does not change it does not reach anybody's phone.
4. `node tests/run.js`. `version` and `navresearch` both check the three agree.

Never reuse a string, and never go backwards.

## What reads it

Everything is a **display** or an **equality**:

- `S.seenNews === NEWS_FOR` decides whether What's New opens — once per release.
- The service worker builds its cache names out of `VERSION` and sweeps the old ones by
  prefix with `!==`.
- The rest is printing it on a screen, in an export, or in a diagnostic.

Nothing orders them, and that is what made the scheme safe to change: no code had to
understand both the old shape and the new one.

**If anything ever needs to order them**, compare the four numbers, not the strings:
`"2026.11.06.10" < "2026.11.06.2"` is true as text and false as a version. `version.mjs`
holds that line as an assertion so the trap is written down somewhere that runs.

## Reading it on screen

`verLabel()` is the human form: the same string with a trailing `.1` removed, so the usual
release reads `v2026.11.06` and only a same-day rebuild carries `.2`.
