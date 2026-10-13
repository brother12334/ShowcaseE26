#!/bin/bash
# Drain the Research Lab summary backlog, inside the KV write budget.
#
# WHY THIS EXISTS, AND WHY IT COUNTS WRITES RATHER THAN PAPERS.
#
# The first attempt was a loop that paced the MODEL calls, which was the wrong budget.
# Gemini's rate limit makes a run slow; Cloudflare KV's daily put() allowance is what
# actually stops you, and on the free plan that is 1,000 a day. A paced loop exhausted it,
# and because the rate limiter wrote on every request and did not guard its own storage
# calls, the Worker then answered 1101 on every GET and took the public feed down with it.
# Both of those are fixed in the Worker; this script is the other half of the lesson.
#
# A summarise run of six papers costs about nine writes: six paper records, one index, one
# queue, one stats. So roughly 1.5 per paper, and a 600-write budget is about 400 papers,
# leaving room for the daily cron, the approve route and the app itself.
#
#   ./tools/research-drain.sh <admin-token> [write-budget]
#
# It stops on the budget, on an empty queue, or on ANY response it cannot read: a sick
# service is a reason to stop, not to retry harder.

U="${RESEARCH_URL:-https://element26-research.ferbyablon.workers.dev}"
T="$1"
BUDGET="${2:-600}"

if [ -z "$T" ]; then
  echo "usage: $0 <admin-token> [write-budget]"
  exit 2
fi

# HEALTH FIRST, because starting work against a broken service spends the quota that is the
# whole constraint. The feed is reads-only, so it answers even when writes are exhausted.
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 45 "$U/research/feed")
if [ "$code" != "200" ]; then
  echo "feed answered $code - not starting"
  exit 1
fi

READER='
import json,sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("UNREADABLE 0 0 0 0"); raise SystemExit
if d.get("error"):
    print("ERROR 0 0 0 0", (d.get("detail") or "")[:70]); raise SystemExit
print("OK", d.get("wrote",0), d.get("failed",0), d.get("pending",0),
      1 if d.get("deferred") else 0, d.get("kvWrites",9),
      d.get("unfetchable",0))
'

# A STALL IS NOT PROGRESS, AND THE FIRST VERSION OF THIS COULD NOT TELL.
# The live drain spent thirty-two consecutive runs writing nothing with the pending count
# frozen, because the Worker was asking PubMed one paper at a time until NCBI stopped
# answering, and a fetch that returned nothing was skipped without a counter. Both are fixed
# in the Worker; this stops anyway, because a loop that cannot tell "finished" from "stuck"
# will always choose to keep going.
STALL_LIMIT=3
stall=0; lastpending=""; unread=0
spent=0; wrote=0; failed=0; runs=0
while [ "$spent" -lt "$BUDGET" ]; do
  resp=$(curl -s --max-time 240 "$U/research/summarise?token=$T&n=6")
  runs=$((runs + 1))
  line=$(printf '%s' "$resp" | python3 -c "$READER" 2>/dev/null)
  set -- $line
  status="$1"
  if [ "$status" = "UNREADABLE" ]; then
    # A DEPLOY TAKES LONGER TO PROPAGATE THAN ANYONE WAITS. Run seconds after a deploy, this
    # gets the PREVIOUS version's response - and if that version was broken, an error page
    # that is not JSON. Stopping on the first one is right in spirit and wrong in practice,
    # so it allows a couple of attempts with a pause before giving up. Still bounded: an
    # unreadable service is a reason to stop, just not quite that quickly.
    unread=$((unread + 1))
    if [ "$unread" -ge 3 ]; then
      echo "run $runs: response could not be read three times - stopping"
      break
    fi
    echo "run $runs: response could not be read (attempt $unread of 3) - waiting 30s"
    sleep 30
    continue
  fi
  unread=0
  if [ "$status" = "ERROR" ]; then
    shift 5
    echo "run $runs: the worker reported an error - stopping"
    echo "          $*"
    break
  fi
  w="$2"; f="$3"; pending="$4"; deferred="$5"; kv="$6"; unfetchable="${7:-0}"
  wrote=$((wrote + w)); failed=$((failed + f)); spent=$((spent + kv))
  note=""
  [ "$unfetchable" != "0" ] && note="  ($unfetchable could not be fetched from PubMed)"
  echo "run $runs: +$w written, $f failed the checks, $pending still pending, ~$spent/$BUDGET writes spent$note"
  if [ "$w" = "0" ] && [ "$f" = "0" ] && [ "$pending" = "$lastpending" ]; then
    stall=$((stall + 1))
    if [ "$stall" -ge "$STALL_LIMIT" ]; then
      echo "STALLED - $stall runs with no progress and pending stuck at $pending. Stopping."
      break
    fi
  else
    stall=0
  fi
  lastpending="$pending"
  if [ "$pending" = "0" ]; then
    echo "DONE - nothing pending"
    break
  fi
  # A deferred paper means Gemini is rate-limiting. Wait properly rather than burning runs.
  if [ "$deferred" = "1" ]; then sleep 90; else sleep 10; fi
done
echo "STOPPED after $runs runs: $wrote written, $failed failed the checks, ~$spent writes spent"
