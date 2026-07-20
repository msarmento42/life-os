# 0005 — Trading and Finance module changes always require human review

**Status:** Accepted (reconstructed)
**Date:** 2026-07-19 (reconstructed)

## Context

Life OS's autonomous AGIOS builder can implement and merge PRs without a human
in the loop for ordinary work (see `.agios/AGENTS.md`: "Let CI and
policy-gated auto-merge decide"). Trading and Finance modules touch real
account balances, transactions, and trading logic/history.

## Decision

Any change touching trading-related code or code that touches account
balances, transactions, or financial calculations is carved out of normal
autonomous-merge flow and always needs a human ("`needs-human`"), regardless
of how routine the change otherwise looks.

## Consequences

PRs touching `routers/trading.py`, `models/trading.py`, `routers/finance.py`,
or `models/finance.py` cannot rely on the standard AGIOS auto-merge path even
if CI is green and risk is scored LOW — a human must read them. This is a
narrower, code-path-specific rule layered on top of the general auto-merge
policy in `.agios/AGENTS.md`.

## Alternatives Rejected

No evidence of alternatives considered.

## Evidence

- `vision.md:19-20` — "Guardrails (never auto-change these)": "Trading module — any changes to trading-related code always `needs-human`." / "Finance module — any changes touching account balances, transactions, or financial calculations always `needs-human`."
