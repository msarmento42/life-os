# Running parallel Claude Code / Cowork sessions

**Last reviewed:** 2026-07-19 · **Owner:** Marcus

When running more than one Claude Code / Cowork session against this repo at
the same time, use a worktree per session instead of separate full clones or
switching branches back and forth in one directory — avoids uncommitted
changes in one session getting clobbered by a checkout in another. (This repo
accumulated several ad-hoc `-issue-NN` clone directories over time from doing
this manually before worktrees replaced that pattern.)

```
scripts/new-worktree.sh <branch-name>
```

Creates `../<repo-name>-<branch-name>/` on a new branch, ready to open as its
own session. `git worktree remove ../<repo-name>-<branch-name>` when done.

(Migrated from `roadmap.md`, which also held a now-stale "Now/Next/Later"
status section superseded by `BUILD-QUEUE.md`; that section was removed
rather than migrated — see the cleanup report in the PR that added this file.)
