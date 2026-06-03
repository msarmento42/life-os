import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Package, TrendingUp, TrendingDown, ArrowLeftRight, RefreshCw, Trophy } from 'lucide-react'
import { SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVal(v) {
  if (!v || v === 0) return '—'
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
}

const ROUND_COLOR = {
  1: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  2: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  3: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  4: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
}

function RoundBadge({ round }) {
  const cls = ROUND_COLOR[round] || ROUND_COLOR[4]
  const label = round === 1 ? 'R1' : round === 2 ? 'R2' : round === 3 ? 'R3' : `R${round}`
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>
      {label}
    </span>
  )
}

function ValueBar({ value, max = 8000 }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const color = pct > 66 ? 'bg-yellow-500' : pct > 33 ? 'bg-blue-500' : 'bg-gray-500'
  return (
    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── My Picks section ──────────────────────────────────────────────────────────

function MyPickCard({ pick, onAddToBuilder }) {
  return (
    <div className="flex items-center gap-3 bg-gray-800/60 rounded-xl px-3 py-2.5 border border-gray-700/50 hover:border-gray-600 transition-colors">
      <RoundBadge round={pick.round} />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-100">
          {pick.season} Round {pick.round}
        </div>
        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
          {pick.is_own_pick ? (
            <span className="text-green-400/80">Own pick</span>
          ) : (
            <>
              <span className="text-purple-400/80">Acquired</span>
              <span className="text-gray-600">·</span>
              <span>from {pick.original_owner_name || 'another team'}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-mono text-gray-200">{fmtVal(pick.est_value)}</div>
          <ValueBar value={pick.est_value} />
        </div>
        <button
          onClick={() => onAddToBuilder(pick)}
          className="text-[11px] px-2 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors whitespace-nowrap"
        >
          + Builder
        </button>
      </div>
    </div>
  )
}

// ── League Pick Board (all picks in league by round) ──────────────────────────

function PickBoardRow({ pick, myRosterId }) {
  const isMine = pick.is_mine
  const isOwnPick = pick.original_roster_id === myRosterId

  return (
    <tr className={`border-b border-gray-800/60 text-sm transition-colors ${isMine ? 'bg-green-900/10' : 'hover:bg-gray-800/30'}`}>
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <RoundBadge round={pick.round} />
          <span className="text-gray-200 font-medium">{pick.season} R{pick.round}</span>
        </div>
      </td>
      <td className="py-2 px-3 text-gray-400 text-xs">{pick.original_owner_name}</td>
      <td className="py-2 px-3">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium ${isMine ? 'text-green-300' : 'text-gray-300'}`}>
            {pick.current_owner_name}
          </span>
          {isMine && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/20">YOU</span>
          )}
        </div>
        {!isOwnPick && isMine && (
          <div className="text-[10px] text-purple-400/70 mt-0.5">acquired</div>
        )}
        {isOwnPick && !isMine && (
          <div className="text-[10px] text-orange-400/70 mt-0.5">traded away</div>
        )}
      </td>
      <td className="py-2 px-3 text-right">
        <span className="text-xs font-mono text-gray-300">{fmtVal(pick.est_value)}</span>
      </td>
    </tr>
  )
}

function PickBoard({ allPicks, myRosterId }) {
  const rounds = [...new Set(allPicks.map(p => p.round))].sort()
  const seasons = [...new Set(allPicks.map(p => p.season))].sort()

  if (allPicks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 text-sm">No pick data — run Sync to load picks.</div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700/60 bg-gray-800/40">
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Pick</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Original</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Current Owner</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Est. Value</th>
          </tr>
        </thead>
        <tbody>
          {allPicks.map((p, i) => (
            <PickBoardRow key={i} pick={p} myRosterId={myRosterId} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Value summary cards ───────────────────────────────────────────────────────

function PickSummaryCard({ label, value, sub, accent = 'green' }) {
  const colors = {
    green:  'text-green-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
  }
  return (
    <div className="card text-center">
      <div className={`text-2xl font-bold font-mono ${colors[accent]}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
      {sub && <div className="text-[11px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Picks({ dash, loading, onSync }) {
  const navigate = useNavigate()
  const [selectedLeague, setSelectedLeague] = useState(null)
  const [myPicks, setMyPicks] = useState([])
  const [allPicks, setAllPicks] = useState(null)  // null = not loaded
  const [picksLoading, setPicksLoading] = useState(false)
  const [showBoard, setShowBoard] = useState(false)

  const leagues = (dash?.leagues) || []

  // Auto-select first league
  useEffect(() => {
    if (leagues.length && !selectedLeague) {
      setSelectedLeague(leagues[0].league_id)
    }
  }, [leagues])

  // Load picks when league changes
  useEffect(() => {
    if (!selectedLeague) return
    setPicksLoading(true)
    setMyPicks([])
    setAllPicks(null)

    Promise.all([
      axios.get(`/api/fantasy/league/${selectedLeague}/picks`),
      axios.get(`/api/fantasy/league/${selectedLeague}/all-picks`),
    ]).then(([myRes, allRes]) => {
      setMyPicks(myRes.data || [])
      setAllPicks(allRes.data || { picks: [], my_roster_id: null })
    }).catch(() => {
      setMyPicks([])
      setAllPicks({ picks: [], my_roster_id: null })
    }).finally(() => setPicksLoading(false))
  }, [selectedLeague])

  const handleAddToBuilder = (pick) => {
    navigate('/fantasy/builder', {
      state: {
        preloadPick: {
          _uid:      `pick-${pick.label}-${Date.now()}`,
          is_pick:   true,
          position:  'PICK',
          name:      pick.label,
          label:     pick.label,
          season:    pick.season,
          round:     pick.round,
          est_value: pick.est_value,
        },
        preloadLeague: selectedLeague,
      }
    })
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="space-y-4">
      {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
    </div>
  )

  if (!dash || dash.status === 'not_synced') return (
    <EmptyState
      icon={Package}
      title="No fantasy data yet"
      description="Sync your Sleeper leagues to view pick inventory."
      action={{ label: 'Sync Now', onClick: onSync }}
    />
  )

  if (leagues.length === 0) return (
    <EmptyState icon={Trophy} title="No leagues found" description="Run Sync to load your leagues." />
  )

  // ── Derived values ────────────────────────────────────────────────────────

  const totalMyValue    = myPicks.reduce((s, p) => s + (p.est_value || 0), 0)
  const acquiredPicks   = myPicks.filter(p => !p.is_own_pick)
  const ownPicks        = myPicks.filter(p => p.is_own_pick)
  const currentLeague   = leagues.find(l => l.league_id === selectedLeague)
  const boardPicks      = allPicks?.picks || []
  const myRosterIdBoard = allPicks?.my_roster_id

  // picks I traded away but still in the league
  const tradedAwayPicks = boardPicks.filter(p => p.original_roster_id === myRosterIdBoard && !p.is_mine)

  return (
    <div className="space-y-6">

      {/* League selector */}
      <div>
        <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">League</div>
        <div className="flex gap-2 flex-wrap">
          {leagues.map(l => (
            <button
              key={l.league_id}
              onClick={() => setSelectedLeague(l.league_id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                selectedLeague === l.league_id
                  ? 'bg-green-500/20 text-green-300 border-green-500/40'
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

      {picksLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            <PickSummaryCard
              label="My picks"
              value={myPicks.length}
              sub={`${ownPicks.length} own · ${acquiredPicks.length} acquired`}
              accent="green"
            />
            <PickSummaryCard
              label="Total value"
              value={fmtVal(totalMyValue)}
              sub="estimated"
              accent="yellow"
            />
            <PickSummaryCard
              label="Traded away"
              value={tradedAwayPicks.length}
              sub={tradedAwayPicks.length > 0 ? 'in others\' hands' : 'none'}
              accent="purple"
            />
          </div>

          {/* My picks */}
          <div>
            <div className="section-header mb-3">My Picks — {currentLeague?.league_name}</div>
            {myPicks.length === 0 ? (
              <div className="card text-center py-8">
                <Package className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <div className="text-sm text-gray-500">No picks found for this league.</div>
                <div className="text-xs text-gray-600 mt-1">Run Sync to pull your pick inventory from Sleeper.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {myPicks.map((pick, i) => (
                  <MyPickCard key={i} pick={pick} onAddToBuilder={handleAddToBuilder} />
                ))}
              </div>
            )}
          </div>

          {/* Traded away */}
          {tradedAwayPicks.length > 0 && (
            <div>
              <div className="section-header mb-3 text-orange-400/70">Picks You Traded Away</div>
              <div className="space-y-2">
                {tradedAwayPicks.map((pick, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-800/30 rounded-xl px-3 py-2.5 border border-orange-500/10">
                    <RoundBadge round={pick.round} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-300">{pick.season} Round {pick.round}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">Now held by <span className="text-orange-300/70">{pick.current_owner_name}</span></div>
                    </div>
                    <span className="text-xs font-mono text-gray-500">{fmtVal(pick.est_value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* League pick board toggle */}
          <div>
            <button
              onClick={() => setShowBoard(v => !v)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {showBoard ? 'Hide' : 'Show'} full league pick board
              <span className="text-gray-700">({boardPicks.length} picks)</span>
            </button>

            {showBoard && (
              <PickBoard allPicks={boardPicks} myRosterId={myRosterIdBoard} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
