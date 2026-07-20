# 0001 — Local-only: no cloud sync, no external APIs, no telemetry

**Status:** Accepted (reconstructed)
**Date:** 2026-07-19 (reconstructed; original decision predates this repo's GitHub history)

## Context

Life OS stores personal data spanning finance, health, CRM, and trading. The
project's stated purpose is replacing paid SaaS tools while keeping full data
ownership.

## Decision

The app never makes outbound calls for user data and never syncs to a cloud
service. All data lives in one local SQLite file. This is a hard constraint,
not a default that can be relaxed for convenience.

## Consequences

No multi-device access without a manual export step (see the vault exporter,
`services/vault_export.py`). No hosted backup — the SQLite file itself is the
only copy. Any future integration (e.g. a read API) has to be justified against
this constraint explicitly, not added incidentally.

## Alternatives Rejected

No evidence of alternatives considered.

## Evidence

- `vision.md:16-20` — "Guardrails (never auto-change these)": "Local-only — no external APIs, no cloud sync, no telemetry. This is a hard architectural constraint."
- `decision_log.md:17-19` — "Architectural decisions on record": "Local-only is a hard constraint — no cloud sync, no external API calls ever."
- `PRODUCT-SPEC.md:24` — "Data: 100% local. No cloud. No telemetry. No external APIs for user data."
- `vision.md:24-27` — "Out of scope": multi-user support, cloud hosting, mobile app all explicitly excluded for the same reason.
