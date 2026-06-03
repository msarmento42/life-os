from sqlalchemy import Column, Integer, String, Float, Date, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Book(Base):
    __tablename__ = "books"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    author = Column(String)
    genre = Column(String)
    status = Column(String, default="want_to_read")  # reading, completed, want_to_read, abandoned
    rating = Column(Integer)  # 1-5
    started_date = Column(Date)
    finished_date = Column(Date)
    cover_url = Column(String)
    page_count = Column(Integer)
    current_page = Column(Integer, default=0)
    source = Column(String)  # physical, kindle, audiobook, library
    notes = Column(Text)
    # S6.05: depth fields
    changed_behavior = Column(Boolean, default=False)
    linked_project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    linked_decision_id = Column(Integer, ForeignKey("decisions.id"), nullable=True)
    next_review_date = Column(Date)
    review_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    book_notes = relationship("BookNote", back_populates="book", cascade="all, delete-orphan")
    quotes = relationship("BookQuote", back_populates="book", cascade="all, delete-orphan")


class BookNote(Base):
    __tablename__ = "book_notes"
    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    content = Column(Text, nullable=False)
    page_number = Column(Integer)
    created_at = Column(DateTime, default=func.now())
    book = relationship("Book", back_populates="book_notes")


class BookQuote(Base):
    __tablename__ = "book_quotes"
    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    quote = Column(Text, nullable=False)
    page_number = Column(Integer)
    created_at = Column(DateTime, default=func.now())
    book = relationship("Book", back_populates="quotes")
