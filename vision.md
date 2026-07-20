# Vision — life-os

*Strategist reads this when this repo goes to GitHub. Until then, used for local planning.*

> **2026-07-19:** the guardrails below now have canonical ADR form:
> local-only ([ADR-0001](docs/decisions/0001-local-only-no-external-apis.md)),
> single SQLite file ([ADR-0002](docs/decisions/0002-sqlite-single-datastore.md)),
> trading/finance human-review gate
> ([ADR-0005](docs/decisions/0005-trading-finance-require-human-review.md)).
> This file remains the source for north-star metric / audience / out-of-scope
> context that isn't itself an ADR-worthy architectural decision.

## What this project is

A personal operating system replacing paid SaaS subscriptions (Todoist, TripIt, Monarch).
Single local FastAPI + React + SQLite app (single-port, no external API calls).
Audience: Marcus only — personal productivity, health tracking, finance, travel, fantasy sports, and trading depth.

## North-star metric

**Subscriptions cancelled** (Todoist → after S2 ✅, TripIt → after S4 ✅, Monarch → when comfortable with S5 depth).
Secondary: sprint completion rate (currently 55/72).

## Guardrails (never auto-change these)
- **Local-only** — no external APIs, no cloud sync, no telemetry. This is a hard architectural constraint.
- **Single SQLite file** — no migrations that could corrupt data without a backup.
- **Trading module** — any changes to trading-related code always `needs-human`.
- **Finance module** — any changes touching account balances, transactions, or financial calculations always `needs-human`.
- Design system established in S1 — agents must not diverge from it.

## Out of scope
- Multi-user support.
- Cloud hosting or external access.
- Mobile app (web UI only).
- Natural language capture / AI pattern insights (deferred indefinitely — keeping offline).
