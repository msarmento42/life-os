# 0003 — SQLite WAL mode with tuned pragmas

**Status:** Accepted (reconstructed, rationale inferred)
**Date:** 2026-07-19 (reconstructed)

## Context

`database.py` sets `PRAGMA journal_mode=WAL`, `PRAGMA synchronous=NORMAL`, and
`PRAGMA cache_size=-64000` (64MB) on every new SQLite connection. This was
present from the repo's initial commit (`4a92a59`) and has not been changed
since.

## Decision

Run SQLite in WAL (write-ahead log) mode with `synchronous=NORMAL` and a 64MB
page cache, applied globally via a SQLAlchemy `connect` event listener.

## Consequences

INFERRED: WAL mode allows concurrent readers alongside a writer, which matters
here because the FastAPI backend, ad-hoc scripts (`seed.py`, `scripts/`), and
a human occasionally opening the `.db` file directly can all touch it around
the same time. INFERRED: `synchronous=NORMAL` trades a small durability window
(possible loss of the last transaction on an OS crash, not on an app crash)
for meaningfully faster writes, which is a reasonable trade for a personal,
frequently-backed-up-by-nothing-in-particular local app rather than a system
of record.

Both `.agios/CLAUDE.md` and `.agios/scope.json`/`AGENTS.md` (pre-reconstruction)
independently call out "do not change PRAGMA settings unless explicitly
permitted," which confirms this is being *treated* as a deliberate, load-bearing
setting even though no doc states the original reasoning.

## Alternatives Rejected

No evidence of alternatives considered.

## Evidence

- `database.py:11-17` — the `set_sqlite_pragma` event listener.
- `git log --oneline -- database.py` / `git log -p -- database.py`: the pragma block is present in the initial commit (`4a92a59`, "Initial commit — Life OS v1"); no later commit touches it.
- `.agios/CLAUDE.md:14` — "SQLite WAL mode is enabled — do not change PRAGMA settings unless the issue explicitly permits it" (states the constraint, not the reasoning).
