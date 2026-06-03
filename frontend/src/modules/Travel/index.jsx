import { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Trips from './Trips'
import TravelMap from './TravelMap'
import Wishlist from './Wishlist'
import { Map, Compass, Star } from 'lucide-react'

const tabs = [
  { to: '', label: 'Trips', icon: Compass, end: true },
  { to: 'map', label: 'World Map', icon: Map },
  { to: 'wishlist', label: 'Wishlist', icon: Star },
]

export default function Travel() {
  const location = useLocation()
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-800 px-6 pt-6 pb-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-6 rounded-full bg-orange-500"></div>
          <h1 className="text-xl font-bold text-gray-100">Travel</h1>
        </div>
        <nav className="tabs">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `tab flex items-center gap-1.5 ${isActive ? 'tab-active text-orange-400' : ''}`
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
            <Route index element={<Trips />} />
            <Route path="map" element={<TravelMap />} />
            <Route path="wishlist" element={<Wishlist />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
