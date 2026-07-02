import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import {
  Plus, Trash2, Pencil, Plane, Hotel, Utensils, Activity, Car,
  ChevronRight, Package, DollarSign, FileText, Star, AlertTriangle,
  ThumbsUp, ThumbsDown, RotateCcw,
} from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

// ── Constants ─────────────────────────────────────────────────────────────────

const ORANGE = '#f97316'

const STATUS_COLORS = {
  planning:  'text-blue-400 bg-blue-900/40',
  booked:    'text-amber-400 bg-amber-900/40',
  completed: 'text-emerald-400 bg-emerald-900/40',
}

const TYPE_ICONS = {
  flight: Plane, hotel: Hotel, restaurant: Utensils,
  activity: Activity, transport: Car,
}

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'General']
const DOC_TYPES = ['passport', 'visa', 'insurance', 'vaccination', 'emergency_contacts', 'other']

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return null
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function expiryColor(daysLeft) {
  if (daysLeft < 0)   return 'text-red-400'
  if (daysLeft < 30)  return 'text-red-400'
  if (daysLeft < 90)  return 'text-amber-400'
  return 'text-gray-400'
}

// ── TripCard ──────────────────────────────────────────────────────────────────

function TripCard({ trip, onEdit, onDelete, onSelect }) {
  const nights = trip.start_date && trip.end_date
    ? Math.max(1, Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000))
    : null

  return (
    <div className="card group hover:border-gray-600 transition-colors cursor-pointer" onClick={() => onSelect(trip)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-gray-100">{trip.name}</div>
          <div className="text-sm text-gray-500 mt-0.5">{trip.destination}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge text-xs ${STATUS_COLORS[trip.status]}`}>{trip.status}</span>
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
            <button className="btn-ghost p-1" onClick={e => { e.stopPropagation(); onEdit(trip) }}><Pencil className="w-3.5 h-3.5" /></button>
            <button className="btn-ghost p-1 text-red-400" onClick={e => { e.stopPropagation(); onDelete(trip.id) }}><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
      {trip.start_date && (
        <div className="text-xs text-gray-500 mb-2">
          {fmtDate(trip.start_date)}{trip.end_date && ` → ${fmtDate(trip.end_date)}`}
          {nights && <span className="ml-1 text-gray-600">· {nights}n</span>}
        </div>
      )}
      <div className="flex items-center gap-4">
        {trip.budget > 0 && (
          <div className="text-xs text-gray-600">Budget: <span className="text-gray-400">${trip.budget.toLocaleString()}</span></div>
        )}
        {trip.rating && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <Star className="w-3 h-3" />{trip.rating}/10
          </div>
        )}
      </div>
    </div>
  )
}

// ── Trip Form ─────────────────────────────────────────────────────────────────

function TripForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: '', destination: '', country: '', city: '',
    start_date: '', end_date: '', status: 'planning', budget: '', notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Trip Name</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Tokyo & Kyoto 2026" />
        </div>
        <div>
          <label className="label">Destination</label>
          <input className="input" value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="Japan" />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="planning">Planning</option>
            <option value="booked">Booked</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="label">Country</label>
          <input className="input" value={form.country} onChange={e => set('country', e.target.value)} />
        </div>
        <div>
          <label className="label">City</label>
          <input className="input" value={form.city} onChange={e => set('city', e.target.value)} />
        </div>
        <div>
          <label className="label">Start Date</label>
          <input className="input" type="date" value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div>
          <label className="label">End Date</label>
          <input className="input" type="date" value={form.end_date || ''} onChange={e => set('end_date', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Budget ($)</label>
          <input className="input" type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="5000" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" style={{ '--btn-color': ORANGE }}
          onClick={() => onSave({ ...form, budget: parseFloat(form.budget) || 0 })}>
          {initial ? 'Update Trip' : 'Create Trip'}
        </button>
      </div>
    </div>
  )
}

// ── Reflection tab ────────────────────────────────────────────────────────────

function ReflectionTab({ trip, onSaved, toast }) {
  const [form, setForm] = useState({
    rating:       trip.rating ?? '',
    highlights:   trip.highlights ?? '',
    lowlights:    trip.lowlights ?? '',
    would_return: trip.would_return ?? null,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      await axios.put(`/api/travel/trips/${trip.id}`, {
        ...form,
        rating: form.rating !== '' ? Number(form.rating) : null,
      })
      toast.success('Reflection saved')
      onSaved()
    } catch { toast.error('Failed to save reflection') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 max-w-xl">
      {/* Overall rating */}
      <div>
        <label className="label mb-2">Overall rating</label>
        <div className="flex gap-1.5">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              onClick={() => set('rating', n)}
              className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all border ${
                form.rating === n
                  ? 'border-orange-400 bg-orange-500/20 text-orange-300'
                  : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
              }`}
            >{n}</button>
          ))}
        </div>
      </div>

      {/* Would return */}
      <div>
        <label className="label mb-2">Would you return?</label>
        <div className="flex gap-3">
          {[
            { val: true,  label: 'Yes', icon: ThumbsUp,  active: 'border-emerald-400 bg-emerald-500/15 text-emerald-300' },
            { val: false, label: 'No',  icon: ThumbsDown, active: 'border-red-400 bg-red-500/15 text-red-300' },
          ].map(({ val, label, icon: Icon, active }) => (
            <button
              key={String(val)}
              onClick={() => set('would_return', val)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                form.would_return === val
                  ? active
                  : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
          {form.would_return !== null && (
            <button onClick={() => set('would_return', null)} className="text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Highlights */}
      <div>
        <label className="label flex items-center gap-1.5">
          <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" /> Highlights
        </label>
        <textarea className="input resize-none" rows={3}
          placeholder="The best moments, unexpected discoveries, what made it memorable…"
          value={form.highlights}
          onChange={e => set('highlights', e.target.value)} />
      </div>

      {/* Lowlights */}
      <div>
        <label className="label flex items-center gap-1.5">
          <ThumbsDown className="w-3.5 h-3.5 text-red-400" /> Lowlights
        </label>
        <textarea className="input resize-none" rows={3}
          placeholder="What didn't work, what you'd do differently…"
          value={form.lowlights}
          onChange={e => set('lowlights', e.target.value)} />
      </div>

      <button onClick={save} disabled={saving} className="btn-primary" style={{ '--btn-color': ORANGE }}>
        {saving ? 'Saving…' : 'Save Reflection'}
      </button>
    </div>
  )
}

// ── Documents tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ tripId, docs, onSaved, toast }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'passport', content: '', expiry_date: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const today = new Date()

  const save = async () => {
    try {
      await axios.post('/api/travel/documents', {
        trip_id: tripId,
        title: form.title,
        type: form.type,
        content: form.content || null,
        expiry_date: form.expiry_date || null,
      })
      toast.success('Document added')
      setShowAdd(false)
      setForm({ title: '', type: 'passport', content: '', expiry_date: '' })
      onSaved()
    } catch { toast.error('Failed to add document') }
  }

  const del = async (id) => {
    try {
      await axios.delete(`/api/travel/documents/${id}`)
      toast.success('Document removed')
      onSaved()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary text-xs" style={{ '--btn-color': ORANGE }} onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Document
        </button>
      </div>

      {docs?.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet"
          description="Store passports, visas, insurance, and confirmation numbers here."
          action={{ label: 'Add Document', onClick: () => setShowAdd(true) }} />
      ) : (
        <div className="space-y-3">
          {(docs || []).map(doc => {
            const daysLeft = doc.expiry_date
              ? Math.round((new Date(doc.expiry_date) - today) / 86400000)
              : null
            return (
              <div key={doc.id} className={`card p-4 flex items-start gap-3 group hover:border-gray-700 ${daysLeft !== null && daysLeft < 30 ? 'border-amber-500/30' : ''}`}>
                <FileText className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200">{doc.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">{doc.type}</span>
                    {daysLeft !== null && (
                      <span className={`text-[10px] font-medium flex items-center gap-1 ${expiryColor(daysLeft)}`}>
                        {daysLeft < 0
                          ? <><AlertTriangle className="w-3 h-3" /> Expired {Math.abs(daysLeft)}d ago</>
                          : daysLeft < 30
                          ? <><AlertTriangle className="w-3 h-3" /> Expires in {daysLeft}d</>
                          : `Expires ${fmtDate(doc.expiry_date)}`}
                      </span>
                    )}
                  </div>
                  {doc.content && <p className="text-xs text-gray-500 mt-1">{doc.content}</p>}
                </div>
                <button className="opacity-0 group-hover:opacity-100 icon-btn text-red-400 hover:text-red-300 shrink-0"
                  onClick={() => del(doc.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Document" onClose={() => setShowAdd(false)} size="sm">
          <div className="space-y-3">
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="US Passport" />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expiry Date</label>
              <input className="input" type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Notes / confirmation #</label>
              <textarea className="input resize-none" rows={2} value={form.content} onChange={e => set('content', e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" style={{ '--btn-color': ORANGE }} onClick={save}>Add</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function PackingTab({ tripId, lists, onSaved, toast }) {
  const [showAddList, setShowAddList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [addItemFor, setAddItemFor] = useState(null) // packing_list_id or null
  const [itemForm, setItemForm] = useState({ name: '', category: 'General', quantity: 1 })

  const createList = async () => {
    try {
      await axios.post('/api/travel/packing-lists', { trip_id: tripId, name: newListName || 'Packing List', is_template: false })
      toast.success('Packing list created')
      setShowAddList(false)
      setNewListName('')
      onSaved()
    } catch { toast.error('Failed to create list') }
  }

  const deleteList = async (id) => {
    try {
      await axios.delete(`/api/travel/packing-lists/${id}`)
      toast.success('Packing list removed')
      onSaved()
    } catch { toast.error('Failed to delete list') }
  }

  const addItem = async () => {
    try {
      await axios.post('/api/travel/packing-items', {
        packing_list_id: addItemFor,
        name: itemForm.name,
        category: itemForm.category || 'General',
        quantity: parseInt(itemForm.quantity) || 1,
      })
      toast.success('Item added')
      setAddItemFor(null)
      setItemForm({ name: '', category: 'General', quantity: 1 })
      onSaved()
    } catch { toast.error('Failed to add item') }
  }

  const toggleItem = async (item) => {
    try {
      await axios.put(`/api/travel/packing-items/${item.id}`, { is_checked: !item.is_checked })
      onSaved()
    } catch { toast.error('Failed to update item') }
  }

  const deleteItem = async (id) => {
    try {
      await axios.delete(`/api/travel/packing-items/${id}`)
      onSaved()
    } catch { toast.error('Failed to delete item') }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary text-xs" style={{ '--btn-color': ORANGE }} onClick={() => setShowAddList(true)}>
          <Plus className="w-3.5 h-3.5" /> New Packing List
        </button>
      </div>

      {!lists?.length ? (
        <EmptyState icon={Package} title="No packing lists yet"
          description="Create a packing list and track what's in the bag."
          action={{ label: 'New Packing List', onClick: () => setShowAddList(true) }} />
      ) : (
        <div className="space-y-4">
          {lists.map(list => {
            const total = list.items?.length || 0
            const checked = list.items?.filter(i => i.is_checked).length || 0
            return (
              <div key={list.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-400" />
                    <span className="font-semibold text-gray-200 text-sm">{list.name}</span>
                    <span className="text-[10px] text-gray-500">{checked}/{total} packed</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button className="btn-ghost text-xs" onClick={() => setAddItemFor(list.id)}>
                      <Plus className="w-3.5 h-3.5" /> Item
                    </button>
                    <button className="icon-btn text-red-400 hover:text-red-300" onClick={() => deleteList(list.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {!total ? (
                  <p className="text-xs text-gray-500">No items yet.</p>
                ) : (
                  <div className="space-y-1">
                    {list.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-800/40 group">
                        <input type="checkbox" checked={!!item.is_checked} onChange={() => toggleItem(item)}
                          className="accent-orange-500 w-4 h-4" />
                        <span className={`flex-1 text-sm ${item.is_checked ? 'line-through text-gray-600' : 'text-gray-200'}`}>
                          {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
                        </span>
                        <span className="text-[10px] text-gray-600">{item.category}</span>
                        <button className="opacity-0 group-hover:opacity-100 icon-btn text-red-400 hover:text-red-300"
                          onClick={() => deleteItem(item.id)}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {addItemFor === list.id && (
                  <div className="mt-3 pt-3 border-t border-gray-800 flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="label">Item</label>
                      <input className="input" value={itemForm.name}
                        onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Passport" autoFocus />
                    </div>
                    <div className="w-28">
                      <label className="label">Category</label>
                      <input className="input" value={itemForm.category}
                        onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))} />
                    </div>
                    <div className="w-16">
                      <label className="label">Qty</label>
                      <input className="input" type="number" min={1} value={itemForm.quantity}
                        onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} />
                    </div>
                    <button className="btn-primary text-xs" style={{ '--btn-color': ORANGE }} onClick={addItem}>Add</button>
                    <button className="btn-secondary text-xs" onClick={() => setAddItemFor(null)}>Cancel</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddList && (
        <Modal title="New Packing List" onClose={() => setShowAddList(false)} size="sm">
          <div className="space-y-3">
            <div>
              <label className="label">Name</label>
              <input className="input" value={newListName} onChange={e => setNewListName(e.target.value)}
                placeholder="Carry-on" autoFocus />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowAddList(false)}>Cancel</button>
              <button className="btn-primary" style={{ '--btn-color': ORANGE }} onClick={createList}>Create</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Trip Detail ───────────────────────────────────────────────────────────────

function TripDetail({ tripId, onBack }) {
  const [trip, setTrip] = useState(null)
  const [tab, setTab] = useState('itinerary')
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState(null)
  const [itemForm, setItemForm] = useState({ day_number: 1, type: 'activity', title: '', time: '', location: '', confirmation_number: '', cost: '', notes: '' })
  const [expForm, setExpForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', category: 'Food', description: '' })
  const toast = useToast()

  const load = async () => {
    const res = await axios.get(`/api/travel/trips/${tripId}`)
    setTrip(res.data)
  }
  useEffect(() => { load() }, [tripId])

  const addItem = async () => {
    try {
      await axios.post('/api/travel/itinerary', {
        ...itemForm, trip_id: tripId,
        cost: parseFloat(itemForm.cost) || 0,
        day_number: parseInt(itemForm.day_number),
      })
      toast.success('Item added')
      setShowAddItem(false)
      load()
    } catch { toast.error('Failed to add item') }
  }

  const delItem = async () => {
    try {
      await axios.delete(`/api/travel/itinerary/${deleteItemId}`)
      toast.success('Item deleted')
      setDeleteItemId(null)
      load()
    } catch { toast.error('Failed to delete item') }
  }

  const addExpense = async () => {
    try {
      await axios.post('/api/travel/expenses', { ...expForm, trip_id: tripId, amount: parseFloat(expForm.amount) })
      toast.success('Expense logged')
      setShowAddExpense(false)
      load()
    } catch { toast.error('Failed to log expense') }
  }

  if (!trip) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>

  const days = {}
  for (const item of (trip.itinerary_items || [])) {
    if (!days[item.day_number]) days[item.day_number] = []
    days[item.day_number].push(item)
  }

  const TypeIcon = ({ type }) => {
    const Icon = TYPE_ICONS[type] || Activity
    return <Icon className="w-4 h-4" />
  }

  const isCompleted = trip.status === 'completed'
  const tabs = ['itinerary', 'packing', 'expenses', 'documents', ...(isCompleted ? ['reflection'] : [])]

  return (
    <div>
      <button className="btn-ghost mb-4 -ml-2 flex items-center gap-1" onClick={onBack}>
        <ChevronRight className="w-4 h-4 rotate-180" /> Back to trips
      </button>

      {/* Trip header */}
      <div className="card mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-bold text-gray-100">{trip.name}</div>
            <div className="text-gray-500 mt-0.5">{trip.destination}</div>
            {trip.start_date && (
              <div className="text-sm text-gray-500 mt-1">
                {fmtDate(trip.start_date)}
                {trip.end_date && ` → ${fmtDate(trip.end_date)}`}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {trip.rating && (
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4" />
                <span className="font-bold">{trip.rating}/10</span>
              </div>
            )}
            <span className={`badge ${STATUS_COLORS[trip.status]}`}>{trip.status}</span>
          </div>
        </div>
        {trip.budget > 0 && (
          <div className="flex gap-6 mt-4 pt-4 border-t border-gray-800">
            <div><div className="stat-label">Budget</div><div className="text-lg font-semibold">${trip.budget?.toLocaleString()}</div></div>
            <div><div className="stat-label">Spent</div><div className="text-lg font-semibold text-red-400">${(trip.total_expenses || 0).toLocaleString()}</div></div>
            <div><div className="stat-label">Remaining</div>
              <div className={`text-lg font-semibold ${(trip.remaining_budget || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${(trip.remaining_budget || 0).toFixed(0)}
              </div>
            </div>
          </div>
        )}
        {/* Reflection summary — show on header if filled in */}
        {isCompleted && trip.highlights && (
          <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trip.highlights && (
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3 text-emerald-400" /> Highlights
                </div>
                <p className="text-xs text-gray-400">{trip.highlights}</p>
              </div>
            )}
            {trip.lowlights && (
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ThumbsDown className="w-3 h-3 text-red-400" /> Lowlights
                </div>
                <p className="text-xs text-gray-400">{trip.lowlights}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <nav className="tabs mb-5">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`tab capitalize ${tab === t ? 'tab-active text-orange-400' : ''}`}>
            {t}
          </button>
        ))}
      </nav>

      {/* Itinerary */}
      {tab === 'itinerary' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-primary text-xs" style={{ '--btn-color': ORANGE }} onClick={() => setShowAddItem(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
          {!Object.keys(days).length ? (
            <EmptyState icon={Plane} title="No itinerary yet"
              description="Add flights, hotels, restaurants, and activities."
              action={{ label: 'Add Item', onClick: () => setShowAddItem(true) }} />
          ) : (
            Object.keys(days).sort((a, b) => +a - +b).map(day => (
              <div key={day} className="card">
                <div className="font-semibold text-gray-300 mb-3 text-sm">Day {day}</div>
                <div className="space-y-2">
                  {days[day].map(item => (
                    <div key={item.id} className="flex gap-3 p-3 rounded-lg bg-gray-800/40 hover:bg-gray-800 group transition-colors">
                      <div className="mt-0.5 text-gray-500"><TypeIcon type={item.type} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {item.time && <span className="text-xs text-gray-500 font-mono">{item.time}</span>}
                          <span className="text-sm text-gray-200 font-medium">{item.title}</span>
                        </div>
                        {item.location && <div className="text-xs text-gray-500 mt-0.5">📍 {item.location}</div>}
                        {item.confirmation_number && <div className="text-xs text-gray-600 mt-0.5">Ref: {item.confirmation_number}</div>}
                        {item.notes && <div className="text-xs text-gray-600 mt-0.5">{item.notes}</div>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.cost > 0 && <span className="text-xs text-gray-500">${item.cost}</span>}
                        <button className="opacity-0 group-hover:opacity-100 icon-btn text-red-400"
                          onClick={() => setDeleteItemId(item.id)}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Expenses */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-primary text-xs" style={{ '--btn-color': ORANGE }} onClick={() => setShowAddExpense(true)}>
              <Plus className="w-3.5 h-3.5" /> Log Expense
            </button>
          </div>
          {!trip.expenses?.length ? (
            <EmptyState icon={DollarSign} title="No expenses yet"
              description="Track your spending to see how you do vs. budget."
              action={{ label: 'Log Expense', onClick: () => setShowAddExpense(true) }} />
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="table-header text-left px-4 py-3">Date</th>
                    <th className="table-header text-left px-4 py-3">Description</th>
                    <th className="table-header text-left px-4 py-3">Category</th>
                    <th className="table-header text-right px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {trip.expenses.map(e => (
                    <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-gray-500 text-xs">{e.date}</td>
                      <td className="px-4 py-3 text-gray-200">{e.description || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{e.category}</td>
                      <td className="px-4 py-3 text-right text-gray-100 font-mono">${e.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Packing */}
      {tab === 'packing' && (
        <PackingTab tripId={tripId} lists={trip.packing_lists || []} onSaved={load} toast={toast} />
      )}

      {/* Documents */}
      {tab === 'documents' && (
        <DocumentsTab tripId={tripId} docs={trip.documents || []} onSaved={load} toast={toast} />
      )}

      {/* Reflection (completed trips only) */}
      {tab === 'reflection' && (
        <ReflectionTab trip={trip} onSaved={load} toast={toast} />
      )}

      {/* Modals */}
      {showAddItem && (
        <Modal title="Add Itinerary Item" onClose={() => setShowAddItem(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Day #</label>
                <input className="input" type="number" min="1" value={itemForm.day_number} onChange={e => setItemForm(f => ({ ...f, day_number: e.target.value }))} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={itemForm.type} onChange={e => setItemForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="flight">Flight</option>
                  <option value="hotel">Hotel</option>
                  <option value="activity">Activity</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="transport">Transport</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Title</label>
                <input className="input" value={itemForm.title} onChange={e => setItemForm(f => ({ ...f, title: e.target.value }))} placeholder="SFO → NRT" />
              </div>
              <div>
                <label className="label">Time</label>
                <input className="input" value={itemForm.time} onChange={e => setItemForm(f => ({ ...f, time: e.target.value }))} placeholder="14:00" />
              </div>
              <div>
                <label className="label">Cost ($)</label>
                <input className="input" type="number" value={itemForm.cost} onChange={e => setItemForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" value={itemForm.location} onChange={e => setItemForm(f => ({ ...f, location: e.target.value }))} placeholder="Tokyo" />
              </div>
              <div>
                <label className="label">Confirmation #</label>
                <input className="input" value={itemForm.confirmation_number} onChange={e => setItemForm(f => ({ ...f, confirmation_number: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowAddItem(false)}>Cancel</button>
              <button className="btn-primary" style={{ '--btn-color': ORANGE }} onClick={addItem}>Add Item</button>
            </div>
          </div>
        </Modal>
      )}

      {showAddExpense && (
        <Modal title="Log Expense" onClose={() => setShowAddExpense(false)} size="sm">
          <div className="space-y-3">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Amount ($)</label>
              <input className="input" type="number" step="0.01" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} placeholder="Dinner at ramen shop" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setShowAddExpense(false)}>Cancel</button>
              <button className="btn-primary" style={{ '--btn-color': ORANGE }} onClick={addExpense}>Log</button>
            </div>
          </div>
        </Modal>
      )}

      {deleteItemId && (
        <ConfirmModal title="Delete Item" message="Remove this itinerary item?"
          onConfirm={delItem} onClose={() => setDeleteItemId(null)} />
      )}
    </div>
  )
}

// ── Cost Comparison Chart ─────────────────────────────────────────────────────

function CostComparisonChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/travel/cost-comparison')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || data.length < 2) return null

  const chartData = data.map(t => ({
    name: t.name.length > 16 ? t.name.slice(0, 14) + '…' : t.name,
    'Cost/day': t.cost_per_day,
    Total: t.total_spent,
    rating: t.rating,
  }))

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Cost per Day — Completed Trips</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `$${v}`} />
          <RTooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#f9fafb', fontSize: 12 }}
            formatter={(v, name) => [name === 'Cost/day' ? `$${v}/day` : `$${v}`, name]}
          />
          <Bar dataKey="Cost/day" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={ORANGE} fillOpacity={0.7 + (i % 3) * 0.1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Root: Trips list ──────────────────────────────────────────────────────────

export default function Trips() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editTrip, setEditTrip] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/travel/trips', { params: filterStatus ? { status: filterStatus } : {} })
      setTrips(res.data)
    } catch { toast.error('Failed to load trips') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filterStatus])

  const save = async (form) => {
    try {
      if (editTrip) {
        await axios.put(`/api/travel/trips/${editTrip.id}`, form)
        toast.success('Trip updated')
        setEditTrip(null)
      } else {
        await axios.post('/api/travel/trips', form)
        toast.success('Trip created')
        setShowAdd(false)
      }
      load()
    } catch { toast.error('Failed to save trip') }
  }

  const del = async () => {
    try {
      await axios.delete(`/api/travel/trips/${deleteId}`)
      toast.success('Trip deleted')
      setDeleteId(null)
      load()
    } catch { toast.error('Failed to delete trip') }
  }

  if (selectedTripId) {
    return <TripDetail tripId={selectedTripId} onBack={() => { setSelectedTripId(null); load() }} />
  }

  const grouped = {
    booked:    trips.filter(t => t.status === 'booked'),
    planning:  trips.filter(t => t.status === 'planning'),
    completed: trips.filter(t => t.status === 'completed'),
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {['', 'planning', 'booked', 'completed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
              }`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button className="btn-primary text-xs" style={{ '--btn-color': ORANGE }} onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> New Trip
        </button>
      </div>

      {/* Trip list */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : trips.length === 0 ? (
        <EmptyState icon={Plane} title="No trips yet"
          description="Plan your first adventure!"
          action={{ label: 'New Trip', onClick: () => setShowAdd(true) }} />
      ) : (
        <>
          {[['Booked', 'booked'], ['Planning', 'planning'], ['Completed', 'completed']].map(([label, key]) => {
            if (!grouped[key]?.length) return null
            return (
              <div key={key}>
                <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">{label}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {grouped[key].map(trip => (
                    <TripCard key={trip.id} trip={trip}
                      onEdit={t => setEditTrip(t)}
                      onDelete={id => setDeleteId(id)}
                      onSelect={t => setSelectedTripId(t.id)} />
                  ))}
                </div>
              </div>
            )
          })}
          <CostComparisonChart />
        </>
      )}

      {showAdd && (
        <Modal title="New Trip" onClose={() => setShowAdd(false)}>
          <TripForm onSave={save} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {editTrip && (
        <Modal title="Edit Trip" onClose={() => setEditTrip(null)}>
          <TripForm initial={editTrip} onSave={save} onClose={() => setEditTrip(null)} />
        </Modal>
      )}
      {deleteId && (
        <ConfirmModal title="Delete Trip" message="Delete this trip and all its data?"
          onConfirm={del} onClose={() => setDeleteId(null)} />
      )}
    </div>
  )
}
