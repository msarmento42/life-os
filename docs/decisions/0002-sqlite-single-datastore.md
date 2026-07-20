# 0002 — SQLite as the single datastore

**Status:** Accepted (reconstructed)
**Date:** 2026-07-19 (reconstructed)

## Context

A single-user, single-machine, local-only app (ADR-0001) needs a storage
engine. Life OS chose SQLite over a client-server database from the start.

## Decision

One SQLite file (`life_os.db`) is the only datastore. No separate database
server, no per-module databases.

## Consequences

Zero operational overhead (no DB server to run or secure). Schema changes must
go through a path that doesn't corrupt the single file without a backup (see
ADR-0004 for how migrations are actually run). Growth beyond single-user scale
would require revisiting this.

## Alternatives Rejected

No evidence of alternatives considered.

## Evidence

- `decision_log.md:19` — "SQLite is intentional — simple, zero-dependency, personal scale."
- `vision.md:18` — "Single SQLite file — no migrations that could corrupt data without a backup."
- `PRODUCT-SPEC.md:22` — "Backend: Python 3.11+ / FastAPI / SQLAlchemy / SQLite."
