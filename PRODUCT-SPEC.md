# ⚠️ Spec status: FROZEN (2026-07) — Life OS is in maintenance mode
Life OS pivoted from "replace all personal SaaS" to a **source system** within Marcus OS. The durable memory layer is now `msarmento42/vault` (private Markdown). ChatGPT Finance supersedes the Finance module for analysis; Finance/Travel/Tasks/Trading modules are maintenance-only. Reviews, goals, decisions, and people notes live in the vault, not here. The spec below is retained as historical reference for the modules that exist. New work is limited to: bug fixes, the vault exporter, and performance.

---

# Life OS — Product Specification v1.0
*Last updated: 2026-04-26*

---

## Vision

A local-first personal operating system that tracks, connects, and surfaces insights across every domain of life. Not a dashboard — a decision-support system that gets smarter the longer you use it. World-class design, world-class intelligence, world-class reliability.

**North Star:** Prove what actually makes you better at the things you care about — with evidence, not theories.

---

## Architecture

- **Backend:** Python 3.11+ / FastAPI / SQLAlchemy / SQLite
- **Frontend:** React 18 / Vite / Tailwind CSS / Recharts / Lucide icons
- **Runs at:** localhost:3000 (single port — FastAPI serves API + built React)
- **Data:** 100% local. No cloud. No telemetry. No external APIs for user data.
- **Design system:** Dark-first with light mode toggle. Premium feel — Linear/Arc-level polish.

---

## Modules (12 total)

### Tier 1 — Core Life Domains

#### 1. Finance
**Question it answers:** Where does my money go, and am I on track?

Features:
- Accounts (checking, savings, investment, credit, crypto) with balances
- Transactions with 24+ categories, search, filter, CSV export
- Budgets by category with actual vs. planned spend
- Net worth snapshots with trend chart + asset allocation pie
- Net worth velocity — rate of change, acceleration/deceleration
- Savings goals with progress bars and projected completion dates
- Recurring items (income + expenses) with next-occurrence tracking
- Monthly summary (income, spending, savings rate, top categories)
- Cash flow projection — next 12 months based on recurring items
- Spending anomaly detection — flag months that deviate >2 std from rolling average
- Goal-to-spending alignment — are you funding your goals or leaking?
- FIRE calculator — passive income vs. expenses, years to independence
- PDF/OCR statement import (future)

#### 2. Health & Body
**Question it answers:** Is my body trending in the right direction?

Features:
- Body metrics (weight, body fat %, muscle mass, waist) with trend charts
- Workouts with exercises, sets, reps, weight — progression tracking
- Sleep log (hours, quality 1-5, bedtime, wake time) with bar charts
- Supplements with active/inactive toggle and effectiveness tracking
- Blood work results with in/out-of-range detection + historical comparison
- Nutrition tracking — daily macros (protein, carbs, fat, calories), meal logging
- Recovery metrics — HRV, resting HR (manual entry from wearable)
- Medical timeline — checkups, dental, vaccinations, prescriptions with reminders
- Injury/pain log — location, severity, triggers, recovery timeline
- Fitness progression — strength curves, cardiovascular capacity trend
- Dashboard: latest weight, workouts this week, avg sleep, active supplements, recovery status

#### 3. Habits & Routines
**Question it answers:** Am I showing up consistently for what matters?

Features:
- Daily habit tracker with 7-day grid, color-coded completion
- Streak counter with best-ever and current streak
- 30-day completion rate per habit
- Habit-to-goal linkage — connect each habit to the OKR it serves
- Context requirements — "this habit works best at [location] in the [morning/evening]"
- Keystone habit analysis — which habits, when done, correlate with other habits completing
- Willpower cost rating (1-5) — track effort level, identify habits going automatic
- Habit stacking — explicit before/after linking
- Routines (morning, evening, etc.) with ordered items and completion tracking
- Calendar grid endpoint for month-view visualization
- Streaks tab with stats, completion ring, best/worst habits

#### 4. Mood & Energy
**Question it answers:** What actually affects how I feel?

Features:
- Daily log: mood, energy, stress, anxiety, focus (1-10 each)
- Tags (freeform + suggested: outdoor, social, creative, exercise, alcohol, caffeine, etc.)
- Notes field for context
- 30-day line chart (mood/energy/stress overlaid)
- History table with search/filter
- Correlation engine — "on days you [tag], mood was [X] vs. baseline [Y]"
- Tag combination analysis — which combos predict crashes or peaks
- Trigger & antidote tracking — early warning signs + what reverses them
- Upsert by date (one entry per day, update if exists)

#### 5. Projects & Goals (OKR)
**Question it answers:** Am I making progress on what I said matters?

Features:
- Quarterly objectives with key results (target value, current value, % progress)
- Projects with status (active, paused, completed, abandoned), priority, deadline
- Tasks per project with checkbox toggle, priority, due dates
- Project completion tracking with dates
- Post-mortems — every completed/abandoned project gets structured reflection
- Time-to-completion prediction — based on historical velocity
- Dependency mapping — what blocks what
- Project type tagging — over time, reveal which types you consistently underdeliver on
- Goal cascade view — OKR → Projects → Habits → Time blocks (visual chain)
- Overall progress = average of key result completion percentages

#### 6. CRM / People
**Question it answers:** Am I investing in the right relationships?

Features:
- Contacts with name, email, phone, company, birthday, tags, notes
- Interaction log (date, type, notes, quality score 1-10)
- Follow-up reminders with due dates and snooze
- Relationship strength score — auto-calculated from interaction frequency vs. desired cadence
- Relationship trajectory — trending closer, stable, or drifting (based on interaction frequency + quality)
- Network clustering — inner circle / middle circle / outer circle by data
- Energizer vs. drainer — cross-link interaction quality with mood/energy logs
- Dashboard: neglected contacts (>60 days), upcoming birthdays, overdue reminders
- Upcoming birthday alerts (next 30 days)

### Tier 2 — Growth & Intelligence

#### 7. Trading & Portfolio
**Question it answers:** Is my trading making me money, and am I improving?

Features:
- Strategies with descriptions and color coding
- Trade log: entry/exit dates, prices, quantity, P&L, strategy tag
- Positions: current holdings with unrealized P&L and return %
- Portfolio snapshots (total value over time) with line chart
- Strategy comparison — win rate, avg win/loss, Sharpe ratio, max drawdown per strategy
- Decision journal integration — every trade links to a decision entry
- Behavioral discipline score — did you follow the system? (manual per-trade tag)
- Backtest-to-live gap — paper vs. live performance comparison
- Dashboard: total realized P&L, month P&L, win rate, portfolio value, top strategies

#### 8. Reading List
**Question it answers:** Am I learning and applying what I read?

Features:
- Books with title, author, genre, status (want_to_read, reading, completed, abandoned)
- Star rating (1-5), page count, current page, progress bar
- Source (physical, kindle, audiobook, library)
- Notes per book with page numbers
- Quotes per book (blockquote display)
- Status transitions with dates (started, finished)
- Book-to-project linkage — which insights became actions?
- Spaced repetition — schedule highlight revisits (7d, 30d, 90d after finishing)
- Reading ROI tag — "this book changed a decision/behavior" (yes/no + which one)
- Stats: books read this year, pages read, avg rating, genre breakdown

#### 9. Travel
**Question it answers:** Where have I been, where am I going, and what did it cost?

Features:
- Trips with dates, destination, status (planning, active, completed)
- Itinerary items per trip (flights, hotels, activities) with times
- Packing lists with checkbox items
- Trip expenses by category with totals
- Travel documents (passport, visa, insurance) with expiry dates
- Wishlist destinations with priority ranking
- Cost-per-trip analysis with category breakdown
- Trip reflection — "would I go back? what would I change?"
- Travel map (Leaflet) with visited destinations
- CSV export

#### 10. Wiki / Knowledge Base
**Question it answers:** What do I know, and can I find it?

Features:
- Reads directly from filesystem (~/Documents/Claude/wiki/)
- File tree navigation
- Article rendering (Markdown with GFM support)
- Full-text search across all articles
- Backlink detection (which articles reference each other?)
- Recent articles tracking
- Idea-to-action pipeline — tag wiki entries to decisions, projects, theses
- Auto-linking — surface related entries across modules

### Tier 3 — New Modules

#### 11. Time & Attention
**Question it answers:** Where do my hours actually go?

Features:
- Daily time blocks: start time, end time, category, optional project link
- Categories: deep work, meetings, admin, health/exercise, social, leisure, recovery, learning
- Planned vs. actual comparison (plan blocks in advance, log reality)
- Energy state at start/end of each block
- Attention/focus log — lightweight daily: what broke focus? what drained vs. energized?
- Weekly time allocation pie chart (planned vs. actual)
- Time-per-project tracking (links to Projects module)
- Time-per-OKR rollup (via goal cascade)
- Distraction pattern detection — which categories eat more time than planned?

Schema:
```
time_blocks: id, date, start_time, end_time, category, subcategory,
             project_id (FK nullable), energy_start (1-10), energy_end (1-10),
             planned (boolean), notes, created_at

focus_logs: id, date, primary_focus, distractions, energy_drain,
            energy_boost, notes, created_at
```

#### 12. Decision Journal
**Question it answers:** Am I getting better at making decisions?

Features:
- Log decisions with: title, description, stakes (low/medium/high/critical)
- Reasoning field — why did you decide this?
- Confidence score (1-10)
- Predicted outcome
- Module linking — tag to finance, trading, health, CRM, projects entries
- Outcome tracking — actual result + date
- Lesson learned field
- Decision quality score — separate from outcome (good decision can have bad outcome)
- Decision type tags (financial, career, health, relationship, strategic)
- Analytics: hit rate by confidence level, by domain, by stakes level
- "Decisions pending review" queue — decisions past their outcome date without resolution

Schema:
```
decisions: id, date, title, description, stakes, reasoning,
           confidence (1-10), predicted_outcome, decision_quality (1-10 nullable),
           actual_outcome, outcome_date, lesson, decision_type,
           module_type, module_id (nullable), status (open/resolved),
           created_at, resolved_at

decision_tags: id, decision_id, tag
```

---

## Cross-Module Intelligence

### Correlation Engine
A backend service that computes pairwise correlations across modules on timestamped data:

**Tier 1 correlations (ship first):**
- Sleep quality → next-day mood/energy
- Exercise → next-day energy
- Mood/energy → trading P&L
- Time in deep work → project velocity
- CRM interaction quality → mood shift
- Spending spikes → stress levels
- Habit completion → mood baseline

**Implementation:** Nightly computation (or on-demand), store results in `correlations` table. Frontend shows "Insights" panel with strongest correlations and their direction.

### Weekly Synthesis
Automated Sunday evening report that reads all module data for the week:
- What moved (net worth, weight, project progress, habit streaks)
- What shifted (mood trend, energy trend, relationship changes)
- Anomalies (spending spikes, missed habits, mood crashes)
- Connections surfaced ("Your mood was 1.5 points higher on days you exercised")
- Decisions pending review

### Burnout Early Warning
Cross-module composite signal:
- Sleep declining 3+ consecutive days
- Mood below personal baseline 5+ days
- Habits missed >40% this week (vs. normal)
- No recovery time blocks logged
- Stress score rising
→ Flag: "Burnout risk detected. Your data suggests [recovery activity X] works best for you."

### Data Quality Dashboard
Per-module logging completeness:
- Days with entries / total days (rolling 30-day)
- Color-coded: green (>80%), yellow (60-80%), red (<60%)
- Modules below 70% get a warning: "Not enough data for reliable insights"

---

## Design System — World Class

### Principles
- **Dark-first** with seamless light mode
- **Dense but breathable** — show lots of data without feeling cluttered
- **Micro-interactions** — hover states, smooth transitions, skeleton loaders
- **Consistent spacing** — 4px grid system
- **Typography hierarchy** — clear visual weight (headings, body, captions, labels)

### Component Library
- Cards with subtle borders, hover elevation
- Buttons: primary (brand), secondary (outline), ghost, danger
- Inputs with floating labels and validation states
- Modals with backdrop blur, escape-to-close, focus trap
- Tabs with animated underline indicator
- Charts: consistent color palette, tooltips, responsive
- Tables: sortable columns, row hover, pagination
- Sidebar: collapsible, active state indicator, section groupings
- Toast notifications (success, error, warning, info)
- Skeleton loaders for every data-fetching state
- Empty states with illustrations and CTAs
- Command palette (Cmd+K) for global navigation/search
- Keyboard shortcuts throughout

### Color Palette
Module accent colors:
- Finance: emerald
- Health: red
- Habits: amber
- Mood: pink
- Reading: purple
- Projects: blue
- Trading: cyan
- Travel: orange
- People: indigo
- Wiki: gray
- Time: teal
- Decisions: yellow

### Animations
- Page transitions: fade + slight slide
- Card hover: subtle lift (translateY -2px + shadow)
- Chart data: animate on mount
- Modal: scale from 95% + fade
- Sidebar: smooth collapse/expand
- Tab switch: content crossfade
- Number changes: count-up animation
- Streak counters: celebratory pulse on milestone

### Responsive
- Desktop-first (1200px+)
- Tablet (768-1199px): sidebar collapses to icons
- Mobile (< 768px): bottom navigation, stacked cards
- All charts responsive with touch support

---

## Data & Reliability

### Backup System
- One-click full database export (JSON)
- Timestamped backup files
- Import from backup (restore)
- Auto-backup reminder if >7 days since last backup

### Data Integrity
- SQLite WAL mode for concurrent reads
- Foreign key constraints enforced
- Unique constraints on date-based upserts (mood, sleep, etc.)
- Transaction wrapping on multi-table operations
- Migration system for schema changes (Alembic)

### Performance
- API responses < 100ms for single-entity queries
- Dashboard aggregation queries < 500ms
- Frontend: lazy-load modules (code splitting)
- Charts: virtualized rendering for large datasets
- SQLite indexes on all date columns and foreign keys

---

## Module Sidebar Grouping

```
━━ DAILY ━━
  Mood & Energy
  Habits & Routines
  Time & Attention

━━ LIFE ━━
  Finance
  Health & Body
  Projects & Goals
  CRM / People

━━ GROWTH ━━
  Trading & Portfolio
  Reading List
  Decision Journal

━━ REFERENCE ━━
  Wiki
  Travel
```

---

## Success Metrics (For Marcus)

After 90 days of use:
- [ ] Can answer "what actually improves my mood?" with data
- [ ] Can see where time goes vs. stated priorities
- [ ] Weekly review takes <15 minutes and surfaces non-obvious insights
- [ ] Decision journal has 50+ entries with 20+ resolved outcomes
- [ ] Net worth velocity is visible and tracked
- [ ] Habit streaks are connected to goals
- [ ] Trading decisions are linked to sleep/mood context
- [ ] Data quality is >80% on core modules (mood, habits, time, finance)

---

*This spec is the single source of truth for all build sessions.*
