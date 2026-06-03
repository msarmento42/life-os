from sqlalchemy import Column, Integer, String, Float, Date, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # checking, savings, investment, crypto, real_estate, liability
    institution = Column(String)
    balance = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    snapshots = relationship("NetWorthSnapshot", back_populates="account")


class NetWorthSnapshot(Base):
    __tablename__ = "net_worth_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    balance = Column(Float)
    snapshot_date = Column(Date, nullable=False)
    account = relationship("Account", back_populates="snapshots")


class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    color = Column(String, default="#6366f1")
    icon = Column(String, default="💰")
    type = Column(String, default="expense")  # income or expense
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String, nullable=False)  # income, expense
    category_id = Column(Integer, ForeignKey("categories.id"))
    description = Column(String)
    notes = Column(Text)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    created_at = Column(DateTime, default=func.now())
    category = relationship("Category", back_populates="transactions")
    account = relationship("Account")


class Budget(Base):
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    category = relationship("Category", back_populates="budgets")


class RecurringItem(Base):
    __tablename__ = "recurring_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"))
    frequency = Column(String, default="monthly")  # monthly, yearly, weekly
    next_date = Column(Date)
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    category = relationship("Category")


class SavingsGoal(Base):
    __tablename__ = "savings_goals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    monthly_allocation = Column(Float, default=0.0)  # how much to put toward this goal each month
    target_date = Column(Date)
    color = Column(String, default="#6366f1")
    icon = Column(String, default="🎯")
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
