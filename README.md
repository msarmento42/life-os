Sensitivity: public-safe

# Life OS

Local-first personal operating system (FastAPI + React/Vite + SQLite) for
Marcus. Single user, single machine, no cloud sync, no external APIs for user
data — see [ADR-0001](docs/decisions/0001-local-only-no-external-apis.md).

**Status:** maintenance mode since 2026-07 — see
[ADR-0006](docs/decisions/0006-life-os-maintenance-mode-pivot.md) and
`BUILD-QUEUE.md`.

## Quick start

```bash
./setup.sh
```

Installs Python + Node dependencies, builds the frontend, and starts the app
at http://localhost:3000. See `/AGENTS.md` for the full command reference,
directory map, and conventions — that file is canonical for any agent (human
or AI) working in this repo.

## Where things live

- `/AGENTS.md` — canonical instructions for agents working in this repo
- `docs/decisions/` — architecture decision records (the record of *why*)
- `docs/reference/` — frozen/historical specs, kept for context
- `docs/runbooks/` — operational how-tos (e.g. running parallel sessions)
- `BUILD-QUEUE.md` / `BUILD-LOG.md` — scheduled build-session backlog and log
