import { useState, useEffect } from 'react'
import axios from 'axios'
import { ArrowRight, TrendingUp, TrendingDown, Trophy, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
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

function fmtVal(v) {
  if (!v) return '—'
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
}

function VerdictChip({ pct }) {
  if (pct >= 8)       return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-500/20 text-green-300 border border-green-500/30">WIN</span>
  if (pct >= -8)      return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">FAIR</span>
  return               <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">LOSS</span>
}

function PlayerChip({ player }) {
  const posClass = POS_COLORS[player.position] || 'bg-gray-700 text-gray-300 border-gray-600'
  return (
    <div className="flex items-center gap-1.5 bg-gray-800/60 rounded-lg px-2 py-1.5 shrink-0">
      <span className={`text-[10px] font-bold px-1 py-0.5 rounded border ${posClass}`}>
        {player.position}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-gray-100 whitespace-nowrap">{player.name}</div>
        <div className="text-[10px] text-green-400 font-mono">{fmtVal(player.adj_value)}</div>
      </div>
    </div>
  )
}

function whyTheyAccept(proposal) {
  const { sell_positions, buy_positions, targets, offers, balance_pct, age_delta } = proposal

  const lines = []

  // Value framing
  if (balance_pct >= 8) {
    lines.push(`You're offering fair value — they're not giving up much in return.`)
  } else if (balance_pct >= 0) {
    lines.push(`This is roughly even in value, making it easy for them to say yes.`)
  } else {
    lines.push(`You're overpaying slightly — that gives them extra incentive to accept.`)
  }

  // Position need
  if (sell_positions.length > 0) {
    lines.push(`They're weak at ${sell_positions.join('/')} — ${offers.map(p => p.name).join(' & ')} directly fills that gap.`)
  }

  // Age framing
  if (age_delta < -1) {
    lines.push(`They're trading youth for a win-now piece, which may fit their timeline.`)
  } else if (age_delta > 1) {
    lines.push(`They get younger in return — a dynasty-friendly outcome on their end.`)
  }

  return lines
}

function ProposalCard({ proposal, leagueId, leagueFormat }) {
  const [expanded, setExpanded] = useState(false)
  const { other_team, targets, offers, target_value, offer_value, balance_pct, avg_offer_age, avg_target_age, age_delta, buy_positions, sell_positions } = proposal
  const reasons = whyTheyAccept(proposal)

  return (
    <div className="card hover:border-green-500/20 transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500 font-medium">vs.</span>
            <span className="text-sm font-semibold text-gray-100 truncate">{other_team}</span>
          </div>
          {/* Position tags */}
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-[10px] text-gray-500">You need:</span>
            {buy_positions.map(pos => (
              <span key={pos} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${POS_COLORS[pos] || 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                {pos}
              </span>
            ))}
            <span className="text-[10px] text-gray-600 mx-1">·</span>
            <span className="text-[10px] text-gray-500">They need:</span>
            {sell_positions.map(pos => (
              <span key={pos} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${POS_COLORS[pos] || 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                {pos}
              </span>
            ))}
          </div>
        </div>

        {/* Verdict + value delta */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <VerdictChip pct={balance_pct} />
          <div className={`text-xs font-mono font-bold ${balance_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {balance_pct >= 0 ? '+' : ''}{balance_pct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Trade arrows */}
      <div className="mt-3 flex items-center gap-2">
        {/* You give */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-400" />
            You give
          </div>
          <div className="flex flex-wrap gap-1.5">
            {offers.map(p => <PlayerChip key={p.sleeper_id || p.name} player={p} />)}
          </div>
          <div className="text-[10px] text-gray-600 mt-1 font-mono">{fmtVal(offer_value)} total</div>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center gap-1 shrink-0 px-1">
          <ArrowRight className="w-4 h-4 text-gray-600" />
        </div>

        {/* You get */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            You get
          </div>
          <div className="flex flex-wrap gap-1.5">
            {targets.map(p => <PlayerChip key={p.sleeper_id || p.name} player={p} />)}
          </div>
          <div className="text-[10px] text-gray-600 mt-1 font-mono">{fmtVal(target_value)} total</div>
        </div>
      </div>

      {/* Age delta */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <div>
          Avg age giving: <span className="text-gray-300 font-mono">{avg_offer_age || '—'}</span>
        </div>
        <div>
          Avg age getting: <span className="text-gray-300 font-mono">{avg_target_age || '—'}</span>
        </div>
        {age_delta !== 0 && (
          <div className={age_delta < 0 ? 'text-green-400' : 'text-orange-400'}>
            {age_delta < 0 ? `↓ ${Math.abs(age_delta).toFixed(1)} yrs younger` : `↑ ${age_delta.toFixed(1)} yrs older`}
          </div>
        )}
      </div>

      {/* Why they'd accept — expandable */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="mt-3 w-full text-left text-[11px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Why would they accept?
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-green-500/20">
          {reasons.map((line, i) => (
            <p key={i} className="text-xs text-gray-400">{line}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function LeagueProposalSection({ league }) {
  const [proposals, setProposals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    axios.get(`/api/fantasy/league/${league.league_id}/proposals?top_n=5`)
      .then(r => setProposals(r.data.proposals || []))
      .catch(() => setError('Failed to load proposals'))
      .finally(() => setLoading(false))
  }, [league.league_id])

  return (
    <div className="space-y-3">
      {/* League header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5 text-green-400" />
          </div>
          <span className="font-semibold text-gray-100">{league.league_name}</span>
          <span className="text-xs text-gray-500">{league.format} · {league.team_name}</span>
        </div>
        <div className="flex items-center gap-2">
          {!loading && proposals && (
            <span className="text-xs text-gray-600">{proposals.length} proposal{proposals.length !== 1 ? 's' : ''}</span>
          )}
          <span className={`text-gray-500 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 pl-0">
          {loading && <SkeletonCard />}

          {!loading && error && (
            <div className="text-xs text-red-400 px-3">{error}</div>
          )}

          {!loading && !error && proposals?.length === 0 && (
            <div className="card text-sm text-gray-500 text-center py-6">
              No trade proposals found — try syncing to refresh roster data.
            </div>
          )}

          {!loading && !error && proposals?.map((proposal, i) => (
            <ProposalCard
              key={i}
              proposal={proposal}
              leagueId={league.league_id}
              leagueFormat={league.format}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TradeProposals({ dash, loading, onSync }) {
  if (loading) return (
    <div className="space-y-4">
      {[0, 1].map(i => <SkeletonCard key={i} />)}
    </div>
  )

  if (!dash || dash.status === 'not_synced') return (
    <EmptyState
      icon={Trophy}
      title="No fantasy data yet"
      description="Sync your Sleeper leagues to generate trade proposals."
      action={{ label: 'Sync Now', onClick: onSync }}
    />
  )

  if (!dash.leagues?.length) return (
    <EmptyState
      icon={Trophy}
      title="No leagues found"
      description="No leagues were returned from sync. Try syncing again."
      action={{ label: 'Sync', onClick: onSync }}
    />
  )

  return (
    <div className="space-y-8">
      <div className="text-sm text-gray-500">
        Auto-generated proposals based on your roster strengths and opponents' positional needs. Proposals target teams with inverse position gaps — sorted by value gain + age improvement.
      </div>

      {dash.leagues.map(league => (
        <LeagueProposalSection key={league.league_id} league={league} />
      ))}
    </div>
  )
}
