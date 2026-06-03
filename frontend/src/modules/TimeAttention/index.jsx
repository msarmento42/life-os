/**
 * Time & Attention — Sprint S3A
 * Accent: teal (#14b8a6)
 * Views: Today · Weekly · Focus Log
 */

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useCountUp } from '../../hooks/useCountUp'
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import {
  Clock, Plus, Zap, X, Check, ChevronLeft, ChevronRight,
  Calendar, BarChart2, Edit3, Trash2, Target, TrendingUp, AlertTriangle,
} from 'lucide-react'
import { SkeletonCard, SkeletonStat, SkeletonRow } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAL = '#14b8a6'

const CATEGORY_META = {
  deep_work: { label: 'Deep Work',  color: '#6366f1' },
  meetings:  { label: 'Meetings',   color: '#f59e0b' },
  admin:     { label: 'Admin',      color: '#6b7280' },
  health:    { label: 'Health',     color: '#ef4444' },
  social:    { label: 'Social',     color: '#ec4899' },
  leisure:   { label: 'Leisure',    color: '#8b5cf6' },
  recovery:  { label: 'Recovery',   color: '#14b8a6' },
  learning:  { label: 'Learning',   color: '#10b981' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHours(mins) {
  if (!mins) return '0h'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!h) return `${m}m`
  if (!m) return `${h}h`
  return `${h}h ${m}m`
}

function isoDate(d) {
  return d.toISOString().split('T')[0]
}

function startOfWeek(d = new Date()) {
  const day = new Date(d)
  const dow = day.getDay()
  day.setDate(day.getDate() - ((dow + 6) % 7)) // Monday
  return day
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function weekLabel(weekStart) {
  const end = addDays(weekStart, 6)
  const opts = { month: 'short', day: 'numeric' }
  return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = TEAL, loading }) {
  if (loading) return <SkeletonStat />
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value ?? '—'}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function CategoryPill({ category, size = 'sm' }) {
  const meta = CATEGORY_META[category] || { label: category, color: '#6b7280' }
  const sz = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <span
      className={`inline-block rounded-full font-medium ${sz}`}
      style={{ backgroundColor: meta.color + '22', color: meta.color }}
    >
      {meta.label}
    </span>
  )
}

function EnergyDot({ value }) {
  if (!value) return null
  const color = value >= 7 ? '#10b981' : value >= 4 ? '#f59e0b' : '#ef4444'
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium" style={{ color }}>
      <Zap className="w-3 h-3" />
      {value}
    </span>
  )
}

// Vertical timeline row for a single time block
function BlockRow({ block, onEdit, onDelete }) {
  const meta = CATEGORY_META[block.category] || { label: block.category, color: '#6b7280' }
  return (
    <div className="group flex items-stretch gap-3">
      {/* Time axis */}
      <div className="w-14 text-right shrink-0 pt-1">
        <div className="text-xs font-mono text-gray-500">{block.start_time}</div>
        <div className="text-[10px] font-mono text-gray-600">{block.end_time}</div>
      </div>

      {/* Color bar */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-0.5 flex-1 rounded-full" style={{ backgroundColor: meta.color }} />
        <div className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: meta.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="card card-hover p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <CategoryPill category={block.category} size="xs" />
                {block.planned && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-medium">Planned</span>
                )}
                <span className="text-xs text-gray-500">{fmtHours(block.duration_min)}</span>
              </div>
              <div className="text-sm font-medium text-gray-200 truncate">
                {block.title || block.subcategory || meta.label}
              </div>
              {block.notes && (
                <div className="text-xs text-gray-500 mt-0.5 truncate">{block.notes}</div>
              )}
              {(block.energy_start || block.energy_end) && (
                <div className="flex items-center gap-2 mt-1.5">
                  {block.energy_start && <span className="text-[10px] text-gray-600">Start: <EnergyDot value={block.energy_start} /></span>}
                  {block.energy_end   && <span className="text-[10px] text-gray-600">End: <EnergyDot value={block.energy_end} /></span>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => onEdit(block)} className="icon-btn" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
              <button onClick={() => onDelete(block.id)} className="icon-btn text-red-400 hover:text-red-300" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Custom pie chart tooltip
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg text-sm">
      <div className="font-medium text-gray-100" style={{ color: d.color }}>{d.category?.replace('_', ' ')}</div>
      <div className="text-gray-400 mt-1">{fmtHours(d.minutes)}</div>
      {d.planned > 0 && <div className="text-xs text-gray-600 mt-0.5">Planned: {fmtHours(d.planned)} · Actual: {fmtHours(d.actual)}</div>}
    </div>
  )
}

// ── Add / Edit block modal ────────────────────────────────────────────────────

const BLANK_BLOCK = {
  date: isoDate(new Date()),
  start_time: '09:00',
  end_time: '10:00',
  category: 'deep_work',
  subcategory: '',
  title: '',
  notes: '',
  energy_start: '',
  energy_end: '',
  planned: false,
}

function BlockModal({ block, onClose, onSaved, toast }) {
  const editing = !!block?.id
  const [form, setForm] = useState(
    block ? {
      date: block.date,
      start_time: block.start_time,
      end_time: block.end_time,
      category: block.category,
      subcategory: block.subcategory || '',
      title: block.title || '',
      notes: block.notes || '',
      energy_start: block.energy_start ?? '',
      energy_end: block.energy_end ?? '',
      planned: block.planned ?? false,
    } : { ...BLANK_BLOCK }
  )
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.date || !form.start_time || !form.end_time || !form.category) {
      toast.warning('Please fill in date, start time, end time, and category.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        energy_start: form.energy_start !== '' ? Number(form.energy_start) : null,
        energy_end:   form.energy_end   !== '' ? Number(form.energy_end)   : null,
        subcategory:  form.subcategory || null,
        title:        form.title || null,
        notes:        form.notes || null,
      }
      if (editing) {
        await axios.patch(`/api/time/blocks/${block.id}`, payload)
        toast.success('Block updated')
      } else {
        await axios.post('/api/time/blocks', payload)
        toast.success('Block added')
      }
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to save block')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 space-y-4 animate-scale-in">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-100">{editing ? 'Edit Block' : 'Add Time Block'}</h2>
          <button onClick={onClose} className="icon-btn"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className="label">Start time</label>
            <input type="time" className="input" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
          </div>
          <div>
            <label className="label">End time</label>
            <input type="time" className="input" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {Object.entries(CATEGORY_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Title <span className="text-gray-600">(optional)</span></label>
            <input className="input" placeholder="e.g. Life OS build session" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label className="label">Energy start (1–10)</label>
            <input type="number" min="1" max="10" className="input" placeholder="—" value={form.energy_start} onChange={e => set('energy_start', e.target.value)} />
          </div>
          <div>
            <label className="label">Energy end (1–10)</label>
            <input type="number" min="1" max="10" className="input" placeholder="—" value={form.energy_end} onChange={e => set('energy_end', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Notes <span className="text-gray-600">(optional)</span></label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="planned" className="accent-teal-500" checked={form.planned} onChange={e => set('planned', e.target.checked)} />
            <label htmlFor="planned" className="text-sm text-gray-400 cursor-pointer">Planned in advance (vs. logged retroactively)</label>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1" style={{ '--btn-color': TEAL }}>
            {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Block')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Focus Log panel ───────────────────────────────────────────────────────────

const BLANK_FOCUS = { primary_focus: '', distractions: '', energy_drain: '', energy_boost: '', deep_work_hrs: '', overall_score: '' }

function FocusLogForm({ log, dateStr, onSaved, toast }) {
  const [form, setForm] = useState(log ? {
    primary_focus: log.primary_focus || '',
    distractions:  log.distractions  || '',
    energy_drain:  log.energy_drain  || '',
    energy_boost:  log.energy_boost  || '',
    deep_work_hrs: log.deep_work_hrs ?? '',
    overall_score: log.overall_score ?? '',
  } : { ...BLANK_FOCUS })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      await axios.post('/api/time/focus', {
        date: dateStr,
        ...form,
        deep_work_hrs: form.deep_work_hrs !== '' ? Number(form.deep_work_hrs) : null,
        overall_score: form.overall_score !== '' ? Number(form.overall_score) : null,
        primary_focus: form.primary_focus || null,
        distractions:  form.distractions  || null,
        energy_drain:  form.energy_drain  || null,
        energy_boost:  form.energy_boost  || null,
      })
      toast.success('Focus log saved')
      onSaved()
    } catch {
      toast.error('Failed to save focus log')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-4">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-teal-400" />
          <h3 className="card-title">Focus Log</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Primary focus today</label>
          <input className="input" placeholder="e.g. Life OS sprint, content writing…" value={form.primary_focus} onChange={e => set('primary_focus', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">What broke focus?</label>
          <input className="input" placeholder="Slack, phone, unexpected tasks…" value={form.distractions} onChange={e => set('distractions', e.target.value)} />
        </div>
        <div>
          <label className="label">Energy drain</label>
          <input className="input" placeholder="What drained you?" value={form.energy_drain} onChange={e => set('energy_drain', e.target.value)} />
        </div>
        <div>
          <label className="label">Energy boost</label>
          <input className="input" placeholder="What gave you energy?" value={form.energy_boost} onChange={e => set('energy_boost', e.target.value)} />
        </div>
        <div>
          <label className="label">Deep work hours</label>
          <input type="number" min="0" max="16" step="0.5" className="input" placeholder="e.g. 3.5" value={form.deep_work_hrs} onChange={e => set('deep_work_hrs', e.target.value)} />
        </div>
        <div>
          <label className="label">Focus score (1–10)</label>
          <input type="number" min="1" max="10" className="input" placeholder="—" value={form.overall_score} onChange={e => set('overall_score', e.target.value)} />
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full" style={{ '--btn-color': TEAL }}>
        {saving ? 'Saving…' : 'Save Focus Log'}
      </button>
    </div>
  )
}

// ── Today View ────────────────────────────────────────────────────────────────

function TodayView({ onAddBlock }) {
  const today = new Date()
  const dateStr = isoDate(today)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingBlock, setEditingBlock] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await axios.get(`/api/time/summary/daily/${dateStr}`)
      setSummary(r.data)
    } catch {
      toast.error('Failed to load today\'s data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Count-up animations — must be called unconditionally (before loading early return)
  const animTotalMin   = useCountUp(summary?.total_min || 0)
  const animDeepMin    = useCountUp(summary?.breakdown?.find(b => b.category === 'deep_work')?.minutes || 0)
  const animFocusScore = useCountUp(summary?.focus_log?.overall_score || 0)

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/time/blocks/${id}`)
      toast.success('Block deleted')
      load()
    } catch { toast.error('Delete failed') }
  }

  const handleEdit = (block) => {
    setEditingBlock(block)
    setModalOpen(true)
  }

  const handleAdd = () => {
    setEditingBlock(null)
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonStat key={i} />)}</div>
        <SkeletonCard /><SkeletonCard />
      </div>
    )
  }

  const blocks = summary?.blocks || []
  const breakdown = summary?.breakdown || []
  const focusLog = summary?.focus_log

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Date header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-100">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
          <div className="text-sm text-gray-500 mt-0.5">
            {summary?.total_hrs ? `${summary.total_hrs}h tracked today` : 'No blocks logged yet'}
          </div>
        </div>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2" style={{ '--btn-color': TEAL }}>
          <Plus className="w-4 h-4" /> Add Block
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total tracked" value={fmtHours(Math.round(animTotalMin))} color={TEAL} />
        <StatCard
          label="Deep work"
          value={fmtHours(Math.round(animDeepMin))}
          color="#6366f1"
        />
        <StatCard
          label="Focus score"
          value={summary?.focus_log?.overall_score ? `${Math.round(animFocusScore)}/10` : '—'}
          color="#f59e0b"
        />
      </div>

      {/* Category breakdown pills */}
      {breakdown.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Time by Category</h3></div>
          <div className="space-y-2">
            {breakdown.map(b => {
              const meta = CATEGORY_META[b.category] || { color: '#6b7280' }
              return (
                <div key={b.category} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-gray-400 shrink-0">
                    <CategoryPill category={b.category} size="xs" />
                  </div>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${b.pct}%`, backgroundColor: meta.color }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 w-12 text-right shrink-0">{fmtHours(b.minutes)}</div>
                  <div className="text-xs text-gray-600 w-10 text-right shrink-0">{b.pct}%</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Timeline</h3>
        {blocks.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No blocks logged yet"
            description="Add your first time block to start tracking your day."
            action={{ label: 'Add Block', onClick: handleAdd }}
          />
        ) : (
          <div className="space-y-0">
            {blocks.map(b => (
              <BlockRow key={b.id} block={b} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Focus Log */}
      <FocusLogForm log={focusLog} dateStr={dateStr} onSaved={load} toast={toast} />

      {modalOpen && (
        <BlockModal
          block={editingBlock}
          onClose={() => setModalOpen(false)}
          onSaved={load}
          toast={toast}
        />
      )}
    </div>
  )
}

// ── Weekly View ───────────────────────────────────────────────────────────────

function WeeklyView() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await axios.get('/api/time/summary/weekly', { params: { week_start: isoDate(weekStart) } })
      setData(r.data)
    } catch {
      toast.error('Failed to load weekly data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [weekStart])

  // Count-up for weekly stats — must be before loading early return
  const animTotalHrs  = useCountUp(data?.total_hrs       || 0)
  const animDeepHrs   = useCountUp(data?.deep_work_hrs   || 0)
  const animAvgFocus  = useCountUp(data?.avg_focus_score || 0)
  const animDeepRatio = useCountUp(
    data?.total_min ? Math.round((data.deep_work_min / data.total_min) * 100) : 0
  )

  const prevWeek = () => setWeekStart(w => addDays(w, -7))
  const nextWeek = () => setWeekStart(w => addDays(w, 7))
  const isCurrentWeek = isoDate(weekStart) === isoDate(startOfWeek())

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <SkeletonStat key={i} />)}</div>
        <SkeletonCard /><SkeletonCard />
      </div>
    )
  }

  const pie = (data?.pie_data || []).filter(d => d.minutes > 0)
  const dailySeries = (data?.daily_series || []).map(d => ({
    ...d,
    name: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    hours: +(d.minutes / 60).toFixed(1),
  }))

  // Planned vs Actual bar data
  const pvA = pie.map(d => ({
    name: (CATEGORY_META[d.category]?.label || d.category).replace(' ', '\n'),
    planned: +(d.planned / 60).toFixed(1),
    actual:  +(d.actual  / 60).toFixed(1),
  })).filter(d => d.planned > 0 || d.actual > 0)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Week nav */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-100">{weekLabel(weekStart)}</h2>
          {isCurrentWeek && <div className="text-xs text-teal-400 mt-0.5">Current week</div>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="icon-btn"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={nextWeek} disabled={isCurrentWeek} className="icon-btn disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total tracked" value={data?.total_hrs != null ? `${animTotalHrs.toFixed(1)}h` : '0h'} color={TEAL} />
        <StatCard label="Deep work" value={data?.deep_work_hrs != null ? `${animDeepHrs.toFixed(1)}h` : '0h'} color="#6366f1" />
        <StatCard label="Avg focus" value={data?.avg_focus_score != null ? `${animAvgFocus.toFixed(1)}/10` : '—'} color="#f59e0b" />
        <StatCard
          label="Deep work ratio"
          value={data?.total_min ? `${Math.round(animDeepRatio)}%` : '—'}
          color="#10b981"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Category Breakdown</h3></div>
          {pie.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">No data this week</div>
          ) : (
            <>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pie} dataKey="minutes" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}
                      isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                      {pie.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <RTooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="mt-3 space-y-1">
                {pie.map(d => (
                  <div key={d.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-gray-400">{CATEGORY_META[d.category]?.label || d.category}</span>
                    </div>
                    <span className="text-gray-500">{fmtHours(d.minutes)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Daily bar chart */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Hours Per Day</h3></div>
          {dailySeries.every(d => !d.hours) ? (
            <div className="text-sm text-gray-500 text-center py-8">No data this week</div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailySeries} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <RTooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                    labelStyle={{ color: '#f9fafb', fontSize: 12 }}
                    itemStyle={{ color: TEAL, fontSize: 12 }}
                    formatter={(v) => [`${v}h`, 'Hours']}
                    cursor={{ fill: 'rgba(20,184,166,0.08)' }}
                  />
                  <Bar dataKey="hours" fill={TEAL} radius={[4, 4, 0, 0]}
                    isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Planned vs Actual (only if there's planned data) */}
      {pvA.some(d => d.planned > 0) && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Planned vs. Actual</h3></div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pvA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#f9fafb', fontSize: 12 }}
                  formatter={(v) => [`${v}h`]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Bar dataKey="planned" name="Planned" fill="#374151" radius={[4, 4, 0, 0]}
                  isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="actual"  name="Actual"  fill={TEAL}    radius={[4, 4, 0, 0]}
                  isAnimationActive={true} animationDuration={900} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Focus logs for the week */}
      {data?.focus_logs?.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Focus Log — This Week</h3></div>
          <div className="space-y-3">
            {data.focus_logs.map(f => (
              <div key={f.id} className="border-b border-gray-800 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-300">
                    {new Date(f.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {f.deep_work_hrs && <span>🎯 {f.deep_work_hrs}h deep work</span>}
                    {f.overall_score && <span className="font-medium" style={{ color: f.overall_score >= 7 ? '#10b981' : f.overall_score >= 5 ? '#f59e0b' : '#ef4444' }}>Score: {f.overall_score}/10</span>}
                  </div>
                </div>
                {f.primary_focus && <div className="text-xs text-gray-400">📌 {f.primary_focus}</div>}
                {f.energy_boost   && <div className="text-xs text-gray-600 mt-0.5">⚡ {f.energy_boost}</div>}
                {f.distractions   && <div className="text-xs text-gray-600 mt-0.5">⚠️ {f.distractions}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Patterns View ─────────────────────────────────────────────────────────────

function PatternsView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await axios.get('/api/time/patterns', { params: { days: 30 } })
      setData(r.data)
    } catch {
      toast.error('Failed to load patterns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="page">
        <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      </div>
    )
  }

  if (!data) return null

  const { top_distractions, focus_by_day_of_week, over_budget_categories,
          logs_analyzed, logs_with_distractions, period_days } = data

  const maxDistrCount = top_distractions?.[0]?.count || 1
  const focusMin = Math.min(...(focus_by_day_of_week?.map(d => d.avg_score) || [0]))
  const focusMax = Math.max(...(focus_by_day_of_week?.map(d => d.avg_score) || [10]))

  function scoreColor(score) {
    if (score >= 7.5) return '#10b981'
    if (score >= 5.5) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="page max-w-3xl">
      {/* Header meta */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-100">Distraction Patterns</h2>
          <p className="text-xs text-gray-500">
            Based on {logs_analyzed} focus logs over the last {period_days} days
            {logs_with_distractions > 0 && ` · ${logs_with_distractions} logs with distractions noted`}
          </p>
        </div>
      </div>

      {/* Top Distractions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Top Recurring Distractions</h3>
        </div>
        {!top_distractions?.length ? (
          <EmptyState icon={AlertTriangle} title="No distraction data yet" description="Add notes to your focus log's 'What broke focus?' field to see patterns here." />
        ) : (
          <div className="space-y-3">
            {top_distractions.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 text-xs text-gray-600 font-mono shrink-0 text-right">{i + 1}</div>
                <div className="w-32 text-sm text-gray-300 truncate shrink-0">{d.name}</div>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(d.count / maxDistrCount) * 100}%`, backgroundColor: '#f59e0b' }}
                  />
                </div>
                <div className="text-xs text-gray-500 w-20 text-right shrink-0">
                  {d.count}× · {d.pct}% of days
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Focus score by day of week */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Focus Score by Day of Week</h3>
        </div>
        {!focus_by_day_of_week?.length ? (
          <EmptyState icon={BarChart2} title="No focus score data" description="Log a focus score each day to see which days you focus best." />
        ) : (
          <div className="space-y-2">
            {focus_by_day_of_week.map(d => (
              <div key={d.day} className="flex items-center gap-3">
                <div className="w-10 text-xs text-gray-400 shrink-0 font-medium">{d.day}</div>
                <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(d.avg_score / 10) * 100}%`,
                      backgroundColor: scoreColor(d.avg_score),
                    }}
                  />
                </div>
                <div className="text-xs font-semibold w-10 text-right shrink-0" style={{ color: scoreColor(d.avg_score) }}>
                  {d.avg_score}/10
                </div>
                <div className="text-xs text-gray-600 w-12 text-right shrink-0">
                  {d.count} day{d.count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
        {focus_by_day_of_week?.length > 0 && (() => {
          const sorted = [...focus_by_day_of_week].sort((a, b) => b.avg_score - a.avg_score)
          const best = sorted[0]
          const worst = sorted[sorted.length - 1]
          return (
            <div className="mt-4 pt-4 border-t border-gray-800 flex gap-6 text-xs">
              <div>
                <span className="text-gray-600">Best focus day: </span>
                <span className="text-emerald-400 font-medium">{best?.day} ({best?.avg_score})</span>
              </div>
              <div>
                <span className="text-gray-600">Worst focus day: </span>
                <span className="text-red-400 font-medium">{worst?.day} ({worst?.avg_score})</span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Over-budget categories */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Categories Running Over Budget</h3>
          <span className="text-xs text-gray-500">Planned vs. actual · last {period_days} days</span>
        </div>
        {!over_budget_categories?.length ? (
          <EmptyState icon={Clock} title="No over-budget categories" description="Mark time blocks as 'Planned' to start tracking planned vs. actual time." />
        ) : (
          <div className="space-y-4">
            {over_budget_categories.map(cat => {
              const overBudget = cat.over_pct > 0
              const icon = overBudget ? '↑' : '↓'
              const chipColor = overBudget ? '#ef4444' : '#10b981'
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CategoryPill category={cat.category} size="sm" />
                      <span
                        className="text-xs font-medium px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: chipColor + '22', color: chipColor }}
                      >
                        {icon} {Math.abs(cat.over_pct)}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {cat.planned_hrs}h planned · {cat.actual_hrs}h actual
                    </div>
                  </div>
                  {/* Stacked bar: planned (gray) vs actual (category color) */}
                  <div className="flex h-2 gap-0.5 rounded-full overflow-hidden bg-gray-800">
                    <div
                      className="h-full rounded-l-full"
                      style={{
                        width: `${Math.min(100, (cat.planned_hrs / Math.max(cat.planned_hrs, cat.actual_hrs)) * 100)}%`,
                        backgroundColor: '#374151',
                      }}
                    />
                    <div
                      className="h-full rounded-r-full flex-1"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'today',    label: 'Today',    icon: Clock          },
  { id: 'weekly',   label: 'Weekly',   icon: BarChart2      },
  { id: 'patterns', label: 'Patterns', icon: AlertTriangle  },
]

export default function TimeAttention() {
  const [tab, setTab] = useState('today')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-0 border-b border-gray-800/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: TEAL + '22' }}>
            <Clock className="w-4 h-4" style={{ color: TEAL }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">Time & Attention</h1>
            <p className="text-sm text-gray-500">Track where your time and focus actually go</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? 'border-teal-400 text-teal-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* key forces re-mount on tab switch → tab-panel fade-in-up animation */}
      <div key={tab} className="tab-panel flex-1 overflow-y-auto">
        {tab === 'today'    && <TodayView />}
        {tab === 'weekly'   && <WeeklyView />}
        {tab === 'patterns' && <PatternsView />}
      </div>
    </div>
  )
}
