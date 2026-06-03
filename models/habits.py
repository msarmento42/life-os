from sqlalchemy import Column, Integer, String, Float, Date, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Habit(Base):
    __tablename__ = "habits"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    icon = Column(String, default="✅")
    color = Column(String, default="#6366f1")
    frequency = Column(String, default="daily")  # daily, weekly
    target_days_per_week = Column(Integer, default=7)
    is_active = Column(Boolean, default=True)
    # S5.01: depth fields
    goal_id = Column(Integer, ForeignKey("objectives.id"), nullable=True)
    context = Column(Text)          # why this habit matters / when to do it
    willpower_cost = Column(Integer, default=3)  # 1=effortless … 5=hard
    created_at = Column(DateTime, default=func.now())
    logs = relationship("HabitLog", back_populates="habit", cascade="all, delete-orphan")


class HabitLog(Base):
    __tablename__ = "habit_logs"
    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id"))
    date = Column(Date, nullable=False)
    completed = Column(Boolean, default=True)
    notes = Column(Text)
    habit = relationship("Habit", back_populates="logs")


class Routine(Base):
    __tablename__ = "routines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, default="morning")  # morning, evening, weekly
    icon = Column(String, default="🌅")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    items = relationship("RoutineItem", back_populates="routine", cascade="all, delete-orphan", order_by="RoutineItem.order_index")


class RoutineItem(Base):
    __tablename__ = "routine_items"
    id = Column(Integer, primary_key=True, index=True)
    routine_id = Column(Integer, ForeignKey("routines.id"))
    description = Column(String, nullable=False)
    duration_min = Column(Integer, default=5)
    order_index = Column(Integer, default=0)
    routine = relationship("Routine", back_populates="items")
