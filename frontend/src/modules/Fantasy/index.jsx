import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import axios from 'axios'
import { Trophy, RefreshCw, Users, ArrowLeftRight, Wrench, Package, Newspaper } from 'lucide-react'
import { useToast } from '../../components/Toast'
import Roster from './Roster'
import TradeProposals from './TradeProposals'
import TradeBuilder from './TradeBuilder'
import Picks from './Picks'
import News from './News'

const tabs = [
  { to: '',        label: 'Roster',          icon: Users,          end: true },
  { to: 'trades',  label: 'Trade Proposals', icon: ArrowLeftRight },
  { to: 'builder', label: 'Trade Builder',   icon: Wrench },
  { to: 'picks',   label: 'Picks',           icon: Package },
  { to: 'news',    label: 'News',            icon: Newspaper },
]

export default function Fantasy() {
  const location = useLocation()
  const [dash, setDash] = useState(null)
  const [rosters, setRosters] = useState({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const dashRes = await axios.get('/api/fantasy/dashboard')
      const data = dashRes.data

      if (data.status === 'not_synced') {
        setDash(data)
        setLoading(false)
        return
      }

      setDash(data)

      // Load per-league roster details in parallel
      const leagueIds = (data.leagues || []).map(l => l.league_id)
      const rosterResults = await Promise.all(
        leagueIds.map(id =>
          axios.get(`/api/fantasy/league/${id}/roster`)
            .then(r => ({ id, data: r.data }))
            .catch(() => null)
        )
      )

      const rosterMap = {}
      rosterResults.forEach(r => { if (r) rosterMap[r.id] = r.data })
      setRosters(rosterMap)
    } catch {
      toast.error('Failed to load fantasy data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await axios.post('/api/fantasy/sync')
      toast.success('Sync complete')
      load()
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <div className="page-header mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-green-500"></div>
            <h1 className="page-title">Dynasty Fantasy</h1>
          </div>
          <div className="flex items-center gap-3">
            {dash?.last_updated && (
              <span className="text-xs text-gray-500 hidden sm:block">
                Synced {new Date(dash.last_updated).toLocaleString()}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="tabs">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `tab flex items-center gap-1.5 ${isActive ? 'tab-active text-green-400' : 'tab-inactive'}`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div key={location.pathname} className="page tab-panel">
          <Routes>
            <Route
              index
              element={
                <Roster
                  dash={dash}
                  rosters={rosters}
                  loading={loading}
                  onSync={handleSync}
                  syncing={syncing}
                />
              }
            />
            <Route
              path="trades"
              element={
                <TradeProposals
                  dash={dash}
                  loading={loading}
                  onSync={handleSync}
                />
              }
            />
            <Route
              path="builder"
              element={
                <TradeBuilder
                  dash={dash}
                  loading={loading}
                  onSync={handleSync}
                />
              }
            />
            <Route
              path="picks"
              element={
                <Picks
                  dash={dash}
                  loading={loading}
                  onSync={handleSync}
                />
              }
            />
            <Route
              path="news"
              element={
                <News
                  dash={dash}
                  loading={loading}
                  onSync={handleSync}
                  syncing={syncing}
                />
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  )
}
