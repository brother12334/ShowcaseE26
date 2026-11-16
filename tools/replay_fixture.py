"""Build tests/fixtures/replay-2026-11-15.json from the user's own export.

The regression suite the fix spec asks for replays the WHOLE history and checks six
outcomes at once. That needs the real export, not a synthetic stand-in: every one of the
six is a statement about a specific day, and a fixture somebody wrote by hand would be a
fixture that agrees with whatever the code does.

Two inputs, both the app's own output:

    the Training History Report (.doc, which is HTML)  - 72 sessions, every set, with
                                                         side and rest columns
    the plan-change export (.csv)                      - 221 change rows

AND ONE THING THE EXPORT DOES NOT CARRY. On the movements the user does one limb per set
- Preacher Curl and Standing Cable Hip Abduction above all - the report's Side column is
blank: which limb a set was performed on is not recorded, it alternates by convention,
and which side LED varies from session to session. The app itself handles that with
setSide(), predicting from the set index and the entry's opening side.

Rather than reinvent that convention here, this takes the side assignment for those
sessions from tests/fixtures/sides-2026-11-15.json, which was parsed from the same report
for the P1-8 work and checked against the user's own statement of which side led on which
day. The two agree row for row - all 65 session/movement pairs match on weight and reps
with no exceptions, which is asserted below rather than assumed - so the merge adds a
side to rows it already describes and changes nothing else. Where the report DOES carry a
side it wins, because that is a recorded fact rather than a reconstruction.

Run it with the two paths; it prints a summary and writes the fixture. The fixture is
committed so the suite does not depend on files outside the repository, and this script
is committed so anybody can see exactly how the one was made from the other.

    python3 tools/replay_fixture.py <report.doc> <changes.csv>
"""
import csv, io, json, re, sys
from datetime import datetime

MONTHS = {m: i + 1 for i, m in enumerate(
    "January February March April May June July August September October November December".split())}


def strip_tags(s):
    s = re.sub(r"<[^>]+>", " ", s)
    s = (s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
          .replace("&nbsp;", " ").replace("&#39;", "'").replace("&quot;", '"'))
    return re.sub(r"\s+", " ", s).strip()


def num(s):
    s = strip_tags(s)
    m = re.search(r"-?\d+(?:\.\d+)?", s)
    return float(m.group(0)) if m else None


def parse_rest(s):
    """Rest cells read like "2:30" or "90s" or are blank."""
    t = strip_tags(s)
    if not t:
        return None
    m = re.match(r"^(\d+):(\d{2})$", t)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))
    return int(num(t)) if num(t) is not None else None


def parse_report(path):
    html = io.open(path, encoding="utf-8-sig").read()
    # Each session is an <h2> date heading, its <p class="meta">, and one <table>.
    blocks = re.split(r"(?=<h2>)", html)
    out = []
    for b in blocks:
        h = re.search(r"<h2>(.*?)</h2>", b, re.S)
        if not h:
            continue
        head = strip_tags(h.group(1))
        # "Sunday, July 12, 2026, Arms Day"
        m = re.match(r"^\w+,\s*(\w+)\s+(\d+),\s*(\d{4}),\s*(.+)$", head)
        if not m:
            continue
        mon, day, year, dayname = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4).strip()
        if mon not in MONTHS:
            continue
        date = "%04d-%02d-%02d" % (year, MONTHS[mon], day)
        meta = re.search(r'<p class="meta">(.*?)</p>', b, re.S)
        meta = strip_tags(meta.group(1)) if meta else ""
        started = re.search(r"Started:\s*([0-9]{1,2}:[0-9]{2}\s*[AP]M)", meta)
        ended = re.search(r"Ended:\s*([0-9]{1,2}:[0-9]{2}\s*[AP]M)", meta)

        def clock(t):
            if not t:
                return None
            dt = datetime.strptime("%s %s" % (date, t.group(1).replace(" ", "")), "%Y-%m-%d %I:%M%p")
            return int(dt.timestamp() * 1000)

        tbl = re.search(r"<table>.*?</table>", b, re.S)
        exs, cur = [], None
        if tbl:
            # <tr[^>]*>, not <tr>: a superset's rows are <tr class="ssrow"> and were
            # being skipped whole, which is how a third of the per-side data went missing.
            for row in re.findall(r"<tr[^>]*>(.*?)</tr>", tbl.group(0), re.S):
                if "<th" in row:
                    continue
                cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
                namecell = re.search(r'<td[^>]*rowspan[^>]*>(.*?)</td>', row, re.S)
                if namecell:
                    inner = namecell.group(1)
                    # The name is the first <b> in the cell. A SUPERSET member's cell
                    # opens with <span class="sstag">A1</span> before it and carries an
                    # explanatory <span class="sm"> after, so anchoring on <b> following
                    # the <td> dropped every supersetted exercise and silently reattached
                    # its sets to the one above. Preacher Curl is in a superset from
                    # August on, which is most of the data the asymmetry outcome rests on.
                    nm = re.search(r"<b>(.*?)</b>", inner, re.S)
                    if nm:
                        tag = re.search(r'class="sstag">(.*?)</span>', inner, re.S)
                        cur = {"name": strip_tags(nm.group(1)), "sets": []}
                        if tag:
                            cur["superset"] = strip_tags(tag.group(1))
                        exs.append(cur)
                        cells = cells[1:]
                if cur is None or len(cells) < 5:
                    continue
                # set, side, weight, reps, rpe, rest
                side = strip_tags(cells[1]) if len(cells) > 1 else ""
                st = {"set": int(num(cells[0]) or 0),
                      "side": side if side in ("L", "R") else None,
                      "w": num(cells[2]), "reps": num(cells[3]),
                      "rpe": num(cells[4]) if len(cells) > 4 else None,
                      "rest": parse_rest(cells[5]) if len(cells) > 5 else None}
                if st["reps"] is None and st["w"] is None:
                    continue
                cur["sets"].append(st)
        out.append({"date": date, "day": dayname,
                    "startedAt": clock(started), "finishedAt": clock(ended),
                    "ex": [e for e in exs if e["sets"]]})
    return out


def parse_changes(path):
    rows = []
    with io.open(path, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            if not r.get("date"):
                continue
            rows.append({"date": r["date"], "time": r.get("time") or "",
                         "day": r.get("day") or "", "name": r.get("exercise") or "",
                         "kind": r.get("kind") or "", "change": r.get("change") or "",
                         "why": r.get("why") or "",
                         "source": r.get("source") or ""})
    return rows


def merge_sides(sessions, path):
    """Fill in the side on rows the report leaves blank, from the P1-8 fixture.

    Refuses on any disagreement. A fixture that silently diverges from the report is
    worse than no fixture: every outcome the replay suite asserts is a statement about
    this data, and two versions of it would mean the suite was testing whichever one it
    happened to load.
    """
    try:
        src = json.load(io.open(path, encoding="utf-8"))
    except IOError:
        print("  (no sides fixture at %s; sides left as the report has them)" % path)
        return 0
    byk = {}
    for s in src:
        for nm, rows in (s.get("ex") or {}).items():
            byk[(s["date"], nm)] = rows
    filled = 0
    for s in sessions:
        for e in s["ex"]:
            rows = byk.get((s["date"], e["name"]))
            if not rows:
                continue
            if len(rows) != len(e["sets"]):
                raise SystemExit("sides fixture disagrees on row count: %s %s (%d vs %d)"
                                 % (s["date"], e["name"], len(rows), len(e["sets"])))
            for st, r in zip(e["sets"], rows):
                if st["w"] != r.get("w") or st["reps"] != r.get("reps"):
                    raise SystemExit("sides fixture disagrees on a set: %s %s %r vs %r"
                                     % (s["date"], e["name"], st, r))
                if st["side"] is None and r.get("side") in ("L", "R"):
                    st["side"] = r["side"]
                    st["sideFrom"] = "alternation"
                    filled += 1
    return filled


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    sessions = parse_report(sys.argv[1])
    changes = parse_changes(sys.argv[2])
    filled = merge_sides(sessions, "tests/fixtures/sides-2026-11-15.json")
    print("  %d blank side cells filled from the P1-8 fixture" % filled)
    sets = sum(len(e["sets"]) for s in sessions for e in s["ex"])
    sided = sum(1 for s in sessions for e in s["ex"] for x in e["sets"] if x["side"])
    names = sorted({e["name"] for s in sessions for e in s["ex"]})
    out = {"source": "Element 26 export, 2026-11-15",
           "sessions": sessions, "changes": changes}
    path = "tests/fixtures/replay-2026-11-15.json"
    io.open(path, "w", encoding="utf-8").write(json.dumps(out, indent=0, sort_keys=True))
    print("%d sessions, %d sets (%d per-side), %d movements, %d change rows -> %s"
          % (len(sessions), sets, sided, len(names), len(changes), path))
    if sessions:
        print("first %s, last %s" % (sessions[0]["date"], sessions[-1]["date"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
