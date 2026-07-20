**Last reviewed:** 2026-07-19 · **Owner:** Marcus

**Migration note:** the rationale for the Time & Attention, Decision Journal,
and Unified Dashboard modules that were actually built from this synthesis is
now recorded in [ADR-0007](../decisions/0007-time-decisions-dashboard-modules-from-council-blueprint.md).
The other proposals here (Energy & Capacity Model, Goal Cascade, Thesis/Bet
Tracker) were not built as of this review — treat as historical brainstorming,
not a live roadmap.

# Life OS Blueprint — Council Synthesis
*Generated 2026-04-26 · 4-agent council (Analyst, Creative, Critic, Practitioner)*

---

## The Core Diagnosis

All four council members converged on one thing: **the current 10-module system is good at capturing data but has no feedback loops, no cross-module intelligence, and no decision support.** It's a dashboard, not an operating system. The path from "tracking my life" to "understanding and optimizing my life" requires three things that don't exist yet:

1. **Time & energy tracking** — the missing foundation everything else depends on
2. **Decision journaling + outcome tracking** — the feedback loop that makes data compound
3. **Cross-module correlation layer** — connecting the dots between modules

---

## Unanimous Additions (All 4 Agreed)

### 1. Time & Attention Tracking ⏱️ (~8 hours to build)
**Why:** Every module is output of how you spend your time. Without this, you're optimizing blind.

- Daily time blocks by category (deep work, admin, health, social, leisure, recovery)
- Planned vs. actual comparison
- Energy state at start/end of blocks
- No fancy timers — manual daily logging with start/end

**Cross-links:** Habits (are you blocking time for them?), Projects (time vs. estimated effort), Health (sleep overlap), Mood (what schedule makes you feel best?)

**Schema:**
```
time_blocks: id, date, start_time, end_time, category, project_id (nullable),
             energy_start, energy_end, notes, created_at
```

### 2. Decision Journal + Outcome Tracking 📓 (~12 hours)
**Why:** The "fatal gap" (Critic). You track inputs but not whether they worked. Habits show streaks but you don't know if the streak matters. Trading logs positions but not whether your judgment improved.

- Log decisions with: stakes, reasoning, confidence (1-10), predicted outcome
- Tag to associated modules (which trade? which person? which goal?)
- Record actual outcome + what you learned
- Over time: personal decision model — which conditions lead to your best decisions?

**Schema:**
```
decisions: id, date, title, description, stakes (low/medium/high),
           reasoning, confidence, predicted_outcome, actual_outcome,
           outcome_date, lesson, module_type, module_id, created_at
```

### 3. Unified Weekly Dashboard 📊 (~16 hours)
**Why:** 10 modules that don't talk to each other in the UI. A single "State of Life" page makes the system worth more than the sum of its parts.

- Cash flow summary + net worth change
- Health metrics trend (weight, sleep avg)
- Habit completion rate
- Mood/energy/stress averages
- Top projects + progress
- Upcoming trips / travel
- Reading progress
- Relationships needing attention
- Trading P&L

---

## Strong Consensus Additions (3 of 4 Agreed)

### 4. Energy & Capacity Model 🔋 (~6 hours)
**Why:** Mood ≠ energy. You can be happy but depleted. Energy is more precious than time and currently invisible.

- Energy tanks by type: physical, mental, emotional, social (1-10 daily)
- Recovery activities and their effectiveness
- Which activities drain vs. recharge (learned from data over time)
- Burnout early warning: declining sleep + high stress + low mood + skipped workouts = flag it

**Schema:**
```
energy_logs: id, date, physical, mental, emotional, social,
             recovery_activity, recovery_effectiveness, notes, created_at
```

### 5. Goal Cascade: OKRs → Projects → Habits → Time (~20 hours)
**Why:** Right now goals, projects, habits, and time are siloed. The cascade shows: "This OKR requires these projects, which require these habits, which need this time allocation."

- Visual chain from quarterly objectives down to daily actions
- "Am I actually spending time on what I say matters?"
- Time invested per life domain vs. stated priorities

**Schema:**
```
goal_links: id, objective_id, project_id (nullable), habit_id (nullable),
            time_category (nullable), notes
```

### 6. Thesis / Bet Tracker 🎯 (~8 hours)
**Why:** (Creative's strongest unique contribution) Forces worldview recalibration. Track predictions, beliefs, and hypotheses with timelines.

- Log theses: "AI agents will commoditize by 2027" with confidence, evidence required, deadline
- Track hit rate by domain, confidence level
- Auto-correlate against incoming data from other modules
- Conviction scores — which beliefs have the highest empirical support?

**Schema:**
```
theses: id, title, description, domain, confidence (1-10),
        evidence_for, evidence_against, deadline, status (open/confirmed/refuted),
        resolution_notes, created_at, resolved_at
```

---

## High-Value Enhancements to Existing Modules

### Finance 💰
- **Cash flow projection** — next 12 months of recurring inflows/outflows
- **Net worth velocity** — not just snapshots but rate of change (accelerating or decelerating?)
- **Spending pattern anomaly detection** — flag unusual months
- **Goal-to-spending alignment** — are you actually funding savings goals or leaking?
- **FIRE calculator** — at what portfolio size does passive income exceed expenses?

### Health & Body 🏋️
- **Nutrition tracking** — completely absent, even lightweight macro targets
- **Recovery metrics** — HRV, resting HR trend (if wearing a tracker)
- **Medical timeline** — last checkup, dental, vaccination, with reminders
- **Injury/pain log** — status, recovery timeline, trigger movements
- **Supplement effectiveness** — correlate $400/mo supplement spend with actual health metrics

### Habits & Routines ✅
- **Keystone habit analysis** — which habits, when done, make other habits easier?
- **Context requirements** — "this habit works best at home in the morning"
- **Habit-to-goal linkage** — connect each habit to the OKR it serves
- **Willpower cost** — which habits are effortful vs. automatic? Track the friction

### Mood & Energy 😊
- **Correlation engine** — "on days you did X, mood was Y" (automated)
- **Tag combination analysis** — which tag combos predict mood crashes?
- **Trigger & antidote tracking** — early warning signs + what reverses them
- **Mood crash prediction** — 3-day lookahead based on recent patterns

### Projects & Goals 🎯
- **Post-mortems** — every completed/abandoned project gets a "what worked, what didn't"
- **Time-to-completion prediction** — based on historical velocity
- **Dependency mapping** — what blocks what? Critical path
- **Project type analysis** — over time, which kinds of projects do you underdeliver on?

### Trading & Portfolio 📈
- **Strategy comparison** — win rate, avg win/loss, Sharpe, max drawdown per strategy
- **Decision journal integration** — every trade links to a decision entry
- **Behavioral discipline score** — did you follow the system or panic?
- **Backtest-to-live gap** — how does paper performance compare to reality?

### CRM / People 👥
- **Interaction quality scoring** — not just "I talked to them" but "that was a 7/10"
- **Relationship trajectory** — getting closer or drifting? Trend over time
- **Network clustering** — inner/middle/outer circle by data, not intuition
- **Energizer vs. drainer** — cross-link with mood/energy data

### Reading 📚
- **Spaced repetition** — revisit highlights on a schedule
- **Book-to-project linkage** — which insights became actions?
- **Idea graph** — which authors reinforce or contradict each other?
- **Reading ROI** — did this book change a decision or behavior?

### Wiki 📖
- **Idea-to-action pipeline** — tag wiki entries to decisions, projects, theses
- **Auto-linking** — surface related entries across modules

---

## Cross-Module Intelligence Layer

### Tier 1: Direct Correlations (build first)
| Connection | Insight |
|---|---|
| Sleep → Mood/Energy → Trading | Should you trade on bad sleep days? |
| Time allocation → Project progress | Where does time actually go vs. what moves? |
| Habits + Context → Streak patterns | What conditions make habits stick? |
| Finance spending → Stress/Mood | Does spending correlate with anxiety? |
| CRM interactions → Mood/Energy | Which people energize vs. deplete you? |
| Exercise → Next-day energy | Does working out actually help? Prove it. |
| Reading → Projects/Decisions | Did books actually influence your actions? |

### Tier 2: Pattern Detection (build after Tier 1 works)
- **Coincidence detector** — correlation matrix across all timestamped data, highlight ±0.7+
- **Burnout early warning** — composite signal from multiple declining modules
- **Seasonal patterns** — mood, productivity, spending by month (needs 12+ months data)

### Tier 3: Predictive (only with 12+ months of clean data)
- Energy forecast (sleep + stress + exercise → tomorrow's energy)
- Habit success probability (context + mood + energy → completion likelihood)
- Financial runway (spending rate + income → months of runway)
- Project completion estimate (historical velocity → realistic deadline)

---

## Dashboard Views

| Cadence | What It Shows | Review Time |
|---|---|---|
| **Daily** | Energy forecast, mood check-in, habit checklist, today's top priority, trading alerts | 2 min |
| **Weekly** | Mood trend, time allocation vs. plan, habit completion %, project progress, spending summary, relationships needing attention | 10 min |
| **Monthly** | Net worth change, weight/body trend, habit streaks, reading progress, mood averages, spending anomalies | 20 min |
| **Quarterly** | OKR progress + post-mortem, savings goal progress, time vs. priorities alignment, trading strategy review, decision journal analysis | 1 hour |
| **Annual** | Net worth YoY, projects completed, skills acquired, major events, seasonal patterns, FIRE progress | Half day |

---

## Critical Warnings (from The Critic)

### Data Quality Is Everything
- Missing 2 days/week of mood logging = 70% complete = correlation analysis is worthless
- Build a **data quality dashboard** showing logging completeness per module
- If a module is <70% complete, flag it — don't try to analyze it
- During high-stress periods, logging collapses — exactly when you need it most

### Avoid These (Shelfware Factories)
- ❌ **Predictive ML models** — need massive data, unreliable in year 1, you'll stop trusting them
- ❌ **Automatic scoring/ranking** — arbitrary weights, not validated
- ❌ **Notification/alert systems** — 90% ignored after 30 days
- ❌ **Heavy customization** — you'll have 7 half-built dashboards and use 1
- ❌ **Mobile app** — separate project, different tech, massive scope
- ❌ **Social media integration** — poor data quality, privacy risk
- ❌ **Email/Slack bulk ingest** — very high effort, low ROI. Build "Email-to-Task" bookmark instead (2 hours, 80% of value)

### The Hard Questions
1. **What decision do you want to make better?** If you can't answer this for each module, it doesn't belong.
2. **How much will you actually log?** Not optimistically. If you travel 20% of the year, 10+ modules is unrealistic.
3. **When will you review it?** Optimize for weekly review (enough data, not overwhelming).

### Local-First Trade-offs
- No mobile access — mood/sleep logs happen on phone, you'll need to log later
- No auto-import — bank transactions, calendar events are all manual
- No sync — single device, single point of failure
- **Mitigation:** Add encrypted local backup/export (JSON snapshot to external drive)

---

## Recommended Build Order

### Phase 1: Foundation (~28 hours) — Weeks 1-2
| Addition | Effort | Value |
|---|---|---|
| Time tracking module | 8h | Unlocks all time-based correlations |
| Attention/Focus log (lightweight) | 4h | Reveals sustainable vs. unsustainable work |
| Unified weekly dashboard | 16h | The "aha" moment — system > sum of parts |

### Phase 2: Feedback Loops (~42 hours) — Weeks 3-4
| Addition | Effort | Value |
|---|---|---|
| Decision journal + outcomes | 12h | The missing feedback loop |
| Goal cascade (OKR → Project → Habit → Time) | 20h | Connects daily actions to quarterly goals |
| Finance: cash flow projection | 12h | Forward-looking financial visibility |

### Phase 3: Intelligence (~30 hours) — Weeks 5-6
| Addition | Effort | Value |
|---|---|---|
| Energy model | 6h | Burnout prevention, schedule optimization |
| Cross-module correlation views | 16h | Sleep↔mood, exercise↔energy, spending↔stress |
| Thesis/bet tracker | 8h | Worldview calibration |

### Phase 4: Depth (~40 hours) — Weeks 7-8
| Addition | Effort | Value |
|---|---|---|
| CRM: relationship health scoring | 10h | Prevent relationship drift |
| Habits: keystone analysis + context | 8h | Optimize what sticks |
| Health: nutrition + medical timeline | 12h | Complete the health picture |
| Data quality dashboard | 10h | Know when to trust your data |

### Phase 5: Optional / Long-term
- Reading: spaced repetition + book-to-project linkage
- Trading: behavioral discipline score + backtest-to-live gap
- PDF/OCR statement import (only if transaction entry is a bottleneck)
- Seasonal pattern analysis (needs 12+ months of data first)
- Coincidence detector / pattern dashboard

---

## The North Star

> What would it mean if you could actually **prove** what makes you better at the things you care about?

Most people have theories. With this system, you'd have evidence. That's not a dashboard — that's a personal R&D lab. The compounding comes from **feedback loops**, not breadth. Every module should answer a specific question you review on a rhythm. Anything that doesn't is shelfware.

---

*Council members: The Analyst (evidence-based structure), The Creative (reframing + thesis tracker + autobiography engine), The Critic (data quality + shelfware warnings + hard questions), The Practitioner (effort estimates + build sequencing + what to skip)*
