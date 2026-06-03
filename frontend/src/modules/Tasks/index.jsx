/**
 * Tasks — Todoist replacement module.
 * Accent: violet (#7c3aed)
 * Views: Inbox · Today · Done
 */

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useCountUp } from '../../hooks/useCountUp'
import {
  CheckSquare, Plus, Calendar, Flag, ChevronDown, ChevronRight,
  Inbox, Sun, CheckCircle2, Circle, Trash2, Tag, Briefcase,
  Heart, DollarSign, User, MoreHorizontal, X, FolderKanban,
  AlertCircle, Clock
} from 'lucide-react'
import { SkeletonRow } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  1: { label: 'Urgent',  color: '#ef4444', bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400'    },
  2: { label: 'High',    color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  3: { label: 'Normal',  color: '#7c3aed', bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
  4: { label: 'Someday', color: '#6b7280', bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   text: 'text-gray-500'   },
}

const AREA_CONFIG = {
  work:     { label: 'Work',     icon: Briefcase, color: 'text-blue-400'    },
  personal: { label: 'Personal', icon: User,      color: 'text-violet-400'  },
  health:   { label: 'Health',   icon: Heart,     color: 'text-red-400'     },
  finance:  { label: 'Finance',  icon: DollarSign,color: 'text-emerald-400' },
  other:    { label: 'Other',    icon: Tag,       color: 'text-gray-400'    },
}

const PRIORITY_LABELS = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Someday' }
const AREA_LABELS     = Object.fromEntries(Object.entries(AREA_CONFIG).map(([k, v]) => [k, v.label]))

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDueDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((d - today) / 86400000)
  if (diff === 0) return { label: 'Today',     cls: 'text-amber-400' }
  if (diff === 1) return { label: 'Tomorrow',  cls: 'text-blue-400'  }
  if (diff === -1) return { label: 'Yesterday', cls: 'text-red-400'  }
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, cls: 'text-red-400' }
  if (diff < 7)   return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), cls: 'text-gray-400' }
  return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), cls: 'text-gray-500' }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PriorityDot({ priority, className = '' }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[3]
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${className}`}
      style={{ backgroundColor: cfg.color }}
      title={cfg.label}
    />
  )
}

function AreaBadge({ area }) {
  const cfg = AREA_CONFIG[area] || AREA_CONFIG.other
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function DueBadge({ dueDate, isOverdue }) {
  const info = formatDueDate(dueDate)
  if (!info) return null
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${isOverdue ? 'text-red-400' : info.cls}`}>
      <Calendar className="w-3 h-3" />
      {isOverdue && !['Today', 'Yesterday'].includes(info.label) ? info.label : info.label}
    </span>
  )
}

// Single task row — shared between Inbox and Today
function TaskRow({ task, onToggle, onDelete, onEdit, compact = false }) {
  const [hovered, setHovered] = useState(false)
  const isDone = task.status === 'done'

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3 border-b border-gray-800/60 last:border-b-0
        hover:bg-gray-800/30 transition-colors ${isDone ? 'opacity-50' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Complete toggle */}
      <button
        onClick={() => onToggle(task)}
        className="mt-0.5 shrink-0 text-gray-600 hover:text-violet-400 transition-colors"
        title={isDone ? 'Mark undone' : 'Complete'}
      >
        {isDone
          ? <CheckCircle2 className="w-5 h-5 text-violet-500" />
          : <Circle className="w-5 h-5" />
        }
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <PriorityDot priority={task.priority} className="mt-1.5" />
          <span
            className={`text-sm font-medium leading-snug cursor-pointer hover:text-violet-300 transition-colors
              ${isDone ? 'line-through text-gray-500' : 'text-gray-100'}`}
            onClick={() => onEdit(task)}
          >
            {task.title}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-1 ml-4 flex-wrap">
          <AreaBadge area={task.area} />
          {task.due_date && <DueBadge dueDate={task.due_date} isOverdue={task.is_overdue} />}
          {task.project_title && (
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-400">
              <FolderKanban className="w-3 h-3" />
              {task.project_title}
            </span>
          )}
          {task.notes && !compact && (
            <span className="text-[10px] text-gray-600 truncate max-w-[160px]" title={task.notes}>
              {task.notes}
            </span>
          )}
        </div>
      </div>

      {/* Actions — visible on hover */}
      <div className={`flex items-center gap-1 shrink-0 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// Priority group header (Inbox view)
function PriorityGroup({ priority, tasks, onToggle, onDelete, onEdit }) {
  const [open, setOpen] = useState(true)
  const cfg = PRIORITY_CONFIG[priority]
  if (!tasks.length) return null

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide
          hover:bg-gray-800/40 transition-colors rounded-t-lg"
        style={{ color: cfg.color }}
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span style={{ backgroundColor: cfg.color }} className="w-1.5 h-1.5 rounded-full" />
        {cfg.label}
        <span className="ml-auto text-gray-600 font-normal normal-case tracking-normal">
          {tasks.length}
        </span>
      </button>

      {open && (
        <div className="bg-gray-900 rounded-b-xl border border-gray-800 overflow-hidden">
          {tasks.map(t => (
            <TaskRow key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

// Quick-add form
function QuickAdd({ onAdd, defaultStatus = 'inbox' }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle]     = useState('')
  const [priority, setPriority] = useState(3)
  const [area, setArea]       = useState('personal')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving]   = useState(false)
  const inputRef = useRef(null)
  const toast = useToast()

  const open_ = () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }
  const close_ = () => { setOpen(false); setTitle(''); setPriority(3); setArea('personal'); setDueDate('') }

  const submit = async (e) => {
    e?.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload = { title: title.trim(), priority, area, status: defaultStatus }
      if (dueDate) payload.due_date = dueDate
      const { data } = await axios.post('/api/tasks/', payload)
      onAdd(data)
      toast.success('Task added')
      close_()
    } catch {
      toast.error('Failed to add task')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={open_}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-500
          hover:text-violet-400 hover:bg-violet-500/5 border border-dashed border-gray-800
          hover:border-violet-500/30 rounded-xl transition-all group"
      >
        <Plus className="w-4 h-4 group-hover:text-violet-400" />
        Add task…
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="card border-violet-500/30 bg-gray-900 space-y-3">
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title…"
        className="input"
        onKeyDown={e => e.key === 'Escape' && close_()}
      />

      <div className="flex flex-wrap items-center gap-2">
        {/* Priority */}
        <select
          value={priority}
          onChange={e => setPriority(Number(e.target.value))}
          className="select text-xs py-1.5 w-32"
        >
          {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* Area */}
        <select
          value={area}
          onChange={e => setArea(e.target.value)}
          className="select text-xs py-1.5 w-32"
        >
          {Object.entries(AREA_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* Due date */}
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="input text-xs py-1.5 w-36"
        />
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={close_} className="btn-ghost btn-sm">Cancel</button>
        <button
          type="submit"
          disabled={!title.trim() || saving}
          className="btn-primary btn-sm"
          style={{ backgroundColor: '#7c3aed' }}
        >
          {saving ? 'Adding…' : 'Add Task'}
        </button>
      </div>
    </form>
  )
}

// Task detail / edit drawer
function TaskDetail({ task, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    title:    task.title,
    notes:    task.notes || '',
    priority: task.priority,
    area:     task.area,
    due_date: task.due_date || '',
    status:   task.status,
  })
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.due_date) payload.due_date = null
      const { data } = await axios.patch(`/api/tasks/${task.id}`, payload)
      onSave(data)
      toast.success('Task updated')
      onClose()
    } catch {
      toast.error('Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-700 shadow-elevated p-6 space-y-4 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-100">Edit Task</h3>
          <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="textarea" rows={3} placeholder="Add notes…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} className="select">
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Area</label>
              <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className="select">
                {Object.entries(AREA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="select">
                <option value="inbox">Inbox</option>
                <option value="today">Today</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button onClick={() => { onDelete(task.id); onClose() }} className="btn-danger btn-sm">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary btn-sm" style={{ backgroundColor: '#7c3aed' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Stats bar — anim* props are count-up animated values from parent
function StatsBar({ stats, animInbox, animDueToday, animOverdue, animDone }) {
  if (!stats) return null
  return (
    <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-violet-500" />
        {Math.round(animInbox)} inbox
      </span>
      {stats.due_today > 0 && (
        <span className="flex items-center gap-1.5 text-amber-400">
          <Sun className="w-3.5 h-3.5" />
          {Math.round(animDueToday)} due today
        </span>
      )}
      {stats.overdue > 0 && (
        <span className="flex items-center gap-1.5 text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          {Math.round(animOverdue)} overdue
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        {Math.round(animDone)} done
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Tasks() {
  const [tab, setTab]           = useState('inbox')
  const [tasks, setTasks]       = useState([])
  const [todayTasks, setToday]  = useState([])
  const [doneTasks, setDone]    = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [editTask, setEditTask] = useState(null)
  const [filterArea, setFilter] = useState('')
  const toast = useToast()

  // Count-up animations for stats bar numbers
  const animInbox    = useCountUp(stats?.inbox     || 0)
  const animDueToday = useCountUp(stats?.due_today || 0)
  const animOverdue  = useCountUp(stats?.overdue   || 0)
  const animDone     = useCountUp(stats?.completed || 0)

  const load = async () => {
    setLoading(true)
    try {
      const [inboxR, todayR, doneR, statsR] = await Promise.all([
        axios.get('/api/tasks/', { params: { status: 'inbox' } }),
        axios.get('/api/tasks/today'),
        axios.get('/api/tasks/', { params: { status: 'done' } }),
        axios.get('/api/tasks/stats'),
      ])
      setTasks(inboxR.data)
      setToday(todayR.data)
      setDone(doneR.data)
      setStats(statsR.data)
    } catch {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Toggle complete / uncomplete
  const handleToggle = async (task) => {
    const newStatus = task.status === 'done' ? 'inbox' : 'done'
    try {
      const { data } = await axios.patch(`/api/tasks/${task.id}`, { status: newStatus })
      applyUpdate(data)
      toast.success(newStatus === 'done' ? '✓ Task completed' : 'Task moved to inbox')
    } catch {
      toast.error('Update failed')
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/tasks/${id}`)
      removeTask(id)
      toast.success('Task deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleAdd = (newTask) => {
    setTasks(ts => [newTask, ...ts])
    setStats(s => s ? { ...s, inbox: s.inbox + 1, total_open: s.total_open + 1 } : s)
  }

  const handleSave = (updated) => {
    applyUpdate(updated)
  }

  // Apply an updated task to all lists
  const applyUpdate = (updated) => {
    const update = (list) => list.map(t => t.id === updated.id ? updated : t)
    // Re-bucket based on new status
    setTasks(ts => {
      const filtered = ts.filter(t => t.id !== updated.id)
      return updated.status === 'inbox' ? [updated, ...filtered] : filtered
    })
    setToday(ts => {
      const filtered = ts.filter(t => t.id !== updated.id)
      const shouldBeToday = updated.status === 'today' || (
        updated.due_date === new Date().toISOString().split('T')[0] &&
        updated.status !== 'done' && updated.status !== 'cancelled'
      )
      return shouldBeToday ? [updated, ...filtered] : filtered
    })
    setDone(ts => {
      const filtered = ts.filter(t => t.id !== updated.id)
      return updated.status === 'done' ? [updated, ...filtered] : filtered
    })
    // Update stats
    setStats(s => s ? { ...s } : s)
    // Reload stats
    axios.get('/api/tasks/stats').then(r => setStats(r.data)).catch(() => {})
  }

  const removeTask = (id) => {
    setTasks(ts => ts.filter(t => t.id !== id))
    setToday(ts => ts.filter(t => t.id !== id))
    setDone(ts => ts.filter(t => t.id !== id))
    axios.get('/api/tasks/stats').then(r => setStats(r.data)).catch(() => {})
  }

  // Group inbox tasks by priority
  const inboxByPriority = [1, 2, 3, 4].map(p => ({
    priority: p,
    tasks: tasks.filter(t => t.priority === p && (filterArea ? t.area === filterArea : true)),
  }))

  const filteredToday = todayTasks.filter(t => filterArea ? t.area === filterArea : true)
  const filteredDone  = doneTasks.filter(t => filterArea ? t.area === filterArea : true)

  const TABS = [
    { id: 'inbox', label: 'Inbox',    icon: Inbox,        count: stats?.inbox },
    { id: 'today', label: 'Today',    icon: Sun,          count: stats?.due_today },
    { id: 'done',  label: 'Done',     icon: CheckCircle2, count: null },
  ]

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-violet-400" />
            Tasks
          </h1>
          <p className="page-subtitle">Your personal inbox</p>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && (
        <StatsBar
          stats={stats}
          animInbox={animInbox}
          animDueToday={animDueToday}
          animOverdue={animOverdue}
          animDone={animDone}
        />
      )}

      {/* Tabs + area filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="tabs">
          {TABS.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={tab === id ? 'tab-active' : 'tab'}
            >
              <Icon className="w-3.5 h-3.5 inline mr-1.5" />
              {label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold
                  ${tab === id ? 'bg-violet-500/20 text-violet-300' : 'bg-gray-800 text-gray-500'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Area filter */}
        <select
          value={filterArea}
          onChange={e => setFilter(e.target.value)}
          className="select text-xs py-1.5 w-36"
        >
          <option value="">All areas</option>
          {Object.entries(AREA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* ── Tab content — key forces re-mount on switch → tab-panel fade-in-up ── */}
      <div key={tab} className="tab-panel space-y-2">

        {/* INBOX */}
        {tab === 'inbox' && (
          <>
            <QuickAdd onAdd={handleAdd} defaultStatus="inbox" />

            {loading ? (
              <div className="card space-y-3">
                {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState
                icon={<Inbox className="w-6 h-6" />}
                title="Inbox zero 🎉"
                description="Nothing in your inbox. Add a task to get started."
              />
            ) : (
              inboxByPriority.map(({ priority, tasks: pts }) => (
                <PriorityGroup
                  key={priority}
                  priority={priority}
                  tasks={pts}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={setEditTask}
                />
              ))
            )}
          </>
        )}

        {/* TODAY */}
        {tab === 'today' && (
          <>
            <QuickAdd onAdd={handleAdd} defaultStatus="today" />

            {loading ? (
              <div className="card space-y-3">
                {[1,2,3].map(i => <SkeletonRow key={i} />)}
              </div>
            ) : filteredToday.length === 0 ? (
              <EmptyState
                icon={<Sun className="w-6 h-6" />}
                title="Nothing due today"
                description="You're all clear. Add something or move a task here."
              />
            ) : (
              <div className="card p-0 overflow-hidden">
                {filteredToday.map(t => (
                  <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} onEdit={setEditTask} />
                ))}
              </div>
            )}
          </>
        )}

        {/* DONE */}
        {tab === 'done' && (
          <>
            {loading ? (
              <div className="card space-y-3">
                {[1,2,3,4].map(i => <SkeletonRow key={i} />)}
              </div>
            ) : filteredDone.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-6 h-6" />}
                title="No completed tasks"
                description="Complete some tasks and they'll show up here."
              />
            ) : (
              <div className="card p-0 overflow-hidden">
                {filteredDone.map(t => (
                  <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} onEdit={setEditTask} compact />
                ))}
              </div>
            )}
          </>
        )}

      </div>{/* end tab-panel */}

      {/* Edit drawer */}
      {editTask && (
        <TaskDetail
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
