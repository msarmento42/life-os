from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta
from pydantic import BaseModel
from collections import defaultdict
import io, csv
import math
import statistics

from database import get_db
from models.trading import Strategy, Trade, Position, PortfolioSnapshot

router = APIRouter(prefix="/api/trading", tags=["trading"])


class StrategyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "trend"
    color: str = "#6366f1"

class TradeCreate(BaseModel):
    strategy_id: Optional[int] = None
    symbol: str
    side: str
    quantity: float
    price: float
    date: date
    fees: float = 0.0
    pnl: float = 0.0
    notes: Optional[str] = None

class PositionCreate(BaseModel):
    symbol: str
    quantity: float
    avg_cost: float
    current_price: Optional[float] = None
    asset_class: str = "equity"
    strategy_id: Optional[int] = None

class PositionUpdate(BaseModel):
    quantity: Optional[float] = None
    avg_cost: Optional[float] = None
    current_price: Optional[float] = None

class SnapshotCreate(BaseModel):
    date: date
    total_value: float
    cash: float = 0.0
    positions_value: float = 0.0
    day_pnl: float = 0.0
    total_pnl: float = 0.0
    notes: Optional[str] = None


def _max_drawdown(trades):
    cumulative = 0
    peak = 0
    max_drop = 0
    for trade in sorted(trades, key=lambda t: (t.date, t.id or 0)):
        cumulative += trade.pnl or 0
        peak = max(peak, cumulative)
        max_drop = max(max_drop, peak - cumulative)
    return max_drop


def _sharpe_ratio(trades):
    daily_pnl = defaultdict(float)
    for trade in trades:
        daily_pnl[trade.date] += trade.pnl or 0

    values = list(daily_pnl.values())
    if len(values) < 2:
        return 0

    std_dev = statistics.stdev(values)
    if std_dev == 0:
        return 0

    return statistics.mean(values) / std_dev * math.sqrt(252)


# --- Strategies ---
@router.get("/strategies")
def get_strategies(db: Session = Depends(get_db)):
    strategies = db.query(Strategy).filter(Strategy.is_active == True).all()
    result = []
    for s in strategies:
        trades = s.trades
        total_pnl = sum(t.pnl for t in trades)
        win_trades = sum(1 for t in trades if t.pnl > 0)
        result.append({
            "id": s.id, "name": s.name, "description": s.description,
            "type": s.type, "color": s.color, "is_active": s.is_active,
            "trade_count": len(trades), "total_pnl": round(total_pnl, 2),
            "win_rate": round(win_trades / len(trades) * 100) if trades else 0,
        })
    return result

@router.post("/strategies")
def create_strategy(data: StrategyCreate, db: Session = Depends(get_db)):
    s = Strategy(**data.dict())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

@router.get("/strategies/comparison")
def get_strategy_comparison(db: Session = Depends(get_db)):
    strategies = db.query(Strategy).filter(Strategy.is_active == True).all()
    rows = []

    for strategy in strategies:
        trades = list(strategy.trades)
        total_trades = len(trades)
        wins = [t.pnl or 0 for t in trades if (t.pnl or 0) > 0]
        losses = [t.pnl or 0 for t in trades if (t.pnl or 0) < 0]
        gross_profit = sum(wins)
        gross_loss = abs(sum(losses))
        total_pnl = sum(t.pnl or 0 for t in trades)

        rows.append({
            "id": strategy.id,
            "name": strategy.name,
            "color": strategy.color,
            "type": strategy.type,
            "total_trades": total_trades,
            "win_rate": round(len(wins) / total_trades * 100, 1) if total_trades else 0,
            "avg_win": round(gross_profit / len(wins), 2) if wins else 0,
            "avg_loss": round(gross_loss / len(losses), 2) if losses else 0,
            "profit_factor": round(gross_profit / gross_loss, 2) if gross_loss else 0,
            "total_pnl": round(total_pnl, 2),
            "max_drawdown": round(_max_drawdown(trades), 2),
            "sharpe_ratio": round(_sharpe_ratio(trades), 2),
        })

    return rows

@router.delete("/strategies/{strategy_id}")
def delete_strategy(strategy_id: int, db: Session = Depends(get_db)):
    s = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not s: raise HTTPException(status_code=404, detail="Not found")
    s.is_active = False
    db.commit()
    return {"ok": True}


# --- Trades ---
@router.get("/trades")
def get_trades(strategy_id: Optional[int] = None, symbol: Optional[str] = None,
               limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(Trade)
    if strategy_id: q = q.filter(Trade.strategy_id == strategy_id)
    if symbol: q = q.filter(Trade.symbol.ilike(f"%{symbol}%"))
    trades = q.order_by(Trade.date.desc()).limit(limit).all()
    return [{
        "id": t.id, "symbol": t.symbol, "side": t.side, "quantity": t.quantity,
        "price": t.price, "date": str(t.date), "fees": t.fees, "pnl": t.pnl,
        "notes": t.notes, "strategy_name": t.strategy.name if t.strategy else None,
        "strategy_color": t.strategy.color if t.strategy else None,
        "total_cost": round(t.quantity * t.price + t.fees, 2),
    } for t in trades]

@router.post("/trades")
def create_trade(data: TradeCreate, db: Session = Depends(get_db)):
    t = Trade(**data.dict())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t

@router.delete("/trades/{trade_id}")
def delete_trade(trade_id: int, db: Session = Depends(get_db)):
    t = db.query(Trade).filter(Trade.id == trade_id).first()
    if not t: raise HTTPException(status_code=404, detail="Not found")
    db.delete(t)
    db.commit()
    return {"ok": True}


# --- Positions ---
@router.get("/positions")
def get_positions(db: Session = Depends(get_db)):
    positions = db.query(Position).filter(Position.quantity != 0).all()
    result = []
    for p in positions:
        market_value = (p.current_price or p.avg_cost) * p.quantity
        cost_basis = p.avg_cost * p.quantity
        unrealized_pnl = market_value - cost_basis
        pnl_pct = ((p.current_price or p.avg_cost) / p.avg_cost - 1) * 100 if p.avg_cost else 0
        result.append({
            "id": p.id, "symbol": p.symbol, "quantity": p.quantity,
            "avg_cost": p.avg_cost, "current_price": p.current_price,
            "asset_class": p.asset_class, "market_value": round(market_value, 2),
            "cost_basis": round(cost_basis, 2), "unrealized_pnl": round(unrealized_pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "strategy_name": p.strategy.name if p.strategy else None,
        })
    return result

@router.post("/positions")
def create_position(data: PositionCreate, db: Session = Depends(get_db)):
    existing = db.query(Position).filter(Position.symbol == data.symbol.upper()).first()
    if existing:
        for k, v in data.dict(exclude_none=True).items():
            setattr(existing, k, v)
        existing.symbol = existing.symbol.upper()
        db.commit()
        return existing
    p = Position(**{**data.dict(), "symbol": data.symbol.upper()})
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

@router.put("/positions/{pos_id}")
def update_position(pos_id: int, data: PositionUpdate, db: Session = Depends(get_db)):
    p = db.query(Position).filter(Position.id == pos_id).first()
    if not p: raise HTTPException(status_code=404, detail="Not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p

@router.delete("/positions/{pos_id}")
def delete_position(pos_id: int, db: Session = Depends(get_db)):
    p = db.query(Position).filter(Position.id == pos_id).first()
    if not p: raise HTTPException(status_code=404, detail="Not found")
    db.delete(p)
    db.commit()
    return {"ok": True}


# --- Portfolio Snapshots ---
@router.get("/snapshots")
def get_snapshots(days: int = 90, db: Session = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    return db.query(PortfolioSnapshot).filter(
        PortfolioSnapshot.date >= since
    ).order_by(PortfolioSnapshot.date.asc()).all()

@router.post("/snapshots")
def create_snapshot(data: SnapshotCreate, db: Session = Depends(get_db)):
    existing = db.query(PortfolioSnapshot).filter(PortfolioSnapshot.date == data.date).first()
    if existing:
        for k, v in data.dict(exclude_none=True).items():
            setattr(existing, k, v)
        db.commit()
        return existing
    snap = PortfolioSnapshot(**data.dict())
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return snap


# --- Dashboard ---
@router.get("/dashboard")
def trading_dashboard(db: Session = Depends(get_db)):
    today = date.today()
    month_start = today.replace(day=1)

    # P&L stats
    total_realized = db.query(func.sum(Trade.pnl)).scalar() or 0
    month_pnl = db.query(func.sum(Trade.pnl)).filter(Trade.date >= month_start).scalar() or 0
    total_trades = db.query(Trade).count()
    wins = db.query(Trade).filter(Trade.pnl > 0).count()
    win_rate = round(wins / total_trades * 100) if total_trades else 0

    # Positions summary
    positions = db.query(Position).filter(Position.quantity != 0).all()
    total_market_value = sum((p.current_price or p.avg_cost) * p.quantity for p in positions)
    total_unrealized = sum(((p.current_price or p.avg_cost) - p.avg_cost) * p.quantity for p in positions)

    # Latest snapshot
    latest_snap = db.query(PortfolioSnapshot).order_by(PortfolioSnapshot.date.desc()).first()

    # Strategy P&L breakdown
    strategies = db.query(Strategy).filter(Strategy.is_active == True).all()
    strategy_pnl = [{"name": s.name, "color": s.color,
                     "pnl": round(sum(t.pnl for t in s.trades), 2)} for s in strategies]

    return {
        "total_realized_pnl": round(total_realized, 2),
        "month_pnl": round(month_pnl, 2),
        "total_trades": total_trades,
        "win_rate": win_rate,
        "open_positions": len(positions),
        "total_market_value": round(total_market_value, 2),
        "total_unrealized_pnl": round(total_unrealized, 2),
        "portfolio_value": latest_snap.total_value if latest_snap else None,
        "strategy_pnl": strategy_pnl,
    }

# ─────────────────────────────────────────────
# T2.01 — Backtest-to-Live Gap Analysis
# ─────────────────────────────────────────────

def _run_trading_migrations():
    """Add is_paper column to trades table if not present."""
    from sqlalchemy import text, inspect
    from database import engine
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns("trades")]
    if "is_paper" not in cols:
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE trades ADD COLUMN is_paper BOOLEAN DEFAULT 1"))
                conn.commit()
            except Exception:
                pass

try:
    _run_trading_migrations()
except Exception:
    pass


@router.get("/gap-analysis")
def get_gap_analysis(db: Session = Depends(get_db)):
    """
    Backtest-to-live gap analysis.
    Compares paper (simulated / is_paper=True) vs. live (is_paper=False) performance per strategy.
    Since Life OS stores manual trade records (not automated backtest results), we treat:
      - is_paper=True  → paper / backtest trades
      - is_paper=False → live trades
    Strategies with only one type are still shown with the available data.
    """
    from sqlalchemy import text

    strategies = db.query(Strategy).filter(Strategy.is_active == True).all()

    strategy_rows = []
    for s in strategies:
        trades = s.trades

        # Split by is_paper attribute (defaults to True if column missing)
        paper_trades = [t for t in trades if getattr(t, "is_paper", True) in (True, 1, None)]
        live_trades  = [t for t in trades if getattr(t, "is_paper", True) in (False, 0)]

        def _stats(tlist):
            if not tlist:
                return None
            total   = len(tlist)
            wins    = sum(1 for t in tlist if t.pnl > 0)
            total_pnl = sum(t.pnl for t in tlist)
            avg_pnl = total_pnl / total if total else 0
            avg_win  = sum(t.pnl for t in tlist if t.pnl > 0) / wins if wins else 0
            losses   = total - wins
            avg_loss = sum(t.pnl for t in tlist if t.pnl <= 0) / losses if losses else 0
            win_rate = round(wins / total * 100, 1) if total else 0
            # Sharpe approximation: mean(pnl) / std(pnl)
            if total > 1:
                import statistics
                pnls = [t.pnl for t in tlist]
                std  = statistics.stdev(pnls)
                sharpe = round(avg_pnl / std, 2) if std else None
            else:
                sharpe = None
            return {
                "trade_count": total,
                "win_rate": win_rate,
                "avg_pnl":  round(avg_pnl, 2),
                "total_pnl": round(total_pnl, 2),
                "sharpe": sharpe,
            }

        paper_stats = _stats(paper_trades)
        live_stats  = _stats(live_trades)

        # Gap = (live_win_rate - paper_win_rate) / paper_win_rate * 100
        gap_pct = None
        if paper_stats and live_stats and paper_stats["win_rate"]:
            gap_pct = round((live_stats["win_rate"] - paper_stats["win_rate"]) / paper_stats["win_rate"] * 100, 1)

        strategy_rows.append({
            "strategy_id":   s.id,
            "name":          s.name,
            "color":         s.color,
            "paper":         paper_stats,
            "live":          live_stats,
            "gap_pct":       gap_pct,
            "overfit_warning": gap_pct is not None and gap_pct < -50,
        })

    # Summary
    strategies_with_both = [r for r in strategy_rows if r["paper"] and r["live"]]
    avg_gap = round(sum(r["gap_pct"] for r in strategies_with_both) / len(strategies_with_both), 1) if strategies_with_both else None
    most_overfit = None
    if strategies_with_both:
        worst = min(strategies_with_both, key=lambda r: r["gap_pct"] or 0)
        most_overfit = worst["name"] if worst["gap_pct"] is not None and worst["gap_pct"] < -50 else None

    return {
        "strategies": strategy_rows,
        "summary": {
            "avg_gap_pct": avg_gap,
            "most_overfit_strategy": most_overfit,
            "strategies_with_live_data": len([r for r in strategy_rows if r["live"]]),
            "strategies_paper_only":     len([r for r in strategy_rows if r["paper"] and not r["live"]]),
            "note": (
                "Trades with is_paper=True are treated as paper/backtest. "
                "Trades with is_paper=False are live. All existing trades default to paper=True."
            ),
        },
    }


@router.get("/trades/export")
def export_trades(db: Session = Depends(get_db)):
    trades = db.query(Trade).order_by(Trade.date.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Symbol", "Side", "Quantity", "Price", "Fees", "P&L", "Strategy", "Notes"])
    for t in trades:
        writer.writerow([t.date, t.symbol, t.side, t.quantity, t.price, t.fees, t.pnl,
                         t.strategy.name if t.strategy else "", t.notes])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()),
                             media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=trades.csv"})
