# 0004 — Alembic for schema migrations; legacy shim intentionally retained

**Status:** Accepted (reconstructed)
**Date:** 2026-07-03 (PR #77 merge date)

## Context

Through 2026-07, all schema changes went through `_run_migrations()` in
`database.py` — a hand-written list of `(table, column, "ALTER TABLE ...")`
tuples run at every startup, wrapped in a bare `except: pass`. Issue #39
identified this as unsafe for tracking and applying future schema changes.

## Decision

Alembic (`==1.13.3`) is now the canonical tool for schema migrations, wired to
`database.py`'s `Base`/`engine` in `alembic/env.py`. Issue #39 explicitly
scoped this as additive: `_run_migrations()` was **not** removed and is not to
be removed until a separate, future issue confirms the Alembic baseline is
stable.

## Consequences

Two migration mechanisms exist side by side today: Alembic (canonical, for all
new schema changes) and the legacy `_run_migrations()` shim (frozen, kept only
for backward compatibility with existing deployments). Anyone touching
`database.py` needs to know both exist and not "clean up" the shim without
reading this ADR — see the open question in [issue #105](https://github.com/msarmento42/life-os/issues/105) about
whether that cleanup is still planned now that Life OS is maintenance-only.

## Alternatives Rejected

No evidence of alternatives considered. Issue #39 frames Alembic as "the
standard SQLAlchemy migration tool," not as one option weighed against others.

## Evidence

- `.github` issue #39 ("S10.02 — Database migrations: set up Alembic for schema versioning"): "Alembic is the standard SQLAlchemy migration tool and will replace this pattern going forward... **Do not remove `_run_migrations()` in this task** — leave it in place; it will be cleaned up in a future issue once the migration baseline is confirmed stable."
- PR #77 ("S10.02: add Alembic for schema versioning (closes #39)"), merge commit `824116b`: "Cherry-picked only the real Alembic commit (`8fd2c3d7`)... `alembic upgrade head` exits 0, `alembic current` shows `f700ee552792 (head)`, `_run_migrations()` in database.py is unchanged."
- `database.py:63-121` — `_run_migrations()`, still present and called from `init_db()` (`database.py:44`) after the Alembic setup.
- `alembic.ini`, `alembic/` — added in the same PR.
