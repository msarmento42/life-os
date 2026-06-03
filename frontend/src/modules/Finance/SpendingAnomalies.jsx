import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react'

function fmt(n) {
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n?.toFixed(0) ?? '0'}`
}

function AnomalyBadge({ direction, z_score }) {
  if (direction === 'high') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-400/10 rounded-full px-2 py-0.5">
        <TrendingUp className="w-2.5 h-2.5" /> +{Math.abs(z_score).toFixed(1)}σ high
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-400/10 rounded-full px-2 py-0.5">
      <TrendingDown className="w-2.5 h-2.5" /> {Math.abs(z_score).toFixed(1)}σ low
    </span>
  )
}

const AnomalyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <p className="text-gray-400 font-medium mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Actual</span>
          <span className="font-mono font-semibold text-gray-100">{fmt(d?.spend ?? 0)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">6-mo Avg</span>
          <span className="font-mono text-gray-400">{fmt(d?.mean ?? 0)}</span>
        </div>
        {d?.flagged && (
          <div className="flex justify-between gap-4 pt-1 border-t border-gray-700/50">
            <span className="text-gray-400">Z-score</span>
            <span className={`font-mono font-semibold ${d.z_score > 0 ? 'text-red-400' : 'text-blue-400'}`}>
              {d.z_score > 0 ? '+' : ''}{d.z_score?.toFixed(2)}σ
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryChart({ history }) {
  const chartData = history.map(h => ({
    ...h,
    label: h.month.slice(5) + ' ' + h.month.slice(2, 4),
  }))

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 2 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#6b7280', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip content={<AnomalyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="spend" radius={[3, 3, 0, 0]} animationDuration={600}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.flagged
                ? (entry.z_score > 0 ? '#ef4444' : '#3b82f6')
                : '#4b5563'}
              fillOpacity={entry.flagged ? 0.9 : 0.5}
            />
          ))}
        </Bar>
        {/* Mean reference line — approximate from last known mean */}
        {chartData.length > 0 && chartData[chartData.length - 1].mean > 0 && (
          <ReferenceLine
            y={chartData[chartData.length - 1].mean}
            stroke="#6b7280"
            strokeDasharray="4 2"
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function SpendingAnomalies() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'high' | 'low'
  const [selectedCat, setSelectedCat] = useState(null)

  useEffect(() => {
    axios.get('/api/finance/spending-anomalies')
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-48 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card text-center py-16 text-gray-500">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <div className="text-sm font-medium text-gray-400">Failed to load anomaly data</div>
      </div>
    )
  }

  const { anomalies, category_histories, total_anomalies } = data

  const filteredAnomalies = anomalies.filter(a =>
    filter === 'all' || a.direction === filter
  )

  const highCount = anomalies.filter(a => a.direction === 'high').length
  const lowCount = anomalies.filter(a => a.direction === 'low').length

  // Categories with any anomaly in their history
  const anomalyCatIds = new Set(anomalies.map(a => a.id))
  const historiesWithAnomalies = category_histories.filter(c => anomalyCatIds.has(c.id))
  const displayHistory = selectedCat
    ? category_histories.filter(c => c.id === selectedCat)
    : historiesWithAnomalies.slice(0, 6)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="section-title">Spending Anomalies</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Categories where monthly spend deviates &gt;2σ from rolling 6-month average
          </div>
        </div>
        {total_anomalies > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-400/10 rounded-full px-2.5 py-1">
            <AlertTriangle className="w-3 h-3" /> {total_anomalies} flagged
          </span>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-bold font-mono text-amber-400">{total_anomalies}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Total Anomalies</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold font-mono text-red-400">{highCount}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Overspend</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold font-mono text-blue-400">{lowCount}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Underspend</div>
        </div>
      </div>

      {total_anomalies === 0 ? (
        <div className="card text-center py-14">
          <Activity className="w-10 h-10 mx-auto mb-3 text-emerald-400 opacity-50" />
          <div className="text-sm font-medium text-gray-400 mb-1">No anomalies detected</div>
          <div className="text-xs text-gray-600">
            All category spending is within 2σ of the rolling 6-month average.<br />
            More data over time will improve detection accuracy.
          </div>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: `All (${total_anomalies})` },
              { key: 'high', label: `Overspend (${highCount})` },
              { key: 'low', label: `Underspend (${lowCount})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                  filter === key
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Anomaly list */}
          <div className="card divide-y divide-gray-800/60">
            {filteredAnomalies.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">No anomalies match this filter.</div>
            ) : filteredAnomalies.map((a, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3 cursor-pointer hover:bg-gray-800/20 -mx-4 px-4 transition-colors rounded ${
                  selectedCat === a.id ? 'bg-gray-800/30' : ''
                }`}
                onClick={() => setSelectedCat(selectedCat === a.id ? null : a.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">{a.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">{a.name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{a.month}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className={`text-sm font-mono font-semibold ${a.direction === 'high' ? 'text-red-400' : 'text-blue-400'}`}>
                      {fmt(a.spend)}
                    </div>
                    <div className="text-[10px] text-gray-500">avg {fmt(a.mean)}</div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <AnomalyBadge direction={a.direction} z_score={a.z_score} />
                    <span className={`text-[10px] font-mono ${a.pct_vs_avg > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                      {a.pct_vs_avg > 0 ? '+' : ''}{a.pct_vs_avg}% vs avg
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Category charts — flagged categories only (or selected) */}
          {displayHistory.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-300">
                  {selectedCat ? 'Category Trend' : 'Flagged Category Trends'}
                </div>
                {selectedCat && (
                  <button
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    onClick={() => setSelectedCat(null)}
                  >
                    Show all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayHistory.map(cat => {
                  const catAnomalies = anomalies.filter(a => a.id === cat.id)
                  return (
                    <div
                      key={cat.id}
                      className="card cursor-pointer hover:border-gray-600 transition-colors"
                      style={{ borderColor: selectedCat === cat.id ? cat.color + '60' : undefined }}
                      onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cat.icon}</span>
                          <span className="text-xs font-semibold text-gray-300">{cat.name}</span>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {catAnomalies.slice(0, 3).map((a, i) => (
                            <AnomalyBadge key={i} direction={a.direction} z_score={a.z_score} />
                          ))}
                        </div>
                      </div>
                      <CategoryChart history={cat.history} />
                      <div className="flex justify-between text-[10px] text-gray-600 mt-1 px-1">
                        <span>Red = overspend · Blue = underspend · Dashed = 6-mo avg</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
