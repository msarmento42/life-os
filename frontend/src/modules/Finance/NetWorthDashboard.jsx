import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { useCountUp } from '../../hooks/useCountUp'

const TYPE_COLORS = {
  checking: '#22c55e',
  savings: '#3b82f6',
  investment: '#8b5cf6',
  crypto: '#f59e0b',
  real_estate: '#06b6d4',
  liability: '#ef4444',
}
const TYPE_LABELS = {
  checking: 'Checking', savings: 'Savings', investment: 'Investment',
  crypto: 'Crypto', real_estate: 'Real Estate', liability: 'Liability',
}

function fmt(n) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n?.toFixed(2) || 0}`
}

// Enhanced custom tooltip for net worth chart
const NetWorthTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-sm font-semibold text-emerald-400">{fmt(payload[0].value)}</p>
    </div>
  )
}

// Enhanced tooltip for pie chart
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-sm font-medium" style={{ color: payload[0].fill }}>{payload[0].name}</p>
      <p className="text-sm font-semibold text-gray-300">{fmt(payload[0].value)}</p>
    </div>
  )
}

function AccountForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: '', type: 'checking', institution: '', balance: '', currency: 'USD', notes: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Account Name</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Chase Checking" />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Institution</label>
          <input className="input" value={form.institution} onChange={e => set('institution', e.target.value)} placeholder="Chase Bank" />
        </div>
        <div>
          <label className="label">Balance ($)</label>
          <input className="input" type="number" step="0.01" value={form.balance} onChange={e => set('balance', e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave({ ...form, balance: parseFloat(form.balance) || 0 })}>
          {initial ? 'Update' : 'Add Account'}
        </button>
      </div>
    </div>
  )
}

export default function NetWorthDashboard() {
  const [data, setData] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editAccount, setEditAccount] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const toast = useToast()

  const load = async () => {
    const res = await axios.get('/api/finance/net-worth')
    setData(res.data)
  }
  useEffect(() => { load() }, [])

  const saveAccount = async (form) => {
    try {
      if (editAccount) {
        await axios.put(`/api/finance/accounts/${editAccount.id}`, form)
        toast.success('Account updated')
        setEditAccount(null)
      } else {
        await axios.post('/api/finance/accounts', form)
        toast.success('Account added')
        setShowAdd(false)
      }
      load()
    } catch {
      toast.error('Failed to save account')
    }
  }

  const deleteAccount = async () => {
    try {
      await axios.delete(`/api/finance/accounts/${deleteId}`)
      toast.success('Account deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete account')
    }
  }

  // Count-up animations — must be before any early return (Rules of Hooks)
  const animNetWorth    = useCountUp(data?.net_worth    || 0)
  const animAssets      = useCountUp(data?.assets       || 0)
  const animLiabilities = useCountUp(data?.liabilities  || 0)

  if (!data) return <div className="text-gray-500 text-sm">Loading...</div>

  const { net_worth, assets, liabilities, allocation, trend, accounts } = data

  const pieData = Object.entries(allocation)
    .filter(([k]) => k !== 'liability')
    .map(([type, value]) => ({ name: TYPE_LABELS[type] || type, value, fill: TYPE_COLORS[type] || '#6366f1' }))

  const assetAccounts = accounts.filter(a => a.type !== 'liability')
  const liabilityAccounts = accounts.filter(a => a.type === 'liability')

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card col-span-1 border-l-4 border-emerald-500">
          <div className="stat-label">Net Worth</div>
          <div className="stat-value text-emerald-400">{fmt(animNetWorth)}</div>
          {trend.length >= 2 && (
            <div className={`text-xs flex items-center gap-1 ${trend[trend.length-1].net_worth > trend[trend.length-2].net_worth ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend[trend.length-1].net_worth > trend[trend.length-2].net_worth
                ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              vs last month
            </div>
          )}
        </div>
        <div className="stat-card border-l-4 border-blue-500">
          <div className="stat-label">Total Assets</div>
          <div className="stat-value text-blue-400">{fmt(animAssets)}</div>
        </div>
        <div className="stat-card border-l-4 border-red-500">
          <div className="stat-label">Liabilities</div>
          <div className="stat-value text-red-400">{fmt(animLiabilities)}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="section-title mb-4">Net Worth Trend</div>
          <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} axisLine={false} width={40} />
              <Tooltip content={<NetWorthTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#6b7280' }} />
              <Line 
                type="monotone" 
                dataKey="net_worth" 
                stroke="#22c55e" 
                strokeWidth={3}
                dot={{ fill: '#22c55e', r: 4 }} 
                activeDot={{ r: 6 }}
                isAnimationActive={true}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="section-title mb-4">Asset Allocation</div>
          <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={pieData} 
                dataKey="value" 
                innerRadius={60} 
                outerRadius={90}
                paddingAngle={3} 
                cx="50%" 
                cy="50%"
                isAnimationActive={true}
                animationDuration={800}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Legend 
                iconType="circle" 
                iconSize={8}
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{v}</span>} 
              />
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Accounts section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Assets */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title">Assets</div>
            <button className="btn-secondary btn-sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" />Add</button>
          </div>
          <div className="space-y-2">
            {assetAccounts.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-800 hover:border-gray-700">
                <div>
                  <div className="font-medium text-gray-100">{a.name}</div>
                  <div className="text-xs text-gray-500">{a.institution}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold text-emerald-400">{fmt(a.balance)}</div>
                    <div className="text-xs text-gray-500">{TYPE_LABELS[a.type]}</div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-icon-secondary" onClick={() => setEditAccount(a)}><Pencil className="w-4 h-4" /></button>
                    <button className="btn-icon-danger" onClick={() => setDeleteId(a.id)}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liabilities */}
        <div className="card">
          <div className="section-title mb-4">Liabilities</div>
          <div className="space-y-2">
            {liabilityAccounts.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-800 hover:border-gray-700">
                <div>
                  <div className="font-medium text-gray-100">{a.name}</div>
                  <div className="text-xs text-gray-500">{a.institution}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold text-red-400">{fmt(a.balance)}</div>
                    <div className="text-xs text-gray-500">{TYPE_LABELS[a.type]}</div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-icon-secondary" onClick={() => setEditAccount(a)}><Pencil className="w-4 h-4" /></button>
                    <button className="btn-icon-danger" onClick={() => setDeleteId(a.id)}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Account">
        <AccountForm initial={null} onSave={saveAccount} onClose={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editAccount} onClose={() => setEditAccount(null)} title="Edit Account">
        {editAccount && <AccountForm initial={editAccount} onSave={saveAccount} onClose={() => setEditAccount(null)} />}
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        title="Delete Account"
        message="Are you sure? This cannot be undone."
        onConfirm={deleteAccount}
        onClose={() => setDeleteId(null)}
      />
    </div>
  )
}
