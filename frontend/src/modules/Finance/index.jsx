import { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import NetWorthDashboard from './NetWorthDashboard'
import Transactions from './Transactions'
import BudgetTracker from './BudgetTracker'
import Recurring from './Recurring'
import Goals from './Goals'
import MonthlySummary from './MonthlySummary'
import CashFlow from './CashFlow'
import { BarChart2, ArrowLeftRight, PieChart, RefreshCw, Target, FileText, TrendingUp, Zap, AlertTriangle, Flame, AlignCenter } from 'lucide-react'
import NetWorthVelocity from './NetWorthVelocity'
import SpendingAnomalies from './SpendingAnomalies'
import FireCalculator from './FireCalculator'
import GoalAlignment from './GoalAlignment'

const tabs = [
  { to: '', label: 'Dashboard', icon: BarChart2, end: true },
  { to: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: 'budget', label: 'Budget', icon: PieChart },
  { to: 'recurring', label: 'Recurring', icon: RefreshCw },
  { to: 'goals', label: 'Goals', icon: Target },
  { to: 'summary', label: 'Summary', icon: FileText },
  { to: 'cashflow', label: 'Cash Flow', icon: TrendingUp },
  { to: 'velocity', label: 'Velocity', icon: Zap },
  { to: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
  { to: 'fire', label: 'FIRE', icon: Flame },
  { to: 'alignment', label: 'Alignment', icon: AlignCenter },
]

export default function Finance() {
  const location = useLocation()
  return (
    <div className="flex flex-col h-full">
      {/* Header with semantic structure */}
      <div className="px-6 pt-6 pb-0">
        <div className="page-header mb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-emerald-500"></div>
            <h1 className="page-title">Finance</h1>
          </div>
        </div>
        {/* Design system tabs */}
        <nav className="tabs">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `tab flex items-center gap-1.5 ${isActive ? 'tab-active text-emerald-400' : 'tab-inactive'}`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* key={location.pathname} re-mounts on every tab switch → triggers tab-panel fade-in */}
        <div key={location.pathname} className="page tab-panel">
          <Routes>
            <Route index element={<NetWorthDashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="budget" element={<BudgetTracker />} />
            <Route path="recurring" element={<Recurring />} />
            <Route path="goals" element={<Goals />} />
            <Route path="summary" element={<MonthlySummary />} />
            <Route path="cashflow" element={<CashFlow />} />
            <Route path="velocity" element={<NetWorthVelocity />} />
            <Route path="anomalies" element={<SpendingAnomalies />} />
            <Route path="fire" element={<FireCalculator />} />
            <Route path="alignment" element={<GoalAlignment />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
