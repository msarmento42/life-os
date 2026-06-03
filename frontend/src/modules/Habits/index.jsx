import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, Circle, Flame, Check, Sparkles, Target, Zap, Link2, ChevronRight } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { SkeletonCard, SkeletonRow } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f97316']

function HabitStackLinker({ habits, onLink }) {
  const [habitId, setHabitId] = useState('')
  const [afterId, setAfterId] = useState('')

  const apply = () => {
    if (!habitId) return
    onLink(parseInt(habitId), afterId ? parseInt(afterId) : null)
    setHabitId('')
    setAfterId('')
  }

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="flex-1 min-w-[160px]">
        <label className="label text-xs">Habit to stack</label>
        <select className="input text-sm" value={habitId} onChange={e => setHabitId(e.target.value)}>
          <option value="">— Select habit —</option>
          {habits.map(h => (
            <option key={h.id} value={h.id}>{h.icon} {h.name}</option>
          ))}
        </select>
      </div>
      <div className="text-gray-500 text-sm pb-2">follows</div>
      <div className="flex-1 min-w-[160px]">
        <label className="label text-xs">After habit</label>
        <select className="input text-sm" value={afterId} onChange={e => setAfterId(e.target.value)}>
          <option value="">— None (start of chain) —</option>
          {habits.filter(h => h.id !== parseInt(habitId)).map(h => (
            <option key={h.id} value={h.id}>{h.icon} {h.name}</option>
          ))}
        </select>
      </div>
      <button className="btn-primary text-xs pb-2" onClick={apply} disabled={!habitId}>
        <Link2 className="w-3.5 h-3.5" /> Set Stack
      </button>
    </div>
  )
}
const WILLPOWER_LABELS = ['', 'Effortless', 'Easy', 'Moderate', 'Hard', 'Grueling']
const WILLPOWER_COLORS = ['', '#10b981', '#22c55e', '#f59e0b', '#f97316', '#ef4444']

export default function Habits() {
  const [habits, setHabits] = useState([])
  const [calendar, setCalendar] = useState([])
  const [routines, setRoutines] = useState([])
  const [keystone, setKeystone] = useState(null)
  const [objectives, setObjectives] = useState([])
  const [stacks, setStacks] = useState(null)
  const [tab, setTab] = useState('tracker')
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [showAddRoutine, setShowAddRoutine] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({ name: '', icon: '✅', color: '#6366f1', target_days_per_week: 7, goal_id: '', context: '', willpower_cost: 3 })
  const [loading, setLoading] = useState(true)
  const [keystoneLoading, setKeystoneLoading] = useState(false)
  const toast = useToast()

  const today = new Date().toISOString().split('T')[0]

  const load = async () => {
    setLoading(true)
    try {
      const [hRes, cRes, rRes, objRes] = await Promise.all([
        axios.get('/api/habits/'),
        axios.get('/api/habits/calendar'),
        axios.get('/api/habits/routines'),
        axios.get('/api/projects/objectives').catch(() => ({ data: [] })),
      ])
      setHabits(hRes.data)
      setCalendar(cRes.data)
      setRoutines(rRes.data)
      setObjectives(objRes.data)
    } finally {
      setLoading(false)
    }
  }

  const loadKeystone = async () => {
    setKeystoneLoading(true)
    try {
      const res = await axios.get('/api/habits/keystone')
      setKeystone(res.data)
    } finally {
      setKeystoneLoading(false)
    }
  }

  const loadStacks = async () => {
    try {
      const res = await axios.get('/api/habits/stacks')
      setStacks(res.data)
    } catch {
      // non-fatal
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (tab === 'insights') loadKeystone() }, [tab])
  useEffect(() => { if (tab === 'stacks') loadStacks() }, [tab])

  const linkStack = async (habitId, afterId) => {
    try {
      await axios.patch(`/api/habits/${habitId}`, {
        stack_after_id: afterId || null,
      })
      // Also clear before_id on the target if set
      toast.success('Stack updated')
      load()
      if (tab === 'stacks') loadStacks()
    } catch {
      toast.error('Failed to update stack')
    }
  }

  const toggleHabit = async (habitId, date, currentlyDone) => {
    try {
      await axios.post('/api/habits/log', { habit_id: habitId, date, completed: !currentlyDone })
      load()
    } catch {
      toast.error('Failed to update habit')
    }
  }

  const addHabit = async () => {
    try {
      await axios.post('/api/habits/', {
        ...form,
        goal_id: form.goal_id ? parseInt(form.goal_id) : null,
        willpower_cost: parseInt(form.willpower_cost),
      })
      toast.success('Habit added')
      setShowAddHabit(false)
      setForm({ name: '', icon: '✅', color: '#6366f1', target_days_per_week: 7, goal_id: '', context: '', willpower_cost: 3 })
      load()
    } catch {
      toast.error('Failed to add habit')
    }
  }

  const deleteHabit = async () => {
    try {
      await axios.delete(`/api/habits/${deleteId}`)
      toast.success('Habit deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete habit')
    }
  }

  // Get last 7 days for the tracker
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const dayLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return dateStr === today ? 'Today' : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
  }

  const overallScore = habits.length > 0
    ? Math.round(habits.filter(h => h.done_today).length / habits.length * 100) : 0

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-0">
        <div className="page-header mb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-amber-500"></div>
            <h1 className="page-title">Habits & Routines</h1>
          </div>
        </div>
        <nav className="tabs">
          {[['tracker', 'Tracker'], ['streaks', 'Streaks & Stats'], ['insights', 'Insights'], ['stacks', 'Stacks'], ['routines', 'Routines']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`tab ${id === tab ? 'tab-active text-amber-400' : 'tab-inactive'}`}>{label}</button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div key={tab} className="tab-panel page space-y-5">

        {tab === 'tracker' && (
          <>
            {/* Today score */}
            {loading ? (
              <SkeletonCard />
            ) : (
              <div className="card flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Today's Completion</div>
                  <div className="text-3xl font-bold text-gray-100">{overallScore}%</div>
                  <div className="text-xs text-gray-500">{habits.filter(h => h.done_today).length} of {habits.length} habits done</div>
                </div>
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#1f2937" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#f59e0b" strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - overallScore / 100)}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-amber-400">
                    {overallScore}%
                  </div>
                </div>
              </div>
            )}

            {/* 7-day grid */}
            <div className="card overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="section-title">7-Day View</div>
                <button className="btn-primary text-xs" onClick={() => setShowAddHabit(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add Habit
                </button>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonRow key={i} cols={10} />
                  ))}
                </div>
              ) : habits.length === 0 ? (
                <div className="py-8">
                  <EmptyState
                    icon={Check}
                    title="No habits yet"
                    description="Build positive habits by tracking daily consistency."
                    action={{ label: '✨ Add Your First Habit', onClick: () => setShowAddHabit(true) }}
                  />
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs text-gray-500 font-medium pb-3 pr-4 min-w-[160px]">Habit</th>
                      {last7.map(d => (
                        <th key={d} className="text-center text-xs text-gray-500 font-medium pb-3 px-1 min-w-[44px]">
                          <div className={d === today ? 'text-amber-400 font-semibold' : ''}>{dayLabel(d)}</div>
                          <div className="text-[10px] text-gray-700">{d.slice(8)}</div>
                        </th>
                      ))}
                      <th className="text-center text-xs text-gray-500 font-medium pb-3 px-1">🔥</th>
                      <th className="w-8 pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map(h => {
                      const calHabit = calendar.find(c => c.id === h.id)
                      return (
                        <tr key={h.id} className="group border-t border-gray-800/50">
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{h.icon}</span>
                              <div>
                                <span className="text-sm text-gray-200">{h.name}</span>
                                {/* S5.01: goal badge + context tooltip */}
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {h.goal_title && (
                                    <span className="badge bg-indigo-900/50 text-indigo-400 text-[10px] flex items-center gap-0.5">
                                      <Target className="w-2.5 h-2.5" />{h.goal_title}
                                    </span>
                                  )}
                                  {h.willpower_cost && (
                                    <span className="badge text-[10px]" style={{
                                      background: WILLPOWER_COLORS[h.willpower_cost] + '20',
                                      color: WILLPOWER_COLORS[h.willpower_cost],
                                    }}>
                                      <Zap className="w-2.5 h-2.5 inline mr-0.5" />{WILLPOWER_LABELS[h.willpower_cost]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          {last7.map(d => {
                            const dayData = calHabit?.days?.find(day => day.date === d)
                            const done = dayData?.completed
                            return (
                              <td key={d} className="py-2 px-1 text-center">
                                <button onClick={() => toggleHabit(h.id, d, done)}
                                  className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center transition-all border-2 ${
                                    done ? 'opacity-100' : 'opacity-60 hover:opacity-80'
                                  }`}
                                  style={{
                                    background: done ? h.color + '30' : 'transparent',
                                    borderColor: done ? h.color : '#374151',
                                  }}>
                                  {done && <div className="w-3 h-3 rounded-full" style={{ background: h.color }} />}
                                </button>
                              </td>
                            )
                          })}
                          <td className="py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-orange-400" />
                              <span className="text-sm font-semibold text-gray-200">{h.streak}</span>
                            </div>
                          </td>
                          <td className="py-2">
                            <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400"
                              onClick={() => setDeleteId(h.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === 'streaks' && (
          loading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : habits.length === 0 ? (
            <EmptyState
              icon={Flame}
              title="No streaks yet"
              description="Add habits to start building streaks."
              action={{ label: '🔥 Add Habit', onClick: () => { setTab('tracker'); setShowAddHabit(true) } }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {habits.map(h => (
                <div key={h.id} className="card border-l-4" style={{ borderColor: h.color }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{h.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-100 block truncate">{h.name}</span>
                      {h.goal_title && (
                        <span className="text-[10px] text-indigo-400 flex items-center gap-0.5">
                          <Target className="w-2.5 h-2.5" />{h.goal_title}
                        </span>
                      )}
                    </div>
                  </div>
                  {h.context && (
                    <div className="text-xs text-gray-500 mb-2 italic">"{h.context}"</div>
                  )}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-xl font-bold" style={{ color: h.color }}>{h.streak}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide">Streak</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-100">{h.completion_rate_30d}%</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide">30d Rate</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-100">{h.target_days_per_week}×</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide">Target</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${h.completion_rate_30d}%`, background: h.color }} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* S5.02 — Keystone Insights tab */}
        {tab === 'insights' && (
          <>
            {keystoneLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : !keystone || keystone.pairs.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Not enough data yet"
                description="Log habits consistently for 2+ weeks to see keystone patterns and co-occurrence insights."
              />
            ) : (
              <>
                {/* Keystone habit banner */}
                {keystone.keystone && (
                  <div className="card border border-amber-700/50 bg-amber-900/10">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{keystone.keystone.icon}</div>
                      <div>
                        <div className="text-xs text-amber-400 font-semibold uppercase tracking-wide mb-0.5">
                          ⭐ Keystone Habit
                        </div>
                        <div className="font-semibold text-gray-100">{keystone.keystone.name}</div>
                        <div className="text-xs text-gray-500">This habit appears most in your strongest co-occurrence chains.</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Co-occurrence pairs */}
                <div className="card">
                  <div className="section-title mb-1">Habit Co-occurrence Pairs</div>
                  <div className="text-xs text-gray-500 mb-4">When you do habit A, how often do you also do habit B?</div>
                  <div className="space-y-2">
                    {keystone.pairs.map((pair, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                        <div className="text-gray-500 text-xs w-4 text-right shrink-0">{i + 1}</div>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="text-base shrink-0">{pair.habit_a.icon}</span>
                          <span className="text-sm text-gray-200 truncate">{pair.habit_a.name}</span>
                          <span className="text-gray-600 mx-1 shrink-0">+</span>
                          <span className="text-base shrink-0">{pair.habit_b.icon}</span>
                          <span className="text-sm text-gray-200 truncate">{pair.habit_b.name}</span>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className={`text-sm font-bold ${pair.rate_pct >= 70 ? 'text-emerald-400' : pair.rate_pct >= 50 ? 'text-yellow-400' : 'text-gray-400'}`}>
                            {pair.rate_pct}%
                          </div>
                          <div className="text-[10px] text-gray-600">{pair.days_together}d together</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual habit completion rates */}
                <div className="card">
                  <div className="section-title mb-4">Individual Completion Rates (90 days)</div>
                  <div className="space-y-2">
                    {keystone.habit_completion_rates.map(h => (
                      <div key={h.id} className="flex items-center gap-3">
                        <span className="text-sm w-5 text-center shrink-0">{h.icon}</span>
                        <span className="text-sm text-gray-300 flex-1 truncate">{h.name}</span>
                        <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden shrink-0">
                          <div className="h-full rounded-full bg-amber-500"
                            style={{ width: `${Math.min(h.rate_pct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-10 text-right shrink-0">{h.rate_pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* HAB1.01 — Habit Stacking tab */}
        {tab === 'stacks' && (
          <>
            {/* Quick-link panel: set "follows" for any habit */}
            <div className="card">
              <div className="section-title mb-1">Link a Habit Stack</div>
              <div className="text-xs text-gray-500 mb-4">Choose a habit and pick which habit it should immediately follow.</div>
              <HabitStackLinker habits={habits} onLink={linkStack} />
            </div>

            {/* Current chains */}
            {!stacks || stacks.chain_count === 0 ? (
              <EmptyState
                icon={Link2}
                title="No habit stacks yet"
                description="Link habits together so they run in sequence. Use the panel above to build your first stack."
              />
            ) : (
              <div className="space-y-4">
                {stacks.chains.map((chain, ci) => (
                  <div key={ci} className="card p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Stack {ci + 1}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {chain.map((h, hi) => (
                        <div key={h.id} className="flex items-center gap-2">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800/60">
                            <span className="text-base">{h.icon}</span>
                            <span className="text-sm font-medium text-gray-200">{h.name}</span>
                          </div>
                          {hi < chain.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'routines' && (
          <>
            <div className="flex justify-end">
              <button className="btn-primary text-xs" onClick={() => setShowAddRoutine(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Routine
              </button>
            </div>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : routines.length === 0 ? (
              <EmptyState
                icon={Circle}
                title="No routines yet"
                description="Create ordered checklists for your morning, evening, or other routines."
                action={{ label: '📋 Add Routine', onClick: () => setShowAddRoutine(true) }}
              />
            ) : (
              <div className="space-y-4">
                {routines.map(r => (
                  <div key={r.id} className="card">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">{r.icon}</span>
                      <div>
                        <div className="font-semibold text-gray-100">{r.name}</div>
                        <div className="text-xs text-gray-500">{r.total_minutes} min total · {r.items.length} steps</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {r.items.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50">
                          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400 font-medium shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 text-sm text-gray-200">{item.description}</div>
                          {item.duration_min > 0 && (
                            <div className="text-xs text-gray-500 shrink-0">{item.duration_min} min</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {showAddHabit && (
        <Modal title="Add Habit" onClose={() => setShowAddHabit(false)} size="sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Habit Name</label>
                <input className="input" placeholder="Meditate" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Icon</label>
                <input className="input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
              </div>
              <div>
                <label className="label">Target Days/Week</label>
                <input className="input" type="number" min="1" max="7" value={form.target_days_per_week} onChange={e => setForm(f => ({ ...f, target_days_per_week: parseInt(e.target.value) }))} />
              </div>
            </div>

            {/* S5.01 — new fields */}
            <div>
              <label className="label">Link to Goal (optional)</label>
              <select className="input" value={form.goal_id} onChange={e => setForm(f => ({ ...f, goal_id: e.target.value }))}>
                <option value="">— No linked goal —</option>
                {objectives.map(obj => (
                  <option key={obj.id} value={obj.id}>{obj.title} (Q{obj.quarter} {obj.year})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Context / Why <span className="text-gray-600">(optional)</span></label>
              <input className="input" placeholder="Why this habit matters or when to do it" value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} />
            </div>

            <div>
              <label className="label">Willpower Cost</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setForm(f => ({ ...f, willpower_cost: n }))}
                    className={`flex-1 py-1.5 rounded text-xs font-medium border transition-all ${form.willpower_cost === n ? 'border-transparent' : 'border-gray-700 text-gray-500 bg-gray-800 hover:bg-gray-700'}`}
                    style={form.willpower_cost === n ? { background: WILLPOWER_COLORS[n] + '30', borderColor: WILLPOWER_COLORS[n] + '60', color: WILLPOWER_COLORS[n] } : {}}>
                    {n} {WILLPOWER_LABELS[n]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                      form.color === c ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : 'border-transparent hover:border-gray-600'
                    }`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button className="btn-secondary" onClick={() => setShowAddHabit(false)}>Cancel</button>
              <button className="btn-primary" onClick={addHabit}>Add Habit</button>
            </div>
          </div>
        </Modal>
      )}
      {deleteId && <ConfirmModal title="Delete Habit" message="Archive this habit and all its logs?" onConfirm={deleteHabit} onClose={() => setDeleteId(null)} />}
    </div>
  )
}
