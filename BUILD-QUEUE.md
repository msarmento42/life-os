# Life OS — Build Queue
*The ordered backlog for scheduled build sessions. Each session picks the next `[ ]` item, builds it, and marks it `[x]`.*

**Source of truth:** `PRODUCT-SPEC.md`
**Last updated:** 2026-05-24

---

## ⭐ NEXT-UP PRIORITY ORDER (set 2026-05-30 — overrides file order)

> The build agent must build the first item in THIS list that is not yet `[x]`, before falling back to normal file order. Goal: make the Dynasty Fantasy calculator usable, then bring Life OS to a stable, daily-usable state.
>
> 1. **SF.03** — Fantasy: Trade proposal dashboard
> 2. **SF.04** — Fantasy: Trade builder
> ~~3. **SF.05** — Fantasy: Pick inventory + valuation~~ ✅
> 4. **SF.06** — Fantasy: News & alerts panel  ← *Dynasty calculator is usable after this*
> 5. **S9.01 (Dashboard)** — Daily dashboard (Life OS home screen)
> 6. **S10.01** — Backup system (one-click export/restore)
> 7. **S10.03** — Performance: SQLite indexes + WAL mode
> 8. **S10.06** — Final QA pass  ← *Life OS is stable/daily-usable after this*
>
> After all 8 are `[x]`, resume normal top-to-bottom file order (SF.07, SF.08, S9 trading depth, S10 intelligence, remaining dashboards, remaining polish).

---

## How This Works

Scheduled Cowork sessions run automatically and:
1. Read this file to find the next unchecked item
2. Read `PRODUCT-SPEC.md` for full spec context
3. Build the feature (backend model + router + frontend + seed data)
4. Test it (import check, API smoke test)
5. Mark the item `[x]` with date completed
6. Update any related items if scope changed

---

## Sprint 1: Design System & Polish (existing modules)

> Before adding new features, bring existing modules to world-class quality.

- [x] **S1.01** — Design system overhaul: update `index.css` with complete component library (cards, buttons, inputs, modals, tabs, toasts, badges, skeleton loaders, empty states). Implement 4px grid spacing, consistent typography scale, hover/focus states, transitions. *(completed 2026-04-27)*
- [x] **S1.02** — Sidebar redesign: grouped sections (Daily, Life, Growth, Reference), collapsible on tablet, smooth collapse animation, active state with brand accent bar. *(completed 2026-04-30)*
- [x] **S1.03** — Command palette (Cmd+K): global search across all modules — navigate to any page, search contacts, transactions, books, projects by name. *(completed 2026-05-04)*
- [x] **S1.04** — Loading states: add skeleton loaders to every module's data-fetching state. Add empty states with illustrations and CTAs for modules with no data. *(completed 2026-05-24 — all modules done: final 5 components CRM/Dashboard, Wiki, Finance/BudgetTracker, Finance/Goals, Finance/Recurring completed)*
- [x] **S1.05** — Toast notification system: success/error/warning/info toasts for all CRUD operations. Auto-dismiss with progress bar. *(completed 2026-05-04)*
- [x] **S1.06** — Page transitions: add fade + slide animations between module routes. Card hover effects (translateY + shadow). Chart mount animations. *(completed 2026-05-08)*
- [x] **S1.07** — Responsive layout: tablet mode (sidebar → icon rail), mobile mode (bottom nav, stacked cards). All charts touch-friendly. *(completed 2026-05-14)*

## Sprint 2: Tasks Module (Todoist Replacement)

> Standalone task inbox — replaces Todoist. Simple: capture, prioritize, complete. No project required.

- [x] **S2.01** — Tasks backend: model (`tasks` table — title, notes, due_date, priority [1-4], status [inbox/today/done/cancelled], project_id FK nullable, area [work/personal/health/finance/other], created_at, completed_at), router with full CRUD, endpoints: GET /api/tasks/ (filterable by status/area/due), GET /api/tasks/today, POST /api/tasks/, PATCH /api/tasks/{id}, DELETE /api/tasks/{id}. *(completed 2026-05-14)*
- [x] **S2.02** — Tasks frontend: inbox view (all open tasks grouped by priority), today view (due today + manually added), quick-add form (title + optional due date + priority), inline complete checkbox, swipe-to-done on mobile. Accent color: violet (#7c3aed). *(completed 2026-05-14)*
- [x] **S2.03** — Tasks seed data: 25 realistic tasks across areas with varied priorities and due dates, ~10 completed tasks with historical dates. *(completed 2026-05-14 — built alongside S2.01)*
- [x] **S2.04** — Tasks: project linkage — task detail panel shows linked project (if any), tasks appear in project detail view under "Linked Tasks" section. *(completed 2026-05-14 — project_id FK in model, project_title in API response, shown in task detail)*
- [x] **S2.05** — Update Sidebar + App.jsx: add Tasks to navigation under Daily section. *(completed 2026-05-14)*

## Sprint 3: New Modules — Time & Decisions

> The two modules every council member agreed are critical.

- [x] **S3A.01** — Time & Attention: backend model (`time_blocks`, `focus_logs` tables), router with CRUD, daily/weekly aggregation endpoints, time-per-category breakdown, planned vs. actual. *(completed 2026-05-15)*
- [x] **S3A.02** — Time & Attention: frontend — daily timeline view (vertical blocks), weekly pie chart (category breakdown), planned vs. actual comparison, quick-add time block form. *(completed 2026-05-15)*
- [x] **S3A.03** — Time & Attention: seed data — 30 days of realistic time blocks across categories. *(completed 2026-05-15)*
- [x] **S3A.04** — Decision Journal: backend model (`decisions`, `decision_tags` tables), router with CRUD, module linking (polymorphic FK), analytics endpoints (hit rate by confidence, by domain). *(completed 2026-05-16)*
- [x] **S3A.05** — Decision Journal: frontend — decision log with filters (status, stakes, type), decision detail view (reasoning, outcome, lesson), "pending review" queue, analytics charts. *(completed 2026-05-16)*
- [x] **S3A.06** — Decision Journal: seed data — 20 realistic decisions across domains (trading, career, health, finance) with mixed resolved/open status. *(completed 2026-05-16)*
- [x] **S3A.07** — Update Sidebar + App.jsx: add Time & Decisions to navigation, update route structure. *(completed 2026-05-16)*

## Sprint 4: Travel Module (TripIt Replacement)

> Full TripIt replacement. Replaces active subscription — prioritized accordingly.

- [x] **S4T.01** — Travel backend: models (`trips`, `trip_stops`, `trip_expenses`, `travel_docs`, `wishlist_destinations` tables), full CRUD router, endpoints for upcoming trips, expense totals by category, document expiry alerts. *(2026-05-17)*
- [x] **S4T.02** — Travel frontend: trip list with status badges (planning/booked/completed), trip detail view (stops timeline, expense breakdown, documents), quick-add trip form. Accent: orange. *(2026-05-17)*
- [x] **S4T.03** — Travel: wishlist destinations with priority ranking, travel map (Leaflet.js) showing visited countries/cities as pins. *(2026-05-17)*
- [x] **S4T.04** — Travel: trip reflection form on completed trips (rating, highlights, lowlights, would_return), cost comparison chart across trips (cost-per-day). *(2026-05-17)*
- [x] **S4T.05** — Travel: seed data — 5 past trips with full detail, 2 upcoming, 3 wishlist destinations, travel documents with expiry dates. *(2026-05-17)*

## Sprint 5: Finance Depth

> Cash flow projection, net worth velocity, FIRE calculator, spending anomalies.

- [x] **S3.01** — Cash flow projection endpoint: compute next 12 months of inflows/outflows from recurring items. Frontend: stacked area chart showing projected balance over time. *(completed 2026-05-18)*
- [x] **S3.02** — Net worth velocity: compute monthly rate of change from snapshots. Frontend: velocity chart (bar chart of monthly deltas) + acceleration indicator. *(completed 2026-05-20)*
- [x] **S3.03** — Spending anomaly detection: compare each month's category spend to rolling 6-month average. Flag >2 std deviations. Frontend: anomaly badges on monthly summary. *(completed 2026-05-21)*
- [x] **S3.04** — FIRE calculator: inputs (monthly expenses, current portfolio, expected return rate, withdrawal rate). Output: years to FI, projected date, monthly savings needed. Frontend: interactive calculator with projection chart. *(completed 2026-05-21)*
- [x] **S3.05** — Goal-to-spending alignment: for each savings goal, show what % of monthly surplus is being allocated. Frontend: alignment dashboard showing funded vs. underfunded goals. *(completed 2026-05-22)*

## Sprint 6: Health Depth

> Nutrition, recovery, medical timeline, supplement effectiveness.

- [x] **S4.01** — Nutrition tracking: backend model (`nutrition_logs` table — date, meal, calories, protein, carbs, fat, notes), router with CRUD + daily totals + macro targets. *(completed 2026-05-22)*
- [x] **S4.02** — Nutrition frontend: daily log with meal entries, macro progress bars (vs. targets), weekly calorie trend chart. *(completed 2026-05-23)*
- [x] **S4.03** — Medical timeline: backend model (`medical_events` table — date, type, provider, notes, next_due), router with CRUD + upcoming reminders. *(completed 2026-05-23)*
- [x] **S4.04** — Medical timeline frontend: vertical timeline view, upcoming appointments/reminders, overdue flags. *(completed 2026-05-23)*
- [x] **S4.05** — Recovery metrics: add HRV and resting HR fields to body_metrics. Frontend: recovery trend chart alongside sleep quality. *(completed 2026-05-23)*
- [x] **S4.06** — Supplement effectiveness: correlation endpoint — for each active supplement, compute correlation with relevant health metrics (sleep quality, energy, weight trend). Frontend: effectiveness scorecard per supplement. *(completed 2026-05-23)*

## Sprint 7: Habits & Mood Depth

> Keystone analysis, context, goal linkage, correlation engine.

- [x] **S5.01** — Habits: add `goal_id` (FK to objectives), `context` (text), `willpower_cost` (1-5) fields. Update router to return goal linkage. Frontend: show linked goal badge on each habit, context tooltip. *(completed 2026-05-23)*
- [x] **S5.02** — Keystone habit analysis: backend endpoint that computes co-occurrence matrix (when habit X is done, how often are habits Y, Z also done?). Frontend: keystone insights panel. *(completed 2026-05-23)*
- [x] **S5.03** — Mood correlation engine: backend endpoint that computes average mood/energy for each tag vs. baseline. Also correlate with habit completion, sleep quality, exercise. Frontend: "Insights" tab with ranked correlations. *(completed 2026-05-23)*
- [x] **S5.04** — Mood triggers & antidotes: backend — detect multi-day mood decline patterns and what preceded/followed them. Frontend: "Patterns" panel showing triggers (what precedes drops) and antidotes (what precedes recoveries). *(completed 2026-05-23)*

## Sprint 8: Projects, CRM, Reading Depth

> Post-mortems, goal cascade, relationship trajectory, reading ROI.

- [x] **S6.01** — Projects: post-mortem model (`project_postmortems` table — what worked, what didn't, key lesson, would repeat). Auto-prompt when project status → completed/abandoned. *(completed 2026-05-23)*
- [x] **S6.02** — Goal cascade view: new frontend page showing OKR → linked projects → linked habits → time allocation. Visual Sankey or tree diagram. *(completed 2026-05-24)*
- [x] **S6.03** — CRM: add `quality_score` (1-10) to interactions. Relationship trajectory endpoint (compute trend from recent interaction quality + frequency). Frontend: trajectory badge (rising/stable/declining) per contact. *(completed 2026-05-24)*
- [x] **S6.04** — CRM: network clustering — compute inner/middle/outer circle from interaction frequency + quality scores. Frontend: network rings visualization. *(completed 2026-05-24)*
- [x] **S6.05** — Reading: add `changed_behavior` (boolean), `linked_project_id` (FK nullable), `linked_decision_id` (FK nullable). Spaced repetition: compute next review date for completed books. Frontend: "Review Queue" tab, book-to-action linkage display. *(completed 2026-05-24)*

## Sprint 8.5: Quick Wins & Spec Gaps

> Items identified in weekly planning (2026-05-24) as spec features missing from the queue. Ordered by value: command palette utility first, then health completions, then cross-module gaps. Each item is scoped for a single 1-2 hour build session.

- [x] **S1.03b** — Expand command palette (Cmd+K) to include Tasks, Time & Attention, and Decision Journal in `/api/search/global`. Add result types for tasks (by title/area), time blocks (by title/category), and decisions (by title/type). *Flagged twice in QA reviews (2026-05-17, 2026-05-23) as high-utility, low-effort fix.* ✅ 2026-05-25

- [x] **H2.01** — Health: Injury/pain log — backend model (`injury_logs` table: date, location, severity 1-10, type, triggers, treatment, recovery_date), router with CRUD + active injuries endpoint. Frontend: new "Injuries" tab in Health module — active injury cards with severity badge, pain timeline chart, recovery tracking with estimated vs. actual recovery date. ✅ 2026-05-25

- [x] **H2.02** — Health: Fitness progression — backend endpoint computing strength trend per exercise (best weight/reps over time) and cardio trend (distance/pace/duration over time). Frontend: "Progression" tab in Health — exercise selector with line chart of best-set weight over weeks, PR markers, and cardio trend sparklines. *(completed 2026-05-25)*

- [x] **P2.01** — Projects: Dependency mapping — add `blocks_project_id` (FK nullable, self-referential) to projects. Backend: endpoint returning dependency graph (adjacency list). Frontend: dependency indicator on project cards ("blocked by X"), dependency editor in project detail, blocked/blocking badges. *(completed 2026-05-27)*

- [x] **P2.02** — Projects: Time-to-completion prediction — backend endpoint computing average cycle time from historical projects (created_at → completed_at by category/priority). Frontend: "Forecast" badge on active project cards showing predicted completion date based on velocity; weekly project digest showing on-track vs. at-risk projects. *(completed 2026-05-27)*

- [x] **P2.03** — Projects: Project type tagging — add `project_type` field (product/content/learning/health/financial/relationship/operational/other) to projects. Backend: analytics endpoint — avg completion rate + avg time-to-complete by type. Frontend: type badge on project cards; "Type Insights" panel in projects analytics showing which types you consistently ship vs. abandon. *(completed 2026-05-28)*

- [x] **TM1.01** — Time & Attention: Distraction pattern detection — backend endpoint analyzing focus_logs over rolling 30 days: computes top recurring distractions (by frequency), worst distraction days (by category), and categories that consistently run over planned time. Frontend: new "Patterns" tab in Time & Attention — top-5 distractions bar chart, over-budget categories, best-focus days of week. *(completed 2026-05-28)*

- [x] **C2.01** — CRM: Energizer vs. drainer analysis — backend endpoint cross-linking CRM interaction logs (quality_score) with Mood logs (energy, mood delta) for the same day ± 1. Computes per-contact: avg mood delta after interaction, avg energy change. Frontend: "Energy Impact" badge per contact (energizing/neutral/draining), sortable column in contact list, "High-energy contacts" insight card on CRM dashboard. *(completed 2026-05-29 — backend /api/crm/energy-analysis; energy badges + energy filter dropdown on contacts list; High-energy contacts insight card on CRM dashboard)*

- [x] **W1.01** — Wiki: Backlink detection — backend scan of all wiki markdown files to extract `[[Article Name]]`-style links and bare filename references. Endpoint: `GET /api/wiki/backlinks/{slug}` returns list of articles that reference the current one. Frontend: "Referenced by" section at the bottom of each article view. *(completed 2026-05-29 — /api/wiki/backlinks + /api/wiki/backlink-counts endpoints; "Referenced by" section in ArticleView already live)*

- [x] **T2.01** — Trading: Backtest-to-live gap analysis — add `is_paper` (boolean) field to trades. Backend: analytics endpoint computing paper vs. live performance per strategy (win rate, avg P&L, drawdown). Frontend: new "Paper vs. Live" comparison card in Trading dashboard; strategy comparison table shows paper/live split when applicable. *(completed 2026-05-29 — ALTER TABLE trades ADD COLUMN is_paper migration; /api/trading/gap-analysis endpoint; "Backtest vs Live" tab in Trading module with strategy comparison table)*

- [x] **HAB1.01** — Habits: Habit stacking — add `stacked_after_habit_id` (FK nullable, self-referential) to habits. Backend: endpoint returning ordered habit chain for a given anchor habit. Frontend: stacking indicator in habit detail ("follows: [Habit Name]"), optional "Run Stack" shortcut that marks all habits in a chain complete together. *(completed 2026-05-29 — stack_before_id/stack_after_id columns migrated; /api/habits/{id}/stack + /api/habits/stacks endpoints; HabitStackLinker + chain visualization in Stacks tab; PATCH /habits/{id} accepts stack_after_id)*

## Sprint F: Dynasty Fantasy Football Calculator

> Full FantasyPros + KTC + FantasyCalc replacement, personalized to your 3 Sleeper leagues.
> Backend (S1) is already complete — models, services, router, and initial data sync are live.
> Build sessions pick up from S2 (trade evaluator UI) and work through S8 (market calibration).

**League context:** Odin Invitational (12-team SF), Four Horsemen Vol. 8 (4-team 4QB), Four Horsemen All-Stars (4-team 4QB).
**Scope doc:** `~/Desktop/Claude/dynasty_calculator_scope.md`
**Backend already built:** `models/fantasy.py`, `services/`, `routers/fantasy.py` — 15 API endpoints live.
**Data already syncing:** Sleeper rosters, FantasyCalc values, ESPN news — all in `life_os.db`.

- [x] **SF.01** — Fantasy backend (S1): models, Sleeper sync, value engine (league-adjusted), trade evaluator, proposal generator, ESPN news ingestion, 15 API endpoints. *(completed 2026-05-29)*

- [x] **SF.02** — Fantasy frontend: Roster view — Life OS module page showing all 3 leagues. Per league: my starters sorted by adjusted value, position strength bars (vs. league avg), career stage badges (rising/prime/declining), injury/depth chart alerts inline. Route: `/fantasy`. Accent: green (#16a34a). *(completed 2026-05-30)*

- [x] **SF.03** — Fantasy frontend: Trade proposal dashboard — per-league list of auto-generated proposals. Each card shows: offer players, target players, value delta, age delta, "why they'd accept" reasoning. Click to open trade builder. *(completed 2026-06-01)*

- [x] **SF.04** — Fantasy frontend: Trade builder — interactive tool. Search and add players + picks from any team in any league. Side-by-side value panel updates live. Verdict chip (WIN/FAIR/LOSS). Post-trade roster projection showing new starters after trade executes. *(completed 2026-06-02)*

- [x] **SF.05** — Fantasy frontend: Pick inventory + valuation — per-league view of all tradeable future picks (2027, 2028). Shows estimated value, original owner, whether it's your own pick or acquired. Picks can be added to trade builder. *(completed 2026-06-02)*

- [ ] **SF.06** — Fantasy frontend: News & alerts panel [issued #17] — filtered ESPN news for your roster players across all 3 leagues. Severity badges (urgent/notable/fyi). Value movers widget (30-day rises and falls). Trending adds from Sleeper. Add Fantasy to sidebar under a new "Fantasy" section.

- [ ] **SF.07** — Fantasy: Pick valuation model refinement [issued #18] + pick-inclusive trade proposals — auto-add picks to proposal engine when player-only deal is unbalanced. Show "add your 2027 R2 to make this fair" or "ask for their 2028 R1 to balance this."

- [ ] **SF.08** — Fantasy: Historical trade ingestion [issued #24] — pull all `trade` transactions from Sleeper for all 3 leagues. Store in SQLite. Build observed value dataset (player A traded for player B). Compute league-specific calibration factor vs. FantasyCalc. Surface divergences: "this league pays 20% more for QBs than FantasyCalc suggests."

## Sprint 9: Trading Depth

> Strategy analytics, discipline scoring, trip reflections.

- [x] **S9.01** — Trading: strategy comparison dashboard — win rate, avg win/loss ratio, Sharpe ratio, max drawdown, profit factor per strategy. Frontend: strategy comparison table + radar chart. *(already implemented — StrategyComparison.jsx + /api/trading/strategies/comparison live; completed 2026-06-18)*
- [ ] **S9.02** — Trading: add `followed_system` (boolean), `decision_id` (FK nullable) to trades. Behavioral discipline score (% of trades where system was followed). Frontend: discipline tracker. [issued #25]

## Sprint 10: Cross-Module Intelligence

> Correlation engine, weekly synthesis, burnout warning, data quality.

- [ ] **S8.01** — Correlation engine backend: `correlations` table (entity_a, entity_b, coefficient, sample_size, computed_at). Compute pairwise correlations across all date-indexed modules. Endpoint: GET /api/insights/correlations. [issued #26]
- [ ] **S8.02** — Correlation engine frontend: "Insights" page with ranked correlation cards (e.g., "Sleep quality → next-day mood: +0.72"), filterable by module pair. [issued #27]
- [ ] **S8.03** — Weekly synthesis endpoint: aggregate all module data for the past 7 days into a structured report (movements, anomalies, connections, pending decisions). Frontend: "Weekly Review" page. [issued #4]
- [ ] **S8.04** — Burnout early warning: composite signal from sleep + mood + habits + stress + recovery. Endpoint returns risk level + recommended interventions. Frontend: warning banner on dashboard when risk is elevated. [issued #28]
- [ ] **S8.05** — Data quality dashboard: per-module logging completeness (rolling 30-day). Frontend: health bars per module, warnings on modules below 70%.

## Sprint 11: Unified Dashboards

> Daily, weekly, monthly, quarterly views.
> ⚠️ **Note:** Items below use S9.xx codes due to a numbering collision with Sprint 9 (Trading). These are dashboard items, not trading items. Build sessions: read this sprint header to disambiguate.

- [ ] **S9.01** *(Dashboard)* — Daily dashboard: today's mood/energy check-in, habit checklist, time blocks (planned), top priority project, trading alerts if positions exist, data quality pulse. [issued #19]
- [ ] **S9.02** *(Dashboard)* — Weekly dashboard: mood trend line, time allocation pie (actual vs. plan), habit completion %, project progress bars, spending summary, relationships needing attention.
- [ ] **S9.03** *(Dashboard)* — Monthly dashboard: net worth change + velocity, weight/body trend, habit streaks (best/worst), reading progress, mood averages, spending anomalies.
- [ ] **S9.04** *(Dashboard)* — Quarterly dashboard: OKR progress with post-mortem prompts, savings goal progress, time vs. priorities alignment, trading strategy review, decision journal hit rate analysis.

## Sprint 12: Backup, Performance, Final Polish

> Ship-quality reliability and fit-and-finish.

- [ ] **S10.01** — Backup system: one-click JSON export of entire database, timestamped file, import/restore endpoint. Frontend: Settings page with backup/restore buttons + last backup date. [issued #20]
- [ ] **S10.02** — Database migrations: set up Alembic for schema versioning. Create initial migration from current state.
- [ ] **S10.03** — Performance: add SQLite indexes on all date columns + foreign keys. Enable WAL mode. Measure and optimize slow queries. [issued #21]
- [ ] **S10.04** — Code splitting: lazy-load each module in React (React.lazy + Suspense). Verify bundle sizes. [issued #22]
- [ ] **S10.05** — Keyboard shortcuts: document all shortcuts, add help overlay (Cmd+?), ensure all major actions have keyboard shortcuts.
- [ ] **S10.06** — Final QA: smoke test every module's CRUD, verify all charts render, test dark/light mode toggle, test responsive breakpoints, fix any visual inconsistencies. [issued #23]

---

## Parking Lot (Future / On Demand)

- [ ] Thesis/Bet tracker module
- [ ] Energy capacity model (separate from mood)
- [ ] PDF/OCR statement import
- [ ] Seasonal pattern analysis (needs 12+ months data)
- [ ] Coincidence detector / advanced pattern dashboard
- [ ] Mobile PWA wrapper
- [ ] Multi-device sync (encrypted)
- [ ] Plugin system for community modules

---

## Progress Tracker

| Sprint | Items | Done | Status |
|--------|-------|------|--------|
| S1: Design System | 7 | 7 | ✅ Complete |
| S2: Tasks (Todoist replacement) | 5 | 5 | ✅ Complete |
| S3: Time & Decisions | 7 | 7 | ✅ Complete |
| S4: Travel (TripIt replacement) | 5 | 5 | ✅ Complete |
| S5: Finance Depth | 5 | 5 | ✅ Complete |
| S6: Health Depth | 6 | 6 | ✅ Complete |
| S7: Habits & Mood | 4 | 4 | ✅ Complete |
| S8: Projects/CRM/Reading | 5 | 5 | ✅ Complete |
| S8.5: Spec Gaps & Quick Wins | 11 | 11 | ✅ Complete |
| SF: Dynasty Fantasy Calculator | 8 | 5 | 🟡 In progress (SF.06 next) |
| S9: Trading Depth | 2 | 0 | Not started |
| S10: Intelligence | 5 | 0 | Not started |
| S11: Dashboards | 4 | 0 | Not started |
| S12: Polish & Ship | 6 | 0 | Not started |
| **Total** | **72** | **56** | — |

*Last updated: 2026-06-02 — SF.05 complete (Pick Inventory). 14 items remaining.*

