import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import {
  Search, X, ArrowLeftRight, TrendingUp, TrendingDown,
  Trophy, ChevronDown, Plus, RotateCcw, Users
} from 'lucide-react'
import { SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'

// ── Constants & helpers ───────────────────────────────────────────────────────

const POS_COLORS = {
  QB: 'bg-red-500/20 text-red-300 border-red-500/30',
  RB: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  WR: 'bg-green-500/20 text-green-300 border-green-500/30',
  TE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

function fmtVal(v) {
  if (v == null || v === 0) return '—'
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
}

// Standard future picks for the "you get" side
const FUTURE_PICKS = [
  { season: '2026', round: 1, label: '2026 Round 1' },
  { season: '2026', round: 2, label: '2026 Round 2' },
  { season: '2026', round: 3, label: '2026 Round 3' },
  { season: '2027', round: 1, label: '2027 Round 1' },
  { season: '2027', round: 2, label: '2027 Round 2' },
  { season: '2027', round: 3, label: '2027 Round 3' },
  { season: '2028', round: 1, label: '2028 Round 1' },
  { season: '2028', round: 2, label: '2028 Round 2' },
  { season: '2028', round: 3, label: '2028 Round 3' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function VerdictChip({ verdict }) {
  const cfg = {
    WIN:  { cls: 'bg-green-500/20 text-green-300 border-green-500/30',  label: '✓ WIN' },
    FAIR: { cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: '~ FAIR' },
    LOSS: { cls: 'bg-red-500/20 text-red-300 border-red-500/30',        label: '✗ LOSS' },
  }[verdict] || { cls: 'bg-gray-700 text-gray-400 border-gray-600', label: verdict }
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// Single player/pick chip in the trade list
function TradeAsset({ asset, onRemove }) {
  const isPick = asset.is_pick
  const posClass = isPick
    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    : (POS_COLORS[asset.position] || 'bg-gray-700 text-gray-300 border-gray-600')
  const displayVal = asset.adj_value || asset.est_value || asset.value_sf || 0

  return (
    <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-2.5 py-2 group min-w-0">
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${posClass} shrink-0`}>
        {isPick ? 'PICK' : asset.position}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-100 truncate">{asset.name}</div>
        {displayVal > 0 && (
          <div className="text-[10px] text-gray-400 font-mono">{fmtVal(displayVal)}</div>
        )}
      </div>
      <button
        onClick={() => onRemove(asset._uid)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 p-0.5 shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// Debounced player search with dropdown
function PlayerSearch({ onAdd, existingIds = [] }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const doSearch = useCallback((val) => {
    clearTimeout(timerRef.current)
    if (!val.trim()) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await axios.get(`/api/fantasy/players/search?q=${encodeURIComponent(val)}&limit=8`)
        setResults(r.data.filter(p => !existingIds.includes(p.sleeper_id)))
        setOpen(true)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }, 250)
  }, [existingIds])

  const handleChange = (e) => {
    setQ(e.target.value)
    doSearch(e.target.value)
  }

  const pick = (player) => {
    onAdd({
      _uid: `player-${player.sleeper_id}-${Date.now()}`,
      sleeper_id: player.sleeper_id,
      name: player.name,
      position: player.position,
      team: player.team,
      age: player.age,
      value_sf: player.value_sf,
      trend_30d: player.trend_30d,
      is_pick: false,
    })
    setQ('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
        <input
          className="input input-sm pl-8 w-full"
          value={q}
          onChange={handleChange}
          onFocus={() => q && results.length > 0 && setOpen(true)}
          placeholder="Search players…"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-gray-600 border-t-green-400 rounded-full animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
          {results.map(p => (
            <button
              key={p.sleeper_id}
              onMouseDown={(e) => { e.preventDefault(); pick(p) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-800 transition-colors text-left"
            >
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${POS_COLORS[p.position] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                {p.position}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-100 truncate">{p.name}</div>
                <div className="text-[10px] text-gray-500">{p.team} · Age {p.age}</div>
              </div>
              <span className="text-[10px] text-green-400 font-mono shrink-0">{fmtVal(p.value_sf)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Pick selector dropdown
function PickDropdown({ picks, label, onAdd, existingLabels = [] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const available = picks.filter(pk => !existingLabels.includes(pk.label))
  if (available.length === 0) return null

  const addPick = (pk) => {
    onAdd({
      _uid: `pick-${pk.label}-${Date.now()}`,
      name: pk.label,
      label: pk.label,
      season: pk.season,
      round: pk.round,
      est_value: pk.est_value || pk.adj_value || 0,
      is_pick: true,
      position: 'PICK',
    })
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(s => !s)}
        className="btn-secondary btn-sm flex items-center gap-1.5 text-xs w-full"
      >
        <Plus className="w-3.5 h-3.5" />
        {label}
        <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
          {available.map((pk, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); addPick(pk) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-800 transition-colors text-left"
            >
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-purple-500/20 text-purple-300 border-purple-500/30 shrink-0">
                PICK
              </span>
              <span className="text-xs text-gray-200 flex-1">{pk.label}</span>
              {pk.est_value > 0 && (
                <span className="text-[10px] text-green-400 font-mono shrink-0">{fmtVal(pk.est_value)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Team browser for "you get" side
function TeamBrowser({ leagueId, onAddPlayer, existingIds }) {
  const [teams, setTeams] = useState(null)
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!leagueId) return
    setTeams(null)
    setSelected(null)
    axios.get(`/api/fantasy/league/${leagueId}/rosters`)
      .then(r => {
        const others = (r.data.teams || []).filter(t => !t.is_mine)
        setTeams(others)
      })
      .catch(() => {})
  }, [leagueId])

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (!teams) return null

  // Collect all players from the selected team across positions
  // (starter_value and total_value are in the response; we need full player list)
  // Note: /rosters only returns starter_value totals, not full player lists
  // So we use the search endpoint instead — team browse is team selector + player search guidance
  // We'll show position strengths for the selected team as context

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(s => !s)}
        className="btn-secondary btn-sm flex items-center gap-1.5 text-xs w-full"
      >
        <Users className="w-3.5 h-3.5" />
        Browse team
        <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
          {teams.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">No other teams found</div>
          )}
          {teams.map((team, i) => (
            <div key={i}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  setSelected(selected === team.roster_id ? null : team.roster_id)
                }}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800 transition-colors text-left"
              >
                <span className="text-xs text-gray-200">{team.team_name}</span>
                <span className={`text-[10px] font-mono ${team.total_value >= 15000 ? 'text-green-400' : 'text-gray-500'}`}>
                  {fmtVal(team.total_value)}
                </span>
              </button>

              {selected === team.roster_id && (
                <div className="px-3 pb-2 space-y-1 bg-gray-900/80">
                  <div className="text-[10px] text-gray-500 pt-1 mb-1.5">
                    Position strengths — search players above to add from this team:
                  </div>
                  {['QB','RB','WR','TE'].map(pos => {
                    const val = team.starter_value?.[pos] || 0
                    const pct = team.vs_avg_pct?.[pos] || 0
                    return (
                      <div key={pos} className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1 py-0.5 rounded border ${POS_COLORS[pos]} w-7 text-center shrink-0`}>{pos}</span>
                        <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 0 ? 'bg-green-500/60' : 'bg-red-500/60'}`}
                            style={{ width: `${Math.min(Math.abs(pct), 100)}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-mono w-12 text-right ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pct >= 0 ? '+' : ''}{pct?.toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// One side of the trade
function TradeSide({ label, accent, assets, onAdd, onRemove, picks, leagueId, isGiving }) {
  const existingPlayerIds = assets.filter(a => !a.is_pick).map(a => a.sleeper_id)
  const existingPickLabels = assets.filter(a => a.is_pick).map(a => a.label)
  const total = assets.reduce((s, a) => s + (a.adj_value || a.est_value || a.value_sf || 0), 0)
  const borderCls = accent === 'red' ? 'border-red-500/20 bg-red-500/5' : 'border-green-500/20 bg-green-500/5'
  const accentCls = accent === 'red' ? 'text-red-400' : 'text-green-400'

  return (
    <div className={`flex-1 min-w-0 rounded-xl border ${borderCls} p-4 flex flex-col gap-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {accent === 'red'
            ? <TrendingDown className="w-4 h-4 text-red-400" />
            : <TrendingUp className="w-4 h-4 text-green-400" />}
          <span className="text-sm font-semibold text-gray-100">{label}</span>
        </div>
        {total > 0 && (
          <span className={`text-sm font-mono font-bold ${accentCls}`}>
            {fmtVal(total)}
          </span>
        )}
      </div>

      {/* Player search */}
      <PlayerSearch onAdd={onAdd} existingIds={existingPlayerIds} />

      {/* Picks / Team browse */}
      <div className="flex gap-2">
        {picks && picks.length > 0 && (
          <div className="flex-1">
            <PickDropdown
              picks={picks}
              label="Add pick"
              onAdd={onAdd}
              existingLabels={existingPickLabels}
            />
          </div>
        )}
        {!isGiving && leagueId && (
          <div className="flex-1">
            <TeamBrowser leagueId={leagueId} onAddPlayer={onAdd} existingIds={existingPlayerIds} />
          </div>
        )}
      </div>

      {/* Asset list */}
      <div className="flex flex-col gap-1.5">
        {assets.length === 0 && (
          <div className="text-xs text-gray-600 text-center py-4 border border-dashed border-gray-800 rounded-lg">
            No players added yet
          </div>
        )}
        {assets.map(a => (
          <TradeAsset key={a._uid} asset={a} onRemove={onRemove} />
        ))}
      </div>
    </div>
  )
}

// Post-trade starter projection
function RosterProjection({ myRoster, giving, getting }) {
  if (!myRoster?.starters) return null

  const givingIds = new Set(giving.filter(a => !a.is_pick).map(a => a.sleeper_id))
  const gettingByPos = {}
  for (const a of getting) {
    if (!a.is_pick && a.position) {
      if (!gettingByPos[a.position]) gettingByPos[a.position] = []
      gettingByPos[a.position].push(a)
    }
  }

  return (
    <div className="card mt-2">
      <div className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-green-400" />
        Post-trade starter projection
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {['QB', 'RB', 'WR', 'TE'].map(pos => {
          const current = (myRoster.starters?.[pos] || []).filter(p => !givingIds.has(p.sleeper_id))
          const incoming = gettingByPos[pos] || []
          const combined = [...incoming, ...current].sort((a, b) =>
            (b.adj_value || b.value_sf || 0) - (a.adj_value || a.value_sf || 0)
          )

          return (
            <div key={pos}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${POS_COLORS[pos]}`}>{pos}</span>
              </div>
              {combined.length === 0 && (
                <div className="text-[11px] text-gray-600 italic">Empty</div>
              )}
              {combined.slice(0, 4).map((p, i) => {
                const isNew = incoming.some(a => a.sleeper_id === p.sleeper_id || a.name === p.name)
                const isGone = givingIds.has(p.sleeper_id)
                return (
                  <div
                    key={p.sleeper_id || p.name || i}
                    className={`flex items-center gap-1.5 py-0.5 ${isNew ? 'text-green-400' : isGone ? 'text-red-400 line-through opacity-50' : 'text-gray-300'}`}
                  >
                    <span className="text-[11px] truncate flex-1">{isNew && '+'} {p.name}</span>
                    <span className="text-[10px] font-mono text-gray-600 shrink-0">
                      {fmtVal(p.adj_value || p.value_sf || 0)}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TradeBuilder({ dash, loading, onSync }) {
  const location = useLocation()
  const [selectedLeague, setSelectedLeague] = useState(null)
  const [myPicks, setMyPicks] = useState([])
  const [myRoster, setMyRoster] = useState(null)
  const [giving, setGiving] = useState([])   // assets I give
  const [getting, setGetting] = useState([]) // assets I receive
  const [evaluation, setEvaluation] = useState(null)
  const [evalLoading, setEvalLoading] = useState(false)
  const [showProjection, setShowProjection] = useState(false)
  const evalTimer = useRef(null)
  const preloadApplied = useRef(false)
  const toast = useToast()

  // Pre-load pick from Picks page navigation state
  useEffect(() => {
    if (preloadApplied.current) return
    const state = location.state
    if (!state?.preloadPick) return
    if (state.preloadLeague) setSelectedLeague(state.preloadLeague)
    setGiving(prev => [...prev, state.preloadPick])
    preloadApplied.current = true
    // Clear state so navigating back doesn't re-apply
    window.history.replaceState({}, '')
  }, [location.state])

  // Load per-league data when league changes
  useEffect(() => {
    if (!selectedLeague) return
    setGiving([])
    setGetting([])
    setEvaluation(null)
    setShowProjection(false)
    setMyPicks([])
    setMyRoster(null)

    axios.get(`/api/fantasy/league/${selectedLeague}/picks`)
      .then(r => setMyPicks(r.data || []))
      .catch(() => {})

    axios.get(`/api/fantasy/league/${selectedLeague}/roster`)
      .then(r => setMyRoster(r.data))
      .catch(() => {})
  }, [selectedLeague])

  // Auto-evaluate on changes (debounced)
  useEffect(() => {
    clearTimeout(evalTimer.current)
    if (!selectedLeague || (giving.length === 0 && getting.length === 0)) {
      setEvaluation(null)
      return
    }

    const myPlayerIds   = giving.filter(a => !a.is_pick).map(a => a.sleeper_id)
    const myPicksData   = giving.filter(a => a.is_pick).map(a => ({ season: a.season, round: a.round }))
    const theirPlayerIds = getting.filter(a => !a.is_pick).map(a => a.sleeper_id)
    const theirPicksData = getting.filter(a => a.is_pick).map(a => ({ season: a.season, round: a.round }))

    evalTimer.current = setTimeout(async () => {
      setEvalLoading(true)
      try {
        const r = await axios.post('/api/fantasy/trade/evaluate', {
          league_sleeper_id: selectedLeague,
          my_player_ids:     myPlayerIds,
          my_picks:          myPicksData,
          their_player_ids:  theirPlayerIds,
          their_picks:       theirPicksData,
        })
        setEvaluation(r.data)
      } catch {
        // silent — empty trade is fine
      } finally {
        setEvalLoading(false)
      }
    }, 300)
  }, [giving, getting, selectedLeague])

  const addGiving  = (a) => setGiving(prev => [...prev, a])
  const addGetting = (a) => setGetting(prev => [...prev, a])
  const removeGiving  = (uid) => setGiving(prev => prev.filter(a => a._uid !== uid))
  const removeGetting = (uid) => setGetting(prev => prev.filter(a => a._uid !== uid))

  const clearTrade = () => {
    setGiving([])
    setGetting([])
    setEvaluation(null)
    setShowProjection(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="space-y-4">
      {[0, 1].map(i => <SkeletonCard key={i} />)}
    </div>
  )

  if (!dash || dash.status === 'not_synced') return (
    <EmptyState
      icon={ArrowLeftRight}
      title="No fantasy data yet"
      description="Sync your Sleeper leagues to use the trade builder."
      action={{ label: 'Sync Now', onClick: onSync }}
    />
  )

  const leagues = dash.leagues || []
  const hasTrade = giving.length > 0 || getting.length > 0

  // Build pick options for "you get" side — standard future picks
  const futurePickOptions = FUTURE_PICKS

  return (
    <div className="space-y-5">

      {/* League selector */}
      <div>
        <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Select league</div>
        <div className="flex gap-2 flex-wrap">
          {leagues.map(l => (
            <button
              key={l.league_id}
              onClick={() => setSelectedLeague(l.league_id === selectedLeague ? null : l.league_id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                selectedLeague === l.league_id
                  ? 'bg-green-500/20 text-green-300 border-green-500/40 shadow-sm'
                  : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              {l.league_name}
              <span className={`ml-1.5 text-[10px] ${selectedLeague === l.league_id ? 'text-green-500/60' : 'text-gray-600'}`}>
                {l.format}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt if no league selected */}
      {!selectedLeague && (
        <div className="card text-center py-10">
          <ArrowLeftRight className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <div className="text-sm text-gray-500">Select a league above to build a trade</div>
          <div className="text-xs text-gray-600 mt-1">Search any player, add picks, get instant WIN/FAIR/LOSS verdict</div>
        </div>
      )}

      {selectedLeague && (
        <>
          {/* Trade sides */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <TradeSide
              label="You give"
              accent="red"
              assets={giving}
              onAdd={addGiving}
              onRemove={removeGiving}
              picks={myPicks}
              leagueId={selectedLeague}
              isGiving={true}
            />

            {/* Center icon */}
            <div className="hidden sm:flex items-center justify-center shrink-0 self-center">
              <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                <ArrowLeftRight className="w-3.5 h-3.5 text-gray-500" />
              </div>
            </div>

            <TradeSide
              label="You get"
              accent="green"
              assets={getting}
              onAdd={addGetting}
              onRemove={removeGetting}
              picks={futurePickOptions}
              leagueId={selectedLeague}
              isGiving={false}
            />
          </div>

          {/* Evaluation panel */}
          {(evalLoading || evaluation) && (
            <div className="card">
              {evalLoading && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <div className="w-4 h-4 border-2 border-gray-700 border-t-green-400 rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">Evaluating…</span>
                </div>
              )}

              {!evalLoading && evaluation && (
                <div className="space-y-4">
                  {/* Verdict row */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <VerdictChip verdict={evaluation.verdict} />
                      <span className={`text-sm font-mono font-bold ${evaluation.pct_delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {evaluation.pct_delta >= 0 ? '+' : ''}{evaluation.pct_delta}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {evaluation.value_delta >= 0 ? 'value surplus for you' : 'value deficit for you'}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowProjection(s => !s)}
                      className="btn-secondary btn-sm flex items-center gap-1.5 text-xs"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      {showProjection ? 'Hide' : 'Roster'} projection
                    </button>
                  </div>

                  {/* Value bars */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-red-500/5 border border-red-500/15 px-3 py-2">
                      <div className="text-[11px] text-gray-500 mb-0.5">You give</div>
                      <div className="text-xl font-mono font-bold text-red-400">
                        {fmtVal(evaluation.my_side?.total)}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-1">
                        {evaluation.my_side?.players?.length ?? 0} player{evaluation.my_side?.players?.length !== 1 ? 's' : ''}
                        {evaluation.my_side?.picks?.length > 0 && ` · ${evaluation.my_side.picks.length} pick${evaluation.my_side.picks.length !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <div className="rounded-lg bg-green-500/5 border border-green-500/15 px-3 py-2">
                      <div className="text-[11px] text-gray-500 mb-0.5">You get</div>
                      <div className="text-xl font-mono font-bold text-green-400">
                        {fmtVal(evaluation.their_side?.total)}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-1">
                        {evaluation.their_side?.players?.length ?? 0} player{evaluation.their_side?.players?.length !== 1 ? 's' : ''}
                        {evaluation.their_side?.picks?.length > 0 && ` · ${evaluation.their_side.picks.length} pick${evaluation.their_side.picks.length !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                  </div>

                  {/* Age delta */}
                  {(evaluation.avg_age_giving > 0 || evaluation.avg_age_getting > 0) && (
                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-800">
                      <span>
                        Avg age giving:{' '}
                        <span className="text-gray-300 font-mono">{evaluation.avg_age_giving || '—'}</span>
                      </span>
                      <span>
                        Avg age getting:{' '}
                        <span className="text-gray-300 font-mono">{evaluation.avg_age_getting || '—'}</span>
                      </span>
                      {evaluation.age_delta !== 0 && (
                        <span className={evaluation.age_delta < 0 ? 'text-green-400' : 'text-orange-400'}>
                          {evaluation.age_delta < 0
                            ? `↓ ${Math.abs(evaluation.age_delta)} yrs younger`
                            : `↑ ${evaluation.age_delta} yrs older`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Roster projection */}
          {showProjection && myRoster && (
            <RosterProjection myRoster={myRoster} giving={giving} getting={getting} />
          )}

          {/* Clear trade */}
          {hasTrade && (
            <div className="flex justify-end">
              <button
                onClick={clearTrade}
                className="btn-ghost btn-sm text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Clear trade
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
