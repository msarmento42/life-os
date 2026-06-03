from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel
import io
import csv

from database import get_db
from models.finance import Account, NetWorthSnapshot, Category, Transaction, Budget, RecurringItem, SavingsGoal

router = APIRouter(prefix="/api/finance", tags=["finance"])


# --- Pydantic Schemas ---
class AccountCreate(BaseModel):
    name: str
    type: str
    institution: Optional[str] = None
    balance: float = 0.0
    currency: str = "USD"
    notes: Optional[str] = None

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    institution: Optional[str] = None
    balance: Optional[float] = None
    notes: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    icon: str = "💰"
    type: str = "expense"

class TransactionCreate(BaseModel):
    date: date
    amount: float
    type: str
    category_id: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    account_id: Optional[int] = None

class BudgetCreate(BaseModel):
    category_id: int
    month: int
    year: int
    amount: float

class RecurringCreate(BaseModel):
    name: str
    amount: float
    category_id: Optional[int] = None
    frequency: str = "monthly"
    next_date: Optional[date] = None
    notes: Optional[str] = None

class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    monthly_allocation: float = 0.0
    target_date: Optional[date] = None
    color: str = "#6366f1"
    icon: str = "🎯"
    notes: Optional[str] = None

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    monthly_allocation: Optional[float] = None
    target_date: Optional[date] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    notes: Optional[str] = None


# --- Accounts ---
@router.get("/accounts")
def get_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()

@router.post("/accounts")
def create_account(data: AccountCreate, db: Session = Depends(get_db)):
    account = Account(**data.dict())
    db.add(account)
    db.commit()
    db.refresh(account)
    # Save snapshot
    snap = NetWorthSnapshot(account_id=account.id, balance=account.balance, snapshot_date=date.today())
    db.add(snap)
    db.commit()
    return account

@router.put("/accounts/{account_id}")
def update_account(account_id: int, data: AccountUpdate, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(account, k, v)
    db.commit()
    db.refresh(account)
    # Save snapshot if balance changed
    snap = NetWorthSnapshot(account_id=account.id, balance=account.balance, snapshot_date=date.today())
    db.add(snap)
    db.commit()
    return account

@router.delete("/accounts/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(account)
    db.commit()
    return {"ok": True}


# --- Net Worth ---
@router.get("/net-worth")
def get_net_worth(db: Session = Depends(get_db)):
    accounts = db.query(Account).all()
    assets = sum(a.balance for a in accounts if a.type != "liability")
    liabilities = sum(a.balance for a in accounts if a.type == "liability")
    net_worth = assets - liabilities

    # Allocation by type
    allocation = {}
    for a in accounts:
        t = a.type
        allocation[t] = allocation.get(t, 0) + a.balance

    # Monthly trend (last 6 months of snapshots)
    from sqlalchemy import text
    trend_rows = db.execute(text("""
        SELECT strftime('%Y-%m', snapshot_date) as month,
               SUM(CASE WHEN a.type != 'liability' THEN s.balance ELSE -s.balance END) as net_worth
        FROM net_worth_snapshots s
        JOIN accounts a ON s.account_id = a.id
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
    """)).fetchall()
    trend = [{"month": r[0], "net_worth": round(r[1], 2)} for r in reversed(trend_rows)]

    return {
        "net_worth": round(net_worth, 2),
        "assets": round(assets, 2),
        "liabilities": round(liabilities, 2),
        "allocation": {k: round(v, 2) for k, v in allocation.items()},
        "trend": trend,
        "accounts": accounts,
    }


# --- Categories ---
@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@router.post("/categories")
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    cat = Category(**data.dict())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/categories/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
    return {"ok": True}


# --- Transactions ---
@router.get("/transactions")
def get_transactions(
    month: Optional[int] = None,
    year: Optional[int] = None,
    category_id: Optional[int] = None,
    type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    q = db.query(Transaction)
    if month:
        q = q.filter(extract("month", Transaction.date) == month)
    if year:
        q = q.filter(extract("year", Transaction.date) == year)
    if category_id:
        q = q.filter(Transaction.category_id == category_id)
    if type:
        q = q.filter(Transaction.type == type)
    total = q.count()
    txns = q.order_by(Transaction.date.desc()).offset(offset).limit(limit).all()

    result = []
    for t in txns:
        d = {
            "id": t.id,
            "date": str(t.date),
            "amount": t.amount,
            "type": t.type,
            "description": t.description,
            "notes": t.notes,
            "category_id": t.category_id,
            "account_id": t.account_id,
            "category_name": t.category.name if t.category else None,
            "category_color": t.category.color if t.category else None,
            "category_icon": t.category.icon if t.category else None,
        }
        result.append(d)
    return {"transactions": result, "total": total}

@router.post("/transactions")
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    txn = Transaction(**data.dict())
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn

@router.delete("/transactions/{txn_id}")
def delete_transaction(txn_id: int, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()
    return {"ok": True}

@router.get("/transactions/export")
def export_transactions(db: Session = Depends(get_db)):
    txns = db.query(Transaction).order_by(Transaction.date.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Type", "Amount", "Category", "Description", "Notes"])
    for t in txns:
        writer.writerow([t.date, t.type, t.amount,
                         t.category.name if t.category else "", t.description, t.notes])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()),
                             media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=transactions.csv"})


# --- Budgets ---
@router.get("/budgets")
def get_budgets(month: int, year: int, db: Session = Depends(get_db)):
    budgets = db.query(Budget).filter(Budget.month == month, Budget.year == year).all()

    result = []
    for b in budgets:
        # Get actual spend for this category this month
        actual = db.query(func.sum(Transaction.amount)).filter(
            Transaction.category_id == b.category_id,
            Transaction.type == "expense",
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year
        ).scalar() or 0.0

        result.append({
            "id": b.id,
            "category_id": b.category_id,
            "category_name": b.category.name if b.category else "",
            "category_color": b.category.color if b.category else "#6366f1",
            "category_icon": b.category.icon if b.category else "💰",
            "budget": b.amount,
            "actual": round(actual, 2),
            "variance": round(b.amount - actual, 2),
            "pct": round((actual / b.amount * 100) if b.amount > 0 else 0, 1),
            "month": b.month,
            "year": b.year,
        })
    return result

@router.post("/budgets")
def create_budget(data: BudgetCreate, db: Session = Depends(get_db)):
    # Upsert
    existing = db.query(Budget).filter(
        Budget.category_id == data.category_id,
        Budget.month == data.month,
        Budget.year == data.year
    ).first()
    if existing:
        existing.amount = data.amount
        db.commit()
        db.refresh(existing)
        return existing
    b = Budget(**data.dict())
    db.add(b)
    db.commit()
    db.refresh(b)
    return b

@router.delete("/budgets/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    b = db.query(Budget).filter(Budget.id == budget_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(b)
    db.commit()
    return {"ok": True}


# --- Recurring Items ---
@router.get("/recurring")
def get_recurring(db: Session = Depends(get_db)):
    from datetime import timedelta
    today = date.today()
    upcoming_threshold = today + timedelta(days=7)
    items = db.query(RecurringItem).filter(RecurringItem.is_active == True).all()
    result = []
    for r in items:
        result.append({
            "id": r.id,
            "name": r.name,
            "amount": r.amount,
            "frequency": r.frequency,
            "next_date": str(r.next_date) if r.next_date else None,
            "is_upcoming": r.next_date and today <= r.next_date <= upcoming_threshold,
            "category_name": r.category.name if r.category else None,
            "category_color": r.category.color if r.category else "#6366f1",
            "notes": r.notes,
        })
    return result

@router.post("/recurring")
def create_recurring(data: RecurringCreate, db: Session = Depends(get_db)):
    item = RecurringItem(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/recurring/{item_id}")
def delete_recurring(item_id: int, db: Session = Depends(get_db)):
    item = db.query(RecurringItem).filter(RecurringItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


# --- Goals ---
@router.get("/goals")
def get_goals(db: Session = Depends(get_db)):
    return db.query(SavingsGoal).all()

@router.post("/goals")
def create_goal(data: GoalCreate, db: Session = Depends(get_db)):
    goal = SavingsGoal(**data.dict())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal

@router.put("/goals/{goal_id}")
def update_goal(goal_id: int, data: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(goal, k, v)
    db.commit()
    db.refresh(goal)
    return goal

@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return {"ok": True}


# --- Cash Flow Projection ---
@router.get("/cashflow-projection")
def get_cashflow_projection(db: Session = Depends(get_db)):
    """
    Project the next 12 months of inflows/outflows from active recurring items.
    Returns monthly breakdown: month label, income, expenses, net, and running balance.
    Starting balance = sum of all non-liability account balances.
    """
    from dateutil.relativedelta import relativedelta
    import calendar

    today = date.today()
    start = date(today.year, today.month, 1)  # first of current month

    # Starting balance = total liquid/investment assets
    accounts = db.query(Account).all()
    starting_balance = sum(
        a.balance for a in accounts if a.type not in ("liability",)
    )

    # Active recurring items
    recurring = db.query(RecurringItem).filter(RecurringItem.is_active == True).all()

    # Normalize each recurring item to a monthly amount and its type
    def monthly_amount(item):
        if item.frequency == "monthly":
            return item.amount
        elif item.frequency == "weekly":
            return item.amount * 52 / 12
        elif item.frequency == "yearly":
            return item.amount / 12
        return item.amount

    # Determine income vs expense based on category type or amount sign
    income_items = []
    expense_items = []
    for r in recurring:
        cat_type = r.category.type if r.category else "expense"
        if cat_type == "income":
            income_items.append(r)
        else:
            expense_items.append(r)

    monthly_income = sum(monthly_amount(r) for r in income_items)
    monthly_expenses = sum(monthly_amount(r) for r in expense_items)

    # Build per-item breakdown for tooltip
    income_breakdown = [
        {"name": r.name, "amount": round(monthly_amount(r), 2)}
        for r in income_items
    ]
    expense_breakdown = [
        {"name": r.name, "amount": round(monthly_amount(r), 2)}
        for r in expense_items
    ]

    months = []
    running_balance = starting_balance

    for i in range(12):
        target = start + relativedelta(months=i)
        label = target.strftime("%b %Y")
        net = monthly_income - monthly_expenses
        running_balance += net
        months.append({
            "month": label,
            "income": round(monthly_income, 2),
            "expenses": round(monthly_expenses, 2),
            "net": round(net, 2),
            "balance": round(running_balance, 2),
        })

    return {
        "starting_balance": round(starting_balance, 2),
        "monthly_income": round(monthly_income, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "monthly_net": round(monthly_income - monthly_expenses, 2),
        "income_breakdown": income_breakdown,
        "expense_breakdown": expense_breakdown,
        "projection": months,
    }


# --- Net Worth Velocity ---
@router.get("/net-worth-velocity")
def get_net_worth_velocity(db: Session = Depends(get_db)):
    """
    Compute monthly net worth velocity (rate of change) and acceleration
    from net_worth_snapshots. Returns monthly deltas, % change, and
    acceleration (change in velocity between consecutive months).
    """
    from sqlalchemy import text

    # Pull up to 24 months of monthly net worth, oldest first
    rows = db.execute(text("""
        SELECT strftime('%Y-%m', snapshot_date) as month,
               SUM(CASE WHEN a.type != 'liability' THEN s.balance ELSE -s.balance END) as net_worth
        FROM net_worth_snapshots s
        JOIN accounts a ON s.account_id = a.id
        GROUP BY month
        ORDER BY month ASC
        LIMIT 24
    """)).fetchall()

    months = [{"month": r[0], "net_worth": round(r[1], 2)} for r in rows]

    # Compute velocity (delta) and acceleration (delta of delta)
    for i, m in enumerate(months):
        if i == 0:
            m["delta"] = 0.0
            m["delta_pct"] = 0.0
            m["acceleration"] = 0.0
        else:
            prev_nw = months[i - 1]["net_worth"]
            m["delta"] = round(m["net_worth"] - prev_nw, 2)
            m["delta_pct"] = round((m["delta"] / prev_nw * 100) if prev_nw != 0 else 0, 2)
            if i == 1:
                m["acceleration"] = 0.0
            else:
                m["acceleration"] = round(m["delta"] - months[i - 1]["delta"], 2)

    # Drop the first entry (no delta to show); keep the rest
    velocity_months = months[1:] if len(months) > 1 else []

    # Summary stats
    deltas = [m["delta"] for m in velocity_months]
    avg_velocity = round(sum(deltas) / len(deltas), 2) if deltas else 0.0
    best_month = max(velocity_months, key=lambda m: m["delta"]) if velocity_months else None
    worst_month = min(velocity_months, key=lambda m: m["delta"]) if velocity_months else None
    current_velocity = velocity_months[-1]["delta"] if velocity_months else 0.0
    current_acceleration = velocity_months[-1]["acceleration"] if velocity_months else 0.0

    # Trend classification: acceleration over last 3 months
    recent = velocity_months[-3:] if len(velocity_months) >= 3 else velocity_months
    accel_values = [m["acceleration"] for m in recent if m["acceleration"] != 0]
    if not accel_values:
        trend = "stable"
    elif sum(accel_values) / len(accel_values) > 50:
        trend = "accelerating"
    elif sum(accel_values) / len(accel_values) < -50:
        trend = "decelerating"
    else:
        trend = "stable"

    return {
        "months": velocity_months,
        "avg_velocity": avg_velocity,
        "current_velocity": current_velocity,
        "current_acceleration": current_acceleration,
        "trend": trend,
        "best_month": best_month,
        "worst_month": worst_month,
        "total_months": len(velocity_months),
    }


# --- Spending Anomaly Detection ---
@router.get("/spending-anomalies")
def get_spending_anomalies(db: Session = Depends(get_db)):
    """
    For each expense category, compute spending per month over the last 13 months.
    Compute rolling 6-month mean and std dev for each category.
    Flag months where |spend - mean| > 2 * std_dev as anomalies.
    Returns anomalies sorted by z-score descending, plus per-category monthly history.
    """
    import math
    from sqlalchemy import text

    # Pull monthly category spending for last 13 months
    rows = db.execute(text("""
        SELECT
            strftime('%Y-%m', t.date) as month,
            c.id as category_id,
            c.name as category_name,
            c.color as category_color,
            c.icon as category_icon,
            SUM(t.amount) as total
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.type = 'expense'
          AND t.date >= date('now', '-13 months')
        GROUP BY month, c.id
        ORDER BY month ASC, c.name ASC
    """)).fetchall()

    # Organize by category
    from collections import defaultdict
    cat_months = defaultdict(dict)  # cat_id -> {month -> total}
    cat_meta = {}

    for row in rows:
        month, cat_id, cat_name, cat_color, cat_icon, total = row
        cat_months[cat_id][month] = round(total, 2)
        cat_meta[cat_id] = {
            "id": cat_id,
            "name": cat_name,
            "color": cat_color or "#6366f1",
            "icon": cat_icon or "💰",
        }

    # Get all months present across all categories (sorted)
    all_months = sorted(set(m for months in cat_months.values() for m in months))

    anomalies = []
    category_histories = []

    for cat_id, monthly in cat_months.items():
        meta = cat_meta[cat_id]
        # Build ordered list of (month, spend) for the months we have data
        ordered = [(m, monthly.get(m, 0.0)) for m in all_months]

        history = []
        for i, (month, spend) in enumerate(ordered):
            # Rolling 6-month window = up to 6 months BEFORE this one
            window = [ordered[j][1] for j in range(max(0, i - 6), i)]
            if len(window) < 2:
                mean = spend
                std = 0.0
                z = 0.0
                flagged = False
            else:
                mean = sum(window) / len(window)
                variance = sum((x - mean) ** 2 for x in window) / len(window)
                std = math.sqrt(variance)
                z = round((spend - mean) / std, 2) if std > 0 else 0.0
                flagged = abs(z) >= 2.0

            entry = {
                "month": month,
                "spend": spend,
                "mean": round(mean, 2),
                "std": round(std, 2),
                "z_score": z,
                "flagged": flagged,
                "direction": "high" if z > 0 else "low",
            }
            history.append(entry)

            if flagged:
                anomalies.append({
                    **meta,
                    "month": month,
                    "spend": spend,
                    "mean": round(mean, 2),
                    "std": round(std, 2),
                    "z_score": z,
                    "direction": "high" if z > 0 else "low",
                    "pct_vs_avg": round(((spend - mean) / mean * 100) if mean > 0 else 0, 1),
                })

        category_histories.append({
            **meta,
            "history": history,
        })

    # Sort anomalies by abs z_score descending
    anomalies.sort(key=lambda a: abs(a["z_score"]), reverse=True)

    return {
        "anomalies": anomalies,
        "category_histories": category_histories,
        "all_months": all_months,
        "total_anomalies": len(anomalies),
    }


# --- Monthly Summary ---
@router.get("/summary")
def get_monthly_summary(month: int, year: int, db: Session = Depends(get_db)):
    income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.type == "income",
        extract("month", Transaction.date) == month,
        extract("year", Transaction.date) == year
    ).scalar() or 0.0

    expenses = db.query(func.sum(Transaction.amount)).filter(
        Transaction.type == "expense",
        extract("month", Transaction.date) == month,
        extract("year", Transaction.date) == year
    ).scalar() or 0.0

    # Top categories
    from sqlalchemy import desc
    cat_spend = db.execute(
        func.sum(Transaction.amount).label("total")
    )

    from sqlalchemy import select
    stmt = (
        select(
            Category.name,
            Category.color,
            Category.icon,
            func.sum(Transaction.amount).label("total")
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Transaction.type == "expense",
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year
        )
        .group_by(Category.id)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(5)
    )
    rows = db.execute(stmt).fetchall()
    top_categories = [{"name": r[0], "color": r[1], "icon": r[2], "total": round(r[3], 2)} for r in rows]

    savings_rate = round(((income - expenses) / income * 100) if income > 0 else 0, 1)

    return {
        "month": month,
        "year": year,
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "net_savings": round(income - expenses, 2),
        "savings_rate": savings_rate,
        "top_categories": top_categories,
    }


# --- FIRE Calculator ---
class FireCalcInput(BaseModel):
    current_portfolio: float = 0.0
    monthly_savings: float = 0.0
    monthly_expenses: float = 3000.0
    annual_return_rate: float = 7.0   # percent
    withdrawal_rate: float = 4.0      # percent (SWR)
    target_years: float = 20.0        # for "savings needed" calc

@router.post("/fire-calculator")
def fire_calculator(data: FireCalcInput):
    """Compute FIRE projections from user inputs."""
    from datetime import date, timedelta
    from math import log, ceil

    monthly_r = (data.annual_return_rate / 100) / 12
    annual_expenses = data.monthly_expenses * 12
    fi_number = annual_expenses / (data.withdrawal_rate / 100) if data.withdrawal_rate > 0 else 0

    # Years to FI via binary search (handles edge cases cleanly)
    years_to_fi = None
    fi_date = None

    if fi_number > 0 and (data.monthly_savings > 0 or data.current_portfolio >= fi_number):
        if data.current_portfolio >= fi_number:
            years_to_fi = 0.0
        elif monthly_r == 0:
            if data.monthly_savings > 0:
                months = (fi_number - data.current_portfolio) / data.monthly_savings
                years_to_fi = months / 12
            else:
                years_to_fi = None
        else:
            # FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
            # Binary search for n (months)
            lo, hi = 0, 12 * 200
            for _ in range(60):
                mid = (lo + hi) / 2
                factor = (1 + monthly_r) ** mid
                fv = data.current_portfolio * factor + data.monthly_savings * (factor - 1) / monthly_r
                if fv >= fi_number:
                    hi = mid
                else:
                    lo = mid
                if hi - lo < 0.01:
                    break
            years_to_fi = hi / 12

        if years_to_fi is not None and years_to_fi < 200:
            months_away = int(years_to_fi * 12)
            fi_date_obj = date.today().replace(day=1)
            # Add months
            year = fi_date_obj.year + (fi_date_obj.month - 1 + months_away) // 12
            month = (fi_date_obj.month - 1 + months_away) % 12 + 1
            fi_date = f"{year}-{month:02d}"

    # Monthly savings needed to hit FI in target_years
    target_months = data.target_years * 12
    monthly_savings_needed = None
    if fi_number > 0 and target_months > 0:
        if monthly_r == 0:
            monthly_savings_needed = max(0, (fi_number - data.current_portfolio) / target_months)
        else:
            factor = (1 + monthly_r) ** target_months
            # fi_number = pv*factor + pmt*(factor-1)/r  → solve for pmt
            pmt = (fi_number - data.current_portfolio * factor) * monthly_r / (factor - 1)
            monthly_savings_needed = max(0, pmt)

    # Year-by-year projection (up to 50 years or 5 years past FI)
    cap_years = min(50, ceil(years_to_fi or 30) + 5) if years_to_fi is not None else 40
    projection = []
    portfolio = data.current_portfolio
    current_year = date.today().year
    for yr in range(cap_years + 1):
        projection.append({
            "year": current_year + yr,
            "portfolio": round(portfolio, 0),
            "fi_target": round(fi_number, 0),
            "reached_fi": portfolio >= fi_number,
        })
        # Grow for next year
        for _ in range(12):
            portfolio = portfolio * (1 + monthly_r) + data.monthly_savings

    return {
        "fi_number": round(fi_number, 2),
        "years_to_fi": round(years_to_fi, 1) if years_to_fi is not None else None,
        "fi_date": fi_date,
        "monthly_savings_needed": round(monthly_savings_needed, 2) if monthly_savings_needed is not None else None,
        "annual_expenses": round(annual_expenses, 2),
        "current_savings_rate_ok": (years_to_fi is not None and years_to_fi <= data.target_years),
        "projection": projection,
        "inputs": data.dict(),
    }


# --- Goal-to-Spending Alignment ---
@router.get("/goal-alignment")
def get_goal_alignment(db: Session = Depends(get_db)):
    """
    For each savings goal, show how much of the monthly surplus is being allocated.
    Monthly surplus is derived from active recurring income minus recurring expenses.
    Returns funded vs. underfunded status, allocation %, and months to goal.
    """
    from dateutil.relativedelta import relativedelta
    from math import ceil

    today = date.today()

    # --- Compute monthly surplus from recurring items ---
    recurring = db.query(RecurringItem).filter(RecurringItem.is_active == True).all()

    def monthly_amount(item):
        if item.frequency == "monthly":
            return item.amount
        elif item.frequency == "weekly":
            return item.amount * 52 / 12
        elif item.frequency == "yearly":
            return item.amount / 12
        return item.amount

    monthly_income = 0.0
    monthly_expenses = 0.0
    for r in recurring:
        cat_type = r.category.type if r.category else "expense"
        if cat_type == "income":
            monthly_income += monthly_amount(r)
        else:
            monthly_expenses += monthly_amount(r)

    monthly_surplus = monthly_income - monthly_expenses

    # --- Goals ---
    goals = db.query(SavingsGoal).all()

    total_allocated = sum(g.monthly_allocation or 0.0 for g in goals)
    total_unallocated = monthly_surplus - total_allocated

    goal_data = []
    for g in goals:
        alloc = g.monthly_allocation or 0.0
        remaining = max(0.0, (g.target_amount or 0.0) - (g.current_amount or 0.0))

        # Months to goal at current allocation rate
        months_to_goal = None
        projected_date = None
        if alloc > 0 and remaining > 0:
            months_to_goal = ceil(remaining / alloc)
            proj = today + relativedelta(months=months_to_goal)
            projected_date = proj.strftime("%b %Y")
        elif remaining <= 0:
            months_to_goal = 0
            projected_date = "Reached"

        # Status logic
        if remaining <= 0:
            status = "complete"
        elif alloc <= 0:
            status = "underfunded"
        elif g.target_date and months_to_goal is not None:
            target_months_away = (g.target_date.year - today.year) * 12 + (g.target_date.month - today.month)
            if months_to_goal <= target_months_away:
                status = "on_track"
            else:
                status = "at_risk"
        else:
            status = "funded"

        # Allocation as % of surplus
        pct_of_surplus = round((alloc / monthly_surplus * 100) if monthly_surplus > 0 else 0.0, 1)

        goal_data.append({
            "id": g.id,
            "name": g.name,
            "icon": g.icon,
            "color": g.color,
            "target_amount": g.target_amount,
            "current_amount": g.current_amount or 0.0,
            "monthly_allocation": alloc,
            "target_date": str(g.target_date) if g.target_date else None,
            "remaining": round(remaining, 2),
            "pct_of_surplus": pct_of_surplus,
            "pct_complete": round(min(100, ((g.current_amount or 0) / g.target_amount * 100)) if g.target_amount > 0 else 0, 1),
            "months_to_goal": months_to_goal,
            "projected_date": projected_date,
            "status": status,
        })

    # Sort: underfunded last, then by pct_of_surplus descending
    status_order = {"complete": 0, "on_track": 1, "funded": 2, "at_risk": 3, "underfunded": 4}
    goal_data.sort(key=lambda g: (status_order.get(g["status"], 5), -g["pct_of_surplus"]))

    return {
        "monthly_income": round(monthly_income, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "monthly_surplus": round(monthly_surplus, 2),
        "total_allocated": round(total_allocated, 2),
        "total_unallocated": round(total_unallocated, 2),
        "allocation_pct_of_surplus": round((total_allocated / monthly_surplus * 100) if monthly_surplus > 0 else 0, 1),
        "goals": goal_data,
        "goal_count": len(goal_data),
        "underfunded_count": sum(1 for g in goal_data if g["status"] == "underfunded"),
        "at_risk_count": sum(1 for g in goal_data if g["status"] == "at_risk"),
    }
