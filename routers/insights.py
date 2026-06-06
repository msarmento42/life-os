from datetime import timedelta
from math import sqrt

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.habits import Habit, HabitLog
from models.health import SleepLog, Workout
from models.insights import Correlation
from models.mood import MoodLog
from models.trading import Trade

router = APIRouter(prefix="/api/insights", tags=["insights"])


def _pearson(pairs):
    if len(pairs) < 10:
        return 0

    xs = [float(pair[0]) for pair in pairs]
    ys = [float(pair[1]) for pair in pairs]
    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    denom_x = sqrt(sum((x - mean_x) ** 2 for x in xs))
    denom_y = sqrt(sum((y - mean_y) ** 2 for y in ys))
    if denom_x == 0 or denom_y == 0:
        return 0
    return numerator / (denom_x * denom_y)


def _upsert_correlation(db, entity_a, entity_b, label, pairs):
    correlation = db.query(Correlation).filter(
        Correlation.entity_a == entity_a,
        Correlation.entity_b == entity_b,
    ).first()

    if not correlation:
        correlation = Correlation(entity_a=entity_a, entity_b=entity_b)
        db.add(correlation)

    correlation.label = label
    correlation.sample_size = len(pairs)
    correlation.coefficient = round(_pearson(pairs), 4)
    return correlation


def _serialize(correlation):
    return {
        "id": correlation.id,
        "entity_a": correlation.entity_a,
        "entity_b": correlation.entity_b,
        "coefficient": correlation.coefficient,
        "sample_size": correlation.sample_size,
        "label": correlation.label,
        "computed_at": str(correlation.computed_at) if correlation.computed_at else None,
    }


@router.post("/compute")
def compute_correlations(db: Session = Depends(get_db)):
    mood_logs = db.query(MoodLog).all()
    mood_by_date = {log.date: log for log in mood_logs}

    sleep_pairs = []
    for sleep in db.query(SleepLog).filter(SleepLog.quality.isnot(None)).all():
        next_mood = mood_by_date.get(sleep.date + timedelta(days=1))
        if next_mood and next_mood.mood is not None:
            sleep_pairs.append((sleep.quality, next_mood.mood))

    workout_by_date = {}
    for workout in db.query(Workout).filter(Workout.duration_min.isnot(None)).all():
        workout_by_date[workout.date] = workout_by_date.get(workout.date, 0) + (workout.duration_min or 0)

    exercise_pairs = []
    for workout_date, minutes in workout_by_date.items():
        next_mood = mood_by_date.get(workout_date + timedelta(days=1))
        if next_mood and next_mood.energy is not None:
            exercise_pairs.append((minutes, next_mood.energy))

    trade_pnl_by_date = {
        row.date: row.pnl or 0
        for row in db.query(Trade.date, func.sum(Trade.pnl).label("pnl")).group_by(Trade.date).all()
    }
    trading_pairs = [
        (log.mood, trade_pnl_by_date[log.date])
        for log in mood_logs
        if log.mood is not None and log.date in trade_pnl_by_date
    ]

    active_habits = db.query(Habit).filter(Habit.is_active == True).count() or 1
    habit_counts = {}
    habit_logs = db.query(HabitLog).all()
    for log in habit_logs:
        if log.completed:
            habit_counts[log.date] = habit_counts.get(log.date, 0) + 1

    habit_pairs = [
        (habit_counts.get(log.date, 0) / active_habits * 100, log.mood)
        for log in mood_logs
        if log.mood is not None
    ]

    correlations = [
        _upsert_correlation(db, "sleep_quality", "mood_score", "Sleep -> next-day mood", sleep_pairs),
        _upsert_correlation(db, "exercise_minutes", "energy", "Exercise -> next-day energy", exercise_pairs),
        _upsert_correlation(db, "mood_score", "trading_pnl", "Mood -> trading P&L", trading_pairs),
        _upsert_correlation(db, "habit_completion_rate", "mood_score", "Habits -> mood", habit_pairs),
    ]

    db.commit()
    for correlation in correlations:
        db.refresh(correlation)

    return [_serialize(correlation) for correlation in sorted(correlations, key=lambda c: abs(c.coefficient), reverse=True)]


@router.get("/correlations")
def get_correlations(db: Session = Depends(get_db)):
    correlations = db.query(Correlation).order_by(func.abs(Correlation.coefficient).desc()).all()
    return [_serialize(correlation) for correlation in correlations]
