import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts'
import { Plus, Trash2, ChevronLeft, ChevronRight, Settings, Flame, Beef, Wheat, Droplet } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { SkeletonCard, SkeletonStat } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'other']
const MEAL_LABELS = { breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner', snack: '🍎 Snack', other: '🍽️ Other' }
const MEAL_COLORS = { breakfast: '#f59e0b', lunch: '#10b981', dinner: '#6366f1', snack: '#f97316', other: '#6b7280' }

function fmt(n, unit = '') { return n != null ? `${Math.round(n)}${unit}` : '—' }
function fmtMacro(n) { return n != null ? `${Math.round(n)}g` : '—' }

function MacroBar({ label, icon: Icon, color, current, target, unit = '' }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const over = target > 0 && current > target
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`font-semibold ${over ? 'text-red-400' : 'text-gray-200'}`}>
            {unit === 'kcal' ? fmt(current) : fmtMacro(current)}
          </span>
          <span className="text-gray-600">/ {unit === 'kcal' ? fmt(target) : fmtMacro(target)}{unit === 'kcal' ? ' kcal' : ''}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: over ? '#ef4444' : color,
            opacity: over ? 1 : 0.85,
          }}
        />
      </div>
      <div className="text-[10px] text-gray-600 text-right">{pct}%</div>
    </div>
  )
}

function CaloriesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-green-400">{payload[0].value} kcal</p>
    </div>
  )
}

export default function Nutrition() {
  const [subTab, setSubTab] = useState('daily')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dailyData, setDailyData] = useState(null)
  const [weeklyData, setWeeklyData] = useState(null)
  const [targets, setTargets] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(null) // null | meal string
  const [showTargetsModal, setShowTargetsModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const toast = useToast()

  const loadDaily = async (d) => {
    try {
      const r = await axios.get(`/api/health/nutrition/daily/${d}`)
      setDailyData(r.data)
    } catch { setDailyData(null) }
  }

  const loadWeekly = async () => {
    try {
      const r = await axios.get('/api/health/nutrition/weekly')
      setWeeklyData(r.data)
    } catch { setWeeklyData(null) }
  }

  const loadTargets = async () => {
    try {
      const r = await axios.get('/api/health/nutrition/targets')
      setTargets(r.data)
    } catch {}
  }

  const load = async () => {
    setLoading(true)
    await Promise.all([loadDaily(selectedDate), loadWeekly(), loadTargets()])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!loading) loadDaily(selectedDate)
  }, [selectedDate])

  const shiftDate = (days) => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  const handleAddEntry = async (formData) => {
    try {
      await axios.post('/api/health/nutrition', { ...formData, date: selectedDate })
      toast.success('Entry added')
      setShowAddModal(null)
      await loadDaily(selectedDate)
      await loadWeekly()
    } catch { toast.error('Failed to add entry') }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/health/nutrition/${id}`)
      toast.success('Entry deleted')
      setDeleteTarget(null)
      await loadDaily(selectedDate)
      await loadWeekly()
    } catch { toast.error('Failed to delete entry') }
  }

  const handleSaveTargets = async (data) => {
    try {
      await axios.post('/api/health/nutrition/targets', data)
      toast.success('Targets updated')
      setShowTargetsModal(false)
      await load()
    } catch { toast.error('Failed to update targets') }
  }

  const weeklyChartData = (weeklyData?.days || []).map(d => ({
    date: d.date.slice(5),
    calories: d.calories,
    target: targets?.calories || 2200,
  }))

  if (loading) return (
    <div className="space-y-4 p-1">
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <SkeletonStat key={i} />)}</div>
      <SkeletonCard />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Sub-tab nav */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg">
          {['daily', 'weekly', 'targets'].map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                subTab === t ? 'bg-gray-700 text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {subTab === 'daily' && (
          <button className="btn-ghost p-1.5 text-xs flex items-center gap-1 text-gray-400"
            onClick={() => setShowTargetsModal(true)}>
            <Settings className="w-3.5 h-3.5" /> Targets
          </button>
        )}
      </div>

      {/* DAILY TAB */}
      {subTab === 'daily' && (
        <>
          {/* Date navigator */}
          <div className="flex items-center justify-between bg-gray-800/40 rounded-xl px-4 py-3">
            <button className="btn-ghost p-1.5" onClick={() => shiftDate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-100">
                {isToday ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              <div className="text-xs text-gray-500">{selectedDate}</div>
            </div>
            <button className="btn-ghost p-1.5" onClick={() => shiftDate(1)} disabled={isToday}>
              <ChevronRight className={`w-4 h-4 ${isToday ? 'opacity-30' : ''}`} />
            </button>
          </div>

          {/* Macro progress bars */}
          {targets && (
            <div className="card space-y-4">
              <MacroBar label="Calories" icon={Flame} color="#f59e0b" unit="kcal"
                current={dailyData?.totals?.calories || 0} target={targets.calories} />
              <MacroBar label="Protein" icon={Beef} color="#10b981"
                current={dailyData?.totals?.protein_g || 0} target={targets.protein_g} />
              <MacroBar label="Carbs" icon={Wheat} color="#6366f1"
                current={dailyData?.totals?.carbs_g || 0} target={targets.carbs_g} />
              <MacroBar label="Fat" icon={Droplet} color="#f97316"
                current={dailyData?.totals?.fat_g || 0} target={targets.fat_g} />
            </div>
          )}

          {/* Meal groups */}
          <div className="space-y-3">
            {MEAL_ORDER.map(meal => {
              const entries = dailyData?.meals?.[meal] || []
              const mealCals = entries.reduce((s, e) => s + (e.calories || 0), 0)
              return (
                <div key={meal} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{MEAL_LABELS[meal]}</span>
                      {mealCals > 0 && (
                        <span className="text-xs text-gray-500">{mealCals} kcal</span>
                      )}
                    </div>
                    <button
                      className="btn-ghost p-1 text-green-400 hover:bg-green-900/20"
                      onClick={() => setShowAddModal(meal)}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {entries.length === 0 ? (
                    <div className="text-xs text-gray-600 text-center py-2">
                      No entries — <button className="text-green-400 hover:underline" onClick={() => setShowAddModal(meal)}>add food</button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {entries.map(e => (
                        <div key={e.id} className="flex items-center justify-between group py-1 px-2 rounded-lg hover:bg-gray-800/50">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-200 truncate block">{e.food_item}</span>
                            <div className="flex gap-3 text-[10px] text-gray-500 mt-0.5">
                              {e.calories != null && <span>{e.calories} kcal</span>}
                              {e.protein_g != null && <span>P: {Math.round(e.protein_g)}g</span>}
                              {e.carbs_g != null && <span>C: {Math.round(e.carbs_g)}g</span>}
                              {e.fat_g != null && <span>F: {Math.round(e.fat_g)}g</span>}
                            </div>
                          </div>
                          <button
                            className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400 ml-2 flex-shrink-0"
                            onClick={() => setDeleteTarget(e)}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* WEEKLY TAB */}
      {subTab === 'weekly' && weeklyData && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="stat-card border-l-4 border-amber-500">
              <div className="stat-label">Avg Calories</div>
              <div className="stat-value">{Math.round(weeklyData.averages.calories || 0)}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">kcal / day</div>
            </div>
            <div className="stat-card border-l-4 border-emerald-500">
              <div className="stat-label">Avg Protein</div>
              <div className="stat-value">{Math.round(weeklyData.averages.protein_g || 0)}g</div>
            </div>
            <div className="stat-card border-l-4 border-indigo-500">
              <div className="stat-label">Avg Carbs</div>
              <div className="stat-value">{Math.round(weeklyData.averages.carbs_g || 0)}g</div>
            </div>
            <div className="stat-card border-l-4 border-orange-500">
              <div className="stat-label">Avg Fat</div>
              <div className="stat-value">{Math.round(weeklyData.averages.fat_g || 0)}g</div>
            </div>
          </div>

          {/* Calorie bar chart */}
          <div className="card">
            <div className="section-title mb-4">Daily Calories — Last 7 Days</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyChartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CaloriesTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="calories" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
                  {weeklyChartData.map((entry, i) => (
                    <Cell key={i}
                      fill={entry.calories >= entry.target ? '#10b981' : entry.calories > entry.target * 0.8 ? '#f59e0b' : '#6b7280'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block"></span>At / above target</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block"></span>&gt;80% of target</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-500 inline-block"></span>Under-logged</span>
            </div>
          </div>

          {/* Day-by-day table */}
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                <th className="table-header text-left px-4 py-3">Date</th>
                <th className="table-header text-right px-4 py-3">Calories</th>
                <th className="table-header text-right px-4 py-3">Protein</th>
                <th className="table-header text-right px-4 py-3">Carbs</th>
                <th className="table-header text-right px-4 py-3">Fat</th>
                <th className="table-header text-right px-4 py-3">Entries</th>
              </tr></thead>
              <tbody>
                {(weeklyData.days || []).map(d => (
                  <tr key={d.date} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <button className="text-xs text-gray-400 hover:text-green-400 transition-colors"
                        onClick={() => { setSelectedDate(d.date); setSubTab('daily') }}>
                        {d.date}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-200">{d.calories || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">{d.protein_g ? `${Math.round(d.protein_g)}g` : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">{d.carbs_g ? `${Math.round(d.carbs_g)}g` : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">{d.fat_g ? `${Math.round(d.fat_g)}g` : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {d.entry_count > 0
                        ? <span className="badge bg-gray-800 text-gray-400 text-[10px]">{d.entry_count}</span>
                        : <span className="text-gray-700 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TARGETS TAB */}
      {subTab === 'targets' && targets && (
        <TargetsForm targets={targets} onSave={handleSaveTargets} />
      )}

      {/* Add entry modal */}
      {showAddModal !== null && (
        <AddEntryModal
          defaultMeal={showAddModal}
          onClose={() => setShowAddModal(null)}
          onSave={handleAddEntry}
        />
      )}

      {/* Edit targets modal (from daily tab gear) */}
      {showTargetsModal && targets && (
        <TargetsModal targets={targets} onClose={() => setShowTargetsModal(false)} onSave={handleSaveTargets} />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Entry"
          message={`Delete "${deleteTarget.food_item}"?`}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget.id)}
        />
      )}
    </div>
  )
}

function AddEntryModal({ defaultMeal, onClose, onSave }) {
  const [f, setF] = useState({
    meal: defaultMeal || 'other',
    food_item: '',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    notes: '',
  })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const valid = f.food_item.trim().length > 0

  return (
    <Modal title="Add Food Entry" onClose={onClose} size="sm">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Food / Item</label>
            <input className="input" placeholder="Chicken breast, 200g" value={f.food_item}
              onChange={e => set('food_item', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Meal</label>
            <select className="input" value={f.meal} onChange={e => set('meal', e.target.value)}>
              {MEAL_ORDER.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Calories (kcal)</label>
            <input className="input" type="number" placeholder="330" value={f.calories}
              onChange={e => set('calories', e.target.value)} />
          </div>
          <div>
            <label className="label">Protein (g)</label>
            <input className="input" type="number" step="0.1" placeholder="62" value={f.protein_g}
              onChange={e => set('protein_g', e.target.value)} />
          </div>
          <div>
            <label className="label">Carbs (g)</label>
            <input className="input" type="number" step="0.1" placeholder="0" value={f.carbs_g}
              onChange={e => set('carbs_g', e.target.value)} />
          </div>
          <div>
            <label className="label">Fat (g)</label>
            <input className="input" type="number" step="0.1" placeholder="7" value={f.fat_g}
              onChange={e => set('fat_g', e.target.value)} />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input className="input" placeholder="Grilled, seasoned" value={f.notes}
              onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!valid} onClick={() => onSave({
            meal: f.meal,
            food_item: f.food_item.trim(),
            calories: f.calories ? parseInt(f.calories) : null,
            protein_g: f.protein_g ? parseFloat(f.protein_g) : null,
            carbs_g: f.carbs_g ? parseFloat(f.carbs_g) : null,
            fat_g: f.fat_g ? parseFloat(f.fat_g) : null,
            notes: f.notes || null,
          })}>Add Entry</button>
        </div>
      </div>
    </Modal>
  )
}

function TargetsForm({ targets, onSave }) {
  const [f, setF] = useState({ calories: targets.calories, protein_g: targets.protein_g, carbs_g: targets.carbs_g, fat_g: targets.fat_g })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  // Derived: macros as % of calories
  const fromMacros = Math.round((f.protein_g * 4) + (f.carbs_g * 4) + (f.fat_g * 9))

  return (
    <div className="card space-y-4">
      <div className="section-title">Daily Macro Targets</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Calories (kcal)</label>
          <input className="input" type="number" value={f.calories} onChange={e => set('calories', parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label">Protein (g)</label>
          <input className="input" type="number" step="0.1" value={f.protein_g} onChange={e => set('protein_g', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label">Carbs (g)</label>
          <input className="input" type="number" step="0.1" value={f.carbs_g} onChange={e => set('carbs_g', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label">Fat (g)</label>
          <input className="input" type="number" step="0.1" value={f.fat_g} onChange={e => set('fat_g', parseFloat(e.target.value) || 0)} />
        </div>
      </div>
      <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg px-3 py-2">
        Macro calorie sum: <span className="text-gray-300 font-medium">{fromMacros} kcal</span>
        {Math.abs(fromMacros - f.calories) > 50 && (
          <span className="text-amber-400 ml-2">⚠️ {Math.abs(fromMacros - f.calories)} kcal gap vs. calorie target</span>
        )}
      </div>
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => onSave(f)}>Save Targets</button>
      </div>
    </div>
  )
}

function TargetsModal({ targets, onClose, onSave }) {
  const [f, setF] = useState({ calories: targets.calories, protein_g: targets.protein_g, carbs_g: targets.carbs_g, fat_g: targets.fat_g })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  return (
    <Modal title="Edit Macro Targets" onClose={onClose} size="sm">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Calories</label><input className="input" type="number" value={f.calories} onChange={e => set('calories', parseInt(e.target.value) || 0)} /></div>
          <div><label className="label">Protein (g)</label><input className="input" type="number" step="0.1" value={f.protein_g} onChange={e => set('protein_g', parseFloat(e.target.value) || 0)} /></div>
          <div><label className="label">Carbs (g)</label><input className="input" type="number" step="0.1" value={f.carbs_g} onChange={e => set('carbs_g', parseFloat(e.target.value) || 0)} /></div>
          <div><label className="label">Fat (g)</label><input className="input" type="number" step="0.1" value={f.fat_g} onChange={e => set('fat_g', parseFloat(e.target.value) || 0)} /></div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(f)}>Save</button>
        </div>
      </div>
    </Modal>
  )
}
