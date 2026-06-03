import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceDot, Legend,
} from 'recharts'
import { TrendingUp, Dumbbell, Trophy, Activity, ChevronDown } from 'lucide-react'
import { SkeletonCard, SkeletonStat } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'

// ── Custom tooltips ──────────────────────────────────────────────────────────

function StrengthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-lg min-w-[140px]">
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-sm font-semibold text-red-400">{d?.best_weight} lbs</p>
      {d?.best_reps && (
        <p className="text-xs text-gray-500 mt-0.5">{d.best_sets}×{d.best_reps} reps</p>
      )}
      {d?.is_pr && (
        <p className="text-xs text-yellow-400 font-semibold mt-1">🏆 PR</p>
      )}
      {d?.total_volume && (
        <p className="text-xs text-gray-500 mt-0.5">Vol: {d.total_volume.toLocaleString()} lbs</p>
      )}
    </div>
  )
}

function CardioTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-sm font-semibold text-orange-400">{d?.duration_min} min</p>
      {d?.calories_burned && (
        <p className="text-xs text-gray-500 mt-0.5">{d.calories_burned} cal</p>
      )}
    </div>
  )
}

// ── PR dot render ────────────────────────────────────────────────────────────

function PRDot(props) {
  const { cx, cy, payload } = props
  if (!payload?.is_pr) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="#f59e0b" stroke="#1f2937" strokeWidth={2} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize="8" fill="#1f2937" fontWeight="bold">P</text>
    </g>
  )
}

// ── Exercise selector dropdown ───────────────────────────────────────────────

function ExerciseSelector({ exercises, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const label = selected || 'Select exercise'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 hover:border-gray-600 transition-colors min-w-[200px] justify-between"
      >
        <span className="flex items-center gap-2">
          <Dumbbell className="w-3.5 h-3.5 text-red-400" />
          {label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[220px]">
          {exercises.map(ex => (
            <button
              key={ex.name}
              onClick={() => { onChange(ex.name); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 transition-colors flex items-center justify-between ${
                ex.name === selected ? 'text-red-400 bg-gray-800' : 'text-gray-200'
              }`}
            >
              <span>{ex.name}</span>
              <span className="text-xs text-gray-500">{ex.sessions}×</span>
            </button>
          ))}
          {exercises.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500">No exercises logged yet</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Progression() {
  const [exercises, setExercises] = useState([])
  const [selectedEx, setSelectedEx] = useState(null)
  const [strengthData, setStrengthData] = useState(null)
  const [cardioData, setCardioData] = useState(null)
  const [loadingEx, setLoadingEx] = useState(true)
  const [loadingStrength, setLoadingStrength] = useState(false)
  const [loadingCardio, setLoadingCardio] = useState(true)

  // Load exercise list + cardio on mount
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [exRes, cardioRes] = await Promise.all([
          axios.get('/api/health/progression/exercises'),
          axios.get('/api/health/progression/cardio?weeks=16'),
        ])
        setExercises(exRes.data)
        setCardioData(cardioRes.data)
        if (exRes.data.length > 0) {
          setSelectedEx(exRes.data[0].name)
        }
      } finally {
        setLoadingEx(false)
        setLoadingCardio(false)
      }
    }
    fetchInit()
  }, [])

  // Load strength data when exercise changes
  useEffect(() => {
    if (!selectedEx) return
    setLoadingStrength(true)
    axios.get(`/api/health/progression/strength?exercise=${encodeURIComponent(selectedEx)}&weeks=16`)
      .then(r => setStrengthData(r.data))
      .finally(() => setLoadingStrength(false))
  }, [selectedEx])

  const sessions = strengthData?.sessions || []
  const prWeight = strengthData?.pr_weight
  const prDate   = strengthData?.pr_date
  const totalSessions = strengthData?.total_sessions || 0

  // Cardio session list
  const cardioSessions = cardioData?.sessions || []
  const avgDur = cardioData?.avg_duration_min
  const bestSession = cardioData?.best_session

  // Weight delta first → last session
  const firstWeight = sessions.length > 0 ? sessions[0].best_weight : null
  const lastWeight  = sessions.length > 0 ? sessions[sessions.length - 1].best_weight : null
  const weightDelta = (firstWeight && lastWeight) ? (lastWeight - firstWeight) : null

  return (
    <div className="space-y-6">

      {/* ── Strength Progression ─────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="section-title flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-400" /> Strength Progression
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Best set weight per session — last 16 weeks</p>
          </div>
          {!loadingEx && (
            <ExerciseSelector
              exercises={exercises}
              selected={selectedEx}
              onChange={setSelectedEx}
            />
          )}
        </div>

        {/* Stats row */}
        {loadingStrength ? (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[...Array(3)].map((_, i) => <SkeletonStat key={i} />)}
          </div>
        ) : sessions.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="stat-card border-l-4 border-yellow-500">
              <div className="stat-label flex items-center gap-1">
                <Trophy className="w-3 h-3" /> PR Weight
              </div>
              <div className="stat-value">{prWeight} lbs</div>
              {prDate && <div className="text-[11px] text-gray-500 mt-0.5">{prDate.slice(5)}</div>}
            </div>
            <div className="stat-card border-l-4 border-red-500">
              <div className="stat-label">Gain (16 wks)</div>
              <div className={`stat-value ${weightDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {weightDelta !== null ? `${weightDelta >= 0 ? '+' : ''}${weightDelta} lbs` : '—'}
              </div>
            </div>
            <div className="stat-card border-l-4 border-blue-500">
              <div className="stat-label">Sessions Logged</div>
              <div className="stat-value">{totalSessions}</div>
            </div>
          </div>
        ) : null}

        {/* Chart */}
        {loadingStrength ? (
          <SkeletonCard />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No data for this exercise"
            message="Log workouts with this exercise to see your progression curve."
          />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={sessions} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                unit=" lbs"
                axisLine={false}
                width={50}
              />
              <Tooltip content={<StrengthTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#6b7280' }} />
              <Line
                type="monotone"
                dataKey="best_weight"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={<PRDot />}
                activeDot={{ r: 5, fill: '#ef4444' }}
                isAnimationActive
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* PR callout */}
        {!loadingStrength && sessions.some(s => s.is_pr) && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-500 text-gray-900 text-[9px] font-bold">P</span>
            Gold dots indicate a new personal record at that session
          </p>
        )}
      </div>

      {/* ── Volume trend ─────────────────────────────────────────── */}
      {!loadingStrength && sessions.length > 0 && (
        <div className="card">
          <div className="section-title flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-blue-400" /> Total Volume per Session
          </div>
          <p className="text-xs text-gray-500 mb-4">Sets × reps × weight — cumulative work done each session</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sessions} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} width={55}
                tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
              <Tooltip
                formatter={(v) => [`${v.toLocaleString()} lbs`, 'Volume']}
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af', fontSize: 11 }}
              />
              <Bar dataKey="total_volume" fill="#3b82f6" radius={[3, 3, 0, 0]}
                isAnimationActive animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Cardio Trend ─────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="section-title flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" /> Cardio Progression
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Session duration over time — last 16 weeks</p>
          </div>
          {/* Stats inline */}
          {!loadingCardio && cardioSessions.length > 0 && (
            <div className="flex gap-4 text-right">
              <div>
                <div className="text-xs text-gray-500">Avg Duration</div>
                <div className="text-sm font-semibold text-orange-400">{avgDur} min</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Best Session</div>
                <div className="text-sm font-semibold text-orange-400">
                  {bestSession?.duration_min} min
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Sessions</div>
                <div className="text-sm font-semibold text-gray-200">{cardioData?.total_sessions}</div>
              </div>
            </div>
          )}
        </div>

        {loadingCardio ? (
          <SkeletonCard />
        ) : cardioSessions.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No cardio sessions logged"
            message='Log workouts with type "cardio" to track your aerobic progression.'
          />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cardioSessions} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                unit=" min"
                axisLine={false}
                width={45}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CardioTooltip />} cursor={{ fill: 'rgba(251,146,60,0.06)' }} />
              <Bar dataKey="duration_min" fill="#f97316" radius={[4, 4, 0, 0]}
                isAnimationActive animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  )
}
