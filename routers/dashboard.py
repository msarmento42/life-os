from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.decisions import Decision
from models.finance import SavingsGoal
from models.projects import KeyResult, Objective
from models.time_tracking import TimeBlock
from models.trading import Strategy, Trade

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _round(value, places=2):
    if value is None:
        return None
    return round(float(value), places)


def _date_only(value):
    if isinstance(value, datetime):
        return value.date()
    return value


def _safe_date_text(value):
    value = _date_only(value)
    return value.isoformat() if value else None


def _empty_time_alignment():
    return {"by_category": [], "top_misaligned": None}


def _empty_decision_hit_rate(total_resolved=0):
    return {
        "total_resolved": total_resolved,
        "hit_rate": None,
        "by_stakes": [],
        "by_type": [],
        "best_domain": None,
        "worst_domain": None,
        "message": "Need at least 3 resolved decisions for analysis",
    }


def _okr_progress(db: Session, today: date):
    try:
        objectives = db.query(Objective).order_by(Objective.year.desc(), Objective.quarter.desc()).all()
    except Exception:
        return []

    ending_cutoff = today + timedelta(days=14)
    rows = []
    for objective in objectives:
        try:
            key_results = db.query(KeyResult).filter(KeyResult.objective_id == objective.id).all()
        except Exception:
            key_results = []

        serialized_krs = []
        pct_total = 0
        for kr in key_results:
            target = float(kr.target_value or 0)
            current = float(kr.current_value or 0)
            pct = min(current / target * 100, 100) if target > 0 else 0
            pct_total += pct
            serialized_krs.append({
                "id": kr.id,
                "title": kr.title,
                "target_value": target,
                "current_value": current,
                "unit": kr.unit or "",
                "pct": _round(pct, 1),
                "due_date": _safe_date_text(kr.due_date),
                "status": kr.status,
            })

        due_dates = [_date_only(kr.due_date) for kr in key_results if kr.due_date]
        ending_soon = objective.status == "active" and any(due <= ending_cutoff for due in due_dates)
        rows.append({
            "id": objective.id,
            "title": objective.title,
            "status": objective.status,
            "quarter": objective.quarter,
            "year": objective.year,
            "pct": _round(pct_total / len(key_results), 1) if key_results else 0,
            "key_results": serialized_krs,
            "ending_soon": ending_soon,
            "post_mortem_needed": objective.status in ("completed", "abandoned"),
        })
    return rows


def _savings_goals(db: Session, today: date):
    try:
        goals = db.query(SavingsGoal).order_by(SavingsGoal.created_at.desc()).all()
    except Exception:
        return []

    rows = []
    for goal in goals:
        created_at = _date_only(goal.created_at) or today
        target_date = _date_only(goal.target_date)
        target = float(goal.target_amount or 0)
        current = float(goal.current_amount or 0)
        months_elapsed = max((today - created_at).days / 30.0, 1)
        monthly_velocity = current / months_elapsed
        remaining = max(target - current, 0)
        months_to_goal = remaining / monthly_velocity if monthly_velocity > 0 and remaining > 0 else None
        months_until_target = max((target_date - today).days / 30.0, 1) if target_date else None
        required_rate = remaining / months_until_target if months_until_target else 0
        on_track = monthly_velocity >= required_rate if target_date else current >= target
        rows.append({
            "id": goal.id,
            "title": goal.name,
            "target_amount": _round(target),
            "current_amount": _round(current),
            "pct_funded": _round(min(current / target * 100, 100), 1) if target > 0 else 0,
            "monthly_velocity": _round(monthly_velocity),
            "months_to_goal": _round(months_to_goal, 1),
            "target_date": _safe_date_text(target_date),
            "on_track": bool(on_track),
        })
    return rows


def _time_alignment(db: Session, quarter_start: date):
    try:
        rows = db.query(
            TimeBlock.category,
            TimeBlock.planned,
            func.sum(TimeBlock.duration_min).label("minutes"),
        ).filter(TimeBlock.date >= quarter_start).group_by(TimeBlock.category, TimeBlock.planned).all()
    except Exception:
        return _empty_time_alignment()

    buckets = {}
    for category, planned, minutes in rows:
        key = category or "uncategorized"
        buckets.setdefault(key, {"category": key, "planned_min": 0, "actual_min": 0})
        if planned:
            buckets[key]["planned_min"] += minutes or 0
        else:
            buckets[key]["actual_min"] += minutes or 0

    categories = []
    top_misaligned = None
    biggest_gap = -1
    for item in buckets.values():
        planned_min = item["planned_min"]
        actual_min = item["actual_min"]
        gap = abs(actual_min - planned_min)
        if gap > biggest_gap:
            biggest_gap = gap
            top_misaligned = item["category"]
        categories.append({
            "category": item["category"],
            "planned_hours": _round(planned_min / 60.0),
            "actual_hours": _round(actual_min / 60.0),
            "alignment_pct": _round(actual_min / planned_min * 100, 1) if planned_min else None,
        })

    categories.sort(key=lambda item: item["actual_hours"], reverse=True)
    return {"by_category": categories, "top_misaligned": top_misaligned if categories else None}


def _trading_review(db: Session, quarter_start: date):
    try:
        strategies = db.query(Strategy).order_by(Strategy.name.asc()).all()
    except Exception:
        return []

    rows = []
    for strategy in strategies:
        try:
            trades = db.query(Trade).filter(
                Trade.strategy_id == strategy.id,
                Trade.date >= quarter_start,
            ).all()
        except Exception:
            trades = []

        pnl_values = [float(trade.pnl or 0) for trade in trades]
        trade_count = len(pnl_values)
        wins = sum(1 for pnl in pnl_values if pnl > 0)
        total_pnl = sum(pnl_values)
        win_rate = wins / trade_count if trade_count else None
        avg_pnl = total_pnl / trade_count if trade_count else 0
        if win_rate is not None and win_rate >= 0.55 and total_pnl > 0:
            verdict = "strong"
        elif (win_rate is not None and win_rate < 0.45) or total_pnl < 0:
            verdict = "weak"
        else:
            verdict = "mixed"

        rows.append({
            "id": strategy.id,
            "name": strategy.name,
            "trade_count": trade_count,
            "win_rate": _round(win_rate * 100, 1) if win_rate is not None else None,
            "avg_pnl": _round(avg_pnl),
            "total_pnl": _round(total_pnl),
            "verdict": verdict,
        })
    rows.sort(key=lambda item: item["total_pnl"] or 0, reverse=True)
    return rows


def _group_hit_rate(decisions, attr):
    groups = {}
    for decision in decisions:
        key = getattr(decision, attr, None) or "unspecified"
        groups.setdefault(key, {"domain": key, "total": 0, "correct": 0})
        groups[key]["total"] += 1
        groups[key]["correct"] += 1 if (decision.decision_quality or 0) >= 7 else 0
    return [
        {**item, "hit_rate": _round(item["correct"] / item["total"] * 100, 1) if item["total"] else None}
        for item in groups.values()
    ]


def _decision_hit_rate(db: Session, quarter_start: date):
    try:
        decisions = db.query(Decision).filter(
            Decision.status == "resolved",
            Decision.resolved_at >= quarter_start,
        ).all()
    except Exception:
        return _empty_decision_hit_rate()

    total = len(decisions)
    if total < 3:
        return _empty_decision_hit_rate(total)

    correct = sum(1 for decision in decisions if (decision.decision_quality or 0) >= 7)
    by_stakes = _group_hit_rate(decisions, "stakes")
    by_type = _group_hit_rate(decisions, "decision_type")
    ranked = sorted(by_type, key=lambda item: item["hit_rate"] or 0, reverse=True)
    return {
        "total_resolved": total,
        "hit_rate": _round(correct / total * 100, 1),
        "by_stakes": by_stakes,
        "by_type": by_type,
        "best_domain": ranked[0]["domain"] if ranked else None,
        "worst_domain": ranked[-1]["domain"] if ranked else None,
    }


@router.get("/quarterly")
def get_quarterly_dashboard(db: Session = Depends(get_db)):
    today = date.today()
    quarter_start = today - timedelta(days=89)
    return {
        "okr_progress": _okr_progress(db, today),
        "savings_goals": _savings_goals(db, today),
        "time_alignment": _time_alignment(db, quarter_start),
        "trading_review": _trading_review(db, quarter_start),
        "decision_hit_rate": _decision_hit_rate(db, quarter_start),
    }
