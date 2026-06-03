from sqlalchemy import Column, Integer, String, Float, Date, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Objective(Base):
    """OKR Objective — quarterly goal."""
    __tablename__ = "objectives"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    quarter = Column(Integer, nullable=False)  # 1-4
    year = Column(Integer, nullable=False)
    color = Column(String, default="#6366f1")
    status = Column(String, default="active")  # active, completed, abandoned
    created_at = Column(DateTime, default=func.now())
    key_results = relationship("KeyResult", back_populates="objective", cascade="all, delete-orphan")


class KeyResult(Base):
    __tablename__ = "key_results"
    id = Column(Integer, primary_key=True, index=True)
    objective_id = Column(Integer, ForeignKey("objectives.id"))
    title = Column(String, nullable=False)
    target_value = Column(Float, default=100.0)
    current_value = Column(Float, default=0.0)
    unit = Column(String, default="%")
    due_date = Column(Date)
    status = Column(String, default="active")
    notes = Column(Text)
    objective = relationship("Objective", back_populates="key_results")


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="active")  # active, completed, paused, backlog
    color = Column(String, default="#6366f1")
    icon = Column(String, default="📁")
    due_date = Column(Date)
    objective_id = Column(Integer, ForeignKey("objectives.id"), nullable=True)
    blocks_project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)  # P2.01: this project blocks another
    project_type = Column(String, default="other")  # P2.03: product/content/learning/health/financial/relationship/operational/other
    created_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)  # P2.02: set when status → completed/abandoned
    tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete-orphan", order_by="ProjectTask.order_index")
    postmortem = relationship("ProjectPostmortem", back_populates="project", uselist=False, cascade="all, delete-orphan")


class ProjectTask(Base):
    __tablename__ = "project_tasks"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String, nullable=False)
    is_completed = Column(Boolean, default=False)
    due_date = Column(Date)
    priority = Column(String, default="medium")  # low, medium, high
    notes = Column(Text)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    project = relationship("Project", back_populates="tasks")


class ProjectPostmortem(Base):
    """Structured reflection written after a project completes or is abandoned."""
    __tablename__ = "project_postmortems"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), unique=True, nullable=False)
    what_worked = Column(Text, nullable=False)
    what_didnt = Column(Text, nullable=False)
    key_lesson = Column(Text, nullable=False)
    would_repeat = Column(Boolean, default=True)
    rating = Column(Integer, default=3)  # 1-5
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    project = relationship("Project", back_populates="postmortem")
