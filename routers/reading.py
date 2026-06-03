from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date
from pydantic import BaseModel

from database import get_db
from models.reading import Book, BookNote, BookQuote

router = APIRouter(prefix="/api/reading", tags=["reading"])


class BookCreate(BaseModel):
    title: str
    author: Optional[str] = None
    genre: Optional[str] = None
    status: str = "want_to_read"
    rating: Optional[int] = None
    started_date: Optional[date] = None
    finished_date: Optional[date] = None
    cover_url: Optional[str] = None
    page_count: Optional[int] = None
    current_page: int = 0
    source: Optional[str] = None
    notes: Optional[str] = None

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    genre: Optional[str] = None
    status: Optional[str] = None
    rating: Optional[int] = None
    started_date: Optional[date] = None
    finished_date: Optional[date] = None
    cover_url: Optional[str] = None
    page_count: Optional[int] = None
    current_page: Optional[int] = None
    source: Optional[str] = None
    notes: Optional[str] = None

class NoteCreate(BaseModel):
    book_id: int
    content: str
    page_number: Optional[int] = None

class QuoteCreate(BaseModel):
    book_id: int
    quote: str
    page_number: Optional[int] = None


def book_dict(b: Book) -> dict:
    progress = round((b.current_page / b.page_count * 100)) if b.page_count and b.current_page else None
    return {
        "id": b.id, "title": b.title, "author": b.author, "genre": b.genre,
        "status": b.status, "rating": b.rating,
        "started_date": str(b.started_date) if b.started_date else None,
        "finished_date": str(b.finished_date) if b.finished_date else None,
        "cover_url": b.cover_url, "page_count": b.page_count, "current_page": b.current_page,
        "source": b.source, "notes": b.notes, "progress_pct": progress,
        "note_count": len(b.book_notes), "quote_count": len(b.quotes),
    }


@router.get("/books")
def get_books(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Book)
    if status:
        q = q.filter(Book.status == status)
    books = q.order_by(Book.created_at.desc()).all()
    return [book_dict(b) for b in books]

@router.get("/books/{book_id}")
def get_book(book_id: int, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b: raise HTTPException(status_code=404, detail="Not found")
    d = book_dict(b)
    d["notes_list"] = [{"id": n.id, "content": n.content, "page_number": n.page_number,
                         "created_at": str(n.created_at)} for n in b.book_notes]
    d["quotes_list"] = [{"id": q.id, "quote": q.quote, "page_number": q.page_number,
                          "created_at": str(q.created_at)} for q in b.quotes]
    return d

@router.post("/books")
def create_book(data: BookCreate, db: Session = Depends(get_db)):
    b = Book(**data.dict())
    db.add(b)
    db.commit()
    db.refresh(b)
    return book_dict(b)

@router.put("/books/{book_id}")
def update_book(book_id: int, data: BookUpdate, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b: raise HTTPException(status_code=404, detail="Not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return book_dict(b)

@router.delete("/books/{book_id}")
def delete_book(book_id: int, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b: raise HTTPException(status_code=404, detail="Not found")
    db.delete(b)
    db.commit()
    return {"ok": True}

@router.post("/notes")
def add_note(data: NoteCreate, db: Session = Depends(get_db)):
    n = BookNote(**data.dict())
    db.add(n)
    db.commit()
    db.refresh(n)
    return n

@router.delete("/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    n = db.query(BookNote).filter(BookNote.id == note_id).first()
    if not n: raise HTTPException(status_code=404, detail="Not found")
    db.delete(n)
    db.commit()
    return {"ok": True}

@router.post("/quotes")
def add_quote(data: QuoteCreate, db: Session = Depends(get_db)):
    q = BookQuote(**data.dict())
    db.add(q)
    db.commit()
    db.refresh(q)
    return q

@router.delete("/quotes/{quote_id}")
def delete_quote(quote_id: int, db: Session = Depends(get_db)):
    q = db.query(BookQuote).filter(BookQuote.id == quote_id).first()
    if not q: raise HTTPException(status_code=404, detail="Not found")
    db.delete(q)
    db.commit()
    return {"ok": True}

@router.get("/stats")
def reading_stats(db: Session = Depends(get_db)):
    total = db.query(Book).count()
    completed = db.query(Book).filter(Book.status == "completed").count()
    reading = db.query(Book).filter(Book.status == "reading").count()
    want = db.query(Book).filter(Book.status == "want_to_read").count()
    avg_rating = db.query(func.avg(Book.rating)).filter(Book.rating != None).scalar()
    genres = db.query(Book.genre, func.count(Book.id)).filter(Book.genre != None).group_by(Book.genre).all()
    return {
        "total": total, "completed": completed, "reading": reading,
        "want_to_read": want, "avg_rating": round(avg_rating, 1) if avg_rating else None,
        "genres": [{"genre": g, "count": c} for g, c in genres],
    }


# ─────────────────────────────────────────────
# S6.05 — Book depth fields update + review queue
# ─────────────────────────────────────────────

class BookDepthUpdate(BaseModel):
    changed_behavior: Optional[bool] = None
    linked_project_id: Optional[int] = None
    linked_decision_id: Optional[int] = None

@router.patch("/books/{book_id}/depth")
def update_book_depth(book_id: int, data: BookDepthUpdate, db: Session = Depends(get_db)):
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b: raise HTTPException(status_code=404, detail="Not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return {"id": b.id, "changed_behavior": b.changed_behavior,
            "linked_project_id": b.linked_project_id,
            "linked_decision_id": b.linked_decision_id}

@router.post("/books/{book_id}/review")
def mark_book_reviewed(book_id: int, db: Session = Depends(get_db)):
    """Mark a book as reviewed and compute next spaced repetition date."""
    from datetime import timedelta
    b = db.query(Book).filter(Book.id == book_id).first()
    if not b: raise HTTPException(status_code=404, detail="Not found")

    b.review_count = (b.review_count or 0) + 1

    # Spaced repetition intervals: 7, 14, 30, 60, 120, 180 days
    intervals = [7, 14, 30, 60, 120, 180]
    idx = min(b.review_count - 1, len(intervals) - 1)
    b.next_review_date = date.today() + timedelta(days=intervals[idx])

    db.commit()
    db.refresh(b)
    return {"id": b.id, "review_count": b.review_count, "next_review_date": str(b.next_review_date)}

@router.get("/review-queue")
def get_review_queue(db: Session = Depends(get_db)):
    """
    Returns completed books due for review (next_review_date <= today or not yet set).
    Also returns books with no review date that are completed and changed behavior.
    """
    today = date.today()

    # Books overdue for review
    overdue = db.query(Book).filter(
        Book.status == "completed",
        Book.next_review_date != None,
        Book.next_review_date <= today,
    ).order_by(Book.next_review_date).all()

    # Books that changed behavior but have never been reviewed
    unscheduled = db.query(Book).filter(
        Book.status == "completed",
        Book.changed_behavior == True,
        Book.next_review_date == None,
    ).order_by(Book.finished_date.desc()).all()

    # Upcoming (next 30 days)
    from datetime import timedelta
    upcoming = db.query(Book).filter(
        Book.status == "completed",
        Book.next_review_date != None,
        Book.next_review_date > today,
        Book.next_review_date <= today + timedelta(days=30),
    ).order_by(Book.next_review_date).all()

    def book_summary(b):
        return {
            "id": b.id, "title": b.title, "author": b.author,
            "rating": b.rating, "cover_url": b.cover_url,
            "changed_behavior": b.changed_behavior,
            "finished_date": str(b.finished_date) if b.finished_date else None,
            "next_review_date": str(b.next_review_date) if b.next_review_date else None,
            "review_count": b.review_count or 0,
            "linked_project_id": b.linked_project_id,
            "linked_decision_id": b.linked_decision_id,
            "days_overdue": (today - b.next_review_date).days if b.next_review_date and b.next_review_date <= today else None,
        }

    return {
        "overdue": [book_summary(b) for b in overdue],
        "unscheduled": [book_summary(b) for b in unscheduled],
        "upcoming": [book_summary(b) for b in upcoming],
    }
