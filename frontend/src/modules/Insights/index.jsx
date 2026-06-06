import { useEffect, useState } from 'react'
import axios from 'axios'
import { Brain, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'

const strength = (value) => {
  const abs = Math.abs(Number(value || 0))
  if (abs >= 0.7) return 'Strong'
  if (abs >= 0.4) return 'Moderate'
  return 'Weak'
}

const formatCoefficient = (value) => Number(value || 0).toFixed(2)

function CorrelationCard({ correlation }) {
  const coefficient = Number(correlation.coefficient || 0)
  const positive = coefficient >= 0
  const pct = Math.min(100, Math.abs(coefficient) * 100)
  const Icon = positive ? TrendingUp : TrendingDown

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-100">{correlation.label}</div>
          <div className="text-xs text-gray-600 mt-1">{correlation.entity_a} / {correlation.entity_b}</div>
        </div>
        <div className={`rounded-lg p-2 ${positive ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
          <Icon className={`w-4 h-4 ${positive ? 'text-emerald-400' : 'text-red-400'}`} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>-1</span>
          <span>0</span>
          <span>+1</span>
        </div>
        <div className="relative h-3 rounded-full bg-gray-800 overflow-hidden">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600" />
          <div
            className={`absolute top-0 bottom-0 ${positive ? 'left-1/2 bg-emerald-500' : 'right-1/2 bg-red-500'}`}
            style={{ width: `${pct / 2}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className={`text-xl font-bold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCoefficient(coefficient)}
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Coefficient</div>
        </div>
        <div>
          <div className="text-xl font-bold text-gray-100">{correlation.sample_size}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Samples</div>
        </div>
        <div>
          <div className="text-xl font-bold text-gray-100">{strength(coefficient)}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Strength</div>
        </div>
      </div>
    </div>
  )
}

export default function Insights() {
  const [correlations, setCorrelations] = useState([])
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/insights/correlations')
      setCorrelations(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const recompute = async () => {
    setComputing(true)
    try {
      const res = await axios.post('/api/insights/compute')
      setCorrelations(res.data || [])
      toast.success('Insights recomputed')
    } catch {
      toast.error('Failed to recompute insights')
    } finally {
      setComputing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-800 px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-fuchsia-500" />
            <h1 className="page-title">Insights</h1>
          </div>
          <button className="btn-primary text-xs" onClick={recompute} disabled={computing}>
            <RefreshCw className={`w-3.5 h-3.5 ${computing ? 'animate-spin' : ''}`} />
            {computing ? 'Recomputing' : 'Recompute'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="page space-y-5">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-44 animate-pulse" />)}
            </div>
          ) : correlations.length === 0 ? (
            <EmptyState
              icon={Brain}
              title="No correlations computed yet"
              description="Click Recompute to analyse your data."
              action={{ label: 'Recompute', onClick: recompute }}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up">
              {correlations.map(correlation => (
                <CorrelationCard key={`${correlation.entity_a}-${correlation.entity_b}`} correlation={correlation} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
