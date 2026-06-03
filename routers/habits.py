from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from typing import Optional
from datetime import date, timedelta
from pydantic import BaseModel

from database import get_db
from models.habits import Habit, HabitLog, Routine, RoutineItem

# ── HAB1.01: Habit stacking migrations ───────────────────────────────────────
def _run_habit_migrations():
    from sqlalchemy import text, inspect
    from database import engine
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns("habits")]
    with engine.connect() as conn:
        if "stack_before_id" not in cols:
            try:
                conn.execute(text("ALTER TABLE habits ADD COLUMN stack_before_id INTEGER REFERENCES habits(id)"))
                conn.commit()
            except Exception:
                pass
        if "stack_after_id" not in cols:
            try:
                conn.execute(text("ALTER TABLE habits ADD COLUMN stack_after_id INTEGER REFERENCES habits(id)"))
                conn.commit()
            except Exception:
                pass

try:
    _run_habit_migrations()
except Exception:
    pass

router = APIRouter(prefix="/api/habits", tags=["habits"])


class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "✅"
    color: str = "#6366f1"
    frequency: str = "daily"
    target_days_per_week: int = 7
    goal_id: Optional[int] = None
    context: Optional[str] = None
    willpower_cost: int = 3

class HabitUpdate(BaseModel):
    goal_id: Optional[int] = None
    context: Optional[str] = None
    willpower_cost: Optional[int] = None
    description: Optional[str] = None
    stack_before_id: Optional[int] = None
    stack_after_id: Optional[int] = None

class HabitLogCreate(BaseModel):
    habit_id: int
    date: date
    completed: bool = True
    notes: Optional[str] = None

class RoutineCreate(BaseModel):
    name: str
    type: str = "morning"
    icon: str = "🌅"

class RoutineItemCreate(BaseModel):
    routine_id: int
    description: str
    duration_min: int = 5
    order_index: int = 0


def habit_with_streak(h: Habit, db: Session) -> dict:
    today = date.today()
    logs = {log.date: log.completed for log in h.logs}

    # Current streak
    streak = 0
    d = today
    while True:
        if logs.get(d):
            streak += 1
            d -= timedelta(days=1)
        else:
            break

    # Completion rate last 30 days
    days = [today - timedelta(days=i) for i in range(30)]
    completed_days = sum(1 for d in days if logs.get(d))
    rate = round(completed_days / 30 * 100)

    # Today's status
    done_today = logs.get(today, False)

    # Linked goal title (S5.01)
    goal_title = None
    if h.goal_id:
        from models.projects import Objective
        obj = db.query(Objective).filter(Objective.id == h.goal_id).first()
        if obj:
            goal_title = obj.title

    return {
        "id": h.id, "name": h.name, "description": h.description,
        "icon": h.icon, "color": h.color, "frequency": h.frequency,
        "target_days_per_week": h.target_days_per_week,
        "is_active": h.is_active, "streak": streak,
        "completion_rate_30d": rate, "done_today": done_today,
        # S5.01 depth fields
        "goal_id": h.goal_id, "goal_title": goal_title,
        "context": h.context, "willpower_cost": h.willpower_cost,
        # HAB1.01: stacking fields
        "stack_before_id": getattr(h, "stack_before_id", None),
        "stack_after_id":  getattr(h, "stack_after_id",  None),
    }


@router.get("/")
def get_habits(db: Session = Depends(get_db)):
    habits = db.query(Habit).filter(Habit.is_active == True).all()
    return [habit_with_streak(h, db) for h in habits]

@router.post("/")
def create_habit(data: HabitCreate, db: Session = Depends(get_db)):
    h = Habit(**data.dict())
    db.add(h)
    db.commit()
    db.refresh(h)
    return habit_with_streak(h, db)

@router.patch("/{habit_id}")
def update_habit(habit_id: int, data: HabitUpdate, db: Session = Depends(get_db)):
    h = db.query(Habit).filter(Habit.id == habit_id).first()
    if not h: raise HTTPException(status_code=404, detail="Not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(h, k, v)
    db.commit()
    db.refresh(h)
    return habit_with_streak(h, db)

@router.delete("/{habit_id}")
def delete_habit(habit_id: int, db: Session = Depends(get_db)):
    h = db.query(Habit).filter(Habit.id == habit_id).first()
    if not h: raise HTTPException(status_code=404, detail="Not found")
    h.is_active = False  # Soft delete
    db.commit()
    return {"ok": True}

@router.get("/calendar")
def get_habit_calendar(days: int = 35, db: Session = Depends(get_db)):
    """Return a grid of dates × habits for the habit calendar view."""
    today = date.today()
    date_list = [today - timedelta(days=i) for i in range(days)]
    habits = db.query(Habit).filter(Habit.is_active == True).all()

    result = []
    for h in habits:
        logs = {log.date: log.completed for log in h.logs}
        result.append({
            "id": h.id, "name": h.name, "icon": h.icon, "color": h.color,
            "days": [{"date": str(d), "completed": logs.get(d, False)} for d in date_list]
        })
    return result

@router.post("/log")
def log_habit(data: HabitLogCreate, db: Session = Depends(get_db)):
    existing = db.query(HabitLog).filter(
        HabitLog.habit_id == data.habit_id, HabitLog.date == data.date
    ).first()
    if existing:
        existing.completed = data.completed
        db.commit()
        return existing
    log = HabitLog(**data.dict())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.delete("/log/{log_id}")
def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(HabitLog).filter(HabitLog.id == log_id).first()
    if not log: raise HTTPException(status_code=404, detail="Not found")
    db.delete(log)
    db.commit()
    return {"ok": True}


# --- Routines ---
@router.get("/routines")
def get_routines(db: Session = Depends(get_db)):
    routines = db.query(Routine).filter(Routine.is_active == True).all()
    return [{
        "id": r.id, "name": r.name, "type": r.type, "icon": r.icon,
        "total_minutes": sum(item.duration_min for item in r.items),
        "items": [{"id": i.id, "description": i.description, "duration_min": i.duration_min, "order_index": i.order_index}
                  for i in r.items]
    } for r in routines]

@router.post("/routines")
def create_routine(data: RoutineCreate, db: Session = Depends(get_db)):
    r = Routine(**data.dict())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r

@router.post("/routines/items")
def add_routine_item(data: RoutineItemCreate, db: Session = Depends(get_db)):
    item = RoutineItem(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/routines/items/{item_id}")
def delete_routine_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(RoutineItem).filter(RoutineItem.id == item_id).first()
    if not item: raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
    return {"ok": True}

@router.delete("/routines/{routine_id}")
def delete_routine(routine_id: int, db: Session = Depends(get_db)):
    r = db.query(Routine).filter(Routine.id == routine_id).first()
    if not r: raise HTTPException(status_code=404, detail="Not found")
    db.delete(r)
    db.commit()
    return {"ok": True}


# ─────────────────────────────────────────────
# S5.02 — Keystone Habit Analysis
# ─────────────────────────────────────────────

@router.get("/keystone")
def get_keystone_analysis(days: int = 90, db: Session = Depends(get_db)):
    """
    Co-occurrence matrix: for each active habit, which other habits
    tend to be completed on the same day?
    Returns the top 10 pairs ranked by co-occurrence rate.
    """
    since = date.today() - timedelta(days=days)
    habits = db.query(Habit).filter(Habit.is_active == True).all()
    if len(habits) < 2:
        return {"pairs": [], "keystone": None, "habit_completion_rates": []}

    # Build dict: date → set of completed habit_ids
    all_logs = db.query(HabitLog).filter(
        HabitLog.date >= since, HabitLog.completed == True
    ).all()

    date_habits: dict = {}
    for log in all_logs:
        key = str(log.date)
        if key not in date_habits:
            date_habits[key] = set()
        date_habits[key].add(log.habit_id)

    habit_map = {h.id: {"id": h.id, "name": h.name, "icon": h.icon, "color": h.color} for h in habits}
    active_ids = set(habit_map.keys())

    # Count completions and co-occurrences
    completion_counts = {hid: 0 for hid in active_ids}
    cooccur_counts: dict = {}

    for completed_set in date_habits.values():
        relevant = completed_set & active_ids
        for hid in relevant:
            completion_counts[hid] += 1
        sorted_ids = sorted(relevant)
        for i, a in enumerate(sorted_ids):
            for b in sorted_ids[i + 1:]:
                key = (a, b)
                cooccur_counts[key] = cooccur_counts.get(key, 0) + 1

    # Build ranked pairs (by co-occurrence rate relative to the less-frequent habit)
    pairs = []
    for (a, b), count in cooccur_counts.items():
        if a not in habit_map or b not in habit_map:
            continue
        anchor_count = min(completion_counts[a], completion_counts[b])
        if anchor_count == 0:
            continue
        rate = round(count / anchor_count * 100)
        pairs.append({
            "habit_a": habit_map[a],
            "habit_b": habit_map[b],
            "days_together": count,
            "rate_pct": rate,
            "anchor_completions": anchor_count,
        })

    pairs.sort(key=lambda x: -x["rate_pct"])
    top_pairs = pairs[:10]

    # Keystone habit: the one that appears in the most co-occurrence pairs (top 5 pairs)
    from collections import Counter
    keystone_counter: Counter = Counter()
    for p in pairs[:5]:
        keystone_counter[p["habit_a"]["id"]] += 1
        keystone_counter[p["habit_b"]["id"]] += 1
    keystone_id = keystone_counter.most_common(1)[0][0] if keystone_counter else None
    keystone_habit = habit_map.get(keystone_id) if keystone_id else None

    # Per-habit completion rates for context
    total_days = (date.today() - since).days or 1
    habit_rates = [
        {
            "id": hid,
            "name": habit_map[hid]["name"],
            "icon": habit_map[hid]["icon"],
            "color": habit_map[hid]["color"],
            "completions": completion_counts[hid],
            "rate_pct": round(completion_counts[hid] / total_days * 100),
        }
        for hid in active_ids
    ]
    habit_rates.sort(key=lambda x: -x["completions"])

    return {"pairs": top_pairs, "keystone": keystone_habit, "habit_completion_rates": habit_rates}


# ─────────────────────────────────────────────
# HAB1.01 — Habit Stacking
# ─────────────────────────────────────────────

def _habit_mini(h: Habit, db: Session) -> dict:
    """Minimal habit dict for stack chain display."""
    return {
        "id": h.id, "name": h.name, "icon": h.icon, "color": h.color,
        "stack_before_id": getattr(h, "stack_before_id", None),
        "stack_after_id":  getattr(h, "stack_after_id",  None),
    }


@router.get("/stacks")
def get_habit_stacks(db: Session = Depends(get_db)):
    """
    Return all habit chains. A chain is a sequence of habits
    linked together via stack_before_id / stack_after_id.
    We find all habits that are the head of a chain
    (stack_before_id is NULL, but something points to them OR
     they point to something — i.e. they are part of any chain).
    Chains returned as ordered lists.
    """
    from sqlalchemy import text
    habits = db.query(Habit).filter(Habit.is_active == True).all()
    habit_map = {h.id: h for h in habits}

    # Find chain anchors: habits with no "before" but with an "after"
    # (i.e. they are the START of a chain)
    chain_starts = [
        h for h in habits
        if not getattr(h, "stack_before_id", None)
        and getattr(h, "stack_after_id", None)
    ]

    chains = []
    for anchor in chain_starts:
        chain = []
        current = anchor
        seen = set()
        while current and current.id not in seen:
            seen.add(current.id)
            chain.append(_habit_mini(current, db))
            after_id = getattr(current, "stack_after_id", None)
            current = habit_map.get(after_id) if after_id else None
        if len(chain) > 1:
            chains.append(chain)

    # Also include isolated pairs that have stack_before_id but no upstream anchor
    accounted = {h_id for chain in chains for item in chain for h_id in [item["id"]]}
    for h in habits:
        if h.id in accounted:
            continue
        before_id = getattr(h, "stack_before_id", None)
        after_id  = getattr(h, "stack_after_id",  None)
        if before_id or after_id:
            # Walk backward to find true anchor
            anchor = h
            visited = {h.id}
            while True:
                bid = getattr(anchor, "stack_before_id", None)
                if not bid or bid in visited:
                    break
                prev = habit_map.get(bid)
                if not prev:
                    break
                visited.add(bid)
                anchor = prev
            # Walk forward from anchor
            chain = []
            current = anchor
            seen2 = set()
            while current and current.id not in seen2:
                seen2.add(current.id)
                chain.append(_habit_mini(current, db))
                nxt = getattr(current, "stack_after_id", None)
                current = habit_map.get(nxt) if nxt else None
            if len(chain) > 1 and not any(chain[0]["id"] in [item["id"] for item in c] for c in chains):
                chains.append(chain)

    return {"chains": chains, "chain_count": len(chains)}


@router.get("/{habit_id}/stack")
def get_habit_stack(habit_id: int, db: Session = Depends(get_db)):
    """Return the full stack chain for a given habit."""
    h = db.query(Habit).filter(Habit.id == habit_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Not found")

    all_habits = {hab.id: hab for hab in db.query(Habit).filter(Habit.is_active == True).all()}

    before_id = getattr(h, "stack_before_id", None)
    after_id  = getattr(h, "stack_after_id",  None)

    before_obj = all_habits.get(before_id) if before_id else None
    after_obj  = all_habits.get(after_id)  if after_id  else None

    return {
        "before":  _habit_mini(before_obj, db) if before_obj else None,
        "current": _habit_mini(h, db),
        "after":   _habit_mini(after_obj, db)  if after_obj  else None,
    }
