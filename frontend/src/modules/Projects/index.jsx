import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Plus, Trash2, CheckCircle2, Circle, Target, FolderOpen, ClipboardList, Star, RefreshCw, ThumbsUp, ThumbsDown, ChevronDown, GitBranch, X, ArrowRight, Lock, TrendingUp, AlertTriangle, CheckCircle, Clock, Calendar, Tag, LayoutGrid } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { SkeletonCard, SkeletonRow } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'

const PROJECT_TYPES = [
  'product', 'content', 'learning', 'health', 'financial', 'relationship', 'operational', 'other'
]

const TYPE_CONFIG = {
  product:      { label: 'Product',      color: 'bg-blue-900/50 text-blue-400 border-blue-700/40' },
  content:      { label: 'Content',      color: 'bg-purple-900/50 text-purple-400 border-purple-700/40' },
  learning:     { label: 'Learning',     color: 'bg-amber-900/50 text-amber-400 border-amber-700/40' },
  health:       { label: 'Health',       color: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/40' },
  financial:    { label: 'Financial',    color: 'bg-green-900/50 text-green-400 border-green-700/40' },
  relationship: { label: 'Relationship', color: 'bg-pink-900/50 text-pink-400 border-pink-700/40' },
  operational:  { label: 'Ops',          color: 'bg-orange-900/50 text-orange-400 border-orange-700/40' },
  other:        { label: 'Other',        color: 'bg-gray-800 text-gray-500 border-gray-700/40' },
}

const TYPE_CHART_COLORS = {
  product: '#3b82f6', content: '#a855f7', learning: '#f59e0b',
  health: '#10b981', financial: '#22c55e', relationship: '#ec4899',
  operational: '#f97316', other: '#6b7280',
}

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.other
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${cfg.color}`}>
      <Tag className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  )
}

const STATUS_COLORS = {
  active: 'bg-emerald-900/50 text-emerald-400',
  completed: 'bg-blue-900/50 text-blue-400',
  paused: 'bg-yellow-900/50 text-yellow-400',
  backlog: 'bg-gray-800 text-gray-500',
  abandoned: 'bg-red-900/50 text-red-400',
}
const PRIORITY_COLORS = {
  high: 'text-red-400', medium: 'text-amber-400', low: 'text-gray-500'
}

const RATING_STARS = [1, 2, 3, 4, 5]

const now = new Date()
const currentQ = Math.ceil((now.getMonth() + 1) / 3)

const EMPTY_POSTMORTEM = { what_worked: '', what_didnt: '', key_lesson: '', would_repeat: true, rating: 3 }

function PostmortemSection({ project, onSaved, toast }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(EMPTY_POSTMORTEM)
  const [saving, setSaving] = useState(false)
  const pm = project.postmortem

  useEffect(() => {
    if (pm) {
      setForm({
        what_worked: pm.what_worked,
        what_didnt: pm.what_didnt,
        key_lesson: pm.key_lesson,
        would_repeat: pm.would_repeat,
        rating: pm.rating,
      })
    } else {
      setForm(EMPTY_POSTMORTEM)
    }
  }, [pm, project.id])

  const save = async () => {
    if (!form.what_worked.trim() || !form.what_didnt.trim() || !form.key_lesson.trim()) {
      toast.error('Please fill in all three reflection fields')
      return
    }
    setSaving(true)
    try {
      if (pm) {
        await axios.put(`/api/projects/${project.id}/postmortem`, form)
      } else {
        await axios.post(`/api/projects/${project.id}/postmortem`, form)
      }
      toast.success(pm ? 'Post-mortem updated' : 'Post-mortem saved ✓')
      setEditing(false)
      onSaved()
    } catch {
      toast.error('Failed to save post-mortem')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    try {
      await axios.delete(`/api/projects/${project.id}/postmortem`)
      toast.success('Post-mortem deleted')
      onSaved()
    } catch {
      toast.error('Failed to delete post-mortem')
    }
  }

  // Prompt banner when needed and not yet written
  if (!pm && !editing) {
    return (
      <div className="card border border-dashed border-amber-700/50 bg-amber-900/10">
        <div className="flex items-start gap-3">
          <ClipboardList className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-amber-300 text-sm">Write a post-mortem</div>
            <div className="text-xs text-gray-500 mt-1">
              {project.status === 'completed' ? 'Project completed' : 'Project abandoned'} — capture what worked, what didn't, and the key lesson.
            </div>
          </div>
          <button className="btn-primary text-xs shrink-0" onClick={() => setEditing(true)}>
            Start Reflection
          </button>
        </div>
      </div>
    )
  }

  if (editing || !pm) {
    return (
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="section-title flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-400" /> Post-Mortem
          </div>
          {pm && (
            <button className="btn-ghost text-xs text-gray-500" onClick={() => setEditing(false)}>Cancel</button>
          )}
        </div>

        <div>
          <label className="label">✅ What worked well?</label>
          <textarea className="input" rows={3}
            value={form.what_worked}
            onChange={e => setForm(f => ({ ...f, what_worked: e.target.value }))}
            placeholder="Strategies, habits, decisions that paid off..." />
        </div>

        <div>
          <label className="label">❌ What didn't work?</label>
          <textarea className="input" rows={3}
            value={form.what_didnt}
            onChange={e => setForm(f => ({ ...f, what_didnt: e.target.value }))}
            placeholder="Mistakes, blockers, wrong assumptions..." />
        </div>

        <div>
          <label className="label">💡 Key lesson</label>
          <textarea className="input" rows={2}
            value={form.key_lesson}
            onChange={e => setForm(f => ({ ...f, key_lesson: e.target.value }))}
            placeholder="The single most important takeaway from this project..." />
        </div>

        <div className="flex items-center gap-6">
          <div>
            <label className="label mb-1.5">Rating</label>
            <div className="flex gap-1">
              {RATING_STARS.map(n => (
                <button key={n} onClick={() => setForm(f => ({ ...f, rating: n }))}
                  className={`text-lg transition-colors ${form.rating >= n ? 'text-amber-400' : 'text-gray-700'}`}>
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-1.5">Would repeat?</label>
            <div className="flex gap-2">
              <button onClick={() => setForm(f => ({ ...f, would_repeat: true }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.would_repeat ? 'bg-emerald-900/50 border-emerald-700 text-emerald-400' : 'border-gray-700 text-gray-500 hover:border-gray-600'}`}>
                <ThumbsUp className="w-3 h-3" /> Yes
              </button>
              <button onClick={() => setForm(f => ({ ...f, would_repeat: false }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!form.would_repeat ? 'bg-red-900/50 border-red-700 text-red-400' : 'border-gray-700 text-gray-500 hover:border-gray-600'}`}>
                <ThumbsDown className="w-3 h-3" /> No
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <button className="btn-primary text-xs" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : pm ? 'Update' : 'Save Post-Mortem'}
          </button>
        </div>
      </div>
    )
  }

  // Display mode
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="section-title flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-400" /> Post-Mortem
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">{pm.created_at}</span>
          <button className="btn-ghost text-xs text-gray-500" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn-ghost text-xs text-red-400" onClick={remove}>Delete</button>
        </div>
      </div>

      {/* Rating + would repeat */}
      <div className="flex items-center gap-4">
        <div className="flex gap-0.5">
          {RATING_STARS.map(n => (
            <span key={n} className={`text-base ${pm.rating >= n ? 'text-amber-400' : 'text-gray-700'}`}>★</span>
          ))}
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${pm.would_repeat ? 'bg-emerald-900/50 border-emerald-700 text-emerald-400' : 'bg-red-900/50 border-red-700 text-red-400'}`}>
          {pm.would_repeat ? <><ThumbsUp className="w-3 h-3" /> Would repeat</> : <><ThumbsDown className="w-3 h-3" /> Wouldn't repeat</>}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1">✅ What worked</div>
          <p className="text-sm text-gray-300 leading-relaxed">{pm.what_worked}</p>
        </div>
        <div>
          <div className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">❌ What didn't work</div>
          <p className="text-sm text-gray-300 leading-relaxed">{pm.what_didnt}</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">💡 Key lesson</div>
          <p className="text-sm text-blue-200 leading-relaxed">{pm.key_lesson}</p>
        </div>
      </div>
    </div>
  )
}

// ─── P2.01: Dependency Section ───────────────────────────────────────────────
function DependencySection({ project, projects, onSaved, toast }) {
  const [editing, setEditing] = useState(false)
  const [selectedId, setSelectedId] = useState(project.blocks_project_id || '')

  // Keep local state in sync when project prop changes (e.g. after save)
  useEffect(() => {
    setSelectedId(project.blocks_project_id || '')
  }, [project.id, project.blocks_project_id])

  const blocksProject = projects.find(p => p.id === project.blocks_project_id)
  const blockedBy = project.blocked_by || []

  // Projects eligible to be blocked by this one (exclude self; simple cycle guard: exclude projects that already block this one)
  const blockedByIds = new Set(blockedBy.map(b => b.id))
  const eligible = projects.filter(p => p.id !== project.id && !blockedByIds.has(p.id))

  const save = async () => {
    try {
      await axios.put(`/api/projects/${project.id}`, {
        blocks_project_id: selectedId ? parseInt(selectedId) : null,
      })
      toast.success('Dependency saved')
      setEditing(false)
      onSaved()
    } catch {
      toast.error('Failed to save dependency')
    }
  }

  const remove = async () => {
    try {
      await axios.delete(`/api/projects/${project.id}/dependency`)
      toast.success('Dependency removed')
      setSelectedId('')
      onSaved()
    } catch {
      toast.error('Failed to remove dependency')
    }
  }

  const hasDeps = blockedBy.length > 0 || !!blocksProject

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="section-title flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-violet-400" /> Dependencies
        </div>
        {!editing && (
          <button className="btn-ghost text-xs text-gray-500" onClick={() => setEditing(true)}>
            {blocksProject ? 'Change' : '+ Add'}
          </button>
        )}
      </div>

      {/* Blocked-by row */}
      {blockedBy.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-orange-400 font-semibold mb-1.5 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Blocked by
          </div>
          <div className="flex flex-wrap gap-2">
            {blockedBy.map(b => (
              <span key={b.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-orange-900/30 border border-orange-700/40 text-orange-300">
                {b.icon} {b.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* This project blocks another */}
      {!editing && blocksProject && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold mb-1.5 flex items-center gap-1">
            <ArrowRight className="w-2.5 h-2.5" /> Must complete before
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-blue-900/30 border border-blue-700/40 text-blue-300">
              {blocksProject.icon} {blocksProject.title}
            </span>
            <button className="btn-ghost p-1 text-red-400 hover:text-red-300" onClick={remove} title="Remove dependency">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {!editing && !hasDeps && (
        <div className="text-xs text-gray-600 italic">No dependencies — this project is independent.</div>
      )}

      {editing && (
        <div className="space-y-3">
          <div>
            <label className="label">This project must finish before</label>
            <select className="input" value={selectedId}
              onChange={e => setSelectedId(e.target.value)}>
              <option value="">None (independent)</option>
              {eligible.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.title} [{p.status}]</option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1">
              Select the project that <strong className="text-gray-400">cannot start</strong> until this one is done.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary text-xs" onClick={() => {
              setEditing(false)
              setSelectedId(project.blocks_project_id || '')
            }}>Cancel</button>
            <button className="btn-primary text-xs" onClick={save}>Save</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── P2.02: Forecast Tab ─────────────────────────────────────────────────────
const VERDICT_CONFIG = {
  on_track:    { label: 'On Track',    color: 'text-emerald-400', bg: 'bg-emerald-900/40 border-emerald-700/40', icon: CheckCircle },
  at_risk:     { label: 'At Risk',     color: 'text-red-400',     bg: 'bg-red-900/40 border-red-700/40',         icon: AlertTriangle },
  no_deadline: { label: 'No Deadline', color: 'text-gray-400',    bg: 'bg-gray-800/60 border-gray-700/40',       icon: Clock },
  unknown:     { label: 'No Data',     color: 'text-gray-500',    bg: 'bg-gray-800/60 border-gray-700/40',       icon: Clock },
}

function ForecastTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/projects/velocity')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="card animate-pulse h-24 bg-gray-800/30" />)}
    </div>
  )

  if (!data) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-sm text-gray-600">Failed to load forecast data.</p>
    </div>
  )

  const { velocity, forecasts, digest, history } = data
  const hasVelocity = velocity.has_history && velocity.avg_cycle_days != null

  // Bar chart data for historical cycle times
  const historyChartData = history.map(h => ({
    name: h.title.length > 20 ? h.title.slice(0, 20) + '…' : h.title,
    days: h.cycle_days,
    status: h.status,
  }))

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">

      {/* Velocity stats */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <div className="section-title">Project Velocity</div>
          {hasVelocity && (
            <span className="badge bg-blue-900/40 text-blue-400 text-[10px] ml-auto">
              {velocity.sample_count} historical project{velocity.sample_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!hasVelocity ? (
          <div className="text-sm text-gray-500 italic">
            No completed projects yet — complete at least one project to enable forecasting.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{velocity.avg_cycle_days}d</div>
                <div className="text-xs text-gray-500 mt-1">Avg cycle time</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-violet-400">{velocity.median_cycle_days}d</div>
                <div className="text-xs text-gray-500 mt-1">Median</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-300">{velocity.stddev_cycle_days ?? '—'}{velocity.stddev_cycle_days != null ? 'd' : ''}</div>
                <div className="text-xs text-gray-500 mt-1">Std dev</div>
              </div>
            </div>
            {historyChartData.length > 0 && (
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyChartData} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} angle={-20} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} unit="d" width={32} />
                    <Tooltip
                      contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                      labelStyle={{ color: '#d1d5db', fontSize: 12 }}
                      formatter={(v) => [`${v} days`, 'Cycle time']}
                    />
                    {/* Average line marker baked into cells */}
                    <Bar dataKey="days" radius={[4, 4, 0, 0]}>
                      {historyChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.status === 'completed' ? '#6366f1' : '#6b7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* Digest summary */}
      {digest.total_active > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'at_risk',     label: 'At Risk',    count: digest.at_risk,     icon: AlertTriangle, color: 'text-red-400',     bg: 'bg-red-900/20 border-red-800/40' },
            { key: 'on_track',    label: 'On Track',   count: digest.on_track,    icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-800/40' },
            { key: 'no_deadline', label: 'No Deadline',count: digest.no_deadline, icon: Clock,         color: 'text-gray-400',    bg: 'bg-gray-800/50 border-gray-700/40' },
          ].map(({ key, label, count, icon: Icon, color, bg }) => (
            <div key={key} className={`rounded-xl border p-4 text-center ${bg}`}>
              <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
              <div className={`text-2xl font-bold ${color}`}>{count}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Per-project forecast cards */}
      {forecasts.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="text-sm">No active projects to forecast.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-gray-600 font-semibold">Active Project Forecasts</div>
          {forecasts.map(f => {
            const cfg = VERDICT_CONFIG[f.verdict] || VERDICT_CONFIG.unknown
            const VIcon = cfg.icon
            return (
              <div key={f.id} className={`rounded-xl border p-4 ${cfg.bg}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-100 text-sm truncate">{f.title}</span>
                      <span className={`flex items-center gap-1 text-[10px] font-semibold ml-auto shrink-0 ${cfg.color}`}>
                        <VIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {f.days_in_flight}d in flight
                      </span>
                      {f.predicted_completion_date && (
                        <span className={`flex items-center gap-1 font-medium ${f.verdict === 'at_risk' ? 'text-red-400' : f.verdict === 'on_track' ? 'text-emerald-400' : 'text-gray-400'}`}>
                          <TrendingUp className="w-3 h-3" /> Predicted: {f.predicted_completion_date}
                        </span>
                      )}
                      {f.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Due: {f.due_date}
                        </span>
                      )}
                      {!hasVelocity && (
                        <span className="text-gray-600 italic">Complete a project to enable forecasting</span>
                      )}
                    </div>
                    {/* Progress through predicted cycle */}
                    {hasVelocity && (
                      <div className="mt-2.5">
                        <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                          <span>Cycle progress</span>
                          <span>{f.pct_through_cycle}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${f.pct_through_cycle}%`,
                              background: f.verdict === 'at_risk' ? '#ef4444' : f.verdict === 'on_track' ? '#10b981' : '#6366f1',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


// ─── P2.03: Type Insights Tab ────────────────────────────────────────────────
function TypeInsightsTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/projects/type-insights')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-20 bg-gray-800/30" />)}
    </div>
  )

  if (!data || data.length === 0) return (
    <div className="flex-1 flex items-center justify-center">
      <EmptyState icon={LayoutGrid} title="No projects yet" description="Create projects and tag them by type to see insights here." />
    </div>
  )

  const shipped = data.filter(d => d.completion_rate != null)
  const abandoned = data.filter(d => d.abandoned > 0)
  const chartData = data.map(d => ({
    type: TYPE_CONFIG[d.type]?.label || d.type,
    total: d.total,
    completed: d.completed,
    active: d.active,
    fill: TYPE_CHART_COLORS[d.type] || '#6b7280',
  }))

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">

      {/* Summary bar chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="w-4 h-4 text-blue-400" />
          <div className="section-title">Projects by Type</div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
              <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} width={24} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#d1d5db', fontSize: 12 }}
                formatter={(v, name) => [v, name.charAt(0).toUpperCase() + name.slice(1)]}
              />
              <Bar dataKey="completed" stackId="a" name="Completed" radius={[0, 0, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} fillOpacity={0.9} />
                ))}
              </Bar>
              <Bar dataKey="active" stackId="a" name="Active" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} fillOpacity={0.4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-type cards */}
      <div>
        <div className="text-xs uppercase tracking-widest text-gray-600 font-semibold mb-3">Type Breakdown</div>
        <div className="space-y-3">
          {data.map(d => {
            const cfg = TYPE_CONFIG[d.type] || TYPE_CONFIG.other
            const terminal = d.completed + d.abandoned
            const canShip = d.completion_rate != null
            const verdict = canShip
              ? d.completion_rate >= 70 ? { label: 'Consistently ships', color: 'text-emerald-400' }
                : d.completion_rate >= 40 ? { label: 'Mixed results', color: 'text-amber-400' }
                : { label: 'Often abandoned', color: 'text-red-400' }
              : null

            return (
              <div key={d.type} className="card">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <TypeBadge type={d.type} />
                      {verdict && (
                        <span className={`text-[10px] font-medium ${verdict.color}`}>{verdict.label}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-100">{d.total}</div>
                        <div className="text-gray-600">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-400">{d.active}</div>
                        <div className="text-gray-600">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-400">{d.completed}</div>
                        <div className="text-gray-600">Completed</div>
                      </div>
                      {d.abandoned > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-400">{d.abandoned}</div>
                          <div className="text-gray-600">Abandoned</div>
                        </div>
                      )}
                      {canShip && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-violet-400">{d.completion_rate}%</div>
                          <div className="text-gray-600">Ship rate</div>
                        </div>
                      )}
                      {d.avg_cycle_days && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-300">{d.avg_cycle_days}d</div>
                          <div className="text-gray-600">Avg time</div>
                        </div>
                      )}
                    </div>
                    {/* Completion bar */}
                    {terminal > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                          <span>{d.completed} completed / {terminal} finished</span>
                          <span>{d.completion_rate}% ship rate</span>
                        </div>
                        <div className="h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${d.completion_rate}%`, background: TYPE_CHART_COLORS[d.type] || '#6b7280' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


export default function Projects() {
  const [tab, setTab] = useState('projects')
  const [projects, setProjects] = useState([])
  const [objectives, setObjectives] = useState([])
  const [cascade, setCascade] = useState([])
  const [cascadeLoading, setCascadeLoading] = useState(false)
  const [velocity, setVelocity] = useState(null)  // P2.02
  const [selected, setSelected] = useState(null)
  const [showAddProject, setShowAddProject] = useState(false)
  const [showAddObjective, setShowAddObjective] = useState(false)
  const [showAddTask, setShowAddTask] = useState(null)
  const [showStatusChange, setShowStatusChange] = useState(null) // { project, newStatus }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const [projForm, setProjForm] = useState({ title: '', description: '', status: 'active', color: '#6366f1', icon: '📁', due_date: '', project_type: 'other' })
  const [objForm, setObjForm] = useState({ title: '', description: '', quarter: currentQ, year: now.getFullYear(), color: '#6366f1' })
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'medium', due_date: '' })

  // Post-mortem prompt state: { projectId, newStatus } — triggers after status change
  const [postmortemPrompt, setPostmortemPrompt] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, oRes] = await Promise.all([
        axios.get('/api/projects/'),
        axios.get('/api/projects/objectives', { params: { quarter: currentQ, year: now.getFullYear() } }),
      ])
      setProjects(pRes.data)
      setObjectives(oRes.data)
      if (selected) {
        const updated = pRes.data.find(p => p.id === selected.id)
        if (updated) setSelected(updated)
      }
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    if (tab === 'cascade') {
      setCascadeLoading(true)
      axios.get('/api/projects/cascade').then(r => setCascade(r.data)).finally(() => setCascadeLoading(false))
    }
  }, [tab])

  // P2.02: pre-load velocity data for sidebar forecast badges + standalone tab
  useEffect(() => {
    axios.get('/api/projects/velocity').then(r => setVelocity(r.data)).catch(() => {})
  }, [projects])

  const addProject = async () => {
    try {
      await axios.post('/api/projects/', { ...projForm, due_date: projForm.due_date || null })
      toast.success('Project created')
      setShowAddProject(false)
      load()
    } catch {
      toast.error('Failed to create project')
    }
  }

  const addObjective = async () => {
    try {
      await axios.post('/api/projects/objectives', objForm)
      toast.success('Objective added')
      setShowAddObjective(false)
      load()
    } catch {
      toast.error('Failed to add objective')
    }
  }

  const addTask = async (projectId) => {
    try {
      await axios.post('/api/projects/tasks', { project_id: projectId, ...taskForm, due_date: taskForm.due_date || null })
      toast.success('Task added')
      setShowAddTask(null)
      setTaskForm({ title: '', priority: 'medium', due_date: '' })
      load()
    } catch {
      toast.error('Failed to add task')
    }
  }

  const toggleTask = async (taskId, done) => {
    try {
      await axios.put(`/api/projects/tasks/${taskId}`, { is_completed: !done })
      if (!done) toast.success('Task completed ✓')
      load()
    } catch {
      toast.error('Failed to update task')
    }
  }

  const changeStatus = async (projectId, newStatus) => {
    try {
      const res = await axios.put(`/api/projects/${projectId}`, { status: newStatus })
      toast.success(`Status → ${newStatus}`)
      // Auto-prompt postmortem if moving to completed/abandoned without one
      if ((newStatus === 'completed' || newStatus === 'abandoned') && res.data.needs_postmortem) {
        setPostmortemPrompt({ projectId, newStatus })
      }
      load()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const ICONS = ['📁', '🖥️', '🤖', '📚', '🏠', '💡', '🚀', '🎯', '🔧', '✈️', '📩', '🎙️', '🌱', '🔬', '💼']

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-800 px-6 pt-6 pb-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-6 rounded-full bg-blue-500"></div>
          <h1 className="text-xl font-bold text-gray-100">Projects & Goals</h1>
        </div>
        <nav className="tabs">
          {[['projects', 'Projects'], ['okr', `Q${currentQ} OKRs`], ['cascade', 'Goal Cascade'], ['forecast', '📈 Forecast'], ['types', '🏷️ Types'], ['retrospectives', 'Retrospectives']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`tab ${tab === id ? 'tab-active text-blue-400' : ''}`}>{label}</button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {tab === 'projects' && (
          <>
            {/* Project list */}
            <div className="w-72 shrink-0 border-r border-gray-800 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-400">Projects</div>
                <button className="btn-primary text-xs" onClick={() => setShowAddProject(true)}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border border-transparent bg-gray-800/20 space-y-2">
                      <SkeletonRow cols={3} />
                      <div className="h-1 bg-gray-800 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="py-8">
                  <EmptyState
                    icon={FolderOpen}
                    title="No projects yet"
                    description="Create your first project to start tracking progress."
                    action={{ label: '+ New Project', onClick: () => setShowAddProject(true) }}
                  />
                </div>
              ) : (
                <>
                  {['active', 'paused', 'backlog', 'completed', 'abandoned'].map(status => {
                    const statusProjects = projects.filter(p => p.status === status)
                    if (!statusProjects.length) return null
                    return (
                      <div key={status} className="mb-4">
                        <div className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-2">{status}</div>
                        {statusProjects.map(p => (
                          <div key={p.id} onClick={() => setSelected(p)}
                            className={`p-3 rounded-lg cursor-pointer mb-1 border transition-colors ${selected?.id === p.id ? 'bg-gray-800 border-gray-600' : 'border-transparent hover:bg-gray-800/50'}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-base">{p.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <div className="text-sm font-medium text-gray-200 truncate">{p.title}</div>
                                  {p.needs_postmortem && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Post-mortem needed" />
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5">{p.completed_tasks}/{p.task_count} tasks</div>
                              </div>
                            </div>
                            <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${p.progress_pct}%`, background: p.color }} />
                            </div>
                            {/* Dependency badges */}
                            {(p.blocked_by?.length > 0 || p.blocks_project_id) && (
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {p.blocked_by?.length > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-900/40 text-orange-400 border border-orange-800/40">
                                    <Lock className="w-2.5 h-2.5" /> blocked
                                  </span>
                                )}
                                {p.blocks_project_id && (
                                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-800/40">
                                    <ArrowRight className="w-2.5 h-2.5" /> blocking
                                  </span>
                                )}
                              </div>
                            )}
                            {/* P2.03: Type badge */}
                            {p.project_type && p.project_type !== 'other' && (
                              <div className="mt-1">
                                <TypeBadge type={p.project_type} />
                              </div>
                            )}
                            {/* P2.02: Forecast badge */}
                            {velocity && p.status === 'active' && (() => {
                              const fc = velocity.forecasts?.find(f => f.id === p.id)
                              if (!fc || !fc.predicted_completion_date) return null
                              const isAtRisk = fc.verdict === 'at_risk'
                              const isOnTrack = fc.verdict === 'on_track'
                              if (!isAtRisk && !isOnTrack) return null
                              return (
                                <div className="mt-1.5">
                                  <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${isAtRisk ? 'bg-red-900/30 text-red-400 border-red-800/40' : 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40'}`}>
                                    <TrendingUp className="w-2.5 h-2.5" />
                                    {isAtRisk ? '⚠ at risk' : '✓ on track'} · {fc.predicted_completion_date}
                                  </span>
                                </div>
                              )
                            })()}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            {/* Project detail */}
            <div className="flex-1 overflow-y-auto p-6">
              {!selected && (
                <div className="flex flex-col items-center justify-center h-full text-gray-600">
                  <Target className="w-12 h-12 mb-3 text-gray-800" />
                  <p className="text-sm">Select a project to view tasks</p>
                </div>
              )}
              {selected && (
                <div className="max-w-2xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{selected.icon}</span>
                      <div>
                        <h2 className="text-xl font-bold text-gray-100">{selected.title}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          {/* Status dropdown */}
                          <div className="relative group">
                            <button className={`badge text-xs flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[selected.status] || 'bg-gray-800 text-gray-400'}`}>
                              {selected.status} <ChevronDown className="w-3 h-3" />
                            </button>
                            <div className="absolute left-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden hidden group-hover:block min-w-[140px]">
                              {['active', 'paused', 'backlog', 'completed', 'abandoned'].map(s => (
                                <button key={s} onClick={() => changeStatus(selected.id, s)}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-800 transition-colors ${selected.status === s ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                          <TypeBadge type={selected.project_type || 'other'} />
                          <span className="text-xs text-gray-500">{selected.progress_pct}% complete</span>
                          {selected.needs_postmortem && (
                            <span className="badge text-xs bg-amber-900/50 text-amber-400">needs reflection</span>
                          )}
                          {selected.blocked_by?.length > 0 && (
                            <span className="badge text-xs bg-orange-900/50 text-orange-400 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> blocked by {selected.blocked_by.length}
                            </span>
                          )}
                          {selected.blocks_project_id && (
                            <span className="badge text-xs bg-blue-900/50 text-blue-400 flex items-center gap-1">
                              <ArrowRight className="w-2.5 h-2.5" /> blocking
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button className="btn-ghost p-2 text-red-400" onClick={() => setDeleteTarget({ type: 'project', id: selected.id })}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {selected.description && (
                    <div className="text-sm text-gray-400">{selected.description}</div>
                  )}

                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${selected.progress_pct}%`, background: selected.color }} />
                  </div>

                  {/* P2.01 — Dependencies */}
                  <DependencySection
                    project={selected}
                    projects={projects}
                    onSaved={load}
                    toast={toast}
                  />

                  {/* Post-mortem section — shown for completed/abandoned projects */}
                  {(selected.status === 'completed' || selected.status === 'abandoned') && (
                    <PostmortemSection
                      project={selected}
                      onSaved={load}
                      toast={toast}
                    />
                  )}

                  {/* Tasks */}
                  <div className="card space-y-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="section-title">Tasks ({selected.completed_tasks}/{selected.task_count})</div>
                      <button className="btn-secondary text-xs" onClick={() => setShowAddTask(selected.id)}>
                        <Plus className="w-3.5 h-3.5" /> Add Task
                      </button>
                    </div>
                    {selected.tasks.map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg group hover:bg-gray-800/50">
                        <button onClick={() => toggleTask(t.id, t.is_completed)} className="shrink-0">
                          {t.is_completed
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            : <Circle className={`w-5 h-5 ${PRIORITY_COLORS[t.priority]}`} />}
                        </button>
                        <span className={`flex-1 text-sm ${t.is_completed ? 'line-through text-gray-600' : 'text-gray-200'}`}>
                          {t.title}
                        </span>
                        {t.due_date && <span className="text-xs text-gray-600">{t.due_date}</span>}
                        <span className={`text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                        <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400"
                          onClick={() => setDeleteTarget({ type: 'task', id: t.id })}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {selected.tasks.length === 0 && <div className="text-center py-6 text-gray-600 text-sm">No tasks yet. Add one above.</div>}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'okr' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="flex justify-end">
              <button className="btn-primary text-xs" onClick={() => setShowAddObjective(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Objective
              </button>
            </div>
            {objectives.map(o => (
              <div key={o.id} className="card border-l-4" style={{ borderColor: o.color }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-semibold text-gray-100">{o.title}</div>
                    {o.description && <div className="text-sm text-gray-500 mt-1">{o.description}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: o.color }}>{o.overall_pct}%</div>
                      <div className="text-xs text-gray-500">overall</div>
                    </div>
                    <button className="btn-ghost p-1 text-red-400" onClick={() => setDeleteTarget({ type: 'objective', id: o.id })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {o.key_results.map(kr => (
                    <div key={kr.id} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{kr.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-100 text-xs">{kr.current_value} / {kr.target_value} {kr.unit}</span>
                          <input type="number" step="any"
                            className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            defaultValue={kr.current_value}
                            onBlur={async (e) => {
                              const val = parseFloat(e.target.value)
                              if (!isNaN(val)) {
                                await axios.put(`/api/projects/key-results/${kr.id}`, { current_value: val })
                                load()
                              }
                            }} />
                        </div>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, kr.pct)}%`, background: o.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {objectives.length === 0 && (
              <div className="card text-center py-16 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-3 text-gray-800" />
                <p>No objectives for Q{currentQ}. Set your goals!</p>
              </div>
            )}
          </div>
        )}

        {/* S6.02 — Goal Cascade */}
        {tab === 'cascade' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cascadeLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : cascade.length === 0 ? (
              <EmptyState icon={Target} title="No objectives yet" description="Add OKR objectives to see your goal cascade." />
            ) : (
              cascade.map(obj => (
                <div key={obj.id} className="card">
                  {/* Objective header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ background: obj.color }} />
                      <div>
                        <div className="font-semibold text-gray-100">{obj.title}</div>
                        <div className="text-xs text-gray-500">Q{obj.quarter} {obj.year} · {obj.overall_pct}% complete</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {obj.total_time_hours_90d > 0 && (
                        <span className="badge bg-blue-900/40 text-blue-400 text-[10px]">⏱ {obj.total_time_hours_90d}h (90d)</span>
                      )}
                      <span className={`badge text-[10px] ${obj.status === 'active' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>{obj.status}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-800 rounded-full mb-4 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${obj.overall_pct}%`, background: obj.color }} />
                  </div>

                  {/* Key results */}
                  {obj.key_results.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {obj.key_results.map((kr, i) => (
                        <div key={i} className="text-xs bg-gray-800/70 rounded px-2 py-1 text-gray-400">
                          {kr.title} <span className="text-gray-500 ml-1">{kr.pct}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Projects column */}
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-2">
                        📁 Projects ({obj.projects.length})
                      </div>
                      {obj.projects.length === 0 ? (
                        <div className="text-xs text-gray-600 italic">No linked projects</div>
                      ) : (
                        <div className="space-y-1">
                          {obj.projects.map(p => (
                            <div key={p.id} className="flex items-center gap-2 p-1.5 rounded bg-gray-800/50">
                              <span className="text-sm shrink-0">{p.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-200 truncate">{p.title}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.progress_pct}%` }} />
                                  </div>
                                  <span className="text-[10px] text-gray-500 shrink-0">{p.progress_pct}%</span>
                                </div>
                              </div>
                              {p.time_hours_90d > 0 && (
                                <span className="text-[10px] text-gray-500 shrink-0">{p.time_hours_90d}h</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Habits column */}
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-2">
                        ✅ Habits ({obj.habits.length})
                      </div>
                      {obj.habits.length === 0 ? (
                        <div className="text-xs text-gray-600 italic">No habits linked to this goal</div>
                      ) : (
                        <div className="space-y-1">
                          {obj.habits.map(h => (
                            <div key={h.id} className="flex items-center gap-2 p-1.5 rounded bg-gray-800/50">
                              <span className="text-sm shrink-0">{h.icon}</span>
                              <span className="text-xs text-gray-200 flex-1 truncate">{h.name}</span>
                              {h.willpower_cost && (
                                <span className="text-[10px] text-gray-600">⚡{h.willpower_cost}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* P2.02 — Forecast tab */}
        {tab === 'forecast' && <ForecastTab />}

        {/* P2.03 — Type Insights tab */}
        {tab === 'types' && <TypeInsightsTab />}

        {tab === 'retrospectives' && (
          <RetrospectivesTab projects={projects} onSelectProject={(p) => { setSelected(p); setTab('projects') }} />
        )}
      </div>

      {/* Post-mortem auto-prompt modal after status change */}
      {postmortemPrompt && (
        <Modal title="Write a Post-Mortem?" onClose={() => setPostmortemPrompt(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              You marked this project as <span className="font-medium text-blue-300">{postmortemPrompt.newStatus}</span>.
              Taking 5 minutes to write a quick post-mortem turns every project into a lesson.
            </p>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary text-xs" onClick={() => setPostmortemPrompt(null)}>Later</button>
              <button className="btn-primary text-xs" onClick={() => {
                // Navigate to project detail to fill in postmortem
                const p = projects.find(pr => pr.id === postmortemPrompt.projectId)
                if (p) setSelected(p)
                setTab('projects')
                setPostmortemPrompt(null)
              }}>
                Write Post-Mortem
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modals */}
      {showAddProject && (
        <Modal title="New Project" onClose={() => setShowAddProject(false)} size="sm">
          <div className="space-y-3">
            <div><label className="label">Title</label><input className="input" value={projForm.title} onChange={e => setProjForm(f => ({ ...f, title: e.target.value }))} placeholder="Trading Bot v2" /></div>
            <div><label className="label">Description</label><textarea className="input" rows={2} value={projForm.description} onChange={e => setProjForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Status</label>
                <select className="input" value={projForm.status} onChange={e => setProjForm(f => ({ ...f, status: e.target.value }))}>
                  {['active','backlog','paused','completed','abandoned'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="label">Due Date</label><input className="input" type="date" value={projForm.due_date} onChange={e => setProjForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={projForm.project_type} onChange={e => setProjForm(f => ({ ...f, project_type: e.target.value }))}>
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t]?.label || t}</option>)}
              </select>
            </div>
            <div><label className="label">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {ICONS.map(ic => (
                  <button key={ic} onClick={() => setProjForm(f => ({ ...f, icon: ic }))}
                    className={`text-xl p-1.5 rounded-lg border transition-colors ${projForm.icon === ic ? 'border-brand-500 bg-brand-500/20' : 'border-gray-700 hover:border-gray-600'}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button className="btn-secondary" onClick={() => setShowAddProject(false)}>Cancel</button>
              <button className="btn-primary" onClick={addProject}>Create</button>
            </div>
          </div>
        </Modal>
      )}

      {showAddObjective && (
        <Modal title="New Objective" onClose={() => setShowAddObjective(false)} size="sm">
          <div className="space-y-3">
            <div><label className="label">Objective</label><input className="input" value={objForm.title} onChange={e => setObjForm(f => ({ ...f, title: e.target.value }))} placeholder="Launch Life OS publicly" /></div>
            <div><label className="label">Description</label><textarea className="input" rows={2} value={objForm.description} onChange={e => setObjForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Quarter</label>
                <select className="input" value={objForm.quarter} onChange={e => setObjForm(f => ({ ...f, quarter: parseInt(e.target.value) }))}>
                  {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                </select>
              </div>
              <div><label className="label">Year</label><input className="input" type="number" value={objForm.year} onChange={e => setObjForm(f => ({ ...f, year: parseInt(e.target.value) }))} /></div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button className="btn-secondary" onClick={() => setShowAddObjective(false)}>Cancel</button>
              <button className="btn-primary" onClick={addObjective}>Create</button>
            </div>
          </div>
        </Modal>
      )}

      {showAddTask && (
        <Modal title="Add Task" onClose={() => setShowAddTask(null)} size="sm">
          <div className="space-y-3">
            <div><label className="label">Task</label><input className="input" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" autoFocus /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Priority</label>
                <select className="input" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                  {['high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div><label className="label">Due Date</label><input className="input" type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button className="btn-secondary" onClick={() => setShowAddTask(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => addTask(showAddTask)}>Add Task</button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal title="Confirm Delete" message={`Delete this ${deleteTarget.type}?`}
          onConfirm={async () => {
            const { type, id } = deleteTarget
            try {
              if (type === 'project') { await axios.delete(`/api/projects/${id}`); setSelected(null) }
              if (type === 'task') await axios.delete(`/api/projects/tasks/${id}`)
              if (type === 'objective') await axios.delete(`/api/projects/objectives/${id}`)
              toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`)
            } catch {
              toast.error(`Failed to delete ${type}`)
            }
            setDeleteTarget(null); load()
          }}
          onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  )
}

function RetrospectivesTab({ projects, onSelectProject }) {
  const completedAbandoned = projects.filter(p =>
    (p.status === 'completed' || p.status === 'abandoned')
  )
  const withPostmortem = completedAbandoned.filter(p => p.postmortem)
  const without = completedAbandoned.filter(p => !p.postmortem)

  if (completedAbandoned.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-16 text-gray-600">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-800" />
          <p className="text-sm">No completed or abandoned projects yet.</p>
          <p className="text-xs mt-1 text-gray-700">Post-mortems will appear here as you close out projects.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">
      {/* Pending reflections */}
      {without.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-500 font-semibold mb-3">Needs Reflection ({without.length})</div>
          <div className="space-y-2">
            {without.map(p => (
              <div key={p.id} className="card flex items-center gap-3 hover:border-gray-600 cursor-pointer transition-colors border border-dashed border-amber-700/40"
                onClick={() => onSelectProject(p)}>
                <span className="text-2xl">{p.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-200 text-sm">{p.title}</div>
                  <div className="text-xs text-gray-500">{p.status} · {p.task_count} tasks</div>
                </div>
                <span className="badge text-xs bg-amber-900/50 text-amber-400">write post-mortem →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed post-mortems */}
      {withPostmortem.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Lessons Captured ({withPostmortem.length})</div>
          <div className="space-y-4">
            {withPostmortem.map(p => {
              const pm = p.postmortem
              return (
                <div key={p.id} className="card border border-gray-700/50 hover:border-gray-600 transition-colors cursor-pointer"
                  onClick={() => onSelectProject(p)}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{p.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-100">{p.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`badge text-xs ${STATUS_COLORS[p.status] || 'bg-gray-800 text-gray-400'}`}>{p.status}</span>
                        <div className="flex gap-0.5">
                          {RATING_STARS.map(n => (
                            <span key={n} className={`text-xs ${pm.rating >= n ? 'text-amber-400' : 'text-gray-700'}`}>★</span>
                          ))}
                        </div>
                        <span className={`flex items-center gap-1 text-xs ${pm.would_repeat ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pm.would_repeat ? <><ThumbsUp className="w-3 h-3" /> Would repeat</> : <><ThumbsDown className="w-3 h-3" /> Wouldn't repeat</>}
                        </span>
                        <span className="text-xs text-gray-600">{pm.created_at}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3">
                    <div className="text-xs font-semibold text-blue-400 mb-1">💡 Key lesson</div>
                    <p className="text-sm text-blue-200 leading-relaxed line-clamp-2">{pm.key_lesson}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
