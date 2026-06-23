from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.crm import Contact, FollowUpReminder, Interaction
from models.finance import Category, Transaction
from models.habits import Habit, HabitLog
from models.mood import MoodLog
from models.projects import Project, ProjectTask
from models.time_tracking import TimeBlock

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _empty_mood_trend(start_date):
    return [
        {
            "date": (start_date + timedelta(days=offset)).isoformat(),
            "mood": None,
            "energy": None,
            "stress": None,
        }
        for offset in range(7)
    ]


def _pct(done, target):
    if not target:
        return 0.0
    return round(min(100.0, max(0.0, (done / target) * 100)), 1)


def _mood_trend(db, week_start):
    trend = _empty_mood_trend(week_start)
    by_date = {entry["date"]: entry for entry in trend}
    try:
        logs = (
            db.query(MoodLog)
            .filter(MoodLog.date >= week_start)
            .order_by(MoodLog.date.asc())
            .all()
        )
        for log in logs:
            key = log.date.isoformat()
            if key in by_date:
                by_date[key].update({"mood": log.mood, "energy": log.energy, "stress": log.stress})
    except Exception:
        return trend
    return trend


def _time_allocation(db, week_start):
    totals = {}
    try:
        blocks = db.query(TimeBlock).filter(TimeBlock.date >= week_start).all()
        for block in blocks:
            category = block.category or "Uncategorized"
            if category not in totals:
                totals[category] = {"category": category, "planned_min": 0, "actual_min": 0}
            minutes = int(block.duration_min or 0)
            if block.planned:
                totals[category]["planned_min"] += minutes
            else:
                totals[category]["actual_min"] += minutes
    except Exception:
        return []
    return sorted(totals.values(), key=lambda item: item["actual_min"], reverse=True)


def _habit_summary(db, week_start):
    try:
        habits = db.query(Habit).filter(Habit.is_active.is_(True)).all()
        logs = (
            db.query(HabitLog)
            .filter(HabitLog.date >= week_start, HabitLog.completed.is_(True))
            .all()
        )
    except Exception:
        return {"habits": [], "overall_pct": 0.0}

    completed_by_habit = {}
    for log in logs:
        completed_by_habit[log.habit_id] = completed_by_habit.get(log.habit_id, 0) + 1

    rows = []
    total_completed = 0
    total_target = 0
    for habit in habits:
        completed_days = completed_by_habit.get(habit.id, 0)
        target_days = 7 if habit.frequency == "daily" else int(habit.target_days_per_week or 1)
        target_days = max(1, min(7, target_days))
        total_completed += min(completed_days, target_days)
        total_target += target_days
        rows.append({
            "id": habit.id,
            "name": habit.name,
            "completed_days": completed_days,
            "target_days": target_days,
            "pct": _pct(completed_days, target_days),
        })

    return {"habits": rows, "overall_pct": _pct(total_completed, total_target)}


def _project_progress(db):
    try:
        projects = db.query(Project).filter(Project.status == "active").all()
        tasks = db.query(ProjectTask).all()
    except Exception:
        return []

    tasks_by_project = {}
    done_by_project = {}
    for task in tasks:
        tasks_by_project[task.project_id] = tasks_by_project.get(task.project_id, 0) + 1
        if task.is_completed:
            done_by_project[task.project_id] = done_by_project.get(task.project_id, 0) + 1

    rows = []
    for project in projects:
        total_tasks = tasks_by_project.get(project.id, 0)
        done_tasks = done_by_project.get(project.id, 0)
        rows.append({
            "id": project.id,
            "title": project.title,
            "project_type": project.project_type or "other",
            "due_date": project.due_date.isoformat() if project.due_date else None,
            "total_tasks": total_tasks,
            "done_tasks": done_tasks,
            "pct": _pct(done_tasks, total_tasks),
        })

    return sorted(rows, key=lambda item: item["pct"])[:6]


def _spending(db, week_start):
    try:
        transactions = (
            db.query(Transaction)
            .outerjoin(Category, Transaction.category_id == Category.id)
            .filter(Transaction.date >= week_start, Transaction.type == "expense")
            .all()
        )
    except Exception:
        return {"total_spent": 0.0, "by_category": []}

    totals = {}
    total_spent = 0.0
    for transaction in transactions:
        amount = float(transaction.amount or 0)
        total_spent += amount
        category = transaction.category.name if transaction.category else "Uncategorized"
        totals[category] = totals.get(category, 0.0) + amount

    by_category = [
        {"category": category, "amount": round(amount, 2)}
        for category, amount in sorted(totals.items(), key=lambda item: item[1], reverse=True)
    ]
    return {"total_spent": round(total_spent, 2), "by_category": by_category}


def _relationships_due(db):
    today = date.today()
    try:
        contacts = db.query(Contact).all()
        interactions = db.query(Interaction).all()
        reminders = (
            db.query(FollowUpReminder)
            .filter(FollowUpReminder.due_date <= today, FollowUpReminder.is_completed.is_(False))
            .all()
        )
    except Exception:
        return []

    latest_by_contact = {}
    for interaction in interactions:
        current = latest_by_contact.get(interaction.contact_id)
        if current is None or interaction.date > current:
            latest_by_contact[interaction.contact_id] = interaction.date

    overdue_reminders = {reminder.contact_id for reminder in reminders}
    rows = []
    for contact in contacts:
        cadence = contact.cadence_days or 30
        last_contact = latest_by_contact.get(contact.id)
        if last_contact is None:
            days_overdue = cadence
        else:
            days_overdue = (today - last_contact).days - cadence

        has_overdue_reminder = contact.id in overdue_reminders
        if days_overdue > 0 or has_overdue_reminder:
            rows.append({
                "id": contact.id,
                "name": contact.name,
                "relationship_type": contact.relationship_type or "contact",
                "days_overdue": max(0, days_overdue),
                "has_overdue_reminder": has_overdue_reminder,
            })

    return sorted(rows, key=lambda item: item["days_overdue"], reverse=True)[:5]


@router.get("/weekly")
def weekly_dashboard(db: Session = Depends(get_db)):
    today = date.today()
    week_start = today - timedelta(days=6)
    return {
        "mood_trend": _mood_trend(db, week_start),
        "time_allocation": _time_allocation(db, week_start),
        "habit_summary": _habit_summary(db, week_start),
        "project_progress": _project_progress(db),
        "spending": _spending(db, week_start),
        "relationships_due": _relationships_due(db),
    }
