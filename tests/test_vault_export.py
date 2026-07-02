"""
Tests for services.vault_export.

Seeds a throwaway in-memory-backed SQLite DB with minimal rows across
TimeBlock, BodyMetric, and Objective/KeyResult, runs the exporter, and
parses the resulting Markdown files' frontmatter to confirm the required
vault schema keys (title, date, type, source, status) are all present.
"""
import datetime
import re
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import Base  # noqa: E402
from models.time_tracking import TimeBlock  # noqa: E402
from models.health import BodyMetric  # noqa: E402
from models.projects import Objective, KeyResult  # noqa: E402
from services.vault_export import export_all  # noqa: E402

REQUIRED_FRONTMATTER_KEYS = ["title", "date", "type", "source", "status"]


@pytest.fixture()
def db_session(tmp_path):
    db_path = tmp_path / "test_vault_export.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    today = datetime.date(2026, 7, 2)

    session.add(TimeBlock(
        date=today, start_time="09:00", end_time="11:00", duration_min=120,
        category="deep_work", energy_start=6, energy_end=8,
    ))
    session.add(TimeBlock(
        date=today - datetime.timedelta(days=1), start_time="14:00", end_time="15:00",
        duration_min=60, category="meetings", energy_start=5, energy_end=4,
    ))

    session.add(BodyMetric(date=today - datetime.timedelta(days=30), weight_lbs=180.0, resting_hr=60, hrv=55))
    session.add(BodyMetric(date=today, weight_lbs=178.0, resting_hr=58, hrv=60))

    obj = Objective(title="Ship the vault", quarter=3, year=2026, status="active")
    session.add(obj)
    session.flush()
    session.add(KeyResult(
        objective_id=obj.id, title="Vault repo live",
        current_value=1, target_value=1, unit="bool", status="active",
    ))

    session.commit()
    yield session
    session.close()


def parse_frontmatter(text: str) -> dict:
    assert text.startswith("---"), "file does not start with frontmatter delimiter"
    end = text.find("\n---", 3)
    assert end != -1, "frontmatter not closed"
    block = text[3:end]
    fm = {}
    for line in block.splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip()
    return fm


def test_export_all_writes_three_files_with_valid_frontmatter(db_session, tmp_path):
    output_dir = tmp_path / "exports" / "vault"
    as_of = datetime.date(2026, 7, 2)

    written = export_all(output_dir=str(output_dir), as_of=as_of, db=db_session)

    assert len(written) == 3
    for path in written:
        assert path.exists()
        text = path.read_text()
        fm = parse_frontmatter(text)
        missing = [k for k in REQUIRED_FRONTMATTER_KEYS if k not in fm or not fm[k]]
        assert not missing, f"{path} missing frontmatter keys: {missing}"
        assert fm["source"] == "exporter"
        assert fm["status"] == "draft"


def test_weekly_review_contains_time_by_category(db_session, tmp_path):
    output_dir = tmp_path / "exports" / "vault"
    as_of = datetime.date(2026, 7, 2)

    written = export_all(output_dir=str(output_dir), as_of=as_of, db=db_session)
    weekly_path = [p for p in written if p.parent.name == "weekly"][0]
    text = weekly_path.read_text()

    assert "deep_work" in text
    assert "meetings" in text
    assert re.search(r"2\.0h", text) or "120 min" in text


def test_goals_snapshot_contains_active_objective(db_session, tmp_path):
    output_dir = tmp_path / "exports" / "vault"
    as_of = datetime.date(2026, 7, 2)

    written = export_all(output_dir=str(output_dir), as_of=as_of, db=db_session)
    goals_path = [p for p in written if p.parent.name == "goals"][0]
    text = goals_path.read_text()

    assert "Ship the vault" in text
    assert "Vault repo live" in text
