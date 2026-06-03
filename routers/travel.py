from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel
import io, csv

from database import get_db
from models.travel import Trip, ItineraryItem, PackingList, PackingItem, TripExpense, TravelDocument, Destination, WishlistDestination

router = APIRouter(prefix="/api/travel", tags=["travel"])


# --- Schemas ---
class TripCreate(BaseModel):
    name: str
    destination: str
    country: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str = "planning"
    budget: float = 0.0
    cover_image: Optional[str] = None
    notes: Optional[str] = None

class TripUpdate(BaseModel):
    name: Optional[str] = None
    destination: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    budget: Optional[float] = None
    cover_image: Optional[str] = None
    notes: Optional[str] = None
    rating: Optional[int] = None
    highlights: Optional[str] = None
    lowlights: Optional[str] = None
    would_return: Optional[bool] = None

class ItineraryItemCreate(BaseModel):
    trip_id: int
    day_number: int
    date: Optional[date] = None
    time: Optional[str] = None
    type: Optional[str] = None
    title: str
    location: Optional[str] = None
    confirmation_number: Optional[str] = None
    notes: Optional[str] = None
    link: Optional[str] = None
    cost: float = 0.0
    order_index: int = 0

class PackingListCreate(BaseModel):
    trip_id: Optional[int] = None
    name: str
    is_template: bool = False

class PackingItemCreate(BaseModel):
    packing_list_id: int
    name: str
    category: str = "General"
    quantity: int = 1

class PackingItemUpdate(BaseModel):
    is_checked: Optional[bool] = None
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None

class TripExpenseCreate(BaseModel):
    trip_id: int
    date: Optional[date] = None
    amount: float
    category: str = "General"
    description: Optional[str] = None
    notes: Optional[str] = None

class TravelDocCreate(BaseModel):
    trip_id: Optional[int] = None
    type: Optional[str] = None
    title: str
    content: Optional[str] = None
    expiry_date: Optional[date] = None

class DestinationCreate(BaseModel):
    name: str
    country: str
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str = "visited"
    visited_year: Optional[int] = None
    notes: Optional[str] = None

class WishlistCreate(BaseModel):
    name: str
    country: Optional[str] = None
    reason: Optional[str] = None
    estimated_cost: Optional[float] = None
    priority: int = 5
    notes: Optional[str] = None


# --- Trips ---
@router.get("/trips")
def get_trips(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Trip)
    if status:
        q = q.filter(Trip.status == status)
    return q.order_by(Trip.start_date.desc()).all()

@router.get("/trips/export-csv")
def export_trips(db: Session = Depends(get_db)):
    trips = db.query(Trip).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Destination", "Country", "Start", "End", "Status", "Budget"])
    for t in trips:
        writer.writerow([t.name, t.destination, t.country, t.start_date, t.end_date, t.status, t.budget])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()),
                             media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=trips.csv"})

# GET /trips/upcoming MUST come before GET /trips/{trip_id} to avoid FastAPI matching
# "upcoming" as an integer trip_id path parameter.

@router.get("/trips/upcoming")
def get_upcoming_trips(db: Session = Depends(get_db)):
    """Return planning + booked trips sorted by start_date ascending."""
    today = date.today()
    trips = (
        db.query(Trip)
        .filter(Trip.status.in_(["planning", "booked"]))
        .order_by(Trip.start_date.asc())
        .all()
    )
    result = []
    for t in trips:
        days_until = (t.start_date - today).days if t.start_date else None
        total_exp = sum(e.amount for e in t.expenses)
        result.append({
            "id": t.id, "name": t.name, "destination": t.destination,
            "country": t.country, "city": t.city,
            "start_date": str(t.start_date) if t.start_date else None,
            "end_date": str(t.end_date) if t.end_date else None,
            "status": t.status, "budget": t.budget,
            "total_expenses": round(total_exp, 2),
            "days_until": days_until,
        })
    return result


@router.get("/trips/{trip_id}")
def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    total_expenses = sum(e.amount for e in trip.expenses)
    return {
        "id": trip.id,
        "name": trip.name,
        "destination": trip.destination,
        "country": trip.country,
        "city": trip.city,
        "latitude": trip.latitude,
        "longitude": trip.longitude,
        "start_date": str(trip.start_date) if trip.start_date else None,
        "end_date": str(trip.end_date) if trip.end_date else None,
        "status": trip.status,
        "budget": trip.budget,
        "cover_image": trip.cover_image,
        "notes": trip.notes,
        "total_expenses": round(total_expenses, 2),
        "remaining_budget": round(trip.budget - total_expenses, 2),
        "itinerary_items": trip.itinerary_items,
        "packing_lists": trip.packing_lists,
        "expenses": trip.expenses,
        "documents": trip.documents,
        "rating": trip.rating,
        "highlights": trip.highlights,
        "lowlights": trip.lowlights,
        "would_return": trip.would_return,
    }

@router.post("/trips")
def create_trip(data: TripCreate, db: Session = Depends(get_db)):
    trip = Trip(**data.dict())
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip

@router.put("/trips/{trip_id}")
def update_trip(trip_id: int, data: TripUpdate, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(trip, k, v)
    db.commit()
    db.refresh(trip)
    return trip

@router.delete("/trips/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    db.delete(trip)
    db.commit()
    return {"ok": True}


@router.get("/trips/{trip_id}/expense-summary")
def get_expense_summary(trip_id: int, db: Session = Depends(get_db)):
    """Per-category expense totals + budget remaining for a trip."""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    expenses = db.query(TripExpense).filter(TripExpense.trip_id == trip_id).all()
    by_cat: dict = {}
    for e in expenses:
        by_cat[e.category] = by_cat.get(e.category, 0) + e.amount
    total = sum(by_cat.values())
    breakdown = [
        {"category": cat, "amount": round(amt, 2), "pct": round(amt / total * 100, 1) if total else 0}
        for cat, amt in sorted(by_cat.items(), key=lambda x: -x[1])
    ]
    return {
        "trip_id": trip_id,
        "budget": trip.budget,
        "total_spent": round(total, 2),
        "remaining": round(trip.budget - total, 2),
        "by_category": breakdown,
    }


@router.get("/expiry-alerts")
def get_expiry_alerts(days_ahead: int = 180, db: Session = Depends(get_db)):
    """Documents expiring within `days_ahead` days, sorted by expiry date."""
    today = date.today()
    cutoff = date.fromordinal(today.toordinal() + days_ahead)
    docs = (
        db.query(TravelDocument)
        .filter(TravelDocument.expiry_date != None, TravelDocument.expiry_date <= cutoff)
        .order_by(TravelDocument.expiry_date.asc())
        .all()
    )
    result = []
    for d in docs:
        days_left = (d.expiry_date - today).days
        result.append({
            "id": d.id, "title": d.title, "type": d.type,
            "expiry_date": str(d.expiry_date),
            "days_left": days_left,
            "is_expired": days_left < 0,
            "is_urgent": days_left < 30,
            "trip_id": d.trip_id,
        })
    return result


@router.get("/cost-comparison")
def get_cost_comparison(db: Session = Depends(get_db)):
    """Cost-per-day and total spend for all completed trips."""
    trips = db.query(Trip).filter(Trip.status == "completed").order_by(Trip.start_date.desc()).all()
    result = []
    for t in trips:
        total_exp = sum(e.amount for e in t.expenses)
        if t.start_date and t.end_date:
            nights = max(1, (t.end_date - t.start_date).days)
        else:
            nights = 1
        cpd = round(total_exp / nights, 2) if total_exp else 0
        result.append({
            "id": t.id, "name": t.name, "destination": t.destination,
            "country": t.country,
            "start_date": str(t.start_date) if t.start_date else None,
            "end_date": str(t.end_date) if t.end_date else None,
            "nights": nights,
            "budget": t.budget,
            "total_spent": round(total_exp, 2),
            "cost_per_day": cpd,
            "budget_utilization": round(total_exp / t.budget * 100, 1) if t.budget else None,
            "rating": t.rating,
            "would_return": t.would_return,
        })
    return result


# --- Itinerary ---
@router.get("/trips/{trip_id}/itinerary")
def get_itinerary(trip_id: int, db: Session = Depends(get_db)):
    items = db.query(ItineraryItem).filter(ItineraryItem.trip_id == trip_id).order_by(
        ItineraryItem.day_number, ItineraryItem.order_index
    ).all()
    return items

@router.post("/itinerary")
def create_itinerary_item(data: ItineraryItemCreate, db: Session = Depends(get_db)):
    item = ItineraryItem(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/itinerary/{item_id}")
def delete_itinerary_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(ItineraryItem).filter(ItineraryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


# --- Packing Lists ---
@router.get("/packing-lists")
def get_packing_lists(trip_id: Optional[int] = None, is_template: Optional[bool] = None, db: Session = Depends(get_db)):
    q = db.query(PackingList)
    if trip_id is not None:
        q = q.filter(PackingList.trip_id == trip_id)
    if is_template is not None:
        q = q.filter(PackingList.is_template == is_template)
    lists = q.all()
    result = []
    for pl in lists:
        result.append({
            "id": pl.id,
            "trip_id": pl.trip_id,
            "name": pl.name,
            "is_template": pl.is_template,
            "items": pl.items,
            "total": len(pl.items),
            "checked": sum(1 for i in pl.items if i.is_checked),
        })
    return result

@router.post("/packing-lists")
def create_packing_list(data: PackingListCreate, db: Session = Depends(get_db)):
    pl = PackingList(**data.dict())
    db.add(pl)
    db.commit()
    db.refresh(pl)
    return pl

@router.post("/packing-lists/{list_id}/clone")
def clone_packing_list(list_id: int, trip_id: int, db: Session = Depends(get_db)):
    src = db.query(PackingList).filter(PackingList.id == list_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="List not found")
    new_list = PackingList(trip_id=trip_id, name=f"{src.name} (copy)", is_template=False)
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    for item in src.items:
        new_item = PackingItem(packing_list_id=new_list.id, name=item.name,
                                category=item.category, quantity=item.quantity)
        db.add(new_item)
    db.commit()
    return new_list

@router.delete("/packing-lists/{list_id}")
def delete_packing_list(list_id: int, db: Session = Depends(get_db)):
    pl = db.query(PackingList).filter(PackingList.id == list_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(pl)
    db.commit()
    return {"ok": True}

@router.post("/packing-items")
def create_packing_item(data: PackingItemCreate, db: Session = Depends(get_db)):
    item = PackingItem(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/packing-items/{item_id}")
def update_packing_item(item_id: int, data: PackingItemUpdate, db: Session = Depends(get_db)):
    item = db.query(PackingItem).filter(PackingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/packing-items/{item_id}")
def delete_packing_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(PackingItem).filter(PackingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


# --- Trip Expenses ---
@router.get("/trips/{trip_id}/expenses")
def get_trip_expenses(trip_id: int, db: Session = Depends(get_db)):
    return db.query(TripExpense).filter(TripExpense.trip_id == trip_id).order_by(TripExpense.date.desc()).all()

@router.post("/expenses")
def create_trip_expense(data: TripExpenseCreate, db: Session = Depends(get_db)):
    exp = TripExpense(**data.dict())
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp

@router.delete("/expenses/{exp_id}")
def delete_trip_expense(exp_id: int, db: Session = Depends(get_db)):
    exp = db.query(TripExpense).filter(TripExpense.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(exp)
    db.commit()
    return {"ok": True}


# --- Documents ---
@router.get("/documents")
def get_documents(trip_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(TravelDocument)
    if trip_id is not None:
        q = q.filter(TravelDocument.trip_id == trip_id)
    return q.all()

@router.post("/documents")
def create_document(data: TravelDocCreate, db: Session = Depends(get_db)):
    doc = TravelDocument(**data.dict())
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(TravelDocument).filter(TravelDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(doc)
    db.commit()
    return {"ok": True}


# --- Destinations / Map ---
@router.get("/destinations")
def get_destinations(db: Session = Depends(get_db)):
    return db.query(Destination).all()

@router.post("/destinations")
def create_destination(data: DestinationCreate, db: Session = Depends(get_db)):
    dest = Destination(**data.dict())
    db.add(dest)
    db.commit()
    db.refresh(dest)
    return dest

@router.delete("/destinations/{dest_id}")
def delete_destination(dest_id: int, db: Session = Depends(get_db)):
    dest = db.query(Destination).filter(Destination.id == dest_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(dest)
    db.commit()
    return {"ok": True}


# --- Wishlist ---
@router.get("/wishlist")
def get_wishlist(db: Session = Depends(get_db)):
    return db.query(WishlistDestination).order_by(WishlistDestination.priority.asc()).all()

@router.post("/wishlist")
def create_wishlist(data: WishlistCreate, db: Session = Depends(get_db)):
    item = WishlistDestination(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/wishlist/{item_id}")
def delete_wishlist(item_id: int, db: Session = Depends(get_db)):
    item = db.query(WishlistDestination).filter(WishlistDestination.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
    return {"ok": True}

