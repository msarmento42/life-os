# .agios/AGENTS.md — AGIOS autonomous builder protocol

Scoped to the AGIOS/Codex heartbeat worker only. Read `/AGENTS.md` first — it
is canonical for every agent in this repo, human-directed or autonomous. This
file is the *delta*: the unattended operating loop the AGIOS builder follows
that does not apply to an interactive session.

## Operating Model

Runs as a heartbeat worker, waking every 1 hour, handling exactly one issue
per wake-up. Ready labels are the trigger, not `@codex` mentions.

At each wake-up:
1. Fetch and read `msarmento42/agios-control/CODEX_BRIEFING.md`.
2. Find the next open `agios:ready-for-codex` issue in this repo with no linked open PR.
3. Read `.agios/CLAUDE.md` and `.agios/scope.json` when present.
4. Verify the issue contract. If malformed, add `agios:needs-scope`, remove `agios:ready-for-codex`, comment, and stop.
5. Claim the issue with `agios:in-progress` and the `[AGIOS CLAIMED]` comment.
6. Implement on a new branch and open a PR with `Closes #<issue-number>`.
7. Run backend and frontend verification when feasible.
8. Let CI and policy-gated auto-merge decide. Do not manually merge ordinary AGIOS implementation PRs.

## Never Do

- Push directly to `main`.
- Implement malformed or ambiguous issues.
- Touch `.github/` unless the issue title starts with `agios infra:` and explicitly permits it.
- Touch `.agios/` unless explicitly permitted.
- Touch `*.env*`.
- Change database files or generated lockfiles unless explicitly permitted.
- Add work outside the issue's `Allowed paths`.

## Life OS maintenance-only rule (2026-07 pivot)

Life OS is maintenance-only. If no `agios:ready-for-codex` or `agios:lifeos-maintenance`
issue exists, stop — do not invent feature work from `docs/reference/PRODUCT-SPEC.md`;
it is frozen. See [ADR-0006](/docs/decisions/0006-life-os-maintenance-mode-pivot.md).

## Enforcement

- Scope check validates PR body and changed files against the linked issue.
- Queue-health flags malformed ready issues and resets stale `agios:in-progress` locks.
- Auto-merge requires green CI, `Closes #N`, `Auto-merge allowed: yes`, and non-HIGH risk.

## Escalation Tier

A **premium escalation queue** exists for issues that exceeded the free builder
output cap.

**Trigger label:** `agios:escalate-codex`

These issues were attempted by the free builder chain (Gemini → GitHub Models →
Cerebras → SambaNova → Cloudflare 70B) but could not be completed because
existing files totalled more than 5,000 characters — beyond the output limit
of free models. Codex has no such constraint.

**Handling escalated issues:**
1. Treat `agios:escalate-codex` as equivalent to `agios:ready-for-codex` for selection and claiming.
2. Read the issue body carefully — it follows the standard AGIOS contract.
3. Implement in full; do not truncate or simplify.
4. Open a PR with `Closes #<issue-number>` as usual.
5. On completion: remove `agios:escalate-codex`, add `agios:done`.
6. On failure or block: remove `agios:escalate-codex`, add `agios:blocked`, comment with reason.

**Priority:** Handle `agios:escalate-codex` issues before `agios:ready-for-codex` in the same repo.

**If unresolved:** Remove `agios:escalate-codex`, add `agios:escalate-claude`.
