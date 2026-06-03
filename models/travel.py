from sqlalchemy import Column, Integer, String, Float, Date, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Trip(Base):
    __tablename__ = "trips"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    country = Column(String)
    city = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String, default="planning")  # planning, booked, completed
    budget = Column(Float, default=0.0)
    cover_image = Column(String)
    notes = Column(Text)
    # Reflection fields (filled in after trip completes)
    rating = Column(Integer)          # 1-10 overall trip rating
    highlights = Column(Text)         # What made it great
    lowlights = Column(Text)          # What didn't work
    would_return = Column(Boolean)    # Would you go back?
    created_at = Column(DateTime, default=func.now())
    itinerary_items = relationship("ItineraryItem", back_populates="trip", cascade="all, delete-orphan")
    packing_lists = relationship("PackingList", back_populates="trip", cascade="all, delete-orphan")
    expenses = relationship("TripExpense", back_populates="trip", cascade="all, delete-orphan")
    documents = relationship("TravelDocument", back_populates="trip", cascade="all, delete-orphan")


class ItineraryItem(Base):
    __tablename__ = "itinerary_items"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    day_number = Column(Integer, nullable=False)
    date = Column(Date)
    time = Column(String)
    type = Column(String)  # flight, hotel, activity, restaurant, transport
    title = Column(String, nullable=False)
    location = Column(String)
    confirmation_number = Column(String)
    notes = Column(Text)
    link = Column(String)
    cost = Column(Float, default=0.0)
    order_index = Column(Integer, default=0)
    trip = relationship("Trip", back_populates="itinerary_items")


class PackingList(Base):
    __tablename__ = "packing_lists"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True)
    name = Column(String, nullable=False)
    is_template = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    trip = relationship("Trip", back_populates="packing_lists")
    items = relationship("PackingItem", back_populates="packing_list", cascade="all, delete-orphan")


class PackingItem(Base):
    __tablename__ = "packing_items"
    id = Column(Integer, primary_key=True, index=True)
    packing_list_id = Column(Integer, ForeignKey("packing_lists.id"))
    name = Column(String, nullable=False)
    category = Column(String, default="General")
    is_checked = Column(Boolean, default=False)
    quantity = Column(Integer, default=1)
    packing_list = relationship("PackingList", back_populates="items")


class TripExpense(Base):
    __tablename__ = "trip_expenses"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    date = Column(Date)
    amount = Column(Float, nullable=False)
    category = Column(String, default="General")
    description = Column(String)
    notes = Column(Text)
    trip = relationship("Trip", back_populates="expenses")


class TravelDocument(Base):
    __tablename__ = "travel_documents"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True)
    type = Column(String)  # passport, visa, insurance, emergency_contacts
    title = Column(String, nullable=False)
    content = Column(Text)
    file_path = Column(String)
    expiry_date = Column(Date)
    created_at = Column(DateTime, default=func.now())
    trip = relationship("Trip", back_populates="documents")


class Destination(Base):
    """All visited/planned/wishlist destinations for the map."""
    __tablename__ = "destinations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    city = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String, default="visited")  # visited, planned, wishlist
    visited_year = Column(Integer)
    notes = Column(Text)


class WishlistDestination(Base):
    __tablename__ = "wishlist_destinations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String)
    reason = Column(Text)
    estimated_cost = Column(Float)
    priority = Column(Integer, default=5)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
