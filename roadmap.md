# Roadmap — life-os

*Append-only changelog at top, dated. Strategist updates each cycle.*

---

## 2026-06-02 — Initial AGIOS onboarding
- **Now:** 55/72 sprints complete. S1–S8.5 done. Dynasty Calculator 2/8 (SF.03 next). Scheduled builds running Mon–Sat 6am + 2pm.
- **Next:** SF Dynasty Calculator SF.03 → S9 Trading Depth (2 items) → S10 Intelligence (5 items) → S11 Dashboards (4 items) → S12 Polish & Ship (6 items)
- **Later:** Cancel Monarch once comfortable with S5 Finance depth. Natural language capture (deferred, revisit later).

## Remaining sprints
- 🟡 SF Dynasty Calculator — 6 remaining (SF.03–SF.08)
- ⏳ S9 Trading Depth — 2 items
- ⏳ S10 Intelligence — 5 items
- ⏳ S11 Dashboards — 4 items
- ⏳ S12 Polish & Ship — 6 items

## Themes (stable)
1. **SaaS replacement** — each sprint eliminates a paid subscription or fills a gap left by one
2. **Personal data ownership** — all data local, never sent to a third party
3. **Build cadence** — automated twice-daily builds keep momentum without needing willpower

---

## Parallel work: git worktrees

When running more than one Claude Code / Cowork session against this repo at
the same time, use a worktree per session instead of separate full clones or
switching branches back and forth in one directory — avoids uncommitted
changes in one session getting clobbered by a checkout in another. (This repo
has accumulated several ad-hoc `-issue-NN` clone directories over time from
doing this manually — worktrees replace that pattern.)

```
scripts/new-worktree.sh <branch-name>
```

Creates `../<repo-name>-<branch-name>/` on a new branch, ready to open as its
own session. `git worktree remove ../<repo-name>-<branch-name>` when done.
