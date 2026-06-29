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

import { lazy, Suspense } from 'react'
import { useLocation, Routes, Route, Navigate } from 'react-router-dom'

const Finance = lazy(() => import('../modules/Finance'))
const Tasks = lazy(() => import('../modules/Tasks'))
const Travel = lazy(() => import('../modules/Travel'))
const CRM = lazy(() => import('../modules/CRM'))
const Wiki = lazy(() => import('../modules/Wiki'))
const Health = lazy(() => import('../modules/Health'))
const Habits = lazy(() => import('../modules/Habits'))
const Reading = lazy(() => import('../modules/Reading'))
const Projects = lazy(() => import('../modules/Projects'))
const Mood = lazy(() => import('../modules/Mood'))
const Trading = lazy(() => import('../modules/Trading'))
const TimeAttention = lazy(() => import('../modules/TimeAttention'))
const Decisions = lazy(() => import('../modules/Decisions'))
const Fantasy = lazy(() => import('../modules/Fantasy'))
const Insights = lazy(() => import('../modules/Insights'))
const Weekly = lazy(() => import('../modules/Dashboard/Weekly'))

export default function AnimatedRoutes() {
  const location = useLocation()
  // Key by top-level segment so module switches animate but within-module
  // tab navigation (e.g. /finance/transactions) keeps the module mounted.
  const pageKey = '/' + location.pathname.split('/')[1]

  return (
    <div key={pageKey} className="page-transition h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading...</div>
      }>
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/tasks" replace />} />
          <Route path="/tasks/*" element={<Tasks />} />
          <Route path="/dashboard/weekly" element={<Weekly />} />
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
      </Suspense>
    </div>
  )
}
