"""Seed database with sample data so the app doesn't feel empty on first launch."""
from datetime import date, timedelta
from database import SessionLocal
from models.finance import Account, Category, Transaction, Budget, RecurringItem, SavingsGoal, NetWorthSnapshot
from models.travel import Trip, ItineraryItem, PackingList, PackingItem, TripExpense, Destination, WishlistDestination
from models.crm import Contact, Interaction, FollowUpReminder, Tag, ContactTag
from models.health import BodyMetric, Workout, WorkoutExercise, SleepLog, Supplement, BloodWorkResult, NutritionLog, MacroTarget, MedicalEvent
from models.habits import Habit, HabitLog, Routine, RoutineItem
from models.reading import Book, BookNote, BookQuote
from models.projects import Objective, KeyResult, Project, ProjectTask, ProjectPostmortem
from models.mood import MoodLog
from models.trading import Strategy, Trade, Position, PortfolioSnapshot
from models.tasks import Task
from models.time_tracking import TimeBlock, FocusLog
from models.decisions import Decision, DecisionTag


def seed_if_empty():
    db = SessionLocal()
    try:
        if db.query(Account).count() > 0:
            return  # Already seeded
        print("🌱 Seeding database with sample data...")
        seed_finance(db)
        seed_travel(db)
        seed_crm(db)
        seed_health(db)
        seed_habits(db)
        seed_reading(db)
        seed_projects(db)
        seed_mood(db)
        seed_trading(db)
        seed_tasks(db)
        seed_time_tracking(db)
        seed_decisions(db)
        seed_postmortems(db)
        print("✅ Seed complete!")
    finally:
        db.close()


def seed_finance(db):
    today = date.today()

    # Accounts
    accounts = [
        Account(name="Chase Checking", type="checking", institution="Chase", balance=8_420.50),
        Account(name="Marcus HYSA", type="savings", institution="Marcus by GS", balance=32_100.00),
        Account(name="Fidelity Brokerage", type="investment", institution="Fidelity", balance=87_300.00),
        Account(name="401(k)", type="investment", institution="Vanguard", balance=52_800.00),
        Account(name="Bitcoin", type="crypto", institution="Coinbase", balance=14_500.00),
        Account(name="Ethereum", type="crypto", institution="Coinbase", balance=4_200.00),
        Account(name="SF Apartment", type="real_estate", balance=650_000.00, notes="Estimated market value"),
        Account(name="Mortgage", type="liability", institution="Wells Fargo", balance=420_000.00),
        Account(name="Car Loan", type="liability", institution="Honda Financial", balance=8_200.00),
    ]
    for a in accounts:
        db.add(a)
    db.commit()

    # Net worth snapshots (6 months history)
    for a in accounts:
        for i in range(6):
            snap_date = date(today.year, today.month, 1) - timedelta(days=i * 30)
            snap = NetWorthSnapshot(account_id=a.id, balance=a.balance * (0.95 + i * 0.01), snapshot_date=snap_date)
            db.add(snap)
    db.commit()

    # Categories
    categories = [
        # Income
        Category(name="Salary", color="#22c55e", icon="💼", type="income"),
        Category(name="Freelance", color="#86efac", icon="💻", type="income"),
        Category(name="Dividends", color="#4ade80", icon="📈", type="income"),
        Category(name="Capital Gains", color="#34d399", icon="📊", type="income"),
        Category(name="Rental Income", color="#6ee7b7", icon="🏘️", type="income"),
        Category(name="Interest", color="#a7f3d0", icon="🏦", type="income"),
        # Expenses
        Category(name="Housing", color="#6366f1", icon="🏠", type="expense"),
        Category(name="Utilities", color="#818cf8", icon="⚡", type="expense"),
        Category(name="Groceries", color="#f59e0b", icon="🛒", type="expense"),
        Category(name="Dining", color="#ef4444", icon="🍽️", type="expense"),
        Category(name="Coffee & Drinks", color="#d97706", icon="☕", type="expense"),
        Category(name="Transport", color="#3b82f6", icon="🚗", type="expense"),
        Category(name="Insurance", color="#60a5fa", icon="🛡️", type="expense"),
        Category(name="Subscriptions", color="#8b5cf6", icon="📱", type="expense"),
        Category(name="Health", color="#10b981", icon="🏥", type="expense"),
        Category(name="Personal Care", color="#f472b6", icon="💆", type="expense"),
        Category(name="Travel", color="#f97316", icon="✈️", type="expense"),
        Category(name="Entertainment", color="#ec4899", icon="🎬", type="expense"),
        Category(name="Shopping", color="#06b6d4", icon="🛍️", type="expense"),
        Category(name="Home Maintenance", color="#a78bfa", icon="🔧", type="expense"),
        Category(name="Education", color="#84cc16", icon="📚", type="expense"),
        Category(name="Gifts", color="#fb7185", icon="🎁", type="expense"),
        Category(name="Charity & Donations", color="#2dd4bf", icon="❤️", type="expense"),
        Category(name="Taxes", color="#94a3b8", icon="🧾", type="expense"),
    ]
    for c in categories:
        db.add(c)
    db.commit()

    # Refresh categories to get IDs
    cat_map = {c.name: c for c in db.query(Category).all()}

    # Transactions - past 3 months
    txns = []
    for i in range(90):
        d = today - timedelta(days=i)
        if d.weekday() == 0:  # Monday = payday
            txns.append(Transaction(date=d, amount=4_800.00, type="income",
                                    category_id=cat_map["Salary"].id, description="Biweekly Paycheck"))
        if d.weekday() == 2:  # Wednesday grocery run
            txns.append(Transaction(date=d, amount=round(65 + (i % 40), 2), type="expense",
                                    category_id=cat_map["Groceries"].id, description="Whole Foods"))
        if d.weekday() in [4, 5]:  # Fri/Sat dining
            txns.append(Transaction(date=d, amount=round(35 + (i % 60), 2), type="expense",
                                    category_id=cat_map["Dining"].id, description="Restaurant"))
        if d.day == 1:
            txns.append(Transaction(date=d, amount=2_850.00, type="expense",
                                    category_id=cat_map["Housing"].id, description="Rent / Mortgage"))

    # A few extra transactions
    txns += [
        Transaction(date=today - timedelta(days=3), amount=14.99, type="expense",
                    category_id=cat_map["Subscriptions"].id, description="Netflix"),
        Transaction(date=today - timedelta(days=3), amount=9.99, type="expense",
                    category_id=cat_map["Subscriptions"].id, description="Spotify"),
        Transaction(date=today - timedelta(days=5), amount=380.00, type="expense",
                    category_id=cat_map["Travel"].id, description="Flight to NYC"),
        Transaction(date=today - timedelta(days=7), amount=120.00, type="expense",
                    category_id=cat_map["Health"].id, description="Gym membership"),
        Transaction(date=today - timedelta(days=10), amount=850.00, type="income",
                    category_id=cat_map["Freelance"].id, description="Design project"),
        Transaction(date=today - timedelta(days=12), amount=250.00, type="expense",
                    category_id=cat_map["Shopping"].id, description="Amazon"),
        Transaction(date=today - timedelta(days=2), amount=6.50, type="expense",
                    category_id=cat_map["Coffee & Drinks"].id, description="Blue Bottle Coffee"),
        Transaction(date=today - timedelta(days=4), amount=6.50, type="expense",
                    category_id=cat_map["Coffee & Drinks"].id, description="Blue Bottle Coffee"),
        Transaction(date=today - timedelta(days=6), amount=6.50, type="expense",
                    category_id=cat_map["Coffee & Drinks"].id, description="Ritual Coffee"),
        Transaction(date=today - timedelta(days=8), amount=140.00, type="expense",
                    category_id=cat_map["Insurance"].id, description="Car Insurance - State Farm"),
        Transaction(date=today - timedelta(days=8), amount=89.00, type="expense",
                    category_id=cat_map["Insurance"].id, description="Renters Insurance"),
        Transaction(date=today - timedelta(days=9), amount=95.00, type="expense",
                    category_id=cat_map["Utilities"].id, description="PG&E Electric"),
        Transaction(date=today - timedelta(days=9), amount=65.00, type="expense",
                    category_id=cat_map["Utilities"].id, description="Comcast Internet"),
        Transaction(date=today - timedelta(days=11), amount=55.00, type="expense",
                    category_id=cat_map["Personal Care"].id, description="Haircut"),
        Transaction(date=today - timedelta(days=15), amount=75.00, type="expense",
                    category_id=cat_map["Gifts"].id, description="Birthday gift - Marcus J"),
        Transaction(date=today - timedelta(days=20), amount=100.00, type="expense",
                    category_id=cat_map["Charity & Donations"].id, description="GiveWell donation"),
        Transaction(date=today - timedelta(days=22), amount=185.00, type="expense",
                    category_id=cat_map["Home Maintenance"].id, description="Plumber - sink repair"),
        Transaction(date=today - timedelta(days=1), amount=312.00, type="income",
                    category_id=cat_map["Interest"].id, description="Marcus HYSA interest — March"),
        Transaction(date=today - timedelta(days=25), amount=1_200.00, type="income",
                    category_id=cat_map["Capital Gains"].id, description="AAPL sold — long-term gain"),
    ]
    for t in txns:
        db.add(t)
    db.commit()

    # Budgets for current month
    budget_data = [
        ("Housing", 2900), ("Utilities", 180), ("Groceries", 400),
        ("Dining", 300), ("Coffee & Drinks", 80), ("Transport", 200),
        ("Insurance", 250), ("Subscriptions", 100), ("Health", 150),
        ("Personal Care", 80), ("Travel", 500), ("Entertainment", 200),
        ("Shopping", 300), ("Home Maintenance", 100), ("Gifts", 100),
        ("Charity & Donations", 150),
    ]
    for cat_name, amount in budget_data:
        b = Budget(category_id=cat_map[cat_name].id, month=today.month, year=today.year, amount=amount)
        db.add(b)
    db.commit()

    # Recurring items
    recurrings = [
        RecurringItem(name="Netflix", amount=15.49, category_id=cat_map["Subscriptions"].id,
                      frequency="monthly", next_date=today + timedelta(days=3)),
        RecurringItem(name="Spotify", amount=9.99, category_id=cat_map["Subscriptions"].id,
                      frequency="monthly", next_date=today + timedelta(days=3)),
        RecurringItem(name="AWS", amount=47.32, category_id=cat_map["Subscriptions"].id,
                      frequency="monthly", next_date=today + timedelta(days=5)),
        RecurringItem(name="Gym Membership", amount=80.00, category_id=cat_map["Health"].id,
                      frequency="monthly", next_date=today + timedelta(days=15)),
        RecurringItem(name="Car Insurance", amount=142.00, category_id=cat_map["Transport"].id,
                      frequency="monthly", next_date=today + timedelta(days=12)),
        RecurringItem(name="Mortgage", amount=2850.00, category_id=cat_map["Housing"].id,
                      frequency="monthly", next_date=date(today.year, today.month, 1) + timedelta(days=30)),
        RecurringItem(name="PG&E Electric", amount=95.00, category_id=cat_map["Utilities"].id,
                      frequency="monthly", next_date=today + timedelta(days=9)),
        RecurringItem(name="Comcast Internet", amount=65.00, category_id=cat_map["Utilities"].id,
                      frequency="monthly", next_date=today + timedelta(days=9)),
        RecurringItem(name="Car Insurance", amount=140.00, category_id=cat_map["Insurance"].id,
                      frequency="monthly", next_date=today + timedelta(days=8)),
        RecurringItem(name="GiveWell", amount=100.00, category_id=cat_map["Charity & Donations"].id,
                      frequency="monthly", next_date=today + timedelta(days=20)),
        RecurringItem(name="Domain & Hosting", amount=180.00, category_id=cat_map["Subscriptions"].id,
                      frequency="yearly", next_date=today + timedelta(days=90)),
    ]
    for r in recurrings:
        db.add(r)
    db.commit()

    # Savings goals
    goals = [
        SavingsGoal(name="Emergency Fund", target_amount=30_000, current_amount=24_500,
                    color="#22c55e", icon="🛡️", notes="6 months expenses"),
        SavingsGoal(name="Japan Trip", target_amount=8_000, current_amount=3_200,
                    target_date=date(2026, 10, 1), color="#f97316", icon="🇯🇵"),
        SavingsGoal(name="Down Payment", target_amount=100_000, current_amount=32_000,
                    target_date=date(2027, 6, 1), color="#6366f1", icon="🏠", notes="For next property"),
        SavingsGoal(name="Tesla Model 3", target_amount=45_000, current_amount=12_000,
                    target_date=date(2026, 12, 1), color="#3b82f6", icon="⚡"),
    ]
    for g in goals:
        db.add(g)
    db.commit()


def seed_travel(db):
    today = date.today()

    # ── Trips ──────────────────────────────────────────────────────────────────
    trips = [
        # Upcoming / in-progress
        Trip(name="Tokyo & Kyoto", destination="Japan", country="Japan", city="Tokyo",
             latitude=35.6762, longitude=139.6503,
             start_date=date(2026, 10, 5), end_date=date(2026, 10, 18),
             status="planning", budget=8000,
             notes="First trip to Japan! Focus on culture, food, and nature."),
        Trip(name="NYC Weekend", destination="New York City", country="USA", city="New York",
             latitude=40.7128, longitude=-74.0060,
             start_date=date(2026, 5, 22), end_date=date(2026, 5, 25),
             status="booked", budget=1500),
        # Completed trips (5 total)
        Trip(name="Barcelona & Madrid", destination="Spain", country="Spain", city="Barcelona",
             latitude=41.3851, longitude=2.1734,
             start_date=date(2025, 7, 10), end_date=date(2025, 7, 22),
             status="completed", budget=4500,
             rating=9, would_return=True,
             highlights="Sagrada Família blew my mind. The food scene in Barcelona — pintxos + vermouth — was unreal. Flamenco show in Madrid was electric.",
             lowlights="Pickpocket attempt on La Rambla (luckily unsuccessful). Tourist crowds at Park Güell were exhausting."),
        Trip(name="Costa Rica Surf Trip", destination="Costa Rica", country="Costa Rica",
             latitude=9.7489, longitude=-83.7534,
             start_date=date(2025, 3, 1), end_date=date(2025, 3, 10),
             status="completed", budget=3000,
             rating=8, would_return=True,
             highlights="Surfing Playa Hermosa at sunrise. Wildlife everywhere — toucans, monkeys, sloths. Incredibly fresh food.",
             lowlights="Rain delayed several activities. Roads to remote beaches were rough without 4WD."),
        Trip(name="Iceland Ring Road", destination="Iceland", country="Iceland",
             latitude=64.9631, longitude=-19.0208,
             start_date=date(2024, 9, 14), end_date=date(2024, 9, 24),
             status="completed", budget=5500,
             rating=10, would_return=True,
             highlights="Northern lights on night 3 — best thing I've ever seen. Skógafoss waterfall. Driving the ring road with no agenda. Hot springs every evening.",
             lowlights="Rental car insurance was expensive and confusing. Weather unpredictable — lost one full day to storms."),
        Trip(name="Lisbon & Porto", destination="Portugal", country="Portugal", city="Lisbon",
             latitude=38.7223, longitude=-9.1393,
             start_date=date(2024, 4, 20), end_date=date(2024, 4, 29),
             status="completed", budget=3200,
             rating=8, would_return=True,
             highlights="Pastéis de nata at Pastéis de Belém. Fado night in Alfama. Port wine tasting in Porto — the whole Douro riverfront is beautiful.",
             lowlights="Lisbon hills brutal with luggage. AirBnB had noisy neighbors. Felt rushed trying to cover both cities."),
        Trip(name="New Orleans Jazz Fest", destination="New Orleans", country="USA", city="New Orleans",
             latitude=29.9511, longitude=-90.0715,
             start_date=date(2023, 4, 28), end_date=date(2023, 5, 4),
             status="completed", budget=2800,
             rating=9, would_return=True,
             highlights="Jazz Fest main stage — incredible lineup. Crawfish étouffée was life-changing. Frenchmen Street every night. The energy of the whole city.",
             lowlights="Humidity was brutal — wore me out faster than expected. Hotel prices during festival were 3x normal."),
    ]
    for t in trips:
        db.add(t)
    db.commit()

    trips_db = db.query(Trip).all()
    japan_trip  = trips_db[0]   # planning
    nyc_trip    = trips_db[1]   # booked
    spain_trip  = trips_db[2]   # completed
    cr_trip     = trips_db[3]   # completed
    iceland_trip = trips_db[4]  # completed
    portugal_trip = trips_db[5] # completed
    nola_trip   = trips_db[6]   # completed

    # ── Itinerary for Japan trip (upcoming / planning) ─────────────────────────
    items = [
        ItineraryItem(trip_id=japan_trip.id, day_number=1, type="flight", title="SFO → NRT",
                      time="11:00", location="San Francisco Airport", confirmation_number="UA8234",
                      cost=950, notes="United Airlines, economy"),
        ItineraryItem(trip_id=japan_trip.id, day_number=2, type="hotel", title="Check-in: Shinjuku Hotel Gracery",
                      time="15:00", location="Shinjuku, Tokyo", confirmation_number="HTL-92847", cost=180),
        ItineraryItem(trip_id=japan_trip.id, day_number=2, type="activity", title="Shinjuku Gyoen Garden",
                      time="17:00", location="Shinjuku Gyoen, Tokyo", cost=5),
        ItineraryItem(trip_id=japan_trip.id, day_number=3, type="activity", title="teamLab Borderless",
                      time="10:00", location="Odaiba, Tokyo", cost=32),
        ItineraryItem(trip_id=japan_trip.id, day_number=4, type="restaurant", title="Sukiyabashi Jiro",
                      time="12:00", location="Ginza, Tokyo", notes="Book well in advance!"),
        ItineraryItem(trip_id=japan_trip.id, day_number=7, type="transport", title="Shinkansen: Tokyo → Kyoto",
                      time="09:30", location="Tokyo Station", confirmation_number="JR-77321", cost=85,
                      notes="Use JR Pass"),
        ItineraryItem(trip_id=japan_trip.id, day_number=7, type="hotel", title="Check-in: Kyoto Granbell Hotel",
                      time="15:00", location="Gion, Kyoto", confirmation_number="HTL-44201", cost=160),
        ItineraryItem(trip_id=japan_trip.id, day_number=8, type="activity", title="Fushimi Inari Taisha",
                      time="07:00", location="Fushimi, Kyoto", cost=0, notes="Go early to beat crowds"),
    ]
    for item in items:
        db.add(item)

    # ── NYC itinerary (booked) ─────────────────────────────────────────────────
    nyc_items = [
        ItineraryItem(trip_id=nyc_trip.id, day_number=1, type="flight", title="SFO → JFK",
                      time="07:00", location="San Francisco Airport", confirmation_number="DL2291",
                      cost=380, notes="Delta, nonstop"),
        ItineraryItem(trip_id=nyc_trip.id, day_number=1, type="hotel", title="Check-in: The Standard High Line",
                      time="15:00", location="Meatpacking District, NYC", confirmation_number="STND-88142", cost=295),
        ItineraryItem(trip_id=nyc_trip.id, day_number=2, type="restaurant", title="Breakfast at Russ & Daughters",
                      time="09:00", location="Lower East Side, NYC"),
        ItineraryItem(trip_id=nyc_trip.id, day_number=2, type="activity", title="MoMA",
                      time="11:00", location="Midtown, NYC", cost=30),
        ItineraryItem(trip_id=nyc_trip.id, day_number=3, type="activity", title="Brooklyn Bridge + DUMBO",
                      time="10:00", location="Brooklyn, NYC", cost=0),
    ]
    for item in nyc_items:
        db.add(item)
    db.commit()

    # ── Packing list for Japan ─────────────────────────────────────────────────
    pl = PackingList(trip_id=japan_trip.id, name="Japan Packing List")
    db.add(pl)
    db.commit()

    packing_items = [
        ("Passport", "Documents"), ("Travel Insurance", "Documents"), ("JR Pass", "Documents"),
        ("T-shirts (7)", "Clothing"), ("Pants (3)", "Clothing"), ("Walking shoes", "Clothing"),
        ("Camera", "Electronics"), ("Portable charger", "Electronics"), ("Travel adapter (Type A)", "Electronics"),
        ("Toiletries kit", "Toiletries"), ("Sunscreen SPF 50", "Toiletries"),
        ("Yen cash ¥80,000", "Money"), ("Credit cards", "Money"),
    ]
    for name, cat in packing_items:
        db.add(PackingItem(packing_list_id=pl.id, name=name, category=cat))
    db.commit()

    # ── Expenses for completed trips ───────────────────────────────────────────
    # Spain — Barcelona & Madrid (12 nights)
    spain_expenses = [
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 10), amount=820.00,  category="Flights",        description="SFO → BCN round trip"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 10), amount=980.00,  category="Accommodation",  description="Airbnb Barcelona (7 nights)"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 17), amount=540.00,  category="Accommodation",  description="Hotel Madrid (5 nights)"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 11), amount=18.00,   category="Transport",      description="Metro day pass"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 14), amount=65.00,   category="Transport",      description="AVE train Barcelona → Madrid"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 11), amount=45.00,   category="Food",           description="Tapas dinner, El Born"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 12), amount=32.00,   category="Food",           description="Lunch + vermouth, La Barceloneta"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 13), amount=55.00,   category="Food",           description="Dinner, Tickets restaurant"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 15), amount=48.00,   category="Food",           description="Churros + museum café, Madrid"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 18), amount=62.00,   category="Food",           description="Flamenco dinner show"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 12), amount=26.00,   category="Activities",     description="Sagrada Família entry"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 13), amount=10.00,   category="Activities",     description="Park Güell timed entry"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 16), amount=15.00,   category="Activities",     description="Prado Museum"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 20), amount=85.00,   category="Activities",     description="Flamenco show, Corral de la Morería"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 19), amount=210.00,  category="Shopping",       description="Ceramics + gifts + El Corte Inglés"),
        TripExpense(trip_id=spain_trip.id, date=date(2025, 7, 11), amount=65.00,   category="Other",          description="Travel insurance"),
    ]
    for e in spain_expenses:
        db.add(e)

    # Costa Rica (9 nights)
    cr_expenses = [
        TripExpense(trip_id=cr_trip.id, date=date(2025, 3, 1),  amount=560.00,  category="Flights",        description="SFO → SJO round trip"),
        TripExpense(trip_id=cr_trip.id, date=date(2025, 3, 1),  amount=720.00,  category="Accommodation",  description="Surf hostel / bungalow (9 nights)"),
        TripExpense(trip_id=cr_trip.id, date=date(2025, 3, 2),  amount=95.00,   category="Activities",     description="Surf lessons, 3 days"),
        TripExpense(trip_id=cr_trip.id, date=date(2025, 3, 4),  amount=75.00,   category="Activities",     description="Zip-lining + canopy tour"),
        TripExpense(trip_id=cr_trip.id, date=date(2025, 3, 6),  amount=65.00,   category="Activities",     description="Manuel Antonio boat tour"),
        TripExpense(trip_id=cr_trip.id, date=date(2025, 3, 2),  amount=35.00,   category="Food",           description="Typical casado lunches (daily avg)"),
        TripExpense(trip_id=cr_trip.id, date=date(2025, 3, 5),  amount=48.00,   category="Food",           description="Seafood dinner, beachside"),
        TripExpense(trip_id=cr_trip.id, date=date(2025, 3, 3),  amount=180.00,  category="Transport",      description="Shuttle San José → Quepos"),
        TripExpense(trip_id=cr_trip.id, date=date(2025, 3, 8),  amount=85.00,   category="Transport",      description="Rental car 2 days"),
        TripExpense(trip_id=cr_trip.id, date=date(2025, 3, 7),  amount=45.00,   category="Shopping",       description="Hammock + coffee souvenirs"),
        TripExpense(trip_id=cr_trip.id, date=date(2025, 3, 1),  amount=55.00,   category="Other",          description="Travel insurance"),
    ]
    for e in cr_expenses:
        db.add(e)

    # Iceland Ring Road (10 nights)
    iceland_expenses = [
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 14), amount=780.00,  category="Flights",        description="BOS → KEF → SFO (round trip via Boston)"),
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 14), amount=1150.00, category="Transport",      description="Rental 4WD SUV (10 days + insurance)"),
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 14), amount=420.00,  category="Accommodation",  description="Guesthouses & farm stays (mixed)"),
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 18), amount=280.00,  category="Accommodation",  description="Reykjavik hotel (2 nights, end of trip)"),
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 15), amount=120.00,  category="Activities",     description="Blue Lagoon entry"),
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 17), amount=95.00,   category="Activities",     description="Northern Lights boat tour"),
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 20), amount=80.00,   category="Activities",     description="Whale watching, Húsavík"),
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 16), amount=55.00,   category="Food",           description="Lamb soup + skyr lunch"),
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 19), amount=95.00,   category="Food",           description="Seafood dinner, Reykjavik"),
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 22), amount=220.00,  category="Food",           description="Groceries for road trip cooking"),
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 21), amount=145.00,  category="Shopping",       description="Wool sweater + lava rock gifts"),
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 14), amount=75.00,   category="Other",          description="Travel insurance"),
        TripExpense(trip_id=iceland_trip.id, date=date(2024, 9, 14), amount=85.00,   category="Other",          description="Gas fill-ups (est. over 10 days)"),
    ]
    for e in iceland_expenses:
        db.add(e)

    # Portugal — Lisbon & Porto (9 nights)
    portugal_expenses = [
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 20), amount=640.00,  category="Flights",        description="SFO → LIS → SFO"),
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 20), amount=560.00,  category="Accommodation",  description="Airbnb Alfama, Lisbon (6 nights)"),
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 26), amount=260.00,  category="Accommodation",  description="Boutique hotel, Porto (3 nights)"),
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 21), amount=12.00,   category="Transport",      description="Tram 28 day pass"),
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 26), amount=30.00,   category="Transport",      description="Lisbon → Porto train"),
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 21), amount=22.00,   category="Food",           description="Pastéis de nata + espresso tour"),
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 22), amount=45.00,   category="Food",           description="Seafood dinner, Alfama"),
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 24), amount=38.00,   category="Food",           description="Fado dinner experience"),
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 27), amount=55.00,   category="Food",           description="Port wine tasting + dinner, Vila Nova de Gaia"),
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 23), amount=20.00,   category="Activities",     description="Jerónimos Monastery entry"),
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 28), amount=35.00,   category="Activities",     description="Douro Valley day trip (boat)"),
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 28), amount=180.00,  category="Shopping",       description="Azulejos tiles + Port wine bottles"),
        TripExpense(trip_id=portugal_trip.id, date=date(2024, 4, 20), amount=58.00,   category="Other",          description="Travel insurance + airport transfer"),
    ]
    for e in portugal_expenses:
        db.add(e)

    # New Orleans Jazz Fest (6 nights)
    nola_expenses = [
        TripExpense(trip_id=nola_trip.id, date=date(2023, 4, 28), amount=320.00,  category="Flights",        description="SFO → MSY round trip"),
        TripExpense(trip_id=nola_trip.id, date=date(2023, 4, 28), amount=980.00,  category="Accommodation",  description="Marigny B&B (6 nights, festival pricing)"),
        TripExpense(trip_id=nola_trip.id, date=date(2023, 4, 29), amount=160.00,  category="Activities",     description="Jazz Fest 4-day pass"),
        TripExpense(trip_id=nola_trip.id, date=date(2023, 5, 1),  amount=45.00,   category="Activities",     description="Preservation Hall concert tickets"),
        TripExpense(trip_id=nola_trip.id, date=date(2023, 4, 29), amount=65.00,   category="Food",           description="Commander's Palace lunch"),
        TripExpense(trip_id=nola_trip.id, date=date(2023, 4, 30), amount=48.00,   category="Food",           description="Crawfish étouffée + beignets"),
        TripExpense(trip_id=nola_trip.id, date=date(2023, 5, 2),  amount=55.00,   category="Food",           description="Frenchmen Street food + drinks"),
        TripExpense(trip_id=nola_trip.id, date=date(2023, 5, 3),  amount=72.00,   category="Food",           description="Dooky Chase dinner"),
        TripExpense(trip_id=nola_trip.id, date=date(2023, 4, 28), amount=35.00,   category="Transport",      description="Streetcar passes + rideshare"),
        TripExpense(trip_id=nola_trip.id, date=date(2023, 5, 1),  amount=120.00,  category="Shopping",       description="Hot sauce collection + jazz vinyl"),
        TripExpense(trip_id=nola_trip.id, date=date(2023, 4, 28), amount=45.00,   category="Other",          description="Travel insurance"),
    ]
    for e in nola_expenses:
        db.add(e)

    db.commit()

    # ── Travel documents ───────────────────────────────────────────────────────
    from models.travel import TravelDocument
    docs = [
        # Passport (global, no trip)
        TravelDocument(trip_id=None, type="passport", title="US Passport",
                       content="Passport #: 123456789\nIssued: 2019-03-15\nExpiry: 2029-03-14\nCountry: USA",
                       expiry_date=date(2029, 3, 14)),
        # Travel insurance for Japan (upcoming)
        TravelDocument(trip_id=japan_trip.id, type="insurance", title="Japan Trip Insurance — WorldNomads",
                       content="Policy #: WN-8842-2026\nProvider: World Nomads\nCoverage: Medical $500K, Trip cancellation $8,000\nEmergency: +1-888-407-4747",
                       expiry_date=date(2026, 10, 18)),
        # Japan booking confirmation
        TravelDocument(trip_id=japan_trip.id, type="visa", title="Japan eVisa (not required — US citizen)",
                       content="US citizens do not require a visa for Japan stays under 90 days.\nPassport validity required: 6 months beyond stay."),
        # NYC hotel confirmation
        TravelDocument(trip_id=nyc_trip.id, type="insurance", title="NYC Trip Insurance — Allianz",
                       content="Policy #: ALZ-2026-NYC\nCoverage: Medical $100K, cancellation $1,500\nHotline: +1-800-284-8300",
                       expiry_date=date(2026, 5, 25)),
        # Emergency contacts (global)
        TravelDocument(trip_id=None, type="emergency_contacts", title="Emergency Contacts",
                       content="David Kim (brother): +1-310-555-0192\nMom: +1-415-555-0847\nUS Embassy (general): +1-888-407-4747\nTravel insurance 24h: +1-800-821-2828"),
        # Expired document (for testing alerts)
        TravelDocument(trip_id=None, type="passport", title="Old US Passport (EXPIRED)",
                       content="Passport #: 987654321\nExpired 2019-03-14 — keep as backup ID only",
                       expiry_date=date(2019, 3, 14)),
        # Credit card travel notice (expiring soon — tests amber alert)
        TravelDocument(trip_id=japan_trip.id, type="insurance", title="Chase Sapphire Travel Benefits",
                       content="Card: Chase Sapphire Reserve\nTravel delay: $500/ticket\nTrip cancellation: up to $10,000\nEmergency evacuation: unlimited\nActivate at: chase.com/travel",
                       expiry_date=date.today() + date.resolution * 45),
    ]
    for doc in docs:
        db.add(doc)
    db.commit()

    # ── Map destinations ───────────────────────────────────────────────────────
    destinations = [
        Destination(name="San Francisco", country="USA", city="San Francisco",
                    latitude=37.7749, longitude=-122.4194, status="visited", visited_year=2020),
        Destination(name="New York City", country="USA", city="New York",
                    latitude=40.7128, longitude=-74.0060, status="visited", visited_year=2024),
        Destination(name="New Orleans", country="USA", city="New Orleans",
                    latitude=29.9511, longitude=-90.0715, status="visited", visited_year=2023),
        Destination(name="Lisbon", country="Portugal", city="Lisbon",
                    latitude=38.7223, longitude=-9.1393, status="visited", visited_year=2024),
        Destination(name="Porto", country="Portugal", city="Porto",
                    latitude=41.1579, longitude=-8.6291, status="visited", visited_year=2024),
        Destination(name="Iceland", country="Iceland",
                    latitude=64.9631, longitude=-19.0208, status="visited", visited_year=2024),
        Destination(name="Barcelona", country="Spain", city="Barcelona",
                    latitude=41.3851, longitude=2.1734, status="visited", visited_year=2025),
        Destination(name="Madrid", country="Spain", city="Madrid",
                    latitude=40.4168, longitude=-3.7038, status="visited", visited_year=2025),
        Destination(name="Costa Rica", country="Costa Rica",
                    latitude=9.7489, longitude=-83.7534, status="visited", visited_year=2025),
        Destination(name="Tokyo", country="Japan", city="Tokyo",
                    latitude=35.6762, longitude=139.6503, status="planned"),
        Destination(name="Kyoto", country="Japan", city="Kyoto",
                    latitude=35.0116, longitude=135.7681, status="planned"),
        Destination(name="Paris", country="France", city="Paris",
                    latitude=48.8566, longitude=2.3522, status="wishlist"),
        Destination(name="Bali", country="Indonesia", city="Bali",
                    latitude=-8.3405, longitude=115.0920, status="wishlist"),
        Destination(name="Patagonia", country="Argentina",
                    latitude=-51.6230, longitude=-69.2168, status="wishlist"),
    ]
    for d in destinations:
        db.add(d)
    db.commit()

    # ── Wishlist ───────────────────────────────────────────────────────────────
    wishlist = [
        WishlistDestination(name="Patagonia Trek", country="Chile/Argentina", priority=1,
                            reason="Epic hiking and raw nature — Torres del Paine is a bucket list item.", estimated_cost=5000),
        WishlistDestination(name="Kyoto in Fall", country="Japan", priority=2,
                            reason="Autumn leaves (koyo), temples, ryokan, onsen — the Japan trip is a preview.", estimated_cost=4000),
        WishlistDestination(name="Bali Retreat", country="Indonesia", priority=3,
                            reason="Surf Canggu, yoga, temples, and great food on a shoestring budget.", estimated_cost=2500),
        WishlistDestination(name="Amalfi Coast", country="Italy", priority=4,
                            reason="Coastal beauty, Italian food, wine, and the drive along the cliffside road.", estimated_cost=3500),
        WishlistDestination(name="Morocco — Marrakech to Sahara", country="Morocco", priority=5,
                            reason="Medinas, Atlas Mountains, camel trek, and completely different culture.", estimated_cost=2800),
    ]
    for w in wishlist:
        db.add(w)
    db.commit()


def seed_crm(db):
    today = date.today()

    # Tags
    tags = [
        Tag(name="investors", color="#f59e0b"),
        Tag(name="college", color="#6366f1"),
        Tag(name="SF", color="#3b82f6"),
        Tag(name="tech", color="#10b981"),
        Tag(name="family", color="#ef4444"),
        Tag(name="mentors", color="#8b5cf6"),
    ]
    for t in tags:
        db.add(t)
    db.commit()
    tag_map = {t.name: t for t in db.query(Tag).all()}

    # Contacts
    contacts_data = [
        {
            "name": "Alex Chen", "relationship_type": "colleague", "company": "Stripe",
            "job_title": "Senior Engineer", "location": "San Francisco, CA",
            "birthday": date(1990, 6, 15), "email": "alex@example.com",
            "cadence_days": 14, "notes": "Met at a hackathon. Great at systems design.",
            "tags": ["SF", "tech"],
            "interactions": [
                {"date": today - timedelta(days=8), "type": "coffee", "notes": "Caught up at Blue Bottle"},
                {"date": today - timedelta(days=45), "type": "call", "notes": "Chat about job market"},
            ]
        },
        {
            "name": "Sofia Reyes", "relationship_type": "mentor", "company": "a16z",
            "job_title": "Partner", "location": "San Francisco, CA",
            "birthday": date(1978, 11, 3), "email": "sofia@example.com",
            "cadence_days": 30, "notes": "Incredible investor with great pattern recognition. Introduced me to 3 people.",
            "tags": ["investors", "mentors", "SF"],
            "interactions": [
                {"date": today - timedelta(days=42), "type": "coffee", "notes": "Monthly check-in"},
                {"date": today - timedelta(days=72), "type": "email", "notes": "Sent her my startup deck"},
            ]
        },
        {
            "name": "Marcus Johnson", "relationship_type": "friend", "company": "Tesla",
            "job_title": "Product Manager", "location": "Austin, TX",
            "birthday": date(1991, 3, 28), "email": "mjohnson@example.com",
            "cadence_days": 21, "notes": "Best friend from college. Loves EV tech and hiking.",
            "tags": ["college"],
            "interactions": [
                {"date": today - timedelta(days=12), "type": "call", "notes": "Long catch-up, talked about life"},
                {"date": today - timedelta(days=60), "type": "event", "notes": "His birthday dinner"},
            ]
        },
        {
            "name": "Priya Patel", "relationship_type": "colleague", "company": "Self",
            "job_title": "Founder", "location": "New York, NY",
            "birthday": date(1992, 8, 12), "email": "priya@example.com",
            "cadence_days": 30, "notes": "Building a fintech startup. Great energy.",
            "tags": ["tech", "investors"],
            "interactions": [
                {"date": today - timedelta(days=95), "type": "call", "notes": "Intro call via Sofia"},
            ]
        },
        {
            "name": "David Kim", "relationship_type": "family",
            "location": "Los Angeles, CA",
            "birthday": date(1988, 1, 20), "email": "david.kim@example.com",
            "cadence_days": 7, "notes": "Brother. Call every Sunday.",
            "tags": ["family"],
            "interactions": [
                {"date": today - timedelta(days=3), "type": "call", "notes": "Sunday call"},
                {"date": today - timedelta(days=10), "type": "call", "notes": "Sunday call"},
            ]
        },
        {
            "name": "Emma Wilson", "relationship_type": "acquaintance", "company": "Google",
            "job_title": "UX Designer", "location": "Seattle, WA",
            "birthday": date(1993, 5, 7), "email": "emma@example.com",
            "cadence_days": 60, "notes": "Met at a design conference. Smart about product.",
            "tags": ["tech"],
            "interactions": [
                {"date": today - timedelta(days=120), "type": "event", "notes": "Design conference"},
            ]
        },
    ]

    for cd in contacts_data:
        contact_tags = cd.pop("tags", [])
        interactions = cd.pop("interactions", [])
        c = Contact(**cd)
        db.add(c)
        db.commit()
        db.refresh(c)

        for tag_name in contact_tags:
            if tag_name in tag_map:
                ct = ContactTag(contact_id=c.id, tag_id=tag_map[tag_name].id)
                db.add(ct)

        for inter in interactions:
            interaction = Interaction(contact_id=c.id, **inter)
            db.add(interaction)

    db.commit()

    # Add some follow-up reminders
    contacts_db = db.query(Contact).all()
    if contacts_db:
        r1 = FollowUpReminder(contact_id=contacts_db[1].id,
                               due_date=today + timedelta(days=3),
                               note="Schedule monthly check-in for this month")
        r2 = FollowUpReminder(contact_id=contacts_db[3].id,
                               due_date=today - timedelta(days=2),
                               note="Follow up on her startup progress - haven't talked in a while")
        db.add(r1)
        db.add(r2)
        db.commit()


def seed_health(db):
    today = date.today()

    # Body metrics - last 30 days
    import random
    random.seed(42)
    base_weight = 178.5
    for i in range(30):
        d = today - timedelta(days=29 - i)
        weight = round(base_weight + random.uniform(-1.5, 1.5) - (i * 0.05), 1)
        # HRV baseline ~65ms, some variance; logged most days
        hrv_base = 65 + (i * 0.3)  # slight trend upward as fitness improves
        db.add(BodyMetric(
            date=d, weight_lbs=weight,
            body_fat_pct=round(16.2 - (i * 0.02) + random.uniform(-0.3, 0.3), 1),
            resting_hr=random.randint(52, 62),
            hrv=round(hrv_base + random.uniform(-12, 12)) if i % 3 != 0 else None,
            waist_in=round(32.5 - (i * 0.01), 1) if i % 5 == 0 else None,
        ))
    db.commit()

    # Workouts - last 14 days (recent)
    workout_types = [
        ("Push Day", "strength", 55, ["Bench Press", "Shoulder Press", "Tricep Dips", "Cable Flies"]),
        ("Pull Day", "strength", 50, ["Deadlift", "Pull-ups", "Barbell Row", "Face Pulls"]),
        ("Leg Day", "strength", 60, ["Squat", "Romanian Deadlift", "Leg Press", "Calf Raises"]),
        ("Morning Run", "cardio", 35, []),
        ("Yoga Flow", "yoga", 45, []),
    ]
    workout_schedule = [0, 2, 4, 7, 9, 11]  # days ago
    for idx, days_ago in enumerate(workout_schedule):
        wtype = workout_types[idx % len(workout_types)]
        w = Workout(date=today - timedelta(days=days_ago), type=wtype[1],
                    title=wtype[0], duration_min=wtype[2])
        db.add(w)
        db.commit()
        db.refresh(w)
        for exname in wtype[3]:
            ex = WorkoutExercise(workout_id=w.id, name=exname,
                                  sets=3, reps=random.randint(6, 12),
                                  weight_lbs=round(random.uniform(65, 185), 0))
            db.add(ex)
    db.commit()

    # Extended workout history for progression tracking (12 weeks back)
    # Strength exercises with realistic progressive overload
    strength_progression_data = {
        "Bench Press":          [135, 140, 140, 145, 145, 150, 150, 155, 155, 160, 165, 165],
        "Squat":                [185, 185, 190, 195, 195, 200, 200, 205, 210, 210, 215, 220],
        "Deadlift":             [225, 225, 235, 235, 240, 245, 245, 250, 255, 255, 265, 270],
        "Shoulder Press":       [ 95,  95, 100, 100, 105, 105, 110, 110, 115, 115, 120, 120],
        "Pull-ups":             [  0,   0,   0,   0,   0,   0,   5,   5,  10,  10,  15,  15],
        "Romanian Deadlift":    [135, 140, 140, 145, 150, 150, 155, 155, 160, 165, 165, 170],
        "Barbell Row":          [115, 115, 120, 120, 125, 130, 130, 135, 135, 140, 145, 145],
    }
    cardio_history = [
        (30, 290), (32, 310), (28, 280), (35, 340), (33, 320),
        (36, 350), (30, 295), (38, 365), (35, 338), (40, 385),
        (37, 358), (42, 405),
    ]  # (duration_min, calories)

    # One strength session + one cardio session every 7 days for 12 weeks
    for week_idx in range(12):
        days_ago_base = (12 - week_idx) * 7  # oldest first
        push_day = today - timedelta(days=days_ago_base + 3)
        pull_day = today - timedelta(days=days_ago_base + 1)
        leg_day  = today - timedelta(days=days_ago_base)
        cardio_day = today - timedelta(days=days_ago_base + 5)

        # Push day
        w_push = Workout(date=push_day, type="strength", title="Push Day", duration_min=55)
        db.add(w_push); db.commit(); db.refresh(w_push)
        for ex_name in ["Bench Press", "Shoulder Press", "Tricep Dips", "Cable Flies"]:
            base = strength_progression_data.get(ex_name, [100])[week_idx % 12]
            noise = random.uniform(-2.5, 2.5)
            db.add(WorkoutExercise(
                workout_id=w_push.id, name=ex_name,
                sets=4, reps=random.randint(6, 10),
                weight_lbs=round(base + noise, 0)
            ))

        # Pull day
        w_pull = Workout(date=pull_day, type="strength", title="Pull Day", duration_min=50)
        db.add(w_pull); db.commit(); db.refresh(w_pull)
        for ex_name in ["Deadlift", "Pull-ups", "Barbell Row", "Face Pulls"]:
            base = strength_progression_data.get(ex_name, [100])[week_idx % 12]
            noise = random.uniform(-2.5, 2.5)
            db.add(WorkoutExercise(
                workout_id=w_pull.id, name=ex_name,
                sets=4, reps=random.randint(5, 10),
                weight_lbs=round(base + noise, 0)
            ))

        # Leg day
        w_leg = Workout(date=leg_day, type="strength", title="Leg Day", duration_min=60)
        db.add(w_leg); db.commit(); db.refresh(w_leg)
        for ex_name in ["Squat", "Romanian Deadlift", "Leg Press", "Calf Raises"]:
            base = strength_progression_data.get(ex_name, [100])[week_idx % 12]
            noise = random.uniform(-2.5, 2.5)
            db.add(WorkoutExercise(
                workout_id=w_leg.id, name=ex_name,
                sets=4, reps=random.randint(8, 12),
                weight_lbs=round(base + noise, 0)
            ))

        # Cardio
        cardio_dur, cardio_cal = cardio_history[week_idx % len(cardio_history)]
        w_cardio = Workout(
            date=cardio_day, type="cardio", title="Morning Run",
            duration_min=cardio_dur, calories_burned=cardio_cal
        )
        db.add(w_cardio)

    db.commit()

    # Sleep - last 21 days
    for i in range(21):
        d = today - timedelta(days=i)
        hours = round(random.uniform(6.0, 8.5), 1)
        db.add(SleepLog(date=d, hours=hours,
                         quality=random.randint(3, 5) if hours >= 7 else random.randint(2, 4),
                         bedtime="23:00", wake_time="07:00"))
    db.commit()

    # Supplements
    supps = [
        Supplement(name="Creatine Monohydrate", dose="5g", frequency="daily",
                   timing="post-workout", purpose="Strength & muscle recovery", is_active=True),
        Supplement(name="Vitamin D3", dose="4000 IU", frequency="daily",
                   timing="morning", purpose="Immune support, mood", is_active=True),
        Supplement(name="Omega-3 Fish Oil", dose="2g EPA/DHA", frequency="daily",
                   timing="with food", purpose="Cardiovascular & brain health", is_active=True),
        Supplement(name="Magnesium Glycinate", dose="400mg", frequency="daily",
                   timing="evening", purpose="Sleep quality, muscle relaxation", is_active=True),
        Supplement(name="Athletic Greens (AG1)", dose="1 scoop", frequency="daily",
                   timing="morning", purpose="Micronutrient insurance", is_active=True),
        Supplement(name="Ashwagandha KSM-66", dose="600mg", frequency="daily",
                   timing="evening", purpose="Stress & cortisol management", is_active=False),
    ]
    for s in supps:
        db.add(s)

    # Blood work
    blood = [
        BloodWorkResult(date=today - timedelta(days=90), marker_name="Total Cholesterol", value=182, unit="mg/dL",
                         reference_low=0, reference_high=200),
        BloodWorkResult(date=today - timedelta(days=90), marker_name="HDL", value=62, unit="mg/dL",
                         reference_low=40, reference_high=999),
        BloodWorkResult(date=today - timedelta(days=90), marker_name="LDL", value=108, unit="mg/dL",
                         reference_low=0, reference_high=130),
        BloodWorkResult(date=today - timedelta(days=90), marker_name="Testosterone (Total)", value=712, unit="ng/dL",
                         reference_low=300, reference_high=1000),
        BloodWorkResult(date=today - timedelta(days=90), marker_name="Vitamin D (25-OH)", value=48, unit="ng/mL",
                         reference_low=30, reference_high=80),
        BloodWorkResult(date=today - timedelta(days=90), marker_name="HbA1c", value=5.1, unit="%",
                         reference_low=0, reference_high=5.7),
        BloodWorkResult(date=today - timedelta(days=90), marker_name="Ferritin", value=95, unit="ng/mL",
                         reference_low=12, reference_high=300),
    ]
    for b in blood:
        db.add(b)
    db.commit()

    # Macro targets
    db.add(MacroTarget(calories=2300, protein_g=185.0, carbs_g=230.0, fat_g=72.0,
                        notes="High-protein recomp: 185g protein, moderate carbs, training days higher"))
    db.commit()

    # Nutrition logs — 14 days of realistic meal data
    MEAL_TEMPLATES = {
        "breakfast": [
            ("Greek Yogurt (1 cup) + Berries", 280, 20, 32, 5),
            ("Oatmeal with protein powder + banana", 380, 28, 55, 7),
            ("4 eggs scrambled + toast + OJ", 480, 32, 38, 18),
            ("Protein shake + 2 slices whole wheat toast", 350, 35, 38, 6),
        ],
        "lunch": [
            ("Chicken breast 6oz + rice + broccoli", 520, 48, 48, 8),
            ("Ground turkey bowl + quinoa + spinach", 550, 45, 50, 12),
            ("Tuna sandwich + side salad", 440, 38, 42, 10),
            ("Leftover dinner + protein shake", 480, 42, 40, 12),
        ],
        "dinner": [
            ("Salmon 6oz + sweet potato + asparagus", 560, 45, 42, 16),
            ("Lean beef stir fry + rice noodles", 620, 42, 58, 18),
            ("Grilled chicken thighs + roasted veggies", 540, 44, 28, 20),
            ("Shrimp + pasta + marinara", 580, 38, 62, 12),
        ],
        "snack": [
            ("Cottage cheese 1 cup", 180, 25, 8, 4),
            ("Apple + almond butter 2 tbsp", 200, 5, 28, 10),
            ("Protein bar (Quest)", 200, 21, 21, 7),
            ("Mixed nuts 1oz + string cheese", 220, 11, 8, 17),
            ("Rice cakes + peanut butter", 240, 8, 32, 10),
        ],
    }
    for day_offset in range(14):
        d = today - timedelta(days=day_offset)
        random.seed(100 + day_offset)
        # Pick meals (always breakfast+lunch+dinner, sometimes 1-2 snacks)
        for meal_type in ("breakfast", "lunch", "dinner"):
            template = random.choice(MEAL_TEMPLATES[meal_type])
            # Slight daily variation
            cal_var = random.randint(-30, 30)
            db.add(NutritionLog(
                date=d, meal=meal_type, food_item=template[0],
                calories=template[1] + cal_var,
                protein_g=round(template[2] + random.uniform(-3, 3), 1),
                carbs_g=round(template[3] + random.uniform(-5, 5), 1),
                fat_g=round(template[4] + random.uniform(-2, 2), 1),
            ))
        # Snack 70% of days, sometimes 2 snacks
        if random.random() < 0.7:
            snack = random.choice(MEAL_TEMPLATES["snack"])
            db.add(NutritionLog(
                date=d, meal="snack", food_item=snack[0],
                calories=snack[1], protein_g=snack[2], carbs_g=snack[3], fat_g=snack[4],
            ))
        if random.random() < 0.3:
            snack2 = random.choice(MEAL_TEMPLATES["snack"])
            db.add(NutritionLog(
                date=d, meal="snack", food_item=snack2[0],
                calories=snack2[1], protein_g=snack2[2], carbs_g=snack2[3], fat_g=snack2[4],
            ))
    db.commit()

    # Medical timeline seed data (S4.03)
    today = date.today()
    medical_events = [
        MedicalEvent(
            date=today - timedelta(days=365), type="checkup",
            title="Annual Physical", provider="Dr. Chen, One Medical",
            notes="Full physical, bloodwork ordered.", outcome="All clear. Slightly low vitamin D.",
            next_due=today + timedelta(days=0),  # due now — triggers overdue flag
        ),
        MedicalEvent(
            date=today - timedelta(days=180), type="dental",
            title="Dental Cleaning", provider="Castro Valley Dental",
            notes="No cavities.", outcome="Good. One area to watch on lower left.",
            next_due=today + timedelta(days=185),
        ),
        MedicalEvent(
            date=today - timedelta(days=90), type="lab",
            title="Blood Panel (Lipids + Thyroid)", provider="Quest Diagnostics",
            notes="Fasted. Ordered by Dr. Chen following annual physical.",
            outcome="LDL 112 (borderline), HDL 58, TSH 1.8 (normal). Follow up in 6 months.",
            next_due=today + timedelta(days=90),
        ),
        MedicalEvent(
            date=today - timedelta(days=14), type="vision",
            title="Eye Exam", provider="Target Optical",
            notes="Annual check.", outcome="Prescription unchanged. -1.75 / -2.00.",
            next_due=today + timedelta(days=351),
        ),
        MedicalEvent(
            date=today + timedelta(days=12), type="specialist",
            title="Dermatologist Skin Check", provider="SF Dermatology Group",
            notes="Annual mole scan, overdue from last year.", outcome=None,
            next_due=None, is_upcoming=True,
        ),
        MedicalEvent(
            date=today + timedelta(days=45), type="dental",
            title="Dental Cleaning", provider="Castro Valley Dental",
            notes="6-month follow-up.", outcome=None,
            next_due=None, is_upcoming=True,
        ),
        MedicalEvent(
            date=today - timedelta(days=730), type="vaccination",
            title="Flu Shot", provider="Walgreens",
            notes="Annual flu vaccine.", outcome="No reaction.",
            next_due=today - timedelta(days=10),  # past due — should appear as overdue
        ),
    ]
    for evt in medical_events:
        db.add(evt)
    db.commit()


def seed_habits(db):
    today = date.today()
    import random
    random.seed(7)

    habits = [
        Habit(name="Morning Workout", icon="💪", color="#ef4444", frequency="daily", target_days_per_week=5),
        Habit(name="Read 30 min", icon="📚", color="#6366f1", frequency="daily", target_days_per_week=7),
        Habit(name="Meditate", icon="🧘", color="#10b981", frequency="daily", target_days_per_week=7),
        Habit(name="No alcohol", icon="🚫", color="#f59e0b", frequency="daily", target_days_per_week=7),
        Habit(name="Cold shower", icon="🚿", color="#3b82f6", frequency="daily", target_days_per_week=5),
        Habit(name="Journal", icon="📝", color="#8b5cf6", frequency="daily", target_days_per_week=7),
        Habit(name="Walk 8k steps", icon="🚶", color="#06b6d4", frequency="daily", target_days_per_week=7),
    ]
    for h in habits:
        db.add(h)
    db.commit()

    habits_db = db.query(Habit).all()
    # Log last 21 days with realistic completion rates
    completion_rates = [0.85, 0.90, 0.75, 0.95, 0.70, 0.80, 0.88]
    for h, rate in zip(habits_db, completion_rates):
        for i in range(21):
            d = today - timedelta(days=i)
            if random.random() < rate:
                db.add(HabitLog(habit_id=h.id, date=d, completed=True))
    db.commit()

    # Routines
    morning = Routine(name="Morning Routine", type="morning", icon="🌅")
    evening = Routine(name="Evening Wind-Down", type="evening", icon="🌙")
    db.add(morning); db.add(evening)
    db.commit()

    morning_items = [
        ("Wake up, no phone for 10 min", 10, 0), ("Cold shower", 10, 1),
        ("AG1 + supplements", 5, 2), ("Workout", 55, 3),
        ("Protein shake + breakfast", 15, 4), ("Journal (3 things grateful)", 10, 5),
        ("Review top 3 priorities for today", 5, 6),
    ]
    for desc, dur, idx in morning_items:
        db.add(RoutineItem(routine_id=morning.id, description=desc, duration_min=dur, order_index=idx))

    evening_items = [
        ("No screens after 9pm", 0, 0), ("Read fiction 30 min", 30, 1),
        ("Magnesium + sleep supplements", 5, 2), ("Journaling — how was today?", 10, 3),
        ("Lights out by 10:30pm", 0, 4),
    ]
    for desc, dur, idx in evening_items:
        db.add(RoutineItem(routine_id=evening.id, description=desc, duration_min=dur, order_index=idx))
    db.commit()


def seed_reading(db):
    today = date.today()
    books = [
        Book(title="Clear Thinking", author="Shane Parrish", genre="Self-improvement",
             status="reading", current_page=187, page_count=310,
             started_date=today - timedelta(days=12), source="physical",
             notes="Really strong on decision-making frameworks. Slow read — lots to absorb."),
        Book(title="The Almanack of Naval Ravikant", author="Eric Jorgenson", genre="Philosophy",
             status="completed", rating=5, page_count=242,
             started_date=today - timedelta(days=120), finished_date=today - timedelta(days=95),
             source="kindle", notes="Re-readable. Dense with ideas on wealth and happiness."),
        Book(title="Zero to One", author="Peter Thiel", genre="Business",
             status="completed", rating=4, page_count=224,
             started_date=today - timedelta(days=200), finished_date=today - timedelta(days=185),
             source="physical"),
        Book(title="Thinking, Fast and Slow", author="Daniel Kahneman", genre="Psychology",
             status="completed", rating=5, page_count=499,
             started_date=today - timedelta(days=365), finished_date=today - timedelta(days=330),
             source="physical", notes="Foundational. System 1 vs System 2 framework changed how I notice my own thinking."),
        Book(title="The Courage to Be Disliked", author="Ichiro Kishimi", genre="Philosophy",
             status="want_to_read", source="kindle"),
        Book(title="Antifragile", author="Nassim Taleb", genre="Philosophy",
             status="want_to_read"),
        Book(title="Can't Hurt Me", author="David Goggins", genre="Self-improvement",
             status="completed", rating=4, page_count=364,
             started_date=today - timedelta(days=180), finished_date=today - timedelta(days=155),
             source="audiobook"),
        Book(title="The Psychology of Money", author="Morgan Housel", genre="Finance",
             status="completed", rating=5, page_count=256,
             started_date=today - timedelta(days=250), finished_date=today - timedelta(days=235),
             source="kindle", notes="Everyone who earns money should read this. Especially the chapters on compounding and luck."),
        Book(title="Sapiens", author="Yuval Noah Harari", genre="History",
             status="want_to_read"),
        Book(title="Deep Work", author="Cal Newport", genre="Productivity",
             status="completed", rating=4, page_count=304,
             started_date=today - timedelta(days=300), finished_date=today - timedelta(days=275),
             source="physical"),
    ]
    for b in books:
        db.add(b)
    db.commit()

    books_db = db.query(Book).all()
    naval_book = next((b for b in books_db if "Naval" in b.title), None)
    psych_money = next((b for b in books_db if "Psychology of Money" in b.title), None)

    if naval_book:
        db.add(BookQuote(book_id=naval_book.id, page_number=41,
                          quote="Earn with your mind, not your time."))
        db.add(BookQuote(book_id=naval_book.id, page_number=78,
                          quote="The most important skill for getting rich is becoming a perpetual learner."))
        db.add(BookNote(book_id=naval_book.id, content="Chapter on specific knowledge is key — the thing you do that can't be outsourced or automated because it comes from your unique combination of skills and obsessions.", page_number=52))

    if psych_money:
        db.add(BookQuote(book_id=psych_money.id, page_number=112,
                          quote="Your personal experiences with money make up maybe 0.00000001% of what's happened in the world, but maybe 80% of how you think the world works."))
        db.add(BookNote(book_id=psych_money.id, content="Housel's point on 'enough' is underrated. Knowing when to stop taking risks is as important as knowing when to take them.", page_number=88))
    db.commit()


def seed_projects(db):
    today = date.today()
    q = (today.month - 1) // 3 + 1

    # OKR Objectives
    objectives = [
        Objective(title="Launch Life OS as a shareable product", description="Take the personal tool public — MVP that others can use",
                  quarter=q, year=today.year, color="#6366f1"),
        Objective(title="Reach $500K net worth", description="Hit the milestone through savings + investment growth",
                  quarter=q, year=today.year, color="#22c55e"),
        Objective(title="Optimize health & performance baseline",
                  quarter=q, year=today.year, color="#ef4444"),
    ]
    for o in objectives:
        db.add(o)
    db.commit()

    objs = db.query(Objective).all()
    krs_data = [
        # Life OS
        [(objs[0].id, "Ship backend API with all 10 modules", 100, 70, "%", None),
         (objs[0].id, "Build and polish all frontend modules", 100, 40, "%", None),
         (objs[0].id, "Write README + setup.sh (one-command install)", 100, 80, "%", None),
         (objs[0].id, "Get 3 beta testers running it locally", 3, 0, "users", None)],
        # Net worth
        [(objs[1].id, "Grow investment portfolio to $145K", 145_000, 140_100, "$", None),
         (objs[1].id, "Save 25% of gross income this quarter", 25, 18, "%", None),
         (objs[1].id, "Max 401(k) contributions for the year", 23_000, 17_250, "$", None)],
        # Health
        [(objs[2].id, "Reach 175 lbs (lean)", 175, 178.5, "lbs", None),
         (objs[2].id, "Work out 4x/week for 12 weeks", 48, 32, "workouts", None),
         (objs[2].id, "Average 7.5h sleep for 30 days", 7.5, 6.9, "hours/night", None)],
    ]
    for kr_list in krs_data:
        for obj_id, title, target, current, unit, due in kr_list:
            db.add(KeyResult(objective_id=obj_id, title=title, target_value=target,
                              current_value=current, unit=unit, due_date=due))
    db.commit()

    # Projects (P2.02: set created_at / completed_at for historical projects so velocity engine has data)
    from datetime import datetime, timedelta
    today_dt = datetime.utcnow()
    projects = [
        Project(title="Life OS", description="Personal life management web app", status="active",
                color="#6366f1", icon="🖥️", objective_id=objs[0].id, project_type="product",
                created_at=today_dt - timedelta(days=45)),
        Project(title="Trading Bot v2", description="Upgrade strategy engine + add live paper trading UI",
                status="active", color="#10b981", icon="🤖", project_type="product",
                created_at=today_dt - timedelta(days=30)),
        Project(title="Wiki Ingestion System", description="Automated pipeline to add articles to the wiki from various sources",
                status="backlog", color="#8b5cf6", icon="📚", project_type="operational",
                created_at=today_dt - timedelta(days=20)),
        Project(title="SF Apartment Refinance", description="Evaluate refinancing options with current rates",
                status="paused", color="#f59e0b", icon="🏠", project_type="financial",
                created_at=today_dt - timedelta(days=60)),
        Project(title="Newsletter Launch", description="Launch a monthly AI trends newsletter on Beehiiv",
                status="completed", color="#06b6d4", icon="📩", project_type="content",
                created_at=today_dt - timedelta(days=120),
                completed_at=today_dt - timedelta(days=48)),
        Project(title="Podcast Side Project", description="Start a weekly podcast on personal productivity and systems",
                status="abandoned", color="#6b7280", icon="🎙️", project_type="content",
                created_at=today_dt - timedelta(days=90),
                completed_at=today_dt - timedelta(days=20)),
        Project(title="Personal Brand Website", description="Portfolio site with case studies, writing, and contact",
                status="completed", color="#f97316", icon="🌐", project_type="product",
                created_at=today_dt - timedelta(days=200),
                completed_at=today_dt - timedelta(days=145)),
        Project(title="Budgeting Overhaul", description="Migrate all accounts into Life OS Finance, cancel Monarch",
                status="completed", color="#22c55e", icon="💰", project_type="financial",
                created_at=today_dt - timedelta(days=160),
                completed_at=today_dt - timedelta(days=115)),
    ]
    for p in projects:
        db.add(p)
    db.commit()

    projs = db.query(Project).all()
    tasks_data = [
        # Life OS tasks
        (projs[0].id, [
            ("Finish all frontend modules", True, "high"),
            ("Write setup.sh and requirements.txt", False, "high"),
            ("Add seed data for all modules", True, "medium"),
            ("Test full install from scratch", False, "high"),
            ("Write README with screenshots", False, "medium"),
        ]),
        # Trading bot tasks
        (projs[1].id, [
            ("Add WebSocket price feeds", False, "high"),
            ("Build paper trading dashboard frontend", False, "high"),
            ("Backtest MACD on crypto pairs", False, "medium"),
            ("Set up strategy comparison view", False, "low"),
        ]),
        # Wiki tasks
        (projs[2].id, [
            ("Design ingestion pipeline schema", False, "medium"),
            ("Build Claude skill for wiki capture", False, "high"),
        ]),
    ]
    for proj_id, tasks in tasks_data:
        for i, (title, done, priority) in enumerate(tasks):
            db.add(ProjectTask(project_id=proj_id, title=title, is_completed=done,
                                priority=priority, order_index=i))
    db.commit()


def seed_postmortems(db):
    """Seed post-mortems for completed/abandoned projects."""
    completed = db.query(Project).filter(Project.status == "completed").first()
    abandoned = db.query(Project).filter(Project.status == "abandoned").first()

    if completed:
        db.add(ProjectPostmortem(
            project_id=completed.id,
            what_worked="Starting with a clear distribution channel (Beehiiv) before writing the first issue. Having a content calendar 2 weeks ahead removed the pressure of weekly deadlines. Repurposing existing notes into newsletter format was much faster than writing from scratch.",
            what_didnt="Underestimated the time required to grow the list organically — SEO takes 3-6 months to compound. Initial outreach felt spammy and had low conversion. Tried to cover too many topics in early issues instead of having a tight niche.",
            key_lesson="Distribution-first beats content-first. Lock the channel, audience, and niche before writing a single word. The first 10 subscribers are 10x harder than the next 100.",
            would_repeat=True,
            rating=4,
        ))

    if abandoned:
        db.add(ProjectPostmortem(
            project_id=abandoned.id,
            what_worked="The first 3 episodes had good energy and solid guest conversations. Equipment setup was simpler than expected. Editing workflow in Descript was efficient once I learned it.",
            what_didnt="Severely underestimated the time cost: ~4 hours per episode (scheduling, recording, editing, publishing, promotion). The ROI vs. written content was not there. Audio quality issues in remote recordings were hard to fix in post. Promotion felt like a second full-time job.",
            key_lesson="Podcasting only makes sense at scale or with a strong existing audience. Without 1000+ true fans already, the effort-to-impact ratio is brutal. Written content compounds better — a blog post is searchable forever. A podcast episode is mostly one-time.",
            would_repeat=False,
            rating=2,
        ))
    db.commit()


def seed_mood(db):
    today = date.today()
    import random
    random.seed(13)
    tags_pool = ["productive", "social", "outdoor", "focused", "tired", "motivated", "creative", "stressed"]
    for i in range(30):
        d = today - timedelta(days=i)
        mood = random.randint(6, 10) if random.random() > 0.2 else random.randint(3, 6)
        energy = mood + random.randint(-2, 2)
        energy = max(1, min(10, energy))
        stress = 11 - mood + random.randint(-1, 2)
        stress = max(1, min(10, stress))
        tags = random.sample(tags_pool, random.randint(1, 3))
        db.add(MoodLog(date=d, mood=mood, energy=energy, stress=stress,
                        anxiety=random.randint(1, 5),
                        focus=random.randint(5, 10),
                        tags=",".join(tags)))
    db.commit()


def seed_trading(db):
    today = date.today()
    import random
    random.seed(99)

    strategies = [
        Strategy(name="MACD Crossover", description="12/26/9 MACD on daily timeframe",
                  type="trend", color="#22c55e", is_active=True),
        Strategy(name="RSI Mean Reversion", description="RSI(14) oversold/overbought on 4H",
                  type="mean_reversion", color="#6366f1", is_active=True),
        Strategy(name="SMA Momentum", description="50/200 SMA crossover swing trades",
                  type="momentum", color="#f59e0b", is_active=True),
    ]
    for s in strategies:
        db.add(s)
    db.commit()

    strats = db.query(Strategy).all()

    # Trades - last 90 days
    symbols = ["AAPL", "MSFT", "NVDA", "SPY", "QQQ", "TSLA", "BTC-USD", "ETH-USD"]
    for i in range(45):
        d = today - timedelta(days=random.randint(1, 89))
        sym = random.choice(symbols)
        price = round(random.uniform(50, 500), 2)
        qty = round(random.uniform(1, 20), 4 if "USD" in sym else 0)
        pnl = round(random.uniform(-300, 600), 2)
        side = random.choice(["buy", "sell"])
        db.add(Trade(strategy_id=random.choice(strats).id, symbol=sym, side=side,
                      quantity=qty, price=price, date=d,
                      fees=round(random.uniform(0.5, 5), 2), pnl=pnl if side == "sell" else 0))
    db.commit()

    # Current positions
    positions = [
        Position(symbol="NVDA", quantity=25, avg_cost=480.50, current_price=875.20,
                  asset_class="equity", strategy_id=strats[0].id),
        Position(symbol="MSFT", quantity=15, avg_cost=320.00, current_price=415.80,
                  asset_class="equity", strategy_id=strats[2].id),
        Position(symbol="SPY", quantity=30, avg_cost=440.00, current_price=520.50,
                  asset_class="etf"),
        Position(symbol="BTC-USD", quantity=0.25, avg_cost=38_000, current_price=68_000,
                  asset_class="crypto", strategy_id=strats[0].id),
        Position(symbol="ETH-USD", quantity=2.5, avg_cost=2_200, current_price=3_500,
                  asset_class="crypto"),
    ]
    for p in positions:
        db.add(p)
    db.commit()

    # Portfolio snapshots - last 6 months
    base_val = 142_000
    for i in range(180):
        d = today - timedelta(days=180 - i)
        val = round(base_val * (1 + (i / 180) * 0.18 + random.uniform(-0.01, 0.015)), 2)
        db.add(PortfolioSnapshot(date=d, total_value=val,
                                  cash=round(val * 0.08, 2),
                                  positions_value=round(val * 0.92, 2),
                                  day_pnl=round(random.uniform(-800, 1200), 2),
                                  total_pnl=round(val - base_val, 2)))
    db.commit()


def seed_tasks(db):
    from datetime import datetime
    import random
    today = date.today()

    tasks_data = [
        # INBOX — open, no due date yet
        dict(title="Review Q2 OKR progress", notes="Check key results vs targets, adjust if needed", priority=2, status="inbox", area="work"),
        dict(title="Set up Bitwarden affiliate link on strongpasswordgenerator.dev", notes="$30–70 per conversion — high ROI", priority=2, status="inbox", area="work"),
        dict(title="Book dentist appointment", notes="Last visit was 8 months ago", priority=3, status="inbox", area="health"),
        dict(title="Research Roth IRA contribution limits for 2026", priority=3, status="inbox", area="finance"),
        dict(title="Write everydayaiworkflows.com affiliate disclosure page", priority=3, status="inbox", area="work"),
        dict(title="Cancel Todoist subscription", notes="After Tasks module ships", priority=4, status="inbox", area="finance"),
        dict(title="Cancel TripIt subscription", notes="After Travel module ships", priority=4, status="inbox", area="finance"),
        dict(title="Read The Almanack of Naval Ravikant", priority=4, status="inbox", area="personal"),
        dict(title="Explore Headspace affiliate program for motivational-quote.org", priority=4, status="inbox", area="work"),
        dict(title="Organize Downloads folder", priority=4, status="inbox", area="personal"),

        # TODAY — high priority, due today
        dict(title="Fix trading bot is_market_open() bug", notes="Replace yfinance calendar check with pandas_market_calendars or hardcoded 9:30am–4pm ET", priority=1, status="today", area="work", due_date=today),
        dict(title="Restart trading bot with nohup", notes="cd ~/Desktop/Claude/trading-bot && source .venv/bin/activate && nohup python main.py > logs/bot.log 2>&1 &", priority=1, status="today", area="work", due_date=today),
        dict(title="Morning workout — upper body", priority=2, status="today", area="health", due_date=today),
        dict(title="Review trading bot logs after restart", priority=2, status="today", area="work", due_date=today),

        # UPCOMING — due in next 1–14 days
        dict(title="Write Life OS Tasks module frontend (S2.02)", priority=1, status="inbox", area="work", due_date=today + timedelta(days=2)),
        dict(title="Add launchd plist for trading bot auto-restart", notes="Prevents 8-day outages on Mac reboot", priority=2, status="inbox", area="work", due_date=today + timedelta(days=3)),
        dict(title="Re-authenticate Kalshi RSA key", notes="401 Unauthorized for 10+ days", priority=2, status="inbox", area="work", due_date=today + timedelta(days=3)),
        dict(title="Pay credit card bill", priority=1, status="inbox", area="finance", due_date=today + timedelta(days=5)),
        dict(title="Complete Life OS S1.07 responsive layout QA", priority=2, status="inbox", area="work", due_date=today + timedelta(days=4)),
        dict(title="Check AdSense approval status — motivational-quote.org", notes="110+ posts, should qualify now", priority=2, status="inbox", area="work", due_date=today + timedelta(days=7)),
        dict(title="Set up Beehiiv welcome email sequence", priority=3, status="inbox", area="work", due_date=today + timedelta(days=10)),
        dict(title="Buy birthday gift for mom", priority=2, status="inbox", area="personal", due_date=today + timedelta(days=6)),
        dict(title="June 1 trading bot calibration — adjust strategy weights", notes="Reduce Regime Detection 75%, Dual Momentum 50%, Bollinger 50%. Increase ATR Trailing Stop.", priority=2, status="inbox", area="work", due_date=today + timedelta(days=18)),

        # DONE — completed in the past
        dict(title="Design system overhaul (S1.01)", status="done", priority=2, area="work",
             created_at=datetime.utcnow() - timedelta(days=17),
             completed_at=datetime.utcnow() - timedelta(days=17)),
        dict(title="Sidebar redesign (S1.02)", status="done", priority=2, area="work",
             created_at=datetime.utcnow() - timedelta(days=14),
             completed_at=datetime.utcnow() - timedelta(days=14)),
        dict(title="Command palette Cmd+K (S1.03)", status="done", priority=2, area="work",
             created_at=datetime.utcnow() - timedelta(days=10),
             completed_at=datetime.utcnow() - timedelta(days=10)),
        dict(title="Toast notification system (S1.05)", status="done", priority=2, area="work",
             created_at=datetime.utcnow() - timedelta(days=10),
             completed_at=datetime.utcnow() - timedelta(days=10)),
        dict(title="Page transitions and animations (S1.06)", status="done", priority=2, area="work",
             created_at=datetime.utcnow() - timedelta(days=6),
             completed_at=datetime.utcnow() - timedelta(days=6)),
        dict(title="Fix AdSense corruption on strongpasswordgenerator.dev", status="done", priority=1, area="work",
             created_at=datetime.utcnow() - timedelta(days=10),
             completed_at=datetime.utcnow() - timedelta(days=10)),
        dict(title="Add git push step to motivational-quote content pipeline", status="done", priority=2, area="work",
             created_at=datetime.utcnow() - timedelta(days=10),
             completed_at=datetime.utcnow() - timedelta(days=10)),
        dict(title="Weekly review — May 11", status="done", priority=2, area="personal",
             created_at=datetime.utcnow() - timedelta(days=3),
             completed_at=datetime.utcnow() - timedelta(days=3)),
        dict(title="Gym — legs day", status="done", priority=2, area="health",
             created_at=datetime.utcnow() - timedelta(days=2),
             completed_at=datetime.utcnow() - timedelta(days=2)),
        dict(title="Responsive layout (S1.07)", status="done", priority=2, area="work",
             created_at=datetime.utcnow() - timedelta(days=1),
             completed_at=datetime.utcnow()),
    ]

    for td in tasks_data:
        # Separate model fields from seed-only extras
        completed_at = td.pop("completed_at", None)
        created_at   = td.pop("created_at", None)
        t = Task(**td)
        if completed_at:
            t.completed_at = completed_at
        if created_at:
            t.created_at = created_at
        db.add(t)

    db.commit()
    print("  ✓ Tasks seeded")


def seed_time_tracking(db):
    """30 days of realistic time blocks and focus logs."""
    import random
    random.seed(77)
    today = date.today()

    # Daily schedule templates: (start, end, category, subcategory, title, energy_start, energy_end, planned)
    SCHEDULE_TEMPLATES = [
        # Morning routine
        ("06:00", "06:30", "recovery",  "sleep_wind_down", "Morning wind-down / wake-up",  6, 7, True),
        ("06:30", "07:30", "health",    "workout",         "Morning workout",               7, 8, True),
        ("07:30", "08:00", "recovery",  "shower_breakfast","Shower + breakfast",            7, 8, False),
        # Deep work block 1
        ("08:00", "10:00", "deep_work", "coding",          "Deep work — Life OS build",     8, 7, True),
        ("08:00", "10:00", "deep_work", "writing",         "Deep work — content writing",   8, 7, True),
        ("08:00", "10:00", "deep_work", "coding",          "Deep work — trading bot",       8, 7, True),
        # Admin / email
        ("10:00", "10:30", "admin",     "email",           "Inbox zero / email triage",     7, 6, False),
        # Deep work block 2
        ("10:30", "12:30", "deep_work", "coding",          "Deep work — sprint session",    7, 6, True),
        ("10:30", "12:30", "learning",  "course",          "Learning — online course",      7, 7, False),
        # Lunch
        ("12:30", "13:00", "recovery",  "lunch",           "Lunch break",                   6, 7, False),
        # Meetings / social
        ("13:00", "14:00", "meetings",  "1on1",            "1:1 meeting",                   7, 6, True),
        ("13:00", "14:00", "social",    "coffee_chat",     "Coffee chat",                   7, 8, True),
        # Afternoon work
        ("14:00", "16:00", "deep_work", "coding",          "Deep work — afternoon session", 6, 6, True),
        ("14:00", "15:00", "admin",     "planning",        "Weekly planning / review",      6, 7, True),
        ("15:00", "16:00", "admin",     "tasks",           "Task processing",               6, 6, False),
        # Exercise / health
        ("16:00", "17:00", "health",    "walk",            "Evening walk",                  6, 7, False),
        ("16:00", "17:30", "health",    "gym",             "Gym session",                   6, 8, True),
        # Leisure / learning
        ("17:30", "18:30", "learning",  "reading",         "Reading — non-fiction",         7, 8, True),
        ("18:00", "19:00", "leisure",   "podcasts",        "Podcasts / downtime",           6, 7, False),
        # Social / dinner
        ("19:00", "20:00", "social",    "dinner",          "Dinner with friends",           7, 8, False),
        ("19:00", "20:00", "recovery",  "dinner_home",     "Home dinner",                   6, 7, False),
        # Evening wind-down
        ("20:00", "21:00", "leisure",   "tv_movies",       "TV / entertainment",            6, 5, False),
        ("20:00", "21:00", "learning",  "side_project",    "Side project — content sites",  7, 7, True),
        ("21:00", "22:00", "recovery",  "wind_down",       "Evening wind-down / reading",   5, 4, True),
    ]

    distractions_pool = [
        "Slack notifications pulled me out of flow twice",
        "Got sucked into Twitter for 20 minutes",
        "Phone buzzing with news alerts",
        "Back-to-back meetings killed momentum",
        "Email kept pulling attention mid-session",
        "Browser tab rabbit hole — ended up reading about something unrelated",
        "Unexpected call from a friend",
        "Network issue slowed down work flow",
        "Noise from neighbors during key focus block",
    ]
    energy_drains_pool = [
        "Unclear requirements on the task at hand",
        "Long video call with lots of context switching",
        "Admin work — mindless but draining",
        "Anxiety about delayed project milestone",
        "Poor sleep the night before catching up",
        "Too much caffeine early, crash in the afternoon",
        "Overly processed lunch, energy dip after",
    ]
    energy_boosts_pool = [
        "Morning workout set the tone perfectly",
        "Made real visible progress on Life OS",
        "Had a great conversation with a friend",
        "Flow state hit around 9am — 2 hours uninterrupted",
        "Good sleep, woke up naturally before alarm",
        "Reading session before bed was genuinely relaxing",
        "Cold shower in the morning — felt sharp",
        "Completed a key project milestone — dopamine hit",
    ]
    focus_areas_pool = [
        "Life OS build session", "Trading bot debugging", "Content writing for EAFW",
        "Finance review + planning", "Health optimization", "Deep reading session",
        "Strategic planning — Q2 OKR review", "Backend architecture", "Frontend polish",
    ]

    for day_offset in range(30):
        d = today - timedelta(days=29 - day_offset)
        is_weekend = d.weekday() >= 5

        # Pick 4-7 blocks per day from templates
        num_blocks = random.randint(4, 7)
        used_times = set()

        # Always include: morning workout (some days), deep work, admin, recovery
        if is_weekend:
            daily_pool = [t for t in SCHEDULE_TEMPLATES if t[2] in ("health", "leisure", "learning", "social", "recovery")]
        else:
            daily_pool = SCHEDULE_TEMPLATES

        chosen = random.sample(daily_pool, min(num_blocks, len(daily_pool)))

        for (start, end, cat, subcat, title, e_start, e_end, planned) in chosen:
            time_key = (d, start)
            if time_key in used_times:
                continue
            used_times.add(time_key)

            # Vary energy slightly
            es = max(1, min(10, e_start + random.randint(-1, 1)))
            ee = max(1, min(10, e_end + random.randint(-1, 1)))

            # Duration
            sh, sm = map(int, start.split(":"))
            eh, em = map(int, end.split(":"))
            dur = (eh * 60 + em) - (sh * 60 + sm)
            if dur <= 0:
                continue

            block = TimeBlock(
                date=d,
                start_time=start,
                end_time=end,
                duration_min=dur,
                category=cat,
                subcategory=subcat,
                title=title,
                energy_start=es,
                energy_end=ee,
                planned=planned,
            )
            db.add(block)

        # Focus log for this day (skip ~20% of days to simulate gaps)
        if random.random() > 0.20:
            score = random.randint(5, 10) if not is_weekend else random.randint(6, 10)
            deep_hrs = round(random.uniform(2.0, 5.5) if not is_weekend else random.uniform(0.5, 3.0), 1)
            fl = FocusLog(
                date=d,
                primary_focus=random.choice(focus_areas_pool),
                distractions=random.choice(distractions_pool) if random.random() > 0.3 else None,
                energy_drain=random.choice(energy_drains_pool) if random.random() > 0.4 else None,
                energy_boost=random.choice(energy_boosts_pool),
                deep_work_hrs=deep_hrs,
                overall_score=score,
            )
            db.add(fl)

    db.commit()
    print("  ✓ Time tracking seeded")


def seed_decisions(db):
    """20 realistic decisions across domains — mixed open / resolved."""
    from datetime import datetime
    today = date.today()

    decisions_data = [
        # ── RESOLVED — good outcomes ──────────────────────────────────────────
        {
            "date": today - timedelta(days=120),
            "title": "Quit full-time job to go independent",
            "description": "Leave a stable $140K/yr engineering role to freelance and build personal projects.",
            "stakes": "critical",
            "decision_type": "career",
            "reasoning": "Burnout is real. I have 8 months runway, a clear product idea, and skills that are genuinely in demand as a freelancer. The opportunity cost of staying is stagnation.",
            "confidence": 7,
            "predicted_outcome": "Bootstrap 3+ revenue streams within 6 months and hit $8K/mo within a year.",
            "outcome_date": today - timedelta(days=30),
            "actual_outcome": "Exceeded expectations. Freelance + content sites generating $6K/mo at month 4. Trajectory looks strong.",
            "decision_quality": 9,
            "lesson": "The fear of leaving was far worse than the reality. Having clear financial targets made it feel less risky than it looked.",
            "status": "resolved",
            "tags": ["career", "independence", "risk"],
        },
        {
            "date": today - timedelta(days=90),
            "title": "Start paper trading bot before risking real money",
            "description": "Run the algorithmic trading bot on Alpaca paper accounts for at least 3 months before going live.",
            "stakes": "high",
            "decision_type": "financial",
            "reasoning": "Strategy backtests look promising but live trading has edge cases no backtest catches. $500 live stake with <3 months of paper data is imprudent.",
            "confidence": 9,
            "predicted_outcome": "Identify real bugs and behavioral edge cases without losing capital.",
            "outcome_date": today - timedelta(days=10),
            "actual_outcome": "Found the is_market_open() bug, the pending_new order issue, and BTC-USD drag — all without losing a dollar. Correct call.",
            "decision_quality": 10,
            "lesson": "Validation costs time but costs far less than learning with real money. Go-live criteria were the right framework.",
            "status": "resolved",
            "tags": ["trading", "risk-management", "patience"],
        },
        {
            "date": today - timedelta(days=75),
            "title": "Build Life OS rather than use existing tools",
            "description": "Instead of stitching together Todoist + Monarch + Notion, build a single local-first personal OS.",
            "stakes": "medium",
            "decision_type": "strategic",
            "reasoning": "Every SaaS tool has data silos, subscription cost, and privacy tradeoffs. A custom app lets me build exactly the analytics I want, correlate across domains, and own my data.",
            "confidence": 8,
            "predicted_outcome": "Ship a working v1 within 3 months that replaces Todoist and Monarch.",
            "outcome_date": today - timedelta(days=5),
            "actual_outcome": "Sprint 2 shipped the Todoist replacement on time. Monarch replacement in sight at Sprint 5. Totally worth it.",
            "decision_quality": 9,
            "lesson": "Build vs. buy should favor building when your requirements are specific, you have the skills, and the tools you'd pay for have meaningful tradeoffs.",
            "status": "resolved",
            "tags": ["life-os", "strategy", "build-vs-buy"],
        },
        {
            "date": today - timedelta(days=60),
            "title": "Cut processed sugar from weekday diet",
            "description": "No candy, pastries, or sweetened drinks Monday–Friday. Weekends unrestricted.",
            "stakes": "medium",
            "decision_type": "health",
            "reasoning": "Afternoon energy crashes directly correlated with sugar intake. Mood data backs this up — low-sugar days average 0.8 points higher on energy.",
            "confidence": 8,
            "predicted_outcome": "Reduce afternoon crashes, improve focus scores by ~1 point.",
            "outcome_date": today - timedelta(days=15),
            "actual_outcome": "Energy crashes largely gone. Focus score averaged 7.2 in the last 30 days vs 6.4 prior. Worth the initial discomfort.",
            "decision_quality": 8,
            "lesson": "Small dietary changes have outsized effects when they target a known weak point. The data made this decision obvious in hindsight.",
            "status": "resolved",
            "tags": ["health", "energy", "nutrition"],
        },
        {
            "date": today - timedelta(days=50),
            "title": "Invest $10K into index funds rather than individual stocks",
            "description": "Put the $10K savings bonus into VTSAX / VTI rather than concentrated bets on individual tech stocks.",
            "stakes": "high",
            "decision_type": "financial",
            "reasoning": "My trading bot is already giving me concentrated equity exposure. The savings account should be boring and diversified. No stock-picking alpha in the long run for retail.",
            "confidence": 9,
            "predicted_outcome": "Steady compounding. Avoid concentration risk.",
            "outcome_date": today - timedelta(days=5),
            "actual_outcome": "Portfolio up 8% since purchase vs. -3% on individual picks I was considering. No regrets.",
            "decision_quality": 9,
            "lesson": "The boring decision is often the correct one for money you can't afford to lose.",
            "status": "resolved",
            "tags": ["investing", "discipline"],
        },
        {
            "date": today - timedelta(days=40),
            "title": "Drop MACD weight by 40% at next calibration",
            "description": "Reduce MACD strategy weight from 15% to 9% based on consistent underperformance.",
            "stakes": "medium",
            "decision_type": "financial",
            "reasoning": "MACD Sharpe has been negative for 3 consecutive months. BTC-USD drawdown of -18.1% is the worst individual result. Not worth the weight.",
            "confidence": 8,
            "predicted_outcome": "Overall portfolio Sharpe improves by removing a consistently negative contributor.",
            "outcome_date": today + timedelta(days=16),  # June 1 calibration
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["trading", "calibration"],
        },
        # ── RESOLVED — mixed / learning outcomes ─────────────────────────────
        {
            "date": today - timedelta(days=100),
            "title": "Launch everydayaiworkflows.com without an email list",
            "description": "Go live with the content site before building an audience.",
            "stakes": "low",
            "decision_type": "strategic",
            "reasoning": "Better to start writing and iterate than wait for perfect distribution. SEO takes time anyway.",
            "confidence": 6,
            "predicted_outcome": "Organic traffic within 3 months, 500 subscribers by month 6.",
            "outcome_date": today - timedelta(days=20),
            "actual_outcome": "Traffic is growing but slower than hoped. Subscriber count at ~120, not 500. Should have set up Beehiiv from day 1.",
            "decision_quality": 6,
            "lesson": "Build distribution in parallel with content, not after. An email list from post #1 is cheap and has compound value.",
            "status": "resolved",
            "tags": ["content", "distribution", "marketing"],
        },
        {
            "date": today - timedelta(days=85),
            "title": "Use SQLite for Life OS instead of PostgreSQL",
            "description": "Commit to SQLite as the database engine for local-only use.",
            "stakes": "medium",
            "decision_type": "strategic",
            "reasoning": "Life OS is local-only by design. SQLite is zero-config, file-based, and more than fast enough for personal data volumes. No server to manage.",
            "confidence": 9,
            "predicted_outcome": "Simple development, easy backup (copy one file), no infra headaches.",
            "outcome_date": today - timedelta(days=30),
            "actual_outcome": "Completely vindicated. Development velocity was faster, backup is trivial, and WAL mode handles concurrent reads fine.",
            "decision_quality": 10,
            "lesson": "Match the tool to the actual constraints. Personal-scale apps don't need Postgres.",
            "status": "resolved",
            "tags": ["life-os", "engineering", "architecture"],
        },
        # ── OPEN — pending outcome date ───────────────────────────────────────
        {
            "date": today - timedelta(days=30),
            "title": "Add launchd plist for trading bot auto-restart",
            "description": "Set up macOS launchd to auto-start the trading bot on system reboot.",
            "stakes": "medium",
            "decision_type": "strategic",
            "reasoning": "Bot has gone offline after two Mac reboots. Manual restart is fine but creates unnecessary gaps in paper trading data.",
            "confidence": 8,
            "predicted_outcome": "Zero unplanned bot downtime from reboots going forward.",
            "outcome_date": today + timedelta(days=14),
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["trading", "reliability", "ops"],
        },
        {
            "date": today - timedelta(days=25),
            "title": "Keep BTC-USD in watchlist through June calibration",
            "description": "Despite poor MACD performance on BTC, hold off on removing it until fractional sizing is implemented.",
            "stakes": "medium",
            "decision_type": "financial",
            "reasoning": "Removing BTC before implementing proper fractional sizing means losing correlation data. Better to have data and down-weight than have a gap.",
            "confidence": 5,
            "predicted_outcome": "Data continuity maintained. Revisit at June 1 calibration with 3 months of data.",
            "outcome_date": today + timedelta(days=16),
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["trading", "btc", "data"],
        },
        {
            "date": today - timedelta(days=20),
            "title": "Invest in standing desk + ergonomic setup",
            "description": "Spend ~$800 on a standing desk, monitor arm, and better chair.",
            "stakes": "low",
            "decision_type": "health",
            "reasoning": "Sitting 8h/day is measurably bad. Lower back discomfort is early warning. This is a business expense that directly affects work output.",
            "confidence": 9,
            "predicted_outcome": "Reduce back discomfort, increase energy during long work sessions.",
            "outcome_date": today + timedelta(days=30),
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["health", "workspace", "ergonomics"],
        },
        {
            "date": today - timedelta(days=15),
            "title": "Implement minimum hold period on trading bot",
            "description": "Require 1 hour (12 cycles) minimum hold before reversing a position to prevent buy→sell whipsaw.",
            "stakes": "medium",
            "decision_type": "financial",
            "reasoning": "Identified buy→sell whipsaws in the pending_new orders from May 14. A minimum hold period would have prevented these.",
            "confidence": 8,
            "predicted_outcome": "Reduce transaction costs and whipsaw losses by at least 30%.",
            "outcome_date": today + timedelta(days=30),
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["trading", "risk-management", "code"],
        },
        {
            "date": today - timedelta(days=12),
            "title": "Read Thinking Fast and Slow before starting Decision Journal",
            "description": "Ground decision-making framework in Kahneman's research before building habits around it.",
            "stakes": "low",
            "decision_type": "personal",
            "reasoning": "Better mental models → better decisions. The journal is most useful if I understand cognitive bias patterns before I start logging.",
            "confidence": 7,
            "predicted_outcome": "Finish book in 3 weeks, incorporate 3+ frameworks into how I frame decisions.",
            "outcome_date": today + timedelta(days=9),
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["learning", "decision-making", "books"],
        },
        {
            "date": today - timedelta(days=8),
            "title": "Wire affiliate links into strongpasswordgenerator.dev",
            "description": "Add Bitwarden + NordPass affiliate links to the password generator site.",
            "stakes": "low",
            "decision_type": "financial",
            "reasoning": "Site already has 2K monthly visitors. Bitwarden pays $30–70/conversion. Low effort, meaningful revenue potential at scale.",
            "confidence": 8,
            "predicted_outcome": "Generate first affiliate conversion within 30 days.",
            "outcome_date": today + timedelta(days=22),
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["content", "monetization", "affiliate"],
        },
        {
            "date": today - timedelta(days=5),
            "title": "Cancel Monarch subscription and go all-in on Life OS Finance module",
            "description": "Stop paying for Monarch Money and use only Life OS for personal finance tracking.",
            "stakes": "medium",
            "decision_type": "financial",
            "reasoning": "Life OS Finance module is functional. Monarch adds $99/yr and has data portability concerns. My own data, my own SQL queries.",
            "confidence": 7,
            "predicted_outcome": "No meaningful loss in tracking capability. Save $99/yr. Force myself to improve Life OS Finance.",
            "outcome_date": today + timedelta(days=60),
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["finance", "life-os", "subscriptions"],
        },
        # ── OVERDUE — pending review (open + outcome_date in past) ────────────
        {
            "date": today - timedelta(days=45),
            "title": "Switch from VSCode to Cursor for AI-assisted coding",
            "description": "Evaluate Cursor as a daily driver IDE for 30 days.",
            "stakes": "low",
            "decision_type": "career",
            "reasoning": "Cursor's inline AI suggestions looked significantly faster than Copilot. 30-day trial to evaluate productivity lift.",
            "confidence": 6,
            "predicted_outcome": "Measurable speedup on boilerplate and refactoring tasks. Probably 20-30% faster.",
            "outcome_date": today - timedelta(days=5),   # past → overdue
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["tooling", "productivity", "ai"],
        },
        {
            "date": today - timedelta(days=55),
            "title": "Reduce caffeine intake to one cup before noon",
            "description": "Cap caffeine at one coffee before 12pm to improve sleep quality.",
            "stakes": "low",
            "decision_type": "health",
            "reasoning": "Sleep data shows lower quality on days with afternoon caffeine. Cost of change is discomfort. Benefit is measurable.",
            "confidence": 7,
            "predicted_outcome": "Sleep quality improves from avg 3.1 to 3.5+. Afternoon energy more stable.",
            "outcome_date": today - timedelta(days=10),   # past → overdue
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["health", "sleep", "habits"],
        },
        {
            "date": today - timedelta(days=35),
            "title": "Skip the SF apartment refinance for now",
            "description": "Hold off on refinancing — rates are still elevated and closing costs would extend break-even past 4 years.",
            "stakes": "high",
            "decision_type": "financial",
            "reasoning": "Current rate: 6.8%. Best available refi: 6.4%. Monthly savings: ~$180. Closing costs: ~$8,500. Break-even: 47 months. Not compelling yet.",
            "confidence": 8,
            "predicted_outcome": "Rates drop another 0.5-1% in next 12 months, making refi much more attractive.",
            "outcome_date": today - timedelta(days=2),  # past → overdue
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["real-estate", "finance", "refinance"],
        },
        {
            "date": today - timedelta(days=22),
            "title": "Use FastAPI over Django for Life OS backend",
            "description": "Build the Life OS API with FastAPI + SQLAlchemy instead of Django REST Framework.",
            "stakes": "medium",
            "decision_type": "strategic",
            "reasoning": "FastAPI is faster, async-native, has automatic OpenAPI docs, and is better suited to a focused local API than Django's batteries-included approach.",
            "confidence": 9,
            "predicted_outcome": "Faster development, cleaner code, less boilerplate.",
            "outcome_date": today - timedelta(days=7),   # past → overdue
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["life-os", "engineering", "architecture"],
        },
        {
            "date": today - timedelta(days=10),
            "title": "Don't hire a VA yet — automate first",
            "description": "Resist the urge to hire a virtual assistant for content operations. Automate the pipeline first.",
            "stakes": "medium",
            "decision_type": "career",
            "reasoning": "VA costs $500-800/mo minimum. The content pipelines are 90% automated. The remaining 10% should be automated, not delegated, so it scales without labor costs.",
            "confidence": 7,
            "predicted_outcome": "Fully automated content pipeline within 60 days. No VA needed.",
            "outcome_date": today - timedelta(days=1),   # past → overdue
            "actual_outcome": None,
            "decision_quality": None,
            "lesson": None,
            "status": "open",
            "tags": ["career", "automation", "content"],
        },
    ]

    for dd in decisions_data:
        tags = dd.pop("tags", [])
        d = Decision(**dd)
        db.add(d)
        db.flush()
        for tag in tags:
            db.add(DecisionTag(decision_id=d.id, tag=tag))

    db.commit()
    print("  ✓ Decisions seeded")
