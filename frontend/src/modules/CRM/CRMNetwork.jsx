import { useState, useEffect } from 'react'
import axios from 'axios'
import { Circle, TrendingUp, Minus, ArrowDown } from 'lucide-react'
import { SkeletonCard } from '../../components/Skeleton'

const TIERS = [
  {
    key: 'inner',
    label: 'Inner Circle',
    desc: '≥4 interactions or avg quality ≥8 in last 90 days',
    dotColor: '#6366f1',
    border: 'border-indigo-500/40',
    bg: 'bg-indigo-900/10',
    countColor: 'text-indigo-400',
  },
  {
    key: 'middle',
    label: 'Middle Ring',
    desc: '1–3 interactions with avg quality ≥4',
    dotColor: '#8b5cf6',
    border: 'border-purple-500/30',
    bg: 'bg-purple-900/10',
    countColor: 'text-purple-400',
  },
  {
    key: 'outer',
    label: 'Outer Ring',
    desc: 'Occasional or low-quality contact',
    dotColor: '#6b7280',
    border: 'border-gray-700',
    bg: 'bg-gray-900/30',
    countColor: 'text-gray-500',
  },
]

function QualityDots({ score }) {
  // 1-10 → 5 dots filled proportionally
  const filled = Math.round((score / 10) * 5)
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i < filled ? 'bg-indigo-400' : 'bg-gray-700'}`}
        />
      ))}
    </div>
  )
}

function ContactTile({ contact }) {
  const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-200 truncate">{contact.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{contact.interaction_count} interactions</span>
          {contact.avg_quality != null && (
            <QualityDots score={contact.avg_quality} />
          )}
        </div>
      </div>
      {contact.avg_quality != null && (
        <div className="text-xs text-gray-500 shrink-0">{contact.avg_quality.toFixed(1)}</div>
      )}
    </div>
  )
}

export default function CRMNetwork() {
  const [network, setNetwork] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/crm/network')
      .then(res => setNetwork(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!network) return null

  const totalContacts = TIERS.reduce((sum, t) => sum + (network[t.key]?.length || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Contacts clustered by interaction frequency and quality over the last 90 days.
        </div>
        <div className="text-xs text-gray-600">{totalContacts} contacts mapped</div>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        {TIERS.map(tier => (
          <div key={tier.key} className="flex items-center gap-1.5">
            <Circle className="w-2.5 h-2.5" style={{ color: tier.dotColor, fill: tier.dotColor }} />
            <span className="text-xs text-gray-400">{tier.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {TIERS.map(tier => {
          const contacts = network[tier.key] || []
          return (
            <div key={tier.key} className={`rounded-xl border p-4 ${tier.border} ${tier.bg}`}>
              {/* Tier header */}
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Circle
                    className="w-3 h-3 shrink-0"
                    style={{ color: tier.dotColor, fill: tier.dotColor }}
                  />
                  <div className="font-semibold text-gray-200 text-sm">{tier.label}</div>
                </div>
                <span className={`text-sm font-bold ${tier.countColor}`}>{contacts.length}</span>
              </div>
              <div className="text-xs text-gray-500 mb-4 pl-5">{tier.desc}</div>

              {contacts.length === 0 ? (
                <div className="text-xs text-gray-600 text-center py-6">
                  No contacts in this tier yet
                </div>
              ) : (
                <div className="space-y-1.5">
                  {contacts.map(c => (
                    <ContactTile key={c.contact_id} contact={c} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="text-xs text-gray-600 pt-2">
        Inner circle requires ≥4 interactions OR avg quality ≥8. Middle ring: 1–3 interactions with avg quality ≥4. Log interactions to keep your network map accurate.
      </div>
    </div>
  )
}
