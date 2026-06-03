from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel

from database import get_db
from models.tasks import Task

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    notes: Optional[str] = None
    due_date: Optional[date] = None
    priority: int = 3              # 1=urgent 2=high 3=normal 4=someday
    status: str = "inbox"          # inbox | today | done | cancelled
    area: str = "personal"         # work|personal|health|finance|other
    project_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    area: Optional[str] = None
    project_id: Optional[int] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def task_to_dict(t: Task) -> dict:
    return {
        "id":           t.id,
        "title":        t.title,
        "notes":        t.notes,
        "due_date":     t.due_date.isoformat() if t.due_date else None,
        "priority":     t.priority,
        "status":       t.status,
        "area":         t.area,
        "project_id":   t.project_id,
        "project_title": t.project.title if t.project else None,
        "created_at":   t.created_at.isoformat() if t.created_at else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "is_overdue":   (
            t.due_date is not None
            and t.due_date < date.today()
            and t.status not in ("done", "cancelled")
        ),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/")
def get_tasks(
    status: Optional[str] = None,
    area:   Optional[str] = None,
    due:    Optional[str] = None,   # "today" | "overdue" | "upcoming"
    project_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List tasks with optional filters: status, area, due, project_id."""
    q = db.query(Task)

    if status:
        q = q.filter(Task.status == status)
    if area:
        q = q.filter(Task.area == area)
    if project_id is not None:
        q = q.filter(Task.project_id == project_id)

    today = date.today()
    if due == "today":
        q = q.filter(Task.due_date == today)
    elif due == "overdue":
        q = q.filter(Task.due_date < today, Task.status.notin_(["done", "cancelled"]))
    elif due == "upcoming":
        q = q.filter(Task.due_date > today)

    # Default sort: priority asc, then due_date asc (nulls last), then created_at asc
    tasks = q.order_by(Task.priority.asc(), Task.due_date.asc().nullslast(), Task.created_at.asc()).all()
    return [task_to_dict(t) for t in tasks]


@router.get("/today")
def get_today_tasks(db: Session = Depends(get_db)):
    """Return tasks due today + tasks explicitly marked as status='today'."""
    today = date.today()
    tasks = (
        db.query(Task)
        .filter(
            Task.status.notin_(["done", "cancelled"]),
            (Task.due_date == today) | (Task.status == "today")
        )
        .order_by(Task.priority.asc(), Task.created_at.asc())
        .all()
    )
    return [task_to_dict(t) for t in tasks]


@router.get("/stats")
def get_task_stats(db: Session = Depends(get_db)):
    """Summary counts for dashboard widgets."""
    today = date.today()
    total_open    = db.query(Task).filter(Task.status.notin_(["done", "cancelled"])).count()
    due_today     = db.query(Task).filter(Task.due_date == today, Task.status.notin_(["done", "cancelled"])).count()
    overdue       = db.query(Task).filter(Task.due_date < today, Task.status.notin_(["done", "cancelled"])).count()
    completed     = db.query(Task).filter(Task.status == "done").count()
    inbox_count   = db.query(Task).filter(Task.status == "inbox").count()
    return {
        "total_open":  total_open,
        "inbox":       inbox_count,
        "due_today":   due_today,
        "overdue":     overdue,
        "completed":   completed,
    }


@router.get("/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_to_dict(t)


@router.post("/", status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    t = Task(**data.dict())
    db.add(t)
    db.commit()
    db.refresh(t)
    return task_to_dict(t)


@router.patch("/{task_id}")
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    updates = data.dict(exclude_unset=True)

    # Auto-set completed_at when marking done; clear it if un-done
    if "status" in updates:
        if updates["status"] == "done" and t.status != "done":
            t.completed_at = datetime.utcnow()
        elif updates["status"] != "done":
            t.completed_at = None

    for field, value in updates.items():
        setattr(t, field, value)

    db.commit()
    db.refresh(t)
    return task_to_dict(t)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(t)
    db.commit()
