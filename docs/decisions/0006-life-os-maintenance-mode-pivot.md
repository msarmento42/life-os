# 0006 — Life OS pivots to maintenance mode; vault becomes the durable memory layer

**Status:** Accepted (reconstructed)
**Date:** 2026-07-02 (BUILD-QUEUE.md pivot date)

## Context

Life OS originally aimed to "replace all personal SaaS" as a standalone
12-module app (`docs/reference/PRODUCT-SPEC.md`, v1.0, last updated
2026-04-26; 56/72 build-queue sprints complete by the pivot date). A separate
private repo, `msarmento42/vault`, was introduced as a durable
Markdown-based memory layer as part of a broader "Marcus OS" architecture.

## Decision

Life OS's product spec is frozen. It is repositioned from a standalone
destination app to a **source system** feeding the vault. ChatGPT Finance
supersedes the Finance module for analysis; Finance/Travel/Tasks/Trading
modules go maintenance-only. Reviews, goals, decisions, and people notes move
to the vault instead of living in Life OS. New Life OS work is limited to bug
fixes, the vault exporter, and performance — no new feature modules absent an
explicit un-freeze decision.

## Consequences

The build queue (`BUILD-QUEUE.md`) closed with several sprints (SF Dynasty
Calculator remainder, S10 Intelligence remainder, S11 Dashboards, S12 Polish)
permanently parked, not abandoned — reviving them requires an explicit
decision, not just picking the next unchecked box. The AGIOS autonomous
builder is instructed to treat an empty `agios:lifeos-maintenance` queue as a
stop condition, not license to invent work from the (frozen) product spec.
`services/vault_export.py` and its route (`routers/export.py`) become the one
actively-growing piece of new functionality in an otherwise frozen app.

## Alternatives Rejected

No evidence of alternatives considered within this repo. (The full rationale
and 30-day plan for the broader Marcus OS pivot live outside this repo, in
`MARCUS-OS-MIGRATION-PLAN.md`, which is not part of life-os's own git history
and is out of scope for this ADR's evidence.)

## Evidence

- `docs/reference/PRODUCT-SPEC.md:1-2` — "⚠️ Spec status: FROZEN (2026-07) — Life OS is in maintenance mode. Life OS pivoted from 'replace all personal SaaS' to a **source system** within Marcus OS... New work is limited to: bug fixes, the vault exporter, and performance."
- `BUILD-QUEUE.md:5` — "Last updated: 2026-07-02 (Marcus OS migration pivot follow-up)."
- `BUILD-QUEUE.md:15` — "The queue is now closed... do not build them absent an explicit `agios:lifeos-maintenance` label or a future un-freeze decision."
- `BUILD-QUEUE.md:200` — "Moved here 2026-07-02 during the Marcus OS migration (plan §9.4): Life OS is maintenance-only now."
- `.agios/AGENTS.md` ("Life OS maintenance-only rule (2026-07 pivot)"): "If no `agios:ready-for-codex` or `agios:lifeos-maintenance` issue exists, stop — do not invent feature work from PRODUCT-SPEC.md; it is frozen."
- PRs #68 (TRV2.01) and #70 (VLT.01, `services/vault_export.py` / `routers/export.py`) — the two features that shipped *after* the pivot were travel packing and the vault exporter specifically, consistent with the "vault exporter + bug fixes only" scope.
