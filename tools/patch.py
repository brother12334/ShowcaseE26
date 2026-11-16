"""Guarded in-place patcher for index.html and friends.

Two near-misses in one session, both from loose anchors:

  * '\\u2014' in a match string where the file holds a literal em dash, so a patch
    silently matched nothing (caught by the assert) - twice.
  * an anchor '    const range = repRange(e.reps);' that also occurs as a substring of a
    SIX-space-indented line earlier in the file. s.index() found the earlier one, the
    slice ran backwards, old became "" and s.replace("", new) inserted new between every
    character of a 63,000-line file. It threw before writing, so nothing was lost, but
    only by luck.

So: every anchor must match exactly once, every slice must run forwards, and the file's
size must change by roughly what the caller expects. Nothing is written until all of
that holds.

    from patch import Patch
    p = Patch("index.html", expect_delta=(200, 4000))
    p.sub(old, new)                 # exactly one occurrence, or raise
    p.cut("start anchor", "end anchor", must_contain="foo")
    p.write()                       # then: git diff --stat
"""
import io, os, subprocess, sys


class PatchError(AssertionError):
    pass


class Patch:
    def __init__(self, path, expect_delta=None):
        self.path = path
        self.before = io.open(path, encoding="utf-8").read()
        self.s = self.before
        self.expect = expect_delta
        self.ops = []

    def sub(self, old, new, count=1):
        if not old:
            raise PatchError("empty match string")
        n = self.s.count(old)
        if n != count:
            raise PatchError(
                "anchor matched %d times, expected %d:\n  %r" % (n, count, old[:120]))
        if old == new:
            raise PatchError("match and replacement are identical")
        self.s = self.s.replace(old, new)
        self.ops.append(("sub", len(old), len(new)))
        return self

    def cut(self, start, end, new="", must_contain=None, must_not_contain=None):
        """Replace everything from `start` up to (not including) `end`."""
        for a in (start, end):
            n = self.s.count(a)
            if n != 1:
                raise PatchError(
                    "slice anchor matched %d times, expected 1:\n  %r" % (n, a[:120]))
        i = self.s.index(start)
        j = self.s.index(end)
        if not (0 <= i < j):
            raise PatchError("slice runs backwards: start at %d, end at %d" % (i, j))
        old = self.s[i:j]
        if must_contain and must_contain not in old:
            raise PatchError("slice does not contain %r; it starts %r" % (must_contain, old[:160]))
        if must_not_contain and must_not_contain in old:
            raise PatchError("slice wrongly contains %r" % (must_not_contain,))
        self.s = self.s[:i] + new + self.s[j:]
        self.ops.append(("cut", len(old), len(new)))
        return self

    def write(self):
        if self.s == self.before:
            raise PatchError("nothing changed")
        delta = len(self.s) - len(self.before)
        if self.expect is not None:
            lo, hi = self.expect
            if not (lo <= delta <= hi):
                raise PatchError(
                    "file size moved by %d bytes, expected between %d and %d" % (delta, lo, hi))
        # a patch should never collapse the file: a replace("") catastrophe grows it hugely
        if len(self.s) < len(self.before) * 0.9:
            raise PatchError("file shrank by more than a tenth (%d -> %d)"
                             % (len(self.before), len(self.s)))
        if len(self.s) > len(self.before) * 1.5:
            raise PatchError("file grew by more than half (%d -> %d)"
                             % (len(self.before), len(self.s)))
        io.open(self.path, "w", encoding="utf-8").write(self.s)
        print("%s: %d ops, %+d bytes" % (self.path, len(self.ops), delta))
        return self

    def stat(self):
        """git diff --stat for the file, so the caller sees what actually landed."""
        out = subprocess.run(["git", "diff", "--stat", "--", self.path],
                             cwd=os.path.dirname(os.path.abspath(self.path)) or ".",
                             capture_output=True, text=True)
        sys.stdout.write(out.stdout or "(no diff)\n")
        return self
