from sqlalchemy import Column, Integer, String, Float, Date, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class BodyMetric(Base):
    __tablename__ = "body_metrics"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    weight_lbs = Column(Float)
    body_fat_pct = Column(Float)
    muscle_mass_lbs = Column(Float)
    waist_in = Column(Float)
    resting_hr = Column(Integer)
    hrv = Column(Integer)  # Heart Rate Variability in ms (manual entry from wearable)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())


class Workout(Base):
    __tablename__ = "workouts"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    type = Column(String)  # strength, cardio, yoga, sport, other
    title = Column(String)
    duration_min = Column(Integer)
    calories_burned = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    exercises = relationship("WorkoutExercise", back_populates="workout", cascade="all, delete-orphan")


class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"
    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"))
    name = Column(String, nullable=False)
    sets = Column(Integer)
    reps = Column(Integer)
    weight_lbs = Column(Float)
    duration_sec = Column(Integer)
    notes = Column(Text)
    workout = relationship("Workout", back_populates="exercises")


class SleepLog(Base):
    __tablename__ = "sleep_logs"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    hours = Column(Float)
    quality = Column(Integer)  # 1-5
    bedtime = Column(String)
    wake_time = Column(String)
    notes = Column(Text)


class Supplement(Base):
    __tablename__ = "supplements"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dose = Column(String)
    frequency = Column(String, default="daily")
    timing = Column(String)  # morning, evening, with_food, etc.
    brand = Column(String)
    purpose = Column(String)
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())


class BloodWorkResult(Base):
    __tablename__ = "blood_work_results"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    marker_name = Column(String, nullable=False)
    value = Column(Float)
    unit = Column(String)
    reference_low = Column(Float)
    reference_high = Column(Float)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())


class NutritionLog(Base):
    __tablename__ = "nutrition_logs"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    meal = Column(String, default="other")  # breakfast, lunch, dinner, snack, other
    food_item = Column(String, nullable=False)
    calories = Column(Integer)
    protein_g = Column(Float)
    carbs_g = Column(Float)
    fat_g = Column(Float)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())


class MacroTarget(Base):
    __tablename__ = "macro_targets"
    id = Column(Integer, primary_key=True, index=True)
    calories = Column(Integer, default=2200)
    protein_g = Column(Float, default=180.0)
    carbs_g = Column(Float, default=220.0)
    fat_g = Column(Float, default=70.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())


class InjuryLog(Base):
    __tablename__ = "injury_logs"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)            # date of injury
    location = Column(String, nullable=False)                   # body location: "left knee", "lower back", etc.
    type = Column(String, default="strain")                     # strain, sprain, tendinitis, fracture, soreness, other
    severity = Column(Integer, default=5)                       # 1 (mild) to 10 (severe)
    triggers = Column(Text)                                     # what caused it
    treatment = Column(Text)                                    # what's being done about it
    notes = Column(Text)
    recovery_date = Column(Date)                                # actual recovery date (null = still active)
    estimated_recovery_date = Column(Date)                      # estimated recovery date
    created_at = Column(DateTime, default=func.now())


class MedicalEvent(Base):
    __tablename__ = "medical_events"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)           # when it happened / is scheduled
    type = Column(String, default="checkup")                  # checkup, lab, dental, vision, specialist, vaccination, other
    title = Column(String, nullable=False)                    # e.g. "Annual physical", "Dentist cleaning"
    provider = Column(String)                                 # doctor / clinic name
    notes = Column(Text)
    outcome = Column(Text)                                    # what happened / results summary
    next_due = Column(Date)                                   # next recommended visit date
    is_upcoming = Column(Boolean, default=False)              # true = scheduled in future, false = past event
    created_at = Column(DateTime, default=func.now())
