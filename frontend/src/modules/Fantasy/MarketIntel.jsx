import { useEffect, useState } from 'react'
import axios from 'axios'
import { AlertCircle, BarChart3, RefreshCw } from 'lucide-react'

const positions = ['QB', 'RB', 'WR', 'TE']

function formatPremium(value) {
  const delta = Math.round(((value || 1) - 1) * 100)
  return `${delta >= 0 ? '+' : ''}${delta}%`
}

function barColor(value) {
  const delta = (value || 1) - 1
  if (delta >= 0.05) return 'bg-green-500'
  if (delta <= -0.05) return 'bg-red-500'
  return 'bg-gray-500'
}

function PremiumBar({ label, value }) {
  const delta = Math.max(-40, Math.min(40, Math.round(((value || 1) - 1) * 100)))
  const width = Math.max(8, Math.min(100, Math.abs(delta) * 2.5))

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-300">{label}</span>
        <span className={delta >= 5 ? 'text-green-400' : delta <= -5 ? 'text-red-400' : 'text-gray-400'}>
          {formatPremium(value)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${barColor(value)}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function LeagueCard({ league }) {
  const premiums = league.position_premiums || {}
  const divergences = league.notable_divergences || []
  const fairness = Math.max(0, Math.min(100, Math.round((league.fairness_score || 0) * 100)))

  return (
    <section className="panel p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{league.league_name}</h2>
          <p className="text-sm text-gray-400">{league.total_trades} trades analyzed</p>
        </div>
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-right">
          <div className="text-xl font-semibold text-green-400">{fairness}%</div>
          <div className="text-xs text-gray-400">fair trades</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {positions.map(pos => (
          <PremiumBar key={pos} label={pos} value={premiums[pos] || 1} />
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-300">Notable divergences</h3>
        {divergences.length > 0 ? (
          <ul className="space-y-2">
            {divergences.map(item => (
              <li key={`${league.league_id}-${item.position}`} className="flex items-center justify-between rounded-lg bg-gray-900 px-3 py-2 text-sm">
                <span className="text-gray-300">{item.position} market premium</span>
                <span className={item.premium >= 1 ? 'text-green-400' : 'text-red-400'}>
                  {formatPremium(item.premium)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No position premium has moved beyond 5% yet.</p>
        )}
      </div>
    </section>
  )
}

export default function MarketIntel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      await axios.post('/api/fantasy/sync-trades')
      const res = await axios.get('/api/fantasy/market-intel')
      setData(res.data)
    } catch {
      setError('Could not load market intel')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map(item => (
          <div key={item} className="panel p-4 space-y-4 animate-pulse">
            <div className="h-5 w-48 rounded bg-gray-800" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-8 rounded bg-gray-800" />
              <div className="h-8 rounded bg-gray-800" />
              <div className="h-8 rounded bg-gray-800" />
              <div className="h-8 rounded bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel p-6 flex items-center gap-3 text-red-300">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
        <button className="btn-secondary ml-auto flex items-center gap-2" onClick={load}>
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    )
  }

  const leagues = data?.leagues || []
  const totalTrades = leagues.reduce((sum, league) => sum + (league.total_trades || 0), 0)

  if (totalTrades === 0) {
    return (
      <div className="panel p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-400">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">No trade history yet</h2>
          <p className="text-sm text-gray-400">No trade history yet - click Sync above</p>
        </div>
        <button className="btn-secondary mx-auto flex items-center gap-2" onClick={load}>
          <RefreshCw className="w-4 h-4" />
          Sync trades
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {leagues.map(league => (
        <LeagueCard key={league.league_id} league={league} />
      ))}
    </div>
  )
}
