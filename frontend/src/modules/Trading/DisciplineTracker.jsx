import { useEffect, useState } from 'react'
import axios from 'axios'
import { CheckCircle2 } from 'lucide-react'
import EmptyState from '../../components/EmptyState'

const scoreTone = (score) => {
  if (score >= 80) return 'bg-emerald-400'
  if (score >= 60) return 'bg-yellow-400'
  return 'bg-red-400'
}

const scoreLabel = (score) => score === null || score === undefined ? 'No data' : `${score.toFixed(1)}%`

export default function DisciplineTracker() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await axios.get('/api/trading/discipline')
        setData(res.data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card h-28 animate-pulse" />
        {[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}
      </div>
    )
  }

  const strategies = data?.strategies?.filter(s => s.total_trades_logged > 0) || []
  const overall = data?.overall || { total_trades_logged: 0, followed_count: 0, overridden_count: 0, discipline_score: null }

  if (strategies.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No discipline data yet"
        description="Mark trades as followed or overridden to see your discipline score."
      />
    )
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="stat-card border-l-4 border-cyan-500">
        <div className="stat-label">Overall Discipline</div>
        <div className="stat-value text-cyan-400">
          {overall.total_trades_logged === 0 ? 'No data yet' : scoreLabel(overall.discipline_score)}
        </div>
        <div className="text-xs text-gray-500">
          {overall.followed_count} followed / {overall.overridden_count} overridden
        </div>
      </div>

      <div className="card space-y-4">
        <div className="section-title">Discipline by Strategy</div>
        {strategies.map(strategy => (
          <div key={strategy.strategy_id} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: strategy.strategy_color || '#22d3ee' }}
                  />
                  <span className="font-medium text-gray-100 truncate">{strategy.strategy_name}</span>
                </div>
                <div className="text-xs text-gray-500">({strategy.total_trades_logged} trades logged)</div>
              </div>
              <div className="font-mono text-sm font-semibold text-gray-100">
                {scoreLabel(strategy.discipline_score)}
              </div>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${scoreTone(strategy.discipline_score || 0)}`}
                style={{ width: `${strategy.discipline_score || 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
