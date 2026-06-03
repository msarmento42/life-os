import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
  LineChart, Line, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Zap, Activity } from 'lucide-react'

function fmt(n, sign = false) {
  const prefix = sign && n > 0 ? '+' : ''
  if (Math.abs(n) >= 1_000_000) return `${prefix}$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `${prefix}$${(n / 1_000).toFixed(1)}K`
  return `${prefix}$${n?.toFixed(0) ?? '0'}`
}

function fmtPct(n) {
  return `${n > 0 ? '+' : ''}${n?.toFixed(1) ?? '0'}%`
}

const VelocityTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const delta = payload.find(p => p.dataKey === 'delta')
  const accel = payload.find(p => p.dataKey === 'acceleration')
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <p className="text-gray-400 font-medium mb-2">{label}</p>
      {delta && (
        <div className="flex items-center justify-between gap-4 mb-1">
          <span className="text-gray-400">Monthly Gain</span>
          <span className={`font-semibold font-mono ${delta.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(delta.value, true)}
          </span>
        </div>
      )}
      {accel && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-400">Acceleration</span>
          <span className={`font-semibold font-mono ${accel.value >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            {fmt(accel.value, true)}
          </span>
        </div>
      )}
    </div>
  )
}

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  const pct = payload[0]?.payload?.delta_pct ?? 0
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <p className="text-gray-400 font-medium mb-1">{label}</p>
      <p className={`font-semibold font-mono ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {fmt(val, true)}
      </p>
      <p className={`font-mono mt-0.5 ${val >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
        {fmtPct(pct)}
      </p>
    </div>
  )
}

function TrendBadge({ trend }) {
  if (trend === 'accelerating') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 rounded-full px-2.5 py-0.5">
      <TrendingUp className="w-3 h-3" /> Accelerating
    </span>
  )
  if (trend === 'decelerating') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-400/10 rounded-full px-2.5 py-0.5">
      <TrendingDown className="w-3 h-3" /> Decelerating
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-400/10 rounded-full px-2.5 py-0.5">
      <Minus className="w-3 h-3" /> Stable
    </span>
  )
}

export default function NetWorthVelocity() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('velocity') // 'velocity' | 'combined'

  useEffect(() => {
    axios.get('/api/finance/net-worth-velocity')
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-72 rounded-xl" />
        <div className="skeleton h-48 rounded-xl" />
      </div>
    )
  }

  if (!data || data.total_months === 0) {
    return (
      <div className="card text-center py-16 text-gray-500">
        <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <div className="text-sm font-medium text-gray-400 mb-1">No velocity data yet</div>
        <div className="text-xs text-gray-600">
          Net worth snapshots are created when you add or update accounts.<br />
          Add accounts and update their balances over time to see velocity.
        </div>
      </div>
    )
  }

  const {
    months,
    avg_velocity,
    current_velocity,
    current_acceleration,
    trend,
    best_month,
    worst_month,
  } = data

  // Short month labels for X axis
  const chartData = months.map(m => ({
    ...m,
    label: m.month.slice(5) + ' ' + m.month.slice(2, 4), // "01 26"
  }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="section-title">Net Worth Velocity</div>
          <div className="text-xs text-gray-500 mt-0.5">Monthly rate of change and acceleration</div>
        </div>
        <TrendBadge trend={trend} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">Current Velocity</span>
          </div>
          <div className={`text-xl font-bold font-mono ${current_velocity >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(current_velocity, true)}
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">this month vs. last</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">Acceleration</span>
          </div>
          <div className={`text-xl font-bold font-mono ${current_acceleration >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            {fmt(current_acceleration, true)}
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">change in velocity</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">Avg Monthly</span>
          </div>
          <div className={`text-xl font-bold font-mono ${avg_velocity >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(avg_velocity, true)}
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">over {data.total_months} months</div>
        </div>

        <div className="card space-y-1.5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Range</div>
          {best_month && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Best</span>
              <span className="font-mono text-emerald-400 font-semibold">{fmt(best_month.delta, true)}</span>
            </div>
          )}
          {worst_month && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Worst</span>
              <span className="font-mono text-red-400 font-semibold">{fmt(worst_month.delta, true)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart with toggle */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-gray-300">Monthly Velocity</div>
          <div className="flex gap-1">
            <button
              className={`text-xs px-3 py-1 rounded-md transition-colors ${view === 'velocity' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => setView('velocity')}
            >
              Velocity
            </button>
            <button
              className={`text-xs px-3 py-1 rounded-md transition-colors ${view === 'combined' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => setView('combined')}
            >
              + Acceleration
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          {view === 'velocity' ? (
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => {
                  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}K`
                  return `$${v}`
                }}
                width={55}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
              <Bar dataKey="delta" name="Monthly Gain" radius={[3, 3, 0, 0]} animationDuration={800}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.delta >= 0 ? '#10b981' : '#ef4444'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => {
                  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}K`
                  return `$${v}`
                }}
                width={55}
              />
              <Tooltip content={<VelocityTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={v => <span style={{ color: '#9ca3af' }}>{v}</span>}
              />
              <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="delta"
                name="Velocity (Monthly Gain)"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5 }}
                animationDuration={800}
              />
              <Line
                type="monotone"
                dataKey="acceleration"
                name="Acceleration"
                stroke="#60a5fa"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ fill: '#60a5fa', r: 3 }}
                activeDot={{ r: 5 }}
                animationDuration={800}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Monthly table */}
      <div className="card overflow-x-auto">
        <div className="text-sm font-medium text-gray-300 mb-3">Month-by-Month Breakdown</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 pr-3 text-gray-500 font-semibold uppercase tracking-wide">Month</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold uppercase tracking-wide">Net Worth</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold uppercase tracking-wide">Velocity</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold uppercase tracking-wide">% Change</th>
              <th className="text-right py-2 pl-3 text-gray-500 font-semibold uppercase tracking-wide">Acceleration</th>
            </tr>
          </thead>
          <tbody>
            {[...months].reverse().map((m, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="py-2 pr-3 text-gray-300 font-medium">{m.month}</td>
                <td className="py-2 px-3 text-right font-mono text-gray-200">{fmt(m.net_worth)}</td>
                <td className={`py-2 px-3 text-right font-mono font-semibold ${m.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmt(m.delta, true)}
                </td>
                <td className={`py-2 px-3 text-right font-mono ${m.delta_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {fmtPct(m.delta_pct)}
                </td>
                <td className={`py-2 pl-3 text-right font-mono ${m.acceleration >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                  {m.acceleration === 0 ? '—' : fmt(m.acceleration, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
