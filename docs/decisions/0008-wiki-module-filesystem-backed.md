# 0008 — Wiki module is filesystem-backed, not SQLite-backed

**Status:** Accepted (reconstructed)
**Date:** 2026-07-19 (reconstructed; pattern present since the initial commit)

## Context

Every other Life OS module follows the same shape: a SQLAlchemy model in
`models/`, registered in `database.py::init_db()`, seeded in `seed.py`, and a
router in `routers/`. The Wiki module (`routers/wiki.py`) breaks this pattern:
there is no `models/wiki.py`, it's never registered in `init_db()`, and
`seed.py` has no `seed_wiki()`. `routers/wiki.py` instead reads and writes
Markdown files directly from a hardcoded absolute path,
`WIKI_PATH = Path("/Users/msarmento/Documents/Claude/wiki")`.

## Decision

Wiki content lives as plain Markdown files on disk at a fixed path outside
the SQLite database, not as rows in a `wiki` table. This is confirmed
deliberate, not an oversight: three separate dated QA-review log entries
across different sprints independently checked for and explicitly signed off
on this exact deviation from the standard module pattern.

## Consequences

An agent "fixing" the apparent inconsistency (no `models/wiki.py`, no
`seed_wiki()`) by adding a conventional SQLite-backed Wiki model would be
undoing a deliberate design choice, not fixing a bug. The hardcoded
`WIKI_PATH` ties the app to Marcus's specific machine layout — consistent
with `vision.md`'s "Audience: Marcus only" framing (ADR-0001), but it does
mean this path needs updating by hand if the wiki directory or username ever
changes; there's no config/env var for it today.

## Alternatives Rejected

No evidence of alternatives considered.

## Evidence

- `routers/wiki.py:11-14` — `WIKI_PATH = Path("/Users/msarmento/Documents/Claude/wiki")`, no corresponding model/router-backed-by-DB pattern.
- `models/` directory listing — no `wiki.py` present, unlike all 12 other domain modules.
- `BUILD-LOG.md:671` (2026-05-09 QA Review): "`models/wiki.py` does not exist and is not in `database.py`'s `init_db()` — **correct**: Wiki uses filesystem-backed markdown files, not SQLite. No DB tables needed." / "`seed.py` has no `seed_wiki()` function — **correct**: filesystem wiki doesn't need seeded DB rows."
- `BUILD-LOG.md:935` (2026-05-17 QA Review): "All 12 SQLite-backed models imported in database.py init_db() (wiki is flat-file, has no model — correct)."
- `BUILD-LOG.md:1339` (later QA Review, same wording): re-confirms the same finding a third time.
