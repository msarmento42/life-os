"""
Global search across all modules.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from database import get_db
from models.crm import Contact
from models.finance import Transaction
from models.reading import Book
from models.projects import Project, Objective
from models.habits import Habit
from models.trading import Trade, Strategy
from models.travel import Trip
from models.tasks import Task
from models.time_tracking import TimeBlock
from models.decisions import Decision

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/global")
def global_search(q: str = Query(..., min_length=1, max_length=100), limit: int = Query(30, ge=5, le=100), db: Session = Depends(get_db)):
    """
    Global search across all modules.
    Returns results grouped by entity type.
    """
    search_term = f"%{q.lower()}%"
    results = {
        "contacts": [],
        "transactions": [],
        "books": [],
        "projects": [],
        "objectives": [],
        "habits": [],
        "trades": [],
        "trips": [],
        "tasks": [],
        "time_blocks": [],
        "decisions": [],
    }

    # Search contacts
    contacts = db.query(Contact).filter(
        or_(
            func.lower(Contact.name).ilike(search_term),
            func.lower(Contact.email).ilike(search_term),
            func.lower(Contact.company).ilike(search_term),
        )
    ).limit(limit).all()
    results["contacts"] = [
        {
            "id": c.id,
            "type": "contact",
            "title": c.name,
            "subtitle": c.company or c.relationship_type,
            "icon": "👤",
            "color": "text-indigo-400",
            "route": f"/crm/contacts/{c.id}",
        }
        for c in contacts
    ]

    # Search transactions
    transactions = db.query(Transaction).filter(
        or_(
            func.lower(Transaction.description).ilike(search_term),
            func.lower(Transaction.notes).ilike(search_term),
        )
    ).limit(limit).all()
    results["transactions"] = [
        {
            "id": t.id,
            "type": "transaction",
            "title": t.description or f"Transaction ${t.amount}",
            "subtitle": t.date.strftime("%b %d, %Y"),
            "icon": "💳",
            "color": "text-emerald-400",
            "route": f"/finance/transactions",
        }
        for t in transactions
    ]

    # Search books
    books = db.query(Book).filter(
        or_(
            func.lower(Book.title).ilike(search_term),
            func.lower(Book.author).ilike(search_term),
            func.lower(Book.genre).ilike(search_term),
        )
    ).limit(limit).all()
    results["books"] = [
        {
            "id": b.id,
            "type": "book",
            "title": b.title,
            "subtitle": b.author or "Unknown author",
            "icon": "📖",
            "color": "text-purple-400",
            "route": f"/reading",
        }
        for b in books
    ]

    # Search projects
    projects = db.query(Project).filter(
        func.lower(Project.title).ilike(search_term)
    ).limit(limit).all()
    results["projects"] = [
        {
            "id": p.id,
            "type": "project",
            "title": p.title,
            "subtitle": p.status,
            "icon": p.icon or "📁",
            "color": "text-blue-400",
            "route": f"/projects",
        }
        for p in projects
    ]

    # Search objectives
    objectives = db.query(Objective).filter(
        func.lower(Objective.title).ilike(search_term)
    ).limit(limit).all()
    results["objectives"] = [
        {
            "id": o.id,
            "type": "objective",
            "title": o.title,
            "subtitle": f"Q{o.quarter} {o.year}",
            "icon": "🎯",
            "color": "text-blue-400",
            "route": f"/projects",
        }
        for o in objectives
    ]

    # Search habits
    habits = db.query(Habit).filter(
        func.lower(Habit.name).ilike(search_term)
    ).limit(limit).all()
    results["habits"] = [
        {
            "id": h.id,
            "type": "habit",
            "title": h.name,
            "subtitle": h.frequency or "Habit",
            "icon": "✓",
            "color": "text-amber-400",
            "route": f"/habits",
        }
        for h in habits
    ]

    # Search trades (join Strategy to search by strategy name without cartesian product)
    trades = db.query(Trade).outerjoin(Strategy, Trade.strategy_id == Strategy.id).filter(
        or_(
            func.lower(Trade.symbol).ilike(search_term),
            func.lower(Strategy.name).ilike(search_term),
        )
    ).limit(limit).all()
    results["trades"] = [
        {
            "id": t.id,
            "type": "trade",
            "title": f"{t.symbol} - {t.strategy.name if t.strategy else 'Unknown strategy'}",
            "subtitle": t.date.strftime("%b %d, %Y") if t.date else "No date",
            "icon": "📈",
            "color": "text-cyan-400",
            "route": f"/trading",
        }
        for t in trades
    ]

    # Search trips
    trips = db.query(Trip).filter(
        func.lower(Trip.destination).ilike(search_term)
    ).limit(limit).all()
    results["trips"] = [
        {
            "id": t.id,
            "type": "trip",
            "title": t.destination,
            "subtitle": f"{t.start_date.strftime('%b %d')} - {t.end_date.strftime('%b %d, %Y')}",
            "icon": "✈️",
            "color": "text-orange-400",
            "route": f"/travel",
        }
        for t in trips
    ]

    # Search tasks
    tasks = db.query(Task).filter(
        or_(
            func.lower(Task.title).ilike(search_term),
            func.lower(Task.notes).ilike(search_term),
        )
    ).filter(Task.status != "done").limit(limit).all()
    results["tasks"] = [
        {
            "id": t.id,
            "type": "task",
            "title": t.title,
            "subtitle": f"{'⚡' if t.priority == 1 else '🔴' if t.priority == 2 else ''} {t.area or 'Task'}".strip(),
            "icon": "✅",
            "color": "text-violet-400",
            "route": "/tasks",
        }
        for t in tasks
    ]

    # Search time blocks
    time_blocks = db.query(TimeBlock).filter(
        or_(
            func.lower(TimeBlock.title).ilike(search_term),
            func.lower(TimeBlock.category).ilike(search_term),
        )
    ).order_by(TimeBlock.date.desc()).limit(limit).all()
    results["time_blocks"] = [
        {
            "id": tb.id,
            "type": "time_block",
            "title": tb.title,
            "subtitle": f"{tb.category} · {tb.date.strftime('%b %d')}",
            "icon": "⏱",
            "color": "text-teal-400",
            "route": "/time",
        }
        for tb in time_blocks
    ]

    # Search decisions
    decisions = db.query(Decision).filter(
        or_(
            func.lower(Decision.title).ilike(search_term),
            func.lower(Decision.description).ilike(search_term),
            func.lower(Decision.reasoning).ilike(search_term),
        )
    ).order_by(Decision.created_at.desc()).limit(limit).all()
    results["decisions"] = [
        {
            "id": d.id,
            "type": "decision",
            "title": d.title,
            "subtitle": f"{d.decision_type or 'Decision'} · {d.status}",
            "icon": "⚖️",
            "color": "text-yellow-400",
            "route": "/decisions",
        }
        for d in decisions
    ]

    # Filter out empty result groups
    results = {k: v for k, v in results.items() if v}

    return results
