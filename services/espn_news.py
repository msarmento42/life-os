"""
ESPN news ingestion service.
Pulls NFL news, filters to your roster players, classifies severity.
"""
from __future__ import annotations
import json
import urllib.request
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from models.fantasy import FantasyLeague, FantasyPlayer, FantasyRoster, FantasyNewsItem
from services.sleeper_sync import LEAGUE_CONFIGS

ESPN_NEWS_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=50"


def _fetch(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "life-os-fantasy/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def _build_roster_player_map(db: Session) -> dict[str, list[str]]:
    """
    Returns: { normalized_player_name → [league_name, ...] }
    for all players on my rosters across all leagues.
    """
    name_to_leagues: dict[str, list[str]] = {}

    for lid in LEAGUE_CONFIGS:
        league = db.query(FantasyLeague).filter_by(sleeper_id=lid).first()
        league_name = league.name if league else lid

        my_roster = db.query(FantasyRoster).filter_by(
            league_sleeper_id=lid, is_mine=True
        ).first()
        if not my_roster:
            continue

        player_ids = json.loads(my_roster.player_ids or "[]")
        players = db.query(FantasyPlayer).filter(
            FantasyPlayer.sleeper_id.in_(player_ids)
        ).all()

        for p in players:
            if p.name:
                key = p.name.lower().strip()
                if key not in name_to_leagues:
                    name_to_leagues[key] = []
                if league_name not in name_to_leagues[key]:
                    name_to_leagues[key].append(league_name)

    return name_to_leagues


def _build_all_player_name_map(db: Session) -> dict[str, str]:
    """
    Returns: { normalized_name → sleeper_id }
    for all players on any roster.
    """
    all_ids: set[str] = set()
    for lid in LEAGUE_CONFIGS:
        rosters = db.query(FantasyRoster).filter_by(league_sleeper_id=lid).all()
        for r in rosters:
            ids = json.loads(r.player_ids or "[]")
            all_ids.update(ids)

    players = db.query(FantasyPlayer).filter(
        FantasyPlayer.sleeper_id.in_(list(all_ids))
    ).all()
    return {p.name.lower().strip(): p.sleeper_id for p in players if p.name}


def _classify_severity(article: dict, matched_players: list[str]) -> str:
    """
    urgent  = injury, depth chart, suspension, contract hold-out
    notable = role change, target share, depth chart competition, trade
    fyi     = general analysis, opinion piece
    """
    headline = (article.get("headline") or "").lower()
    desc     = (article.get("description") or "").lower()
    text     = headline + " " + desc

    urgent_keywords = [
        "injury", "injured", "out", "ir ", "placed on", "surgery",
        "suspended", "suspension", "hold-out", "holdout", "released",
        "cut ", "waived", "torn", "fracture", "concussion",
    ]
    notable_keywords = [
        "starter", "starting", "depth chart", "role", "target", "snap",
        "trade", "traded", "signs", "contract", "extension", "benched",
        "demoted", "promoted", "camp", "ota", "preseason",
    ]

    for kw in urgent_keywords:
        if kw in text:
            return "urgent"
    for kw in notable_keywords:
        if kw in text:
            return "notable"
    return "fyi"


def sync_news(db: Session, hours_back: int = 48) -> int:
    """
    Fetch ESPN news, filter to roster players, upsert into fantasy_news.
    Returns count of new items added.
    """
    try:
        data = _fetch(ESPN_NEWS_URL)
    except Exception as e:
        print(f"[espn_news] Fetch error: {e}")
        return 0

    roster_map   = _build_roster_player_map(db)    # name → my leagues
    all_name_map = _build_all_player_name_map(db)   # name → sleeper_id
    cutoff       = datetime.utcnow() - timedelta(hours=hours_back)

    added = 0
    articles = data.get("articles") or []

    for article in articles:
        espn_id = str(article.get("id") or article.get("dataSourceIdentifier") or "")
        if not espn_id:
            continue

        # Parse published date
        published_str = article.get("published", "")
        try:
            published_at = datetime.strptime(published_str[:19], "%Y-%m-%dT%H:%M:%S")
        except Exception:
            published_at = datetime.utcnow()

        if published_at < cutoff:
            continue

        # Deduplicate
        existing = db.query(FantasyNewsItem).filter_by(espn_id=espn_id).first()
        if existing:
            continue

        # Extract athlete names from categories
        athlete_names = []
        for cat in article.get("categories") or []:
            if cat.get("type") == "athlete":
                desc = cat.get("description") or ""
                if desc:
                    athlete_names.append(desc)

        # Match athletes to my roster players
        my_leagues_affected: list[str] = []
        matched_sids: list[str] = []

        for athlete_name in athlete_names:
            key = athlete_name.lower().strip()
            # Fuzzy first/last name match
            for roster_name, leagues in roster_map.items():
                parts_roster  = set(roster_name.split())
                parts_athlete = set(key.split())
                if len(parts_roster & parts_athlete) >= 2 or roster_name == key:
                    my_leagues_affected.extend(leagues)
                    sid = all_name_map.get(roster_name)
                    if sid:
                        matched_sids.append(sid)

        # Only store news that mentions at least one player on any roster
        # (we show all-roster news, but mark which are on MY rosters)
        all_roster_match = False
        for athlete_name in athlete_names:
            key = athlete_name.lower().strip()
            for known_name in all_name_map:
                parts_k = set(known_name.split())
                parts_a = set(key.split())
                if len(parts_k & parts_a) >= 2 or known_name == key:
                    all_roster_match = True
                    break
            if all_roster_match:
                break

        if not all_roster_match and not my_leagues_affected:
            continue   # skip articles not about anyone in the leagues

        severity = _classify_severity(article, athlete_names)

        item = FantasyNewsItem(
            espn_id            = espn_id,
            headline           = article.get("headline", ""),
            description        = article.get("description", ""),
            published_at       = published_at,
            player_names       = json.dumps(athlete_names),
            player_sleeper_ids = json.dumps(list(set(matched_sids))),
            leagues_affected   = json.dumps(list(set(my_leagues_affected))),
            severity           = severity,
            fetched_at         = datetime.utcnow(),
        )
        db.add(item)
        added += 1

    db.commit()
    return added


def get_my_news(db: Session, severity: Optional[str] = None, limit: int = 20) -> list[dict]:
    """
    Return recent news items that affect my rosters.
    Optionally filter by severity: urgent | notable | fyi
    """
    query = db.query(FantasyNewsItem).filter(
        FantasyNewsItem.leagues_affected != "[]"
    )
    if severity:
        query = query.filter(FantasyNewsItem.severity == severity)

    items = query.order_by(FantasyNewsItem.published_at.desc()).limit(limit).all()

    return [
        {
            "headline":        item.headline,
            "description":     item.description,
            "published_at":    item.published_at.isoformat() if item.published_at else None,
            "player_names":    json.loads(item.player_names or "[]"),
            "leagues_affected": json.loads(item.leagues_affected or "[]"),
            "severity":        item.severity,
        }
        for item in items
    ]
