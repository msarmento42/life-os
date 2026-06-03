from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date
from pydantic import BaseModel

from database import get_db
from models.health import BodyMetric, Workout, WorkoutExercise, SleepLog, Supplement, BloodWorkResult, NutritionLog, MacroTarget, MedicalEvent, InjuryLog

router = APIRouter(prefix="/api/health", tags=["health"])


# --- Schemas ---
class BodyMetricCreate(BaseModel):
    date: date
    weight_lbs: Optional[float] = None
    body_fat_pct: Optional[float] = None
    muscle_mass_lbs: Optional[float] = None
    waist_in: Optional[float] = None
    resting_hr: Optional[int] = None
    hrv: Optional[int] = None
    notes: Optional[str] = None

class WorkoutCreate(BaseModel):
    date: date
    type: Optional[str] = "strength"
    title: Optional[str] = None
    duration_min: Optional[int] = None
    calories_burned: Optional[int] = None
    notes: Optional[str] = None

class ExerciseCreate(BaseModel):
    workout_id: int
    name: str
    sets: Optional[int] = None
    reps: Optional[int] = None
    weight_lbs: Optional[float] = None
    duration_sec: Optional[int] = None
    notes: Optional[str] = None

class SleepCreate(BaseModel):
    date: date
    hours: Optional[float] = None
    quality: Optional[int] = None
    bedtime: Optional[str] = None
    wake_time: Optional[str] = None
    notes: Optional[str] = None

class SupplementCreate(BaseModel):
    name: str
    dose: Optional[str] = None
    frequency: str = "daily"
    timing: Optional[str] = None
    brand: Optional[str] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None

class BloodWorkCreate(BaseModel):
    date: date
    marker_name: str
    value: Optional[float] = None
    unit: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    notes: Optional[str] = None


# --- Body Metrics ---
@router.get("/body-metrics")
def get_body_metrics(limit: int = 90, db: Session = Depends(get_db)):
    return db.query(BodyMetric).order_by(BodyMetric.date.desc()).limit(limit).all()

@router.post("/body-metrics")
def create_body_metric(data: BodyMetricCreate, db: Session = Depends(get_db)):
    m = BodyMetric(**data.dict())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

@router.delete("/body-metrics/{metric_id}")
def delete_body_metric(metric_id: int, db: Session = Depends(get_db)):
    m = db.query(BodyMetric).filter(BodyMetric.id == metric_id).first()
    if not m: raise HTTPException(status_code=404, detail="Not found")
    db.delete(m)
    db.commit()
    return {"ok": True}


# --- Recovery Metrics ---
@router.get("/recovery")
def get_recovery_trend(days: int = 30, db: Session = Depends(get_db)):
    """Return combined recovery metrics (HRV, resting HR) + sleep quality for charting."""
    from datetime import timedelta
    today = date.today()
    since = today - timedelta(days=days - 1)

    body = db.query(BodyMetric).filter(
        BodyMetric.date >= since,
        BodyMetric.date <= today,
    ).order_by(BodyMetric.date.asc()).all()

    sleep_logs = db.query(SleepLog).filter(
        SleepLog.date >= since,
        SleepLog.date <= today,
    ).order_by(SleepLog.date.asc()).all()

    # Index sleep by date string for join
    sleep_by_date = {str(s.date): s for s in sleep_logs}

    # Build per-day map: body metrics keyed by date
    body_by_date = {str(m.date): m for m in body}

    # Produce unified timeline for every day in range
    rows = []
    for i in range(days):
        d = since + timedelta(days=i)
        key = str(d)
        label = d.strftime("%m/%d")
        bm = body_by_date.get(key)
        sl = sleep_by_date.get(key)
        rows.append({
            "date": key,
            "label": label,
            "hrv": bm.hrv if bm else None,
            "resting_hr": bm.resting_hr if bm else None,
            "sleep_quality": sl.quality if sl else None,
            "sleep_hours": sl.hours if sl else None,
        })

    # Averages (only days with data)
    hrv_vals = [r["hrv"] for r in rows if r["hrv"] is not None]
    hr_vals = [r["resting_hr"] for r in rows if r["resting_hr"] is not None]
    sq_vals = [r["sleep_quality"] for r in rows if r["sleep_quality"] is not None]

    # Latest entry with any recovery data
    latest_hrv = next((r["hrv"] for r in reversed(rows) if r["hrv"] is not None), None)
    latest_hr = next((r["resting_hr"] for r in reversed(rows) if r["resting_hr"] is not None), None)

    return {
        "days": rows,
        "avg_hrv": round(sum(hrv_vals) / len(hrv_vals), 1) if hrv_vals else None,
        "avg_resting_hr": round(sum(hr_vals) / len(hr_vals), 1) if hr_vals else None,
        "avg_sleep_quality": round(sum(sq_vals) / len(sq_vals), 1) if sq_vals else None,
        "latest_hrv": latest_hrv,
        "latest_resting_hr": latest_hr,
        "logged_days": len([r for r in rows if r["hrv"] is not None or r["resting_hr"] is not None]),
    }


# --- Workouts ---
@router.get("/workouts")
def get_workouts(limit: int = 50, db: Session = Depends(get_db)):
    workouts = db.query(Workout).order_by(Workout.date.desc()).limit(limit).all()
    return [{
        "id": w.id, "date": str(w.date), "type": w.type, "title": w.title,
        "duration_min": w.duration_min, "calories_burned": w.calories_burned,
        "notes": w.notes, "exercise_count": len(w.exercises),
        "exercises": [{"id": e.id, "name": e.name, "sets": e.sets, "reps": e.reps,
                        "weight_lbs": e.weight_lbs, "duration_sec": e.duration_sec} for e in w.exercises]
    } for w in workouts]

@router.post("/workouts")
def create_workout(data: WorkoutCreate, db: Session = Depends(get_db)):
    w = Workout(**data.dict())
    db.add(w)
    db.commit()
    db.refresh(w)
    return w

@router.post("/workouts/{workout_id}/exercises")
def add_exercise(workout_id: int, data: ExerciseCreate, db: Session = Depends(get_db)):
    e = WorkoutExercise(**data.dict())
    db.add(e)
    db.commit()
    db.refresh(e)
    return e

@router.delete("/workouts/{workout_id}")
def delete_workout(workout_id: int, db: Session = Depends(get_db)):
    w = db.query(Workout).filter(Workout.id == workout_id).first()
    if not w: raise HTTPException(status_code=404, detail="Not found")
    db.delete(w)
    db.commit()
    return {"ok": True}

@router.delete("/exercises/{exercise_id}")
def delete_exercise(exercise_id: int, db: Session = Depends(get_db)):
    e = db.query(WorkoutExercise).filter(WorkoutExercise.id == exercise_id).first()
    if not e: raise HTTPException(status_code=404, detail="Not found")
    db.delete(e)
    db.commit()
    return {"ok": True}


# --- Sleep ---
@router.get("/sleep")
def get_sleep(limit: int = 90, db: Session = Depends(get_db)):
    return db.query(SleepLog).order_by(SleepLog.date.desc()).limit(limit).all()

@router.post("/sleep")
def log_sleep(data: SleepCreate, db: Session = Depends(get_db)):
    # Upsert by date
    existing = db.query(SleepLog).filter(SleepLog.date == data.date).first()
    if existing:
        for k, v in data.dict(exclude_none=True).items():
            setattr(existing, k, v)
        db.commit()
        return existing
    s = SleepLog(**data.dict())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

@router.delete("/sleep/{sleep_id}")
def delete_sleep(sleep_id: int, db: Session = Depends(get_db)):
    s = db.query(SleepLog).filter(SleepLog.id == sleep_id).first()
    if not s: raise HTTPException(status_code=404, detail="Not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


# --- Supplements ---
@router.get("/supplements")
def get_supplements(db: Session = Depends(get_db)):
    return db.query(Supplement).order_by(Supplement.is_active.desc(), Supplement.name).all()

@router.post("/supplements")
def create_supplement(data: SupplementCreate, db: Session = Depends(get_db)):
    s = Supplement(**data.dict())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

@router.put("/supplements/{sup_id}/toggle")
def toggle_supplement(sup_id: int, db: Session = Depends(get_db)):
    s = db.query(Supplement).filter(Supplement.id == sup_id).first()
    if not s: raise HTTPException(status_code=404, detail="Not found")
    s.is_active = not s.is_active
    db.commit()
    return s

@router.delete("/supplements/{sup_id}")
def delete_supplement(sup_id: int, db: Session = Depends(get_db)):
    s = db.query(Supplement).filter(Supplement.id == sup_id).first()
    if not s: raise HTTPException(status_code=404, detail="Not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


# --- Blood Work ---
@router.get("/blood-work")
def get_blood_work(db: Session = Depends(get_db)):
    return db.query(BloodWorkResult).order_by(BloodWorkResult.date.desc()).all()

@router.post("/blood-work")
def create_blood_work(data: BloodWorkCreate, db: Session = Depends(get_db)):
    r = BloodWorkResult(**data.dict())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r

@router.delete("/blood-work/{result_id}")
def delete_blood_work(result_id: int, db: Session = Depends(get_db)):
    r = db.query(BloodWorkResult).filter(BloodWorkResult.id == result_id).first()
    if not r: raise HTTPException(status_code=404, detail="Not found")
    db.delete(r)
    db.commit()
    return {"ok": True}


# --- Dashboard ---
@router.get("/dashboard")
def health_dashboard(db: Session = Depends(get_db)):
    from datetime import timedelta
    today = date.today()
    week_ago = today - timedelta(days=7)

    latest_metric = db.query(BodyMetric).order_by(BodyMetric.date.desc()).first()
    workouts_this_week = db.query(Workout).filter(Workout.date >= week_ago).count()
    avg_sleep = db.query(func.avg(SleepLog.hours)).filter(
        SleepLog.date >= today - timedelta(days=30)
    ).scalar()
    avg_sleep_quality = db.query(func.avg(SleepLog.quality)).filter(
        SleepLog.date >= today - timedelta(days=30)
    ).scalar()

    # Weight trend (last 30 days)
    weight_trend = db.query(BodyMetric).filter(
        BodyMetric.date >= today - timedelta(days=30),
        BodyMetric.weight_lbs != None
    ).order_by(BodyMetric.date.asc()).all()

    # Latest recovery values
    latest_hrv = db.query(BodyMetric).filter(
        BodyMetric.hrv != None
    ).order_by(BodyMetric.date.desc()).first()
    latest_resting_hr = db.query(BodyMetric).filter(
        BodyMetric.resting_hr != None
    ).order_by(BodyMetric.date.desc()).first()

    return {
        "latest_weight": latest_metric.weight_lbs if latest_metric else None,
        "latest_body_fat": latest_metric.body_fat_pct if latest_metric else None,
        "workouts_this_week": workouts_this_week,
        "avg_sleep_hours": round(avg_sleep, 1) if avg_sleep else None,
        "avg_sleep_quality": round(avg_sleep_quality, 1) if avg_sleep_quality else None,
        "active_supplements": db.query(Supplement).filter(Supplement.is_active == True).count(),
        "weight_trend": [{"date": str(m.date), "weight": m.weight_lbs} for m in weight_trend],
        "latest_hrv": latest_hrv.hrv if latest_hrv else None,
        "latest_resting_hr": latest_resting_hr.resting_hr if latest_resting_hr else None,
    }


# --- Nutrition ---

class NutritionCreate(BaseModel):
    date: date
    meal: Optional[str] = "other"
    food_item: str
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    notes: Optional[str] = None

class NutritionUpdate(BaseModel):
    date: Optional[date] = None
    meal: Optional[str] = None
    food_item: Optional[str] = None
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    notes: Optional[str] = None

class MacroTargetCreate(BaseModel):
    calories: Optional[int] = 2200
    protein_g: Optional[float] = 180.0
    carbs_g: Optional[float] = 220.0
    fat_g: Optional[float] = 70.0
    notes: Optional[str] = None


def _nutrition_dict(n: NutritionLog) -> dict:
    return {
        "id": n.id,
        "date": str(n.date),
        "meal": n.meal,
        "food_item": n.food_item,
        "calories": n.calories,
        "protein_g": n.protein_g,
        "carbs_g": n.carbs_g,
        "fat_g": n.fat_g,
        "notes": n.notes,
        "created_at": str(n.created_at) if n.created_at else None,
    }


def _daily_totals(logs: list) -> dict:
    return {
        "calories": sum(l.calories or 0 for l in logs),
        "protein_g": round(sum(l.protein_g or 0 for l in logs), 1),
        "carbs_g": round(sum(l.carbs_g or 0 for l in logs), 1),
        "fat_g": round(sum(l.fat_g or 0 for l in logs), 1),
    }


@router.get("/nutrition")
def get_nutrition_logs(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    meal: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    from datetime import timedelta
    q = db.query(NutritionLog)
    if start_date:
        q = q.filter(NutritionLog.date >= start_date)
    if end_date:
        q = q.filter(NutritionLog.date <= end_date)
    if meal:
        q = q.filter(NutritionLog.meal == meal)
    logs = q.order_by(NutritionLog.date.desc(), NutritionLog.created_at.asc()).limit(limit).all()
    return [_nutrition_dict(n) for n in logs]


@router.get("/nutrition/daily/{log_date}")
def get_daily_nutrition(log_date: date, db: Session = Depends(get_db)):
    logs = db.query(NutritionLog).filter(NutritionLog.date == log_date).order_by(NutritionLog.meal, NutritionLog.created_at).all()
    totals = _daily_totals(logs)

    # Get macro targets
    target = db.query(MacroTarget).order_by(MacroTarget.id.desc()).first()
    target_dict = {
        "calories": target.calories if target else 2200,
        "protein_g": target.protein_g if target else 180.0,
        "carbs_g": target.carbs_g if target else 220.0,
        "fat_g": target.fat_g if target else 70.0,
    } if target else {"calories": 2200, "protein_g": 180.0, "carbs_g": 220.0, "fat_g": 70.0}

    # Meals grouped
    meals: dict = {}
    for log in logs:
        meals.setdefault(log.meal, []).append(_nutrition_dict(log))

    return {
        "date": str(log_date),
        "entries": [_nutrition_dict(n) for n in logs],
        "meals": meals,
        "totals": totals,
        "targets": target_dict,
        "pct_calories": round(totals["calories"] / target_dict["calories"] * 100, 1) if target_dict["calories"] else 0,
        "pct_protein": round(totals["protein_g"] / target_dict["protein_g"] * 100, 1) if target_dict["protein_g"] else 0,
        "pct_carbs": round(totals["carbs_g"] / target_dict["carbs_g"] * 100, 1) if target_dict["carbs_g"] else 0,
        "pct_fat": round(totals["fat_g"] / target_dict["fat_g"] * 100, 1) if target_dict["fat_g"] else 0,
    }


@router.get("/nutrition/weekly")
def get_weekly_nutrition(db: Session = Depends(get_db)):
    from datetime import timedelta
    today = date.today()
    week_ago = today - timedelta(days=6)

    logs = db.query(NutritionLog).filter(
        NutritionLog.date >= week_ago,
        NutritionLog.date <= today
    ).order_by(NutritionLog.date.asc()).all()

    # Group by date
    by_date: dict = {}
    for log in logs:
        key = str(log.date)
        by_date.setdefault(key, []).append(log)

    days = []
    for i in range(7):
        d = week_ago + timedelta(days=i)
        key = str(d)
        day_logs = by_date.get(key, [])
        totals = _daily_totals(day_logs)
        days.append({"date": key, **totals, "entry_count": len(day_logs)})

    # Weekly averages
    logged_days = [d for d in days if d["entry_count"] > 0]
    avg = {
        "calories": round(sum(d["calories"] for d in logged_days) / len(logged_days), 0) if logged_days else 0,
        "protein_g": round(sum(d["protein_g"] for d in logged_days) / len(logged_days), 1) if logged_days else 0,
        "carbs_g": round(sum(d["carbs_g"] for d in logged_days) / len(logged_days), 1) if logged_days else 0,
        "fat_g": round(sum(d["fat_g"] for d in logged_days) / len(logged_days), 1) if logged_days else 0,
    }

    return {"days": days, "averages": avg, "logged_days": len(logged_days)}


@router.post("/nutrition")
def create_nutrition_log(data: NutritionCreate, db: Session = Depends(get_db)):
    n = NutritionLog(**data.dict())
    db.add(n)
    db.commit()
    db.refresh(n)
    return _nutrition_dict(n)


@router.patch("/nutrition/{log_id}")
def update_nutrition_log(log_id: int, data: NutritionUpdate, db: Session = Depends(get_db)):
    n = db.query(NutritionLog).filter(NutritionLog.id == log_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Nutrition log not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(n, k, v)
    db.commit()
    db.refresh(n)
    return _nutrition_dict(n)


@router.delete("/nutrition/{log_id}")
def delete_nutrition_log(log_id: int, db: Session = Depends(get_db)):
    n = db.query(NutritionLog).filter(NutritionLog.id == log_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Nutrition log not found")
    db.delete(n)
    db.commit()
    return {"ok": True}


@router.get("/nutrition/targets")
def get_macro_targets(db: Session = Depends(get_db)):
    target = db.query(MacroTarget).order_by(MacroTarget.id.desc()).first()
    if not target:
        return {"calories": 2200, "protein_g": 180.0, "carbs_g": 220.0, "fat_g": 70.0, "notes": None}
    return {
        "id": target.id,
        "calories": target.calories,
        "protein_g": target.protein_g,
        "carbs_g": target.carbs_g,
        "fat_g": target.fat_g,
        "notes": target.notes,
    }


@router.post("/nutrition/targets")
def set_macro_targets(data: MacroTargetCreate, db: Session = Depends(get_db)):
    # Replace latest target
    existing = db.query(MacroTarget).order_by(MacroTarget.id.desc()).first()
    if existing:
        for k, v in data.dict(exclude_none=True).items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return {"id": existing.id, "calories": existing.calories, "protein_g": existing.protein_g,
                "carbs_g": existing.carbs_g, "fat_g": existing.fat_g, "notes": existing.notes}
    t = MacroTarget(**data.dict())
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "calories": t.calories, "protein_g": t.protein_g,
            "carbs_g": t.carbs_g, "fat_g": t.fat_g, "notes": t.notes}


# ─────────────────────────────────────────────
# Medical Timeline  (S4.03)
# ─────────────────────────────────────────────

class MedicalEventCreate(BaseModel):
    date: date
    type: Optional[str] = "checkup"
    title: str
    provider: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None
    next_due: Optional[date] = None
    is_upcoming: Optional[bool] = False

class MedicalEventUpdate(BaseModel):
    date: Optional[date] = None
    type: Optional[str] = None
    title: Optional[str] = None
    provider: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None
    next_due: Optional[date] = None
    is_upcoming: Optional[bool] = None

def _medical_dict(e: MedicalEvent) -> dict:
    return {
        "id": e.id,
        "date": str(e.date),
        "type": e.type,
        "title": e.title,
        "provider": e.provider,
        "notes": e.notes,
        "outcome": e.outcome,
        "next_due": str(e.next_due) if e.next_due else None,
        "is_upcoming": e.is_upcoming,
        "created_at": str(e.created_at) if e.created_at else None,
    }

@router.get("/medical")
def get_medical_events(
    type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(MedicalEvent)
    if type:
        q = q.filter(MedicalEvent.type == type)
    events = q.order_by(MedicalEvent.date.desc()).limit(limit).all()
    return [_medical_dict(e) for e in events]

@router.get("/medical/upcoming")
def get_upcoming_medical(days_ahead: int = 90, db: Session = Depends(get_db)):
    from datetime import timedelta
    today = date.today()
    cutoff = today + timedelta(days=days_ahead)
    # Upcoming = future events OR events with next_due in window
    upcoming_events = db.query(MedicalEvent).filter(
        MedicalEvent.is_upcoming == True,
        MedicalEvent.date >= today,
        MedicalEvent.date <= cutoff,
    ).order_by(MedicalEvent.date.asc()).all()
    overdue_next = db.query(MedicalEvent).filter(
        MedicalEvent.next_due != None,
        MedicalEvent.next_due < today,
    ).order_by(MedicalEvent.next_due.asc()).all()
    due_soon_next = db.query(MedicalEvent).filter(
        MedicalEvent.next_due != None,
        MedicalEvent.next_due >= today,
        MedicalEvent.next_due <= cutoff,
    ).order_by(MedicalEvent.next_due.asc()).all()
    return {
        "upcoming_appointments": [_medical_dict(e) for e in upcoming_events],
        "overdue": [_medical_dict(e) for e in overdue_next],
        "due_soon": [_medical_dict(e) for e in due_soon_next],
    }

@router.post("/medical")
def create_medical_event(data: MedicalEventCreate, db: Session = Depends(get_db)):
    e = MedicalEvent(**data.dict())
    db.add(e)
    db.commit()
    db.refresh(e)
    return _medical_dict(e)

@router.patch("/medical/{event_id}")
def update_medical_event(event_id: int, data: MedicalEventUpdate, db: Session = Depends(get_db)):
    e = db.query(MedicalEvent).filter(MedicalEvent.id == event_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Medical event not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return _medical_dict(e)

@router.delete("/medical/{event_id}")
def delete_medical_event(event_id: int, db: Session = Depends(get_db)):
    e = db.query(MedicalEvent).filter(MedicalEvent.id == event_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Medical event not found")
    db.delete(e)
    db.commit()
    return {"ok": True}


# ─────────────────────────────────────────────
# Supplement Effectiveness  (S4.06)
# ─────────────────────────────────────────────

@router.get("/supplements/effectiveness")
def get_supplement_effectiveness(db: Session = Depends(get_db)):
    """
    For each active supplement, compute before-vs-after deltas for:
    sleep_quality, hrv, resting_hr
    using the supplement's created_at as the start dividing line.
    Pre-period: 30 days before start. Post-period: start → today.
    """
    from datetime import timedelta

    today = date.today()
    active_supps = db.query(Supplement).filter(Supplement.is_active == True).order_by(Supplement.name).all()
    results = []

    def _avg(val):
        return round(val, 2) if val is not None else None

    for sup in active_supps:
        start = sup.created_at.date() if sup.created_at else None
        if not start:
            results.append({
                "supplement_id": sup.id, "name": sup.name, "purpose": sup.purpose,
                "timing": sup.timing, "days_active": None, "start_date": None,
                "pre": None, "post": None, "delta": None,
                "has_pre_data": False, "has_post_data": False,
            })
            continue

        pre_start = start - timedelta(days=30)
        days_active = (today - start).days

        # --- Pre-period averages ---
        pre_sleep = db.query(func.avg(SleepLog.quality)).filter(
            SleepLog.date >= pre_start, SleepLog.date < start
        ).scalar()

        pre_hrv = db.query(func.avg(BodyMetric.hrv)).filter(
            BodyMetric.date >= pre_start, BodyMetric.date < start,
            BodyMetric.hrv.isnot(None)
        ).scalar()

        pre_rhr = db.query(func.avg(BodyMetric.resting_hr)).filter(
            BodyMetric.date >= pre_start, BodyMetric.date < start,
            BodyMetric.resting_hr.isnot(None)
        ).scalar()

        # --- Post-period averages ---
        post_sleep = db.query(func.avg(SleepLog.quality)).filter(
            SleepLog.date >= start, SleepLog.date <= today
        ).scalar()

        post_hrv = db.query(func.avg(BodyMetric.hrv)).filter(
            BodyMetric.date >= start, BodyMetric.date <= today,
            BodyMetric.hrv.isnot(None)
        ).scalar()

        post_rhr = db.query(func.avg(BodyMetric.resting_hr)).filter(
            BodyMetric.date >= start, BodyMetric.date <= today,
            BodyMetric.resting_hr.isnot(None)
        ).scalar()

        def delta(post, pre):
            if post is None or pre is None:
                return None
            return round(post - pre, 2)

        has_pre = any(v is not None for v in [pre_sleep, pre_hrv, pre_rhr])
        has_post = any(v is not None for v in [post_sleep, post_hrv, post_rhr])

        results.append({
            "supplement_id": sup.id,
            "name": sup.name,
            "purpose": sup.purpose,
            "timing": sup.timing,
            "days_active": days_active,
            "start_date": str(start),
            "pre": {
                "sleep_quality": _avg(pre_sleep),
                "hrv": _avg(pre_hrv),
                "resting_hr": _avg(pre_rhr),
            },
            "post": {
                "sleep_quality": _avg(post_sleep),
                "hrv": _avg(post_hrv),
                "resting_hr": _avg(post_rhr),
            },
            "delta": {
                # For sleep_quality + HRV: positive delta = better
                # For resting_hr: negative delta = better (lower is better)
                "sleep_quality": delta(post_sleep, pre_sleep),
                "hrv": delta(post_hrv, pre_hrv),
                "resting_hr": delta(post_rhr, pre_rhr),
            },
            "has_pre_data": has_pre,
            "has_post_data": has_post,
        })

    return results


# ─────────────────────────────────────────────
# Injury / Pain Log  (H2.01)
# ─────────────────────────────────────────────

class InjuryCreate(BaseModel):
    date: date
    location: str
    type: Optional[str] = "strain"
    severity: Optional[int] = 5
    triggers: Optional[str] = None
    treatment: Optional[str] = None
    notes: Optional[str] = None
    estimated_recovery_date: Optional[date] = None

class InjuryUpdate(BaseModel):
    date: Optional[date] = None
    location: Optional[str] = None
    type: Optional[str] = None
    severity: Optional[int] = None
    triggers: Optional[str] = None
    treatment: Optional[str] = None
    notes: Optional[str] = None
    recovery_date: Optional[date] = None
    estimated_recovery_date: Optional[date] = None


def _injury_dict(i: InjuryLog) -> dict:
    return {
        "id": i.id,
        "date": str(i.date),
        "location": i.location,
        "type": i.type,
        "severity": i.severity,
        "triggers": i.triggers,
        "treatment": i.treatment,
        "notes": i.notes,
        "recovery_date": str(i.recovery_date) if i.recovery_date else None,
        "estimated_recovery_date": str(i.estimated_recovery_date) if i.estimated_recovery_date else None,
        "is_active": i.recovery_date is None,
        "created_at": str(i.created_at) if i.created_at else None,
    }


@router.get("/injuries")
def get_injuries(active_only: bool = False, limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(InjuryLog)
    if active_only:
        q = q.filter(InjuryLog.recovery_date == None)
    return [_injury_dict(i) for i in q.order_by(InjuryLog.date.desc()).limit(limit).all()]


@router.get("/injuries/active")
def get_active_injuries(db: Session = Depends(get_db)):
    """Return currently active (unrecovered) injuries."""
    injuries = db.query(InjuryLog).filter(
        InjuryLog.recovery_date == None
    ).order_by(InjuryLog.severity.desc(), InjuryLog.date.desc()).all()
    return [_injury_dict(i) for i in injuries]


@router.post("/injuries")
def create_injury(data: InjuryCreate, db: Session = Depends(get_db)):
    i = InjuryLog(**data.dict())
    db.add(i)
    db.commit()
    db.refresh(i)
    return _injury_dict(i)


@router.patch("/injuries/{injury_id}")
def update_injury(injury_id: int, data: InjuryUpdate, db: Session = Depends(get_db)):
    i = db.query(InjuryLog).filter(InjuryLog.id == injury_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Injury not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(i, k, v)
    db.commit()
    db.refresh(i)
    return _injury_dict(i)


@router.delete("/injuries/{injury_id}")
def delete_injury(injury_id: int, db: Session = Depends(get_db)):
    i = db.query(InjuryLog).filter(InjuryLog.id == injury_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Injury not found")
    db.delete(i)
    db.commit()
    return {"ok": True}


# ─────────────────────────────────────────────
# Fitness Progression  (H2.02)
# ─────────────────────────────────────────────

@router.get("/progression/exercises")
def list_exercises(db: Session = Depends(get_db)):
    """Return distinct exercise names ordered by frequency (most-logged first)."""
    rows = (
        db.query(WorkoutExercise.name, func.count(WorkoutExercise.id).label("cnt"))
        .group_by(WorkoutExercise.name)
        .order_by(func.count(WorkoutExercise.id).desc())
        .all()
    )
    return [{"name": r.name, "sessions": r.cnt} for r in rows]


@router.get("/progression/strength")
def strength_progression(
    exercise: str,
    weeks: int = 16,
    db: Session = Depends(get_db),
):
    """
    For a given exercise, return the best set (highest weight) per workout session
    over the last `weeks` weeks, with PR markers.
    """
    from datetime import timedelta

    today = date.today()
    since = today - timedelta(weeks=weeks)

    # Join exercise to workout to get the date
    rows = (
        db.query(WorkoutExercise, Workout.date)
        .join(Workout, WorkoutExercise.workout_id == Workout.id)
        .filter(
            WorkoutExercise.name == exercise,
            Workout.date >= since,
        )
        .order_by(Workout.date.asc())
        .all()
    )

    if not rows:
        return {"exercise": exercise, "sessions": [], "pr_weight": None, "pr_date": None}

    # Group by session date — pick best set (highest weight)
    from collections import defaultdict
    by_date: dict = defaultdict(list)
    for ex, d in rows:
        by_date[str(d)].append(ex)

    sessions = []
    running_pr = 0.0

    for d_str in sorted(by_date.keys()):
        exs = by_date[d_str]
        # Best set = highest weight_lbs; if tied, prefer most reps
        valid = [e for e in exs if e.weight_lbs is not None]
        if not valid:
            continue
        best = max(valid, key=lambda e: (e.weight_lbs or 0, e.reps or 0))
        total_volume = sum((e.weight_lbs or 0) * (e.reps or 0) * (e.sets or 1) for e in exs)
        is_pr = (best.weight_lbs or 0) > running_pr
        if is_pr:
            running_pr = best.weight_lbs or 0
        d_obj = date.fromisoformat(d_str)
        sessions.append({
            "date": d_str,
            "label": d_obj.strftime("%-m/%-d"),
            "week": d_obj.strftime("%Y-W%U"),
            "best_weight": best.weight_lbs,
            "best_reps": best.reps,
            "best_sets": best.sets,
            "total_volume": round(total_volume, 1),
            "is_pr": is_pr,
        })

    pr_session = max(sessions, key=lambda s: s["best_weight"] or 0) if sessions else None
    return {
        "exercise": exercise,
        "sessions": sessions,
        "pr_weight": pr_session["best_weight"] if pr_session else None,
        "pr_date": pr_session["date"] if pr_session else None,
        "total_sessions": len(sessions),
    }


@router.get("/progression/cardio")
def cardio_progression(weeks: int = 16, db: Session = Depends(get_db)):
    """
    Return all cardio workouts over the last `weeks` weeks with duration and calories,
    grouped for trend visualization.
    """
    from datetime import timedelta
    from collections import defaultdict

    today = date.today()
    since = today - timedelta(weeks=weeks)

    workouts = (
        db.query(Workout)
        .filter(Workout.type == "cardio", Workout.date >= since)
        .order_by(Workout.date.asc())
        .all()
    )

    sessions = []
    for w in workouts:
        d_obj = w.date
        sessions.append({
            "date": str(d_obj),
            "label": d_obj.strftime("%-m/%-d"),
            "title": w.title,
            "duration_min": w.duration_min,
            "calories_burned": w.calories_burned,
            "notes": w.notes,
        })

    # Weekly aggregates
    by_week: dict = defaultdict(list)
    for s in sessions:
        d = date.fromisoformat(s["date"])
        wk = d.strftime("%Y-W%U")
        by_week[wk].append(s)

    weekly = []
    for wk in sorted(by_week.keys()):
        items = by_week[wk]
        # label = start of week
        avg_dur = sum(s["duration_min"] or 0 for s in items) / len(items)
        total_dur = sum(s["duration_min"] or 0 for s in items)
        weekly.append({
            "week": wk,
            "sessions": len(items),
            "total_duration_min": round(total_dur, 0),
            "avg_duration_min": round(avg_dur, 1),
        })

    if sessions:
        avg_dur_all = sum(s["duration_min"] or 0 for s in sessions) / len(sessions)
        best_session = max(sessions, key=lambda s: s["duration_min"] or 0)
    else:
        avg_dur_all = None
        best_session = None

    return {
        "sessions": sessions,
        "weekly": weekly,
        "total_sessions": len(sessions),
        "avg_duration_min": round(avg_dur_all, 1) if avg_dur_all else None,
        "best_session": best_session,
    }


# ─────────────────────────────────────────────
# H2.02 — Fitness endpoint aliases (spec-aligned paths)
# The canonical implementations live at /progression/exercises and /progression/strength.
# These aliases expose the spec-required paths for external callers / API tests.
# ─────────────────────────────────────────────

@router.get("/fitness/exercises")
def list_fitness_exercises(db: Session = Depends(get_db)):
    """Alias for /progression/exercises — list distinct exercise names by frequency."""
    rows = (
        db.query(WorkoutExercise.name, func.count(WorkoutExercise.id).label("cnt"))
        .group_by(WorkoutExercise.name)
        .order_by(func.count(WorkoutExercise.id).desc())
        .all()
    )
    return [{"name": r.name, "sessions": r.cnt} for r in rows]


@router.get("/fitness/progression")
def fitness_progression(
    exercise: str,
    weeks: int = 16,
    db: Session = Depends(get_db),
):
    """
    Alias for /progression/strength — time series of {date, max_weight, max_reps, volume}
    for the given exercise, sorted by date ascending.
    """
    from datetime import timedelta
    from collections import defaultdict

    today = date.today()
    since = today - timedelta(weeks=weeks)

    rows = (
        db.query(WorkoutExercise, Workout.date)
        .join(Workout, WorkoutExercise.workout_id == Workout.id)
        .filter(
            WorkoutExercise.name == exercise,
            Workout.date >= since,
        )
        .order_by(Workout.date.asc())
        .all()
    )

    if not rows:
        return {"exercise": exercise, "series": [], "pr_weight": None, "pr_date": None}

    by_date: dict = defaultdict(list)
    for ex, d in rows:
        by_date[str(d)].append(ex)

    series = []
    running_pr = 0.0
    for d_str in sorted(by_date.keys()):
        exs = by_date[d_str]
        valid = [e for e in exs if e.weight_lbs is not None]
        best = max(valid, key=lambda e: (e.weight_lbs or 0, e.reps or 0)) if valid else None
        volume = round(sum((e.weight_lbs or 0) * (e.reps or 0) * (e.sets or 1) for e in exs), 1)
        max_weight = best.weight_lbs if best else None
        max_reps = best.reps if best else None
        is_pr = max_weight is not None and max_weight > running_pr
        if is_pr:
            running_pr = max_weight
        series.append({
            "date": d_str,
            "max_weight": max_weight,
            "max_reps": max_reps,
            "volume": volume,
            "is_pr": is_pr,
        })

    pr_entry = max(series, key=lambda s: s["max_weight"] or 0) if series else None
    return {
        "exercise": exercise,
        "series": series,
        "pr_weight": pr_entry["max_weight"] if pr_entry else None,
        "pr_date": pr_entry["date"] if pr_entry else None,
        "total_sessions": len(series),
    }
