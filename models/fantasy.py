from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class FantasyLeague(Base):
    """Config + metadata for each Sleeper dynasty league."""
    __tablename__ = "fantasy_leagues"

    id             = Column(Integer, primary_key=True, index=True)
    sleeper_id     = Column(String, unique=True, nullable=False, index=True)
    name           = Column(String, nullable=False)
    format         = Column(String)          # SF | 4QB | 1QB
    n_teams        = Column(Integer)
    te_discount    = Column(Float, default=1.0)   # 0.6 for Odin (no TE slot)
    has_te_slot    = Column(Boolean, default=True)

    # Effective starter counts (accounting for FLEX allocation)
    eff_starters_qb = Column(Integer, default=2)
    eff_starters_rb = Column(Integer, default=3)
    eff_starters_wr = Column(Integer, default=4)
    eff_starters_te = Column(Integer, default=1)

    scoring_settings  = Column(Text)   # JSON blob from Sleeper
    roster_positions  = Column(Text)   # JSON list from Sleeper
    my_roster_id      = Column(Integer)

    last_synced  = Column(DateTime)
    created_at   = Column(DateTime, default=func.now())

    rosters  = relationship("FantasyRoster", back_populates="league", cascade="all, delete-orphan")
    picks    = relationship("FantasyPick",   back_populates="league", cascade="all, delete-orphan")


class FantasyPlayer(Base):
    """All NFL players we track — values + injury/depth chart state."""
    __tablename__ = "fantasy_players"

    id          = Column(Integer, primary_key=True, index=True)
    sleeper_id  = Column(String, unique=True, nullable=False, index=True)
    name        = Column(String)
    position    = Column(String)     # QB | RB | WR | TE
    nfl_team    = Column(String)
    age         = Column(Float)

    # FantasyCalc dynasty values
    value_sf    = Column(Integer, default=0)
    value_1qb   = Column(Integer, default=0)
    trend_30d   = Column(Integer, default=0)
    fc_rank_sf  = Column(Integer)
    fc_pos_rank = Column(Integer)

    # Sleeper injury / availability data
    injury_status         = Column(String)   # None | Questionable | Doubtful | Out | IR
    injury_body_part      = Column(String)
    injury_notes          = Column(Text)
    injury_start_date     = Column(String)
    depth_chart_order     = Column(Integer)
    practice_participation = Column(String)
    practice_description  = Column(String)

    last_synced = Column(DateTime)
    created_at  = Column(DateTime, default=func.now())


class FantasyRoster(Base):
    """A team's roster in a given league."""
    __tablename__ = "fantasy_rosters"

    id               = Column(Integer, primary_key=True, index=True)
    league_sleeper_id = Column(String, ForeignKey("fantasy_leagues.sleeper_id"), nullable=False)
    roster_id        = Column(Integer, nullable=False)
    owner_id         = Column(String)     # Sleeper user_id
    team_name        = Column(String)
    is_mine          = Column(Boolean, default=False)
    player_ids       = Column(Text)       # JSON list of sleeper player IDs
    wins             = Column(Integer, default=0)
    losses           = Column(Integer, default=0)
    points_for       = Column(Float, default=0.0)
    last_synced      = Column(DateTime)

    league = relationship("FantasyLeague", back_populates="rosters")


class FantasyPick(Base):
    """Tradeable future draft picks — who holds what."""
    __tablename__ = "fantasy_picks"

    id                  = Column(Integer, primary_key=True, index=True)
    league_sleeper_id   = Column(String, ForeignKey("fantasy_leagues.sleeper_id"), nullable=False)
    season              = Column(String, nullable=False)   # "2027", "2028"
    round               = Column(Integer, nullable=False)
    original_roster_id  = Column(Integer)   # whose pick it originally was
    current_owner_id    = Column(String)    # Sleeper user_id of current holder
    previous_owner_id   = Column(String)
    is_mine             = Column(Boolean, default=False)

    league = relationship("FantasyLeague", back_populates="picks")


class FantasyNewsItem(Base):
    """Cached ESPN news articles filtered to roster players."""
    __tablename__ = "fantasy_news"

    id                  = Column(Integer, primary_key=True, index=True)
    espn_id             = Column(String, unique=True)   # deduplicate
    headline            = Column(String)
    description         = Column(Text)
    published_at        = Column(DateTime)
    player_names        = Column(Text)    # JSON list of athlete names mentioned
    player_sleeper_ids  = Column(Text)    # JSON list of matched sleeper IDs
    leagues_affected    = Column(Text)    # JSON list of league names where these players appear
    severity            = Column(String, default="fyi")   # urgent | notable | fyi
    fetched_at          = Column(DateTime, default=func.now())


class FantasyValueSnapshot(Base):
    """Daily value snapshot — lets us track movers week-over-week."""
    __tablename__ = "fantasy_value_snapshots"

    id          = Column(Integer, primary_key=True, index=True)
    sleeper_id  = Column(String, nullable=False, index=True)
    date        = Column(String, nullable=False)    # YYYY-MM-DD
    value_sf    = Column(Integer, default=0)
    value_1qb   = Column(Integer, default=0)

    __table_args__ = ()   # (UniqueConstraint handled via app logic)
