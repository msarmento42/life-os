import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarDays, DollarSign, HeartHandshake, PieChart as PieChartIcon, Target, TrendingUp } from 'lucide-react'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

const emptyWeekly = {
  mood_trend: [],
  time_allocation: [],
  habit_summary: { habits: [], overall_pct: 0 },
  project_progress: [],
  spending: { total_spent: 0, by_category: [] },
  relationships_due: [],
}

const dayName = (value) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })
const money = (value) => `$${Number(value || 0).toFixed(2)}`
const hours = (minutes) => (Number(minutes || 0) / 60).toFixed(1)

function avg(items, key) {
  const values = items.map(item => item[key]).filter(value => value !== null && value !== undefined)
  if (values.length === 0) return 'n/a'
  return (values.reduce((sum, value) => sum + Number(value), 0) / values.length).toFixed(1)
}

function Card({ title, icon: Icon, className = '', children }) {
  return (
    <section className={`bg-gray-900 rounded-xl p-4 border border-gray-800 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-brand-400" />
        <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function MoodTrend({ data }) {
  return (
    <Card title="Mood trend" icon={TrendingUp} className="md:col-span-2">
      <div className="text-xs text-gray-500 mb-3">
        avg mood: {avg(data, 'mood')} | avg energy: {avg(data, 'energy')}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={dayName} stroke="#6b7280" fontSize={12} />
            <YAxis domain={[1, 10]} stroke="#6b7280" fontSize={12} />
            <ChartTooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
            <Legend />
            <Line type="monotone" dataKey="mood" name="Mood" stroke="#6366f1" strokeWidth={2} connectNulls={false} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="energy" name="Energy" stroke="#10b981" strokeWidth={2} connectNulls={false} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function TimeAllocation({ data }) {
  const [mode, setMode] = useState('actual')
  const key = mode === 'planned' ? 'planned_min' : 'actual_min'
  const chartData = data.filter(item => Number(item[key] || 0) > 0).map(item => ({ name: item.category, value: item[key] }))
  const total = chartData.reduce((sum, item) => sum + Number(item.value || 0), 0)

  return (
    <Card title="Time allocation" icon={PieChartIcon}>
      <div className="flex items-center gap-2 mb-4">
        {['actual', 'planned'].map(option => (
          <button
            key={option}
            onClick={() => setMode(option)}
            className={`px-3 py-1 rounded-lg text-xs ${mode === option ? 'bg-brand-500 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            {option === 'actual' ? 'Actual' : 'Planned'}
          </button>
        ))}
      </div>
      {chartData.length === 0 ? (
        <p className="text-sm text-gray-500">No time blocks logged this week</p>
      ) : (
        <div className="relative h-72">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-100">{hours(total)}h</div>
              <div className="text-[10px] uppercase text-gray-500">total</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                {chartData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <ChartTooltip formatter={(value) => `${hours(value)}h`} contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function HabitCompletion({ summary }) {
  const habits = summary.habits || []
  const chartData = habits.map(habit => ({ ...habit, shortName: habit.name.length > 10 ? `${habit.name.slice(0, 10)}...` : habit.name }))

  return (
    <Card title="Habit completion" icon={Target}>
      <div className="text-4xl font-bold text-gray-100 mb-1">{Math.round(summary.overall_pct || 0)}%</div>
      <div className="text-xs text-gray-500 mb-4">overall completion</div>
      {chartData.length === 0 ? (
        <p className="text-sm text-gray-500">No active habits found</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="shortName" stroke="#6b7280" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={12} />
              <ChartTooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
              <Bar dataKey="pct" name="Completion %" radius={[6, 6, 0, 0]}>
                {chartData.map(habit => (
                  <Cell key={habit.id} fill={habit.pct >= 80 ? '#10b981' : habit.pct >= 50 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function ProjectProgress({ projects }) {
  return (
    <Card title="Project progress" icon={CalendarDays}>
      {projects.length === 0 ? (
        <p className="text-sm text-gray-500">No active projects found</p>
      ) : (
        <div className="space-y-4">
          {projects.map(project => (
            <div key={project.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-100 truncate">{project.title}</div>
                  {project.due_date && <div className="text-xs text-gray-500">Due {project.due_date}</div>}
                </div>
                <span className="text-[10px] uppercase px-2 py-1 rounded bg-gray-800 text-gray-400 shrink-0">{project.project_type}</span>
              </div>
              <div className="h-2 rounded bg-gray-700 overflow-hidden">
                <div className="h-full rounded bg-indigo-500" style={{ width: `${project.pct}%` }} />
              </div>
              <div className="text-xs text-gray-500">{project.done_tasks}/{project.total_tasks} tasks</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function SpendingSummary({ spending }) {
  const rows = spending.by_category || []
  const maxAmount = Math.max(...rows.map(row => Number(row.amount || 0)), 0)

  return (
    <Card title="Spending summary" icon={DollarSign}>
      <div className="text-4xl font-bold text-red-400 mb-1">{money(spending.total_spent)}</div>
      <div className="text-xs text-gray-500 mb-4">spent this week</div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No expenses logged this week</p>
      ) : (
        <div className="space-y-3">
          {rows.map(row => (
            <div key={row.category} className="space-y-1">
              <div className="flex items-center justify-between text-sm gap-3">
                <span className="text-gray-300 truncate">{row.category}</span>
                <span className="text-gray-400 shrink-0">{money(row.amount)}</span>
              </div>
              <div className="h-2 rounded bg-gray-800 overflow-hidden">
                <div className="h-full rounded bg-red-400" style={{ width: `${maxAmount ? (row.amount / maxAmount) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function RelationshipsDue({ contacts }) {
  return (
    <Card title="Relationships needing attention" icon={HeartHandshake} className="md:col-span-2">
      {contacts.length === 0 ? (
        <p className="text-green-400 text-sm">All relationships on track</p>
      ) : (
        <div className="divide-y divide-gray-800">
          {contacts.map(contact => (
            <Link key={contact.id} to="/crm" className="flex items-center justify-between gap-4 py-3 hover:bg-gray-800/40 rounded-lg px-2">
              <div className="min-w-0">
                <div className="font-medium text-gray-100 truncate">{contact.name}</div>
                <div className="text-xs text-gray-500 capitalize">{contact.relationship_type}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {contact.has_overdue_reminder && <span className="text-[10px] uppercase rounded bg-amber-900/40 text-amber-300 px-2 py-1">Reminder</span>}
                <span className="text-sm text-red-400">{contact.days_overdue}d overdue</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function Weekly() {
  const [data, setData] = useState(emptyWeekly)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    axios.get('/api/dashboard/weekly')
      .then(res => {
        if (active) setData({ ...emptyWeekly, ...(res.data || {}) })
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const moodTrend = useMemo(() => data.mood_trend || [], [data.mood_trend])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-800 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 rounded-full bg-purple-500" />
          <h1 className="page-title">Weekly Review</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="page">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="bg-gray-900 rounded-xl h-64 animate-pulse" />)}
            </div>
          ) : error ? (
            <div className="bg-gray-900 rounded-xl p-6 text-red-400">Could not load weekly dashboard.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
              <MoodTrend data={moodTrend} />
              <TimeAllocation data={data.time_allocation || []} />
              <HabitCompletion summary={data.habit_summary || emptyWeekly.habit_summary} />
              <ProjectProgress projects={data.project_progress || []} />
              <SpendingSummary spending={data.spending || emptyWeekly.spending} />
              <RelationshipsDue contacts={data.relationships_due || []} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
