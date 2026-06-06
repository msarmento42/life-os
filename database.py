from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = f"sqlite:///./life_os.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, connection_record):
    """S10.03 — performance + concurrency pragmas, applied to every connection.

    - journal_mode=WAL: readers no longer block the writer (and vice versa), so the
      single-port server can serve overlapping requests without "database is locked"
      stalls; commits are also faster. WAL is persisted in the DB file header, but we
      re-assert it on connect so a fresh/restored DB is always in WAL.
    - synchronous=NORMAL: the recommended companion to WAL. The database stays
      consistent across app crashes; only an OS crash / power loss can drop the most
      recent transaction — an acceptable trade for a local-first personal app, and a
      large write-speed win over FULL.
    - busy_timeout=5000: wait up to 5s for a lock instead of erroring immediately.
    - temp_store=MEMORY: keep transient sort/group-by structures in RAM.

    NOTE: foreign-key *enforcement* is intentionally left at SQLite's default (off).
    This item indexes FK *columns* for join speed; turning on enforcement is an
    unrelated behavior change the seed/restore paths are not validated for, and the
    backup restore already manages the foreign_keys pragma itself.
    """
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA temp_store=MEMORY")
    finally:
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize all tables."""
    from models import finance, travel, crm, health, habits, reading, projects, mood, trading, tasks, time_tracking, decisions, fantasy
    Base.metadata.create_all(bind=engine)
    # Additive migrations for columns added after initial table creation
    _run_migrations()
    # S10.03: performance indexes on date columns + foreign keys
    _ensure_indexes()


def _run_migrations():
    """Run any additive column migrations that create_all won't handle."""
    from sqlalchemy import text, inspect
    migrations = [
        # S3.05: monthly_allocation on savings_goals
        ("savings_goals", "monthly_allocation",
         "ALTER TABLE savings_goals ADD COLUMN monthly_allocation REAL DEFAULT 0.0"),
        # S4.05: hrv on body_metrics
        ("body_metrics", "hrv",
         "ALTER TABLE body_metrics ADD COLUMN hrv INTEGER"),
        # S6.05: depth fields on books
        ("books", "changed_behavior",
         "ALTER TABLE books ADD COLUMN changed_behavior BOOLEAN DEFAULT 0"),
        ("books", "linked_project_id",
         "ALTER TABLE books ADD COLUMN linked_project_id INTEGER REFERENCES projects(id)"),
        ("books", "linked_decision_id",
         "ALTER TABLE books ADD COLUMN linked_decision_id INTEGER REFERENCES decisions(id)"),
        ("books", "next_review_date",
         "ALTER TABLE books ADD COLUMN next_review_date DATE"),
        ("books", "review_count",
         "ALTER TABLE books ADD COLUMN review_count INTEGER DEFAULT 0"),
        # S6.03: quality_score on interactions
        ("interactions", "quality_score",
         "ALTER TABLE interactions ADD COLUMN quality_score INTEGER DEFAULT 7"),
        # S5.01: depth fields on habits
        ("habits", "goal_id",
         "ALTER TABLE habits ADD COLUMN goal_id INTEGER REFERENCES objectives(id)"),
        ("habits", "context",
         "ALTER TABLE habits ADD COLUMN context TEXT"),
        ("habits", "willpower_cost",
         "ALTER TABLE habits ADD COLUMN willpower_cost INTEGER DEFAULT 3"),
        # P2.01: dependency mapping on projects
        ("projects", "blocks_project_id",
         "ALTER TABLE projects ADD COLUMN blocks_project_id INTEGER REFERENCES projects(id)"),
        # P2.02: completion timestamp for cycle-time analytics
        ("projects", "completed_at",
         "ALTER TABLE projects ADD COLUMN completed_at DATETIME"),
        # P2.03: project type tagging
        ("projects", "project_type",
         "ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT 'other'"),
    ]
    insp = inspect(engine)
    with engine.connect() as conn:
        for table, column, sql in migrations:
            try:
                existing_tables = insp.get_table_names()
                if table not in existing_tables:
                    continue
                existing_cols = [c["name"] for c in insp.get_columns(table)]
                if column not in existing_cols:
                    conn.execute(text(sql))
                    conn.commit()
            except Exception:
                pass  # Already exists or other non-fatal error


# S10.03 — performance indexes.
# (table, column) pairs covering every date/datetime column and every foreign-key
# column in the schema. create_all() does NOT add indexes to already-existing
# tables, so we emit CREATE INDEX IF NOT EXISTS for each — idempotent, and it also
# covers freshly created/restored databases since init_db() calls this after
# create_all(). Index names follow SQLAlchemy's ix_<table>_<column> convention so
# they coexist with (and de-dupe against) auto-created indexes. Columns already
# covered by a UNIQUE constraint's autoindex are omitted to avoid redundant indexes.
_INDEX_TARGETS = [
    # ── CRM ──────────────────────────────────────────────────────────────────
    ("contacts", "birthday"), ("contacts", "created_at"),
    ("interactions", "contact_id"), ("interactions", "date"), ("interactions", "created_at"),
    ("follow_up_reminders", "contact_id"), ("follow_up_reminders", "due_date"),
    ("follow_up_reminders", "created_at"),
    ("contact_tags", "contact_id"), ("contact_tags", "tag_id"),
    # ── Decisions ────────────────────────────────────────────────────────────
    ("decisions", "date"), ("decisions", "outcome_date"),
    ("decisions", "created_at"), ("decisions", "resolved_at"),
    ("decision_tags", "decision_id"),
    # ── Fantasy ──────────────────────────────────────────────────────────────
    ("fantasy_leagues", "last_synced"), ("fantasy_leagues", "created_at"),
    ("fantasy_players", "last_synced"), ("fantasy_players", "created_at"),
    ("fantasy_rosters", "league_sleeper_id"), ("fantasy_rosters", "last_synced"),
    ("fantasy_picks", "league_sleeper_id"),
    ("fantasy_news", "published_at"), ("fantasy_news", "fetched_at"),
    ("fantasy_value_snapshots", "date"),
    # ── Finance ──────────────────────────────────────────────────────────────
    ("accounts", "created_at"),
    ("net_worth_snapshots", "account_id"), ("net_worth_snapshots", "snapshot_date"),
    ("transactions", "date"), ("transactions", "category_id"),
    ("transactions", "account_id"), ("transactions", "created_at"),
    ("budgets", "category_id"),
    ("recurring_items", "category_id"), ("recurring_items", "next_date"),
    ("savings_goals", "target_date"), ("savings_goals", "created_at"),
    # ── Habits ───────────────────────────────────────────────────────────────
    ("habits", "goal_id"), ("habits", "created_at"),
    ("habit_logs", "habit_id"), ("habit_logs", "date"),
    ("routines", "created_at"),
    ("routine_items", "routine_id"),
    # ── Health ───────────────────────────────────────────────────────────────
    ("body_metrics", "date"), ("body_metrics", "created_at"),
    ("workouts", "date"), ("workouts", "created_at"),
    ("workout_exercises", "workout_id"),
    ("sleep_logs", "date"),
    ("supplements", "created_at"),
    ("blood_work_results", "date"), ("blood_work_results", "created_at"),
    ("nutrition_logs", "date"), ("nutrition_logs", "created_at"),
    ("macro_targets", "created_at"),
    ("injury_logs", "date"), ("injury_logs", "recovery_date"),
    ("injury_logs", "estimated_recovery_date"), ("injury_logs", "created_at"),
    ("medical_events", "date"), ("medical_events", "next_due"), ("medical_events", "created_at"),
    # ── Mood ─────────────────────────────────────────────────────────────────
    ("mood_logs", "created_at"),  # date is UNIQUE -> autoindexed
    # ── Projects / OKRs ──────────────────────────────────────────────────────
    ("objectives", "created_at"),
    ("key_results", "objective_id"), ("key_results", "due_date"),
    ("projects", "due_date"), ("projects", "objective_id"),
    ("projects", "blocks_project_id"), ("projects", "created_at"), ("projects", "completed_at"),
    ("project_tasks", "project_id"), ("project_tasks", "due_date"), ("project_tasks", "created_at"),
    ("project_postmortems", "created_at"),  # project_id is UNIQUE -> autoindexed
    # ── Reading ──────────────────────────────────────────────────────────────
    ("books", "linked_project_id"), ("books", "linked_decision_id"),
    ("books", "started_date"), ("books", "finished_date"),
    ("books", "next_review_date"), ("books", "created_at"),
    ("book_notes", "book_id"), ("book_notes", "created_at"),
    ("book_quotes", "book_id"), ("book_quotes", "created_at"),
    # ── Tasks ────────────────────────────────────────────────────────────────
    ("tasks", "due_date"), ("tasks", "project_id"),
    ("tasks", "created_at"), ("tasks", "completed_at"),
    # ── Time & Attention ─────────────────────────────────────────────────────
    ("time_blocks", "date"), ("time_blocks", "project_id"), ("time_blocks", "created_at"),
    ("focus_logs", "created_at"),  # date is UNIQUE -> autoindexed
    # ── Trading ──────────────────────────────────────────────────────────────
    ("strategies", "created_at"),
    ("trades", "strategy_id"), ("trades", "date"), ("trades", "created_at"),
    ("positions", "strategy_id"), ("positions", "last_updated"),
    ("portfolio_snapshots", "created_at"),  # date is UNIQUE -> autoindexed
    # ── Travel ───────────────────────────────────────────────────────────────
    ("trips", "start_date"), ("trips", "end_date"), ("trips", "created_at"),
    ("itinerary_items", "trip_id"), ("itinerary_items", "date"),
    ("packing_lists", "trip_id"), ("packing_lists", "created_at"),
    ("packing_items", "packing_list_id"),
    ("trip_expenses", "trip_id"), ("trip_expenses", "date"),
    ("travel_documents", "trip_id"), ("travel_documents", "expiry_date"),
    ("travel_documents", "created_at"),
    ("wishlist_destinations", "created_at"),
]

# Composite indexes for the hottest multi-column query patterns observed in the
# routers (name -> table -> column tuple). CREATE INDEX IF NOT EXISTS keeps these
# idempotent too.
_COMPOSITE_INDEXES = [
    # log_habit() and the daily dashboard both filter habit_id == X AND date == Y.
    ("ix_habit_logs_habit_id_date", "habit_logs", ("habit_id", "date")),
    # Budget lookups filter month == M AND year == Y.
    ("ix_budgets_year_month", "budgets", ("year", "month")),
]


def _ensure_indexes():
    """Create performance indexes on date columns and foreign-key columns.

    Idempotent: every statement is CREATE INDEX IF NOT EXISTS, and missing
    tables/columns are skipped, so this is safe to run on every startup and on
    partially migrated databases.
    """
    from sqlalchemy import text, inspect
    insp = inspect(engine)
    existing_tables = set(insp.get_table_names())
    cols_by_table = {}

    def _columns(table):
        if table not in cols_by_table:
            cols_by_table[table] = {c["name"] for c in insp.get_columns(table)}
        return cols_by_table[table]

    with engine.connect() as conn:
        # Single-column indexes
        for table, column in _INDEX_TARGETS:
            if table not in existing_tables or column not in _columns(table):
                continue
            idx = f"ix_{table}_{column}"
            try:
                conn.execute(text(f'CREATE INDEX IF NOT EXISTS "{idx}" ON "{table}" ("{column}")'))
                conn.commit()
            except Exception:
                pass  # already exists / non-fatal
        # Composite indexes
        for idx, table, columns in _COMPOSITE_INDEXES:
            if table not in existing_tables:
                continue
            tcols = _columns(table)
            if any(c not in tcols for c in columns):
                continue
            col_sql = ", ".join(f'"{c}"' for c in columns)
            try:
                conn.execute(text(f'CREATE INDEX IF NOT EXISTS "{idx}" ON "{table}" ({col_sql})'))
                conn.commit()
            except Exception:
                pass  # already exists / non-fatal
