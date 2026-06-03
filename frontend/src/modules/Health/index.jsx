import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts'
import { Plus, Trash2, Activity, Moon, Dumbbell, Pill, FlaskConical, Droplets, Utensils, Stethoscope, Heart, AlertTriangle, TrendingUp } from 'lucide-react'
import Modal, { ConfirmModal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { SkeletonStat, SkeletonCard, SkeletonRow } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import Nutrition from './Nutrition'
import MedicalTimeline from './MedicalTimeline'
import Injuries from './Injuries'
import Progression from './Progression'


// Custom tooltip for weight chart
function HealthWeightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-sm font-semibold text-red-400">{payload[0].value} lbs</p>
    </div>
  )
}

// Custom tooltip for sleep chart
function HealthSleepTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-sm font-semibold text-purple-400">{payload[0].value} hours</p>
    </div>
  )
}

const WORKOUT_TYPES = ['strength', 'cardio', 'yoga', 'sport', 'other']
const QUALITY_LABELS = ['', 'Terrible', 'Poor', 'OK', 'Good', 'Great']

export default function Health() {
  const [dash, setDash] = useState(null)
  const [tab, setTab] = useState('overview')
  const [metrics, setMetrics] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [sleep, setSleep] = useState([])
  const [supplements, setSupplements] = useState([])
  const [bloodWork, setBloodWork] = useState([])
  const [recovery, setRecovery] = useState(null)
  const [effectiveness, setEffectiveness] = useState([])
  const [showModal, setShowModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [dashR, metricsR, workoutsR, sleepR, suppsR, bloodR, recoveryR, effectR] = await Promise.all([
        axios.get('/api/health/dashboard'),
        axios.get('/api/health/body-metrics'),
        axios.get('/api/health/workouts'),
        axios.get('/api/health/sleep'),
        axios.get('/api/health/supplements'),
        axios.get('/api/health/blood-work'),
        axios.get('/api/health/recovery?days=30'),
        axios.get('/api/health/supplements/effectiveness'),
      ])
      setDash(dashR.data)
      setMetrics(metricsR.data)
      setWorkouts(workoutsR.data)
      setSleep(sleepR.data)
      setSupplements(suppsR.data)
      setBloodWork(bloodR.data)
      setRecovery(recoveryR.data)
      setEffectiveness(effectR.data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'body', label: 'Body', icon: Activity },
    { id: 'recovery', label: 'Recovery', icon: Heart },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'sleep', label: 'Sleep', icon: Moon },
    { id: 'nutrition', label: 'Nutrition', icon: Utensils },
    { id: 'medical', label: 'Medical', icon: Stethoscope },
    { id: 'supplements', label: 'Supplements', icon: Pill },
    { id: 'blood', label: 'Blood Work', icon: FlaskConical },
    { id: 'injuries', label: 'Injuries', icon: AlertTriangle },
    { id: 'progression', label: 'Progression', icon: TrendingUp },
  ]

  const weightTrend = (dash?.weight_trend || []).map(d => ({
    date: d.date.slice(5), weight: d.weight
  })).reverse()

  const sleepChartData = [...sleep].reverse().slice(0, 30).map(s => ({
    date: s.date?.slice(5), hours: s.hours, quality: s.quality
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 pt-6 pb-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-6 rounded-full bg-red-500"></div>
          <h1 className="text-xl font-bold text-gray-100">Health & Body</h1>
        </div>
        <nav className="tabs overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`tab flex items-center gap-1.5 whitespace-nowrap ${tab === id ? 'tab-active text-red-400' : ''}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </nav>
      </div>

      {/* key={tab} re-mounts on tab switch → triggers tab-panel fade-in-up */}
      <div key={tab} className="flex-1 overflow-y-auto p-6 space-y-5 tab-panel">

        {/* Loading skeletons */}
        {loading && tab === 'overview' && (
          <>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <SkeletonStat key={i} />)}
            </div>
            <SkeletonCard />
            <div className="grid grid-cols-2 gap-4">
              <SkeletonCard /> <SkeletonCard />
            </div>
          </>
        )}
        {loading && tab === 'recovery' && (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <SkeletonStat key={i} />)}
            </div>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
        {loading && (tab === 'body' || tab === 'sleep' || tab === 'blood') && (
          <div className="card p-4 space-y-3">
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} cols={5} />)}
          </div>
        )}
        {loading && tab === 'workouts' && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}
        {loading && (tab === 'nutrition' || tab === 'medical') && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}
        {loading && tab === 'progression' && (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
        {loading && tab === 'supplements' && (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Overview */}
        {tab === 'overview' && !loading && dash && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <div className="stat-card border-l-4 border-red-500">
                <div className="stat-label">Current Weight</div>
                <div className="stat-value">{dash.latest_weight ? `${dash.latest_weight} lbs` : '—'}</div>
              </div>
              <div className="stat-card border-l-4 border-orange-500">
                <div className="stat-label">Body Fat</div>
                <div className="stat-value">{dash.latest_body_fat ? `${dash.latest_body_fat}%` : '—'}</div>
              </div>
              <div className="stat-card border-l-4 border-blue-500">
                <div className="stat-label">Workouts / Week</div>
                <div className="stat-value">{dash.workouts_this_week}</div>
              </div>
              <div className="stat-card border-l-4 border-purple-500">
                <div className="stat-label">Avg Sleep</div>
                <div className="stat-value">{dash.avg_sleep_hours ? `${dash.avg_sleep_hours}h` : '—'}</div>
              </div>
            </div>

            {weightTrend.length > 0 && (
              <div className="card">
                <div className="section-title mb-4">Weight Trend (30 days)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weightTrend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis domain={["auto", "auto"]} tick={{ fill: "#6b7280", fontSize: 11 }} unit=" lbs" axisLine={false} width={35} />
                    <Tooltip content={<HealthWeightTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "#6b7280" }} />
                    <Line type="monotone" dataKey="weight" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: "#ef4444", r: 3 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={800} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              <div className="stat-card border-l-4 border-emerald-500">
                <div className="stat-label">Latest HRV</div>
                <div className="stat-value">{dash.latest_hrv ? `${dash.latest_hrv} ms` : '—'}</div>
              </div>
              <div className="stat-card border-l-4 border-pink-500">
                <div className="stat-label">Resting HR</div>
                <div className="stat-value">{dash.latest_resting_hr ? `${dash.latest_resting_hr} bpm` : '—'}</div>
              </div>
              <div className="stat-card border-l-4 border-purple-500">
                <div className="stat-label">Sleep Quality</div>
                <div className="stat-value">{dash.avg_sleep_quality ? `${dash.avg_sleep_quality}/5` : '—'}</div>
              </div>
              <div className="stat-card border-l-4 border-yellow-500">
                <div className="stat-label">Active Supplements</div>
                <div className="stat-value">{dash.active_supplements}</div>
              </div>
            </div>
          </>
        )}

        {/* Body Metrics */}
        {tab === 'body' && !loading && (
          <>
            <div className="flex justify-end">
              <button className="btn-primary text-xs" onClick={() => setShowModal('metric')}>
                <Plus className="w-3.5 h-3.5" /> Log Metric
              </button>
            </div>
            {metrics.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No body metrics logged yet"
                description="Track your weight, body fat, and other measurements to see trends over time."
                action={{ label: '+ Log Metric', onClick: () => setShowModal('metric') }}
              />
            ) : (
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-800">
                    <th className="table-header text-left px-4 py-3">Date</th>
                    <th className="table-header text-right px-4 py-3">Weight</th>
                    <th className="table-header text-right px-4 py-3">Body Fat</th>
                    <th className="table-header text-right px-4 py-3">Waist</th>
                    <th className="table-header text-right px-4 py-3">Resting HR</th>
                    <th className="table-header text-right px-4 py-3">HRV</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr></thead>
                  <tbody>
                    {metrics.map(m => (
                      <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 group">
                        <td className="px-4 py-3 text-gray-400 text-xs">{m.date}</td>
                        <td className="px-4 py-3 text-right text-gray-200">{m.weight_lbs ? `${m.weight_lbs} lbs` : '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-200">{m.body_fat_pct ? `${m.body_fat_pct}%` : '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-200">{m.waist_in ? `${m.waist_in}"` : '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-200">{m.resting_hr ? `${m.resting_hr} bpm` : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {m.hrv
                            ? <span className={`font-medium ${m.hrv >= 70 ? 'text-emerald-400' : m.hrv >= 55 ? 'text-yellow-400' : 'text-red-400'}`}>{m.hrv} ms</span>
                            : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400"
                            onClick={() => setDeleteTarget({ type: 'metric', id: m.id })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Recovery */}
        {tab === 'recovery' && !loading && (
          <>
            <div className="flex justify-end">
              <button className="btn-primary text-xs" onClick={() => setShowModal('metric')}>
                <Plus className="w-3.5 h-3.5" /> Log Recovery
              </button>
            </div>

            {!recovery || recovery.logged_days === 0 ? (
              <EmptyState
                icon={Heart}
                title="No recovery data yet"
                description="Log HRV and resting HR from your wearable to track recovery trends alongside sleep quality."
                action={{ label: '+ Log Recovery', onClick: () => setShowModal('metric') }}
              />
            ) : (
              <>
                {/* Recovery stat cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="stat-card border-l-4 border-emerald-500">
                    <div className="stat-label">Avg HRV (30d)</div>
                    <div className="stat-value">{recovery.avg_hrv ? `${recovery.avg_hrv} ms` : '—'}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {recovery.latest_hrv ? `Latest: ${recovery.latest_hrv} ms` : 'No recent data'}
                    </div>
                  </div>
                  <div className="stat-card border-l-4 border-pink-500">
                    <div className="stat-label">Avg Resting HR (30d)</div>
                    <div className="stat-value">{recovery.avg_resting_hr ? `${recovery.avg_resting_hr} bpm` : '—'}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {recovery.latest_resting_hr ? `Latest: ${recovery.latest_resting_hr} bpm` : 'No recent data'}
                    </div>
                  </div>
                  <div className="stat-card border-l-4 border-purple-500">
                    <div className="stat-label">Avg Sleep Quality (30d)</div>
                    <div className="stat-value">{recovery.avg_sleep_quality ? `${recovery.avg_sleep_quality}/5` : '—'}</div>
                    <div className="text-xs text-gray-500 mt-1">{recovery.logged_days} days logged</div>
                  </div>
                </div>

                {/* HRV trend chart */}
                {recovery.days.some(d => d.hrv !== null) && (
                  <div className="card">
                    <div className="section-title mb-1">HRV Trend (30 days)</div>
                    <div className="text-xs text-gray-500 mb-4">Heart Rate Variability in ms — higher is generally better recovery</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={recovery.days} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} interval={4} />
                        <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b7280', fontSize: 10 }} unit=" ms" axisLine={false} width={42} />
                        <Tooltip
                          contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                          formatter={(v, name) => [v !== null ? `${v} ms` : '—', 'HRV']}
                        />
                        <Line
                          type="monotone"
                          dataKey="hrv"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ fill: '#10b981', r: 3 }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                          isAnimationActive={true}
                          animationDuration={800}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Combined resting HR + sleep quality chart */}
                <div className="card">
                  <div className="section-title mb-1">Resting HR &amp; Sleep Quality (30 days)</div>
                  <div className="text-xs text-gray-500 mb-4">Compare cardiovascular recovery with sleep quality each night</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={recovery.days} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} interval={4} />
                      <YAxis yAxisId="hr" orientation="left" domain={['auto', 'auto']} tick={{ fill: '#6b7280', fontSize: 10 }} unit=" bpm" axisLine={false} width={46} />
                      <YAxis yAxisId="sq" orientation="right" domain={[0, 5]} tick={{ fill: '#6b7280', fontSize: 10 }} tickCount={6} axisLine={false} width={28} />
                      <Tooltip
                        contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                        formatter={(v, name) => {
                          if (name === 'resting_hr') return [v !== null ? `${v} bpm` : '—', 'Resting HR']
                          if (name === 'sleep_quality') return [v !== null ? `${v}/5` : '—', 'Sleep Quality']
                          return [v, name]
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v) => v === 'resting_hr' ? 'Resting HR' : 'Sleep Quality'} />
                      <Line
                        yAxisId="hr"
                        type="monotone"
                        dataKey="resting_hr"
                        stroke="#f472b6"
                        strokeWidth={2}
                        dot={{ fill: '#f472b6', r: 2 }}
                        activeDot={{ r: 4 }}
                        connectNulls={false}
                        isAnimationActive={true}
                        animationDuration={800}
                      />
                      <Line
                        yAxisId="sq"
                        type="monotone"
                        dataKey="sleep_quality"
                        stroke="#a78bfa"
                        strokeWidth={2}
                        dot={{ fill: '#a78bfa', r: 2 }}
                        activeDot={{ r: 4 }}
                        strokeDasharray="4 3"
                        connectNulls={false}
                        isAnimationActive={true}
                        animationDuration={1000}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Recovery status guide */}
                <div className="card">
                  <div className="section-title mb-3">HRV Status Guide</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-lg px-3 py-2.5">
                      <div className="text-xs font-semibold text-emerald-400 mb-1">🟢 Well Recovered</div>
                      <div className="text-xs text-gray-400">HRV ≥ 70 ms — Train at full intensity. Body is primed.</div>
                    </div>
                    <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg px-3 py-2.5">
                      <div className="text-xs font-semibold text-yellow-400 mb-1">🟡 Moderate</div>
                      <div className="text-xs text-gray-400">HRV 55–69 ms — Normal training. Monitor effort level.</div>
                    </div>
                    <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2.5">
                      <div className="text-xs font-semibold text-red-400 mb-1">🔴 Under-recovered</div>
                      <div className="text-xs text-gray-400">HRV &lt; 55 ms — Consider rest or light active recovery.</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Workouts */}
        {tab === 'workouts' && !loading && (
          <>
            <div className="flex justify-end">
              <button className="btn-primary text-xs" onClick={() => setShowModal('workout')}>
                <Plus className="w-3.5 h-3.5" /> Log Workout
              </button>
            </div>
            {workouts.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title="No workouts logged yet"
                description="Track your training sessions to see progress and stay consistent."
                action={{ label: '+ Log Workout', onClick: () => setShowModal('workout') }}
              />
            ) : (
              <div className="space-y-3">
                {workouts.map(w => (
                  <div key={w.id} className="card group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{w.type === 'strength' ? '🏋️' : w.type === 'cardio' ? '🏃' : w.type === 'yoga' ? '🧘' : '💪'}</div>
                        <div>
                          <div className="font-medium text-gray-100">{w.title || w.type}</div>
                          <div className="text-xs text-gray-500">{w.date} · {w.duration_min} min · {w.exercise_count} exercises</div>
                        </div>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400"
                        onClick={() => setDeleteTarget({ type: 'workout', id: w.id })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {w.exercises.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {w.exercises.map(ex => (
                          <div key={ex.id} className="text-xs bg-gray-800 rounded px-2 py-1.5 text-gray-300">
                            <span className="font-medium">{ex.name}</span>
                            {ex.sets && <span className="text-gray-500"> · {ex.sets}×{ex.reps} @ {ex.weight_lbs}lbs</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Sleep */}
        {tab === 'sleep' && !loading && (
          <>
            <div className="flex justify-end">
              <button className="btn-primary text-xs" onClick={() => setShowModal('sleep')}>
                <Plus className="w-3.5 h-3.5" /> Log Sleep
              </button>
            </div>
            {sleep.length === 0 ? (
              <EmptyState
                icon={Moon}
                title="No sleep logs yet"
                description="Track your sleep duration and quality to understand your recovery patterns."
                action={{ label: '+ Log Sleep', onClick: () => setShowModal('sleep') }}
              />
            ) : (
              <>
                {sleepChartData.length > 0 && (
                  <div className="card">
                    <div className="section-title mb-4">Sleep Hours (30 days)</div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={sleepChartData} barSize={10}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
                        <YAxis domain={[0, 10]} tick={{ fill: '#6b7280', fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
                        <Bar dataKey="hours" fill="#8b5cf6" radius={[3, 3, 0, 0]} label={false} isAnimationActive={true} animationDuration={800} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-800">
                      <th className="table-header text-left px-4 py-3">Date</th>
                      <th className="table-header text-right px-4 py-3">Hours</th>
                      <th className="table-header text-right px-4 py-3">Quality</th>
                      <th className="table-header px-4 py-3">Bedtime</th>
                      <th className="table-header px-4 py-3">Wake</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr></thead>
                    <tbody>
                      {sleep.map(s => (
                        <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 group">
                          <td className="px-4 py-3 text-gray-400 text-xs">{s.date}</td>
                          <td className="px-4 py-3 text-right font-mono text-gray-200">{s.hours}h</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`badge text-xs ${s.quality >= 4 ? 'bg-emerald-900/50 text-emerald-400' : s.quality === 3 ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400'}`}>
                              {QUALITY_LABELS[s.quality] || s.quality}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs text-center">{s.bedtime || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs text-center">{s.wake_time || '—'}</td>
                          <td className="px-4 py-3">
                            <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400"
                              onClick={() => setDeleteTarget({ type: 'sleep', id: s.id })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* Nutrition */}
        {tab === 'nutrition' && !loading && <Nutrition />}

        {/* Medical Timeline */}
        {tab === 'medical' && !loading && <MedicalTimeline />}

        {/* Supplements */}
        {tab === 'supplements' && !loading && (
          <>
            <div className="flex justify-end">
              <button className="btn-primary text-xs" onClick={() => setShowModal('supplement')}>
                <Plus className="w-3.5 h-3.5" /> Add Supplement
              </button>
            </div>
            {supplements.length === 0 ? (
              <EmptyState
                icon={Pill}
                title="No supplements tracked yet"
                description="Log your supplements and dosages to track your stack and stay consistent."
                action={{ label: '+ Add Supplement', onClick: () => setShowModal('supplement') }}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {supplements.map(s => (
                  <div key={s.id} className={`card group border-l-4 ${s.is_active ? 'border-emerald-500' : 'border-gray-700 opacity-50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-100">{s.name}</span>
                          {s.is_active
                            ? <span className="badge bg-emerald-900/50 text-emerald-400 text-[10px]">Active</span>
                            : <span className="badge bg-gray-800 text-gray-500 text-[10px]">Paused</span>}
                        </div>
                        <div className="text-sm text-gray-400">{s.dose} · {s.frequency}</div>
                        {s.timing && <div className="text-xs text-gray-600 mt-0.5">⏰ {s.timing}</div>}
                        {s.purpose && <div className="text-xs text-gray-500 mt-1">{s.purpose}</div>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button className="btn-ghost p-1 text-xs" onClick={async () => {
                          try {
                            await axios.put(`/api/health/supplements/${s.id}/toggle`)
                            toast.success(s.is_active ? 'Supplement paused' : 'Supplement activated')
                            load()
                          } catch { toast.error('Failed to update supplement') }
                        }}>
                          {s.is_active ? '⏸' : '▶'}
                        </button>
                        <button className="btn-ghost p-1 text-red-400"
                          onClick={() => setDeleteTarget({ type: 'supplement', id: s.id })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Supplement Effectiveness Scorecard (S4.06) */}
        {tab === 'supplements' && !loading && effectiveness.length > 0 && (
          <div className="space-y-3 mt-2">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-gray-300">Effectiveness Scorecard</div>
              <div className="text-xs text-gray-500">Before vs. after you started each supplement</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {effectiveness.map(s => {
                // Determine signal from deltas
                const sleepDelta = s.delta?.sleep_quality
                const hrvDelta = s.delta?.hrv
                const rhrDelta = s.delta?.resting_hr  // negative = better

                let signal = 'insufficient'
                if (s.has_pre_data && s.has_post_data) {
                  const positiveSignals = [
                    sleepDelta !== null && sleepDelta > 0.2,
                    hrvDelta !== null && hrvDelta > 3,
                    rhrDelta !== null && rhrDelta < -2,  // lower resting HR = better
                  ].filter(Boolean).length
                  const negativeSignals = [
                    sleepDelta !== null && sleepDelta < -0.2,
                    hrvDelta !== null && hrvDelta < -3,
                    rhrDelta !== null && rhrDelta > 2,
                  ].filter(Boolean).length
                  if (positiveSignals > negativeSignals) signal = 'positive'
                  else if (negativeSignals > positiveSignals) signal = 'negative'
                  else signal = 'neutral'
                } else if (!s.has_pre_data && s.has_post_data) {
                  signal = 'no-baseline'
                }

                const signalConfig = {
                  positive: { label: '↑ Positive signal', cls: 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50' },
                  negative: { label: '↓ Negative signal', cls: 'bg-red-900/40 text-red-400 border-red-800/50' },
                  neutral: { label: '→ Neutral', cls: 'bg-gray-800 text-gray-400 border-gray-700' },
                  insufficient: { label: '⚠ Insufficient data', cls: 'bg-gray-800/50 text-gray-500 border-gray-700/50' },
                  'no-baseline': { label: '📊 No baseline', cls: 'bg-blue-900/30 text-blue-400 border-blue-800/40' },
                }
                const sig = signalConfig[signal]

                const fmtDelta = (val, lowerBetter = false) => {
                  if (val === null || val === undefined) return <span className="text-gray-600">—</span>
                  const positive = lowerBetter ? val < 0 : val > 0
                  const sign = val > 0 ? '+' : ''
                  return (
                    <span className={positive ? 'text-emerald-400' : val === 0 ? 'text-gray-500' : 'text-red-400'}>
                      {sign}{val.toFixed(2)}
                    </span>
                  )
                }

                return (
                  <div key={s.supplement_id} className={`card border ${sig.cls}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-100 text-sm">{s.name}</div>
                        {s.purpose && <div className="text-xs text-gray-500 mt-0.5">{s.purpose}</div>}
                      </div>
                      <span className={`badge text-[10px] border ${sig.cls}`}>{sig.label}</span>
                    </div>

                    {s.days_active !== null && (
                      <div className="text-xs text-gray-600 mb-2">{s.days_active}d active · since {s.start_date}</div>
                    )}

                    {signal === 'insufficient' ? (
                      <div className="text-xs text-gray-600 italic">Log body metrics and sleep to see effectiveness data.</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <div className="text-center">
                          <div className="text-[10px] text-gray-500 mb-0.5">Sleep Quality</div>
                          <div className="text-xs font-mono">{fmtDelta(sleepDelta)}</div>
                          {s.pre?.sleep_quality && s.post?.sleep_quality && (
                            <div className="text-[9px] text-gray-600">{s.pre.sleep_quality} → {s.post.sleep_quality}</div>
                          )}
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-gray-500 mb-0.5">HRV (ms)</div>
                          <div className="text-xs font-mono">{fmtDelta(hrvDelta)}</div>
                          {s.pre?.hrv && s.post?.hrv && (
                            <div className="text-[9px] text-gray-600">{s.pre.hrv} → {s.post.hrv}</div>
                          )}
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-gray-500 mb-0.5">Resting HR</div>
                          <div className="text-xs font-mono">{fmtDelta(rhrDelta, true)}</div>
                          {s.pre?.resting_hr && s.post?.resting_hr && (
                            <div className="text-[9px] text-gray-600">{s.pre.resting_hr} → {s.post.resting_hr}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="text-[10px] text-gray-600 pl-1">
              Compares 30-day window before vs. after each supplement was added. Requires consistent metric logging for accurate signals.
            </div>
          </div>
        )}

        {/* Injuries */}
        {tab === 'injuries' && <Injuries />}

        {/* Fitness Progression */}
        {tab === 'progression' && !loading && <Progression />}

        {/* Blood Work */}
        {tab === 'blood' && !loading && (
          <>
            <div className="flex justify-end">
              <button className="btn-primary text-xs" onClick={() => setShowModal('blood')}>
                <Plus className="w-3.5 h-3.5" /> Add Result
              </button>
            </div>
            {bloodWork.length === 0 ? (
              <EmptyState
                icon={Droplets}
                title="No blood work results yet"
                description="Add your lab results to track key health markers and see how they trend over time."
                action={{ label: '+ Add Result', onClick: () => setShowModal('blood') }}
              />
            ) : (
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-800">
                    <th className="table-header text-left px-4 py-3">Date</th>
                    <th className="table-header text-left px-4 py-3">Marker</th>
                    <th className="table-header text-right px-4 py-3">Value</th>
                    <th className="table-header text-right px-4 py-3">Range</th>
                    <th className="table-header px-4 py-3">Status</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr></thead>
                  <tbody>
                    {bloodWork.map(r => {
                      const inRange = (!r.reference_low || r.value >= r.reference_low) &&
                                      (!r.reference_high || r.value <= r.reference_high)
                      return (
                        <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 group">
                          <td className="px-4 py-3 text-gray-400 text-xs">{r.date}</td>
                          <td className="px-4 py-3 text-gray-200">{r.marker_name}</td>
                          <td className="px-4 py-3 text-right font-mono text-gray-100">{r.value} {r.unit}</td>
                          <td className="px-4 py-3 text-right text-gray-500 text-xs">
                            {r.reference_low !== null && r.reference_high !== null
                              ? `${r.reference_low}–${r.reference_high}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`badge text-[10px] ${inRange ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                              {inRange ? 'Normal' : 'Out of range'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button className="opacity-0 group-hover:opacity-100 btn-ghost p-1 text-red-400"
                              onClick={() => setDeleteTarget({ type: 'blood', id: r.id })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick-add modals */}
      {showModal === 'metric' && <QuickMetricModal onClose={() => setShowModal(null)} onSave={async (d) => { try { await axios.post('/api/health/body-metrics', d); toast.success('Metric logged'); setShowModal(null); load() } catch { toast.error('Failed to save metric') } }} />}
      {showModal === 'workout' && <QuickWorkoutModal onClose={() => setShowModal(null)} onSave={async (d) => { try { await axios.post('/api/health/workouts', d); toast.success('Workout logged'); setShowModal(null); load() } catch { toast.error('Failed to save workout') } }} />}
      {showModal === 'sleep' && <QuickSleepModal onClose={() => setShowModal(null)} onSave={async (d) => { try { await axios.post('/api/health/sleep', d); toast.success('Sleep logged'); setShowModal(null); load() } catch { toast.error('Failed to save sleep log') } }} />}
      {showModal === 'supplement' && <QuickSupplementModal onClose={() => setShowModal(null)} onSave={async (d) => { try { await axios.post('/api/health/supplements', d); toast.success('Supplement added'); setShowModal(null); load() } catch { toast.error('Failed to add supplement') } }} />}
      {showModal === 'blood' && <QuickBloodModal onClose={() => setShowModal(null)} onSave={async (d) => { try { await axios.post('/api/health/blood-work', d); toast.success('Blood work result saved'); setShowModal(null); load() } catch { toast.error('Failed to save blood work') } }} />}

      {deleteTarget && (
        <ConfirmModal title="Delete Entry" message="Delete this entry?" onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            const { type, id } = deleteTarget
            const paths = { metric: 'body-metrics', workout: 'workouts', sleep: 'sleep', supplement: 'supplements', blood: 'blood-work' }
            try {
              await axios.delete(`/api/health/${paths[type]}/${id}`)
              toast.success('Entry deleted')
            } catch {
              toast.error('Failed to delete entry')
            }
            setDeleteTarget(null); load()
          }} />
      )}
    </div>
  )
}

function QuickMetricModal({ onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [f, setF] = useState({ date: today, weight_lbs: '', body_fat_pct: '', resting_hr: '', hrv: '', waist_in: '' })
  return (
    <Modal title="Log Body Metric" onClose={onClose} size="sm">
      <div className="space-y-3">
        <div><label className="label">Date</label><input className="input" type="date" value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Weight (lbs)</label><input className="input" type="number" step="0.1" placeholder="178.5" value={f.weight_lbs} onChange={e => setF(p => ({ ...p, weight_lbs: e.target.value }))} /></div>
          <div><label className="label">Body Fat %</label><input className="input" type="number" step="0.1" placeholder="16.2" value={f.body_fat_pct} onChange={e => setF(p => ({ ...p, body_fat_pct: e.target.value }))} /></div>
          <div><label className="label">Resting HR (bpm)</label><input className="input" type="number" placeholder="58" value={f.resting_hr} onChange={e => setF(p => ({ ...p, resting_hr: e.target.value }))} /></div>
          <div><label className="label">HRV (ms)</label><input className="input" type="number" placeholder="68" value={f.hrv} onChange={e => setF(p => ({ ...p, hrv: e.target.value }))} /></div>
          <div><label className="label">Waist (in)</label><input className="input" type="number" step="0.5" placeholder="32.5" value={f.waist_in} onChange={e => setF(p => ({ ...p, waist_in: e.target.value }))} /></div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave({
            ...f,
            weight_lbs: f.weight_lbs ? parseFloat(f.weight_lbs) : null,
            body_fat_pct: f.body_fat_pct ? parseFloat(f.body_fat_pct) : null,
            resting_hr: f.resting_hr ? parseInt(f.resting_hr) : null,
            hrv: f.hrv ? parseInt(f.hrv) : null,
            waist_in: f.waist_in ? parseFloat(f.waist_in) : null,
          })}>Save</button>
        </div>
      </div>
    </Modal>
  )
}

function QuickWorkoutModal({ onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [f, setF] = useState({ date: today, type: 'strength', title: '', duration_min: '' })
  return (
    <Modal title="Log Workout" onClose={onClose} size="sm">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Date</label><input className="input" type="date" value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} /></div>
          <div><label className="label">Type</label>
            <select className="input" value={f.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))}>
              {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div><label className="label">Title</label><input className="input" placeholder="Push Day" value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} /></div>
          <div><label className="label">Duration (min)</label><input className="input" type="number" placeholder="55" value={f.duration_min} onChange={e => setF(p => ({ ...p, duration_min: e.target.value }))} /></div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave({ ...f, duration_min: parseInt(f.duration_min) || null })}>Save</button>
        </div>
      </div>
    </Modal>
  )
}

function QuickSleepModal({ onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [f, setF] = useState({ date: today, hours: '', quality: '4', bedtime: '23:00', wake_time: '07:00' })
  return (
    <Modal title="Log Sleep" onClose={onClose} size="sm">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Date</label><input className="input" type="date" value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} /></div>
          <div><label className="label">Hours</label><input className="input" type="number" step="0.5" placeholder="7.5" value={f.hours} onChange={e => setF(p => ({ ...p, hours: e.target.value }))} /></div>
          <div><label className="label">Quality (1-5)</label>
            <select className="input" value={f.quality} onChange={e => setF(p => ({ ...p, quality: e.target.value }))}>
              {[5,4,3,2,1].map(q => <option key={q} value={q}>{q} — {QUALITY_LABELS[q]}</option>)}
            </select>
          </div>
          <div><label className="label">Bedtime</label><input className="input" type="time" value={f.bedtime} onChange={e => setF(p => ({ ...p, bedtime: e.target.value }))} /></div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave({ ...f, hours: parseFloat(f.hours) || null, quality: parseInt(f.quality) })}>Save</button>
        </div>
      </div>
    </Modal>
  )
}

function QuickSupplementModal({ onSave, onClose }) {
  const [f, setF] = useState({ name: '', dose: '', frequency: 'daily', timing: 'morning', purpose: '' })
  return (
    <Modal title="Add Supplement" onClose={onClose} size="sm">
      <div className="space-y-3">
        <div><label className="label">Name</label><input className="input" placeholder="Vitamin D3" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Dose</label><input className="input" placeholder="4000 IU" value={f.dose} onChange={e => setF(p => ({ ...p, dose: e.target.value }))} /></div>
          <div><label className="label">Timing</label><input className="input" placeholder="morning" value={f.timing} onChange={e => setF(p => ({ ...p, timing: e.target.value }))} /></div>
        </div>
        <div><label className="label">Purpose</label><input className="input" placeholder="Immune support, mood" value={f.purpose} onChange={e => setF(p => ({ ...p, purpose: e.target.value }))} /></div>
        <div className="flex gap-3 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(f)}>Add</button>
        </div>
      </div>
    </Modal>
  )
}

function QuickBloodModal({ onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [f, setF] = useState({ date: today, marker_name: '', value: '', unit: '', reference_low: '', reference_high: '' })
  return (
    <Modal title="Add Blood Work Result" onClose={onClose} size="sm">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Date</label><input className="input" type="date" value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} /></div>
          <div><label className="label">Marker</label><input className="input" placeholder="Testosterone" value={f.marker_name} onChange={e => setF(p => ({ ...p, marker_name: e.target.value }))} /></div>
          <div><label className="label">Value</label><input className="input" type="number" step="any" value={f.value} onChange={e => setF(p => ({ ...p, value: e.target.value }))} /></div>
          <div><label className="label">Unit</label><input className="input" placeholder="ng/dL" value={f.unit} onChange={e => setF(p => ({ ...p, unit: e.target.value }))} /></div>
          <div><label className="label">Ref Low</label><input className="input" type="number" step="any" value={f.reference_low} onChange={e => setF(p => ({ ...p, reference_low: e.target.value }))} /></div>
          <div><label className="label">Ref High</label><input className="input" type="number" step="any" value={f.reference_high} onChange={e => setF(p => ({ ...p, reference_high: e.target.value }))} /></div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave({
            ...f, value: parseFloat(f.value) || null,
            reference_low: f.reference_low ? parseFloat(f.reference_low) : null,
            reference_high: f.reference_high ? parseFloat(f.reference_high) : null,
          })}>Add</button>
        </div>
      </div>
    </Modal>
  )
}
