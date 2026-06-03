from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from database import get_db
from models.fantasy import FantasyLeague, FantasyRoster, FantasyPlayer, FantasyNewsItem
from services.sleeper_sync import full_sync, get_trending, LEAGUE_CONFIGS
from services.fantasy_engine import (
    sync_fc_values, roster_analysis, league_averages,
    generate_proposals, evaluate_trade, my_value_movers, pick_value
)
from services.espn_news import sync_news, get_my_news

import json

router = APIRouter(prefix="/api/fantasy", tags=["fantasy"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class TradeEvalRequest(BaseModel):
    league_sleeper_id: str
    my_player_ids:    List[str] = []
    my_picks:         List[dict] = []   # [{"season":"2027","round":1}]
    their_player_ids: List[str] = []
    their_picks:      List[dict] = []


# ── Leagues ───────────────────────────────────────────────────────────────────

@router.get("/leagues")
def get_leagues(db: Session = Depends(get_db)):
    """All configured dynasty leagues with sync status."""
    leagues = db.query(FantasyLeague).all()
    return [
        {
            "sleeper_id":   l.sleeper_id,
            "name":         l.name,
            "format":       l.format,
            "n_teams":      l.n_teams,
            "te_discount":  l.te_discount,
            "has_te_slot":  l.has_te_slot,
            "my_roster_id": l.my_roster_id,
            "last_synced":  l.last_synced.isoformat() if l.last_synced else None,
        }
        for l in leagues
    ]


# ── Rosters ───────────────────────────────────────────────────────────────────

@router.get("/league/{league_id}/roster")
def get_my_roster(league_id: str, db: Session = Depends(get_db)):
    """My roster with league-adjusted dynasty values."""
    league = db.query(FantasyLeague).filter_by(sleeper_id=league_id).first()
    if not league:
        raise HTTPException(404, "League not found — run /sync first")

    my_roster = db.query(FantasyRoster).filter_by(
        league_sleeper_id=league_id, is_mine=True
    ).first()
    if not my_roster:
        raise HTTPException(404, "Your roster not found in this league")

    avgs     = league_averages(db, league_id)
    analysis = roster_analysis(db, league_id, my_roster.roster_id)

    # Add surplus/deficit pct
    sv   = analysis.get("starter_value", {})
    gaps = {}
    for pos, val in sv.items():
        avg = avgs.get(pos, 0)
        gaps[pos] = round(((val - avg) / avg * 100) if avg else 0, 1)

    return {**analysis, "vs_league_avg_pct": gaps, "league_averages": avgs}


@router.get("/league/{league_id}/rosters")
def get_all_rosters(league_id: str, db: Session = Depends(get_db)):
    """All teams in a league with starter values (for trade research)."""
    league = db.query(FantasyLeague).filter_by(sleeper_id=league_id).first()
    if not league:
        raise HTTPException(404, "League not found")

    rosters = db.query(FantasyRoster).filter_by(league_sleeper_id=league_id).all()
    avgs    = league_averages(db, league_id)

    result = []
    for r in rosters:
        analysis = roster_analysis(db, league_id, r.roster_id)
        if not analysis:
            continue
        sv   = analysis.get("starter_value", {})
        gaps = {
            pos: round(((sv.get(pos,0) - avgs.get(pos,0)) / avgs.get(pos,0) * 100) if avgs.get(pos,0) else 0, 1)
            for pos in ["QB","RB","WR","TE"]
        }
        result.append({
            "roster_id":      r.roster_id,
            "team_name":      r.team_name,
            "is_mine":        r.is_mine,
            "starter_value":  sv,
            "vs_avg_pct":     gaps,
            "total_value":    sum(sv.values()),
        })

    result.sort(key=lambda x: -x["total_value"])
    return {"league": league.name, "averages": avgs, "teams": result}


# ── Picks ─────────────────────────────────────────────────────────────────────

@router.get("/league/{league_id}/picks")
def get_my_picks(league_id: str, db: Session = Depends(get_db)):
    """My draft pick inventory with estimated values."""
    from models.fantasy import FantasyPick
    league = db.query(FantasyLeague).filter_by(sleeper_id=league_id).first()
    if not league:
        raise HTTPException(404, "League not found")

    picks = db.query(FantasyPick).filter_by(
        league_sleeper_id=league_id, is_mine=True
    ).order_by(FantasyPick.season, FantasyPick.round).all()

    rosters = db.query(FantasyRoster).filter_by(league_sleeper_id=league_id).all()
    rid_to_name = {r.roster_id: r.team_name for r in rosters}

    return [
        {
            "label":               f"{p.season} Round {p.round}",
            "season":              p.season,
            "round":               p.round,
            "est_value":           pick_value(p.round, p.season, league),
            "original_rid":        p.original_roster_id,
            "original_owner_name": rid_to_name.get(p.original_roster_id, f"Roster {p.original_roster_id}"),
            "is_own_pick":         p.original_roster_id == league.my_roster_id,
        }
        for p in picks
    ]


@router.get("/league/{league_id}/all-picks")
def get_all_picks(league_id: str, db: Session = Depends(get_db)):
    """All tradeable draft picks in a league — who holds what, with values."""
    from models.fantasy import FantasyPick
    league = db.query(FantasyLeague).filter_by(sleeper_id=league_id).first()
    if not league:
        raise HTTPException(404, "League not found")

    picks = db.query(FantasyPick).filter_by(
        league_sleeper_id=league_id
    ).order_by(FantasyPick.season, FantasyPick.round).all()

    rosters = db.query(FantasyRoster).filter_by(league_sleeper_id=league_id).all()
    rid_to_name    = {r.roster_id: r.team_name for r in rosters}
    oid_to_roster  = {r.owner_id: r for r in rosters}

    result = []
    for p in picks:
        cur_roster        = oid_to_roster.get(p.current_owner_id)
        orig_owner_name   = rid_to_name.get(p.original_roster_id, f"Roster {p.original_roster_id}")
        cur_owner_name    = cur_roster.team_name if cur_roster else "Unknown"
        cur_owner_rid     = cur_roster.roster_id if cur_roster else None
        result.append({
            "label":               f"{p.season} Round {p.round}",
            "season":              p.season,
            "round":               p.round,
            "est_value":           pick_value(p.round, p.season, league),
            "original_roster_id":  p.original_roster_id,
            "original_owner_name": orig_owner_name,
            "current_owner_id":    p.current_owner_id,
            "current_owner_name":  cur_owner_name,
            "current_owner_rid":   cur_owner_rid,
            "is_mine":             p.is_mine,
            "is_own_pick":         p.original_roster_id == league.my_roster_id,
            "is_acquired":         p.is_mine and (p.original_roster_id != league.my_roster_id),
        })

    return {
        "league_name":  league.name,
        "my_roster_id": league.my_roster_id,
        "picks":        result,
    }


# ── Trade tools ───────────────────────────────────────────────────────────────

@router.post("/trade/evaluate")
def evaluate_trade_endpoint(req: TradeEvalRequest, db: Session = Depends(get_db)):
    """Evaluate a proposed trade — returns value delta, age analysis, verdict."""
    result = evaluate_trade(
        db                = db,
        league_sleeper_id = req.league_sleeper_id,
        my_player_ids     = req.my_player_ids,
        my_picks          = req.my_picks,
        their_player_ids  = req.their_player_ids,
        their_picks       = req.their_picks,
    )
    if "error" in result:
        raise HTTPException(404, result["error"])
    return result


@router.get("/league/{league_id}/proposals")
def get_proposals(league_id: str, top_n: int = 5, db: Session = Depends(get_db)):
    """Auto-generated trade proposals for a league."""
    league = db.query(FantasyLeague).filter_by(sleeper_id=league_id).first()
    if not league:
        raise HTTPException(404, "League not found")
    proposals = generate_proposals(db, league_id, top_n=top_n)
    return {"league": league.name, "proposals": proposals}


# ── News ──────────────────────────────────────────────────────────────────────

@router.get("/news")
def get_news(severity: Optional[str] = None, limit: int = 20, db: Session = Depends(get_db)):
    """Recent news filtered to your roster players."""
    return get_my_news(db, severity=severity, limit=limit)


@router.get("/news/alerts")
def get_alerts(db: Session = Depends(get_db)):
    """Urgent news only — injuries, depth chart drops, suspensions."""
    return get_my_news(db, severity="urgent", limit=10)


# ── Player tools ──────────────────────────────────────────────────────────────

@router.get("/players/movers")
def get_value_movers(min_trend: int = 200, db: Session = Depends(get_db)):
    """Biggest 30-day dynasty value changes on your rosters."""
    return my_value_movers(db, min_trend=min_trend)


@router.get("/players/trending")
def get_trending_players(db: Session = Depends(get_db)):
    """Sleeper platform-wide trending adds (last 24h)."""
    trending_raw = get_trending(limit=15)
    result = []
    for t in trending_raw:
        sid = str(t.get("player_id", ""))
        player = db.query(FantasyPlayer).filter_by(sleeper_id=sid).first()
        result.append({
            "sleeper_id": sid,
            "name":       player.name if player else sid,
            "position":   player.position if player else "?",
            "team":       player.nfl_team if player else "?",
            "adds":       t.get("count", 0),
            "value_sf":   player.value_sf if player else 0,
        })
    return result


@router.get("/players/search")
def search_players(q: str, limit: int = 10, db: Session = Depends(get_db)):
    """Search players by name (for trade builder)."""
    players = db.query(FantasyPlayer).filter(
        FantasyPlayer.name.ilike(f"%{q}%")
    ).order_by(FantasyPlayer.value_sf.desc()).limit(limit).all()
    return [
        {
            "sleeper_id": p.sleeper_id,
            "name":       p.name,
            "position":   p.position,
            "team":       p.nfl_team,
            "age":        p.age,
            "value_sf":   p.value_sf,
            "value_1qb":  p.value_1qb,
            "trend_30d":  p.trend_30d,
        }
        for p in players
    ]


# ── Sync endpoints ────────────────────────────────────────────────────────────

@router.post("/sync")
def trigger_sync(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Trigger a full sync: leagues → rosters → players → FantasyCalc values → picks.
    Runs synchronously (safe for first-run; background for subsequent runs).
    """
    # Sync Sleeper data
    sleeper_results = full_sync(db)
    # Sync FantasyCalc values
    fc_count = sync_fc_values(db)
    # Sync ESPN news
    news_count = sync_news(db)

    return {
        "status":  "ok",
        "sleeper": sleeper_results,
        "fantasycalc_players": fc_count,
        "news_items": news_count,
    }


@router.post("/sync/news")
def sync_news_only(db: Session = Depends(get_db)):
    """Sync ESPN news only (fast — use for daily news refreshes)."""
    count = sync_news(db)
    return {"status": "ok", "new_items": count}


@router.post("/sync/values")
def sync_values_only(db: Session = Depends(get_db)):
    """Sync FantasyCalc values only."""
    count = sync_fc_values(db)
    return {"status": "ok", "players_updated": count}


# ── Dashboard summary ─────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    """
    Single endpoint for the Life OS Fantasy dashboard.
    Returns all leagues + my rosters + recent alerts + value movers.
    """
    leagues = db.query(FantasyLeague).all()
    if not leagues:
        return {"status": "not_synced", "message": "Run POST /api/fantasy/sync to initialize"}

    league_summaries = []
    for league in leagues:
        my_roster = db.query(FantasyRoster).filter_by(
            league_sleeper_id=league.sleeper_id, is_mine=True
        ).first()
        if not my_roster:
            continue

        avgs     = league_averages(db, league.sleeper_id)
        analysis = roster_analysis(db, league.sleeper_id, my_roster.roster_id)
        sv       = analysis.get("starter_value", {})
        gaps     = {
            pos: round(((sv.get(pos,0) - avgs.get(pos,0)) / avgs.get(pos,0) * 100) if avgs.get(pos,0) else 0, 1)
            for pos in ["QB","RB","WR","TE"]
        }

        league_summaries.append({
            "league_id":   league.sleeper_id,
            "league_name": league.name,
            "format":      league.format,
            "team_name":   my_roster.team_name,
            "starter_value": sv,
            "vs_avg_pct":  gaps,
            "top_assets":  analysis.get("starters", {}),
        })

    alerts  = get_my_news(db, severity="urgent", limit=5)
    movers  = my_value_movers(db, min_trend=250)[:6]

    return {
        "leagues":      league_summaries,
        "alerts":       alerts,
        "value_movers": movers,
        "last_updated": leagues[0].last_synced.isoformat() if leagues[0].last_synced else None,
    }
