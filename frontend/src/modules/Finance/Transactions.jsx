import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, Download, Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { SkeletonRow } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'

const fmt = (n) => n >= 0 ? `$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`

function TransactionForm({ categories, accounts, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ date: today, amount: '', type: 'expense', category_id: '', description: '', notes: '', account_id: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const expenseCats = categories.filter(c => c.type === 'expense')
  const incomeCats = categories.filter(c => c.type === 'income')
  const cats = form.type === 'income' ? incomeCats : expenseCats

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div>
          <label className="label">Amount ($)</label>
          <input className="input" type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">Uncategorized</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What was this for?" />
      </div>
      <div>
        <label className="label">Account</label>
        <select className="input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
          <option value="">— Select Account —</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave({
          ...form,
          amount: parseFloat(form.amount) || 0,
          category_id: form.category_id ? parseInt(form.category_id) : null,
          account_id: form.account_id ? parseInt(form.account_id) : null,
        })}>
          Add Transaction
        </button>
      </div>
    </div>
  )
}

export default function Transactions() {
  const [data, setData] = useState({ transactions: [], total: 0 })
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [page, setPage] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [filter, setFilter] = useState({ type: '', category_id: '' })
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const limit = 25

  const now = new Date()

  const load = async () => {
    setLoading(true)
    try {
      const params = { limit, offset: page * limit }
      if (filter.type) params.type = filter.type
      if (filter.category_id) params.category_id = filter.category_id
      const [txnRes, catRes, accRes] = await Promise.all([
        axios.get('/api/finance/transactions', { params }),
        axios.get('/api/finance/categories'),
        axios.get('/api/finance/accounts'),
      ])
      setData(txnRes.data)
      setCategories(catRes.data)
      setAccounts(accRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, filter])

  const save = async (form) => {
    try {
      await axios.post('/api/finance/transactions', form)
      toast.success('Transaction added')
      setShowAdd(false)
      load()
    } catch {
      toast.error('Failed to add transaction')
    }
  }

  const del = async () => {
    try {
      await axios.delete(`/api/finance/transactions/${deleteId}`)
      toast.success('Transaction deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete transaction')
    }
  }

  const exportCsv = () => {
    window.open('/api/finance/transactions/export')
  }

  const totalPages = Math.ceil(data.total / limit)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <select className="input w-36 text-sm" value={filter.type} onChange={e => { setFilter(f => ({ ...f, type: e.target.value })); setPage(0) }}>
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select className="input w-44 text-sm" value={filter.category_id} onChange={e => { setFilter(f => ({ ...f, category_id: e.target.value })); setPage(0) }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Transaction
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="table-header text-left px-4 py-3">Date</th>
              <th className="table-header text-left px-4 py-3">Description</th>
              <th className="table-header text-left px-4 py-3">Category</th>
              <th className="table-header text-right px-4 py-3">Amount</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-gray-800/50">
                  <td colSpan={5} className="px-4 py-3">
                    <SkeletonRow cols={5} />
                  </td>
                </tr>
              ))
            ) : data.transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-0">
                  <div className="p-8">
                    <EmptyState
                      icon={Inbox}
                      title="No transactions yet"
                      description="Start tracking your spending to see patterns and insights."
                      action={{
                        label: '💰 Add Transaction',
                        onClick: () => setShowAdd(true)
                      }}
                    />
                  </div>
                </td>
              </tr>
            ) : (
              data.transactions.map(t => (
                <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 group">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-gray-200">{t.description || '—'}</td>
                  <td className="px-4 py-3">
                    {t.category_name ? (
                      <span className="badge text-xs px-2 py-0.5" style={{ background: `${t.category_color}20`, color: t.category_color }}>
                        {t.category_icon} {t.category_name}
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-medium ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">{data.total} transactions</div>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-gray-400 px-2 self-center">{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Transaction" onClose={() => setShowAdd(false)}>
          <TransactionForm categories={categories} accounts={accounts} onSave={save} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {deleteId && (
        <ConfirmModal title="Delete Transaction" message="Delete this transaction?" onConfirm={del} onClose={() => setDeleteId(null)} />
      )}
    </div>
  )
}
