"""
Fantasy value engine.
League-adjusted dynasty values, trade evaluation, proposal generation.
"""
from __future__ import annotations
import json
import urllib.request
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models.fantasy import (
    FantasyLeague, FantasyPlayer, FantasyRoster, FantasyPick, FantasyValueSnapshot
)
from services.sleeper_sync import LEAGUE_CONFIGS, MARCUS_OWNER_ID

# ── Constants ──────────────────────────────────────────────────────────────────

FC_BASE = "https://api.fantasycalc.com/values/current"

AGE_CURVES = {
    "QB": {"rising": (0, 27),  "prime": (27, 31), "declining": (31, 99)},
    "RB": {"rising": (0, 24),  "prime": (24, 27), "declining": (27, 99)},
    "WR": {"rising": (0, 25),  "prime": (25, 29), "declining": (29, 99)},
    "TE": {"rising": (0, 26),  "prime": (26, 30), "declining": (30, 99)},
}

PICK_BASE_VALUES = {1: 4000, 2: 2500, 3: 1500, 4: 800}


def _fetch(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "life-os-fantasy/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


# ── FantasyCalc value sync ─────────────────────────────────────────────────────

def sync_fc_values(db: Session) -> int:
    """Pull FantasyCalc SF + 1QB values and upsert into fantasy_players."""
    count = 0
    today = datetime.utcnow().strftime("%Y-%m-%d")

    for fmt in ["sf", "1qb"]:
        num_qbs = 2 if fmt == "sf" else 1
        url = f"{FC_BASE}?isDynasty=true&numQbs={num_qbs}&numTeams=12&ppr=1"
        try:
            data = _fetch(url)
        except Exception as e:
            print(f"[fantasy_engine] FantasyCalc {fmt} error: {e}")
            continue

        seen_in_pass: set = set()   # deduplicate within a single API pass

        for item in data:
            p_info = item["player"]
            sid = p_info.get("sleeperId")
            if not sid:
                continue
            sid = str(sid)

            # Skip FantasyCalc draft pick pseudo-entries (IDs like "DP_0_0")
            if sid.startswith("DP_"):
                continue

            # Deduplicate within this pass (FC occasionally returns dupes)
            if sid in seen_in_pass:
                continue
            seen_in_pass.add(sid)

            player = db.query(FantasyPlayer).filter_by(sleeper_id=sid).first()
            if not player:
                player = FantasyPlayer(sleeper_id=sid)
                db.add(player)
                db.flush()  # ensure the row is visible to subsequent queries

            # Always update name/position/age from FC (reliable source)
            player.name       = p_info.get("name") or player.name or ""
            player.position   = p_info.get("position") or player.position
            player.nfl_team   = p_info.get("maybeTeam") or player.nfl_team
            player.age        = round(p_info.get("maybeAge") or 0, 1) or player.age

            if fmt == "sf":
                player.value_sf    = item["value"]
                player.trend_30d   = item.get("trend30Day", 0)
                player.fc_rank_sf  = item.get("overallRank")
                player.fc_pos_rank = item.get("positionRank")
            else:
                player.value_1qb = item["value"]

            player.last_synced = datetime.utcnow()
            count += 1

            # Daily snapshot for trend tracking (SF pass only to avoid double-insert)
            if fmt == "sf":
                snap = (
                    db.query(FantasyValueSnapshot)
                    .filter_by(sleeper_id=sid, date=today)
                    .first()
                )
                if not snap:
                    snap = FantasyValueSnapshot(sleeper_id=sid, date=today)
                    db.add(snap)
                    db.flush()
                snap.value_sf = item["value"]

        db.commit()  # commit after each format pass

    return count


# ── Per-player adjusted value ──────────────────────────────────────────────────

def adjusted_value(player: FantasyPlayer, league: FantasyLeague) -> int:
    """
    Apply league-specific multipliers to raw FantasyCalc value.
    Uses SF value for SF/4QB leagues, 1QB value for 1QB.
    """
    base = player.value_sf if league.format in ("SF", "4QB") else player.value_1qb
    if not base:
        return 0

    # TE discount for leagues with no required TE starter slot
    if player.position == "TE":
        base = int(base * league.te_discount)

    return base


# ── Roster analysis ────────────────────────────────────────────────────────────

def career_stage(player: FantasyPlayer) -> str:
    """rising | prime | declining | unknown"""
    if not player.age or not player.position:
        return "unknown"
    pos = player.position
    if pos not in AGE_CURVES:
        return "unknown"
    age = player.age
    r_lo, r_hi = AGE_CURVES[pos]["rising"]
    p_lo, p_hi = AGE_CURVES[pos]["prime"]
    if r_lo <= age < r_hi:
        return "rising"
    if p_lo <= age < p_hi:
        return "prime"
    return "declining"


def roster_analysis(db: Session, league_sleeper_id: str, roster_id: int) -> dict:
    """
    Full analysis of a single roster: adjusted values by position,
    career stage breakdown, surplus/deficit vs league average.
    """
    league = db.query(FantasyLeague).filter_by(sleeper_id=league_sleeper_id).first()
    if not league:
        return {}

    roster = (
        db.query(FantasyRoster)
        .filter_by(league_sleeper_id=league_sleeper_id, roster_id=roster_id)
        .first()
    )
    if not roster:
        return {}

    player_ids = json.loads(roster.player_ids or "[]")
    players = db.query(FantasyPlayer).filter(FantasyPlayer.sleeper_id.in_(player_ids)).all()

    eff = {
        "QB": league.eff_starters_qb,
        "RB": league.eff_starters_rb,
        "WR": league.eff_starters_wr,
        "TE": league.eff_starters_te,
    }

    pos_players: dict[str, list] = {"QB": [], "RB": [], "WR": [], "TE": []}
    for p in players:
        pos = p.position
        if pos in pos_players:
            adj = adjusted_value(p, league)
            pos_players[pos].append({
                "sleeper_id":    p.sleeper_id,
                "name":          p.name,
                "position":      pos,
                "team":          p.nfl_team,
                "age":           p.age,
                "adj_value":     adj,
                "raw_value_sf":  p.value_sf,
                "trend_30d":     p.trend_30d,
                "fc_rank":       p.fc_rank_sf,
                "fc_pos_rank":   p.fc_pos_rank,
                "career_stage":  career_stage(p),
                "injury_status": p.injury_status,
                "depth_chart":   p.depth_chart_order,
            })

    # Sort each position by adjusted value desc
    for pos in pos_players:
        pos_players[pos].sort(key=lambda x: -x["adj_value"])

    # Starter value = top N by position
    starter_value: dict[str, int] = {}
    starters:       dict[str, list] = {}
    for pos, n in eff.items():
        top = pos_players[pos][:n]
        starter_value[pos] = sum(p["adj_value"] for p in top)
        starters[pos] = top

    return {
        "league_id":     league_sleeper_id,
        "league_name":   league.name,
        "roster_id":     roster_id,
        "team_name":     roster.team_name,
        "is_mine":       roster.is_mine,
        "record":        f"{roster.wins}-{roster.losses}",
        "starter_value": starter_value,
        "starters":      starters,
        "all_players":   pos_players,
        "total_value":   sum(starter_value.values()),
    }


def league_averages(db: Session, league_sleeper_id: str) -> dict[str, float]:
    """Compute average starter value per position across all rosters in league."""
    league = db.query(FantasyLeague).filter_by(sleeper_id=league_sleeper_id).first()
    if not league:
        return {}

    rosters = db.query(FantasyRoster).filter_by(league_sleeper_id=league_sleeper_id).all()
    pos_totals: dict[str, list[int]] = {"QB": [], "RB": [], "WR": [], "TE": []}

    for r in rosters:
        analysis = roster_analysis(db, league_sleeper_id, r.roster_id)
        if not analysis:
            continue
        for pos in pos_totals:
            pos_totals[pos].append(analysis["starter_value"].get(pos, 0))

    return {
        pos: (sum(vals) / len(vals)) if vals else 0
        for pos, vals in pos_totals.items()
    }


# ── Pick valuation ─────────────────────────────────────────────────────────────

def pick_value(round: int, season: str, league: FantasyLeague) -> int:
    """
    Estimate dynasty value of a draft pick.
    Accounts for round, years away, and league team count (scarcity).
    """
    base = PICK_BASE_VALUES.get(round, 500)
    current_year = datetime.utcnow().year
    years_away = max(0, int(season) - current_year)
    year_discount = 0.85 ** years_away
    scarcity = (league.n_teams / 12) ** 0.5
    return int(base * year_discount * scarcity)


# ── Trade evaluation ───────────────────────────────────────────────────────────

def evaluate_trade(
    db: Session,
    league_sleeper_id: str,
    my_player_ids: list[str],
    my_picks: list[dict],          # [{"season": "2027", "round": 1}, ...]
    their_player_ids: list[str],
    their_picks: list[dict],
) -> dict:
    """
    Evaluate a proposed trade. Returns value delta, age analysis, verdict.
    """
    league = db.query(FantasyLeague).filter_by(sleeper_id=league_sleeper_id).first()
    if not league:
        return {"error": "League not found"}

    def player_summary(sid: str) -> dict:
        p = db.query(FantasyPlayer).filter_by(sleeper_id=sid).first()
        if not p:
            return {"sleeper_id": sid, "name": "Unknown", "adj_value": 0, "age": 0, "position": "?"}
        return {
            "sleeper_id":   sid,
            "name":         p.name,
            "position":     p.position,
            "team":         p.nfl_team,
            "age":          p.age,
            "adj_value":    adjusted_value(p, league),
            "career_stage": career_stage(p),
            "trend_30d":    p.trend_30d,
        }

    def pick_summary(pk: dict) -> dict:
        val = pick_value(pk["round"], pk["season"], league)
        return {
            "label":    f"{pk['season']} Round {pk['round']}",
            "season":   pk["season"],
            "round":    pk["round"],
            "adj_value": val,
        }

    my_players    = [player_summary(sid) for sid in my_player_ids]
    their_players = [player_summary(sid) for sid in their_player_ids]
    my_pick_vals  = [pick_summary(pk) for pk in my_picks]
    their_pick_vals = [pick_summary(pk) for pk in their_picks]

    my_total    = sum(p["adj_value"] for p in my_players)    + sum(p["adj_value"] for p in my_pick_vals)
    their_total = sum(p["adj_value"] for p in their_players) + sum(p["adj_value"] for p in their_pick_vals)
    delta       = their_total - my_total  # positive = good for me

    # Age analysis
    my_ages    = [p["age"] for p in my_players if p["age"]]
    their_ages = [p["age"] for p in their_players if p["age"]]
    avg_my_age    = round(sum(my_ages) / len(my_ages), 1)    if my_ages    else 0
    avg_their_age = round(sum(their_ages) / len(their_ages), 1) if their_ages else 0
    age_delta = avg_their_age - avg_my_age  # negative = I'm getting younger

    # Verdict
    pct_delta = (delta / my_total * 100) if my_total else 0
    if pct_delta >= 8:
        verdict = "WIN"
    elif pct_delta >= -8:
        verdict = "FAIR"
    else:
        verdict = "LOSS"

    return {
        "league_name":    league.name,
        "my_side":        {"players": my_players,    "picks": my_pick_vals,    "total": my_total},
        "their_side":     {"players": their_players, "picks": their_pick_vals, "total": their_total},
        "value_delta":    delta,
        "pct_delta":      round(pct_delta, 1),
        "avg_age_giving": avg_my_age,
        "avg_age_getting": avg_their_age,
        "age_delta":      round(age_delta, 1),
        "verdict":        verdict,
    }


# ── Trade proposal generation ──────────────────────────────────────────────────

def generate_proposals(db: Session, league_sleeper_id: str, top_n: int = 5) -> list[dict]:
    """
    Auto-generate ranked trade proposals for a given league.
    Finds teams with inverse position needs and proposes specific player swaps.
    """
    league = db.query(FantasyLeague).filter_by(sleeper_id=league_sleeper_id).first()
    if not league:
        return []

    avgs = league_averages(db, league_sleeper_id)
    rosters = db.query(FantasyRoster).filter_by(league_sleeper_id=league_sleeper_id).all()

    my_roster_obj = next((r for r in rosters if r.is_mine), None)
    if not my_roster_obj:
        return []

    my_analysis   = roster_analysis(db, league_sleeper_id, my_roster_obj.roster_id)
    my_sv         = my_analysis["starter_value"]

    def pct_vs_avg(pos, val):
        avg = avgs.get(pos, 0)
        return ((val - avg) / avg * 100) if avg else 0

    my_surplus    = [p for p in ["QB","RB","WR","TE"] if pct_vs_avg(p, my_sv.get(p,0)) > 12]
    my_deficit    = [p for p in ["QB","RB","WR","TE"] if pct_vs_avg(p, my_sv.get(p,0)) < -12]

    proposals = []

    for other_roster in rosters:
        if other_roster.is_mine:
            continue

        other = roster_analysis(db, league_sleeper_id, other_roster.roster_id)
        their_sv = other["starter_value"]

        # Positions they have surplus in that I'm weak at
        can_buy  = [p for p in my_deficit   if pct_vs_avg(p, their_sv.get(p,0)) > 12]
        # Positions they need that I'm strong at
        can_sell = [p for p in my_surplus   if pct_vs_avg(p, their_sv.get(p,0)) < -12]

        if not can_buy or not can_sell:
            continue

        # Build proposal: pick best player to target and best to offer
        targets = []
        for pos in can_buy[:2]:
            their_pos_players = other["starters"].get(pos, [])
            # Target their 2nd or 3rd best at that position (not their untouchable #1)
            target_slice = their_pos_players[1:3] if len(their_pos_players) > 1 else their_pos_players[:1]
            targets.extend(target_slice)

        offers = []
        for pos in can_sell[:2]:
            my_pos_players = my_analysis["all_players"].get(pos, [])
            # Offer from my depth (2nd/3rd at position, not my starter anchor)
            eff_n = getattr(league, f"eff_starters_{pos.lower()}", 1)
            offer_slice = my_pos_players[eff_n:eff_n+2]
            offers.extend(offer_slice)

        if not targets or not offers:
            continue

        target_value = sum(p["adj_value"] for p in targets[:2])
        offer_value  = sum(p["adj_value"] for p in offers[:2])
        balance_pct  = ((target_value - offer_value) / offer_value * 100) if offer_value else 0

        # Age delta: am I getting younger?
        my_offer_ages  = [p["age"] for p in offers[:2] if p.get("age")]
        their_give_ages = [p["age"] for p in targets[:2] if p.get("age")]
        avg_offer_age   = round(sum(my_offer_ages) / len(my_offer_ages), 1)   if my_offer_ages   else 0
        avg_target_age  = round(sum(their_give_ages) / len(their_give_ages), 1) if their_give_ages else 0

        proposals.append({
            "other_team":    other["team_name"],
            "other_roster":  other_roster.roster_id,
            "buy_positions": can_buy,
            "sell_positions": can_sell,
            "targets":       targets[:2],
            "offers":        offers[:2],
            "target_value":  target_value,
            "offer_value":   offer_value,
            "balance_pct":   round(balance_pct, 1),
            "avg_offer_age":  avg_offer_age,
            "avg_target_age": avg_target_age,
            "age_delta":     round(avg_target_age - avg_offer_age, 1),
        })

    # Sort: best balance (value gain) + getting younger
    proposals.sort(key=lambda x: -(x["balance_pct"] + (-x["age_delta"] * 2)))
    return proposals[:top_n]


# ── Value movers ───────────────────────────────────────────────────────────────

def my_value_movers(db: Session, min_trend: int = 200) -> list[dict]:
    """
    Return players on any of my rosters with significant 30-day value moves.
    """
    # Get all player IDs on my rosters
    all_ids: set[str] = set()
    for lid in LEAGUE_CONFIGS:
        rosters = db.query(FantasyRoster).filter_by(league_sleeper_id=lid, is_mine=True).all()
        for r in rosters:
            ids = json.loads(r.player_ids or "[]")
            all_ids.update(ids)

    players = db.query(FantasyPlayer).filter(
        FantasyPlayer.sleeper_id.in_(list(all_ids))
    ).all()

    movers = []
    for p in players:
        if p.trend_30d and abs(p.trend_30d) >= min_trend:
            movers.append({
                "name":      p.name,
                "position":  p.position,
                "team":      p.nfl_team,
                "age":       p.age,
                "value_sf":  p.value_sf,
                "trend_30d": p.trend_30d,
                "direction": "↑" if p.trend_30d > 0 else "↓",
            })

    movers.sort(key=lambda x: -abs(x["trend_30d"]))
    return movers
