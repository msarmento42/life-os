import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, AlertCircle, RefreshCw } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

export default function Recurring() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', amount: '', category_id: '', frequency: 'monthly', next_date: '', notes: '' })
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [rRes, cRes] = await Promise.all([
        axios.get('/api/finance/recurring'),
        axios.get('/api/finance/categories'),
      ])
      setItems(rRes.data)
      setCategories(cRes.data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      await axios.post('/api/finance/recurring', {
        ...form,
        amount: parseFloat(form.amount),
        category_id: form.category_id ? parseInt(form.category_id) : null,
      })
      toast.success('Recurring item added')
      setShowAdd(false)
      setForm({ name: '', amount: '', category_id: '', frequency: 'monthly', next_date: '', notes: '' })
      load()
    } catch {
      toast.error('Failed to add recurring item')
    }
  }

  const del = async () => {
    try {
      await axios.delete(`/api/finance/recurring/${deleteId}`)
      toast.success('Recurring item deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete recurring item')
    }
  }

  const monthly = items.filter(i => i.frequency === 'monthly')
  const yearly = items.filter(i => i.frequency === 'yearly')
  const weekly = items.filter(i => i.frequency === 'weekly')

  const totalMonthly = monthly.reduce((s, i) => s + i.amount, 0)
    + yearly.reduce((s, i) => s + i.amount / 12, 0)
    + weekly.reduce((s, i) => s + i.amount * 4.33, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="section-title">Recurring Items</div>
          <div className="text-sm text-gray-500 mt-0.5">Total monthly: <span className="text-gray-300 font-semibold">${totalMonthly.toFixed(2)}</span></div>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Recurring
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No recurring items yet"
          description="Add subscriptions, bills, and regular payments to track your committed monthly expenses."
          action={{ label: '+ Add Recurring', onClick: () => setShowAdd(true) }}
        />
      ) : null}

      {!loading && [['Monthly', monthly], ['Weekly', weekly], ['Yearly', yearly]].map(([freq, freqItems]) => {
        if (!freqItems.length) return null
        return (
          <div key={freq} className="card">
            <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">{freq}</div>
            <div className="space-y-2">
              {freqItems.map(item => (
                <div key={item.id} className="flex items-center justify-between group p-2 rounded-lg hover:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    {item.is_upcoming && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-200">{item.name}</span>
                        {item.is_upcoming && <span className="badge bg-amber-900/50 text-amber-400 text-[10px]">Due soon</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.category_name || 'No category'}
                        {item.next_date && ` · Next: ${new Date(item.next_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono font-medium text-gray-100">${item.amount.toFixed(2)}</div>
                    <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {showAdd && (
        <Modal title="Add Recurring Item" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Netflix" />
              </div>
              <div>
                <label className="label">Amount ($)</label>
                <input className="input" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="15.99" />
              </div>
              <div>
                <label className="label">Frequency</label>
                <select className="input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="label">Next Date</label>
                <input className="input" type="date" value={form.next_date} onChange={e => setForm(f => ({ ...f, next_date: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Category</label>
                <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Add</button>
            </div>
          </div>
        </Modal>
      )}
      {deleteId && (
        <ConfirmModal title="Delete Item" message="Remove this recurring item?" onConfirm={del} onClose={() => setDeleteId(null)} />
      )}
    </div>
  )
}
