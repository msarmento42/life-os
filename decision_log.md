# Decision Log — life-os

*Append-only. Strategist adds a dated entry each cycle.*

---

> **2026-07-19:** the architectural decisions recorded in the 2026-06-02 entry
> below (local-only, SQLite, trading/finance human-review gate) now have
> canonical ADR form in `docs/decisions/0001`, `0002`, and `0005`. This file
> stays in use going forward as the dated append-only strategist log — new
> entries still belong here; durable architecture calls should also get an
> ADR.

## 2026-06-02 — AGIOS onboarding baseline
**Context:** life-os is a local-only project (no GitHub repo). AGIOS state files added for when the repo goes to GitHub, and for local planning context.

**State at onboarding:**
- Stack: FastAPI + React + SQLite, single-port, no external API calls
- Build queue: ~/Desktop/Claude/life-os/BUILD-QUEUE.md
- Product spec: ~/Desktop/Claude/life-os/PRODUCT-SPEC.md
- 55/72 sprints complete as of 2026-06-02
- Scheduled tasks: builds Mon–Sat 6am + 2pm; design polish Tue/Thu 3am; QA Saturday 9am; planning Sunday 10am

**Architectural decisions on record:**
- Local-only is a hard constraint — no cloud sync, no external API calls ever
- SQLite is intentional — simple, zero-dependency, personal scale
- Natural language capture deferred indefinitely (keeping offline for now)
- AGIOS L2 Build not applicable until repo is on GitHub; scheduled Cowork tasks substitute
