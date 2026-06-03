from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel
import statistics

from database import get_db
from models.projects import Objective, KeyResult, Project, ProjectTask, ProjectPostmortem

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ObjectiveCreate(BaseModel):
    title: str
    description: Optional[str] = None
    quarter: int
    year: int
    color: str = "#6366f1"
    status: str = "active"

class KeyResultCreate(BaseModel):
    objective_id: int
    title: str
    target_value: float = 100.0
    current_value: float = 0.0
    unit: str = "%"
    due_date: Optional[date] = None
    notes: Optional[str] = None

class KeyResultUpdate(BaseModel):
    current_value: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "active"
    color: str = "#6366f1"
    icon: str = "📁"
    due_date: Optional[date] = None
    objective_id: Optional[int] = None
    blocks_project_id: Optional[int] = None
    project_type: str = "other"

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    due_date: Optional[date] = None
    blocks_project_id: Optional[int] = None
    project_type: Optional[str] = None

class TaskCreate(BaseModel):
    project_id: int
    title: str
    due_date: Optional[date] = None
    priority: str = "medium"
    notes: Optional[str] = None
    order_index: int = 0

class TaskUpdate(BaseModel):
    is_completed: Optional[bool] = None
    title: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None

class PostmortemCreate(BaseModel):
    what_worked: str
    what_didnt: str
    key_lesson: str
    would_repeat: bool = True
    rating: int = 3

class PostmortemUpdate(BaseModel):
    what_worked: Optional[str] = None
    what_didnt: Optional[str] = None
    key_lesson: Optional[str] = None
    would_repeat: Optional[bool] = None
    rating: Optional[int] = None


def obj_dict(o: Objective) -> dict:
    krs = o.key_results
    total_progress = 0
    if krs:
        for kr in krs:
            if kr.target_value > 0:
                total_progress += (kr.current_value / kr.target_value) * 100
        overall_pct = round(total_progress / len(krs))
    else:
        overall_pct = 0
    return {
        "id": o.id, "title": o.title, "description": o.description,
        "quarter": o.quarter, "year": o.year, "color": o.color, "status": o.status,
        "overall_pct": overall_pct,
        "key_results": [{
            "id": kr.id, "title": kr.title, "target_value": kr.target_value,
            "current_value": kr.current_value, "unit": kr.unit,
            "due_date": str(kr.due_date) if kr.due_date else None,
            "status": kr.status, "notes": kr.notes,
            "pct": round((kr.current_value / kr.target_value * 100) if kr.target_value > 0 else 0),
        } for kr in krs],
    }


def proj_dict(p: Project) -> dict:
    tasks = p.tasks
    completed = sum(1 for t in tasks if t.is_completed)
    pm = p.postmortem
    postmortem = None
    if pm:
        postmortem = {
            "id": pm.id,
            "what_worked": pm.what_worked,
            "what_didnt": pm.what_didnt,
            "key_lesson": pm.key_lesson,
            "would_repeat": pm.would_repeat,
            "rating": pm.rating,
            "created_at": str(pm.created_at)[:10] if pm.created_at else None,
        }
    return {
        "id": p.id, "title": p.title, "description": p.description,
        "status": p.status, "color": p.color, "icon": p.icon,
        "due_date": str(p.due_date) if p.due_date else None,
        "objective_id": p.objective_id,
        "blocks_project_id": p.blocks_project_id,
        "project_type": p.project_type or "other",
        "completed_at": str(p.completed_at)[:10] if p.completed_at else None,
        "task_count": len(tasks), "completed_tasks": completed,
        "progress_pct": round(completed / len(tasks) * 100) if tasks else 0,
        "postmortem": postmortem,
        "needs_postmortem": p.status in ("completed", "abandoned") and pm is None,
        "tasks": [{
            "id": t.id, "title": t.title, "is_completed": t.is_completed,
            "priority": t.priority, "due_date": str(t.due_date) if t.due_date else None,
            "notes": t.notes, "order_index": t.order_index,
        } for t in tasks],
    }


# --- Objectives ---
@router.get("/objectives")
def get_objectives(quarter: Optional[int] = None, year: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Objective)
    if quarter: q = q.filter(Objective.quarter == quarter)
    if year: q = q.filter(Objective.year == year)
    return [obj_dict(o) for o in q.order_by(Objective.year.desc(), Objective.quarter.desc()).all()]

@router.post("/objectives")
def create_objective(data: ObjectiveCreate, db: Session = Depends(get_db)):
    o = Objective(**data.dict())
    db.add(o)
    db.commit()
    db.refresh(o)
    return obj_dict(o)

@router.delete("/objectives/{obj_id}")
def delete_objective(obj_id: int, db: Session = Depends(get_db)):
    o = db.query(Objective).filter(Objective.id == obj_id).first()
    if not o: raise HTTPException(status_code=404, detail="Not found")
    db.delete(o)
    db.commit()
    return {"ok": True}

@router.post("/key-results")
def create_key_result(data: KeyResultCreate, db: Session = Depends(get_db)):
    kr = KeyResult(**data.dict())
    db.add(kr)
    db.commit()
    db.refresh(kr)
    return kr

@router.put("/key-results/{kr_id}")
def update_key_result(kr_id: int, data: KeyResultUpdate, db: Session = Depends(get_db)):
    kr = db.query(KeyResult).filter(KeyResult.id == kr_id).first()
    if not kr: raise HTTPException(status_code=404, detail="Not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(kr, k, v)
    db.commit()
    db.refresh(kr)
    return kr

@router.delete("/key-results/{kr_id}")
def delete_key_result(kr_id: int, db: Session = Depends(get_db)):
    kr = db.query(KeyResult).filter(KeyResult.id == kr_id).first()
    if not kr: raise HTTPException(status_code=404, detail="Not found")
    db.delete(kr)
    db.commit()
    return {"ok": True}


# --- Projects ---
@router.get("/")
def get_projects(status: Optional[str] = None, type: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Project)
    if status: q = q.filter(Project.status == status)
    if type: q = q.filter(Project.project_type == type)
    all_projects = q.order_by(Project.created_at.desc()).all()
    result = [proj_dict(p) for p in all_projects]
    # P2.01: augment each project with blocked_by list (projects that block it)
    blocked_by_map = {}
    for p, p_data in zip(all_projects, result):
        if p.blocks_project_id:
            blocked_by_map.setdefault(p.blocks_project_id, []).append(
                {"id": p.id, "title": p.title, "icon": p.icon}
            )
    for p_data in result:
        p_data["blocked_by"] = blocked_by_map.get(p_data["id"], [])
    return result

@router.post("/")
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    p = Project(**data.dict())
    db.add(p)
    db.commit()
    db.refresh(p)
    return proj_dict(p)

@router.put("/{project_id}")
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p: raise HTTPException(status_code=404, detail="Not found")
    # Use exclude_unset so explicit None clears fields like blocks_project_id
    update_data = data.dict(exclude_unset=True)
    # P2.02: stamp completed_at when project moves into a terminal status
    new_status = update_data.get("status")
    if new_status in ("completed", "abandoned") and p.status not in ("completed", "abandoned"):
        if not p.completed_at:
            p.completed_at = datetime.utcnow()
    elif new_status in ("active", "paused", "backlog"):
        # Reactivated — clear completed_at so cycle time isn't poisoned
        p.completed_at = None
    for k, v in update_data.items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    result = proj_dict(p)
    # Re-compute blocked_by for this project
    blockers = db.query(Project).filter(Project.blocks_project_id == project_id).all()
    result["blocked_by"] = [{"id": b.id, "title": b.title, "icon": b.icon} for b in blockers]
    return result

@router.delete("/{project_id}/dependency")
def remove_dependency(project_id: int, db: Session = Depends(get_db)):
    """Clear the blocks_project_id for a project (remove its outgoing dependency)."""
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p: raise HTTPException(status_code=404, detail="Not found")
    p.blocks_project_id = None
    db.commit()
    return {"ok": True}

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p: raise HTTPException(status_code=404, detail="Not found")
    db.delete(p)
    db.commit()
    return {"ok": True}


# --- Post-mortems ---
@router.get("/{project_id}/postmortem")
def get_postmortem(project_id: int, db: Session = Depends(get_db)):
    pm = db.query(ProjectPostmortem).filter(ProjectPostmortem.project_id == project_id).first()
    if not pm: raise HTTPException(status_code=404, detail="No postmortem found")
    return {
        "id": pm.id, "project_id": pm.project_id,
        "what_worked": pm.what_worked, "what_didnt": pm.what_didnt,
        "key_lesson": pm.key_lesson, "would_repeat": pm.would_repeat,
        "rating": pm.rating,
        "created_at": str(pm.created_at)[:10] if pm.created_at else None,
    }

@router.post("/{project_id}/postmortem")
def create_postmortem(project_id: int, data: PostmortemCreate, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p: raise HTTPException(status_code=404, detail="Project not found")
    existing = db.query(ProjectPostmortem).filter(ProjectPostmortem.project_id == project_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Postmortem already exists. Use PUT to update.")
    pm = ProjectPostmortem(project_id=project_id, **data.dict())
    db.add(pm)
    db.commit()
    db.refresh(pm)
    return proj_dict(p)

@router.put("/{project_id}/postmortem")
def update_postmortem(project_id: int, data: PostmortemUpdate, db: Session = Depends(get_db)):
    pm = db.query(ProjectPostmortem).filter(ProjectPostmortem.project_id == project_id).first()
    if not pm: raise HTTPException(status_code=404, detail="No postmortem found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(pm, k, v)
    db.commit()
    db.refresh(pm)
    p = db.query(Project).filter(Project.id == project_id).first()
    return proj_dict(p)

@router.delete("/{project_id}/postmortem")
def delete_postmortem(project_id: int, db: Session = Depends(get_db)):
    pm = db.query(ProjectPostmortem).filter(ProjectPostmortem.project_id == project_id).first()
    if not pm: raise HTTPException(status_code=404, detail="No postmortem found")
    db.delete(pm)
    db.commit()
    return {"ok": True}

@router.get("/postmortems/all")
def get_all_postmortems(db: Session = Depends(get_db)):
    """Get all projects that have post-mortems, with project info."""
    pms = db.query(ProjectPostmortem).all()
    result = []
    for pm in pms:
        p = db.query(Project).filter(Project.id == pm.project_id).first()
        if p:
            result.append({
                "project_id": p.id, "project_title": p.title,
                "project_icon": p.icon, "project_status": p.status,
                "what_worked": pm.what_worked, "what_didnt": pm.what_didnt,
                "key_lesson": pm.key_lesson, "would_repeat": pm.would_repeat,
                "rating": pm.rating,
                "created_at": str(pm.created_at)[:10] if pm.created_at else None,
            })
    return result

@router.post("/tasks")
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    t = ProjectTask(**data.dict())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t

@router.put("/tasks/{task_id}")
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    t = db.query(ProjectTask).filter(ProjectTask.id == task_id).first()
    if not t: raise HTTPException(status_code=404, detail="Not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    t = db.query(ProjectTask).filter(ProjectTask.id == task_id).first()
    if not t: raise HTTPException(status_code=404, detail="Not found")
    db.delete(t)
    db.commit()
    return {"ok": True}


# ─────────────────────────────────────────────
# P2.01 — Dependency Graph
# ─────────────────────────────────────────────

@router.get("/dependency-graph")
def get_dependency_graph(db: Session = Depends(get_db)):
    """
    Returns adjacency list for project dependency visualization.
    Each node includes depends_on (projects it depends on / is blocked by)
    and blocking (projects that depend on this one / are blocked by this one).
    """
    projects = db.query(Project).all()

    # Build blocking map: blocked_project_id -> list of projects that block it
    blocking_map: dict = {}
    for p in projects:
        if p.blocks_project_id:
            blocking_map.setdefault(p.blocks_project_id, []).append(p.id)

    nodes = []
    for p in projects:
        # depends_on: projects this one is waiting on (i.e. projects that block this one)
        depends_on = [b.id for b in projects if b.blocks_project_id == p.id]
        # blocking: projects that depend on this one being done first
        blocking = [p.blocks_project_id] if p.blocks_project_id else []
        nodes.append({
            "id": p.id,
            "title": p.title,
            "status": p.status,
            "icon": p.icon,
            "color": p.color,
            "depends_on": depends_on,
            "blocking": blocking,
        })

    edges = [
        {"from": p.id, "to": p.blocks_project_id}
        for p in projects if p.blocks_project_id
    ]
    return {"nodes": nodes, "edges": edges}


class DependencyCreate(BaseModel):
    depends_on_id: int


# P2.01 — Add a dependency (this project depends on depends_on_id)
@router.post("/{project_id}/dependencies")
def add_dependency(project_id: int, data: DependencyCreate, db: Session = Depends(get_db)):
    """Mark project_id as depending on (blocked by) depends_on_id."""
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    dep = db.query(Project).filter(Project.id == data.depends_on_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency project not found")
    if data.depends_on_id == project_id:
        raise HTTPException(status_code=400, detail="A project cannot depend on itself")
    # In the FK model: dep.blocks_project_id = project_id means dep blocks this project
    dep.blocks_project_id = project_id
    db.commit()
    return {"ok": True, "project_id": project_id, "depends_on_id": data.depends_on_id}


# P2.01 — Remove a dependency
@router.delete("/{project_id}/dependencies/{dep_id}")
def remove_dependency_edge(project_id: int, dep_id: int, db: Session = Depends(get_db)):
    """Remove the dependency where project_id depends on dep_id."""
    dep = db.query(Project).filter(
        Project.id == dep_id,
        Project.blocks_project_id == project_id,
    ).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")
    dep.blocks_project_id = None
    db.commit()
    return {"ok": True}


# P2.01 — Per-project dependency detail
@router.get("/{project_id}/dependencies")
def get_project_dependencies(project_id: int, db: Session = Depends(get_db)):
    """
    Returns:
      - depends_on: projects this one is waiting on (it is blocked by them)
      - blocking: projects this one is blocking (they wait on it)
    """
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    # Projects this one "blocks" (i.e. must complete before)
    blocks_list = []
    if p.blocks_project_id:
        blocked = db.query(Project).filter(Project.id == p.blocks_project_id).first()
        if blocked:
            blocks_list.append({"id": blocked.id, "title": blocked.title, "icon": blocked.icon, "status": blocked.status})
    # Projects that block this one (they must complete first)
    depends_on_list = db.query(Project).filter(Project.blocks_project_id == project_id).all()
    return {
        "project_id": project_id,
        # legacy keys retained for frontend compatibility
        "blocks": blocks_list,
        "blocked_by": [{"id": b.id, "title": b.title, "icon": b.icon, "status": b.status} for b in depends_on_list],
        # spec-aligned keys
        "depends_on": [{"id": b.id, "title": b.title, "icon": b.icon, "status": b.status} for b in depends_on_list],
        "blocking": blocks_list,
    }


# ─────────────────────────────────────────────
# P2.02 — Time-to-completion velocity
# ─────────────────────────────────────────────

@router.get("/time-estimates")
def get_time_estimates(db: Session = Depends(get_db)):
    """
    Time-to-completion statistics for completed projects.
    Returns overall avg, per-type breakdown, and estimated completion dates for active projects.
    """
    from collections import defaultdict

    completed = db.query(Project).filter(
        Project.status.in_(["completed", "abandoned"]),
        Project.completed_at.isnot(None),
    ).all()

    cycle_days: list[float] = []
    by_type_days: dict = defaultdict(list)

    for p in completed:
        if p.created_at and p.completed_at:
            delta = (p.completed_at - p.created_at).total_seconds() / 86400
            if delta >= 0:
                cycle_days.append(delta)
                pt = p.project_type or "other"
                by_type_days[pt].append(delta)

    avg_days_overall = round(statistics.mean(cycle_days), 1) if cycle_days else None

    by_type = {
        pt: round(statistics.mean(days), 1)
        for pt, days in by_type_days.items()
    }

    # Estimate completion for in-progress projects
    active = db.query(Project).filter(
        Project.status.in_(["active", "paused", "backlog"])
    ).all()

    today = date.today()
    today_dt = datetime.combine(today, datetime.min.time())
    project_estimates = []
    for p in active:
        start = p.created_at or today_dt
        pt = p.project_type or "other"
        avg = by_type.get(pt, avg_days_overall)
        if avg is not None:
            est_dt = start + timedelta(days=avg)
            est_date = est_dt.date()
        else:
            est_date = None
        project_estimates.append({
            "id": p.id,
            "title": p.title,
            "project_type": pt,
            "created_at": str(start)[:10],
            "est_completion_date": str(est_date) if est_date else None,
        })

    if not cycle_days:
        return {
            "total_completed": 0,
            "avg_days_overall": None,
            "avg_days_to_complete": None,
            "median_days": None,
            "fastest": None,
            "slowest": None,
            "by_type": {},
            "project_estimates": project_estimates,
        }

    return {
        "total_completed": len(cycle_days),
        "avg_days_overall": avg_days_overall,
        # legacy field alias
        "avg_days_to_complete": avg_days_overall,
        "median_days": round(statistics.median(cycle_days), 1),
        "fastest": round(min(cycle_days), 1),
        "slowest": round(max(cycle_days), 1),
        "by_type": by_type,
        "project_estimates": project_estimates,
    }


@router.get("/velocity")
def get_velocity(db: Session = Depends(get_db)):
    """
    Computes average project cycle time from completed/abandoned projects
    and returns completion forecasts for all active projects.
    """
    # --- historical cycle times from completed projects ---
    completed = db.query(Project).filter(
        Project.status.in_(["completed", "abandoned"]),
        Project.completed_at.isnot(None),
    ).all()

    cycle_days: list[float] = []
    for p in completed:
        if p.created_at and p.completed_at:
            delta = (p.completed_at - p.created_at).total_seconds() / 86400
            if delta >= 0:
                cycle_days.append(delta)

    has_history = len(cycle_days) >= 1
    avg_cycle_days = round(statistics.mean(cycle_days), 1) if cycle_days else None
    median_cycle_days = round(statistics.median(cycle_days), 1) if cycle_days else None
    stddev_cycle_days = round(statistics.stdev(cycle_days), 1) if len(cycle_days) >= 2 else None

    # --- historical samples summary ---
    history = []
    for p in sorted(completed, key=lambda x: x.completed_at or datetime.min, reverse=True):
        if p.created_at and p.completed_at:
            d = (p.completed_at - p.created_at).total_seconds() / 86400
            history.append({
                "id": p.id,
                "title": p.title,
                "icon": p.icon,
                "status": p.status,
                "cycle_days": round(d, 1),
                "completed_at": str(p.completed_at)[:10],
            })

    # --- forecasts for active projects ---
    active = db.query(Project).filter(
        Project.status.in_(["active", "paused", "backlog"])
    ).all()

    today = date.today()
    today_dt = datetime.combine(today, datetime.min.time())
    forecasts = []
    on_track_count = 0
    at_risk_count = 0
    no_deadline_count = 0

    for p in active:
        start = p.created_at or today_dt
        days_so_far = (today_dt - start).total_seconds() / 86400

        # Predicted completion = start + avg_cycle_days
        if avg_cycle_days is not None:
            predicted_dt = start + timedelta(days=avg_cycle_days)
            predicted_date = predicted_dt.date()
            remaining_days = max(0, round((predicted_dt - today_dt).total_seconds() / 86400))
        else:
            predicted_date = None
            remaining_days = None

        # On-track / at-risk based on due_date vs predicted
        if p.due_date and predicted_date:
            if predicted_date <= p.due_date:
                verdict = "on_track"
                on_track_count += 1
            else:
                verdict = "at_risk"
                at_risk_count += 1
        elif predicted_date:
            verdict = "no_deadline"
            no_deadline_count += 1
        else:
            verdict = "unknown"
            no_deadline_count += 1

        # Pct through predicted cycle
        if avg_cycle_days and avg_cycle_days > 0:
            pct_through = min(100, round(days_so_far / avg_cycle_days * 100))
        else:
            pct_through = 0

        forecasts.append({
            "id": p.id,
            "title": p.title,
            "icon": p.icon,
            "status": p.status,
            "color": p.color,
            "due_date": str(p.due_date) if p.due_date else None,
            "created_at": str(p.created_at)[:10] if p.created_at else None,
            "days_in_flight": round(days_so_far),
            "predicted_completion_date": str(predicted_date) if predicted_date else None,
            "remaining_days": remaining_days,
            "pct_through_cycle": pct_through,
            "verdict": verdict,
        })

    # Sort: at_risk first, then on_track, then no_deadline
    verdict_order = {"at_risk": 0, "on_track": 1, "no_deadline": 2, "unknown": 3}
    forecasts.sort(key=lambda x: verdict_order.get(x["verdict"], 99))

    return {
        "velocity": {
            "avg_cycle_days": avg_cycle_days,
            "median_cycle_days": median_cycle_days,
            "stddev_cycle_days": stddev_cycle_days,
            "sample_count": len(cycle_days),
            "has_history": has_history,
        },
        "forecasts": forecasts,
        "digest": {
            "on_track": on_track_count,
            "at_risk": at_risk_count,
            "no_deadline": no_deadline_count,
            "total_active": len(active),
        },
        "history": history,
    }


# ─────────────────────────────────────────────
# P2.03 — Project Type Insights
# ─────────────────────────────────────────────

@router.get("/type-insights")
def get_type_insights(db: Session = Depends(get_db)):
    """
    Per-type analytics: total, active, completed, abandoned counts,
    completion rate, and average cycle time.
    """
    all_projects = db.query(Project).all()

    from collections import defaultdict

    type_data = defaultdict(lambda: {
        "total": 0, "active": 0, "completed": 0, "abandoned": 0,
        "paused": 0, "backlog": 0, "cycle_days": []
    })

    for p in all_projects:
        pt = p.project_type or "other"
        type_data[pt]["total"] += 1
        s = p.status if p.status in ("active", "completed", "abandoned", "paused", "backlog") else "other"
        type_data[pt][s] = type_data[pt].get(s, 0) + 1
        if p.status in ("completed", "abandoned") and p.created_at and p.completed_at:
            delta = (p.completed_at - p.created_at).total_seconds() / 86400
            if delta >= 0:
                type_data[pt]["cycle_days"].append(delta)

    result = []
    for pt, d in sorted(type_data.items(), key=lambda x: -x[1]["total"]):
        terminal = d["completed"] + d["abandoned"]
        completion_rate = round(d["completed"] / terminal * 100) if terminal > 0 else None
        avg_days = round(statistics.mean(d["cycle_days"]), 1) if d["cycle_days"] else None
        result.append({
            "type": pt,
            "total": d["total"],
            "active": d["active"],
            "completed": d["completed"],
            "abandoned": d["abandoned"],
            "paused": d["paused"],
            "backlog": d["backlog"],
            "completion_rate": completion_rate,
            "avg_cycle_days": avg_days,
        })

    return result


# ─────────────────────────────────────────────
# S6.02 — Goal Cascade View
# ─────────────────────────────────────────────

@router.get("/cascade")
def get_goal_cascade(db: Session = Depends(get_db)):
    """
    Returns the full OKR → Projects → Habits → Time tree.
    Each objective lists its linked projects, linked habits, and time hours logged.
    """
    from models.habits import Habit
    from models.time_tracking import TimeBlock
    from sqlalchemy import func as sqlfunc
    from datetime import timedelta

    objectives = db.query(Objective).order_by(
        Objective.year.desc(), Objective.quarter.desc()
    ).all()

    # Pre-fetch: time hours per project (last 90 days)
    since = date.today() - timedelta(days=90)
    time_by_project = {}
    time_rows = db.query(
        TimeBlock.project_id,
        sqlfunc.sum(TimeBlock.duration_min)
    ).filter(
        TimeBlock.project_id.isnot(None),
        TimeBlock.date >= since
    ).group_by(TimeBlock.project_id).all()
    for proj_id, total_min in time_rows:
        time_by_project[proj_id] = round((total_min or 0) / 60, 1)

    # Pre-fetch all active habits with goal_id
    habit_rows = db.query(Habit).filter(
        Habit.is_active == True,
        Habit.goal_id.isnot(None)
    ).all()
    habits_by_goal = {}
    for h in habit_rows:
        if h.goal_id not in habits_by_goal:
            habits_by_goal[h.goal_id] = []
        habits_by_goal[h.goal_id].append({
            "id": h.id, "name": h.name, "icon": h.icon, "color": h.color,
            "willpower_cost": h.willpower_cost,
        })

    result = []
    for o in objectives:
        krs = o.key_results
        overall_pct = 0
        if krs:
            total_prog = sum((kr.current_value / kr.target_value * 100) if kr.target_value > 0 else 0 for kr in krs)
            overall_pct = round(total_prog / len(krs))

        linked_projects = db.query(Project).filter(Project.objective_id == o.id).all()
        cascade_projects = []
        obj_time_hours = 0.0

        for p in linked_projects:
            p_hours = time_by_project.get(p.id, 0.0)
            obj_time_hours += p_hours
            tasks = p.tasks
            completed = sum(1 for t in tasks if t.is_completed)
            cascade_projects.append({
                "id": p.id, "title": p.title, "status": p.status,
                "icon": p.icon, "color": p.color,
                "progress_pct": round(completed / len(tasks) * 100) if tasks else 0,
                "time_hours_90d": p_hours,
                "has_postmortem": p.postmortem is not None,
            })

        result.append({
            "id": o.id, "title": o.title, "quarter": o.quarter, "year": o.year,
            "color": o.color, "status": o.status, "overall_pct": overall_pct,
            "key_results": [{"title": kr.title, "pct": round((kr.current_value / kr.target_value * 100) if kr.target_value > 0 else 0)} for kr in krs],
            "projects": cascade_projects,
            "habits": habits_by_goal.get(o.id, []),
            "total_time_hours_90d": round(obj_time_hours, 1),
        })

    return result
