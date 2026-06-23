import { useEffect, useState } from 'react'
import axios from 'axios'
import { AlertTriangle } from 'lucide-react'

const barColor = (completeness) => {
  if (completeness >= 70) return 'bg-emerald-500'
  if (completeness >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

const badgeColor = (completeness) => {
  if (completeness >= 50) return 'border-amber-500/40 bg-amber-500/10 text-amber-300'
  return 'border-red-500/40 bg-red-500/10 text-red-300'
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div key={index} className="card animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-gray-800" />
            <div className="h-4 w-12 rounded bg-gray-800" />
          </div>
          <div className="h-3 rounded-full bg-gray-800" />
          <div className="h-3 w-24 rounded bg-gray-800" />
        </div>
      ))}
    </div>
  )
}

function QualityRow({ item }) {
  const completeness = Number(item.completeness || 0)
  const width = `${Math.max(0, Math.min(completeness, 100))}%`

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-100">{item.module}</div>
          <div className="mt-1 text-xs text-gray-500">{item.days_logged} / 30 days</div>
        </div>
        <div className="flex items-center gap-2">
          {item.warning && (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${badgeColor(completeness)}`}>
              <AlertTriangle className="h-3 w-3" />
              Needs attention
            </span>
          )}
          <span className="min-w-12 text-right text-sm font-semibold text-gray-100">
            {Math.round(completeness)}%
          </span>
        </div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-800">
        <div className={`h-full rounded-full ${barColor(completeness)}`} style={{ width }} />
      </div>
    </div>
  )
}

export default function DataQuality() {
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setFailed(false)
      try {
        const res = await axios.get('/api/insights/data-quality')
        if (mounted) setMetrics(res.data || [])
      } catch {
        if (mounted) setFailed(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <SkeletonRows />

  if (failed) {
    return (
      <div className="card py-12 text-center text-sm text-gray-400">
        Could not load data quality metrics.
      </div>
    )
  }

  const healthyCount = metrics.filter(item => Number(item.completeness || 0) >= 70).length

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-400">Rolling 30-day module completeness</div>
        <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          {healthyCount} of {metrics.length} modules healthy
        </div>
      </div>
      <div className="space-y-3">
        {metrics.map(item => <QualityRow key={item.module} item={item} />)}
      </div>
    </div>
  )
}
