import os
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import DATABASE_URL, get_db

router = APIRouter(prefix="/api", tags=["db-health"])


def _sqlite_file_path() -> Path:
    sqlite_prefix = "sqlite:///"
    if DATABASE_URL.startswith(sqlite_prefix):
        return Path(DATABASE_URL.removeprefix(sqlite_prefix))
    return Path("life_os.db")


@router.get("/db-health")
def get_db_health(db: Session = Depends(get_db)):
    journal_mode = db.execute(text("PRAGMA journal_mode")).scalar()
    index_count = db.execute(
        text("SELECT count(*) FROM sqlite_master WHERE type = 'index'")
    ).scalar()
    db_path = _sqlite_file_path()
    db_size_bytes = os.path.getsize(db_path) if db_path.exists() else 0

    return {
        "status": "ok",
        "wal_mode": str(journal_mode).lower() == "wal",
        "index_count": int(index_count or 0),
        "db_size_bytes": db_size_bytes,
    }
