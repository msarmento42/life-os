import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  PieChart, Pie, Cell, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { Target, TrendingUp, AlertTriangle, CheckCircle2, Clock, DollarSign, Zap, AlertCircle } from 'lucide-react'

function fmt(n) {
  if (n == null) return '—'
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${Math.round(n).toLocaleString()}`
}

function fmtFull(n) {
  if (n == null) return '—'
  return `$${Math.round(n).toLocaleString()}`
}

const STATUS_CONFIG = {
  on_track: { label: 'On Track', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 },
  funded: { label: 'Funded', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: TrendingUp },
  at_risk: { label: 'At Risk', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: AlertTriangle },
  underfunded: { label: 'Underfunded', color: 'text-red-400', bg: 'bg-red-400/10', icon: AlertCircle },
  complete: { label: 'Complete', color: 'text-emerald-300', bg: 'bg-emerald-300/10', icon: CheckCircle2 },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.funded
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  )
}

const AlignmentTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="flex items-center gap-2 mb-1">
        <span>{d.icon}</span>
        <span className="text-gray-100 font-semibold">{d.name}</span>
      </div>
      <div className="text-gray-400">Monthly: <span className="text-gray-100 font-mono">{fmt(d.value)}</span></div>
      <div className="text-gray-400">% of surplus: <span className="text-gray-100 font-mono">{d.pct_of_surplus}%</span></div>
    </div>
  )
}

function SurplusDonut({ goals, unallocated, surplus }) {
  const data = [
    ...goals.filter(g => g.monthly_allocation > 0).map(g => ({
      name: g.name,
      icon: g.icon,
      value: g.monthly_allocation,
      fill: g.color,
      pct_of_surplus: g.pct_of_surplus,
    })),
    ...(unallocated > 0 ? [{
      name: 'Unallocated',
      icon: '💸',
      value: unallocated,
      fill: '#374151',
      pct_of_surplus: surplus > 0 ? Math.round(unallocated / surplus * 100) : 0,
    }] : []),
  ]

  if (!data.length) return null

  return (
    <div className="card">
      <div className="section-title mb-4">Surplus Distribution</div>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={700}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <RTooltip content={<AlignmentTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
              <span className="text-xs text-gray-300 flex-1 truncate">{d.icon} {d.name}</span>
              <span className="text-xs font-mono text-gray-400">{fmt(d.value)}</span>
              <span className="text-xs font-semibold text-gray-500 w-10 text-right">{d.pct_of_surplus}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GoalCard({ g, surplus }) {
  const cfg = STATUS_CONFIG[g.status] || STATUS_CONFIG.funded
  const barWidth = g.pct_of_surplus > 0 ? Math.min(100, g.pct_of_surplus) : 0

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl">{g.icon}</span>
          <div className="min-w-0">
            <div className="font-semibold text-gray-100 truncate">{g.name}</div>
            <StatusBadge status={g.status} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold text-gray-100">{fmt(g.monthly_allocation)}<span className="text-xs text-gray-500">/mo</span></div>
          <div className="text-xs text-gray-500">{g.pct_of_surplus}% of surplus</div>
        </div>
      </div>

      {/* Allocation bar vs surplus */}
      <div>
        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
          <span>Allocation share</span>
          <span>{g.pct_of_surplus}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${barWidth}%`, backgroundColor: g.color }}
          />
        </div>
      </div>

      {/* Goal progress */}
      <div>
        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
          <span>Goal progress — {fmtFull(g.current_amount)} of {fmtFull(g.target_amount)}</span>
          <span>{g.pct_complete}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${g.pct_complete}%`, backgroundColor: g.color, opacity: 0.5 }}
          />
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 pt-1 border-t border-gray-800/60 text-xs text-gray-500">
        {g.status === 'underfunded' ? (
          <span className="text-red-400">No monthly allocation set</span>
        ) : g.status === 'complete' ? (
          <span className="text-emerald-400">Goal reached! 🎉</span>
        ) : (
          <>
            {g.months_to_goal != null && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{g.months_to_goal}mo to goal</span>
                {g.projected_date && <span className="text-gray-600">({g.projected_date})</span>}
              </div>
            )}
            {g.target_date && (
              <div className="flex items-center gap-1 ml-auto">
                <span>Due {new Date(g.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function GoalAlignment() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/finance/goal-alignment')
        setData(res.data)
      } catch (e) {
        setError('Failed to load goal alignment data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="space-y-5">
      {[1, 2, 3].map(i => (
        <div key={i} className="card animate-pulse">
          <div className="h-4 bg-gray-800 rounded w-1/3 mb-3" />
          <div className="h-8 bg-gray-800 rounded w-1/2" />
        </div>
      ))}
    </div>
  )

  if (error) return (
    <div className="card text-center py-16 text-gray-500">
      <AlertCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
      <p>{error}</p>
    </div>
  )

  if (!data) return null

  const { monthly_income, monthly_expenses, monthly_surplus, total_allocated,
    total_unallocated, allocation_pct_of_surplus, goals,
    underfunded_count, at_risk_count } = data

  const hasAlerts = underfunded_count > 0 || at_risk_count > 0

  return (
    <div className="space-y-6">
      <div className="section-title">Goal-to-Spending Alignment</div>

      {/* Alert banner */}
      {hasAlerts && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-400/5 border border-amber-400/20 text-sm text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            {underfunded_count > 0 && <strong>{underfunded_count} goal{underfunded_count > 1 ? 's' : ''} underfunded</strong>}
            {underfunded_count > 0 && at_risk_count > 0 && ' · '}
            {at_risk_count > 0 && <strong>{at_risk_count} goal{at_risk_count > 1 ? 's' : ''} at risk of missing deadline</strong>}
            {' — set monthly allocations in the Goals tab.'}
          </span>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-xs text-gray-500 mb-1">Monthly Income</div>
          <div className="text-lg font-bold text-emerald-400">{fmt(monthly_income)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500 mb-1">Monthly Expenses</div>
          <div className="text-lg font-bold text-red-400">{fmt(monthly_expenses)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500 mb-1">Monthly Surplus</div>
          <div className={`text-lg font-bold ${monthly_surplus >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{fmt(monthly_surplus)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500 mb-1">Allocated to Goals</div>
          <div className="text-lg font-bold text-violet-400">{fmt(total_allocated)}</div>
          <div className="text-xs text-gray-600 mt-0.5">{allocation_pct_of_surplus}% of surplus</div>
        </div>
      </div>

      {/* Surplus allocation meter */}
      {monthly_surplus > 0 && (
        <div className="card">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span className="font-medium">Surplus allocation</span>
            <span>{fmt(total_allocated)} allocated · {fmt(total_unallocated)} unallocated</span>
          </div>
          <div className="h-3 rounded-full bg-gray-800 overflow-hidden flex">
            {goals.filter(g => g.monthly_allocation > 0).map((g, i) => (
              <div
                key={g.id}
                className="h-full transition-all duration-700 first:rounded-l-full"
                style={{
                  width: `${g.pct_of_surplus}%`,
                  backgroundColor: g.color,
                }}
                title={`${g.name}: ${fmt(g.monthly_allocation)}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>{allocation_pct_of_surplus}% allocated to goals</span>
            <span>{monthly_surplus > 0 ? Math.round(total_unallocated / monthly_surplus * 100) : 0}% unallocated</span>
          </div>
        </div>
      )}

      {/* Donut + goal cards */}
      {goals.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">
          <Target className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="mb-1">No savings goals found.</p>
          <p className="text-sm">Create goals in the <strong className="text-gray-400">Goals</strong> tab and set monthly allocations to see alignment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Donut — takes one column */}
          <SurplusDonut goals={goals} unallocated={total_unallocated} surplus={monthly_surplus} />

          {/* Goal cards — fill remaining 2 columns */}
          <div className="col-span-2 grid grid-cols-2 gap-4 content-start">
            {goals.map(g => (
              <GoalCard key={g.id} g={g} surplus={monthly_surplus} />
            ))}
          </div>
        </div>
      )}

      {monthly_surplus <= 0 && goals.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-400/5 border border-red-400/20 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Monthly surplus is <strong>{fmt(monthly_surplus)}</strong> — recurring expenses exceed income. Add recurring income items or reduce expenses to enable goal funding.</span>
        </div>
      )}
    </div>
  )
}
