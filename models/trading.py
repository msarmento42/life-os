from sqlalchemy import Column, Integer, String, Float, Date, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Strategy(Base):
    __tablename__ = "strategies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    type = Column(String, default="trend")  # trend, mean_reversion, momentum, arbitrage, other
    is_active = Column(Boolean, default=True)
    color = Column(String, default="#6366f1")
    created_at = Column(DateTime, default=func.now())
    trades = relationship("Trade", back_populates="strategy")


class Trade(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=True)
    symbol = Column(String, nullable=False)
    side = Column(String, nullable=False)  # buy, sell, short, cover
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    fees = Column(Float, default=0.0)
    pnl = Column(Float, default=0.0)   # realized P&L on close
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    strategy = relationship("Strategy", back_populates="trades")


class Position(Base):
    """Current open positions snapshot."""
    __tablename__ = "positions"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False, unique=True)
    quantity = Column(Float, nullable=False)
    avg_cost = Column(Float, nullable=False)
    current_price = Column(Float)
    asset_class = Column(String, default="equity")  # equity, crypto, option, etf
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=True)
    last_updated = Column(DateTime, default=func.now())
    strategy = relationship("Strategy")


class PortfolioSnapshot(Base):
    """Daily portfolio value snapshot."""
    __tablename__ = "portfolio_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, unique=True)
    total_value = Column(Float)
    cash = Column(Float, default=0.0)
    positions_value = Column(Float, default=0.0)
    day_pnl = Column(Float, default=0.0)
    total_pnl = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
