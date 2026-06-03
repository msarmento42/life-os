import { useState, useEffect } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Smile, Zap, AlertTriangle, Brain, TrendingUp, TrendingDown, Sparkles } from 'lucide-react'
import { SkeletonCard, SkeletonStat, SkeletonRow } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'

const TAGS = ['productive', 'social', 'outdoor', 'focused', 'tired', 'motivated', 'creative', 'stressed', 'grateful', 'anxious', 'energized', 'calm']

function MoodTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-xs text-gray-400 font-medium mb-2">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}/10
        </p>
      ))}
    </div>
  )
}

function ScoreInput({ label, icon: Icon, color, value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-sm text-gray-400">{label}</span>
        <span className="ml-auto text-lg font-bold" style={{ color }}>{value || '—'}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button key={n} onClick={() => onChange(n)}
            className={`flex-1 h-8 rounded text-xs font-medium transition-all border ${
              n <= (value || 0)
                ? 'bg-opacity-30 border-opacity-60'
                : 'bg-gray-800 border-gray-700 text-gray-600 hover:bg-gray-700 hover:text-gray-400'
            } ${n === value ? 'font-bold' : 'font-normal'}`}
            style={n <= (value || 0) ? {
              backgroundColor: color + '30',
              borderColor: color + '60',
              color: color,
            } : {}}
          >{n}</button>
        ))}
      </div>
    </div>
  )
}

export default function Mood() {
  const [today, setToday] = useState(null)
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [correlations, setCorrelations] = useState(null)
  const [patterns, setPatterns] = useState(null)
  const [tab, setTab] = useState('log')
  const [form, setForm] = useState({ mood: null, energy: null, stress: null, anxiety: null, focus: null, notes: '', tags: [] })
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const toast = useToast()

  const todayStr = new Date().toISOString().split('T')[0]

  const load = async () => {
    setLoading(true)
    try {
      const [todayR, statsR, logsR] = await Promise.all([
        axios.get('/api/mood/today'),
        axios.get('/api/mood/stats'),
        axios.get('/api/mood/'),
      ])
      setToday(todayR.data)
      setStats(statsR.data)
      setLogs(logsR.data)
      if (todayR.data) {
        const t = todayR.data
        setForm({
          mood: t.mood, energy: t.energy, stress: t.stress,
          anxiety: t.anxiety, focus: t.focus, notes: t.notes || '',
          tags: t.tags ? t.tags.split(',').map(x => x.trim()) : [],
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const loadInsights = async () => {
    setInsightsLoading(true)
    try {
      const [corrR, pattR] = await Promise.all([
        axios.get('/api/mood/correlations'),
        axios.get('/api/mood/patterns'),
      ])
      setCorrelations(corrR.data)
      setPatterns(pattR.data)
    } finally {
      setInsightsLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (tab === 'insights' || tab === 'patterns') loadInsights()
  }, [tab])

  const save = async () => {
    try {
      await axios.post('/api/mood/', {
        date: todayStr,
        mood: form.mood, energy: form.energy, stress: form.stress,
        anxiety: form.anxiety, focus: form.focus, notes: form.notes,
        tags: form.tags.join(','),
      })
      toast.success(today ? 'Mood log updated' : 'Mood log saved')
      load()
    } catch {
      toast.error('Failed to save mood log')
    }
  }

  const toggleTag = (tag) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }))
  }

  const trendData = [...logs].reverse().slice(0, 30).map(l => ({
    date: l.date?.slice(5),
    mood: l.mood, energy: l.energy, stress: l.stress
  }))

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-0">
        <div className="page-header mb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-pink-500"></div>
            <h1 className="page-title">Mood & Energy</h1>
          </div>
        </div>
        <nav className="tabs">
          {[['log', "Today's Log"], ['trends', 'Trends'], ['insights', 'Insights'], ['patterns', 'Patterns'], ['history', 'History']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`tab ${id === tab ? 'tab-active text-pink-400' : 'tab-inactive'}`}>{label}</button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div key={tab} className="page tab-panel space-y-5">

        {tab === 'log' && (
          <div className="max-w-xl space-y-5">
            <div className="card">
              <div className="text-sm text-gray-400 mb-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div className="text-lg font-semibold text-gray-100 mb-4">How are you doing today?</div>
              <div className="space-y-5">
                <ScoreInput label="Mood" icon={Smile} color="#ec4899" value={form.mood} onChange={v => setForm(f => ({ ...f, mood: v }))} />
                <ScoreInput label="Energy" icon={Zap} color="#f59e0b" value={form.energy} onChange={v => setForm(f => ({ ...f, energy: v }))} />
                <ScoreInput label="Stress" icon={AlertTriangle} color="#ef4444" value={form.stress} onChange={v => setForm(f => ({ ...f, stress: v }))} />
                <ScoreInput label="Focus" icon={Brain} color="#6366f1" value={form.focus} onChange={v => setForm(f => ({ ...f, focus: v }))} />
              </div>
            </div>

            <div className="card">
              <div className="text-sm font-medium text-gray-400 mb-3">Tags</div>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(tag => (
                  <button key={tag} onClick={() => toggleTag(tag)}
                    className={`badge text-xs cursor-pointer transition-colors ${
                      form.tags.includes(tag) ? 'bg-pink-900/50 text-pink-400 border border-pink-700' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                    }`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="text-sm font-medium text-gray-400 mb-2">Notes</div>
              <textarea className="input" rows={3} placeholder="What's on your mind today?"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <button className="btn-primary w-full" onClick={save}>
              {today ? '💾 Update Today\'s Log' : '✅ Save Today\'s Log'}
            </button>
          </div>
        )}

        {tab === 'trends' && (
          <>
            {loading ? (
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Avg Mood', value: stats.avg_mood, color: '#ec4899', icon: Smile },
                  { label: 'Avg Energy', value: stats.avg_energy, color: '#f59e0b', icon: Zap },
                  { label: 'Avg Stress', value: stats.avg_stress, color: '#ef4444', icon: AlertTriangle },
                  { label: 'Avg Focus', value: stats.avg_focus, color: '#6366f1', icon: Brain },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
                    <div className="stat-label">{label}</div>
                    <div className="stat-value" style={{ color }}>{value || '—'}/10</div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="card">
              <div className="section-title mb-4">30-Day Trend</div>
              {loading ? (
                <div className="h-56 bg-gray-800/30 rounded-lg animate-pulse" />
              ) : (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} />
                      <YAxis domain={[1, 10]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} width={30} />
                      <Tooltip content={<MoodTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#6b7280' }} />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{v}</span>} />
                      <Line type="monotone" dataKey="mood" stroke="#ec4899" strokeWidth={2.5} dot={false} name="Mood" isAnimationActive={true} animationDuration={800} />
                      <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="Energy" isAnimationActive={true} animationDuration={800} animationBegin={100} />
                      <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Stress" strokeDasharray="4 4" isAnimationActive={true} animationDuration={800} animationBegin={200} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {stats?.top_tags?.length > 0 && (
              <div className="card">
                <div className="section-title mb-4">Top Tags (30 days)</div>
                <div className="flex flex-wrap gap-2">
                  {stats.top_tags.map(([tag, count]) => (
                    <div key={tag} className="badge bg-gray-800 text-gray-300 text-xs">
                      {tag} <span className="text-gray-600 ml-1">×{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* S5.03 — Insights tab */}
        {tab === 'insights' && (
          <>
            {insightsLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : !correlations || correlations.sample_days < 7 ? (
              <EmptyState
                icon={Sparkles}
                title="Not enough data yet"
                description="Log mood with tags and ensure habits/sleep are tracked for 2+ weeks to see correlation insights."
              />
            ) : (
              <>
                {/* Baseline KPIs */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="stat-card border-l-4 border-pink-500">
                    <div className="stat-label">Baseline Mood</div>
                    <div className="stat-value">{correlations.baseline_mood}/10</div>
                  </div>
                  <div className="stat-card border-l-4 border-amber-500">
                    <div className="stat-label">Baseline Energy</div>
                    <div className="stat-value">{correlations.baseline_energy}/10</div>
                  </div>
                  <div className="stat-card border-l-4 border-gray-600">
                    <div className="stat-label">Sample Days</div>
                    <div className="stat-value">{correlations.sample_days}</div>
                  </div>
                </div>

                {/* Factor correlations */}
                {correlations.factor_correlations.length > 0 && (
                  <div className="card">
                    <div className="section-title mb-1">Lifestyle Factors → Mood</div>
                    <div className="text-xs text-gray-500 mb-4">Avg mood when factor is high vs low</div>
                    <div className="space-y-3">
                      {correlations.factor_correlations.map((f, i) => {
                        const positive = f.delta > 0
                        return (
                          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-800/50">
                            <div className={`shrink-0 ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                              {positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-200 font-medium">{f.label}</div>
                              <div className="text-xs text-gray-500">
                                High: <span className="text-gray-300">{f.high_avg_mood}/10</span>
                                <span className="mx-1.5 text-gray-700">vs</span>
                                Low: <span className="text-gray-300">{f.low_avg_mood}/10</span>
                                {f.threshold && <span className="ml-1 text-gray-600">(split at {f.threshold}{f.unit})</span>}
                              </div>
                            </div>
                            <div className={`text-sm font-bold shrink-0 ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                              {positive ? '+' : ''}{f.delta.toFixed(2)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Tag correlations */}
                {correlations.tag_correlations.length > 0 && (
                  <div className="card">
                    <div className="section-title mb-1">Mood by Tag</div>
                    <div className="text-xs text-gray-500 mb-4">
                      Average mood on days you tagged each keyword vs baseline ({correlations.baseline_mood}/10)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {correlations.tag_correlations.map(tc => {
                        const positive = tc.mood_delta > 0
                        return (
                          <div key={tc.tag} className={`flex items-center justify-between p-2.5 rounded-lg border ${
                            positive ? 'bg-emerald-900/10 border-emerald-800/40' : tc.mood_delta < 0 ? 'bg-red-900/10 border-red-800/40' : 'bg-gray-800/50 border-gray-700/50'
                          }`}>
                            <div>
                              <span className="text-sm text-gray-200 font-medium">{tc.tag}</span>
                              <div className="text-[10px] text-gray-600">{tc.sample} days</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-bold ${positive ? 'text-emerald-400' : tc.mood_delta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                {positive ? '+' : ''}{tc.mood_delta.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-gray-500">avg {tc.avg_mood}/10</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-3">
                      Delta = avg mood on tagged days minus baseline. Positive = higher mood when this tag is active.
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* S5.04 — Patterns tab */}
        {tab === 'patterns' && (
          <>
            {insightsLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : !patterns || (patterns.decline_episodes < 2 && patterns.recovery_episodes < 2) ? (
              <EmptyState
                icon={TrendingDown}
                title="Not enough pattern data"
                description="Log mood daily for at least 3–4 weeks to detect triggers and antidotes from multi-day mood runs."
              />
            ) : (
              <>
                {/* Episode counts */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="stat-card border-l-4 border-red-500">
                    <div className="stat-label">Decline Episodes (3d+)</div>
                    <div className="stat-value">{patterns.decline_episodes}</div>
                  </div>
                  <div className="stat-card border-l-4 border-emerald-500">
                    <div className="stat-label">Recovery Episodes (3d+)</div>
                    <div className="stat-value">{patterns.recovery_episodes}</div>
                  </div>
                </div>

                {/* Triggers */}
                {patterns.triggers.length > 0 && (
                  <div className="card border border-red-800/30">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                      <div className="section-title">Triggers</div>
                    </div>
                    <div className="text-xs text-gray-500 mb-4">
                      Habits present in the 2 days before a mood decline. Higher % = more often a precursor to drops.
                    </div>
                    <div className="space-y-2">
                      {patterns.triggers.map((t, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-red-900/10">
                          <span className="text-base shrink-0">{t.icon}</span>
                          <span className="text-sm text-gray-200 flex-1">{t.name}</span>
                          <div className="shrink-0 text-right">
                            <div className="text-sm font-bold text-red-400">{t.rate_pct}%</div>
                            <div className="text-[10px] text-gray-600">{t.appearances} episodes</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-[10px] text-gray-600">
                      ⚠ Correlation ≠ causation. These habits appeared frequently before drops but may not cause them.
                    </div>
                  </div>
                )}

                {/* Antidotes */}
                {patterns.antidotes.length > 0 && (
                  <div className="card border border-emerald-800/30">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <div className="section-title">Antidotes</div>
                    </div>
                    <div className="text-xs text-gray-500 mb-4">
                      Habits present in the 2 days before a mood recovery. Higher % = more often a precursor to improvement.
                    </div>
                    <div className="space-y-2">
                      {patterns.antidotes.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-emerald-900/10">
                          <span className="text-base shrink-0">{a.icon}</span>
                          <span className="text-sm text-gray-200 flex-1">{a.name}</span>
                          <div className="shrink-0 text-right">
                            <div className="text-sm font-bold text-emerald-400">{a.rate_pct}%</div>
                            <div className="text-[10px] text-gray-600">{a.appearances} episodes</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-[10px] text-gray-600">
                      💡 These habits appeared frequently before mood recoveries. Consider prioritizing them during low periods.
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'history' && (
          <>
            {logs.length === 0 ? (
              <EmptyState
                icon={Smile}
                title="No mood logs yet"
                description="Start tracking your mood daily to see patterns and insights."
                action={{ label: '📝 Log Today', onClick: () => setTab('log') }}
              />
            ) : (
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-800">
                    <th className="table-header text-left px-4 py-3">Date</th>
                    <th className="table-header text-center px-3 py-3">😊 Mood</th>
                    <th className="table-header text-center px-3 py-3">⚡ Energy</th>
                    <th className="table-header text-center px-3 py-3">🔥 Stress</th>
                    <th className="table-header text-center px-3 py-3">🧠 Focus</th>
                    <th className="table-header text-left px-4 py-3">Tags</th>
                  </tr></thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-gray-400 text-xs">{l.date}</td>
                        {[l.mood, l.energy, l.stress, l.focus].map((val, i) => (
                          <td key={i} className="px-3 py-3 text-center">
                            <span className={`text-sm font-semibold ${val >= 7 ? 'text-emerald-400' : val >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {val || '—'}
                            </span>
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {l.tags?.split(',').filter(Boolean).map(tag => (
                              <span key={tag} className="badge bg-gray-800 text-gray-500 text-[10px]">{tag.trim()}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  )
}
