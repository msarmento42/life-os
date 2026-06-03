"""Time & Attention router — CRUD + daily/weekly aggregation endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import date, datetime, timedelta
from pydantic import BaseModel

from database import get_db
from models.time_tracking import TimeBlock, FocusLog

router = APIRouter(prefix="/api/time", tags=["time"])

# ── Categories ────────────────────────────────────────────────────────────────

CATEGORIES = [
    "deep_work", "meetings", "admin", "health",
    "social", "leisure", "recovery", "learning",
]

CATEGORY_COLORS = {
    "deep_work":  "#6366f1",   # indigo
    "meetings":   "#f59e0b",   # amber
    "admin":      "#6b7280",   # gray
    "health":     "#ef4444",   # red
    "social":     "#ec4899",   # pink
    "leisure":    "#8b5cf6",   # violet
    "recovery":   "#14b8a6",   # teal
    "learning":   "#10b981",   # emerald
}


# ── Pydantic schemas ──────────────────────────────────────────────────────────

def _duration(start: str, end: str) -> int:
    """Compute duration in minutes from HH:MM strings. Handles overnight blocks."""
    sh, sm = map(int, start.split(":"))
    eh, em = map(int, end.split(":"))
    mins = (eh * 60 + em) - (sh * 60 + sm)
    if mins < 0:
        mins += 24 * 60
    return mins


class TimeBlockCreate(BaseModel):
    date: date
    start_time: str            # "HH:MM"
    end_time: str              # "HH:MM"
    category: str = "deep_work"
    subcategory: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    project_id: Optional[int] = None
    energy_start: Optional[int] = None
    energy_end: Optional[int] = None
    planned: bool = False


class TimeBlockUpdate(BaseModel):
    date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    project_id: Optional[int] = None
    energy_start: Optional[int] = None
    energy_end: Optional[int] = None
    planned: Optional[bool] = None


class FocusLogCreate(BaseModel):
    date: date
    primary_focus: Optional[str] = None
    distractions: Optional[str] = None
    energy_drain: Optional[str] = None
    energy_boost: Optional[str] = None
    deep_work_hrs: Optional[float] = None
    overall_score: Optional[int] = None
    notes: Optional[str] = None


# ── Serializers ───────────────────────────────────────────────────────────────

def block_to_dict(b: TimeBlock) -> dict:
    return {
        "id":           b.id,
        "date":         b.date.isoformat() if b.date else None,
        "start_time":   b.start_time,
        "end_time":     b.end_time,
        "duration_min": b.duration_min,
        "category":     b.category,
        "subcategory":  b.subcategory,
        "title":        b.title,
        "notes":        b.notes,
        "project_id":   b.project_id,
        "project_title": b.project.title if b.project else None,
        "energy_start": b.energy_start,
        "energy_end":   b.energy_end,
        "planned":      b.planned,
        "color":        CATEGORY_COLORS.get(b.category, "#6b7280"),
        "created_at":   b.created_at.isoformat() if b.created_at else None,
    }


def focus_to_dict(f: FocusLog) -> dict:
    return {
        "id":            f.id,
        "date":          f.date.isoformat() if f.date else None,
        "primary_focus": f.primary_focus,
        "distractions":  f.distractions,
        "energy_drain":  f.energy_drain,
        "energy_boost":  f.energy_boost,
        "deep_work_hrs": f.deep_work_hrs,
        "overall_score": f.overall_score,
        "notes":         f.notes,
        "created_at":    f.created_at.isoformat() if f.created_at else None,
    }


# ── Time Block endpoints ──────────────────────────────────────────────────────

@router.get("/blocks")
def get_blocks(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    category: Optional[str] = None,
    planned: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """List time blocks, optionally filtered by date range and category."""
    q = db.query(TimeBlock)
    if date_from:
        q = q.filter(TimeBlock.date >= date_from)
    if date_to:
        q = q.filter(TimeBlock.date <= date_to)
    if category:
        q = q.filter(TimeBlock.category == category)
    if planned is not None:
        q = q.filter(TimeBlock.planned == planned)
    blocks = q.order_by(TimeBlock.date.desc(), TimeBlock.start_time.asc()).all()
    return [block_to_dict(b) for b in blocks]


@router.get("/blocks/day/{day}")
def get_day_blocks(day: date, db: Session = Depends(get_db)):
    """Return all time blocks for a specific date, sorted by start time."""
    blocks = (
        db.query(TimeBlock)
        .filter(TimeBlock.date == day)
        .order_by(TimeBlock.start_time.asc())
        .all()
    )
    return [block_to_dict(b) for b in blocks]


@router.post("/blocks", status_code=201)
def create_block(data: TimeBlockCreate, db: Session = Depends(get_db)):
    duration = _duration(data.start_time, data.end_time)
    b = TimeBlock(**data.dict(), duration_min=duration)
    db.add(b)
    db.commit()
    db.refresh(b)
    return block_to_dict(b)


@router.patch("/blocks/{block_id}")
def update_block(block_id: int, data: TimeBlockUpdate, db: Session = Depends(get_db)):
    b = db.query(TimeBlock).filter(TimeBlock.id == block_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Time block not found")
    updates = data.dict(exclude_unset=True)
    for field, value in updates.items():
        setattr(b, field, value)
    # Recompute duration if times changed
    if "start_time" in updates or "end_time" in updates:
        b.duration_min = _duration(b.start_time, b.end_time)
    db.commit()
    db.refresh(b)
    return block_to_dict(b)


@router.delete("/blocks/{block_id}", status_code=204)
def delete_block(block_id: int, db: Session = Depends(get_db)):
    b = db.query(TimeBlock).filter(TimeBlock.id == block_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Time block not found")
    db.delete(b)
    db.commit()


# ── Focus Log endpoints ───────────────────────────────────────────────────────

@router.get("/focus")
def get_focus_logs(days: int = 30, db: Session = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    logs = (
        db.query(FocusLog)
        .filter(FocusLog.date >= since)
        .order_by(FocusLog.date.desc())
        .all()
    )
    return [focus_to_dict(f) for f in logs]


@router.get("/focus/{log_date}")
def get_focus_log_by_date(log_date: date, db: Session = Depends(get_db)):
    f = db.query(FocusLog).filter(FocusLog.date == log_date).first()
    if not f:
        raise HTTPException(status_code=404, detail="Focus log not found")
    return focus_to_dict(f)


@router.post("/focus", status_code=201)
def upsert_focus_log(data: FocusLogCreate, db: Session = Depends(get_db)):
    """Upsert — one focus log per day."""
    existing = db.query(FocusLog).filter(FocusLog.date == data.date).first()
    if existing:
        for k, v in data.dict(exclude_unset=True).items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return focus_to_dict(existing)
    f = FocusLog(**data.dict())
    db.add(f)
    db.commit()
    db.refresh(f)
    return focus_to_dict(f)


@router.delete("/focus/{log_id}", status_code=204)
def delete_focus_log(log_id: int, db: Session = Depends(get_db)):
    f = db.query(FocusLog).filter(FocusLog.id == log_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Focus log not found")
    db.delete(f)
    db.commit()


# ── Aggregation endpoints ─────────────────────────────────────────────────────

@router.get("/summary/daily/{day}")
def daily_summary(day: date, db: Session = Depends(get_db)):
    """Per-category breakdown for a single day, plus focus log if present."""
    blocks = db.query(TimeBlock).filter(TimeBlock.date == day).all()
    focus  = db.query(FocusLog).filter(FocusLog.date == day).first()

    by_category: dict[str, int] = {}
    for b in blocks:
        by_category[b.category] = by_category.get(b.category, 0) + (b.duration_min or 0)

    total_min = sum(by_category.values())

    breakdown = [
        {
            "category": cat,
            "minutes":  mins,
            "hours":    round(mins / 60, 2),
            "pct":      round(mins / total_min * 100, 1) if total_min else 0,
            "color":    CATEGORY_COLORS.get(cat, "#6b7280"),
        }
        for cat, mins in sorted(by_category.items(), key=lambda x: -x[1])
    ]

    return {
        "date":        day.isoformat(),
        "total_min":   total_min,
        "total_hrs":   round(total_min / 60, 2),
        "blocks":      [block_to_dict(b) for b in sorted(blocks, key=lambda x: x.start_time)],
        "breakdown":   breakdown,
        "focus_log":   focus_to_dict(focus) if focus else None,
    }


@router.get("/summary/weekly")
def weekly_summary(week_start: Optional[date] = None, db: Session = Depends(get_db)):
    """7-day breakdown: per-category totals, planned vs. actual, daily totals."""
    if week_start is None:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())  # Monday
    week_end = week_start + timedelta(days=6)

    blocks = (
        db.query(TimeBlock)
        .filter(TimeBlock.date >= week_start, TimeBlock.date <= week_end)
        .all()
    )
    focus_logs = (
        db.query(FocusLog)
        .filter(FocusLog.date >= week_start, FocusLog.date <= week_end)
        .all()
    )

    # Category totals
    by_category: dict[str, dict] = {}
    planned_by_cat: dict[str, int] = {}
    actual_by_cat: dict[str, int] = {}

    for b in blocks:
        mins = b.duration_min or 0
        if b.category not in by_category:
            by_category[b.category] = {"planned": 0, "actual": 0}
        if b.planned:
            by_category[b.category]["planned"] += mins
            planned_by_cat[b.category] = planned_by_cat.get(b.category, 0) + mins
        else:
            by_category[b.category]["actual"] += mins
            actual_by_cat[b.category] = actual_by_cat.get(b.category, 0) + mins

    # Daily totals
    daily: dict[str, int] = {}
    for b in blocks:
        d = b.date.isoformat()
        daily[d] = daily.get(d, 0) + (b.duration_min or 0)

    # Fill in all 7 days (even zeros)
    daily_series = []
    for i in range(7):
        d = week_start + timedelta(days=i)
        daily_series.append({"date": d.isoformat(), "minutes": daily.get(d.isoformat(), 0)})

    total_min = sum(b.duration_min or 0 for b in blocks)
    deep_work_min = sum(b.duration_min or 0 for b in blocks if b.category == "deep_work")
    avg_focus = None
    scores = [f.overall_score for f in focus_logs if f.overall_score]
    if scores:
        avg_focus = round(sum(scores) / len(scores), 1)

    pie_data = [
        {
            "category": cat,
            "minutes":  vals["planned"] + vals["actual"],
            "planned":  vals["planned"],
            "actual":   vals["actual"],
            "color":    CATEGORY_COLORS.get(cat, "#6b7280"),
        }
        for cat, vals in sorted(by_category.items(), key=lambda x: -(x[1]["planned"] + x[1]["actual"]))
    ]

    return {
        "week_start":    week_start.isoformat(),
        "week_end":      week_end.isoformat(),
        "total_min":     total_min,
        "total_hrs":     round(total_min / 60, 2),
        "deep_work_min": deep_work_min,
        "deep_work_hrs": round(deep_work_min / 60, 2),
        "avg_focus_score": avg_focus,
        "pie_data":      pie_data,
        "daily_series":  daily_series,
        "focus_logs":    [focus_to_dict(f) for f in sorted(focus_logs, key=lambda x: x.date)],
    }


@router.get("/categories")
def get_categories():
    """Return available categories with display names and colors."""
    return [
        {
            "value": cat,
            "label": cat.replace("_", " ").title(),
            "color": CATEGORY_COLORS.get(cat, "#6b7280"),
        }
        for cat in CATEGORIES
    ]


# ── Distraction Patterns endpoint ─────────────────────────────────────────────

import re
from collections import defaultdict, Counter
from calendar import day_name


@router.get("/patterns")
def distraction_patterns(days: int = 30, db: Session = Depends(get_db)):
    """
    Analyze focus_logs + time_blocks over a rolling window.

    Returns:
    - top_distractions: most frequently mentioned distractions across focus logs
    - focus_by_day_of_week: avg focus score per day of week (best/worst days)
    - over_budget_categories: categories where actual consistently exceeds planned
    """
    since = date.today() - timedelta(days=days)

    focus_logs = (
        db.query(FocusLog)
        .filter(FocusLog.date >= since)
        .all()
    )
    blocks = (
        db.query(TimeBlock)
        .filter(TimeBlock.date >= since)
        .all()
    )

    # ── 1. Top distractions ──────────────────────────────────────────────────
    distraction_counter: Counter = Counter()
    logs_with_distractions = 0
    for f in focus_logs:
        if not f.distractions:
            continue
        logs_with_distractions += 1
        # Split on common separators: comma, semicolon, " and ", newline
        raw = re.split(r"[,;\n]|\band\b", f.distractions, flags=re.IGNORECASE)
        for token in raw:
            token = token.strip().strip(".").strip()
            if len(token) > 2:
                distraction_counter[token.lower().capitalize()] += 1

    total_mentions = sum(distraction_counter.values()) or 1
    top_distractions = [
        {
            "name":  name,
            "count": count,
            "pct":   round(count / logs_with_distractions * 100, 0) if logs_with_distractions else 0,
        }
        for name, count in distraction_counter.most_common(8)
    ]

    # ── 2. Focus score by day of week ────────────────────────────────────────
    dow_scores: dict[int, list] = defaultdict(list)
    for f in focus_logs:
        if f.overall_score and f.date:
            dow = f.date.weekday()          # 0=Mon … 6=Sun
            dow_scores[dow].append(f.overall_score)

    focus_by_dow = []
    for dow in range(7):
        scores = dow_scores[dow]
        if scores:
            focus_by_dow.append({
                "day":       day_name[dow][:3],   # Mon, Tue, …
                "day_index": dow,
                "avg_score": round(sum(scores) / len(scores), 1),
                "count":     len(scores),
            })
    focus_by_dow.sort(key=lambda x: x["day_index"])

    # ── 3. Over-budget categories ─────────────────────────────────────────────
    # Group blocks by category, then sum planned vs actual per date
    cat_planned: dict[str, int] = defaultdict(int)
    cat_actual:  dict[str, int] = defaultdict(int)
    days_with_data: set = set()

    for b in blocks:
        mins = b.duration_min or 0
        days_with_data.add(b.date)
        if b.planned:
            cat_planned[b.category] += mins
        else:
            cat_actual[b.category] += mins

    all_cats = set(cat_planned.keys()) | set(cat_actual.keys())
    over_budget = []
    for cat in all_cats:
        planned = cat_planned.get(cat, 0)
        actual  = cat_actual.get(cat, 0)
        if planned > 0:
            over_pct = round((actual - planned) / planned * 100, 0)
        elif actual > 0:
            over_pct = None   # No planned data — skip
        else:
            continue
        over_budget.append({
            "category":    cat,
            "label":       cat.replace("_", " ").title(),
            "color":       CATEGORY_COLORS.get(cat, "#6b7280"),
            "planned_hrs": round(planned / 60, 1),
            "actual_hrs":  round(actual  / 60, 1),
            "over_pct":    over_pct,
        })

    # Sort by over-budget % desc (only where planned data exists)
    over_budget_filtered = [x for x in over_budget if x["over_pct"] is not None]
    over_budget_filtered.sort(key=lambda x: -x["over_pct"])

    return {
        "period_days":         days,
        "logs_analyzed":       len(focus_logs),
        "logs_with_distractions": logs_with_distractions,
        "top_distractions":    top_distractions,
        "focus_by_day_of_week": focus_by_dow,
        "over_budget_categories": over_budget_filtered,
    }
