import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react'

function fmt(n) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n?.toFixed(2) ?? '0.00'}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <p className="text-gray-400 font-medium mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold font-mono" style={{ color: p.color }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const BalanceTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <p className="text-gray-400 font-medium mb-1">{label}</p>
      <p className="font-semibold font-mono text-emerald-400">{fmt(val)}</p>
    </div>
  )
}

export default function CashFlow() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('balance') // 'balance' | 'flows'

  useEffect(() => {
    axios.get('/api/finance/cashflow-projection')
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-72 rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card text-center py-16 text-gray-500">
        <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <div className="text-sm">No data available. Add recurring items to generate a projection.</div>
      </div>
    )
  }

  const { starting_balance, monthly_income, monthly_expenses, monthly_net, income_breakdown, expense_breakdown, projection } = data
  const isPositive = monthly_net >= 0
  const endBalance = projection[projection.length - 1]?.balance ?? starting_balance

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="section-title">Cash Flow Projection</div>
        <div className="text-xs text-gray-500 mt-0.5">Next 12 months based on recurring items</div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">Current Balance</span>
          </div>
          <div className="text-xl font-bold text-gray-100 font-mono">{fmt(starting_balance)}</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">Monthly In</span>
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">{fmt(monthly_income)}</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">Monthly Out</span>
          </div>
          <div className="text-xl font-bold text-red-400 font-mono">{fmt(monthly_expenses)}</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            {isPositive
              ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              : monthly_net === 0
                ? <Minus className="w-3.5 h-3.5 text-gray-400" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            }
            <span className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">Monthly Net</span>
          </div>
          <div className={`text-xl font-bold font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{fmt(monthly_net)}
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">
            Projected 12mo: <span className={endBalance >= starting_balance ? 'text-emerald-500' : 'text-red-500'}>{fmt(endBalance)}</span>
          </div>
        </div>
      </div>

      {/* Chart view toggle */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-gray-300">12-Month Projection</div>
          <div className="flex gap-1">
            <button
              className={`text-xs px-3 py-1 rounded-md transition-colors ${view === 'balance' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => setView('balance')}
            >
              Balance
            </button>
            <button
              className={`text-xs px-3 py-1 rounded-md transition-colors ${view === 'flows' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => setView('flows')}
            >
              Cash Flows
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          {view === 'balance' ? (
            <AreaChart data={projection} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v.split(' ')[0]}
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
              <Tooltip content={<BalanceTooltip />} />
              <Area
                type="monotone"
                dataKey="balance"
                name="Projected Balance"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#balanceGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981' }}
                animationDuration={800}
              />
            </AreaChart>
          ) : (
            <AreaChart data={projection} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v.split(' ')[0]}
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
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={v => <span style={{ color: '#9ca3af' }}>{v}</span>}
              />
              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#incomeGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981' }}
                animationDuration={800}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#expenseGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#ef4444' }}
                animationDuration={800}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Income vs Expense breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Income breakdown */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-gray-300">Monthly Income Sources</span>
          </div>
          {income_breakdown.length === 0 ? (
            <div className="text-xs text-gray-600 py-4 text-center">No income recurring items found.<br />Add income-type recurring items to see breakdown.</div>
          ) : (
            <div className="space-y-2">
              {income_breakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 truncate">{item.name}</span>
                  <span className="font-mono font-medium text-emerald-400 shrink-0 ml-2">{fmt(item.amount)}</span>
                </div>
              ))}
              <div className="border-t border-gray-800 pt-2 flex items-center justify-between text-sm font-semibold">
                <span className="text-gray-300">Total</span>
                <span className="font-mono text-emerald-400">{fmt(monthly_income)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Expense breakdown */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-gray-300">Monthly Expenses</span>
          </div>
          {expense_breakdown.length === 0 ? (
            <div className="text-xs text-gray-600 py-4 text-center">No expense recurring items found.</div>
          ) : (
            <div className="space-y-2">
              {expense_breakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 truncate">{item.name}</span>
                  <span className="font-mono font-medium text-red-400 shrink-0 ml-2">{fmt(item.amount)}</span>
                </div>
              ))}
              <div className="border-t border-gray-800 pt-2 flex items-center justify-between text-sm font-semibold">
                <span className="text-gray-300">Total</span>
                <span className="font-mono text-red-400">{fmt(monthly_expenses)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monthly projection table */}
      <div className="card overflow-x-auto">
        <div className="text-sm font-medium text-gray-300 mb-3">Monthly Breakdown</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 pr-3 text-gray-500 font-semibold uppercase tracking-wide">Month</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold uppercase tracking-wide">Income</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold uppercase tracking-wide">Expenses</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold uppercase tracking-wide">Net</th>
              <th className="text-right py-2 pl-3 text-gray-500 font-semibold uppercase tracking-wide">Balance</th>
            </tr>
          </thead>
          <tbody>
            {projection.map((row, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="py-2 pr-3 text-gray-300 font-medium">{row.month}</td>
                <td className="py-2 px-3 text-right font-mono text-emerald-400">{fmt(row.income)}</td>
                <td className="py-2 px-3 text-right font-mono text-red-400">{fmt(row.expenses)}</td>
                <td className={`py-2 px-3 text-right font-mono font-semibold ${row.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {row.net >= 0 ? '+' : ''}{fmt(row.net)}
                </td>
                <td className="py-2 pl-3 text-right font-mono text-gray-200">{fmt(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
