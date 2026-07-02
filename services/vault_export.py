"""
Vault exporter — writes local Markdown summaries for the Marcus OS vault.

Local-only: no network calls, no vault-repo (git/GitHub) access. This module
only reads the local Life OS database and writes files under exports/vault/.
A later step (outside this codebase) moves those files into the msarmento42/vault
repo as a PR.

Usage:
    python -m services.vault_export [--output-dir exports/vault] [--as-of YYYY-MM-DD]

Produces up to three files per run:
    exports/vault/reviews/weekly/<YYYY-Wnn>.md   -- time/energy rollup, last 7 days
    exports/vault/health/<YYYY-MM>.md            -- health metric trends
    exports/vault/goals/<YYYY>.md                -- active goals snapshot
"""
import argparse
import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from database import SessionLocal
from models.time_tracking import TimeBlock
from models.health import BodyMetric
from models.projects import Objective, KeyResult

DEFAULT_OUTPUT_DIR = "exports/vault"


def _frontmatter(title: str, date: datetime.date, note_type: str, tags=None) -> str:
    tags = tags or []
    tags_str = "[" + ", ".join(tags) + "]"
    return (
        "---\n"
        f"title: {title}\n"
        f"date: {date.isoformat()}\n"
        f"type: {note_type}\n"
        f"tags: {tags_str}\n"
        "source: exporter\n"
        "status: draft\n"
        "---\n\n"
    )


def _iso_week_str(d: datetime.date) -> str:
    year, week, _ = d.isocalendar()
    return f"{year}-W{week:02d}"


# ── Data computation ─────────────────────────────────────────────────────────

def compute_time_energy_rollup(db: Session, as_of: datetime.date) -> dict:
    """Aggregate TimeBlock rows for the 7 days ending `as_of` (inclusive)."""
    start = as_of - datetime.timedelta(days=6)
    blocks = (
        db.query(TimeBlock)
        .filter(TimeBlock.date >= start, TimeBlock.date <= as_of)
        .all()
    )

    by_category = {}
    energy_starts, energy_ends = [], []
    for b in blocks:
        cat = b.category or "uncategorized"
        by_category[cat] = by_category.get(cat, 0) + (b.duration_min or 0)
        if b.energy_start is not None:
            energy_starts.append(b.energy_start)
        if b.energy_end is not None:
            energy_ends.append(b.energy_end)

    return {
        "start": start,
        "end": as_of,
        "total_blocks": len(blocks),
        "minutes_by_category": dict(sorted(by_category.items(), key=lambda kv: -kv[1])),
        "avg_energy_start": round(sum(energy_starts) / len(energy_starts), 1) if energy_starts else None,
        "avg_energy_end": round(sum(energy_ends) / len(energy_ends), 1) if energy_ends else None,
    }


def compute_health_trends(db: Session, as_of: datetime.date, window_days: int = 60) -> dict:
    """Compute simple first-vs-last trend lines from BodyMetric over a rolling window."""
    start = as_of - datetime.timedelta(days=window_days)
    metrics = (
        db.query(BodyMetric)
        .filter(BodyMetric.date >= start, BodyMetric.date <= as_of)
        .order_by(BodyMetric.date.asc())
        .all()
    )

    def trend(values):
        values = [v for v in values if v is not None]
        if len(values) < 2:
            return None
        return round(values[-1] - values[0], 2)

    return {
        "start": start,
        "end": as_of,
        "sample_size": len(metrics),
        "weight_trend_lbs": trend([m.weight_lbs for m in metrics]),
        "resting_hr_trend": trend([m.resting_hr for m in metrics]),
        "hrv_trend": trend([m.hrv for m in metrics]),
        "latest_weight_lbs": metrics[-1].weight_lbs if metrics else None,
        "latest_resting_hr": metrics[-1].resting_hr if metrics else None,
        "latest_hrv": metrics[-1].hrv if metrics else None,
    }


def compute_goals_snapshot(db: Session) -> list:
    """Active objectives with their key results."""
    objectives = db.query(Objective).filter(Objective.status == "active").all()
    snapshot = []
    for obj in objectives:
        key_results = (
            db.query(KeyResult).filter(KeyResult.objective_id == obj.id).all()
        )
        snapshot.append({
            "title": obj.title,
            "quarter": obj.quarter,
            "year": obj.year,
            "key_results": [
                {
                    "title": kr.title,
                    "current_value": kr.current_value,
                    "target_value": kr.target_value,
                    "unit": kr.unit,
                    "status": kr.status,
                }
                for kr in key_results
            ],
        })
    return snapshot


# ── Rendering ─────────────────────────────────────────────────────────────────

def render_weekly_review_md(rollup: dict, as_of: datetime.date) -> str:
    week_str = _iso_week_str(as_of)
    fm = _frontmatter(f"Time & Energy Rollup — {week_str}", as_of, "review", tags=["time", "energy", "exporter"])
    lines = [fm, f"## Time by category ({rollup['start'].isoformat()} to {rollup['end'].isoformat()})\n"]
    if not rollup["minutes_by_category"]:
        lines.append("No time blocks logged this period.\n")
    else:
        for cat, minutes in rollup["minutes_by_category"].items():
            hours = round(minutes / 60, 1)
            lines.append(
                f"- **{cat}**: {hours}h ({minutes} min)"
            )
        lines.append("")
    lines.append("## Energy\n")
    if rollup["avg_energy_start"] is not None or rollup["avg_energy_end"] is not None:
        lines.append(f"- Avg energy at block start: {rollup['avg_energy_start']}")
        lines.append(f"- Avg energy at block end: {rollup['avg_energy_end']}")
    else:
        lines.append("No energy ratings logged this period.")
    lines.append(f"\n_Total time blocks logged: {rollup['total_blocks']}_\n")
    return "\n".join(lines)


def render_health_md(trends: dict, as_of: datetime.date) -> str:
    month_str = as_of.strftime("%Y-%m")
    fm = _frontmatter(f"Health Trends — {month_str}", as_of, "health", tags=["health", "exporter"])
    header = (
        f"## Trends ({trends['start'].isoformat()} to "
        f"{trends['end'].isoformat()}, {trends['sample_size']} readings)\n"
    )
    lines = [fm, header]
    if trends["sample_size"] < 2:
        lines.append("Not enough data points in this window to compute a trend.\n")
    else:
        w = trends['weight_trend_lbs']
        hr = trends['resting_hr_trend']
        hrv = trends['hrv_trend']
        lines.append(f"- Weight change: {w} lbs (latest: {trends['latest_weight_lbs']})")
        lines.append(f"- Resting HR change: {hr} bpm (latest: {trends['latest_resting_hr']})")
        lines.append(f"- HRV change: {hrv} ms (latest: {trends['latest_hrv']})")
    lines.append("")
    return "\n".join(lines)


def render_goals_md(goals: list, as_of: datetime.date) -> str:
    fm = _frontmatter(f"Active Goals Snapshot — {as_of.year}", as_of, "goals", tags=["goals", "exporter"])
    lines = [fm]
    if not goals:
        lines.append("No active objectives.\n")
    else:
        for g in goals:
            lines.append(f"## {g['title']} (Q{g['quarter']} {g['year']})\n")
            if not g["key_results"]:
                lines.append("_No key results defined._\n")
            for kr in g["key_results"]:
                kr_line = (
                    f"- **{kr['title']}**: {kr['current_value']}/{kr['target_value']} "
                    f"{kr['unit']} ({kr['status']})"
                )
                lines.append(kr_line)
            lines.append("")
    return "\n".join(lines)


# ── Orchestration ─────────────────────────────────────────────────────────────

def export_all(output_dir: str = DEFAULT_OUTPUT_DIR, as_of: datetime.date = None, db: Session = None) -> list:
    """Run all three exports and write them to disk. Returns list of written Path objects."""
    as_of = as_of or datetime.date.today()
    owns_session = db is None
    db = db or SessionLocal()
    written = []
    try:
        base = Path(output_dir)

        rollup = compute_time_energy_rollup(db, as_of)
        weekly_dir = base / "reviews" / "weekly"
        weekly_dir.mkdir(parents=True, exist_ok=True)
        weekly_path = weekly_dir / f"{_iso_week_str(as_of)}.md"
        weekly_path.write_text(render_weekly_review_md(rollup, as_of))
        written.append(weekly_path)

        trends = compute_health_trends(db, as_of)
        health_dir = base / "health"
        health_dir.mkdir(parents=True, exist_ok=True)
        health_path = health_dir / f"{as_of.strftime('%Y-%m')}.md"
        health_path.write_text(render_health_md(trends, as_of))
        written.append(health_path)

        goals = compute_goals_snapshot(db)
        goals_dir = base / "goals"
        goals_dir.mkdir(parents=True, exist_ok=True)
        goals_path = goals_dir / f"{as_of.year}.md"
        goals_path.write_text(render_goals_md(goals, as_of))
        written.append(goals_path)
    finally:
        if owns_session:
            db.close()

    return written


def main():
    parser = argparse.ArgumentParser(description="Export Life OS Markdown summaries for the Marcus OS vault.")
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--as-of", default=None, help="YYYY-MM-DD, defaults to today")
    args = parser.parse_args()

    as_of = datetime.date.fromisoformat(args.as_of) if args.as_of else datetime.date.today()
    paths = export_all(output_dir=args.output_dir, as_of=as_of)
    for p in paths:
        print(f"wrote {p}")


if __name__ == "__main__":
    main()
