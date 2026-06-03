import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

export default function BudgetTracker() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ category_id: '', amount: '' })
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [bRes, cRes] = await Promise.all([
        axios.get('/api/finance/budgets', { params: { month, year } }),
        axios.get('/api/finance/categories'),
      ])
      setBudgets(bRes.data)
      setCategories(cRes.data.filter(c => c.type === 'expense'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [month, year])

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  const save = async () => {
    try {
      await axios.post('/api/finance/budgets', {
        category_id: parseInt(form.category_id),
        month, year,
        amount: parseFloat(form.amount),
      })
      toast.success('Budget added')
      setShowAdd(false)
      setForm({ category_id: '', amount: '' })
      load()
    } catch {
      toast.error('Failed to add budget')
    }
  }

  const del = async () => {
    try {
      await axios.delete(`/api/finance/budgets/${deleteId}`)
      toast.success('Budget deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete budget')
    }
  }

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const totalBudget = budgets.reduce((s, b) => s + b.budget, 0)
  const totalActual = budgets.reduce((s, b) => s + b.actual, 0)

  return (
    <div className="space-y-5">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn-secondary p-2" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></button>
          <div className="text-lg font-semibold text-gray-100 min-w-[180px] text-center">{monthName}</div>
          <button className="btn-secondary p-2" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Budget
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-label">Total Budgeted</div>
          <div className="stat-value">${totalBudget.toFixed(0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Spent</div>
          <div className={`stat-value ${totalActual > totalBudget ? 'text-red-400' : 'text-emerald-400'}`}>
            ${totalActual.toFixed(0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Remaining</div>
          <div className={`stat-value ${totalBudget - totalActual < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            ${(totalBudget - totalActual).toFixed(0)}
          </div>
        </div>
      </div>

      {/* Budget bars */}
      <div className="card space-y-5">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : budgets.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No budgets set for this month"
            description="Add spending limits for each category to track where your money is going."
            action={{ label: '+ Add Budget', onClick: () => setShowAdd(true) }}
          />
        ) : null}
        {!loading && budgets.map(b => {
          const pct = Math.min(b.pct, 100)
          const over = b.actual > b.budget
          return (
            <div key={b.id} className="space-y-2 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{b.category_icon}</span>
                  <span className="text-sm font-medium text-gray-200">{b.category_name}</span>
                  {over && <span className="badge bg-red-900/50 text-red-400 text-[10px]">Over budget</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500">
                    <span className={over ? 'text-red-400 font-semibold' : 'text-gray-300'}>${b.actual.toFixed(0)}</span>
                    <span className="text-gray-600"> / </span>
                    ${b.budget.toFixed(0)}
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400" onClick={() => setDeleteId(b.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-xs text-gray-600">
                {over ? `$${(b.actual - b.budget).toFixed(0)} over budget` : `$${b.variance.toFixed(0)} remaining (${100 - Math.round(b.pct)}%)`}
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <Modal title="Add Budget" onClose={() => setShowAdd(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Select a category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Monthly Budget ($)</label>
              <input className="input" type="number" step="10" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="500" />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save Budget</button>
            </div>
          </div>
        </Modal>
      )}
      {deleteId && (
        <ConfirmModal title="Remove Budget" message="Remove this budget category?" onConfirm={del} onClose={() => setDeleteId(null)} />
      )}
    </div>
  )
}
