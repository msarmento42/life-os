"""Decision Journal router — CRUD + analytics + pending review queue."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import date, datetime, timedelta
from pydantic import BaseModel
from collections import defaultdict

from database import get_db
from models.decisions import Decision, DecisionTag

router = APIRouter(prefix="/api/decisions", tags=["decisions"])

# ── Constants ─────────────────────────────────────────────────────────────────

STAKES_ORDER = {"low": 1, "medium": 2, "high": 3, "critical": 4}

STAKES_COLORS = {
    "low":      "#6b7280",
    "medium":   "#f59e0b",
    "high":     "#f97316",
    "critical": "#ef4444",
}

TYPE_COLORS = {
    "financial":    "#10b981",
    "career":       "#6366f1",
    "health":       "#ef4444",
    "relationship": "#ec4899",
    "strategic":    "#8b5cf6",
    "personal":     "#14b8a6",
    "other":        "#6b7280",
}


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class DecisionCreate(BaseModel):
    date: date
    title: str
    description: Optional[str] = None
    stakes: str = "medium"
    decision_type: str = "personal"
    reasoning: Optional[str] = None
    confidence: Optional[int] = None
    predicted_outcome: Optional[str] = None
    outcome_date: Optional[date] = None
    actual_outcome: Optional[str] = None
    decision_quality: Optional[int] = None
    lesson: Optional[str] = None
    status: str = "open"
    module_type: Optional[str] = None
    module_id: Optional[int] = None
    tags: List[str] = []


class DecisionUpdate(BaseModel):
    date: Optional[date] = None
    title: Optional[str] = None
    description: Optional[str] = None
    stakes: Optional[str] = None
    decision_type: Optional[str] = None
    reasoning: Optional[str] = None
    confidence: Optional[int] = None
    predicted_outcome: Optional[str] = None
    outcome_date: Optional[date] = None
    actual_outcome: Optional[str] = None
    decision_quality: Optional[int] = None
    lesson: Optional[str] = None
    status: Optional[str] = None
    module_type: Optional[str] = None
    module_id: Optional[int] = None
    tags: Optional[List[str]] = None


# ── Serializer ────────────────────────────────────────────────────────────────

def decision_to_dict(d: Decision) -> dict:
    today = date.today()
    is_overdue = (
        d.status == "open"
        and d.outcome_date is not None
        and d.outcome_date < today
    )
    return {
        "id":               d.id,
        "date":             d.date.isoformat() if d.date else None,
        "title":            d.title,
        "description":      d.description,
        "stakes":           d.stakes,
        "stakes_color":     STAKES_COLORS.get(d.stakes, "#6b7280"),
        "decision_type":    d.decision_type,
        "type_color":       TYPE_COLORS.get(d.decision_type, "#6b7280"),
        "reasoning":        d.reasoning,
        "confidence":       d.confidence,
        "predicted_outcome": d.predicted_outcome,
        "outcome_date":     d.outcome_date.isoformat() if d.outcome_date else None,
        "actual_outcome":   d.actual_outcome,
        "decision_quality": d.decision_quality,
        "lesson":           d.lesson,
        "status":           d.status,
        "module_type":      d.module_type,
        "module_id":        d.module_id,
        "tags":             [t.tag for t in d.tags],
        "is_overdue":       is_overdue,
        "created_at":       d.created_at.isoformat() if d.created_at else None,
        "resolved_at":      d.resolved_at.isoformat() if d.resolved_at else None,
    }


# ── CRUD endpoints ────────────────────────────────────────────────────────────

@router.get("/")
def list_decisions(
    status: Optional[str] = None,
    stakes: Optional[str] = None,
    decision_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List decisions, optionally filtered by status / stakes / type."""
    q = db.query(Decision)
    if status:
        q = q.filter(Decision.status == status)
    if stakes:
        q = q.filter(Decision.stakes == stakes)
    if decision_type:
        q = q.filter(Decision.decision_type == decision_type)
    decisions = q.order_by(Decision.date.desc()).all()
    return [decision_to_dict(d) for d in decisions]


@router.get("/pending-review")
def pending_review(db: Session = Depends(get_db)):
    """Open decisions whose outcome_date has passed but are not yet resolved."""
    today = date.today()
    decisions = (
        db.query(Decision)
        .filter(
            Decision.status == "open",
            Decision.outcome_date != None,
            Decision.outcome_date < today,
        )
        .order_by(Decision.outcome_date.asc())
        .all()
    )
    return [decision_to_dict(d) for d in decisions]


@router.get("/analytics")
def analytics(db: Session = Depends(get_db)):
    """
    Hit rate by confidence band, by domain, by stakes level.
    'Hit' = resolved with decision_quality >= 7 (good outcome on good process).
    """
    resolved = (
        db.query(Decision)
        .filter(Decision.status == "resolved", Decision.decision_quality != None)
        .all()
    )

    # ── By confidence band ────────────────────────────────────────────────────
    bands = {"1-3": [], "4-6": [], "7-9": [], "10": []}
    for d in resolved:
        c = d.confidence or 5
        if c <= 3:   bands["1-3"].append(d.decision_quality)
        elif c <= 6: bands["4-6"].append(d.decision_quality)
        elif c <= 9: bands["7-9"].append(d.decision_quality)
        else:        bands["10"].append(d.decision_quality)

    confidence_chart = []
    for band, qualities in bands.items():
        if qualities:
            avg_q = round(sum(qualities) / len(qualities), 1)
            confidence_chart.append({
                "band": band,
                "avg_quality": avg_q,
                "count": len(qualities),
                "hit_rate": round(sum(1 for q in qualities if q >= 7) / len(qualities) * 100, 1),
            })

    # ── By domain (decision_type) ─────────────────────────────────────────────
    by_type: dict[str, list] = defaultdict(list)
    for d in resolved:
        by_type[d.decision_type].append(d.decision_quality)

    type_chart = [
        {
            "type": dt,
            "avg_quality": round(sum(qs) / len(qs), 1),
            "count": len(qs),
            "hit_rate": round(sum(1 for q in qs if q >= 7) / len(qs) * 100, 1),
            "color": TYPE_COLORS.get(dt, "#6b7280"),
        }
        for dt, qs in sorted(by_type.items(), key=lambda x: -len(x[1]))
    ]

    # ── By stakes ─────────────────────────────────────────────────────────────
    by_stakes: dict[str, list] = defaultdict(list)
    for d in resolved:
        by_stakes[d.stakes].append(d.decision_quality)

    stakes_chart = [
        {
            "stakes": s,
            "avg_quality": round(sum(qs) / len(qs), 1),
            "count": len(qs),
            "hit_rate": round(sum(1 for q in qs if q >= 7) / len(qs) * 100, 1),
            "color": STAKES_COLORS.get(s, "#6b7280"),
            "order": STAKES_ORDER.get(s, 0),
        }
        for s, qs in by_stakes.items()
    ]
    stakes_chart.sort(key=lambda x: x["order"])

    # ── Summary ───────────────────────────────────────────────────────────────
    all_decisions = db.query(Decision).all()
    total        = len(all_decisions)
    open_count   = sum(1 for d in all_decisions if d.status == "open")
    resolved_cnt = sum(1 for d in all_decisions if d.status == "resolved")
    pending_cnt  = sum(
        1 for d in all_decisions
        if d.status == "open" and d.outcome_date and d.outcome_date < date.today()
    )
    overall_hit_rate = None
    if resolved:
        hits = sum(1 for d in resolved if d.decision_quality and d.decision_quality >= 7)
        overall_hit_rate = round(hits / len(resolved) * 100, 1)

    avg_confidence = None
    conf_vals = [d.confidence for d in all_decisions if d.confidence]
    if conf_vals:
        avg_confidence = round(sum(conf_vals) / len(conf_vals), 1)

    return {
        "summary": {
            "total":            total,
            "open":             open_count,
            "resolved":         resolved_cnt,
            "pending_review":   pending_cnt,
            "overall_hit_rate": overall_hit_rate,
            "avg_confidence":   avg_confidence,
        },
        "by_confidence": confidence_chart,
        "by_type":       type_chart,
        "by_stakes":     stakes_chart,
    }


@router.get("/{decision_id}")
def get_decision(decision_id: int, db: Session = Depends(get_db)):
    d = db.query(Decision).filter(Decision.id == decision_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision_to_dict(d)


@router.post("/", status_code=201)
def create_decision(data: DecisionCreate, db: Session = Depends(get_db)):
    tags = data.tags
    d_data = data.dict(exclude={"tags"})
    d = Decision(**d_data)
    db.add(d)
    db.flush()
    for tag in tags:
        db.add(DecisionTag(decision_id=d.id, tag=tag.strip().lower()))
    db.commit()
    db.refresh(d)
    return decision_to_dict(d)


@router.patch("/{decision_id}")
def update_decision(decision_id: int, data: DecisionUpdate, db: Session = Depends(get_db)):
    d = db.query(Decision).filter(Decision.id == decision_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Decision not found")

    updates = data.dict(exclude_unset=True)
    tags = updates.pop("tags", None)

    # Auto-set resolved_at when status transitions to resolved
    if updates.get("status") == "resolved" and d.status != "resolved":
        d.resolved_at = datetime.utcnow()
    elif updates.get("status") == "open":
        d.resolved_at = None

    for field, value in updates.items():
        setattr(d, field, value)

    # Replace tags if provided
    if tags is not None:
        for t in d.tags:
            db.delete(t)
        db.flush()
        for tag in tags:
            db.add(DecisionTag(decision_id=d.id, tag=tag.strip().lower()))

    db.commit()
    db.refresh(d)
    return decision_to_dict(d)


@router.delete("/{decision_id}", status_code=204)
def delete_decision(decision_id: int, db: Session = Depends(get_db)):
    d = db.query(Decision).filter(Decision.id == decision_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Decision not found")
    db.delete(d)
    db.commit()
