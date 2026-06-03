import { useState, useEffect } from 'react'
import axios from 'axios'
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Trophy, Zap, BarChart2 } from 'lucide-react'
import { SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'

// ── Helpers ──────────────────────────────────────────────────────────────────

const POS_COLORS = {
  QB: 'bg-red-500/20 text-red-300 border-red-500/30',
  RB: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  WR: 'bg-green-500/20 text-green-300 border-green-500/30',
  TE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

const STAGE_CONFIG = {
  rising:    { label: '↑ Rising',  cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
  prime:     { label: '★ Prime',   cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  declining: { label: '↓ Aging',   cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  unknown:   { label: '? Unknown', cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
}

const INJURY_CONFIG = {
  Out:          { cls: 'text-red-400',    label: 'OUT' },
  Doubtful:     { cls: 'text-orange-400', label: 'DTB' },
  Questionable: { cls: 'text-yellow-400', label: 'Q' },
  IR:           { cls: 'text-red-500',    label: 'IR' },
}

function fmtVal(v) {
  if (!v) return '—'
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
}

function PctBar({ pct, pos }) {
  const barColor = pos === 'QB' ? 'bg-red-500' : pos === 'RB' ? 'bg-blue-500' : pos === 'WR' ? 'bg-green-500' : 'bg-amber-500'
  const isPositive = pct >= 0
  const width = Math.min(Math.abs(pct), 100)
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="w-6 text-right">
        {isPositive
          ? <TrendingUp className="w-3 h-3 text-green-400 inline" />
          : <TrendingDown className="w-3 h-3 text-red-400 inline" />}
      </div>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isPositive ? barColor : 'bg-red-500/60'}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className={`text-xs font-mono w-12 text-right ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{pct?.toFixed(1)}%
      </div>
    </div>
  )
}

function PlayerRow({ player, isStarter }) {
  const stage = STAGE_CONFIG[player.career_stage] || STAGE_CONFIG.unknown
  const injury = player.injury_status ? INJURY_CONFIG[player.injury_status] : null
  const depthAlert = player.depth_chart > 1

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
      isStarter ? 'hover:bg-gray-800/60' : 'hover:bg-gray-800/30 opacity-70'
    }`}>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${POS_COLORS[player.position] || 'bg-gray-700 text-gray-300 border-gray-600'} shrink-0`}>
        {player.position}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-100 truncate">{player.name}</span>
          {injury && <span className={`text-[10px] font-bold ${injury.cls}`}>{injury.label}</span>}
          {depthAlert && !injury && (
            <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" title="Not starter on depth chart" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-gray-500">{player.team || '—'}</span>
          {player.age && <span className="text-[11px] text-gray-600">age {player.age}</span>}
        </div>
      </div>
      <span className={`hidden sm:inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border ${stage.cls} shrink-0`}>
        {stage.label}
      </span>
      <div className="text-right shrink-0">
        <div className="text-sm font-mono text-green-400 font-semibold">{fmtVal(player.adj_value)}</div>
        {player.trend_30d !== 0 && (
          <div className={`text-[10px] font-mono ${player.trend_30d > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {player.trend_30d > 0 ? '+' : ''}{player.trend_30d}
          </div>
        )}
      </div>
    </div>
  )
}

function PositionStrengthBars({ vsAvgPct }) {
  return (
    <div className="space-y-2">
      {['QB', 'RB', 'WR', 'TE'].map(pos => (
        <div key={pos} className="grid grid-cols-[32px_1fr] gap-2 items-center">
          <span className={`text-[10px] font-bold px-1 py-0.5 rounded border text-center ${POS_COLORS[pos]}`}>
            {pos}
          </span>
          <PctBar pct={vsAvgPct?.[pos] ?? 0} pos={pos} />
        </div>
      ))}
    </div>
  )
}

function LeagueCard({ leagueId, leagueName, format, teamName, starterValue, vsAvgPct, starters, allPlayers }) {
  const [expanded, setExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [posFilter, setPosFilter] = useState('ALL')

  const totalValue = Object.values(starterValue || {}).reduce((s, v) => s + v, 0)

  const starterIds = new Set()
  const starterList = []
  const benchList = []

  const positions = ['QB', 'WR', 'RB', 'TE']
  positions.forEach(pos => {
    ;(starters?.[pos] || []).forEach(p => { starterIds.add(p.sleeper_id); starterList.push({ ...p, isStarter: true }) })
  })

  if (showAll && allPlayers) {
    positions.forEach(pos => {
      ;(allPlayers?.[pos] || []).forEach(p => {
        if (!starterIds.has(p.sleeper_id)) benchList.push({ ...p, isStarter: false })
      })
    })
  }

  const displayList = posFilter === 'ALL'
    ? [...starterList, ...benchList]
    : [...starterList, ...benchList].filter(p => p.position === posFilter)

  const injuredCount = starterList.filter(p => p.injury_status && p.injury_status !== 'null').length

  return (
    <div className="card">
      <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <div className="font-semibold text-gray-100">{leagueName}</div>
            <div className="text-xs text-gray-500">{teamName} · {format}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {injuredCount > 0 && (
            <div className="flex items-center gap-1 text-orange-400 text-xs">
              <AlertTriangle className="w-3 h-3" />{injuredCount} inj
            </div>
          )}
          <div className="text-right">
            <div className="text-sm font-mono text-green-400 font-bold">{fmtVal(totalValue)}</div>
            <div className="text-[10px] text-gray-500">total starter value</div>
          </div>
          <span className={`text-gray-500 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
              <BarChart2 className="w-3 h-3" />
              Position Strength vs. League Average
            </div>
            <PositionStrengthBars vsAvgPct={vsAvgPct} />
          </div>

          <div className="border-t border-gray-800 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1">
                {['ALL', 'QB', 'WR', 'RB', 'TE'].map(pos => (
                  <button
                    key={pos}
                    onClick={() => setPosFilter(pos)}
                    className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors ${
                      posFilter === pos
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAll(s => !s)} className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors">
                {showAll ? 'Starters only' : 'Show bench'}
              </button>
            </div>
            <div className="space-y-0.5">
              {displayList.length === 0
                ? <div className="text-xs text-gray-600 text-center py-4">No players</div>
                : displayList.map(player => <PlayerRow key={player.sleeper_id} player={player} isStarter={player.isStarter} />)
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Roster({ dash, rosters, loading, onSync, syncing }) {
  if (loading) return (
    <div className="space-y-4">
      {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
    </div>
  )

  if (dash?.status === 'not_synced') return (
    <EmptyState
      icon={Trophy}
      title="No fantasy data yet"
      description="Sync your Sleeper leagues to pull rosters, values, and injury data."
      action={{ label: 'Sync Now', onClick: onSync }}
    />
  )

  return (
    <div className="space-y-4">
      {/* Stat strip */}
      {dash?.leagues?.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card items-center text-center">
            <div className="stat-label">Active Leagues</div>
            <div className="stat-value text-green-400">{dash.leagues.length}</div>
          </div>
          <div className="stat-card items-center text-center">
            <div className="stat-label">Urgent Alerts</div>
            <div className="stat-value text-orange-400">{dash.alerts?.length ?? 0}</div>
          </div>
          <div className="stat-card items-center text-center">
            <div className="stat-label">Value Movers</div>
            <div className="stat-value text-blue-400">{dash.value_movers?.length ?? 0}</div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {dash?.alerts?.length > 0 && (
        <div className="card border-orange-500/20 bg-orange-500/5">
          <div className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />Urgent Alerts
          </div>
          <div className="space-y-1.5">
            {dash.alerts.map((alert, i) => (
              <div key={i} className="text-sm text-gray-300">
                <span className="text-orange-400 font-medium">{alert.player_names?.join(', ') || 'Player'}</span>
                {' — '}
                <span className="text-gray-400">{alert.headline}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Value movers */}
      {dash?.value_movers?.length > 0 && (
        <div className="card">
          <div className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            30-Day Value Movers (Your Roster)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {dash.value_movers.slice(0, 6).map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={`text-[10px] font-bold px-1 py-0.5 rounded border ${POS_COLORS[p.position] || 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                  {p.position}
                </span>
                <span className="text-gray-200 truncate flex-1">{p.name}</span>
                <span className={`font-mono text-xs font-bold ${p.trend_30d > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {p.trend_30d > 0 ? '+' : ''}{p.trend_30d}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-league roster cards */}
      {dash?.leagues?.map(league => {
        const rosterDetail = rosters[league.league_id] || {}
        return (
          <LeagueCard
            key={league.league_id}
            leagueId={league.league_id}
            leagueName={league.league_name}
            format={league.format}
            teamName={league.team_name}
            starterValue={rosterDetail.starter_value || league.starter_value}
            vsAvgPct={rosterDetail.vs_league_avg_pct || league.vs_avg_pct}
            starters={rosterDetail.starters}
            allPlayers={rosterDetail.all_players}
          />
        )
      })}
    </div>
  )
}
