# 0003 — SQLite WAL mode with tuned pragmas

**Status:** Accepted (reconstructed, rationale inferred)
**Date:** 2026-06-05 (commit date)

## Context

`database.py` sets `PRAGMA journal_mode=WAL`, `PRAGMA synchronous=NORMAL`, and
`PRAGMA cache_size=-64000` (64MB) on every new SQLite connection. This was
**not** present in the initial commit — the app ran in SQLite's default
rollback-journal mode until commit `0ca4806` ("Enable SQLite WAL mode and
performance indexes", 2026-06-05), bundled into the same commit as S10.03's
index/db-health work.

## Decision

Run SQLite in WAL (write-ahead log) mode with `synchronous=NORMAL` and a 64MB
page cache, applied globally via a SQLAlchemy `connect` event listener.

## Consequences

INFERRED: WAL mode allows concurrent readers alongside a writer, which matters
here because the FastAPI backend, ad-hoc scripts (`seed.py`, `scripts/`), and
a human occasionally opening the `.db` file directly can all touch it around
the same time. INFERRED: `synchronous=NORMAL` trades a small durability window
(possible loss of the last transaction on an OS crash, not on an app crash)
for meaningfully faster writes, which is a reasonable trade for a personal
local app rather than a system of record.

`routers/db_health.py`'s `GET /api/db-health` endpoint reports `wal_mode` as
one of its health fields, and a QA log entry from *before* this commit
(`BUILD-LOG.md:952`, 2026-05-17) explicitly recommended adding
`PRAGMA journal_mode=WAL` to stop stray `life_os.db-journal` files from being
left behind — that QA note is the closest thing to a stated motivation found
anywhere, though it predates and isn't directly cited by the commit that
implemented it.

Both `.agios/CLAUDE.md` and `.agios/AGENTS.md` independently call out "do not
change PRAGMA settings unless explicitly permitted," confirming this is being
*treated* as deliberate and load-bearing even though issue #21's own written
scope (indexes + a health endpoint) didn't explicitly ask for WAL.

## Alternatives Rejected

No evidence of alternatives considered.

## Evidence

- `database.py:11-17` — the `set_sqlite_pragma` event listener.
- `git log --oneline -- database.py`: WAL pragmas added in commit `0ca4806` ("Enable SQLite WAL mode and performance indexes"), not the initial commit `4a92a59` (verified via `git show 4a92a59:database.py`, which has no pragma block).
- GitHub issue #21 ("S10.03 — Performance: add missing SQLite indexes... + db-health endpoint") — scopes indexes and `GET /api/db-health` reporting `wal_mode`, but does not explicitly instruct adding the WAL pragma itself.
- `BUILD-LOG.md:952` (2026-05-17 QA Review): "The `life_os.db-journal` file on disk could cause confusion — add a `PRAGMA journal_mode=WAL` at DB init time (S10.03 item) to prevent journal files from being left behind."
- `routers/db_health.py` — exposes `wal_mode` in its health check response.
- `.agios/CLAUDE.md:14` — states the constraint, not the reasoning.
