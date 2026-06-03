from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta
from pydantic import BaseModel

from database import get_db
from models.mood import MoodLog

router = APIRouter(prefix="/api/mood", tags=["mood"])


class MoodCreate(BaseModel):
    date: date
    mood: Optional[int] = None
    energy: Optional[int] = None
    stress: Optional[int] = None
    anxiety: Optional[int] = None
    focus: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[str] = None


@router.get("/")
def get_mood_logs(days: int = 90, db: Session = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    return db.query(MoodLog).filter(MoodLog.date >= since).order_by(MoodLog.date.desc()).all()

@router.post("/")
def log_mood(data: MoodCreate, db: Session = Depends(get_db)):
    existing = db.query(MoodLog).filter(MoodLog.date == data.date).first()
    if existing:
        for k, v in data.dict(exclude_none=True).items():
            setattr(existing, k, v)
        db.commit()
        return existing
    log = MoodLog(**data.dict())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.delete("/{log_id}")
def delete_mood_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(MoodLog).filter(MoodLog.id == log_id).first()
    if not log: raise HTTPException(status_code=404, detail="Not found")
    db.delete(log)
    db.commit()
    return {"ok": True}

@router.get("/stats")
def mood_stats(days: int = 30, db: Session = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    logs = db.query(MoodLog).filter(MoodLog.date >= since).all()
    if not logs:
        return {"avg_mood": None, "avg_energy": None, "avg_stress": None, "entries": 0, "trend": []}

    avg = lambda field: round(sum(getattr(l, field) for l in logs if getattr(l, field)) /
                               max(1, sum(1 for l in logs if getattr(l, field))), 1)

    # Tag frequency
    all_tags = []
    for l in logs:
        if l.tags:
            all_tags.extend(t.strip() for t in l.tags.split(","))
    tag_counts = {}
    for t in all_tags:
        tag_counts[t] = tag_counts.get(t, 0) + 1

    trend = [{"date": str(l.date), "mood": l.mood, "energy": l.energy, "stress": l.stress}
             for l in sorted(logs, key=lambda x: x.date)]

    return {
        "entries": len(logs),
        "avg_mood": avg("mood"),
        "avg_energy": avg("energy"),
        "avg_stress": avg("stress"),
        "avg_focus": avg("focus"),
        "top_tags": sorted(tag_counts.items(), key=lambda x: -x[1])[:8],
        "trend": trend,
    }

@router.get("/today")
def get_today_mood(db: Session = Depends(get_db)):
    log = db.query(MoodLog).filter(MoodLog.date == date.today()).first()
    return log


# ─────────────────────────────────────────────
# S5.03 — Mood Correlation Engine
# ─────────────────────────────────────────────

@router.get("/correlations")
def get_mood_correlations(days: int = 90, db: Session = Depends(get_db)):
    """
    Compute:
    1. Per-tag avg mood/energy vs baseline
    2. Cross-module: habit completion % → mood; sleep hours/quality → energy; workout day → mood
    """
    from models.habits import Habit, HabitLog
    from models.health import SleepLog, Workout

    since = date.today() - timedelta(days=days)
    logs = db.query(MoodLog).filter(MoodLog.date >= since, MoodLog.mood.isnot(None)).all()
    if not logs:
        return {"tag_correlations": [], "factor_correlations": [], "sample_days": 0}

    # ── Tag correlations ──
    all_moods = [l.mood for l in logs if l.mood]
    all_energy = [l.energy for l in logs if l.energy]
    baseline_mood = sum(all_moods) / len(all_moods) if all_moods else 5.0
    baseline_energy = sum(all_energy) / len(all_energy) if all_energy else 5.0

    tag_data: dict = {}
    for l in logs:
        if not l.tags:
            continue
        for tag in [t.strip() for t in l.tags.split(",") if t.strip()]:
            if tag not in tag_data:
                tag_data[tag] = {"moods": [], "energies": []}
            if l.mood:
                tag_data[tag]["moods"].append(l.mood)
            if l.energy:
                tag_data[tag]["energies"].append(l.energy)

    tag_correlations = []
    for tag, vals in tag_data.items():
        if len(vals["moods"]) < 3:
            continue
        avg_mood = round(sum(vals["moods"]) / len(vals["moods"]), 2)
        avg_energy = round(sum(vals["energies"]) / len(vals["energies"]), 2) if vals["energies"] else None
        tag_correlations.append({
            "tag": tag,
            "sample": len(vals["moods"]),
            "avg_mood": avg_mood,
            "avg_energy": avg_energy,
            "mood_delta": round(avg_mood - baseline_mood, 2),
            "energy_delta": round(avg_energy - baseline_energy, 2) if avg_energy else None,
        })
    tag_correlations.sort(key=lambda x: -abs(x["mood_delta"]))

    # ── Cross-module factor correlations ──
    mood_by_date = {l.date: l for l in logs}
    all_dates = sorted(mood_by_date.keys())

    # Factor 1: habit completion % on a day → mood that day
    habits = db.query(Habit).filter(Habit.is_active == True).all()
    habit_count = len(habits) if habits else 1
    habit_logs = db.query(HabitLog).filter(HabitLog.date >= since, HabitLog.completed == True).all()
    habit_by_date: dict = {}
    for hl in habit_logs:
        key = hl.date
        habit_by_date[key] = habit_by_date.get(key, 0) + 1

    # Factor 2: sleep hours/quality the night before → mood next day
    sleep_logs = {sl.date: sl for sl in db.query(SleepLog).filter(SleepLog.date >= since).all()}

    # Factor 3: workout day → mood that day
    workout_dates = set(w.date for w in db.query(Workout).filter(Workout.date >= since).all())

    # Compute factor correlations by splitting days into high/low buckets
    def bucket_correlation(pairs, label, unit=""):
        """pairs: list of (factor_value, mood). Returns correlation info."""
        if len(pairs) < 6:
            return None
        vals = [p[0] for p in pairs]
        moods = [p[1] for p in pairs]
        mid = sorted(vals)[len(vals) // 2]  # median split
        high_mood = [m for v, m in pairs if v >= mid]
        low_mood = [m for v, m in pairs if v < mid]
        if not high_mood or not low_mood:
            return None
        high_avg = round(sum(high_mood) / len(high_mood), 2)
        low_avg = round(sum(low_mood) / len(low_mood), 2)
        return {
            "label": label,
            "high_avg_mood": high_avg,
            "low_avg_mood": low_avg,
            "delta": round(high_avg - low_avg, 2),
            "sample": len(pairs),
            "unit": unit,
            "threshold": round(mid, 1),
        }

    factor_correlations = []

    # Habit completion % → mood
    habit_pairs = []
    for d, ml in mood_by_date.items():
        if ml.mood:
            pct = habit_by_date.get(d, 0) / habit_count * 100
            habit_pairs.append((pct, ml.mood))
    r = bucket_correlation(habit_pairs, "Habit completion %", "%")
    if r: factor_correlations.append(r)

    # Sleep hours (night before) → next-day mood
    sleep_hour_pairs = []
    sleep_quality_pairs = []
    for d, ml in mood_by_date.items():
        prev = d - timedelta(days=1)
        sl = sleep_logs.get(prev)
        if sl and ml.mood:
            if sl.hours:
                sleep_hour_pairs.append((sl.hours, ml.mood))
            if sl.quality:
                sleep_quality_pairs.append((sl.quality, ml.energy or ml.mood))

    r = bucket_correlation(sleep_hour_pairs, "Sleep hours (night before)", "h")
    if r: factor_correlations.append(r)
    r = bucket_correlation(sleep_quality_pairs, "Sleep quality (night before)", "/5")
    if r: factor_correlations.append(r)

    # Workout day → mood
    workout_mood = [ml.mood for d, ml in mood_by_date.items() if d in workout_dates and ml.mood]
    no_workout_mood = [ml.mood for d, ml in mood_by_date.items() if d not in workout_dates and ml.mood]
    if len(workout_mood) >= 3 and len(no_workout_mood) >= 3:
        factor_correlations.append({
            "label": "Workout day",
            "high_avg_mood": round(sum(workout_mood) / len(workout_mood), 2),
            "low_avg_mood": round(sum(no_workout_mood) / len(no_workout_mood), 2),
            "delta": round(sum(workout_mood)/len(workout_mood) - sum(no_workout_mood)/len(no_workout_mood), 2),
            "sample": len(workout_mood) + len(no_workout_mood),
            "unit": "days",
            "threshold": None,
        })

    factor_correlations.sort(key=lambda x: -abs(x["delta"]))

    return {
        "baseline_mood": round(baseline_mood, 2),
        "baseline_energy": round(baseline_energy, 2),
        "sample_days": len(logs),
        "tag_correlations": tag_correlations[:12],
        "factor_correlations": factor_correlations,
    }


# ─────────────────────────────────────────────
# S5.04 — Mood Triggers & Antidotes
# ─────────────────────────────────────────────

@router.get("/patterns")
def get_mood_patterns(db: Session = Depends(get_db)):
    """
    Detect multi-day mood decline runs (triggers) and recovery runs (antidotes).
    Looks at which habits were completed in the 2 days preceding each event.
    """
    from models.habits import Habit, HabitLog

    # Get 120 days of mood + habits
    since = date.today() - timedelta(days=120)
    logs = db.query(MoodLog).filter(
        MoodLog.date >= since, MoodLog.mood.isnot(None)
    ).order_by(MoodLog.date).all()

    if len(logs) < 7:
        return {"triggers": [], "antidotes": [], "decline_episodes": 0, "recovery_episodes": 0}

    habit_logs = db.query(HabitLog).filter(
        HabitLog.date >= since, HabitLog.completed == True
    ).all()
    habits = {h.id: {"name": h.name, "icon": h.icon} for h in db.query(Habit).all()}

    # Build date → completed habit ids
    habits_by_date: dict = {}
    for hl in habit_logs:
        key = hl.date
        if key not in habits_by_date:
            habits_by_date[key] = set()
        habits_by_date[key].add(hl.habit_id)

    # Detect decline starts (day where 3-day downward run begins)
    # and recovery starts (day where 3-day upward run begins)
    decline_precursor_habits: dict = {}  # habit_id → count appeared before declines
    recovery_precursor_habits: dict = {}
    n_declines = 0
    n_recoveries = 0

    for i in range(len(logs) - 2):
        a, b, c = logs[i], logs[i + 1], logs[i + 2]
        if not (a.mood and b.mood and c.mood):
            continue

        # 3-day decline: each day's mood is lower than the previous
        if b.mood < a.mood and c.mood < b.mood:
            n_declines += 1
            # Look at habits done 1-2 days BEFORE the decline started (before day a)
            for lookback in [1, 2]:
                pre_date = a.date - timedelta(days=lookback)
                for hid in habits_by_date.get(pre_date, set()):
                    if hid in habits:
                        decline_precursor_habits[hid] = decline_precursor_habits.get(hid, 0) + 1

        # 3-day recovery: each day's mood is higher than the previous
        if b.mood > a.mood and c.mood > b.mood:
            n_recoveries += 1
            for lookback in [1, 2]:
                pre_date = a.date - timedelta(days=lookback)
                for hid in habits_by_date.get(pre_date, set()):
                    if hid in habits:
                        recovery_precursor_habits[hid] = recovery_precursor_habits.get(hid, 0) + 1

    def build_ranked(counter, n_episodes):
        if n_episodes == 0:
            return []
        items = []
        for hid, count in counter.items():
            if hid not in habits:
                continue
            items.append({
                "habit_id": hid,
                "name": habits[hid]["name"],
                "icon": habits[hid]["icon"],
                "appearances": count,
                "rate_pct": round(count / n_episodes * 100),
            })
        return sorted(items, key=lambda x: -x["appearances"])[:8]

    return {
        "decline_episodes": n_declines,
        "recovery_episodes": n_recoveries,
        "triggers": build_ranked(decline_precursor_habits, n_declines),
        "antidotes": build_ranked(recovery_precursor_habits, n_recoveries),
    }
