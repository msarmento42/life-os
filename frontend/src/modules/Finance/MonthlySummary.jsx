import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { SkeletonStat, SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

const IncomeExpenseTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const colorMap = { Income: '#22c55e', Expenses: '#ef4444', Saved: '#6366f1' }
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <div className="text-gray-400 mb-1">{label}</div>
      <div className="font-semibold" style={{ color: colorMap[label] || '#e5e7eb' }}>
        ${payload[0].value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  )
}

export default function MonthlySummary() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/finance/summary', { params: { month, year } })
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [month, year])

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const incomeExpenseData = data ? [
    { name: 'Income', value: data.income, fill: '#22c55e' },
    { name: 'Expenses', value: data.expenses, fill: '#ef4444' },
    { name: 'Saved', value: Math.max(0, data.net_savings), fill: '#6366f1' },
  ] : []

  return (
    <div className="space-y-5">
      {/* Month nav */}
      <div className="flex items-center gap-3">
        <button className="btn-secondary p-2" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></button>
        <div className="text-lg font-semibold text-gray-100 min-w-[180px] text-center">{monthName}</div>
        <button className="btn-secondary p-2" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* Loading state */}
      {loading && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonStat key={i} />)}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </>
      )}

      {/* No data state */}
      {!loading && !data && (
        <EmptyState
          icon={FileText}
          title="No summary data"
          description="Add transactions to see your monthly income and spending breakdown."
        />
      )}

      {/* Key stats + charts */}
      {!loading && data && (
      <>
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card border-l-4 border-emerald-500">
          <div className="stat-label">Income</div>
          <div className="stat-value text-emerald-400">${data.income.toLocaleString()}</div>
        </div>
        <div className="stat-card border-l-4 border-red-500">
          <div className="stat-label">Expenses</div>
          <div className="stat-value text-red-400">${data.expenses.toLocaleString()}</div>
        </div>
        <div className="stat-card border-l-4 border-brand-500">
          <div className="stat-label">Net Savings</div>
          <div className={`stat-value ${data.net_savings >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
            ${data.net_savings.toLocaleString()}
          </div>
        </div>
        <div className="stat-card border-l-4 border-amber-500">
          <div className="stat-label">Savings Rate</div>
          <div className={`stat-value ${data.savings_rate >= 20 ? 'text-amber-400' : 'text-gray-400'}`}>
            {data.savings_rate}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="card">
          <div className="section-title mb-4">Income vs Expenses</div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={incomeExpenseData} barSize={52} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} width={52} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<IncomeExpenseTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}
                  isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                  {incomeExpenseData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top categories */}
        <div className="card">
          <div className="section-title mb-4">Top Spending Categories</div>
          {data.top_categories.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-8">No expense data this month.</div>
          )}
          <div className="space-y-3">
            {data.top_categories.map((cat, i) => {
              const pct = data.expenses > 0 ? (cat.total / data.expenses) * 100 : 0
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{cat.icon} {cat.name}</span>
                    <div className="text-right">
                      <span className="text-gray-100 font-medium">${cat.total.toLocaleString()}</span>
                      <span className="text-gray-500 text-xs ml-2">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
