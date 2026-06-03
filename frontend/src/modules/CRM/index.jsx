import { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Contacts from './Contacts'
import CRMDashboard from './CRMDashboard'
import CRMNetwork from './CRMNetwork'
import CRMEnergy from './CRMEnergy'
import { LayoutDashboard, Users, Network, Zap } from 'lucide-react'

const tabs = [
  { to: '', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: 'contacts', label: 'Contacts', icon: Users },
  { to: 'network', label: 'Network', icon: Network },
  { to: 'energy', label: 'Energy', icon: Zap },
]

export default function CRM() {
  const location = useLocation()
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-800 px-6 pt-6 pb-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-6 rounded-full bg-indigo-500"></div>
          <h1 className="text-xl font-bold text-gray-100">People</h1>
        </div>
        <nav className="tabs">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `tab flex items-center gap-1.5 ${isActive ? 'tab-active text-indigo-400' : ''}`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {/* key re-mounts content on tab switch → triggers fade-in animation */}
        <div key={location.pathname} className="tab-panel">
          <Routes>
            <Route index element={<CRMDashboard />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="contacts/:id" element={<Contacts />} />
            <Route path="network" element={<CRMNetwork />} />
            <Route path="energy" element={<CRMEnergy />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
