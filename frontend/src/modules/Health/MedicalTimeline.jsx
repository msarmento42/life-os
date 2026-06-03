import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, Edit2, AlertTriangle, Calendar, Clock, CheckCircle2, Stethoscope } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

const TYPE_CONFIG = {
  checkup:     { label: 'Checkup',      emoji: '🩺', color: 'text-blue-400',    bg: 'bg-blue-900/30',    border: 'border-blue-700/50' },
  lab:         { label: 'Lab Work',     emoji: '🔬', color: 'text-purple-400',  bg: 'bg-purple-900/30',  border: 'border-purple-700/50' },
  dental:      { label: 'Dental',       emoji: '🦷', color: 'text-cyan-400',    bg: 'bg-cyan-900/30',    border: 'border-cyan-700/50' },
  vision:      { label: 'Vision',       emoji: '👁️',  color: 'text-indigo-400',  bg: 'bg-indigo-900/30',  border: 'border-indigo-700/50' },
  specialist:  { label: 'Specialist',   emoji: '👨‍⚕️', color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-700/50' },
  vaccination: { label: 'Vaccination',  emoji: '💉', color: 'text-amber-400',   bg: 'bg-amber-900/30',   border: 'border-amber-700/50' },
  other:       { label: 'Other',        emoji: '📋', color: 'text-gray-400',    bg: 'bg-gray-800/50',    border: 'border-gray-700/50' },
}
const TYPES = Object.keys(TYPE_CONFIG)

function daysUntil(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((d - today) / 86400000)
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function UrgencyBadge({ dateStr, label = 'Next due' }) {
  const days = daysUntil(dateStr)
  if (days < 0) return (
    <span className="badge bg-red-900/50 text-red-400 text-[10px] flex items-center gap-1">
      <AlertTriangle className="w-2.5 h-2.5" /> Overdue {Math.abs(days)}d
    </span>
  )
  if (days === 0) return <span className="badge bg-amber-900/50 text-amber-400 text-[10px]">Today</span>
  if (days <= 7)  return <span className="badge bg-amber-900/50 text-amber-400 text-[10px]">In {days}d</span>
  if (days <= 30) return <span className="badge bg-blue-900/50 text-blue-400 text-[10px]">In {days}d</span>
  return <span className="badge bg-gray-800 text-gray-500 text-[10px]">{formatDate(dateStr)}</span>
}

export default function MedicalTimeline() {
  const [events, setEvents] = useState([])
  const [upcoming, setUpcoming] = useState({ upcoming_appointments: [], overdue: [], due_soon: [] })
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState('timeline')
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [eventsR, upcomingR] = await Promise.all([
        axios.get('/api/health/medical'),
        axios.get('/api/health/medical/upcoming'),
      ])
      setEvents(eventsR.data)
      setUpcoming(upcomingR.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (data) => {
    try {
      if (editEvent) {
        await axios.patch(`/api/health/medical/${editEvent.id}`, data)
        toast.success('Event updated')
      } else {
        await axios.post('/api/health/medical', data)
        toast.success('Event added')
      }
      setShowModal(false)
      setEditEvent(null)
      load()
    } catch { toast.error('Failed to save event') }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/health/medical/${id}`)
      toast.success('Event deleted')
      setDeleteTarget(null)
      load()
    } catch { toast.error('Failed to delete') }
  }

  // Group timeline events by year
  const filtered = typeFilter === 'all' ? events : events.filter(e => e.type === typeFilter)
  const byYear = filtered.reduce((acc, e) => {
    const year = e.date.slice(0, 4)
    acc[year] = acc[year] || []
    acc[year].push(e)
    return acc
  }, {})
  const sortedYears = Object.keys(byYear).sort((a, b) => b - a)

  const totalOverdue = upcoming.overdue.length
  const totalDueSoon = upcoming.due_soon.length

  if (loading) return (
    <div className="space-y-4 p-1">
      <SkeletonCard /><SkeletonCard /><SkeletonCard />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header with alerts */}
      {(totalOverdue > 0 || totalDueSoon > 0) && (
        <div className="space-y-2">
          {totalOverdue > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/20 border border-red-700/40 rounded-xl text-sm text-red-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{totalOverdue}</strong> overdue {totalOverdue === 1 ? 'item' : 'items'} — check the Upcoming tab</span>
            </div>
          )}
          {totalDueSoon > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-900/20 border border-amber-700/40 rounded-xl text-sm text-amber-400">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span><strong>{totalDueSoon}</strong> upcoming {totalDueSoon === 1 ? 'appointment' : 'appointments'} in the next 90 days</span>
            </div>
          )}
        </div>
      )}

      {/* Sub-tabs + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg">
          {['timeline', 'upcoming'].map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all relative ${
                subTab === t ? 'bg-gray-700 text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'upcoming' && totalOverdue > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                  {totalOverdue}
                </span>
              )}
            </button>
          ))}
        </div>
        <button className="btn-primary text-xs" onClick={() => { setEditEvent(null); setShowModal(true) }}>
          <Plus className="w-3.5 h-3.5" /> Add Event
        </button>
      </div>

      {/* TIMELINE TAB */}
      {subTab === 'timeline' && (
        <>
          {/* Type filter pills */}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                typeFilter === 'all' ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}>All</button>
            {TYPES.map(t => {
              const cfg = TYPE_CONFIG[t]
              return (
                <button key={t} onClick={() => setTypeFilter(t === typeFilter ? 'all' : t)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                    typeFilter === t ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-gray-700 text-gray-500 hover:text-gray-300'
                  }`}>
                  {cfg.emoji} {cfg.label}
                </button>
              )
            })}
          </div>

          {/* Timeline */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={Stethoscope}
              title="No medical events logged"
              description="Track checkups, lab work, dental visits, and other health appointments."
              action={{ label: '+ Add Event', onClick: () => setShowModal(true) }}
            />
          ) : (
            <div className="space-y-6">
              {sortedYears.map(year => (
                <div key={year}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{year}</span>
                    <div className="flex-1 h-px bg-gray-800"></div>
                  </div>
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-4 bottom-4 w-px bg-gray-800"></div>
                    <div className="space-y-3">
                      {byYear[year].map((e, i) => {
                        const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.other
                        return (
                          <div key={e.id} className="flex gap-4 group">
                            {/* Timeline dot */}
                            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-base z-10 ${cfg.bg} border ${cfg.border}`}>
                              {cfg.emoji}
                            </div>
                            {/* Content */}
                            <div className="flex-1 card py-3 px-4 hover:border-gray-700 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-gray-100 text-sm">{e.title}</span>
                                    <span className={`badge text-[10px] ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
                                    {e.is_upcoming && (
                                      <span className="badge bg-blue-900/30 text-blue-400 border-blue-700/50 text-[10px]">Scheduled</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-gray-500">{formatDate(e.date)}</span>
                                    {e.provider && <span className="text-xs text-gray-600">@ {e.provider}</span>}
                                  </div>
                                  {e.notes && <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{e.notes}</p>}
                                  {e.outcome && (
                                    <div className="mt-2 px-2 py-1.5 bg-gray-800/60 rounded text-xs text-gray-400 leading-relaxed">
                                      <span className="text-gray-600 font-medium">Outcome: </span>{e.outcome}
                                    </div>
                                  )}
                                  {e.next_due && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-[10px] text-gray-600">Next due:</span>
                                      <UrgencyBadge dateStr={e.next_due} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <button className="btn-ghost p-1.5" onClick={() => { setEditEvent(e); setShowModal(true) }}>
                                    <Edit2 className="w-3 h-3 text-gray-400" />
                                  </button>
                                  <button className="btn-ghost p-1.5" onClick={() => setDeleteTarget(e)}>
                                    <Trash2 className="w-3 h-3 text-red-400" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* UPCOMING TAB */}
      {subTab === 'upcoming' && (
        <div className="space-y-5">
          {/* Overdue */}
          {upcoming.overdue.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400">Overdue</span>
                <span className="badge bg-red-900/40 text-red-400 text-[10px]">{upcoming.overdue.length}</span>
              </div>
              <div className="space-y-2">
                {upcoming.overdue.map(e => <UpcomingCard key={e.id} event={e} onEdit={() => { setEditEvent(e); setShowModal(true) }} />)}
              </div>
            </div>
          )}

          {/* Scheduled upcoming */}
          {upcoming.upcoming_appointments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-blue-400">Scheduled</span>
                <span className="badge bg-blue-900/40 text-blue-400 text-[10px]">{upcoming.upcoming_appointments.length}</span>
              </div>
              <div className="space-y-2">
                {upcoming.upcoming_appointments.map(e => <UpcomingCard key={e.id} event={e} onEdit={() => { setEditEvent(e); setShowModal(true) }} />)}
              </div>
            </div>
          )}

          {/* Due soon (next_due within 90 days) */}
          {upcoming.due_soon.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">Due Soon</span>
                <span className="badge bg-amber-900/40 text-amber-400 text-[10px]">{upcoming.due_soon.length}</span>
              </div>
              <div className="space-y-2">
                {upcoming.due_soon.map(e => <UpcomingCard key={e.id} event={e} onEdit={() => { setEditEvent(e); setShowModal(true) }} showNextDue />)}
              </div>
            </div>
          )}

          {upcoming.overdue.length === 0 && upcoming.upcoming_appointments.length === 0 && upcoming.due_soon.length === 0 && (
            <EmptyState
              icon={CheckCircle2}
              title="All clear"
              description="No overdue or upcoming medical events in the next 90 days."
              action={{ label: '+ Add Event', onClick: () => setShowModal(true) }}
            />
          )}
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <MedicalEventModal
          event={editEvent}
          onClose={() => { setShowModal(false); setEditEvent(null) }}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Event"
          message={`Delete "${deleteTarget.title}"?`}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget.id)}
        />
      )}
    </div>
  )
}

function UpcomingCard({ event: e, onEdit, showNextDue = false }) {
  const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.other
  const dateToShow = showNextDue ? e.next_due : e.date
  return (
    <div className={`card py-3 px-4 border-l-4 ${cfg.border} flex items-center gap-4`}>
      <div className="text-2xl flex-shrink-0">{cfg.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-100 text-sm">{e.title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {e.provider && <span className="text-xs text-gray-500">{e.provider}</span>}
          <span className="text-[10px] text-gray-600">{showNextDue ? 'Next due' : 'Scheduled'}:</span>
          {dateToShow && <UrgencyBadge dateStr={dateToShow} />}
        </div>
      </div>
      <button className="btn-ghost p-1.5 text-gray-500 flex-shrink-0" onClick={onEdit}>
        <Edit2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function MedicalEventModal({ event, onClose, onSave }) {
  const today = new Date().toISOString().split('T')[0]
  const [f, setF] = useState({
    date: event?.date || today,
    type: event?.type || 'checkup',
    title: event?.title || '',
    provider: event?.provider || '',
    notes: event?.notes || '',
    outcome: event?.outcome || '',
    next_due: event?.next_due || '',
    is_upcoming: event?.is_upcoming ?? false,
  })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const valid = f.title.trim().length > 0

  return (
    <Modal title={event ? 'Edit Medical Event' : 'Add Medical Event'} onClose={onClose} size="md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Title</label>
            <input className="input" placeholder="Annual physical, Dentist cleaning…" value={f.title}
              onChange={e => set('title', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={f.type} onChange={e => set('type', e.target.value)}>
              {TYPES.map(t => (
                <option key={t} value={t}>{TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={f.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Provider / Clinic</label>
            <input className="input" placeholder="Dr. Smith, City Medical Center" value={f.provider}
              onChange={e => set('provider', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea className="input resize-none h-16" placeholder="Reason for visit, what to discuss…"
              value={f.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Outcome / Results</label>
            <textarea className="input resize-none h-16" placeholder="What happened, any findings, follow-up needed…"
              value={f.outcome} onChange={e => set('outcome', e.target.value)} />
          </div>
          <div>
            <label className="label">Next Due Date</label>
            <input className="input" type="date" value={f.next_due} onChange={e => set('next_due', e.target.value)} />
          </div>
          <div className="flex items-center gap-3 pt-4">
            <input type="checkbox" id="is_upcoming" className="w-4 h-4 rounded accent-blue-500"
              checked={f.is_upcoming} onChange={e => set('is_upcoming', e.target.checked)} />
            <label htmlFor="is_upcoming" className="text-sm text-gray-300 cursor-pointer">Upcoming / scheduled</label>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!valid} onClick={() => onSave({
            date: f.date,
            type: f.type,
            title: f.title.trim(),
            provider: f.provider || null,
            notes: f.notes || null,
            outcome: f.outcome || null,
            next_due: f.next_due || null,
            is_upcoming: f.is_upcoming,
          })}>
            {event ? 'Save Changes' : 'Add Event'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
