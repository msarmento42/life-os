/**
 * AnimatedRoutes — page-level transition wrapper.
 *
 * Technique: key a wrapper div on the top-level path segment (e.g. "/finance",
 * "/health") so React unmounts/remounts it on module-to-module navigation,
 * re-triggering the CSS animate-page-enter animation. Using the first segment
 * (not location.key) ensures sub-route tab switches within a module (e.g.
 * /finance → /finance/transactions) do NOT remount the module and lose state.
 *
 * The animation is a fast fade + subtle upward slide (animate-page-enter),
 * driven entirely by CSS so it respects prefers-reduced-motion automatically.
 */

import { useLocation, Routes, Route, Navigate } from 'react-router-dom'
import Finance from '../modules/Finance'
import Tasks from '../modules/Tasks'
import Travel from '../modules/Travel'
import CRM from '../modules/CRM'
import Wiki from '../modules/Wiki'
import Health from '../modules/Health'
import Habits from '../modules/Habits'
import Reading from '../modules/Reading'
import Projects from '../modules/Projects'
import Mood from '../modules/Mood'
import Trading from '../modules/Trading'
import TimeAttention from '../modules/TimeAttention'
import Decisions from '../modules/Decisions'
import Fantasy from '../modules/Fantasy'
import Insights from '../modules/Insights'

export default function AnimatedRoutes() {
  const location = useLocation()
  // Key by top-level segment so module switches animate but within-module
  // tab navigation (e.g. /finance/transactions) keeps the module mounted.
  const pageKey = '/' + location.pathname.split('/')[1]

  return (
    <div key={pageKey} className="page-transition h-full">
      <Routes location={location}>
        <Route path="/" element={<Navigate to="/tasks" replace />} />
        <Route path="/tasks/*" element={<Tasks />} />
        <Route path="/finance/*" element={<Finance />} />
        <Route path="/health/*" element={<Health />} />
        <Route path="/habits/*" element={<Habits />} />
        <Route path="/mood/*" element={<Mood />} />
        <Route path="/reading/*" element={<Reading />} />
        <Route path="/projects/*" element={<Projects />} />
        <Route path="/trading/*" element={<Trading />} />
        <Route path="/insights/*" element={<Insights />} />
        <Route path="/travel/*" element={<Travel />} />
        <Route path="/crm/*" element={<CRM />} />
        <Route path="/wiki/*" element={<Wiki />} />
        <Route path="/time/*" element={<TimeAttention />} />
        <Route path="/decisions/*" element={<Decisions />} />
        <Route path="/fantasy/*" element={<Fantasy />} />
      </Routes>
    </div>
  )
}
