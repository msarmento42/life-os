from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Task(Base):
    """Standalone task inbox — Todoist replacement.

    priority: 1 (urgent) → 4 (someday)
    status:   inbox | today | done | cancelled
    area:     work | personal | health | finance | other
    """
    __tablename__ = "tasks"

    id           = Column(Integer, primary_key=True, index=True)
    title        = Column(String, nullable=False)
    notes        = Column(Text)
    due_date     = Column(Date)
    priority     = Column(Integer, default=3)     # 1=urgent 2=high 3=normal 4=someday
    status       = Column(String, default="inbox")  # inbox | today | done | cancelled
    area         = Column(String, default="personal")  # work|personal|health|finance|other

    # Optional link to a project (Projects module)
    project_id   = Column(Integer, ForeignKey("projects.id"), nullable=True)
    project      = relationship("Project", foreign_keys=[project_id])

    created_at   = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)
