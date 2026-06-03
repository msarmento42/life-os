from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
from datetime import date, datetime, timedelta
from pydantic import BaseModel
import io, csv

from database import get_db
from models.crm import Contact, Interaction, FollowUpReminder, Tag, ContactTag

router = APIRouter(prefix="/api/crm", tags=["crm"])


# --- Schemas ---
class ContactCreate(BaseModel):
    name: str
    photo_url: Optional[str] = None
    relationship_type: str = "friend"
    company: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    birthday: Optional[date] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    instagram: Optional[str] = None
    notes: Optional[str] = None
    cadence_days: int = 30

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    photo_url: Optional[str] = None
    relationship_type: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    birthday: Optional[date] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    instagram: Optional[str] = None
    notes: Optional[str] = None
    cadence_days: Optional[int] = None

class InteractionCreate(BaseModel):
    contact_id: int
    date: date
    type: str = "other"
    notes: Optional[str] = None
    sentiment: str = "positive"
    quality_score: int = 7  # S6.03: 1-10

class ReminderCreate(BaseModel):
    contact_id: int
    due_date: date
    note: Optional[str] = None

class TagCreate(BaseModel):
    name: str
    color: str = "#6366f1"


def contact_to_dict(c: Contact, db: Session):
    today = date.today()
    # Last interaction
    last_interaction = db.query(Interaction).filter(
        Interaction.contact_id == c.id
    ).order_by(Interaction.date.desc()).first()

    days_since = None
    if last_interaction:
        days_since = (today - last_interaction.date).days

    # Relationship strength: based on frequency vs cadence
    strength = 100
    if days_since is not None and c.cadence_days > 0:
        ratio = days_since / c.cadence_days
        strength = max(0, round(100 - (ratio - 1) * 50)) if ratio > 1 else 100
    elif days_since is None:
        strength = 0

    # Upcoming birthday
    birthday_in_days = None
    if c.birthday:
        try:
            this_year_bday = c.birthday.replace(year=today.year)
            if this_year_bday < today:
                this_year_bday = c.birthday.replace(year=today.year + 1)
            birthday_in_days = (this_year_bday - today).days
        except ValueError:
            pass

    # Tags
    tags = [{"id": ct.tag.id, "name": ct.tag.name, "color": ct.tag.color} for ct in c.tags if ct.tag]

    return {
        "id": c.id,
        "name": c.name,
        "photo_url": c.photo_url,
        "relationship_type": c.relationship_type,
        "company": c.company,
        "job_title": c.job_title,
        "location": c.location,
        "birthday": str(c.birthday) if c.birthday else None,
        "email": c.email,
        "phone": c.phone,
        "linkedin": c.linkedin,
        "twitter": c.twitter,
        "instagram": c.instagram,
        "notes": c.notes,
        "cadence_days": c.cadence_days,
        "last_interaction_date": str(last_interaction.date) if last_interaction else None,
        "days_since_contact": days_since,
        "relationship_strength": strength,
        "birthday_in_days": birthday_in_days,
        "tags": tags,
        "created_at": str(c.created_at) if c.created_at else None,
    }


# --- Contacts ---
@router.get("/contacts")
def get_contacts(
    search: Optional[str] = None,
    relationship_type: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Contact)
    if search:
        q = q.filter(or_(
            Contact.name.ilike(f"%{search}%"),
            Contact.company.ilike(f"%{search}%"),
            Contact.location.ilike(f"%{search}%"),
        ))
    if relationship_type:
        q = q.filter(Contact.relationship_type == relationship_type)
    contacts = q.order_by(Contact.name).all()
    if tag:
        contacts = [c for c in contacts if any(ct.tag.name == tag for ct in c.tags if ct.tag)]
    return [contact_to_dict(c, db) for c in contacts]

@router.get("/contacts/{contact_id}")
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    d = contact_to_dict(c, db)
    d["interactions"] = [
        {"id": i.id, "date": str(i.date), "type": i.type, "notes": i.notes, "sentiment": i.sentiment}
        for i in sorted(c.interactions, key=lambda x: x.date, reverse=True)
    ]
    d["reminders"] = [
        {"id": r.id, "due_date": str(r.due_date), "note": r.note, "is_completed": r.is_completed}
        for r in sorted(c.reminders, key=lambda x: x.due_date)
        if not r.is_completed
    ]
    return d

@router.post("/contacts")
def create_contact(data: ContactCreate, db: Session = Depends(get_db)):
    c = Contact(**data.dict())
    db.add(c)
    db.commit()
    db.refresh(c)
    return contact_to_dict(c, db)

@router.put("/contacts/{contact_id}")
def update_contact(contact_id: int, data: ContactUpdate, db: Session = Depends(get_db)):
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return contact_to_dict(c, db)

@router.delete("/contacts/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(c)
    db.commit()
    return {"ok": True}


# --- Interactions ---
@router.post("/interactions")
def create_interaction(data: InteractionCreate, db: Session = Depends(get_db)):
    interaction = Interaction(**data.dict())
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction

@router.delete("/interactions/{interaction_id}")
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    i = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(i)
    db.commit()
    return {"ok": True}


# --- Reminders ---
@router.get("/reminders")
def get_reminders(db: Session = Depends(get_db)):
    today = date.today()
    reminders = db.query(FollowUpReminder).filter(
        FollowUpReminder.is_completed == False
    ).order_by(FollowUpReminder.due_date).all()
    result = []
    for r in reminders:
        c = r.contact
        result.append({
            "id": r.id,
            "contact_id": r.contact_id,
            "contact_name": c.name if c else None,
            "due_date": str(r.due_date),
            "note": r.note,
            "is_overdue": r.due_date < today,
            "days_until": (r.due_date - today).days,
        })
    return result

@router.post("/reminders")
def create_reminder(data: ReminderCreate, db: Session = Depends(get_db)):
    r = FollowUpReminder(**data.dict())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r

@router.put("/reminders/{reminder_id}/complete")
def complete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    r = db.query(FollowUpReminder).filter(FollowUpReminder.id == reminder_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    r.is_completed = True
    db.commit()
    return {"ok": True}

@router.delete("/reminders/{reminder_id}")
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    r = db.query(FollowUpReminder).filter(FollowUpReminder.id == reminder_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(r)
    db.commit()
    return {"ok": True}


# --- Tags ---
@router.get("/tags")
def get_tags(db: Session = Depends(get_db)):
    return db.query(Tag).all()

@router.post("/tags")
def create_tag(data: TagCreate, db: Session = Depends(get_db)):
    tag = Tag(**data.dict())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag

@router.post("/contacts/{contact_id}/tags/{tag_id}")
def add_tag_to_contact(contact_id: int, tag_id: int, db: Session = Depends(get_db)):
    existing = db.query(ContactTag).filter(
        ContactTag.contact_id == contact_id, ContactTag.tag_id == tag_id
    ).first()
    if not existing:
        ct = ContactTag(contact_id=contact_id, tag_id=tag_id)
        db.add(ct)
        db.commit()
    return {"ok": True}

@router.delete("/contacts/{contact_id}/tags/{tag_id}")
def remove_tag_from_contact(contact_id: int, tag_id: int, db: Session = Depends(get_db)):
    ct = db.query(ContactTag).filter(
        ContactTag.contact_id == contact_id, ContactTag.tag_id == tag_id
    ).first()
    if ct:
        db.delete(ct)
        db.commit()
    return {"ok": True}


# --- Dashboard ---
@router.get("/dashboard")
def get_crm_dashboard(db: Session = Depends(get_db)):
    today = date.today()
    contacts = db.query(Contact).all()

    # Birthdays in next 30 days
    upcoming_birthdays = []
    for c in contacts:
        if c.birthday:
            try:
                this_year = c.birthday.replace(year=today.year)
                if this_year < today:
                    this_year = c.birthday.replace(year=today.year + 1)
                days_until = (this_year - today).days
                if 0 <= days_until <= 30:
                    upcoming_birthdays.append({
                        "id": c.id,
                        "name": c.name,
                        "birthday": str(c.birthday),
                        "days_until": days_until,
                    })
            except ValueError:
                pass
    upcoming_birthdays.sort(key=lambda x: x["days_until"])

    # Who needs follow-up (overdue by cadence)
    neglected = []
    for c in contacts:
        last = db.query(Interaction).filter(
            Interaction.contact_id == c.id
        ).order_by(Interaction.date.desc()).first()
        if last:
            days_since = (today - last.date).days
            if days_since > c.cadence_days:
                neglected.append({
                    "id": c.id,
                    "name": c.name,
                    "relationship_type": c.relationship_type,
                    "days_since": days_since,
                    "cadence_days": c.cadence_days,
                    "overdue_by": days_since - c.cadence_days,
                })
        else:
            neglected.append({
                "id": c.id,
                "name": c.name,
                "relationship_type": c.relationship_type,
                "days_since": None,
                "cadence_days": c.cadence_days,
                "overdue_by": 999,
            })
    neglected.sort(key=lambda x: x["overdue_by"], reverse=True)

    # Overdue reminders
    overdue_reminders = db.query(FollowUpReminder).filter(
        FollowUpReminder.due_date <= today,
        FollowUpReminder.is_completed == False
    ).all()

    return {
        "total_contacts": len(contacts),
        "upcoming_birthdays": upcoming_birthdays,
        "neglected_contacts": neglected[:10],
        "overdue_reminders": len(overdue_reminders),
    }

@router.get("/contacts/export")
def export_contacts(db: Session = Depends(get_db)):
    contacts = db.query(Contact).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Relationship", "Company", "Email", "Phone", "Location", "Birthday"])
    for c in contacts:
        writer.writerow([c.name, c.relationship_type, c.company, c.email, c.phone, c.location, c.birthday])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()),
                             media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=contacts.csv"})


# ─────────────────────────────────────────────
# S6.03 — Relationship Trajectory
# ─────────────────────────────────────────────

@router.get("/trajectory")
def get_relationship_trajectory(db: Session = Depends(get_db)):
    """
    For each contact, compute a trajectory badge (rising/stable/declining)
    by comparing recent 60d interaction quality + frequency vs prior 60d.
    """
    from datetime import timedelta
    from sqlalchemy import func as sqlfunc

    today = date.today()
    mid = today - timedelta(days=60)
    early = today - timedelta(days=120)

    contacts = db.query(Contact).all()
    result = []

    for c in contacts:
        ixns = c.interactions

        recent = [i for i in ixns if i.date and i.date >= mid]
        prior = [i for i in ixns if i.date and early <= i.date < mid]

        recent_count = len(recent)
        prior_count = len(prior)

        recent_quality = (sum(i.quality_score or 7 for i in recent) / recent_count) if recent_count else 0
        prior_quality = (sum(i.quality_score or 7 for i in prior) / prior_count) if prior_count else 0

        # Days since last interaction
        all_dates = [i.date for i in ixns if i.date]
        last_date = max(all_dates) if all_dates else None
        days_since = (today - last_date).days if last_date else 9999

        # Trajectory logic
        if not recent and not prior:
            trajectory = "dormant"
        elif recent_count == 0 and prior_count > 0:
            trajectory = "declining"
        elif recent_count > 0 and prior_count == 0:
            trajectory = "rising"
        else:
            freq_delta = recent_count - prior_count
            quality_delta = recent_quality - prior_quality
            score = freq_delta + (quality_delta * 0.5)
            if score > 0.5:
                trajectory = "rising"
            elif score < -0.5:
                trajectory = "declining"
            else:
                trajectory = "stable"

        result.append({
            "contact_id": c.id,
            "name": c.name,
            "relationship_type": c.relationship_type,
            "trajectory": trajectory,
            "recent_interactions": recent_count,
            "prior_interactions": prior_count,
            "recent_avg_quality": round(recent_quality, 1) if recent_quality else None,
            "days_since_last": days_since,
            "last_date": str(last_date) if last_date else None,
            "cadence_days": c.cadence_days,
            "overdue": days_since > (c.cadence_days or 30) if days_since < 9999 else True,
        })

    result.sort(key=lambda x: (x["trajectory"] != "rising", x["days_since_last"]))
    return result


# ─────────────────────────────────────────────
# S6.04 — Network Clustering
# ─────────────────────────────────────────────

# ─────────────────────────────────────────────
# C2.01 — Energy Analysis
# ─────────────────────────────────────────────

@router.get("/energy-analysis")
def get_energy_analysis(db: Session = Depends(get_db)):
    """
    Classify contacts as energizers / drainers / neutral
    based on average interaction quality_score (1-10).
    Energizers: avg >= 3.5 (scaled: quality_score / 10 * 5 → same as avg_quality >= 7 on 10-pt scale)
    We use the raw quality_score (1-10) directly:
      Energizers: avg >= 7
      Drainers:   avg <= 5
      Neutral:    5 < avg < 7
    Contacts with no interactions are excluded.
    """
    contacts = db.query(Contact).all()
    energizers = []
    drainers = []
    neutral = []

    for c in contacts:
        ixns = [i for i in c.interactions if i.quality_score is not None]
        if not ixns:
            continue
        avg_q = sum(i.quality_score for i in ixns) / len(ixns)
        entry = {
            "contact_id": c.id,
            "name": c.name,
            "relationship_type": c.relationship_type,
            "avg_quality": round(avg_q, 1),
            "interaction_count": len(ixns),
        }
        if avg_q >= 7:
            energizers.append(entry)
        elif avg_q <= 5:
            drainers.append(entry)
        else:
            neutral.append(entry)

    energizers.sort(key=lambda x: -x["avg_quality"])
    drainers.sort(key=lambda x: x["avg_quality"])
    neutral.sort(key=lambda x: -x["avg_quality"])

    top_energizer = energizers[0]["name"] if energizers else None
    top_drainer = drainers[0]["name"] if drainers else None

    return {
        "energizers": energizers,
        "drainers": drainers,
        "neutral": neutral,
        "summary": {
            "total_energizers": len(energizers),
            "total_drainers": len(drainers),
            "total_neutral": len(neutral),
            "top_energizer": top_energizer,
            "top_drainer": top_drainer,
        },
    }


@router.get("/network")
def get_network_clusters(db: Session = Depends(get_db)):
    """
    Cluster contacts into inner / middle / outer circle
    based on interaction frequency + average quality score (last 90d).
    Inner: ≥ 4 interactions OR avg quality ≥ 8
    Middle: 1-3 interactions AND avg quality 5-7
    Outer: 0 interactions or very low quality/frequency
    """
    from datetime import timedelta
    from sqlalchemy import func as sqlfunc

    since = date.today() - timedelta(days=90)
    contacts = db.query(Contact).all()

    inner, middle, outer = [], [], []

    for c in contacts:
        recent_ixns = [i for i in c.interactions if i.date and i.date >= since]
        count = len(recent_ixns)
        avg_quality = (sum(i.quality_score or 7 for i in recent_ixns) / count) if count else 0
        all_dates = [i.date for i in c.interactions if i.date]
        last_date = max(all_dates) if all_dates else None
        days_since = (date.today() - last_date).days if last_date else 9999

        entry = {
            "id": c.id, "name": c.name,
            "relationship_type": c.relationship_type,
            "interactions_90d": count,
            "avg_quality": round(avg_quality, 1) if avg_quality else None,
            "days_since_last": days_since,
        }

        if count >= 4 or avg_quality >= 8:
            inner.append(entry)
        elif count >= 1 and avg_quality >= 4:
            middle.append(entry)
        else:
            outer.append(entry)

    # Sort each tier by interaction count desc
    for tier in [inner, middle, outer]:
        tier.sort(key=lambda x: -x["interactions_90d"])

    return {
        "inner": inner,
        "middle": middle,
        "outer": outer,
        "summary": {
            "inner_count": len(inner),
            "middle_count": len(middle),
            "outer_count": len(outer),
            "total": len(inner) + len(middle) + len(outer),
        }
    }
