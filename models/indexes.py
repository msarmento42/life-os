from sqlalchemy import Index

from models.finance import Budget, NetWorthSnapshot, RecurringItem, SavingsGoal, Transaction
from models.habits import Habit, HabitLog, RoutineItem
from models.health import BloodWorkResult, BodyMetric, SleepLog, Workout, WorkoutExercise
from models.mood import MoodLog
from models.projects import KeyResult, Project, ProjectPostmortem, ProjectTask
from models.time_tracking import TimeBlock
from models.trading import PortfolioSnapshot, Position, Trade

Index("ix_body_metrics_date", BodyMetric.date)
Index("ix_workouts_date", Workout.date)
Index("ix_workout_exercises_workout_id", WorkoutExercise.workout_id)
Index("ix_sleep_logs_date", SleepLog.date)
Index("ix_blood_work_results_date", BloodWorkResult.date)

Index("ix_mood_logs_date", MoodLog.date)

Index("ix_habits_goal_id", Habit.goal_id)
Index("ix_habit_logs_habit_id", HabitLog.habit_id)
Index("ix_habit_logs_date", HabitLog.date)
Index("ix_routine_items_routine_id", RoutineItem.routine_id)

Index("ix_net_worth_snapshots_account_id", NetWorthSnapshot.account_id)
Index("ix_net_worth_snapshots_snapshot_date", NetWorthSnapshot.snapshot_date)
Index("ix_transactions_date", Transaction.date)
Index("ix_transactions_category_id", Transaction.category_id)
Index("ix_transactions_account_id", Transaction.account_id)
Index("ix_budgets_category_id", Budget.category_id)
Index("ix_recurring_items_category_id", RecurringItem.category_id)
Index("ix_recurring_items_next_date", RecurringItem.next_date)
Index("ix_savings_goals_target_date", SavingsGoal.target_date)

Index("ix_trades_date", Trade.date)
Index("ix_trades_strategy_id", Trade.strategy_id)
Index("ix_positions_strategy_id", Position.strategy_id)
Index("ix_portfolio_snapshots_date", PortfolioSnapshot.date)

Index("ix_time_blocks_project_id", TimeBlock.project_id)

Index("ix_key_results_objective_id", KeyResult.objective_id)
Index("ix_key_results_due_date", KeyResult.due_date)
Index("ix_projects_due_date", Project.due_date)
Index("ix_projects_objective_id", Project.objective_id)
Index("ix_projects_blocks_project_id", Project.blocks_project_id)
Index("ix_project_tasks_project_id", ProjectTask.project_id)
Index("ix_project_tasks_due_date", ProjectTask.due_date)
Index("ix_project_postmortems_project_id", ProjectPostmortem.project_id)
