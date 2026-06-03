import { useState, useEffect } from 'react'
import axios from 'axios'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet'
import { Plus, Trash2 } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'

const STATUS_CONFIG = {
  visited: { color: '#22c55e', label: 'Visited', radius: 8 },
  planned: { color: '#f59e0b', label: 'Planned', radius: 7 },
  wishlist: { color: '#6366f1', label: 'Wishlist', radius: 6 },
}

function DestForm({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', country: '', city: '', latitude: '', longitude: '', status: 'visited', visited_year: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Place / Name</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Tokyo" />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="visited">Visited</option>
            <option value="planned">Planned</option>
            <option value="wishlist">Wishlist</option>
          </select>
        </div>
        <div>
          <label className="label">Country</label>
          <input className="input" value={form.country} onChange={e => set('country', e.target.value)} placeholder="Japan" />
        </div>
        <div>
          <label className="label">City</label>
          <input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Tokyo" />
        </div>
        <div>
          <label className="label">Latitude</label>
          <input className="input" type="number" step="0.0001" value={form.latitude} onChange={e => set('latitude', e.target.value)} placeholder="35.6762" />
        </div>
        <div>
          <label className="label">Longitude</label>
          <input className="input" type="number" step="0.0001" value={form.longitude} onChange={e => set('longitude', e.target.value)} placeholder="139.6503" />
        </div>
        {form.status === 'visited' && (
          <div>
            <label className="label">Year Visited</label>
            <input className="input" type="number" value={form.visited_year} onChange={e => set('visited_year', e.target.value)} placeholder="2024" />
          </div>
        )}
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave({
          ...form,
          latitude: parseFloat(form.latitude) || null,
          longitude: parseFloat(form.longitude) || null,
          visited_year: form.visited_year ? parseInt(form.visited_year) : null,
        })}>Add Destination</button>
      </div>
    </div>
  )
}

export default function TravelMap() {
  const [destinations, setDestinations] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [filter, setFilter] = useState('all')
  const toast = useToast()

  const load = async () => {
    const res = await axios.get('/api/travel/destinations')
    setDestinations(res.data)
  }
  useEffect(() => { load() }, [])

  const save = async (form) => {
    try {
      await axios.post('/api/travel/destinations', form)
      toast.success('Destination added')
      setShowAdd(false)
      load()
    } catch {
      toast.error('Failed to add destination')
    }
  }

  const del = async () => {
    try {
      await axios.delete(`/api/travel/destinations/${deleteId}`)
      toast.success('Destination deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete destination')
    }
  }

  const filtered = filter === 'all' ? destinations : destinations.filter(d => d.status === filter)
  const pinnable = filtered.filter(d => d.latitude && d.longitude)

  const stats = {
    visited: destinations.filter(d => d.status === 'visited').length,
    planned: destinations.filter(d => d.status === 'planned').length,
    wishlist: destinations.filter(d => d.status === 'wishlist').length,
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card border-l-4 border-emerald-500">
          <div className="stat-label">Places Visited</div>
          <div className="stat-value text-emerald-400">{stats.visited}</div>
        </div>
        <div className="stat-card border-l-4 border-amber-500">
          <div className="stat-label">Planned</div>
          <div className="stat-value text-amber-400">{stats.planned}</div>
        </div>
        <div className="stat-card border-l-4 border-brand-500">
          <div className="stat-label">Wishlist</div>
          <div className="stat-value text-brand-400">{stats.wishlist}</div>
        </div>
        <div className="flex items-center justify-end">
          <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Destination
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[['all', 'All'], ['visited', '🟢 Visited'], ['planned', '🟡 Planned'], ['wishlist', '🔵 Wishlist']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`btn text-xs ${filter === v ? 'btn-primary' : 'btn-secondary'}`}>{l}</button>
        ))}
      </div>

      {/* Map */}
      <div className="card p-0 overflow-hidden" style={{ height: 420 }}>
        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}
          className="z-0">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {pinnable.map(dest => {
            const cfg = STATUS_CONFIG[dest.status] || STATUS_CONFIG.visited
            return (
              <CircleMarker
                key={dest.id}
                center={[dest.latitude, dest.longitude]}
                radius={cfg.radius}
                pathOptions={{ color: cfg.color, fillColor: cfg.color, fillOpacity: 0.8, weight: 2 }}
              >
                <Tooltip>{dest.name}, {dest.country}</Tooltip>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{dest.name}</div>
                    <div className="text-gray-500">{dest.country}</div>
                    <div style={{ color: cfg.color }}>{cfg.label}</div>
                    {dest.visited_year && <div className="text-gray-500">Visited: {dest.visited_year}</div>}
                    {dest.notes && <div className="text-gray-400 mt-1">{dest.notes}</div>}
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex gap-6">
        {Object.entries(STATUS_CONFIG).map(([key, { color, label }]) => (
          <div key={key} className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-3 h-3 rounded-full" style={{ background: color }}></div>
            {label}
          </div>
        ))}
      </div>

      {/* Destination list */}
      <div className="card">
        <div className="section-title mb-4">Destinations</div>
        <div className="divide-y divide-gray-800">
          {filtered.map(d => (
            <div key={d.id} className="flex items-center justify-between py-3 group">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_CONFIG[d.status]?.color || '#6b7280' }}></div>
                <div>
                  <div className="text-sm text-gray-200">{d.name}</div>
                  <div className="text-xs text-gray-500">{d.country}{d.city ? `, ${d.city}` : ''}{d.visited_year ? ` · ${d.visited_year}` : ''}</div>
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400" onClick={() => setDeleteId(d.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {!filtered.length && <div className="text-gray-500 text-sm text-center py-8">No destinations in this category.</div>}
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Destination" onClose={() => setShowAdd(false)}>
          <DestForm onSave={save} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {deleteId && (
        <ConfirmModal title="Remove Destination" message="Remove this destination from the map?" onConfirm={del} onClose={() => setDeleteId(null)} />
      )}
    </div>
  )
}
