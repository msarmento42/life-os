from sqlalchemy import Column, Integer, String, Date, DateTime, Text, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class TimeBlock(Base):
    """A single block of time tracked during the day.

    category:    deep_work | meetings | admin | health | social | leisure | recovery | learning
    planned:     True = scheduled in advance; False = logged after the fact
    energy_start/end: 1-10 subjective energy level at block start and end
    """
    __tablename__ = "time_blocks"

    id            = Column(Integer, primary_key=True, index=True)
    date          = Column(Date, nullable=False, index=True)
    start_time    = Column(String, nullable=False)   # "HH:MM" 24h format
    end_time      = Column(String, nullable=False)   # "HH:MM" 24h format
    duration_min  = Column(Integer)                  # computed & stored for fast queries
    category      = Column(String, nullable=False, default="deep_work")
    subcategory   = Column(String)                   # e.g. "coding", "email", "gym"
    title         = Column(String)                   # optional short label
    notes         = Column(Text)
    project_id    = Column(Integer, ForeignKey("projects.id"), nullable=True)
    project       = relationship("Project", foreign_keys=[project_id])
    energy_start  = Column(Integer)                  # 1-10
    energy_end    = Column(Integer)                  # 1-10
    planned       = Column(Boolean, default=False)   # False = logged retroactively
    created_at    = Column(DateTime, default=func.now())


class FocusLog(Base):
    """Lightweight daily attention/focus journal (one entry per day).

    Captures what broke focus, what drained/energized, and a free-form notes field.
    """
    __tablename__ = "focus_logs"

    id            = Column(Integer, primary_key=True, index=True)
    date          = Column(Date, nullable=False, unique=True, index=True)
    primary_focus = Column(String)   # e.g. "Life OS build session"
    distractions  = Column(Text)     # free text — "Slack pings, email rabbit hole"
    energy_drain  = Column(Text)     # what drained energy
    energy_boost  = Column(Text)     # what gave energy
    deep_work_hrs = Column(Float)    # self-reported deep work hours (can differ from blocks)
    overall_score = Column(Integer)  # 1-10 subjective focus quality
    notes         = Column(Text)
    created_at    = Column(DateTime, default=func.now())
