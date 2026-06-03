from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Decision(Base):
    """A logged decision in the Decision Journal.

    stakes:        low | medium | high | critical
    decision_type: financial | career | health | relationship | strategic | personal | other
    status:        open | resolved
    confidence:    1-10 at time of decision
    decision_quality: 1-10 (retroactive — good process != good outcome)
    module_type:   finance | trading | health | crm | projects | None
    module_id:     FK to that module's record (nullable, enforced in app logic)
    """
    __tablename__ = "decisions"

    id                = Column(Integer, primary_key=True, index=True)
    date              = Column(Date, nullable=False, index=True)   # date decision was made
    title             = Column(String, nullable=False)
    description       = Column(Text)                               # what exactly was decided
    stakes            = Column(String, default="medium")           # low|medium|high|critical
    decision_type     = Column(String, default="personal")         # financial|career|health|relationship|strategic|personal|other
    reasoning         = Column(Text)                               # why this choice
    confidence        = Column(Integer)                            # 1-10 at time of decision
    predicted_outcome = Column(Text)                               # what you expected to happen
    outcome_date      = Column(Date)                               # when you expect to know the result
    actual_outcome    = Column(Text)                               # what actually happened
    decision_quality  = Column(Integer)                            # 1-10 retroactive quality score
    lesson            = Column(Text)                               # what you learned
    status            = Column(String, default="open")             # open|resolved
    module_type       = Column(String)                             # finance|trading|health|crm|projects|None
    module_id         = Column(Integer)                            # ID in that module's table
    created_at        = Column(DateTime, default=func.now())
    resolved_at       = Column(DateTime)

    tags = relationship("DecisionTag", back_populates="decision", cascade="all, delete-orphan")


class DecisionTag(Base):
    """Many-to-many style tags for a decision (domain labels, free-form)."""
    __tablename__ = "decision_tags"

    id          = Column(Integer, primary_key=True, index=True)
    decision_id = Column(Integer, ForeignKey("decisions.id"), nullable=False, index=True)
    tag         = Column(String, nullable=False)

    decision = relationship("Decision", back_populates="tags")
