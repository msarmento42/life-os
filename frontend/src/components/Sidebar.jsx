import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { DollarSign, Plane, Users, BookOpen, Sun, Moon, Activity, Heart, CheckSquare, Library, FolderKanban, Smile, TrendingUp, Clock, Scale, ChevronDown, ListTodo, Trophy, Brain, CalendarDays } from 'lucide-react'

const navSections = [
  {
    title: 'Daily',
    items: [
      { to: '/tasks',    label: 'Tasks',            icon: ListTodo,      color: 'text-violet-400' },
      { to: '/dashboard/weekly', label: 'Weekly Review', icon: CalendarDays, color: 'text-purple-400' },
      { to: '/mood',     label: 'Mood & Energy',    icon: Smile,         color: 'text-pink-400' },
      { to: '/habits',   label: 'Habits & Routines', icon: CheckSquare,   color: 'text-amber-400' },
      { to: '/time',     label: 'Time & Attention', icon: Clock,         color: 'text-teal-400' },
    ]
  },
  {
    title: 'Life',
    items: [
      { to: '/finance',  label: 'Finance',          icon: DollarSign,    color: 'text-emerald-400' },
      { to: '/health',   label: 'Health & Body',    icon: Heart,         color: 'text-red-400' },
      { to: '/projects', label: 'Projects & Goals', icon: FolderKanban,  color: 'text-blue-400' },
      { to: '/crm',      label: 'CRM / People',     icon: Users,         color: 'text-indigo-400' },
    ]
  },
  {
    title: 'Growth',
    items: [
      { to: '/insights',  label: 'Insights',          icon: Brain,       color: 'text-fuchsia-400' },
      { to: '/trading',   label: 'Trading & Portfolio', icon: TrendingUp,  color: 'text-cyan-400'   },
      { to: '/reading',   label: 'Reading List',      icon: Library,       color: 'text-purple-400' },
      { to: '/decisions', label: 'Decision Journal',  icon: Scale,         color: 'text-yellow-400' },
    ]
  },
  {
    title: 'Fantasy',
    items: [
      { to: '/fantasy',  label: 'Dynasty Football', icon: Trophy,        color: 'text-green-400' },
    ]
  },
  {
    title: 'Reference',
    items: [
      { to: '/wiki',     label: 'Wiki',             icon: BookOpen,      color: 'text-gray-400' },
      { to: '/travel',   label: 'Travel',           icon: Plane,         color: 'text-orange-400' },
    ]
  }
]

export default function Sidebar({ darkMode, toggleDark }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  // Auto-collapse to icon rail on tablet (md to lg), hide entirely on mobile
  const [autoCollapsed, setAutoCollapsed] = useState(false)

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      // 1024px = lg breakpoint: auto-collapse on tablet
      setAutoCollapsed(w < 1024 && w >= 768)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const collapsed = isCollapsed || autoCollapsed

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <aside className={`
      hidden md:flex fixed md:sticky top-0 left-0 h-screen z-20 flex-col
      bg-gray-950 border-r border-gray-800/60
      transition-all duration-300 ease-out-expo
      ${collapsed ? 'w-20' : 'w-56'}
      overflow-hidden
    `}>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-800/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <div className="font-bold text-sm text-gray-100 whitespace-nowrap">Life OS</div>
              <div className="text-xs text-gray-500 whitespace-nowrap">Personal Dashboard</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="sidebar-section">
                {section.title}
              </div>
            )}
            {section.items.map(({ to, label, icon: Icon, color }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-400' : color}`} />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800/60 shrink-0 space-y-2">
        <button
          onClick={toggleDark}
          title={darkMode ? 'Light Mode' : 'Dark Mode'}
          className="sidebar-link-inactive w-full"
        >
          {darkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
          {!collapsed && <span>{darkMode ? 'Light' : 'Dark'}</span>}
        </button>
        <button
          onClick={toggleCollapse}
          title="Toggle sidebar"
          className="flex sidebar-link-inactive w-full"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-0' : 'rotate-180'}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
        {!collapsed && (
          <div className="px-3">
            <div className="text-[10px] text-gray-600">
              Marcus's Life OS · v1.0
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
