/**
 * Decision Journal — Sprint S3A.05
 * Accent: yellow (#eab308)
 * Views: Log · Pending Review · Analytics
 */

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useCountUp } from '../../hooks/useCountUp'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import {
  Scale, Plus, X, Check, ChevronDown, ChevronUp, AlertTriangle,
  BarChart2, Clock, CheckCircle2, Circle, Edit3, Trash2,
  ArrowRight, Brain, Lightbulb, Target,
} from 'lucide-react'
import { SkeletonCard, SkeletonStat, SkeletonRow } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'

// ── Constants ─────────────────────────────────────────────────────────────────

const YELLOW = '#eab308'

const STAKES_META = {
  low:      { label: 'Low',      color: '#6b7280', bg: 'bg-gray-500/10',   text: 'text-gray-400'   },
  medium:   { label: 'Medium',   color: '#f59e0b', bg: 'bg-amber-500/10',  text: 'text-amber-400'  },
  high:     { label: 'High',     color: '#f97316', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  critical: { label: 'Critical', color: '#ef4444', bg: 'bg-red-500/10',    text: 'text-red-400'    },
}

const TYPE_META = {
  financial:    { label: 'Financial',    color: '#10b981' },
  career:       { label: 'Career',       color: '#6366f1' },
  health:       { label: 'Health',       color: '#ef4444' },
  relationship: { label: 'Relationship', color: '#ec4899' },
  strategic:    { label: 'Strategic',    color: '#8b5cf6' },
  personal:     { label: 'Personal',     color: '#14b8a6' },
  other:        { label: 'Other',        color: '#6b7280' },
}

const STATUS_OPTIONS   = ['open', 'resolved']
const STAKES_OPTIONS   = ['low', 'medium', 'high', 'critical']
const TYPE_OPTIONS     = Object.keys(TYPE_META)

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return null
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysAgo(str) {
  if (!str) return null
  const diff = Math.round((Date.now() - new Date(str + 'T00:00:00')) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 0)  return `In ${Math.abs(diff)}d`
  return `${diff}d ago`
}

function overdueDays(str) {
  if (!str) return 0
  return Math.round((Date.now() - new Date(str + 'T00:00:00')) / 86400000)
}

// ── Badges ────────────────────────────────────────────────────────────────────

function StakesBadge({ stakes }) {
  const meta = STAKES_META[stakes] || STAKES_META.medium
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.bg} ${meta.text}`}>
      {meta.label}
    </span>
  )
}

function TypeBadge({ type }) {
  const meta = TYPE_META[type] || TYPE_META.other
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ backgroundColor: meta.color + '22', color: meta.color }}
    >
      {meta.label}
    </span>
  )
}

function StatusBadge({ status }) {
  if (status === 'resolved') {
    return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400"><CheckCircle2 className="w-3 h-3" />Resolved</span>
  }
  return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-yellow-400"><Circle className="w-3 h-3" />Open</span>
}

function QualityScore({ score }) {
  if (!score) return <span className="text-gray-600 text-xs">—</span>
  const color = score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444'
  return <span className="text-sm font-bold" style={{ color }}>{score}/10</span>
}

function ConfidenceBar({ value }) {
  if (!value) return null
  const color = value >= 7 ? '#10b981' : value >= 4 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value * 10}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color }}>{value}/10</span>
    </div>
  )
}

// ── Decision Card ─────────────────────────────────────────────────────────────

function DecisionCard({ decision, onEdit, onDelete, compact = false }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`card card-hover p-4 ${decision.is_overdue ? 'border-amber-500/30' : ''}`}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <StakesBadge stakes={decision.stakes} />
            <TypeBadge type={decision.decision_type} />
            <StatusBadge status={decision.status} />
            {decision.is_overdue && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                Overdue {overdueDays(decision.outcome_date)}d
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-100 leading-snug">{decision.title}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-gray-500">{fmtDate(decision.date)}</span>
            {decision.outcome_date && (
              <span className="text-[11px] text-gray-600">
                → {decision.status === 'resolved' ? 'Resolved' : 'Due'} {fmtDate(decision.outcome_date)}
              </span>
            )}
            {decision.confidence && (
              <span className="text-[11px] text-gray-500">Confidence: <span className="text-gray-300">{decision.confidence}/10</span></span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {decision.decision_quality && (
            <div className="text-right mr-2">
              <div className="text-[10px] text-gray-600 mb-0.5">Quality</div>
              <QualityScore score={decision.decision_quality} />
            </div>
          )}
          <button onClick={() => onEdit(decision)} className="icon-btn" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(decision.id)} className="icon-btn text-red-400 hover:text-red-300" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => setExpanded(e => !e)} className="icon-btn">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-gray-800 pt-3">
          {decision.description && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">What was decided</div>
              <p className="text-sm text-gray-300">{decision.description}</p>
            </div>
          )}
          {decision.reasoning && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Brain className="w-3 h-3" /> Reasoning</div>
              <p className="text-sm text-gray-400">{decision.reasoning}</p>
            </div>
          )}
          {decision.confidence && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Confidence at decision time</div>
              <ConfidenceBar value={decision.confidence} />
            </div>
          )}
          {decision.predicted_outcome && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Predicted outcome</div>
              <p className="text-sm text-gray-400">{decision.predicted_outcome}</p>
            </div>
          )}
          {decision.actual_outcome && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Actual outcome</div>
              <p className="text-sm text-gray-300">{decision.actual_outcome}</p>
            </div>
          )}
          {decision.lesson && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Lightbulb className="w-3 h-3 text-yellow-400" /> Lesson learned</div>
              <p className="text-sm text-gray-300">{decision.lesson}</p>
            </div>
          )}
          {decision.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {decision.tags.map(t => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">#{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add / Edit Decision Modal ─────────────────────────────────────────────────

const BLANK = {
  date: new Date().toISOString().split('T')[0],
  title: '',
  description: '',
  stakes: 'medium',
  decision_type: 'personal',
  reasoning: '',
  confidence: '',
  predicted_outcome: '',
  outcome_date: '',
  actual_outcome: '',
  decision_quality: '',
  lesson: '',
  status: 'open',
  tags: '',
}

function DecisionModal({ decision, onClose, onSaved, toast }) {
  const editing = !!decision?.id
  const [form, setForm] = useState(decision ? {
    date:             decision.date,
    title:            decision.title,
    description:      decision.description || '',
    stakes:           decision.stakes,
    decision_type:    decision.decision_type,
    reasoning:        decision.reasoning || '',
    confidence:       decision.confidence ?? '',
    predicted_outcome: decision.predicted_outcome || '',
    outcome_date:     decision.outcome_date || '',
    actual_outcome:   decision.actual_outcome || '',
    decision_quality: decision.decision_quality ?? '',
    lesson:           decision.lesson || '',
    status:           decision.status,
    tags:             (decision.tags || []).join(', '),
  } : { ...BLANK })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.title.trim()) { toast.warning('Title is required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        confidence:       form.confidence !== '' ? Number(form.confidence) : null,
        decision_quality: form.decision_quality !== '' ? Number(form.decision_quality) : null,
        outcome_date:     form.outcome_date || null,
        description:      form.description || null,
        reasoning:        form.reasoning || null,
        predicted_outcome: form.predicted_outcome || null,
        actual_outcome:   form.actual_outcome || null,
        lesson:           form.lesson || null,
        tags:             form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }
      if (editing) {
        await axios.patch(`/api/decisions/${decision.id}`, payload)
        toast.success('Decision updated')
      } else {
        await axios.post('/api/decisions/', payload)
        toast.success('Decision logged')
      }
      onSaved()
      onClose()
    } catch { toast.error('Failed to save decision') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-xl p-6 space-y-4 my-4 animate-scale-in">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-100">{editing ? 'Edit Decision' : 'Log a Decision'}</h2>
          <button onClick={onClose} className="icon-btn"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="label">Title *</label>
            <input className="input" placeholder="What did you decide?" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          {/* Stakes + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Stakes</label>
              <select className="input" value={form.stakes} onChange={e => set('stakes', e.target.value)}>
                {STAKES_OPTIONS.map(s => <option key={s} value={s}>{STAKES_META[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Domain</label>
              <select className="input" value={form.decision_type} onChange={e => set('decision_type', e.target.value)}>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description <span className="text-gray-600">(what exactly was decided)</span></label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Reasoning */}
          <div>
            <label className="label">Reasoning <span className="text-gray-600">(why this choice?)</span></label>
            <textarea className="input resize-none" rows={2} value={form.reasoning} onChange={e => set('reasoning', e.target.value)} />
          </div>

          {/* Confidence + Predicted outcome */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Confidence (1–10)</label>
              <input type="number" min="1" max="10" className="input" placeholder="—" value={form.confidence} onChange={e => set('confidence', e.target.value)} />
            </div>
            <div>
              <label className="label">Outcome date</label>
              <input type="date" className="input" value={form.outcome_date} onChange={e => set('outcome_date', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Predicted outcome</label>
            <textarea className="input resize-none" rows={2} value={form.predicted_outcome} onChange={e => set('predicted_outcome', e.target.value)} />
          </div>

          {/* Resolve fields (only show if editing or resolved) */}
          {(editing || form.status === 'resolved') && (
            <>
              <div>
                <label className="label">Actual outcome</label>
                <textarea className="input resize-none" rows={2} value={form.actual_outcome} onChange={e => set('actual_outcome', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Decision quality (1–10)</label>
                  <input type="number" min="1" max="10" className="input" placeholder="—" value={form.decision_quality} onChange={e => set('decision_quality', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Lesson learned</label>
                <textarea className="input resize-none" rows={2} value={form.lesson} onChange={e => set('lesson', e.target.value)} />
              </div>
            </>
          )}

          {/* Tags */}
          <div>
            <label className="label">Tags <span className="text-gray-600">(comma-separated)</span></label>
            <input className="input" placeholder="trading, risk, career…" value={form.tags} onChange={e => set('tags', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1" style={{ '--btn-color': YELLOW }}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Log Decision'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Log View ──────────────────────────────────────────────────────────────────

function LogView() {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStakes, setFilterStakes] = useState('')
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (filterType)   params.decision_type = filterType
      if (filterStakes) params.stakes = filterStakes
      const r = await axios.get('/api/decisions/', { params })
      setDecisions(r.data)
    } catch { toast.error('Failed to load decisions') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus, filterType, filterStakes])

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/decisions/${id}`)
      toast.success('Decision deleted')
      load()
    } catch { toast.error('Delete failed') }
  }

  const handleEdit = (d) => { setEditing(d); setModalOpen(true) }
  const handleAdd  = ()  => { setEditing(null); setModalOpen(true) }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap flex-1">
          <select className="input w-auto text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
          <select className="input w-auto text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All domains</option>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
          </select>
          <select className="input w-auto text-sm" value={filterStakes} onChange={e => setFilterStakes(e.target.value)}>
            <option value="">All stakes</option>
            {STAKES_OPTIONS.map(s => <option key={s} value={s}>{STAKES_META[s].label}</option>)}
          </select>
        </div>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2 shrink-0" style={{ '--btn-color': YELLOW }}>
          <Plus className="w-4 h-4" /> Log Decision
        </button>
      </div>

      {/* Decision list */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : decisions.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No decisions logged yet"
          description="Start tracking your decisions to understand your patterns and get better at making them."
          action={{ label: 'Log a Decision', onClick: handleAdd }}
        />
      ) : (
        <div className="space-y-3">
          {decisions.map(d => (
            <DecisionCard key={d.id} decision={d} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {modalOpen && (
        <DecisionModal
          decision={editing}
          onClose={() => setModalOpen(false)}
          onSaved={load}
          toast={toast}
        />
      )}
    </div>
  )
}

// ── Pending Review View ───────────────────────────────────────────────────────

function PendingReviewView() {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await axios.get('/api/decisions/pending-review')
      setDecisions(r.data)
    } catch { toast.error('Failed to load pending review') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/decisions/${id}`)
      toast.success('Decision deleted')
      load()
    } catch { toast.error('Delete failed') }
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="card p-4 border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-amber-300">Decisions awaiting your review</div>
            <div className="text-xs text-gray-400 mt-0.5">
              These decisions have passed their expected outcome date but haven't been resolved yet.
              Open each one and record what actually happened + what you learned.
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : decisions.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up!"
          description="No decisions are waiting for an outcome review. Keep logging decisions and revisiting them when outcomes are known."
        />
      ) : (
        <div className="space-y-3">
          {decisions.map(d => (
            <DecisionCard
              key={d.id}
              decision={d}
              onEdit={(dec) => { setEditing(dec); setModalOpen(true) }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <DecisionModal
          decision={editing}
          onClose={() => setModalOpen(false)}
          onSaved={load}
          toast={toast}
        />
      )}
    </div>
  )
}

// ── Analytics View ────────────────────────────────────────────────────────────

function AnalyticsView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    axios.get('/api/decisions/analytics')
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  // Count-up hooks must be called unconditionally (before any early returns)
  const animTotal      = useCountUp(data?.summary?.total            || 0)
  const animOpen       = useCountUp(data?.summary?.open             || 0)
  const animHitRate    = useCountUp(data?.summary?.overall_hit_rate || 0)
  const animConfidence = useCountUp(data?.summary?.avg_confidence   || 0)

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonStat key={i} />)}</div>
        <SkeletonCard /><SkeletonCard />
      </div>
    )
  }

  if (!data) return null

  const { summary, by_confidence, by_type, by_stakes } = data

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">Total logged</div>
          <div className="stat-value" style={{ color: YELLOW }}>{Math.round(animTotal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open</div>
          <div className="stat-value text-yellow-400">{Math.round(animOpen)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Hit rate</div>
          <div className="stat-value text-emerald-400">
            {summary.overall_hit_rate != null ? `${Math.round(animHitRate)}%` : '—'}
          </div>
          <div className="stat-sub">quality ≥ 7 of resolved</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg confidence</div>
          <div className="stat-value text-blue-400">
            {summary.avg_confidence != null ? `${animConfidence.toFixed(1)}/10` : '—'}
          </div>
        </div>
      </div>

      {summary.pending_review > 0 && (
        <div className="card p-3 border-amber-500/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm text-amber-300">{summary.pending_review} decision{summary.pending_review > 1 ? 's' : ''} awaiting review in the Pending tab</span>
        </div>
      )}

      {/* By domain */}
      {by_type.length > 0 && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Decision Quality by Domain</h3>
          <div className="chart-container" style={{ transformOrigin: 'bottom center' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={by_type} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false}
                  tickFormatter={v => TYPE_META[v]?.label || v} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#f9fafb', fontSize: 12 }}
                  formatter={(v, name) => [
                    name === 'avg_quality' ? `${v}/10` : `${v}%`,
                    name === 'avg_quality' ? 'Avg quality' : 'Hit rate'
                  ]}
                  labelFormatter={v => TYPE_META[v]?.label || v}
                />
                <Bar dataKey="avg_quality" name="avg_quality" radius={[4, 4, 0, 0]}
                  isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                  {by_type.map((d, i) => (
                    <rect key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {by_type.map(d => (
              <div key={d.type} className="text-xs">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-400">{TYPE_META[d.type]?.label || d.type}</span>
                </div>
                <div className="text-gray-500 pl-3.5">{d.count} decisions · {d.hit_rate}% hit</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By confidence */}
      {by_confidence.length > 0 && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Hit Rate by Confidence Level</h3>
          <p className="text-xs text-gray-600 mb-4">Does higher confidence lead to better outcomes? Higher bar = more good decisions in that confidence band.</p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={by_confidence} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="band" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                  label={{ value: 'Confidence band', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`} />
                <RTooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#f9fafb', fontSize: 12 }}
                  formatter={(v) => [`${v}%`, 'Hit rate']}
                  labelFormatter={v => `Confidence ${v}`}
                />
                <Bar dataKey="hit_rate" fill={YELLOW} radius={[4, 4, 0, 0]}
                  isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* By stakes */}
      {by_stakes.length > 0 && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Decision Quality by Stakes</h3>
          <div className="space-y-3">
            {by_stakes.map(d => (
              <div key={d.stakes} className="flex items-center gap-3">
                <div className="w-16 shrink-0">
                  <StakesBadge stakes={d.stakes} />
                </div>
                <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${d.hit_rate}%`, backgroundColor: d.color }}
                  />
                </div>
                <div className="text-xs text-gray-400 w-24 text-right shrink-0">
                  {d.hit_rate}% · {d.count} decisions
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {by_type.length === 0 && by_confidence.length === 0 && (
        <EmptyState
          icon={BarChart2}
          title="Not enough resolved decisions yet"
          description="Analytics will populate once you've resolved a few decisions and scored their quality."
        />
      )}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'log',      label: 'Log',            icon: Scale      },
  { id: 'pending',  label: 'Pending Review', icon: Clock      },
  { id: 'analytics',label: 'Analytics',      icon: BarChart2  },
]

export default function Decisions() {
  const [tab, setTab] = useState('log')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    axios.get('/api/decisions/pending-review')
      .then(r => setPendingCount(r.data.length))
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-0 border-b border-gray-800/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: YELLOW + '22' }}>
            <Scale className="w-4 h-4" style={{ color: YELLOW }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">Decision Journal</h1>
            <p className="text-sm text-gray-500">Am I getting better at making decisions?</p>
          </div>
        </div>

        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
                tab === id
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === 'pending' && pendingCount > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* key forces re-mount on tab switch → tab-panel fade-in-up animation */}
      <div key={tab} className="tab-panel flex-1 overflow-y-auto">
        {tab === 'log'       && <LogView />}
        {tab === 'pending'   && <PendingReviewView />}
        {tab === 'analytics' && <AnalyticsView />}
      </div>
    </div>
  )
}
