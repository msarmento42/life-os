# Life OS Audit Report

Generated for AGIOS issue #9. This is a report-only audit; no production code changes are included.

Registered routers from `main.py`:

| Router module | Prefix |
|---|---|
| `routers/finance.py` | `/api/finance` |
| `routers/travel.py` | `/api/travel` |
| `routers/crm.py` | `/api/crm` |
| `routers/wiki.py` | `/api/wiki` |
| `routers/health.py` | `/api/health` |
| `routers/habits.py` | `/api/habits` |
| `routers/reading.py` | `/api/reading` |
| `routers/projects.py` | `/api/projects` |
| `routers/mood.py` | `/api/mood` |
| `routers/trading.py` | `/api/trading` |
| `routers/search.py` | `/api/search` |
| `routers/tasks.py` | `/api/tasks` |
| `routers/time_tracking.py` | `/api/time` |
| `routers/decisions.py` | `/api/decisions` |
| `routers/fantasy.py` | `/api/fantasy` |
| `routers/insights.py` | `/api/insights` |

## Endpoints

| Route | Method | Handler file |
|---|---|---|
| `/api/crm/contacts` | GET | `routers/crm.py::get_contacts` |
| `/api/crm/contacts` | POST | `routers/crm.py::create_contact` |
| `/api/crm/contacts/export` | GET | `routers/crm.py::export_contacts` |
| `/api/crm/contacts/{contact_id}` | DELETE | `routers/crm.py::delete_contact` |
| `/api/crm/contacts/{contact_id}` | GET | `routers/crm.py::get_contact` |
| `/api/crm/contacts/{contact_id}` | PUT | `routers/crm.py::update_contact` |
| `/api/crm/contacts/{contact_id}/tags/{tag_id}` | DELETE | `routers/crm.py::remove_tag_from_contact` |
| `/api/crm/contacts/{contact_id}/tags/{tag_id}` | POST | `routers/crm.py::add_tag_to_contact` |
| `/api/crm/dashboard` | GET | `routers/crm.py::get_crm_dashboard` |
| `/api/crm/energy-analysis` | GET | `routers/crm.py::get_energy_analysis` |
| `/api/crm/interactions` | POST | `routers/crm.py::create_interaction` |
| `/api/crm/interactions/{interaction_id}` | DELETE | `routers/crm.py::delete_interaction` |
| `/api/crm/network` | GET | `routers/crm.py::get_network_clusters` |
| `/api/crm/reminders` | GET | `routers/crm.py::get_reminders` |
| `/api/crm/reminders` | POST | `routers/crm.py::create_reminder` |
| `/api/crm/reminders/{reminder_id}` | DELETE | `routers/crm.py::delete_reminder` |
| `/api/crm/reminders/{reminder_id}/complete` | PUT | `routers/crm.py::complete_reminder` |
| `/api/crm/tags` | GET | `routers/crm.py::get_tags` |
| `/api/crm/tags` | POST | `routers/crm.py::create_tag` |
| `/api/crm/trajectory` | GET | `routers/crm.py::get_relationship_trajectory` |
| `/api/decisions/` | GET | `routers/decisions.py::list_decisions` |
| `/api/decisions/` | POST | `routers/decisions.py::create_decision` |
| `/api/decisions/analytics` | GET | `routers/decisions.py::analytics` |
| `/api/decisions/pending-review` | GET | `routers/decisions.py::pending_review` |
| `/api/decisions/{decision_id}` | DELETE | `routers/decisions.py::delete_decision` |
| `/api/decisions/{decision_id}` | GET | `routers/decisions.py::get_decision` |
| `/api/decisions/{decision_id}` | PATCH | `routers/decisions.py::update_decision` |
| `/api/fantasy/dashboard` | GET | `routers/fantasy.py::get_dashboard` |
| `/api/fantasy/league/{league_id}/all-picks` | GET | `routers/fantasy.py::get_all_picks` |
| `/api/fantasy/league/{league_id}/picks` | GET | `routers/fantasy.py::get_my_picks` |
| `/api/fantasy/league/{league_id}/proposals` | GET | `routers/fantasy.py::get_proposals` |
| `/api/fantasy/league/{league_id}/roster` | GET | `routers/fantasy.py::get_my_roster` |
| `/api/fantasy/league/{league_id}/rosters` | GET | `routers/fantasy.py::get_all_rosters` |
| `/api/fantasy/leagues` | GET | `routers/fantasy.py::get_leagues` |
| `/api/fantasy/news` | GET | `routers/fantasy.py::get_news` |
| `/api/fantasy/news/alerts` | GET | `routers/fantasy.py::get_alerts` |
| `/api/fantasy/players/movers` | GET | `routers/fantasy.py::get_value_movers` |
| `/api/fantasy/players/search` | GET | `routers/fantasy.py::search_players` |
| `/api/fantasy/players/trending` | GET | `routers/fantasy.py::get_trending_players` |
| `/api/fantasy/sync` | POST | `routers/fantasy.py::trigger_sync` |
| `/api/fantasy/sync/news` | POST | `routers/fantasy.py::sync_news_only` |
| `/api/fantasy/sync/values` | POST | `routers/fantasy.py::sync_values_only` |
| `/api/fantasy/trade/evaluate` | POST | `routers/fantasy.py::evaluate_trade_endpoint` |
| `/api/finance/accounts` | GET | `routers/finance.py::get_accounts` |
| `/api/finance/accounts` | POST | `routers/finance.py::create_account` |
| `/api/finance/accounts/{account_id}` | DELETE | `routers/finance.py::delete_account` |
| `/api/finance/accounts/{account_id}` | PUT | `routers/finance.py::update_account` |
| `/api/finance/budgets` | GET | `routers/finance.py::get_budgets` |
| `/api/finance/budgets` | POST | `routers/finance.py::create_budget` |
| `/api/finance/budgets/{budget_id}` | DELETE | `routers/finance.py::delete_budget` |
| `/api/finance/cashflow-projection` | GET | `routers/finance.py::get_cashflow_projection` |
| `/api/finance/categories` | GET | `routers/finance.py::get_categories` |
| `/api/finance/categories` | POST | `routers/finance.py::create_category` |
| `/api/finance/categories/{cat_id}` | DELETE | `routers/finance.py::delete_category` |
| `/api/finance/fire-calculator` | POST | `routers/finance.py::fire_calculator` |
| `/api/finance/goal-alignment` | GET | `routers/finance.py::get_goal_alignment` |
| `/api/finance/goals` | GET | `routers/finance.py::get_goals` |
| `/api/finance/goals` | POST | `routers/finance.py::create_goal` |
| `/api/finance/goals/{goal_id}` | DELETE | `routers/finance.py::delete_goal` |
| `/api/finance/goals/{goal_id}` | PUT | `routers/finance.py::update_goal` |
| `/api/finance/net-worth` | GET | `routers/finance.py::get_net_worth` |
| `/api/finance/net-worth-velocity` | GET | `routers/finance.py::get_net_worth_velocity` |
| `/api/finance/recurring` | GET | `routers/finance.py::get_recurring` |
| `/api/finance/recurring` | POST | `routers/finance.py::create_recurring` |
| `/api/finance/recurring/{item_id}` | DELETE | `routers/finance.py::delete_recurring` |
| `/api/finance/spending-anomalies` | GET | `routers/finance.py::get_spending_anomalies` |
| `/api/finance/summary` | GET | `routers/finance.py::get_monthly_summary` |
| `/api/finance/transactions` | GET | `routers/finance.py::get_transactions` |
| `/api/finance/transactions` | POST | `routers/finance.py::create_transaction` |
| `/api/finance/transactions/export` | GET | `routers/finance.py::export_transactions` |
| `/api/finance/transactions/{txn_id}` | DELETE | `routers/finance.py::delete_transaction` |
| `/api/habits/` | GET | `routers/habits.py::get_habits` |
| `/api/habits/` | POST | `routers/habits.py::create_habit` |
| `/api/habits/calendar` | GET | `routers/habits.py::get_habit_calendar` |
| `/api/habits/keystone` | GET | `routers/habits.py::get_keystone_analysis` |
| `/api/habits/log` | POST | `routers/habits.py::log_habit` |
| `/api/habits/log/{log_id}` | DELETE | `routers/habits.py::delete_log` |
| `/api/habits/routines` | GET | `routers/habits.py::get_routines` |
| `/api/habits/routines` | POST | `routers/habits.py::create_routine` |
| `/api/habits/routines/items` | POST | `routers/habits.py::add_routine_item` |
| `/api/habits/routines/items/{item_id}` | DELETE | `routers/habits.py::delete_routine_item` |
| `/api/habits/routines/{routine_id}` | DELETE | `routers/habits.py::delete_routine` |
| `/api/habits/stacks` | GET | `routers/habits.py::get_habit_stacks` |
| `/api/habits/{habit_id}` | DELETE | `routers/habits.py::delete_habit` |
| `/api/habits/{habit_id}` | PATCH | `routers/habits.py::update_habit` |
| `/api/habits/{habit_id}/stack` | GET | `routers/habits.py::get_habit_stack` |
| `/api/health/blood-work` | GET | `routers/health.py::get_blood_work` |
| `/api/health/blood-work` | POST | `routers/health.py::create_blood_work` |
| `/api/health/blood-work/{result_id}` | DELETE | `routers/health.py::delete_blood_work` |
| `/api/health/body-metrics` | GET | `routers/health.py::get_body_metrics` |
| `/api/health/body-metrics` | POST | `routers/health.py::create_body_metric` |
| `/api/health/body-metrics/{metric_id}` | DELETE | `routers/health.py::delete_body_metric` |
| `/api/health/dashboard` | GET | `routers/health.py::health_dashboard` |
| `/api/health/exercises/{exercise_id}` | DELETE | `routers/health.py::delete_exercise` |
| `/api/health/fitness/exercises` | GET | `routers/health.py::list_fitness_exercises` |
| `/api/health/fitness/progression` | GET | `routers/health.py::fitness_progression` |
| `/api/health/injuries` | GET | `routers/health.py::get_injuries` |
| `/api/health/injuries` | POST | `routers/health.py::create_injury` |
| `/api/health/injuries/active` | GET | `routers/health.py::get_active_injuries` |
| `/api/health/injuries/{injury_id}` | DELETE | `routers/health.py::delete_injury` |
| `/api/health/injuries/{injury_id}` | PATCH | `routers/health.py::update_injury` |
| `/api/health/medical` | GET | `routers/health.py::get_medical_events` |
| `/api/health/medical` | POST | `routers/health.py::create_medical_event` |
| `/api/health/medical/upcoming` | GET | `routers/health.py::get_upcoming_medical` |
| `/api/health/medical/{event_id}` | DELETE | `routers/health.py::delete_medical_event` |
| `/api/health/medical/{event_id}` | PATCH | `routers/health.py::update_medical_event` |
| `/api/health/nutrition` | GET | `routers/health.py::get_nutrition_logs` |
| `/api/health/nutrition` | POST | `routers/health.py::create_nutrition_log` |
| `/api/health/nutrition/daily/{log_date}` | GET | `routers/health.py::get_daily_nutrition` |
| `/api/health/nutrition/targets` | GET | `routers/health.py::get_macro_targets` |
| `/api/health/nutrition/targets` | POST | `routers/health.py::set_macro_targets` |
| `/api/health/nutrition/weekly` | GET | `routers/health.py::get_weekly_nutrition` |
| `/api/health/nutrition/{log_id}` | DELETE | `routers/health.py::delete_nutrition_log` |
| `/api/health/nutrition/{log_id}` | PATCH | `routers/health.py::update_nutrition_log` |
| `/api/health/progression/cardio` | GET | `routers/health.py::cardio_progression` |
| `/api/health/progression/exercises` | GET | `routers/health.py::list_exercises` |
| `/api/health/progression/strength` | GET | `routers/health.py::strength_progression` |
| `/api/health/recovery` | GET | `routers/health.py::get_recovery_trend` |
| `/api/health/sleep` | GET | `routers/health.py::get_sleep` |
| `/api/health/sleep` | POST | `routers/health.py::log_sleep` |
| `/api/health/sleep/{sleep_id}` | DELETE | `routers/health.py::delete_sleep` |
| `/api/health/supplements` | GET | `routers/health.py::get_supplements` |
| `/api/health/supplements` | POST | `routers/health.py::create_supplement` |
| `/api/health/supplements/effectiveness` | GET | `routers/health.py::get_supplement_effectiveness` |
| `/api/health/supplements/{sup_id}` | DELETE | `routers/health.py::delete_supplement` |
| `/api/health/supplements/{sup_id}/toggle` | PUT | `routers/health.py::toggle_supplement` |
| `/api/health/workouts` | GET | `routers/health.py::get_workouts` |
| `/api/health/workouts` | POST | `routers/health.py::create_workout` |
| `/api/health/workouts/{workout_id}` | DELETE | `routers/health.py::delete_workout` |
| `/api/health/workouts/{workout_id}/exercises` | POST | `routers/health.py::add_exercise` |
| `/api/insights/compute` | POST | `routers/insights.py::compute_correlations` |
| `/api/insights/correlations` | GET | `routers/insights.py::get_correlations` |
| `/api/mood/` | GET | `routers/mood.py::get_mood_logs` |
| `/api/mood/` | POST | `routers/mood.py::log_mood` |
| `/api/mood/correlations` | GET | `routers/mood.py::get_mood_correlations` |
| `/api/mood/patterns` | GET | `routers/mood.py::get_mood_patterns` |
| `/api/mood/stats` | GET | `routers/mood.py::mood_stats` |
| `/api/mood/today` | GET | `routers/mood.py::get_today_mood` |
| `/api/mood/{log_id}` | DELETE | `routers/mood.py::delete_mood_log` |
| `/api/projects/` | GET | `routers/projects.py::get_projects` |
| `/api/projects/` | POST | `routers/projects.py::create_project` |
| `/api/projects/cascade` | GET | `routers/projects.py::get_goal_cascade` |
| `/api/projects/dependency-graph` | GET | `routers/projects.py::get_dependency_graph` |
| `/api/projects/key-results` | POST | `routers/projects.py::create_key_result` |
| `/api/projects/key-results/{kr_id}` | DELETE | `routers/projects.py::delete_key_result` |
| `/api/projects/key-results/{kr_id}` | PUT | `routers/projects.py::update_key_result` |
| `/api/projects/objectives` | GET | `routers/projects.py::get_objectives` |
| `/api/projects/objectives` | POST | `routers/projects.py::create_objective` |
| `/api/projects/objectives/{obj_id}` | DELETE | `routers/projects.py::delete_objective` |
| `/api/projects/postmortems/all` | GET | `routers/projects.py::get_all_postmortems` |
| `/api/projects/tasks` | POST | `routers/projects.py::create_task` |
| `/api/projects/tasks/{task_id}` | DELETE | `routers/projects.py::delete_task` |
| `/api/projects/tasks/{task_id}` | PUT | `routers/projects.py::update_task` |
| `/api/projects/time-estimates` | GET | `routers/projects.py::get_time_estimates` |
| `/api/projects/type-insights` | GET | `routers/projects.py::get_type_insights` |
| `/api/projects/velocity` | GET | `routers/projects.py::get_velocity` |
| `/api/projects/{project_id}` | DELETE | `routers/projects.py::delete_project` |
| `/api/projects/{project_id}` | PUT | `routers/projects.py::update_project` |
| `/api/projects/{project_id}/dependencies` | GET | `routers/projects.py::get_project_dependencies` |
| `/api/projects/{project_id}/dependencies` | POST | `routers/projects.py::add_dependency` |
| `/api/projects/{project_id}/dependencies/{dep_id}` | DELETE | `routers/projects.py::remove_dependency_edge` |
| `/api/projects/{project_id}/dependency` | DELETE | `routers/projects.py::remove_dependency` |
| `/api/projects/{project_id}/postmortem` | DELETE | `routers/projects.py::delete_postmortem` |
| `/api/projects/{project_id}/postmortem` | GET | `routers/projects.py::get_postmortem` |
| `/api/projects/{project_id}/postmortem` | POST | `routers/projects.py::create_postmortem` |
| `/api/projects/{project_id}/postmortem` | PUT | `routers/projects.py::update_postmortem` |
| `/api/reading/books` | GET | `routers/reading.py::get_books` |
| `/api/reading/books` | POST | `routers/reading.py::create_book` |
| `/api/reading/books/{book_id}` | DELETE | `routers/reading.py::delete_book` |
| `/api/reading/books/{book_id}` | GET | `routers/reading.py::get_book` |
| `/api/reading/books/{book_id}` | PUT | `routers/reading.py::update_book` |
| `/api/reading/books/{book_id}/depth` | PATCH | `routers/reading.py::update_book_depth` |
| `/api/reading/books/{book_id}/review` | POST | `routers/reading.py::mark_book_reviewed` |
| `/api/reading/notes` | POST | `routers/reading.py::add_note` |
| `/api/reading/notes/{note_id}` | DELETE | `routers/reading.py::delete_note` |
| `/api/reading/quotes` | POST | `routers/reading.py::add_quote` |
| `/api/reading/quotes/{quote_id}` | DELETE | `routers/reading.py::delete_quote` |
| `/api/reading/review-queue` | GET | `routers/reading.py::get_review_queue` |
| `/api/reading/stats` | GET | `routers/reading.py::reading_stats` |
| `/api/search/global` | GET | `routers/search.py::global_search` |
| `/api/tasks/` | GET | `routers/tasks.py::get_tasks` |
| `/api/tasks/` | POST | `routers/tasks.py::create_task` |
| `/api/tasks/stats` | GET | `routers/tasks.py::get_task_stats` |
| `/api/tasks/today` | GET | `routers/tasks.py::get_today_tasks` |
| `/api/tasks/{task_id}` | DELETE | `routers/tasks.py::delete_task` |
| `/api/tasks/{task_id}` | GET | `routers/tasks.py::get_task` |
| `/api/tasks/{task_id}` | PATCH | `routers/tasks.py::update_task` |
| `/api/time/blocks` | GET | `routers/time_tracking.py::get_blocks` |
| `/api/time/blocks` | POST | `routers/time_tracking.py::create_block` |
| `/api/time/blocks/day/{day}` | GET | `routers/time_tracking.py::get_day_blocks` |
| `/api/time/blocks/{block_id}` | DELETE | `routers/time_tracking.py::delete_block` |
| `/api/time/blocks/{block_id}` | PATCH | `routers/time_tracking.py::update_block` |
| `/api/time/categories` | GET | `routers/time_tracking.py::get_categories` |
| `/api/time/focus` | GET | `routers/time_tracking.py::get_focus_logs` |
| `/api/time/focus` | POST | `routers/time_tracking.py::upsert_focus_log` |
| `/api/time/focus/{log_date}` | GET | `routers/time_tracking.py::get_focus_log_by_date` |
| `/api/time/focus/{log_id}` | DELETE | `routers/time_tracking.py::delete_focus_log` |
| `/api/time/patterns` | GET | `routers/time_tracking.py::distraction_patterns` |
| `/api/time/summary/daily/{day}` | GET | `routers/time_tracking.py::daily_summary` |
| `/api/time/summary/weekly` | GET | `routers/time_tracking.py::weekly_summary` |
| `/api/trading/dashboard` | GET | `routers/trading.py::trading_dashboard` |
| `/api/trading/gap-analysis` | GET | `routers/trading.py::get_gap_analysis` |
| `/api/trading/positions` | GET | `routers/trading.py::get_positions` |
| `/api/trading/positions` | POST | `routers/trading.py::create_position` |
| `/api/trading/positions/{pos_id}` | DELETE | `routers/trading.py::delete_position` |
| `/api/trading/positions/{pos_id}` | PUT | `routers/trading.py::update_position` |
| `/api/trading/snapshots` | GET | `routers/trading.py::get_snapshots` |
| `/api/trading/snapshots` | POST | `routers/trading.py::create_snapshot` |
| `/api/trading/strategies` | GET | `routers/trading.py::get_strategies` |
| `/api/trading/strategies` | POST | `routers/trading.py::create_strategy` |
| `/api/trading/strategies/{strategy_id}` | DELETE | `routers/trading.py::delete_strategy` |
| `/api/trading/strategy-comparison` | GET | `routers/trading.py::get_strategy_comparison` |
| `/api/trading/trades` | GET | `routers/trading.py::get_trades` |
| `/api/trading/trades` | POST | `routers/trading.py::create_trade` |
| `/api/trading/trades/export` | GET | `routers/trading.py::export_trades` |
| `/api/trading/trades/{trade_id}` | DELETE | `routers/trading.py::delete_trade` |
| `/api/travel/cost-comparison` | GET | `routers/travel.py::get_cost_comparison` |
| `/api/travel/destinations` | GET | `routers/travel.py::get_destinations` |
| `/api/travel/destinations` | POST | `routers/travel.py::create_destination` |
| `/api/travel/destinations/{dest_id}` | DELETE | `routers/travel.py::delete_destination` |
| `/api/travel/documents` | GET | `routers/travel.py::get_documents` |
| `/api/travel/documents` | POST | `routers/travel.py::create_document` |
| `/api/travel/documents/{doc_id}` | DELETE | `routers/travel.py::delete_document` |
| `/api/travel/expenses` | POST | `routers/travel.py::create_trip_expense` |
| `/api/travel/expenses/{exp_id}` | DELETE | `routers/travel.py::delete_trip_expense` |
| `/api/travel/expiry-alerts` | GET | `routers/travel.py::get_expiry_alerts` |
| `/api/travel/itinerary` | POST | `routers/travel.py::create_itinerary_item` |
| `/api/travel/itinerary/{item_id}` | DELETE | `routers/travel.py::delete_itinerary_item` |
| `/api/travel/packing-items` | POST | `routers/travel.py::create_packing_item` |
| `/api/travel/packing-items/{item_id}` | DELETE | `routers/travel.py::delete_packing_item` |
| `/api/travel/packing-items/{item_id}` | PUT | `routers/travel.py::update_packing_item` |
| `/api/travel/packing-lists` | GET | `routers/travel.py::get_packing_lists` |
| `/api/travel/packing-lists` | POST | `routers/travel.py::create_packing_list` |
| `/api/travel/packing-lists/{list_id}` | DELETE | `routers/travel.py::delete_packing_list` |
| `/api/travel/packing-lists/{list_id}/clone` | POST | `routers/travel.py::clone_packing_list` |
| `/api/travel/trips` | GET | `routers/travel.py::get_trips` |
| `/api/travel/trips` | POST | `routers/travel.py::create_trip` |
| `/api/travel/trips/export-csv` | GET | `routers/travel.py::export_trips` |
| `/api/travel/trips/upcoming` | GET | `routers/travel.py::get_upcoming_trips` |
| `/api/travel/trips/{trip_id}` | DELETE | `routers/travel.py::delete_trip` |
| `/api/travel/trips/{trip_id}` | GET | `routers/travel.py::get_trip` |
| `/api/travel/trips/{trip_id}` | PUT | `routers/travel.py::update_trip` |
| `/api/travel/trips/{trip_id}/expense-summary` | GET | `routers/travel.py::get_expense_summary` |
| `/api/travel/trips/{trip_id}/expenses` | GET | `routers/travel.py::get_trip_expenses` |
| `/api/travel/trips/{trip_id}/itinerary` | GET | `routers/travel.py::get_itinerary` |
| `/api/travel/wishlist` | GET | `routers/travel.py::get_wishlist` |
| `/api/travel/wishlist` | POST | `routers/travel.py::create_wishlist` |
| `/api/travel/wishlist/{item_id}` | DELETE | `routers/travel.py::delete_wishlist` |
| `/api/wiki/article` | DELETE | `routers/wiki.py::delete_article` |
| `/api/wiki/article` | GET | `routers/wiki.py::get_article` |
| `/api/wiki/article` | POST | `routers/wiki.py::create_article` |
| `/api/wiki/article` | PUT | `routers/wiki.py::save_article` |
| `/api/wiki/backlink-counts` | GET | `routers/wiki.py::get_backlink_counts` |
| `/api/wiki/backlinks` | GET | `routers/wiki.py::get_backlinks_for_path` |
| `/api/wiki/index` | GET | `routers/wiki.py::get_wiki_index` |
| `/api/wiki/recent` | GET | `routers/wiki.py::get_recent_articles` |
| `/api/wiki/search` | GET | `routers/wiki.py::search_wiki` |
| `/api/wiki/tree` | GET | `routers/wiki.py::get_wiki_tree` |

Potential 500-risk notes from the router pass:

- No route handler in the surveyed registered routers used a literal bare `except:` block. Many handlers still rely on framework/default exceptions rather than local `try/except` handling, so follow-up hardening should focus on write endpoints and file-system backed wiki endpoints first.

## Dark Mode Gaps

| File | Class(es) needing dark: variant |
|---|---|
| `frontend/src/modules/Health/Progression.jsx` | `text-gray-900` |

Survey notes: searched `frontend/src` for `bg-white`, `text-gray-900`, `text-black`, and `border-gray-200` used in JSX class strings without a same-element `dark:` variant. The only high-confidence file-level gap found was `Health/Progression.jsx`.

## Missing Empty States

| File | Component | List variable |
|---|---|---|
| `frontend/src/modules/Fantasy/TradeBuilder.jsx` | `PlayerSearch` | `results` |
| `frontend/src/modules/Finance/BudgetTracker.jsx` | `BudgetTracker` | `categories` |
| `frontend/src/modules/Finance/Recurring.jsx` | `Recurring` | `categories` |
| `frontend/src/modules/Finance/Transactions.jsx` | `TransactionForm` | `accounts` |
| `frontend/src/modules/Finance/Transactions.jsx` | `Transactions` | `categories` |
| `frontend/src/modules/Habits/index.jsx` | `HabitStackLinker` | `habits` |
| `frontend/src/modules/Habits/index.jsx` | `Habits` | `habits` |
| `frontend/src/modules/Habits/index.jsx` | `Habits` | `objectives` |
| `frontend/src/modules/Health/Progression.jsx` | `ExerciseSelector` | `exercises` |
| `frontend/src/modules/Health/index.jsx` | `Health` | `sleep` |
| `frontend/src/modules/Health/index.jsx` | `Health` | `effectiveness` |
| `frontend/src/modules/Projects/index.jsx` | `Projects` | `objectives` |
| `frontend/src/modules/Trading/index.jsx` | `Trading` | `positions` |
| `frontend/src/modules/Trading/index.jsx` | `Trading` | `strategies` |
| `frontend/src/modules/Travel/Trips.jsx` | `CostComparisonChart` | `data` |

Survey notes: this table lists state-backed arrays rendered with `.map(...)` where the nearby JSX did not show an obvious empty-state guard. Constant option arrays, navigation arrays, chart helper arrays, and toast/internal collections were intentionally omitted from this follow-up list.
