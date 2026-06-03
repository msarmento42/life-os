import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Search, Trash2, Pencil, MessageCircle, Phone, Coffee, Mail, Users, X, Download, UserPlus } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { SkeletonCard } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

const REL_COLORS = {
  friend: 'bg-blue-900/40 text-blue-400',
  family: 'bg-red-900/40 text-red-400',
  colleague: 'bg-emerald-900/40 text-emerald-400',
  mentor: 'bg-purple-900/40 text-purple-400',
  acquaintance: 'bg-gray-800 text-gray-400',
}
const INTERACTION_ICONS = { coffee: Coffee, call: Phone, email: Mail, message: MessageCircle, event: Users }

const TRAJ_CONFIG = {
  rising:    { label: '↑ Rising',    cls: 'bg-emerald-900/40 text-emerald-400' },
  stable:    { label: '→ Stable',    cls: 'bg-gray-800 text-gray-500' },
  declining: { label: '↓ Declining', cls: 'bg-red-900/40 text-red-400' },
  dormant:   { label: '💤 Dormant',  cls: 'bg-gray-900 text-gray-600' },
}

const ENERGY_CONFIG = {
  energizing: { label: '⚡ Energizing', cls: 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40' },
  neutral:    { label: '◎ Neutral',    cls: 'bg-gray-800/60 text-gray-400 border border-gray-700/40' },
  draining:   { label: '↓ Draining',   cls: 'bg-red-900/40 text-red-400 border border-red-800/40' },
}

function StrengthBar({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs" style={{ color }}>{score}%</span>
    </div>
  )
}

function ContactCard({ contact, trajectory, energyImpact, onClick }) {
  const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const traj = TRAJ_CONFIG[trajectory]
  const energy = energyImpact ? ENERGY_CONFIG[energyImpact] : null
  return (
    <div className="card hover:border-gray-600 cursor-pointer transition-colors group" onClick={onClick}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
          {contact.photo_url ? <img src={contact.photo_url} className="w-full h-full rounded-full object-cover" /> : initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-100 text-sm">{contact.name}</div>
          <div className="text-xs text-gray-500 truncate">{contact.job_title || contact.relationship_type} {contact.company ? `· ${contact.company}` : ''}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`badge text-[10px] capitalize ${REL_COLORS[contact.relationship_type] || REL_COLORS.acquaintance}`}>
            {contact.relationship_type}
          </span>
          {traj && (
            <span className={`badge text-[10px] font-medium ${traj.cls}`}>{traj.label}</span>
          )}
          {energy && (
            <span className={`badge text-[10px] font-medium ${energy.cls}`}>{energy.label}</span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-600">
          {contact.last_interaction_date
            ? `Last: ${new Date(contact.last_interaction_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : 'Never contacted'}
        </div>
        <StrengthBar score={contact.relationship_strength} />
      </div>
      {contact.birthday_in_days !== null && contact.birthday_in_days <= 14 && (
        <div className="mt-2 text-xs text-pink-400">🎂 Birthday in {contact.birthday_in_days}d</div>
      )}
    </div>
  )
}

function ContactForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: '', relationship_type: 'friend', company: '', job_title: '', location: '',
    birthday: '', email: '', phone: '', linkedin: '', notes: '', cadence_days: 30
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Alex Chen" />
        </div>
        <div>
          <label className="label">Relationship</label>
          <select className="input" value={form.relationship_type} onChange={e => set('relationship_type', e.target.value)}>
            {['friend', 'family', 'colleague', 'mentor', 'acquaintance'].map(r =>
              <option key={r} value={r} className="capitalize">{r}</option>
            )}
          </select>
        </div>
        <div>
          <label className="label">Company</label>
          <input className="input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Stripe" />
        </div>
        <div>
          <label className="label">Job Title</label>
          <input className="input" value={form.job_title} onChange={e => set('job_title', e.target.value)} placeholder="Engineer" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="alex@company.com" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 0000" />
        </div>
        <div>
          <label className="label">Birthday</label>
          <input className="input" type="date" value={form.birthday || ''} onChange={e => set('birthday', e.target.value)} />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="San Francisco, CA" />
        </div>
        <div>
          <label className="label">LinkedIn</label>
          <input className="input" value={form.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="linkedin.com/in/..." />
        </div>
        <div>
          <label className="label">Check-in Cadence (days)</label>
          <input className="input" type="number" min="1" value={form.cadence_days} onChange={e => set('cadence_days', parseInt(e.target.value))} placeholder="30" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="What do they care about? What did you last discuss?" />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave({
          ...form,
          birthday: form.birthday || null,
          cadence_days: parseInt(form.cadence_days) || 30,
        })}>
          {initial ? 'Update' : 'Add Contact'}
        </button>
      </div>
    </div>
  )
}

function ContactDetail({ contactId, onClose, onDeleted }) {
  const [contact, setContact] = useState(null)
  const [showLogInteraction, setShowLogInteraction] = useState(false)
  const [showAddReminder, setShowAddReminder] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [interForm, setInterForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'call', notes: '' })
  const [remForm, setRemForm] = useState({ due_date: '', note: '' })
  const toast = useToast()

  const load = async () => {
    const res = await axios.get(`/api/crm/contacts/${contactId}`)
    setContact(res.data)
  }
  useEffect(() => { load() }, [contactId])

  const logInteraction = async () => {
    try {
      await axios.post('/api/crm/interactions', { ...interForm, contact_id: contactId })
      toast.success('Interaction logged')
      setShowLogInteraction(false)
      load()
    } catch {
      toast.error('Failed to log interaction')
    }
  }

  const addReminder = async () => {
    try {
      await axios.post('/api/crm/reminders', { ...remForm, contact_id: contactId })
      toast.success('Reminder set')
      setShowAddReminder(false)
      setRemForm({ due_date: '', note: '' })
      load()
    } catch {
      toast.error('Failed to set reminder')
    }
  }

  const saveEdit = async (form) => {
    try {
      await axios.put(`/api/crm/contacts/${contactId}`, form)
      toast.success('Contact updated')
      setShowEdit(false)
      load()
    } catch {
      toast.error('Failed to update contact')
    }
  }

  const deleteContact = async () => {
    try {
      await axios.delete(`/api/crm/contacts/${contactId}`)
      toast.success('Contact deleted')
      onDeleted()
    } catch {
      toast.error('Failed to delete contact')
    }
  }

  if (!contact) return null

  const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const InterIcon = ({ type }) => {
    const Icon = INTERACTION_ICONS[type] || MessageCircle
    return <Icon className="w-3.5 h-3.5" />
  }

  return (
    <Modal title="Contact" onClose={onClose} size="lg">
      {showEdit && (
        <div className="mb-6">
          <ContactForm initial={contact} onSave={saveEdit} onClose={() => setShowEdit(false)} />
        </div>
      )}
      {!showEdit && (
        <>
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold text-gray-100">{contact.name}</div>
              <div className="text-gray-400 text-sm">{contact.job_title || ''} {contact.company ? `· ${contact.company}` : ''}</div>
              <div className="text-gray-500 text-sm">{contact.location}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`badge capitalize text-xs ${REL_COLORS[contact.relationship_type] || ''}`}>{contact.relationship_type}</span>
                <StrengthBar score={contact.relationship_strength} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs" onClick={() => setShowEdit(true)}><Pencil className="w-3.5 h-3.5" /></button>
              <button className="btn-danger text-xs" onClick={deleteContact}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-2 gap-2 mb-5 text-sm">
            {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-gray-400 hover:text-gray-200"><Mail className="w-3.5 h-3.5" />{contact.email}</a>}
            {contact.phone && <div className="flex items-center gap-2 text-gray-400"><Phone className="w-3.5 h-3.5" />{contact.phone}</div>}
            {contact.birthday && <div className="text-gray-400">🎂 {new Date(contact.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>}
            {contact.last_interaction_date && <div className="text-gray-400">Last contact: {new Date(contact.last_interaction_date + 'T00:00:00').toLocaleDateString()}</div>}
          </div>

          {contact.notes && (
            <div className="mb-5 p-3 bg-gray-800/50 rounded-lg text-sm text-gray-300 italic">
              {contact.notes}
            </div>
          )}

          {/* Interactions */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-300">Interaction Log</div>
              <button className="btn-secondary text-xs" onClick={() => setShowLogInteraction(!showLogInteraction)}>
                <Plus className="w-3.5 h-3.5" /> Log
              </button>
            </div>

            {showLogInteraction && (
              <div className="card-sm mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Date</label>
                    <input className="input text-sm" type="date" value={interForm.date} onChange={e => setInterForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Type</label>
                    <select className="input text-sm" value={interForm.type} onChange={e => setInterForm(f => ({ ...f, type: e.target.value }))}>
                      {['call', 'coffee', 'email', 'message', 'event', 'other'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea className="input text-sm" rows={2} value={interForm.notes} onChange={e => setInterForm(f => ({ ...f, notes: e.target.value }))} placeholder="What did you discuss?" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button className="btn-secondary text-xs" onClick={() => setShowLogInteraction(false)}>Cancel</button>
                  <button className="btn-primary text-xs" onClick={logInteraction}>Save</button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {(contact.interactions || []).map(i => (
                <div key={i.id} className="flex gap-3 p-2.5 rounded-lg bg-gray-800/40">
                  <div className="mt-0.5 text-gray-500"><InterIcon type={i.type} /></div>
                  <div>
                    <div className="text-xs text-gray-500 capitalize">{i.type} · {new Date(i.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    {i.notes && <div className="text-sm text-gray-300 mt-0.5">{i.notes}</div>}
                  </div>
                </div>
              ))}
              {!contact.interactions?.length && <div className="text-gray-600 text-sm text-center py-4">No interactions logged yet.</div>}
            </div>
          </div>

          {/* Reminders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-300">Reminders</div>
              <button className="btn-secondary text-xs" onClick={() => setShowAddReminder(!showAddReminder)}>
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {showAddReminder && (
              <div className="card-sm mb-3 space-y-3">
                <div>
                  <label className="label">Due Date</label>
                  <input className="input text-sm" type="date" value={remForm.due_date} onChange={e => setRemForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Note</label>
                  <input className="input text-sm" value={remForm.note} onChange={e => setRemForm(f => ({ ...f, note: e.target.value }))} placeholder="Schedule a call..." />
                </div>
                <div className="flex gap-2 justify-end">
                  <button className="btn-secondary text-xs" onClick={() => setShowAddReminder(false)}>Cancel</button>
                  <button className="btn-primary text-xs" onClick={addReminder}>Save</button>
                </div>
              </div>
            )}
            {(contact.reminders || []).map(r => (
              <div key={r.id} className={`flex items-center justify-between p-2.5 rounded-lg mb-2 ${r.is_overdue ? 'bg-red-900/20' : 'bg-gray-800/40'}`}>
                <div>
                  <div className="text-xs text-gray-400">{r.note}</div>
                  <div className="text-xs text-gray-500">{new Date(r.due_date + 'T00:00:00').toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [trajectoryMap, setTrajectoryMap] = useState({})
  const [energyMap, setEnergyMap] = useState({})
  const [search, setSearch] = useState('')
  const [relFilter, setRelFilter] = useState('')
  const [energyFilter, setEnergyFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (relFilter) params.relationship_type = relFilter
      const [res, tRes, eRes] = await Promise.all([
        axios.get('/api/crm/contacts', { params }),
        axios.get('/api/crm/trajectory'),
        axios.get('/api/crm/energy-analysis'),
      ])
      setContacts(res.data)
      const tmap = {}
      tRes.data.forEach(t => { tmap[t.contact_id] = t.trajectory })
      setTrajectoryMap(tmap)
      // Build energy impact map: contact_id → 'energizing' | 'neutral' | 'draining'
      const emap = {}
      ;(eRes.data.energizers || []).forEach(c => { emap[c.contact_id] = 'energizing' })
      ;(eRes.data.neutral    || []).forEach(c => { emap[c.contact_id] = 'neutral' })
      ;(eRes.data.drainers   || []).forEach(c => { emap[c.contact_id] = 'draining' })
      setEnergyMap(emap)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, relFilter])

  const toast = useToast()

  const save = async (form) => {
    try {
      await axios.post('/api/crm/contacts', form)
      toast.success('Contact added')
      setShowAdd(false)
      load()
    } catch {
      toast.error('Failed to add contact')
    }
  }

  const exportCsv = () => window.open('/api/crm/contacts/export')

  // Apply energy filter client-side
  const visibleContacts = energyFilter
    ? contacts.filter(c => energyMap[c.id] === energyFilter)
    : contacts

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input pl-9"
            data-search
            placeholder="Search contacts... (⌘K)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300" onClick={() => setSearch('')}><X className="w-4 h-4" /></button>}
        </div>
        <select className="input w-40 text-sm" value={relFilter} onChange={e => setRelFilter(e.target.value)}>
          <option value="">All Types</option>
          {['friend', 'family', 'colleague', 'mentor', 'acquaintance'].map(r => (
            <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
        <select className="input w-40 text-sm" value={energyFilter} onChange={e => setEnergyFilter(e.target.value)}>
          <option value="">All Energy</option>
          <option value="energizing">⚡ Energizing</option>
          <option value="neutral">◎ Neutral</option>
          <option value="draining">↓ Draining</option>
        </select>
        <button className="btn-secondary text-xs" onClick={exportCsv}><Download className="w-3.5 h-3.5" /></button>
        <button className="btn-primary text-xs" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" /> Add Contact</button>
      </div>

      {!loading && <div className="text-xs text-gray-500">{visibleContacts.length} contacts</div>}

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : visibleContacts.length === 0 ? (
        search || energyFilter ? (
          <EmptyState
            icon={Search}
            title={`No contacts matching your filters`}
            description="Try a different search term or clear the filters."
            action={{ label: 'Clear filters', onClick: () => { setSearch(''); setEnergyFilter('') } }}
          />
        ) : (
          <EmptyState
            icon={UserPlus}
            title="No contacts yet"
            description="Build your network by adding people you want to stay in touch with."
            action={{ label: '+ Add Contact', onClick: () => setShowAdd(true) }}
          />
        )
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {visibleContacts.map(c => (
            <ContactCard key={c.id} contact={c} trajectory={trajectoryMap[c.id]} energyImpact={energyMap[c.id]} onClick={() => setSelectedId(c.id)} />
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Contact" onClose={() => setShowAdd(false)} size="lg">
          <ContactForm onSave={save} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {selectedId && (
        <ContactDetail
          contactId={selectedId}
          onClose={() => setSelectedId(null)}
          onDeleted={() => { setSelectedId(null); load() }}
        />
      )}
    </div>
  )
}
