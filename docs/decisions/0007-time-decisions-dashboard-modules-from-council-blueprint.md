# 0007 — Time tracking, Decision journal, and Unified dashboard built from council synthesis

**Status:** Accepted (reconstructed)
**Date:** 2026-07-19 (reconstructed; features shipped progressively after 2026-04-26)

## Context

`docs/reference/LIFE-OS-BLUEPRINT.md` records a 4-agent council synthesis
(Analyst, Creative, Critic, Practitioner) that diagnosed the pre-2026-04-26
Life OS as "good at capturing data but has no feedback loops, no
cross-module intelligence, and no decision support," and proposed specific
additions with per-feature rationale and schemas.

## Decision

Three of the council's "Unanimous Additions" were built as real modules:
time/attention tracking (`models/time_tracking.py`, `routers/time_tracking.py`,
`frontend/src/modules/TimeAttention/`), a decision journal
(`models/decisions.py`, `routers/decisions.py`), and a unified dashboard
(`routers/dashboard.py`).

## Consequences

These three modules' data models and cross-links (time↔habits, time↔projects,
decisions↔trading, decisions↔books via `linked_decision_id`) trace back to
this document's specific schemas, not to the original 12-module
`PRODUCT-SPEC.md`. Reading the blueprint's `**Why:**` lines for these three
features explains design choices (e.g. `linked_decision_id` on `books` in
`database.py`'s migration list) that aren't otherwise justified in the code.
Other blueprint proposals (Energy & Capacity Model, Goal Cascade, Thesis/Bet
Tracker) were not built and should not be assumed planned — no evidence found
of their status either way.

## Alternatives Rejected

No evidence of alternatives considered — the blueprint frames these as the
"unanimous" set the 4-agent council converged on, not a set weighed against a
documented runner-up.

## Evidence

- `docs/reference/LIFE-OS-BLUEPRINT.md:18-19` — Time & Attention Tracking, "**Why:** Every module is output of how you spend your time. Without this, you're optimizing blind."
- `docs/reference/LIFE-OS-BLUEPRINT.md:34-35` — Decision Journal, "**Why:** The 'fatal gap' (Critic). You track inputs but not whether they worked."
- `docs/reference/LIFE-OS-BLUEPRINT.md:49-50` — Unified Weekly Dashboard, "**Why:** 10 modules that don't talk to each other in the UI."
- `models/time_tracking.py`, `routers/time_tracking.py`, `frontend/src/modules/TimeAttention/` — exist.
- `models/decisions.py`, `routers/decisions.py` — exist.
- `routers/dashboard.py` — exists.
- `database.py:79-84` — `books.linked_decision_id` / `linked_project_id` migration entries connect books to decisions/projects, matching the blueprint's stated cross-link design.
