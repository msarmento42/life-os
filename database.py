import sqlite3

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = f"sqlite:///./life_os.db"


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-64000")
        cursor.close()


engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

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
    from models import (
        crm,
        decisions,
        fantasy,
        finance,
        habits,
        health,
        indexes,
        mood,
        projects,
        reading,
        tasks,
        time_tracking,
        trading,
        travel,
    )

    Base.metadata.create_all(bind=engine)
    # Additive migrations for columns added after initial table creation
    _run_migrations()


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
