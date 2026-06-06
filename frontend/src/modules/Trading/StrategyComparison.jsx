import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { ArrowUpDown, BarChart2 } from 'lucide-react'
import EmptyState from '../../components/EmptyState'

const currency = (value) => {
  const n = Number(value || 0)
  const rounded = Math.round(n)
  return rounded >= 0 ? `$${rounded.toLocaleString()}` : `-$${Math.abs(rounded).toLocaleString()}`
}

const number = (value) => Number(value || 0).toFixed(2)
const percent = (value) => `${Number(value || 0).toFixed(1)}%`
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value))

const columns = [
  { key: 'name', label: 'Strategy', align: 'left', render: (s) => s.name },
  { key: 'total_trades', label: 'Trades', render: (s) => s.total_trades },
  { key: 'win_rate', label: 'Win Rate', render: (s) => percent(s.win_rate) },
  { key: 'avg_win', label: 'Avg Win', render: (s) => currency(s.avg_win) },
  { key: 'avg_loss', label: 'Avg Loss', render: (s) => currency(s.avg_loss) },
  { key: 'profit_factor', label: 'Profit Factor', render: (s) => number(s.profit_factor) },
  { key: 'total_pnl', label: 'Total P&L', render: (s) => currency(s.total_pnl) },
  { key: 'sharpe_ratio', label: 'Sharpe', render: (s) => number(s.sharpe_ratio) },
  { key: 'max_drawdown', label: 'Max Drawdown', render: (s) => currency(s.max_drawdown) },
]

const radarKey = (strategy) => `strategy_${strategy.id}`

export default function StrategyComparison() {
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState({ key: 'total_pnl', direction: 'desc' })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await axios.get('/api/trading/strategies/comparison')
        setStrategies(res.data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const sortedStrategies = useMemo(() => {
    const sorted = [...strategies].sort((a, b) => {
      const aValue = a[sort.key]
      const bValue = b[sort.key]

      if (typeof aValue === 'string' || typeof bValue === 'string') {
        return String(aValue || '').localeCompare(String(bValue || ''))
      }

      return Number(aValue || 0) - Number(bValue || 0)
    })

    return sort.direction === 'asc' ? sorted : sorted.reverse()
  }, [strategies, sort])

  const radarStrategies = useMemo(() => sortedStrategies.filter(s => s.total_trades > 0).slice(0, 8), [sortedStrategies])

  const radarData = useMemo(() => {
    return [
      {
        metric: 'Win Rate',
        ...Object.fromEntries(radarStrategies.map(s => [radarKey(s), clamp(Number(s.win_rate || 0))])),
      },
      {
        metric: 'Profit Factor',
        ...Object.fromEntries(radarStrategies.map(s => [radarKey(s), clamp((Number(s.profit_factor || 0) / 3) * 100)])),
      },
      {
        metric: 'Sharpe Ratio',
        ...Object.fromEntries(radarStrategies.map(s => [radarKey(s), clamp((Number(s.sharpe_ratio || 0) / 3) * 100)])),
      },
    ]
  }, [radarStrategies])

  const toggleSort = (key) => {
    setSort(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card h-64 animate-pulse" />
        <div className="card h-72 animate-pulse" />
      </div>
    )
  }

  if (strategies.length === 0) {
    return (
      <EmptyState
        icon={BarChart2}
        title="No strategy data yet"
        description="Strategy analytics appear once active strategies exist."
      />
    )
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="section-title">Comparison Table</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="border-b border-gray-800">
                {columns.map(column => (
                  <th
                    key={column.key}
                    className={`table-header px-4 py-3 ${column.align === 'left' ? 'text-left' : 'text-right'}`}
                  >
                    <button
                      className={`inline-flex items-center gap-1 ${column.align === 'left' ? '' : 'justify-end w-full'}`}
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.label}
                      <ArrowUpDown className="w-3 h-3 text-gray-600" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStrategies.map(strategy => (
                <tr key={strategy.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  {columns.map(column => {
                    const isMoney = ['avg_win', 'avg_loss', 'total_pnl', 'max_drawdown'].includes(column.key)
                    const value = strategy[column.key]
                    const tone = column.key === 'total_pnl'
                      ? Number(value || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      : isMoney ? 'text-gray-300' : 'text-gray-300'

                    if (column.key === 'name') {
                      return (
                        <td key={column.key} className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-8 rounded-full shrink-0" style={{ background: strategy.color }} />
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-100 truncate">{strategy.name}</div>
                              <div className="text-xs text-gray-600 truncate">{strategy.type}</div>
                            </div>
                          </div>
                        </td>
                      )
                    }

                    return (
                      <td key={column.key} className={`px-4 py-3 text-right font-mono ${tone}`}>
                        {column.render(strategy)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {radarStrategies.length >= 2 && (
        <div className="card">
          <div className="section-title mb-4">Radar Chart</div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={radarData} outerRadius={120}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip
                  formatter={(value) => [`${Number(value || 0).toFixed(1)}`, 'Score']}
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                {radarStrategies.map(strategy => (
                  <Radar
                    key={strategy.id}
                    name={strategy.name}
                    dataKey={radarKey(strategy)}
                    stroke={strategy.color}
                    fill={strategy.color}
                    fillOpacity={0.16}
                    strokeWidth={2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
