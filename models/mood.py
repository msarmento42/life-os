from sqlalchemy import Column, Integer, String, Float, Date, Boolean, DateTime, Text
from sqlalchemy.sql import func
from database import Base


class MoodLog(Base):
    __tablename__ = "mood_logs"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, unique=True)
    mood = Column(Integer)       # 1-10
    energy = Column(Integer)     # 1-10
    stress = Column(Integer)     # 1-10
    anxiety = Column(Integer)    # 1-10
    focus = Column(Integer)      # 1-10
    notes = Column(Text)
    tags = Column(String)        # comma-separated: "productive,social,outdoor"
    created_at = Column(DateTime, default=func.now())
