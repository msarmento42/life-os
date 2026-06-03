import { useState, useEffect } from 'react'
import axios from 'axios'
import { Bell, Cake, Users, AlertTriangle, CheckCircle, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { SkeletonCard } from '../../components/Skeleton'

const STRENGTH_COLOR = (s) => {
  if (s >= 80) return 'text-emerald-400'
  if (s >= 50) return 'text-amber-400'
  return 'text-red-400'
}

export default function CRMDashboard() {
  const [data, setData] = useState(null)
  const [reminders, setReminders] = useState([])
  const [energyData, setEnergyData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [dashRes, remRes, energyRes] = await Promise.all([
        axios.get('/api/crm/dashboard'),
        axios.get('/api/crm/reminders'),
        axios.get('/api/crm/energy-analysis').catch(() => ({ data: null })),
      ])
      setData(dashRes.data)
      setReminders(remRes.data)
      setEnergyData(energyRes.data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const completeReminder = async (id) => {
    try {
      await axios.put(`/api/crm/reminders/${id}/complete`)
      toast.success('Reminder completed')
      load()
    } catch {
      toast.error('Failed to complete reminder')
    }
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card border-l-4 border-blue-500">
          <div className="stat-label">Total Contacts</div>
          <div className="stat-value text-blue-400">{data.total_contacts}</div>
        </div>
        <div className="stat-card border-l-4 border-pink-500">
          <div className="stat-label">Birthdays (30d)</div>
          <div className="stat-value text-pink-400">{data.upcoming_birthdays.length}</div>
        </div>
        <div className="stat-card border-l-4 border-amber-500">
          <div className="stat-label">Neglected</div>
          <div className="stat-value text-amber-400">{data.neglected_contacts.length}</div>
        </div>
        <div className="stat-card border-l-4 border-red-500">
          <div className="stat-label">Overdue Reminders</div>
          <div className="stat-value text-red-400">{data.overdue_reminders}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming birthdays */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Cake className="w-4 h-4 text-pink-400" />
            <div className="section-title">Upcoming Birthdays</div>
          </div>
          {data.upcoming_birthdays.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-8">No birthdays in the next 30 days 🎂</div>
          )}
          <div className="space-y-2">
            {data.upcoming_birthdays.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 cursor-pointer transition-colors"
                onClick={() => navigate('/crm/contacts')}>
                <div>
                  <div className="text-sm font-medium text-gray-200">{b.name}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(b.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div className={`text-sm font-medium ${b.days_until === 0 ? 'text-pink-400' : 'text-gray-400'}`}>
                  {b.days_until === 0 ? '🎉 Today!' : `${b.days_until}d`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up reminders */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-amber-400" />
            <div className="section-title">Reminders</div>
          </div>
          {reminders.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-8">No pending reminders ✓</div>
          )}
          <div className="space-y-2">
            {reminders.slice(0, 6).map(r => (
              <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${r.is_overdue ? 'bg-red-900/20 border border-red-800/40' : 'bg-gray-800/50 hover:bg-gray-800'}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-200">{r.contact_name}</div>
                  {r.note && <div className="text-xs text-gray-500 truncate">{r.note}</div>}
                  <div className={`text-xs mt-0.5 ${r.is_overdue ? 'text-red-400' : 'text-gray-500'}`}>
                    {r.is_overdue ? `${Math.abs(r.days_until)}d overdue` : `Due ${r.days_until === 0 ? 'today' : `in ${r.days_until}d`}`}
                  </div>
                </div>
                <button className="btn-ghost p-1.5 text-emerald-400 ml-2" title="Mark complete" onClick={() => completeReminder(r.id)}>
                  <CheckCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Neglected contacts */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <div className="section-title">People to Reconnect With</div>
        </div>
        {data.neglected_contacts.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-8">You're on top of all your relationships 💪</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {data.neglected_contacts.slice(0, 8).map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 cursor-pointer transition-colors"
              onClick={() => navigate('/crm/contacts')}>
              <div>
                <div className="text-sm font-medium text-gray-200">{c.name}</div>
                <div className="text-xs text-gray-500 capitalize">{c.relationship_type}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${c.days_since === null ? 'text-red-400' : c.overdue_by > 30 ? 'text-red-400' : 'text-amber-400'}`}>
                  {c.days_since === null ? 'Never' : `${c.days_since}d ago`}
                </div>
                <div className="text-[10px] text-gray-600">{c.overdue_by === 999 ? '—' : `${c.overdue_by}d overdue`}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-energy contacts insight card (C2.01) */}
      {energyData && energyData.energizers && energyData.energizers.length > 0 && (
        <div className="card border-l-4 border-emerald-500">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-emerald-400" />
            <div className="section-title">High-Energy Contacts</div>
            <span className="ml-auto text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors" onClick={() => navigate('/crm/energy')}>
              View all →
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {energyData.energizers.slice(0, 4).map(c => (
              <div key={c.contact_id} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-900/10 border border-emerald-800/30 hover:bg-emerald-900/20 cursor-pointer transition-colors"
                onClick={() => navigate('/crm/contacts')}>
                <div className="w-8 h-8 rounded-full bg-emerald-900/40 flex items-center justify-center text-emerald-400 text-sm font-bold shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-200 truncate">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.interaction_count} interactions</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-emerald-400">{c.avg_quality}/10</div>
                  <div className="text-[10px] text-gray-600">avg quality</div>
                </div>
              </div>
            ))}
          </div>
          {energyData.drainers && energyData.drainers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
              <span>{energyData.energizers.length} energizers · {energyData.drainers.length} drainers · {energyData.neutral.length} neutral</span>
              <button className="text-indigo-400 hover:text-indigo-300 transition-colors" onClick={() => navigate('/crm/energy')}>Full analysis</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
