from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Contact(Base):
    __tablename__ = "contacts"
    __table_args__ = (
        Index("ix_contacts_last_contact", "last_contact"),
        Index("ix_contacts_status", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    photo_url = Column(String)
    relationship_type = Column(String, default="friend")  # friend, family, colleague, mentor, acquaintance
    company = Column(String)
    job_title = Column(String)
    location = Column(String)
    birthday = Column(Date)
    email = Column(String)
    phone = Column(String)
    linkedin = Column(String)
    twitter = Column(String)
    instagram = Column(String)
    notes = Column(Text)
    # Cadence in days: how often should you reach out?
    cadence_days = Column(Integer, default=30)
    last_contact = Column(Date)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    interactions = relationship("Interaction", back_populates="contact", cascade="all, delete-orphan")
    reminders = relationship("FollowUpReminder", back_populates="contact", cascade="all, delete-orphan")
    tags = relationship("ContactTag", back_populates="contact", cascade="all, delete-orphan")


class Interaction(Base):
    __tablename__ = "interactions"
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    date = Column(Date, nullable=False)
    type = Column(String, default="other")  # coffee, call, email, event, message, other
    notes = Column(Text)
    sentiment = Column(String, default="positive")  # positive, neutral, negative
    quality_score = Column(Integer, default=7)  # S6.03: 1-10; how meaningful/energizing was it?
    created_at = Column(DateTime, default=func.now())
    contact = relationship("Contact", back_populates="interactions")


class FollowUpReminder(Base):
    __tablename__ = "follow_up_reminders"
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    due_date = Column(Date, nullable=False)
    note = Column(Text)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    contact = relationship("Contact", back_populates="reminders")


class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    color = Column(String, default="#6366f1")
    contacts = relationship("ContactTag", back_populates="tag")


class ContactTag(Base):
    __tablename__ = "contact_tags"
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    tag_id = Column(Integer, ForeignKey("tags.id"))
    contact = relationship("Contact", back_populates="tags")
    tag = relationship("Tag", back_populates="contacts")
