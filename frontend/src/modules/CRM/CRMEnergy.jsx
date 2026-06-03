import { useState, useEffect } from 'react'
import axios from 'axios'
import { Zap, TrendingDown, Minus } from 'lucide-react'
import { SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

function QualityBar({ score, color }) {
  const pct = Math.min((score / 10) * 100, 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold w-7 text-right shrink-0" style={{ color }}>{score}</span>
    </div>
  )
}

function ContactRow({ contact, color }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/60 last:border-0">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: color + '20', color }}>
        {contact.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-200 truncate">{contact.name}</div>
        <div className="text-xs text-gray-500">{contact.interaction_count} interaction{contact.interaction_count !== 1 ? 's' : ''}</div>
      </div>
      <QualityBar score={contact.avg_quality} color={color} />
    </div>
  )
}

export default function CRMEnergy() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    axios.get('/api/crm/energy-analysis')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <SkeletonCard key={i} />)}</div>
      </div>
    )
  }

  if (!data) return null

  const { energizers, drainers, neutral, summary } = data
  const hasAny = energizers.length + drainers.length + neutral.length > 0

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card border-l-4 border-emerald-500">
          <div className="stat-label">Energizers</div>
          <div className="stat-value text-emerald-400">{summary.total_energizers}</div>
          {summary.top_energizer && (
            <div className="stat-sub truncate">Top: {summary.top_energizer}</div>
          )}
        </div>
        <div className="stat-card border-l-4 border-gray-600">
          <div className="stat-label">Neutral</div>
          <div className="stat-value text-gray-400">{summary.total_neutral}</div>
          <div className="stat-sub">avg quality 5–7</div>
        </div>
        <div className="stat-card border-l-4 border-red-500">
          <div className="stat-label">Drainers</div>
          <div className="stat-value text-red-400">{summary.total_drainers}</div>
          {summary.top_drainer && (
            <div className="stat-sub truncate">Top: {summary.top_drainer}</div>
          )}
        </div>
      </div>

      {!hasAny ? (
        <EmptyState
          icon={Zap}
          title="No interaction data yet"
          description="Log interactions with quality scores to see energy analysis."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Energizers */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="card-title text-emerald-400">Energizers</h3>
              </div>
              <span className="text-xs text-gray-500">avg quality ≥ 7/10</span>
            </div>
            {energizers.length === 0 ? (
              <div className="text-sm text-gray-600 py-4 text-center">None yet</div>
            ) : (
              <div>
                {energizers.map(c => (
                  <ContactRow key={c.contact_id} contact={c} color="#10b981" />
                ))}
              </div>
            )}
          </div>

          {/* Drainers */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <h3 className="card-title text-red-400">Drainers</h3>
              </div>
              <span className="text-xs text-gray-500">avg quality ≤ 5/10</span>
            </div>
            {drainers.length === 0 ? (
              <div className="text-sm text-gray-600 py-4 text-center">None yet</div>
            ) : (
              <div>
                {drainers.map(c => (
                  <ContactRow key={c.contact_id} contact={c} color="#ef4444" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Neutral tier */}
      {neutral.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Minus className="w-4 h-4 text-gray-400" />
              <h3 className="card-title">Neutral</h3>
            </div>
            <span className="text-xs text-gray-500">avg quality 5–7</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
            {neutral.map(c => (
              <ContactRow key={c.contact_id} contact={c} color="#6b7280" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
