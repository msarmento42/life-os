import { useState, useEffect } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { Plus, Trash2, Download, TrendingUp, TrendingDown, BarChart2, Briefcase, List } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { useCountUp } from '../../hooks/useCountUp'
import { SkeletonStat, SkeletonCard, SkeletonRow } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

const TradingPortfolioTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const value = payload[0].value
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <div className="text-gray-400 mb-1">{label}</div>
      <div className="text-cyan-400 font-semibold">${value?.toLocaleString()}</div>
    </div>
  )
}

const fmt = (n) => {
  const r = Math.round(n)
  return r >= 0 ? `$${Math.abs(r).toLocaleString()}` : `-$${Math.abs(r).toLocaleString()}`
}
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

export default function Trading() {
  const [dash, setDash] = useState(null)
  const [positions, setPositions] = useState([])
  const [trades, setTrades] = useState([])
  const [strategies, setStrategies] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [tab, setTab] = useState('overview')
  const [gapData, setGapData] = useState(null)
  const [gapLoading, setGapLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddTrade, setShowAddTrade] = useState(false)
  const [showAddPosition, setShowAddPosition] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const toast = useToast()

  const [tradeForm, setTradeForm] = useState({ symbol: '', side: 'buy', quantity: '', price: '', date: new Date().toISOString().split('T')[0], fees: '0', pnl: '0', strategy_id: '', notes: '', followed_system: null })
  const [posForm, setPosForm] = useState({ symbol: '', quantity: '', avg_cost: '', current_price: '', asset_class: 'equity', strategy_id: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [dashR, posR, tradesR, stratsR, snapR] = await Promise.all([
        axios.get('/api/trading/dashboard'),
        axios.get('/api/trading/positions'),
        axios.get('/api/trading/trades', { params: { limit: 50 } }),
        axios.get('/api/trading/strategies'),
        axios.get('/api/trading/snapshots'),
      ])
      setDash(dashR.data)
      setPositions(posR.data)
      setTrades(tradesR.data)
      setStrategies(stratsR.data)
      setSnapshots(snapR.data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const loadGap = async () => {
    setGapLoading(true)
    try {
      const res = await axios.get('/api/trading/gap-analysis')
      setGapData(res.data)
    } catch {
      // non-fatal
    } finally {
      setGapLoading(false)
    }
  }
  useEffect(() => { if (tab === 'gap') loadGap() }, [tab])

  const addTrade = async () => {
    try {
      await axios.post('/api/trading/trades', {
        ...tradeForm,
        quantity: parseFloat(tradeForm.quantity),
        price: parseFloat(tradeForm.price),
        fees: parseFloat(tradeForm.fees) || 0,
        pnl: parseFloat(tradeForm.pnl) || 0,
        strategy_id: tradeForm.strategy_id ? parseInt(tradeForm.strategy_id) : null,
      })
      toast.success('Trade logged')
      setShowAddTrade(false)
      load()
    } catch {
      toast.error('Failed to log trade')
    }
  }

  const addPosition = async () => {
    try {
      await axios.post('/api/trading/positions', {
        ...posForm,
        quantity: parseFloat(posForm.quantity),
        avg_cost: parseFloat(posForm.avg_cost),
        current_price: posForm.current_price ? parseFloat(posForm.current_price) : null,
        strategy_id: posForm.strategy_id ? parseInt(posForm.strategy_id) : null,
      })
      toast.success('Position added')
      setShowAddPosition(false)
      load()
    } catch {
      toast.error('Failed to add position')
    }
  }

  const chartData = snapshots.slice(-60).map(s => ({ date: s.date?.slice(5), value: s.total_value }))

  const totalUnrealizedPnl = positions.reduce((s, p) => s + (p.unrealized_pnl || 0), 0)

  // Count-up animations for overview stat cards
  const animPortfolio  = useCountUp(dash?.portfolio_value   || 0)
  const animRealized   = useCountUp(dash?.total_realized_pnl || 0)
  const animUnrealized = useCountUp(totalUnrealizedPnl)
  const animWinRate    = useCountUp(dash?.win_rate           || 0)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-800 px-6 pt-6 pb-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-6 rounded-full bg-cyan-500"></div>
          <h1 className="text-xl font-bold text-gray-100">Trading & Portfolio</h1>
        </div>
        <nav className="tabs">
          {[['overview','Overview'],['positions','Positions'],['trades','Trade Log'],['strategies','Strategies'],['gap','Backtest vs Live']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`tab ${tab === id ? 'tab-active text-cyan-400' : ''}`}>{label}</button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* key={tab} forces re-mount on tab switch, triggering the fade-in-up animation */}
        <div key={tab} className="tab-panel p-6 space-y-5">

        {/* Loading skeleton — overview tab */}
        {loading && tab === 'overview' && (
          <>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <SkeletonStat key={i} />)}
            </div>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {/* Loading skeleton — positions/trades tabs */}
        {loading && (tab === 'positions' || tab === 'trades') && (
          <div className="card p-4 space-y-3">
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} cols={6} />)}
          </div>
        )}

        {/* Loading skeleton — strategies tab */}
        {loading && tab === 'strategies' && (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {tab === 'overview' && !loading && !dash && (
          <EmptyState
            icon={BarChart2}
            title="No portfolio data yet"
            description="Log your first trade or add a position to start tracking your portfolio."
            action={{ label: '+ Log Trade', onClick: () => setShowAddTrade(true) }}
          />
        )}

        {tab === 'overview' && !loading && dash && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <div className="stat-card border-l-4 border-emerald-500">
                <div className="stat-label">Portfolio Value</div>
                <div className="stat-value text-emerald-400">{fmt(animPortfolio)}</div>
              </div>
              <div className={`stat-card border-l-4 ${dash.total_realized_pnl >= 0 ? 'border-emerald-500' : 'border-red-500'}`}>
                <div className="stat-label">Realized P&L</div>
                <div className={`stat-value ${dash.total_realized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {animRealized >= 0 ? '+' : ''}{fmt(animRealized)}
                </div>
              </div>
              <div className={`stat-card border-l-4 ${totalUnrealizedPnl >= 0 ? 'border-blue-500' : 'border-red-500'}`}>
                <div className="stat-label">Unrealized P&L</div>
                <div className={`stat-value ${totalUnrealizedPnl >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {animUnrealized >= 0 ? '+' : ''}{fmt(animUnrealized)}
                </div>
              </div>
              <div className="stat-card border-l-4 border-amber-500">
                <div className="stat-label">Win Rate</div>
                <div className="stat-value text-amber-400">{animWinRate.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">{dash.total_trades} trades</div>
              </div>
            </div>

            {chartData.length > 0 && (
              <div className="card">
                <div className="section-title mb-4">Portfolio Value (60 days)</div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} width={56} axisLine={false} tickLine={false}
                        tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                      <Tooltip content={<TradingPortfolioTooltip />} cursor={{ stroke: '#22d3ee', strokeWidth: 1, strokeDasharray: '4 2' }} />
                      <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2.5}
                        dot={false} activeDot={{ r: 5, fill: '#22d3ee', stroke: '#0e7490', strokeWidth: 2 }}
                        isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {dash.strategy_pnl?.length > 0 && (
              <div className="card">
                <div className="section-title mb-4">P&L by Strategy</div>
                <div className="space-y-3">
                  {dash.strategy_pnl.map(s => (
                    <div key={s.name} className="flex items-center gap-3">
                      <div className="text-sm text-gray-300 w-40 truncate">{s.name}</div>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${Math.min(100, Math.abs(s.pnl) / Math.max(...dash.strategy_pnl.map(x => Math.abs(x.pnl)), 1) * 100)}%`,
                          background: s.pnl >= 0 ? '#22c55e' : '#ef4444'
                        }} />
                      </div>
                      <div className={`text-sm font-mono font-medium w-24 text-right ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {s.pnl >= 0 ? '+' : ''}{fmt(s.pnl)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'positions' && !loading && (
          <>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary text-xs" onClick={() => setShowAddPosition(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Position
              </button>
            </div>
            {positions.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No open positions"
                description="Start tracking your portfolio by adding your current holdings."
                action={{ label: '+ Add Position', onClick: () => setShowAddPosition(true) }}
              />
            ) : (
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-800">
                    <th className="table-header text-left px-4 py-3">Symbol</th>
                    <th className="table-header text-right px-4 py-3">Qty</th>
                    <th className="table-header text-right px-4 py-3">Avg Cost</th>
                    <th className="table-header text-right px-4 py-3">Current</th>
                    <th className="table-header text-right px-4 py-3">Market Value</th>
                    <th className="table-header text-right px-4 py-3">Unrealized P&L</th>
                    <th className="table-header text-right px-4 py-3">Return</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr></thead>
                  <tbody>
                    {positions.map(p => (
                      <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 group">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-100">{p.symbol}</div>
                          <div className="text-xs text-gray-600">{p.asset_class}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-300">{p.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-300">${p.avg_cost.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-100">{p.current_price ? `$${p.current_price.toLocaleString()}` : '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-100">{fmt(p.market_value)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${p.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {p.unrealized_pnl >= 0 ? '+' : ''}{fmt(p.unrealized_pnl)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm ${p.pnl_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {fmtPct(p.pnl_pct)}
                        </td>
                        <td className="px-4 py-3">
                          <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400"
                            onClick={() => setDeleteTarget({ type: 'position', id: p.id })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'trades' && !loading && (
          <>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary text-xs" onClick={() => window.open('/api/trading/trades/export')}>
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button className="btn-primary text-xs" onClick={() => setShowAddTrade(true)}>
                <Plus className="w-3.5 h-3.5" /> Log Trade
              </button>
            </div>
            {trades.length === 0 ? (
              <EmptyState
                icon={List}
                title="No trades logged yet"
                description="Start building your track record by logging your first trade."
                action={{ label: '+ Log Trade', onClick: () => setShowAddTrade(true) }}
              />
            ) : (
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-800">
                    <th className="table-header text-left px-4 py-3">Date</th>
                    <th className="table-header text-left px-4 py-3">Symbol</th>
                    <th className="table-header px-4 py-3">Side</th>
                    <th className="table-header text-right px-4 py-3">Qty</th>
                    <th className="table-header text-right px-4 py-3">Price</th>
                    <th className="table-header text-right px-4 py-3">P&L</th>
                    <th className="table-header px-4 py-3">Strategy</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr></thead>
                  <tbody>
                    {trades.map(t => (
                      <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 group">
                        <td className="px-4 py-3 text-gray-500 text-xs">{t.date}</td>
                        <td className="px-4 py-3 font-semibold text-gray-100">{t.symbol}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge text-xs ${t.side === 'buy' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                            {t.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-300">{t.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-300">${t.price.toLocaleString()}</td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${t.pnl > 0 ? 'text-emerald-400' : t.pnl < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                          {t.pnl !== 0 ? `${t.pnl >= 0 ? '+' : ''}${fmt(t.pnl)}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {t.strategy_name && (
                            <span className="badge text-[10px] bg-gray-800 text-gray-400">{t.strategy_name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400"
                            onClick={() => setDeleteTarget({ type: 'trade', id: t.id })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'strategies' && !loading && strategies.length === 0 && (
          <EmptyState
            icon={BarChart2}
            title="No strategies configured"
            description="Strategies help you track which approaches are working. Add one to get started."
          />
        )}

        {tab === 'strategies' && !loading && strategies.length > 0 && (
          <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
            {strategies.map(s => (
              <div key={s.id} className="card border-l-4" style={{ borderColor: s.color }}>
                <div className="font-semibold text-gray-100 mb-1">{s.name}</div>
                <div className="text-xs text-gray-500 mb-4">{s.description}</div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className={`text-xl font-bold ${s.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {s.total_pnl >= 0 ? '+' : ''}{fmt(s.total_pnl)}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">Total P&L</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-100">{s.win_rate}%</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">Win Rate</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-100">{s.trade_count}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">Trades</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* T2.01 — Backtest vs Live gap analysis */}
        {tab === 'gap' && (
          <>
            {gapLoading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}
            {!gapLoading && !gapData && (
              <EmptyState
                icon={BarChart2}
                title="No gap data available"
                description="Add strategies and log paper/live trades to see backtest vs. live comparison."
              />
            )}
            {!gapLoading && gapData && (
              <>
                {/* Summary strip */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="stat-card border-l-4 border-cyan-500">
                    <div className="stat-label">Strategies w/ Live Data</div>
                    <div className="stat-value text-cyan-400">{gapData.summary.strategies_with_live_data}</div>
                  </div>
                  <div className="stat-card border-l-4 border-amber-500">
                    <div className="stat-label">Paper Only</div>
                    <div className="stat-value text-amber-400">{gapData.summary.strategies_paper_only}</div>
                  </div>
                  <div className={`stat-card border-l-4 ${gapData.summary.avg_gap_pct !== null && gapData.summary.avg_gap_pct < -50 ? 'border-red-500' : 'border-gray-600'}`}>
                    <div className="stat-label">Avg Gap</div>
                    <div className={`stat-value ${gapData.summary.avg_gap_pct !== null && gapData.summary.avg_gap_pct < -50 ? 'text-red-400' : 'text-gray-300'}`}>
                      {gapData.summary.avg_gap_pct !== null ? `${gapData.summary.avg_gap_pct > 0 ? '+' : ''}${gapData.summary.avg_gap_pct}%` : '—'}
                    </div>
                    {gapData.summary.most_overfit_strategy && (
                      <div className="stat-sub truncate text-red-400">Overfit: {gapData.summary.most_overfit_strategy}</div>
                    )}
                  </div>
                </div>

                {/* Strategy comparison table */}
                {gapData.strategies.length === 0 ? (
                  <EmptyState
                    icon={BarChart2}
                    title="No strategies yet"
                    description="Data populates automatically once you have strategies and trades."
                  />
                ) : (
                  <div className="card p-0 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                      <div className="section-title">Strategy Comparison</div>
                      <div className="text-xs text-gray-600">{gapData.summary.note}</div>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="table-header text-left px-4 py-3">Strategy</th>
                          <th className="table-header text-right px-4 py-3">Paper Win Rate</th>
                          <th className="table-header text-right px-4 py-3">Paper Sharpe</th>
                          <th className="table-header text-right px-4 py-3">Live Win Rate</th>
                          <th className="table-header text-right px-4 py-3">Live Sharpe</th>
                          <th className="table-header text-right px-4 py-3">Gap %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gapData.strategies.map(s => (
                          <tr key={s.strategy_id}
                            className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${s.overfit_warning ? 'bg-orange-900/10' : ''}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                                <span className="font-medium text-gray-200">{s.name}</span>
                                {s.overfit_warning && (
                                  <span className="badge bg-orange-900/50 text-orange-400 text-[10px] ml-1">overfit</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-300">
                              {s.paper ? `${s.paper.win_rate}%` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-300">
                              {s.paper?.sharpe !== null && s.paper?.sharpe !== undefined ? s.paper.sharpe : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-300">
                              {s.live ? `${s.live.win_rate}%` : <span className="text-gray-600">no live data</span>}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-300">
                              {s.live?.sharpe !== null && s.live?.sharpe !== undefined ? s.live.sharpe : '—'}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono font-semibold ${
                              s.gap_pct === null ? 'text-gray-600' :
                              s.gap_pct < -50 ? 'text-orange-400' :
                              s.gap_pct < 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                              {s.gap_pct !== null ? `${s.gap_pct > 0 ? '+' : ''}${s.gap_pct}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-600">
                      Gap &gt; -50%: overfit warning (live significantly underperforms paper). All existing trades default to paper mode.
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        </div>{/* end tab-panel */}
      </div>

      {showAddTrade && (
        <Modal title="Log Trade" onClose={() => setShowAddTrade(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Symbol</label><input className="input uppercase" value={tradeForm.symbol} onChange={e => setTradeForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} placeholder="AAPL" /></div>
              <div><label className="label">Side</label>
                <select className="input" value={tradeForm.side} onChange={e => setTradeForm(f => ({ ...f, side: e.target.value }))}>
                  {['buy','sell','short','cover'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                </select>
              </div>
              <div><label className="label">Quantity</label><input className="input" type="number" step="any" value={tradeForm.quantity} onChange={e => setTradeForm(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><label className="label">Price ($)</label><input className="input" type="number" step="0.01" value={tradeForm.price} onChange={e => setTradeForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div><label className="label">Date</label><input className="input" type="date" value={tradeForm.date} onChange={e => setTradeForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><label className="label">P&L ($)</label><input className="input" type="number" step="0.01" value={tradeForm.pnl} onChange={e => setTradeForm(f => ({ ...f, pnl: e.target.value }))} placeholder="0 for buys" /></div>
              <div className="col-span-2"><label className="label">Strategy</label>
                <select className="input" value={tradeForm.strategy_id} onChange={e => setTradeForm(f => ({ ...f, strategy_id: e.target.value }))}>
                  <option value="">No strategy</option>
                  {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="label">Notes</label><textarea className="input min-h-[80px]" value={tradeForm.notes} onChange={e => setTradeForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <div className="col-span-2">
                <label className="label">Followed System?</label>
                <div className="flex gap-2">
                  {[
                    ['Yes', true],
                    ['No', false],
                    ['—', null],
                  ].map(([label, value]) => (
                    <button
                      key={label}
                      type="button"
                      className={`btn-secondary flex-1 justify-center ${tradeForm.followed_system === value ? 'border-cyan-400 text-cyan-300' : 'border-gray-700'}`}
                      onClick={() => setTradeForm(f => ({ ...f, followed_system: value }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button className="btn-secondary" onClick={() => setShowAddTrade(false)}>Cancel</button>
              <button className="btn-primary" onClick={addTrade}>Log Trade</button>
            </div>
          </div>
        </Modal>
      )}

      {showAddPosition && (
        <Modal title="Add Position" onClose={() => setShowAddPosition(false)} size="sm">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Symbol</label><input className="input uppercase" value={posForm.symbol} onChange={e => setPosForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} /></div>
              <div><label className="label">Asset Class</label>
                <select className="input" value={posForm.asset_class} onChange={e => setPosForm(f => ({ ...f, asset_class: e.target.value }))}>
                  {['equity','crypto','etf','option'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div><label className="label">Quantity</label><input className="input" type="number" step="any" value={posForm.quantity} onChange={e => setPosForm(f => ({ ...f, quantity: e.target.value }))} /></div>
              <div><label className="label">Avg Cost ($)</label><input className="input" type="number" step="0.01" value={posForm.avg_cost} onChange={e => setPosForm(f => ({ ...f, avg_cost: e.target.value }))} /></div>
              <div className="col-span-2"><label className="label">Current Price ($)</label><input className="input" type="number" step="0.01" value={posForm.current_price} onChange={e => setPosForm(f => ({ ...f, current_price: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button className="btn-secondary" onClick={() => setShowAddPosition(false)}>Cancel</button>
              <button className="btn-primary" onClick={addPosition}>Add</button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal title="Delete Entry" message="Delete this entry?" onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            const { type, id } = deleteTarget
            const paths = { trade: 'trades', position: 'positions' }
            try {
              await axios.delete(`/api/trading/${paths[type]}/${id}`)
              toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`)
            } catch {
              toast.error('Failed to delete entry')
            }
            setDeleteTarget(null); load()
          }} />
      )}
    </div>
  )
}
