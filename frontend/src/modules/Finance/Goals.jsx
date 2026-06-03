import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Pencil, Trash2, Target } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

function GoalForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: '', target_amount: '', current_amount: '0', monthly_allocation: '0', target_date: '', color: '#6366f1', icon: '🎯', notes: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Goal Name</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Emergency Fund" />
        </div>
        <div>
          <label className="label">Icon</label>
          <input className="input" value={form.icon} onChange={e => set('icon', e.target.value)} placeholder="🎯" />
        </div>
        <div>
          <label className="label">Target Amount ($)</label>
          <input className="input" type="number" step="100" value={form.target_amount} onChange={e => set('target_amount', e.target.value)} placeholder="10000" />
        </div>
        <div>
          <label className="label">Current Amount ($)</label>
          <input className="input" type="number" step="10" value={form.current_amount} onChange={e => set('current_amount', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Monthly Allocation ($)</label>
          <input className="input" type="number" step="50" value={form.monthly_allocation} onChange={e => set('monthly_allocation', e.target.value)} placeholder="200" />
        </div>
        <div>
          <label className="label">Target Date</label>
          <input className="input" type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Color</label>
          <div className="flex gap-2">
            <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer" />
            <input className="input flex-1" value={form.color} onChange={e => set('color', e.target.value)} />
          </div>
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave({
          ...form,
          target_amount: parseFloat(form.target_amount) || 0,
          current_amount: parseFloat(form.current_amount) || 0,
          monthly_allocation: parseFloat(form.monthly_allocation) || 0,
          target_date: form.target_date || null,
        })}>
          {initial ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </div>
  )
}

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editGoal, setEditGoal] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/finance/goals')
      setGoals(res.data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const save = async (form) => {
    try {
      if (editGoal) {
        await axios.put(`/api/finance/goals/${editGoal.id}`, form)
        toast.success('Goal updated')
        setEditGoal(null)
      } else {
        await axios.post('/api/finance/goals', form)
        toast.success('Goal created')
        setShowAdd(false)
      }
      load()
    } catch {
      toast.error('Failed to save goal')
    }
  }

  const del = async () => {
    try {
      await axios.delete(`/api/finance/goals/${deleteId}`)
      toast.success('Goal deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete goal')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="section-title">Savings Goals</div>
        <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> New Goal
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No savings goals yet"
          description="Create your first goal to track progress toward what matters most to you."
          action={{ label: '+ New Goal', onClick: () => setShowAdd(true) }}
        />
      ) : null}

      {!loading && (
      <div className="grid grid-cols-2 gap-4">
        {goals.map(g => {
          const pct = Math.min(100, (g.current_amount / g.target_amount) * 100) || 0
          const remaining = g.target_amount - g.current_amount
          const daysLeft = g.target_date
            ? Math.ceil((new Date(g.target_date) - new Date()) / (1000 * 60 * 60 * 24))
            : null
          return (
            <div key={g.id} className="card group relative">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button className="btn-ghost p-1.5 text-xs" onClick={() => setEditGoal(g)}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button className="btn-ghost p-1.5 text-red-400" onClick={() => setDeleteId(g.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">{g.icon}</div>
                <div>
                  <div className="font-semibold text-gray-100">{g.name}</div>
                  {g.target_date && (
                    <div className={`text-xs ${daysLeft < 30 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress ring + number */}
              <div className="flex items-center gap-5 mb-4">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#1f2937" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke={g.color} strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: g.color }}>
                    {Math.round(pct)}%
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-100">${(g.current_amount || 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">of ${(g.target_amount || 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-600 mt-0.5">${remaining.toLocaleString()} to go</div>
                </div>
              </div>

              {g.notes && <div className="text-xs text-gray-600 border-t border-gray-800 pt-3">{g.notes}</div>}
            </div>
          )
        })}
      </div>
      )}

      {showAdd && (
        <Modal title="Create Savings Goal" onClose={() => setShowAdd(false)}>
          <GoalForm onSave={save} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {editGoal && (
        <Modal title="Edit Goal" onClose={() => setEditGoal(null)}>
          <GoalForm initial={editGoal} onSave={save} onClose={() => setEditGoal(null)} />
        </Modal>
      )}
      {deleteId && (
        <ConfirmModal title="Delete Goal" message="Delete this savings goal?" onConfirm={del} onClose={() => setDeleteId(null)} />
      )}
    </div>
  )
}
