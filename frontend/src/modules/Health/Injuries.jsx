import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, CheckCircle2, AlertTriangle, Activity } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

const INJURY_TYPES = ['strain', 'sprain', 'tendinitis', 'fracture', 'soreness', 'overuse', 'other']

const SEVERITY_CONFIG = {
  low:    { range: [1, 3], label: 'Mild',     cls: 'bg-emerald-900/40 text-emerald-400' },
  medium: { range: [4, 6], label: 'Moderate', cls: 'bg-amber-900/40 text-amber-400' },
  high:   { range: [7, 8], label: 'Severe',   cls: 'bg-orange-900/40 text-orange-400' },
  critical:{ range: [9,10],label: 'Critical', cls: 'bg-red-900/50 text-red-400' },
}

function severityBadge(severity) {
  for (const [, cfg] of Object.entries(SEVERITY_CONFIG)) {
    if (severity >= cfg.range[0] && severity <= cfg.range[1]) {
      return <span className={`badge text-[10px] font-semibold ${cfg.cls}`}>{cfg.label} ({severity}/10)</span>
    }
  }
  return null
}

function daysSince(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

export default function Injuries() {
  const [injuries, setInjuries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [recoveringId, setRecoveringId] = useState(null)
  const [filter, setFilter] = useState('active') // 'active' | 'all'
  const toast = useToast()

  const emptyForm = {
    date: new Date().toISOString().slice(0, 10),
    location: '',
    type: 'strain',
    severity: 5,
    triggers: '',
    treatment: '',
    notes: '',
    estimated_recovery_date: '',
  }
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/health/injuries', { params: { active_only: filter === 'active', limit: 100 } })
      setInjuries(res.data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [filter])

  const save = async () => {
    if (!form.location.trim()) { toast.error('Location is required'); return }
    try {
      await axios.post('/api/health/injuries', {
        ...form,
        severity: parseInt(form.severity),
        estimated_recovery_date: form.estimated_recovery_date || null,
      })
      toast.success('Injury logged')
      setShowAdd(false)
      setForm(emptyForm)
      load()
    } catch {
      toast.error('Failed to log injury')
    }
  }

  const markRecovered = async (id) => {
    try {
      await axios.patch(`/api/health/injuries/${id}`, {
        recovery_date: new Date().toISOString().slice(0, 10)
      })
      toast.success('Marked as recovered')
      setRecoveringId(null)
      load()
    } catch {
      toast.error('Failed to update')
    }
  }

  const del = async () => {
    try {
      await axios.delete(`/api/health/injuries/${deleteId}`)
      toast.success('Injury deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  // Pain timeline chart data — severity by date (all injuries)
  const chartData = [...injuries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(i => ({
      date: i.date.slice(5),
      severity: i.severity,
      location: i.location,
      recovered: !!i.recovery_date,
    }))

  const activeCount = injuries.filter(i => i.is_active).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="section-title">Injury & Pain Log</div>
          {activeCount > 0 && (
            <div className="text-sm text-amber-400 mt-0.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {activeCount} active {activeCount === 1 ? 'injury' : 'injuries'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
            {['active', 'all'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 capitalize transition-colors ${filter === f ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" /> Log Injury
          </button>
        </div>
      </div>

      {/* Pain timeline chart */}
      {!loading && injuries.length >= 2 && (
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Pain Severity Timeline</div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis domain={[0, 10]} tick={{ fill: '#6b7280', fontSize: 10 }} width={20} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v, n, p) => [`${v}/10 — ${p.payload.location}`, 'Severity']}
              />
              <Line
                type="monotone"
                dataKey="severity"
                stroke="#f87171"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props
                  return (
                    <circle
                      key={payload.date}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={payload.recovered ? '#10b981' : '#f87171'}
                      stroke="none"
                    />
                  )
                }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-[10px] text-gray-600">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Active</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Recovered</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>}

      {/* Empty */}
      {!loading && injuries.length === 0 && (
        <EmptyState
          icon={Activity}
          title={filter === 'active' ? 'No active injuries' : 'No injuries logged'}
          description={filter === 'active' ? 'No current injuries — great! Log one if something flares up.' : 'Track injuries and pain to spot patterns and monitor recovery.'}
          action={{ label: '+ Log Injury', onClick: () => setShowAdd(true) }}
        />
      )}

      {/* Injury cards */}
      {!loading && injuries.map(inj => {
        const age = daysSince(inj.date)
        const eta = daysUntil(inj.estimated_recovery_date)
        return (
          <div
            key={inj.id}
            className={`card border-l-4 ${inj.is_active ? 'border-l-red-500/60' : 'border-l-emerald-500/40 opacity-75'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-gray-100">{inj.location}</span>
                  {severityBadge(inj.severity)}
                  <span className="badge bg-gray-800 text-gray-500 text-[10px] capitalize">{inj.type}</span>
                  {!inj.is_active && (
                    <span className="badge bg-emerald-900/30 text-emerald-400 text-[10px]">✓ Recovered</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {new Date(inj.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' · '}{age === 0 ? 'Today' : `${age}d ago`}
                  {inj.recovery_date && ` · Recovered ${new Date(inj.recovery_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </div>

                {/* Recovery estimate */}
                {inj.is_active && inj.estimated_recovery_date && (
                  <div className={`text-xs mb-2 flex items-center gap-1.5 ${eta !== null && eta < 0 ? 'text-red-400' : eta !== null && eta <= 7 ? 'text-amber-400' : 'text-gray-400'}`}>
                    <Activity className="w-3 h-3" />
                    {eta === null ? '' : eta < 0 ? `${Math.abs(eta)}d past estimated recovery` : eta === 0 ? 'Expected to recover today' : `~${eta}d to estimated recovery`}
                    {' ('}
                    {new Date(inj.estimated_recovery_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {')'}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-1">
                  {inj.triggers && (
                    <div className="text-xs text-gray-500"><span className="text-gray-600">Triggers:</span> {inj.triggers}</div>
                  )}
                  {inj.treatment && (
                    <div className="text-xs text-gray-500"><span className="text-gray-600">Treatment:</span> {inj.treatment}</div>
                  )}
                  {inj.notes && (
                    <div className="text-xs text-gray-500"><span className="text-gray-600">Notes:</span> {inj.notes}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {inj.is_active && (
                  <button
                    className="btn-ghost text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    onClick={() => setRecoveringId(inj.id)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Recovered
                  </button>
                )}
                <button
                  className="btn-ghost p-1.5 text-red-400 hover:text-red-300"
                  onClick={() => setDeleteId(inj.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Add modal */}
      {showAdd && (
        <Modal title="Log Injury" onClose={() => { setShowAdd(false); setForm(emptyForm) }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Injury Type</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {INJURY_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Body Location</label>
                <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Left knee, Lower back, Right shoulder..." />
              </div>
              <div className="col-span-2">
                <label className="label flex justify-between">
                  <span>Severity</span>
                  <span className="text-gray-400">{form.severity}/10</span>
                </label>
                <input
                  className="w-full accent-red-500"
                  type="range" min={1} max={10} step={1}
                  value={form.severity}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                  <span>Mild</span><span>Moderate</span><span>Severe</span><span>Critical</span>
                </div>
              </div>
              <div>
                <label className="label">Est. Recovery Date</label>
                <input className="input" type="date" value={form.estimated_recovery_date} onChange={e => setForm(f => ({ ...f, estimated_recovery_date: e.target.value }))} />
              </div>
              <div />
              <div className="col-span-2">
                <label className="label">Triggers / Cause</label>
                <input className="input" value={form.triggers} onChange={e => setForm(f => ({ ...f, triggers: e.target.value }))} placeholder="What caused it?" />
              </div>
              <div className="col-span-2">
                <label className="label">Treatment / Protocol</label>
                <input className="input" value={form.treatment} onChange={e => setForm(f => ({ ...f, treatment: e.target.value }))} placeholder="Ice, rest, physio, compression..." />
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional context..." />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => { setShowAdd(false); setForm(emptyForm) }}>Cancel</button>
              <button className="btn-primary" onClick={save}>Log Injury</button>
            </div>
          </div>
        </Modal>
      )}

      {recoveringId && (
        <ConfirmModal
          title="Mark as Recovered"
          message="Set today as the recovery date for this injury?"
          onConfirm={() => markRecovered(recoveringId)}
          onClose={() => setRecoveringId(null)}
        />
      )}
      {deleteId && (
        <ConfirmModal
          title="Delete Injury"
          message="Remove this injury log permanently?"
          onConfirm={del}
          onClose={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
