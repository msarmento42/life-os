# AGENTS.md

Life OS is Marcus's local-first personal operating system: FastAPI + SQLite
backend, React/Vite frontend, single user, single machine, single port. It
replaced several paid SaaS tools (Todoist, TripIt) and is now in
**maintenance mode** — see [ADR-0006](docs/decisions/0006-life-os-maintenance-mode-pivot.md).
It must not break: data already stored in `life_os.db` (no destructive
migrations without a backup path), the local-only guarantee (no new cloud
calls or telemetry — [ADR-0001](docs/decisions/0001-local-only-no-external-apis.md)),
or the frontend build.

This file is canonical for every agent working in this repo — human-directed
or autonomous, any vendor. Provider files (`CLAUDE.md`, `GEMINI.md`, etc.) are
generated stubs that point back here; if one contains real instructions, that
is a bug — see `scripts/gen-adapters.sh`.

## Commands

```bash
# Backend (from repo root)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py                    # serves API + built frontend on :3000

# Frontend (from frontend/)
npm install
npm run build                     # required before python main.py serves real UI
npm run dev                       # Vite dev server on :5173, API calls to :3000

# Lint (matches CI, .github/workflows/ci.yml)
flake8 routers/ models/ services/ main.py --max-line-length=120 --ignore=E501,W503

# DB schema changes
alembic revision --autogenerate -m "..."
alembic upgrade head               # see ADR-0004 — do not hand-write ALTER TABLE
```

`setup.sh` does all of the above in one shot for a clean machine.

CI (`ci.yml`) only lints Python. There is no automated frontend build/test
gate and no automated backend test run on PRs — `npm run build` and anything
in `tests/` are the author's responsibility to run locally before merging.

## Directory map

- `main.py` — FastAPI entry point, router registration, serves `frontend/dist/`
- `routers/`, `services/`, `models/` — backend, one file per domain module (finance, health, trading, fantasy, ...)
- `frontend/src/modules/` — one folder per domain module, mirrors the backend split
- `alembic/` — schema migrations (canonical, see ADR-0004). `database.py::_run_migrations()` is a legacy additive-column shim kept intentionally alongside it — do not delete without reading ADR-0004 first
- `frontend/dist/`, `.venv/`, `node_modules/`, `life_os.db*` — generated/local, gitignored, never hand-edit
- `docs/decisions/` — ADRs, the record of *why* (see below)
- `docs/reference/`, `docs/runbooks/` — historical spec and operational docs, dated and owned, not instructions
- `BUILD-QUEUE.md` / `BUILD-LOG.md` — build-session backlog and log for the scheduled Cowork build task; queue is closed (maintenance-only), still actively read/written by automation — leave at repo root
- `.agios/` — config and scoped protocol for the AGIOS autonomous builder only (see `.agios/AGENTS.md`); do not touch unless the task is explicitly AGIOS infra work
- `trading-bot/` — open question about its purpose/staleness, see `#TBD` decision issue; do not treat as authoritative trading-bot state (the real trading bot is a separate repo)

## Conventions not enforced by tooling

- New backend module = matching `models/<name>.py`, `routers/<name>.py`, router registered in `main.py`, and a mirrored `frontend/src/modules/<Name>/` folder (see `AUDIT_REPORT` removal note in ADR log — pattern is derivable by reading any existing module, e.g. `crm`).
- Schema changes go through Alembic, never a hand-written `ALTER TABLE` in `database.py` (ADR-0004).
- Changes to `routers/trading.py`, `models/trading.py`, `routers/finance.py`, or `models/finance.py` always need a human read before merge, even inside AGIOS — see [ADR-0005](docs/decisions/0005-trading-finance-require-human-review.md).
- Frontend module folders follow the tab-layout pattern established in `Fantasy/index.jsx` when a module has multiple views.
- Commit style in this repo: short imperative summary, sprint/issue code prefix when applicable (e.g. `S10.02: add Alembic for schema versioning`).

## Definition of done for a PR here

- Backend: `flake8` clean per the command above; `alembic upgrade head` still applies cleanly if migrations changed.
- Frontend: `npm run build` succeeds with no new errors.
- Trading/finance-module changes: called out explicitly in the PR body for human review (ADR-0005).
- No new external API calls, cloud dependency, or telemetry (ADR-0001) — if a change looks like it needs one, stop and open a decision issue instead.
- If the PR came from an AGIOS-managed issue: `Closes #N` in the body, changed files match the issue's `Allowed paths`.

## Why things are the way they are

`docs/decisions/` holds ADRs — the durable record of *why*, reconstructed from
git history, issues, and prior docs where the rationale wasn't otherwise
written down. Read the index before assuming a pattern is accidental. Open
questions where the evidence was too thin to write an ADR are tracked as
GitHub issues using the `decision` template, not asserted here.
