# Life OS — AGIOS Project Context

## Purpose
Personal Life OS dashboard for Marcus. Tracks health, habits, finances, fantasy sports, trading performance, and weekly reviews in one unified interface.

## Stack
- Backend: FastAPI, Python 3.11+, SQLite (WAL mode), aiosqlite, SQLAlchemy
- Frontend: React, Vite, React Router, Tailwind CSS
- Entry point: `main.py`
- Routers: `routers/`
- Services: `services/`
- Models: `models/`
- Frontend: `frontend/`

## Key constraints
- SQLite WAL mode is enabled — do not change PRAGMA settings unless the issue explicitly permits it
- The database file `life_os.db` must never be modified by code changes — only by migrations
- All new API routes must be registered in `main.py`
- Frontend routes must be added to `frontend/src/App.jsx` or the router config

## Verification
```bash
flake8 . --max-line-length=120 --exclude=__pycache__,frontend,life_os.db
cd frontend && npm run build
```

## Current status
Active build. Issues created via AGIOS. Check open issues labeled `agios:ready-for-codex` for current backlog.
