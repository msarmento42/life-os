"""
Sleeper API sync service.
Pulls league/roster/player/pick data and writes to SQLite.
"""
from __future__ import annotations
import json
import urllib.request
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models.fantasy import (
    FantasyLeague, FantasyPlayer, FantasyRoster, FantasyPick
)

# ── Constants ──────────────────────────────────────────────────────────────────

SLEEPER_BASE = "https://api.sleeper.app/v1"
MARCUS_OWNER_ID = "465276267160137728"

LEAGUE_CONFIGS = {
    "1330499939976880128": {
        "name": "The Odin Invitational",
        "format": "SF",
        "n_teams": 12,
        "te_discount": 0.60,
        "has_te_slot": False,
        "eff_starters": {"QB": 2, "RB": 3, "WR": 4, "TE": 1},
        "my_roster_id": 4,
    },
    "1315139749693886464": {
        "name": "Four Horsemen Vol. 8",
        "format": "4QB",
        "n_teams": 4,
        "te_discount": 1.0,
        "has_te_slot": True,
        "eff_starters": {"QB": 4, "RB": 8, "WR": 10, "TE": 6},
        "my_roster_id": 3,
    },
    "1312285408079380481": {
        "name": "Four Horsemen All-Stars 2024",
        "format": "4QB",
        "n_teams": 4,
        "te_discount": 1.0,
        "has_te_slot": True,
        "eff_starters": {"QB": 4, "RB": 8, "WR": 10, "TE": 6},
        "my_roster_id": 4,
    },
}

FUTURE_SEASONS = ["2027", "2028"]


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fetch(url: str) -> dict | list:
    req = urllib.request.Request(url, headers={"User-Agent": "life-os-fantasy/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


# ── League sync ────────────────────────────────────────────────────────────────

def sync_leagues(db: Session) -> list[str]:
    """Upsert all 3 league configs into DB. Returns list of synced league IDs."""
    synced = []
    for sleeper_id, cfg in LEAGUE_CONFIGS.items():
        try:
            meta = _fetch(f"{SLEEPER_BASE}/league/{sleeper_id}")
            scoring = json.dumps(meta.get("scoring_settings", {}))
            positions = json.dumps(meta.get("roster_positions", []))

            league = db.query(FantasyLeague).filter_by(sleeper_id=sleeper_id).first()
            if not league:
                league = FantasyLeague(sleeper_id=sleeper_id)
                db.add(league)

            league.name              = cfg["name"]
            league.format            = cfg["format"]
            league.n_teams           = cfg["n_teams"]
            league.te_discount       = cfg["te_discount"]
            league.has_te_slot       = cfg["has_te_slot"]
            league.eff_starters_qb   = cfg["eff_starters"]["QB"]
            league.eff_starters_rb   = cfg["eff_starters"]["RB"]
            league.eff_starters_wr   = cfg["eff_starters"]["WR"]
            league.eff_starters_te   = cfg["eff_starters"]["TE"]
            league.scoring_settings  = scoring
            league.roster_positions  = positions
            league.my_roster_id      = cfg["my_roster_id"]
            league.last_synced       = datetime.utcnow()

            db.commit()
            synced.append(sleeper_id)
        except Exception as e:
            print(f"[sleeper_sync] League {sleeper_id} error: {e}")

    return synced


# ── Roster sync ────────────────────────────────────────────────────────────────

def sync_rosters(db: Session, league_sleeper_id: str) -> int:
    """Sync all rosters for a league. Returns count of rosters synced."""
    try:
        cfg = LEAGUE_CONFIGS.get(league_sleeper_id, {})
        my_roster_id = cfg.get("my_roster_id")

        rosters_raw = _fetch(f"{SLEEPER_BASE}/league/{league_sleeper_id}/rosters")
        users_raw   = _fetch(f"{SLEEPER_BASE}/league/{league_sleeper_id}/users")

        owner_to_name = {
            u["user_id"]: (u.get("metadata") or {}).get("team_name") or u.get("display_name", "Unknown")
            for u in users_raw
        }

        for r in rosters_raw:
            rid = r["roster_id"]
            oid = r.get("owner_id") or ""
            s   = r.get("settings") or {}

            roster = (
                db.query(FantasyRoster)
                .filter_by(league_sleeper_id=league_sleeper_id, roster_id=rid)
                .first()
            )
            if not roster:
                roster = FantasyRoster(
                    league_sleeper_id=league_sleeper_id,
                    roster_id=rid,
                )
                db.add(roster)

            roster.owner_id   = oid
            roster.team_name  = owner_to_name.get(oid, f"Team {rid}")
            roster.is_mine    = (oid == MARCUS_OWNER_ID)
            roster.player_ids = json.dumps(r.get("players") or [])
            roster.wins       = s.get("wins", 0)
            roster.losses     = s.get("losses", 0)
            roster.points_for = s.get("fpts", 0) + s.get("fpts_decimal", 0) / 100
            roster.last_synced = datetime.utcnow()

        db.commit()
        return len(rosters_raw)
    except Exception as e:
        print(f"[sleeper_sync] Rosters for {league_sleeper_id} error: {e}")
        return 0


# ── Player data sync ───────────────────────────────────────────────────────────

def sync_player_data(db: Session, sleeper_ids: list[str]) -> int:
    """
    Fetch injury/depth chart data from Sleeper for a given set of player IDs.
    Only fetches the full players blob once (it's large ~5MB) then filters.
    """
    if not sleeper_ids:
        return 0

    try:
        all_players = _fetch(f"{SLEEPER_BASE}/players/nfl")
        count = 0
        now = datetime.utcnow()

        for sid in sleeper_ids:
            raw = all_players.get(str(sid))
            if not raw:
                continue

            player = db.query(FantasyPlayer).filter_by(sleeper_id=str(sid)).first()
            if not player:
                player = FantasyPlayer(sleeper_id=str(sid))
                db.add(player)

            player.name                  = raw.get("full_name") or raw.get("first_name", "") + " " + raw.get("last_name", "")
            player.position              = raw.get("position")
            player.nfl_team              = raw.get("team") or raw.get("team_abbr")
            player.age                   = raw.get("age")
            player.injury_status         = raw.get("injury_status")
            player.injury_body_part      = raw.get("injury_body_part")
            player.injury_notes          = raw.get("injury_notes")
            player.injury_start_date     = raw.get("injury_start_date")
            player.depth_chart_order     = raw.get("depth_chart_order")
            player.practice_participation = raw.get("practice_participation")
            player.practice_description  = raw.get("practice_description")
            player.last_synced           = now
            count += 1

        db.commit()
        return count
    except Exception as e:
        print(f"[sleeper_sync] Player data error: {e}")
        return 0


# ── Pick sync ──────────────────────────────────────────────────────────────────

def sync_picks(db: Session, league_sleeper_id: str) -> int:
    """
    Sync tradeable future picks for a league.
    Includes both traded picks (from API) and own untraded picks.
    """
    try:
        cfg = LEAGUE_CONFIGS.get(league_sleeper_id, {})
        my_roster_id = cfg.get("my_roster_id")
        rosters_raw  = _fetch(f"{SLEEPER_BASE}/league/{league_sleeper_id}/rosters")
        users_raw    = _fetch(f"{SLEEPER_BASE}/league/{league_sleeper_id}/users")
        traded_picks = _fetch(f"{SLEEPER_BASE}/league/{league_sleeper_id}/traded_picks")

        roster_to_owner = {r["roster_id"]: r.get("owner_id", "") for r in rosters_raw}
        owner_to_user   = {u["user_id"]: u["user_id"] for u in users_raw}

        # Delete old picks for this league and rebuild
        db.query(FantasyPick).filter_by(league_sleeper_id=league_sleeper_id).delete()

        added = 0
        today_year = str(datetime.utcnow().year)

        # Traded picks (picks that have changed hands)
        for p in traded_picks:
            season = p["season"]
            if season < today_year:
                continue   # already drafted, skip
            pick = FantasyPick(
                league_sleeper_id  = league_sleeper_id,
                season             = season,
                round              = p["round"],
                original_roster_id = p["roster_id"],
                current_owner_id   = p["owner_id"],
                previous_owner_id  = p.get("previous_owner_id"),
                is_mine            = (p["owner_id"] == MARCUS_OWNER_ID),
            )
            db.add(pick)
            added += 1

        # Own untraded picks for future seasons (every team implicitly owns theirs)
        traded_away = {
            (p["roster_id"], p["season"], p["round"])
            for p in traded_picks
            if p.get("owner_id") != MARCUS_OWNER_ID
            and p["roster_id"] == my_roster_id
            and p["season"] >= today_year
        }

        for season in FUTURE_SEASONS:
            if int(season) <= int(today_year):
                continue
            for rnd in range(1, 5):
                if (my_roster_id, season, rnd) not in traded_away:
                    # Check not already added as traded pick
                    already = any(
                        p["roster_id"] == my_roster_id
                        and p["season"] == season
                        and p["round"] == rnd
                        and p["owner_id"] == MARCUS_OWNER_ID
                        for p in traded_picks
                    )
                    if not already:
                        pick = FantasyPick(
                            league_sleeper_id  = league_sleeper_id,
                            season             = season,
                            round              = rnd,
                            original_roster_id = my_roster_id,
                            current_owner_id   = MARCUS_OWNER_ID,
                            is_mine            = True,
                        )
                        db.add(pick)
                        added += 1

        db.commit()
        return added
    except Exception as e:
        print(f"[sleeper_sync] Picks for {league_sleeper_id} error: {e}")
        return 0


# ── Full sync ──────────────────────────────────────────────────────────────────

def full_sync(db: Session) -> dict:
    """Run a complete sync of all leagues, rosters, players, and picks."""
    results = {"leagues": 0, "rosters": 0, "players": 0, "picks": 0, "errors": []}

    # Leagues
    synced_leagues = sync_leagues(db)
    results["leagues"] = len(synced_leagues)

    # Rosters + collect all player IDs
    all_player_ids: set[str] = set()
    for lid in LEAGUE_CONFIGS:
        n = sync_rosters(db, lid)
        results["rosters"] += n

        # Collect all player IDs across all rosters in this league
        rosters = db.query(FantasyRoster).filter_by(league_sleeper_id=lid).all()
        for r in rosters:
            ids = json.loads(r.player_ids or "[]")
            all_player_ids.update(ids)

        # Picks
        p = sync_picks(db, lid)
        results["picks"] += p

    # Player data (one bulk fetch covers all leagues)
    results["players"] = sync_player_data(db, list(all_player_ids))

    return results


def get_trending(limit: int = 10) -> list[dict]:
    """Fetch Sleeper trending adds (no DB write — just a live call)."""
    try:
        data = _fetch(f"{SLEEPER_BASE}/players/nfl/trending/add?lookback_hours=24&limit={limit}")
        return data
    except Exception:
        return []
