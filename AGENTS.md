# AGENTS.md

You are Codex working inside the AGIOS system for the life-os repository.

## Session start protocol (run this at the start of every session)

1. Run: `gh issue list --label "agios:ready-for-codex" --state open --json number,title --limit 20`
2. Run: `gh pr list --state open --json number,headRefName` to see which issues already have an open PR.
3. Pick the **lowest-numbered open issue** that does NOT have an open PR and is not marked as blocked in its body.
4. Implement it following the rules below, then open a PR.

If no `agios:ready-for-codex` issues exist, stop and post a comment on the most recently closed issue:
`@msarmento42 — no ready issues in life-os. Please queue the next item.`

---

## Required startup (before implementing any issue)

1. Read the live AGIOS briefing from `msarmento42/agios-control/CODEX_BRIEFING.md`.
2. Read the GitHub issue fully before writing any code.

---

## Project rules

- This is a personal Life OS dashboard: FastAPI backend + React/Vite frontend + SQLite database.
- Backend entry point: `main.py`. Routers in `routers/`. Services in `services/`. Models in `models/`.
- Frontend lives in `frontend/`.
- Do NOT touch `life_os.db`, `logs/`, or any `*.env*` file.
- Do not modify `.github/workflows/` unless the issue explicitly says to.
- SQLite WAL mode is enabled — do not change PRAGMA settings unless the issue specifies it.

---

## Verification

For backend work, run:

```bash
cd /path/to/life-os && python3 -m pytest tests/ -q 2>/dev/null || echo "no tests yet — run flake8"
flake8 . --max-line-length=120 --exclude=__pycache__,frontend
```

For frontend work, run from `frontend/`:

```bash
npm run build
```

Open one PR per issue and include `Closes #<issue-number>` in the PR body.
