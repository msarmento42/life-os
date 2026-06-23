import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BadgeCheck, CircleDollarSign, Target, TrendingDown, TrendingUp } from 'lucide-react'

const cardClass = 'bg-gray-900 rounded-xl p-4 border border-gray-800'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const pct = (value) => `${Number(value || 0).toFixed(0)}%`

function Empty({ children }) {
  return <div className="text-sm text-gray-500 py-8 text-center">{children}</div>
}

function Badge({ tone = 'gray', children }) {
  const colors = {
    green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    red: 'bg-red-500/10 text-red-300 border-red-500/30',
    gray: 'bg-gray-800 text-gray-300 border-gray-700',
  }
  return <span className={`text-[11px] px-2 py-1 rounded-full border ${colors[tone]}`}>{children}</span>
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2 h-64 rounded-xl bg-gray-900 animate-pulse" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-72 rounded-xl bg-gray-900 animate-pulse" />
      ))}
    </div>
  )
}

function ProgressBar({ value }) {
  return (
    <div className="h-3 rounded bg-gray-700 overflow-hidden">
      <div className="h-full rounded bg-indigo-500" style={{ width: `${Math.min(Number(value || 0), 100)}%` }} />
    </div>
  )
}

function OkrProgress({ objectives }) {
  const now = new Date()
  const quarterLabel = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`

  return (
    <section className={`${cardClass} md:col-span-2 space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">OKR Progress - {quarterLabel}</h2>
          <p className="text-xs text-gray-500 mt-1">Quarterly objectives and key result progress.</p>
        </div>
        <Target className="w-5 h-5 text-indigo-400" />
      </div>

      {objectives.length === 0 ? (
        <Empty>No active objectives. Add objectives in the Projects module.</Empty>
      ) : (
        <div className="space-y-4">
          {objectives.map((objective) => (
            <div key={objective.id} className="rounded-lg bg-gray-950/60 border border-gray-800 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-gray-100">{objective.title}</div>
                  <div className="text-xs text-gray-500 capitalize">{objective.status}</div>
                </div>
                <div className="flex items-center gap-2">
                  {objective.ending_soon && <Badge tone="amber">Ending soon</Badge>}
                  {objective.post_mortem_needed && <Badge tone="red">Post-mortem needed</Badge>}
                  <span className="text-sm font-semibold text-gray-200">{pct(objective.pct)}</span>
                </div>
              </div>
              <ProgressBar value={objective.pct} />
              <details className="text-sm text-gray-400">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300">
                  {objective.key_results.length} key results
                </summary>
                <div className="mt-3 space-y-2">
                  {objective.key_results.map((kr) => (
                    <div key={kr.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-gray-300">{kr.title}</span>
                      <span className="text-gray-500 whitespace-nowrap">
                        {Number(kr.current_value || 0).toLocaleString()} / {Number(kr.target_value || 0).toLocaleString()} {kr.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function SavingsGoals({ goals }) {
  const radius = 38
  const circumference = 2 * Math.PI * radius

  return (
    <section className={`${cardClass} space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-100">Savings Goals</h2>
        <CircleDollarSign className="w-5 h-5 text-emerald-400" />
      </div>
      {goals.length === 0 ? (
        <Empty>No savings goals yet.</Empty>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const funded = Math.min(Number(goal.pct_funded || 0), 100)
            return (
              <div key={goal.id} className="flex items-center gap-4 rounded-lg bg-gray-950/60 border border-gray-800 p-3">
                <div className="relative w-24 h-24 shrink-0">
                  <svg viewBox="0 0 96 96" className="w-24 h-24 -rotate-90">
                    <circle cx="48" cy="48" r={radius} fill="none" stroke="#1f2937" strokeWidth="10" />
                    <circle
                      cx="48"
                      cy="48"
                      r={radius}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (funded / 100) * circumference}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-100">
                    {pct(funded)}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-100 truncate">{goal.title}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {currency.format(goal.current_amount || 0)} / {currency.format(goal.target_amount || 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">+{currency.format(goal.monthly_velocity || 0)}/mo</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={goal.on_track ? 'green' : 'red'}>{goal.on_track ? 'On track' : 'At risk'}</Badge>
                    {goal.months_to_goal !== null && goal.months_to_goal !== undefined && (
                      <span className="text-xs text-gray-500">{Number(goal.months_to_goal).toFixed(1)} months projected</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function TimeAlignment({ data }) {
  const rows = data.by_category || []

  return (
    <section className={`${cardClass} space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-100">Time vs. Priorities</h2>
        <TrendingUp className="w-5 h-5 text-indigo-400" />
      </div>
      {rows.length === 0 ? (
        <Empty>No time blocks logged this quarter.</Empty>
      ) : (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="category" tickFormatter={(value) => String(value).slice(0, 8)} stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="planned_hours" name="Planned" fill="#4b5563" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual_hours" name="Actual" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {data.top_misaligned && (
            <div className="flex items-center gap-2 text-sm text-amber-300">
              <AlertTriangle className="w-4 h-4" />
              Top mismatch: {data.top_misaligned}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function TradingReview({ strategies }) {
  return (
    <section className={`${cardClass} space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-100">Trading Strategy Review</h2>
        <TrendingDown className="w-5 h-5 text-cyan-400" />
      </div>
      {strategies.length === 0 ? (
        <Empty>No trades logged this quarter.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b border-gray-800">
              <tr>
                <th className="text-left py-2 pr-3">Strategy</th>
                <th className="text-right py-2 px-3">Trades</th>
                <th className="text-right py-2 px-3">Win%</th>
                <th className="text-right py-2 px-3">Total P&L</th>
                <th className="text-right py-2 pl-3">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {strategies.map((strategy) => (
                <tr key={strategy.id}>
                  <td className="py-2 pr-3 text-gray-200">{strategy.name}</td>
                  <td className="py-2 px-3 text-right text-gray-400">{strategy.trade_count}</td>
                  <td className="py-2 px-3 text-right text-gray-400">
                    {strategy.win_rate === null || strategy.win_rate === undefined ? '-' : pct(strategy.win_rate)}
                  </td>
                  <td className={`py-2 px-3 text-right ${(strategy.total_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {currency.format(strategy.total_pnl || 0)}
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <Badge tone={strategy.verdict === 'strong' ? 'green' : strategy.verdict === 'weak' ? 'red' : 'amber'}>
                      {strategy.verdict}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function DecisionHitRate({ data }) {
  const hitRate = data.hit_rate
  const tone = hitRate >= 70 ? 'text-emerald-400' : hitRate >= 50 ? 'text-amber-400' : 'text-red-400'

  return (
    <section className={`${cardClass} space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-100">Decision Hit Rate</h2>
        <BadgeCheck className="w-5 h-5 text-yellow-400" />
      </div>
      {hitRate === null || hitRate === undefined ? (
        <div className="py-8 text-center">
          <div className="text-sm text-gray-400">{data.message || 'Need at least 3 resolved decisions for analysis'}</div>
          <div className="text-xs text-gray-500 mt-2">Keep logging decisions to unlock this analysis.</div>
        </div>
      ) : (
        <>
          <div className="text-center py-4">
            <div className={`text-5xl font-bold ${tone}`}>{pct(hitRate)}</div>
            <div className="text-sm text-gray-500 mt-2">{data.total_resolved} decisions resolved this quarter</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MiniList title="By stakes" rows={data.by_stakes || []} />
            <MiniList title="By type" rows={data.by_type || []} />
          </div>
          <div className="text-xs text-gray-500 border-t border-gray-800 pt-3">
            Best: {data.best_domain || '-'} | Worst: {data.worst_domain || '-'}
          </div>
        </>
      )}
    </section>
  )
}

function MiniList({ title, rows }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{title}</div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.domain} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-gray-300 capitalize truncate">{row.domain}</span>
            <span className="text-gray-500 whitespace-nowrap">{pct(row.hit_rate)} ({row.total})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Quarterly() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await axios.get('/api/dashboard/quarterly')
        if (mounted) setData(res.data)
      } catch {
        if (mounted) setError('Unable to load quarterly dashboard.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const safeData = useMemo(() => data || {
    okr_progress: [],
    savings_goals: [],
    time_alignment: { by_category: [], top_misaligned: null },
    trading_review: [],
    decision_hit_rate: { total_resolved: 0, hit_rate: null, by_stakes: [], by_type: [] },
  }, [data])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-800 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 rounded-full bg-indigo-500" />
          <h1 className="page-title">Quarterly Review</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="page space-y-5">
          {loading ? (
            <Skeleton />
          ) : error ? (
            <div className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
              <OkrProgress objectives={safeData.okr_progress || []} />
              <SavingsGoals goals={safeData.savings_goals || []} />
              <TimeAlignment data={safeData.time_alignment || { by_category: [], top_misaligned: null }} />
              <TradingReview strategies={safeData.trading_review || []} />
              <DecisionHitRate data={safeData.decision_hit_rate || { total_resolved: 0, hit_rate: null }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
