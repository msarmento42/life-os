from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from database import Base


class Correlation(Base):
    __tablename__ = "correlations"
    id = Column(Integer, primary_key=True, index=True)
    entity_a = Column(String, nullable=False)
    entity_b = Column(String, nullable=False)
    coefficient = Column(Float, nullable=False)
    sample_size = Column(Integer, default=0)
    label = Column(String)
    computed_at = Column(DateTime, default=func.now())
