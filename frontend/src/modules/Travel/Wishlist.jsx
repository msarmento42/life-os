import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, Star } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'

export default function Wishlist() {
  const [items, setItems] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({ name: '', country: '', reason: '', estimated_cost: '', priority: 5, notes: '' })
  const toast = useToast()

  const load = async () => {
    const res = await axios.get('/api/travel/wishlist')
    setItems(res.data)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      await axios.post('/api/travel/wishlist', { ...form, estimated_cost: parseFloat(form.estimated_cost) || null, priority: parseInt(form.priority) })
      toast.success('Destination added to wishlist')
      setShowAdd(false)
      setForm({ name: '', country: '', reason: '', estimated_cost: '', priority: 5, notes: '' })
      load()
    } catch {
      toast.error('Failed to add to wishlist')
    }
  }

  const del = async () => {
    try {
      await axios.delete(`/api/travel/wishlist/${deleteId}`)
      toast.success('Removed from wishlist')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to remove from wishlist')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="section-title">Travel Wishlist</div>
        <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Destination
        </button>
      </div>

      {items.length === 0 && (
        <div className="card text-center py-16 text-gray-500">
          <Star className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p>Your wishlist is empty. Add places you dream of visiting!</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="card flex items-start gap-4 group hover:border-gray-600 transition-colors">
            <div className="text-2xl font-bold text-gray-700 min-w-[2rem] text-center mt-1">#{i + 1}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="font-semibold text-gray-100">{item.name}</div>
                {item.country && <span className="text-gray-500 text-sm">· {item.country}</span>}
              </div>
              {item.reason && <p className="text-sm text-gray-400 mb-2">{item.reason}</p>}
              {item.estimated_cost && (
                <div className="text-xs text-gray-500">Est. cost: <span className="text-gray-300">${item.estimated_cost.toLocaleString()}</span></div>
              )}
            </div>
            <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400 shrink-0" onClick={() => setDeleteId(item.id)}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="Add to Wishlist" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Destination</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Patagonia" />
              </div>
              <div>
                <label className="label">Country</label>
                <input className="input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Chile" />
              </div>
              <div>
                <label className="label">Priority (1 = top)</label>
                <input className="input" type="number" min="1" max="100" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
              </div>
              <div>
                <label className="label">Est. Cost ($)</label>
                <input className="input" type="number" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} placeholder="5000" />
              </div>
            </div>
            <div>
              <label className="label">Why do you want to go?</label>
              <textarea className="input" rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Epic trekking, raw landscapes..." />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Add to Wishlist</button>
            </div>
          </div>
        </Modal>
      )}
      {deleteId && (
        <ConfirmModal title="Remove from Wishlist" message="Remove this destination from your wishlist?" onConfirm={del} onClose={() => setDeleteId(null)} />
      )}
    </div>
  )
}
